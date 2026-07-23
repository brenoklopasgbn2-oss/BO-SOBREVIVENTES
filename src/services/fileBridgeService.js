import crypto from 'crypto';
import path from 'path';
import { Readable, Writable } from 'stream';
import { Client } from 'basic-ftp';
import { prisma } from '../db/prisma.js';
import { env } from '../config/env.js';
import { markVehicleDeliveryResult } from './vehicleRentalService.js';

const FTP_SETTING_KEY = 'fileBridge.ftp.v1';
const FTP_HEALTH_KEY = 'fileBridge.health.v1';
const BRIDGE_SCHEMA_VERSION = 1;
const DEFAULT_BASE_PATH = '/profiles/RAIDZ_FileBridge';
const PROCESSING_RECOVERY_MS = 2 * 60 * 1000;
const MAX_RESULT_FILES_PER_CYCLE = 250;

let bridgeRunning = false;
let lastQueueHashes = new Map();
let lastVipHashes = new Map();
let lastInsuranceHashes = new Map();

function normalizeBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'boolean') return value;
  return ['1', 'true', 'on', 'yes', 'sim'].includes(String(value).trim().toLowerCase());
}

function cleanRemotePath(value, fallback = DEFAULT_BASE_PATH) {
  const raw = String(value || fallback).trim().replace(/\\/g, '/');
  const normalized = path.posix.normalize(raw.startsWith('/') ? raw : `/${raw}`);
  return normalized === '/' ? DEFAULT_BASE_PATH : normalized.replace(/\/$/, '');
}

function safeSteam64(value) {
  const steam64 = String(value || '').trim();
  return /^7656119\d{10}$/.test(steam64) ? steam64 : '';
}

function encryptionKey() {
  return crypto.createHash('sha256').update(String(env.ftpConfigSecret || env.cookieSecret || env.apiKey)).digest();
}

