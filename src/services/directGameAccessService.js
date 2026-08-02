import crypto from 'crypto';
import { prisma } from '../db/prisma.js';
import { env } from '../config/env.js';

const DEVICE_COOKIE_NAME = 'rz_game_device';
const COOKIE_VERSION = 'v1';
const DEVICE_BINDING_TTL_MS = 1000 * 60 * 60 * 24 * 90;
const RECENT_FINGERPRINT_TTL_MS = 1000 * 60 * 15;

function safeEquals(left, right) {
  try {
    const a = Buffer.from(String(left || ''), 'utf8');
    const b = Buffer.from(String(right || ''), 'utf8');
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

function sign(payload) {
  return crypto.createHmac('sha256', env.cookieSecret).update(payload).digest('base64url');
}

function hashBinding(kind, value) {
  return crypto
    .createHash('sha256')
    .update(`raidz-v155-direct-game:${kind}:${value}`)
    .digest('hex');
}

function normalizeIp(req) {
  const forwarded = String(req.get?.('x-forwarded-for') || '').split(',')[0].trim();
  return forwarded || String(req.ip || req.socket?.remoteAddress || '').trim();
}

function requestFingerprint(req) {
  const ip = normalizeIp(req);
  const userAgent = String(req.get?.('user-agent') || '').slice(0, 500);
  const language = String(req.get?.('accept-language') || '').slice(0, 120);
  return crypto.createHash('sha256').update(`${ip}|${userAgent}|${language}`).digest('hex');
}

function cookieOptions(maxAge = DEVICE_BINDING_TTL_MS) {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.nodeEnv === 'production',
    maxAge,
    path: '/'
  };
}

function parseDeviceCookie(rawValue) {
  const raw = String(rawValue || '').trim();
  const parts = raw.split('.');
  if (parts.length !== 4) return null;

  const [version, deviceId, expiresAtRaw, signature] = parts;
  const payload = `${version}.${deviceId}.${expiresAtRaw}`;
  if (version !== COOKIE_VERSION) return null;
  if (!/^[A-Za-z0-9_-]{32,}$/.test(deviceId)) return null;
  if (!safeEquals(sign(payload), signature)) return null;

  const expiresAt = Number(expiresAtRaw);
  if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) return null;
  if (expiresAt > Date.now() + DEVICE_BINDING_TTL_MS + 60_000) return null;

  return { deviceId, expiresAt };
}

function createDeviceCookie() {
  const deviceId = crypto.randomBytes(32).toString('base64url');
  const expiresAt = Date.now() + DEVICE_BINDING_TTL_MS;
  const payload = `${COOKIE_VERSION}.${deviceId}.${expiresAt}`;
  return {
    deviceId,
    cookieValue: `${payload}.${sign(payload)}`
  };
}

function isActive(binding, now) {
  return Boolean(binding?.expiresAt && binding.expiresAt > now);
}

/**
 * Compatibilidade com o MOD atual, que abre somente:
 *   /from-game?steam64=7656119XXXXXXXXXX
 *
 * O Steam64 nunca é aceito para trocar uma vinculação já estabelecida neste
 * navegador. A vinculação fica assinada em cookie HttpOnly e também registrada
 * no banco. Um bloqueio curto por IP/navegador reduz tentativas de apagar o
 * cookie e alterar o link logo após a abertura.
 */
export async function authorizeDirectGameLaunch({ req, res, steam64 }) {
  const normalizedSteam64 = String(steam64 || '').trim();
  if (!/^\d{17}$/.test(normalizedSteam64)) {
    return { ok: false, error: 'Steam64 inválido recebido do DayZ.' };
  }

  // Um player já autenticado nunca pode trocar de conta apenas editando a URL.
  if (req.player?.steam64 && req.player.steam64 !== normalizedSteam64) {
    return {
      ok: false,
      error: 'Acesso bloqueado: o Steam64 do link não corresponde à conta já aberta neste navegador. Abra a loja novamente pelo DayZ sem alterar o endereço.'
    };
  }

  const parsedCookie = parseDeviceCookie(req.cookies?.[DEVICE_COOKIE_NAME]);
  const generatedCookie = parsedCookie ? null : createDeviceCookie();
  const deviceId = parsedCookie?.deviceId || generatedCookie.deviceId;
  const deviceTokenHash = hashBinding('device', deviceId);
  const fingerprintTokenHash = hashBinding('recent-fingerprint', requestFingerprint(req));
  const now = new Date();

  const [deviceBinding, recentFingerprintBinding] = await Promise.all([
    prisma.gameAccessToken.findUnique({
      where: { tokenHash: deviceTokenHash },
      select: { steam64: true, expiresAt: true }
    }),
    prisma.gameAccessToken.findUnique({
      where: { tokenHash: fingerprintTokenHash },
      select: { steam64: true, expiresAt: true }
    })
  ]);

  if (isActive(deviceBinding, now) && deviceBinding.steam64 !== normalizedSteam64) {
    return {
      ok: false,
      error: 'Acesso bloqueado: este navegador já está vinculado a outro Steam64. Não altere o link; abra novamente pelo DayZ usando o mesmo jogador.'
    };
  }

  if (isActive(recentFingerprintBinding, now) && recentFingerprintBinding.steam64 !== normalizedSteam64) {
    return {
      ok: false,
      error: 'Acesso bloqueado: foi detectada uma tentativa recente de trocar o Steam64 no endereço. Abra novamente pelo DayZ.'
    };
  }

  const deviceExpiresAt = new Date(Date.now() + DEVICE_BINDING_TTL_MS);
  const fingerprintExpiresAt = new Date(Date.now() + RECENT_FINGERPRINT_TTL_MS);

  await prisma.$transaction([
    prisma.gameAccessToken.upsert({
      where: { tokenHash: deviceTokenHash },
      create: {
        tokenHash: deviceTokenHash,
        steam64: normalizedSteam64,
        nickname: 'direct-mod-device',
        serverType: 'vanilla',
        expiresAt: deviceExpiresAt,
        usedAt: now
      },
      update: {
        steam64: normalizedSteam64,
        nickname: 'direct-mod-device',
        serverType: 'vanilla',
        expiresAt: deviceExpiresAt,
        usedAt: now
      }
    }),
    prisma.gameAccessToken.upsert({
      where: { tokenHash: fingerprintTokenHash },
      create: {
        tokenHash: fingerprintTokenHash,
        steam64: normalizedSteam64,
        nickname: 'direct-mod-recent',
        serverType: 'vanilla',
        expiresAt: fingerprintExpiresAt,
        usedAt: now
      },
      update: {
        steam64: normalizedSteam64,
        nickname: 'direct-mod-recent',
        serverType: 'vanilla',
        expiresAt: fingerprintExpiresAt,
        usedAt: now
      }
    })
  ]);

  if (generatedCookie) {
    res.cookie(DEVICE_COOKIE_NAME, generatedCookie.cookieValue, cookieOptions());
  }

  return {
    ok: true,
    steam64: normalizedSteam64,
    serverType: 'vanilla'
  };
}
