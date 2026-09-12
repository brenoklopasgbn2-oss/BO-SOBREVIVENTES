import multer from 'multer';
import { Router } from 'express';
import { prisma } from '../db/prisma.js';
import { env } from '../config/env.js';
import { createAdminCookie, requireAdmin } from '../middleware/auth.js';
import { ensureAdminOwnerSteam64 } from '../services/adminIdentityService.js';
import { slugify } from '../utils/slug.js';
import { changePlayerCoins } from '../services/playerService.js';
import { logBalanceChange } from '../services/discordLogger.js';
import { manuallyApprovePayment, syncPaymentStatusByLocalId, checkMercadoPagoConnection } from '../services/paymentService.js';
import { getMonthlyStats, getMonthlyHistory, parseMonthKey, sendCurrentMonthlyReport } from '../services/reportService.js';
import { logAudit } from '../services/auditService.js';
import { parseProductItemsInput } from '../utils/productItems.js';
import { prepareRawUploadedImage } from '../utils/pngTransparency.js';
import { saveGlobalPromo, getGlobalPromo, normalizePromoColor, normalizePromoPercent } from '../services/promotionService.js';
import { createOrUpdateVehicleTemplateFromBody, createInsurancePlanFromBody, partsToText, variantsToText, cargoItemsToText, vehicleTemplatePayload, publishVehicleDeliveryImmediately, queueVehicleDeliveryImmediately, createVehiclePlayerInventoryAccessoryDeliveries, restoreMissingVehicleWithSameId } from '../services/vehicleRentalService.js';
import { getStarterKit, saveStarterKitFromBody, starterKitItemsToText, dropStarterKitForAdmin } from '../services/starterKitService.js';
import { executeSeasonStoreWipe, getSeasonWipePreview, SEASON_WIPE_BONUS_COINS } from '../services/seasonWipeService.js';
import { DEATHMATCH_ACTIONS, DEATHMATCH_CLASS_OPTIONS, getDeathmatchConfig, saveDeathmatchGameplay, upsertDeathmatchStreamer, removeDeathmatchStreamer, upsertDeathmatchGiftMapping, removeDeathmatchGiftMapping, enqueueDeathmatchGiftEvent, clearDeathmatchStreamer } from '../services/deathmatchService.js';
import { createClanWithOwner, registerKillEventFromGame, getRankingData } from '../services/rankingService.js';
import { sendRankingToDiscord } from '../services/discordLogger.js';
import { getAdminSupportDashboard, getStreamerDashboardBySteam64, upsertCouponFromBody, upsertStreamerCodeFromBody, markStreamerCommissionPaid } from '../services/supportService.js';
import { searchDayzItemCatalog } from '../services/dayzCatalogService.js';
import { listOutfitTemplates, upsertOutfitTemplateFromBody, outfitItemsToText, getActiveOutfitForPlayer, assignPrivateVipMembers, removePrivateVipMember, grantOutfitToPlayerByAdmin, revokeOutfitSubscriptionByAdmin, PRIVATE_VIP_SOURCE } from '../services/outfitService.js';
import { currentPublicVipOutfitSlugsV613, adminVipOutfitSlugV613 } from '../data/vipOutfitsV201.js';
import { getGameApiBridgeStatus, syncPlayerFilesNow, syncPlayerVipFileNow, forceSyncAllVipFilesNow, queueImmediatePlayerFileSync, publishPlayerDeliveryFilesNow } from '../services/gameApiBridgeService.js';
import { getPresenceAdminSnapshot } from '../services/presenceService.js';
import { unlinkDiscordFromPlayer } from '../services/accountLinkService.js';
import { createClanFlagOption, createChampionshipResult, getChampionshipDashboard, markClanFlagDelivered } from '../services/championshipService.js';
import { getDiscordOutboxStats } from '../services/discordOutboxService.js';
import { getManagedOutfitAdminData, listManagedOutfitsForOwner, revokeClanManagedOutfitAccess, updateCustomOutfitOrder, updateFlagRequest } from '../services/managedOutfitService.js';
import {
  getClanRecruitmentDiscordConfig,
  getClanRecruitmentRecommendations,
  getClanRecruitmentScheduleRows,
  saveClanRecruitmentDiscordConfig,
  sendClanRecruitmentDiscordNow,
  sendClanRecruitmentWebhookTest
} from '../services/clanRecruitmentDiscordService.js';
import {
  deleteTerritoryKillEvent,
  getAdminTerritoryKillEventDashboard,
  reprocessTerritoryEventKills,
  setTerritoryKillEventActive,
  upsertTerritoryKillEvent
} from '../services/territoryKillEventService.js';


const DEATHMATCH_PANEL_LOCKED = true;
const ADMIN_WIPE_ENABLED = ['1', 'true', 'yes', 'sim', 'on'].includes(String(process.env.ENABLE_ADMIN_WIPE || '').trim().toLowerCase());
const ADMIN_WIPE_CONFIRM_PHRASE = 'EXECUTAR WIPE DE TEMPORADA';
const championshipUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 6 * 1024 * 1024 } });


function normalizeHighlightColor(value, fallback = '#ef4444') {
  const color = String(value || '').trim();
  return /^#[0-9a-f]{6}$/i.test(color) ? color : fallback;
}

function toArray(value) {
  if (Array.isArray(value)) return value;
  if (value === undefined || value === null) return [];
  return [value];
}

function parsePoints(value, max = 1000000) {
  const n = Number(value || 0);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(Math.floor(n), max));
}

function assertAdminPassword(body) {
  if (String(body.adminPassword || '') !== env.adminPassword) {
    throw new Error('Senha admin incorreta. Use a mesma senha que entra no painel do site.');
  }
}

function normalizeClanTagForDelete(value) {
  return String(value || '')
    .normalize('NFKC')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
}

function normalizeClanDeletePhrase(value) {
  return String(value || '')
    .normalize('NFKC')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '');
}

function cleanImageUrl(value) {
  const url = String(value || '').trim();
  if (!url) return null;
  if (!/^https?:\/\//i.test(url) && !url.startsWith('/')) return null;
  return url.slice(0, 1000);
}

function parseProductItemsFromBody(body) {
  const classnames = toArray(body.itemClassname).map(v => String(v || '').trim());
  const quantities = toArray(body.itemQuantity);
  const labels = toArray(body.itemLabel).map(v => String(v || '').trim());

  const items = [];
  const maxLen = Math.max(classnames.length, quantities.length, labels.length);
  for (let index = 0; index < maxLen; index += 1) {
    const classname = String(classnames[index] || '').trim();
    const rawQty = Number(quantities[index] || 1);
    const label = String(labels[index] || '').trim();
    if (!classname) continue;
    const quantity = Number.isFinite(rawQty) && rawQty > 0 ? Math.min(Math.floor(rawQty), 999) : 1;
    items.push({ classname, quantity, label: label || null, sortOrder: index });
  }

  if (items.length) return items;
  return parseProductItemsInput(body.itemsText, body.classname, Number(body.quantity || 1));
}

export const adminRoutes = Router();


async function publishVipImmediatelyForAdmin(steam64) {
  try {
    const api = await syncPlayerVipFileNow(steam64);
    if (api?.skipped) {
      queueImmediatePlayerFileSync(steam64);
      return { ok: false, queued: true, skipped: true, error: 'API indisponível.' };
    }
    return { ok: true, queued: true, api };
  } catch (error) {
    queueImmediatePlayerFileSync(steam64);
    console.error(`[VIP_API_ADMIN] ${steam64}: o mod buscará o estado no próximo poll:`, error.message);
    return { ok: false, queued: true, error: error.message };
  }
}

async function publishVipMembersImmediatelyForAdmin(steam64s = []) {
  const unique = Array.from(new Set((steam64s || []).map(value => String(value || '').trim()).filter(value => /^\d{17}$/.test(value))));
  const results = [];
  for (const steam64 of unique) results.push({ steam64, ...(await publishVipImmediatelyForAdmin(steam64)) });
  return {
    total: unique.length,
    immediate: results.filter(item => item.ok).length,
    queued: results.filter(item => !item.ok && item.queued).length,
    results
  };
}

// V88: impede o navegador/proxy de exibir um menu ADM antigo após o deploy.
adminRoutes.use((req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  res.set('Surrogate-Control', 'no-store');
  res.set('X-RAIDZ-Store-Version', '1.0.151');
  res.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
  next();
});

const SEED_DELETED_PRODUCTS_KEY = 'seed.deletedProducts.v66';
const SEED_DELETED_VEHICLES_KEY = 'seed.deletedVehicles.v66';
const SEED_DELETED_OUTFITS_KEY = 'seed.deletedOutfits.v132';

function cleanTombstoneSlug(value) {
  return String(value || '').trim().toLowerCase().slice(0, 220);
}

function extractTombstoneSlugs(value) {
  const source = Array.isArray(value?.slugs) ? value.slugs : (Array.isArray(value) ? value : []);
  return Array.from(new Set(source.map(cleanTombstoneSlug).filter(Boolean)));
}

async function addSeedTombstones(key, slugs) {
  const clean = Array.from(new Set((slugs || []).map(cleanTombstoneSlug).filter(Boolean)));
  if (!clean.length) return [];
  const setting = await prisma.appSetting.findUnique({ where: { key } });
  const current = extractTombstoneSlugs(setting?.value || {});
  const merged = Array.from(new Set([...current, ...clean])).sort((a, b) => a.localeCompare(b));
  await prisma.appSetting.upsert({
    where: { key },
    update: { value: { slugs: merged, updatedAt: new Date().toISOString(), mode: 'admin_delete_keeps_seed_from_returning' } },
    create: { key, value: { slugs: merged, updatedAt: new Date().toISOString(), mode: 'admin_delete_keeps_seed_from_returning' } }
  });
  return merged;
}

async function addSeedTombstone(key, slug) {
  return addSeedTombstones(key, [slug]);
}


const DEFAULT_STORE_CATEGORIES = [
  { name: 'Construção', serverType: 'all', order: 10, icon: '🧱', color: '#f97316', parentName: null, active: true },
  { name: 'Veículos', serverType: 'all', order: 20, icon: '🚙', color: '#ff4d2d', parentName: null, active: true },
  { name: 'Trajes VIPs', serverType: 'all', order: 30, icon: '🎖️', color: '#a855f7', parentName: null, active: true }
];

function normalizeCategoryName(value) {
  return String(value || '').trim().replace(/\s+/g, ' ');
}

function normalizeCategoryServerType(value) {
  const v = String(value || '').trim().toLowerCase();
  return ['all', 'vanilla', 'bbp'].includes(v) ? v : 'all';
}

function normalizeCategoryColor(value) {
  const color = String(value || '').trim();
  return /^#[0-9a-f]{6}$/i.test(color) ? color : '#ef4444';
}

function normalizeCategoryIcon(value) {
  const icon = String(value || '').trim();
  return icon ? icon.slice(0, 16) : '📦';
}

function canonicalCategoryName(value) {
  const name = normalizeCategoryName(value);
  const low = name.toLowerCase();
  if (low === 'equipamento') return 'Equipamentos';
  if (low === 'peças de veículos' || low === 'pecas de veiculos' || low === 'peças de veiculo' || low === 'pecas de veiculo') return 'Peças de Veículos';
  return name;
}

function normalizeStoreCategoryConfig(value) {
  const source = Array.isArray(value?.categories) ? value.categories : (Array.isArray(value) ? value : []);
  const base = source.length ? source : DEFAULT_STORE_CATEGORIES;
  const byKey = new Map();
  base.forEach((entry, idx) => {
    const name = canonicalCategoryName(entry?.name);
    const serverType = normalizeCategoryServerType(entry?.serverType || 'all');
    if (!name || entry?.active === false) return;
    const key = `${serverType}::${name.toLowerCase()}`;
    const parentName = normalizeCategoryName(entry?.parentName || entry?.parent || '') || null;
    byKey.set(key, {
      id: String(entry?.id || key).slice(0, 120),
      name,
      slug: slugify(entry?.slug || name),
      serverType,
      parentName,
      order: Number.isFinite(Number(entry?.order)) ? Number(entry.order) : idx * 10,
      icon: normalizeCategoryIcon(entry?.icon),
      color: normalizeCategoryColor(entry?.color),
      active: entry?.active === false ? false : true,
      description: String(entry?.description || '').trim().slice(0, 280) || null
    });
  });
  const list = Array.from(byKey.values());
  const names = new Set(list.map(c => `${c.serverType}::${c.name.toLowerCase()}`));
  list.forEach((cat) => {
    if (cat.parentName && !names.has(`${cat.serverType}::${cat.parentName.toLowerCase()}`) && !names.has(`all::${cat.parentName.toLowerCase()}`)) {
      cat.parentName = null;
    }
  });
  list.sort((a, b) => a.order - b.order || a.name.localeCompare(b.name, 'pt-BR'));
  return { categories: list };
}

async function getStoreCategoryConfig() {
  const setting = await prisma.appSetting.findUnique({ where: { key: 'store_categories_v1' } });
  return normalizeStoreCategoryConfig(setting?.value || {});
}

async function saveStoreCategoryConfig(config) {
  return prisma.appSetting.upsert({
    where: { key: 'store_categories_v1' },
    update: { value: config },
    create: { key: 'store_categories_v1', value: config }
  });
}



function categoryMatchesProduct(category, product) {
  const sameName = String(product.category || '').toLowerCase() === String(category.name || '').toLowerCase();
  const sameServer = category.serverType === 'all' || product.serverType === category.serverType || product.serverType === 'all';
  return sameName && sameServer;
}

function buildCategoryStats(categories, products) {
  return categories.map((category) => ({
    ...category,
    productCount: products.filter((product) => categoryMatchesProduct(category, product)).length,
    childCount: categories.filter((child) => child.parentName && child.parentName.toLowerCase() === category.name.toLowerCase()).length
  }));
}

function buildCategoryTree(categories) {
  const parents = categories.filter((c) => !c.parentName);
  return parents.map((parent) => ({
    ...parent,
    children: categories.filter((child) => child.parentName && child.parentName.toLowerCase() === parent.name.toLowerCase())
  }));
}

function resolveSelectedCategory(categories, query) {
  const selected = normalizeCategoryName(query?.category || query?.cat);
  return categories.find((cat) => cat.name.toLowerCase() === selected.toLowerCase()) || categories.find((cat) => cat.name === 'Veículos') || categories[0] || null;
}

function mergeCatalogWithProducts(catalog, products) {
  const byClass = new Map((catalog || []).map(item => [String(item.classname || '').toLowerCase(), item]));
  for (const product of products || []) {
    const items = product.items?.length ? product.items : [{ classname: product.classname, quantity: product.quantity, label: product.name }];
    for (const item of items) {
      const classname = String(item.classname || '').trim();
      if (!classname || byClass.has(classname.toLowerCase())) continue;
      byClass.set(classname.toLowerCase(), {
        name: item.label || product.name || classname,
        classname,
        category: product.category || 'Itens da Loja',
        imageUrl: product.imageData ? `/product-image/${product.id}?v=${product.updatedAt ? new Date(product.updatedAt).getTime() : Date.now()}` : (product.imageUrl || '/images/no-real-image.svg'),
        wikiImageUrl: `https://dayz.fandom.com/wiki/Special:Search?query=${encodeURIComponent(classname)}`,
        source: 'Itens cadastrados na loja'
      });
    }
  }
  return Array.from(byClass.values()).sort((a, b) => String(a.category).localeCompare(String(b.category), 'pt-BR') || String(a.name).localeCompare(String(b.name), 'pt-BR'));
}

adminRoutes.get('/login', (req, res) => {
  res.render('admin/login', { title: 'Admin Login' });
});

adminRoutes.post('/login', async (req, res) => {
  if (req.body.user !== env.adminUser || req.body.password !== env.adminPassword) {
    logAudit({ actor: req.body.user || 'unknown', action: 'admin.login.failed', target: 'admin', data: { ip: req.ip } });
    return res.redirect('/admin/login?error=Login ou senha inválido.');
  }

  let identityLink = null;
  if (req.player?.steam64) {
    try {
      identityLink = await ensureAdminOwnerSteam64(req.player.steam64);
    } catch (error) {
      console.error('Falha ao vincular conta Steam64 ao painel ADM:', error.message);
    }
  }

  logAudit({
    actor: req.body.user,
    action: 'admin.login.success',
    target: 'admin',
    data: { ip: req.ip, playerSteam64: req.player?.steam64 || null, adminAccountLinked: Boolean(identityLink?.linked) }
  });
  res.cookie('sz_admin', createAdminCookie(), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 1000 * 60 * 60 * 12
  });
  res.redirect('/admin');
});

