import { prisma } from '../db/prisma.js';
import { enqueueDiscordEvent } from './discordOutboxService.js';

const SESSION_GAP_MS = 45_000;
const WRITE_EVERY_MS = 60_000;
const UNLINKED_ALERT_MS = 30 * 60_000;
const lastSyncByServer = new Map();

function cleanSteam64(value) {
  const id = String(value || '').trim();
  return /^\d{17}$/.test(id) ? id : '';
}

export async function syncOnlinePresence(players = [], { serverId = 'dayz-1', serverType = 'vanilla', force = false } = {}) {
  const nowMs = Date.now();
  const serverKey = String(serverId || 'dayz-1');
  const lastSync = lastSyncByServer.get(serverKey) || 0;
  if (!force && nowMs - lastSync < WRITE_EVERY_MS) return { skipped: true, online: players.length, alerts: 0 };
  lastSyncByServer.set(serverKey, nowMs);

  const cleanPlayers = [];
  const seen = new Set();
  for (const raw of Array.isArray(players) ? players : []) {
    const steam64 = cleanSteam64(raw?.steam64 ?? raw);
    if (!steam64 || seen.has(steam64)) continue;
    seen.add(steam64);
    cleanPlayers.push({ steam64, nickname: String(raw?.playerName || raw?.nickname || raw?.name || '').trim().slice(0, 100) || null });
    if (cleanPlayers.length >= 140) break;
  }
  if (!cleanPlayers.length) return { skipped: false, online: 0, alerts: 0 };

  const now = new Date(nowMs);
  const ids = cleanPlayers.map(p => p.steam64);
  const existing = await prisma.player.findMany({ where: { steam64: { in: ids } } });
  const bySteam = new Map(existing.map(row => [row.steam64, row]));
  let alerts = 0;

  for (const current of cleanPlayers) {
    const old = bySteam.get(current.steam64);
    const lastSeenMs = old?.lastSeenOnlineAt ? new Date(old.lastSeenOnlineAt).getTime() : 0;
    const sameSession = Boolean(old?.onlineSince && lastSeenMs && nowMs - lastSeenMs <= SESSION_GAP_MS);
    const onlineSince = sameSession ? old.onlineSince : now;

    const player = old
      ? await prisma.player.update({
          where: { id: old.id },
          data: {
            nickname: current.nickname || old.nickname || null,
            lastSeenOnlineAt: now,
            onlineSince,
            lastSeenServerId: serverKey
          }
        })
      : await prisma.player.create({
          data: {
            steam64: current.steam64,
            nickname: current.nickname,
            lastSeenOnlineAt: now,
            onlineSince: now,
            lastSeenServerId: serverKey
          }
        });

    const sessionStartedMs = new Date(onlineSince).getTime();
    const alreadyAlertedThisSession = player.unlinkedAlertedAt && new Date(player.unlinkedAlertedAt).getTime() >= sessionStartedMs;
    if (!player.discordId && !alreadyAlertedThisSession && nowMs - sessionStartedMs >= UNLINKED_ALERT_MS) {
      await prisma.$transaction(async (tx) => {
        await tx.player.update({ where: { id: player.id }, data: { unlinkedAlertedAt: now } });
        await enqueueDiscordEvent('UNLINKED_PLAYER_ALERT', {
          steam64: player.steam64,
          nickname: player.nickname || current.nickname || 'Player',
          serverId: serverKey,
          serverType,
          onlineSince: new Date(onlineSince).toISOString(),
          minutesOnline: Math.floor((nowMs - sessionStartedMs) / 60_000)
        }, { tx });
      });
      alerts += 1;
    }
  }

  return { skipped: false, online: cleanPlayers.length, alerts };
}

export async function getPresenceAdminSnapshot() {
  const cutoff = new Date(Date.now() - 90_000);
  const players = await prisma.player.findMany({
    where: { lastSeenOnlineAt: { gte: cutoff } },
    orderBy: [{ discordId: 'asc' }, { onlineSince: 'asc' }],
    take: 300
  });
  return {
    onlinePlayers: players.map(player => ({
      ...player,
      onlineMinutes: player.onlineSince ? Math.max(0, Math.floor((Date.now() - new Date(player.onlineSince).getTime()) / 60_000)) : 0,
      linked: Boolean(player.discordId)
    }))
  };
}
