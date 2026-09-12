import { prisma } from '../db/prisma.js';
import { changePlayerCoins } from './playerService.js';
import { getAdminSteam64Set } from './adminIdentityService.js';
import { logAudit } from './auditService.js';
import { extractKillPositions } from '../utils/killPosition.js';

export const TERRITORY_POSITION_RULES = ['VICTIM', 'KILLER', 'BOTH', 'EITHER'];

export const TERRITORY_REJECTION_LABELS = {
  EVENT_INACTIVE: 'Evento inativo ou fora do horário',
  SUICIDE: 'Suicídio / mesma Steam64',
  SAME_CLAN: 'Kill no próprio clã',
  ADMIN_KILL: 'Kill envolvendo ADM',
  MISSING_POSITION: 'Localização não enviada pelo mod',
  OUTSIDE_AREA: 'Kill fora da área',
  PAIR_COOLDOWN: 'Mesma dupla dentro do tempo anti-farm',
  PLAYER_LIMIT: 'Limite de kills premiadas do player',
  BUDGET_EXHAUSTED: 'Orçamento total do evento atingido',
  PLAYER_NOT_FOUND: 'Conta do killer não encontrada',
  INTERNAL_ERROR: 'Erro interno ao processar'
};

function boolFromBody(value, fallback = false) {
  if (value === undefined || value === null || value === '') return fallback;
  return value === true || ['1', 'true', 'yes', 'sim', 'on'].includes(String(value).trim().toLowerCase());
}

function boundedInt(value, fallback, min, max) {
  const raw = String(value ?? '').trim();
  if (!raw) return fallback;
  const number = Number(raw);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(number)));
}

function boundedFloat(value, fallback, min, max) {
  const raw = String(value ?? '').trim();
  if (!raw) return fallback;
  const number = Number(raw.replace(',', '.'));
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, number));
}

function optionalDate(value) {
  const raw = String(value || '').trim();
  if (!raw) return null;
  const hasTimezone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(raw);
  const localWithSeconds = /T\d{2}:\d{2}$/.test(raw) ? `${raw}:00` : raw;
  const parsed = new Date(hasTimezone ? raw : `${localWithSeconds}-03:00`);
  if (Number.isNaN(parsed.getTime())) throw new Error('Data/hora inválida.');
  return parsed;
}

function normalizeServerType(value) {
  const serverType = String(value || '').trim().toLowerCase();
  return ['vanilla', 'bbp', 'deathmatch'].includes(serverType) ? serverType : 'vanilla';
}

function normalizeEventBody(body = {}) {
  const name = String(body.name || '').trim().slice(0, 120);
  if (!name) throw new Error('Digite o nome do evento.');

  const startsAt = optionalDate(body.startsAt);
  const endsAt = optionalDate(body.endsAt);
  if (startsAt && endsAt && endsAt <= startsAt) throw new Error('O encerramento precisa ser depois do início.');

  const positionRule = TERRITORY_POSITION_RULES.includes(String(body.positionRule || '').toUpperCase())
    ? String(body.positionRule).toUpperCase()
    : 'VICTIM';
  const centerXRaw = String(body.centerX ?? '').trim().replace(',', '.');
  const centerZRaw = String(body.centerZ ?? '').trim().replace(',', '.');
  if (!centerXRaw || !Number.isFinite(Number(centerXRaw))) throw new Error('Digite a coordenada central X.');
  if (!centerZRaw || !Number.isFinite(Number(centerZRaw))) throw new Error('Digite a coordenada central Z.');

  return {
    name,
    description: String(body.description || '').trim().slice(0, 2000) || null,
    serverType: normalizeServerType(body.serverType),
    active: boolFromBody(body.active, false),
    centerX: boundedFloat(centerXRaw, 0, -100000, 100000),
    centerZ: boundedFloat(centerZRaw, 0, -100000, 100000),
    radiusMeters: boundedFloat(body.radiusMeters, 300, 25, 10000),
    placeKeyword: String(body.placeKeyword || '').trim().slice(0, 100) || null,
    positionRule,
    rewardCoins: boundedInt(body.rewardCoins, 1000, 1, 1000000),
    blockSameClan: true,
    blockSuicide: true,
    blockAdmins: boolFromBody(body.blockAdmins, false),
    pairCooldownSeconds: boundedInt(body.pairCooldownSeconds, 1800, 0, 86400),
    maxRewardsPerPlayer: boundedInt(body.maxRewardsPerPlayer, 0, 0, 100000),
    totalRewardBudgetCoins: boundedInt(body.totalRewardBudgetCoins, 0, 0, 2000000000),
    startsAt,
    endsAt
  };
}

