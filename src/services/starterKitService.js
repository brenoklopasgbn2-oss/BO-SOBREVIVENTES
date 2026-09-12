import { prisma } from '../db/prisma.js';
import { logAudit } from './auditService.js';
import { publishPlayerDeliveryFilesNow, queueImmediatePlayerFileSync } from './gameApiBridgeService.js';
import { randomUUID } from 'crypto';

const SETTING_KEY = 'starterKit.v1';
const GAME_SERVER_TYPES = ['vanilla', 'bbp'];
const STARTER_KIT_CACHE_TTL_MS = 30_000;
const STARTER_KIT_CLAIM_CACHE_TTL_MS = 30_000;
const starterKitClaimCache = new Map();
let starterKitCache = null;
let starterKitCacheExpiresAt = 0;

// O PostgreSQL do Railway pode ter picos curtos de latência. O limite padrão
// das transações interativas do Prisma é 5 segundos, o que fazia alguns
// jogadores receberem P2028 ao resgatar o kit mesmo sem existir erro nos dados.
const STARTER_KIT_TRANSACTION_OPTIONS = {
  maxWait: 15_000,
  timeout: 60_000
};

export function invalidateStarterKitCache() {
  starterKitCache = null;
  starterKitCacheExpiresAt = 0;
}


// V610: o mod já sabe transformar a quantidade do site em pilhas reais para
// materiais empilháveis (ex.: WoodenPlank 36 => 10/10 + 10/10 + 10/10 + 6/10).
// Nunca dividir tábuas em registros unitários: isso fazia nascer dezenas de 1/10.
function expandStarterKitItemDeliveries(item = {}) {
  const quantity = Math.max(1, Math.min(Math.floor(Number(item.quantity || 1)), 999));
  return [{ quantity, unitIndex: 0, unitCount: 1, splitIntoUnits: false }];
}

function normalizeServerType(value, fallback = 'vanilla') {
  const serverType = String(value || fallback).trim().toLowerCase();
  return GAME_SERVER_TYPES.includes(serverType) ? serverType : fallback;
}

function normalizeKitServerType(value) {
  const v = String(value || 'current').trim().toLowerCase();
  return ['current', 'vanilla', 'bbp'].includes(v) ? v : 'current';
}

function toArray(value) {
  if (Array.isArray(value)) return value;
  if (value === undefined || value === null) return [];
  return [value];
}

export function parseStarterKitItemsText(text) {
  const raw = String(text || '').trim();
  if (!raw) return [];
  return raw.split(/\r?\n/).map((line, index) => {
    const clean = line.trim();
    if (!clean || clean.startsWith('#')) return null;
    const [classname, quantityRaw, label] = clean.split('|').map(v => String(v || '').trim());
    if (!classname) return null;
    const quantity = Math.max(1, Math.min(Number(quantityRaw || 1), 999));
    return {
      classname,
      quantity: Number.isFinite(quantity) ? quantity : 1,
      label: label || classname,
      sortOrder: index
    };
  }).filter(Boolean);
}

export function starterKitItemsToText(items) {
  const list = Array.isArray(items) ? items : [];
  return list.map(item => `${item.classname || ''}|${item.quantity || 1}|${item.label || ''}`).join('\n');
}

