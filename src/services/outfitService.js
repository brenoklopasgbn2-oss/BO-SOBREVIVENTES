
import { prisma } from '../db/prisma.js';
import { changePlayerCoins } from './playerService.js';
import { logAudit } from './auditService.js';
import { prepareUploadedImage } from '../utils/pngTransparency.js';
import { findActiveStreamerCode, recordStreamerSupportSale } from './supportService.js';

const VALID_SERVERS = ['vanilla', 'bbp'];

function normalizeServerType(value) {
  const v = String(value || 'vanilla').trim().toLowerCase();
  return VALID_SERVERS.includes(v) ? v : 'vanilla';
}

function normalizeItems(items) {
  if (!Array.isArray(items)) return [];
  return items
    .map((item, index) => ({
      slot: String(item?.slot || 'inventory').trim() || 'inventory',
      classname: String(item?.classname || '').trim(),
      quantity: Math.max(1, Math.min(Number(item?.quantity || 1), 999)),
      label: String(item?.label || item?.classname || '').trim() || null,
      sortOrder: Number.isFinite(Number(item?.sortOrder)) ? Number(item.sortOrder) : index
    }))
    .filter(item => item.classname);
}

export function parseOutfitItemsText(text = '') {
  const lines = String(text || '').split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  const items = [];
  for (const [index, line] of lines.entries()) {
    const parts = line.split('|').map(part => part.trim());
    let slot = 'inventory';
    let classname = '';
    let quantity = 1;
    let label = '';
    if (parts.length >= 4) {
      [slot, classname, quantity, label] = parts;
    } else if (parts.length === 3) {
      [classname, quantity, label] = parts;
    } else if (parts.length === 2) {
      [classname, quantity] = parts;
    } else {
      classname = parts[0];
    }
    if (!classname) continue;
    items.push({ slot: slot || 'inventory', classname, quantity: Math.max(1, Math.min(Number(quantity || 1), 999)), label: label || classname, sortOrder: index });
  }
  if (!items.length) throw new Error('Adicione pelo menos 1 type no traje. Ex: inventory|BandageDressing|1|Bandagem');
  return items;
}

export function outfitItemsToText(items = []) {
  return normalizeItems(items).map(item => `${item.slot || 'inventory'}|${item.classname}|${item.quantity || 1}|${item.label || item.classname}`).join('\n');
}

export async function listOutfitTemplates({ includeInactive = false, serverType = 'vanilla' } = {}) {
  const server = normalizeServerType(serverType);
  return prisma.outfitTemplate.findMany({
    where: { ...(includeInactive ? {} : { active: true }), OR: [{ serverType: server }, { serverType: 'all' }] },
    orderBy: [{ level: 'asc' }, { priceCoins: 'asc' }, { name: 'asc' }]
  });
}

export async function getActiveOutfitForPlayer(steam64, serverType = 'vanilla') {
  const server = normalizeServerType(serverType);
  const now = new Date();
  await prisma.playerOutfitSubscription.updateMany({ where: { steam64: String(steam64 || '').trim(), status: 'ACTIVE', expiresAt: { lte: now } }, data: { status: 'EXPIRED' } });
  const sub = await prisma.playerOutfitSubscription.findFirst({
    where: { steam64: String(steam64 || '').trim(), status: 'ACTIVE', expiresAt: { gt: now }, OR: [{ serverType: server }, { serverType: 'all' }] },
    include: { outfitTemplate: true },
    orderBy: [{ expiresAt: 'desc' }, { createdAt: 'desc' }]
  });
  if (!sub || !sub.outfitTemplate?.active) return null;
  return { ...sub, items: normalizeItems(sub.outfitTemplate.items) };
}

export async function buyOutfitSubscription({ playerId, outfitId }) {
  const outfit = await prisma.outfitTemplate.findUnique({ where: { id: outfitId } });
  if (!outfit || !outfit.active) throw new Error('Traje não encontrado ou inativo.');
  const durationDays = Math.max(1, Math.min(Number(outfit.durationDays || 30), 365));
  const expiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);
  return prisma.$transaction(async (tx) => {
    const updatedPlayer = await changePlayerCoins({ playerId, amount: -Number(outfit.priceCoins || 0), reason: `Assinatura mensal traje: ${outfit.name}`, refType: 'outfit', refId: outfit.id, tx });
    await tx.playerOutfitSubscription.updateMany({ where: { playerId, status: 'ACTIVE', source: 'PURCHASE' }, data: { status: 'CANCELLED' } });
    const sub = await tx.playerOutfitSubscription.create({ data: { playerId, steam64: updatedPlayer.steam64, outfitTemplateId: outfit.id, serverType: outfit.serverType, source: 'PURCHASE', expiresAt } });
    await logAudit({ actor: updatedPlayer.steam64, action: 'outfit.subscription.purchased', target: outfit.id, data: { outfitName: outfit.name, priceCoins: outfit.priceCoins, expiresAt } });
    return { player: updatedPlayer, outfit, subscription: sub };
  });
}

