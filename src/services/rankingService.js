import { prisma } from '../db/prisma.js';
import { slugify } from '../utils/slug.js';
import { upsertPlayerBySteam64 } from './playerService.js';

export const RANKING_SERVERS = ['global', 'vanilla', 'bbp', 'deathmatch'];
export const RANKING_PERIODS = ['daily', 'weekly', 'monthly', 'season', 'all'];

export function normalizeRankingServer(value) {
  const v = String(value || 'global').toLowerCase();
  return RANKING_SERVERS.includes(v) ? v : 'global';
}

export function normalizeRankingPeriod(value) {
  const v = String(value || 'weekly').toLowerCase();
  return RANKING_PERIODS.includes(v) ? v : 'weekly';
}

export function getRankingDateRange(period, activeSeason = null) {
  const now = new Date();
  const start = new Date(now);
  if (period === 'daily') {
    start.setHours(0, 0, 0, 0);
    return { start, end: now, label: 'Hoje' };
  }
  if (period === 'weekly') {
    start.setDate(now.getDate() - 7);
    return { start, end: now, label: 'Últimos 7 dias' };
  }
  if (period === 'monthly') {
    start.setMonth(now.getMonth() - 1);
    return { start, end: now, label: 'Últimos 30 dias' };
  }
  if (period === 'season' && activeSeason) {
    return { start: activeSeason.startsAt, end: activeSeason.endsAt || now, label: activeSeason.name };
  }
  return { start: null, end: null, label: 'Todo histórico' };
}

function safeNumber(value) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n : 0;
}

function makePlayerStat(steam64, name) {
  return {
    steam64,
    name: name || steam64,
    kills: 0,
    deaths: 0,
    headshots: 0,
    longestKill: 0,
    favoriteWeapon: null,
    weaponCounts: {},
    victims: {},
    nemesis: {},
    badges: [],
    badgePoints: 0,
    kd: 0,
    score: 0
  };
}

function toSortedPlayerStats(map) {
  return Array.from(map.values()).map((p) => {
    p.kd = p.deaths > 0 ? Number((p.kills / p.deaths).toFixed(2)) : p.kills;
    p.badgePoints = Number(p.badgePoints || 0);
    p.score = (p.kills * 100) + (p.headshots * 15) + Math.round(p.longestKill || 0) + p.badgePoints - (p.deaths * 35);
    const fav = Object.entries(p.weaponCounts).sort((a, b) => b[1] - a[1])[0];
    p.favoriteWeapon = fav ? fav[0] : '-';
    p.topVictim = Object.entries(p.victims).sort((a, b) => b[1] - a[1])[0] || null;
    p.topNemesis = Object.entries(p.nemesis).sort((a, b) => b[1] - a[1])[0] || null;
    return p;
  }).sort((a, b) => b.score - a.score || b.kills - a.kills || a.deaths - b.deaths);
}

export function aggregatePlayerStats(kills = [], badges = []) {
  const map = new Map();
  for (const kill of kills) {
    const killerSteam64 = String(kill.killerSteam64 || '').trim();
    const victimSteam64 = String(kill.victimSteam64 || '').trim();
    if (!killerSteam64 || !victimSteam64 || killerSteam64 === victimSteam64) continue;

    if (!map.has(killerSteam64)) map.set(killerSteam64, makePlayerStat(killerSteam64, kill.killerName));
    if (!map.has(victimSteam64)) map.set(victimSteam64, makePlayerStat(victimSteam64, kill.victimName));

    const killer = map.get(killerSteam64);
    const victim = map.get(victimSteam64);
    killer.name = kill.killerName || killer.name;
    victim.name = kill.victimName || victim.name;
    killer.kills += 1;
    victim.deaths += 1;
    if (kill.headshot) killer.headshots += 1;
    killer.longestKill = Math.max(killer.longestKill, safeNumber(kill.distanceMeters));
    const weapon = String(kill.weapon || 'Desconhecida').trim() || 'Desconhecida';
    killer.weaponCounts[weapon] = (killer.weaponCounts[weapon] || 0) + 1;
    const victimLabel = kill.victimName || victimSteam64;
    const killerLabel = kill.killerName || killerSteam64;
    killer.victims[victimLabel] = (killer.victims[victimLabel] || 0) + 1;
    victim.nemesis[killerLabel] = (victim.nemesis[killerLabel] || 0) + 1;
  }
  for (const badge of badges || []) {
    const steam64 = String(badge.steam64 || '').trim();
    if (!steam64 || badge.visible === false) continue;
    if (!map.has(steam64)) map.set(steam64, makePlayerStat(steam64, badge.playerName || steam64));
    const player = map.get(steam64);
    if (badge.playerName && (!player.name || player.name === steam64)) player.name = badge.playerName;
    player.badges.push(badge);
    player.badgePoints += safeNumber(badge.points);
  }
  return toSortedPlayerStats(map);
}