adminRoutes.post('/logout', (req, res) => {
  logAudit({ actor: 'admin', action: 'admin.logout', target: 'admin', data: { ip: req.ip } });
  res.clearCookie('sz_admin');
  res.redirect('/admin/login');
});

adminRoutes.use(requireAdmin);

adminRoutes.get('/version', (req, res) => {
  res.json({
    version: '3.0.0-api-bridge',
    apiPanel: '/admin/ftp',
    transport: 'http-api-pull',
    ftp: false,
    sftp: false,
    batchPoll: true,
    localJournalAntiDuplicate: true,
    vipCache: true,
    insuranceCache: true,
    playtimeBatch: true,
    rankingBatch: true,
    pixAtomicCreditLock: true,
    pixLedgerIdempotencyKey: true
  });
});

adminRoutes.get(['/ftp-config', '/file-bridge', '/arquivos', '/api-bridge'], (req, res) => {
  res.redirect('/admin/ftp');
});

adminRoutes.get('/ftp', async (req, res) => {
  const [apiStatus, pendingDeliveries] = await Promise.all([
    getGameApiBridgeStatus(),
    prisma.deliveryQueue.count({ where: { status: 'PENDING' } })
  ]);
  res.render('admin/ftp', {
    title: 'API • Servidor DayZ',
    apiStatus,
    pendingDeliveries,
    apiKeyConfigured: Boolean(String(env.apiKey || '').trim())
  });
});

adminRoutes.get('/ftp/status', async (req, res) => {
  const apiStatus = await getGameApiBridgeStatus();
  res.setHeader('Cache-Control', 'no-store');
  res.json({ ok: true, ...apiStatus });
});

adminRoutes.post('/ftp/test', async (req, res) => {
  try {
    const status = await getGameApiBridgeStatus();
    if (!status.configured) throw new Error('API_KEY não está configurada no site. Cadastre a mesma chave no Railway e no SZ_StoreConfig.json do mod.');
    if (!status.connected) {
      const age = status.ageSeconds === null ? 'nenhum contato recebido' : `último contato há ${status.ageSeconds}s`;
      throw new Error(`A API do site está pronta, mas o mod ainda não está conectado (${age}). Confira ApiBaseUrl e ApiKey no servidor DayZ.`);
    }
    res.redirect('/admin/ftp?success=' + encodeURIComponent(`API conectada. Servidor ${status.heartbeat?.serverId || 'DayZ'} respondeu há ${status.ageSeconds || 0}s com ${status.heartbeat?.onlinePlayers || 0} player(s) online.`));
  } catch (err) {
    res.redirect('/admin/ftp?error=' + encodeURIComponent(err.message));
  }
});

adminRoutes.post('/ftp/sync', async (req, res) => {
  try {
    const pending = await prisma.deliveryQueue.count({ where: { status: 'PENDING' } });
    const status = await getGameApiBridgeStatus();
    const msg = status.connected
      ? `API online. ${pending} entrega(s) PENDING serão enviadas automaticamente no próximo poll do mod.`
      : `Site pronto, com ${pending} entrega(s) PENDING. O mod ainda não está conectado à API.`;
    res.redirect('/admin/ftp?success=' + encodeURIComponent(msg));
  } catch (err) {
    res.redirect('/admin/ftp?error=' + encodeURIComponent(err.message));
  }
});

// Rotas antigas permanecem somente para não gerar 404 em favoritos/cache do navegador.
adminRoutes.post(['/ftp', '/ftp/reset', '/ftp/detect-path', '/ftp/test-live'], (req, res) => {
  res.redirect('/admin/ftp?error=' + encodeURIComponent('FTP/SFTP foi removido. A integração agora é feita somente pela API HTTP do mod.'));
});

adminRoutes.get('/clan-recruitment-discord', async (req, res) => {
  const config = await getClanRecruitmentDiscordConfig();
  const recruitingClans = await prisma.clan.findMany({
    where: { status: 'ACTIVE', isRecruiting: true },
    include: { ownerPlayer: true, members: { where: { status: 'ACTIVE' } } },
    orderBy: [{ updatedAt: 'desc' }, { name: 'asc' }]
  });
  res.render('admin/clanRecruitmentDiscord', {
    title: 'Discord • Recrutamento de Clãs',
    config,
    recruitingClans: getClanRecruitmentScheduleRows(recruitingClans, config),
    recommendations: getClanRecruitmentRecommendations(config),
    publicUrlConfigured: Boolean(String(env.publicUrl || '').trim()) && !/^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/i.test(String(env.publicUrl || '').trim())
  });
});

adminRoutes.post('/clan-recruitment-discord', async (req, res) => {
  try {
    const saved = await saveClanRecruitmentDiscordConfig(req.body);
    await logAudit({
      actor: 'admin',
      action: 'clan_recruitment_discord.config.updated',
      target: 'clanRecruitmentDiscord.v107',
      data: {
        enabled: saved.enabled,
        intervalHours: saved.intervalHours,
        webhookCount: [saved.webhookUrl1, saved.webhookUrl2].filter(Boolean).length,
        sendInstructions: saved.sendInstructions
      }
    });
    res.redirect('/admin/clan-recruitment-discord?success=' + encodeURIComponent('Configuração de recrutamento no Discord salva.'));
  } catch (err) {
    res.redirect('/admin/clan-recruitment-discord?error=' + encodeURIComponent(err.message));
  }
});

adminRoutes.post('/clan-recruitment-discord/send-now', async (req, res) => {
  try {
    const result = await sendClanRecruitmentDiscordNow({ force: true, dueOnly: true });
    await logAudit({ actor: 'admin', action: 'clan_recruitment_discord.sent.manual', target: 'discord', data: result });
    const msg = result.sentClans
      ? `Enviado agora: ${result.clan?.name ? ('[' + result.clan.tag + '] ' + result.clan.name) : result.sentClans + ' clã'} para ${result.targets} webhook(s).`
      : 'Nenhum clã está recrutando no momento.';
    res.redirect('/admin/clan-recruitment-discord?success=' + encodeURIComponent(msg));
  } catch (err) {
    res.redirect('/admin/clan-recruitment-discord?error=' + encodeURIComponent(err.message));
  }
});

adminRoutes.post('/clan-recruitment-discord/test/:slot', async (req, res) => {
  try {
    const config = await getClanRecruitmentDiscordConfig();
    const slot = String(req.params.slot || '1') === '2' ? '2' : '1';
    const webhook = slot === '2' ? config.webhookUrl2 : config.webhookUrl1;
    if (!webhook) throw new Error(`Webhook ${slot} não foi preenchido.`);
    const result = await sendClanRecruitmentWebhookTest(webhook, slot);
    await logAudit({ actor: 'admin', action: 'clan_recruitment_discord.test', target: `webhook_${slot}`, data: result });
    res.redirect('/admin/clan-recruitment-discord?success=' + encodeURIComponent(`Teste do Webhook ${slot} enviado com sucesso.`));
  } catch (err) {
    res.redirect('/admin/clan-recruitment-discord?error=' + encodeURIComponent(err.message));
  }
});

adminRoutes.get('/', async (req, res) => {
  const [
    stats,
    playerCount,
    pendingDeliveries,
    productsCount,
    lastPayments,
    lastPurchases,
    playerCoins,
    playerVehiclesCount,
    insuranceUsage,
    vehicleRespawnLogs,
    supportSalesCount,
    seasonWipePreview
  ] = await Promise.all([
    getMonthlyStats(),
    prisma.player.count(),
    prisma.deliveryQueue.count({ where: { status: { in: ['PENDING', 'FAILED'] } } }),
    prisma.product.count(),
    prisma.payment.findMany({
      select: { id: true, amountBrl: true, status: true, createdAt: true, player: { select: { nickname: true, steam64: true } } },
      orderBy: { createdAt: 'desc' }, take: 8
    }),
    prisma.purchase.findMany({
      select: { id: true, totalCoins: true, createdAt: true, player: { select: { nickname: true, steam64: true } }, product: { select: { name: true } } },
      orderBy: { createdAt: 'desc' }, take: 8
    }),
    prisma.player.aggregate({ _sum: { coins: true, cash: true } }),
    prisma.playerVehicle.count(),
    prisma.playerVehicle.aggregate({ _sum: { insuranceUsesThisWeek: true, insuranceUsesTotal: true, deliveriesCreated: true } }),
    prisma.vehicleRespawnLog.count(),
    prisma.streamerSupportSale.count(),
    getSeasonWipePreview()
  ]);
  const safeDataStats = {
    totalPlayerCoins: Number(playerCoins._sum.coins || 0),
    totalPlayerCash: Number(playerCoins._sum.cash || 0),
    playerVehiclesCount,
    insuranceUsesThisWeek: Number(insuranceUsage._sum.insuranceUsesThisWeek || 0),
    insuranceUsesTotal: Number(insuranceUsage._sum.insuranceUsesTotal || 0),
    vehicleDropsCreated: Number(insuranceUsage._sum.deliveriesCreated || 0),
    vehicleRespawnLogs,
    supportSalesCount
  };
  res.render('admin/dashboard', { title: 'Painel Admin', stats, playerCount, pendingDeliveries, productsCount, lastPayments, lastPurchases, safeDataStats, seasonWipePreview, seasonWipeBonusCoins: SEASON_WIPE_BONUS_COINS, adminWipeEnabled: ADMIN_WIPE_ENABLED, adminWipeConfirmPhrase: ADMIN_WIPE_CONFIRM_PHRASE });
});






adminRoutes.post('/wipe/reset-store-stats', async (req, res) => {
  try {
    if (!ADMIN_WIPE_ENABLED) {
      throw new Error('WIPE DE TEMPORADA bloqueado. Para liberar manualmente, configure ENABLE_ADMIN_WIPE=true no Railway e reinicie o site.');
    }
    assertAdminPassword(req.body);
    if (String(req.body.confirmPhrase || '').trim() !== ADMIN_WIPE_CONFIRM_PHRASE) {
      throw new Error(`Confirmação inválida. Digite exatamente: ${ADMIN_WIPE_CONFIRM_PHRASE}`);
    }

    const result = await executeSeasonStoreWipe({ actor: 'admin' });

    // Atualiza imediatamente os JSONs de todos que já existiam no momento do
    // wipe. A API faz pull no próximo ciclo; mantém a mesma lista no banco até o mod confirmar.
    // rápida para a próxima reconexão sem repetir o reembolso.
    let ftpResult;
    let ftpQueued = 0;
    try {
      ftpResult = await publishPlayerDeliveryFilesNow(result.playerSteam64s || [], {
        syncInsurance: true,
        syncVip: true,
        syncDelivery: true
      });
    } catch (ftpError) {
      for (const steam64 of result.playerSteam64s || []) {
        if (queueImmediatePlayerFileSync(steam64)) ftpQueued += 1;
      }
      ftpResult = { ok: false, error: ftpError.message, published: 0 };
    }

    const ftpMessage = ftpResult?.skipped
      ? 'API desativada: banco concluído; as entregas permanecem pendentes até o mod conectar.'
      : ftpResult?.ok
        ? `${Number(ftpResult.published || 0)} player(s) marcado(s) para sincronização no próximo ciclo da API.`
        : `API indisponível após o banco concluir; ${ftpQueued} player(s) continuam pendentes. Erro: ${ftpResult?.error || 'desconhecido'}`;

    const message = [
      'WIPE DE TEMPORADA concluído com segurança.',
      `${result.playersRewarded} player(s) antigo(s) receberam ${SEASON_WIPE_BONUS_COINS.toLocaleString('pt-BR')} ${env.currencyName} cada.`,
      `${result.totalRefundedCoins.toLocaleString('pt-BR')} ${env.currencyName} devolvidos em compras/gastos da loja.`,
      'Kit inicial e traje VIP inicial foram liberados novamente.',
      `${result.deleted.playerVehicles} veículo(s) e aluguel(is) zerados.`,
      `${result.deleted.disallowedStoreProducts || 0} produto(s) de storage não vanilla/saco de dormir removido(s).`,
      `Killfeed, ranking, clãs, Pix e histórico financeiro preservados.`,
      ftpMessage
    ].join(' ');

    res.redirect('/admin?success=' + encodeURIComponent(message));
  } catch (err) {
    res.redirect('/admin?error=' + encodeURIComponent(err.message));
  }
});

adminRoutes.get('/streamer', async (req, res, next) => {
  try {
    const support = await getAdminSupportDashboard();
    res.render('admin/streamer', {
      title: 'Apoio Streamer',
      ...support,
      deathmatchLocked: DEATHMATCH_PANEL_LOCKED
    });
  } catch (err) {
    next(err);
  }
});

// Visualização segura pelo ADM. Antes o botão apontava para /streamer e era
// barrado porque aquela rota exige sessão criada pelo L dentro do DayZ.
adminRoutes.get('/streamer/:steam64/panel', async (req, res, next) => {
  try {
    const steam64 = String(req.params.steam64 || '').trim();
    if (!/^\d{17}$/.test(steam64)) throw new Error('Steam64 do streamer inválido.');

    const [streamerDashboard, allManaged] = await Promise.all([
      getStreamerDashboardBySteam64(steam64),
      listManagedOutfitsForOwner(steam64)
    ]);

    res.render('streamer', {
      title: `Painel de ${streamerDashboard.streamerCode.streamerName}`,
      streamerDashboard,
      managedOutfits: allManaged.filter(outfit => outfit.ownerType === 'STREAMER'),
      managerReturnTo: '/streamer',
      loginCode: streamerDashboard.streamerCode.code,
      loginSteam64: steam64,
      error: null,
      success: null,
      deathmatchLocked: true,
      adminPreview: true
    });
  } catch (err) {
    res.redirect('/admin/streamer?error=' + encodeURIComponent(err.message));
  }
});

adminRoutes.post('/streamer-support/codes', async (req, res) => {
  try {
    await upsertStreamerCodeFromBody(req.body);
    res.redirect('/admin/streamer?success=' + encodeURIComponent('Código streamer criado/atualizado.'));
  } catch (err) {
    res.redirect('/admin/streamer?error=' + encodeURIComponent(err.message));
  }
});

adminRoutes.post('/streamer-support/codes/:id/toggle', async (req, res) => {
  try {
    const current = await prisma.streamerCode.findUnique({ where: { id: req.params.id } });
    if (!current) throw new Error('Código streamer não encontrado.');
    await prisma.streamerCode.update({ where: { id: current.id }, data: { active: !current.active } });
    await logAudit({ actor: 'admin', action: 'streamer_support.code.toggle', target: current.code, data: { active: !current.active } });
    res.redirect('/admin/streamer?success=' + encodeURIComponent('Status do código streamer alterado.'));
  } catch (err) {
    res.redirect('/admin/streamer?error=' + encodeURIComponent(err.message));
  }
});