function defaultStarterKit() {
  return {
    enabled: true,
    name: 'Kit Inicial do Sobrevivente',
    description: 'Resgate grátis uma única vez. Materiais para 2 portões, 1 mastro de bandeira, ferramentas, barril, comida e benefício VIP grátis de 7 dias com mochila de 80 slots.',
    serverType: 'vanilla',
    bonusCoins: 0,
    deliveryType: 'drop_at_feet',
    imageUrl: '/dayz-wiki-image?type=Barrel_Red&name=Kit%20Inicial',
    imageData: null,
    imageMime: null,
    imageUpdatedAt: null,
    starterVip7dEnabled: true,
    starterVip7dBackpackSlots: 80,
    items: [
      { classname: 'Barrel_Red', quantity: 1, label: '1 Barril vermelho', sortOrder: 0 },
      { classname: 'NailBox', quantity: 2, label: '2 Caixas de pregos (140 pregos)', sortOrder: 1 },
      { classname: 'WoodenPlank', quantity: 36, label: '36 Tábuas para 2 portões', sortOrder: 2 },
      { classname: 'WoodenLog', quantity: 14, label: '14 Troncos (4 portões + 10 mastro)', sortOrder: 3 },
      { classname: 'MetalWire', quantity: 3, label: '3 Arames (2 portões + 1 mastro)', sortOrder: 4 },
      { classname: 'Rope', quantity: 2, label: '2 Cordas para os kits', sortOrder: 5 },
      { classname: 'WoodenStick', quantity: 5, label: '5 Gravetos curtos para os kits', sortOrder: 6 },
      { classname: 'LargeStone', quantity: 32, label: '32 Pedras grandes para o mastro', sortOrder: 7 },
      { classname: 'CodeLock', quantity: 1, label: '1 CodeLock', sortOrder: 8 },
      { classname: 'Shovel', quantity: 1, label: '1 Pá', sortOrder: 9 },
      { classname: 'Pickaxe', quantity: 1, label: '1 Picareta', sortOrder: 10 },
      { classname: 'Hatchet', quantity: 1, label: '1 Machadinha', sortOrder: 11 },
      { classname: 'Hammer', quantity: 1, label: '1 Martelo', sortOrder: 12 },
      { classname: 'Pliers', quantity: 1, label: '1 Alicate', sortOrder: 13 },
      { classname: 'SledgeHammer', quantity: 1, label: '1 Marreta', sortOrder: 14 },
      { classname: 'TacticalBaconCan', quantity: 2, label: '2 Latas de comida', sortOrder: 15 },
      { classname: 'Flag_White', quantity: 1, label: '1 Bandeira aleatória', sortOrder: 16, randomClassnames: ['Flag_White','Flag_Red','Flag_Blue','Flag_Green','Flag_Black'] }
    ]
  };
}

export function normalizeStarterKit(value = {}) {
  const base = defaultStarterKit();
  const source = value && typeof value === 'object' ? value : {};
  const items = Array.isArray(source.items) && source.items.length
    ? source.items.map((item, index) => ({
        classname: String(item.classname || '').trim(),
        quantity: Math.max(1, Math.min(Number(item.quantity || 1), 999)),
        label: String(item.label || item.classname || '').trim(),
        randomClassnames: Array.isArray(item.randomClassnames)
          ? item.randomClassnames.map(value => String(value || '').trim()).filter(Boolean).slice(0, 50)
          : [],
        sortOrder: Number.isFinite(Number(item.sortOrder)) ? Number(item.sortOrder) : index
      })).filter(item => item.classname)
    : base.items;

  return {
    enabled: source.enabled === undefined ? base.enabled : Boolean(source.enabled),
    name: String(source.name || base.name).trim(),
    description: String(source.description || base.description).trim(),
    serverType: normalizeKitServerType(source.serverType),
    bonusCoins: Math.max(0, Math.min(Number(source.bonusCoins ?? base.bonusCoins ?? 0), 1000000)),
    deliveryType: 'drop_at_feet',
    imageUrl: '',
    imageData: null,
    imageMime: null,
    imageUpdatedAt: source.imageUpdatedAt || null,
    starterVip7dEnabled: source.starterVip7dEnabled === undefined ? Boolean(base.starterVip7dEnabled) : Boolean(source.starterVip7dEnabled),
    starterVip7dBackpackSlots: Math.max(1, Number(source.starterVip7dBackpackSlots || base.starterVip7dBackpackSlots || 80)),
    items: items.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
  };
}

