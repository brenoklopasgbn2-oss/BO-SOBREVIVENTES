import { randomUUID } from 'crypto';
import multer from 'multer';
import { Router } from 'express';
import { prisma } from '../db/prisma.js';
import { requirePlayer, requireStreamerAccess, setStreamerAccessCookie, clearStreamerAccessCookie } from '../middleware/auth.js';
import { upsertPlayerBySteam64, setPlayerCookie } from '../services/playerService.js';
import { listActiveProducts, buyProduct, buyCart } from '../services/shopService.js';
import { createPixPayment, syncPaymentStatusByLocalId } from '../services/paymentService.js';
import { getGlobalPromo, applyPromotionToProduct } from '../services/promotionService.js';
import { env } from '../config/env.js';
import { describeProductItems } from '../utils/productItems.js';
import { buyOrRentVehicle, renewVehicle, renewInsurance, upgradeInsurancePlan, cancelPlayerVehicle } from '../services/vehicleRentalService.js';
import { getStarterKit, hasClaimedStarterKit, claimStarterKit } from '../services/starterKitService.js';
import { getRankingData, getPlayerRankingProfile, getMyClan, canManageClan } from '../services/rankingService.js';
import { DEATHMATCH_ACTIONS, getDeathmatchConfig } from '../services/deathmatchService.js';
import { getStreamerDashboardBySteam64, requestStreamerWeeklyPayout } from '../services/supportService.js';
import {
  listOutfitTemplates,
  getActiveOutfitForPlayer,
  buyOutfitSubscription,
  grantStreamerOutfitReward,
  grantFreeStarterOutfitReward,
  getOutfitRewardStatus
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
import { resolveDayzWikiImage } from '../services/dayzWikiImageService.js';
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

export const publicRoutes = Router();

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
    if (!name || entry?.active === false) return;
    const key = `${serverType}::${name.toLowerCase()}`;
    if (seen.has(key)) return;
    seen.add(key);
    items.push({ name, serverType, order: Number.isFinite(Number(entry?.order)) ? Number(entry.order) : idx * 10, active: true });
  });
  items.sort((a, b) => a.order - b.order || a.name.localeCompare(b.name, 'pt-BR'));
  return { categories: items };
}

