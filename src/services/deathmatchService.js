import crypto from 'crypto';
import { prisma } from '../db/prisma.js';
import { logAudit } from './auditService.js';
import { getRankingData } from './rankingService.js';

export const DEATHMATCH_SETTING_KEY = 'deathmatch_interactive_v1';

const MAX_QUEUE_ITEMS = 250;
const MAX_CLAIM_ITEMS = 25;

export const DEATHMATCH_ACTIONS = [
  { code: 'spawn_zombie', name: 'Dropar zumbi', type: 'danger', targetKind: 'infected', classname: 'ZmbM_PatrolNormal_Autumn', quantity: 1, maxQuantity: 50, description: 'Spawna zumbi perto do streamer.' },
  { code: 'spawn_zombie_horde', name: 'Horda de zumbis', type: 'danger', targetKind: 'infected', classname: 'ZmbM_PatrolNormal_Autumn', quantity: 10, maxQuantity: 80, description: 'Horda forte para presente caro.' },
  { code: 'spawn_animal', name: 'Dropar animal', type: 'danger', targetKind: 'animal', classname: 'Animal_CanisLupus_Grey', quantity: 1, maxQuantity: 20, description: 'Spawna lobo, urso, javali ou outro animal configurado.' },
  { code: 'spawn_wolf_pack', name: 'Matilha de lobos', type: 'danger', targetKind: 'animal', classname: 'Animal_CanisLupus_Grey', quantity: 4, maxQuantity: 20, description: 'Vários lobos ao redor do streamer.' },
  { code: 'spawn_bear', name: 'Urso no streamer', type: 'danger', targetKind: 'animal', classname: 'Animal_UrsusArctos', quantity: 1, maxQuantity: 5, description: 'Um urso para presente pesado.' },
  { code: 'pox_grenade', name: 'Granada POX em cima', type: 'danger', targetKind: 'effect', classname: 'ContaminatedArea_Dynamic', quantity: 1, maxQuantity: 5, description: 'Cria efeito de gás/POX perto do streamer.' },
  { code: 'flashbang_instant', name: 'Flash instantânea', type: 'danger', targetKind: 'effect', classname: 'FlashGrenade', quantity: 1, maxQuantity: 5, description: 'Explode flash na hora.' },
  { code: 'frag_grenade_timed', name: 'Granada normal com tempo', type: 'danger', targetKind: 'explosive', classname: 'M67Grenade', quantity: 1, maxQuantity: 5, description: 'Cai armada e explode no tempo normal.' },
  { code: 'smoke_reveal', name: 'Fumaça revela posição', type: 'danger', targetKind: 'signal', classname: 'RDG2SmokeGrenade_Red', quantity: 1, maxQuantity: 10, description: 'Marca onde o streamer está para todos os players.' },
  { code: 'flare_reveal', name: 'Sinalizador revela posição', type: 'danger', targetKind: 'signal', classname: 'Roadflare', quantity: 1, maxQuantity: 10, description: 'Acende sinalizador no streamer.' },
  { code: 'loud_alarm', name: 'Alarme barulhento', type: 'danger', targetKind: 'effect', classname: 'SOUND_ALARM', quantity: 1, maxQuantity: 10, description: 'Som/aviso para denunciar a posição.' },
  { code: 'force_dance', name: 'Streamer dança', type: 'funny', targetKind: 'animation', classname: 'EMOTE_DANCE', quantity: 1, maxQuantity: 1, description: 'Força animação/emote por alguns segundos.' },
  { code: 'stamina_drain', name: 'Drenar stamina', type: 'danger', targetKind: 'effect', classname: 'STAMINA_DRAIN', quantity: 1, maxQuantity: 1, description: 'Cansa o streamer por um tempo.' },
  { code: 'bleed_effect', name: 'Sangramento leve', type: 'danger', targetKind: 'effect', classname: 'BLEED_LIGHT', quantity: 1, maxQuantity: 3, description: 'Aplica sangramento controlado.' },
  { code: 'weapon_jam', name: 'Travar arma', type: 'danger', targetKind: 'effect', classname: 'WEAPON_JAM', quantity: 1, maxQuantity: 1, description: 'Chance de emperrar arma do streamer.' },
  { code: 'remove_magazines', name: 'Remover pente atual', type: 'danger', targetKind: 'effect', classname: 'REMOVE_MAG', quantity: 1, maxQuantity: 5, description: 'Remove ou troca pente do streamer.' },
  { code: 'random_bad_weapon', name: 'Trocar para arma ruim', type: 'danger', targetKind: 'weapon', classname: 'IJ70', quantity: 1, maxQuantity: 1, description: 'Troca arma por arma fraca configurada.' },
  { code: 'heal_over_time', name: 'Recuperar vida devagar', type: 'help', targetKind: 'buff', classname: 'HEAL_REGEN', quantity: 1, maxQuantity: 1, description: 'Cura lenta, mas pausa em combate.' },
  { code: 'weapon_upgrade', name: 'Evoluir arma', type: 'help', targetKind: 'weapon', classname: 'M4A1', quantity: 1, maxQuantity: 1, description: 'Troca arma e já troca pente/munição.' },
  { code: 'ammo_refill', name: 'Repor pente/munição', type: 'help', targetKind: 'ammo', classname: 'Mag_STANAG_30Rnd', quantity: 2, maxQuantity: 10, description: 'Dá pente correto e munição compatível.' },
  { code: 'armor_repair', name: 'Reparar colete/roupa', type: 'help', targetKind: 'buff', classname: 'REPAIR_GEAR', quantity: 1, maxQuantity: 1, description: 'Repara equipamentos do streamer.' },
  { code: 'friendly_npc', name: 'NPC amigável', type: 'help', targetKind: 'npc', classname: 'SurvivorM_Mirek', quantity: 1, maxQuantity: 5, description: 'Ajuda rara definida pelo admin.' },
  { code: 'shield_seconds', name: 'Proteção temporária', type: 'help', targetKind: 'buff', classname: 'SHIELD_TEMP', quantity: 1, maxQuantity: 1, description: 'Reduz dano por poucos segundos.' },
  { code: 'cure_sickness', name: 'Curar doença/sangue', type: 'help', targetKind: 'buff', classname: 'CURE_STATUS', quantity: 1, maxQuantity: 1, description: 'Remove doença, inconsciência leve ou sangue baixo conforme o mod permitir.' }
];