adminRoutes.post('/streamer-support/codes/:id/mark-paid', async (req, res) => {
  try {
    assertAdminPassword(req.body);
    const payout = await markStreamerCommissionPaid({
      streamerCodeId: req.params.id,
      periodType: req.body.periodType || 'ALL',
      actor: 'admin'
    });
    const brl = Number(payout.amountBrl || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    res.redirect('/admin/streamer?success=' + encodeURIComponent(`Streamer marcado como pago: ${payout.amountCoins.toLocaleString('pt-BR')} ${env.currencyName} ≈ ${brl}. O saldo pendente foi zerado para esse período.`));
  } catch (err) {
    res.redirect('/admin/streamer?error=' + encodeURIComponent(err.message));
  }
});

adminRoutes.post('/streamer-support/payouts/:id/pay', async (req, res) => {
  try {
    assertAdminPassword(req.body);
    const payout = await markStreamerCommissionPaid({
      payoutId: req.params.id,
      actor: 'admin'
    });
    const brl = Number(payout.amountBrl || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    res.redirect('/admin/streamer?success=' + encodeURIComponent(`Solicitação paga: ${payout.streamerName} recebeu ${payout.amountCoins.toLocaleString('pt-BR')} ${env.currencyName} ≈ ${brl}.`));
  } catch (err) {
    res.redirect('/admin/streamer?error=' + encodeURIComponent(err.message));
  }
});

adminRoutes.post('/coupons', async (req, res) => {
  try {
    await upsertCouponFromBody(req.body);
    res.redirect('/admin/streamer?success=' + encodeURIComponent('Cupom criado/atualizado.'));
  } catch (err) {
    res.redirect('/admin/streamer?error=' + encodeURIComponent(err.message));
  }
});

adminRoutes.post('/coupons/:id/toggle', async (req, res) => {
  try {
    const current = await prisma.couponCode.findUnique({ where: { id: req.params.id } });
    if (!current) throw new Error('Cupom não encontrado.');
    await prisma.couponCode.update({ where: { id: current.id }, data: { active: !current.active } });
    await logAudit({ actor: 'admin', action: 'coupon.toggle', target: current.code, data: { active: !current.active } });
    res.redirect('/admin/streamer?success=' + encodeURIComponent('Status do cupom alterado.'));
  } catch (err) {
    res.redirect('/admin/streamer?error=' + encodeURIComponent(err.message));
  }
});

adminRoutes.post('/streamer/gameplay', async (req, res) => {
  if (DEATHMATCH_PANEL_LOCKED) return res.redirect('/admin/streamer?error=' + encodeURIComponent('Painel Death Match está bloqueado por enquanto.'));
  try {
    await saveDeathmatchGameplay(req.body);
    res.redirect('/admin/streamer?success=' + encodeURIComponent('Configuração do Death Match salva.'));
  } catch (err) {
    res.redirect('/admin/streamer?error=' + encodeURIComponent(err.message));
  }
});

adminRoutes.post('/streamer/streamers', async (req, res) => {
  if (DEATHMATCH_PANEL_LOCKED) return res.redirect('/admin/streamer?error=' + encodeURIComponent('Painel Death Match está bloqueado por enquanto.'));
  try {
    await upsertDeathmatchStreamer(req.body);
    res.redirect('/admin/streamer?success=' + encodeURIComponent('Streamer liberado/atualizado.'));
  } catch (err) {
    res.redirect('/admin/streamer?error=' + encodeURIComponent(err.message));
  }
});

adminRoutes.post('/streamer/streamers/:steam64/delete', async (req, res) => {
  if (DEATHMATCH_PANEL_LOCKED) return res.redirect('/admin/streamer?error=' + encodeURIComponent('Painel Death Match está bloqueado por enquanto.'));
  try {
    await removeDeathmatchStreamer(req.params.steam64);
    res.redirect('/admin/streamer?success=' + encodeURIComponent('Streamer removido.'));
  } catch (err) {
    res.redirect('/admin/streamer?error=' + encodeURIComponent(err.message));
  }
});

adminRoutes.post('/streamer/mappings', async (req, res) => {
  if (DEATHMATCH_PANEL_LOCKED) return res.redirect('/admin/streamer?error=' + encodeURIComponent('Painel Death Match está bloqueado por enquanto.'));
  try {
    await upsertDeathmatchGiftMapping(req.body);
    res.redirect('/admin/streamer?success=' + encodeURIComponent('Presente/ação salvo.'));
  } catch (err) {
    res.redirect('/admin/streamer?error=' + encodeURIComponent(err.message));
  }
});

adminRoutes.post('/streamer/mappings/:id/delete', async (req, res) => {
  if (DEATHMATCH_PANEL_LOCKED) return res.redirect('/admin/streamer?error=' + encodeURIComponent('Painel Death Match está bloqueado por enquanto.'));
  try {
    await removeDeathmatchGiftMapping(req.params.id);
    res.redirect('/admin/streamer?success=' + encodeURIComponent('Presente removido.'));
  } catch (err) {
    res.redirect('/admin/streamer?error=' + encodeURIComponent(err.message));
  }
});

adminRoutes.post('/streamer/test-event', async (req, res) => {
  if (DEATHMATCH_PANEL_LOCKED) return res.redirect('/admin/streamer?error=' + encodeURIComponent('Painel Death Match está bloqueado por enquanto.'));
  try {
    await enqueueDeathmatchGiftEvent({
      streamerSteam64: req.body.streamerSteam64,
      giftName: req.body.giftName,
      donorName: req.body.donorName || 'Teste Admin',
      repeatCount: req.body.repeatCount || 1,
      manualTest: true
    }, 'admin-test');
    res.redirect('/admin/streamer?success=' + encodeURIComponent('Teste enviado para a fila do Death Match.'));
  } catch (err) {
    res.redirect('/admin/streamer?error=' + encodeURIComponent(err.message));
  }
});

adminRoutes.post('/streamer/clear', async (req, res) => {
  if (DEATHMATCH_PANEL_LOCKED) return res.redirect('/admin/streamer?error=' + encodeURIComponent('Painel Death Match está bloqueado por enquanto.'));
  try {
    await clearDeathmatchStreamer({ streamerSteam64: req.body.streamerSteam64, reason: 'admin_clear' });
    res.redirect('/admin/streamer?success=' + encodeURIComponent('Fila e eventos ativos desse streamer foram limpos.'));
  } catch (err) {
    res.redirect('/admin/streamer?error=' + encodeURIComponent(err.message));
  }
});


adminRoutes.get('/links', async (req, res, next) => {
  try {
    const [presence, players] = await Promise.all([
      getPresenceAdminSnapshot(),
      prisma.player.findMany({
        select: { id: true, steam64: true, nickname: true, discordId: true, discordUsername: true, discordLinkedAt: true, lastSeenOnlineAt: true, onlineSince: true, lastSeenServerId: true },
        orderBy: { lastSeenOnlineAt: 'desc' }, take: 500
      })
    ]);
    res.render('admin/linking', { title: 'Vínculos Discord ↔ Steam', presence, players });
  } catch (err) { next(err); }
});

adminRoutes.post('/links/:playerId/unlink', async (req, res) => {
  try {
    await unlinkDiscordFromPlayer({ playerId: req.params.playerId, actor: req.body.actor || 'admin-site' });
    await logAudit({ actor: 'admin', action: 'account.discord.unlinked', target: req.params.playerId, data: {} });
    res.redirect('/admin/links?success=' + encodeURIComponent('Vínculo removido. O player poderá gerar outro código.'));
  } catch (err) { res.redirect('/admin/links?error=' + encodeURIComponent(err.message)); }
});

adminRoutes.get('/championship', async (req, res, next) => {
  try {
    const [dashboard, outbox] = await Promise.all([getChampionshipDashboard(), getDiscordOutboxStats()]);
    res.render('admin/championship', { title: 'Campeonato CHAMPIONS Z', ...dashboard, outbox });
  } catch (err) { next(err); }
});

adminRoutes.get('/championship/flags/:id/image', async (req, res) => {
  const flag = await prisma.clanFlagOption.findUnique({ where: { id: req.params.id }, select: { imageData: true, imageMime: true } }).catch(() => null);
  if (!flag?.imageData) return res.status(404).end();
  res.type(flag.imageMime || 'image/png').send(Buffer.from(flag.imageData, 'base64'));
});

adminRoutes.get('/championship/results/:id/image', async (req, res) => {
  const result = await prisma.championshipResult.findUnique({ where: { id: req.params.id }, select: { imageData: true, imageMime: true } }).catch(() => null);
  if (!result?.imageData) return res.status(404).end();
  res.type(result.imageMime || 'image/jpeg').send(Buffer.from(result.imageData, 'base64'));
});

adminRoutes.post('/championship/flags', championshipUpload.single('flagImage'), async (req, res) => {
  try {
    const image = prepareRawUploadedImage(req.file);
    await createClanFlagOption({ name: req.body.name, classname: req.body.classname, description: req.body.description, imageData: image?.imageData || null, imageMime: image?.imageMime || null, imageUrl: req.body.imageUrl });
    res.redirect('/admin/championship?success=' + encodeURIComponent('Bandeira adicionada ao catálogo.'));
  } catch (err) { res.redirect('/admin/championship?error=' + encodeURIComponent(err.message)); }
});

adminRoutes.post('/championship/clans/:id/flag-delivered', async (req, res) => {
  try {
    await markClanFlagDelivered({ clanId: req.params.id, actor: req.body.actor || 'admin-site' });
    res.redirect('/admin/championship?success=' + encodeURIComponent('Bandeira marcada como entregue.'));
  } catch (err) { res.redirect('/admin/championship?error=' + encodeURIComponent(err.message)); }
});

adminRoutes.post('/championship/results', championshipUpload.single('eventImage'), async (req, res) => {
  try {
    const image = prepareRawUploadedImage(req.file);
    const result = await createChampionshipResult({
      clanId: req.body.clanId, eventName: req.body.eventName, title: req.body.title,
      description: req.body.description, points: req.body.points,
      imageData: image?.imageData || null, imageMime: image?.imageMime || null,
      adminActor: req.body.adminActor || 'admin-site', occurredAt: req.body.occurredAt || null
    });
    await logAudit({ actor: req.body.adminActor || 'admin', action: 'championship.result.created', target: result.id, data: { clanId: req.body.clanId, points: Number(req.body.points || 0), eventName: req.body.eventName } });
    res.redirect('/admin/championship?success=' + encodeURIComponent('Resultado salvo. O Discord receberá a publicação automaticamente.'));
  } catch (err) { res.redirect('/admin/championship?error=' + encodeURIComponent(err.message)); }
});

adminRoutes.get('/eventos', async (req, res, next) => {
  try {
    const dashboard = await getAdminTerritoryKillEventDashboard({ editId: req.query.edit || null });
    res.render('admin/events', { title: 'Evento de Kills', ...dashboard });
  } catch (err) {
    next(err);
  }
});

adminRoutes.post('/eventos/save', async (req, res) => {
  try {
    const event = await upsertTerritoryKillEvent(req.body, req.body.id || null);
    res.redirect('/admin/eventos?edit=' + encodeURIComponent(event.id) + '&success=' + encodeURIComponent('Evento salvo com as travas anti-farm.'));
  } catch (err) {
    res.redirect('/admin/eventos?error=' + encodeURIComponent(err.message));
  }
});

adminRoutes.post('/eventos/:id/toggle', async (req, res) => {
  try {
    const active = String(req.body.active || '') === 'true';
    const event = await setTerritoryKillEventActive(req.params.id, active);
    res.redirect('/admin/eventos?edit=' + encodeURIComponent(event.id) + '&success=' + encodeURIComponent(active ? 'Evento ativado. Outros eventos do mesmo servidor foram pausados.' : 'Evento desativado.'));
  } catch (err) {
    res.redirect('/admin/eventos?error=' + encodeURIComponent(err.message));
  }
});

adminRoutes.post('/eventos/:id/delete', async (req, res) => {
  try {
    const deleted = await deleteTerritoryKillEvent(req.params.id);
    res.redirect('/admin/eventos?success=' + encodeURIComponent(`Evento “${deleted.name}” excluído. Ranking e histórico zerados; as moedas já pagas foram mantidas.`));
  } catch (err) {
    res.redirect('/admin/eventos?error=' + encodeURIComponent(err.message));
  }
});

adminRoutes.post('/eventos/:id/reprocess', async (req, res) => {
  try {
    const result = await reprocessTerritoryEventKills(req.params.id, req.body.limit || 5000);
    res.redirect('/admin/eventos?edit=' + encodeURIComponent(req.params.id) + '&success=' + encodeURIComponent(`Reprocessamento concluído: ${result.rewarded} premiadas, ${result.rejected} bloqueadas e ${result.duplicates} já processadas.`));
  } catch (err) {
    res.redirect('/admin/eventos?edit=' + encodeURIComponent(req.params.id) + '&error=' + encodeURIComponent(err.message));
  }
});

adminRoutes.get('/ranking', async (req, res, next) => {
  try {
    const [rankingData, requests, clans, seasons, badges, recentKills] = await Promise.all([
      getRankingData({ server: req.query.server || 'global', period: req.query.period || 'weekly' }),
      prisma.clanRequest.findMany({ orderBy: { createdAt: 'desc' }, take: 80 }),
      prisma.clan.findMany({ include: { ownerPlayer: true, subOwnerPlayer: true, members: { where: { status: 'ACTIVE' }, include: { player: true } }, awards: { orderBy: { awardedAt: 'desc' } } }, orderBy: { createdAt: 'desc' } }),
      prisma.season.findMany({ orderBy: { startsAt: 'desc' }, take: 40 }),
      prisma.playerBadge.findMany({ orderBy: { awardedAt: 'desc' }, take: 80 }),
      prisma.killEvent.findMany({ orderBy: { occurredAt: 'desc' }, take: 60 })
    ]);
    res.render('admin/ranking', { title: 'Ranking e Clãs', rankingData, requests, clans, seasons, badges, recentKills });
  } catch (err) {
    next(err);
  }
});


adminRoutes.post('/ranking/send-discord', async (req, res) => {
  try {
    const server = ['global', 'vanilla', 'bbp'].includes(String(req.body.serverType || '').toLowerCase()) ? String(req.body.serverType).toLowerCase() : 'vanilla';
    const kind = String(req.body.kind || 'players').toLowerCase() === 'clans' ? 'clans' : 'players';
    const period = ['daily', 'weekly', 'monthly', 'season', 'all'].includes(String(req.body.period || '').toLowerCase()) ? String(req.body.period).toLowerCase() : 'all';
    const rankingData = await getRankingData({ server, period });
    await sendRankingToDiscord({ rankingData, kind, server, period });
    await logAudit({ actor: 'admin', action: 'ranking.discord.sent', target: `${kind}:${server}:${period}`, data: { count: kind === 'clans' ? rankingData.clanRanking.length : rankingData.playerRanking.length } });
    res.redirect('/admin/ranking?success=' + encodeURIComponent(`Ranking de ${kind === 'clans' ? 'clãs' : 'players'} ${server.toUpperCase()} enviado no Discord.`));
  } catch (err) {
    res.redirect('/admin/ranking?error=' + encodeURIComponent(err.message));
  }
});

adminRoutes.post('/ranking/kills/test', async (req, res) => {
  try {
    const kill = await registerKillEventFromGame(req.body);
    await logAudit({ actor: 'admin', action: 'ranking.kill.test_created', target: kill.id, data: { serverType: kill.serverType, killer: kill.killerSteam64, victim: kill.victimSteam64 } });
    res.redirect('/admin/ranking?success=' + encodeURIComponent('Kill de teste cadastrada no ranking.'));
  } catch (err) {
    res.redirect('/admin/ranking?error=' + encodeURIComponent(err.message));
  }
});

adminRoutes.post('/clans', async (req, res) => {
  try {
    const clan = await createClanWithOwner(req.body);
    await logAudit({ actor: 'admin', action: 'clan.created', target: clan.id, data: { name: clan.name, tag: clan.tag, serverType: clan.serverType } });
    res.redirect('/admin/ranking?success=' + encodeURIComponent('Clã criado e dono cadastrado.'));
  } catch (err) {
    res.redirect('/admin/ranking?error=' + encodeURIComponent(err.message));
  }
});

adminRoutes.post('/clans/from-request/:id/approve', async (req, res) => {
  try {
    const request = await prisma.clanRequest.findUnique({ where: { id: req.params.id } });
    if (!request) throw new Error('Solicitação não encontrada.');
    const clan = await createClanWithOwner({
      name: request.clanName,
      tag: request.clanTag,
      serverType: request.serverType,
      ownerSteam64: request.requesterSteam64,
      ownerName: request.requesterName || '',
      description: request.description || '',
      flagUrl: request.flagUrl || ''
    });
    await prisma.clanRequest.update({ where: { id: request.id }, data: { status: 'APPROVED', adminNote: req.body.adminNote || null } });
    await logAudit({ actor: 'admin', action: 'clan.request.approved', target: request.id, data: { clanId: clan.id } });
    res.redirect('/admin/ranking?success=' + encodeURIComponent('Solicitação aprovada. Clã criado e dono liberado.'));
  } catch (err) {
    res.redirect('/admin/ranking?error=' + encodeURIComponent(err.message));
  }
});

adminRoutes.post('/clans/from-request/:id/reject', async (req, res) => {
  try {
    await prisma.clanRequest.update({ where: { id: req.params.id }, data: { status: 'REJECTED', adminNote: req.body.adminNote || null } });
    res.redirect('/admin/ranking?success=' + encodeURIComponent('Solicitação recusada.'));
  } catch (err) {
    res.redirect('/admin/ranking?error=' + encodeURIComponent(err.message));
  }
});

adminRoutes.post('/clans/:id/update', async (req, res) => {
  try {
    const data = {
      name: String(req.body.name || '').trim(),
      tag: String(req.body.tag || '').trim().toUpperCase().slice(0, 8),
      serverType: ['all', 'vanilla', 'bbp'].includes(String(req.body.serverType || '').toLowerCase()) ? String(req.body.serverType).toLowerCase() : 'all',
      description: String(req.body.description || '').trim() || null,
      flagUrl: String(req.body.flagUrl || '').trim() || null,
      status: req.body.status || 'ACTIVE',
      eventWins: Number(req.body.eventWins || 0),
      pointsBonus: Number(req.body.pointsBonus || 0)
    };
    if (!data.name || !data.tag) throw new Error('Nome e TAG são obrigatórios.');
    await prisma.clan.update({ where: { id: req.params.id }, data });
    res.redirect('/admin/ranking?success=' + encodeURIComponent('Clã atualizado.'));
  } catch (err) {
    res.redirect('/admin/ranking?error=' + encodeURIComponent(err.message));
  }
});

adminRoutes.post('/clans/:id/award', async (req, res) => {
  try {
    const points = parsePoints(req.body.points);
    const clan = await prisma.clan.findUnique({
      where: { id: req.params.id },
      include: { members: { where: { status: 'ACTIVE' }, include: { player: true } } }
    });
    if (!clan) throw new Error('Clã não encontrado.');
    const title = String(req.body.title || '').trim() || 'Campeão de Evento';
    const description = String(req.body.description || '').trim() || null;
    const eventName = String(req.body.eventName || '').trim() || null;
    const icon = String(req.body.icon || '🏆').trim() || '🏆';
    const color = /^#[0-9a-f]{6}$/i.test(String(req.body.color || '')) ? req.body.color : '#f7bd44';
    const imageUrl = cleanImageUrl(req.body.imageUrl);
    const visible = req.body.visible !== 'off';

    const award = await prisma.$transaction(async (tx) => {
      const created = await tx.clanAward.create({
        data: { clanId: clan.id, seasonId: req.body.seasonId || null, title, description, eventName, icon, imageUrl, color, points, visible }
      });
      await tx.clan.update({ where: { id: clan.id }, data: { eventWins: { increment: 1 }, pointsBonus: { increment: points } } });
      if (req.body.awardPlayers !== 'off') {
        for (const member of clan.members) {
          await tx.playerBadge.create({
            data: {
              steam64: member.steam64,
              playerName: member.player?.nickname || null,
              seasonId: req.body.seasonId || null,
              title,
              description: description || `Troféu recebido pelo clã [${clan.tag}] ${clan.name}.`,
              icon,
              imageUrl,
              color,
              points,
              visible
            }
          });
        }
      }
      return created;
    });
    await logAudit({ actor: 'admin', action: 'clan.award.created', target: award.id, data: { clanId: req.params.id, title: award.title, points } });
    res.redirect('/admin/ranking?success=' + encodeURIComponent('Troféu PNG/pontos adicionados ao clã e players.'));
  } catch (err) {
    res.redirect('/admin/ranking?error=' + encodeURIComponent(err.message));
  }
});

adminRoutes.post('/seasons', async (req, res) => {
  try {
    const name = String(req.body.name || '').trim();
    if (!name) throw new Error('Nome da temporada obrigatório.');
    const slug = `${slugify(name)}-${Date.now().toString(36)}`;
    await prisma.season.create({ data: { name, slug, startsAt: req.body.startsAt ? new Date(req.body.startsAt) : new Date(), note: req.body.note || null, status: 'ACTIVE' } });
    res.redirect('/admin/ranking?success=' + encodeURIComponent('Temporada criada.'));
  } catch (err) {
    res.redirect('/admin/ranking?error=' + encodeURIComponent(err.message));
  }
});

adminRoutes.post('/seasons/:id/close', async (req, res) => {
  try {
    assertAdminPassword(req.body);
    const points = parsePoints(req.body.points);
    const imageUrl = cleanImageUrl(req.body.imageUrl);
    const icon = String(req.body.icon || '👑').trim() || '👑';
    const color = /^#[0-9a-f]{6}$/i.test(String(req.body.color || '')) ? req.body.color : '#f7bd44';
    const championTitle = String(req.body.championTitle || 'Campeão da Temporada').trim();
    const note = String(req.body.note || '').trim() || null;

    const season = await prisma.season.update({
      where: { id: req.params.id },
      data: {
        status: 'CLOSED',
        endsAt: new Date(),
        championClanId: req.body.championClanId || null,
        championPlayerSteam64: String(req.body.championPlayerSteam64 || '').trim() || null,
        championTitle,
        note
      }
    });

    if (req.body.championClanId) {
      const clan = await prisma.clan.findUnique({
        where: { id: req.body.championClanId },
        include: { members: { where: { status: 'ACTIVE' }, include: { player: true } } }
      });
      if (clan) {
        await prisma.$transaction(async (tx) => {
          await tx.clanAward.create({ data: { clanId: clan.id, seasonId: season.id, title: championTitle, description: note, icon, imageUrl, color, points, eventName: season.name, visible: true } });
          await tx.clan.update({ where: { id: clan.id }, data: { eventWins: { increment: 1 }, pointsBonus: { increment: points } } });
          for (const member of clan.members) {
            await tx.playerBadge.create({ data: { steam64: member.steam64, playerName: member.player?.nickname || null, title: championTitle, description: note || `Campeão da temporada pelo clã [${clan.tag}] ${clan.name}.`, icon, imageUrl, color, points, seasonId: season.id, visible: true } });
          }
        });
      }
    }
    if (req.body.championPlayerSteam64) {
      await prisma.playerBadge.create({ data: { steam64: String(req.body.championPlayerSteam64).trim(), title: championTitle, description: note, icon, imageUrl, color, points, seasonId: season.id, visible: true } });
    }
    await logAudit({ actor: 'admin', action: 'season.closed.secure', target: season.id, data: { championClanId: req.body.championClanId || null, points } });
    res.redirect('/admin/ranking?success=' + encodeURIComponent('Temporada finalizada com senha. Campeões e troféus salvos no histórico.'));
  } catch (err) {
    res.redirect('/admin/ranking?error=' + encodeURIComponent(err.message));
  }
});

adminRoutes.post('/player-badges', async (req, res) => {
  try {
    const steam64 = String(req.body.steam64 || '').trim();
    if (!/^\d{17}$/.test(steam64)) throw new Error('Steam64 inválido.');
    await prisma.playerBadge.create({
      data: {
        steam64,
        playerName: String(req.body.playerName || '').trim() || null,
        seasonId: req.body.seasonId || null,
        title: String(req.body.title || '').trim() || 'Destaque do Servidor',
        description: String(req.body.description || '').trim() || null,
        icon: String(req.body.icon || '⭐').trim() || '⭐',
        imageUrl: cleanImageUrl(req.body.imageUrl),
        color: /^#[0-9a-f]{6}$/i.test(String(req.body.color || '')) ? req.body.color : '#38bdf8',
        points: parsePoints(req.body.points),
        visible: req.body.visible !== 'off'
      }
    });
    res.redirect('/admin/ranking?success=' + encodeURIComponent('Badge do player criada.'));
  } catch (err) {
    res.redirect('/admin/ranking?error=' + encodeURIComponent(err.message));
  }
});


adminRoutes.post('/clans/:id/delete', async (req, res) => {
  try {
    assertAdminPassword(req.body);
    const clan = await prisma.clan.findUnique({ where: { id: req.params.id } });
    if (!clan) throw new Error('Clã não encontrado.');
    const normalizedTag = normalizeClanTagForDelete(clan.tag);
    const expected = `APAGAR ${normalizedTag}`;
    const legacyTypedConfirmation = String(req.body.confirmClanDelete || '').trim();
    const received = normalizeClanDeletePhrase(legacyTypedConfirmation || req.body.confirmClanDeleteToken);
    const confirmedByCheck = ['1', 'true', 'on', 'sim', 'yes'].includes(String(req.body.confirmClanDeleteCheck || '').toLowerCase());
    if (!confirmedByCheck && !legacyTypedConfirmation) throw new Error('Marque a confirmação para apagar o clã.');
    if (!normalizedTag || received !== `APAGAR${normalizedTag}`) {
      throw new Error(`Confirmação inválida. Atualize a página e tente apagar o clã novamente (${expected}).`);
    }
    await revokeClanManagedOutfitAccess(clan.id);
    await prisma.clan.delete({ where: { id: clan.id } });
    await logAudit({ actor: 'admin', action: 'clan.deleted.secure', target: clan.id, data: { name: clan.name, tag: clan.tag } });
    res.redirect('/admin/ranking?success=' + encodeURIComponent('Clã apagado com segurança.'));
  } catch (err) {
    res.redirect('/admin/ranking?error=' + encodeURIComponent(err.message));
  }
});

adminRoutes.post('/ranking/wipe', async (req, res) => {
  try {
    assertAdminPassword(req.body);
    if (String(req.body.confirm || '').trim().toUpperCase() !== 'WIPE') {
      throw new Error('Digite WIPE no campo de confirmação para limpar o ranking.');
    }
    const server = String(req.body.serverType || 'all').toLowerCase();
    const where = ['vanilla', 'bbp'].includes(server) ? { serverType: server } : {};
    const result = await prisma.killEvent.deleteMany({ where });
    await logAudit({ actor: 'admin', action: 'ranking.wipe.secure', target: server, data: { deletedKills: result.count } });
    res.redirect('/admin/ranking?success=' + encodeURIComponent(`Wipe feito: ${result.count} kills removidas do ranking ${server.toUpperCase()}. Clãs e troféus foram mantidos.`));
  } catch (err) {
    res.redirect('/admin/ranking?error=' + encodeURIComponent(err.message));
  }
});

adminRoutes.post('/send-monthly-report', async (req, res) => {
  try {
    await sendCurrentMonthlyReport();
    res.redirect('/admin?success=Resumo mensal enviado no Discord.');
  } catch (err) {
    res.redirect(`/admin?error=${encodeURIComponent(err.message)}`);
  }
});


adminRoutes.get('/sales', async (req, res) => {
  const selectedMonth = String(req.query.month || '');
  const monthDate = parseMonthKey(selectedMonth);
  const stats = await getMonthlyStats(monthDate);
  const history = await getMonthlyHistory(12);
  const { start, end } = { start: new Date(monthDate.getFullYear(), monthDate.getMonth(), 1), end: new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1) };
  const [payments, purchases] = await Promise.all([
    prisma.payment.findMany({
      where: { status: 'APPROVED', approvedAt: { gte: start, lt: end } },
      select: {
        id: true, approvedAt: true, createdAt: true, amountBrl: true, coins: true, providerPaymentId: true,
        player: { select: { nickname: true, steam64: true } },
        coinPackage: { select: { name: true } }
      },
      orderBy: { approvedAt: 'desc' },
      take: 200
    }),
    prisma.purchase.findMany({
      where: { createdAt: { gte: start, lt: end } },
      select: {
        id: true, createdAt: true, quantity: true, totalCoins: true,
        player: { select: { nickname: true, steam64: true } },
        product: { select: { name: true, serverType: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 200
    })
  ]);
  res.render('admin/sales', { title: 'Vendas', stats, history, payments, purchases, selectedMonth: stats.monthKey });
});

adminRoutes.get('/logs', async (req, res) => {
  const [auditLogs, ledgers, deliveries] = await Promise.all([
    prisma.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 250 }),
    prisma.coinLedger.findMany({
      select: { id: true, createdAt: true, type: true, amount: true, balanceAfter: true, reason: true, player: { select: { nickname: true, steam64: true } } },
      orderBy: { createdAt: 'desc' }, take: 120
    }),
    prisma.deliveryQueue.findMany({
      select: { id: true, updatedAt: true, productName: true, status: true, error: true, player: { select: { nickname: true, steam64: true } } },
      orderBy: { updatedAt: 'desc' }, take: 120
    })
  ]);
  res.render('admin/logs', { title: 'Logs', auditLogs, ledgers, deliveries });
});



async function getVehicleAdminLists() {
  const [templateRows, planRows, playerVehicles] = await Promise.all([
    prisma.vehicleTemplate.findMany({
      where: { active: true },
      omit: { imageData: true },
      include: { insurancePlans: { where: { active: true, billingType: 'SUBSCRIPTION' }, orderBy: { createdAt: 'desc' } } },
      orderBy: [{ active: 'desc' }, { createdAt: 'desc' }]
    }),
    prisma.vehicleInsurancePlan.findMany({
      where: { active: true, billingType: 'SUBSCRIPTION' },
      include: { template: { omit: { imageData: true } } },
      orderBy: [{ active: 'desc' }, { createdAt: 'desc' }]
    }),
    prisma.playerVehicle.findMany({
      include: {
        player: { select: { id: true, nickname: true, steam64: true } },
        template: { omit: { imageData: true } },
        insurancePlan: true
      },
      orderBy: { updatedAt: 'desc' }, take: 80
    })
  ]);
  return {
    templates: templateRows.map(item => ({ ...item, hasImageData: Boolean(item.imageMime) })),
    plans: planRows,
    playerVehicles
  };
}

adminRoutes.get('/vehicles', async (req, res) => {
  const lists = await getVehicleAdminLists();
  res.render('admin/vehicles', { title: 'Veículos e Seguros', ...lists, vehicle: null, partsToText, variantsToText, cargoItemsToText });
});

adminRoutes.get('/vehicles/:id/edit', async (req, res) => {
  const [lists, vehicleRow] = await Promise.all([
    getVehicleAdminLists(),
    prisma.vehicleTemplate.findUnique({ where: { id: req.params.id }, omit: { imageData: true }, include: { insurancePlans: true } })
  ]);
  const vehicle = vehicleRow ? { ...vehicleRow, hasImageData: Boolean(vehicleRow.imageMime) } : null;
  res.render('admin/vehicles', { title: 'Editar Veículo', ...lists, vehicle, partsToText, variantsToText, cargoItemsToText });
});

adminRoutes.post('/vehicles', async (req, res) => {
  try {
    const vehicle = await createOrUpdateVehicleTemplateFromBody({ body: req.body });
    await logAudit({ actor: 'admin', action: 'vehicle.template.created', target: vehicle.id, data: { name: vehicle.name, serverType: vehicle.serverType, vehicleClassname: vehicle.vehicleClassname } });
    res.redirect('/admin/vehicles?success=Veículo cadastrado.');
  } catch (err) {
    res.redirect('/admin/vehicles?error=' + encodeURIComponent(err.message));
  }
});

adminRoutes.post('/vehicles/:id', async (req, res) => {
  try {
    const vehicle = await createOrUpdateVehicleTemplateFromBody({ body: req.body, id: req.params.id });
    await logAudit({ actor: 'admin', action: 'vehicle.template.updated', target: vehicle.id, data: { name: vehicle.name, serverType: vehicle.serverType, vehicleClassname: vehicle.vehicleClassname } });
    res.redirect('/admin/vehicles?success=Veículo atualizado.');
  } catch (err) {
    res.redirect('/admin/vehicles?error=' + encodeURIComponent(err.message));
  }
});

adminRoutes.post('/vehicles/:id/delete-image', async (req, res) => {
  await prisma.vehicleTemplate.update({ where: { id: req.params.id }, data: { imageData: null, imageMime: null, imageUrl: null } });
  await logAudit({ actor: 'admin', action: 'vehicle.image.deleted', target: req.params.id });
  res.redirect('/admin/vehicles?success=Imagem do veículo removida.');
});

adminRoutes.post('/vehicles/:id/delete', async (req, res) => {
  try {
    const vehicle = await prisma.vehicleTemplate.findUnique({
      where: { id: req.params.id },
      include: { _count: { select: { playerVehicles: true } } }
    });
    if (!vehicle) throw new Error('Veículo não encontrado.');
    await addSeedTombstone(SEED_DELETED_VEHICLES_KEY, vehicle.slug);
    await prisma.vehicleInsurancePlan.updateMany({ where: { templateId: vehicle.id }, data: { active: false } });
    if (vehicle._count.playerVehicles > 0) {
      await prisma.vehicleTemplate.update({ where: { id: vehicle.id }, data: { active: false } });
      await logAudit({ actor: 'admin', action: 'vehicle.template.deactivated_by_button', target: vehicle.id, data: { name: vehicle.name, slug: vehicle.slug, playerVehicles: vehicle._count.playerVehicles, seedBlocked: true } });
      return res.redirect('/admin/vehicles?success=' + encodeURIComponent('Veículo removido da loja e marcado para não voltar em updates. Como já tinha player usando, ele foi apenas desativado para preservar histórico/garagem.'));
    }
    await prisma.vehicleTemplate.delete({ where: { id: vehicle.id } });
    await logAudit({ actor: 'admin', action: 'vehicle.template.deleted_by_button', target: vehicle.id, data: { name: vehicle.name, slug: vehicle.slug, seedBlocked: true } });
    res.redirect('/admin/vehicles?success=' + encodeURIComponent('Veículo excluído da loja e marcado para não voltar depois de atualizar.'));
  } catch (err) {
    res.redirect('/admin/vehicles?error=' + encodeURIComponent(err.message));
  }
});


adminRoutes.post('/vehicles/reset-store', async (req, res) => {
  try {
    const currentVehicleSlugs = (await prisma.vehicleTemplate.findMany({ select: { slug: true } })).map(v => v.slug);
    await addSeedTombstones(SEED_DELETED_VEHICLES_KEY, currentVehicleSlugs);
    await prisma.$transaction(async (tx) => {
      await tx.vehicleInsurancePlan.updateMany({ data: { active: false } });
      await tx.vehicleInsurancePlan.deleteMany({ where: { playerVehicles: { none: {} } } });
      await tx.vehicleTemplate.updateMany({ data: { active: false } });
      await tx.vehicleTemplate.deleteMany({ where: { playerVehicles: { none: {} } } });
      await tx.appSetting.upsert({
        where: { key: 'vehicles.insurance.reset.v56' },
        update: { value: { resetAt: new Date().toISOString(), mode: 'admin_button' } },
        create: { key: 'vehicles.insurance.reset.v56', value: { resetAt: new Date().toISOString(), mode: 'admin_button' } }
      });
    });
    await logAudit({ actor: 'admin', action: 'vehicles_insurance.reset_store_v66', target: 'vehicleTemplate+insurancePlan', data: { seedBlockedSlugs: currentVehicleSlugs.length } });
    res.redirect('/admin/vehicles?success=' + encodeURIComponent('Veículos e seguros da loja zerados e marcados para não voltarem após update. Dados dos players foram preservados.'));
  } catch (err) {
    res.redirect('/admin/vehicles?error=' + encodeURIComponent(err.message));
  }
});

adminRoutes.post('/vehicle-insurance-plans', async (req, res) => {
  try {
    const plan = await createInsurancePlanFromBody(req.body);
    await logAudit({ actor: 'admin', action: 'vehicle.insurance_plan.created', target: plan.id, data: { name: plan.name, billingType: plan.billingType, priceCoins: plan.priceCoins, maxUsesPerWeek: plan.maxUsesPerWeek } });
    res.redirect('/admin/vehicles?success=Plano de seguro criado.');
  } catch (err) {
    res.redirect('/admin/vehicles?error=' + encodeURIComponent(err.message));
  }
});

adminRoutes.post('/vehicle-insurance-plans/:id/toggle', async (req, res) => {
  try {
    const current = await prisma.vehicleInsurancePlan.findUnique({ where: { id: req.params.id } });
    if (!current) throw new Error('Plano não encontrado.');
    if (current.billingType !== 'SUBSCRIPTION') throw new Error('Seguro por uso removido. Crie ou use um plano mensal.');
    await prisma.vehicleInsurancePlan.update({ where: { id: req.params.id }, data: { active: !current.active } });
    res.redirect('/admin/vehicles?success=Plano atualizado.');
  } catch (err) {
    res.redirect('/admin/vehicles?error=' + encodeURIComponent(err.message));
  }
});

adminRoutes.post('/player-vehicles/:id/restore-missing', async (req, res) => {
  try {
    const result = await restoreMissingVehicleWithSameId({ playerVehicleId: req.params.id });
    const details = [
      `Carro sumido restaurado com o mesmo ID ${result.vehicleKey}.`,
      result.cancelledClaims ? `${result.cancelledClaims} solicitação(ões) travada(s) foram canceladas.` : null,
      result.restoredInsuranceUses ? `${result.restoredInsuranceUses} uso(s) de seguro foram devolvidos.` : null,
      result.refundedCoins ? `${result.refundedCoins.toLocaleString('pt-BR')} ${env.currencyName} foram estornados.` : null,
      result.fileBridgeImmediate?.ok ? 'Entrega pronta para a API do mod.' : 'Entrega salva e aguardando o próximo ciclo da API.'
    ].filter(Boolean).join(' ');
    res.redirect('/admin/vehicles?success=' + encodeURIComponent(details));
  } catch (err) {
    res.redirect('/admin/vehicles?error=' + encodeURIComponent(err.message));
  }
});

adminRoutes.post('/player-vehicles/:id/reset-delivery', async (req, res) => {
  try {
    const result = await prisma.$transaction(async (tx) => {
      const v = await tx.playerVehicle.findUnique({ where: { id: req.params.id }, include: { player: true, template: true } });
      if (!v) throw new Error('Veículo do player não encontrado.');

      const pending = await tx.vehicleRespawnLog.findFirst({
        where: { playerVehicleId: v.id, status: 'PENDING', action: { in: ['RESPAWN', 'ADMIN_RESPAWN', 'ADMIN_RESTORE_MISSING'] } },
        orderBy: { createdAt: 'desc' }
      });
      if (pending) throw new Error('Já existe uma reposição pendente para esse veículo. Não foi criada outra.');

      const oldKey = v.currentVehicleKey || null;
      const newKey = `RZADMIN_${v.id}_${Date.now().toString(36)}`;
      const delivery = await tx.deliveryQueue.create({
        data: {
          purchaseId: null,
          playerId: v.playerId,
          steam64: v.steam64,
          serverType: v.serverType,
          productName: `Admin reposição: ${v.displayName}`,
          classname: v.vehicleClassname,
          quantity: 1,
          deliveryType: 'vehicle_mod_preset',
          status: 'PENDING',
          meta: { kind: 'vehicle_rental', action: 'ADMIN_RESPAWN', playerVehicleId: v.id, vehicleKey: newKey, deleteOldVehicleKey: oldKey, displayName: v.displayName, ...vehicleTemplatePayload({ ...v.template, vehicleClassname: v.vehicleClassname }), vehicleClassname: v.vehicleClassname, deliveryMode: 'vehicle_mod_preset', fullVehicle: false, mounted: false, shouldMountParts: false }
        }
      });
      await tx.playerVehicle.update({ where: { id: v.id }, data: { currentVehicleKey: newKey } });
      await tx.vehicleRespawnLog.create({
        data: { playerVehicleId: v.id, playerId: v.playerId, deliveryId: delivery.id, action: 'ADMIN_RESPAWN', oldVehicleKey: oldKey, newVehicleKey: newKey, status: 'PENDING' }
      });
      const accessoryDeliveries = await createVehiclePlayerInventoryAccessoryDeliveries({
        tx,
        playerId: v.playerId,
        steam64: v.steam64,
        serverType: v.serverType,
        action: 'ADMIN_RESPAWN',
        parentDeliveryId: delivery.id,
        playerVehicleId: v.id,
        displayName: v.displayName
      });
      return { vehicleId: v.id, steam64: v.steam64, deliveryId: delivery.id, accessoryDeliveryIds: accessoryDeliveries.map(item => item.id), oldKey, newKey };
    }, { isolationLevel: 'Serializable' });

    await logAudit({ actor: 'admin', action: 'vehicle.admin_respawn.created', target: result.vehicleId, data: result });
    await queueVehicleDeliveryImmediately(result.steam64, 'reposição admin de veículo');
    res.redirect('/admin/vehicles?success=' + encodeURIComponent('Reposição admin criada e pronta para o próximo ciclo da API.'));
  } catch (err) {
    res.redirect('/admin/vehicles?error=' + encodeURIComponent(err.message));
  }
});


adminRoutes.get('/starter-kit', async (req, res) => {
  const kit = await getStarterKit();
  res.render('admin/starterKit', { title: 'Kit Inicial', kit, starterKitItemsToText });
});

adminRoutes.post('/starter-kit', async (req, res) => {
  try {
    await saveStarterKitFromBody(req.body, req.file);
    res.redirect('/admin/starter-kit?success=' + encodeURIComponent('Kit inicial atualizado.'));
  } catch (err) {
    res.redirect('/admin/starter-kit?error=' + encodeURIComponent(err.message));
  }
});

adminRoutes.post('/starter-kit/test-drop', async (req, res) => {
  try {
    const result = await dropStarterKitForAdmin({ steam64: req.body.steam64, serverType: req.body.serverType });
    res.redirect('/admin/starter-kit?success=' + encodeURIComponent(`Drop de teste criado para ${result.player.steam64} no ${result.serverType.toUpperCase()} com ${result.deliveries.length} item(ns).`));
  } catch (err) {
    res.redirect('/admin/starter-kit?error=' + encodeURIComponent(err.message));
  }
});

async function renderProductsAdmin(req, res, overrides = {}) {
  const [productRows, globalPromo, categoryConfig] = await Promise.all([
    prisma.product.findMany({
      omit: { imageData: true },
      include: { items: { orderBy: { sortOrder: 'asc' } } },
      orderBy: [{ status: 'asc' }, { featured: 'desc' }, { createdAt: 'desc' }]
    }),
    getGlobalPromo(prisma),
    getStoreCategoryConfig()
  ]);
  const products = productRows.map(item => ({ ...item, hasImageData: Boolean(item.imageMime) }));
  const categoryStats = buildCategoryStats(categoryConfig.categories, products);
  const categoryTree = buildCategoryTree(categoryStats);
  const selectedCategory = resolveSelectedCategory(categoryStats, req.query);
  const activeTab = ['products', 'create', 'categories', 'promo', 'catalog'].includes(String(req.query.tab || ''))
    ? String(req.query.tab)
    : (overrides.product ? 'create' : 'products');
  res.render('admin/products', {
    title: overrides.title || 'Produtos',
    products,
    product: overrides.product || null,
    globalPromo,
    storeCategories: categoryStats,
    categoryTree,
    selectedCategory,
    dayzCatalog: [],
    activeTab,
    currentCategoryQuery: String(req.query.category || req.query.cat || '')
  });
}

adminRoutes.get('/products', async (req, res) => {
  await renderProductsAdmin(req, res);
});

adminRoutes.get('/products/:id/edit', async (req, res) => {
  const productRow = await prisma.product.findUnique({
    where: { id: req.params.id },
    omit: { imageData: true },
    include: { items: { orderBy: { sortOrder: 'asc' } } }
  });
  const product = productRow ? { ...productRow, hasImageData: Boolean(productRow.imageMime) } : null;
  await renderProductsAdmin(req, res, { title: 'Editar Produto', product });
});

adminRoutes.post('/categories', async (req, res) => {
  try {
    const config = await getStoreCategoryConfig();
    const originalName = normalizeCategoryName(req.body.originalName);
    const originalServerType = normalizeCategoryServerType(req.body.originalServerType || req.body.serverType || 'all');
    const name = normalizeCategoryName(req.body.name);
    const serverType = normalizeCategoryServerType(req.body.serverType || 'all');
    const parentName = normalizeCategoryName(req.body.parentName) || null;
    if (!name) throw new Error('Digite o nome da categoria.');
    if (parentName && parentName.toLowerCase() === name.toLowerCase()) throw new Error('A categoria não pode ser filha dela mesma.');

    const existingIndex = originalName
      ? config.categories.findIndex((item) => item.serverType === originalServerType && item.name.toLowerCase() === originalName.toLowerCase())
      : config.categories.findIndex((item) => item.serverType === serverType && item.name.toLowerCase() === name.toLowerCase());

    const duplicate = config.categories.some((item, idx) => idx !== existingIndex && item.serverType === serverType && item.name.toLowerCase() === name.toLowerCase());
    if (duplicate) throw new Error('Essa categoria já existe nesse servidor.');

    const data = {
      name,
      serverType,
      parentName,
      order: Number.isFinite(Number(req.body.order)) ? Number(req.body.order) : (config.categories.length ? Math.max(...config.categories.map(i => i.order || 0)) + 10 : 10),
      icon: normalizeCategoryIcon(req.body.icon),
      color: normalizeCategoryColor(req.body.color),
      active: req.body.active === 'on' || req.body.active === 'true',
      slug: slugify(req.body.slug || name),
      description: String(req.body.description || '').trim().slice(0, 280) || null
    };

    if (existingIndex >= 0) {
      const old = config.categories[existingIndex];
      config.categories[existingIndex] = { ...old, ...data };
      if (old.name.toLowerCase() !== name.toLowerCase()) {
        config.categories = config.categories.map((item) => item.parentName && item.parentName.toLowerCase() === old.name.toLowerCase() ? { ...item, parentName: name } : item);
        await prisma.product.updateMany({ where: { category: old.name }, data: { category: name } });
      }
      await logAudit({ actor: 'admin', action: 'category.updated', target: name, data });
      await saveStoreCategoryConfig(normalizeStoreCategoryConfig(config));
      return res.redirect('/admin/products?category=' + encodeURIComponent(name) + '&success=' + encodeURIComponent('Categoria atualizada.'));
    }

    config.categories.push(data);
    await saveStoreCategoryConfig(normalizeStoreCategoryConfig(config));
    await logAudit({ actor: 'admin', action: 'category.created', target: name, data });
    res.redirect('/admin/products?category=' + encodeURIComponent(name) + '&success=' + encodeURIComponent('Categoria criada com sucesso.'));
  } catch (err) {
    res.redirect('/admin/products?error=' + encodeURIComponent(err.message));
  }
});

adminRoutes.post('/categories/delete', async (req, res) => {
  try {
    const name = normalizeCategoryName(req.body.name);
    const serverType = normalizeCategoryServerType(req.body.serverType || 'all');
    if (!name) throw new Error('Categoria inválida.');
    const config = await getStoreCategoryConfig();
    const before = config.categories.length;
    config.categories = config.categories.filter((item) => !(item.serverType === serverType && item.name.toLowerCase() === name.toLowerCase()));
    if (config.categories.length === before) throw new Error('Categoria não encontrada.');
    await saveStoreCategoryConfig(normalizeStoreCategoryConfig(config));
    const shouldMoveProducts = req.body.moveProductsToGeneral === 'on';
    if (shouldMoveProducts) {
      await prisma.product.updateMany({
        where: {
          category: name,
          ...(serverType === 'all' ? {} : { OR: [{ serverType }, { serverType: 'all' }] })
        },
        data: { category: 'Geral' }
      });
    }
    await logAudit({ actor: 'admin', action: 'category.deleted', target: name, data: { serverType, moveProductsToGeneral: shouldMoveProducts } });
    res.redirect('/admin/products?success=' + encodeURIComponent('Categoria removida.'));
  } catch (err) {
    res.redirect('/admin/products?error=' + encodeURIComponent(err.message));
  }
});



adminRoutes.post('/promo/global', async (req, res) => {
  try {
    const saved = await saveGlobalPromo({
      enabled: req.body.enabled === 'on',
      percent: req.body.percent,
      label: req.body.label,
      color: req.body.color
    }, prisma);
    await logAudit({ actor: 'admin', action: 'promo.global.updated', target: 'store', data: saved });
    res.redirect('/admin/products?success=Promoção global atualizada.');
  } catch (err) {
    res.redirect(`/admin/products?error=${encodeURIComponent(err.message)}`);
  }
});

adminRoutes.post('/products', async (req, res) => {
  try {
    const slug = `${slugify(req.body.name)}-${Date.now().toString(36)}`;
    const items = parseProductItemsFromBody(req.body);
    const primaryItem = items[0];
    await prisma.product.create({
      data: {
        name: req.body.name,
        slug,
        description: req.body.description || null,
        category: req.body.category || 'Geral',
        serverType: req.body.serverType || 'all',
        classname: primaryItem.classname,
        quantity: primaryItem.quantity,
        priceCoins: Number(req.body.priceCoins || 0),
        stock: req.body.stock === '' ? null : Number(req.body.stock),
        imageUrl: null,
        imageData: null,
        imageMime: null,
        deliveryType: 'drop_at_feet',
        dropBoxClassname: null,
        featured: req.body.featured === 'on',
        highlightColor: normalizeHighlightColor(req.body.highlightColor),
        promoActive: req.body.promoActive === 'on',
        promoPercent: normalizePromoPercent(req.body.promoPercent, 0),
        promoLabel: (req.body.promoLabel || '').trim() || null,
        promoColor: normalizePromoColor(req.body.promoColor, '#ff7a18'),
        status: req.body.status || 'ACTIVE',
        items: { create: items }
      }
    });
    await logAudit({ actor: 'admin', action: 'product.created', target: req.body.name, data: { serverType: req.body.serverType, priceCoins: Number(req.body.priceCoins || 0), featured: req.body.featured === 'on', highlightColor: normalizeHighlightColor(req.body.highlightColor), promoActive: req.body.promoActive === 'on', promoPercent: normalizePromoPercent(req.body.promoPercent, 0), promoLabel: (req.body.promoLabel || '').trim() || null, promoColor: normalizePromoColor(req.body.promoColor, '#ff7a18'), items } });
    res.redirect('/admin/products?tab=products&category=all&success=' + encodeURIComponent('Produto criado.'));
  } catch (err) {
    res.redirect(`/admin/products?error=${encodeURIComponent(err.message)}`);
  }
});

adminRoutes.post('/products/:id', async (req, res) => {
  try {
    const items = parseProductItemsFromBody(req.body);
    const primaryItem = items[0];
    const data = {
      name: req.body.name,
      description: req.body.description || null,
      category: req.body.category || 'Geral',
      serverType: req.body.serverType || 'all',
      classname: primaryItem.classname,
      quantity: primaryItem.quantity,
      priceCoins: Number(req.body.priceCoins || 0),
      stock: req.body.stock === '' ? null : Number(req.body.stock),
      imageUrl: null,
      deliveryType: 'drop_at_feet',
      dropBoxClassname: null,
      featured: req.body.featured === 'on',
      highlightColor: normalizeHighlightColor(req.body.highlightColor),
      promoActive: req.body.promoActive === 'on',
      promoPercent: normalizePromoPercent(req.body.promoPercent, 0),
      promoLabel: (req.body.promoLabel || '').trim() || null,
      promoColor: normalizePromoColor(req.body.promoColor, '#ff7a18'),
      status: req.body.status || 'ACTIVE'
    };
    data.imageData = null;
    data.imageMime = null;
    await prisma.$transaction(async (tx) => {
      await tx.product.update({ where: { id: req.params.id }, data });
      await tx.productItem.deleteMany({ where: { productId: req.params.id } });
      await tx.productItem.createMany({ data: items.map(item => ({ ...item, productId: req.params.id })) });
    });
    await logAudit({ actor: 'admin', action: 'product.updated', target: req.params.id, data: { name: req.body.name, serverType: req.body.serverType, priceCoins: Number(req.body.priceCoins || 0), featured: req.body.featured === 'on', highlightColor: normalizeHighlightColor(req.body.highlightColor), promoActive: req.body.promoActive === 'on', promoPercent: normalizePromoPercent(req.body.promoPercent, 0), promoLabel: (req.body.promoLabel || '').trim() || null, promoColor: normalizePromoColor(req.body.promoColor, '#ff7a18'), items } });
    res.redirect('/admin/products?tab=products&category=all&success=' + encodeURIComponent('Produto atualizado.'));
  } catch (err) {
    res.redirect(`/admin/products?error=${encodeURIComponent(err.message)}`);
  }
});



adminRoutes.post('/products/:id/delete', async (req, res) => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: req.params.id },
      include: { _count: { select: { purchases: true } } }
    });
    if (!product) throw new Error('Produto não encontrado.');
    await addSeedTombstone(SEED_DELETED_PRODUCTS_KEY, product.slug);
    if ((product._count?.purchases || 0) > 0) {
      await prisma.product.update({ where: { id: product.id }, data: { status: 'INACTIVE' } });
      await logAudit({ actor: 'admin', action: 'product.disabled', target: product.id, data: { name: product.name, slug: product.slug, reason: 'has_purchase_history_seed_blocked' } });
      return res.redirect('/admin/products?success=' + encodeURIComponent('Produto desativado da loja e marcado para não voltar em updates. Ele tinha histórico de vendas, então não foi apagado do banco.'));
    }
    await prisma.product.delete({ where: { id: product.id } });
    await logAudit({ actor: 'admin', action: 'product.deleted', target: product.id, data: { name: product.name, slug: product.slug, seedBlocked: true } });
    res.redirect('/admin/products?success=' + encodeURIComponent('Produto excluído e marcado para não voltar depois de atualizar.'));
  } catch (err) {
    res.redirect('/admin/products?error=' + encodeURIComponent(err.message));
  }
});

