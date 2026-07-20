import { prisma } from '../db/prisma.js';
import { logAudit } from './auditService.js';
import { prepareUploadedImage } from '../utils/pngTransparency.js';
import { publishPlayerDeliveryFilesNow, queueImmediatePlayerFileSync } from './fileBridgeService.js';
import { randomUUID } from 'crypto';

const SETTING_KEY = 'starterKit.v1';
const GAME_SERVER_TYPES = ['vanilla', 'bbp'];


// O mod atual cria uma entidade por registro de entrega e, para madeira,
// não transforma `quantity` em pilha. Por isso tábuas e troncos precisam
// ser separados em um registro por unidade para garantir a quantidade real.
const STARTER_UNIT_PER_DELIVERY_CLASSNAMES = new Set(['woodenplank', 'woodenlog']);

function expandStarterKitItemDeliveries(item = {}) {
  const classname = String(item.classname || '').trim();
  const quantity = Math.max(1, Math.min(Math.floor(Number(item.quantity || 1)), 999));
  if (!STARTER_UNIT_PER_DELIVERY_CLASSNAMES.has(classname.toLowerCase())) {
    return [{ quantity, unitIndex: 0, unitCount: 1, splitIntoUnits: false }];
  }
  return Array.from({ length: quantity }, (_, index) => ({
    quantity: 1,
    unitIndex: index,
    unitCount: quantity,
    splitIntoUnits: true
  }));
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
    name: 'Kit Inicial',
    description: 'Resgate grátis uma única vez por conta. Feito para o player começar no servidor com o pé direito.',
    serverType: 'current',
    bonusCoins: 5000,
    // O kit atual tem barril e madeira, então o padrão é dropar no pé do player.
    deliveryType: 'drop_at_feet',
    imageUrl: '/dayz-wiki-image?type=Barrel_Red&name=Oil%20Barrel',
    imageData: null,
    imageMime: null,
    imageUpdatedAt: null,
    items: [
      { classname: 'Barrel_Red', quantity: 1, label: 'Barril vermelho', sortOrder: 0 },
      { classname: 'NailBox', quantity: 1, label: 'Caixa de pregos', sortOrder: 1 },
      { classname: 'Shovel', quantity: 1, label: 'Pá', sortOrder: 2 },
      { classname: 'CodeLock', quantity: 1, label: 'Code Lock', sortOrder: 3 },
      { classname: 'Rope', quantity: 1, label: 'Corda', sortOrder: 4 },
      { classname: 'Hatchet', quantity: 1, label: 'Machadinha', sortOrder: 5 },
      { classname: 'Pliers', quantity: 1, label: 'Alicate', sortOrder: 6 },
      { classname: 'MetalWire', quantity: 1, label: 'Arame', sortOrder: 7 },
      { classname: 'WoodenPlank', quantity: 20, label: 'Tábuas (20)', sortOrder: 8 },
      { classname: 'WoodenLog', quantity: 4, label: 'Troncos (4)', sortOrder: 9 }
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
        sortOrder: Number.isFinite(Number(item.sortOrder)) ? Number(item.sortOrder) : index
      })).filter(item => item.classname)
    : base.items;

  return {
    enabled: source.enabled === undefined ? base.enabled : Boolean(source.enabled),
    name: String(source.name || base.name).trim(),
    description: String(source.description || base.description).trim(),
    serverType: normalizeKitServerType(source.serverType),
    bonusCoins: Math.max(0, Math.min(Number(source.bonusCoins ?? base.bonusCoins ?? 0), 1000000)),
    deliveryType: ['drop_box', 'drop_at_feet'].includes(String(source.deliveryType || '').trim()) ? String(source.deliveryType).trim() : base.deliveryType,
    imageUrl: String(source.imageUrl || base.imageUrl).trim(),
    imageData: source.imageData || null,
    imageMime: source.imageMime || null,
    imageUpdatedAt: source.imageUpdatedAt || null,
    items: items.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
  };
}

export async function getStarterKit(tx = prisma) {
  const saved = await tx.appSetting.findUnique({ where: { key: SETTING_KEY } });
  return normalizeStarterKit(saved?.value || {});
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
        { steam64: player.steam64, productName: { contains: '[KIT INICIAL]' } }
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
    deliveryType: body.deliveryType,
    imageUrl: body.imageUrl,
    imageData: currentKit.imageData,
    imageMime: currentKit.imageMime,
    imageUpdatedAt: currentKit.imageUpdatedAt,
    items: itemsByRows.length ? itemsByRows : textItems
  });
  const preparedImage = prepareUploadedImage(file);
  if (preparedImage) {
    kit.imageData = preparedImage.imageData;
    kit.imageMime = preparedImage.imageMime;
    kit.imageUpdatedAt = Date.now();
  }

  await prisma.appSetting.upsert({
    where: { key: SETTING_KEY },
    update: { value: kit },
    create: { key: SETTING_KEY, value: kit }
  });
  await logAudit({ actor: 'admin', action: 'starter_kit.updated', target: SETTING_KEY, data: { enabled: kit.enabled, itemCount: kit.items.length, serverType: kit.serverType } });
  return kit;
}

export async function hasClaimedStarterKit(playerId) {
  if (!playerId) return false;
  const player = await prisma.player.findUnique({ where: { id: playerId }, select: { id: true, steam64: true } });
  return Boolean(await findStarterKitClaim(prisma, player));
}

