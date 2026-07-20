import crypto from 'crypto';
import path from 'path';
import { Readable, Writable } from 'stream';
import { Client } from 'basic-ftp';
import { prisma } from '../db/prisma.js';
import { env } from '../config/env.js';
import { markVehicleDeliveryResult } from './vehicleRentalService.js';
import { normalizeItems as normalizeOutfitItems } from './outfitService.js';
import { registerKillEventFromGame } from './rankingService.js';

const FTP_SETTING_KEY = 'fileBridge.ftp.v1';
const FTP_HEALTH_KEY = 'fileBridge.health.v1';
const FTP_DIAGNOSTICS_KEY = 'fileBridge.diagnostics.v2';
const BRIDGE_SCHEMA_VERSION = 1;
const DEFAULT_BASE_PATH = '/profiles/RAIDZ_FileBridge';
const PROCESSING_RECOVERY_MS = 2 * 60 * 1000;
const MAX_RESULT_FILES_PER_CYCLE = 250;
const FTP_CONTROL_TIMEOUT_MS = 30_000;
const FTP_IMMEDIATE_CONTROL_TIMEOUT_MS = 25_000;
const FTP_SOCKET_KEEPALIVE_MS = 10_000;
const KNOWN_BRIDGE_PATHS = [
  '/instance/RAIDZ_filebridge',
  '/instance/RAIDZ_FileBridge',
  '/profiles/RAIDZ_FileBridge',
  '/profiles/RAIDZ_filebridge',
  '/RAIDZ_FileBridge',
  '/RAIDZ_filebridge'
];

let bridgeRunning = false;
let lastQueueHashes = new Map();
let lastVipHashes = new Map();
let lastInsuranceHashes = new Map();

// Compras do site entram nesta fila curta e são publicadas no FTP imediatamente,
// sem esperar o ciclo periódico. O ciclo normal continua como recuperação caso
// a conexão FTP caia ou o processo reinicie no meio da compra.
const immediatePlayerSyncQueue = new Set();
const immediatePlayerSyncRetries = new Map();
let immediatePlayerSyncRunning = false;
let immediatePlayerSyncTimer = null;
const IMMEDIATE_SYNC_DEBOUNCE_MS = 15;
const IMMEDIATE_SYNC_RETRY_MS = 1500;
const IMMEDIATE_SYNC_MAX_RETRIES = 2;
const IMMEDIATE_SYNC_BATCH_SIZE = 100;
const IMMEDIATE_FTP_IDLE_CLOSE_MS = 10 * 60_000;
let immediateFtpState = null;
let immediateFtpIdleTimer = null;
let immediateFtpPublishChain = Promise.resolve();
let bridgeDirectoriesFingerprint = '';
let autoPathDiscoveryFingerprint = '';

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
  bridgeDirectoriesFingerprint = '';
  autoPathDiscoveryFingerprint = '';
  await closeImmediateFtpClient();
  return getFtpConfig();
}

function configureConnectedSocket(client) {
  try { client.ftp.socket?.setKeepAlive?.(true, FTP_SOCKET_KEEPALIVE_MS); } catch {}
  try { client.ftp.socket?.setNoDelay?.(true); } catch {}
}

function friendlyFtpError(error, config = {}, stage = 'conexão FTP') {
  const original = String(error?.message || error || 'Falha desconhecida no FTP').trim();
  const endpoint = config?.host ? `${config.host}:${config.port || 21}` : 'host/porta configurados';
  if (/timeout \(control socket\)|control socket.*timeout|timed?\s*out/i.test(original)) {
    return `Tempo esgotado no canal de controle durante ${stage} em ${endpoint}. A host não respondeu dentro de ${Math.round(FTP_IMMEDIATE_CONTROL_TIMEOUT_MS / 1000)} segundos. Confirme se a porta é de FTP/FTPS (não SFTP), se a opção FTPS/TLS está correta e se o Railway está liberado no firewall da host. Detalhe técnico: ${original}`;
  }
  if (/ECONNREFUSED|connection refused/i.test(original)) {
    return `A conexão FTP foi recusada por ${endpoint} durante ${stage}. Confira host, porta e se o serviço FTP está ligado. Detalhe técnico: ${original}`;
  }
  if (/ENOTFOUND|getaddrinfo/i.test(original)) {
    return `O host FTP não foi encontrado durante ${stage}. Confira o endereço informado. Detalhe técnico: ${original}`;
  }
  if (/530|login incorrect|authentication|not logged in/i.test(original)) {
    return `O servidor FTP recusou usuário ou senha durante ${stage}. Detalhe técnico: ${original}`;
  }
  if (/certificate|self[- ]signed|tls|ssl/i.test(original)) {
    return `Falha de FTPS/TLS durante ${stage} em ${endpoint}. Confira se a opção FTPS/TLS corresponde ao painel da host. Detalhe técnico: ${original}`;
  }
  return `${stage}: ${original}`;
}

async function accessFtp(client, config) {
  await client.access({
    host: config.host,
    port: config.port,
    user: config.username,
    password: config.password,
    secure: config.secure
  });
  configureConnectedSocket(client);
}

async function createClient({ allowDisabled = false } = {}) {
  const config = await getFtpConfig({ includePassword: true });
  if (!config.enabled && !allowDisabled) throw new Error('Integração FTP está desativada.');
  const client = new Client(FTP_CONTROL_TIMEOUT_MS);
  client.ftp.verbose = false;
  try {
    await accessFtp(client, config);
  } catch (error) {
    client.close();
    throw new Error(friendlyFtpError(error, config, 'conexão e login'));
  }
  return { client, config };
}

function immediateFtpFingerprint(config) {
  return [config.host, config.port, config.username, config.secure ? '1' : '0', config.basePath, config.updatedAt || ''].join('|');
}

async function closeImmediateFtpClient() {
  if (immediateFtpIdleTimer) {
    clearTimeout(immediateFtpIdleTimer);
    immediateFtpIdleTimer = null;
  }
  if (immediateFtpState?.client) {
    try { immediateFtpState.client.close(); } catch {}
  }
  immediateFtpState = null;
}

function scheduleImmediateFtpIdleClose() {
  if (immediateFtpIdleTimer) clearTimeout(immediateFtpIdleTimer);
  immediateFtpIdleTimer = setTimeout(() => {
    closeImmediateFtpClient().catch(() => {});
  }, IMMEDIATE_FTP_IDLE_CLOSE_MS);
  immediateFtpIdleTimer.unref?.();
}