adminRoutes.post('/products/:id/test-drop', async (req, res) => {
  try {
    const steam64 = String(req.body.steam64 || '').trim();
    if (!/^\d{17}$/.test(steam64)) throw new Error('Steam64 inválido para teste.');
    const product = await prisma.product.findUnique({ where: { id: req.params.id }, include: { items: { orderBy: { sortOrder: 'asc' } } } });
    if (!product) throw new Error('Produto não encontrado.');
    const player = await prisma.player.upsert({
      where: { steam64 },
      update: { nickname: req.body.nickname || 'Teste Admin' },
      create: { steam64, nickname: req.body.nickname || 'Teste Admin' }
    });
    const productItems = product.items?.length ? product.items : [{ classname: product.classname, quantity: product.quantity || 1, label: product.name }];
    const deliveries = [];
    for (const item of productItems) {
      const delivery = await prisma.deliveryQueue.create({
        data: {
          playerId: player.id,
          steam64,
          serverType: product.serverType,
          productName: `[TESTE ADMIN] ${productItems.length > 1 ? `${product.name}: ${item.label || item.classname}` : product.name}`,
          classname: item.classname,
          quantity: item.quantity || 1,
          deliveryType: 'drop_at_feet',
          meta: { adminTest: true, deliveryMode: 'drop_at_feet', dropAtFeet: true, useDropBox: false }
        }
      });
      deliveries.push(delivery);
    }
    await logAudit({ actor: 'admin', action: 'product.test_drop.created', target: product.id, data: { steam64, productName: product.name, deliveries: deliveries.length, deliveryType: 'drop_at_feet' } });
    res.redirect('/admin/products/' + product.id + '/edit?success=' + encodeURIComponent(`Teste criado: ${deliveries.length} entrega(s) para ${steam64}. Abra o jogo e veja se dropou certo.`));
  } catch (err) {
    res.redirect('/admin/products?error=' + encodeURIComponent(err.message));
  }
});

