import crypto from 'crypto';
import { env } from '../config/env.js';

const STEAM_OPENID_ENDPOINT = 'https://steamcommunity.com/openid/login';
const STEAM_IDENTIFIER_SELECT = 'http://specs.openid.net/auth/2.0/identifier_select';
const STEAM_STATE_COOKIE = 'rz_steam_login_state';
const STEAM_STATE_MAX_AGE_MS = 10 * 60 * 1000;

function safeEquals(left, right) {
  try {
    const a = Buffer.from(String(left || ''), 'utf8');
    const b = Buffer.from(String(right || ''), 'utf8');
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

function cookieOptions(maxAge = STEAM_STATE_MAX_AGE_MS) {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.nodeEnv === 'production',
    maxAge,
    path: '/auth/steam'
  };
}

function publicOrigin() {
  const url = new URL(env.publicUrl);
  return url.origin;
}

function callbackUrl(state) {
  const url = new URL('/auth/steam/callback', publicOrigin());
  url.searchParams.set('state', state);
  return url.toString();
}

function queryValue(value) {
  if (Array.isArray(value)) return String(value[0] || '');
  return String(value || '');
}

export function beginSteamLogin(res) {
  const state = crypto.randomBytes(24).toString('base64url');
  const returnTo = callbackUrl(state);
  const realm = `${publicOrigin()}/`;

  res.cookie(STEAM_STATE_COOKIE, state, cookieOptions());

  const openIdUrl = new URL(STEAM_OPENID_ENDPOINT);
  openIdUrl.searchParams.set('openid.ns', 'http://specs.openid.net/auth/2.0');
  openIdUrl.searchParams.set('openid.mode', 'checkid_setup');
  openIdUrl.searchParams.set('openid.return_to', returnTo);
  openIdUrl.searchParams.set('openid.realm', realm);
  openIdUrl.searchParams.set('openid.identity', STEAM_IDENTIFIER_SELECT);
  openIdUrl.searchParams.set('openid.claimed_id', STEAM_IDENTIFIER_SELECT);

  return openIdUrl.toString();
}

export function clearSteamLoginState(res) {
  res.clearCookie(STEAM_STATE_COOKIE, cookieOptions(0));
}

export async function verifySteamLoginCallback(req) {
  const expectedState = String(req.cookies?.[STEAM_STATE_COOKIE] || '');
  const receivedState = queryValue(req.query.state);
  if (!expectedState || !receivedState || !safeEquals(expectedState, receivedState)) {
    throw new Error('A confirmação da Steam expirou ou não pertence a este navegador. Tente entrar novamente.');
  }

  const mode = queryValue(req.query['openid.mode']);
  if (mode === 'cancel') throw new Error('Entrada pela Steam cancelada.');
  if (mode !== 'id_res') throw new Error('Resposta de autenticação da Steam inválida.');

  const expectedReturnTo = callbackUrl(expectedState);
  const receivedReturnTo = queryValue(req.query['openid.return_to']);
  if (!safeEquals(expectedReturnTo, receivedReturnTo)) {
    throw new Error('Endereço de retorno da Steam não confere.');
  }

  const opEndpoint = queryValue(req.query['openid.op_endpoint']).replace(/\/+$/, '');
  if (opEndpoint !== STEAM_OPENID_ENDPOINT.replace(/\/+$/, '')) {
    throw new Error('Provedor de autenticação Steam inválido.');
  }

  const verification = new URLSearchParams();
  for (const [key, value] of Object.entries(req.query || {})) {
    if (!key.startsWith('openid.')) continue;
    verification.set(key, queryValue(value));
  }
  verification.set('openid.mode', 'check_authentication');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  let response;
  try {
    response = await fetch(STEAM_OPENID_ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: verification,
      signal: controller.signal
    });
  } catch (error) {
    if (error?.name === 'AbortError') throw new Error('A Steam demorou para confirmar o login. Tente novamente.');
    throw new Error('Não foi possível confirmar o login com a Steam agora.');
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) throw new Error('A Steam recusou a confirmação do login.');
  const body = await response.text();
  const valid = body.split(/\r?\n/).some(line => line.trim() === 'is_valid:true');
  if (!valid) throw new Error('A Steam não confirmou a identidade desta conta.');

  const claimedId = queryValue(req.query['openid.claimed_id']);
  const identity = queryValue(req.query['openid.identity']);
  if (!safeEquals(claimedId, identity)) throw new Error('Identidade Steam inconsistente.');

  const match = claimedId.match(/^https:\/\/steamcommunity\.com\/openid\/id\/(\d{17})$/);
  if (!match) throw new Error('Steam64 não encontrado na resposta autenticada.');

  return { steam64: match[1] };
}