async function openImmediateFtpClient() {
  const config = await getFtpConfig({ includePassword: true });
  if (!config.enabled) throw new Error('Integração FTP está desativada.');
  const client = new Client(FTP_IMMEDIATE_CONTROL_TIMEOUT_MS);
  client.ftp.verbose = false;
  try {
    await accessFtp(client, config);
  } catch (error) {
    client.close();
    throw new Error(friendlyFtpError(error, config, 'conexão rápida de entrega'));
  }
  immediateFtpState = { client, config, fingerprint: immediateFtpFingerprint(config) };
  scheduleImmediateFtpIdleClose();
  return immediateFtpState;
}

async function getImmediateFtpClient() {
  const currentConfig = await getFtpConfig({ includePassword: true });
  if (!currentConfig.enabled) throw new Error('Integração FTP está desativada.');
  const fingerprint = immediateFtpFingerprint(currentConfig);
  if (immediateFtpState?.client && !immediateFtpState.client.closed && immediateFtpState.fingerprint === fingerprint) {
    immediateFtpState.config = currentConfig;
    scheduleImmediateFtpIdleClose();
    return immediateFtpState;
  }
  await closeImmediateFtpClient();
  return openImmediateFtpClient();
}

async function withImmediateFtpClient(task) {
  const execute = async () => {
    let state = await getImmediateFtpClient();
    try {
      const result = await task(state.client, state.config);
      scheduleImmediateFtpIdleClose();
      return result;
    } catch (firstError) {
      // Conexão persistente pode ter sido fechada pela host. Reconecta uma vez
      // sem esperar o ciclo periódico e repete o mesmo upload idempotente.
      await closeImmediateFtpClient();
      state = await openImmediateFtpClient();
      try {
        const result = await task(state.client, state.config);
        scheduleImmediateFtpIdleClose();
        return result;
      } catch (secondError) {
        await closeImmediateFtpClient();
        const wrapped = new Error(friendlyFtpError(secondError, state.config, 'operação FTP após reconexão'));
        wrapped.cause = secondError?.cause || firstError;
        throw wrapped;
      }
    }
  };

  const run = immediateFtpPublishChain.then(execute, execute);
  immediateFtpPublishChain = run.catch(() => {});
  return run;
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
    'outbox/ranking',
    'system',
    'backups'
  ];
  for (const dir of dirs) await client.ensureDir(remote(config, dir));
  await client.cd('/');
}

async function ensureBridgeDirectoriesOnce(client, config) {
  const fingerprint = immediateFtpFingerprint(config);
  if (bridgeDirectoriesFingerprint === fingerprint) return false;
  await ensureBridgeDirectories(client, config);
  bridgeDirectoriesFingerprint = fingerprint;
  return true;
}

export async function warmImmediateFtpConnection() {
  const config = await getFtpConfig();
  if (!config.enabled) return { ok: true, skipped: true, reason: 'disabled' };
  const startedAt = Date.now();
  const result = await withImmediateFtpClient(async (client, liveConfig) => {
    const pathDetection = await maybeAutoCorrectBasePath(client, liveConfig);
    await ensureBridgeDirectoriesOnce(client, liveConfig);
    return { ok: true, basePath: liveConfig.basePath, pathAutoCorrected: Boolean(pathDetection.changed), previousBasePath: pathDetection.previousBasePath || null };
  });
  console.log(`[FILE_BRIDGE_WARM] conexão FTP pronta em ${Date.now() - startedAt}ms.`);
  return { ...result, durationMs: Date.now() - startedAt };
}

