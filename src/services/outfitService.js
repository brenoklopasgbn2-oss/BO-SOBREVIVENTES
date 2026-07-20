import { prisma } from '../db/prisma.js';
import { changePlayerCoins } from './playerService.js';
import { logAudit } from './auditService.js';
import { prepareUploadedImage } from '../utils/pngTransparency.js';
import { findActiveStreamerCode, recordStreamerSupportSale } from './supportService.js';
import { CUSTOM_OUTFIT_MEMBER_MONTHLY_PRICE, ensureManagedOwnerAccess, syncClanManagedOutfitForSteam64, syncManagedTemplateOrder } from './managedOutfitService.js';

const VALID_SERVERS = ['vanilla', 'bbp'];
export const PRIVATE_VIP_SOURCE = 'PRIVATE_LIFETIME';
export const ADMIN_VIP_SOURCE = 'ADMIN';
export const PRIVATE_VIP_EXPIRES_AT = new Date('2999-12-31T23:59:59.000Z');
export const FREE_7D_SOURCE = 'FREE_7D_STARTER';
export const STREAMER_BOOST_SLUG = 'traje-vip-boost-raidz';
const REMOVED_OUTFIT_SLUGS = ['traje-vip-basico', 'traje-vip-explorador', 'traje-vip-cacador', 'traje-vip-militar', 'traje-vip-elite-player'];

function normalizeServerType(value) {
  const v = String(value || 'vanilla').trim().toLowerCase();
  return VALID_SERVERS.includes(v) ? v : 'vanilla';
}

function normalizeOutfitSlot(value) {
  const slot = String(value || 'inventory').trim() || 'inventory';
  const key = slot.toLowerCase();
  if (['headgear', 'head', 'hat'].includes(key)) return 'Headgear';
  if (['hands', 'hand', 'gloves'].includes(key)) return 'Gloves';
  return slot;
}

const PLASTIC_BOTTLE_CLASSNAMES = new Set([
  'waterbottle',
  'plasticbottle',
  'plastic_bottle',
  'bottleplastic'
]);

function normalizeOutfitClassname(value) {
  const classname = String(value || '').trim();
  return PLASTIC_BOTTLE_CLASSNAMES.has(classname.toLowerCase()) ? 'GlassBottle' : classname;
}

export function normalizeItems(items) {
  const source = Array.isArray(items) ? items : [];
  const normalized = source
    .map((item, index) => {
      const classname = normalizeOutfitClassname(item?.classname);
      return {
        slot: normalizeOutfitSlot(item?.slot),
        classname,
        quantity: Math.max(1, Math.min(Number(item?.quantity || 1), 999)),
        label: classname === 'GlassBottle' ? 'Garrafa de água de vidro' : (String(item?.label || classname).trim() || null),
        sortOrder: Number.isFinite(Number(item?.sortOrder)) ? Number(item.sortOrder) : index
      };
    })
    .filter(item => item.classname && !/(^|_)flag(?:_|$)/i.test(item.classname));

  // V99: todo traje VIP leva o mapa de Chernarus. Bandeiras nunca vão dentro do traje;
  // elas são solicitadas separadamente pelo botão do responsável.
  if (!normalized.some(item => item.classname === 'ChernarusMap')) {
    normalized.push({ slot: 'inventory', classname: 'ChernarusMap', quantity: 1, label: 'Mapa Chernarus', sortOrder: normalized.length });
  }
  return normalized.map((item, index) => ({ ...item, sortOrder: index }));
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
    classname = normalizeOutfitClassname(classname);
    items.push({
      slot: normalizeOutfitSlot(slot),
      classname,
      quantity: Math.max(1, Math.min(Number(quantity || 1), 999)),
      label: classname === 'GlassBottle' ? 'Garrafa de água de vidro' : (label || classname),
      sortOrder: index
    });
  }
  if (!items.length) throw new Error('Adicione pelo menos 1 type no traje. Ex: inventory|BandageDressing|1|Bandagem');
  return items;
}

export function outfitItemsToText(items = []) {
  return normalizeItems(items)
    .map(item => `${item.slot || 'inventory'}|${item.classname}|${item.quantity || 1}|${item.label || item.classname}`)
    .join('\n');
}