async function getStoreCategoriesConfig() {
  const saved = await prisma.appSetting.findUnique({ where: { key: 'store_categories_v1' } });
  return normalizeCategoryConfig(saved?.value || {});
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
    result.push({ name, serverType: categoryServer, order: Number(entry?.order || 0) });
  });
  const requiredCategoryTabs = [
    { name: 'Kits Base', serverType: 'vanilla', order: 5 },
    { name: 'Veículos', serverType: 'vanilla', order: 15 },
    { name: 'Peças de Veículos', serverType: 'vanilla', order: 18 },
    { name: 'Trajes VIPs', serverType: 'vanilla', order: 20 },
    { name: 'Saco de Dormir', serverType: 'vanilla', order: 25 },
    { name: 'Diversos', serverType: 'vanilla', order: 90 }
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

async function renderStore(req, res, title = 'Loja') {
  const selectedServer = 'vanilla';
  const selectedCategoryRaw = String(req.query.category || 'Kits Base').trim() || 'Kits Base';
  const selectedCategory = canonicalCategoryName(selectedCategoryRaw);
  const isVehicleCategory = isVehicleStoreCategory(selectedCategory);

  const [products, categoryRows, globalPromo, vehicleTemplates, globalVehiclePlans, starterKit, starterKitClaimed, vehicleCount, recruitingClans] = await Promise.all([
    isVehicleCategory
      ? Promise.resolve([])
      : listActiveProducts({ serverType: selectedServer, category: selectedCategory || undefined }),
    prisma.product.findMany({
      where: { status: 'ACTIVE', serverType: selectedServer },
      select: { category: true },
      distinct: ['category'],
      orderBy: { category: 'asc' }
    }),
    getGlobalPromo(prisma),
    isVehicleCategory
      ? prisma.vehicleTemplate.findMany({
          where: { active: true, serverType: selectedServer },
          omit: { imageData: true },
          include: {
            insurancePlans: {
              where: { active: true, billingType: 'SUBSCRIPTION' },
              orderBy: [{ priceCoins: 'asc' }]
            }
          },
          orderBy: [{ buyPriceCoins: 'asc' }, { name: 'asc' }]
        })
      : Promise.resolve([]),
    isVehicleCategory
      ? prisma.vehicleInsurancePlan.findMany({
          where: { active: true, templateId: null, billingType: 'SUBSCRIPTION' },
          orderBy: [{ priceCoins: 'asc' }]
        })
      : Promise.resolve([]),
    getStarterKit(),
    req.player?.id ? hasClaimedStarterKit(req.player.id) : Promise.resolve(false),
    prisma.vehicleTemplate.count({ where: { active: true, serverType: selectedServer } }),
    getRecruitingClans({ limit: 5 })
  ]);

  const categories = await getVisibleStoreCategories(selectedServer, categoryRows.map(c => c.category));

  res.render('shop', {
    title,
    products,
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
    vehicleCount,
    recruitingClans
  });
}

publicRoutes.get('/', async (req, res, next) => {
  try {
    return renderStore(req, res, 'Loja');
  } catch (err) {
    next(err);
  }
});

publicRoutes.get('/from-game', async (req, res) => {
  try {
    const steam64 = String(req.query.steam64 || '').trim();
    const serverTypeRaw = String(req.query.serverType || 'all').trim().toLowerCase();
    if (serverTypeRaw === 'deathmatch') {
      return res.redirect('/shop?serverType=vanilla&error=' + encodeURIComponent('No servidor Death Match a loja e o chamado ADM ficam bloqueados.'));
    }
    const serverType = 'vanilla';

    if (!steam64) {
      return res.redirect('/?error=' + encodeURIComponent('Steam64 não recebido do jogo. Abra novamente pelo L dentro do servidor.'));
    }

    const player = await upsertPlayerBySteam64({
      steam64,
      nickname: req.query.nickname || '',
      discordId: ''
    });

    await setPlayerCookie(res, player);

    const approvedStreamer = await prisma.streamerCode.findFirst({
      where: { streamerSteam64: player.steam64, active: true },
      select: { id: true },
      orderBy: { updatedAt: 'desc' }
    });

    if (approvedStreamer) {
      setStreamerAccessCookie(res, player.steam64);
      return res.redirect('/streamer?success=' + encodeURIComponent('Painel aberto pelo DayZ com seu Steam64 confirmado automaticamente.'));
    }

    clearStreamerAccessCookie(res);
    res.redirect('/shop?serverType=' + encodeURIComponent(serverType) + '&success=' + encodeURIComponent('Steam64 recebido do DayZ. Agora compre pelo site e a entrega cai no jogo.'));
  } catch (err) {
    clearStreamerAccessCookie(res);
    res.redirect('/?error=' + encodeURIComponent(err.message));
  }
});

publicRoutes.post('/player/save', async (req, res, next) => {
  try {
    const requestedSteam64 = String(req.body.steam64 || '').trim();
    const reservedStreamer = await prisma.streamerCode.findFirst({
      where: { streamerSteam64: requestedSteam64, active: true },
      select: { id: true }
    });
    if (reservedStreamer) {
      clearStreamerAccessCookie(res);
      throw new Error('Esse Steam64 é de streamer e não pode ser usado na entrada manual. O dono deve abrir pelo L dentro do servidor.');
    }

    const player = await upsertPlayerBySteam64({
      steam64: requestedSteam64,
      nickname: req.body.nickname,
      discordId: req.body.discordId,
      overwriteNickname: true
    });
    clearStreamerAccessCookie(res);
    await setPlayerCookie(res, player);
    res.redirect('/shop?serverType=vanilla&success=Steam64 salvo com sucesso.');
  } catch (err) {
    res.redirect(`/?error=${encodeURIComponent(err.message)}`);
  }
});

publicRoutes.post('/player/logout', (req, res) => {
  res.clearCookie('sz_player_token');
  clearStreamerAccessCookie(res);
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
    const [outfits, activeOutfit, rewardStatus] = await Promise.all([
      listOutfitTemplates({ serverType: 'vanilla' }),
      req.player?.steam64 ? getActiveOutfitForPlayer(req.player.steam64, 'vanilla') : null,
      req.player
        ? getOutfitRewardStatus({ playerId: req.player.id, steam64: req.player.steam64 })
        : { starterKitClaimed: false, normal7dClaimed: false, streamer7dClaimed: false }
    ]);
    res.render('outfits', {
      title: 'Trajes VIP',
      outfits,
      activeOutfit,
      rewardStatus,
      streamerCode: String(req.query.streamer || req.query.code || '').trim(),
      success: req.query.success || null,
      error: req.query.error || null
    });
  } catch (err) { next(err); }
});