function eventTimeAllows(event, occurredAt = new Date(), { allowInactive = false } = {}) {
  const at = new Date(occurredAt || Date.now());
  if (!allowInactive && !event.active) return false;
  if (event.startsAt && at < event.startsAt) return false;
  if (event.endsAt && at > event.endsAt) return false;
  return true;
}

function positionFromKill(kill, side) {
  const rawX = kill?.[`${side}PosX`];
  const rawY = kill?.[`${side}PosY`];
  const rawZ = kill?.[`${side}PosZ`];
  if (rawX === null || rawX === undefined || rawZ === null || rawZ === undefined) return null;
  const x = Number(rawX);
  const y = rawY === null || rawY === undefined ? null : Number(rawY);
  const z = Number(rawZ);
  if (!Number.isFinite(x) || !Number.isFinite(z)) return null;
  return { x, y: Number.isFinite(y) ? y : null, z };
}

function insideCircle(position, event) {
  if (!position) return null;
  const dx = position.x - Number(event.centerX || 0);
  const dz = position.z - Number(event.centerZ || 0);
  return Math.sqrt((dx * dx) + (dz * dz)) <= Number(event.radiusMeters || 0);
}

function placeFallbackMatches(kill, event) {
  const keyword = String(event.placeKeyword || '').trim().toLocaleLowerCase('pt-BR');
  const place = String(kill.place || '').trim().toLocaleLowerCase('pt-BR');
  return Boolean(keyword && place && place.includes(keyword));
}

function territoryPositionDecision(kill, event) {
  const killerPosition = positionFromKill(kill, 'killer');
  const victimPosition = positionFromKill(kill, 'victim');
  const killerInside = insideCircle(killerPosition, event);
  const victimInside = insideCircle(victimPosition, event);
  const placeMatch = placeFallbackMatches(kill, event);

  if (event.positionRule === 'KILLER') {
    if (killerInside === null) return placeMatch ? { ok: true, killerPosition, victimPosition, viaPlace: true } : { ok: false, reason: 'MISSING_POSITION', killerPosition, victimPosition };
    return { ok: killerInside, reason: killerInside ? null : 'OUTSIDE_AREA', killerPosition, victimPosition };
  }
  if (event.positionRule === 'BOTH') {
    if (killerInside === null || victimInside === null) return { ok: false, reason: 'MISSING_POSITION', killerPosition, victimPosition };
    return { ok: killerInside && victimInside, reason: killerInside && victimInside ? null : 'OUTSIDE_AREA', killerPosition, victimPosition };
  }
  if (event.positionRule === 'EITHER') {
    if (killerInside === null && victimInside === null) return placeMatch ? { ok: true, killerPosition, victimPosition, viaPlace: true } : { ok: false, reason: 'MISSING_POSITION', killerPosition, victimPosition };
    const ok = killerInside === true || victimInside === true;
    return { ok, reason: ok ? null : 'OUTSIDE_AREA', killerPosition, victimPosition };
  }

  if (victimInside === null) return placeMatch ? { ok: true, killerPosition, victimPosition, viaPlace: true } : { ok: false, reason: 'MISSING_POSITION', killerPosition, victimPosition };
  return { ok: victimInside, reason: victimInside ? null : 'OUTSIDE_AREA', killerPosition, victimPosition };
}