export async function grantStreamerOutfitReward({ playerId, streamerCode: rawCode, outfitId }) {
  const now = new Date();
  const player = await prisma.player.findUnique({ where: { id: playerId } });
  if (!player) throw new Error('Player não encontrado.');
  return prisma.$transaction(async (tx) => {
    const code = await findActiveStreamerCode(rawCode, tx);
    const outfit = await tx.outfitTemplate.findUnique({ where: { id: outfitId } });
    if (!outfit || !outfit.active || !outfit.streamerRewardEnabled) throw new Error('Esse traje não está liberado para recompensa de streamer.');
    await tx.playerOutfitSubscription.updateMany({ where: { playerId, source: 'STREAMER_REWARD', status: 'ACTIVE', expiresAt: { lte: now } }, data: { status: 'EXPIRED' } });
    const activeReward = await tx.playerOutfitSubscription.findFirst({ where: { playerId, source: 'STREAMER_REWARD', status: 'ACTIVE', expiresAt: { gt: now } }, orderBy: { expiresAt: 'desc' } });
    if (activeReward) {
      throw new Error(`Você já tem traje VIP de streamer ativo até ${activeReward.expiresAt.toLocaleDateString('pt-BR')}. Aguarde vencer para usar outro código.`);
    }
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const sub = await tx.playerOutfitSubscription.create({ data: { playerId, steam64: player.steam64, outfitTemplateId: outfit.id, serverType: outfit.serverType, source: 'STREAMER_REWARD', streamerCodeId: code.id, streamerCode: code.code, expiresAt } });
    await recordStreamerSupportSale({ tx, streamerCode: code, player, purchaseId: null, paymentId: null, source: 'STREAMER_VIP_7D', totalCoins: 0, couponCode: null });
    await logAudit({ actor: player.steam64, action: 'outfit.streamer_reward.created', target: outfit.id, data: { streamerCode: code.code, outfitName: outfit.name, expiresAt } });
    return { player, outfit, subscription: sub, streamerCode: code };
  });
}

export async function upsertOutfitTemplateFromBody({ body, file, id = null }) {
  const name = String(body.name || '').trim();
  if (!name) throw new Error('Digite o nome do traje.');
  const items = parseOutfitItemsText(body.itemsText || body.items || '');
  const data = {
    name,
    slug: id ? undefined : `${name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}-${Date.now().toString(36)}`,
    description: String(body.description || '').trim() || null,
    serverType: normalizeServerType(body.serverType),
    level: Math.max(1, Math.min(Number(body.level || 1), 99)),
    priceCoins: Math.max(0, Number(body.priceCoins || 0)),
    durationDays: Math.max(1, Math.min(Number(body.durationDays || 30), 365)),
    imageUrl: String(body.imageUrl || '').trim() || null,
    items,
    active: body.active === 'on' || body.active === 'true',
    streamerRewardEnabled: body.streamerRewardEnabled === 'on' || body.streamerRewardEnabled === 'true'
  };
  const preparedImage = prepareUploadedImage(file);
  if (preparedImage) {
    data.imageData = preparedImage.imageData;
    data.imageMime = preparedImage.imageMime;
  }
  if (id) {
    delete data.slug;
    return prisma.outfitTemplate.update({ where: { id }, data });
  }
  return prisma.outfitTemplate.create({ data });
}

export async function seedOutfitTemplates(defaults = []) {
  for (const outfit of defaults) {
    const exists = await prisma.outfitTemplate.findUnique({ where: { slug: outfit.slug } });
    if (!exists) {
      await prisma.outfitTemplate.create({ data: { ...outfit, items: normalizeItems(outfit.items), active: true } });
    } else {
      const safeData = {};
      if (!exists.imageUrl && outfit.imageUrl) safeData.imageUrl = outfit.imageUrl;
      if (!exists.description && outfit.description) safeData.description = outfit.description;
      if (!exists.items && outfit.items) safeData.items = normalizeItems(outfit.items);
      if ((outfit.slug === 'traje-vip-comando-raidz' || outfit.slug === 'traje-vip-esquadrao-raidz' || outfit.slug === 'traje-vip-boost-raidz') && outfit.imageUrl) {
        safeData.imageUrl = outfit.imageUrl;
        safeData.imageData = null;
        safeData.imageMime = null;
      }
      if (Object.keys(safeData).length) await prisma.outfitTemplate.update({ where: { slug: outfit.slug }, data: safeData });
    }
  }
}
