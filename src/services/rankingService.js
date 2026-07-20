import { prisma } from '../db/prisma.js';
import { slugify } from '../utils/slug.js';
import { upsertPlayerBySteam64 } from './playerService.js';
import {
  getAutomaticTrophyCatalog,
  getAutomaticTrophyProgress,
  queueAutomaticTrophySync
} from './trophyService.js';

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
    weaponHeadshots: {},
    weaponLongestKill: {},
    victims: {},
    victimSteam64s: {},
    nemesis: {},
    nemesisSteam64s: {},
    badges: [],
    badgePoints: 0,
    kd: 0,
    score: 0,
    headshotRate: 0,
    uniqueWeapons: 0,
    topVictimCount: 0
  };
}

function toSortedPlayerStats(map) {
  return Array.from(map.values()).map((p) => {
    p.kd = p.deaths > 0 ? Number((p.kills / p.deaths).toFixed(2)) : p.kills;
    p.headshotRate = p.kills > 0 ? Number(((p.headshots / p.kills) * 100).toFixed(1)) : 0;
    p.uniqueWeapons = Object.keys(p.weaponCounts || {}).filter((weapon) => weapon && weapon.toLowerCase() !== 'desconhecida').length;
    p.topVictimCount = Math.max(0, ...Object.values(p.victims || {}).map((value) => safeNumber(value)));
    p.badgePoints = Number(p.badgePoints || 0);
    p.score = (p.kills * 100) + (p.headshots * 15) + Math.round(p.longestKill || 0) + p.badgePoints - (p.deaths * 35);
    const fav = Object.entries(p.weaponCounts).sort((a, b) => b[1] - a[1])[0];
    p.favoriteWeapon = fav ? fav[0] : '-';
    p.topVictim = Object.entries(p.victims).sort((a, b) => b[1] - a[1])[0] || null;
    p.topNemesis = Object.entries(p.nemesis).sort((a, b) => b[1] - a[1])[0] || null;
    return p;
  }).sort((a, b) => b.score - a.score || b.kills - a.kills || a.deaths - b.deaths || b.headshots - a.headshots);
}