export async function getStarterKit(tx = prisma) {
  const canUseCache = tx === prisma;
  const now = Date.now();
  if (canUseCache && starterKitCache && starterKitCacheExpiresAt > now) return starterKitCache;

  const saved = await tx.appSetting.findUnique({ where: { key: SETTING_KEY } });
  const kit = normalizeStarterKit(saved?.value || {});
  if (canUseCache) {
    starterKitCache = kit;
    starterKitCacheExpiresAt = now + STARTER_KIT_CACHE_TTL_MS;
  }
  return kit;
}

async function findStarterKitClaim(tx, player) {
  if (!player) return null;
  if (tx.starterKitClaim) {
    const claim = await tx.starterKitClaim.findFirst({
      where: { OR: [{ playerId: player.id }, { steam64: player.steam64 }] },
      select: { id: true, claimedAt: true, kitName: true }
    });
    if (claim) return claim;
  }
  return tx.deliveryQueue.findFirst({
    where: {
      OR: [
        { playerId: player.id, productName: { contains: '[KIT INICIAL]' } },
        { steam64: player.steam64, productName: { contains: '[KIT INICIAL]' } },
        { playerId: player.id, productName: { contains: '[STORE WELCOME]' } },
        { steam64: player.steam64, productName: { contains: '[STORE WELCOME]' } }
      ]
    },
    select: { id: true, createdAt: true, productName: true }
  });
}

export async function saveStarterKitFromBody(body, file = null) {
  const currentKit = await getStarterKit();
  const itemsByRows = toArray(body.itemClassname).map((classname, index) => ({
    classname: String(classname || '').trim(),
    quantity: Math.max(1, Math.min(Number(toArray(body.itemQuantity)[index] || 1), 999)),
    label: String(toArray(body.itemLabel)[index] || classname || '').trim(),
    sortOrder: index
  })).filter(item => item.classname);
  const textItems = parseStarterKitItemsText(body.itemsText);
  const kit = normalizeStarterKit({
    enabled: body.enabled === 'on',
    name: body.name,
    description: body.description,
    serverType: body.serverType,
    bonusCoins: body.bonusCoins,
    deliveryType: 'drop_at_feet',
    imageUrl: '',
    imageData: null,
    imageMime: null,
    imageUpdatedAt: null,
    items: itemsByRows.length ? itemsByRows : textItems
  });


  await prisma.appSetting.upsert({
    where: { key: SETTING_KEY },
    update: { value: kit },
    create: { key: SETTING_KEY, value: kit }
  });
  starterKitCache = kit;
  starterKitCacheExpiresAt = Date.now() + STARTER_KIT_CACHE_TTL_MS;
  await logAudit({ actor: 'admin', action: 'starter_kit.updated', target: SETTING_KEY, data: { enabled: kit.enabled, itemCount: kit.items.length, serverType: kit.serverType } });
  return kit;
}

export async function hasClaimedStarterKit(playerId, steam64 = null) {
  if (!playerId) return false;
  const player = steam64
    ? { id: playerId, steam64: String(steam64) }
    : await prisma.player.findUnique({ where: { id: playerId }, select: { id: true, steam64: true } });
  return Boolean(await findStarterKitClaim(prisma, player));
}

export async function hasClaimedStarterKitFast(playerId, steam64 = null) {
  if (!playerId) return false;
  const key = `${playerId}:${String(steam64 || '')}`;
  const cached = starterKitClaimCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  const claim = await prisma.starterKitClaim.findFirst({
    where: {
      OR: [
        { playerId },
        ...(steam64 ? [{ steam64: String(steam64) }] : [])
      ]
    },
    select: { id: true }
  });
  const value = Boolean(claim);
  starterKitClaimCache.set(key, { value, expiresAt: Date.now() + STARTER_KIT_CLAIM_CACHE_TTL_MS });
  return value;
}