function scoreData({ event, kill, playerId = null, qualified = false, rejectionReason = null, rewardCoins = 0 }) {
  return {
    eventId: event.id,
    killEventId: kill.id,
    playerId,
    killerSteam64: kill.killerSteam64,
    killerName: kill.killerName || null,
    victimSteam64: kill.victimSteam64,
    victimName: kill.victimName || null,
    killerClanId: kill.killerClanId || null,
    victimClanId: kill.victimClanId || null,
    qualified,
    rejectionReason,
    rewardCoins,
    killerPosX: kill.killerPosX ?? null,
    killerPosY: kill.killerPosY ?? null,
    killerPosZ: kill.killerPosZ ?? null,
    victimPosX: kill.victimPosX ?? null,
    victimPosY: kill.victimPosY ?? null,
    victimPosZ: kill.victimPosZ ?? null,
    occurredAt: kill.occurredAt || new Date()
  };
}

async function createRejectedScore(tx, event, kill, reason, playerId = null) {
  return tx.territoryKillScore.create({
    data: scoreData({ event, kill, playerId, qualified: false, rejectionReason: reason, rewardCoins: 0 })
  });
}

async function processKillForEvent(eventId, kill, { allowInactive = false } = {}) {
  const adminSteam64s = await getAdminSteam64Set();
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await prisma.$transaction(async (tx) => {
        const existing = await tx.territoryKillScore.findUnique({
          where: { eventId_killEventId: { eventId, killEventId: kill.id } }
        });
        if (existing) return { score: existing, duplicate: true };

        const event = await tx.territoryKillEvent.findUnique({ where: { id: eventId } });
        if (!event || event.serverType !== kill.serverType || !eventTimeAllows(event, kill.occurredAt, { allowInactive })) {
          if (!event) return { score: null, skipped: true };
          const score = await createRejectedScore(tx, event, kill, 'EVENT_INACTIVE');
          return { score, qualified: false };
        }

        const player = await tx.player.findUnique({ where: { steam64: kill.killerSteam64 }, select: { id: true, nickname: true } });
        if (!player) {
          const score = await createRejectedScore(tx, event, kill, 'PLAYER_NOT_FOUND');
          return { score, qualified: false };
        }

        if (kill.killerSteam64 === kill.victimSteam64) {
          const score = await createRejectedScore(tx, event, kill, 'SUICIDE', player.id);
          return { score, qualified: false };
        }
        if (kill.killerClanId && kill.victimClanId && kill.killerClanId === kill.victimClanId) {
          const score = await createRejectedScore(tx, event, kill, 'SAME_CLAN', player.id);
          return { score, qualified: false };
        }
        if (event.blockAdmins && (adminSteam64s.has(kill.killerSteam64) || adminSteam64s.has(kill.victimSteam64))) {
          const score = await createRejectedScore(tx, event, kill, 'ADMIN_KILL', player.id);
          return { score, qualified: false };
        }

        const positionDecision = territoryPositionDecision(kill, event);
        if (!positionDecision.ok) {
          const score = await createRejectedScore(tx, event, kill, positionDecision.reason || 'OUTSIDE_AREA', player.id);
          return { score, qualified: false };
        }

        if (event.pairCooldownSeconds > 0) {
          const killTime = new Date(kill.occurredAt);
          const cooldownStart = new Date(killTime.getTime() - (event.pairCooldownSeconds * 1000));
          const cooldownEnd = new Date(killTime.getTime() + (event.pairCooldownSeconds * 1000));
          const recentPair = await tx.territoryKillScore.findFirst({
            where: {
              eventId: event.id,
              qualified: true,
              occurredAt: { gte: cooldownStart, lte: cooldownEnd },
              OR: [
                { killerSteam64: kill.killerSteam64, victimSteam64: kill.victimSteam64 },
                { killerSteam64: kill.victimSteam64, victimSteam64: kill.killerSteam64 }
              ]
            },
            select: { id: true }
          });
          if (recentPair) {
            const score = await createRejectedScore(tx, event, kill, 'PAIR_COOLDOWN', player.id);
            return { score, qualified: false };
          }
        }

        if (event.maxRewardsPerPlayer > 0) {
          const count = await tx.territoryKillScore.count({ where: { eventId: event.id, killerSteam64: kill.killerSteam64, qualified: true } });
          if (count >= event.maxRewardsPerPlayer) {
            const score = await createRejectedScore(tx, event, kill, 'PLAYER_LIMIT', player.id);
            return { score, qualified: false };
          }
        }

        if (event.totalRewardBudgetCoins > 0) {
          const sum = await tx.territoryKillScore.aggregate({ where: { eventId: event.id, qualified: true }, _sum: { rewardCoins: true } });
          if (Number(sum._sum.rewardCoins || 0) + event.rewardCoins > event.totalRewardBudgetCoins) {
            const score = await createRejectedScore(tx, event, kill, 'BUDGET_EXHAUSTED', player.id);
            return { score, qualified: false };
          }
        }

        const score = await tx.territoryKillScore.create({
          data: scoreData({ event, kill, playerId: player.id, qualified: true, rewardCoins: event.rewardCoins })
        });
        const updatedPlayer = await changePlayerCoins({
          playerId: player.id,
          amount: event.rewardCoins,
          reason: `Evento de kills: ${event.name}`,
          refType: 'territory_kill_event',
          refId: score.id,
          idempotencyKey: `territory:${event.id}:kill:${kill.id}`,
          tx
        });
        await logAudit({
          actor: kill.killerSteam64,
          action: 'territory_kill.rewarded',
          target: score.id,
          data: { eventId: event.id, killEventId: kill.id, victimSteam64: kill.victimSteam64, rewardCoins: event.rewardCoins, balanceAfter: updatedPlayer.coins },
          tx
        });
        return { score, qualified: true, rewardCoins: event.rewardCoins, balanceAfter: updatedPlayer.coins };
      }, { isolationLevel: 'Serializable' });
    } catch (error) {
      if (error?.code === 'P2002') {
        const existing = await prisma.territoryKillScore.findUnique({ where: { eventId_killEventId: { eventId, killEventId: kill.id } } });
        if (existing) return { score: existing, duplicate: true };
      }
      if (error?.code === 'P2034' && attempt < 2) continue;
      throw error;
    }
  }
  throw new Error('Não foi possível processar a kill no evento.');
}