export function aggregatePlayerStats(kills = [], badges = [], { includeBadgeOnly = false } = {}) {
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
    if (kill.headshot) killer.weaponHeadshots[weapon] = (killer.weaponHeadshots[weapon] || 0) + 1;
    killer.weaponLongestKill[weapon] = Math.max(killer.weaponLongestKill[weapon] || 0, safeNumber(kill.distanceMeters));
    const victimLabel = kill.victimName || victimSteam64;
    const killerLabel = kill.killerName || killerSteam64;
    killer.victims[victimLabel] = (killer.victims[victimLabel] || 0) + 1;
    killer.victimSteam64s[victimLabel] = victimSteam64;
    victim.nemesis[killerLabel] = (victim.nemesis[killerLabel] || 0) + 1;
    victim.nemesisSteam64s[killerLabel] = killerSteam64;
  }
  for (const badge of badges || []) {
    const steam64 = String(badge.steam64 || '').trim();
    if (!steam64 || badge.visible === false) continue;
    if (!map.has(steam64)) {
      if (!includeBadgeOnly) continue;
      map.set(steam64, makePlayerStat(steam64, badge.playerName || steam64));
    }
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
    slug: clan.slug,
    serverType: clan.serverType,
    description: clan.description,
    accentColor: clan.accentColor || '#ef4444',
    flagUrl: `/clan-flag/${clan.id}`,
    bannerUrl: `/clan-banner/${clan.id}`,
    awards: clan.awards || [],
    eventWins: clan.eventWins || 0,
    pointsBonus: clan.pointsBonus || 0,
    trophyPoints: (clan.awards || []).reduce((sum, award) => sum + safeNumber(award.points), 0),
    membersCount: (clan.members || []).filter(m => m.status === 'ACTIVE').length,
    members: (clan.members || []).filter(m => m.status === 'ACTIVE'),
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

function badgeWhereForServer(selectedServer) {
  return selectedServer === 'global'
    ? { visible: true }
    : { visible: true, OR: [{ serverType: 'global' }, { serverType: selectedServer }] };
}

function attachPlayerAndClanMetadata(playerRanking, players, clans) {
  const playerBySteam = new Map(players.map((player) => [player.steam64, player]));
  const clanBySteam = new Map();
  for (const clan of clans) {
    for (const member of clan.members || []) {
      if (member.status === 'ACTIVE') {
        clanBySteam.set(member.steam64, { id: clan.id, tag: clan.tag, name: clan.name, slug: clan.slug });
      }
    }
  }
  return playerRanking.map((stat, index) => {
    const player = playerBySteam.get(stat.steam64);
    const clan = clanBySteam.get(stat.steam64) || null;
    return {
      ...stat,
      rank: index + 1,
      name: player?.nickname || stat.name,
      playerId: player?.id || null,
      avatarUrl: player?.id && player.avatarMime ? `/player-avatar/${player.id}` : '/images/raidz-profile-default.webp',
      profileBio: player?.profileBio || null,
      clan
    };
  });
}

export async function getRankingData({ server = 'global', period = 'weekly', playerId = null } = {}) {
  const selectedServer = normalizeRankingServer(server);
  const selectedPeriod = normalizeRankingPeriod(period);
  const activeSeason = await prisma.season.findFirst({ where: { status: 'ACTIVE' }, orderBy: { startsAt: 'desc' } });
  const range = getRankingDateRange(selectedPeriod, activeSeason);
  const where = {};
  if (selectedServer !== 'global') where.serverType = selectedServer;
  if (range.start) where.occurredAt = { gte: range.start, ...(range.end ? { lte: range.end } : {}) };

  const [kills, clans, seasons, playerBadges, myMembership] = await Promise.all([
    prisma.killEvent.findMany({ where, orderBy: { occurredAt: 'desc' }, take: 10000 }),
    prisma.clan.findMany({
      where: {
        status: 'ACTIVE',
        ...(selectedServer === 'global' ? {} : { OR: [{ serverType: 'all' }, { serverType: selectedServer }] })
      },
      include: {
        members: { where: { status: 'ACTIVE' }, include: { player: { select: { id: true, steam64: true, nickname: true, avatarMime: true } } }, orderBy: [{ role: 'asc' }, { joinedAt: 'asc' }] },
        awards: { where: { visible: true }, orderBy: { awardedAt: 'desc' }, take: 8 }
      },
      orderBy: { createdAt: 'asc' }
    }),
    prisma.season.findMany({ orderBy: { startsAt: 'desc' }, take: 10 }),
    prisma.playerBadge.findMany({ where: badgeWhereForServer(selectedServer), orderBy: [{ tier: 'desc' }, { awardedAt: 'desc' }], take: 2000 }),
    playerId ? prisma.clanMember.findFirst({ where: { playerId, status: 'ACTIVE' }, include: { clan: { include: { members: { where: { status: 'ACTIVE' }, include: { player: true } }, awards: { where: { visible: true }, orderBy: { awardedAt: 'desc' } } } } } }) : Promise.resolve(null)
  ]);

  const basePlayerRanking = aggregatePlayerStats(kills, playerBadges).slice(0, 100);
  const steam64Values = basePlayerRanking.map((player) => player.steam64);
  const players = steam64Values.length ? await prisma.player.findMany({
    where: { steam64: { in: steam64Values } },
    select: { id: true, steam64: true, nickname: true, avatarMime: true, profileBio: true }
  }) : [];

  const playerRanking = attachPlayerAndClanMetadata(basePlayerRanking, players, clans);
  const clanRanking = aggregateClanStats(kills, clans).slice(0, 100).map((clan, index) => ({ ...clan, rank: index + 1 }));
  const totals = {
    kills: kills.length,
    headshots: kills.filter(k => k.headshot).length,
    clans: clans.length,
    players: new Set(kills.flatMap(k => [k.killerSteam64, k.victimSteam64]).filter(Boolean)).size,
    longestKill: kills.reduce((max, k) => Math.max(max, safeNumber(k.distanceMeters)), 0)
  };
  const latestTrophies = playerBadges.slice().sort((a, b) => new Date(b.awardedAt) - new Date(a.awardedAt)).slice(0, 18);
  const trophyCatalog = getAutomaticTrophyCatalog();

  return {
    selectedServer,
    selectedPeriod,
    activeSeason,
    range,
    kills,
    recentKills: kills.slice(0, 30),
    clans,
    seasons,
    playerBadges,
    latestTrophies,
    trophyCatalog,
    myMembership,
    playerRanking,
    clanRanking,
    totals
  };
}

function filterEventsSince(events, start) {
  return events.filter((event) => new Date(event.occurredAt) >= start);
}

function statsForSteam(events, badges, steam64) {
  return aggregatePlayerStats(events, badges, { includeBadgeOnly: true }).find((item) => item.steam64 === steam64) || makePlayerStat(steam64, steam64);
}

function makePeriodStat(events, steam64, days, label) {
  const start = new Date();
  start.setDate(start.getDate() - days);
  const stat = statsForSteam(filterEventsSince(events, start), [], steam64);
  return { ...stat, label, start };
}

function buildWeaponStats(events, steam64) {
  const rows = new Map();
  for (const event of events) {
    if (event.killerSteam64 !== steam64) continue;
    const weapon = String(event.weapon || 'Desconhecida').trim() || 'Desconhecida';
    if (!rows.has(weapon)) rows.set(weapon, { weapon, kills: 0, headshots: 0, longestKill: 0 });
    const row = rows.get(weapon);
    row.kills += 1;
    if (event.headshot) row.headshots += 1;
    row.longestKill = Math.max(row.longestKill, safeNumber(event.distanceMeters));
  }
  return Array.from(rows.values()).map((row) => ({
    ...row,
    headshotRate: row.kills ? Number(((row.headshots / row.kills) * 100).toFixed(1)) : 0
  })).sort((a, b) => b.kills - a.kills || b.headshots - a.headshots).slice(0, 12);
}

function buildRivalRows(events, steam64) {
  const rows = new Map();
  for (const event of events) {
    let opponentSteam64 = null;
    let opponentName = null;
    let type = null;
    if (event.killerSteam64 === steam64) {
      opponentSteam64 = event.victimSteam64;
      opponentName = event.victimName || event.victimSteam64;
      type = 'kills';
    } else if (event.victimSteam64 === steam64) {
      opponentSteam64 = event.killerSteam64;
      opponentName = event.killerName || event.killerSteam64;
      type = 'deaths';
    }
    if (!opponentSteam64) continue;
    if (!rows.has(opponentSteam64)) rows.set(opponentSteam64, { steam64: opponentSteam64, name: opponentName, kills: 0, deaths: 0 });
    const row = rows.get(opponentSteam64);
    row.name = opponentName || row.name;
    row[type] += 1;
  }
  return Array.from(rows.values()).map((row) => ({ ...row, balance: row.kills - row.deaths })).sort((a, b) => (b.kills + b.deaths) - (a.kills + a.deaths)).slice(0, 12);
}

function buildActivityByDay(events, steam64, days = 14) {
  const output = [];
  const now = new Date();
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const day = new Date(now);
    day.setHours(0, 0, 0, 0);
    day.setDate(day.getDate() - offset);
    const next = new Date(day);
    next.setDate(next.getDate() + 1);
    const dayEvents = events.filter((event) => {
      const date = new Date(event.occurredAt);
      return date >= day && date < next;
    });
    output.push({
      key: day.toISOString().slice(0, 10),
      label: day.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      kills: dayEvents.filter((event) => event.killerSteam64 === steam64).length,
      deaths: dayEvents.filter((event) => event.victimSteam64 === steam64).length
    });
  }
  return output;
}