publicRoutes.post('/outfits/buy', requirePlayer, async (req, res) => {
  try {
    const result = await buyOutfitSubscription({ playerId: req.player.id, outfitId: req.body.outfitId });
    res.redirect('/outfits?success=' + encodeURIComponent(`Assinatura ativada: ${result.outfit.name}. Ao morrer/renascer no servidor, o mod poderá entregar esse traje enquanto estiver ativo.`));
  } catch (err) {
    res.redirect('/outfits?error=' + encodeURIComponent(err.message));
  }
});

publicRoutes.post('/outfits/streamer-reward', requirePlayer, async (req, res) => {
  try {
    const result = await grantStreamerOutfitReward({ playerId: req.player.id, streamerCode: req.body.streamerCode, outfitId: req.body.outfitId });
    res.redirect('/outfits?success=' + encodeURIComponent(`VIP Booster ativado por 7 dias com o código ${result.streamerCode.code}. Este SteamID não poderá usar outro código de streamer.`));
  } catch (err) {
    res.redirect('/outfits?error=' + encodeURIComponent(err.message));
  }
});

publicRoutes.post('/outfits/free-7d', requirePlayer, async (req, res) => {
  try {
    const result = await grantFreeStarterOutfitReward({ playerId: req.player.id, outfitId: req.body.outfitId });
    res.redirect('/outfits?success=' + encodeURIComponent(`${result.outfit.name} ativado grátis por 7 dias. Este benefício só pode ser usado uma vez por SteamID.`));
  } catch (err) {
    res.redirect('/outfits?error=' + encodeURIComponent(err.message));
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
    const paid = result.chargedCoins > 0 ? ` Foi cobrado ${result.chargedCoins.toLocaleString('pt-BR')} RZ por 30 dias.` : ' A liberação é gratuita para o streamer.';
    res.redirect(back + '?success=' + encodeURIComponent(`${result.member.nickname || result.member.steam64} foi liberado no traje.${paid}`));
  } catch (err) {
    res.redirect(back + '?error=' + encodeURIComponent(err.message));
  }
});