adminRoutes.post('/products/:id/delete-image', async (req, res) => {
  await prisma.product.update({ where: { id: req.params.id }, data: { imageData: null, imageMime: null, imageUrl: null } });
  await logAudit({ actor: 'admin', action: 'product.image.deleted', target: req.params.id });
  res.redirect('/admin/products?success=Imagem removida.');
});

adminRoutes.get('/packages', async (req, res) => {
  const packages = await prisma.coinPackage.findMany({ orderBy: { amountBrl: 'asc' } });
  res.render('admin/packages', { title: 'Pacotes Pix', packages });
});

adminRoutes.post('/packages', async (req, res) => {
  try {
    await prisma.coinPackage.create({
      data: {
        name: req.body.name,
        amountBrl: req.body.amountBrl,
        coins: Number(req.body.coins),
        bonusText: req.body.bonusText || null,
        active: req.body.active === 'on'
      }
    });
    await logAudit({ actor: 'admin', action: 'package.created', target: req.body.name, data: { amountBrl: req.body.amountBrl, coins: Number(req.body.coins) } });
    res.redirect('/admin/packages?success=Pacote criado.');
  } catch (err) {
    res.redirect(`/admin/packages?error=${encodeURIComponent(err.message)}`);
  }
});

adminRoutes.post('/packages/:id', async (req, res) => {
  try {
    await prisma.coinPackage.update({
      where: { id: req.params.id },
      data: {
        name: req.body.name,
        amountBrl: req.body.amountBrl,
        coins: Number(req.body.coins),
        bonusText: req.body.bonusText || null,
        active: req.body.active === 'on'
      }
    });
    await logAudit({ actor: 'admin', action: 'package.updated', target: req.params.id, data: { name: req.body.name, amountBrl: req.body.amountBrl, coins: Number(req.body.coins) } });
    res.redirect('/admin/packages?success=Pacote atualizado.');
  } catch (err) {
    res.redirect(`/admin/packages?error=${encodeURIComponent(err.message)}`);
  }
});