function buildServerBreakdown(events, steam64) {
  return ['vanilla', 'bbp', 'deathmatch'].map((serverType) => {
    const serverEvents = events.filter((event) => event.serverType === serverType);
    const stat = statsForSteam(serverEvents, [], steam64);
    return { ...stat, serverType };
  }).filter((row) => row.kills || row.deaths);
}

function buildEventTimeline(events, steam64) {
  return events.slice(0, 100).map((event) => {
    const isKill = event.killerSteam64 === steam64;
    return {
      id: event.id,
      type: isKill ? 'KILL' : 'DEATH',
      opponentSteam64: isKill ? event.victimSteam64 : event.killerSteam64,
      opponentName: isKill ? (event.victimName || event.victimSteam64) : (event.killerName || event.killerSteam64),
      weapon: event.weapon || 'Arma desconhecida',
      distanceMeters: safeNumber(event.distanceMeters),
      place: event.place || null,
      headshot: Boolean(event.headshot),
      serverType: event.serverType,
      occurredAt: event.occurredAt
    };
  });
}

export async function getPlayerRankingProfile({ steam64, server = 'global', viewerPlayerId = null, historyPage = 1, historyPageSize = 50 } = {}) {
  const cleanSteam64 = String(steam64 || '').trim();
  if (!/^7656119\d{10}$/.test(cleanSteam64)) return null;
  const selectedServer = normalizeRankingServer(server);
  const safeHistoryPage = Math.max(1, Math.floor(Number(historyPage || 1)));
  const safeHistoryPageSize = Math.max(20, Math.min(100, Math.floor(Number(historyPageSize || 50))));
  const eventWhere = {
    ...(selectedServer === 'global' ? {} : { serverType: selectedServer }),
    OR: [{ killerSteam64: cleanSteam64 }, { victimSteam64: cleanSteam64 }]
  };

  const [player, events, badges, membership, allRankingKills, allRankingBadges, historyTotal, historyEvents] = await Promise.all([
    prisma.player.findUnique({
      where: { steam64: cleanSteam64 },
      select: { id: true, steam64: true, nickname: true, avatarMime: true, profileBio: true, createdAt: true, updatedAt: true }
    }),
    prisma.killEvent.findMany({ where: eventWhere, orderBy: { occurredAt: 'desc' }, take: 20000 }),
    prisma.playerBadge.findMany({ where: { steam64: cleanSteam64, ...badgeWhereForServer(selectedServer) }, orderBy: [{ tier: 'desc' }, { awardedAt: 'desc' }], take: 500 }),
    prisma.clanMember.findFirst({
      where: { steam64: cleanSteam64, status: 'ACTIVE', clan: { status: 'ACTIVE' } },
      include: { clan: { include: { awards: { where: { visible: true }, orderBy: { awardedAt: 'desc' } }, members: { where: { status: 'ACTIVE' } } } } },
      orderBy: { joinedAt: 'desc' }
    }),
    prisma.killEvent.findMany({ orderBy: { occurredAt: 'desc' }, take: 20000 }),
    prisma.playerBadge.findMany({ where: { visible: true }, orderBy: { awardedAt: 'desc' }, take: 5000 }),
    prisma.killEvent.count({ where: eventWhere }),
    prisma.killEvent.findMany({
      where: eventWhere,
      orderBy: { occurredAt: 'desc' },
      skip: (safeHistoryPage - 1) * safeHistoryPageSize,
      take: safeHistoryPageSize
    })
  ]);

  if (!player && !events.length && !badges.length) return null;

  const stats = statsForSteam(events, badges, cleanSteam64);
  const inferredName = events.find((event) => event.killerSteam64 === cleanSteam64)?.killerName
    || events.find((event) => event.victimSteam64 === cleanSteam64)?.victimName
    || cleanSteam64;
  stats.name = player?.nickname || badges.find((badge) => badge.playerName)?.playerName || inferredName;

  const allTimeRanking = aggregatePlayerStats(allRankingKills, allRankingBadges);
  const weeklyStart = new Date();
  weeklyStart.setDate(weeklyStart.getDate() - 7);
  const weeklyRanking = aggregatePlayerStats(filterEventsSince(allRankingKills, weeklyStart), allRankingBadges);
  const allTimeRankIndex = allTimeRanking.findIndex((row) => row.steam64 === cleanSteam64);
  const weeklyRankIndex = weeklyRanking.findIndex((row) => row.steam64 === cleanSteam64);

  const earnedAutomaticKeys = badges.filter((badge) => badge.source === 'AUTOMATIC').map((badge) => badge.ruleKey).filter(Boolean);
  const trophyProgress = getAutomaticTrophyProgress(stats, earnedAutomaticKeys);
  const nextTrophies = trophyProgress.filter((item) => !item.earned).sort((a, b) => b.percent - a.percent || a.tier - b.tier).slice(0, 4);
  const weaponStats = buildWeaponStats(events, cleanSteam64);
  const rivals = buildRivalRows(events, cleanSteam64);
  const activityByDay = buildActivityByDay(events, cleanSteam64, 14);
  const serverBreakdown = buildServerBreakdown(events, cleanSteam64);
  const recentEvents = buildEventTimeline(historyEvents, cleanSteam64);
  const periodStats = {
    sevenDays: makePeriodStat(events, cleanSteam64, 7, '7 dias'),
    thirtyDays: makePeriodStat(events, cleanSteam64, 30, '30 dias')
  };
  const clanRank = membership?.clan ? aggregateClanStats(allRankingKills, [membership.clan])[0] || null : null;
  const totalTrophyPoints = badges.reduce((sum, badge) => sum + safeNumber(badge.points), 0);

  return {
    selectedServer,
    profilePlayer: {
      id: player?.id || null,
      steam64: cleanSteam64,
      nickname: stats.name,
      profileBio: player?.profileBio || null,
      avatarUrl: player?.id && player.avatarMime ? `/player-avatar/${player.id}` : '/images/raidz-profile-default.webp',
      joinedAt: player?.createdAt || events[events.length - 1]?.occurredAt || null
    },
    stats,
    periodStats,
    ranks: {
      allTime: allTimeRankIndex >= 0 ? allTimeRankIndex + 1 : null,
      weekly: weeklyRankIndex >= 0 ? weeklyRankIndex + 1 : null,
      totalPlayers: allTimeRanking.length
    },
    badges,
    totalTrophyPoints,
    trophyProgress,
    nextTrophies,
    weaponStats,
    rivals,
    activityByDay,
    serverBreakdown,
    recentEvents,
    historyPagination: {
      page: safeHistoryPage,
      pageSize: safeHistoryPageSize,
      total: historyTotal,
      totalPages: Math.max(1, Math.ceil(historyTotal / safeHistoryPageSize)),
      hasPrevious: safeHistoryPage > 1,
      hasNext: safeHistoryPage * safeHistoryPageSize < historyTotal
    },
    membership,
    clanRank,
    isOwnProfile: Boolean(viewerPlayerId && player?.id === viewerPlayerId)
  };
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

  const kill = await prisma.killEvent.create({
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
      raw: data.raw || data
    }
  });

  queueAutomaticTrophySync([killerSteam64, victimSteam64]);
  return kill;
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