export const DEATHMATCH_CLASS_OPTIONS = {
  zombies: [
    'ZmbM_PatrolNormal_Autumn', 'ZmbM_PatrolNormal_Flat', 'ZmbM_SoldierNormal', 'ZmbM_usSoldier_normal_Woodland', 'ZmbM_PolicemanSpecForce', 'ZmbF_PoliceWomanNormal', 'ZmbM_FirefighterNormal', 'ZmbM_DoctorFat', 'ZmbM_HeavyIndustryWorker'
  ],
  animals: [
    'Animal_CanisLupus_Grey', 'Animal_CanisLupus_White', 'Animal_UrsusArctos', 'Animal_SusDomesticus', 'Animal_CapraHircus', 'Animal_CervusElaphus', 'Animal_BosTaurus', 'Animal_GallusGallusDomesticus'
  ],
  weapons: [
    'M4A1', 'AKM', 'AK74', 'FAL', 'SVD', 'VSS', 'ASVAL', 'Mosin9130', 'Winchester70', 'SKS', 'MP5K', 'UMP45', 'Saiga', 'Deagle', 'Glock19', 'IJ70'
  ],
  magazines: [
    'Mag_STANAG_30Rnd', 'Mag_AKM_30Rnd', 'Mag_AK74_30Rnd', 'Mag_FAL_20Rnd', 'Mag_SVD_10Rnd', 'Mag_VSS_10Rnd', 'Mag_CMAG_20Rnd', 'Mag_MP5_30Rnd', 'Mag_UMP_25Rnd', 'Mag_Saiga_8Rnd', 'Mag_Deagle_9Rnd', 'Mag_Glock_15Rnd', 'Mag_IJ70_8Rnd'
  ],
  ammo: [
    'Ammo_556x45', 'Ammo_762x39', 'Ammo_545x39', 'Ammo_308Win', 'Ammo_762x54', 'Ammo_9x39', 'Ammo_9x19', 'Ammo_45ACP', 'Ammo_12gaPellets', 'Ammo_357', 'Ammo_380'
  ],
  grenades: ['M67Grenade', 'RGD5Grenade', 'FlashGrenade', 'RDG2SmokeGrenade_Red', 'RDG2SmokeGrenade_Black', 'Roadflare']
};