publicRoutes.post('/managed-outfits/members/:subscriptionId/renew', requirePlayer, async (req, res) => {
  const back = managedReturnTo(req.body.returnTo);
  try {
    const result = await renewManagedOutfitMember({ subscriptionId: req.params.subscriptionId, ownerPlayerId: req.player.id });
    res.redirect(back + '?success=' + encodeURIComponent(`Mensalidade renovada por ${result.price.toLocaleString('pt-BR')} RZ. O player continua liberado por mais 30 dias.`));
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
    const outfit = await prisma.outfitTemplate.findUnique({ where: { id: req.params.id } });
    if (!outfit?.imageData) return res.redirect(outfit?.imageUrl || '/images/no-real-image.svg');
    res.setHeader('Content-Type', outfit.imageMime || 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.end(Buffer.from(outfit.imageData, 'base64'));
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
    clearStreamerAccessCookie(res);
    res.redirect('/shop?serverType=vanilla&error=' + encodeURIComponent(err.message));
  }
});

// A entrada manual foi desativada. O painel só aceita a sessão criada quando o
// streamer abre o site pelo L dentro do DayZ.
publicRoutes.post('/streamer/login', (req, res) => {
  clearStreamerAccessCookie(res);
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
        message: 'Esse player ainda não possui histórico competitivo no RAID-Z.'
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
  try {
    const data = await getPublicClanBySlug(req.params.slug, req.player.id);
    if (!data?.clan) throw new Error('Clã não encontrado.');
    const result = await purchaseClanOutfitMonth({
      playerId: req.player.id,
      clanId: data.clan.id,
      outfitId: data.clan.clanVipOutfit?.id || null
    });
    res.redirect(`/clans/${data.clan.slug}?success=` + encodeURIComponent(`Traje ${result.outfit.name} liberado por 30 dias. Foram cobrados ${result.price.toLocaleString('pt-BR')} RZ do seu saldo.`));
  } catch (err) {
    res.redirect(`/clans/${encodeURIComponent(req.params.slug)}?error=` + encodeURIComponent(err.message));
  }
});

publicRoutes.post('/clans/request', requirePlayer, async (req, res) => {
  res.redirect('/clans#criar-cla');
});

publicRoutes.get('/my-clan', requirePlayer, async (req, res, next) => {
  try {
    const membership = await getMyClanDashboard(req.player.id);
    res.render('myClan', { title: 'Meu Clã', membership, badges: membership?.badges || [] });
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
    const player = await upsertPlayerBySteam64({ steam64, nickname: req.body.nickname || '' });
    const otherClan = await prisma.clanMember.findFirst({ where: { playerId: player.id, status: 'ACTIVE', clanId: { not: membership.clanId } }, include: { clan: true } });
    if (otherClan) throw new Error(`Esse player já está no clã [${otherClan.clan.tag}] ${otherClan.clan.name}.`);
    await prisma.clanMember.upsert({
      where: { clanId_playerId: { clanId: membership.clanId, playerId: player.id } },
      update: { status: 'ACTIVE', role: 'MEMBER', steam64: player.steam64 },
      create: { clanId: membership.clanId, playerId: player.id, steam64: player.steam64, role: 'MEMBER', status: 'ACTIVE' }
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
    if (target.role === 'OWNER') throw new Error('Não dá para remover o dono do clã por aqui.');
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
  const productRow = await prisma.product.findFirst({
    where: { id: req.params.id, status: 'ACTIVE' },
    omit: { imageData: true },
    include: { items: { orderBy: { sortOrder: 'asc' } } }
  });
  const product = productRow ? { ...productRow, hasImageData: Boolean(productRow.imageMime) } : null;
  if (!product) return res.status(404).render('error', { title: 'Produto não encontrado', message: 'Esse produto não existe ou está inativo.' });

  const globalPromo = await getGlobalPromo(prisma);
  const productView = applyPromotionToProduct(product, globalPromo);
  const totalCoins = productView.displayPriceCoins * quantity;
  const originalTotalCoins = productView.basePriceCoins * quantity;
  const itemList = describeProductItems(product).map(item => ({ ...item, totalQuantity: item.quantity * quantity }));
  const player = await prisma.player.findUnique({ where: { id: req.player.id } });
  res.render('confirm', { title: 'Confirmar doação', product: productView, quantity, totalCoins, originalTotalCoins, itemList, player, checkoutToken: randomUUID() });
});

publicRoutes.post('/shop/buy/:id', requirePlayer, async (req, res) => {
  try {
    if (req.body.confirmPurchase !== 'on') {
      return res.redirect(`/shop/confirm/${req.params.id}?quantity=${encodeURIComponent(req.body.quantity || 1)}&error=${encodeURIComponent('Marque a confirmação para finalizar a doação.')}`);
    }
    const sendToFriend = req.body.sendToFriend === 'on';
    const giftSteam64 = sendToFriend ? String(req.body.friendSteam64 || '').trim() : null;
    if (sendToFriend && !giftSteam64) {
      return res.redirect(`/shop/confirm/${req.params.id}?quantity=${encodeURIComponent(req.body.quantity || 1)}&error=${encodeURIComponent('Digite o Steam64 do amigo para enviar de presente.')}`);
    }
    const result = await buyProduct({
      playerId: req.player.id,
      productId: req.params.id,
      quantity: Number(req.body.quantity || 1),
      giftSteam64,
      couponCode: req.body.couponCode,
      streamerCode: req.body.streamerCode,
      checkoutToken: req.body.checkoutToken
    });
    const count = result.deliveries?.length || 1;
    const giftText = result.gift?.steam64 ? ` Presente enviado para Steam64 ${result.gift.steam64}.` : '';
    const couponText = result.coupon?.code ? ` Cupom ${result.coupon.code} aplicado: -${result.coupon.discountCoins} RZ.` : '';
    const supportText = result.support?.code ? ` Apoio registrado para ${result.support.streamerName}.` : '';
    const returnServer = result.product?.serverType || 'vanilla';
    const category = result.product?.category || 'Kits Base';
    const ftpText = result.fileBridgeImmediate?.ok && !result.fileBridgeImmediate?.skipped
      ? ` Arquivo enviado ao FTP em ${Number(result.fileBridgeImmediate.durationMs || 0)}ms.`
      : (result.fileBridgeImmediate?.queued ? ' Entrega salva; recuperação FTP automática ativada.' : '');
    const message = result.duplicate
      ? 'Esta compra já havia sido processada. Nenhuma cobrança ou entrega foi duplicada.'
      : `Doação confirmada! ${result.product.name} gerou ${count} entrega(s) para o DayZ.${giftText}${couponText}${supportText}${ftpText}`;
    res.redirect(303, `/shop?serverType=${encodeURIComponent(returnServer)}&category=${encodeURIComponent(category)}&success=${encodeURIComponent(message)}`);
  } catch (err) {
    res.redirect(303, `/shop?category=${encodeURIComponent('Kits Base')}&error=${encodeURIComponent(err.message)}`);
  }
});



publicRoutes.get('/cart', requirePlayer, async (req, res) => {
  const player = await prisma.player.findUnique({ where: { id: req.player.id } });
  res.render('cart', { title: 'Carrinho', player, checkoutToken: randomUUID() });
});

publicRoutes.post('/cart/buy', requirePlayer, async (req, res) => {
  try {
    if (req.body.confirmPurchase !== 'on') {
      throw new Error('Marque a confirmação antes de finalizar o carrinho.');
    }
    let items = [];
    try {
      items = JSON.parse(String(req.body.cartItemsJson || '[]'));
    } catch (_) {
      throw new Error('Carrinho inválido. Volte para a loja e adicione os itens de novo.');
    }
    const result = await buyCart({
      playerId: req.player.id,
      items,
      couponCode: req.body.couponCode,
      streamerCode: req.body.streamerCode,
      source: 'site',
      checkoutToken: req.body.checkoutToken
    });
    const category = result.purchases?.[0]?.product?.category || 'Kits Base';
    const ftpText = result.fileBridgeImmediate?.ok && !result.fileBridgeImmediate?.skipped
      ? ` Arquivo enviado ao FTP em ${Number(result.fileBridgeImmediate.durationMs || 0)}ms.`
      : (result.fileBridgeImmediate?.queued ? ' Recuperação FTP automática ativada.' : '');
    const message = result.duplicate
      ? 'Este carrinho já havia sido finalizado. Nenhuma compra foi repetida.'
      : `Carrinho finalizado! ${result.purchases.length} produto(s), ${result.deliveries.length} entrega(s) criadas. Total: ${result.totalCoins.toLocaleString('pt-BR')} RZ.${ftpText}`;
    res.redirect(303, '/shop?serverType=vanilla&category=' + encodeURIComponent(category) + '&clearCart=1&success=' + encodeURIComponent(message));
  } catch (err) {
    res.redirect(303, '/cart?error=' + encodeURIComponent(err.message));
  }
});



publicRoutes.post('/starter-kit/claim', requirePlayer, async (req, res) => {
  try {
    const serverType = ['vanilla', 'bbp'].includes(String(req.body.serverType || '').toLowerCase())
      ? String(req.body.serverType).toLowerCase()
      : 'vanilla';
    const result = await claimStarterKit({ playerId: req.player.id, serverType });
    const bonusText = result.bonusCoins ? ` +${result.bonusCoins.toLocaleString('pt-BR')} RZ foram adicionados ao seu saldo.` : '';
    res.redirect('/outfits?success=' + encodeURIComponent(`Kit Inicial resgatado! Os itens foram enviados para entrega no DayZ.${bonusText} Agora escolha seu traje normal grátis por 7 dias.`));
  } catch (err) {
    const serverType = ['vanilla', 'bbp'].includes(String(req.body.serverType || '').toLowerCase()) ? String(req.body.serverType).toLowerCase() : 'vanilla';
    res.redirect('/shop?serverType=' + encodeURIComponent(serverType) + '&error=' + encodeURIComponent(err.message));
  }
});

publicRoutes.get('/vehicles', async (req, res) => {
  const selectedServer = 'vanilla';
  res.redirect('/shop?serverType=' + encodeURIComponent(selectedServer) + '&category=' + encodeURIComponent('Veículos'));
});

publicRoutes.post('/vehicles/buy/:id', requirePlayer, async (req, res) => {
  try {
    const result = await buyOrRentVehicle({
      playerId: req.player.id,
      templateId: req.params.id,
      ownershipType: req.body.ownershipType || 'OWNED',
      insurancePlanId: req.body.insurancePlanId || null,
      variantIndex: Number(req.body.variantIndex || 0)
    });

    res.redirect('/my-vehicles?success=' + encodeURIComponent('Compra confirmada com seguro mensal ativo! Veículo e 2 lâmpadas H7 foram enviados. O MuranoCarlock é instalado pelo mod do veículo.'));
  } catch (err) {
    res.redirect('/shop?category=' + encodeURIComponent('Veículos') + '&error=' + encodeURIComponent(err.message));
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
  // V52: imagens artificiais antigas foram removidas. Se o banco antigo ainda apontar para elas,
  // mostramos um cartão neutro para não quebrar a loja até o seed seguro atualizar a URL real.
  res.redirect('/images/no-real-image.svg');
});

publicRoutes.get('/dayz-wiki-image', async (req, res) => {
  try {
    const typeLower = String(req.query.type || '').trim().toLowerCase();
    const nameLower = String(req.query.name || '').trim().toLowerCase();
    if (typeLower === 'camonet' || nameLower.includes('camo net') || nameLower.includes('camouflage net')) {
      res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
      return res.redirect('/images/items/camonet-real.png');
    }
    const url = await resolveDayzWikiImage({ type: req.query.type, name: req.query.name, fallback: req.query.fallback });
    res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
    return res.redirect(url);
  } catch (_) {
    return res.redirect('/images/no-real-image.svg');
  }
});



publicRoutes.get('/player-avatar/:id', async (req, res) => {
  const player = await prisma.player.findUnique({ where: { id: req.params.id }, select: { avatarData: true, avatarMime: true } });
  if (!player?.avatarData || !player?.avatarMime) return res.redirect('/images/raidz-profile-default.webp');
  const buffer = Buffer.from(player.avatarData, 'base64');
  res.setHeader('Content-Type', player.avatarMime);
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('Content-Length', String(buffer.length));
  res.send(buffer);
});

publicRoutes.get('/clan-flag/:id', async (req, res) => {
  const clan = await prisma.clan.findUnique({ where: { id: req.params.id }, select: { flagData: true, flagMime: true, flagUrl: true } });
  if (!clan?.flagData || !clan?.flagMime) return res.redirect(clan?.flagUrl || '/images/raidz-clan-default.webp');
  const buffer = Buffer.from(clan.flagData, 'base64');
  res.setHeader('Content-Type', clan.flagMime);
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('Content-Length', String(buffer.length));
  res.send(buffer);
});

publicRoutes.get('/clan-banner/:id', async (req, res) => {
  const clan = await prisma.clan.findUnique({ where: { id: req.params.id }, select: { bannerData: true, bannerMime: true } });
  if (!clan?.bannerData || !clan?.bannerMime) return res.redirect('/images/raidz-clans-hero.webp');
  const buffer = Buffer.from(clan.bannerData, 'base64');
  res.setHeader('Content-Type', clan.bannerMime);
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('Content-Length', String(buffer.length));
  res.send(buffer);
});

publicRoutes.get('/starter-kit-image', async (req, res) => {
  const kit = await getStarterKit();
  if (!kit?.imageData || !kit?.imageMime) return res.redirect(kit?.imageUrl || '/images/no-real-image.svg');
  const rawBuffer = Buffer.from(kit.imageData, 'base64');
  const buffer = String(kit.imageMime).toLowerCase().includes('png') ? makePngBackgroundTransparent(rawBuffer) : rawBuffer;
  res.setHeader('Content-Type', String(kit.imageMime).toLowerCase().includes('png') ? 'image/png' : kit.imageMime);
  res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
  res.setHeader('Content-Length', String(buffer.length));
  res.send(buffer);
});

publicRoutes.get('/vehicle-image/:id', async (req, res) => {
  const vehicle = await prisma.vehicleTemplate.findUnique({ where: { id: req.params.id }, select: { imageData: true, imageMime: true } });
  if (!vehicle?.imageData || !vehicle?.imageMime) return res.redirect('/images/no-real-image.svg');
  const rawBuffer = Buffer.from(vehicle.imageData, 'base64');
  const buffer = String(vehicle.imageMime).toLowerCase().includes('png') ? makePngBackgroundTransparent(rawBuffer) : rawBuffer;
  res.setHeader('Content-Type', String(vehicle.imageMime).toLowerCase().includes('png') ? 'image/png' : vehicle.imageMime);
  res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
  res.setHeader('Content-Length', String(buffer.length));
  res.send(buffer);
});

publicRoutes.get('/product-image/:id', async (req, res) => {
  const product = await prisma.product.findUnique({ where: { id: req.params.id }, select: { imageData: true, imageMime: true } });
  if (!product?.imageData || !product?.imageMime) return res.redirect('/images/no-real-image.svg');
  const rawBuffer = Buffer.from(product.imageData, 'base64');
  const buffer = String(product.imageMime).toLowerCase().includes('png') ? makePngBackgroundTransparent(rawBuffer) : rawBuffer;
  res.setHeader('Content-Type', String(product.imageMime).toLowerCase().includes('png') ? 'image/png' : product.imageMime);
  res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
  res.setHeader('Content-Length', String(buffer.length));
  res.send(buffer);
});