export function parsePrivateVipMembers(text = '') {
  const entries = [];
  const invalid = [];
  const seen = new Set();
  const lines = String(text || '').split(/[\r\n,;]+/).map(value => value.trim()).filter(Boolean);

  for (const line of lines) {
    const digitGroups = line.match(/\d+/g) || [];
    const steam64 = digitGroups.find(value => value.length === 17) || '';
    if (!steam64) {
      invalid.push(line);
      continue;
    }
    if (seen.has(steam64)) continue;
    seen.add(steam64);
    const nickname = line
      .replace(steam64, '')
      .replace(/[\-–—:|]+\s*$/, '')
      .replace(/^\s*[\-–—:|]+/, '')
      .trim()
      .slice(0, 100) || null;
    entries.push({ steam64, nickname });
  }

  return { entries, invalid };
}

export async function listOutfitTemplates({ includeInactive = false, includePrivate = false, serverType = 'vanilla' } = {}) {
  const server = normalizeServerType(serverType);
  return prisma.outfitTemplate.findMany({
    where: {
      ...(includeInactive ? {} : { active: true }),
      ...(includePrivate ? {} : { isPrivate: false }),
      slug: { notIn: REMOVED_OUTFIT_SLUGS },
      OR: [{ serverType: server }, { serverType: 'all' }]
    },
    orderBy: [{ isPrivate: 'asc' }, { level: 'asc' }, { priceCoins: 'asc' }, { name: 'asc' }]
  });
}

export async function getActiveOutfitForPlayer(steam64, serverType = 'vanilla') {
  const server = normalizeServerType(serverType);
  const cleanSteam64 = String(steam64 || '').trim();
  if (/^\d{17}$/.test(cleanSteam64)) await syncClanManagedOutfitForSteam64(cleanSteam64);
  const now = new Date();
  await prisma.playerOutfitSubscription.updateMany({
    where: { steam64: cleanSteam64, status: 'ACTIVE', expiresAt: { lte: now } },
    data: { status: 'EXPIRED' }
  });
  const sub = await prisma.playerOutfitSubscription.findFirst({
    where: {
      steam64: cleanSteam64,
      status: 'ACTIVE',
      expiresAt: { gt: now },
      OR: [{ serverType: server }, { serverType: 'all' }]
    },
    include: { outfitTemplate: true },
    orderBy: [{ expiresAt: 'desc' }, { createdAt: 'desc' }]
  });
  if (!sub || !sub.outfitTemplate?.active) return null;
  return { ...sub, items: normalizeItems(sub.outfitTemplate.items) };
}

async function findActivePrivateVip(tx, { playerId = null, steam64 = null } = {}) {
  const now = new Date();
  return tx.playerOutfitSubscription.findFirst({
    where: {
      ...(playerId ? { playerId } : {}),
      ...(steam64 ? { steam64: String(steam64).trim() } : {}),
      status: 'ACTIVE',
      expiresAt: { gt: now },
      outfitTemplate: { isPrivate: true, active: true }
    },
    include: { outfitTemplate: true }
  });
}

export async function buyOutfitSubscription({ playerId, outfitId }) {
  return prisma.$transaction(async (tx) => {
    const player = await tx.player.findUnique({ where: { id: playerId } });
    if (!player) throw new Error('Player não encontrado.');
    const privateVip = await findActivePrivateVip(tx, { playerId });
    if (privateVip) {
      throw new Error(`Você possui o VIP privado "${privateVip.outfitTemplate.name}" e não pode comprar VIP normal.`);
    }

    const outfit = await tx.outfitTemplate.findUnique({ where: { id: outfitId } });
    if (!outfit || !outfit.active || outfit.isPrivate) throw new Error('Traje não encontrado ou indisponível para compra.');
    const durationDays = Math.max(1, Math.min(Number(outfit.durationDays || 30), 365));
    const expiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);
    const updatedPlayer = await changePlayerCoins({
      playerId,
      amount: -Number(outfit.priceCoins || 0),
      reason: `Assinatura mensal traje: ${outfit.name}`,
      refType: 'outfit',
      refId: outfit.id,
      tx
    });
    await tx.playerOutfitSubscription.updateMany({
      where: { playerId, status: 'ACTIVE', source: 'PURCHASE' },
      data: { status: 'CANCELLED' }
    });
    const sub = await tx.playerOutfitSubscription.create({
      data: {
        playerId,
        steam64: updatedPlayer.steam64,
        outfitTemplateId: outfit.id,
        serverType: outfit.serverType,
        source: 'PURCHASE',
        expiresAt
      }
    });
    await logAudit({
      actor: updatedPlayer.steam64,
      action: 'outfit.subscription.purchased',
      target: outfit.id,
      data: { outfitName: outfit.name, priceCoins: outfit.priceCoins, expiresAt }
    });
    return { player: updatedPlayer, outfit, subscription: sub };
  });
}