function resolveDeliveryServer(kit, selectedServerType) {
  if (kit.serverType === 'vanilla' || kit.serverType === 'bbp') return kit.serverType;
  return normalizeServerType(selectedServerType, 'vanilla');
}

async function createStarterKitDeliveries({ tx, player, kit, serverType, adminTest = false }) {
  const prefix = adminTest ? '[TESTE ADMIN KIT INICIAL]' : '[KIT INICIAL]';
  const deliveries = [];

  // V96: monta todas as linhas e grava em um único INSERT. Antes eram mais de
  // 30 INSERTs sequenciais (20 tábuas + 4 troncos + demais itens), o que fazia
  // o Kit Inicial parecer muito mais lento do que uma compra normal.
  for (const [index, item] of kit.items.entries()) {
    const units = expandStarterKitItemDeliveries(item);
    for (const unit of units) {
      const unitSuffix = unit.splitIntoUnits ? ` [${unit.unitIndex + 1}/${unit.unitCount}]` : '';
      deliveries.push({
        id: randomUUID(),
        purchaseId: null,
        playerId: player.id,
        steam64: player.steam64,
        serverType,
        productName: `${prefix} ${kit.name}: ${item.label || item.classname}${unitSuffix}`,
        classname: item.classname,
        quantity: unit.quantity,
        deliveryType: kit.deliveryType || 'drop_box',
        meta: {
          kind: adminTest ? 'starter_kit_admin_test' : 'starter_kit',
          oneTimePerAccount: !adminTest,
          starterKitName: kit.name,
          itemLabel: item.label || item.classname,
          sortOrder: index,
          logicalQuantity: Number(item.quantity || 1),
          unitIndex: unit.unitIndex,
          unitCount: unit.unitCount,
          splitIntoUnits: unit.splitIntoUnits,
          v93StarterUnitDelivery: unit.splitIntoUnits,
          v96FastStarterKit: true,
          dropBoxClassname: kit.deliveryType === 'drop_box' ? 'WoodenCrate' : null,
          dropBoxOverflowBehavior: 'DROP_OUTSIDE',
          dropOutsideIfCannotFit: true,
          oversizedItemsDropOutside: true
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
    // V96: igual às compras normais, envia o JSON ao FTP imediatamente depois
    // de confirmar a transação. Não espera mais o ciclo periódico de 10-20s.
    result.fileBridgeImmediate = await publishPlayerDeliveryFilesNow([steam64]);
  } catch (error) {
    queueImmediatePlayerFileSync(steam64);
    result.fileBridgeImmediate = { ok: false, error: String(error?.message || error) };
    console.error(`[FILE_BRIDGE_NOW] ${logPrefix} salvo, mas o FTP imediato falhou:`, error.message);
  }
}

export async function claimStarterKit({ playerId, serverType }) {
  const result = await prisma.$transaction(async (tx) => {
    const player = await tx.player.findUnique({ where: { id: playerId } });
    if (!player) throw new Error('Player não encontrado.');

    const kit = await getStarterKit(tx);
    if (!kit.enabled) throw new Error('Kit inicial está desativado no momento.');
    if (!kit.items.length) throw new Error('Kit inicial está sem itens configurados.');

    const existing = await findStarterKitClaim(tx, player);
    if (existing) throw new Error('Você já resgatou o Kit Inicial nessa conta. Só pode uma vez.');

    const deliveryServer = resolveDeliveryServer(kit, serverType);
    const deliveries = await createStarterKitDeliveries({ tx, player, kit, serverType: deliveryServer, adminTest: false });

    const bonusCoins = Math.max(0, Math.min(Number(kit.bonusCoins || 0), 1000000));
    let updatedPlayer = player;
    if (bonusCoins > 0) {
      const balanceAfter = Number(player.coins || 0) + bonusCoins;
      updatedPlayer = await tx.player.update({
        where: { id: player.id },
        data: { coins: balanceAfter }
      });
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
  });

  await publishStarterKitToFtpNow(result, 'Kit Inicial');
  await logAudit({ actor: result.player.steam64, action: 'starter_kit.claimed', target: result.player.id, data: { serverType: result.serverType, deliveries: result.deliveries.length, bonusCoins: result.bonusCoins || 0, ftpImmediate: result.fileBridgeImmediate?.ok !== false } });
  return result;
}

export async function dropStarterKitForAdmin({ steam64, serverType }) {
  const cleanedSteam = String(steam64 || '').trim();
  if (!/^7656119\d{10}$/.test(cleanedSteam)) throw new Error('Digite um Steam64 válido para testar o drop.');

  const result = await prisma.$transaction(async (tx) => {
    const player = await tx.player.upsert({
      where: { steam64: cleanedSteam },
      update: {},
      create: { steam64: cleanedSteam, nickname: 'Teste Admin' }
    });
    const kit = await getStarterKit(tx);
    if (!kit.items.length) throw new Error('Kit inicial está sem itens configurados.');
    const deliveryServer = resolveDeliveryServer(kit, serverType);
    const deliveries = await createStarterKitDeliveries({ tx, player, kit, serverType: deliveryServer, adminTest: true });
    return { player, kit, serverType: deliveryServer, deliveries };
  });

  await publishStarterKitToFtpNow(result, 'Teste do Kit Inicial');
  await logAudit({ actor: 'admin', action: 'starter_kit.test_drop', target: result.player.steam64, data: { serverType: result.serverType, deliveries: result.deliveries.length, bonusCoins: result.bonusCoins || 0, ftpImmediate: result.fileBridgeImmediate?.ok !== false } });
  return result;
}