function resolveDeliveryServer(kit, selectedServerType) {
  if (kit.serverType === 'vanilla' || kit.serverType === 'bbp') return kit.serverType;
  return normalizeServerType(selectedServerType, 'vanilla');
}

async function createStarterKitDeliveries({ tx, player, kit, serverType, adminTest = false }) {
  // V610: não usar as palavras "kit inicial"/"starter" no payload enviado ao mod.
  // Versões anteriores do mod possuem um limitador legado que reconhece esses termos
  // e corta o pacote para o kit antigo (inclusive limitando WoodenPlank a 2).
  // O controle de 1 resgate por conta continua sendo feito pelo site/StarterKitClaim.
  const prefix = adminTest ? '[TESTE STORE WELCOME]' : '[STORE WELCOME]';
  const deliveries = [];

  // V610: uma linha por tipo de item, preservando a quantidade total.
  // O mod converte WoodenPlank em pilhas reais de até 10 unidades.
  for (const [index, item] of kit.items.entries()) {
    const randomPool = Array.isArray(item.randomClassnames) ? item.randomClassnames.filter(Boolean) : [];
    const resolvedClassname = randomPool.length
      ? randomPool[Math.floor(Math.random() * randomPool.length)]
      : item.classname;
    const resolvedItem = { ...item, classname: resolvedClassname };
    const units = expandStarterKitItemDeliveries(resolvedItem);
    for (const unit of units) {
      const unitSuffix = unit.splitIntoUnits ? ` [${unit.unitIndex + 1}/${unit.unitCount}]` : '';
      deliveries.push({
        id: randomUUID(),
        purchaseId: null,
        playerId: player.id,
        steam64: player.steam64,
        serverType,
        productName: `${prefix} ${item.label || item.classname}${unitSuffix}`,
        classname: resolvedClassname,
        quantity: unit.quantity,
        deliveryType: 'drop_at_feet',
        meta: {
          // Nome neutro para não ativar o limitador de kit legado do mod.
          kind: adminTest ? 'welcome_pack_admin_v610' : 'welcome_pack_v610',
          oneTimePerAccount: !adminTest,
          starterKitName: kit.name,
          itemLabel: item.label || resolvedClassname,
          randomSelection: randomPool.length > 0,
          randomPool,
          sortOrder: index,
          logicalQuantity: Number(item.quantity || 1),
          unitIndex: unit.unitIndex,
          unitCount: unit.unitCount,
          splitIntoUnits: false,
          v610FullQuantityStacks: true,
          deliveryMode: 'drop_at_feet',
          dropAtFeet: true,
          useDropBox: false
        }
      });
    }
  }

  if (deliveries.length) {
    await tx.deliveryQueue.createMany({ data: deliveries });
  }
  return deliveries;
}

async function publishStarterKitToFtpNow(result, logPrefix) {
  const steam64 = String(result?.player?.steam64 || '').trim();
  if (!steam64) return;
  try {
    // V96: igual às compras normais, envia o JSON para o próximo ciclo da API depois
    // de confirmar a transação. Não espera mais o ciclo periódico de 10-20s.
    result.fileBridgeImmediate = await publishPlayerDeliveryFilesNow([steam64], { syncInsurance: false });
  } catch (error) {
    queueImmediatePlayerFileSync(steam64);
    result.fileBridgeImmediate = { ok: false, error: String(error?.message || error) };
    console.error(`[FILE_BRIDGE_NOW] ${logPrefix} salvo; o mod buscará no próximo ciclo da API:`, error.message);
  }
}