function encryptSecret(value) {
  const text = String(value || '');
  if (!text) return '';
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1:${iv.toString('base64')}:${tag.toString('base64')}:${encrypted.toString('base64')}`;
}

function decryptSecret(value) {
  const raw = String(value || '');
  if (!raw) return '';
  if (!raw.startsWith('v1:')) return raw;
  const [, ivB64, tagB64, dataB64] = raw.split(':');
  const decipher = crypto.createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(dataB64, 'base64')), decipher.final()]).toString('utf8');
}

function normalizeStoredConfig(value = {}) {
  return {
    enabled: normalizeBoolean(value.enabled, false),
    host: String(value.host || '').trim(),
    port: Math.max(1, Math.min(Number(value.port || 21), 65535)),
    username: String(value.username || '').trim(),
    passwordEncrypted: String(value.passwordEncrypted || value.password || ''),
    secure: normalizeBoolean(value.secure, false),
    basePath: cleanRemotePath(value.basePath),
    pollSeconds: Math.max(10, Math.min(Number(value.pollSeconds || 15), 300)),
    updatedAt: value.updatedAt || null
  };
}

export async function getFtpConfig({ includePassword = false } = {}) {
  const row = await prisma.appSetting.findUnique({ where: { key: FTP_SETTING_KEY } });
  const stored = normalizeStoredConfig(row?.value || {});
  const config = {
    enabled: stored.enabled,
    host: stored.host,
    port: stored.port,
    username: stored.username,
    secure: stored.secure,
    basePath: stored.basePath,
    pollSeconds: stored.pollSeconds,
    hasPassword: Boolean(stored.passwordEncrypted),
    updatedAt: stored.updatedAt
  };
  if (includePassword) config.password = decryptSecret(stored.passwordEncrypted);
  return config;
}

export async function saveFtpConfig(body = {}) {
  const previous = await getFtpConfig({ includePassword: true });
  const password = String(body.password || '').trim() || previous.password || '';
  const value = normalizeStoredConfig({
    enabled: normalizeBoolean(body.enabled, false),
    host: body.host,
    port: body.port,
    username: body.username,
    passwordEncrypted: encryptSecret(password),
    secure: normalizeBoolean(body.secure, false),
    basePath: body.basePath,
    pollSeconds: body.pollSeconds,
    updatedAt: new Date().toISOString()
  });

  if (value.enabled && (!value.host || !value.username || !password)) {
    throw new Error('Para ativar o FTP, preencha host, usuário e senha.');
  }

  await prisma.appSetting.upsert({
    where: { key: FTP_SETTING_KEY },
    update: { value },
    create: { key: FTP_SETTING_KEY, value }
  });
  lastQueueHashes = new Map();
  lastVipHashes = new Map();
  lastInsuranceHashes = new Map();
  return getFtpConfig();
}

async function createClient({ allowDisabled = false } = {}) {
  const config = await getFtpConfig({ includePassword: true });
  if (!config.enabled && !allowDisabled) throw new Error('Integração FTP está desativada.');
  const client = new Client(15_000);
  client.ftp.verbose = false;
  await client.access({
    host: config.host,
    port: config.port,
    user: config.username,
    password: config.password,
    secure: config.secure
  });
  return { client, config };
}

function remote(config, ...parts) {
  return path.posix.join(config.basePath, ...parts);
}

async function ensureBridgeDirectories(client, config) {
  const dirs = [
    '',
    'inbox',
    'inbox/deliveries',
    'inbox/vip',
    'inbox/insurance',
    'outbox',
    'outbox/results',
    'outbox/playtime',
    'system',
    'backups'
  ];
  for (const dir of dirs) await client.ensureDir(remote(config, dir));
  await client.cd('/');
}

async function uploadJsonAtomic(client, targetPath, payload) {
  const parent = path.posix.dirname(targetPath);
  const name = path.posix.basename(targetPath);
  const tempName = `.${name}.${crypto.randomBytes(4).toString('hex')}.tmp`;
  const tempPath = path.posix.join(parent, tempName);
  await client.ensureDir(parent);
  await client.uploadFrom(Readable.from([`${JSON.stringify(payload, null, 2)}\n`]), tempPath);
  try { await client.remove(targetPath, true); } catch {}
  await client.rename(tempPath, targetPath);
  await client.cd('/');
}

async function downloadText(client, remotePath) {
  let text = '';
  const sink = new Writable({
    write(chunk, encoding, callback) {
      text += chunk.toString('utf8');
      callback();
    }
  });
  await client.downloadTo(sink, remotePath);
  return text;
}

async function downloadJson(client, remotePath) {
  const raw = await downloadText(client, remotePath);
  return JSON.parse(raw);
}

async function removeInactivePlayerFiles(client, directory, activeSteamIds, hashCache) {
  let existing = [];
  try { existing = await client.list(directory); } catch { return; }
  for (const file of existing) {
    if (!file.isFile || !file.name.endsWith('.json')) continue;
    const steam64 = file.name.replace(/\.json$/i, '');
    if (!activeSteamIds.has(steam64)) {
      try { await client.remove(path.posix.join(directory, file.name)); } catch {}
      hashCache.delete(steam64);
    }
  }
}

function stableHash(value) {
  return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function expiryParts(dateValue) {
  const date = dateValue ? new Date(dateValue) : null;
  if (!date || Number.isNaN(date.getTime())) {
    return { expiresYear: 0, expiresMonth: 0, expiresDay: 0, expiresHour: 0, expiresMinute: 0, expiresSecond: 0 };
  }
  return {
    expiresYear: date.getUTCFullYear(),
    expiresMonth: date.getUTCMonth() + 1,
    expiresDay: date.getUTCDate(),
    expiresHour: date.getUTCHours(),
    expiresMinute: date.getUTCMinutes(),
    expiresSecond: date.getUTCSeconds()
  };
}

function serializeDelivery(row) {
  return {
    id: row.id,
    purchaseId: row.purchaseId || '',
    playerId: row.playerId,
    steam64: row.steam64,
    productName: row.productName,
    serverType: row.serverType,
    classname: row.classname,
    deliveryType: row.deliveryType,
    status: 'PENDING',
    quantity: row.quantity,
    meta: row.meta || null,
    createdAt: row.createdAt?.toISOString?.() || String(row.createdAt || ''),
    updatedAt: row.updatedAt?.toISOString?.() || String(row.updatedAt || '')
  };
}

async function recoverStaleProcessingDeliveries() {
  const before = new Date(Date.now() - PROCESSING_RECOVERY_MS);
  await prisma.deliveryQueue.updateMany({
    where: { status: 'PROCESSING', OR: [{ claimedAt: null }, { claimedAt: { lt: before } }] },
    data: { status: 'PENDING', claimedAt: null, error: 'RECOVERED_AFTER_SITE_OR_SERVER_RESTART' }
  });
}

async function syncDeliveryQueues(client, config) {
  const rows = await prisma.deliveryQueue.findMany({
    where: { status: 'PENDING' },
    orderBy: [{ steam64: 'asc' }, { createdAt: 'asc' }]
  });

  const grouped = new Map();
  for (const row of rows) {
    const steam64 = safeSteam64(row.steam64);
    if (!steam64) continue;
    if (!grouped.has(steam64)) grouped.set(steam64, []);
    grouped.get(steam64).push(serializeDelivery(row));
  }

  const manifestPlayers = [];
  for (const [steam64, deliveries] of grouped.entries()) {
    const payload = {
      schemaVersion: BRIDGE_SCHEMA_VERSION,
      steam64,
      serverType: deliveries[0]?.serverType || 'vanilla',
      generatedAt: new Date().toISOString(),
      revision: stableHash(deliveries.map(item => [item.id, item.updatedAt, item.status])),
      deliveries
    };
    const hash = stableHash(payload.deliveries);
    if (lastQueueHashes.get(steam64) !== hash) {
      await uploadJsonAtomic(client, remote(config, 'inbox/deliveries', `${steam64}.json`), payload);
      lastQueueHashes.set(steam64, hash);
    }
    manifestPlayers.push({ steam64, count: deliveries.length, revision: payload.revision });
  }

  const queueDir = remote(config, 'inbox/deliveries');
  let existing = [];
  try { existing = await client.list(queueDir); } catch {}
  const activeSteamIds = new Set(grouped.keys());
  for (const file of existing) {
    if (!file.isFile || !file.name.endsWith('.json')) continue;
    const steam64 = file.name.replace(/\.json$/i, '');
    if (!activeSteamIds.has(steam64)) {
      try { await client.remove(path.posix.join(queueDir, file.name)); } catch {}
      lastQueueHashes.delete(steam64);
    }
  }

  await uploadJsonAtomic(client, remote(config, 'inbox/manifest.json'), {
    schemaVersion: BRIDGE_SCHEMA_VERSION,
    serverType: 'vanilla',
    generatedAt: new Date().toISOString(),
    revision: stableHash(manifestPlayers),
    players: manifestPlayers
  });
}

async function syncVipFiles(client, config) {
  const now = new Date();
  await prisma.playerOutfitSubscription.updateMany({
    where: { status: 'ACTIVE', expiresAt: { lte: now } },
    data: { status: 'EXPIRED' }
  });

  const subs = await prisma.playerOutfitSubscription.findMany({
    where: { status: 'ACTIVE', expiresAt: { gt: now } },
    include: { outfitTemplate: true },
    orderBy: [{ steam64: 'asc' }, { expiresAt: 'desc' }]
  });

  const latestBySteam = new Map();
  for (const sub of subs) {
    const steam64 = safeSteam64(sub.steam64);
    if (!steam64 || latestBySteam.has(steam64) || !sub.outfitTemplate?.active) continue;
    latestBySteam.set(steam64, sub);
  }

  for (const [steam64, sub] of latestBySteam.entries()) {
    const items = Array.isArray(sub.outfitTemplate.items) ? sub.outfitTemplate.items : [];
    const payload = {
      schemaVersion: BRIDGE_SCHEMA_VERSION,
      ok: true,
      active: true,
      error: '',
      steam64,
      serverType: sub.serverType || 'vanilla',
      subscriptionId: sub.id,
      generatedAt: new Date().toISOString(),
      ...expiryParts(sub.expiresAt),
      outfit: {
        id: sub.outfitTemplate.id,
        name: sub.outfitTemplate.name,
        source: sub.source,
        expiresAt: sub.expiresAt.toISOString(),
        imageUrl: sub.outfitTemplate.imageUrl || ''
      },
      items: items.map((item, index) => ({
        slot: String(item?.slot || 'inventory'),
        classname: String(item?.classname || ''),
        quantity: Math.max(1, Math.min(Number(item?.quantity || 1), 999)),
        label: String(item?.label || item?.classname || ''),
        sortOrder: Number.isFinite(Number(item?.sortOrder)) ? Number(item.sortOrder) : index
      })).filter(item => item.classname)
    };
    const hash = stableHash({
      active: payload.active,
      steam64: payload.steam64,
      serverType: payload.serverType,
      subscriptionId: payload.subscriptionId,
      expiresYear: payload.expiresYear,
      expiresMonth: payload.expiresMonth,
      expiresDay: payload.expiresDay,
      expiresHour: payload.expiresHour,
      expiresMinute: payload.expiresMinute,
      expiresSecond: payload.expiresSecond,
      outfit: payload.outfit,
      items: payload.items
    });
    if (lastVipHashes.get(steam64) !== hash) {
      await uploadJsonAtomic(client, remote(config, 'inbox/vip', `${steam64}.json`), payload);
      lastVipHashes.set(steam64, hash);
    }
  }

  // Cancelou ou venceu: remove o arquivo imediatamente. O mod também valida a data,
  // mas esta limpeza impede que um VIP cancelado continue ativo até o vencimento antigo.
  await removeInactivePlayerFiles(
    client,
    remote(config, 'inbox/vip'),
    new Set(latestBySteam.keys()),
    lastVipHashes
  );
}

async function syncInsuranceFiles(client, config) {
  const vehicles = await prisma.playerVehicle.findMany({
    where: { status: { not: 'CANCELLED' } },
    include: { insurancePlan: true, template: true },
    orderBy: [{ steam64: 'asc' }, { updatedAt: 'desc' }]
  });
  const grouped = new Map();
  for (const vehicle of vehicles) {
    const steam64 = safeSteam64(vehicle.steam64);
    if (!steam64) continue;
    if (!grouped.has(steam64)) grouped.set(steam64, []);
    grouped.get(steam64).push({
      playerVehicleId: vehicle.id,
      displayName: vehicle.displayName,
      vehicleClassname: vehicle.vehicleClassname,
      currentVehicleKey: vehicle.currentVehicleKey || '',
      status: vehicle.status,
      insuranceActive: Boolean(vehicle.insurancePlan),
      insurancePlanId: vehicle.insurancePlanId || '',
      insuranceName: vehicle.insurancePlan?.name || '',
      insuranceCoverageType: vehicle.insurancePlan?.coverageType || 'NORMAL',
      insuranceBillingType: vehicle.insurancePlan?.billingType || '',
      insuranceExpiresAt: vehicle.insuranceExpiresAt?.toISOString?.() || '',
      updatedAt: vehicle.updatedAt?.toISOString?.() || ''
    });
  }
  for (const [steam64, entries] of grouped.entries()) {
    const payload = { schemaVersion: BRIDGE_SCHEMA_VERSION, steam64, generatedAt: new Date().toISOString(), vehicles: entries };
    const hash = stableHash(payload.vehicles);
    if (lastInsuranceHashes.get(steam64) !== hash) {
      await uploadJsonAtomic(client, remote(config, 'inbox/insurance', `${steam64}.json`), payload);
      lastInsuranceHashes.set(steam64, hash);
    }
  }

  await removeInactivePlayerFiles(
    client,
    remote(config, 'inbox/insurance'),
    new Set(grouped.keys()),
    lastInsuranceHashes
  );
}

async function processDeliveryResult(result) {
  const deliveryId = String(result?.deliveryId || result?.id || '').trim();
  if (!deliveryId) return;
  const current = await prisma.deliveryQueue.findUnique({ where: { id: deliveryId } });
  if (!current) return;
  const status = String(result.status || '').toUpperCase();
  const error = String(result.error || result.waitReason || '').slice(0, 900);

  if (status === 'DELIVERED' || status === 'DONE' || status === 'COMPLETED') {
    // Mesmo que o DeliveryQueue já tenha sido confirmado antes de um restart,
    // reaplica a finalização idempotente da garagem/log antes de apagar o arquivo.
    const delivery = current.status === 'DELIVERED'
      ? current
      : await prisma.deliveryQueue.update({
          where: { id: deliveryId },
          data: { status: 'DELIVERED', deliveredAt: current.deliveredAt || new Date(), claimedAt: null, error: null }
        });
    await markVehicleDeliveryResult(delivery, true, null);
    return;
  }

  // Resultado atrasado nunca pode reabrir uma entrega já concluída.
  if (current.status === 'DELIVERED') return;

  if (status === 'WAITING' || status === 'PENDING' || error.startsWith('WAIT_INSURANCE_')) {
    await prisma.deliveryQueue.update({
      where: { id: deliveryId },
      data: { status: 'PENDING', claimedAt: null, error: error || 'WAITING_LOCAL_FILE_PROCESSOR' }
    });
    return;
  }

  // Igual ao sucesso: uma repetição após restart precisa terminar o log da garagem.
  const failed = current.status === 'FAILED'
    ? current
    : await prisma.deliveryQueue.update({
        where: { id: deliveryId },
        data: { status: 'FAILED', claimedAt: null, error: error || 'Falha informada pelo mod via arquivo.' }
      });
  await markVehicleDeliveryResult(failed, false, error);
}

async function processPlaytimeEvent(event) {
  const eventId = String(event?.eventId || '').trim();
  const steam64 = safeSteam64(event?.steam64);
  const coins = Math.max(0, Math.min(Number(event?.coins || 0), 1_000_000));
  if (!eventId || !steam64 || coins <= 0) return;
  const markerKey = `fileBridge.playtime.${eventId}`.slice(0, 190);

  await prisma.$transaction(async tx => {
    const exists = await tx.appSetting.findUnique({ where: { key: markerKey } });
    if (exists) return;
    const player = await tx.player.findUnique({ where: { steam64 } });
    if (!player) throw new Error(`Player ${steam64} não encontrado para recompensa de tempo.`);
    const balanceAfter = Number(player.coins || 0) + coins;
    await tx.player.update({ where: { id: player.id }, data: { coins: balanceAfter } });
    await tx.coinLedger.create({
      data: {
        playerId: player.id,
        type: 'CREDIT',
        amount: coins,
        balanceAfter,
        reason: 'Recompensa por tempo jogado (arquivo local)',
        refType: 'playtime_file',
        refId: eventId
      }
    });
    await tx.appSetting.create({ data: { key: markerKey, value: { steam64, coins, processedAt: new Date().toISOString() } } });
  });
}

async function processOutboxDirectory(client, config, relativeDir, handler) {
  const dir = remote(config, relativeDir);
  let files = [];
  try { files = await client.list(dir); } catch { return 0; }
  let processed = 0;
  for (const file of files) {
    if (processed >= MAX_RESULT_FILES_PER_CYCLE) break;
    if (!file.isFile || !file.name.endsWith('.json')) continue;
    const fullPath = path.posix.join(dir, file.name);
    try {
      const payload = await downloadJson(client, fullPath);
      await handler(payload);
      await client.remove(fullPath);
      processed += 1;
    } catch (error) {
      console.error(`Falha ao processar ${fullPath}:`, error.message);
    }
  }
  return processed;
}

async function saveHealth(data) {
  await prisma.appSetting.upsert({
    where: { key: FTP_HEALTH_KEY },
    update: { value: data },
    create: { key: FTP_HEALTH_KEY, value: data }
  });
}

export async function getFileBridgeHealth() {
  const row = await prisma.appSetting.findUnique({ where: { key: FTP_HEALTH_KEY } });
  return row?.value || null;
}

export async function testFtpConnection() {
  const { client, config } = await createClient({ allowDisabled: true });
  try {
    await ensureBridgeDirectories(client, config);
    const testPath = remote(config, 'system', `connection_test_${Date.now()}.json`);
    await uploadJsonAtomic(client, testPath, { ok: true, testedAt: new Date().toISOString(), schemaVersion: BRIDGE_SCHEMA_VERSION });
    await client.remove(testPath);
    return { ok: true, basePath: config.basePath };
  } finally {
    client.close();
  }
}

export async function runFileBridgeCycle({ force = false } = {}) {
  // Nunca permite dois ciclos FTP ao mesmo tempo, nem pelo botão manual.
  // O parâmetro force apenas invalida caches antes de chamar esta função.
  if (bridgeRunning) return { ok: true, skipped: true, reason: 'already_running' };
  const cfg = await getFtpConfig();
  if (!cfg.enabled) return { ok: true, skipped: true, reason: 'disabled' };
  if (force) {
    lastQueueHashes = new Map();
    lastVipHashes = new Map();
    lastInsuranceHashes = new Map();
  }
  bridgeRunning = true;
  const startedAt = new Date();
  let client;
  try {
    const opened = await createClient();
    client = opened.client;
    const config = opened.config;
    await ensureBridgeDirectories(client, config);
    await recoverStaleProcessingDeliveries();
    const deliveryResults = await processOutboxDirectory(client, config, 'outbox/results', processDeliveryResult);
    const playtimeEvents = await processOutboxDirectory(client, config, 'outbox/playtime', processPlaytimeEvent);
    await syncDeliveryQueues(client, config);
    await syncVipFiles(client, config);
    await syncInsuranceFiles(client, config);
    const health = {
      ok: true,
      lastSuccessAt: new Date().toISOString(),
      durationMs: Date.now() - startedAt.getTime(),
      deliveryResults,
      playtimeEvents,
      basePath: config.basePath,
      error: null
    };
    await saveHealth(health);
    return health;
  } catch (error) {
    const health = {
      ok: false,
      lastFailureAt: new Date().toISOString(),
      durationMs: Date.now() - startedAt.getTime(),
      error: String(error?.message || error).slice(0, 900)
    };
    try { await saveHealth(health); } catch {}
    throw error;
  } finally {
    if (client) client.close();
    bridgeRunning = false;
  }
}

export async function syncPlayerFilesNow(steam64) {
  const cleaned = safeSteam64(steam64);
  if (!cleaned) throw new Error('Steam64 inválido.');
  lastQueueHashes.delete(cleaned);
  lastVipHashes.delete(cleaned);
  lastInsuranceHashes.delete(cleaned);
  return runFileBridgeCycle({ force: true });
}
