import { prisma } from '../db/prisma.js';
import { slugify } from '../utils/slug.js';
import { canManageClan } from './rankingService.js';
import { syncClanManagedOutfitAccess } from './managedOutfitService.js';


const PUBLIC_PLAYER_SELECT = {
  id: true,
  steam64: true,
  nickname: true,
  profileBio: true,
  avatarMime: true,
  updatedAt: true
};

async function syncClanOutfits(clans = []) {
  for (const clan of clans) {
    try { await syncClanManagedOutfitAccess(clan.id); } catch (error) { console.error('[CLAN_VIP_SYNC]', clan.id, error.message); }
  }
}

async function getClanVipOutfitMap(clans = []) {
  const owners = [...new Set(clans.map(clan => clan.ownerPlayer?.steam64).filter(Boolean))];
  if (!owners.length) return new Map();
  const outfits = await prisma.outfitTemplate.findMany({
    where: {
      active: true,
      isPrivate: true,
      managedAccessEnabled: true,
      managedOwnerType: 'CLAN',
      managedOwnerSteam64: { in: owners }
    },
    omit: { imageData: true },
    orderBy: [{ updatedAt: 'desc' }]
  });
  const map = new Map();
  for (const outfit of outfits) {
    if (!map.has(outfit.managedOwnerSteam64)) {
      map.set(outfit.managedOwnerSteam64, {
        ...outfit,
        imageSrc: outfit.imageMime ? `/outfit-image/${outfit.id}` : (outfit.imageUrl || '/images/raidz-vips-store.webp')
      });
    }
  }
  return map;
}

export function normalizeAccentColor(value) {
  const color = String(value || '').trim();
  return /^#[0-9a-f]{6}$/i.test(color) ? color : '#ef4444';
}

export async function getActiveOutfitMap(steam64s = []) {
  const unique = [...new Set((steam64s || []).map(v => String(v || '').trim()).filter(Boolean))];
  if (!unique.length) return new Map();
  const rows = await prisma.playerOutfitSubscription.findMany({
    where: {
      steam64: { in: unique },
      status: 'ACTIVE',
      expiresAt: { gt: new Date() },
      outfitTemplate: { active: true }
    },
    include: { outfitTemplate: true },
    orderBy: [{ expiresAt: 'desc' }, { createdAt: 'desc' }]
  });
  const map = new Map();
  for (const row of rows) {
    if (!row?.steam64 || map.has(row.steam64)) continue;
    map.set(row.steam64, row);
  }
  return map;
}

function decorateMember(member, outfitMap) {
  const activeOutfit = outfitMap.get(member.steam64) || null;
  return {
    ...member,
    displayName: member.player?.nickname || member.steam64,
    activeOutfit,
    avatarUrl: member.player?.avatarMime ? `/player-avatar/${member.playerId}?v=${member.player.updatedAt ? new Date(member.player.updatedAt).getTime() : ''}` : '/images/raidz-profile-default.webp'
  };
}

function decorateClan(clan, outfitMap, clanVipOutfitMap = new Map()) {
  const rawClanVipOutfit = clanVipOutfitMap.get(clan.ownerPlayer?.steam64) || null;
  const clanVipOutfit = rawClanVipOutfit
    ? {
        ...rawClanVipOutfit,
        billingMode: Number(rawClanVipOutfit.memberMonthlyPriceCoins || 0) > 0 ? 'PAID' : 'FREE',
        monthlyPriceCoins: Math.max(0, Number(rawClanVipOutfit.memberMonthlyPriceCoins || 0))
      }
    : null;
  const members = (clan.members || []).map(member => {
    const decorated = decorateMember(member, outfitMap);
    const activeForClan = Boolean(clanVipOutfit && decorated.activeOutfit?.outfitTemplateId === clanVipOutfit.id);
    return {
      ...decorated,
      clanVipActive: activeForClan,
      clanVipExpiresAt: activeForClan ? decorated.activeOutfit?.expiresAt : null
    };
  });
  const activeOutfitNames = [...new Set(members.map(m => m.activeOutfit?.outfitTemplate?.name).filter(Boolean))];
  return {
    ...clan,
    members,
    memberCount: members.length,
    activeOutfitNames,
    clanVipOutfit,
    pendingApplications: (clan.joinApplications || []).filter(app => app.status === 'PENDING').length,
    accentColor: normalizeAccentColor(clan.accentColor),
    flagImage: clan.flagData ? `/clan-flag/${clan.id}` : (clan.flagUrl || '/images/raidz-clan-default.webp'),
    bannerImage: clan.bannerData ? `/clan-banner/${clan.id}` : '/images/raidz-clans-hero.webp'
  };
}