export async function claimStarterKit({ playerId, serverType }) {
  // A configuração do kit é somente leitura e não precisa ficar presa dentro
  // da transação. Carregá-la antes evita gastar o relógio da transação com uma
  // consulta em AppSetting quando o banco estiver momentaneamente mais lento.
  const kit = await getStarterKit();
  if (!kit.enabled) throw new Error('Kit inicial está desativado no momento.');
  if (!kit.items.length) throw new Error('Kit inicial está sem itens configurados.');

  const result = await prisma.$transaction(async (tx) => {
    const player = await tx.player.findUnique({ where: { id: playerId } });
    if (!player) throw new Error('Player não encontrado.');

    const existing = await findStarterKitClaim(tx, player);
    if (existing) throw new Error('Você já resgatou o Kit Inicial nessa conta. Só pode uma vez.');

    const deliveryServer = resolveDeliveryServer(kit, serverType);
    const deliveries = await createStarterKitDeliveries({ tx, player, kit, serverType: deliveryServer, adminTest: false });

    const bonusCoins = Math.max(0, Math.min(Number(kit.bonusCoins || 0), 1000000));
    let updatedPlayer = player;
    if (bonusCoins > 0) {
      updatedPlayer = await tx.player.update({
        where: { id: player.id },
        data: { coins: { increment: bonusCoins } }
      });
      const balanceAfter = Number(updatedPlayer.coins || 0);
      await tx.coinLedger.create({
        data: {
          playerId: player.id,
          type: 'CREDIT',
          amount: bonusCoins,
          balanceAfter,
          reason: `Bônus do ${kit.name || 'Kit Inicial'}`,
          refType: 'starter_kit',
          refId: player.id
        }
      });
    }

    if (tx.starterKitClaim) {
      await tx.starterKitClaim.upsert({
        where: { steam64: player.steam64 },
        update: {
          playerId: player.id,
          serverType: deliveryServer,
          kitName: kit.name || 'Kit Inicial',
          deliveriesCreated: deliveries.length,
          bonusCoins,
          claimedAt: new Date()
        },
        create: {
          playerId: player.id,
          steam64: player.steam64,
          serverType: deliveryServer,
          kitName: kit.name || 'Kit Inicial',
          deliveriesCreated: deliveries.length,
          bonusCoins
        }
      });
    }

    return { player: updatedPlayer, kit, serverType: deliveryServer, deliveries, bonusCoins };
  }, STARTER_KIT_TRANSACTION_OPTIONS);

  starterKitClaimCache.clear();
  queueImmediatePlayerFileSync(result.player.steam64);
  setImmediate(() => {
    void publishStarterKitToFtpNow(result, 'Kit Inicial');
    void logAudit({ actor: result.player.steam64, action: 'starter_kit.claimed', target: result.player.id, data: { serverType: result.serverType, deliveries: result.deliveries.length, bonusCoins: result.bonusCoins || 0 } });
  });
  return result;
}

export async function dropStarterKitForAdmin({ steam64, serverType }) {
  const cleanedSteam = String(steam64 || '').trim();
  if (!/^7656119\d{10}$/.test(cleanedSteam)) throw new Error('Digite um Steam64 válido para testar o drop.');

  const kit = await getStarterKit();
  if (!kit.items.length) throw new Error('Kit inicial está sem itens configurados.');

  const result = await prisma.$transaction(async (tx) => {
    const player = await tx.player.upsert({
      where: { steam64: cleanedSteam },
      update: {},
      create: { steam64: cleanedSteam, nickname: 'Teste Admin' }
    });
    const deliveryServer = resolveDeliveryServer(kit, serverType);
    const deliveries = await createStarterKitDeliveries({ tx, player, kit, serverType: deliveryServer, adminTest: true });
    return { player, kit, serverType: deliveryServer, deliveries };
  }, STARTER_KIT_TRANSACTION_OPTIONS);

  await publishStarterKitToFtpNow(result, 'Teste do Kit Inicial');
  await logAudit({ actor: 'admin', action: 'starter_kit.test_drop', target: result.player.steam64, data: { serverType: result.serverType, deliveries: result.deliveries.length, bonusCoins: result.bonusCoins || 0, ftpImmediate: result.fileBridgeImmediate?.ok !== false } });
  return result;
}
