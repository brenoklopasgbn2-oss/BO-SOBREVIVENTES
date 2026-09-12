import crypto from 'crypto';
import { prisma } from '../db/prisma.js';
import { env } from '../config/env.js';
import { normalizeItems as normalizeOutfitItems } from './outfitService.js';
import { markVehicleDeliveryResult } from './vehicleRentalService.js';
import { registerKillEventFromGame } from './rankingService.js';
import { extractKillPositions } from '../utils/killPosition.js';
import { syncOnlinePresence } from './presenceService.js';

const HEARTBEAT_KEY = 'gameApiBridge.lastHeartbeat.v1';
const BRIDGE_SCHEMA_VERSION = 1;
const MAX_ONLINE_PLAYERS = 140;
const MAX_OUTBOX_ITEMS = 40;
const PROCESSING_RECOVERY_MS = 2 * 60 * 1000;
let lastRecoveryAt = 0;
let lastVipExpirySweepAt = 0;
let lastHeartbeatWriteAt = 0;

function safeSteam64(value) {
  const steam64 = String(value || '').trim();
  return /^7656119\d{10}$/.test(steam64) ? steam64 : '';
}

function safeServerType(value) {
  const v = String(value || 'vanilla').trim().toLowerCase();
  return ['vanilla', 'bbp'].includes(v) ? v : 'vanilla';
}

function iso(value) {
  const d = value ? new Date(value) : null;
  return d && !Number.isNaN(d.getTime()) ? d.toISOString() : '';
}