function makeClanStat(clan) {
  return {
    id: clan.id,
    name: clan.name,
    tag: clan.tag,
    serverType: clan.serverType,
    description: clan.description,
    flagUrl: clan.flagUrl,
    awards: clan.awards || [],
    eventWins: clan.eventWins || 0,
    pointsBonus: clan.pointsBonus || 0,
    trophyPoints: (clan.awards || []).reduce((sum, award) => sum + safeNumber(award.points), 0),
    membersCount: (clan.members || []).filter(m => m.status === 'ACTIVE').length,
    kills: 0,
    deaths: 0,
    headshots: 0,
    longestKill: 0,
    kd: 0,
    score: 0
  };
}

export function aggregateClanStats(kills = [], clans = []) {
  const clanStats = new Map();
  const clanBySteam = new Map();
  for (const clan of clans) {
    clanStats.set(clan.id, makeClanStat(clan));
    for (const member of clan.members || []) {
      if (member.status === 'ACTIVE') clanBySteam.set(member.steam64, clan.id);
    }
  }
  for (const kill of kills) {
    const killerClanId = kill.killerClanId || clanBySteam.get(kill.killerSteam64);
    const victimClanId = kill.victimClanId || clanBySteam.get(kill.victimSteam64);
    if (killerClanId && clanStats.has(killerClanId)) {
      const stat = clanStats.get(killerClanId);
      stat.kills += 1;
      if (kill.headshot) stat.headshots += 1;
      stat.longestKill = Math.max(stat.longestKill, safeNumber(kill.distanceMeters));
    }
    if (victimClanId && clanStats.has(victimClanId)) {
      const stat = clanStats.get(victimClanId);
      stat.deaths += 1;
    }
  }
  return Array.from(clanStats.values()).map((c) => {
    c.kd = c.deaths > 0 ? Number((c.kills / c.deaths).toFixed(2)) : c.kills;
    c.score = (c.kills * 100) + (c.headshots * 15) + Math.round(c.longestKill || 0) + (c.eventWins * 600) + (c.pointsBonus || 0) + (c.trophyPoints || 0) - (c.deaths * 35);
    return c;
  }).sort((a, b) => b.score - a.score || b.kills - a.kills || a.deaths - b.deaths);
}

export async function getRankingData({ server = 'global', period = 'weekly', playerId = null } = {}) {
  const selectedServer = normalizeRankingServer(server);
  const selectedPeriod = normalizeRankingPeriod(period);
  const activeSeason = await prisma.season.findFirst({ where: { status: 'ACTIVE' }, orderBy: { startsAt: 'desc' } });
  const range = getRankingDateRange(selectedPeriod, activeSeason);
  const where = {};
  if (selectedServer !== 'global') where.serverType = selectedServer;
  if (range.start) where.occurredAt = { gte: range.start, ...(range.end ? { lte: range.end } : {}) };

  const badgeWhere = { visible: true };
  if (range.start) badgeWhere.awardedAt = { gte: range.start, ...(range.end ? { lte: range.end } : {}) };

  const [kills, clans, seasons, playerBadges, myMembership] = await Promise.all([
    prisma.killEvent.findMany({ where, orderBy: { occurredAt: 'desc' }, take: 5000 }),
    prisma.clan.findMany({
      where: {
        status: 'ACTIVE',
        ...(selectedServer === 'global' ? {} : { OR: [{ serverType: 'all' }, { serverType: selectedServer }] })
      },
      include: {
        members: { where: { status: 'ACTIVE' }, include: { player: true }, orderBy: [{ role: 'asc' }, { joinedAt: 'asc' }] },
        awards: { where: { visible: true }, orderBy: { awardedAt: 'desc' }, take: 6 }
      },
      orderBy: { createdAt: 'asc' }
    }),
    prisma.season.findMany({ orderBy: { startsAt: 'desc' }, take: 10 }),
    prisma.playerBadge.findMany({ where: badgeWhere, orderBy: { awardedAt: 'desc' }, take: 300 }),
    playerId ? prisma.clanMember.findFirst({ where: { playerId, status: 'ACTIVE' }, include: { clan: { include: { members: { where: { status: 'ACTIVE' }, include: { player: true } }, awards: { where: { visible: true }, orderBy: { awardedAt: 'desc' } } } } } }) : Promise.resolve(null)
  ]);

  const playerRanking = aggregatePlayerStats(kills, playerBadges).slice(0, 100);
  const clanRanking = aggregateClanStats(kills, clans).slice(0, 100);
  const totals = {
    kills: kills.length,
    headshots: kills.filter(k => k.headshot).length,
    clans: clans.length,
    players: new Set(kills.flatMap(k => [k.killerSteam64, k.victimSteam64]).filter(Boolean)).size,
    longestKill: kills.reduce((max, k) => Math.max(max, safeNumber(k.distanceMeters)), 0)
  };

  return { selectedServer, selectedPeriod, activeSeason, range, kills, recentKills: kills.slice(0, 30), clans, seasons, playerBadges, myMembership, playerRanking, clanRanking, totals };
}

