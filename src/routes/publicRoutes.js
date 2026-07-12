import { Router } from 'express';
import { prisma } from '../db/prisma.js';
import { requirePlayer } from '../middleware/auth.js';
import { upsertPlayerBySteam64, setPlayerCookie } from '../services/playerService.js';
import { listActiveProducts, buyProduct, buyCart } from '../services/shopService.js';
import { createPixPayment } from '../services/paymentService.js';
import { getGlobalPromo, applyPromotionToProduct } from '../services/promotionService.js';
import { env } from '../config/env.js';
import { describeProductItems } from '../utils/productItems.js';
import { buyOrRentVehicle, requestVehicleRespawn, renewVehicle, renewInsurance, upgradeInsurancePlan, cancelPlayerVehicle } from '../services/vehicleRentalService.js';
import { getStarterKit, hasClaimedStarterKit, claimStarterKit } from '../services/starterKitService.js';
import { getRankingData, getMyClan, canManageClan } from '../services/rankingService.js';
import { DEATHMATCH_ACTIONS, getDeathmatchConfig } from '../services/deathmatchService.js';
import { getStreamerDashboardByCode, getStreamerDashboardBySteam64, requestStreamerWeeklyPayout } from '../services/supportService.js';
import { listOutfitTemplates, getActiveOutfitForPlayer, buyOutfitSubscription, grantStreamerOutfitReward } from '../services/outfitService.js';
import { resolveDayzWikiImage } from '../services/dayzWikiImageService.js';
import { makePngBackgroundTransparent } from '../utils/pngTransparency.js';
import { storeCategories as fallbackStoreCategories } from '../data/vanillaStoreData.js';

export const publicRoutes = Router();


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
  const selectedCategoryRaw = String(req.query.category || '').trim();
  if (!selectedCategoryRaw) {
    return res.redirect('/shop?serverType=' + encodeURIComponent(selectedServer) + '&category=' + encodeURIComponent('Kits Base'));
  }
  const selectedCategory = canonicalCategoryName(selectedCategoryRaw);
  const isVehicleCategory = isVehicleStoreCategory(selectedCategory);

  const [products, categoryRows, globalPromo, vehicleTemplates, globalVehiclePlans, starterKit, starterKitClaimed, vehicleCount] = await Promise.all([
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
          include: {
            insurancePlans: {
              where: { active: true },
              orderBy: [{ billingType: 'asc' }, { priceCoins: 'asc' }]
            }
          },
          orderBy: [{ buyPriceCoins: 'asc' }, { name: 'asc' }]
        })
      : Promise.resolve([]),
    isVehicleCategory
      ? prisma.vehicleInsurancePlan.findMany({
          where: { active: true, templateId: null },
          orderBy: [{ billingType: 'asc' }, { priceCoins: 'asc' }]
        })
      : Promise.resolve([]),
    getStarterKit(),
    req.player?.id ? hasClaimedStarterKit(req.player.id) : Promise.resolve(false),
    prisma.vehicleTemplate.count({ where: { active: true, serverType: selectedServer } })
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
    vehicleTemplates,
    globalVehiclePlans,
    starterKit,
    starterKitClaimed,
    vehicleCount
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
      return res.redirect('/streamer?error=' + encodeURIComponent('No servidor Death Match a loja e o chamado ADM ficam bloqueados. Use a aba Streamer/DM.'));
    }
    const serverType = 'vanilla';

    if (!steam64) {
      return res.redirect('/?error=' + encodeURIComponent('Steam64 não recebido do jogo. Digite seu Steam64 para entrar na loja.'));
    }

    const player = await upsertPlayerBySteam64({
      steam64,
      nickname: req.query.nickname || '',
      discordId: ''
    });

    await setPlayerCookie(res, player);
    res.redirect('/shop?serverType=' + encodeURIComponent(serverType) + '&success=' + encodeURIComponent('Steam64 recebido do DayZ. Agora compre pelo site e a entrega cai no jogo.'));
  } catch (err) {
    res.redirect('/?error=' + encodeURIComponent(err.message));
  }
});

publicRoutes.post('/player/save', async (req, res, next) => {
  try {
    const player = await upsertPlayerBySteam64({
      steam64: req.body.steam64,
      nickname: req.body.nickname,
      discordId: req.body.discordId
    });
    await setPlayerCookie(res, player);
    res.redirect('/shop?serverType=vanilla&success=Steam64 salvo com sucesso.');
  } catch (err) {
    res.redirect(`/?error=${encodeURIComponent(err.message)}`);
  }
});