function expiryParts(value) {
  const d = value ? new Date(value) : null;
  if (!d || Number.isNaN(d.getTime())) {
    return { expiresYear: 0, expiresMonth: 0, expiresDay: 0, expiresHour: 0, expiresMinute: 0, expiresSecond: 0 };
  }
  return {
    expiresYear: d.getUTCFullYear(),
    expiresMonth: d.getUTCMonth() + 1,
    expiresDay: d.getUTCDate(),
    expiresHour: d.getUTCHours(),
    expiresMinute: d.getUTCMinutes(),
    expiresSecond: d.getUTCSeconds()
  };
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isDirectVehiclePurchaseMeta(meta = {}) {
  const kind = String(meta?.kind || '').trim().toLowerCase();
  const action = String(meta?.action || '').trim().toUpperCase();
  return kind === 'vehicle_direct_purchase' || action === 'BUY_DIRECT';
}

function sanitizeDeliveryProductName(row, meta = {}) {
  const original = String(row?.productName || '');
  if (!isDirectVehiclePurchaseMeta(meta)) return original;
  return original
    .replace(/^Veículo comprado sem seguro\s*:/i, 'Veículo comprado:')
    .replace(/^Veiculo comprado sem seguro\s*:/i, 'Veículo comprado:')
    .replace(/^Compra sem seguro\s*:/i, 'Veículo comprado:');
}

function serializeDelivery(row) {
  const meta = isPlainObject(row?.meta) ? row.meta : {};
  return {
    id: String(row?.id || ''),
    purchaseId: String(row?.purchaseId || ''),
    playerId: String(row?.playerId || ''),
    steam64: String(row?.steam64 || ''),
    productName: sanitizeDeliveryProductName(row, meta),
    serverType: String(row?.serverType || 'vanilla'),
    classname: String(row?.classname || ''),
    deliveryType: String(row?.deliveryType || 'drop_at_feet'),
    status: 'PENDING',
    quantity: Math.max(1, Math.min(Math.trunc(Number(row?.quantity || 1)), 100000)),
    meta,
    createdAt: iso(row?.createdAt),
    updatedAt: iso(row?.updatedAt)
  };
}

function serializeVipAttachment(item, index = 0) {
  const classname = String(item?.classname || '').trim();
  if (!classname) return null;
  const rawChildren = Array.isArray(item?.attachments) ? item.attachments : (Array.isArray(item?.attachedItems) ? item.attachedItems : []);
  const attachments = rawChildren.map(serializeVipAttachment).filter(Boolean);
  const rawPercent = item?.liquidPercent ?? item?.fillPercent ?? item?.contentPercent;
  const n = rawPercent === null || rawPercent === undefined || String(rawPercent).trim() === '' ? null : Number(rawPercent);
  const payload = {
    classname,
    slot: String(item?.slot || '').trim(),
    quantity: Math.max(1, Math.min(Number(item?.quantity || 1), 999)),
    sortOrder: Number.isFinite(Number(item?.sortOrder)) ? Number(item.sortOrder) : index,
    attachments
  };
  if (Number.isFinite(n)) payload.liquidPercent = Math.max(0, Math.min(n, 100));
  return payload;
}

const VIP_MMG_CLASSNAME_ALIASES_V611 = new Map([
  ['mmg_mmps_bag_multicamblack', 'MMG_mmps_nag_multicamblack'],
  ['mmg_assault_pack_green', 'MMG_assault_pack_olive'],
  ['mmg_carrier_backpack_green', 'MMG_carrier_backpack_olive'],
  ['mmg_med_pouch_green', 'MMG_Med_Pouch_Olive'],
  ['mmg_mag_pouch_green', 'MMG_Mag_Pouch_olive'],
  ['mmg_ammo_pouch_green', 'MMG_ammo_pouch_olive'],
  ['mmg_falcon_b1_belt_green', 'MMG_falcon_b1_belt_olive'],
  ['mmg_sheath_green', 'MMG_sheath_olive'],
  ['mmg_bottle_green', 'MMG_bottle_olive'],
  ['mmg_combatpants_green', 'MMG_combatpants_olive'],
  ['mmg_jpc_vest_green', 'MMG_JPC_Vest_olive'],
  ['mmg_boonie_black', 'BoonieHat_Black']
]);

function normalizeVipMmgClassname(value) {
  const raw = String(value || '').trim();
  if (!raw) return raw;
  return VIP_MMG_CLASSNAME_ALIASES_V611.get(raw.toLowerCase()) || raw;
}

function vipClassname(item) {
  return normalizeVipMmgClassname(item?.classname).toLowerCase();
}

function isVipBottle(item) {
  const classname = vipClassname(item);
  return classname === 'waterbottle' || classname === 'canteen' || classname.includes('bottle');
}

function isVipFoodCan(item) {
  return ['tacticalbaconcan', 'bakedbeanscan', 'sardinescan', 'tunacan', 'peachescan', 'spaghettican', 'unknownfoodcan', 'dogfoodcan', 'catfoodcan'].includes(vipClassname(item));
}

function isBlockedVipItem(item) {
  const classname = vipClassname(item);
  const label = String(item?.label || '').trim().toLowerCase();
  const compact = `${classname} ${label}`.replace(/[^a-z0-9]+/g, '');
  return classname === 'karambitknife' || compact.includes('operatorkit');
}

function sanitizeVipAttachments(value = []) {
  return (Array.isArray(value) ? value : [])
    .filter(item => !isBlockedVipItem(item) && vipClassname(item) !== 'combatknife')
    .map((item, index) => {
      const copy = { ...item, classname: normalizeVipMmgClassname(item?.classname) };
      copy.attachments = sanitizeVipAttachments(item?.attachments ?? item?.attachedItems ?? []);
      copy.sortOrder = Number.isFinite(Number(item?.sortOrder)) ? Number(item.sortOrder) : index;
      if (isVipBottle(copy)) copy.liquidPercent = 100;
      return copy;
    });
}

function ensureVipEssentials(items = []) {
  const safe = (Array.isArray(items) ? items : [])
    .filter(item => !isBlockedVipItem(item))
    .map((item, index) => {
      const copy = { ...item, classname: normalizeVipMmgClassname(item?.classname) };
      copy.attachments = sanitizeVipAttachments(item?.attachments ?? item?.attachedItems ?? []);
      copy.sortOrder = Number.isFinite(Number(item?.sortOrder)) ? Number(item.sortOrder) : index;
      if (isVipBottle(copy)) copy.liquidPercent = 100;
      return copy;
    });

  const inventory = () => safe.filter(item => String(item?.slot || 'inventory').trim().toLowerCase() === 'inventory');
  const hasBottleRecursive = list => (Array.isArray(list) ? list : []).some(item => isVipBottle(item) || hasBottleRecursive(item?.attachments ?? item?.attachedItems ?? []));
  if (!hasBottleRecursive(safe)) {
    safe.push({ slot: 'inventory', classname: 'WaterBottle', quantity: 1, label: 'Garrafa de água cheia', liquidPercent: 100, attachments: [], sortOrder: safe.length });
  }

  const cannedFoodCount = inventory().filter(isVipFoodCan).reduce((total, item) => total + Math.max(1, Number(item?.quantity || 1)), 0);
  if (cannedFoodCount < 2) {
    safe.push({ slot: 'inventory', classname: 'TacticalBaconCan', quantity: 2 - cannedFoodCount, label: 'Lata de comida', attachments: [], sortOrder: safe.length });
  }

  const bandage = inventory().find(item => vipClassname(item) === 'bandagedressing');
  if (bandage) bandage.quantity = Math.max(2, Number(bandage.quantity || 1));
  else safe.push({ slot: 'inventory', classname: 'BandageDressing', quantity: 2, label: 'Bandagem', attachments: [], sortOrder: safe.length });

  const knives = inventory().filter(item => vipClassname(item) === 'combatknife');
  const knife = knives[0];
  if (knife) {
    knife.quantity = 1;
    knife.slot = 'inventory';
    knife.classname = 'CombatKnife';
    knife.label = 'Faca Tática';
    for (let i = safe.length - 1; i >= 0; i -= 1) {
      if (safe[i] !== knife && vipClassname(safe[i]) === 'combatknife') safe.splice(i, 1);
    }
  } else {
    safe.push({ slot: 'inventory', classname: 'CombatKnife', quantity: 1, label: 'Faca Tática', attachments: [], sortOrder: safe.length });
  }
  return safe.map((item, index) => ({ ...item, sortOrder: index }));
}

function serializeVipItem(item, index = 0) {
  const classname = String(item?.classname || '').trim();
  if (!classname) return null;
  const rawChildren = Array.isArray(item?.attachments) ? item.attachments : (Array.isArray(item?.attachedItems) ? item.attachedItems : []);
  const attachments = rawChildren.map(serializeVipAttachment).filter(Boolean);
  const rawPercent = item?.liquidPercent ?? item?.fillPercent ?? item?.contentPercent;
  const n = rawPercent === null || rawPercent === undefined || String(rawPercent).trim() === '' ? null : Number(rawPercent);
  const payload = {
    slot: String(item?.slot || 'inventory'),
    classname,
    quantity: Math.max(1, Math.min(Number(item?.quantity || 1), 999)),
    label: String(item?.label || classname),
    sortOrder: Number.isFinite(Number(item?.sortOrder)) ? Number(item.sortOrder) : index,
    attachments
  };
  if (Number.isFinite(n)) payload.liquidPercent = Math.max(0, Math.min(n, 100));
  return payload;
}

function buildVipPayload(sub) {
  if (!sub?.outfitTemplate?.active) return null;
  return {
    schemaVersion: BRIDGE_SCHEMA_VERSION,
    ok: true,
    active: true,
    error: '',
    steam64: String(sub.steam64 || ''),
    serverType: String(sub.serverType || 'vanilla'),
    subscriptionId: String(sub.id || ''),
    generatedAt: new Date().toISOString(),
    ...expiryParts(sub.expiresAt),
    outfit: {
      id: String(sub.outfitTemplate.id || ''),
      name: String(sub.outfitTemplate.name || ''),
      source: String(sub.source || ''),
      expiresAt: iso(sub.expiresAt),
      imageUrl: String(sub.outfitTemplate.imageUrl || ''),
      mediaUrl: String(sub.outfitTemplate.imageUrl || ''),
      mediaType: 'video'
    },
    vipItemPayloadVersion: 2,
    items: ensureVipEssentials(normalizeOutfitItems(sub.outfitTemplate.items)).map(serializeVipItem).filter(Boolean)
  };
}

function inactiveVipPayload(steam64, serverType) {
  return {
    schemaVersion: BRIDGE_SCHEMA_VERSION,
    ok: true,
    active: false,
    error: '',
    steam64,
    serverType,
    subscriptionId: '',
    generatedAt: new Date().toISOString(),
    expiresYear: 0,
    expiresMonth: 0,
    expiresDay: 0,
    expiresHour: 0,
    expiresMinute: 0,
    expiresSecond: 0,
    vipItemPayloadVersion: 2,
    outfit: { id: '', name: '', source: '', expiresAt: '', imageUrl: '', mediaUrl: '', mediaType: '' },
    items: []
  };
}

function serializeInsuranceVehicle(vehicle) {
  const subscription = vehicle.insurancePlan?.billingType === 'SUBSCRIPTION';
  const insuranceActive = Boolean(subscription && vehicle.insuranceExpiresAt && new Date(vehicle.insuranceExpiresAt).getTime() > Date.now());
  return {
    playerVehicleId: String(vehicle.id || ''),
    displayName: String(vehicle.displayName || ''),
    vehicleClassname: String(vehicle.vehicleClassname || ''),
    currentVehicleKey: String(vehicle.currentVehicleKey || ''),
    status: 'ACTIVE',
    insuranceActive,
    insurancePlanId: subscription ? String(vehicle.insurancePlanId || '') : '',
    insuranceName: subscription ? String(vehicle.insurancePlan?.name || '') : '',
    insuranceCoverageType: subscription ? String(vehicle.insurancePlan?.coverageType || 'NORMAL') : 'NORMAL',
    insuranceBillingType: subscription ? 'SUBSCRIPTION' : '',
    insuranceExpiresAt: subscription ? iso(vehicle.insuranceExpiresAt) : '',
    updatedAt: iso(vehicle.updatedAt)
  };
}

async function recoverStaleProcessingIfNeeded() {
  const now = Date.now();
  if (now - lastRecoveryAt < 60_000) return;
  lastRecoveryAt = now;
  const before = new Date(now - PROCESSING_RECOVERY_MS);
  await prisma.deliveryQueue.updateMany({
    where: { status: 'PROCESSING', OR: [{ claimedAt: null }, { claimedAt: { lt: before } }] },
    data: { status: 'PENDING', claimedAt: null, error: 'RECOVERED_BY_HTTP_API_BRIDGE' }
  });
}

async function processDeliveryResult(result) {
  const deliveryId = String(result?.deliveryId || result?.id || '').trim();
  if (!deliveryId) return false;
  const current = await prisma.deliveryQueue.findUnique({ where: { id: deliveryId } });
  if (!current) return true;
  const status = String(result?.status || '').trim().toUpperCase();
  const error = String(result?.error || result?.waitReason || '').slice(0, 900);

  if (['DELIVERED', 'DONE', 'COMPLETED'].includes(status)) {
    const delivery = current.status === 'DELIVERED' ? current : await prisma.deliveryQueue.update({
      where: { id: deliveryId },
      data: { status: 'DELIVERED', deliveredAt: current.deliveredAt || new Date(), claimedAt: null, error: null }
    });
    await markVehicleDeliveryResult(delivery, true, null);
    return true;
  }
  if (current.status === 'DELIVERED') return true;
  if (status === 'WAITING' || status === 'PENDING' || error.startsWith('WAIT_')) {
    await prisma.deliveryQueue.update({
      where: { id: deliveryId },
      data: { status: 'PENDING', claimedAt: null, error: error || 'WAITING_HTTP_API_BRIDGE' }
    });
    return true;
  }
  const failed = current.status === 'FAILED' ? current : await prisma.deliveryQueue.update({
    where: { id: deliveryId },
    data: { status: 'FAILED', claimedAt: null, error: error || 'Falha informada pelo mod via API.' }
  });
  await markVehicleDeliveryResult(failed, false, error);
  return true;
}

async function processPlaytimeEvent(event) {
  const eventId = String(event?.eventId || '').trim();
  const steam64 = safeSteam64(event?.steam64);
  const coins = Math.floor(Number(event?.coins || 0));
  if (!eventId || !steam64 || !Number.isInteger(coins) || coins <= 0 || coins > 100000) return false;
  const markerKey = `gameApiBridge.playtime.${eventId}`.slice(0, 190);
  await prisma.$transaction(async tx => {
    const exists = await tx.appSetting.findUnique({ where: { key: markerKey } });
    if (exists) return;
    let player = await tx.player.findUnique({ where: { steam64 } });
    if (!player) {
      player = await tx.player.create({ data: { steam64, nickname: String(event?.playerName || '').trim().slice(0, 64) || null } });
    }
    const updated = await tx.player.update({ where: { id: player.id }, data: { coins: { increment: coins } } });
    await tx.coinLedger.create({
      data: {
        playerId: player.id,
        type: 'CREDIT',
        amount: coins,
        balanceAfter: Number(updated.coins || 0),
        reason: 'Recompensa por tempo jogado (API)',
        refType: 'playtime_api',
        refId: eventId
      }
    });
    await tx.appSetting.create({ data: { key: markerKey, value: { steam64, coins, processedAt: new Date().toISOString() } } });
  });
  return true;
}

async function processRankingEvent(event) {
  const eventId = String(event?.eventId || '').trim().slice(0, 160);
  if (!eventId) return false;

  const alreadyProcessed = await prisma.killEvent.findUnique({ where: { sourceEventId: eventId }, select: { id: true } }).catch(() => null);
  if (alreadyProcessed) return true;

  const killerSteam64 = safeSteam64(event?.killerSteam64);
  const victimSteam64 = safeSteam64(event?.victimSteam64);
  if (killerSteam64 && victimSteam64 && killerSteam64 !== victimSteam64) {
    const positions = extractKillPositions(event || {});
    try {
      await registerKillEventFromGame({
        sourceEventId: eventId,
        serverType: safeServerType(event?.serverType),
        killerSteam64,
        killerName: String(event?.killerName || ''),
        victimSteam64,
        victimName: String(event?.victimName || ''),
        cause: String(event?.cause || ''),
        sourceClassname: String(event?.sourceClassname || ''),
        weapon: String(event?.weaponClassname || event?.sourceClassname || ''),
        ammoClassname: String(event?.ammoClassname || ''),
        hitZone: String(event?.hitZone || ''),
        distanceMeters: Number(event?.distanceMeters || 0),
        headshot: Boolean(event?.headshot),
        killerPosition: positions.killer,
        victimPosition: positions.victim,
        occurredAt: event?.generatedAt || undefined,
        raw: event
      });
    } catch (error) {
      // A restrição unique de sourceEventId torna reenvios/retries idempotentes.
      if (!String(error?.message || '').toLowerCase().includes('unique')) throw error;
    }
  }
  // Mortes sem killer jogador também são ACKadas para não congestionar o outbox do mod.
  return true;
}

function uniquePlayers(input = []) {
  const bySteam = new Map();
  for (const raw of Array.isArray(input) ? input : []) {
    const steam64 = safeSteam64(raw?.steam64 ?? raw);
    if (!steam64 || bySteam.has(steam64)) continue;
    bySteam.set(steam64, { steam64, playerName: String(raw?.playerName || raw?.name || '').trim().slice(0, 64) });
    if (bySteam.size >= MAX_ONLINE_PLAYERS) break;
  }
  return [...bySteam.values()];
}

function limitedArray(value) {
  return Array.isArray(value) ? value.slice(0, MAX_OUTBOX_ITEMS) : [];
}

export async function handleGameApiBridgePoll(body = {}, requestMeta = {}) {
  const serverType = safeServerType(body.serverType);
  const serverId = String(body.serverId || 'dayz-1').trim().slice(0, 80) || 'dayz-1';
  const modVersion = String(body.modVersion || '').trim().slice(0, 80);
  const players = uniquePlayers(body.players);
  const steam64s = players.map(p => p.steam64);
  // CHAMPIONS Z usa o HTTP somente para presença, moedas e telemetria competitiva.
  // VIP/seguro/catálogo continuam locais e não trafegam nesta API.
  const fullVipSync = false;

  await recoverStaleProcessingIfNeeded();
  // Presença é sincronizada em lote e possui throttle interno para não escrever no banco a cada poll.
  await syncOnlinePresence(players, { serverId, serverType }).catch((error) => {
    console.error('[GAME_API_PRESENCE]', error.message);
  });

  const ackResultIds = [];
  const ackPlaytimeIds = [];
  const ackRankingIds = [];

  for (const result of limitedArray(body.results)) {
    try {
      if (await processDeliveryResult(result)) ackResultIds.push(String(result?.deliveryId || result?.id || ''));
    } catch (error) {
      console.error('[GAME_API_RESULT]', error.message);
    }
  }
  for (const event of limitedArray(body.playtime)) {
    try {
      if (await processPlaytimeEvent(event)) ackPlaytimeIds.push(String(event?.eventId || ''));
    } catch (error) {
      console.error('[GAME_API_PLAYTIME]', error.message);
    }
  }
  for (const event of limitedArray(body.ranking)) {
    try {
      if (await processRankingEvent(event)) ackRankingIds.push(String(event?.eventId || ''));
    } catch (error) {
      console.error('[GAME_API_RANKING]', error.message);
    }
  }

  const now = new Date();
  // Limpeza de status expirada no máximo 1x/minuto. As consultas abaixo já usam
  // expiresAt > now, então não existe janela em que um VIP vencido seja enviado ao mod.
  if (Date.now() - lastVipExpirySweepAt >= 60_000) {
    lastVipExpirySweepAt = Date.now();
    await prisma.playerOutfitSubscription.updateMany({
      where: { status: 'ACTIVE', expiresAt: { lte: now }, OR: [{ serverType }, { serverType: 'all' }] },
      data: { status: 'EXPIRED' }
    });
  }

  const deliveryPromise = steam64s.length ? prisma.deliveryQueue.findMany({
    where: {
      steam64: { in: steam64s },
      status: 'PENDING',
      deliveryType: { in: ['wallet_credit', 'coin_credit', 'coins'] },
      OR: [{ serverType }, { serverType: 'all' }]
    },
    orderBy: [{ createdAt: 'asc' }],
    take: 200
  }) : Promise.resolve([]);

  // Nada de VIP, seguro, catálogo ou inventário via HTTP: mantém cada poll pequeno.
  const deliveryRows = await deliveryPromise;
  const vipRows = [];
  const insuranceRows = [];

  const deliveriesBySteam = new Map(steam64s.map(id => [id, []]));
  for (const row of deliveryRows) {
    const id = safeSteam64(row.steam64);
    if (!id || !deliveriesBySteam.has(id)) continue;
    deliveriesBySteam.get(id).push(serializeDelivery(row));
  }
  const deliveryQueues = steam64s.map(steam64 => {
    const deliveries = deliveriesBySteam.get(steam64) || [];
    return {
      schemaVersion: BRIDGE_SCHEMA_VERSION,
      steam64,
      serverType,
      generatedAt: now.toISOString(),
      revision: crypto.createHash('sha1').update(JSON.stringify(deliveries.map(d => [d.id, d.updatedAt]))).digest('hex'),
      deliveries
    };
  });

  const selectedVipBySteam = new Map();
  for (const sub of vipRows) {
    const id = safeSteam64(sub.steam64);
    if (id && !selectedVipBySteam.has(id)) selectedVipBySteam.set(id, sub);
  }

  const vipPayloads = [];
  if (fullVipSync) {
    for (const sub of selectedVipBySteam.values()) {
      const payload = buildVipPayload(sub);
      if (payload) vipPayloads.push(payload);
    }
  } else {
    for (const steam64 of steam64s) {
      const payload = buildVipPayload(selectedVipBySteam.get(steam64));
      vipPayloads.push(payload || inactiveVipPayload(steam64, serverType));
    }
  }

  const insuranceBySteam = new Map(steam64s.map(id => [id, []]));
  for (const vehicle of insuranceRows) {
    const id = safeSteam64(vehicle.steam64);
    if (id && insuranceBySteam.has(id)) insuranceBySteam.get(id).push(serializeInsuranceVehicle(vehicle));
  }
  const insurances = steam64s.map(steam64 => ({
    schemaVersion: BRIDGE_SCHEMA_VERSION,
    steam64,
    generatedAt: now.toISOString(),
    vehicles: insuranceBySteam.get(steam64) || []
  }));

  const heartbeat = {
    ok: true,
    transport: 'http-api',
    lastSeenAt: now.toISOString(),
    serverId,
    serverType,
    modVersion,
    onlinePlayers: steam64s.length,
    pendingDeliveriesSent: deliveryRows.length,
    fullVipSync,
    fullVipCount: fullVipSync ? vipPayloads.length : null,
    received: {
      deliveryResults: ackResultIds.length,
      playtime: ackPlaytimeIds.length,
      ranking: ackRankingIds.length
    },
    remoteIp: String(requestMeta.ip || '').slice(0, 80)
  };
  // Heartbeat no banco é limitado a 1 gravação/10s, salvo quando há trabalho
  // relevante. Isso mantém o painel responsivo sem escrever no PostgreSQL a cada poll.
  const hasWork = deliveryRows.length > 0 || ackResultIds.length > 0 || ackPlaytimeIds.length > 0 || ackRankingIds.length > 0 || fullVipSync;
  if (hasWork || Date.now() - lastHeartbeatWriteAt >= 10_000) {
    await prisma.appSetting.upsert({
      where: { key: HEARTBEAT_KEY },
      update: { value: heartbeat },
      create: { key: HEARTBEAT_KEY, value: heartbeat }
    });
    lastHeartbeatWriteAt = Date.now();
  }

  return {
    ok: true,
    schemaVersion: BRIDGE_SCHEMA_VERSION,
    transport: 'http-api',
    serverTime: now.toISOString(),
    pollAfterSeconds: 5,
    fullVipSync,
    activeVipSteam64s: fullVipSync ? [...selectedVipBySteam.keys()] : [],
    deliveryQueues,
    vips: vipPayloads,
    insurances,
    ackResultIds: ackResultIds.filter(Boolean),
    ackPlaytimeIds: ackPlaytimeIds.filter(Boolean),
    ackRankingIds: ackRankingIds.filter(Boolean)
  };
}

export async function getGameApiBridgeStatus() {
  const row = await prisma.appSetting.findUnique({ where: { key: HEARTBEAT_KEY } });
  const heartbeat = row?.value || null;
  const lastSeenMs = heartbeat?.lastSeenAt ? new Date(heartbeat.lastSeenAt).getTime() : 0;
  const ageSeconds = lastSeenMs ? Math.max(0, Math.floor((Date.now() - lastSeenMs) / 1000)) : null;
  return {
    configured: Boolean(String(env.apiKey || '').trim()),
    connected: Boolean(lastSeenMs && Date.now() - lastSeenMs < 30_000),
    ageSeconds,
    endpoint: `${env.publicUrl}/api/game/bridge/poll`,
    heartbeat
  };
}

// Compatibilidade com partes antigas do site que antes tentavam empurrar arquivos por FTP.
// No bridge HTTP o mod busca o estado no próximo poll, então estas chamadas viram operações leves.
export function queueImmediatePlayerFileSync(steam64) {
  return Boolean(safeSteam64(steam64));
}

export async function publishPlayerDeliveryFilesNow(steam64s = []) {
  const valid = [...new Set((steam64s || []).map(safeSteam64).filter(Boolean))];
  return { ok: true, skipped: false, transport: 'http-api-pull', published: valid.length, queued: valid.length, activePlayers: valid.length, basePath: '/api/game/bridge/poll' };
}

export async function syncPlayerVipFileNow(steam64) {
  const valid = safeSteam64(steam64);
  return { ok: Boolean(valid), skipped: false, transport: 'http-api-pull', queued: Boolean(valid), published: valid ? 1 : 0, activePlayers: valid ? 1 : 0, basePath: '/api/game/bridge/poll' };
}

export async function syncPlayerFilesNow(steam64) {
  return syncPlayerVipFileNow(steam64);
}

export async function forceSyncAllVipFilesNow() {
  const now = new Date();
  const activePlayers = await prisma.playerOutfitSubscription.count({
    where: { status: 'ACTIVE', expiresAt: { gt: now }, outfitTemplate: { active: true } }
  });
  return { ok: true, skipped: false, transport: 'http-api-pull', activePlayers, basePath: '/api/game/bridge/poll', durationMs: 0 };
}