export async function getRecruitingClans({ limit = 6 } = {}) {
  const clans = await prisma.clan.findMany({
    where: { status: 'ACTIVE', isRecruiting: true },
    include: {
      ownerPlayer: { select: PUBLIC_PLAYER_SELECT },
      members: { where: { status: 'ACTIVE' }, include: { player: { select: PUBLIC_PLAYER_SELECT } }, orderBy: [{ role: 'asc' }, { joinedAt: 'asc' }] },
      awards: { where: { visible: true }, orderBy: { awardedAt: 'desc' }, take: 3 },
      joinApplications: { where: { status: 'PENDING' }, take: 100 }
    },
    orderBy: [{ eventWins: 'desc' }, { updatedAt: 'desc' }],
    take: limit
  });
  const [outfitMap, clanVipOutfitMap] = await Promise.all([
    getActiveOutfitMap(clans.flatMap(clan => clan.members.map(member => member.steam64))),
    getClanVipOutfitMap(clans)
  ]);
  return clans.map(clan => decorateClan(clan, outfitMap, clanVipOutfitMap));
}

export async function getClanHubOverview({ playerId = null } = {}) {
  const [clans, recruitingClans, membership] = await Promise.all([
    prisma.clan.findMany({
      where: { status: 'ACTIVE' },
      include: {
        ownerPlayer: { select: PUBLIC_PLAYER_SELECT },
        subOwnerPlayer: { select: PUBLIC_PLAYER_SELECT },
        members: { where: { status: 'ACTIVE' }, include: { player: { select: PUBLIC_PLAYER_SELECT } }, orderBy: [{ role: 'asc' }, { joinedAt: 'asc' }] },
        awards: { where: { visible: true }, orderBy: { awardedAt: 'desc' }, take: 4 },
        joinApplications: { where: { status: 'PENDING' }, take: 100 }
      },
      orderBy: [{ isRecruiting: 'desc' }, { eventWins: 'desc' }, { createdAt: 'asc' }]
    }),
    getRecruitingClans({ limit: 6 }),
    playerId ? prisma.clanMember.findFirst({ where: { playerId, status: 'ACTIVE' }, include: { clan: true } }) : Promise.resolve(null)
  ]);

  const [outfitMap, clanVipOutfitMap] = await Promise.all([
    getActiveOutfitMap(clans.flatMap(clan => clan.members.map(member => member.steam64))),
    getClanVipOutfitMap(clans)
  ]);
  return {
    clans: clans.map(clan => decorateClan(clan, outfitMap, clanVipOutfitMap)),
    recruitingClans,
    membership
  };
}

export async function getPublicClanBySlug(slug, viewerPlayerId = null) {
  const clan = await prisma.clan.findUnique({
    where: { slug: String(slug || '') },
    include: {
      ownerPlayer: { select: PUBLIC_PLAYER_SELECT },
      subOwnerPlayer: { select: PUBLIC_PLAYER_SELECT },
      members: { where: { status: 'ACTIVE' }, include: { player: { select: PUBLIC_PLAYER_SELECT } }, orderBy: [{ role: 'asc' }, { joinedAt: 'asc' }] },
      awards: { where: { visible: true }, orderBy: { awardedAt: 'desc' } },
      joinApplications: viewerPlayerId ? { where: { playerId: viewerPlayerId }, orderBy: { createdAt: 'desc' }, take: 10 } : false
    }
  });
  if (!clan || clan.status !== 'ACTIVE') return null;
  await syncClanOutfits([clan]);
  const [outfitMap, clanVipOutfitMap] = await Promise.all([
    getActiveOutfitMap(clan.members.map(member => member.steam64)),
    getClanVipOutfitMap([clan])
  ]);
  const viewerMembership = viewerPlayerId ? await prisma.clanMember.findFirst({ where: { playerId: viewerPlayerId, status: 'ACTIVE' }, include: { clan: true } }) : null;
  const decoratedClan = decorateClan(clan, outfitMap, clanVipOutfitMap);
  return {
    clan: decoratedClan,
    viewerMembership,
    viewerClanMember: viewerPlayerId ? decoratedClan.members.find(member => member.playerId === viewerPlayerId) || null : null,
    viewerApplications: Array.isArray(clan.joinApplications) ? clan.joinApplications : []
  };
}