export async function grantStreamerOutfitReward({ playerId, streamerCode: rawCode, outfitId }) {
  const player = await prisma.player.findUnique({ where: { id: playerId } });
  if (!player) throw new Error('Player não encontrado.');
  return prisma.$transaction(async (tx) => {
    const privateVip = await findActivePrivateVip(tx, { playerId });
    if (privateVip) {
      throw new Error(`Você possui o VIP privado "${privateVip.outfitTemplate.name}" e não pode ativar VIP normal ou de streamer.`);
    }
    const code = await findActiveStreamerCode(rawCode, tx);
    const outfit = await tx.outfitTemplate.findUnique({ where: { id: outfitId } });
    if (!outfit || !outfit.active || outfit.isPrivate || outfit.slug !== STREAMER_BOOST_SLUG || !outfit.streamerRewardEnabled) {
      throw new Error('Somente o VIP Booster de 60 pode ser resgatado com código de streamer.');
    }
    const previousReward = await tx.playerOutfitSubscription.findFirst({
      where: { OR: [{ playerId }, { steam64: player.steam64 }], source: 'STREAMER_REWARD' },
      orderBy: { createdAt: 'asc' }
    });
    if (previousReward) {
      throw new Error('Este SteamID já usou um código de streamer. Não é possível usar o mesmo código novamente nem código de outro streamer.');
    }
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const sub = await tx.playerOutfitSubscription.create({
      data: {
        playerId,
        steam64: player.steam64,
        outfitTemplateId: outfit.id,
        serverType: outfit.serverType,
        source: 'STREAMER_REWARD',
        streamerCodeId: code.id,
        streamerCode: code.code,
        expiresAt
      }
    });
    await recordStreamerSupportSale({
      tx,
      streamerCode: code,
      player,
      purchaseId: null,
      paymentId: null,
      source: 'STREAMER_VIP_7D',
      totalCoins: 0,
      couponCode: null
    });
    await logAudit({
      actor: player.steam64,
      action: 'outfit.streamer_reward.created',
      target: outfit.id,
      data: { streamerCode: code.code, outfitName: outfit.name, expiresAt }
    });
    return { player, outfit, subscription: sub, streamerCode: code };
  });
}

export async function grantFreeStarterOutfitReward({ playerId, outfitId }) {
  const player = await prisma.player.findUnique({ where: { id: playerId } });
  if (!player) throw new Error('Player não encontrado.');

  return prisma.$transaction(async (tx) => {
    const privateVip = await findActivePrivateVip(tx, { playerId });
    if (privateVip) {
      throw new Error(`Você possui o VIP privado "${privateVip.outfitTemplate.name}" e não pode ativar outro traje.`);
    }

    const starterClaim = await tx.starterKitClaim.findFirst({
      where: { OR: [{ playerId }, { steam64: player.steam64 }] },
      select: { id: true }
    });
    if (!starterClaim) {
      throw new Error('Resgate primeiro o Kit Inicial para liberar um traje normal grátis por 7 dias.');
    }

    const outfit = await tx.outfitTemplate.findUnique({ where: { id: outfitId } });
    if (!outfit || !outfit.active || outfit.isPrivate || outfit.slug === STREAMER_BOOST_SLUG) {
      throw new Error('Esse traje não está disponível no resgate normal de 7 dias.');
    }

    const previousNormalReward = await tx.playerOutfitSubscription.findFirst({
      where: {
        AND: [
          { OR: [{ playerId }, { steam64: player.steam64 }] },
          {
            OR: [
              { source: FREE_7D_SOURCE },
              { source: 'STREAMER_REWARD', outfitTemplate: { is: { slug: { not: STREAMER_BOOST_SLUG } } } }
            ]
          }
        ]
      },
      orderBy: { createdAt: 'asc' }
    });
    if (previousNormalReward) {
      throw new Error('Este SteamID já resgatou um traje normal grátis de 7 dias. O benefício é liberado somente uma vez.');
    }

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const sub = await tx.playerOutfitSubscription.create({
      data: {
        playerId,
        steam64: player.steam64,
        outfitTemplateId: outfit.id,
        serverType: outfit.serverType,
        source: FREE_7D_SOURCE,
        expiresAt
      }
    });

    await logAudit({
      actor: player.steam64,
      action: 'outfit.free_7d.created',
      target: outfit.id,
      data: { outfitName: outfit.name, expiresAt, unlockedBy: 'starter_kit' }
    });
    return { player, outfit, subscription: sub };
  });
}

