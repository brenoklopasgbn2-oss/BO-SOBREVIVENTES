import { createHash, randomUUID } from 'crypto';
import multer from 'multer';
import { Router } from 'express';
import { prisma } from '../db/prisma.js';
import { requirePlayer, requireStreamerAccess, primeStreamerAccessCache } from '../middleware/auth.js';
import { loginPlayerFromGame, upsertPlayerBySteam64, clearPlayerCookie } from '../services/playerService.js';
import { listActiveProducts, buyProduct, buyCart } from '../services/shopService.js';
import { createPixPayment, setPaymentStreamerSupport, syncPaymentStatusByLocalId } from '../services/paymentService.js';
import { getGlobalPromo, applyPromotionToProduct } from '../services/promotionService.js';
import { env } from '../config/env.js';
import { describeProductItems } from '../utils/productItems.js';
import { buyOrRentVehicle, renewVehicle, renewInsurance, upgradeInsurancePlan, cancelPlayerVehicle } from '../services/vehicleRentalService.js';
import { getStarterKit, hasClaimedStarterKit, hasClaimedStarterKitFast, claimStarterKit } from '../services/starterKitService.js';
import { getRankingData, getPlayerRankingProfile, getMyClan, canManageClan } from '../services/rankingService.js';
import { DEATHMATCH_ACTIONS, getDeathmatchConfig } from '../services/deathmatchService.js';
import { getStreamerDashboardBySteam64, requestStreamerWeeklyPayout } from '../services/supportService.js';
import {
  listOutfitTemplates,
  getActiveOutfitForPlayer,
  buyOutfitSubscription,
  getStarterVipBenefitStatus,
  claimStarterVip7d
} from '../services/outfitService.js';
import {
  listManagedOutfitsForOwner,
  addManagedOutfitMember,
  renewManagedOutfitMember,
  removeManagedOutfitMember,
  requestManagedOutfitFlag,
  purchaseClanOutfitMonth,
  getCustomOutfitOrdersForPlayer,
  syncClanManagedOutfitAccess
} from '../services/managedOutfitService.js';
import { resolveDayzWikiImageFast } from '../services/dayzWikiImageService.js';
import { prepareUploadedImage, prepareRawUploadedImage, makePngBackgroundTransparent } from '../utils/pngTransparency.js';
import { storeCategories as fallbackStoreCategories } from '../data/vanillaStoreData.js';
import {
  createClanFromPlayer,
  getClanHubOverview,
  getMyClanDashboard,
  getPublicClanBySlug,
  getRecruitingClans,
  reviewClanApplication,
  submitClanApplication
} from '../services/clanHubService.js';
import { resetClanRecruitmentSchedule } from '../services/clanRecruitmentDiscordService.js';
import { verifyAndConsumePlayerGameAccessToken } from '../services/gameLoginService.js';
import { getPublicTerritoryKillEventDashboard } from '../services/territoryKillEventService.js';
import { syncPlayerVipFileNow, queueImmediatePlayerFileSync } from '../services/gameApiBridgeService.js';
import { consumeDiscordLinkCode } from '../services/accountLinkService.js';
import { listAvailableClanFlags, registerClanForChampionship, getChampionshipDashboard } from '../services/championshipService.js';
import { getPublicPlatformOverview, getKillfeed } from '../services/platformPublicService.js';

export const publicRoutes = Router();


async function publishVipImmediatelyWithFallback(steam64) {
  try {
    const api = await syncPlayerVipFileNow(steam64);
    if (api?.skipped) {
      queueImmediatePlayerFileSync(steam64);
      return { ok: false, queued: true, skipped: true, error: 'API do servidor indisponível.' };
    }
    return { ok: true, queued: true, api };
  } catch (error) {
    queueImmediatePlayerFileSync(steam64);
    console.error(`[VIP_API_PULL] ${steam64}: estado será buscado pelo mod no próximo poll:`, error.message);
    return { ok: false, queued: true, error: error.message };
  }
}

function wantsJsonResponse(req) {
  const accept = String(req.get('accept') || '').toLowerCase();
  const requestedWith = String(req.get('x-requested-with') || '').toLowerCase();
  return accept.includes('application/json') || requestedWith === 'fetch' || requestedWith === 'xmlhttprequest';
}

function sendCheckoutError(req, res, { productId, quantity, message, status = 400 }) {
  if (wantsJsonResponse(req)) return res.status(status).json({ ok: false, error: message });
  return res.redirect(`/shop/confirm/${productId}?quantity=${encodeURIComponent(quantity || 1)}&error=${encodeURIComponent(message)}`);
}

const STORE_AUX_CACHE_TTL_MS = 60_000;
const STORE_CATALOG_CACHE_TTL_MS = 90_000;
const STORE_CATALOG_STALE_MAX_MS = 10 * 60_000;
const storeCatalogCache = new Map();
const MEDIA_CACHE_MAX_BYTES = 64 * 1024 * 1024;
const MEDIA_CACHE_MAX_ENTRY_BYTES = 8 * 1024 * 1024;
const MEDIA_CACHE_MAX_ENTRIES = 500;
let storeCategoryConfigCache = null;
let storeCategoryConfigCacheExpiresAt = 0;
let storeCategoryConfigRefreshPending = null;
let recruitingClansCache = null;
let recruitingClansCacheExpiresAt = 0;
let recruitingClansRefreshPending = null;
const publicMediaCache = new Map();
let publicMediaCacheBytes = 0;

function getMediaCacheEntry(key) {
  const entry = publicMediaCache.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    publicMediaCache.delete(key);
    publicMediaCacheBytes -= entry.size || 0;
    return null;
  }
  publicMediaCache.delete(key);
  publicMediaCache.set(key, entry);
  return entry;
}

function setMediaCacheEntry(key, entry) {
  const previous = publicMediaCache.get(key);
  if (previous) {
    publicMediaCache.delete(key);
    publicMediaCacheBytes -= previous.size || 0;
  }
  if ((entry.size || 0) > MEDIA_CACHE_MAX_ENTRY_BYTES) return;
  publicMediaCache.set(key, entry);
  publicMediaCacheBytes += entry.size || 0;
  while ((publicMediaCacheBytes > MEDIA_CACHE_MAX_BYTES || publicMediaCache.size > MEDIA_CACHE_MAX_ENTRIES) && publicMediaCache.size) {
    const oldestKey = publicMediaCache.keys().next().value;
    const oldest = publicMediaCache.get(oldestKey);
    publicMediaCache.delete(oldestKey);
    publicMediaCacheBytes -= oldest?.size || 0;
  }
}

function mediaVersion(req) {
  return String(req.query?.v || '').replace(/[^a-z0-9_.-]/gi, '').slice(0, 64);
}

function sendCachedMedia(req, res, entry) {
  res.setHeader('Cache-Control', entry.cacheControl);
  if (entry.redirectUrl) return res.redirect(entry.redirectUrl);
  res.setHeader('Content-Type', entry.mime);
  res.setHeader('Content-Length', String(entry.buffer.length));
  res.setHeader('ETag', entry.etag);
  if (req.get('if-none-match') === entry.etag) return res.status(304).end();
  return res.send(entry.buffer);
}

async function serveDatabaseMedia(req, res, {
  cacheKey,
  ttlMs,
  cacheControl,
  fallbackUrl,
  load,
  makeTransparent = false,
  defaultMime = 'image/png'
}) {
  let entry = getMediaCacheEntry(cacheKey);
  if (!entry) {
    const media = await load();
    if (!media?.imageData) {
      entry = {
        redirectUrl: media?.fallbackUrl || fallbackUrl,
        cacheControl: 'public, max-age=60, stale-while-revalidate=300',
        expiresAt: Date.now() + Math.min(ttlMs, 60_000),
        size: 0
      };
    } else {
      const rawBuffer = Buffer.from(media.imageData, 'base64');
      const isPng = String(media.imageMime || defaultMime).toLowerCase().includes('png');
      const buffer = makeTransparent && isPng ? makePngBackgroundTransparent(rawBuffer) : rawBuffer;
      const mime = makeTransparent && isPng ? 'image/png' : (media.imageMime || defaultMime);
      entry = {
        buffer,
        mime,
        etag: `"${createHash('sha1').update(buffer).digest('hex')}"`,
        cacheControl,
        expiresAt: Date.now() + ttlMs,
        size: buffer.length
      };
    }
    setMediaCacheEntry(cacheKey, entry);
  }
  return sendCachedMedia(req, res, entry);
}

function getRecruitingClansCached() {
  const now = Date.now();
  if (recruitingClansCache && recruitingClansCacheExpiresAt > now) return recruitingClansCache;

  // A vitrine de clãs envolve várias relações e roupas. Ela não pode bloquear a
  // abertura da loja; atualiza em segundo plano e usa o último resultado pronto.
  if (!recruitingClansRefreshPending) {
    recruitingClansRefreshPending = getRecruitingClans({ limit: 5 })
      .then((value) => {
        recruitingClansCache = value;
        recruitingClansCacheExpiresAt = Date.now() + STORE_AUX_CACHE_TTL_MS;
        return value;
      })
      .catch((error) => {
        console.error('[STORE_CLANS_CACHE]', error?.message || error);
        return recruitingClansCache || [];
      })
      .finally(() => { recruitingClansRefreshPending = null; });
  }
  return recruitingClansCache || [];
}

const uploadPublic = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 4 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!String(file.mimetype || '').startsWith('image/')) return cb(new Error('Envie apenas arquivo de imagem.'));
    cb(null, true);
  }
});

