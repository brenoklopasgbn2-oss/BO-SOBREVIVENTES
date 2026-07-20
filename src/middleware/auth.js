import crypto from 'crypto';
import { env } from '../config/env.js';
import { prisma } from '../db/prisma.js';
import { getPlayerFromCookie } from '../services/playerService.js';

const STREAMER_COOKIE_NAME = 'rz_streamer_access';
const STREAMER_SESSION_MAX_AGE_MS = 1000 * 60 * 60 * 2;

function sign(value) {
  return crypto.createHmac('sha256', env.cookieSecret).update(value).digest('hex');
}

function safeSignatureEquals(expected, received) {
  try {
    const a = Buffer.from(String(expected || ''), 'utf8');
    const b = Buffer.from(String(received || ''), 'utf8');
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function createAdminCookie() {
  const value = `admin:${Date.now()}`;
  return `${value}.${sign(value)}`;
}

export function verifyAdminCookie(cookieValue) {
  if (!cookieValue || !cookieValue.includes('.')) return false;
  const idx = cookieValue.lastIndexOf('.');
  const value = cookieValue.slice(0, idx);
  const signature = cookieValue.slice(idx + 1);
  return safeSignatureEquals(sign(value), signature);
}

export function createStreamerAccessCookie(steam64) {
  const cleanSteam64 = String(steam64 || '').trim();
  if (!/^\d{17}$/.test(cleanSteam64)) throw new Error('Steam64 inválido para sessão streamer.');
  const value = `streamer:${cleanSteam64}:${Date.now()}`;
  return `${value}.${sign(value)}`;
}

export function verifyStreamerAccessCookie(cookieValue, expectedSteam64 = '') {
  if (!cookieValue || !cookieValue.includes('.')) return false;
  const idx = cookieValue.lastIndexOf('.');
  const value = cookieValue.slice(0, idx);
  const signature = cookieValue.slice(idx + 1);
  if (!safeSignatureEquals(sign(value), signature)) return false;

  const [prefix, steam64, createdAtRaw] = value.split(':');
  const createdAt = Number(createdAtRaw);
  if (prefix !== 'streamer' || !/^\d{17}$/.test(steam64) || !Number.isFinite(createdAt)) return false;
  if (Date.now() - createdAt > STREAMER_SESSION_MAX_AGE_MS || createdAt > Date.now() + 30_000) return false;
  if (expectedSteam64 && steam64 !== String(expectedSteam64).trim()) return false;
  return true;
}

export function setStreamerAccessCookie(res, steam64) {
  res.cookie(STREAMER_COOKIE_NAME, createStreamerAccessCookie(steam64), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: STREAMER_SESSION_MAX_AGE_MS
  });
}

export function clearStreamerAccessCookie(res) {
  res.clearCookie(STREAMER_COOKIE_NAME, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production'
  });
}

export async function attachPlayer(req, res, next) {
  try {
    req.player = await getPlayerFromCookie(req);
    res.locals.player = req.player;

    const hasValidStreamerCookie = Boolean(
      req.player?.steam64
      && verifyStreamerAccessCookie(req.cookies?.[STREAMER_COOKIE_NAME], req.player.steam64)
    );

    let approvedStreamer = null;
    if (hasValidStreamerCookie) {
      approvedStreamer = await prisma.streamerCode.findFirst({
        where: { streamerSteam64: req.player.steam64, active: true },
        select: { id: true, code: true, streamerName: true },
        orderBy: { updatedAt: 'desc' }
      });
    }

    req.streamerAccessApproved = Boolean(approvedStreamer);
    req.approvedStreamer = approvedStreamer;
    res.locals.streamerAccessApproved = req.streamerAccessApproved;
    res.locals.approvedStreamer = approvedStreamer;
    next();
  } catch (err) {
    next(err);
  }
}

export function requirePlayer(req, res, next) {
  if (!req.player) {
    req.flash = { error: 'Cadastre seu Steam64 primeiro para usar a loja.' };
    return res.redirect('/');
  }
  next();
}

export function requireStreamerAccess(req, res, next) {
  if (!req.player || !req.streamerAccessApproved) {
    return res.redirect('/shop?serverType=vanilla&error=' + encodeURIComponent('Painel streamer protegido. O streamer precisa abrir o site pelo L dentro do servidor usando o próprio Steam64.'));
  }
  next();
}

export function adminLogged(req) {
  return verifyAdminCookie(req.cookies?.sz_admin);
}

export function requireAdmin(req, res, next) {
  if (!adminLogged(req)) return res.redirect('/admin/login');
  next();
}

export function requireApiKey(req, res, next) {
  // O site não depende mais da API antiga do mod. Quando API_KEY estiver vazia,
  // mantemos /api bloqueado em vez de derrubar todo o deploy.
  if (!env.apiKey) {
    return res.status(503).json({ ok: false, disabled: true, error: 'API HTTP do mod desativada neste site.' });
  }
  const key = req.get('x-api-key') || req.query.apiKey || req.query.key || req.body?.apiKey || req.body?.key;
  if (!key || key !== env.apiKey) {
    return res.status(401).json({ ok: false, error: 'API_KEY inválida.' });
  }
  next();
}
