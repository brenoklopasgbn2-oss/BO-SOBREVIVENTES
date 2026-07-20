import { prisma } from '../db/prisma.js';
import { changePlayerCoins } from './playerService.js';
import { logAudit } from './auditService.js';
import { slugify } from '../utils/slug.js';

export const STREAMER_OWNER_SOURCE = 'STREAMER_OWNER';
export const STREAMER_MEMBER_SOURCE = 'STREAMER_MANAGED';
export const CLAN_MEMBER_SOURCE = 'CLAN_CUSTOM_MEMBER';
export const CLAN_PAID_MEMBER_SOURCE = 'CLAN_CUSTOM_PAID';
export const MANAGED_SOURCES = [STREAMER_OWNER_SOURCE, STREAMER_MEMBER_SOURCE, CLAN_MEMBER_SOURCE, CLAN_PAID_MEMBER_SOURCE];
export const CUSTOM_OUTFIT_CREATION_PRICE = 50000;
export const CUSTOM_OUTFIT_MEMBER_MONTHLY_PRICE = 20000;
export const CUSTOM_OUTFIT_DEFAULT_MAX_MEMBERS = 10;
const FOREVER = new Date('2999-12-31T23:59:59.000Z');
const MONTH_MS = 30 * 24 * 60 * 60 * 1000;

function cleanSteam64(value) {
  const steam64 = String(value || '').trim();
  if (!/^\d{17}$/.test(steam64)) throw new Error('Steam64 inválido. Use exatamente 17 números.');
  return steam64;
}

function cleanOwnerType(value) {
  const type = String(value || '').trim().toUpperCase();
  return type === 'CLAN' ? 'CLAN' : 'STREAMER';
}

function sourceForOutfit(outfit, isOwner = false) {
  return cleanOwnerType(outfit.managedOwnerType) === 'STREAMER'
    ? (isOwner ? STREAMER_OWNER_SOURCE : STREAMER_MEMBER_SOURCE)
    : CLAN_MEMBER_SOURCE;
}

export function clanOutfitIsPaid(outfit) {
  return cleanOwnerType(outfit?.managedOwnerType) === 'CLAN'
    && Number(outfit?.memberMonthlyPriceCoins || 0) > 0;
}

export function clanOutfitMonthlyPrice(outfit) {
  return clanOutfitIsPaid(outfit)
    ? Math.max(1, Number(outfit?.memberMonthlyPriceCoins || CUSTOM_OUTFIT_MEMBER_MONTHLY_PRICE))
    : 0;
}

async function ensurePlayer(tx, steam64, nickname = '') {
  const clean = cleanSteam64(steam64);
  const existing = await tx.player.findUnique({ where: { steam64: clean } });
  if (existing) {
    if (!existing.nickname && String(nickname || '').trim()) {
      return tx.player.update({ where: { id: existing.id }, data: { nickname: String(nickname).trim().slice(0, 100) } });
    }
    return existing;
  }
  return tx.player.create({ data: { steam64: clean, nickname: String(nickname || '').trim().slice(0, 100) || null } });
}

async function getOwnedManagedOutfit(tx, outfitId, ownerSteam64) {
  const outfit = await tx.outfitTemplate.findUnique({ where: { id: String(outfitId || '') } });
  if (!outfit || !outfit.active || !outfit.isPrivate || !outfit.managedAccessEnabled) {
    throw new Error('Traje gerenciado não encontrado ou desativado.');
  }
  if (String(outfit.managedOwnerSteam64 || '') !== cleanSteam64(ownerSteam64)) {
    throw new Error('Você não é o responsável liberado pelo ADM para esse traje.');
  }
  return outfit;
}

async function cancelOtherActiveOutfits(tx, playerId, keepSubscriptionId = null) {
  await tx.playerOutfitSubscription.updateMany({
    where: {
      playerId,
      status: 'ACTIVE',
      ...(keepSubscriptionId ? { id: { not: keepSubscriptionId } } : {})
    },
    data: { status: 'CANCELLED' }
  });
}

async function grantManagedSubscription(tx, { outfit, player, source, expiresAt }) {
  const previous = await tx.playerOutfitSubscription.findFirst({
    where: { playerId: player.id, outfitTemplateId: outfit.id, source },
    orderBy: { createdAt: 'desc' }
  });
  await cancelOtherActiveOutfits(tx, player.id, previous?.id || null);
  if (previous) {
    const alreadyCurrent = previous.status === 'ACTIVE'
      && previous.steam64 === player.steam64
      && previous.serverType === outfit.serverType
      && new Date(previous.expiresAt).getTime() === new Date(expiresAt).getTime();
    if (alreadyCurrent) return previous;
    return tx.playerOutfitSubscription.update({
      where: { id: previous.id },
      data: {
        steam64: player.steam64,
        serverType: outfit.serverType,
        status: 'ACTIVE',
        startsAt: new Date(),
        expiresAt
      }
    });
  }
  return tx.playerOutfitSubscription.create({
    data: {
      playerId: player.id,
      steam64: player.steam64,
      outfitTemplateId: outfit.id,
      serverType: outfit.serverType,
      source,
      status: 'ACTIVE',
      expiresAt
    }
  });
}