function assertPlayerHasProfileAvatar(player, actionLabel = 'usar a área de clãs') {
  if (!player?.hasAvatar && !player?.avatarMime) {
    throw new Error(`Para ${actionLabel}, envie primeiro uma imagem de perfil em Minha conta.`);
  }
}

const DEFAULT_STORE_CATEGORIES = fallbackStoreCategories.map((cat, index) => ({
  name: cat.name,
  serverType: cat.serverType || 'vanilla',
  order: Number.isFinite(Number(cat.order)) ? Number(cat.order) : (index + 1) * 10,
  active: cat.active !== false
}));

const INCLUDE_UNREGISTERED_PRODUCT_CATEGORIES = ['1', 'true', 'yes', 'sim', 'on'].includes(String(process.env.SHOW_UNREGISTERED_PRODUCT_CATEGORIES || '').toLowerCase());

function normalizeCategoryName(value) {
  return String(value || '').trim().replace(/\s+/g, ' ');
}

function normalizeServerType(value) {
  const v = String(value || '').trim().toLowerCase();
  return ['all', 'vanilla', 'bbp'].includes(v) ? v : 'all';
}

function stripAccents(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function categoryKey(value) {
  return stripAccents(normalizeCategoryName(value)).toLowerCase();
}

function canonicalCategoryName(value) {
  const name = normalizeCategoryName(value);
  const low = categoryKey(name);
  if (!low || low === 'geral' || low === 'geral dayz' || low === 'itens da loja' || low === 'sem categoria') return 'Diversos';
  if (low === 'equipamento') return 'Equipamentos';
  if ((low.includes('peca') && low.includes('veicul')) || low === 'pecas') return 'Peças de Veículos';
  if (low === 'veiculos disponiveis') return 'Veículos';
  return name;
}

function normalizeCategoryConfig(value) {
  const source = Array.isArray(value?.categories) ? value.categories : (Array.isArray(value) ? value : []);
  const base = source.length ? source : DEFAULT_STORE_CATEGORIES;
  const seen = new Set();
  const items = [];
  base.forEach((entry, idx) => {
    const name = canonicalCategoryName(entry?.name);
    const serverType = normalizeServerType(entry?.serverType || 'all');
    const normalizedKey = categoryKey(name);
    const sleepingBagCategory = (normalizedKey.includes('saco') && normalizedKey.includes('dormir'))
      || normalizedKey.includes('sleeping bag')
      || normalizedKey.includes('sleepingbag');
    if (!name || entry?.active === false || sleepingBagCategory) return;
    const key = `${serverType}::${name.toLowerCase()}`;
    if (seen.has(key)) return;
    seen.add(key);
    items.push({ name, serverType, order: Number.isFinite(Number(entry?.order)) ? Number(entry.order) : idx * 10, icon: String(entry?.icon || '').trim() || '📦', color: String(entry?.color || '').trim() || '#ef4444', active: true });
  });
  items.sort((a, b) => a.order - b.order || a.name.localeCompare(b.name, 'pt-BR'));
  return { categories: items };
}

async function getStoreCategoriesConfig() {
  const now = Date.now();
  if (storeCategoryConfigCache && storeCategoryConfigCacheExpiresAt > now) return storeCategoryConfigCache;

  const refresh = () => {
    if (!storeCategoryConfigRefreshPending) {
      storeCategoryConfigRefreshPending = prisma.appSetting.findUnique({ where: { key: 'store_categories_v1' } })
        .then((saved) => {
          storeCategoryConfigCache = normalizeCategoryConfig(saved?.value || {});
          storeCategoryConfigCacheExpiresAt = Date.now() + STORE_AUX_CACHE_TTL_MS;
          return storeCategoryConfigCache;
        })
        .finally(() => { storeCategoryConfigRefreshPending = null; });
    }
    return storeCategoryConfigRefreshPending;
  };

  // Depois da primeira carga, uma expiração de cache nunca mais segura a loja.
  // A configuração antiga continua sendo servida enquanto a atualização ocorre.
  if (storeCategoryConfigCache) {
    void refresh().catch((error) => console.error('[STORE_CATEGORY_CACHE]', error?.message || error));
    return storeCategoryConfigCache;
  }
  return refresh();
}

async function getVisibleStoreCategories(serverType, includeProductCategories = []) {
  const config = await getStoreCategoriesConfig();
  const seen = new Set();
  const result = [];
  const dynamicProductCategories = INCLUDE_UNREGISTERED_PRODUCT_CATEGORIES
    ? includeProductCategories.map((name, idx) => ({ name, serverType: 'all', order: 1000 + idx }))
    : [];
  [...config.categories, ...dynamicProductCategories].forEach((entry) => {
    const name = canonicalCategoryName(entry?.name);
    const categoryServer = normalizeServerType(entry?.serverType || 'all');
    if (!name) return;
    if (!(categoryServer === 'all' || categoryServer === serverType)) return;
    const key = name.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    result.push({ name, serverType: categoryServer, order: Number(entry?.order || 0), icon: entry?.icon || '📦', color: entry?.color || '#ef4444' });
  });
  const requiredCategoryTabs = [
    { name: 'Construção', serverType: 'vanilla', order: 10, icon: '🧱', color: '#f97316' },
    { name: 'Veículos', serverType: 'vanilla', order: 20, icon: '🚙', color: '#ef4444' },
    { name: 'Trajes VIPs', serverType: 'vanilla', order: 30, icon: '🎖️', color: '#a855f7' },
    { name: 'Armazenamento', serverType: 'vanilla', order: 40, icon: '📦', color: '#38bdf8' },
    { name: 'Diversos', serverType: 'vanilla', order: 50, icon: '🧰', color: '#f59e0b' }
  ];
  requiredCategoryTabs.forEach((entry) => {
    if (!(entry.serverType === 'all' || entry.serverType === serverType)) return;
    const name = canonicalCategoryName(entry.name);
    const key = name.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    result.push({ ...entry, name });
  });
  return result.sort((a, b) => a.order - b.order || a.name.localeCompare(b.name, 'pt-BR'));
}

function isVehicleStoreCategory(value) {
  const key = categoryKey(value);
  return ['veiculos', 'veiculo', 'veiculos disponiveis'].includes(key);
}

async function loadStoreCatalogSnapshot({ selectedServer }) {
  const globalPromoPromise = getGlobalPromo(prisma);

  // Produtos e veículos são carregados juntos e em paralelo. Assim, a primeira
  // troca para qualquer categoria usa o mesmo snapshot e não abre uma nova fila
  // de consultas no PostgreSQL.
  const [allProducts, globalPromo, vehicleTemplates, globalVehiclePlans, starterKit] = await Promise.all([
    listActiveProducts({ serverType: selectedServer, globalPromo: globalPromoPromise }),
    globalPromoPromise,
    prisma.vehicleTemplate.findMany({
      where: { active: true, serverType: selectedServer },
      omit: { imageData: true },
      include: {
        insurancePlans: {
          where: { active: true, billingType: 'SUBSCRIPTION' },
          orderBy: [{ priceCoins: 'asc' }]
        }
      },
      orderBy: [{ buyPriceCoins: 'asc' }, { name: 'asc' }]
    }),
    prisma.vehicleInsurancePlan.findMany({
      where: { active: true, templateId: null, billingType: 'SUBSCRIPTION' },
      orderBy: [{ priceCoins: 'asc' }]
    }),
    getStarterKit()
  ]);

  const categoriesDetailed = await getVisibleStoreCategories(
    selectedServer,
    allProducts.map(product => product.category)
  );
  return {
    allProducts,
    categoriesDetailed,
    globalPromo,
    vehicleTemplates,
    globalVehiclePlans,
    starterKit,
    recruitingClans: getRecruitingClansCached()
  };
}

async function getStoreCatalogSnapshot(input) {
  const key = String(input.selectedServer || 'vanilla');
  const now = Date.now();
  const cached = storeCatalogCache.get(key);
  if (cached?.value && cached.expiresAt > now) return cached.value;

  const refresh = () => {
    const current = storeCatalogCache.get(key);
    if (current?.pending) return current.pending;
    const pending = loadStoreCatalogSnapshot(input)
      .then((value) => {
        storeCatalogCache.set(key, {
          value,
          expiresAt: Date.now() + STORE_CATALOG_CACHE_TTL_MS,
          staleUntil: Date.now() + STORE_CATALOG_STALE_MAX_MS
        });
        return value;
      })
      .catch((error) => {
        const last = storeCatalogCache.get(key);
        if (last?.value) {
          storeCatalogCache.set(key, { ...last, pending: null });
          return last.value;
        }
        storeCatalogCache.delete(key);
        throw error;
      });
    storeCatalogCache.set(key, {
      ...(current || {}),
      pending,
      expiresAt: current?.expiresAt || 0,
      staleUntil: current?.staleUntil || 0
    });
    return pending;
  };

  // Stale-while-revalidate: mesmo no instante em que o cache vence, o player
  // recebe a loja pronta e a atualização do catálogo acontece em segundo plano.
  if (cached?.value && (cached.staleUntil || 0) > now) {
    void refresh().catch((error) => console.error('[STORE_CATALOG_CACHE]', error?.message || error));
    return cached.value;
  }
  return refresh();
}

async function renderStore(req, res, title = 'Loja') {
  const selectedServer = 'vanilla';
  const selectedCategoryRaw = String(req.query.category || 'Construção').trim() || 'Construção';
  const requestedCategory = canonicalCategoryName(selectedCategoryRaw);
  const requestedKey = categoryKey(requestedCategory);
  const sleepingBagCategory = (requestedKey.includes('saco') && requestedKey.includes('dormir'))
    || requestedKey.includes('sleeping bag')
    || requestedKey.includes('sleepingbag');
  const selectedCategory = sleepingBagCategory ? 'Construção' : requestedCategory;
  const isVehicleCategory = isVehicleStoreCategory(selectedCategory);

  const [catalog, starterKitClaimed] = await Promise.all([
    getStoreCatalogSnapshot({ selectedServer }),
    req.player?.id ? hasClaimedStarterKitFast(req.player.id, req.player.steam64) : Promise.resolve(false)
  ]);
  const {
    allProducts,
    categoriesDetailed: categories,
    globalPromo,
    vehicleTemplates,
    globalVehiclePlans,
    starterKit,
    recruitingClans
  } = catalog;
  const products = isVehicleCategory
    ? []
    : allProducts.filter(product => categoryKey(canonicalCategoryName(product.category)) === categoryKey(selectedCategory));

  res.render('shop', {
    title,
    products,
    allProducts,
    categories: categories.map(c => c.name),
    categoriesDetailed: categories,
    selectedServer,
    selectedCategory,
    globalPromo,
    isVehicleCategory,
    vehicleTemplates: vehicleTemplates.map(vehicle => ({ ...vehicle, hasImageData: Boolean(vehicle.imageMime) })),
    globalVehiclePlans,
    starterKit: starterKit ? { ...starterKit, hasImageData: Boolean(starterKit.imageData), imageData: null } : starterKit,
    starterKitClaimed,
    recruitingClans
  });
}

publicRoutes.get('/', async (req, res, next) => {
  try {
    const overview = await getPublicPlatformOverview();
    return res.render('home', { title: 'CHAMPIONS Z • Competitivo', ...overview });
  } catch (err) {
    next(err);
  }
});

publicRoutes.get('/login', (req, res) => {
  if (req.player) return res.redirect('/wallet');
  res.render('playerLogin', {
    title: 'Acesso somente pelo jogo',
    error: req.query.error || null
  });
});

// V153: login e cadastro manual foram removidos. Nenhum formulário aceita
// Steam64 ou senha; a sessão só pode ser criada pelo link de uso único do DayZ.
publicRoutes.post(['/login', '/register'], (req, res) => {
  res.redirect('/login?error=' + encodeURIComponent('Acesso manual removido. Abra a loja pelo L dentro do servidor.'));
});

publicRoutes.get(['/auth/steam', '/auth/steam/callback', '/register'], (req, res) => {
  res.redirect('/login');
});

publicRoutes.get('/from-game', async (req, res) => {
  try {
    // V75: acesso normal usa token de uso único emitido pela API para o mod.
    // O link legado com Steam64 direto fica desativado por padrão.
    res.setHeader('Cache-Control', 'no-store, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Referrer-Policy', 'no-referrer');

    const rawToken = String(req.query.token || '').trim();
    const directSteam64 = String(req.query.steam64 || req.query.steamId || '').trim();

    let gameLogin = null;
    if (rawToken) {
      gameLogin = await verifyAndConsumePlayerGameAccessToken(rawToken);
      if (!gameLogin) {
        return res.redirect('/login?error=' + encodeURIComponent('Link inválido, expirado ou já utilizado. Abra novamente pelo I ou L dentro do DayZ.'));
      }
    } else if (directSteam64 && env.allowLegacyGameSteam64Login) {
      if (!/^7656119\d{10}$/.test(directSteam64)) {
        return res.redirect('/login?error=' + encodeURIComponent('Steam64 inválido recebido do jogo. Abra novamente pelo I ou L dentro do DayZ.'));
      }

      // Um navegador que já está autenticado nunca pode trocar para a conta de
      // outro Steam64 apenas editando o endereço. Para trocar de player é preciso
      // abrir a loja pelo jogo em uma sessão limpa do navegador.
      if (req.player?.steam64 && req.player.steam64 !== directSteam64) {
        return res.redirect('/?error=' + encodeURIComponent('Troca de conta bloqueada: o Steam64 do link não corresponde à sessão já autenticada.'));
      }

      gameLogin = {
        steam64: directSteam64,
        nickname: '',
        serverType: 'vanilla',
        source: 'dayz-direct-link'
      };
    } else {
      return res.redirect('/login?error=' + encodeURIComponent('Link incompleto. Abra novamente pelo I ou L dentro do DayZ.'));
    }

    const [player, approvedStreamer] = await Promise.all([
      loginPlayerFromGame({
        res,
        steam64: gameLogin.steam64,
        nickname: gameLogin.nickname || '',
        overwriteNickname: Boolean(gameLogin.nickname)
      }),
      prisma.streamerCode.findFirst({
        where: { streamerSteam64: gameLogin.steam64, active: true },
        select: { id: true, code: true, streamerName: true },
        orderBy: { updatedAt: 'desc' }
      })
    ]);
    primeStreamerAccessCache(gameLogin.steam64, approvedStreamer);

    if (approvedStreamer) {
      return res.redirect('/streamer?success=' + encodeURIComponent('Painel streamer liberado automaticamente pelo Steam64 confirmado no DayZ.'));
    }

    return res.redirect('/?success=' + encodeURIComponent('Conta confirmada automaticamente pelo servidor DayZ.'));
  } catch (err) {
    return res.redirect('/login?error=' + encodeURIComponent(err.message));
  }
});

// Não existe troca manual de Steam64 dentro do site.
publicRoutes.post('/player/save', (req, res) => {
  res.redirect('/login?error=' + encodeURIComponent('O Steam64 só pode ser confirmado pelo jogo.'));
});

publicRoutes.post('/player/logout', async (req, res) => {
  try {
    await clearPlayerCookie(req, res);
  } catch {
    res.clearCookie('sz_player_token', { path: '/' });
  }
  res.redirect('/');
});

publicRoutes.get('/profile', requirePlayer, (req, res) => {
  res.redirect('/wallet#perfil-player');
});

publicRoutes.post('/profile', requirePlayer, uploadPublic.single('avatar'), async (req, res) => {
  try {
    const image = prepareRawUploadedImage(req.file);
    if (!image && !req.player.hasAvatar && !req.player.avatarMime) {
      throw new Error('Envie uma imagem de perfil para liberar a área de clãs.');
    }
    const nickname = String(req.body.nickname || '').trim().slice(0, 100);
    const profileBio = String(req.body.profileBio || '').trim().slice(0, 400) || null;
    const updateData = {
      nickname: nickname || req.player.nickname || null,
      profileBio
    };
    if (image) {
      updateData.avatarData = image.imageData;
      updateData.avatarMime = image.imageMime;
    }
    await prisma.player.update({ where: { id: req.player.id }, data: updateData });
    res.redirect('/wallet?success=' + encodeURIComponent('Perfil atualizado com sucesso.') + '#perfil-player');
  } catch (err) {
    res.redirect('/wallet?error=' + encodeURIComponent(err.message) + '#perfil-player');
  }
});


publicRoutes.get('/outfits', async (req, res, next) => {
  try {
    const [outfits, activeOutfit, starterVipBenefit] = await Promise.all([
      listOutfitTemplates({ serverType: 'vanilla', catalogOnly: true }),
      req.player?.steam64 ? getActiveOutfitForPlayer(req.player.steam64, 'vanilla') : null,
      req.player?.id ? getStarterVipBenefitStatus(req.player.id) : Promise.resolve({ eligible: false, used: false, reason: 'Abra a loja pelo jogo.' })
    ]);
    res.render('outfits', {
      title: 'Trajes VIP',
      outfits,
      activeOutfit,
      starterVipBenefit,
      streamerCode: String(req.query.streamer || req.query.code || '').trim(),
      success: req.query.success || null,
      error: req.query.error || null
    });
  } catch (err) { next(err); }
});

publicRoutes.post('/outfits/buy', requirePlayer, async (req, res) => {
  try {
    const result = await buyOutfitSubscription({ playerId: req.player.id, outfitId: req.body.outfitId });
    void publishVipImmediatelyWithFallback(result.player.steam64).catch((error) => {
      console.error('[VIP_API_ASYNC]', error?.message || error);
    });
    const apiText = ' O VIP será recebido pelo mod no próximo ciclo da API.';
    res.redirect('/outfits?success=' + encodeURIComponent(`Assinatura ativada: ${result.outfit.name}.${apiText}`));
  } catch (err) {
    res.redirect('/outfits?error=' + encodeURIComponent(err.message));
  }
});

publicRoutes.post('/outfits/streamer-reward', requirePlayer, async (req, res) => {
  res.redirect('/outfits?error=' + encodeURIComponent('Recompensa automática de streamer está desativada na base limpa.'));
});

publicRoutes.post('/outfits/free-7d', requirePlayer, async (req, res) => {
  try {
    const result = await claimStarterVip7d({ playerId: req.player.id, outfitId: req.body.outfitId });
    void publishVipImmediatelyWithFallback(result.player.steam64).catch((error) => {
      console.error('[VIP_FREE_API_ASYNC]', error?.message || error);
    });
    const apiText = ' O VIP será recebido pelo mod no próximo ciclo da API.';
    return res.redirect('/outfits?success=' + encodeURIComponent(`VIP grátis ativado por 7 dias: ${result.outfit.name}.${apiText}`));
  } catch (err) {
    return res.redirect('/outfits?error=' + encodeURIComponent(err?.message || 'Não foi possível ativar o VIP grátis.'));
  }
});

publicRoutes.post('/outfits/custom-order', requirePlayer, async (req, res) => {
  res.redirect('/outfits?error=' + encodeURIComponent('A compra de traje VIP personalizado está temporariamente desativada.'));
});

publicRoutes.get('/clan-outfit', requirePlayer, async (req, res, next) => {
  try {
    const [allManaged, customOrders] = await Promise.all([
      listManagedOutfitsForOwner(req.player.steam64),
      getCustomOutfitOrdersForPlayer(req.player.steam64)
    ]);
    res.render('clanOutfit', {
      title: 'Traje personalizado do clã',
      managedOutfits: allManaged.filter(outfit => outfit.ownerType === 'CLAN'),
      customOrders,
      managerReturnTo: '/clan-outfit',
      success: req.query.success || null,
      error: req.query.error || null
    });
  } catch (err) { next(err); }
});

function managedReturnTo(value) {
  return String(value || '') === '/streamer' ? '/streamer' : '/clan-outfit';
}

publicRoutes.post('/managed-outfits/:id/members/add', requirePlayer, async (req, res) => {
  const back = managedReturnTo(req.body.returnTo);
  try {
    const result = await addManagedOutfitMember({ outfitId: req.params.id, ownerPlayerId: req.player.id, memberSteam64: req.body.memberSteam64, nickname: req.body.nickname });
    const paid = result.chargedCoins > 0 ? ` Foi cobrado ${result.chargedCoins.toLocaleString('pt-BR')} ${env.currencyName} por 30 dias.` : ' A liberação é gratuita para o streamer.';
    res.redirect(back + '?success=' + encodeURIComponent(`${result.member.nickname || result.member.steam64} foi liberado no traje.${paid}`));
  } catch (err) {
    res.redirect(back + '?error=' + encodeURIComponent(err.message));
  }
});

publicRoutes.post('/managed-outfits/members/:subscriptionId/renew', requirePlayer, async (req, res) => {
  const back = managedReturnTo(req.body.returnTo);
  try {
    const result = await renewManagedOutfitMember({ subscriptionId: req.params.subscriptionId, ownerPlayerId: req.player.id });
    res.redirect(back + '?success=' + encodeURIComponent(`Mensalidade renovada por ${result.price.toLocaleString('pt-BR')} ${env.currencyName}. O player continua liberado por mais 30 dias.`));
  } catch (err) {
    res.redirect(back + '?error=' + encodeURIComponent(err.message));
  }
});

publicRoutes.post('/managed-outfits/members/:subscriptionId/remove', requirePlayer, async (req, res) => {
  const back = managedReturnTo(req.body.returnTo);
  try {
    const result = await removeManagedOutfitMember({ subscriptionId: req.params.subscriptionId, ownerPlayerId: req.player.id });
    res.redirect(back + '?success=' + encodeURIComponent(`Steam64 ${result.subscription.steam64} removido. O traje foi bloqueado imediatamente para esse player.`));
  } catch (err) {
    res.redirect(back + '?error=' + encodeURIComponent(err.message));
  }
});

publicRoutes.post('/managed-outfits/:id/flag-request', requirePlayer, async (req, res) => {
  const back = managedReturnTo(req.body.returnTo);
  try {
    const result = await requestManagedOutfitFlag({ outfitId: req.params.id, ownerPlayerId: req.player.id });
    res.redirect(back + '?success=' + encodeURIComponent(`Bandeira ${result.request.flagClassname} enviada para dropar no seu pé. Ela é entregue separadamente e não vem dentro do traje.`));
  } catch (err) {
    res.redirect(back + '?error=' + encodeURIComponent(err.message));
  }
});








publicRoutes.get('/outfit-image/:id', async (req, res, next) => {
  try {
    return await serveDatabaseMedia(req, res, {
      cacheKey: `outfit:${req.params.id}:${mediaVersion(req)}`,
      ttlMs: 5 * 60_000,
      cacheControl: 'public, max-age=300, stale-while-revalidate=3600',
      fallbackUrl: '/images/no-real-image.svg',
      load: async () => {
        const outfit = await prisma.outfitTemplate.findUnique({
          where: { id: req.params.id },
          select: { imageData: true, imageMime: true, imageUrl: true }
        });
        return { ...outfit, fallbackUrl: outfit?.imageUrl || '/images/no-real-image.svg' };
      }
    });
  } catch (err) { next(err); }
});

publicRoutes.get('/streamer', requirePlayer, requireStreamerAccess, async (req, res, next) => {
  try {
    const [streamerDashboard, allManaged] = await Promise.all([
      getStreamerDashboardBySteam64(req.player.steam64),
      listManagedOutfitsForOwner(req.player.steam64)
    ]);
    res.render('streamer', {
      title: 'Painel de Apoio Streamer',
      streamerDashboard,
      managedOutfits: allManaged.filter(outfit => outfit.ownerType === 'STREAMER'),
      managerReturnTo: '/streamer',
      loginCode: streamerDashboard.streamerCode.code,
      loginSteam64: req.player.steam64,
      error: req.query.error || null,
      success: req.query.success || null,
      deathmatchLocked: true
    });
  } catch (err) {
    res.redirect('/shop?serverType=vanilla&error=' + encodeURIComponent(err.message));
  }
});

// A entrada manual foi desativada. O painel só aceita a sessão criada quando o
// streamer abre o site pelo L dentro do DayZ.
publicRoutes.post('/streamer/login', (req, res) => {
  res.redirect('/shop?serverType=vanilla&error=' + encodeURIComponent('Entrada manual do painel streamer foi removida. Abra pelo L dentro do servidor.'));
});

publicRoutes.post('/streamer/request-payout', requirePlayer, requireStreamerAccess, async (req, res) => {
  try {
    const dashboard = await getStreamerDashboardBySteam64(req.player.steam64);
    const payout = await requestStreamerWeeklyPayout({
      code: dashboard.streamerCode.code,
      steam64: req.player.steam64
    });
    const amount = Number(payout.amountBrl || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    res.redirect('/streamer?success=' + encodeURIComponent('Solicitação semanal enviada para o ADM. Valor aproximado: ' + amount + '.'));
  } catch (err) {
    res.redirect('/streamer?error=' + encodeURIComponent(err.message));
  }
});

publicRoutes.post('/streamer/mappings', async (req, res) => {
  res.redirect('/streamer?error=' + encodeURIComponent('Painel Death Match está bloqueado por enquanto. Use esta aba só para apoio streamer.'));
});


publicRoutes.get('/vincular', requirePlayer, (req, res) => {
  res.render('linkAccount', { title: 'Vincular Discord', linked: Boolean(req.player.discordId) });
});

publicRoutes.post('/vincular', requirePlayer, async (req, res) => {
  try {
    const result = await consumeDiscordLinkCode({ playerId: req.player.id, code: req.body.code });
    res.redirect('/vincular?success=' + encodeURIComponent(`Discord ${result.discordUsername || result.discordId} vinculado com sucesso.`));
  } catch (err) {
    res.redirect('/vincular?error=' + encodeURIComponent(err.message));
  }
});

publicRoutes.get('/campeonato', async (req, res, next) => {
  try {
    const dashboard = await getChampionshipDashboard();
    res.render('championship', { title: 'Campeonato', ...dashboard });
  } catch (err) { next(err); }
});

publicRoutes.get('/championship-result-image/:id', async (req, res) => {
  const result = await prisma.championshipResult.findUnique({ where: { id: req.params.id }, select: { imageData: true, imageMime: true } }).catch(() => null);
  if (!result?.imageData) return res.status(404).end();
  res.type(result.imageMime || 'image/jpeg').send(Buffer.from(result.imageData, 'base64'));
});

publicRoutes.get('/killfeed', async (req, res, next) => {
  try {
    const kills = await getKillfeed({ limit: 120 });
    res.render('killfeed', { title: 'Killfeed', kills });
  } catch (err) { next(err); }
});

publicRoutes.get('/killfeed/data', async (req, res) => {
  try {
    const kills = await getKillfeed({ limit: 50 });
    res.json({ ok: true, kills: kills.map(k => ({
      id: k.id, killer: k.killerName || k.killerSteam64, victim: k.victimName || k.victimSteam64,
      killerClan: k.killerClan?.tag || null, victimClan: k.victimClan?.tag || null,
      weapon: k.weapon, distanceMeters: k.distanceMeters, headshot: k.headshot,
      killerPosition: [k.killerPosX, k.killerPosY, k.killerPosZ], victimPosition: [k.victimPosX, k.victimPosY, k.victimPosZ],
      occurredAt: k.occurredAt
    })) });
  } catch (err) { res.status(500).json({ ok: false, error: 'Falha ao carregar killfeed.' }); }
});

publicRoutes.get('/clan-flag-option/:id', async (req, res) => {
  const flag = await prisma.clanFlagOption.findUnique({ where: { id: req.params.id }, select: { imageData: true, imageMime: true } }).catch(() => null);
  if (!flag?.imageData) return res.status(404).end();
  res.type(flag.imageMime || 'image/png').send(Buffer.from(flag.imageData, 'base64'));
});

publicRoutes.get('/eventos', async (req, res, next) => {
  try {
    const eventDashboard = await getPublicTerritoryKillEventDashboard({
      playerSteam64: req.player?.steam64 || null,
      serverType: req.query.serverType || 'vanilla'
    });
    res.render('events', { title: 'Evento de Kills', eventDashboard });
  } catch (err) {
    next(err);
  }
});

publicRoutes.get('/ranking', async (req, res, next) => {
  try {
    const data = await getRankingData({ server: req.query.server, period: req.query.period, playerId: req.player?.id || null });
    res.render('ranking', { title: 'Ranking', ...data });
  } catch (err) {
    next(err);
  }
});

publicRoutes.get('/ranking/me', requirePlayer, (req, res) => {
  const server = ['global', 'vanilla', 'bbp', 'deathmatch'].includes(String(req.query.server || '').toLowerCase())
    ? String(req.query.server).toLowerCase()
    : 'global';
  res.redirect(`/ranking/player/${req.player.steam64}?server=${server}`);
});

publicRoutes.get('/ranking/player/:steam64', async (req, res, next) => {
  try {
    const data = await getPlayerRankingProfile({
      steam64: req.params.steam64,
      server: req.query.server,
      viewerPlayerId: req.player?.id || null,
      historyPage: req.query.page
    });
    if (!data) {
      return res.status(404).render('error', {
        title: 'Player não encontrado',
        message: `Esse player ainda não possui histórico competitivo no ${env.appName}.`
      });
    }
    return res.render('playerRankingProfile', { title: `${data.profilePlayer.nickname} • Perfil competitivo`, ...data });
  } catch (err) {
    return next(err);
  }
});

publicRoutes.get('/clans', async (req, res, next) => {
  try {
    const data = await getClanHubOverview({ playerId: req.player?.id || null });
    res.render('clans', { title: 'Clãs & Recrutamento', ...data });
  } catch (err) {
    next(err);
  }
});

publicRoutes.post('/clans/create', requirePlayer, uploadPublic.fields([{ name: 'flagImage', maxCount: 1 }, { name: 'bannerImage', maxCount: 1 }]), async (req, res) => {
  try {
    assertPlayerHasProfileAvatar(req.player, 'criar um clã');
    const flagImage = prepareRawUploadedImage(req.files?.flagImage?.[0]);
    const bannerImage = prepareRawUploadedImage(req.files?.bannerImage?.[0]);
    const clan = await createClanFromPlayer({
      player: req.player,
      data: {
        ...req.body,
        ...(flagImage ? { flagData: flagImage.imageData, flagMime: flagImage.imageMime } : {}),
        ...(bannerImage ? { bannerData: bannerImage.imageData, bannerMime: bannerImage.imageMime } : {})
      }
    });
    res.redirect('/my-clan?success=' + encodeURIComponent(`Clã [${clan.tag}] ${clan.name} criado com sucesso.`));
  } catch (err) {
    res.redirect('/clans?error=' + encodeURIComponent(err.message) + '#criar-cla');
  }
});

publicRoutes.get('/clans/:slug', async (req, res, next) => {
  try {
    const data = await getPublicClanBySlug(req.params.slug, req.player?.id || null);
    if (!data?.clan) return res.status(404).render('error', { title: 'Clã não encontrado', message: 'Esse clã não existe ou foi removido.' });
    res.render('clanDetail', { title: `${data.clan.name} • Clã`, ...data });
  } catch (err) {
    next(err);
  }
});

publicRoutes.post('/clans/:slug/apply', requirePlayer, async (req, res) => {
  try {
    assertPlayerHasProfileAvatar(req.player, 'entrar em um clã');
    const data = await getPublicClanBySlug(req.params.slug, req.player.id);
    if (!data?.clan) throw new Error('Clã não encontrado.');
    await submitClanApplication({
      clanId: data.clan.id,
      playerId: req.player.id,
      steam64: req.player.steam64,
      requesterName: req.player.nickname,
      inGameName: req.body.inGameName,
      message: req.body.message
    });
    res.redirect(`/clans/${data.clan.slug}?success=` + encodeURIComponent('Solicitação enviada para o dono do clã.'));
  } catch (err) {
    res.redirect(`/clans/${encodeURIComponent(req.params.slug)}?error=` + encodeURIComponent(err.message) + '#form-recrutamento');
  }
});

publicRoutes.post('/clans/:slug/vip/buy', requirePlayer, async (req, res) => {
  res.redirect(`/clans/${encodeURIComponent(req.params.slug)}?error=` + encodeURIComponent('Compras de VIP/trajes foram removidas do site CHAMPIONS Z.'));
});

publicRoutes.post('/clans/request', requirePlayer, async (req, res) => {
  res.redirect('/clans#criar-cla');
});

publicRoutes.get('/my-clan', requirePlayer, async (req, res, next) => {
  try {
    const [membership, availableFlags] = await Promise.all([getMyClanDashboard(req.player.id), listAvailableClanFlags()]);
    res.render('myClan', { title: 'Meu Clã', membership, badges: membership?.badges || [], availableFlags });
  } catch (err) {
    next(err);
  }
});

publicRoutes.post('/my-clan/update', requirePlayer, uploadPublic.fields([{ name: 'flagImage', maxCount: 1 }, { name: 'bannerImage', maxCount: 1 }]), async (req, res) => {
  try {
    const membership = await getMyClanDashboard(req.player.id);
    if (!canManageClan(membership)) throw new Error('Apenas dono ou sub dono pode editar o clã.');
    const flagImage = prepareRawUploadedImage(req.files?.flagImage?.[0]);
    const bannerImage = prepareRawUploadedImage(req.files?.bannerImage?.[0]);
    const nextName = String(req.body.name || '').trim().slice(0, 80) || membership.clan.name;
    const nextTag = String(req.body.tag || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8) || membership.clan.tag;
    if (membership.role === 'OWNER') {
      const duplicate = await prisma.clan.findFirst({ where: { id: { not: membership.clanId }, tag: nextTag, serverType: membership.clan.serverType, status: 'ACTIVE' } });
      if (duplicate) throw new Error('Já existe outro clã com essa TAG.');
    }
    const nextIsRecruiting = ['1', 'true', 'on', 'sim', 'yes'].includes(String(req.body.isRecruiting || '').toLowerCase());
    await prisma.clan.update({
      where: { id: membership.clanId },
      data: {
        ...(membership.role === 'OWNER' ? { name: nextName, tag: nextTag } : {}),
        description: String(req.body.description || '').trim().slice(0, 1200) || null,
        isRecruiting: nextIsRecruiting,
        recruitmentTitle: String(req.body.recruitmentTitle || '').trim().slice(0, 120) || null,
        recruitmentMessage: String(req.body.recruitmentMessage || '').trim().slice(0, 1200) || null,
        recruitmentRequirements: String(req.body.recruitmentRequirements || '').trim().slice(0, 1200) || null,
        recruitmentContact: String(req.body.recruitmentContact || '').trim().slice(0, 160) || null,
        accentColor: /^#[0-9a-f]{6}$/i.test(String(req.body.accentColor || '')) ? String(req.body.accentColor) : membership.clan.accentColor,
        flagUrl: String(req.body.flagUrl || '').trim() || membership.clan.flagUrl || null,
        ...(flagImage ? { flagData: flagImage.imageData, flagMime: flagImage.imageMime } : {}),
        ...(bannerImage ? { bannerData: bannerImage.imageData, bannerMime: bannerImage.imageMime } : {})
      }
    });
    if (!membership.clan.isRecruiting && nextIsRecruiting) {
      await resetClanRecruitmentSchedule(membership.clanId);
    }
    res.redirect('/my-clan?success=' + encodeURIComponent('Clã atualizado com sucesso.'));
  } catch (err) {
    res.redirect('/my-clan?error=' + encodeURIComponent(err.message));
  }
});

publicRoutes.post('/my-clan/members/add', requirePlayer, async (req, res) => {
  try {
    const membership = await getMyClanDashboard(req.player.id);
    if (!canManageClan(membership)) throw new Error('Apenas dono ou sub dono pode adicionar membros.');
    const steam64 = String(req.body.steam64 || '').trim();
    if (!/^\d{17}$/.test(steam64)) throw new Error('Steam64 inválido.');
    const activeCount = await prisma.clanMember.count({ where: { clanId: membership.clanId, status: 'ACTIVE' } });
    if (activeCount >= 5) throw new Error('O clã já atingiu o limite máximo de 5 integrantes.');
    const player = await upsertPlayerBySteam64({ steam64, nickname: req.body.nickname || '' });
    const otherClan = await prisma.clanMember.findFirst({ where: { playerId: player.id, status: 'ACTIVE', clanId: { not: membership.clanId }, clan: { status: 'ACTIVE' } }, include: { clan: true } });
    if (otherClan) throw new Error(`Esse player já está no clã [${otherClan.clan.tag}] ${otherClan.clan.name}.`);
    const isCanonicalOwner = membership.clan.ownerPlayerId === player.id;
    await prisma.clanMember.upsert({
      where: { clanId_playerId: { clanId: membership.clanId, playerId: player.id } },
      update: { status: 'ACTIVE', steam64: player.steam64, ...(isCanonicalOwner ? { role: 'OWNER' } : {}) },
      create: { clanId: membership.clanId, playerId: player.id, steam64: player.steam64, role: isCanonicalOwner ? 'OWNER' : 'MEMBER', status: 'ACTIVE' }
    });
    const vipSync = await syncClanManagedOutfitAccess(membership.clanId);
    const vipText = vipSync.outfit ? ` O traje VIP personalizado ${vipSync.outfit.name} foi liberado automaticamente.` : '';
    res.redirect('/my-clan?success=' + encodeURIComponent('Player adicionado ao clã.' + vipText));
  } catch (err) {
    res.redirect('/my-clan?error=' + encodeURIComponent(err.message));
  }
});

publicRoutes.post('/my-clan/members/:memberId/remove', requirePlayer, async (req, res) => {
  try {
    const membership = await getMyClanDashboard(req.player.id);
    if (!canManageClan(membership)) throw new Error('Apenas dono ou sub dono pode remover membros.');
    const target = await prisma.clanMember.findUnique({ where: { id: req.params.memberId } });
    if (!target || target.clanId !== membership.clanId) throw new Error('Membro não encontrado.');
    if (target.role === 'OWNER' || target.playerId === membership.clan.ownerPlayerId) throw new Error('Não dá para remover o dono do clã por aqui.');
    await prisma.clanMember.update({ where: { id: target.id }, data: { status: 'REMOVED' } });
    await syncClanManagedOutfitAccess(membership.clanId);
    res.redirect('/my-clan?success=' + encodeURIComponent('Membro removido e acesso ao traje VIP do clã retirado.'));
  } catch (err) {
    res.redirect('/my-clan?error=' + encodeURIComponent(err.message));
  }
});

publicRoutes.post('/my-clan/members/:memberId/sub-owner', requirePlayer, async (req, res) => {
  try {
    const membership = await getMyClanDashboard(req.player.id);
    if (!membership || membership.role !== 'OWNER') throw new Error('Apenas o dono pode definir sub dono.');
    const target = await prisma.clanMember.findUnique({ where: { id: req.params.memberId }, include: { player: true } });
    if (!target || target.clanId !== membership.clanId) throw new Error('Membro não encontrado.');
    if (target.role === 'OWNER' || target.playerId === membership.clan.ownerPlayerId) throw new Error('O dono do clã não pode ser alterado para sub dono.');
    await prisma.$transaction(async (tx) => {
      await tx.clanMember.updateMany({ where: { clanId: membership.clanId, role: 'SUB_OWNER' }, data: { role: 'MEMBER' } });
      await tx.clanMember.update({ where: { id: target.id }, data: { role: 'SUB_OWNER', status: 'ACTIVE' } });
      await tx.clan.update({ where: { id: membership.clanId }, data: { subOwnerPlayerId: target.playerId } });
    });
    res.redirect('/my-clan?success=' + encodeURIComponent('Sub dono definido.'));
  } catch (err) {
    res.redirect('/my-clan?error=' + encodeURIComponent(err.message));
  }
});

publicRoutes.post('/my-clan/applications/:applicationId/approve', requirePlayer, async (req, res) => {
  try {
    await reviewClanApplication({ applicationId: req.params.applicationId, reviewerPlayerId: req.player.id, action: 'approve', ownerNote: req.body.ownerNote });
    res.redirect('/my-clan?success=' + encodeURIComponent('Solicitação aprovada e player adicionado ao clã.') + '#solicitacoes');
  } catch (err) {
    res.redirect('/my-clan?error=' + encodeURIComponent(err.message) + '#solicitacoes');
  }
});

publicRoutes.post('/my-clan/applications/:applicationId/reject', requirePlayer, async (req, res) => {
  try {
    await reviewClanApplication({ applicationId: req.params.applicationId, reviewerPlayerId: req.player.id, action: 'reject', ownerNote: req.body.ownerNote });
    res.redirect('/my-clan?success=' + encodeURIComponent('Solicitação recusada.') + '#solicitacoes');
  } catch (err) {
    res.redirect('/my-clan?error=' + encodeURIComponent(err.message) + '#solicitacoes');
  }
});

publicRoutes.post('/my-clan/championship/register', requirePlayer, async (req, res) => {
  try {
    const membership = await getMyClanDashboard(req.player.id);
    if (!membership) throw new Error('Você não possui clã.');
    await registerClanForChampionship({ clanId: membership.clanId, playerId: req.player.id, flagId: req.body.flagId });
    res.redirect('/my-clan?success=' + encodeURIComponent('Clã inscrito no campeonato e bandeira reservada. A staff recebeu o ticket de entrega.'));
  } catch (err) {
    res.redirect('/my-clan?error=' + encodeURIComponent(err.message));
  }
});

// A loja pública de itens/veículos/VIP foi desativada no CHAMPIONS Z.
publicRoutes.use(['/shop', '/cart', '/vehicles', '/my-vehicles', '/outfits', '/clan-outfit'], (req, res, next) => {
  if (req.method === 'GET') return res.redirect(req.player ? '/wallet' : '/');
  return next();
});

publicRoutes.get('/shop', async (req, res, next) => {
  try {
    if (String(req.query.serverType || '').toLowerCase() === 'deathmatch') {
      return res.redirect('/streamer?error=' + encodeURIComponent('Loja bloqueada no Death Match.'));
    }
    return renderStore(req, res, 'Loja');
  } catch (err) {
    next(err);
  }
});

publicRoutes.get('/shop/confirm/:id', requirePlayer, async (req, res) => {
  const quantity = Math.max(1, Math.min(Number(req.query.quantity || 1), 10));

  // A página da loja já carregou e guardou o catálogo. Reutilizar o mesmo
  // snapshot elimina outra consulta de produto + itens ao clicar em “Doar”.
  const catalog = await getStoreCatalogSnapshot({ selectedServer: 'vanilla' });
  let product = catalog.allProducts.find(item => item.id === req.params.id) || null;

  // Fallback raro para produto criado enquanto o cache antigo ainda está sendo
  // atualizado. A compra em si sempre valida os dados atuais no banco.
  if (!product) {
    const productRow = await prisma.product.findFirst({
      where: { id: req.params.id, status: 'ACTIVE', serverType: 'vanilla' },
      omit: { imageData: true },
      include: { items: { orderBy: { sortOrder: 'asc' } } }
    });
    product = productRow
      ? applyPromotionToProduct({ ...productRow, hasImageData: Boolean(productRow.imageMime) }, catalog.globalPromo)
      : null;
  }
  if (!product) return res.status(404).render('error', { title: 'Produto não encontrado', message: 'Esse produto não existe ou está inativo.' });

  const totalCoins = product.displayPriceCoins * quantity;
  const originalTotalCoins = product.basePriceCoins * quantity;
  const itemList = describeProductItems(product).map(item => ({ ...item, totalQuantity: item.quantity * quantity }));
  res.render('confirm', { title: 'Confirmar doação', product, quantity, totalCoins, originalTotalCoins, itemList, player: req.player, checkoutToken: randomUUID() });
});

publicRoutes.post('/shop/buy/:id', requirePlayer, async (req, res) => {
  const body = req.body || {};
  const quantity = Math.max(1, Math.min(Number(body.quantity || 1), 10));
  try {
    if (body.confirmPurchase !== 'on') {
      return sendCheckoutError(req, res, {
        productId: req.params.id,
        quantity,
        message: 'Marque a confirmação para finalizar a doação.'
      });
    }
    const sendToFriend = body.sendToFriend === 'on';
    const giftSteam64 = sendToFriend ? String(body.friendSteam64 || '').trim() : null;
    if (sendToFriend && !giftSteam64) {
      return sendCheckoutError(req, res, {
        productId: req.params.id,
        quantity,
        message: 'Digite o Steam64 do amigo para enviar de presente.'
      });
    }
    const result = await buyProduct({
      playerId: req.player.id,
      productId: req.params.id,
      quantity,
      giftSteam64,
      couponCode: body.couponCode,
      checkoutToken: body.checkoutToken
    });
    const count = result.deliveries?.length || 1;
    const giftText = result.gift?.steam64 ? ` Presente enviado para Steam64 ${result.gift.steam64}.` : '';
    const couponText = result.coupon?.code ? ` Cupom ${result.coupon.code} aplicado: -${result.coupon.discountCoins} ${env.currencyName}.` : '';
    const returnServer = result.product?.serverType || 'vanilla';
    const category = result.product?.category || 'Construção';
    const apiText = result.fileBridgeImmediate?.queued
      ? ' Entrega confirmada; envio ao servidor iniciado em segundo plano.'
      : (result.fileBridgeImmediate?.ok && !result.fileBridgeImmediate?.skipped ? ' Arquivo enviado ao servidor.' : '');
    const message = result.duplicate
      ? 'Esta compra já havia sido processada. Nenhuma cobrança ou entrega foi duplicada.'
      : `Doação confirmada! ${result.product.name} gerou ${count} entrega(s) para o DayZ.${giftText}${couponText}${apiText}`;
    const redirectUrl = `/shop?serverType=${encodeURIComponent(returnServer)}&category=${encodeURIComponent(category)}&success=${encodeURIComponent(message)}`;

    if (wantsJsonResponse(req)) {
      return res.json({
        ok: true,
        message,
        redirectUrl,
        duplicate: Boolean(result.duplicate),
        balance: result.player?.coins ?? null
      });
    }
    return res.redirect(303, redirectUrl);
  } catch (err) {
    const message = err?.message || 'Não foi possível concluir a compra.';
    if (wantsJsonResponse(req)) return res.status(400).json({ ok: false, error: message });
    return res.redirect(303, `/shop?category=${encodeURIComponent('Construção')}&error=${encodeURIComponent(message)}`);
  }
});



publicRoutes.get('/cart', requirePlayer, async (req, res) => {
  res.render('cart', { title: 'Carrinho', player: req.player, checkoutToken: randomUUID() });
});

publicRoutes.post('/cart/buy', requirePlayer, async (req, res) => {
  const body = req.body || {};
  try {
    if (body.confirmPurchase !== 'on') {
      throw new Error('Marque a confirmação antes de finalizar o carrinho.');
    }
    let items = [];
    try {
      items = JSON.parse(String(body.cartItemsJson || '[]'));
    } catch (_) {
      throw new Error('Carrinho inválido. Volte para a loja e adicione os itens de novo.');
    }
    const result = await buyCart({
      playerId: req.player.id,
      items,
      couponCode: body.couponCode,
      source: 'site',
      checkoutToken: body.checkoutToken
    });
    const category = result.purchases?.[0]?.product?.category || 'Construção';
    const apiText = result.fileBridgeImmediate?.queued
      ? ' Entregas confirmadas; envio ao servidor iniciado em segundo plano.'
      : (result.fileBridgeImmediate?.ok && !result.fileBridgeImmediate?.skipped ? ' Arquivos enviados ao servidor.' : '');
    const message = result.duplicate
      ? 'Este carrinho já havia sido finalizado. Nenhuma compra foi repetida.'
      : `Carrinho finalizado! ${result.purchases.length} produto(s), ${result.deliveries.length} entrega(s) criadas. Total: ${result.totalCoins.toLocaleString('pt-BR')} ${env.currencyName}.${apiText}`;
    const redirectUrl = '/shop?serverType=vanilla&category=' + encodeURIComponent(category) + '&clearCart=1&success=' + encodeURIComponent(message);
    if (wantsJsonResponse(req)) {
      return res.json({
        ok: true,
        message,
        redirectUrl,
        duplicate: Boolean(result.duplicate),
        balance: result.player?.coins ?? null
      });
    }
    return res.redirect(303, redirectUrl);
  } catch (err) {
    const message = err?.message || 'Não foi possível finalizar o carrinho.';
    if (wantsJsonResponse(req)) return res.status(400).json({ ok: false, error: message });
    return res.redirect(303, '/cart?error=' + encodeURIComponent(message));
  }
});



publicRoutes.post('/starter-kit/claim', requirePlayer, async (req, res) => {
  try {
    const serverType = ['vanilla', 'bbp'].includes(String(req.body.serverType || '').toLowerCase())
      ? String(req.body.serverType).toLowerCase()
      : 'vanilla';
    const result = await claimStarterKit({ playerId: req.player.id, serverType });
    const bonusText = result.bonusCoins ? ` +${result.bonusCoins.toLocaleString('pt-BR')} ${env.currencyName} foram adicionados ao seu saldo.` : '';
    res.redirect('/outfits?success=' + encodeURIComponent(`Kit Inicial resgatado! Os itens foram enviados para entrega no DayZ.${bonusText} Agora escolha seu traje VIP grátis por 7 dias na opção Assault Pack de 80 slots.`));
  } catch (err) {
    const serverType = ['vanilla', 'bbp'].includes(String(req.body.serverType || '').toLowerCase()) ? String(req.body.serverType).toLowerCase() : 'vanilla';
    const rawMessage = String(err?.message || 'Não foi possível resgatar o Kit Inicial.');
    const publicMessage = err?.code === 'P2028' || /transaction already closed|expired transaction/i.test(rawMessage)
      ? 'O banco ficou ocupado por alguns segundos. Nenhum item foi descontado ou entregue. Tente resgatar o Kit Inicial novamente.'
      : rawMessage;
    res.redirect('/shop?serverType=' + encodeURIComponent(serverType) + '&error=' + encodeURIComponent(publicMessage));
  }
});

publicRoutes.get('/vehicles', async (req, res) => {
  const selectedServer = 'vanilla';
  res.redirect('/shop?serverType=' + encodeURIComponent(selectedServer) + '&category=' + encodeURIComponent('Veículos'));
});

publicRoutes.post('/vehicles/buy/:id', requirePlayer, async (req, res) => {
  const body = req.body || {};
  try {
    const result = await buyOrRentVehicle({
      playerId: req.player.id,
      templateId: req.params.id,
      ownershipType: body.ownershipType || 'OWNED',
      insurancePlanId: body.insurancePlanId || null,
      variantIndex: Number(body.variantIndex || 0),
      transmission: body.transmission || ''
    });

    const apiText = result.fileBridgeImmediate?.queued
      ? ' Entrega confirmada; envio ao servidor iniciado em segundo plano.'
      : (result.fileBridgeImmediate?.ok && !result.fileBridgeImmediate?.skipped ? ' Arquivos enviados ao servidor.' : ' Entrega salva para envio automático.');
    const successText = result.direct
      ? `Compra sem seguro confirmada! O chassi ${result.template?.vehicleClassname || ''} foi enviado para o mod montar pelo preset local.${apiText} Este veículo não fica na garagem e não possui reposição.`
      : `Compra confirmada com seguro mensal ativo! O chassi ${result.template?.vehicleClassname || ''} foi enviado para o mod montar pelo preset local.${apiText}`;
    const destination = result.direct
      ? '/shop?category=' + encodeURIComponent('Veículos') + '&success=' + encodeURIComponent(successText)
      : '/my-vehicles?success=' + encodeURIComponent(successText);
    if (wantsJsonResponse(req)) {
      return res.json({ ok: true, message: successText, redirectUrl: destination, balance: result.player?.coins ?? null });
    }
    return res.redirect(destination);
  } catch (err) {
    const message = err?.message || 'Não foi possível concluir a compra do veículo.';
    if (wantsJsonResponse(req)) return res.status(400).json({ ok: false, error: message });
    return res.redirect('/shop?category=' + encodeURIComponent('Veículos') + '&error=' + encodeURIComponent(message));
  }
});

publicRoutes.get('/my-vehicles', requirePlayer, async (req, res) => {
  const selectedGarageServer = ['vanilla', 'bbp'].includes(String(req.query.serverType || '').toLowerCase())
    ? String(req.query.serverType).toLowerCase()
    : 'all';

  const now = new Date();
  const activeVehicleFilter = {
    status: 'ACTIVE',
    OR: [{ expiresAt: null }, { expiresAt: { gt: now } }]
  };
  const vehicleWhere = {
    playerId: req.player.id,
    ...activeVehicleFilter
  };
  if (selectedGarageServer !== 'all') vehicleWhere.serverType = selectedGarageServer;

  const [vehicles, logs, player, availablePlans, allGarageVehicles] = await Promise.all([
    prisma.playerVehicle.findMany({ where: vehicleWhere, include: { template: true, insurancePlan: true }, orderBy: { updatedAt: 'desc' } }),
    prisma.vehicleRespawnLog.findMany({ where: { playerId: req.player.id }, orderBy: { createdAt: 'desc' }, take: 50 }),
    prisma.player.findUnique({ where: { id: req.player.id } }),
    prisma.vehicleInsurancePlan.findMany({ where: { active: true, billingType: 'SUBSCRIPTION' }, orderBy: [{ priceCoins: 'asc' }] }),
    prisma.playerVehicle.findMany({ where: { playerId: req.player.id, ...activeVehicleFilter }, select: { id: true, serverType: true, status: true, insurancePlanId: true, insuranceExpiresAt: true, expiresAt: true } })
  ]);
  res.render('myVehicles', { title: 'Minha Garagem', vehicles, logs, player, availablePlans, selectedGarageServer, allGarageVehicles });
});

publicRoutes.post('/my-vehicles/:id/respawn', requirePlayer, async (req, res) => {
  res.redirect('/my-vehicles?error=' + encodeURIComponent('O seguro agora é usado somente dentro do jogo. Entre no servidor, aperte L e abra Seguro dos meus veículos.'));
});

publicRoutes.post('/my-vehicles/:id/renew', requirePlayer, async (req, res) => {
  try {
    await renewVehicle({ playerId: req.player.id, playerVehicleId: req.params.id, days: Number(req.body.days || 30) });
    res.redirect('/my-vehicles?success=' + encodeURIComponent('Veículo renovado.'));
  } catch (err) {
    res.redirect('/my-vehicles?error=' + encodeURIComponent(err.message));
  }
});

publicRoutes.post('/my-vehicles/:id/renew-insurance', requirePlayer, async (req, res) => {
  try {
    await renewInsurance({ playerId: req.player.id, playerVehicleId: req.params.id });
    res.redirect('/my-vehicles?success=' + encodeURIComponent('Seguro renovado.'));
  } catch (err) {
    res.redirect('/my-vehicles?error=' + encodeURIComponent(err.message));
  }
});

publicRoutes.post('/my-vehicles/:id/upgrade-insurance', requirePlayer, async (req, res) => {
  try {
    if (!req.body.planId) throw new Error('Escolha um plano de seguro.');
    await upgradeInsurancePlan({ playerId: req.player.id, playerVehicleId: req.params.id, planId: req.body.planId });
    res.redirect('/my-vehicles?success=' + encodeURIComponent('Plano de seguro atualizado.'));
  } catch (err) {
    res.redirect('/my-vehicles?error=' + encodeURIComponent(err.message));
  }
});

publicRoutes.post('/my-vehicles/:id/cancel', requirePlayer, async (req, res) => {
  try {
    await cancelPlayerVehicle({ playerId: req.player.id, playerVehicleId: req.params.id });
    res.redirect('/my-vehicles?success=' + encodeURIComponent('Veículo cancelado na conta.'));
  } catch (err) {
    res.redirect('/my-vehicles?error=' + encodeURIComponent(err.message));
  }
});

publicRoutes.get('/wallet', requirePlayer, async (req, res) => {
  const [packages, ledgers, payments, deliveries, membership] = await Promise.all([
    prisma.coinPackage.findMany({ where: { active: true }, orderBy: { amountBrl: 'asc' } }),
    prisma.coinLedger.findMany({ where: { playerId: req.player.id }, orderBy: { createdAt: 'desc' }, take: 20 }),
    prisma.payment.findMany({ where: { playerId: req.player.id }, orderBy: { createdAt: 'desc' }, take: 10 }),
    prisma.deliveryQueue.findMany({ where: { playerId: req.player.id }, orderBy: { createdAt: 'desc' }, take: 10 }),
    prisma.clanMember.findFirst({ where: { playerId: req.player.id, status: 'ACTIVE' }, include: { clan: true } })
  ]);
  const playerRow = await prisma.player.findUnique({ where: { id: req.player.id }, omit: { avatarData: true } });
  const player = playerRow ? { ...playerRow, hasAvatar: Boolean(playerRow.avatarMime) } : req.player;
  const activeOutfit = await getActiveOutfitForPlayer(req.player.steam64, 'vanilla');
  res.render('wallet', { title: 'Minha conta', player, packages, ledgers, payments, deliveries, membership, activeOutfit });
});

publicRoutes.post('/checkout/:packageId', requirePlayer, async (req, res) => {
  try {
    const payment = await createPixPayment({ playerId: req.player.id, packageId: req.params.packageId, streamerCode: req.body.streamerCode });
    res.redirect(`/payment/${payment.id}`);
  } catch (err) {
    res.redirect(`/wallet?error=${encodeURIComponent(err.message)}`);
  }
});

publicRoutes.post('/checkout-custom', requirePlayer, async (req, res) => {
  try {
    const coins = Math.max(1000, Math.min(5000000, Number(req.body.customCoins || 0)));
    const amountBrl = Number((coins / 1000).toFixed(2));
    const payment = await createPixPayment({
      playerId: req.player.id,
      customAmountBrl: amountBrl,
      customCoins: coins,
      customLabel: `Doação personalizada ${coins} moedas`,
      streamerCode: req.body.streamerCode
    });
    res.redirect(`/payment/${payment.id}`);
  } catch (err) {
    res.redirect(`/wallet?error=${encodeURIComponent(err.message)}`);
  }
});

publicRoutes.get('/payment/:id', requirePlayer, async (req, res) => {
  const payment = await prisma.payment.findFirst({ where: { id: req.params.id, playerId: req.player.id }, include: { coinPackage: true } });
  if (!payment) return res.status(404).render('error', { title: 'Pagamento não encontrado', message: 'Esse Pix não pertence ao player logado.' });
  res.render('payment', { title: 'Pagamento Pix', payment, publicUrl: env.publicUrl });
});

publicRoutes.post('/payment/:id/support-streamer', requirePlayer, async (req, res) => {
  try {
    const payment = await setPaymentStreamerSupport({
      paymentId: req.params.id,
      playerId: req.player.id,
      streamerCode: req.body.streamerCode
    });
    res.redirect(`/payment/${payment.id}?success=${encodeURIComponent(`Streamer ${payment.supportStreamerCode} apoiado neste Pix.`)}`);
  } catch (error) {
    res.redirect(`/payment/${req.params.id}?error=${encodeURIComponent(error.message)}`);
  }
});

publicRoutes.get('/payment/:id/status', requirePlayer, async (req, res) => {
  let payment = await prisma.payment.findFirst({
    where: { id: req.params.id, playerId: req.player.id },
    select: { id: true, status: true, approvedAt: true, coins: true, providerPaymentId: true }
  });
  if (!payment) return res.status(404).json({ ok: false, error: 'Pagamento não encontrado.' });

  // Não depende somente do webhook: enquanto a tela do Pix estiver aberta,
  // consulta o Mercado Pago e credita as moedas assim que a order/pagamento aprovar.
  if (payment.status === 'PENDING' && payment.providerPaymentId) {
    try {
      await syncPaymentStatusByLocalId(payment.id);
      payment = await prisma.payment.findFirst({
        where: { id: payment.id, playerId: req.player.id },
        select: { id: true, status: true, approvedAt: true, coins: true, providerPaymentId: true }
      });
    } catch (error) {
      console.error(`Consulta do Pix ${payment.id}:`, error.message);
    }
  }

  res.json({ ok: true, status: payment.status, approvedAt: payment.approvedAt, coins: payment.coins });
});





publicRoutes.get(['/images/products/:file', '/images/dayz/generated/:file', '/images/dayz/fallback.svg', '/images/product-placeholder.svg', '/images/outfits/:file'], (req, res) => {
  res.redirect('/images/no-real-image.svg');
});

// Clean Store v200: qualquer referência estática antiga já apagada cai no placeholder neutro.
// Arquivos novos existentes em public/images são servidos antes por express.static.
publicRoutes.use('/images', (req, res) => {
  res.redirect('/images/no-real-image.svg');
});

publicRoutes.get('/dayz-wiki-image', async (req, res) => {
  try {
    const typeLower = String(req.query.type || '').trim().toLowerCase();
    const nameLower = String(req.query.name || '').trim().toLowerCase();
    if (typeLower === 'camonet' || nameLower.includes('camo net') || nameLower.includes('camouflage net')) {
      res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
      return res.redirect('/images/items/camonet-real.webp');
    }
    const image = resolveDayzWikiImageFast({ type: req.query.type, name: req.query.name, fallback: req.query.fallback });
    res.setHeader('Cache-Control', image.pending
      ? 'public, max-age=20, stale-while-revalidate=120'
      : 'public, max-age=86400, stale-while-revalidate=604800');
    return res.redirect(image.url);
  } catch (_) {
    return res.redirect('/images/no-real-image.svg');
  }
});



publicRoutes.get('/player-avatar/:id', async (req, res, next) => {
  try {
    return await serveDatabaseMedia(req, res, {
      cacheKey: `avatar:${req.params.id}:${mediaVersion(req)}`,
      ttlMs: req.query.v ? 10 * 60_000 : 60_000,
      cacheControl: 'public, max-age=60, must-revalidate, stale-while-revalidate=300',
      fallbackUrl: '/images/zona-z/default-profile.svg',
      load: () => prisma.player.findUnique({
        where: { id: req.params.id },
        select: { avatarData: true, avatarMime: true }
      }).then(player => ({ imageData: player?.avatarData, imageMime: player?.avatarMime })),
      defaultMime: 'image/webp'
    });
  } catch (err) { next(err); }
});

publicRoutes.get('/clan-flag/:id', async (req, res, next) => {
  try {
    return await serveDatabaseMedia(req, res, {
      cacheKey: `clan-flag:${req.params.id}:${mediaVersion(req)}`,
      ttlMs: 2 * 60_000,
      cacheControl: 'public, max-age=60, must-revalidate, stale-while-revalidate=300',
      fallbackUrl: '/images/zona-z/default-clan.svg',
      load: async () => {
        const clan = await prisma.clan.findUnique({
          where: { id: req.params.id },
          select: { flagData: true, flagMime: true, flagUrl: true }
        });
        return { imageData: clan?.flagData, imageMime: clan?.flagMime, fallbackUrl: clan?.flagUrl || '/images/zona-z/default-clan.svg' };
      },
      defaultMime: 'image/webp'
    });
  } catch (err) { next(err); }
});

publicRoutes.get('/clan-banner/:id', async (req, res, next) => {
  try {
    return await serveDatabaseMedia(req, res, {
      cacheKey: `clan-banner:${req.params.id}:${mediaVersion(req)}`,
      ttlMs: 2 * 60_000,
      cacheControl: 'public, max-age=60, must-revalidate, stale-while-revalidate=300',
      fallbackUrl: '/images/zona-z/clans-hero.webp',
      load: () => prisma.clan.findUnique({
        where: { id: req.params.id },
        select: { bannerData: true, bannerMime: true }
      }).then(clan => ({ imageData: clan?.bannerData, imageMime: clan?.bannerMime })),
      defaultMime: 'image/webp'
    });
  } catch (err) { next(err); }
});

publicRoutes.get('/starter-kit-image', async (req, res, next) => {
  try {
    return await serveDatabaseMedia(req, res, {
      cacheKey: `starter-kit:${mediaVersion(req) || 'current'}`,
      ttlMs: 30 * 60_000,
      cacheControl: 'public, max-age=604800, immutable',
      fallbackUrl: '/images/no-real-image.svg',
      load: async () => {
        const kit = await getStarterKit();
        return { imageData: kit?.imageData, imageMime: kit?.imageMime, fallbackUrl: kit?.imageUrl || '/images/no-real-image.svg' };
      },
      makeTransparent: true
    });
  } catch (err) { next(err); }
});

publicRoutes.get('/vehicle-image/:id', async (req, res, next) => {
  try {
    return await serveDatabaseMedia(req, res, {
      cacheKey: `vehicle:${req.params.id}:${mediaVersion(req) || 'current'}`,
      ttlMs: 30 * 60_000,
      cacheControl: 'public, max-age=604800, immutable',
      fallbackUrl: '/images/no-real-image.svg',
      load: () => prisma.vehicleTemplate.findUnique({
        where: { id: req.params.id },
        select: { imageData: true, imageMime: true }
      }),
      makeTransparent: true
    });
  } catch (err) { next(err); }
});

publicRoutes.get('/product-image/:id', async (req, res, next) => {
  try {
    return await serveDatabaseMedia(req, res, {
      cacheKey: `product:${req.params.id}:${mediaVersion(req) || 'current'}`,
      ttlMs: 30 * 60_000,
      cacheControl: 'public, max-age=604800, immutable',
      fallbackUrl: '/images/no-real-image.svg',
      load: () => prisma.product.findUnique({
        where: { id: req.params.id },
        select: { imageData: true, imageMime: true }
      }),
      makeTransparent: true
    });
  } catch (err) { next(err); }
});