async function uploadJsonAtomic(client, targetPath, payload, { ensureParent = true, compact = false } = {}) {
  const parent = path.posix.dirname(targetPath);
  const name = path.posix.basename(targetPath);
  const tempName = `.${name}.${crypto.randomBytes(4).toString('hex')}.tmp`;
  const tempPath = path.posix.join(parent, tempName);
  if (ensureParent) await client.ensureDir(parent);
  const json = compact ? JSON.stringify(payload) : JSON.stringify(payload, null, 2);
  await client.uploadFrom(Readable.from([`${json}\n`]), tempPath);
  try { await client.remove(targetPath, true); } catch {}
  await client.rename(tempPath, targetPath);
  if (ensureParent) await client.cd('/');
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

async function buildPlayerDeliveryPayload(steam64) {
  const rows = await prisma.deliveryQueue.findMany({
    where: { status: 'PENDING', steam64 },
    orderBy: [{ createdAt: 'asc' }]
  });

  const deliveries = rows
    .filter(row => safeSteam64(row.steam64) === steam64)
    .map(serializeDelivery);

  if (!deliveries.length) return null;

  return {
    schemaVersion: BRIDGE_SCHEMA_VERSION,
    steam64,
    serverType: deliveries[0]?.serverType || 'vanilla',
    generatedAt: new Date().toISOString(),
    revision: stableHash(deliveries.map(item => [item.id, item.updatedAt, item.status])),
    deliveries
  };
}

async function syncOnePlayerDeliveryFile(client, config, steam64, { parentReady = false } = {}) {
  const payload = await buildPlayerDeliveryPayload(steam64);
  const target = remote(config, 'inbox/deliveries', `${steam64}.json`);

  if (!payload) {
    try { await client.remove(target); } catch {}
    lastQueueHashes.delete(steam64);
    return { steam64, count: 0, removed: true };
  }

  // Upload atômico: o DayZ nunca enxerga JSON pela metade. Nesta rota imediata
  // publicamos sempre, mesmo que o cache local diga que o conteúdo é igual.
  await uploadJsonAtomic(client, target, payload, { ensureParent: !parentReady, compact: true });
  lastQueueHashes.set(steam64, stableHash(payload.deliveries));
  return { steam64, count: payload.deliveries.length, removed: false };
}

async function publishDeliveryFilesWithClient(client, config, steam64s) {
  const cleaned = Array.from(new Set((Array.isArray(steam64s) ? steam64s : [steam64s]).map(safeSteam64).filter(Boolean)));
  if (!cleaned.length) return { ok: true, published: 0, durationMs: 0 };

  const startedAt = Date.now();
  for (const steam64 of cleaned) {
    try {
      // Caminho rápido: a estrutura já foi criada pelo teste/configuração FTP.
      // Publica primeiro o seguro/garagem e só depois libera a entrega do veículo.
      // Isso evita o carro nascer antes de o mod enxergar o seguro ativo.
      await syncOnePlayerInsuranceFile(client, config, steam64, { parentReady: true });
      await syncOnePlayerDeliveryFile(client, config, steam64, { parentReady: true });
    } catch (error) {
      // Só recria a pasta quando o FTP realmente informar caminho inexistente.
      // Erros de conexão sobem direto para a reconexão rápida, evitando esperar
      // vários comandos ensureDir em uma conexão que já caiu.
      const message = String(error?.message || error);
      const missingPath = error?.code === 550 || /550|not found|no such file|directory unavailable|path.*exist/i.test(message);
      if (!missingPath) throw error;
      await client.ensureDir(remote(config, 'inbox/deliveries'));
      await client.cd('/');
      await client.ensureDir(remote(config, 'inbox/insurance'));
      await client.cd('/');
      bridgeDirectoriesFingerprint = immediateFtpFingerprint(config);
      await syncOnePlayerInsuranceFile(client, config, steam64, { parentReady: true });
      await syncOnePlayerDeliveryFile(client, config, steam64, { parentReady: true });
    }
    immediatePlayerSyncRetries.delete(steam64);
  }

  return { ok: true, published: cleaned.length, durationMs: Date.now() - startedAt };
}

export async function publishPlayerDeliveryFilesNow(steam64s) {
  const cleaned = Array.from(new Set((Array.isArray(steam64s) ? steam64s : [steam64s]).map(safeSteam64).filter(Boolean)));
  if (!cleaned.length) return { ok: true, published: 0, durationMs: 0 };

  const config = await getFtpConfig();
  if (!config.enabled) return { ok: true, skipped: true, reason: 'disabled', published: 0, durationMs: 0 };

  const startedAt = Date.now();
  const result = await withImmediateFtpClient((client, liveConfig) => publishDeliveryFilesWithClient(client, liveConfig, cleaned));
  console.log(`[FILE_BRIDGE_NOW] arquivos de ${result.published} jogador(es) enviados ao FTP em ${Date.now() - startedAt}ms (conexão reutilizável).`);
  return { ...result, durationMs: Date.now() - startedAt };
}

async function flushImmediatePlayerSyncQueue() {
  if (immediatePlayerSyncRunning) return;
  immediatePlayerSyncTimer = null;
  immediatePlayerSyncRunning = true;

  const steam64s = Array.from(immediatePlayerSyncQueue).slice(0, IMMEDIATE_SYNC_BATCH_SIZE);
  for (const steam64 of steam64s) immediatePlayerSyncQueue.delete(steam64);

  try {
    const result = await publishPlayerDeliveryFilesNow(steam64s);
    if (steam64s.length && !result?.skipped) {
      console.log(`[FILE_BRIDGE_IMMEDIATE] ${result.published} jogador(es) publicado(s) no FTP em ${result.durationMs}ms.`);
    }
  } catch (error) {
    console.error('[FILE_BRIDGE_IMMEDIATE] Falha no envio imediato:', error.message);
    for (const steam64 of steam64s) {
      const retries = Number(immediatePlayerSyncRetries.get(steam64) || 0) + 1;
      if (retries <= IMMEDIATE_SYNC_MAX_RETRIES) {
        immediatePlayerSyncRetries.set(steam64, retries);
        immediatePlayerSyncQueue.add(steam64);
      } else {
        immediatePlayerSyncRetries.delete(steam64);
      }
    }
  } finally {
    immediatePlayerSyncRunning = false;

    if (immediatePlayerSyncQueue.size > 0 && !immediatePlayerSyncTimer) {
      const hasRetry = Array.from(immediatePlayerSyncQueue).some(id => Number(immediatePlayerSyncRetries.get(id) || 0) > 0);
      immediatePlayerSyncTimer = setTimeout(flushImmediatePlayerSyncQueue, hasRetry ? IMMEDIATE_SYNC_RETRY_MS : IMMEDIATE_SYNC_DEBOUNCE_MS);
    }
  }
}

export function queueImmediatePlayerFileSync(steam64) {
  const cleaned = safeSteam64(steam64);
  if (!cleaned) return false;

  immediatePlayerSyncQueue.add(cleaned);
  lastQueueHashes.delete(cleaned);

  if (!immediatePlayerSyncRunning && !immediatePlayerSyncTimer) {
    immediatePlayerSyncTimer = setTimeout(flushImmediatePlayerSyncQueue, IMMEDIATE_SYNC_DEBOUNCE_MS);
  }
  return true;
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
  let filesUploaded = 0;
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
      filesUploaded += 1;
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

  return {
    filesUploaded,
    activePlayers: grouped.size,
    pendingDeliveries: rows.length
  };
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
    const items = normalizeOutfitItems(sub.outfitTemplate.items);
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

function serializeActiveVehicleInsurance(vehicle) {
  const subscription = vehicle.insurancePlan?.billingType === 'SUBSCRIPTION';
  const insuranceActive = Boolean(subscription && vehicle.insuranceExpiresAt && new Date(vehicle.insuranceExpiresAt).getTime() > Date.now());
  return {
    playerVehicleId: vehicle.id,
    displayName: vehicle.displayName,
    vehicleClassname: vehicle.vehicleClassname,
    currentVehicleKey: vehicle.currentVehicleKey || '',
    status: 'ACTIVE',
    insuranceActive,
    insurancePlanId: subscription ? (vehicle.insurancePlanId || '') : '',
    insuranceName: subscription ? (vehicle.insurancePlan?.name || '') : '',
    insuranceCoverageType: subscription ? (vehicle.insurancePlan?.coverageType || 'NORMAL') : 'NORMAL',
    insuranceBillingType: subscription ? 'SUBSCRIPTION' : '',
    insuranceExpiresAt: subscription ? (vehicle.insuranceExpiresAt?.toISOString?.() || '') : '',
    updatedAt: vehicle.updatedAt?.toISOString?.() || ''
  };
}

function activePlayerVehicleWhere(steam64 = null) {
  return {
    ...(steam64 ? { steam64 } : {}),
    status: 'ACTIVE',
    OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }]
  };
}

async function buildPlayerInsurancePayload(steam64) {
  const vehicles = await prisma.playerVehicle.findMany({
    where: activePlayerVehicleWhere(steam64),
    include: { insurancePlan: true, template: true },
    orderBy: { updatedAt: 'desc' }
  });
  const entries = vehicles.map(serializeActiveVehicleInsurance);
  if (!entries.length) return null;
  return { schemaVersion: BRIDGE_SCHEMA_VERSION, steam64, generatedAt: new Date().toISOString(), vehicles: entries };
}