export async function findActiveClanForSteam(steam64) {
  if (!steam64) return null;
  const member = await prisma.clanMember.findFirst({
    where: { steam64: String(steam64), status: 'ACTIVE', clan: { status: 'ACTIVE' } },
    include: { clan: true },
    orderBy: { joinedAt: 'desc' }
  });
  return member?.clan || null;
}

export async function registerKillEventFromGame(data = {}) {
  const serverType = ['vanilla', 'bbp', 'deathmatch'].includes(String(data.serverType || '').toLowerCase()) ? String(data.serverType).toLowerCase() : 'vanilla';
  const killerSteam64 = String(data.killerSteam64 || data.killerId || '').trim();
  const victimSteam64 = String(data.victimSteam64 || data.victimId || '').trim();
  if (!/^\d{17}$/.test(killerSteam64)) throw new Error('killerSteam64 inválido.');
  if (!/^\d{17}$/.test(victimSteam64)) throw new Error('victimSteam64 inválido.');
  if (killerSteam64 === victimSteam64) throw new Error('Kill inválida: killer e vítima iguais.');

  const [killer, victim] = await Promise.all([
    upsertPlayerBySteam64({ steam64: killerSteam64, nickname: data.killerName || '' }),
    upsertPlayerBySteam64({ steam64: victimSteam64, nickname: data.victimName || '' })
  ]);
  const [killerClan, victimClan] = await Promise.all([
    findActiveClanForSteam(killerSteam64),
    findActiveClanForSteam(victimSteam64)
  ]);

  return prisma.killEvent.create({
    data: {
      serverType,
      killerSteam64,
      killerName: String(data.killerName || killer.nickname || '').trim() || null,
      victimSteam64,
      victimName: String(data.victimName || victim.nickname || '').trim() || null,
      killerClanId: killerClan?.id || null,
      victimClanId: victimClan?.id || null,
      weapon: String(data.weapon || '').trim() || null,
      distanceMeters: data.distanceMeters === undefined || data.distanceMeters === '' ? null : Number(data.distanceMeters),
      place: String(data.place || data.location || '').trim() || null,
      headshot: data.headshot === true || ['true', '1', 'yes', 'sim'].includes(String(data.headshot || '').toLowerCase()),
      occurredAt: data.occurredAt ? new Date(data.occurredAt) : new Date(),
      raw: data
    }
  });
}

export async function createClanWithOwner({ name, tag, serverType = 'all', ownerSteam64, ownerName = '', description = '', flagUrl = '' }) {
  const cleanName = String(name || '').trim();
  const cleanTag = String(tag || '').trim().toUpperCase().slice(0, 8);
  const cleanOwner = String(ownerSteam64 || '').trim();
  const st = ['all', 'vanilla', 'bbp', 'deathmatch'].includes(String(serverType || '').toLowerCase()) ? String(serverType).toLowerCase() : 'all';
  if (!cleanName) throw new Error('Nome do clã obrigatório.');
  if (!cleanTag) throw new Error('TAG do clã obrigatória.');
  if (!/^\d{17}$/.test(cleanOwner)) throw new Error('Steam64 do dono inválido.');
  const owner = await upsertPlayerBySteam64({ steam64: cleanOwner, nickname: ownerName });
  const baseSlug = slugify(`${cleanTag}-${cleanName}-${st}`);
  const slug = `${baseSlug}-${Date.now().toString(36)}`;

  return prisma.$transaction(async (tx) => {
    const clan = await tx.clan.create({
      data: {
        name: cleanName,
        tag: cleanTag,
        slug,
        serverType: st,
        description: description || null,
        flagUrl: flagUrl || null,
        ownerPlayerId: owner.id,
        status: 'ACTIVE'
      }
    });
    await tx.clanMember.create({ data: { clanId: clan.id, playerId: owner.id, steam64: owner.steam64, role: 'OWNER', status: 'ACTIVE' } });
    return clan;
  });
}

export async function getMyClan(playerId) {
  if (!playerId) return null;
  return prisma.clanMember.findFirst({
    where: { playerId, status: 'ACTIVE' },
    include: {
      clan: {
        include: {
          ownerPlayer: true,
          subOwnerPlayer: true,
          members: { where: { status: 'ACTIVE' }, include: { player: true }, orderBy: [{ role: 'asc' }, { joinedAt: 'asc' }] },
          awards: { where: { visible: true }, orderBy: { awardedAt: 'desc' } }
        }
      }
    }
  });
}

export function canManageClan(membership) {
  return membership && ['OWNER', 'SUB_OWNER'].includes(membership.role);
}