export async function evaluateKillForActiveTerritoryEvents(kill) {
  const occurredAt = new Date(kill.occurredAt || Date.now());
  const events = await prisma.territoryKillEvent.findMany({
    where: {
      active: true,
      serverType: kill.serverType,
      AND: [
        { OR: [{ startsAt: null }, { startsAt: { lte: occurredAt } }] },
        { OR: [{ endsAt: null }, { endsAt: { gte: occurredAt } }] }
      ]
    },
    orderBy: { updatedAt: 'desc' },
    take: 5
  });
  const results = [];
  for (const event of events) {
    results.push({ eventId: event.id, ...(await processKillForEvent(event.id, kill)) });
  }
  return results;
}

export async function upsertTerritoryKillEvent(body = {}, id = null) {
  const data = normalizeEventBody(body);
  return prisma.$transaction(async (tx) => {
    let saved;
    if (id) {
      const existing = await tx.territoryKillEvent.findUnique({ where: { id } });
      if (!existing) throw new Error('Evento não encontrado.');
      if (data.active) {
        await tx.territoryKillEvent.updateMany({ where: { serverType: data.serverType, active: true, id: { not: id } }, data: { active: false } });
      }
      saved = await tx.territoryKillEvent.update({ where: { id }, data });
    } else {
      if (data.active) await tx.territoryKillEvent.updateMany({ where: { serverType: data.serverType, active: true }, data: { active: false } });
      saved = await tx.territoryKillEvent.create({ data });
    }
    await logAudit({ actor: 'admin', action: id ? 'territory_event.updated' : 'territory_event.created', target: saved.id, data: { name: saved.name, active: saved.active, serverType: saved.serverType, centerX: saved.centerX, centerZ: saved.centerZ, radiusMeters: saved.radiusMeters, rewardCoins: saved.rewardCoins }, tx });
    return saved;
  });
}