export async function getMyClanDashboard(playerId) {
  const membership = await prisma.clanMember.findFirst({
    where: { playerId, status: 'ACTIVE' },
    include: {
      player: { select: PUBLIC_PLAYER_SELECT },
      clan: {
        include: {
          ownerPlayer: { select: PUBLIC_PLAYER_SELECT },
          subOwnerPlayer: { select: PUBLIC_PLAYER_SELECT },
          members: { where: { status: 'ACTIVE' }, include: { player: { select: PUBLIC_PLAYER_SELECT } }, orderBy: [{ role: 'asc' }, { joinedAt: 'asc' }] },
          awards: { where: { visible: true }, orderBy: { awardedAt: 'desc' } },
          joinApplications: { orderBy: { createdAt: 'desc' }, include: { player: { select: PUBLIC_PLAYER_SELECT } } }
        }
      }
    }
  });
  if (!membership) return null;
  await syncClanOutfits([membership.clan]);
  const badges = await prisma.playerBadge.findMany({ where: { steam64: membership.player.steam64, visible: true }, orderBy: { awardedAt: 'desc' } }).catch(() => []);
  const [outfitMap, clanVipOutfitMap] = await Promise.all([
    getActiveOutfitMap(membership.clan.members.map(member => member.steam64)),
    getClanVipOutfitMap([membership.clan])
  ]);
  return {
    ...membership,
    clan: decorateClan(membership.clan, outfitMap, clanVipOutfitMap),
    badges
  };
}

export async function playerHasAnotherClan(playerId, clanId) {
  if (!playerId) return null;
  return prisma.clanMember.findFirst({
    where: { playerId, status: 'ACTIVE', clanId: { not: clanId } },
    include: { clan: true }
  });
}

export async function submitClanApplication({ clanId, playerId, steam64, inGameName, message, requesterName }) {
  const clan = await prisma.clan.findUnique({ where: { id: clanId } });
  if (!clan || clan.status !== 'ACTIVE') throw new Error('Clã não encontrado.');
  if (!clan.isRecruiting) throw new Error('Esse clã não está recrutando no momento.');
  const otherClan = await playerHasAnotherClan(playerId, clan.id);
  if (otherClan) throw new Error(`Você já faz parte do clã [${otherClan.clan.tag}] ${otherClan.clan.name}.`);
  const existingPending = await prisma.clanJoinApplication.findFirst({
    where: { clanId, requesterSteam64: steam64, status: 'PENDING' }
  });
  if (existingPending) throw new Error('Você já enviou uma solicitação pendente para esse clã.');
  return prisma.clanJoinApplication.create({
    data: {
      clanId,
      playerId,
      requesterSteam64: steam64,
      requesterName: requesterName || null,
      inGameName: String(inGameName || '').trim() || null,
      message: String(message || '').trim() || null,
      status: 'PENDING'
    }
  });
}