export async function getOutfitRewardStatus({ playerId, steam64 }) {
  if (!playerId && !steam64) {
    return { starterKitClaimed: false, normal7dClaimed: false, streamer7dClaimed: false };
  }
  const cleanSteam64 = String(steam64 || '').trim();
  const playerWhere = { OR: [...(playerId ? [{ playerId }] : []), ...(cleanSteam64 ? [{ steam64: cleanSteam64 }] : [])] };
  const [starterKitClaimed, normal7dClaimed, streamer7dClaimed] = await Promise.all([
    prisma.starterKitClaim.findFirst({
      where: { OR: [...(playerId ? [{ playerId }] : []), ...(cleanSteam64 ? [{ steam64: cleanSteam64 }] : [])] },
      select: { id: true }
    }),
    prisma.playerOutfitSubscription.findFirst({
      where: {
        AND: [
          playerWhere,
          {
            OR: [
              { source: FREE_7D_SOURCE },
              { source: 'STREAMER_REWARD', outfitTemplate: { is: { slug: { not: STREAMER_BOOST_SLUG } } } }
            ]
          }
        ]
      },
      select: { id: true }
    }),
    prisma.playerOutfitSubscription.findFirst({
      where: { ...playerWhere, source: 'STREAMER_REWARD' },
      select: { id: true }
    })
  ]);
  return {
    starterKitClaimed: Boolean(starterKitClaimed),
    normal7dClaimed: Boolean(normal7dClaimed),
    streamer7dClaimed: Boolean(streamer7dClaimed)
  };
}

export async function upsertOutfitTemplateFromBody({ body, file, id = null }) {
  const name = String(body.name || '').trim();
  if (!name) throw new Error('Digite o nome do traje.');
  const items = normalizeItems(parseOutfitItemsText(body.itemsText || body.items || ''));
  const isPrivate = body.isPrivate === 'on' || body.isPrivate === 'true';
  const data = {
    name,
    slug: id ? undefined : `${name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}-${Date.now().toString(36)}`,
    description: String(body.description || '').trim() || null,
    serverType: normalizeServerType(body.serverType),
    level: Math.max(1, Math.min(Number(body.level || 1), 99)),
    priceCoins: isPrivate ? 0 : Math.max(0, Number(body.priceCoins || 0)),
    durationDays: Math.max(1, Math.min(Number(body.durationDays || 30), 3650)),
    imageUrl: String(body.imageUrl || '').trim() || null,
    items,
    active: body.active === 'on' || body.active === 'true',
    streamerRewardEnabled: isPrivate ? false : (body.streamerRewardEnabled === 'on' || body.streamerRewardEnabled === 'true'),
    isPrivate,
    managedAccessEnabled: isPrivate && (body.managedAccessEnabled === 'on' || body.managedAccessEnabled === 'true'),
    managedOwnerSteam64: String(body.managedOwnerSteam64 || '').trim() || null,
    managedOwnerType: String(body.managedOwnerType || 'STREAMER').trim().toUpperCase() === 'CLAN' ? 'CLAN' : 'STREAMER',
    maxManagedMembers: Math.max(1, Math.min(Number(body.maxManagedMembers || 10), 200)),
    memberMonthlyPriceCoins: Math.max(0, Number(body.memberMonthlyPriceCoins || 0)),
    creationPriceCoins: Math.max(0, Number(body.creationPriceCoins || 0)),
    flagClassname: String(body.flagClassname || '').trim() || null
  };
  if (data.managedAccessEnabled && !/^\d{17}$/.test(String(data.managedOwnerSteam64 || ''))) {
    throw new Error('Para liberar o painel de membros, informe o Steam64 do dono com 17 números.');
  }
  if (data.managedAccessEnabled && data.managedOwnerType === 'CLAN') {
    const billingMode = String(body.clanBillingMode || '').trim().toUpperCase();
    const paidMode = billingMode
      ? billingMode === 'PAID'
      : Number(body.memberMonthlyPriceCoins || 0) > 0;
    data.memberMonthlyPriceCoins = paidMode ? CUSTOM_OUTFIT_MEMBER_MONTHLY_PRICE : 0;
    if (data.creationPriceCoins <= 0) data.creationPriceCoins = 50000;
  }
  if (data.managedAccessEnabled && data.managedOwnerType === 'STREAMER') {
    data.memberMonthlyPriceCoins = 0;
    data.creationPriceCoins = 0;
  }
  if (!data.managedAccessEnabled) {
    data.managedOwnerSteam64 = null;
    data.flagClassname = null;
  }
  const preparedImage = prepareUploadedImage(file);
  if (preparedImage) {
    data.imageData = preparedImage.imageData;
    data.imageMime = preparedImage.imageMime;
  }

  let saved;
  if (id) {
    delete data.slug;
    saved = await prisma.outfitTemplate.update({ where: { id }, data });
  } else {
    saved = await prisma.outfitTemplate.create({ data });
  }

  if (!saved.isPrivate) {
    await prisma.playerOutfitSubscription.updateMany({
      where: { outfitTemplateId: saved.id, source: PRIVATE_VIP_SOURCE, status: 'ACTIVE' },
      data: { status: 'CANCELLED' }
    });
  }
  if (saved.managedAccessEnabled) {
    await syncManagedTemplateOrder(saved);
    if (saved.managedOwnerType === 'STREAMER') await ensureManagedOwnerAccess(saved.id);
    if (saved.managedOwnerType === 'CLAN' && /^\d{17}$/.test(String(saved.managedOwnerSteam64 || ''))) {
      await syncClanManagedOutfitForSteam64(saved.managedOwnerSteam64);
    }
  } else if (/^\d{17}$/.test(String(saved.managedOwnerSteam64 || ''))) {
    await syncClanManagedOutfitForSteam64(saved.managedOwnerSteam64);
  }
  return saved;
}