export async function setTerritoryKillEventActive(id, active) {
  return prisma.$transaction(async (tx) => {
    const event = await tx.territoryKillEvent.findUnique({ where: { id } });
    if (!event) throw new Error('Evento não encontrado.');
    if (active) {
      await tx.territoryKillEvent.updateMany({ where: { serverType: event.serverType, active: true, id: { not: event.id } }, data: { active: false } });
    }
    const saved = await tx.territoryKillEvent.update({ where: { id: event.id }, data: { active: Boolean(active) } });
    await logAudit({ actor: 'admin', action: active ? 'territory_event.activated' : 'territory_event.deactivated', target: saved.id, data: { name: saved.name }, tx });
    return saved;
  });
}

function eventStatus(event, now = new Date()) {
  if (!event.active) return 'INATIVO';
  if (event.startsAt && now < event.startsAt) return 'AGENDADO';
  if (event.endsAt && now > event.endsAt) return 'ENCERRADO';
  return 'ATIVO';
}

function buildLeaderboard(scores = []) {
  const map = new Map();
  for (const score of scores) {
    if (!score.qualified) continue;
    const current = map.get(score.killerSteam64) || {
      steam64: score.killerSteam64,
      playerName: score.killerName || 'Player',
      kills: 0,
      rewardCoins: 0,
      lastKillAt: score.occurredAt
    };
    current.kills += 1;
    current.rewardCoins += Number(score.rewardCoins || 0);
    if (new Date(score.occurredAt) > new Date(current.lastKillAt)) {
      current.lastKillAt = score.occurredAt;
      current.playerName = score.killerName || current.playerName;
    }
    map.set(score.killerSteam64, current);
  }
  return [...map.values()].sort((a, b) => b.kills - a.kills || b.rewardCoins - a.rewardCoins || new Date(a.lastKillAt) - new Date(b.lastKillAt));
}

export async function getPublicTerritoryKillEventDashboard({ playerSteam64 = null, serverType = 'vanilla' } = {}) {
  const now = new Date();
  const normalizedServerType = normalizeServerType(serverType);
  const active = await prisma.territoryKillEvent.findFirst({
    where: { active: true, serverType: normalizedServerType },
    orderBy: { updatedAt: 'desc' }
  });
  const recentEvents = await prisma.territoryKillEvent.findMany({ where: { serverType: normalizedServerType }, orderBy: { updatedAt: 'desc' }, take: 8 });
  if (!active) return { activeEvent: null, recentEvents: recentEvents.map(e => ({ ...e, displayStatus: eventStatus(e, now) })), leaderboard: [], recentKills: [], playerStats: null, totals: { kills: 0, rewards: 0 } };

  const scores = await prisma.territoryKillScore.findMany({ where: { eventId: active.id, qualified: true }, orderBy: { occurredAt: 'desc' }, take: 10000 });
  const leaderboard = buildLeaderboard(scores);
  const playerStats = playerSteam64 ? leaderboard.find(row => row.steam64 === playerSteam64) || { steam64: playerSteam64, kills: 0, rewardCoins: 0 } : null;
  return {
    activeEvent: { ...active, displayStatus: eventStatus(active, now) },
    recentEvents: recentEvents.map(e => ({ ...e, displayStatus: eventStatus(e, now) })),
    leaderboard: leaderboard.slice(0, 100),
    recentKills: scores.slice(0, 40),
    playerStats,
    totals: {
      kills: scores.length,
      rewards: scores.reduce((sum, score) => sum + Number(score.rewardCoins || 0), 0),
      players: new Set(scores.map(score => score.killerSteam64)).size
    }
  };
}

