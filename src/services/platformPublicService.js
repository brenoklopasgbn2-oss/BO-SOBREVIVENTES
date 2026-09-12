import { prisma } from '../db/prisma.js';

export async function getPublicPlatformOverview() {
  const [recentKills, championshipClans, recentResults, totals] = await Promise.all([
    prisma.killEvent.findMany({ orderBy: { occurredAt: 'desc' }, take: 12 }),
    prisma.clan.findMany({
      where: { status: 'ACTIVE' },
      include: { members: { where: { status: 'ACTIVE' }, include: { player: { select: { nickname: true, discordId: true } } } }, selectedFlag: true },
      orderBy: [{ championshipPoints: 'desc' }, { eventWins: 'desc' }, { updatedAt: 'asc' }],
      take: 10
    }),
    prisma.championshipResult.findMany({
      include: { clan: { select: { id: true, name: true, tag: true, slug: true } } },
      orderBy: { occurredAt: 'desc' },
      take: 6
    }),
    Promise.all([
      prisma.player.count(),
      prisma.player.count({ where: { discordId: { not: null } } }),
      prisma.clan.count({ where: { status: 'ACTIVE' } }),
      prisma.killEvent.count()
    ])
  ]);

  const clanIds = [...new Set(recentKills.flatMap(k => [k.killerClanId, k.victimClanId]).filter(Boolean))];
  const clans = clanIds.length ? await prisma.clan.findMany({ where: { id: { in: clanIds } }, select: { id: true, tag: true, name: true } }) : [];
  const clanMap = new Map(clans.map(c => [c.id, c]));
  const kills = recentKills.map(kill => ({ ...kill, killerClan: clanMap.get(kill.killerClanId) || null, victimClan: clanMap.get(kill.victimClanId) || null }));

  return {
    recentKills: kills,
    championshipClans,
    recentResults,
    stats: { players: totals[0], linkedPlayers: totals[1], clans: totals[2], kills: totals[3] }
  };
}

export async function getKillfeed({ limit = 100 } = {}) {
  const safeLimit = Math.max(1, Math.min(Number(limit) || 100, 200));
  const kills = await prisma.killEvent.findMany({ orderBy: { occurredAt: 'desc' }, take: safeLimit });
  const clanIds = [...new Set(kills.flatMap(k => [k.killerClanId, k.victimClanId]).filter(Boolean))];
  const clans = clanIds.length ? await prisma.clan.findMany({ where: { id: { in: clanIds } }, select: { id: true, tag: true, name: true } }) : [];
  const clanMap = new Map(clans.map(c => [c.id, c]));
  return kills.map(kill => ({ ...kill, killerClan: clanMap.get(kill.killerClanId) || null, victimClan: clanMap.get(kill.victimClanId) || null }));
}