const VIP_CONTROL_DAY_MS = 24 * 60 * 60 * 1000;

function vipControlReturnTo(value) {
  const raw = String(value || '').trim();
  return raw.startsWith('/admin/vip-control') ? raw.slice(0, 1200) : '/admin/vip-control';
}

function vipControlSourceLabel(source) {
  const labels = {
    PURCHASE: 'Compra na loja',
    STREAMER_REWARD: 'VIP streamer 7 dias',
    FREE_7D_STARTER: 'VIP inicial 7 dias',
    ADMIN: 'Liberado pelo ADM',
    PRIVATE_LIFETIME: 'VIP privado',
    ADMIN_ESQUADRAO: 'VIP Esquadrão',
    CLAN_CUSTOM_MEMBER: 'VIP de clã gratuito',
    CLAN_CUSTOM_PAID: 'VIP de clã pago',
    STREAMER_OWNER: 'Dono streamer'
  };
  return labels[String(source || '').trim()] || String(source || 'Desconhecido');
}

function vipControlActionLabel(action) {
  const labels = {
    'outfit.subscription.purchased': 'VIP comprado',
    'outfit.streamer_reward.created': 'VIP streamer liberado',
    'outfit.free_7d.created': 'VIP inicial de 7 dias liberado',
    'outfit.admin.granted': 'VIP liberado/renovado pelo ADM',
    'outfit.admin.revoked': 'VIP removido pelo ADM',
    'outfit.private.members.assigned': 'Player adicionado ao VIP privado',
    'outfit.private.member.removed': 'Player removido do VIP privado',
    'outfit.admin.ftp_resynced': 'VIP marcado para ressincronização pela API',
    'outfit.admin.ftp_resynced_all': 'Todos os VIPs marcados para sincronização pela API'
  };
  return labels[String(action || '')] || String(action || 'Ação VIP');
}

function vipControlRemainingLabel(entry, nowMs) {
  if (entry.isPermanent) return 'Permanente';
  if (entry.state === 'CANCELLED') return 'Cancelado';
  const diff = entry.expiresAtMs - nowMs;
  const abs = Math.abs(diff);
  const days = Math.floor(abs / VIP_CONTROL_DAY_MS);
  const hours = Math.floor((abs % VIP_CONTROL_DAY_MS) / (60 * 60 * 1000));
  if (diff > 0) {
    if (days > 0) return `${days}d ${hours}h restantes`;
    if (hours > 0) return `${hours}h restantes`;
    return 'Vence em menos de 1 hora';
  }
  if (days > 0) return `Vencido há ${days}d ${hours}h`;
  if (hours > 0) return `Vencido há ${hours}h`;
  return 'Venceu agora';
}