export async function assignPrivateVipMembers({ outfitId, membersText = '', members = null, durationDays = null, actor = 'admin' }) {
  const parsed = Array.isArray(members)
    ? { entries: members, invalid: [] }
    : parsePrivateVipMembers(membersText);
  const outfit = await prisma.outfitTemplate.findUnique({ where: { id: outfitId } });
  if (!outfit || !outfit.isPrivate) throw new Error('Selecione ou crie um traje marcado como VIP privado.');
  if (!parsed.entries.length) return { assigned: [], invalid: parsed.invalid };
  const requestedDays = durationDays === null || durationDays === undefined || durationDays === ''
    ? Math.max(1, Math.min(Number(outfit.durationDays || 30), 3650))
    : Math.floor(Number(durationDays));
  if (!Number.isFinite(requestedDays) || requestedDays < 1 || requestedDays > 3650) {
    throw new Error('Informe uma validade entre 1 e 3650 dias.');
  }
  const memberExpiresAt = new Date(Date.now() + requestedDays * 24 * 60 * 60 * 1000);

  const assigned = await prisma.$transaction(async (tx) => {
    const results = [];
    for (const entry of parsed.entries) {
      let player = await tx.player.findUnique({ where: { steam64: entry.steam64 } });
      if (!player) {
        player = await tx.player.create({ data: { steam64: entry.steam64, nickname: entry.nickname || null } });
      } else if (!player.nickname && entry.nickname) {
        player = await tx.player.update({ where: { id: player.id }, data: { nickname: entry.nickname } });
      }

      const activeSamePrivate = await tx.playerOutfitSubscription.findFirst({
        where: {
          playerId: player.id,
          outfitTemplateId: outfit.id,
          source: PRIVATE_VIP_SOURCE,
          status: 'ACTIVE'
        },
        orderBy: { createdAt: 'desc' }
      });

      // Regra V92: quem tem VIP privado não pode manter ou comprar VIP normal.
      await tx.playerOutfitSubscription.updateMany({
        where: {
          playerId: player.id,
          status: 'ACTIVE',
          ...(activeSamePrivate ? { id: { not: activeSamePrivate.id } } : {})
        },
        data: { status: 'CANCELLED' }
      });

      const existing = activeSamePrivate || await tx.playerOutfitSubscription.findFirst({
        where: { playerId: player.id, outfitTemplateId: outfit.id, source: PRIVATE_VIP_SOURCE },
        orderBy: { createdAt: 'desc' }
      });
      const subscription = existing
        ? await tx.playerOutfitSubscription.update({
            where: { id: existing.id },
            data: {
              steam64: player.steam64,
              serverType: outfit.serverType,
              status: 'ACTIVE',
              expiresAt: memberExpiresAt
            }
          })
        : await tx.playerOutfitSubscription.create({
            data: {
              playerId: player.id,
              steam64: player.steam64,
              outfitTemplateId: outfit.id,
              serverType: outfit.serverType,
              source: PRIVATE_VIP_SOURCE,
              status: 'ACTIVE',
              expiresAt: memberExpiresAt
            }
          });
      results.push({ player, subscription });
    }
    return results;
  });

  await logAudit({
    actor,
    action: 'outfit.private.members.assigned',
    target: outfit.id,
    data: { outfitName: outfit.name, steam64: assigned.map(item => item.player.steam64), durationDays: requestedDays, expiresAt: memberExpiresAt, invalid: parsed.invalid }
  });
  return { assigned, invalid: parsed.invalid, durationDays: requestedDays, expiresAt: memberExpiresAt };
}

