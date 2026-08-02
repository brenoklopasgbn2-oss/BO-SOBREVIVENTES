import { prisma } from '../db/prisma.js';

// Dono principal do RAID-Z. Mantido no código para não depender de variável do Railway
// nem de um primeiro vínculo pelo /admin/login.
const BUILTIN_ADMIN_STEAM64S = Object.freeze(['76561198842331372']);
const ADMIN_OWNER_SETTING_KEYS = Object.freeze([
  'admin.ownerSteam64',
  'admin.ownerSteam64.v144'
]);
const PRIMARY_ADMIN_OWNER_SETTING_KEY = ADMIN_OWNER_SETTING_KEYS[0];
const CACHE_TTL_MS = 30_000;

let cachedSteam64s = new Set();
let cacheExpiresAt = 0;

function normalizeSteam64(value) {
  const steam64 = String(value || '').trim();
  return /^\d{17}$/.test(steam64) ? steam64 : '';
}

function parseSteam64List(value) {
  const source = Array.isArray(value)
    ? value
    : String(value || '').split(/[\s,;|]+/g);

  return Array.from(new Set(source.map(normalizeSteam64).filter(Boolean)));
}

function getBuiltInAdminSteam64s() {
  return parseSteam64List(BUILTIN_ADMIN_STEAM64S);
}

function getEnvironmentAdminSteam64s() {
  return parseSteam64List([
    process.env.ADMIN_STEAM64,
    process.env.ADMIN_STEAM64S
  ].filter(Boolean).join(','));
}

function getStoredSteam64s(value) {
  if (Array.isArray(value)) return parseSteam64List(value);
  if (!value || typeof value !== 'object') return [];
  return parseSteam64List(value.steam64s || value.steam64 || value.ownerSteam64 || []);
}

export function invalidateAdminIdentityCache() {
  cachedSteam64s = new Set();
  cacheExpiresAt = 0;
}

export async function getAdminSteam64Set({ force = false } = {}) {
  const fixedSteam64s = [
    ...getBuiltInAdminSteam64s(),
    ...getEnvironmentAdminSteam64s()
  ];
  const now = Date.now();

  if (!force && cacheExpiresAt > now) {
    return new Set([...fixedSteam64s, ...cachedSteam64s]);
  }

  let storedSteam64s = [];
  try {
    const settings = await prisma.appSetting.findMany({
      where: { key: { in: [...ADMIN_OWNER_SETTING_KEYS] } },
      select: { value: true }
    });
    storedSteam64s = settings.flatMap((setting) => getStoredSteam64s(setting?.value));
  } catch (error) {
    // Mesmo se o banco estiver temporariamente indisponível, o dono fixo continua reconhecido.
    console.error('Falha ao carregar Steam64 adicional do administrador:', error.message);
  }

  cachedSteam64s = new Set(parseSteam64List(storedSteam64s));
  cacheExpiresAt = now + CACHE_TTL_MS;
  return new Set([...fixedSteam64s, ...cachedSteam64s]);
}

export async function isAdminSteam64(steam64) {
  const cleanSteam64 = normalizeSteam64(steam64);
  if (!cleanSteam64) return false;
  // O dono fixo é reconhecido imediatamente, sem depender de consulta no banco.
  if (getBuiltInAdminSteam64s().includes(cleanSteam64)) return true;
  const adminSteam64s = await getAdminSteam64Set();
  return adminSteam64s.has(cleanSteam64);
}

export async function ensureAdminOwnerSteam64(steam64) {
  const cleanSteam64 = normalizeSteam64(steam64);
  if (!cleanSteam64) return { linked: false, steam64: null, source: 'invalid' };

  const builtInSteam64s = getBuiltInAdminSteam64s();
  if (builtInSteam64s.length) {
    invalidateAdminIdentityCache();
    return {
      linked: builtInSteam64s.includes(cleanSteam64),
      steam64: builtInSteam64s[0],
      source: 'built-in'
    };
  }

  const envSteam64s = getEnvironmentAdminSteam64s();
  if (envSteam64s.length) {
    invalidateAdminIdentityCache();
    return {
      linked: envSteam64s.includes(cleanSteam64),
      steam64: envSteam64s[0],
      source: 'environment'
    };
  }

  const settings = await prisma.appSetting.findMany({
    where: { key: { in: [...ADMIN_OWNER_SETTING_KEYS] } },
    select: { value: true }
  });
  const storedSteam64s = parseSteam64List(settings.flatMap((setting) => getStoredSteam64s(setting?.value)));

  if (storedSteam64s.length) {
    cachedSteam64s = new Set(storedSteam64s);
    cacheExpiresAt = Date.now() + CACHE_TTL_MS;
    return {
      linked: storedSteam64s.includes(cleanSteam64),
      steam64: storedSteam64s[0],
      source: 'database'
    };
  }

  await prisma.appSetting.upsert({
    where: { key: PRIMARY_ADMIN_OWNER_SETTING_KEY },
    update: { value: { steam64s: [cleanSteam64], linkedAt: new Date().toISOString() } },
    create: { key: PRIMARY_ADMIN_OWNER_SETTING_KEY, value: { steam64s: [cleanSteam64], linkedAt: new Date().toISOString() } }
  });

  cachedSteam64s = new Set([cleanSteam64]);
  cacheExpiresAt = Date.now() + CACHE_TTL_MS;
  return { linked: true, steam64: cleanSteam64, source: 'database-new' };
}

export function buildAdminRankingExclusion(adminSteam64s) {
  const steam64s = Array.from(adminSteam64s || []).map(normalizeSteam64).filter(Boolean);
  if (!steam64s.length) return {};

  // Forma explícita para o Prisma: nenhum evento em que o ADM seja killer ou vítima.
  return {
    killerSteam64: { notIn: steam64s },
    victimSteam64: { notIn: steam64s }
  };
}

export function filterAdminRankingEvents(events = [], adminSteam64s = new Set()) {
  const blocked = new Set(Array.from(adminSteam64s || []).map(normalizeSteam64).filter(Boolean));
  if (!blocked.size) return events;
  return (events || []).filter((event) => {
    const killerSteam64 = normalizeSteam64(event?.killerSteam64);
    const victimSteam64 = normalizeSteam64(event?.victimSteam64);
    return !blocked.has(killerSteam64) && !blocked.has(victimSteam64);
  });
}