async function syncOnePlayerInsuranceFile(client, config, steam64, { parentReady = false } = {}) {
  const payload = await buildPlayerInsurancePayload(steam64);
  const target = remote(config, 'inbox/insurance', `${steam64}.json`);
  if (!payload) {
    try { await client.remove(target); } catch {}
    lastInsuranceHashes.delete(steam64);
    return { steam64, count: 0, removed: true };
  }
  await uploadJsonAtomic(client, target, payload, { ensureParent: !parentReady, compact: true });
  lastInsuranceHashes.set(steam64, stableHash(payload.vehicles));
  return { steam64, count: payload.vehicles.length, removed: false };
}

async function syncInsuranceFiles(client, config) {
  // Registros cancelados, expirados ou removidos da conta nunca são enviados ao mod.
  const vehicles = await prisma.playerVehicle.findMany({
    where: activePlayerVehicleWhere(),
    include: { insurancePlan: true, template: true },
    orderBy: [{ steam64: 'asc' }, { updatedAt: 'desc' }]
  });
  const grouped = new Map();
  for (const vehicle of vehicles) {
    const steam64 = safeSteam64(vehicle.steam64);
    if (!steam64) continue;
    if (!grouped.has(steam64)) grouped.set(steam64, []);
    grouped.get(steam64).push(serializeActiveVehicleInsurance(vehicle));
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

  if (status === 'WAITING' || status === 'PENDING' || error.startsWith('WAIT_')) {
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


function valueAtPath(source, pathText) {
  if (!source || typeof source !== 'object') return undefined;
  return String(pathText || '').split('.').reduce((value, key) => {
    if (value === undefined || value === null) return undefined;
    return value[key];
  }, source);
}

function hasPath(source, pathText) {
  if (!source || typeof source !== 'object') return false;
  const keys = String(pathText || '').split('.');
  let current = source;
  for (const key of keys) {
    if (!current || typeof current !== 'object' || !Object.prototype.hasOwnProperty.call(current, key)) return false;
    current = current[key];
  }
  return true;
}

function hasAnyPath(source, paths = []) {
  return paths.some(pathText => hasPath(source, pathText));
}

function firstDefined(source, paths = []) {
  for (const pathText of paths) {
    const value = valueAtPath(source, pathText);
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return undefined;
}

function extractSteam64(value) {
  if (value === undefined || value === null) return '';
  if (typeof value === 'string' || typeof value === 'number') {
    const match = String(value).match(/7656119\d{10}/);
    return match ? match[0] : '';
  }
  if (typeof value !== 'object') return '';
  const directKeys = ['steam64', 'steamId64', 'steamID64', 'steamId', 'steamID', 'uid', 'playerId', 'id'];
  for (const key of directKeys) {
    const found = extractSteam64(value[key]);
    if (found) return found;
  }
  return '';
}

function collectSteam64Values(value, found = new Set(), depth = 0) {
  if (depth > 6 || value === undefined || value === null) return found;
  if (typeof value === 'string' || typeof value === 'number') {
    const matches = String(value).match(/7656119\d{10}/g) || [];
    for (const match of matches) found.add(match);
    return found;
  }
  if (Array.isArray(value)) {
    for (const item of value.slice(0, 100)) collectSteam64Values(item, found, depth + 1);
    return found;
  }
  if (typeof value === 'object') {
    for (const nested of Object.values(value)) collectSteam64Values(nested, found, depth + 1);
  }
  return found;
}

function findSteamByRole(value, roleRegex, depth = 0) {
  if (!value || typeof value !== 'object' || depth > 5) return '';
  for (const [key, nested] of Object.entries(value)) {
    if (roleRegex.test(key)) {
      const direct = extractSteam64(nested);
      if (direct) return direct;
    }
  }
  for (const nested of Object.values(value)) {
    if (nested && typeof nested === 'object') {
      const found = findSteamByRole(nested, roleRegex, depth + 1);
      if (found) return found;
    }
  }
  return '';
}

function extractName(value) {
  if (!value || typeof value !== 'object') return '';
  for (const key of ['name', 'nickname', 'playerName', 'displayName', 'nick']) {
    const text = String(value[key] || '').trim();
    if (text) return text.slice(0, 100);
  }
  return '';
}

function booleanLike(value) {
  if (typeof value === 'boolean') return value;
  const normalized = String(value ?? '').trim().toLowerCase();
  return ['true', '1', 'yes', 'sim', 'head', 'headshot'].includes(normalized);
}

function numberLike(value) {
  if (value === undefined || value === null || value === '') return null;
  const normalized = typeof value === 'string' ? value.replace(',', '.').replace(/[^0-9.\-]/g, '') : value;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function dateLike(value) {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value === 'number' || /^\d{10,13}$/.test(String(value))) {
    const numeric = Number(value);
    const millis = numeric < 10_000_000_000 ? numeric * 1000 : numeric;
    const date = new Date(millis);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function rankingFileContext(fileName = '') {
  const match = String(fileName).match(/^(vanilla|bbp|deathmatch)_death_(7656119\d{10})_/i);
  return {
    serverType: match ? match[1].toLowerCase() : 'vanilla',
    victimSteam64: match ? match[2] : ''
  };
}

function unwrapRankingRecords(payload) {
  if (Array.isArray(payload)) return payload.slice(0, 100);
  if (!payload || typeof payload !== 'object') return [];
  for (const key of ['events', 'kills', 'deaths', 'records', 'items']) {
    if (Array.isArray(payload[key])) return payload[key].slice(0, 100);
  }
  return [payload];
}

export function normalizeRankingRecord(record, { fileName = '', index = 0 } = {}) {
  const fileContext = rankingFileContext(fileName);
  const root = record?.data && typeof record.data === 'object'
    ? { ...record, ...record.data }
    : record?.event && typeof record.event === 'object'
      ? { ...record, ...record.event }
      : record?.kill && typeof record.kill === 'object'
        ? { ...record, ...record.kill }
        : record?.death && typeof record.death === 'object'
          ? { ...record, ...record.death }
          : (record || {});

  const killerObject = firstDefined(root, ['killer', 'attacker', 'murderer', 'instigator', 'sourcePlayer', 'source']);
  const victimObject = firstDefined(root, ['victim', 'deadPlayer', 'deceased', 'targetPlayer', 'target', 'player']);

  let killerSteam64 = extractSteam64(firstDefined(root, [
    'killerSteam64', 'killerSteamId64', 'killerSteamID64', 'killerSteamId', 'killerSteamID', 'killerId',
    'attackerSteam64', 'attackerSteamId64', 'attackerSteamId', 'attackerId',
    'murdererSteam64', 'murdererSteamId', 'sourceSteam64', 'sourceSteamId'
  ])) || extractSteam64(killerObject);

  let victimSteam64 = extractSteam64(firstDefined(root, [
    'victimSteam64', 'victimSteamId64', 'victimSteamID64', 'victimSteamId', 'victimSteamID', 'victimId',
    'deadSteam64', 'deadSteamId', 'deceasedSteam64', 'targetSteam64', 'targetSteamId', 'playerSteam64', 'steam64'
  ])) || extractSteam64(victimObject) || fileContext.victimSteam64;

  killerSteam64 ||= findSteamByRole(root, /killer|attacker|murderer|instigator|assailant/i);
  victimSteam64 ||= findSteamByRole(root, /victim|dead|deceased|target/i);
  const allSteamIds = [...collectSteam64Values(root)];
  if (!killerSteam64 && victimSteam64) killerSteam64 = allSteamIds.find(id => id !== victimSteam64) || '';
  if (!victimSteam64 && killerSteam64) victimSteam64 = allSteamIds.find(id => id !== killerSteam64) || '';
  if (!victimSteam64) victimSteam64 = fileContext.victimSteam64 || '';

  const killerName = String(firstDefined(root, ['killerName', 'attackerName', 'murdererName', 'sourceName']) || extractName(killerObject) || '').trim().slice(0, 100);
  const victimName = String(firstDefined(root, ['victimName', 'deadPlayerName', 'deceasedName', 'targetName', 'playerName']) || extractName(victimObject) || '').trim().slice(0, 100);
  const hitZone = String(firstDefined(root, ['hitZone', 'hitbox', 'bodyPart', 'damageZone']) || '').trim();
  const eventType = String(firstDefined(root, ['eventType', 'type', 'event', 'reason', 'deathType']) || '').trim();

  const normalized = {
    serverType: String(firstDefined(root, ['serverType', 'server', 'serverName']) || fileContext.serverType || 'vanilla').trim().toLowerCase(),
    killerSteam64,
    killerName,
    victimSteam64,
    victimName,
    weapon: String(firstDefined(root, ['weapon', 'weaponName', 'weaponClassname', 'weaponType', 'item', 'sourceWeapon']) || '').trim().slice(0, 180),
    distanceMeters: numberLike(firstDefined(root, ['distanceMeters', 'distance', 'killDistance', 'distanceM', 'meters'])),
    place: String(firstDefined(root, ['place', 'location', 'zone', 'area', 'positionText', 'town']) || '').trim().slice(0, 220),
    headshot: booleanLike(firstDefined(root, ['headshot', 'isHeadshot', 'wasHeadshot'])) || /head|cabeca|cabeça/i.test(hitZone),
    occurredAt: dateLike(firstDefined(root, ['occurredAt', 'timestamp', 'time', 'date', 'createdAt', 'eventTime'])),
    sourceFile: fileName,
    sourceIndex: index,
    sourceEventId: String(firstDefined(root, ['eventId', 'killId', 'deathId', 'id']) || '').trim().slice(0, 160),
    eventType,
    explicitKillerField: hasAnyPath(root, [
      'killer', 'attacker', 'murderer', 'instigator', 'sourcePlayer',
      'killerSteam64', 'killerSteamId', 'killerId', 'attackerSteam64', 'attackerSteamId', 'attackerId'
    ]),
    rawFileRecord: record
  };

  if (!['vanilla', 'bbp', 'deathmatch'].includes(normalized.serverType)) normalized.serverType = fileContext.serverType || 'vanilla';
  return normalized;
}

function rankingMarkerKey(fileName, index, record) {
  const fingerprint = crypto.createHash('sha256')
    .update(`${fileName}|${index}|${JSON.stringify(record)}`)
    .digest('hex');
  return `fileBridge.ranking.${fingerprint}`;
}

async function processRankingPayload(payload, fileName) {
  const records = unwrapRankingRecords(payload);
  if (!records.length) throw new Error('Arquivo de ranking sem evento válido.');
  let killsRegistered = 0;
  let ignoredDeaths = 0;
  let alreadyProcessed = 0;

  for (let index = 0; index < records.length; index += 1) {
    const record = records[index];
    const markerKey = rankingMarkerKey(fileName, index, record);
    const existing = await prisma.appSetting.findUnique({ where: { key: markerKey } });
    if (existing) {
      alreadyProcessed += 1;
      continue;
    }

    const event = normalizeRankingRecord(record, { fileName, index });
    const isPlayerKill = /^7656119\d{10}$/.test(event.killerSteam64)
      && /^7656119\d{10}$/.test(event.victimSteam64)
      && event.killerSteam64 !== event.victimSteam64;

    if (!isPlayerKill) {
      const nonPlayerCause = /suicide|self|fall|infected|zombie|animal|wolf|bear|environment|bleed|disease|hunger|thirst|gas|mine|grenade|explosion|vehicle/i.test(event.eventType || '');
      const safeToIgnore = /^7656119\d{10}$/.test(event.victimSteam64)
        && (event.explicitKillerField || nonPlayerCause || event.killerSteam64 === event.victimSteam64);
      if (!safeToIgnore) {
        throw new Error(`Formato de ranking não reconhecido em ${fileName}: não encontrei killerSteam64 e victimSteam64.`);
      }
      await prisma.appSetting.create({
        data: {
          key: markerKey,
          value: {
            status: 'IGNORED_NON_PLAYER_KILL',
            sourceFile: fileName,
            killerSteam64: event.killerSteam64 || null,
            victimSteam64: event.victimSteam64 || null,
            eventType: event.eventType || null,
            processedAt: new Date().toISOString()
          }
        }
      });
      ignoredDeaths += 1;
      continue;
    }

    const kill = await registerKillEventFromGame({
      ...event,
      raw: {
        ...event.rawFileRecord,
        fileBridgeSourceFile: fileName,
        fileBridgeSourceIndex: index,
        fileBridgeEventId: event.sourceEventId || null
      }
    });
    await prisma.appSetting.create({
      data: {
        key: markerKey,
        value: {
          status: 'KILL_REGISTERED',
          sourceFile: fileName,
          killEventId: kill.id,
          processedAt: new Date().toISOString()
        }
      }
    });
    killsRegistered += 1;
  }

  return { killsRegistered, ignoredDeaths, alreadyProcessed };
}

async function processRankingOutboxDirectory(client, config) {
  const dir = remote(config, 'outbox/ranking');
  let files = [];
  try { files = await client.list(dir); } catch { return { filesProcessed: 0, killsRegistered: 0, ignoredDeaths: 0, alreadyProcessed: 0 }; }

  const totals = { filesProcessed: 0, killsRegistered: 0, ignoredDeaths: 0, alreadyProcessed: 0 };
  for (const file of files) {
    if (totals.filesProcessed >= MAX_RESULT_FILES_PER_CYCLE) break;
    if (!file.isFile || !file.name.toLowerCase().endsWith('.json')) continue;
    const fullPath = path.posix.join(dir, file.name);
    try {
      const payload = await downloadJson(client, fullPath);
      const result = await processRankingPayload(payload, file.name);
      // Só remove do FTP depois que todos os registros do arquivo foram salvos,
      // ignorados de forma segura ou reconhecidos como já processados.
      await client.remove(fullPath);
      totals.filesProcessed += 1;
      totals.killsRegistered += result.killsRegistered;
      totals.ignoredDeaths += result.ignoredDeaths;
      totals.alreadyProcessed += result.alreadyProcessed;
    } catch (error) {
      // JSON quebrado ou formato desconhecido permanece no FTP para não perder dado.
      console.error(`Falha ao processar ranking ${fullPath}:`, error.message);
    }
  }
  return totals;
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

async function saveDiagnostics(data) {
  await prisma.appSetting.upsert({
    where: { key: FTP_DIAGNOSTICS_KEY },
    update: { value: data },
    create: { key: FTP_DIAGNOSTICS_KEY, value: data }
  });
}

export async function getFileBridgeHealth() {
  const row = await prisma.appSetting.findUnique({ where: { key: FTP_HEALTH_KEY } });
  return row?.value || null;
}

export async function getFtpDiagnostics() {
  const row = await prisma.appSetting.findUnique({ where: { key: FTP_DIAGNOSTICS_KEY } });
  return row?.value || null;
}

function isMissingRemotePathError(error) {
  const message = String(error?.message || error || '');
  return error?.code === 550 || /550|not found|no such file|directory unavailable|path.*exist|cannot find/i.test(message);
}

async function listRemoteDirectory(client, remotePath) {
  try {
    const entries = await client.list(remotePath);
    return { exists: true, entries };
  } catch (error) {
    if (isMissingRemotePathError(error)) return { exists: false, entries: [], error: String(error?.message || error) };
    throw error;
  }
}

function directoryNameSet(entries = []) {
  return new Set(entries.filter(item => item?.isDirectory).map(item => String(item.name || '').toLowerCase()));
}

function scoreBridgeDirectory(entries = []) {
  const names = directoryNameSet(entries);
  let score = 0;
  if (names.has('inbox')) score += 4;
  if (names.has('outbox')) score += 4;
  // state é criado pelo mod dentro da pasta realmente usada pelo servidor.
  // Damos peso maior para não escolher uma pasta vazia criada por testes antigos do site.
  if (names.has('state')) score += 12;
  if (names.has('backups')) score += 2;
  if (names.has('system')) score += 1;
  return score;
}

async function discoverBridgeDirectories(client, config) {
  const candidates = new Set([cleanRemotePath(config.basePath), ...KNOWN_BRIDGE_PATHS.map(item => cleanRemotePath(item))]);
  const parentPaths = ['/', '/instance', '/profiles'];
  const scannedParents = [];

  for (const parentPath of parentPaths) {
    try {
      const listed = await listRemoteDirectory(client, parentPath);
      if (!listed.exists) continue;
      scannedParents.push({ path: parentPath, count: listed.entries.length });
      for (const entry of listed.entries) {
        if (!entry?.isDirectory) continue;
        const name = String(entry.name || '').trim();
        if (!name) continue;
        if (/raid.?z|file.?bridge|sobreviventes.?z/i.test(name)) {
          candidates.add(cleanRemotePath(path.posix.join(parentPath, name)));
        }
      }
    } catch (error) {
      scannedParents.push({ path: parentPath, count: null, error: String(error?.message || error) });
    }
  }

  const results = [];
  for (const candidatePath of Array.from(candidates).slice(0, 20)) {
    const listed = await listRemoteDirectory(client, candidatePath);
    results.push({
      path: candidatePath,
      exists: listed.exists,
      score: listed.exists ? scoreBridgeDirectory(listed.entries) : 0,
      folders: listed.exists
        ? listed.entries.filter(item => item?.isDirectory).map(item => String(item.name || '')).sort((a, b) => a.localeCompare(b))
        : [],
      configured: cleanRemotePath(candidatePath) === cleanRemotePath(config.basePath)
    });
  }

  results.sort((a, b) => Number(b.configured) - Number(a.configured) || b.score - a.score || Number(b.exists) - Number(a.exists));
  return { candidates: results, scannedParents };
}

function chooseDetectedBridgePath(discovery, configuredPath) {
  const configured = discovery.candidates.find(item => item.configured);
  const strong = discovery.candidates
    .filter(item => item.exists && item.score >= 8)
    .sort((a, b) => b.score - a.score || a.path.localeCompare(b.path));
  const best = strong[0] || null;
  const equallyGood = best ? strong.filter(item => item.score === best.score) : [];
  const configuredScore = Number(configured?.score || 0);
  const bestIsDifferent = Boolean(best && cleanRemotePath(best.path) !== cleanRemotePath(configuredPath));
  // Uma pasta criada por teste antigo pode ter inbox/outbox, mas não tem state.
  // Se outra candidata tem pontuação claramente maior, ela é a pasta real do mod.
  const clearlyBetterCandidate = bestIsDifferent && Number(best?.score || 0) >= configuredScore + 3;
  const configuredLooksCorrect = Boolean(configured?.exists && configuredScore >= 8 && !clearlyBetterCandidate);
  const shouldSuggest = Boolean(best && bestIsDifferent && (!configured?.exists || configuredScore < 8 || clearlyBetterCandidate));

  return {
    configured,
    configuredLooksCorrect,
    best,
    ambiguous: shouldSuggest && equallyGood.length > 1,
    equallyGood,
    shouldSuggest
  };
}

async function maybeAutoCorrectBasePath(client, config) {
  const fingerprint = immediateFtpFingerprint(config);
  if (autoPathDiscoveryFingerprint === fingerprint) return { checked: true, changed: false, basePath: config.basePath };

  // Caminho rápido: se a pasta configurada contém state, ela está sendo usada pelo mod.
  // Assim o início normal faz apenas uma listagem e não perde tempo procurando alternativas.
  const configuredListing = await listRemoteDirectory(client, config.basePath);
  if (configuredListing.exists && scoreBridgeDirectory(configuredListing.entries) >= 12) {
    autoPathDiscoveryFingerprint = fingerprint;
    return { checked: true, changed: false, basePath: config.basePath };
  }

  const discovery = await discoverBridgeDirectories(client, config);
  const choice = chooseDetectedBridgePath(discovery, config.basePath);
  const canSafelyApply = choice.shouldSuggest
    && !choice.ambiguous
    && Number(choice.best?.score || 0) >= 12;

  if (canSafelyApply) {
    const previousBasePath = config.basePath;
    const updated = await updateStoredBasePath(choice.best.path);
    config.basePath = updated.basePath;
    config.updatedAt = updated.updatedAt;
    if (immediateFtpState?.client === client) {
      immediateFtpState.config = config;
      immediateFtpState.fingerprint = immediateFtpFingerprint(config);
    }
    autoPathDiscoveryFingerprint = immediateFtpFingerprint(config);
    console.log(`[FILE_BRIDGE_PATH] pasta corrigida automaticamente: ${previousBasePath} -> ${config.basePath}`);
    return { checked: true, changed: true, previousBasePath, basePath: config.basePath };
  }

  autoPathDiscoveryFingerprint = fingerprint;
  return { checked: true, changed: false, basePath: config.basePath };
}

async function updateStoredBasePath(basePath) {
  const row = await prisma.appSetting.findUnique({ where: { key: FTP_SETTING_KEY } });
  const value = normalizeStoredConfig(row?.value || {});
  value.basePath = cleanRemotePath(basePath);
  value.updatedAt = new Date().toISOString();
  await prisma.appSetting.upsert({
    where: { key: FTP_SETTING_KEY },
    update: { value },
    create: { key: FTP_SETTING_KEY, value }
  });
  bridgeDirectoriesFingerprint = '';
  autoPathDiscoveryFingerprint = '';
  lastQueueHashes = new Map();
  lastVipHashes = new Map();
  lastInsuranceHashes = new Map();
  return value;
}

function addDiagnosticStep(report, key, label, ok, detail, startedAt) {
  report.steps.push({
    key,
    label,
    ok,
    detail: String(detail || ''),
    durationMs: Math.max(0, Date.now() - startedAt)
  });
}

async function verifyBridgeFolderTree(client, config) {
  const base = await listRemoteDirectory(client, config.basePath);
  const inbox = await listRemoteDirectory(client, remote(config, 'inbox'));
  const outbox = await listRemoteDirectory(client, remote(config, 'outbox'));
  const baseNames = directoryNameSet(base.entries);
  const inboxNames = directoryNameSet(inbox.entries);
  const outboxNames = directoryNameSet(outbox.entries);

  return [
    { path: config.basePath, found: base.exists, required: true },
    { path: remote(config, 'inbox'), found: baseNames.has('inbox'), required: true },
    { path: remote(config, 'inbox/deliveries'), found: inboxNames.has('deliveries'), required: true },
    { path: remote(config, 'inbox/vip'), found: inboxNames.has('vip'), required: true },
    { path: remote(config, 'inbox/insurance'), found: inboxNames.has('insurance'), required: true },
    { path: remote(config, 'outbox'), found: baseNames.has('outbox'), required: true },
    { path: remote(config, 'outbox/results'), found: outboxNames.has('results'), required: true },
    { path: remote(config, 'outbox/playtime'), found: outboxNames.has('playtime'), required: true },
    { path: remote(config, 'outbox/ranking'), found: outboxNames.has('ranking'), required: true },
    { path: remote(config, 'system'), found: baseNames.has('system'), required: true },
    { path: remote(config, 'backups'), found: baseNames.has('backups'), required: true },
    { path: remote(config, 'state'), found: baseNames.has('state'), required: false }
  ];
}

async function getPendingDeliveryStats() {
  const [pendingDeliveries, pendingPlayers] = await Promise.all([
    prisma.deliveryQueue.count({ where: { status: 'PENDING' } }),
    prisma.deliveryQueue.findMany({
      where: { status: 'PENDING' },
      distinct: ['steam64'],
      select: { steam64: true }
    })
  ]);
  return {
    pendingDeliveries,
    pendingPlayers: pendingPlayers.filter(item => safeSteam64(item.steam64)).length
  };
}

async function runFtpConnectionDiagnostic({ autoApplyDetected = false } = {}) {
  const report = {
    version: 2,
    ok: false,
    testedAt: new Date().toISOString(),
    durationMs: 0,
    endpoint: null,
    secure: false,
    basePath: null,
    originalBasePath: null,
    suggestedBasePath: null,
    appliedBasePath: false,
    currentDirectory: null,
    steps: [],
    folders: [],
    candidates: [],
    scannedParents: [],
    pendingDeliveries: 0,
    pendingPlayers: 0,
    error: null
  };
  const startedAt = Date.now();
  let client = null;
  let config = null;
  let keepClientOpen = false;
  let currentStage = 'conexão e login';

  try {
    config = await getFtpConfig({ includePassword: true });
    report.endpoint = config.host ? `${config.host}:${config.port}` : null;
    report.secure = Boolean(config.secure);
    report.basePath = config.basePath;
    report.originalBasePath = config.basePath;
    if (!config.host || !config.username || !config.password) {
      throw new Error('Preencha host, porta, usuário e senha e salve antes de executar o diagnóstico.');
    }

    await closeImmediateFtpClient();
    const connectStartedAt = Date.now();
    ({ client, config } = await createClient({ allowDisabled: true }));
    addDiagnosticStep(report, 'connect', 'Conexão e login', true, `Conectado em ${report.endpoint} usando ${config.secure ? 'FTPS/TLS' : 'FTP comum'}.`, connectStartedAt);

    currentStage = 'leitura da pasta inicial';
    const pwdStartedAt = Date.now();
    report.currentDirectory = await client.pwd();
    addDiagnosticStep(report, 'pwd', 'Pasta inicial do usuário FTP', true, report.currentDirectory || '/', pwdStartedAt);

    currentStage = 'localização da pasta do mod';
    const discoveryStartedAt = Date.now();
    const discovery = await discoverBridgeDirectories(client, config);
    report.candidates = discovery.candidates;
    report.scannedParents = discovery.scannedParents;
    const choice = chooseDetectedBridgePath(discovery, config.basePath);
    if (choice.shouldSuggest) report.suggestedBasePath = choice.best.path;

    if (choice.ambiguous && autoApplyDetected) {
      throw new Error(`Foram encontradas várias pastas possíveis com a mesma estrutura: ${choice.equallyGood.map(item => item.path).join(', ')}. Informe manualmente a pasta base correta.`);
    }

    if (choice.shouldSuggest && autoApplyDetected) {
      const updated = await updateStoredBasePath(choice.best.path);
      config.basePath = updated.basePath;
      config.updatedAt = updated.updatedAt;
      report.basePath = config.basePath;
      report.appliedBasePath = true;
      report.candidates = report.candidates.map(item => ({ ...item, configured: cleanRemotePath(item.path) === cleanRemotePath(config.basePath) }));
    } else if (choice.shouldSuggest) {
      throw new Error(`A pasta configurada (${config.basePath}) não parece ser a pasta usada pelo mod. Foi encontrada uma estrutura pronta em ${choice.best.path}. Use o botão “Localizar e usar pasta do mod”.`);
    }
    addDiagnosticStep(
      report,
      'discover',
      'Localização da pasta do mod',
      true,
      report.appliedBasePath
        ? `Pasta encontrada e aplicada automaticamente: ${config.basePath}`
        : `Pasta configurada confirmada: ${config.basePath}`,
      discoveryStartedAt
    );

    currentStage = 'criação e conferência das pastas';
    const ensureStartedAt = Date.now();
    await ensureBridgeDirectories(client, config);
    bridgeDirectoriesFingerprint = immediateFtpFingerprint(config);
    report.folders = await verifyBridgeFolderTree(client, config);
    const missingRequired = report.folders.filter(item => item.required && !item.found);
    if (missingRequired.length) {
      throw new Error(`Pastas obrigatórias não encontradas após a criação: ${missingRequired.map(item => item.path).join(', ')}`);
    }
    addDiagnosticStep(report, 'folders', 'Estrutura de pastas', true, `${report.folders.filter(item => item.found).length} pasta(s) conferida(s).`, ensureStartedAt);

    currentStage = 'teste de escrita, leitura e exclusão';
    const rwStartedAt = Date.now();
    const testId = `connection_test_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const testPath = remote(config, 'system', `${testId}.json`);
    const payload = { ok: true, testId, testedAt: new Date().toISOString(), schemaVersion: BRIDGE_SCHEMA_VERSION };
    await uploadJsonAtomic(client, testPath, payload);
    const downloaded = await downloadJson(client, testPath);
    if (downloaded?.testId !== testId || downloaded?.ok !== true) {
      throw new Error('O arquivo foi enviado, mas o conteúdo lido de volta não corresponde ao teste.');
    }
    await client.remove(testPath);
    addDiagnosticStep(report, 'readwrite', 'Escrita, leitura e exclusão', true, `Arquivo temporário validado em ${remote(config, 'system')}.`, rwStartedAt);

    currentStage = 'consulta da fila de entregas';
    const queueStartedAt = Date.now();
    const stats = await getPendingDeliveryStats();
    report.pendingDeliveries = stats.pendingDeliveries;
    report.pendingPlayers = stats.pendingPlayers;
    addDiagnosticStep(report, 'queue', 'Fila de entregas do site', true, `${stats.pendingDeliveries} entrega(s) pendente(s) para ${stats.pendingPlayers} jogador(es).`, queueStartedAt);

    report.ok = true;
    report.error = null;
    report.durationMs = Date.now() - startedAt;

    if (config.enabled) {
      immediateFtpState = { client, config, fingerprint: immediateFtpFingerprint(config) };
      keepClientOpen = true;
      scheduleImmediateFtpIdleClose();
    }
    await saveDiagnostics(report);
    return report;
  } catch (error) {
    report.ok = false;
    report.durationMs = Date.now() - startedAt;
    report.error = friendlyFtpError(error, config || {}, currentStage);
    const failedStepStartedAt = Date.now();
    if (!report.steps.some(step => step.key === 'error' && step.detail === report.error)) {
      addDiagnosticStep(report, 'error', 'Falha no diagnóstico', false, report.error, failedStepStartedAt);
    }
    try { await saveDiagnostics(report); } catch {}
    const wrapped = new Error(report.error);
    wrapped.diagnostics = report;
    throw wrapped;
  } finally {
    if (client && !keepClientOpen) {
      try { client.close(); } catch {}
    }
  }
}

export async function testFtpConnection(options = {}) {
  const execute = () => runFtpConnectionDiagnostic(options);
  const run = immediateFtpPublishChain.then(execute, execute);
  immediateFtpPublishChain = run.catch(() => {});
  return run;
}

export async function detectAndApplyFtpBasePath() {
  const diagnostics = await testFtpConnection({ autoApplyDetected: true });
  const sync = await runFileBridgeCycle({ force: true });
  return {
    ok: true,
    basePath: diagnostics.basePath,
    changed: diagnostics.appliedBasePath,
    diagnostics,
    sync
  };
}

export async function runFileBridgeCycle({ force = false } = {}) {
  // Usa a mesma conexão persistente das compras. Isso evita duas conexões FTP
  // concorrentes na host e elimina a espera de login/pastas a cada ciclo.
  if (bridgeRunning) return { ok: true, skipped: true, reason: 'already_running' };
  const cfg = await getFtpConfig();
  if (!cfg.enabled) return { ok: true, skipped: true, reason: 'disabled' };
  if (force) {
    lastQueueHashes = new Map();
    lastVipHashes = new Map();
    lastInsuranceHashes = new Map();
    bridgeDirectoriesFingerprint = '';
  }
  bridgeRunning = true;
  const startedAt = new Date();
  try {
    const health = await withImmediateFtpClient(async (client, config) => {
      const pathDetection = await maybeAutoCorrectBasePath(client, config);
      await ensureBridgeDirectoriesOnce(client, config);
      await recoverStaleProcessingDeliveries();
      const deliveryResults = await processOutboxDirectory(client, config, 'outbox/results', processDeliveryResult);
      const playtimeEvents = await processOutboxDirectory(client, config, 'outbox/playtime', processPlaytimeEvent);
      const ranking = await processRankingOutboxDirectory(client, config);
      const deliverySync = await syncDeliveryQueues(client, config);
      await syncVipFiles(client, config);
      await syncInsuranceFiles(client, config);
      return {
        ok: true,
        lastSuccessAt: new Date().toISOString(),
        durationMs: Date.now() - startedAt.getTime(),
        deliveryResults,
        deliveryFilesUploaded: deliverySync.filesUploaded,
        pendingDeliveryPlayers: deliverySync.activePlayers,
        pendingDeliveries: deliverySync.pendingDeliveries,
        playtimeEvents,
        rankingFiles: ranking.filesProcessed,
        rankingKills: ranking.killsRegistered,
        rankingIgnoredDeaths: ranking.ignoredDeaths,
        rankingAlreadyProcessed: ranking.alreadyProcessed,
        basePath: config.basePath,
        pathAutoCorrected: Boolean(pathDetection.changed),
        previousBasePath: pathDetection.previousBasePath || null,
        error: null
      };
    });
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