publicRoutes.post('/player/logout', (req, res) => {
  res.clearCookie('sz_player_token');
  res.redirect('/');
});


publicRoutes.get('/outfits', async (req, res, next) => {
  try {
    const outfits = await listOutfitTemplates({ serverType: 'vanilla' });
    const activeOutfit = req.player?.steam64 ? await getActiveOutfitForPlayer(req.player.steam64, 'vanilla') : null;
    res.render('outfits', { title: 'Trajes VIP', outfits, activeOutfit, streamerCode: String(req.query.streamer || req.query.code || '').trim(), success: req.query.success || null, error: req.query.error || null });
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
    res.redirect('/outfits?success=' + encodeURIComponent(`Traje VIP de 7 dias ativado pelo código ${result.streamerCode.code}. Você não poderá usar outro streamer até vencer.`));
  } catch (err) {
    res.redirect('/outfits?error=' + encodeURIComponent(err.message));
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

publicRoutes.get('/streamer', async (req, res, next) => {
  try {
    const loginCode = String(req.query.code || '').trim();
    const loginSteam64 = String(req.query.steam64 || req.player?.steam64 || '').trim();
    let streamerDashboard = null;
    let success = req.query.success || null;
    let error = req.query.error || null;

    if (!error && loginSteam64) {
      try {
        streamerDashboard = await getStreamerDashboardBySteam64(loginSteam64);
        success = success || 'Painel streamer carregado pelo Steam64 liberado pelo ADM.';
      } catch (err) {
        if (req.query.steam64) error = err.message;
      }
    }

    if (!streamerDashboard && loginCode && !error) {
      try {
        streamerDashboard = await getStreamerDashboardByCode(loginCode);
        success = success || 'Painel carregado pelo código de apoio.';
      } catch (err) {
        error = err.message;
      }
    }

    res.render('streamer', {
      title: 'Painel de Apoio Streamer',
      streamerDashboard,
      loginCode: streamerDashboard?.streamerCode?.code || loginCode,
      loginSteam64,
      error,
      success,
      deathmatchLocked: true
    });
  } catch (err) {
    next(err);
  }
});

publicRoutes.post('/streamer/login', async (req, res) => {
  try {
    const steam64 = String(req.body.steam64 || '').trim();
    const code = String(req.body.code || req.body.accessCode || '').trim();
    const dashboard = steam64 ? await getStreamerDashboardBySteam64(steam64) : await getStreamerDashboardByCode(code);
    res.render('streamer', {
      title: 'Painel de Apoio Streamer',
      streamerDashboard: dashboard,
      loginCode: dashboard.streamerCode.code,
      loginSteam64: dashboard.streamerCode.streamerSteam64 || steam64,
      error: null,
      success: 'Painel carregado. Aqui mostra seu código de apoiador, quem comprou apoiando você e quanto tem para receber.',
      deathmatchLocked: true
    });
  } catch (err) {
    res.redirect('/streamer?error=' + encodeURIComponent(err.message));
  }
});


publicRoutes.post('/streamer/request-payout', async (req, res) => {
  const code = String(req.body.code || '').trim();
  const steam64 = String(req.body.steam64 || '').trim();
  try {
    const payout = await requestStreamerWeeklyPayout({ code, steam64 });
    const amount = Number(payout.amountBrl || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    res.redirect('/streamer?steam64=' + encodeURIComponent(steam64) + '&code=' + encodeURIComponent(code) + '&success=' + encodeURIComponent('Solicitação semanal enviada para o ADM. Valor aproximado: ' + amount + '.'));
  } catch (err) {
    res.redirect('/streamer?steam64=' + encodeURIComponent(steam64) + '&code=' + encodeURIComponent(code) + '&error=' + encodeURIComponent(err.message));
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

publicRoutes.post('/clans/request', requirePlayer, async (req, res) => {
  res.redirect('/ranking?error=' + encodeURIComponent('Solicitação de clã pelo site foi removida. Abra ticket no Discord e peça para o ADM liberar o dono do clã pelo Steam64.') + '#solicitar-cla');
});

publicRoutes.get('/my-clan', requirePlayer, async (req, res, next) => {
  try {
    const membership = await getMyClan(req.player.id);
    const badges = await prisma.playerBadge.findMany({ where: { steam64: req.player.steam64, visible: true }, orderBy: { awardedAt: 'desc' } });
    res.render('myClan', { title: 'Meu Clã', membership, badges });
  } catch (err) {
    next(err);
  }
});

publicRoutes.post('/my-clan/update', requirePlayer, async (req, res) => {
  try {
    const membership = await getMyClan(req.player.id);
    if (!canManageClan(membership)) throw new Error('Apenas dono ou sub dono pode editar o clã.');
    await prisma.clan.update({
      where: { id: membership.clanId },
      data: {
        // V35: dono/sub dono pode ajustar a descrição, mas não pode trocar bandeira.
        // Bandeira/imagem do clã fica só para o admin aprovar/alterar.
        description: String(req.body.description || '').trim() || null
      }
    });
    res.redirect('/my-clan?success=' + encodeURIComponent('Clã atualizado.'));
  } catch (err) {
    res.redirect('/my-clan?error=' + encodeURIComponent(err.message));
  }
});

publicRoutes.post('/my-clan/members/add', requirePlayer, async (req, res) => {
  try {
    const membership = await getMyClan(req.player.id);
    if (!canManageClan(membership)) throw new Error('Apenas dono ou sub dono pode adicionar membros.');
    const steam64 = String(req.body.steam64 || '').trim();
    if (!/^\d{17}$/.test(steam64)) throw new Error('Steam64 inválido.');
    const player = await upsertPlayerBySteam64({ steam64, nickname: req.body.nickname || '' });
    await prisma.clanMember.upsert({
      where: { clanId_playerId: { clanId: membership.clanId, playerId: player.id } },
      update: { status: 'ACTIVE', role: 'MEMBER', steam64: player.steam64 },
      create: { clanId: membership.clanId, playerId: player.id, steam64: player.steam64, role: 'MEMBER', status: 'ACTIVE' }
    });
    res.redirect('/my-clan?success=' + encodeURIComponent('Player adicionado ao clã.'));
  } catch (err) {
    res.redirect('/my-clan?error=' + encodeURIComponent(err.message));
  }
});

publicRoutes.post('/my-clan/members/:memberId/remove', requirePlayer, async (req, res) => {
  try {
    const membership = await getMyClan(req.player.id);
    if (!canManageClan(membership)) throw new Error('Apenas dono ou sub dono pode remover membros.');
    const target = await prisma.clanMember.findUnique({ where: { id: req.params.memberId } });
    if (!target || target.clanId !== membership.clanId) throw new Error('Membro não encontrado.');
    if (target.role === 'OWNER') throw new Error('Não dá para remover o dono do clã por aqui.');
    await prisma.clanMember.update({ where: { id: target.id }, data: { status: 'REMOVED' } });
    res.redirect('/my-clan?success=' + encodeURIComponent('Membro removido.'));
  } catch (err) {
    res.redirect('/my-clan?error=' + encodeURIComponent(err.message));
  }
});

publicRoutes.post('/my-clan/members/:memberId/sub-owner', requirePlayer, async (req, res) => {
  try {
    const membership = await getMyClan(req.player.id);
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
  const product = await prisma.product.findFirst({
    where: { id: req.params.id, status: 'ACTIVE' },
    include: { items: { orderBy: { sortOrder: 'asc' } } }
  });
  if (!product) return res.status(404).render('error', { title: 'Produto não encontrado', message: 'Esse produto não existe ou está inativo.' });

  const globalPromo = await getGlobalPromo(prisma);
  const productView = applyPromotionToProduct(product, globalPromo);
  const totalCoins = productView.displayPriceCoins * quantity;
  const originalTotalCoins = productView.basePriceCoins * quantity;
  const itemList = describeProductItems(product).map(item => ({ ...item, totalQuantity: item.quantity * quantity }));
  const player = await prisma.player.findUnique({ where: { id: req.player.id } });
  res.render('confirm', { title: 'Confirmar doação', product: productView, quantity, totalCoins, originalTotalCoins, itemList, player });
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
    const result = await buyProduct({ playerId: req.player.id, productId: req.params.id, quantity: Number(req.body.quantity || 1), giftSteam64, couponCode: req.body.couponCode, streamerCode: req.body.streamerCode });
    const count = result.deliveries?.length || 1;
    const giftText = result.gift?.steam64 ? ` Presente enviado para Steam64 ${result.gift.steam64}.` : '';
    const couponText = result.coupon?.code ? ` Cupom ${result.coupon.code} aplicado: -${result.coupon.discountCoins} RZ.` : '';
    const supportText = result.support?.code ? ` Apoio registrado para ${result.support.streamerName}.` : '';
    const returnServer = result.product?.serverType || 'vanilla';
    res.redirect(`/shop?serverType=${encodeURIComponent(returnServer)}&success=${encodeURIComponent(`Doação confirmada! ${result.product.name} gerou ${count} entrega(s) para o DayZ.${giftText}${couponText}${supportText}`)}`);
  } catch (err) {
    res.redirect(`/shop?error=${encodeURIComponent(err.message)}`);
  }
});



publicRoutes.get('/cart', requirePlayer, async (req, res) => {
  const player = await prisma.player.findUnique({ where: { id: req.player.id } });
  res.render('cart', { title: 'Carrinho', player });
});

publicRoutes.post('/cart/buy', requirePlayer, async (req, res) => {
  try {
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
      source: 'site'
    });
    res.redirect('/shop?serverType=vanilla&success=' + encodeURIComponent(`Carrinho finalizado! ${result.purchases.length} produto(s), ${result.deliveries.length} entrega(s) criadas. Total: ${result.totalCoins.toLocaleString('pt-BR')} RZ.`));
  } catch (err) {
    res.redirect('/cart?error=' + encodeURIComponent(err.message));
  }
});



publicRoutes.post('/starter-kit/claim', requirePlayer, async (req, res) => {
  try {
    const serverType = ['vanilla', 'bbp'].includes(String(req.body.serverType || '').toLowerCase())
      ? String(req.body.serverType).toLowerCase()
      : 'vanilla';
    const result = await claimStarterKit({ playerId: req.player.id, serverType });
    const bonusText = result.bonusCoins ? ` +${result.bonusCoins.toLocaleString('pt-BR')} RZ foram adicionados ao seu saldo.` : '';
    res.redirect('/shop?serverType=' + encodeURIComponent(result.serverType) + '&success=' + encodeURIComponent(`Kit Inicial resgatado! Os itens foram enviados para entrega no DayZ.${bonusText}`));
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

    res.redirect('/my-vehicles?success=' + encodeURIComponent(result.insurancePlan ? 'Veículo confirmado com seguro! A entrega foi criada e ele já aparece na Minha Garagem.' : 'Veículo confirmado! A entrega foi criada e ele aparece na Minha Garagem. Sem seguro, você pode adicionar um plano depois.'));
  } catch (err) {
    res.redirect('/shop?category=' + encodeURIComponent('Veículos') + '&error=' + encodeURIComponent(err.message));
  }
});

publicRoutes.get('/my-vehicles', requirePlayer, async (req, res) => {
  const selectedGarageServer = ['vanilla', 'bbp'].includes(String(req.query.serverType || '').toLowerCase())
    ? String(req.query.serverType).toLowerCase()
    : 'all';

  const vehicleWhere = {
    playerId: req.player.id,
    status: { not: 'CANCELLED' }
  };
  if (selectedGarageServer !== 'all') vehicleWhere.serverType = selectedGarageServer;

  const [vehicles, logs, player, availablePlans, allGarageVehicles] = await Promise.all([
    prisma.playerVehicle.findMany({ where: vehicleWhere, include: { template: true, insurancePlan: true }, orderBy: { updatedAt: 'desc' } }),
    prisma.vehicleRespawnLog.findMany({ where: { playerId: req.player.id }, orderBy: { createdAt: 'desc' }, take: 50 }),
    prisma.player.findUnique({ where: { id: req.player.id } }),
    prisma.vehicleInsurancePlan.findMany({ where: { active: true }, orderBy: [{ billingType: 'asc' }, { priceCoins: 'asc' }] }),
    prisma.playerVehicle.findMany({ where: { playerId: req.player.id, status: { not: 'CANCELLED' } }, select: { id: true, serverType: true, status: true, insurancePlanId: true, expiresAt: true } })
  ]);
  res.render('myVehicles', { title: 'Minha Garagem', vehicles, logs, player, availablePlans, selectedGarageServer, allGarageVehicles });
});

publicRoutes.post('/my-vehicles/:id/respawn', requirePlayer, async (req, res) => {
  try {
    await requestVehicleRespawn({ playerId: req.player.id, playerVehicleId: req.params.id, coverageType: req.body.coverageType || 'NORMAL' });
    res.redirect('/my-vehicles?success=' + encodeURIComponent(req.body.coverageType === 'THEFT' ? 'Seguro por roubo solicitado. Sem limite de distância: se o carro estiver em movimento ou com player dentro, vai aguardar.' : 'Seguro normal solicitado. O player precisa estar até 250m do carro antigo.'));
  } catch (err) {
    res.redirect('/my-vehicles?error=' + encodeURIComponent(err.message));
  }
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
  const [packages, ledgers, payments, deliveries] = await Promise.all([
    prisma.coinPackage.findMany({ where: { active: true }, orderBy: { amountBrl: 'asc' } }),
    prisma.coinLedger.findMany({ where: { playerId: req.player.id }, orderBy: { createdAt: 'desc' }, take: 20 }),
    prisma.payment.findMany({ where: { playerId: req.player.id }, orderBy: { createdAt: 'desc' }, take: 10 }),
    prisma.deliveryQueue.findMany({ where: { playerId: req.player.id }, orderBy: { createdAt: 'desc' }, take: 10 })
  ]);
  const player = await prisma.player.findUnique({ where: { id: req.player.id } });
  res.render('wallet', { title: 'Minha conta', player, packages, ledgers, payments, deliveries });
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
  const payment = await prisma.payment.findFirst({
    where: { id: req.params.id, playerId: req.player.id },
    select: { id: true, status: true, approvedAt: true, coins: true }
  });
  if (!payment) return res.status(404).json({ ok: false, error: 'Pagamento não encontrado.' });
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
      res.setHeader('Cache-Control', 'no-store, max-age=0');
      return res.redirect('/images/items/camonet-real.png');
    }
    const url = await resolveDayzWikiImage({ type: req.query.type, name: req.query.name, fallback: req.query.fallback });
    res.setHeader('Cache-Control', 'no-store, max-age=0');
    return res.redirect(url);
  } catch (_) {
    return res.redirect('/images/no-real-image.svg');
  }
});


publicRoutes.get('/starter-kit-image', async (req, res) => {
  const kit = await getStarterKit();
  if (!kit?.imageData || !kit?.imageMime) return res.redirect(kit?.imageUrl || '/images/no-real-image.svg');
  const rawBuffer = Buffer.from(kit.imageData, 'base64');
  const buffer = String(kit.imageMime).toLowerCase().includes('png') ? makePngBackgroundTransparent(rawBuffer) : rawBuffer;
  res.setHeader('Content-Type', String(kit.imageMime).toLowerCase().includes('png') ? 'image/png' : kit.imageMime);
  res.setHeader('Cache-Control', 'no-store, max-age=0, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.send(buffer);
});

publicRoutes.get('/vehicle-image/:id', async (req, res) => {
  const vehicle = await prisma.vehicleTemplate.findUnique({ where: { id: req.params.id }, select: { imageData: true, imageMime: true } });
  if (!vehicle?.imageData || !vehicle?.imageMime) return res.redirect('/images/no-real-image.svg');
  const rawBuffer = Buffer.from(vehicle.imageData, 'base64');
  const buffer = String(vehicle.imageMime).toLowerCase().includes('png') ? makePngBackgroundTransparent(rawBuffer) : rawBuffer;
  res.setHeader('Content-Type', String(vehicle.imageMime).toLowerCase().includes('png') ? 'image/png' : vehicle.imageMime);
  res.setHeader('Cache-Control', 'no-store, max-age=0, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.send(buffer);
});

publicRoutes.get('/product-image/:id', async (req, res) => {
  const product = await prisma.product.findUnique({ where: { id: req.params.id }, select: { imageData: true, imageMime: true } });
  if (!product?.imageData || !product?.imageMime) return res.redirect('/images/no-real-image.svg');
  const rawBuffer = Buffer.from(product.imageData, 'base64');
  const buffer = String(product.imageMime).toLowerCase().includes('png') ? makePngBackgroundTransparent(rawBuffer) : rawBuffer;
  res.setHeader('Content-Type', String(product.imageMime).toLowerCase().includes('png') ? 'image/png' : product.imageMime);
  res.setHeader('Cache-Control', 'no-store, max-age=0, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.send(buffer);
});