async function syncClanManagedOutfitAccessTx(tx, clanId) {
  const clan = await tx.clan.findUnique({
    where: { id: String(clanId || '') },
    include: {
      ownerPlayer: { select: { id: true, steam64: true, nickname: true } },
      members: {
        where: { status: 'ACTIVE' },
        include: { player: { select: { id: true, steam64: true, nickname: true } } },
        orderBy: { joinedAt: 'asc' }
      }
    }
  });
  if (!clan?.ownerPlayer?.steam64) return { clan, outfit: null, granted: 0, cancelled: 0, paid: false };

  const ownedOutfits = await tx.outfitTemplate.findMany({
    where: {
      managedOwnerSteam64: clan.ownerPlayer.steam64,
      managedOwnerType: 'CLAN',
      managedAccessEnabled: true,
      isPrivate: true
    },
    orderBy: [{ active: 'desc' }, { updatedAt: 'desc' }]
  });
  const outfit = ownedOutfits.find(item => item.active) || null;
  const ownedIds = ownedOutfits.map(item => item.id);
  const memberPlayers = clan.members.map(member => member.player).filter(Boolean);
  if (clan.ownerPlayer && !memberPlayers.some(player => player.id === clan.ownerPlayer.id)) memberPlayers.unshift(clan.ownerPlayer);
  const activePlayerIds = memberPlayers.map(player => player.id);
  const nonOwnerPlayerIds = activePlayerIds.filter(id => id !== clan.ownerPlayer.id);
  let granted = 0;
  let cancelled = 0;

  if (!outfit) {
    if (ownedIds.length) {
      const result = await tx.playerOutfitSubscription.updateMany({
        where: {
          outfitTemplateId: { in: ownedIds },
          source: { in: [CLAN_MEMBER_SOURCE, CLAN_PAID_MEMBER_SOURCE] },
          status: 'ACTIVE'
        },
        data: { status: 'CANCELLED' }
      });
      cancelled += result.count;
    }
    return { clan, outfit: null, granted, cancelled, paid: false };
  }

  const paid = clanOutfitIsPaid(outfit);

  // O dono do traje/clã sempre mantém o acesso gratuito ao próprio traje.
  await grantManagedSubscription(tx, {
    outfit,
    player: clan.ownerPlayer,
    source: CLAN_MEMBER_SOURCE,
    expiresAt: FOREVER
  });
  granted += 1;

  // Migração V113: estes dois trajes eram tratados como STREAMER nas versões
  // antigas. Ao virarem trajes de CLÃ, nenhum acesso legado pode continuar
  // vitalício fora das regras grátis/pagas do clã.
  const legacyStreamerAccess = await tx.playerOutfitSubscription.updateMany({
    where: {
      outfitTemplateId: outfit.id,
      source: { in: [STREAMER_OWNER_SOURCE, STREAMER_MEMBER_SOURCE] },
      status: 'ACTIVE'
    },
    data: { status: 'CANCELLED' }
  });
  cancelled += legacyStreamerAccess.count;

  if (paid) {
    // Ao mudar um traje de grátis para pago, os acessos gratuitos dos membros são retirados.
    if (nonOwnerPlayerIds.length) {
      const freeMembers = await tx.playerOutfitSubscription.updateMany({
        where: {
          outfitTemplateId: outfit.id,
          source: CLAN_MEMBER_SOURCE,
          playerId: { in: nonOwnerPlayerIds },
          status: 'ACTIVE'
        },
        data: { status: 'CANCELLED' }
      });
      cancelled += freeMembers.count;
    }

    // Mensalidades vencidas deixam de ter acesso. Somente a compra do próprio player reativa.
    const expired = await tx.playerOutfitSubscription.updateMany({
      where: {
        outfitTemplateId: outfit.id,
        source: CLAN_PAID_MEMBER_SOURCE,
        status: 'ACTIVE',
        expiresAt: { lte: new Date() }
      },
      data: { status: 'EXPIRED' }
    });
    cancelled += expired.count;

    // Quem saiu do clã perde imediatamente, mesmo que ainda tivesse dias pagos.
    const removedPaid = await tx.playerOutfitSubscription.updateMany({
      where: {
        outfitTemplateId: outfit.id,
        source: CLAN_PAID_MEMBER_SOURCE,
        status: 'ACTIVE',
        ...(activePlayerIds.length ? { playerId: { notIn: activePlayerIds } } : {})
      },
      data: { status: 'CANCELLED' }
    });
    cancelled += removedPaid.count;
  } else {
    // Modo gratuito: todos os membros ativos recebem automaticamente e não pagam.
    const stalePaid = await tx.playerOutfitSubscription.updateMany({
      where: {
        outfitTemplateId: outfit.id,
        source: CLAN_PAID_MEMBER_SOURCE,
        status: 'ACTIVE'
      },
      data: { status: 'CANCELLED' }
    });
    cancelled += stalePaid.count;

    for (const player of memberPlayers) {
      await grantManagedSubscription(tx, {
        outfit,
        player,
        source: CLAN_MEMBER_SOURCE,
        expiresAt: FOREVER
      });
      granted += player.id === clan.ownerPlayer.id ? 0 : 1;
    }

    const removedFree = await tx.playerOutfitSubscription.updateMany({
      where: {
        outfitTemplateId: outfit.id,
        source: { in: [CLAN_MEMBER_SOURCE, CLAN_PAID_MEMBER_SOURCE] },
        status: 'ACTIVE',
        ...(activePlayerIds.length ? { playerId: { notIn: activePlayerIds } } : {})
      },
      data: { status: 'CANCELLED' }
    });
    cancelled += removedFree.count;
  }

  const otherIds = ownedIds.filter(id => id !== outfit.id);
  if (otherIds.length) {
    const old = await tx.playerOutfitSubscription.updateMany({
      where: {
        outfitTemplateId: { in: otherIds },
        source: { in: [CLAN_MEMBER_SOURCE, CLAN_PAID_MEMBER_SOURCE] },
        status: 'ACTIVE'
      },
      data: { status: 'CANCELLED' }
    });
    cancelled += old.count;
  }

  return { clan, outfit, granted, cancelled, paid, monthlyPriceCoins: clanOutfitMonthlyPrice(outfit) };
}

export async function syncClanManagedOutfitAccess(clanId) {
  return prisma.$transaction(tx => syncClanManagedOutfitAccessTx(tx, clanId));
}