export async function grantOutfitToPlayerByAdmin({ outfitId, steam64, durationDays, nickname = '', actor = 'admin' }) {
  const cleanSteam64 = String(steam64 || '').trim();
  if (!/^\d{17}$/.test(cleanSteam64)) throw new Error('Steam64 inválido. Informe exatamente 17 números.');

  const days = Math.floor(Number(durationDays));
  if (!Number.isFinite(days) || days < 1 || days > 3650) {
    throw new Error('Informe uma validade entre 1 e 3650 dias.');
  }

  const outfit = await prisma.outfitTemplate.findUnique({ where: { id: outfitId } });
  if (!outfit) throw new Error('Traje VIP não encontrado.');
  if (!outfit.active) throw new Error('Ative esse traje antes de liberar para um player.');

  const now = new Date();
  const expiresAt = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  const cleanNickname = String(nickname || '').trim().slice(0, 100) || null;

  const result = await prisma.$transaction(async (tx) => {
    let player = await tx.player.findUnique({ where: { steam64: cleanSteam64 } });
    if (!player) {
      player = await tx.player.create({ data: { steam64: cleanSteam64, nickname: cleanNickname } });
    } else if (cleanNickname && player.nickname !== cleanNickname) {
      player = await tx.player.update({ where: { id: player.id }, data: { nickname: cleanNickname } });
    }

    // Um player usa somente um traje por vez no mod. A liberação ADM substitui
    // qualquer VIP anterior para evitar dois JSONs/assinaturas concorrentes.
    await tx.playerOutfitSubscription.updateMany({
      where: {
        status: 'ACTIVE',
        OR: [{ playerId: player.id }, { steam64: cleanSteam64 }]
      },
      data: { status: 'CANCELLED' }
    });

    const previous = await tx.playerOutfitSubscription.findFirst({
      where: {
        playerId: player.id,
        outfitTemplateId: outfit.id,
        source: ADMIN_VIP_SOURCE
      },
      orderBy: { createdAt: 'desc' }
    });

    const subscription = previous
      ? await tx.playerOutfitSubscription.update({
          where: { id: previous.id },
          data: {
            steam64: cleanSteam64,
            serverType: outfit.serverType,
            status: 'ACTIVE',
            startsAt: now,
            expiresAt,
            lastSpawnAt: null
          }
        })
      : await tx.playerOutfitSubscription.create({
          data: {
            playerId: player.id,
            steam64: cleanSteam64,
            outfitTemplateId: outfit.id,
            serverType: outfit.serverType,
            source: ADMIN_VIP_SOURCE,
            status: 'ACTIVE',
            startsAt: now,
            expiresAt
          }
        });

    return { player, subscription };
  });

  await logAudit({
    actor,
    action: 'outfit.admin.granted',
    target: outfit.id,
    data: {
      steam64: cleanSteam64,
      outfitName: outfit.name,
      durationDays: days,
      startsAt: now,
      expiresAt
    }
  });

  return { ...result, outfit, durationDays: days, expiresAt };
}