const DEFAULT_CONFIG = {
  version: 2,
  enabled: true,
  betaLabel: 'RAID-Z Death Math Interativo com TikTok BETA',
  gameplay: {
    blockStoreOnDeathmatch: true,
    blockAdminCallOnDeathmatch: true,
    onlyStreamerSeesGiftNames: true,
    clearAllOnStreamerDeath: true,
    noHunger: true,
    noThirst: true,
    globalSlowHealthRegen: true,
    regenDelaySeconds: 18,
    regenTickSeconds: 4,
    regenHealthPerTick: 2,
    combatCooldownSeconds: 35,
    pauseRegenWhenShoots: true,
    pauseRegenWhenTakesDamage: true,
    pauseRegenWhenHitsEnemy: true,
    magazineAutoReplace: true,
    replaceEmptyMagazineForAllPlayers: true,
    rankingToggleKey: 'F7',
    rankingDefaultPeriod: 'weekly',
    streamerGiftLabelSeconds: 8,
    spawnedGiftLabelSeconds: 8,
    killRequiredObjectsStayUntilKilled: true
  },
  helpBalance: {
    helpActionsAreRare: true,
    minGiftCoinsForHelp: 10,
    helpCooldownSeconds: 120,
    dangerCooldownSeconds: 5,
    maxHelpPerMinute: 2,
    maxDangerPerMinute: 30
  },
  streamers: [],
  giftMappings: [
    { id: 'gift_rose_zombie', active: true, giftName: 'Rosa', tiktokGiftId: '', actionCode: 'spawn_zombie', classname: 'ZmbM_PatrolNormal_Autumn', quantity: 1, radiusMeters: 6, donorVisibleToStreamerOnly: true, target: 'streamer', category: 'danger', rarity: 'common', minGiftCount: 1, note: 'Cada rosa dropa 1 zumbi.' },
    { id: 'gift_heart_zombies', active: true, giftName: 'Coração', tiktokGiftId: '', actionCode: 'spawn_zombie', classname: 'ZmbM_SoldierNormal', quantity: 3, radiusMeters: 8, donorVisibleToStreamerOnly: true, target: 'streamer', category: 'danger', rarity: 'common', minGiftCount: 1, note: 'Zumbis militares.' },
    { id: 'gift_donut_wolfpack', active: true, giftName: 'Donut', tiktokGiftId: '', actionCode: 'spawn_wolf_pack', classname: 'Animal_CanisLupus_Grey', quantity: 4, radiusMeters: 18, donorVisibleToStreamerOnly: true, target: 'streamer', category: 'danger', rarity: 'rare', minGiftCount: 1, note: 'Matilha.' },
    { id: 'gift_perfume_bear', active: true, giftName: 'Perfume', tiktokGiftId: '', actionCode: 'spawn_bear', classname: 'Animal_UrsusArctos', quantity: 1, radiusMeters: 25, donorVisibleToStreamerOnly: true, target: 'streamer', category: 'danger', rarity: 'epic', minGiftCount: 1, note: 'Urso pesado.' },
    { id: 'gift_fireworks_pox', active: true, giftName: 'Fogos', tiktokGiftId: '', actionCode: 'pox_grenade', classname: 'ContaminatedArea_Dynamic', quantity: 1, radiusMeters: 4, donorVisibleToStreamerOnly: true, target: 'streamer', category: 'danger', rarity: 'rare', minGiftCount: 1, note: 'POX/gás.' },
    { id: 'gift_cap_flash', active: true, giftName: 'Boné', tiktokGiftId: '', actionCode: 'flashbang_instant', classname: 'FlashGrenade', quantity: 1, radiusMeters: 2, donorVisibleToStreamerOnly: true, target: 'streamer', category: 'danger', rarity: 'common', minGiftCount: 1, note: 'Flash instantânea.' },
    { id: 'gift_train_frag', active: true, giftName: 'Trem', tiktokGiftId: '', actionCode: 'frag_grenade_timed', classname: 'M67Grenade', quantity: 1, radiusMeters: 3, donorVisibleToStreamerOnly: true, target: 'streamer', category: 'danger', rarity: 'epic', minGiftCount: 1, note: 'Granada normal com tempo.' },
    { id: 'gift_smoke_reveal', active: true, giftName: 'Microfone', tiktokGiftId: '', actionCode: 'smoke_reveal', classname: 'RDG2SmokeGrenade_Red', quantity: 1, radiusMeters: 1, donorVisibleToStreamerOnly: true, target: 'streamer', category: 'danger', rarity: 'common', minGiftCount: 1, note: 'Mostra posição para os outros.' },
    { id: 'gift_dance', active: true, giftName: 'TikTok', tiktokGiftId: '', actionCode: 'force_dance', classname: 'EMOTE_DANCE', quantity: 1, radiusMeters: 0, donorVisibleToStreamerOnly: true, target: 'streamer', category: 'funny', rarity: 'common', minGiftCount: 1, note: 'Faz o streamer dançar.' },
    { id: 'gift_heal', active: true, giftName: 'Galáxia', tiktokGiftId: '', actionCode: 'heal_over_time', classname: 'HEAL_REGEN', quantity: 1, radiusMeters: 0, donorVisibleToStreamerOnly: true, target: 'streamer', category: 'help', rarity: 'legendary', minGiftCount: 1, note: 'Ajuda rara: cura devagar e pausa em combate.' },
    { id: 'gift_weapon_upgrade', active: true, giftName: 'Leão', tiktokGiftId: '', actionCode: 'weapon_upgrade', classname: 'M4A1', magazineClassname: 'Mag_STANAG_30Rnd', ammoClassname: 'Ammo_556x45', quantity: 1, radiusMeters: 0, donorVisibleToStreamerOnly: true, target: 'streamer', category: 'help', rarity: 'legendary', minGiftCount: 1, note: 'Troca arma, pente e munição.' },
    { id: 'gift_ammo_refill', active: true, giftName: 'Castelo', tiktokGiftId: '', actionCode: 'ammo_refill', classname: 'Mag_STANAG_30Rnd', magazineClassname: 'Mag_STANAG_30Rnd', ammoClassname: 'Ammo_556x45', quantity: 3, radiusMeters: 0, donorVisibleToStreamerOnly: true, target: 'streamer', category: 'help', rarity: 'legendary', minGiftCount: 1, note: 'Repor pentes/munição compatíveis.' }
  ],
  eventQueue: [],
  lastUpdatedAt: new Date().toISOString()
};