export async function syncClanManagedOutfitForSteam64(steam64) {
  const clean = cleanSteam64(steam64);
  return prisma.$transaction(async (tx) => {
    const player = await tx.player.findUnique({ where: { steam64: clean } });
    if (!player) return { clan: null, outfit: null, granted: 0, cancelled: 0 };
    const membership = await tx.clanMember.findFirst({
      where: { playerId: player.id, status: 'ACTIVE' },
      select: { clanId: true }
    });
    if (!membership) {
      const cancelled = await tx.playerOutfitSubscription.updateMany({
        where: { playerId: player.id, source: { in: [CLAN_MEMBER_SOURCE, CLAN_PAID_MEMBER_SOURCE] }, status: 'ACTIVE' },
        data: { status: 'CANCELLED' }
      });
      return { clan: null, outfit: null, granted: 0, cancelled: cancelled.count };
    }
    const result = await syncClanManagedOutfitAccessTx(tx, membership.clanId);
    if (!result.outfit) {
      const stale = await tx.playerOutfitSubscription.updateMany({
        where: { playerId: player.id, source: { in: [CLAN_MEMBER_SOURCE, CLAN_PAID_MEMBER_SOURCE] }, status: 'ACTIVE' },
        data: { status: 'CANCELLED' }
      });
      result.cancelled += stale.count;
    }
    return result;
  });
}

