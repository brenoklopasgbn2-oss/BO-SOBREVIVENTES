import crypto from 'crypto';
import { prisma } from '../db/prisma.js';
import { env } from '../config/env.js';
import { steamLooksValid } from '../utils/format.js';
import { logAudit } from './auditService.js';

const PLAYER_COOKIE_NAME = 'sz_player_token';
const PLAYER_SESSION_VERSION = 'v3-game';
const PLAYER_SESSION_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 14;
const PLAYER_SESSION_CACHE_TTL_MS = 60_000;
const playerSessionCache = new Map();
const playerSessionKeysByPlayer = new Map();

function signSessionPayload(payload) {
  return crypto.createHmac('sha256', env.cookieSecret).update(payload).digest('base64url');
}

function safeEquals(left, right) {
  try {
    const a = Buffer.from(String(left || ''), 'utf8');
    const b = Buffer.from(String(right || ''), 'utf8');
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

function hashSessionToken(token) {
  return crypto.createHash('sha256').update(String(token || '')).digest('hex');
}

function createPlayerSessionCookieValue() {
  const token = crypto.randomBytes(32).toString('base64url');
  const expiresAt = Date.now() + PLAYER_SESSION_MAX_AGE_MS;
  const payload = `${PLAYER_SESSION_VERSION}.${token}.${expiresAt}`;
  return {
    token,
    tokenHash: hashSessionToken(token),
    expiresAt,
    cookieValue: `${payload}.${signSessionPayload(payload)}`
  };
}

function parsePlayerSessionCookie(cookieValue) {
  const raw = String(cookieValue || '').trim();
  const parts = raw.split('.');
  if (parts.length !== 4) return null;

  const [version, token, expiresAtRaw, signature] = parts;
  const payload = `${version}.${token}.${expiresAtRaw}`;
  if (version !== PLAYER_SESSION_VERSION) return null;
  if (!/^[A-Za-z0-9_-]{32,}$/.test(token)) return null;
  if (!safeEquals(signSessionPayload(payload), signature)) return null;

  const expiresAt = Number(expiresAtRaw);
  const now = Date.now();
  if (!Number.isFinite(expiresAt) || expiresAt <= now) return null;
  if (expiresAt > now + PLAYER_SESSION_MAX_AGE_MS + 60_000) return null;

  return { token, tokenHash: hashSessionToken(token), expiresAt };
}

function playerCookieOptions(maxAge = PLAYER_SESSION_MAX_AGE_MS) {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.nodeEnv === 'production',
    maxAge,
    path: '/'
  };
}

function rememberCachedPlayer(tokenHash, player) {
  if (!tokenHash || !player?.id) return;
  const cachedPlayer = { ...player, hasAvatar: Boolean(player.avatarMime) };
  playerSessionCache.set(tokenHash, { player: cachedPlayer, expiresAt: Date.now() + PLAYER_SESSION_CACHE_TTL_MS });
  const keys = playerSessionKeysByPlayer.get(player.id) || new Set();
  keys.add(tokenHash);
  playerSessionKeysByPlayer.set(player.id, keys);
}

function forgetCachedSession(tokenHash) {
  const entry = playerSessionCache.get(tokenHash);
  playerSessionCache.delete(tokenHash);
  const playerId = entry?.player?.id;
  if (!playerId) return;
  const keys = playerSessionKeysByPlayer.get(playerId);
  if (!keys) return;
  keys.delete(tokenHash);
  if (!keys.size) playerSessionKeysByPlayer.delete(playerId);
}

export function invalidatePlayerSessionCache(playerId) {
  const id = String(playerId || '').trim();
  if (!id) return;
  const keys = playerSessionKeysByPlayer.get(id);
  if (!keys) return;
  for (const key of keys) playerSessionCache.delete(key);
  playerSessionKeysByPlayer.delete(id);
}

export async function getPlayerFromCookie(req) {
  const session = parsePlayerSessionCookie(req.cookies?.[PLAYER_COOKIE_NAME]);
  if (!session) return null;

  const cached = playerSessionCache.get(session.tokenHash);
  if (cached?.expiresAt > Date.now()) return cached.player;
  if (cached) forgetCachedSession(session.tokenHash);

  const player = await prisma.player.findUnique({
    where: { rememberToken: session.tokenHash },
    omit: { avatarData: true }
  });

  if (!player) return null;
  rememberCachedPlayer(session.tokenHash, player);
  return { ...player, hasAvatar: Boolean(player.avatarMime) };
}

export async function loginPlayerFromGame({ res, steam64, nickname = '', overwriteNickname = false }) {
  const cleanedSteam = String(steam64 || '').trim();
  if (!steamLooksValid(cleanedSteam)) {
    throw new Error('Steam64 inválido. Ele precisa ter 17 números.');
  }
  if (!res) throw new Error('Resposta HTTP inválida para criar sessão.');

  const cleanedNickname = String(nickname || '').trim() || undefined;
  const session = createPlayerSessionCookieValue();
  const now = new Date();
  const updateData = {
    rememberToken: session.tokenHash,
    lastLoginAt: now,
    ...(overwriteNickname && cleanedNickname ? { nickname: cleanedNickname } : {})
  };

  // V166: login vindo do mod em uma única ida ao PostgreSQL. Antes era um
  // upsert e depois outro UPDATE apenas para salvar a sessão.
  const player = await prisma.player.upsert({
    where: { steam64: cleanedSteam },
    update: updateData,
    create: {
      steam64: cleanedSteam,
      nickname: cleanedNickname,
      rememberToken: session.tokenHash,
      lastLoginAt: now
    },
    omit: { avatarData: true }
  });

  invalidatePlayerSessionCache(player.id);
  rememberCachedPlayer(session.tokenHash, player);
  res.cookie(PLAYER_COOKIE_NAME, session.cookieValue, playerCookieOptions());

  setImmediate(() => {
    void logAudit({ actor: cleanedSteam, action: 'player.game_login', target: player.id, data: { nickname: player.nickname } });
  });
  return { ...player, hasAvatar: Boolean(player.avatarMime) };
}

export async function upsertPlayerBySteam64({ steam64, nickname, discordId, overwriteNickname = false, touchLastLogin = false }) {
  const cleanedSteam = String(steam64 || '').trim();
  if (!steamLooksValid(cleanedSteam)) {
    throw new Error('Steam64 inválido. Ele precisa ter 17 números.');
  }

  const cleanedNickname = nickname?.trim() || undefined;
  const cleanedDiscordId = discordId?.trim() || undefined;
  const updateData = {};
  if (overwriteNickname && cleanedNickname) updateData.nickname = cleanedNickname;
  if (cleanedDiscordId) updateData.discordId = cleanedDiscordId;
  if (touchLastLogin) updateData.lastLoginAt = new Date();

  const player = await prisma.player.upsert({
    where: { steam64: cleanedSteam },
    update: updateData,
    create: {
      steam64: cleanedSteam,
      nickname: cleanedNickname,
      discordId: cleanedDiscordId,
      ...(touchLastLogin ? { lastLoginAt: new Date() } : {})
    }
  });

  invalidatePlayerSessionCache(player.id);
  if (touchLastLogin) {
    setImmediate(() => {
      void logAudit({ actor: cleanedSteam, action: 'player.game_login', target: player.id, data: { nickname: player.nickname } });
    });
  }
  return player;
}

export async function setPlayerCookie(res, player) {
  if (!player?.id) throw new Error('Player inválido para criar sessão.');

  const session = createPlayerSessionCookieValue();
  invalidatePlayerSessionCache(player.id);
  const updatedPlayer = await prisma.player.update({
    where: { id: player.id },
    data: { rememberToken: session.tokenHash },
    omit: { avatarData: true }
  });

  rememberCachedPlayer(session.tokenHash, updatedPlayer);
  res.cookie(PLAYER_COOKIE_NAME, session.cookieValue, playerCookieOptions());
  return { ...updatedPlayer, hasAvatar: Boolean(updatedPlayer.avatarMime) };
}

export async function clearPlayerCookie(req, res) {
  const session = parsePlayerSessionCookie(req.cookies?.[PLAYER_COOKIE_NAME]);
  if (session) {
    const cachedPlayerId = playerSessionCache.get(session.tokenHash)?.player?.id;
    await prisma.player.updateMany({
      where: { rememberToken: session.tokenHash },
      data: { rememberToken: null }
    });
    forgetCachedSession(session.tokenHash);
    if (cachedPlayerId) invalidatePlayerSessionCache(cachedPlayerId);
  }
  res.clearCookie(PLAYER_COOKIE_NAME, playerCookieOptions(0));
}

export async function changePlayerCoins({ playerId, amount, reason, refType, refId, idempotencyKey = null, tx = prisma, audit = true }) {
  if (!Number.isInteger(amount) || amount === 0) {
    throw new Error('Quantidade de moedas inválida.');
  }

  let updatedPlayer;
  if (amount < 0) {
    const debit = Math.abs(amount);
    const changed = await tx.player.updateMany({
      where: { id: playerId, coins: { gte: debit } },
      data: { coins: { decrement: debit } }
    });
    if (!changed.count) {
      const exists = await tx.player.findUnique({ where: { id: playerId }, select: { id: true } });
      if (!exists) throw new Error('Player não encontrado.');
      throw new Error('Saldo insuficiente.');
    }
    updatedPlayer = await tx.player.findUnique({ where: { id: playerId } });
  } else {
    updatedPlayer = await tx.player.update({
      where: { id: playerId },
      data: { coins: { increment: amount } }
    });
  }

  const balanceAfter = updatedPlayer.coins;

  await tx.coinLedger.create({
    data: {
      playerId,
      type: amount > 0 ? 'CREDIT' : 'DEBIT',
      amount,
      balanceAfter,
      reason,
      refType,
      refId,
      idempotencyKey: idempotencyKey || null
    }
  });

  if (audit) {
    await logAudit({ actor: 'system', action: amount > 0 ? 'coins.credit' : 'coins.debit', target: updatedPlayer.id, data: { amount, balanceAfter, reason, refType, refId }, tx });
  }

  invalidatePlayerSessionCache(updatedPlayer.id);
  return updatedPlayer;
}
