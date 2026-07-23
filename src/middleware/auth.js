import crypto from 'crypto';
import { env } from '../config/env.js';
import { getPlayerFromCookie } from '../services/playerService.js';

function sign(value) {
  return crypto.createHmac('sha256', env.cookieSecret).update(value).digest('hex');
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
  try {
    return crypto.timingSafeEqual(Buffer.from(sign(value)), Buffer.from(signature));
  } catch {
    return false;
  }
}

export async function attachPlayer(req, res, next) {
  try {
    req.player = await getPlayerFromCookie(req);
    res.locals.player = req.player;
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

export function adminLogged(req) {
  return verifyAdminCookie(req.cookies?.sz_admin);
}

export function requireAdmin(req, res, next) {
  if (!adminLogged(req)) return res.redirect('/admin/login');
  next();
}

export function requireApiKey(req, res, next) {
  const key = req.get('x-api-key') || req.query.apiKey || req.query.key || req.body?.apiKey || req.body?.key;
  if (!key || key !== env.apiKey) {
    return res.status(401).json({ ok: false, error: 'API_KEY inválida.' });
  }
  next();
}