export async function getAdminTerritoryKillEventDashboard({ editId = null } = {}) {
  const events = await prisma.territoryKillEvent.findMany({ orderBy: [{ active: 'desc' }, { updatedAt: 'desc' }], take: 100 });
  const ids = events.map(event => event.id);
  const [groupedStats, distinctPlayers] = ids.length ? await Promise.all([
    prisma.territoryKillScore.groupBy({
      by: ['eventId', 'qualified'],
      where: { eventId: { in: ids } },
      _count: { _all: true },
      _sum: { rewardCoins: true }
    }),
    prisma.territoryKillScore.findMany({
      where: { eventId: { in: ids }, qualified: true },
      distinct: ['eventId', 'killerSteam64'],
      select: { eventId: true, killerSteam64: true }
    })
  ]) : [[], []];

  const eventRows = events.map(event => {
    const accepted = groupedStats.find(row => row.eventId === event.id && row.qualified === true);
    const rejected = groupedStats.find(row => row.eventId === event.id && row.qualified === false);
    return {
      ...event,
      displayStatus: eventStatus(event),
      acceptedCount: Number(accepted?._count?._all || 0),
      rejectedCount: Number(rejected?._count?._all || 0),
      rewardTotal: Number(accepted?._sum?.rewardCoins || 0),
      playerCount: distinctPlayers.filter(row => row.eventId === event.id).length
    };
  });
  const selectedEvent = editId ? events.find(event => event.id === editId) || null : events.find(event => event.active) || events[0] || null;
  const selectedScores = selectedEvent
    ? await prisma.territoryKillScore.findMany({ where: { eventId: selectedEvent.id }, orderBy: { occurredAt: 'desc' }, take: 10000 })
    : [];
  return {
    events: eventRows,
    selectedEvent,
    leaderboard: buildLeaderboard(selectedScores).slice(0, 100),
    recentAttempts: selectedScores.slice(0, 100),
    rejectionLabels: TERRITORY_REJECTION_LABELS
  };
}

export async function reprocessTerritoryEventKills(eventId, limit = 5000) {
  const event = await prisma.territoryKillEvent.findUnique({ where: { id: eventId } });
  if (!event) throw new Error('Evento não encontrado.');
  const lowerBound = event.startsAt || event.createdAt;
  const where = {
    serverType: event.serverType,
    occurredAt: {
      gte: lowerBound,
      ...(event.endsAt ? { lte: event.endsAt } : {})
    }
  };
  const kills = await prisma.killEvent.findMany({ where, orderBy: { occurredAt: 'asc' }, take: boundedInt(limit, 5000, 1, 20000) });
  let processed = 0;
  let rewarded = 0;
  let rejected = 0;
  let duplicates = 0;

  for (const original of kills) {
    let kill = original;
    if (kill.killerPosX === null || kill.killerPosZ === null || kill.victimPosX === null || kill.victimPosZ === null) {
      const positions = extractKillPositions(kill.raw || {});
      const updates = {
        killerPosX: positions.killer?.x ?? kill.killerPosX,
        killerPosY: positions.killer?.y ?? kill.killerPosY,
        killerPosZ: positions.killer?.z ?? kill.killerPosZ,
        victimPosX: positions.victim?.x ?? kill.victimPosX,
        victimPosY: positions.victim?.y ?? kill.victimPosY,
        victimPosZ: positions.victim?.z ?? kill.victimPosZ
      };
      const hasNewPosition = Object.entries(updates).some(([key, value]) => value !== null && value !== kill[key]);
      if (hasNewPosition) kill = await prisma.killEvent.update({ where: { id: kill.id }, data: updates });
    }
    const result = await processKillForEvent(event.id, kill, { allowInactive: true });
    processed += 1;
    if (result.duplicate) duplicates += 1;
    else if (result.qualified) rewarded += 1;
    else rejected += 1;
  }
  await logAudit({ actor: 'admin', action: 'territory_event.reprocessed', target: event.id, data: { processed, rewarded, rejected, duplicates } });
  return { processed, rewarded, rejected, duplicates };
}