function cloneDefault() {
  return JSON.parse(JSON.stringify(DEFAULT_CONFIG));
}

function toBool(value, fallback = false) {
  if (typeof value === 'boolean') return value;
  const normalized = String(value ?? '').trim().toLowerCase();
  if (!normalized) return fallback;
  return ['true', '1', 'yes', 'sim', 'on', 'ativo', 'active'].includes(normalized);
}

function toInt(value, fallback = 0, min = 0, max = 9999) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(Math.floor(n), max));
}

function cleanText(value, max = 120) {
  return String(value || '').trim().replace(/\s+/g, ' ').slice(0, max);
}

function cleanSteam64(value) {
  const steam64 = cleanText(value, 30);
  if (!/^\d{17}$/.test(steam64)) throw new Error('Steam64 inválido. Use 17 números.');
  return steam64;
}

function normalizeConfig(saved) {
  const base = cloneDefault();
  const cfg = saved && typeof saved === 'object' ? saved : {};
  return {
    ...base,
    ...cfg,
    gameplay: { ...base.gameplay, ...(cfg.gameplay || {}) },
    helpBalance: { ...base.helpBalance, ...(cfg.helpBalance || {}) },
    streamers: Array.isArray(cfg.streamers) ? cfg.streamers : base.streamers,
    giftMappings: Array.isArray(cfg.giftMappings) && cfg.giftMappings.length ? cfg.giftMappings : base.giftMappings,
    eventQueue: Array.isArray(cfg.eventQueue) ? cfg.eventQueue.slice(-MAX_QUEUE_ITEMS) : [],
    lastUpdatedAt: cfg.lastUpdatedAt || base.lastUpdatedAt
  };
}

export async function getDeathmatchConfig(tx = prisma) {
  const saved = await tx.appSetting.findUnique({ where: { key: DEATHMATCH_SETTING_KEY } });
  return normalizeConfig(saved?.value || null);
}

export async function saveDeathmatchConfig(config, actor = 'admin', tx = prisma) {
  const value = normalizeConfig({ ...config, lastUpdatedAt: new Date().toISOString() });
  await tx.appSetting.upsert({
    where: { key: DEATHMATCH_SETTING_KEY },
    update: { value },
    create: { key: DEATHMATCH_SETTING_KEY, value }
  });
  await logAudit({ actor, action: 'deathmatch.config.updated', target: DEATHMATCH_SETTING_KEY, data: { streamers: value.streamers.length, mappings: value.giftMappings.length } });
  return value;
}

export function makeAccessCode() {
  return crypto.randomBytes(4).toString('hex').toUpperCase();
}

