import crypto from 'crypto';
import { env } from '../config/env.js';
import { prisma } from '../db/prisma.js';
import { getPlayerFromCookie } from '../services/playerService.js';
import { isAdminSteam64 } from '../services/adminIdentityService.js';

const ADMIN_SESSION_MAX_AGE_MS = 1000 * 60 * 60 * 12;
const STREAMER_ACCESS_CACHE_TTL_MS = 60_000;
const streamerAccessCache = new Map();
const streamerAccessPending = new Map();

// Imagens públicas não precisam carregar sessão, saldo, cargo de ADM ou painel
// streamer. Sem este atalho, cada card da loja podia gerar 2-3 consultas extras
// ao PostgreSQL apenas para exibir uma imagem.
const PUBLIC_MEDIA_PREFIXES = Object.freeze([
  '/dayz-wiki-image',
  '/product-image/',
  '/vehicle-image/',
  '/outfit-image/',
  '/player-avatar/',
  '/clan-flag/',
  '/clan-banner/',
  '/starter-kit-image'
]);

function isPublicMediaRequest(req) {
  if (!['GET', 'HEAD'].includes(String(req.method || '').toUpperCase())) return false;
  const pathname = String(req.path || '');
  return PUBLIC_MEDIA_PREFIXES.some(prefix => pathname === prefix || pathname.startsWith(prefix));
}

export function primeStreamerAccessCache(steam64, value) {
  const key = String(steam64 || '').trim();
  if (!key) return;
  streamerAccessCache.set(key, { value: value || null, expiresAt: Date.now() + STREAMER_ACCESS_CACHE_TTL_MS });
}

async function getApprovedStreamerCached(steam64) {
  const key = String(steam64 || '').trim();
  if (!key) return null;
  const cached = streamerAccessCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.value;
  if (streamerAccessPending.has(key)) return streamerAccessPending.get(key);

  const pending = prisma.streamerCode.findFirst({
    where: { streamerSteam64: key, active: true },
    select: { id: true, code: true, streamerName: true },
    orderBy: { updatedAt: 'desc' }
  }).then((value) => {
    streamerAccessCache.set(key, { value, expiresAt: Date.now() + STREAMER_ACCESS_CACHE_TTL_MS });
    return value;
  }).finally(() => streamerAccessPending.delete(key));

  streamerAccessPending.set(key, pending);
  return pending;
}

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
  if (!safeSignatureEquals(sign(value), signature)) return false;

  const [prefix, createdAtRaw, extra] = value.split(':');
  const createdAt = Number(createdAtRaw);
  if (prefix !== 'admin' || extra || !Number.isFinite(createdAt)) return false;
  if (createdAt > Date.now() + 30_000) return false;
  if (Date.now() - createdAt > ADMIN_SESSION_MAX_AGE_MS) return false;
  return true;
}

export async function attachPlayer(req, res, next) {
  res.locals.player = null;
  res.locals.streamerAccessApproved = false;
  res.locals.approvedStreamer = null;
  res.locals.isAdminLogged = adminLogged(req);
  res.locals.isAdminAccount = false;
  req.isAdminAccount = false;

  if (isPublicMediaRequest(req)) {
    req.player = null;
    return next();
  }

  try {
    req.player = await getPlayerFromCookie(req);
    res.locals.player = req.player;

    // O link vindo do jogo só precisa reconhecer a sessão existente para impedir
    // troca de conta. Consultas de cargo e painel são feitas já na página de destino.
    if (String(req.path || '') === '/from-game') return next();

    const [isAdminAccount, approvedStreamer] = req.player?.steam64
      ? await Promise.all([
          isAdminSteam64(req.player.steam64),
          getApprovedStreamerCached(req.player.steam64)
        ])
      : [false, null];

    req.isAdminAccount = Boolean(isAdminAccount);
    res.locals.isAdminAccount = req.isAdminAccount;

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
    return res.redirect('/login?error=' + encodeURIComponent('Abra o site pelo L dentro do DayZ para entrar automaticamente.'));
  }
  next();
}

export function requireStreamerAccess(req, res, next) {
  if (!req.player || !req.streamerAccessApproved) {
    return res.redirect('/shop?serverType=vanilla&error=' + encodeURIComponent('Painel streamer disponível somente para Steam64 cadastrado e autenticado pelo jogo.'));
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
  // O site usa a API HTTP V75 do mod. Quando API_KEY estiver vazia,
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