export async function reviewClanApplication({ applicationId, reviewerPlayerId, action = 'approve', ownerNote = '' }) {
  const managerMembership = await prisma.clanMember.findFirst({
    where: { playerId: reviewerPlayerId, status: 'ACTIVE' },
    include: { clan: true, player: true }
  });
  if (!canManageClan(managerMembership)) throw new Error('Apenas dono ou sub dono pode revisar solicitações.');

  const application = await prisma.clanJoinApplication.findUnique({
    where: { id: applicationId },
    include: { player: true, clan: true }
  });
  if (!application || application.clanId !== managerMembership.clanId) throw new Error('Solicitação não encontrada.');
  if (application.status !== 'PENDING') throw new Error('Essa solicitação já foi respondida.');

  if (action !== 'approve') {
    return prisma.clanJoinApplication.update({
      where: { id: application.id },
      data: { status: 'REJECTED', ownerNote: String(ownerNote || '').trim() || null }
    });
  }

  if (!application.playerId) throw new Error('O player desta solicitação não está mais cadastrado.');
  const otherClan = await playerHasAnotherClan(application.playerId, managerMembership.clanId);
  if (otherClan) throw new Error(`Esse player já está no clã [${otherClan.clan.tag}] ${otherClan.clan.name}.`);

  const approved = await prisma.$transaction(async (tx) => {
    await tx.clanMember.upsert({
      where: { clanId_playerId: { clanId: managerMembership.clanId, playerId: application.playerId } },
      update: { status: 'ACTIVE', role: 'MEMBER', steam64: application.requesterSteam64 },
      create: { clanId: managerMembership.clanId, playerId: application.playerId, steam64: application.requesterSteam64, role: 'MEMBER', status: 'ACTIVE' }
    });
    await tx.clanJoinApplication.update({
      where: { id: application.id },
      data: { status: 'APPROVED', ownerNote: String(ownerNote || '').trim() || null }
    });
    await tx.clanJoinApplication.updateMany({
      where: { requesterSteam64: application.requesterSteam64, status: 'PENDING', id: { not: application.id } },
      data: { status: 'CANCELLED', ownerNote: 'Cancelado automaticamente após aprovação em outro clã.' }
    });
    return application;
  });
  await syncClanManagedOutfitAccess(managerMembership.clanId);
  return approved;
}

export async function createClanFromPlayer({ player, data = {} }) {
  if (!player?.id) throw new Error('Player inválido.');
  const currentClan = await prisma.clanMember.findFirst({ where: { playerId: player.id, status: 'ACTIVE' }, include: { clan: true } });
  if (currentClan) throw new Error(`Você já faz parte do clã [${currentClan.clan.tag}] ${currentClan.clan.name}.`);

  const name = String(data.name || '').trim().slice(0, 80);
  const tag = String(data.tag || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
  const description = String(data.description || '').trim().slice(0, 1200) || null;
  const flagUrl = String(data.flagUrl || '').trim() || null;
  const serverType = 'vanilla';
  if (!name) throw new Error('Digite o nome do clã.');
  if (!tag) throw new Error('Digite a TAG do clã.');
  const accentColor = normalizeAccentColor(data.accentColor);
  const slugBase = slugify(`${tag}-${name}-${Date.now().toString(36)}`);

  const clan = await prisma.$transaction(async (tx) => {
    const duplicate = await tx.clan.findFirst({ where: { tag, serverType, status: 'ACTIVE' } });
    if (duplicate) throw new Error('Já existe um clã ativo com essa TAG.');
    const clan = await tx.clan.create({
      data: {
        name,
        tag,
        slug: slugBase,
        serverType,
        description,
        flagUrl,
        flagData: data.flagData || null,
        flagMime: data.flagMime || null,
        bannerData: data.bannerData || null,
        bannerMime: data.bannerMime || null,
        ownerPlayerId: player.id,
        isRecruiting: ['1', 'true', 'on', 'sim', 'yes'].includes(String(data.isRecruiting || '').toLowerCase()),
        recruitmentTitle: String(data.recruitmentTitle || '').trim().slice(0, 120) || null,
        recruitmentMessage: String(data.recruitmentMessage || '').trim().slice(0, 1200) || null,
        recruitmentRequirements: String(data.recruitmentRequirements || '').trim().slice(0, 1200) || null,
        recruitmentContact: String(data.recruitmentContact || '').trim().slice(0, 160) || null,
        accentColor,
        status: 'ACTIVE'
      }
    });
    await tx.clanMember.create({
      data: { clanId: clan.id, playerId: player.id, steam64: player.steam64, role: 'OWNER', status: 'ACTIVE' }
    });
    return clan;
  });
  await syncClanManagedOutfitAccess(clan.id);
  return clan;
}