function cleanClanNameFromOutfit(outfitName = '', ownerName = '') {
  const cleaned = String(outfitName || '')
    .replace(/\b(traje|roupa|vip|personalizado|personalizada|custom|raid-?z)\b/gi, ' ')
    .replace(/[\[\](){}_|]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return (cleaned || String(ownerName || '').trim() || 'Clã RAID-Z').slice(0, 80);
}

function cleanClanTag(value = '') {
  return String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
}

function deriveClanTag(name = '') {
  const words = String(name || '').trim().split(/\s+/).filter(Boolean);
  const initials = words.map(word => word[0]).join('').toUpperCase().replace(/[^A-Z0-9]/g, '');
  return (initials || 'CLAN').slice(0, 8);
}

async function uniqueClanTag(tx, desiredTag, serverType = 'vanilla') {
  const base = cleanClanTag(desiredTag) || 'CLAN';
  for (let i = 0; i < 100; i += 1) {
    const suffix = i ? String(i + 1) : '';
    const candidate = `${base.slice(0, Math.max(1, 8 - suffix.length))}${suffix}`;
    const exists = await tx.clan.findFirst({ where: { tag: candidate, serverType }, select: { id: true } });
    if (!exists) return candidate;
  }
  return `RZ${Date.now().toString(36).slice(-6)}`.toUpperCase().slice(0, 8);
}

async function uniqueClanSlug(tx, name, tag) {
  const base = slugify(`${tag}-${name}`) || `clan-${Date.now().toString(36)}`;
  for (let i = 0; i < 100; i += 1) {
    const candidate = i ? `${base}-${i + 1}` : base;
    const exists = await tx.clan.findUnique({ where: { slug: candidate }, select: { id: true } });
    if (!exists) return candidate;
  }
  return `${base}-${Date.now().toString(36)}`;
}

export async function linkExistingClanOutfitsFromOrders() {
  const orders = await prisma.customOutfitOrder.findMany({
    where: {
      outfitTemplateId: { not: null },
      status: { in: ['IN_PRODUCTION', 'READY'] }
    },
    include: {
      player: { select: { id: true, steam64: true } }
    },
    orderBy: { updatedAt: 'desc' }
  });
  let linked = 0;
  for (const order of orders) {
    if (!order.outfitTemplateId || !order.player?.steam64) continue;
    const outfit = await prisma.outfitTemplate.findUnique({ where: { id: order.outfitTemplateId } });
    if (!outfit?.isPrivate) continue;
    if (outfit.managedOwnerSteam64 && outfit.managedOwnerSteam64 !== order.player.steam64) continue;
    const needsLink = !outfit.managedAccessEnabled
      || outfit.managedOwnerType !== 'CLAN'
      || outfit.managedOwnerSteam64 !== order.player.steam64;
    if (!needsLink) continue;
    await prisma.outfitTemplate.update({
      where: { id: outfit.id },
      data: {
        managedAccessEnabled: true,
        managedOwnerType: 'CLAN',
        managedOwnerSteam64: order.player.steam64,
        maxManagedMembers: Math.max(1, Number(order.maxMembers || outfit.maxManagedMembers || 10)),
        // Trajes antigos ficam grátis até o ADM escolher o modo pago.
        memberMonthlyPriceCoins: Math.max(0, Number(outfit.memberMonthlyPriceCoins || 0))
      }
    });
    linked += 1;
  }
  return { checked: orders.length, linked };
}

const KNOWN_CLANS_BY_OUTFIT_SLUG = {
  'traje-vip-privado-stz': { name: 'STZ', tag: 'STZ' },
  'traje-ocl-streamer': { name: 'OCL', tag: 'OCL' }
};

export async function ensureClansForManagedClanOutfits() {
  const outfits = await prisma.outfitTemplate.findMany({
    where: {
      isPrivate: true,
      managedAccessEnabled: true,
      managedOwnerType: 'CLAN',
      managedOwnerSteam64: { not: null }
    },
    orderBy: [{ active: 'desc' }, { updatedAt: 'desc' }]
  });

  const results = { checked: outfits.length, created: 0, reused: 0, membersImported: 0, skipped: 0, clans: [] };
  const handledOwners = new Set();

  for (const outfit of outfits) {
    const ownerSteam64 = String(outfit.managedOwnerSteam64 || '').trim();
    if (!/^\d{17}$/.test(ownerSteam64) || handledOwners.has(ownerSteam64)) continue;
    handledOwners.add(ownerSteam64);

    try {
      const result = await prisma.$transaction(async (tx) => {
        const owner = await ensurePlayer(tx, ownerSteam64, 'Dono do clã');
        let created = false;
        let clan = await tx.clan.findFirst({
          where: { ownerPlayerId: owner.id, status: 'ACTIVE' },
          include: { members: { where: { status: 'ACTIVE' }, select: { playerId: true } } }
        });

        if (!clan) {
          const oldOwnedClan = await tx.clan.findFirst({
            where: { ownerPlayerId: owner.id },
            orderBy: { updatedAt: 'desc' },
            include: { members: { where: { status: 'ACTIVE' }, select: { playerId: true } } }
          });
          if (oldOwnedClan) {
            clan = await tx.clan.update({
              where: { id: oldOwnedClan.id },
              data: { status: 'ACTIVE' },
              include: { members: { where: { status: 'ACTIVE' }, select: { playerId: true } } }
            });
          }
        }

        if (!clan) {
          const knownClan = KNOWN_CLANS_BY_OUTFIT_SLUG[outfit.slug] || null;
          if (knownClan?.tag) {
            const matchingClan = await tx.clan.findFirst({
              where: { tag: knownClan.tag, serverType: 'vanilla' },
              include: { members: { where: { status: 'ACTIVE' }, select: { playerId: true } } }
            });
            if (matchingClan && (!matchingClan.ownerPlayerId || matchingClan.ownerPlayerId === owner.id)) {
              clan = await tx.clan.update({
                where: { id: matchingClan.id },
                data: { ownerPlayerId: owner.id, status: 'ACTIVE' },
                include: { members: { where: { status: 'ACTIVE' }, select: { playerId: true } } }
              });
            }
          }
        }

        if (!clan) {
          const existingMembership = await tx.clanMember.findFirst({
            where: { playerId: owner.id, status: 'ACTIVE' },
            include: { clan: true }
          });
          if (existingMembership?.clan?.status === 'ACTIVE') {
            if (!existingMembership.clan.ownerPlayerId || existingMembership.clan.ownerPlayerId === owner.id) {
              clan = await tx.clan.update({
                where: { id: existingMembership.clan.id },
                data: { ownerPlayerId: owner.id },
                include: { members: { where: { status: 'ACTIVE' }, select: { playerId: true } } }
              });
              await tx.clanMember.update({ where: { id: existingMembership.id }, data: { role: 'OWNER', status: 'ACTIVE' } });
            } else {
              return { skipped: true, reason: 'owner_in_another_clan', ownerSteam64, outfitId: outfit.id };
            }
          }
        }

        if (!clan) {
          const order = await tx.customOutfitOrder.findFirst({
            where: {
              steam64: ownerSteam64,
              OR: [
                { outfitTemplateId: outfit.id },
                { outfitTemplateId: null, status: { in: ['IN_PRODUCTION', 'READY', 'AWAITING_TICKET'] } }
              ]
            },
            orderBy: { updatedAt: 'desc' }
          });
          const knownClan = KNOWN_CLANS_BY_OUTFIT_SLUG[outfit.slug] || null;
          const name = String(order?.clanName || knownClan?.name || '').trim().slice(0, 80)
            || cleanClanNameFromOutfit(outfit.name, owner.nickname);
          const requestedTag = cleanClanTag(order?.clanTag || knownClan?.tag) || deriveClanTag(name);
          const tag = await uniqueClanTag(tx, requestedTag, 'vanilla');
          const slug = await uniqueClanSlug(tx, name, tag);

          clan = await tx.clan.create({
            data: {
              name,
              tag,
              slug,
              serverType: 'vanilla',
              description: outfit.description || `Clã vinculado ao traje VIP personalizado ${outfit.name}.`,
              flagUrl: outfit.imageUrl || null,
              flagData: outfit.imageData || null,
              flagMime: outfit.imageMime || null,
              ownerPlayerId: owner.id,
              status: 'ACTIVE',
              isRecruiting: false,
              recruitmentTitle: `O clã [${tag}] ${name} está formando sua equipe`,
              accentColor: '#ef4444'
            },
            include: { members: { where: { status: 'ACTIVE' }, select: { playerId: true } } }
          });
          created = true;
          await tx.clanMember.create({
            data: { clanId: clan.id, playerId: owner.id, steam64: owner.steam64, role: 'OWNER', status: 'ACTIVE' }
          });
        } else {
          await tx.clanMember.upsert({
            where: { clanId_playerId: { clanId: clan.id, playerId: owner.id } },
            update: { steam64: owner.steam64, role: 'OWNER', status: 'ACTIVE' },
            create: { clanId: clan.id, playerId: owner.id, steam64: owner.steam64, role: 'OWNER', status: 'ACTIVE' }
          });
        }

        const subscriptions = await tx.playerOutfitSubscription.findMany({
          where: {
            outfitTemplateId: outfit.id,
            status: 'ACTIVE',
            expiresAt: { gt: new Date() }
          },
          include: { player: true },
          orderBy: { createdAt: 'asc' }
        });

        let imported = 0;
        for (const subscription of subscriptions) {
          const member = subscription.player;
          if (!member || member.id === owner.id) continue;
          const otherClan = await tx.clanMember.findFirst({
            where: { playerId: member.id, status: 'ACTIVE', clanId: { not: clan.id } },
            select: { id: true }
          });
          if (otherClan) continue;
          await tx.clanMember.upsert({
            where: { clanId_playerId: { clanId: clan.id, playerId: member.id } },
            update: { steam64: member.steam64, status: 'ACTIVE' },
            create: { clanId: clan.id, playerId: member.id, steam64: member.steam64, role: 'MEMBER', status: 'ACTIVE' }
          });
          imported += 1;
        }

        return { clanId: clan.id, clanName: `[${clan.tag}] ${clan.name}`, created, imported };
      });

      if (result?.skipped) {
        results.skipped += 1;
        continue;
      }
      const wasAlreadyCounted = results.clans.some(item => item.clanId === result.clanId);
      if (!wasAlreadyCounted) results.clans.push(result);
      results.membersImported += Number(result.imported || 0);
      if (result.created) results.created += 1;
      else results.reused += 1;
    } catch (error) {
      results.skipped += 1;
      console.error('[CLAN_AUTO_CREATE_FROM_VIP]', ownerSteam64, outfit.id, error.message);
    }
  }

  return results;
}

export async function syncAllClanManagedOutfits() {
  const linkedOrders = await linkExistingClanOutfitsFromOrders();
  const autoClans = await ensureClansForManagedClanOutfits();
  const clans = await prisma.clan.findMany({ where: { status: 'ACTIVE', ownerPlayerId: { not: null } }, select: { id: true } });
  const results = [];
  for (const clan of clans) {
    try { results.push(await syncClanManagedOutfitAccess(clan.id)); }
    catch (error) { console.error('[CLAN_VIP_SYNC_ALL]', clan.id, error.message); }
  }
  return { clans: clans.length, synced: results.length, linkedOrders, autoClans };
}

export async function revokeClanManagedOutfitAccess(clanId) {
  return prisma.$transaction(async (tx) => {
    const clan = await tx.clan.findUnique({
      where: { id: String(clanId || '') },
      include: { ownerPlayer: { select: { steam64: true } }, members: { where: { status: 'ACTIVE' }, select: { playerId: true } } }
    });
    if (!clan) return { cancelled: 0 };
    const outfitIds = clan.ownerPlayer?.steam64
      ? (await tx.outfitTemplate.findMany({
          where: { managedOwnerSteam64: clan.ownerPlayer.steam64, managedOwnerType: 'CLAN', managedAccessEnabled: true },
          select: { id: true }
        })).map(item => item.id)
      : [];
    if (!outfitIds.length) return { cancelled: 0 };
    const playerIds = clan.members.map(member => member.playerId);
    const result = await tx.playerOutfitSubscription.updateMany({
      where: {
        outfitTemplateId: { in: outfitIds },
        source: { in: [CLAN_MEMBER_SOURCE, CLAN_PAID_MEMBER_SOURCE] },
        status: 'ACTIVE',
        ...(playerIds.length ? { playerId: { in: playerIds } } : {})
      },
      data: { status: 'CANCELLED' }
    });
    return { cancelled: result.count };
  });
}

export async function ensureManagedOwnerAccess(outfitId) {
  return prisma.$transaction(async (tx) => {
    const outfit = await tx.outfitTemplate.findUnique({ where: { id: outfitId } });
    if (!outfit?.managedAccessEnabled || cleanOwnerType(outfit.managedOwnerType) !== 'STREAMER' || !outfit.managedOwnerSteam64) return null;
    const owner = await ensurePlayer(tx, outfit.managedOwnerSteam64, 'Streamer');
    const active = await tx.playerOutfitSubscription.findFirst({
      where: {
        playerId: owner.id,
        outfitTemplateId: outfit.id,
        source: STREAMER_OWNER_SOURCE,
        status: 'ACTIVE',
        expiresAt: { gt: new Date() }
      }
    });
    if (active) return active;
    return grantManagedSubscription(tx, { outfit, player: owner, source: STREAMER_OWNER_SOURCE, expiresAt: FOREVER });
  });
}

export async function listManagedOutfitsForOwner(steam64) {
  const clean = cleanSteam64(steam64);
  await prisma.playerOutfitSubscription.updateMany({
    where: { status: 'ACTIVE', expiresAt: { lte: new Date() }, source: { in: MANAGED_SOURCES } },
    data: { status: 'EXPIRED' }
  });
  const outfits = await prisma.outfitTemplate.findMany({
    where: { managedAccessEnabled: true, managedOwnerSteam64: clean },
    orderBy: [{ active: 'desc' }, { updatedAt: 'desc' }]
  });
  for (const outfit of outfits) {
    if (cleanOwnerType(outfit.managedOwnerType) === 'STREAMER') {
      await ensureManagedOwnerAccess(outfit.id);
    } else {
      const ownedClan = await prisma.clan.findFirst({ where: { ownerPlayer: { steam64: clean }, status: 'ACTIVE' }, select: { id: true } });
      if (ownedClan) await syncClanManagedOutfitAccess(ownedClan.id);
    }
  }
  const ids = outfits.map(o => o.id);
  const [subscriptions, flagRequests] = ids.length ? await Promise.all([
    prisma.playerOutfitSubscription.findMany({
      where: { outfitTemplateId: { in: ids }, source: { in: MANAGED_SOURCES }, status: { in: ['ACTIVE', 'EXPIRED'] } },
      include: { player: true },
      orderBy: [{ status: 'asc' }, { expiresAt: 'desc' }, { createdAt: 'asc' }]
    }),
    prisma.outfitFlagRequest.findMany({
      where: { outfitTemplateId: { in: ids } },
      orderBy: { createdAt: 'desc' },
      take: 50
    })
  ]) : [[], []];

  return outfits.map(outfit => {
    const members = subscriptions.filter(sub => sub.outfitTemplateId === outfit.id);
    const activeMembers = members.filter(sub => sub.status === 'ACTIVE' && sub.expiresAt > new Date() && sub.source !== STREAMER_OWNER_SOURCE);
    const ownerAccess = members.find(sub => sub.source === STREAMER_OWNER_SOURCE && sub.steam64 === clean);
    return {
      ...outfit,
      ownerType: cleanOwnerType(outfit.managedOwnerType),
      members,
      activeMembers,
      ownerAccess,
      flagRequests: flagRequests.filter(request => request.outfitTemplateId === outfit.id),
      pendingFlagRequest: flagRequests.find(request => request.outfitTemplateId === outfit.id && request.status === 'PENDING') || null
    };
  });
}

export async function addManagedOutfitMember({ outfitId, ownerPlayerId, memberSteam64, nickname = '' }) {
  return prisma.$transaction(async (tx) => {
    const owner = await tx.player.findUnique({ where: { id: ownerPlayerId } });
    if (!owner) throw new Error('Responsável não encontrado. Entre novamente no site.');
    const outfit = await getOwnedManagedOutfit(tx, outfitId, owner.steam64);
    const member = await ensurePlayer(tx, memberSteam64, nickname);
    const ownerType = cleanOwnerType(outfit.managedOwnerType);
    const source = sourceForOutfit(outfit, member.steam64 === owner.steam64 && ownerType === 'STREAMER');

    if (source === STREAMER_OWNER_SOURCE) {
      const subscription = await grantManagedSubscription(tx, { outfit, player: member, source, expiresAt: FOREVER });
      return { outfit, member, subscription, chargedCoins: 0 };
    }

    if (ownerType === 'CLAN') {
      const clan = await tx.clan.findFirst({
        where: { ownerPlayerId: owner.id, status: 'ACTIVE' },
        include: { members: { where: { playerId: member.id, status: 'ACTIVE' }, select: { id: true } } }
      });
      if (!clan || !clan.members.length) throw new Error('Esse player precisa estar no clã antes de receber o traje personalizado.');
      if (clanOutfitIsPaid(outfit) && member.id !== owner.id) {
        throw new Error(`Este traje custa ${clanOutfitMonthlyPrice(outfit).toLocaleString('pt-BR')} RZ por player/mês. O próprio membro deve comprar no painel do clã.`);
      }
      const subscription = await grantManagedSubscription(tx, { outfit, player: member, source: CLAN_MEMBER_SOURCE, expiresAt: FOREVER });
      return { outfit, member, subscription, chargedCoins: 0 };
    }

    const activeExisting = await tx.playerOutfitSubscription.findFirst({
      where: { playerId: member.id, outfitTemplateId: outfit.id, source, status: 'ACTIVE', expiresAt: { gt: new Date() } }
    });
    if (activeExisting) throw new Error(ownerType === 'CLAN' ? 'Esse player já está ativo. Use o botão Renovar para pagar o próximo mês.' : 'Esse player já está liberado nesse traje.');

    const activeCount = await tx.playerOutfitSubscription.count({
      where: {
        outfitTemplateId: outfit.id,
        source: ownerType === 'STREAMER' ? STREAMER_MEMBER_SOURCE : CLAN_MEMBER_SOURCE,
        status: 'ACTIVE',
        expiresAt: { gt: new Date() }
      }
    });
    const maxMembers = Math.max(1, Math.min(Number(outfit.maxManagedMembers || 10), 200));
    if (activeCount >= maxMembers) throw new Error(`Limite atingido: o ADM permitiu ${maxMembers} player(s) nesse traje.`);

    let chargedCoins = 0;
    let expiresAt = FOREVER;
    if (ownerType === 'CLAN') {
      chargedCoins = Math.max(0, Number(outfit.memberMonthlyPriceCoins || CUSTOM_OUTFIT_MEMBER_MONTHLY_PRICE));
      if (chargedCoins <= 0) throw new Error('O preço mensal por player ainda não foi configurado pelo ADM.');
      await changePlayerCoins({
        playerId: owner.id,
        amount: -chargedCoins,
        reason: `Mensalidade do traje personalizado ${outfit.name} para ${member.steam64}`,
        refType: 'managed_outfit_member',
        refId: outfit.id,
        tx
      });
      expiresAt = new Date(Date.now() + MONTH_MS);
    }

    const subscription = await grantManagedSubscription(tx, { outfit, player: member, source, expiresAt });
    await logAudit({
      actor: owner.steam64,
      action: 'managed_outfit.member.added',
      target: outfit.id,
      data: { memberSteam64: member.steam64, ownerType, chargedCoins, expiresAt },
      tx
    });
    return { outfit, member, subscription, chargedCoins };
  });
}

export async function purchaseClanOutfitMonth({ playerId, clanId = null, outfitId = null }) {
  return prisma.$transaction(async (tx) => {
    const player = await tx.player.findUnique({ where: { id: playerId } });
    if (!player) throw new Error('Player não encontrado. Entre novamente no site.');

    const membership = await tx.clanMember.findFirst({
      where: {
        playerId,
        status: 'ACTIVE',
        ...(clanId ? { clanId: String(clanId) } : {})
      },
      include: {
        clan: { include: { ownerPlayer: { select: { id: true, steam64: true } } } }
      }
    });
    if (!membership?.clan?.ownerPlayer?.steam64) throw new Error('Você não faz parte de um clã ativo.');

    const outfit = await tx.outfitTemplate.findFirst({
      where: {
        ...(outfitId ? { id: String(outfitId) } : {}),
        active: true,
        isPrivate: true,
        managedAccessEnabled: true,
        managedOwnerType: 'CLAN',
        managedOwnerSteam64: membership.clan.ownerPlayer.steam64
      },
      orderBy: { updatedAt: 'desc' }
    });
    if (!outfit) throw new Error('O clã ainda não possui um traje VIP personalizado ativo.');

    if (!clanOutfitIsPaid(outfit)) {
      throw new Error('Este traje está liberado gratuitamente para todos os membros ativos do clã.');
    }
    if (player.id === membership.clan.ownerPlayer.id) {
      throw new Error('O dono do clã já possui acesso gratuito ao próprio traje.');
    }

    const price = clanOutfitMonthlyPrice(outfit);
    const now = new Date();
    const previous = await tx.playerOutfitSubscription.findFirst({
      where: {
        playerId,
        outfitTemplateId: outfit.id,
        source: CLAN_PAID_MEMBER_SOURCE
      },
      orderBy: { createdAt: 'desc' }
    });

    await changePlayerCoins({
      playerId,
      amount: -price,
      reason: `Mensalidade do traje VIP do clã: ${outfit.name}`,
      refType: 'clan_outfit_month',
      refId: outfit.id,
      tx
    });

    const baseTime = previous?.status === 'ACTIVE' && new Date(previous.expiresAt) > now
      ? new Date(previous.expiresAt)
      : now;
    const expiresAt = new Date(baseTime.getTime() + MONTH_MS);

    await cancelOtherActiveOutfits(tx, player.id, previous?.id || null);
    await tx.playerOutfitSubscription.updateMany({
      where: {
        playerId,
        outfitTemplateId: outfit.id,
        source: CLAN_MEMBER_SOURCE,
        status: 'ACTIVE'
      },
      data: { status: 'CANCELLED' }
    });

    const subscription = previous
      ? await tx.playerOutfitSubscription.update({
          where: { id: previous.id },
          data: {
            steam64: player.steam64,
            serverType: outfit.serverType,
            status: 'ACTIVE',
            startsAt: now,
            expiresAt
          }
        })
      : await tx.playerOutfitSubscription.create({
          data: {
            playerId,
            steam64: player.steam64,
            outfitTemplateId: outfit.id,
            serverType: outfit.serverType,
            source: CLAN_PAID_MEMBER_SOURCE,
            status: 'ACTIVE',
            startsAt: now,
            expiresAt
          }
        });

    await logAudit({
      actor: player.steam64,
      action: 'managed_outfit.clan_month.purchased',
      target: outfit.id,
      data: { clanId: membership.clanId, price, expiresAt },
      tx
    });

    return { outfit, clan: membership.clan, player, subscription, price, expiresAt };
  });
}

export async function renewManagedOutfitMember({ subscriptionId, ownerPlayerId }) {
  return prisma.$transaction(async (tx) => {
    const owner = await tx.player.findUnique({ where: { id: ownerPlayerId } });
    if (!owner) throw new Error('Responsável não encontrado.');
    const subscription = await tx.playerOutfitSubscription.findUnique({
      where: { id: subscriptionId },
      include: { outfitTemplate: true, player: true }
    });
    if (!subscription || ![CLAN_MEMBER_SOURCE, CLAN_PAID_MEMBER_SOURCE].includes(subscription.source)) throw new Error('Acesso de membro não encontrado.');
    const outfit = await getOwnedManagedOutfit(tx, subscription.outfitTemplateId, owner.steam64);
    if (cleanOwnerType(outfit.managedOwnerType) !== 'CLAN') throw new Error('Esse traje não é de clã.');
    if (clanOutfitIsPaid(outfit)) {
      throw new Error('Neste traje pago, cada membro renova com o próprio saldo no painel do clã.');
    }
    const membership = await tx.clanMember.findFirst({ where: { playerId: subscription.playerId, status: 'ACTIVE', clan: { ownerPlayerId: owner.id, status: 'ACTIVE' } } });
    if (!membership) throw new Error('O player não faz mais parte do clã.');
    await cancelOtherActiveOutfits(tx, subscription.playerId, subscription.id);
    const updated = await tx.playerOutfitSubscription.update({
      where: { id: subscription.id },
      data: { source: CLAN_MEMBER_SOURCE, status: 'ACTIVE', startsAt: new Date(), expiresAt: FOREVER }
    });
    return { outfit, subscription: updated, price: 0 };
  });
}

export async function removeManagedOutfitMember({ subscriptionId, ownerPlayerId }) {
  return prisma.$transaction(async (tx) => {
    const owner = await tx.player.findUnique({ where: { id: ownerPlayerId } });
    if (!owner) throw new Error('Responsável não encontrado.');
    const subscription = await tx.playerOutfitSubscription.findUnique({
      where: { id: subscriptionId },
      include: { outfitTemplate: true, player: true }
    });
    if (!subscription || !MANAGED_SOURCES.includes(subscription.source)) throw new Error('Player desse traje não encontrado.');
    const outfit = await getOwnedManagedOutfit(tx, subscription.outfitTemplateId, owner.steam64);
    if (subscription.source === STREAMER_OWNER_SOURCE) throw new Error('O streamer dono não pode ser removido. O ADM precisa trocar o dono do traje.');
    if ([CLAN_MEMBER_SOURCE, CLAN_PAID_MEMBER_SOURCE].includes(subscription.source)) throw new Error('O acesso do traje é controlado pelo clã. Remova o player do clã para retirar o acesso imediatamente.');
    const updated = await tx.playerOutfitSubscription.update({ where: { id: subscription.id }, data: { status: 'CANCELLED' } });
    await logAudit({ actor: owner.steam64, action: 'managed_outfit.member.removed', target: outfit.id, data: { memberSteam64: subscription.steam64 }, tx });
    return { outfit, subscription: updated };
  });
}

export async function requestManagedOutfitFlag({ outfitId, ownerPlayerId }) {
  const result = await prisma.$transaction(async (tx) => {
    const owner = await tx.player.findUnique({ where: { id: ownerPlayerId } });
    if (!owner) throw new Error('Responsável não encontrado. Entre novamente no site.');

    const outfit = await getOwnedManagedOutfit(tx, outfitId, owner.steam64);
    const flagClassname = String(outfit.flagClassname || '').trim();
    if (!flagClassname) throw new Error('O ADM ainda não configurou a bandeira desse traje.');

    // Evita somente clique duplo/acidental. Depois de 30 segundos o responsável
    // pode pedir outra bandeira normalmente, sem depender de aprovação do ADM.
    const duplicateWindow = new Date(Date.now() - 30_000);
    const recent = await tx.outfitFlagRequest.findFirst({
      where: {
        outfitTemplateId: outfit.id,
        requesterSteam64: owner.steam64,
        createdAt: { gte: duplicateWindow },
        status: { in: ['APPROVED', 'DELIVERED'] }
      },
      orderBy: { createdAt: 'desc' }
    });
    if (recent) throw new Error('A bandeira já foi enviada. Aguarde 30 segundos antes de pedir outra.');

    const delivery = await tx.deliveryQueue.create({
      data: {
        playerId: owner.id,
        steam64: owner.steam64,
        serverType: outfit.serverType || 'vanilla',
        productName: `[BANDEIRA PERSONALIZADA] ${outfit.name}: ${flagClassname}`,
        classname: flagClassname,
        quantity: 1,
        deliveryType: 'drop_at_feet',
        meta: {
          kind: 'managed_outfit_flag',
          outfitTemplateId: outfit.id,
          outfitName: outfit.name,
          ownerType: cleanOwnerType(outfit.managedOwnerType),
          requesterSteam64: owner.steam64,
          flagClassname,
          automaticApproval: true,
          dropOutsideIfCannotFit: true,
          oversizedItemsDropOutside: true
        }
      }
    });

    const request = await tx.outfitFlagRequest.create({
      data: {
        outfitTemplateId: outfit.id,
        requesterSteam64: owner.steam64,
        requesterName: owner.nickname || null,
        ownerType: cleanOwnerType(outfit.managedOwnerType),
        flagClassname,
        status: 'DELIVERED',
        adminNote: `Entrega automática criada no File Bridge: ${delivery.id}`
      }
    });

    await logAudit({
      actor: owner.steam64,
      action: 'managed_outfit.flag.auto_delivery.created',
      target: outfit.id,
      data: { requestId: request.id, deliveryId: delivery.id, flagClassname },
      tx
    });

    return { outfit, owner, request, delivery };
  });

  try {
    // Importação dinâmica evita ciclo entre outfitService, managedOutfitService
    // e fileBridgeService durante o início do site.
    const { publishPlayerDeliveryFilesNow } = await import('./fileBridgeService.js');
    result.fileBridgeImmediate = await publishPlayerDeliveryFilesNow([result.owner.steam64]);
  } catch (error) {
    // A entrega já ficou salva no banco. A fila rápida e o ciclo periódico ficam
    // como recuperação, sem perder a bandeira caso o FTP oscile por alguns segundos.
    try {
      const { queueImmediatePlayerFileSync } = await import('./fileBridgeService.js');
      queueImmediatePlayerFileSync(result.owner.steam64);
    } catch {}
    result.fileBridgeImmediate = { ok: false, error: String(error?.message || error) };
    console.error('[FILE_BRIDGE_NOW] Bandeira personalizada salva, mas o FTP imediato falhou:', error.message);
  }

  return result;
}

export async function purchaseCustomOutfitOrder({ playerId, clanName = '', clanTag = '' }) {
  return prisma.$transaction(async (tx) => {
    const player = await tx.player.findUnique({ where: { id: playerId } });
    if (!player) throw new Error('Player não encontrado.');
    const pending = await tx.customOutfitOrder.findFirst({
      where: { playerId, status: { in: ['AWAITING_TICKET', 'IN_PRODUCTION', 'READY'] } },
      orderBy: { createdAt: 'desc' }
    });
    if (pending) throw new Error('Você já possui um pedido de traje personalizado em andamento. Abra ticket no Discord para continuar.');
    await changePlayerCoins({
      playerId,
      amount: -CUSTOM_OUTFIT_CREATION_PRICE,
      reason: 'Criação de traje VIP personalizado de clã',
      refType: 'custom_outfit_order',
      refId: player.steam64,
      tx
    });
    const order = await tx.customOutfitOrder.create({
      data: {
        playerId,
        steam64: player.steam64,
        leaderName: player.nickname || null,
        clanName: String(clanName || '').trim().slice(0, 100) || null,
        clanTag: String(clanTag || '').trim().slice(0, 16) || null,
        status: 'AWAITING_TICKET',
        creationPriceCoins: CUSTOM_OUTFIT_CREATION_PRICE,
        monthlyMemberPriceCoins: CUSTOM_OUTFIT_MEMBER_MONTHLY_PRICE,
        maxMembers: CUSTOM_OUTFIT_DEFAULT_MAX_MEMBERS,
        note: 'Pagamento confirmado. O líder deve abrir ticket no Discord e enviar logo, cores e referências.'
      }
    });
    await logAudit({ actor: player.steam64, action: 'custom_outfit.order.created', target: order.id, data: { clanName: order.clanName, clanTag: order.clanTag, price: CUSTOM_OUTFIT_CREATION_PRICE }, tx });
    return { player, order };
  });
}

export async function getCustomOutfitOrdersForPlayer(steam64) {
  const clean = cleanSteam64(steam64);
  return prisma.customOutfitOrder.findMany({ where: { steam64: clean }, orderBy: { createdAt: 'desc' }, take: 20 });
}

export async function getManagedOutfitAdminData() {
  const [orders, flagRequests] = await Promise.all([
    prisma.customOutfitOrder.findMany({ include: { player: true }, orderBy: { createdAt: 'desc' }, take: 200 }),
    prisma.outfitFlagRequest.findMany({ include: { outfitTemplate: true }, orderBy: { createdAt: 'desc' }, take: 200 })
  ]);
  return { orders, flagRequests };
}

export async function updateCustomOutfitOrder({ id, status, outfitTemplateId = '', note = '' }) {
  const allowed = ['AWAITING_TICKET', 'IN_PRODUCTION', 'READY', 'CANCELLED'];
  const cleanStatus = String(status || '').toUpperCase();
  if (!allowed.includes(cleanStatus)) throw new Error('Status de pedido inválido.');
  const updated = await prisma.customOutfitOrder.update({
    where: { id },
    data: {
      status: cleanStatus,
      outfitTemplateId: String(outfitTemplateId || '').trim() || null,
      note: String(note || '').trim().slice(0, 500) || null
    }
  });
  await logAudit({ actor: 'admin', action: 'custom_outfit.order.updated', target: id, data: { status: cleanStatus, outfitTemplateId: updated.outfitTemplateId } });
  return updated;
}

export async function updateFlagRequest({ id, status, adminNote = '' }) {
  const allowed = ['PENDING', 'APPROVED', 'REJECTED', 'DELIVERED'];
  const cleanStatus = String(status || '').toUpperCase();
  if (!allowed.includes(cleanStatus)) throw new Error('Status da bandeira inválido.');
  const updated = await prisma.outfitFlagRequest.update({
    where: { id },
    data: { status: cleanStatus, adminNote: String(adminNote || '').trim().slice(0, 500) || null }
  });
  await logAudit({ actor: 'admin', action: 'managed_outfit.flag.updated', target: id, data: { status: cleanStatus } });
  return updated;
}

export async function syncManagedTemplateOrder(outfit) {
  if (!outfit?.managedAccessEnabled || cleanOwnerType(outfit.managedOwnerType) !== 'CLAN' || !outfit.managedOwnerSteam64) return;
  await prisma.customOutfitOrder.updateMany({
    where: { steam64: outfit.managedOwnerSteam64, status: { in: ['AWAITING_TICKET', 'IN_PRODUCTION'] } },
    data: { status: 'READY', outfitTemplateId: outfit.id, note: 'Traje ligado pelo ADM. O líder já pode gerenciar os usuários no painel.' }
  });
}