export async function saveDeathmatchGameplay(body = {}) {
  const cfg = await getDeathmatchConfig();
  cfg.enabled = toBool(body.enabled, false);
  cfg.betaLabel = cleanText(body.betaLabel, 160) || cfg.betaLabel;
  cfg.gameplay = {
    ...cfg.gameplay,
    blockStoreOnDeathmatch: toBool(body.blockStoreOnDeathmatch, false),
    blockAdminCallOnDeathmatch: toBool(body.blockAdminCallOnDeathmatch, false),
    onlyStreamerSeesGiftNames: toBool(body.onlyStreamerSeesGiftNames, false),
    clearAllOnStreamerDeath: toBool(body.clearAllOnStreamerDeath, false),
    noHunger: toBool(body.noHunger, false),
    noThirst: toBool(body.noThirst, false),
    globalSlowHealthRegen: toBool(body.globalSlowHealthRegen, false),
    regenDelaySeconds: toInt(body.regenDelaySeconds, 18, 1, 600),
    regenTickSeconds: toInt(body.regenTickSeconds, 4, 1, 120),
    regenHealthPerTick: toInt(body.regenHealthPerTick, 2, 1, 25),
    combatCooldownSeconds: toInt(body.combatCooldownSeconds, 35, 1, 600),
    pauseRegenWhenShoots: toBool(body.pauseRegenWhenShoots, false),
    pauseRegenWhenTakesDamage: toBool(body.pauseRegenWhenTakesDamage, false),
    pauseRegenWhenHitsEnemy: toBool(body.pauseRegenWhenHitsEnemy, false),
    magazineAutoReplace: toBool(body.magazineAutoReplace, false),
    replaceEmptyMagazineForAllPlayers: toBool(body.replaceEmptyMagazineForAllPlayers, false),
    rankingToggleKey: cleanText(body.rankingToggleKey, 16) || 'F7',
    rankingDefaultPeriod: ['daily', 'weekly', 'monthly', 'season', 'all'].includes(String(body.rankingDefaultPeriod || '').toLowerCase()) ? String(body.rankingDefaultPeriod).toLowerCase() : 'weekly',
    streamerGiftLabelSeconds: toInt(body.streamerGiftLabelSeconds, 8, 1, 120),
    spawnedGiftLabelSeconds: toInt(body.spawnedGiftLabelSeconds, 8, 1, 120),
    killRequiredObjectsStayUntilKilled: toBool(body.killRequiredObjectsStayUntilKilled, true)
  };
  cfg.helpBalance = {
    ...cfg.helpBalance,
    helpActionsAreRare: toBool(body.helpActionsAreRare, false),
    minGiftCoinsForHelp: toInt(body.minGiftCoinsForHelp, 10, 0, 100000),
    helpCooldownSeconds: toInt(body.helpCooldownSeconds, 120, 0, 3600),
    dangerCooldownSeconds: toInt(body.dangerCooldownSeconds, 5, 0, 3600),
    maxHelpPerMinute: toInt(body.maxHelpPerMinute, 2, 0, 100),
    maxDangerPerMinute: toInt(body.maxDangerPerMinute, 30, 0, 500)
  };
  return saveDeathmatchConfig(cfg);
}