export async function revokeOutfitSubscriptionByAdmin({ subscriptionId, actor = 'admin' }) {
  const subscription = await prisma.playerOutfitSubscription.findUnique({
    where: { id: subscriptionId },
    include: { player: true, outfitTemplate: true }
  });
  if (!subscription) throw new Error('Assinatura VIP não encontrada.');

  const updated = await prisma.playerOutfitSubscription.update({
    where: { id: subscriptionId },
    data: { status: 'CANCELLED' }
  });

  await logAudit({
    actor,
    action: 'outfit.admin.revoked',
    target: subscription.outfitTemplateId,
    data: {
      steam64: subscription.steam64,
      outfitName: subscription.outfitTemplate?.name || null,
      source: subscription.source
    }
  });

  return { ...updated, player: subscription.player, outfitTemplate: subscription.outfitTemplate };
}

export async function removePrivateVipMember({ subscriptionId, actor = 'admin' }) {
  const sub = await prisma.playerOutfitSubscription.findUnique({
    where: { id: subscriptionId },
    include: { outfitTemplate: true, player: true }
  });
  if (!sub || sub.source !== PRIVATE_VIP_SOURCE) throw new Error('Cadastro de VIP privado não encontrado.');
  await prisma.playerOutfitSubscription.update({
    where: { id: subscriptionId },
    data: { status: 'CANCELLED' }
  });
  await logAudit({
    actor,
    action: 'outfit.private.member.removed',
    target: sub.outfitTemplateId,
    data: { steam64: sub.steam64, outfitName: sub.outfitTemplate?.name }
  });
  return sub;
}

export async function seedOutfitTemplates(defaults = []) {
  for (const outfit of defaults) {
    const exists = await prisma.outfitTemplate.findUnique({ where: { slug: outfit.slug } });
    if (!exists) {
      await prisma.outfitTemplate.create({
        data: { ...outfit, items: normalizeItems(outfit.items), active: true, isPrivate: Boolean(outfit.isPrivate), managedAccessEnabled: Boolean(outfit.managedAccessEnabled), managedOwnerSteam64: outfit.managedOwnerSteam64 || null, managedOwnerType: outfit.managedOwnerType || null, maxManagedMembers: Number(outfit.maxManagedMembers || 10), memberMonthlyPriceCoins: Number(outfit.memberMonthlyPriceCoins || 0), creationPriceCoins: Number(outfit.creationPriceCoins || 0), flagClassname: outfit.flagClassname || null }
      });
    } else {
      const safeData = {};
      if (!exists.imageUrl && outfit.imageUrl) safeData.imageUrl = outfit.imageUrl;
      if (!exists.description && outfit.description) safeData.description = outfit.description;
      if (!exists.items && outfit.items) safeData.items = normalizeItems(outfit.items);
      if (outfit.isPrivate && !exists.isPrivate) safeData.isPrivate = true;
      if (outfit.managedAccessEnabled) {
        safeData.managedAccessEnabled = true;
        safeData.managedOwnerSteam64 = outfit.managedOwnerSteam64 || exists.managedOwnerSteam64 || null;
        safeData.managedOwnerType = outfit.managedOwnerType || exists.managedOwnerType || 'STREAMER';
        safeData.maxManagedMembers = Number(outfit.maxManagedMembers || exists.maxManagedMembers || 10);
        safeData.memberMonthlyPriceCoins = Number(outfit.memberMonthlyPriceCoins || 0);
        safeData.creationPriceCoins = Number(outfit.creationPriceCoins || 0);
        safeData.flagClassname = outfit.flagClassname || null;
        safeData.items = normalizeItems(exists.items || outfit.items || []);
      }
      if ((outfit.slug === 'traje-vip-comando-raidz' || outfit.slug === 'traje-vip-esquadrao-raidz' || outfit.slug === 'traje-vip-boost-raidz') && outfit.imageUrl) {
        safeData.imageUrl = outfit.imageUrl;
        safeData.imageData = null;
        safeData.imageMime = null;
      }
      const normalizedExistingItems = normalizeItems(exists.items || outfit.items || []);
      if (JSON.stringify(normalizedExistingItems) !== JSON.stringify(exists.items || [])) safeData.items = normalizedExistingItems;
      if (Object.keys(safeData).length) {
        const updated = await prisma.outfitTemplate.update({ where: { slug: outfit.slug }, data: safeData });
        if (updated.managedAccessEnabled && updated.managedOwnerType === 'STREAMER') await ensureManagedOwnerAccess(updated.id);
      }
    }
  }
}