adminRoutes.get('/vip-control', async (req, res, next) => {
  try {
    const now = new Date();
    const nowMs = now.getTime();
    const normalized = await prisma.playerOutfitSubscription.updateMany({
      where: { status: 'ACTIVE', expiresAt: { lte: now } },
      data: { status: 'EXPIRED' }
    });

    const [subscriptions, outfits, auditLogs] = await Promise.all([
      prisma.playerOutfitSubscription.findMany({
        select: {
          id: true,
          playerId: true,
          steam64: true,
          outfitTemplateId: true,
          serverType: true,
          source: true,
          streamerCodeId: true,
          streamerCode: true,
          status: true,
          startsAt: true,
          expiresAt: true,
          lastSpawnAt: true,
          createdAt: true,
          updatedAt: true,
          player: { select: { id: true, steam64: true, nickname: true, discordId: true } },
          outfitTemplate: { select: { id: true, name: true, active: true, isPrivate: true } }
        },
        orderBy: [{ expiresAt: 'desc' }, { createdAt: 'desc' }],
        take: 1000
      }),
      prisma.outfitTemplate.findMany({
        select: { id: true, name: true, active: true, isPrivate: true },
        orderBy: { name: 'asc' }
      }),
      prisma.auditLog.findMany({
        where: { action: { startsWith: 'outfit.' } },
        orderBy: { createdAt: 'desc' },
        take: 60
      })
    ]);

    const entries = subscriptions.map((sub) => {
      const startsAtMs = new Date(sub.startsAt || sub.createdAt).getTime();
      const expiresAtMs = new Date(sub.expiresAt).getTime();
      const rawDurationDays = (expiresAtMs - startsAtMs) / VIP_CONTROL_DAY_MS;
      const durationDays = Number.isFinite(rawDurationDays) ? Math.max(0, Math.round(rawDurationDays)) : 0;
      const isPermanent = new Date(sub.expiresAt).getUTCFullYear() >= 2999;
      const isDateExpired = !isPermanent && expiresAtMs <= nowMs;
      const state = sub.status === 'CANCELLED'
        ? 'CANCELLED'
        : ((sub.status === 'EXPIRED' || isDateExpired) ? 'EXPIRED' : 'ACTIVE');
      const isSevenDay = ['FREE_7D_STARTER', 'STREAMER_REWARD'].includes(String(sub.source || ''))
        || (!isPermanent && durationDays >= 6 && durationDays <= 8);
      const expiringSoon = state === 'ACTIVE' && !isPermanent && expiresAtMs <= nowMs + 7 * VIP_CONTROL_DAY_MS;
      const neverReadByMod = state === 'ACTIVE' && !sub.lastSpawnAt;
      const modState = state === 'ACTIVE'
        ? (sub.lastSpawnAt ? 'Consultado pelo mod' : 'Ainda não consultado pelo mod')
        : (state === 'EXPIRED' ? 'VIP removido no próximo ciclo da API ao vencer' : 'VIP removido no próximo ciclo da API ao cancelar');
      const entry = {
        ...sub,
        startsAtMs,
        expiresAtMs,
        durationDays,
        isPermanent,
        state,
        isSevenDay,
        isExpiredSevenDay: state === 'EXPIRED' && isSevenDay,
        expiringSoon,
        neverReadByMod,
        sourceLabel: vipControlSourceLabel(sub.source),
        modState
      };
      entry.remainingLabel = vipControlRemainingLabel(entry, nowMs);
      return entry;
    });

    const activeBySteam64 = new Map();
    for (const item of entries) {
      if (item.state !== 'ACTIVE') continue;
      const list = activeBySteam64.get(item.steam64) || [];
      list.push(item);
      activeBySteam64.set(item.steam64, list);
    }
    for (const list of activeBySteam64.values()) {
      list.sort((a, b) => b.expiresAtMs - a.expiresAtMs || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      list.forEach((item, index) => {
        item.activeVipCount = list.length;
        item.selectedForFtp = index === 0;
        item.activeConflict = list.length > 1;
        item.shadowedByAnotherVip = list.length > 1 && index > 0;
        if (item.shadowedByAnotherVip) {
          item.modState = `Conflito: o mod está usando ${list[0].outfitTemplate?.name || 'outro VIP'} até ${list[0].expiresAt.toLocaleString('pt-BR')}`;
        } else if (item.activeConflict) {
          item.modState = `Selecionado para a API entre ${list.length} VIPs ativos`;
        }
      });
    }

    const duplicateActivePlayers = Array.from(activeBySteam64.values()).filter(list => list.length > 1).length;
    const stats = {
      total: entries.length,
      active: entries.filter(item => item.state === 'ACTIVE').length,
      expiringSoon: entries.filter(item => item.expiringSoon).length,
      expired: entries.filter(item => item.state === 'EXPIRED').length,
      expiredSevenDay: entries.filter(item => item.isExpiredSevenDay).length,
      cancelled: entries.filter(item => item.state === 'CANCELLED').length,
      neverReadByMod: entries.filter(item => item.neverReadByMod).length,
      duplicateActivePlayers,
      shadowedActive: entries.filter(item => item.shadowedByAnotherVip).length,
      normalizedExpired: normalized.count
    };

    const filter = String(req.query.filter || 'all').trim().toLowerCase();
    const source = String(req.query.source || '').trim();
    const outfitId = String(req.query.outfitId || '').trim();
    const q = String(req.query.q || '').trim().toLowerCase();

    const filteredEntries = entries.filter((item) => {
      if (filter === 'active' && item.state !== 'ACTIVE') return false;
      if (filter === 'expiring' && !item.expiringSoon) return false;
      if (filter === 'expired' && item.state !== 'EXPIRED') return false;
      if (filter === 'expired7d' && !item.isExpiredSevenDay) return false;
      if (filter === 'cancelled' && item.state !== 'CANCELLED') return false;
      if (filter === 'unread' && !item.neverReadByMod) return false;
      if (filter === 'conflict' && !item.activeConflict) return false;
      if (source && item.source !== source) return false;
      if (outfitId && item.outfitTemplateId !== outfitId) return false;
      if (q) {
        const haystack = [
          item.steam64,
          item.player?.nickname,
          item.player?.discordId,
          item.outfitTemplate?.name,
          item.source,
          item.streamerCode
        ].filter(Boolean).join(' ').toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    }).sort((a, b) => {
      const stateOrder = { ACTIVE: 0, EXPIRED: 1, CANCELLED: 2 };
      const stateDiff = (stateOrder[a.state] ?? 9) - (stateOrder[b.state] ?? 9);
      if (stateDiff) return stateDiff;
      if (a.state === 'ACTIVE') return a.expiresAtMs - b.expiresAtMs;
      return b.expiresAtMs - a.expiresAtMs;
    });

    const totalFilteredCount = filteredEntries.length;
    const perPage = 100;
    const pageCount = Math.max(1, Math.ceil(totalFilteredCount / perPage));
    const page = Math.max(1, Math.min(Number.parseInt(String(req.query.page || '1'), 10) || 1, pageCount));
    const pageEntries = filteredEntries.slice((page - 1) * perPage, page * perPage);

    const sourceOptions = Array.from(new Set(entries.map(item => item.source).filter(Boolean)))
      .sort((a, b) => vipControlSourceLabel(a).localeCompare(vipControlSourceLabel(b), 'pt-BR'))
      .map(value => ({ value, label: vipControlSourceLabel(value) }));

    const history = auditLogs.map(log => ({
      ...log,
      label: vipControlActionLabel(log.action),
      steam64: String(log.data?.steam64 || (/^\d{17}$/.test(String(log.actor || '')) ? log.actor : '') || ''),
      outfitName: String(log.data?.outfitName || ''),
      durationDays: Number(log.data?.durationDays || 0) || null,
      expiresAt: log.data?.expiresAt ? new Date(log.data.expiresAt) : null
    }));

    res.render('admin/vipControl', {
      title: 'Controle de VIPs',
      now,
      stats,
      entries: pageEntries,
      totalFiltered: totalFilteredCount,
      page,
      pageCount,
      perPage,
      filter,
      source,
      outfitId,
      q: String(req.query.q || '').trim(),
      sourceOptions,
      outfits,
      history
    });
  } catch (err) { next(err); }
});

adminRoutes.post('/vip-control/sync-all', async (req, res) => {
  const returnTo = vipControlReturnTo(req.body.returnTo);
  try {
    const result = await forceSyncAllVipFilesNow();
    await logAudit({
      actor: 'admin',
      action: 'outfit.admin.ftp_resynced_all',
      target: result.basePath || 'file_bridge',
      data: { activePlayers: result.activePlayers || 0, durationMs: result.durationMs || 0, forced: true }
    });
    const message = `${result.activePlayers || 0} player(s) com VIP ativo tiveram o traje reconstruído com os dados atuais da loja e disponibilizado para o próximo ciclo da API. VIPs vencidos/cancelados foram removidos.`;
    res.redirect(`${returnTo}${returnTo.includes('?') ? '&' : '?'}success=${encodeURIComponent(message)}`);
  } catch (err) {
    res.redirect(`${returnTo}${returnTo.includes('?') ? '&' : '?'}error=${encodeURIComponent(err.message)}`);
  }
});

adminRoutes.post('/vip-control/:subscriptionId/sync', async (req, res) => {
  const returnTo = vipControlReturnTo(req.body.returnTo);
  try {
    const subscription = await prisma.playerOutfitSubscription.findUnique({
      where: { id: req.params.subscriptionId },
      include: { outfitTemplate: true }
    });
    if (!subscription) throw new Error('Cadastro VIP não encontrado.');
    const result = await syncPlayerFilesNow(subscription.steam64);
    await logAudit({
      actor: 'admin',
      action: 'outfit.admin.ftp_resynced',
      target: subscription.outfitTemplateId,
      data: { steam64: subscription.steam64, outfitName: subscription.outfitTemplate?.name || null, subscriptionId: subscription.id, skipped: Boolean(result?.skipped) }
    });
    const activeAfterSync = await prisma.playerOutfitSubscription.findFirst({
      where: { steam64: subscription.steam64, status: 'ACTIVE', expiresAt: { gt: new Date() } },
      include: { outfitTemplate: true },
      orderBy: [{ expiresAt: 'desc' }, { createdAt: 'desc' }]
    });
    const message = activeAfterSync
      ? `API sinalizada para ${subscription.steam64}. VIP ativo: ${activeAfterSync.outfitTemplate?.name || 'traje ativo'} até ${activeAfterSync.expiresAt.toLocaleString('pt-BR')}; o mod recebe no próximo ciclo.`
      : `API conferida para ${subscription.steam64}; não existe VIP ativo e o arquivo ficou removido.`;
    res.redirect(`${returnTo}${returnTo.includes('?') ? '&' : '?'}success=${encodeURIComponent(message)}`);
  } catch (err) {
    res.redirect(`${returnTo}${returnTo.includes('?') ? '&' : '?'}error=${encodeURIComponent(err.message)}`);
  }
});

adminRoutes.post('/vip-control/:subscriptionId/renew', async (req, res) => {
  const returnTo = vipControlReturnTo(req.body.returnTo);
  try {
    const subscription = await prisma.playerOutfitSubscription.findUnique({
      where: { id: req.params.subscriptionId },
      include: { outfitTemplate: true, player: true }
    });
    if (!subscription) throw new Error('Cadastro VIP não encontrado.');
    const days = Math.floor(Number(req.body.durationDays || 0));
    const result = await grantOutfitToPlayerByAdmin({
      outfitId: subscription.outfitTemplateId,
      steam64: subscription.steam64,
      durationDays: days,
      nickname: subscription.player?.nickname || '',
      actor: 'admin'
    });
    const ftp = await publishVipImmediatelyForAdmin(subscription.steam64);
    const ftpText = ftp.ok ? ' API sinalizada para atualização.' : ' API aguardará o próximo ciclo do mod.';
    res.redirect(`${returnTo}${returnTo.includes('?') ? '&' : '?'}success=${encodeURIComponent(
      `${result.outfit.name} renovado para ${subscription.steam64} por ${result.durationDays} dia(s), até ${result.expiresAt.toLocaleString('pt-BR')}.${ftpText}`
    )}`);
  } catch (err) {
    res.redirect(`${returnTo}${returnTo.includes('?') ? '&' : '?'}error=${encodeURIComponent(err.message)}`);
  }
});

adminRoutes.post('/vip-control/:subscriptionId/revoke', async (req, res) => {
  const returnTo = vipControlReturnTo(req.body.returnTo);
  try {
    const revoked = await revokeOutfitSubscriptionByAdmin({ subscriptionId: req.params.subscriptionId, actor: 'admin' });
    const ftp = await publishVipImmediatelyForAdmin(revoked.steam64);
    const ftpText = ftp.ok ? 'API sinalizada para atualização.' : 'API aguardará o próximo ciclo do mod.';
    res.redirect(`${returnTo}${returnTo.includes('?') ? '&' : '?'}success=${encodeURIComponent(
      `${Math.max(1, Number(revoked.revokedCount || 0))} VIP(s) ativo(s) removido(s) do Steam64 ${revoked.steam64}. ${ftpText}`
    )}`);
  } catch (err) {
    res.redirect(`${returnTo}${returnTo.includes('?') ? '&' : '?'}error=${encodeURIComponent(err.message)}`);
  }
});


adminRoutes.get('/dayz-catalog', (req, res) => {
  const q = String(req.query.q || '').trim();
  res.set('Cache-Control', 'private, max-age=300');
  res.json({ items: searchDayzItemCatalog(q, Number(req.query.limit || 60)) });
});

adminRoutes.get('/outfits', async (req, res, next) => {
  try {
    const now = new Date();
    const [outfits, activeSubs, privateSubs, managedAdminData] = await Promise.all([
      listOutfitTemplates({ includeInactive: true, includePrivate: true, serverType: 'vanilla' }),
      prisma.playerOutfitSubscription.findMany({
        where: { status: 'ACTIVE', expiresAt: { gt: now } },
        select: {
          id: true, steam64: true, source: true, expiresAt: true, outfitTemplateId: true,
          player: { select: { id: true, nickname: true, steam64: true } },
          outfitTemplate: { select: { id: true, name: true, isPrivate: true } }
        },
        orderBy: { expiresAt: 'asc' },
        take: 100
      }),
      prisma.playerOutfitSubscription.findMany({
        where: { status: 'ACTIVE', expiresAt: { gt: now }, outfitTemplate: { is: { isPrivate: true } } },
        select: {
          id: true, steam64: true, source: true, expiresAt: true, outfitTemplateId: true,
          player: { select: { id: true, nickname: true, steam64: true } },
          outfitTemplate: { select: { id: true, name: true, isPrivate: true } }
        },
        orderBy: { steam64: 'asc' },
        take: 300
      }),
      getManagedOutfitAdminData()
    ]);
    const editing = req.query.edit
      ? await prisma.outfitTemplate.findUnique({
          where: { id: String(req.query.edit) },
          omit: { imageData: true }
        })
      : null;
    const currentCatalogSlugSet = new Set(currentPublicVipOutfitSlugsV613);
    const catalogOutfits = outfits.filter(outfit => currentCatalogSlugSet.has(outfit.slug));
    const adminOutfits = outfits.filter(outfit => outfit.slug === adminVipOutfitSlugV613);

    res.render('admin/outfits', {
      title: 'Trajes VIP',
      outfits,
      catalogOutfits,
      adminOutfits,
      activeSubs,
      privateSubs,
      editing: editing ? { ...editing, hasImageData: Boolean(editing.imageMime) } : null,
      outfitItemsToText,
      catalog: [],
      privateVipSource: PRIVATE_VIP_SOURCE,
      customOutfitOrders: managedAdminData.orders,
      outfitFlagRequests: managedAdminData.flagRequests,
      creatingPrivate: req.query.private === '1'
    });
  } catch (err) { next(err); }
});

adminRoutes.post('/outfits', async (req, res) => {
  try {
    const outfit = await upsertOutfitTemplateFromBody({ body: req.body });
    let memberResult = { assigned: [], invalid: [] };
    if (outfit.isPrivate && String(req.body.privateSteamIds || '').trim()) {
      memberResult = await assignPrivateVipMembers({ outfitId: outfit.id, membersText: req.body.privateSteamIds, durationDays: req.body.durationDays, actor: 'admin' });
      await publishVipMembersImmediatelyForAdmin(memberResult.assigned.map(item => item.player.steam64));
    }
    await logAudit({ actor: 'admin', action: 'outfit.created', target: outfit.id, data: { name: outfit.name, priceCoins: outfit.priceCoins, durationDays: outfit.durationDays, isPrivate: outfit.isPrivate } });
    const parts = [outfit.isPrivate ? 'VIP privado criado.' : 'Traje VIP criado.'];
    if (memberResult.assigned.length) parts.push(`${memberResult.assigned.length} Steam64 adicionada(s).`);
    if (memberResult.invalid.length) parts.push(`${memberResult.invalid.length} linha(s) inválida(s) ignorada(s).`);
    res.redirect('/admin/outfits?success=' + encodeURIComponent(parts.join(' ')));
  } catch (err) { res.redirect('/admin/outfits?error=' + encodeURIComponent(err.message)); }
});

adminRoutes.post('/outfits/sync-all-vips', async (req, res) => {
  try {
    const result = await forceSyncAllVipFilesNow();
    await logAudit({
      actor: 'admin',
      action: 'outfit.admin.ftp_resynced_all',
      target: result.basePath || 'file_bridge',
      data: { activePlayers: result.activePlayers || 0, durationMs: result.durationMs || 0, forced: true, source: 'admin_outfits_button' }
    });
    res.redirect('/admin/outfits?success=' + encodeURIComponent(
      `${result.activePlayers || 0} player(s) com VIP ativo foram atualizados para a API usando os trajes atuais da loja.`
    ));
  } catch (err) {
    res.redirect('/admin/outfits?error=' + encodeURIComponent(err.message));
  }
});

adminRoutes.post('/outfits/:id', async (req, res) => {
  try {
    const outfit = await upsertOutfitTemplateFromBody({ body: req.body, id: req.params.id });
    let memberResult = { assigned: [], invalid: [] };
    if (outfit.isPrivate && String(req.body.privateSteamIds || '').trim()) {
      memberResult = await assignPrivateVipMembers({ outfitId: outfit.id, membersText: req.body.privateSteamIds, durationDays: req.body.durationDays, actor: 'admin' });
      await publishVipMembersImmediatelyForAdmin(memberResult.assigned.map(item => item.player.steam64));
    }

    // Sempre que o ADM altera um traje, todos os players que estão usando esse
    // template entram na fila rápida. Assim a pasta inbox/vip acompanha o site
    // sem precisar editar JSON manualmente no servidor.
    const activeUsers = await prisma.playerOutfitSubscription.findMany({
      where: { outfitTemplateId: outfit.id, status: 'ACTIVE', expiresAt: { gt: new Date() } },
      select: { steam64: true }
    });
    const affectedSteam64s = Array.from(new Set(
      activeUsers.map(row => String(row.steam64 || '').trim()).filter(value => /^\d{17}$/.test(value))
    ));
    const ftpSync = await publishVipMembersImmediatelyForAdmin(affectedSteam64s);

    await logAudit({ actor: 'admin', action: 'outfit.updated', target: outfit.id, data: { name: outfit.name, priceCoins: outfit.priceCoins, durationDays: outfit.durationDays, isPrivate: outfit.isPrivate, activePlayersSynced: ftpSync.immediate, activePlayersQueued: ftpSync.queued } });
    const parts = [outfit.isPrivate ? 'VIP privado atualizado.' : 'Traje VIP atualizado.'];
    if (affectedSteam64s.length) parts.push(`${ftpSync.immediate} player(s) marcados para atualização pela API${ftpSync.queued ? `; ${ftpSync.queued} ficou(aram) na fila de recuperação` : ''}.`);
    if (memberResult.assigned.length) parts.push(`${memberResult.assigned.length} Steam64 adicionada(s).`);
    if (memberResult.invalid.length) parts.push(`${memberResult.invalid.length} linha(s) inválida(s) ignorada(s).`);
    res.redirect('/admin/outfits?success=' + encodeURIComponent(parts.join(' ')));
  } catch (err) { res.redirect('/admin/outfits?error=' + encodeURIComponent(err.message)); }
});

adminRoutes.post('/outfits/grant-manual', async (req, res) => {
  try {
    const selectedOutfitId = String(req.body.outfitId || '').trim();
    if (!selectedOutfitId) throw new Error('Escolha a bolsa do traje antes de setar o VIP.');

    const result = await grantOutfitToPlayerByAdmin({
      outfitId: selectedOutfitId,
      steam64: req.body.steam64,
      durationDays: req.body.durationDays,
      nickname: req.body.nickname,
      actor: 'admin'
    });

    const ftp = await publishVipImmediatelyForAdmin(result.player.steam64);
    const ftpText = ftp.ok
      ? 'Arquivo VIP enviado para o próximo ciclo da API.'
      : 'Mod/API indisponível; estado permanece no banco para o próximo ciclo.';

    const selectedItems = Array.isArray(result.outfit?.items) ? result.outfit.items : [];
    const backpack = selectedItems.find(item => ['back', 'backpack'].includes(String(item?.slot || '').toLowerCase()));
    const backpackLabel = String(backpack?.label || backpack?.classname || 'mochila do preset').trim();

    res.redirect('/admin/outfits?success=' + encodeURIComponent(
      `${result.outfit.name} setado para ${result.player.steam64} com ${backpackLabel} por ${result.durationDays} dia(s). ${ftpText}`
    ));
  } catch (err) {
    res.redirect('/admin/outfits?error=' + encodeURIComponent(err.message));
  }
});

adminRoutes.post('/outfits/:id/grant', async (req, res) => {
  try {
    const result = await grantOutfitToPlayerByAdmin({
      outfitId: req.params.id,
      steam64: req.body.steam64,
      durationDays: req.body.durationDays,
      nickname: req.body.nickname,
      actor: 'admin'
    });

    // V177: o SET do ADM só termina a ação visual depois de tentar publicar
    // o JSON VIP daquele Steam64. A fila fica apenas como recuperação de falha.
    const ftp = await publishVipImmediatelyForAdmin(result.player.steam64);
    const ftpText = ftp.ok ? 'Arquivo VIP enviado para o próximo ciclo da API.' : 'Mod/API indisponível; estado permanece no banco para o próximo ciclo.';

    res.redirect('/admin/outfits?success=' + encodeURIComponent(
      `${result.outfit.name} liberado para ${result.player.steam64} por ${result.durationDays} dia(s), até ${result.expiresAt.toLocaleString('pt-BR')}. ${ftpText}`
    ));
  } catch (err) {
    res.redirect('/admin/outfits?error=' + encodeURIComponent(err.message));
  }
});

adminRoutes.post('/outfits/subscriptions/:subscriptionId/revoke', async (req, res) => {
  try {
    const revoked = await revokeOutfitSubscriptionByAdmin({ subscriptionId: req.params.subscriptionId, actor: 'admin' });
    const ftp = await publishVipImmediatelyForAdmin(revoked.steam64);
    const ftpText = ftp.ok ? 'Arquivo removido/atualizado pela API no próximo ciclo.' : 'API aguardará o próximo ciclo do mod.';
    res.redirect('/admin/outfits?success=' + encodeURIComponent(
      `${Math.max(1, Number(revoked.revokedCount || 0))} VIP(s) ativo(s) removido(s) do Steam64 ${revoked.steam64}. ${ftpText}`
    ));
  } catch (err) {
    res.redirect('/admin/outfits?error=' + encodeURIComponent(err.message));
  }
});

adminRoutes.post('/outfits/:id/private-members', async (req, res) => {
  try {
    const result = await assignPrivateVipMembers({ outfitId: req.params.id, membersText: req.body.privateSteamIds, durationDays: req.body.durationDays, actor: 'admin' });
    const ftpSync = await publishVipMembersImmediatelyForAdmin(result.assigned.map(item => item.player.steam64));
    if (!result.assigned.length && !result.invalid.length) throw new Error('Digite pelo menos uma Steam64.');
    const parts = [];
    if (result.assigned.length) parts.push(`${result.assigned.length} player(s) adicionado(s) ao VIP privado por ${result.durationDays} dia(s).`);
    if (result.invalid.length) parts.push(`${result.invalid.length} linha(s) inválida(s) ignorada(s).`);
    res.redirect('/admin/outfits?success=' + encodeURIComponent(parts.join(' ')));
  } catch (err) { res.redirect('/admin/outfits?error=' + encodeURIComponent(err.message)); }
});

adminRoutes.post('/outfits/private-members/:subscriptionId/remove', async (req, res) => {
  try {
    const removed = await removePrivateVipMember({ subscriptionId: req.params.subscriptionId, actor: 'admin' });
    const ftp = await publishVipImmediatelyForAdmin(removed.steam64);
    const ftpText = ftp.ok ? 'API sinalizada para atualização.' : 'API aguardará o próximo ciclo do mod.';
    res.redirect('/admin/outfits?success=' + encodeURIComponent(`Player ${removed.steam64} removido do VIP privado. ${ftpText}`));
  } catch (err) { res.redirect('/admin/outfits?error=' + encodeURIComponent(err.message)); }
});

adminRoutes.post('/outfits/:id/toggle', async (req, res) => {
  try {
    const current = await prisma.outfitTemplate.findUnique({ where: { id: req.params.id } });
    await prisma.outfitTemplate.update({ where: { id: req.params.id }, data: { active: !current.active } });
    res.redirect('/admin/outfits?success=' + encodeURIComponent('Status do traje alterado.'));
  } catch (err) { res.redirect('/admin/outfits?error=' + encodeURIComponent(err.message)); }
});


adminRoutes.post('/outfits/:id/delete', async (req, res) => {
  try {
    assertAdminPassword(req.body);

    const outfit = await prisma.outfitTemplate.findUnique({ where: { id: req.params.id } });
    if (!outfit) throw new Error('Traje não encontrado.');

    const activeSubscriptions = await prisma.playerOutfitSubscription.findMany({
      where: { outfitTemplateId: outfit.id, status: 'ACTIVE', expiresAt: { gt: new Date() } },
      select: { steam64: true }
    });
    const affectedSteam64 = Array.from(new Set(activeSubscriptions.map(row => String(row.steam64 || '').trim()).filter(value => /^\d{17}$/.test(value))));

    const tombstoneSetting = await prisma.appSetting.findUnique({ where: { key: SEED_DELETED_OUTFITS_KEY } });
    const deletedSlugs = Array.from(new Set([
      ...extractTombstoneSlugs(tombstoneSetting?.value || {}),
      cleanTombstoneSlug(outfit.slug)
    ])).filter(Boolean).sort((a, b) => a.localeCompare(b));

    const deleted = await prisma.$transaction(async (tx) => {
      const orders = await tx.customOutfitOrder.updateMany({
        where: { outfitTemplateId: outfit.id },
        data: { outfitTemplateId: null }
      });
      const subscriptions = await tx.playerOutfitSubscription.deleteMany({ where: { outfitTemplateId: outfit.id } });
      const flagRequests = await tx.outfitFlagRequest.deleteMany({ where: { outfitTemplateId: outfit.id } });
      await tx.outfitTemplate.delete({ where: { id: outfit.id } });
      await tx.appSetting.upsert({
        where: { key: SEED_DELETED_OUTFITS_KEY },
        update: { value: { slugs: deletedSlugs, updatedAt: new Date().toISOString(), mode: 'admin_delete_keeps_seed_from_returning' } },
        create: { key: SEED_DELETED_OUTFITS_KEY, value: { slugs: deletedSlugs, updatedAt: new Date().toISOString(), mode: 'admin_delete_keeps_seed_from_returning' } }
      });
      return { orders: orders.count, subscriptions: subscriptions.count, flagRequests: flagRequests.count };
    });

    let synced = 0;
    let syncFailed = 0;
    for (const steam64 of affectedSteam64) {
      if (queueImmediatePlayerFileSync(steam64)) synced += 1;
      else syncFailed += 1;
    }

    await logAudit({
      actor: 'admin',
      action: 'outfit.deleted_with_password',
      target: outfit.id,
      data: {
        name: outfit.name,
        slug: outfit.slug,
        subscriptionsDeleted: deleted.subscriptions,
        flagRequestsDeleted: deleted.flagRequests,
        customOrdersUnlinked: deleted.orders,
        affectedPlayers: affectedSteam64.length,
        ftpSynced: synced,
        ftpSyncFailed: syncFailed,
        seedBlocked: true
      }
    });

    const ftpText = syncFailed
      ? ` ${synced} arquivo(s) VIP colocado(s) na fila rápida; ${syncFailed} ficará(ão) para o próximo ciclo da API.`
      : (synced ? ` ${synced} arquivo(s) VIP colocado(s) na fila para o próximo ciclo da API.` : '');
    res.redirect('/admin/outfits?success=' + encodeURIComponent(
      `Traje “${outfit.name}” excluído definitivamente e bloqueado para não voltar em updates. ${deleted.subscriptions} assinatura(s) removida(s).${ftpText}`
    ));
  } catch (err) {
    res.redirect('/admin/outfits?error=' + encodeURIComponent(err.message));
  }
});

adminRoutes.post('/outfits/check-player', async (req, res) => {
  try {
    const active = await getActiveOutfitForPlayer(req.body.steam64, req.body.serverType || 'vanilla');
    const msg = active ? `Player tem traje ativo: ${active.outfitTemplate.name} até ${active.expiresAt.toLocaleString('pt-BR')} (${active.source}).` : 'Player não tem traje ativo.';
    res.redirect('/admin/outfits?success=' + encodeURIComponent(msg));
  } catch (err) { res.redirect('/admin/outfits?error=' + encodeURIComponent(err.message)); }
});

adminRoutes.post('/outfits/custom-orders/:id/status', async (req, res) => {
  try {
    await updateCustomOutfitOrder({ id: req.params.id, status: req.body.status, outfitTemplateId: req.body.outfitTemplateId, note: req.body.note });
    res.redirect('/admin/outfits?success=' + encodeURIComponent('Status do pedido personalizado atualizado.'));
  } catch (err) { res.redirect('/admin/outfits?error=' + encodeURIComponent(err.message)); }
});

adminRoutes.post('/outfits/flag-requests/:id/status', async (req, res) => {
  try {
    await updateFlagRequest({ id: req.params.id, status: req.body.status, adminNote: req.body.adminNote });
    res.redirect('/admin/outfits?success=' + encodeURIComponent('Solicitação de bandeira atualizada.'));
  } catch (err) { res.redirect('/admin/outfits?error=' + encodeURIComponent(err.message)); }
});

adminRoutes.get('/players', async (req, res) => {
  const q = req.query.q?.trim();
  const players = await prisma.player.findMany({
    where: q ? { OR: [{ steam64: { contains: q } }, { nickname: { contains: q, mode: 'insensitive' } }, { discordId: { contains: q } }] } : {},
    select: { id: true, steam64: true, nickname: true, discordId: true, coins: true, createdAt: true, updatedAt: true },
    orderBy: { updatedAt: 'desc' },
    take: 100
  });
  res.render('admin/players', { title: 'Players', players, q });
});


adminRoutes.post('/players/:id/coins', async (req, res) => {
  try {
    const amount = Number(req.body.amount);
    const reason = req.body.reason || 'Ajuste manual admin';
    const player = await changePlayerCoins({ playerId: req.params.id, amount, reason, refType: 'admin', refId: 'manual' });
    await logBalanceChange({ player, amount, type: amount > 0 ? 'CREDIT' : 'DEBIT', reason });
    await logAudit({ actor: 'admin', action: 'player.balance.changed', target: req.params.id, data: { amount, reason } });
    res.redirect('/admin/players?success=Saldo atualizado.');
  } catch (err) {
    res.redirect(`/admin/players?error=${encodeURIComponent(err.message)}`);
  }
});

adminRoutes.get('/payments', async (req, res) => {
  const payments = await prisma.payment.findMany({
    select: {
      id: true, createdAt: true, amountBrl: true, coins: true, status: true, provider: true, providerPaymentId: true,
      player: { select: { nickname: true, steam64: true } },
      coinPackage: { select: { name: true } }
    },
    orderBy: { createdAt: 'desc' }, take: 100
  });
  res.render('admin/payments', { title: 'Pagamentos', payments });
});

adminRoutes.post('/payments/:id/approve', async (req, res) => {
  try {
    await manuallyApprovePayment(req.params.id, 'admin');
    await logAudit({ actor: 'admin', action: 'payment.approved.manual', target: req.params.id });
    res.redirect('/admin/payments?success=Pagamento aprovado manualmente.');
  } catch (err) {
    res.redirect(`/admin/payments?error=${encodeURIComponent(err.message)}`);
  }
});

adminRoutes.post('/payments/:id/sync', async (req, res) => {
  try {
    const payment = await syncPaymentStatusByLocalId(req.params.id, { force: true });
    res.redirect(`/admin/payments?success=${encodeURIComponent(`Mercado Pago consultado. Status atual: ${payment.status}.`)}`);
  } catch (err) {
    res.redirect(`/admin/payments?error=${encodeURIComponent(err.message)}`);
  }
});

adminRoutes.post('/payments/check-mercadopago', async (req, res) => {
  try {
    const result = await checkMercadoPagoConnection();
    res.redirect(`/admin/payments?success=${encodeURIComponent(`Token aceito. Pix disponível. API ativa: ${result.mode}.`)}`);
  } catch (err) {
    res.redirect(`/admin/payments?error=${encodeURIComponent(err.message)}`);
  }
});

adminRoutes.get('/deliveries', async (req, res) => {
  const deliveries = await prisma.deliveryQueue.findMany({
    select: {
      id: true, createdAt: true, steam64: true, productName: true, classname: true, quantity: true,
      serverType: true, status: true, error: true
    },
    orderBy: { createdAt: 'desc' }, take: 150
  });
  res.render('admin/deliveries', { title: 'Entregas', deliveries });
});

adminRoutes.post('/deliveries/:id/reset', async (req, res) => {
  const delivery = await prisma.$transaction(async tx => {
    const updated = await tx.deliveryQueue.update({
      where: { id: req.params.id },
      data: { status: 'PENDING', error: null, claimedAt: null, deliveredAt: null }
    });
    // Se for reposição de veículo, mantém a trava de uma solicitação por vez durante o reset.
    await tx.vehicleRespawnLog.updateMany({
      where: { deliveryId: req.params.id },
      data: { status: 'PENDING', error: null }
    });
    return updated;
  });
  await logAudit({ actor: 'admin', action: 'delivery.reset', target: req.params.id });
  await publishVehicleDeliveryImmediately(delivery.steam64, 'reenvio manual de entrega');
  res.redirect('/admin/deliveries?success=' + encodeURIComponent('Entrega voltou para pendente e será recebida pelo mod no próximo ciclo da API.'));
});
