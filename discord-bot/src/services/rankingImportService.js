import { prisma } from '../db/prisma.js';
import { upsertPlayerBySteam64 } from './playerService.js';
import { findActiveClanForSteam } from './rankingService.js';

const VALID_SERVERS = new Set(['vanilla', 'bbp', 'deathmatch']);
const IMPORT_KEY_PREFIX = 'ranking.import.v1.';
const KOTH_PLACEHOLDER = '__KOTH__';

function cleanString(value, max = 180) {
  const text = String(value ?? '').trim();
  return text ? text.slice(0, max) : null;
}

function normalizeServer(value) {
  const server = String(value || 'vanilla').trim().toLowerCase();
  return VALID_SERVERS.has(server) ? server : 'vanilla';
}

function isSteam64(value) {
  return /^\d{17}$/.test(String(value || '').trim());
}

function safeBool(value) {
  if (typeof value === 'boolean') return value;
  const text = String(value || '').trim().toLowerCase();
  return ['1', 'true', 'yes', 'sim', 'headshot'].includes(text);
}

function sanitizeEventId(value) {
  const text = String(value || '').trim().slice(0, 120);
  return text.replace(/[^a-zA-Z0-9:_\-\.]/g, '_');
}

function markerKey(eventId) {
  return `${IMPORT_KEY_PREFIX}${sanitizeEventId(eventId)}`.slice(0, 190);
}

function parseDate(value) {
  if (!value) return new Date();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function normalizeType(raw = {}) {
  const type = String(raw.eventType || raw.type || raw.kind || '').trim().toLowerCase();
  if (type) return type;
  const killer = String(raw.killerSteam64 || raw.killerId || '').trim();
  const victim = String(raw.victimSteam64 || raw.victimId || '').trim();
  if (isSteam64(killer) && isSteam64(victim) && killer !== victim) return 'kill';
  return 'death';
}

function eventArrayFromPayload(payload = {}) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.events)) return payload.events;
  if (Array.isArray(payload.items)) return payload.items;
  return [payload];
}

function humanCauseLabel(causeType) {
  const cause = String(causeType || '').trim().toLowerCase();
  if (cause.includes('zombie') || cause.includes('infect')) return 'Zumbi';
  if (cause.includes('wolf')) return 'Lobo';
  if (cause.includes('bear')) return 'Urso';
  if (cause.includes('animal')) return 'Animal';
  if (cause.includes('fall')) return 'Queda';
  if (cause.includes('gas')) return 'Gás';
  if (cause.includes('car') || cause.includes('vehicle')) return 'Veículo';
  if (cause.includes('starv')) return 'Fome';
  if (cause.includes('bleed')) return 'Sangramento';
  if (cause.includes('cold')) return 'Frio';
  if (cause.includes('explos')) return 'Explosão';
  return 'Ambiente';
}

function humanVictimLabel(type) {
  const normalized = String(type || '').trim().toLowerCase();
  if (normalized === 'koth' || normalized === 'koth_completed') return 'KOTH concluído';
  return 'Evento';
}

async function createPvpKill(tx, event) {
  const serverType = normalizeServer(event.serverType || event.server || event.shard || 'vanilla');
  const killerSteam64 = String(event.killerSteam64 || event.killerId || '').trim();
  const victimSteam64 = String(event.victimSteam64 || event.victimId || '').trim();
  if (!isSteam64(killerSteam64) || !isSteam64(victimSteam64) || killerSteam64 === victimSteam64) {
    throw new Error('Kill inválida para ranking.');
  }

  const [killer, victim, killerClan, victimClan] = await Promise.all([
    upsertPlayerBySteam64({ steam64: killerSteam64, nickname: cleanString(event.killerName || event.killerNickname || event.killerDisplayName, 120) || '' }),
    upsertPlayerBySteam64({ steam64: victimSteam64, nickname: cleanString(event.victimName || event.victimNickname || event.victimDisplayName, 120) || '' }),
    findActiveClanForSteam(killerSteam64),
    findActiveClanForSteam(victimSteam64)
  ]);

  await tx.killEvent.create({
    data: {
      serverType,
      killerSteam64,
      killerName: cleanString(event.killerName || killer.nickname || event.killerNickname || event.killerDisplayName, 120) || null,
      victimSteam64,
      victimName: cleanString(event.victimName || victim.nickname || event.victimNickname || event.victimDisplayName, 120) || null,
      killerClanId: killerClan?.id || null,
      victimClanId: victimClan?.id || null,
      weapon: cleanString(event.weapon || event.weaponName || event.itemInHands || 'Desconhecida', 120),
      distanceMeters: event.distanceMeters === undefined || event.distanceMeters === null || event.distanceMeters === '' ? null : Number(event.distanceMeters),
      place: cleanString(event.place || event.location || event.zone || event.areaName, 160),
      headshot: safeBool(event.headshot),
      occurredAt: parseDate(event.occurredAt || event.timestamp || event.date),
      raw: {
        ...event,
        eventType: 'kill',
        isPvp: true,
        importedAt: new Date().toISOString()
      }
    }
  });

  return 'kill';
}

