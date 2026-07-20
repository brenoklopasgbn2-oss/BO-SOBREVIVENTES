import crypto from 'crypto';
import { env } from '../config/env.js';

const GAME_TOKEN_TTL_SECONDS = 120;
const BROWSER_SESSION_TTL_SECONDS = 60 * 60 * 8;
const TOKEN_VERSION = 1;

function base64UrlEncode(value) {
  return Buffer.from(value, 'utf8').toString('base64url');
}

function base64UrlDecode(value) {
  return Buffer.from(value, 'base64url').toString('utf8');
}

function sign(payloadPart) {
  return crypto
    .createHmac('sha256', env.cookieSecret)
    .update(payloadPart)
    .digest('base64url');
}

function safeEqual(a, b) {
  const left = Buffer.from(String(a || ''));
  const right = Buffer.from(String(b || ''));
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

function createSignedToken({ steam64, purpose, ttlSeconds }) {
  const normalizedSteam64 = String(steam64 || '').trim();
  if (!/^\d{17}$/.test(normalizedSteam64)) {
    throw new Error('Steam64 inválido para abrir o painel streamer.');
  }

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    v: TOKEN_VERSION,
    purpose,
    steam64: normalizedSteam64,
    iat: now,
    exp: now + Math.max(30, Number(ttlSeconds || 0)),
    nonce: crypto.randomBytes(16).toString('hex')
  };

  const payloadPart = base64UrlEncode(JSON.stringify(payload));
  return `${payloadPart}.${sign(payloadPart)}`;
}

function verifySignedToken(token, expectedPurpose) {
  const raw = String(token || '').trim();
  const [payloadPart, signature, extra] = raw.split('.');
  if (!payloadPart || !signature || extra) return null;
  if (!safeEqual(signature, sign(payloadPart))) return null;

  try {
    const payload = JSON.parse(base64UrlDecode(payloadPart));
    const now = Math.floor(Date.now() / 1000);
    if (payload?.v !== TOKEN_VERSION) return null;
    if (payload?.purpose !== expectedPurpose) return null;
    if (!/^\d{17}$/.test(String(payload?.steam64 || ''))) return null;
    if (!Number.isFinite(Number(payload?.exp)) || Number(payload.exp) < now) return null;
    return payload;
  } catch {
    return null;
  }
}

export function createStreamerGameAccessToken(steam64) {
  return createSignedToken({
    steam64,
    purpose: 'streamer-game-launch',
    ttlSeconds: GAME_TOKEN_TTL_SECONDS
  });
}

export function verifyStreamerGameAccessToken(token) {
  return verifySignedToken(token, 'streamer-game-launch');
}

export function createStreamerBrowserSessionToken(steam64) {
  return createSignedToken({
    steam64,
    purpose: 'streamer-browser-session',
    ttlSeconds: BROWSER_SESSION_TTL_SECONDS
  });
}

export function verifyStreamerBrowserSessionToken(token) {
  return verifySignedToken(token, 'streamer-browser-session');
}

export const streamerSessionConfig = {
  cookieName: 'rz_streamer_session',
  gameTokenTtlSeconds: GAME_TOKEN_TTL_SECONDS,
  browserSessionTtlSeconds: BROWSER_SESSION_TTL_SECONDS
};