export async function upsertDeathmatchStreamer(body = {}) {
  const cfg = await getDeathmatchConfig();
  const steam64 = cleanSteam64(body.steam64);
  const existing = cfg.streamers.find(s => s.steam64 === steam64);
  const accessCode = cleanText(body.accessCode, 32) || existing?.accessCode || makeAccessCode();
  const streamer = {
    id: existing?.id || crypto.randomUUID(),
    steam64,
    displayName: cleanText(body.displayName, 80) || existing?.displayName || steam64,
    tiktokUsername: cleanText(body.tiktokUsername, 80).replace(/^@/, ''),
    active: toBool(body.active, true),
    accessCode,
    createdAt: existing?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  cfg.streamers = [streamer, ...cfg.streamers.filter(s => s.steam64 !== steam64)];
  return saveDeathmatchConfig(cfg);
}

export async function removeDeathmatchStreamer(steam64) {
  const clean = cleanSteam64(steam64);
  const cfg = await getDeathmatchConfig();
  cfg.streamers = cfg.streamers.filter(s => s.steam64 !== clean);
  cfg.eventQueue = cfg.eventQueue.filter(e => e.streamerSteam64 !== clean);
  return saveDeathmatchConfig(cfg);
}

export function normalizeGiftMapping(body = {}, previous = {}) {
  const actionCode = cleanText(body.actionCode || previous.actionCode || 'spawn_zombie', 60);
  const action = DEATHMATCH_ACTIONS.find(a => a.code === actionCode) || DEATHMATCH_ACTIONS[0];
  const id = cleanText(body.id || previous.id, 80) || `gift_${crypto.randomUUID()}`;
  return {
    id,
    active: toBool(body.active, previous.active ?? true),
    giftName: cleanText(body.giftName || previous.giftName || 'Presente', 80),
    tiktokGiftId: cleanText(body.tiktokGiftId || previous.tiktokGiftId || '', 80),
    actionCode: action.code,
    classname: cleanText(body.classname || previous.classname || action.classname, 80),
    magazineClassname: cleanText(body.magazineClassname || previous.magazineClassname || '', 80),
    ammoClassname: cleanText(body.ammoClassname || previous.ammoClassname || '', 80),
    quantity: toInt(body.quantity, previous.quantity ?? action.quantity ?? 1, 1, action.maxQuantity || 100),
    radiusMeters: toInt(body.radiusMeters, previous.radiusMeters ?? 6, 0, 500),
    donorVisibleToStreamerOnly: true,
    target: ['streamer', 'all_players', 'near_streamer'].includes(String(body.target || previous.target || '').toLowerCase()) ? String(body.target || previous.target).toLowerCase() : 'streamer',
    category: ['danger', 'help', 'funny', 'neutral'].includes(String(body.category || previous.category || '').toLowerCase()) ? String(body.category || previous.category).toLowerCase() : action.type,
    rarity: ['common', 'rare', 'epic', 'legendary'].includes(String(body.rarity || previous.rarity || '').toLowerCase()) ? String(body.rarity || previous.rarity).toLowerCase() : 'common',
    minGiftCount: toInt(body.minGiftCount, previous.minGiftCount ?? 1, 1, 9999),
    note: cleanText(body.note || previous.note || '', 180)
  };
}

export async function upsertDeathmatchGiftMapping(body = {}) {
  const cfg = await getDeathmatchConfig();
  const previous = cfg.giftMappings.find(m => m.id === body.id) || {};
  const mapping = normalizeGiftMapping(body, previous);
  cfg.giftMappings = [mapping, ...cfg.giftMappings.filter(m => m.id !== mapping.id)];
  return saveDeathmatchConfig(cfg);
}

export async function removeDeathmatchGiftMapping(id) {
  const cfg = await getDeathmatchConfig();
  cfg.giftMappings = cfg.giftMappings.filter(m => m.id !== id);
  return saveDeathmatchConfig(cfg);
}

export async function authenticateStreamer(steam64, accessCode) {
  const cfg = await getDeathmatchConfig();
  const clean = cleanSteam64(steam64);
  const code = cleanText(accessCode, 32).toUpperCase();
  const streamer = cfg.streamers.find(s => s.steam64 === clean && String(s.accessCode || '').toUpperCase() === code && s.active !== false);
  if (!streamer) throw new Error('Streamer não liberado ou código incorreto.');
  return { cfg, streamer };
}

export async function updateStreamerMappingsFromBody(body = {}) {
  const { cfg, streamer } = await authenticateStreamer(body.steam64, body.accessCode);
  const allowedIds = Array.isArray(body.mappingId) ? body.mappingId : [body.mappingId].filter(Boolean);
  const giftNames = Array.isArray(body.giftName) ? body.giftName : [body.giftName];
  const activeValues = new Set(Array.isArray(body.activeMapping) ? body.activeMapping : [body.activeMapping].filter(Boolean));

  cfg.giftMappings = cfg.giftMappings.map((mapping, index) => {
    if (!allowedIds.includes(mapping.id)) return mapping;
    return {
      ...mapping,
      giftName: cleanText(giftNames[index] || mapping.giftName, 80) || mapping.giftName,
      active: activeValues.has(mapping.id),
      donorVisibleToStreamerOnly: true,
      updatedByStreamerSteam64: streamer.steam64,
      updatedAt: new Date().toISOString()
    };
  });
  await saveDeathmatchConfig(cfg, streamer.steam64);
  return { cfg, streamer };
}


function toLegacyActionType(code) {
  const map = {
    spawn_zombie: 'SPAWN_AI',
    spawn_zombie_horde: 'SPAWN_AI',
    spawn_animal: 'SPAWN_AI',
    spawn_wolf_pack: 'SPAWN_AI',
    spawn_bear: 'SPAWN_AI',
    pox_grenade: 'POX_GRENADE_INSTANT',
    flashbang_instant: 'FLASHBANG_INSTANT',
    frag_grenade_timed: 'FRAG_GRENADE_TIMER',
    smoke_reveal: 'VISUAL_SIGNAL',
    flare_reveal: 'SKY_FLARE',
    loud_alarm: 'LOCAL_SOUND_LOOP',
    force_dance: 'FORCE_EMOTE',
    stamina_drain: 'STAMINA_DRAIN',
    bleed_effect: 'PLAYER_BLEED',
    weapon_jam: 'WEAPON_JAM',
    remove_magazines: 'DROP_HELD_ITEM',
    random_bad_weapon: 'WEAPON_SWAP',
    heal_over_time: 'HEAL_OVER_TIME',
    weapon_upgrade: 'WEAPON_SWAP',
    ammo_refill: 'AMMO_REFILL_CURRENT',
    armor_repair: 'TEMP_ARMOR',
    friendly_npc: 'SPAWN_FRIENDLY_NPC',
    shield_seconds: 'TEMP_ARMOR',
    cure_sickness: 'STOP_BLEEDING'
  };
  return map[code] || 'DROP_ITEM';
}

function findMappingForGift(cfg, giftName, giftId = '') {
  const cleanName = cleanText(giftName, 80).toLowerCase();
  const cleanId = cleanText(giftId, 80).toLowerCase();
  return cfg.giftMappings.find(m => m.active !== false && ((cleanId && String(m.tiktokGiftId || '').toLowerCase() === cleanId) || String(m.giftName || '').toLowerCase() === cleanName));
}

export async function enqueueDeathmatchGiftEvent(data = {}, actor = 'api') {
  const cfg = await getDeathmatchConfig();
  if (!cfg.enabled) throw new Error('Death Match Interativo está desligado no painel.');
  const streamerSteam64 = cleanSteam64(data.streamerSteam64 || data.steam64);
  const streamer = cfg.streamers.find(s => s.steam64 === streamerSteam64 && s.active !== false);
  if (!streamer) throw new Error('Streamer não liberado ou desativado.');
  const giftName = cleanText(data.giftName, 80);
  const giftId = cleanText(data.giftId || data.tiktokGiftId, 80);
  const mapping = findMappingForGift(cfg, giftName, giftId);
  if (!mapping) throw new Error(`Nenhuma ação ativa para o presente: ${giftName || giftId || 'sem nome'}.`);
  const repeatCount = toInt(data.repeatCount || data.count || data.quantity, 1, 1, 999);
  const now = new Date().toISOString();
  const event = {
    id: `dm_evt_${crypto.randomUUID()}`,
    status: 'PENDING',
    streamerSteam64,
    streamerSteamId: streamerSteam64,
    streamerName: streamer.displayName || streamer.steam64,
    donorName: cleanText(data.donorName || data.username || data.user || 'Anônimo', 80),
    donorId: cleanText(data.donorId || data.userId || '', 80),
    giftName: giftName || mapping.giftName,
    giftId,
    repeatCount,
    createdAt: now,
    claimedAt: null,
    confirmedAt: null,
    visibleNames: { streamerOnly: true, showToOtherPlayers: false },
    giftLabel: giftName || mapping.giftName,
    action: {
      code: mapping.actionCode,
      id: mapping.actionCode,
      title: mapping.actionCode,
      actionType: toLegacyActionType(mapping.actionCode),
      classname: mapping.classname,
      dayzClass: mapping.classname,
      weaponClass: ['weapon_upgrade', 'random_bad_weapon'].includes(mapping.actionCode) ? mapping.classname : '',
      magazineClassname: mapping.magazineClassname || null,
      magazineClass: mapping.magazineClassname || '',
      ammoClassname: mapping.ammoClassname || null,
      ammoClass: mapping.ammoClassname || '',
      magazineCount: mapping.magazineClassname ? Math.max(1, Number(mapping.quantity || 1)) : 0,
      ammoBoxes: mapping.ammoClassname ? Math.max(1, Number(mapping.quantity || 1)) : 0,
      quantity: Math.max(1, Number(mapping.quantity || 1)) * repeatCount,
      maxQuantity: Math.max(1, Number(mapping.quantity || 1)) * repeatCount,
      radiusMeters: Number(mapping.radiusMeters || 0),
      spawn: { radius: Number(mapping.radiusMeters || 0), mode: mapping.target || 'streamer' },
      nameplate: { enabled: true, donorName: cleanText(data.donorName || data.username || data.user || 'Anônimo', 80), giftName: giftName || mapping.giftName, seconds: cfg.gameplay.streamerGiftLabelSeconds, stayUntilKilled: cfg.gameplay.killRequiredObjectsStayUntilKilled },
      target: mapping.target || 'streamer',
      category: mapping.category || 'danger',
      rarity: mapping.rarity || 'common',
      killRequiredObjectsStayUntilKilled: cfg.gameplay.killRequiredObjectsStayUntilKilled
    },
    mappingId: mapping.id,
    raw: data
  };
  cfg.eventQueue = [...(cfg.eventQueue || []), event].slice(-MAX_QUEUE_ITEMS);
  await saveDeathmatchConfig(cfg, actor);
  return event;
}

export async function claimDeathmatchEvents({ streamerSteam64, limit = MAX_CLAIM_ITEMS } = {}) {
  const cfg = await getDeathmatchConfig();
  const clean = cleanSteam64(streamerSteam64);
  const now = new Date().toISOString();
  const max = toInt(limit, MAX_CLAIM_ITEMS, 1, MAX_CLAIM_ITEMS);
  const claimed = [];
  cfg.eventQueue = (cfg.eventQueue || []).map((event) => {
    if (claimed.length >= max) return event;
    if (event.streamerSteam64 !== clean || event.status !== 'PENDING') return event;
    const updated = { ...event, status: 'PROCESSING', claimedAt: now };
    claimed.push(updated);
    return updated;
  }).slice(-MAX_QUEUE_ITEMS);
  if (claimed.length) await saveDeathmatchConfig(cfg, 'deathmatch-mod');
  return { cfg, events: claimed };
}

export async function confirmDeathmatchEvent({ eventId, ok = true, error = '' } = {}) {
  const cfg = await getDeathmatchConfig();
  let found = null;
  cfg.eventQueue = (cfg.eventQueue || []).map((event) => {
    if (event.id !== eventId) return event;
    found = { ...event, status: ok ? 'DONE' : 'FAILED', confirmedAt: new Date().toISOString(), error: cleanText(error, 400) || null };
    return found;
  }).slice(-MAX_QUEUE_ITEMS);
  if (!found) throw new Error('Evento Death Match não encontrado.');
  await saveDeathmatchConfig(cfg, 'deathmatch-mod');
  return found;
}

export async function clearDeathmatchStreamer({ streamerSteam64, reason = 'streamer_death' } = {}) {
  const cfg = await getDeathmatchConfig();
  const clean = cleanSteam64(streamerSteam64);
  let count = 0;
  cfg.eventQueue = (cfg.eventQueue || []).map((event) => {
    if (event.streamerSteam64 !== clean) return event;
    if (['PENDING', 'PROCESSING'].includes(event.status)) {
      count += 1;
      return { ...event, status: 'CANCELLED', cancelledAt: new Date().toISOString(), cancelReason: reason };
    }
    return event;
  }).slice(-MAX_QUEUE_ITEMS);
  await saveDeathmatchConfig(cfg, 'deathmatch-mod');
  return { cancelled: count };
}

export async function getDeathmatchPublicConfig(streamerSteam64 = '') {
  const cfg = await getDeathmatchConfig();
  const clean = cleanSteam64(streamerSteam64);
  const streamer = cfg.streamers.find(s => s.steam64 === clean && s.active !== false);
  if (!streamer) throw new Error('Streamer não liberado para Death Match Interativo.');
  return {
    enabled: cfg.enabled,
    betaLabel: cfg.betaLabel,
    streamer: { steam64: streamer.steam64, displayName: streamer.displayName, tiktokUsername: streamer.tiktokUsername },
    gameplay: cfg.gameplay,
    helpBalance: cfg.helpBalance,
    actions: DEATHMATCH_ACTIONS,
    giftMappings: cfg.giftMappings.filter(m => m.active !== false),
    classOptions: DEATHMATCH_CLASS_OPTIONS
  };
}

export async function getDeathmatchRanking({ period = 'weekly', limit = 15 } = {}) {
  const data = await getRankingData({ server: 'deathmatch', period });
  const max = toInt(limit, 15, 1, 50);
  return {
    selectedServer: 'deathmatch',
    selectedPeriod: data.selectedPeriod,
    range: data.range,
    totals: data.totals,
    players: data.playerRanking.slice(0, max).map((p, index) => ({
      position: index + 1,
      steam64: p.steam64,
      name: p.name,
      kills: p.kills,
      deaths: p.deaths,
      headshots: p.headshots,
      kd: p.kd,
      score: p.score,
      longestKill: p.longestKill,
      favoriteWeapon: p.favoriteWeapon
    }))
  };
}