async function createPveDeath(tx, event) {
  const serverType = normalizeServer(event.serverType || event.server || event.shard || 'vanilla');
  const victimSteam64 = String(event.victimSteam64 || event.victimId || event.playerSteam64 || event.steam64 || '').trim();
  if (!isSteam64(victimSteam64)) throw new Error('Death inválida: vítima sem Steam64.');

  const victim = await upsertPlayerBySteam64({
    steam64: victimSteam64,
    nickname: cleanString(event.victimName || event.playerName || event.nickname || event.victimDisplayName, 120) || ''
  });
  const victimClan = await findActiveClanForSteam(victimSteam64);
  const causeType = String(event.causeType || event.cause || event.reason || event.source || 'environment').trim().toLowerCase();
  const killerName = cleanString(event.killerName || event.sourceName || humanCauseLabel(causeType), 120) || humanCauseLabel(causeType);
  const killerSteam64 = cleanString(event.killerSteam64 || event.killerId, 40) || `PVE_${causeType || 'environment'}`.toUpperCase().replace(/[^A-Z0-9_]/g, '_').slice(0, 30);

  await tx.killEvent.create({
    data: {
      serverType,
      killerSteam64,
      killerName,
      victimSteam64,
      victimName: cleanString(event.victimName || victim.nickname || event.playerName || event.nickname || event.victimDisplayName, 120) || null,
      killerClanId: null,
      victimClanId: victimClan?.id || null,
      weapon: cleanString(event.weapon || event.weaponName || killerName, 120),
      distanceMeters: null,
      place: cleanString(event.place || event.location || event.zone || event.areaName, 160),
      headshot: false,
      occurredAt: parseDate(event.occurredAt || event.timestamp || event.date),
      raw: {
        ...event,
        eventType: 'death',
        causeType,
        isPvp: false,
        importedAt: new Date().toISOString()
      }
    }
  });

  return 'death';
}

async function createKothCompletion(tx, event) {
  const serverType = normalizeServer(event.serverType || event.server || 'vanilla');
  const winnerSteam64 = String(event.winnerSteam64 || event.playerSteam64 || event.steam64 || event.killerSteam64 || '').trim();
  if (!isSteam64(winnerSteam64)) throw new Error('KOTH sem Steam64 válido.');

  const winner = await upsertPlayerBySteam64({
    steam64: winnerSteam64,
    nickname: cleanString(event.winnerName || event.playerName || event.nickname || event.killerName, 120) || ''
  });
  const winnerClan = await findActiveClanForSteam(winnerSteam64);

  await tx.killEvent.create({
    data: {
      serverType,
      killerSteam64: winnerSteam64,
      killerName: cleanString(event.winnerName || winner.nickname || event.playerName || event.nickname || event.killerName, 120) || null,
      victimSteam64: KOTH_PLACEHOLDER,
      victimName: cleanString(event.victimName || humanVictimLabel('koth_completed'), 120),
      killerClanId: winnerClan?.id || null,
      victimClanId: null,
      weapon: cleanString(event.kothName || event.zoneName || event.eventName || 'KOTH', 120),
      distanceMeters: null,
      place: cleanString(event.place || event.location || event.zone || event.areaName || event.kothName || event.zoneName, 160),
      headshot: false,
      occurredAt: parseDate(event.occurredAt || event.timestamp || event.date),
      raw: {
        ...event,
        eventType: 'koth_completed',
        isPvp: false,
        importedAt: new Date().toISOString()
      }
    }
  });

  if (winnerClan?.id) {
    await tx.clan.update({
      where: { id: winnerClan.id },
      data: { eventWins: { increment: 1 } }
    });
  }

  return 'koth';
}

async function processOneEvent(event = {}, payloadMeta = {}) {
  const eventId = sanitizeEventId(event.eventId || event.id || event.uuid || `${normalizeType(event)}-${event.timestamp || event.occurredAt || Date.now()}-${event.killerSteam64 || event.victimSteam64 || event.playerSteam64 || event.steam64 || Math.random().toString(36).slice(2, 8)}`);
  if (!eventId) return { ok: false, skipped: true, reason: 'missing_event_id' };

  return prisma.$transaction(async (tx) => {
    const key = markerKey(eventId);
    const already = await tx.appSetting.findUnique({ where: { key } });
    if (already) return { ok: true, skipped: true, type: 'duplicate' };

    const type = normalizeType(event);
    let resultType = 'unknown';
    if (['kill', 'pvp_kill', 'player_kill'].includes(type)) resultType = await createPvpKill(tx, event);
    else if (['koth', 'koth_completed', 'koth_complete', 'kothwinner', 'koth_winner'].includes(type)) resultType = await createKothCompletion(tx, event);
    else if (['death', 'pve_death', 'environment_death', 'player_death'].includes(type)) resultType = await createPveDeath(tx, event);
    else if (isSteam64(event.killerSteam64 || event.killerId) && isSteam64(event.victimSteam64 || event.victimId) && String(event.killerSteam64 || event.killerId).trim() !== String(event.victimSteam64 || event.victimId).trim()) resultType = await createPvpKill(tx, event);
    else resultType = await createPveDeath(tx, event);

    await tx.appSetting.create({
      data: {
        key,
        value: {
          eventId,
          type: resultType,
          importedAt: new Date().toISOString(),
          sourceFile: payloadMeta.sourceFile || null,
          serverType: normalizeServer(event.serverType || event.server || payloadMeta.serverType || 'vanilla')
        }
      }
    });

    return { ok: true, skipped: false, type: resultType };
  });
}

export async function processRankingImportPayload(payload = {}, options = {}) {
  const events = eventArrayFromPayload(payload).filter(Boolean);
  const stats = { files: 1, total: events.length, imported: 0, kills: 0, deaths: 0, koth: 0, duplicates: 0, errors: 0 };

  for (const event of events) {
    try {
      const result = await processOneEvent(event, options);
      if (!result || result.skipped) {
        stats.duplicates += 1;
        continue;
      }
      stats.imported += 1;
      if (result.type === 'kill') stats.kills += 1;
      else if (result.type === 'death') stats.deaths += 1;
      else if (result.type === 'koth') stats.koth += 1;
    } catch (error) {
      stats.errors += 1;
      console.error('[RANKING_IMPORT] Erro ao importar evento:', error.message);
    }
  }

  return stats;
}
