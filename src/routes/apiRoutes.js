import { Router } from 'express';
import { prisma } from '../db/prisma.js';
import { requireApiKey } from '../middleware/auth.js';
import { buyProduct, listGameProducts } from '../services/shopService.js';
import { logDelivery } from '../services/discordLogger.js';
import { logAudit } from '../services/auditService.js';
import { markVehicleDeliveryResult, updateVehicleRuntimeStatusFromGame } from '../services/vehicleRentalService.js';
import { registerKillEventFromGame } from '../services/rankingService.js';
import { getDeathmatchPublicConfig, enqueueDeathmatchGiftEvent, claimDeathmatchEvents, confirmDeathmatchEvent, clearDeathmatchStreamer, getDeathmatchRanking } from '../services/deathmatchService.js';
import { getActiveOutfitForPlayer } from '../services/outfitService.js';
import { upsertPlayerBySteam64, changePlayerCoins } from '../services/playerService.js';

export const apiRoutes = Router();

const GAME_SERVER_TYPES = ['vanilla', 'bbp', 'deathmatch'];

function normalizeServerType(value) {
  const serverType = String(value || '').trim().toLowerCase();
  if (!GAME_SERVER_TYPES.includes(serverType)) {
    throw new Error('serverType inválido. Use vanilla, bbp ou deathmatch.');
  }
  return serverType;
}


function deathmatchStoreBlocked(res, area = 'loja') {
  return res.status(403).json({
    ok: false,
    blocked: true,
    code: 'DEATHMATCH_BLOCKED',
    error: area === 'support'
      ? 'Chamado ADM bloqueado no servidor Death Match.'
      : 'Loja bloqueada no servidor Death Match. Use o MOD separado do Death Match.'
  });
}

function parseBooleanLike(value) {
  if (typeof value === 'boolean') return value;
  const normalized = String(value ?? '').trim().toLowerCase();
  if (!normalized) return null;
  if (['true', '1', 'yes', 'y', 'ok', 'success', 'done', 'delivered', 'completed'].includes(normalized)) return true;
  if (['false', '0', 'no', 'n', 'fail', 'failed', 'error', 'cancelled'].includes(normalized)) return false;
  return null;
}

function resolveDeliveryOk(data = {}) {
  const explicitOk = parseBooleanLike(data.ok);
  if (explicitOk !== null) return explicitOk;

  const statusFields = [data.status, data.result, data.deliveryStatus, data.state, data.success, data.delivered];
  for (const field of statusFields) {
    const parsed = parseBooleanLike(field);
    if (parsed !== null) return parsed;
  }

  if (String(data.error || '').trim()) return false;
  return true;
}

apiRoutes.use(requireApiKey);

apiRoutes.get('/health', (req, res) => {
  res.json({ ok: true, name: 'raidz-web-store', time: new Date().toISOString() });
});


apiRoutes.get('/deathmatch/config', async (req, res) => {
  try {
    const config = await getDeathmatchPublicConfig(req.query.streamerSteam64 || req.query.steam64);
    res.json({ ok: true, serverType: 'deathmatch', ...config });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

apiRoutes.post('/deathmatch/tiktok/gift', async (req, res) => {
  try {
    const event = await enqueueDeathmatchGiftEvent(req.body, 'tiktok-beta');
    res.json({ ok: true, event });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

apiRoutes.post('/deathmatch/events/claim', async (req, res) => {
  try {
    const result = await claimDeathmatchEvents({ streamerSteam64: req.body.streamerSteam64 || req.body.steam64, limit: req.body.limit });
    res.json({ ok: true, serverType: 'deathmatch', gameplay: result.cfg.gameplay, events: result.events });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

apiRoutes.post('/deathmatch/events/:id/confirm', async (req, res) => {
  try {
    const ok = parseBooleanLike(req.body.ok ?? req.query.ok) ?? true;
    const event = await confirmDeathmatchEvent({ eventId: req.params.id, ok, error: req.body.error || req.query.error || '' });
    res.json({ ok: true, event });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

apiRoutes.post('/deathmatch/streamer-death', async (req, res) => {
  try {
    const result = await clearDeathmatchStreamer({ streamerSteam64: req.body.streamerSteam64 || req.body.steam64, reason: 'streamer_death' });
    res.json({ ok: true, serverType: 'deathmatch', clearAll: true, ...result });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

apiRoutes.get('/deathmatch/ranking', async (req, res) => {
  try {
    const ranking = await getDeathmatchRanking({ period: req.query.period || 'weekly', limit: req.query.limit || 15 });
    res.json({ ok: true, ...ranking });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});


apiRoutes.get('/deathmatch/events/claim', async (req, res) => {
  try {
    const result = await claimDeathmatchEvents({ streamerSteam64: req.query.streamerSteam64 || req.query.steam64 || req.query.steamId, limit: req.query.limit });
    res.json({ ok: true, serverType: 'deathmatch', gameplay: result.cfg.gameplay, events: result.events });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

// Compatibilidade com o primeiro MOD beta antigo
apiRoutes.get('/game/events', async (req, res) => {
  try {
    const result = await claimDeathmatchEvents({ streamerSteam64: req.query.streamerSteam64 || req.query.steam64 || req.query.steamId, limit: req.query.limit });
    res.json({ ok: true, serverType: 'deathmatch', gameplay: result.cfg.gameplay, events: result.events });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

apiRoutes.post('/game/ack', async (req, res) => {
  try {
    const event = await confirmDeathmatchEvent({ eventId: req.body.eventId || req.body.id, ok: true, error: req.body.reason || '' });
    res.json({ ok: true, event });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

apiRoutes.post('/game/streamer-death', async (req, res) => {
  try {
    const result = await clearDeathmatchStreamer({ streamerSteam64: req.body.streamerSteam64 || req.body.steam64 || req.body.steamId, reason: req.body.reason || 'streamer_death' });
    res.json({ ok: true, serverType: 'deathmatch', clearAll: true, ...result });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

apiRoutes.post('/game/support/request', async (req, res) => {
  const serverType = String(req.body.serverType || req.query.serverType || '').trim().toLowerCase();
  if (serverType === 'deathmatch') return deathmatchStoreBlocked(res, 'support');
  res.status(501).json({ ok: false, error: 'Chamado ADM não está configurado neste site da loja.' });
});


apiRoutes.post('/game/vehicles/status', async (req, res) => {
  try {
    const result = await updateVehicleRuntimeStatusFromGame({
      vehicleKey: req.body.vehicleKey,
      classname: req.body.classname,
      position: req.body.position,
      speedKmh: Number(req.body.speedKmh || 0),
      moving: parseBooleanLike(req.body.moving) ?? false,
      occupied: parseBooleanLike(req.body.occupied) ?? false,
      canTheftClaim: parseBooleanLike(req.body.canTheftClaim)
    });

    res.json({ ok: true, ...result });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});


// V78: recompensa por tempo jogado enviada pelo mod DayZ.
// Nao aparece valor no site publico; apenas credita o saldo quando o servidor confirmar a jogatina.
apiRoutes.post('/game/playtime/reward', async (req, res) => {
  try {
    const serverType = normalizeServerType(req.body.serverType || 'vanilla');
    if (serverType === 'deathmatch') return deathmatchStoreBlocked(res, 'loja');

    const steam64 = String(req.body.steam64 || req.body.steamId || '').trim();
    if (!/^\d{17}$/.test(steam64)) {
      return res.status(400).json({ ok: false, error: 'steam64 obrigatorio e deve ter 17 numeros.' });
    }

    const coinsAmount = Math.floor(Number(req.body.coins || req.body.amount || 0));
    if (!Number.isInteger(coinsAmount) || coinsAmount <= 0 || coinsAmount > 100000) {
      return res.status(400).json({ ok: false, error: 'Quantidade de moedas invalida.' });
    }

    const playedSeconds = Math.max(0, Math.floor(Number(req.body.playedSeconds || 0)));
    const playerName = String(req.body.playerName || req.body.nickname || '').trim().slice(0, 64);
    const rawReason = String(req.body.reason || '').trim().slice(0, 120);
    const safeReason = rawReason || `playtime_${playedSeconds || 'periodo'}`;
    const refId = `${serverType}:${steam64}:${safeReason}`.slice(0, 190);

    const player = await upsertPlayerBySteam64({ steam64, nickname: playerName || undefined });

    const result = await prisma.$transaction(async (tx) => {
      const alreadyCredited = await tx.coinLedger.findFirst({
        where: { playerId: player.id, refType: 'playtime_reward', refId },
        select: { id: true, balanceAfter: true, createdAt: true }
      });

      if (alreadyCredited) {
        const currentPlayer = await tx.player.findUnique({ where: { id: player.id } });
        return {
          credited: false,
          duplicate: true,
          balance: currentPlayer?.coins ?? alreadyCredited.balanceAfter,
          ledgerId: alreadyCredited.id
        };
      }

      const updatedPlayer = await changePlayerCoins({
        playerId: player.id,
        amount: coinsAmount,
        reason: 'Recompensa por tempo jogado',
        refType: 'playtime_reward',
        refId,
        tx
      });

      return {
        credited: true,
        duplicate: false,
        balance: updatedPlayer.coins,
        ledgerId: null
      };
    });

    await logAudit({
      actor: steam64,
      action: result.credited ? 'game.playtime.reward.credited' : 'game.playtime.reward.duplicate',
      target: player.id,
      data: { serverType, playedSeconds, coins: coinsAmount, reason: safeReason, balance: result.balance }
    });

    res.json({
      ok: true,
      serverType,
      steam64,
      credited: result.credited,
      duplicate: result.duplicate,
      balance: result.balance
    });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});



apiRoutes.post('/game/kills', async (req, res) => {
  try {
    const kill = await registerKillEventFromGame(req.body);
    await logAudit({ actor: kill.killerSteam64, action: 'game.kill.registered', target: kill.id, data: { serverType: kill.serverType, victim: kill.victimSteam64, weapon: kill.weapon, distanceMeters: kill.distanceMeters, headshot: kill.headshot } });
    res.json({ ok: true, kill });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});


apiRoutes.get('/game/outfit/active', async (req, res) => {
  try {
    const serverType = normalizeServerType(req.query.serverType || 'vanilla');
    if (serverType === 'deathmatch') return deathmatchStoreBlocked(res, 'loja');
    const steam64 = String(req.query.steam64 || '').trim();
    if (!steam64) return res.status(400).json({ ok: false, error: 'steam64 obrigatório.' });
    const active = await getActiveOutfitForPlayer(steam64, serverType);
    if (!active) return res.json({ ok: true, active: false, steam64, serverType, items: [] });
    await prisma.playerOutfitSubscription.update({ where: { id: active.id }, data: { lastSpawnAt: new Date() } });
    res.json({
      ok: true,
      active: true,
      steam64,
      serverType,
      subscriptionId: active.id,
      outfit: {
        id: active.outfitTemplate.id,
        name: active.outfitTemplate.name,
        source: active.source,
        expiresAt: active.expiresAt,
        imageUrl: active.outfitTemplate.imageUrl
      },
      items: active.items
    });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

apiRoutes.get('/player/:steam64/balance', async (req, res) => {
  const player = await prisma.player.findUnique({ where: { steam64: req.params.steam64 } });
  if (!player) return res.status(404).json({ ok: false, error: 'Player não encontrado.' });
  res.json({ ok: true, player: { steam64: player.steam64, nickname: player.nickname, coins: player.coins, cash: player.cash } });
});

apiRoutes.get('/shop/products', async (req, res) => {
  try {
    const serverType = String(req.query.serverType || 'all').toLowerCase();
    if (serverType === 'deathmatch') return deathmatchStoreBlocked(res, 'loja');
    const where = serverType === 'all'
      ? { status: 'ACTIVE', serverType: { not: 'deathmatch' } }
      : { status: 'ACTIVE', AND: [{ serverType: { not: 'deathmatch' } }, { OR: [{ serverType }, { serverType: 'all' }] }] };

    const products = await prisma.product.findMany({
      where,
      select: { id: true, name: true, description: true, category: true, serverType: true, classname: true, quantity: true, priceCoins: true, stock: true, deliveryType: true, dropBoxClassname: true, updatedAt: true, items: { orderBy: { sortOrder: 'asc' }, select: { label: true, classname: true, quantity: true, sortOrder: true } } },
      orderBy: [{ category: 'asc' }, { priceCoins: 'asc' }]
    });
    res.json({ ok: true, products });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

apiRoutes.post('/shop/buy', async (req, res) => {
  try {
    if (String(req.body.serverType || '').toLowerCase() === 'deathmatch') return deathmatchStoreBlocked(res, 'loja');
    const { steam64, productId, quantity, giftSteam64 } = req.body;
    const player = await prisma.player.findUnique({ where: { steam64: String(steam64) } });
    if (!player) return res.status(404).json({ ok: false, error: 'Player não encontrado.' });
    const result = await buyProduct({ playerId: player.id, productId, quantity: Number(quantity || 1), source: 'api', giftSteam64, checkoutToken: req.body.checkoutToken || req.body.idempotencyKey || null });
    res.json({ ok: true, purchaseId: result.purchase.id, deliveryId: result.delivery?.id,
      deliveryIds: result.deliveries?.map(d => d.id) || [], duplicate: Boolean(result.duplicate), balance: result.player.coins });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

/**
 * API estrita para o mod DayZ.
 * Vanilla usa serverType=vanilla.
 * BBP usa serverType=bbp.
 */
apiRoutes.get('/game/products', async (req, res) => {
  try {
    const serverType = normalizeServerType(req.query.serverType);
    if (serverType === 'deathmatch') return deathmatchStoreBlocked(res, 'loja');
    const products = await listGameProducts({ serverType });
    res.json({ ok: true, serverType, products });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

apiRoutes.post('/game/buy', async (req, res) => {
  try {
    const serverType = normalizeServerType(req.body.serverType);
    if (serverType === 'deathmatch') return deathmatchStoreBlocked(res, 'loja');
    const steam64 = String(req.body.steam64 || '').trim();
    const productId = String(req.body.productId || '').trim();

    const player = await prisma.player.findUnique({ where: { steam64 } });
    if (!player) return res.status(404).json({ ok: false, error: 'Player não encontrado no site. Ele precisa salvar o Steam64 primeiro.' });

    const result = await buyProduct({
      playerId: player.id,
      productId,
      quantity: Number(req.body.quantity || 1),
      expectedServerType: serverType,
      source: 'game',
      checkoutToken: req.body.checkoutToken || req.body.idempotencyKey || null
    });

    res.json({
      ok: true,
      serverType,
      purchaseId: result.purchase.id,
      deliveryId: result.delivery?.id,
      deliveryIds: result.deliveries?.map(d => d.id) || [],
      duplicate: Boolean(result.duplicate),
      delivery: result.delivery ? {
        id: result.delivery.id,
        classname: result.delivery.classname,
        quantity: result.delivery.quantity,
        productName: result.delivery.productName,
        deliveryType: result.delivery.deliveryType,
        meta: result.delivery.meta || null
      } : null,
      deliveries: result.deliveries || [],
      balance: result.player.coins
    });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

apiRoutes.get('/game/deliveries/pending', async (req, res) => {
  try {
    const steam64 = String(req.query.steam64 || '').trim();
    const serverType = normalizeServerType(req.query.serverType);
    if (serverType === 'deathmatch') return deathmatchStoreBlocked(res, 'loja');
    const deliveries = await prisma.deliveryQueue.findMany({
      where: {
        steam64,
        status: 'PENDING',
        OR: [{ serverType }, { serverType: 'all' }]
      },
      orderBy: { createdAt: 'asc' },
      take: 25
    });
    res.json({ ok: true, serverType, deliveries });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

apiRoutes.post('/game/deliveries/claim', async (req, res) => {
  try {
    const steam64 = String(req.body.steam64 || '').trim();
    const serverType = normalizeServerType(req.body.serverType);
    if (serverType === 'deathmatch') return deathmatchStoreBlocked(res, 'loja');
    const claimed = await prisma.$transaction(async (tx) => {
      const deliveries = await tx.deliveryQueue.findMany({
        where: {
          steam64,
          status: 'PENDING',
          OR: [{ serverType }, { serverType: 'all' }]
        },
        orderBy: { createdAt: 'asc' },
        take: 25
      });
      for (const delivery of deliveries) {
        await tx.deliveryQueue.update({ where: { id: delivery.id }, data: { status: 'PROCESSING', claimedAt: new Date(), error: null } });
      }
      return deliveries.map(d => ({ ...d, status: 'PROCESSING' }));
    });
    await logAudit({ actor: steam64, action: 'game.delivery.claimed', target: null, data: { count: claimed.length, serverType } });
    res.json({ ok: true, serverType, deliveries: claimed });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

apiRoutes.post('/game/deliveries/:id/confirm', async (req, res) => {
  try {
    const data = { ...req.query, ...req.body };
    const serverType = normalizeServerType(data.serverType);
    if (serverType === 'deathmatch') return deathmatchStoreBlocked(res, 'loja');
    const ok = resolveDeliveryOk(data);

    const current = await prisma.deliveryQueue.findUnique({ where: { id: req.params.id } });
    if (!current) return res.status(404).json({ ok: false, error: 'Entrega não encontrada.' });
    if (current.serverType !== serverType && current.serverType !== 'all') return res.status(403).json({ ok: false, error: 'Essa entrega pertence a outro servidor.' });

    const waitError = String(data.error || req.body.error || '').trim();
    if (!ok && waitError.startsWith('WAIT_INSURANCE')) {
      const delivery = await prisma.deliveryQueue.update({
        where: { id: req.params.id },
        data: { status: 'PENDING', claimedAt: null, error: waitError.slice(0, 900) }
      });

      await logAudit({
        actor: delivery.steam64,
        action: 'game.delivery.waiting_insurance',
        target: delivery.id,
        data: { serverType, productName: delivery.productName, classname: delivery.classname, error: waitError }
      });

      return res.json({ ok: true, waiting: true, serverType, delivery });
    }


    const delivery = await prisma.deliveryQueue.update({
      where: { id: req.params.id },
      data: ok
        ? { status: 'DELIVERED', deliveredAt: new Date(), error: null }
        : { status: 'FAILED', error: String(data.error || req.body.error || 'Falha informada pelo servidor DayZ').slice(0, 900) }
    });

    await logDelivery({ delivery, ok, error: data.error || req.body.error });
    await markVehicleDeliveryResult(delivery, ok, data.error || req.body.error);
    await logAudit({
      actor: delivery.steam64,
      action: ok ? 'game.delivery.delivered' : 'game.delivery.failed',
      target: delivery.id,
      data: { serverType, productName: delivery.productName, classname: delivery.classname, quantity: delivery.quantity, error: data.error || req.body.error || null }
    });

    res.json({ ok: true, serverType, delivery });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

// Rotas antigas mantidas para compatibilidade
apiRoutes.get('/deliveries/pending', async (req, res) => {
  const steam64 = String(req.query.steam64 || '');
  const serverType = String(req.query.serverType || 'all');
  if (serverType.toLowerCase() === 'deathmatch') return deathmatchStoreBlocked(res, 'loja');
  const deliveries = await prisma.deliveryQueue.findMany({
    where: {
      steam64,
      status: 'PENDING',
      ...(serverType === 'all'
        ? { serverType: { not: 'deathmatch' } }
        : { AND: [{ serverType: { not: 'deathmatch' } }, { OR: [{ serverType }, { serverType: 'all' }] }] })
    },
    orderBy: { createdAt: 'asc' },
    take: 25
  });
  res.json({ ok: true, deliveries });
});

apiRoutes.post('/deliveries/claim', async (req, res) => {
  try {
    const steam64 = String(req.body.steam64 || '');
    const serverType = String(req.body.serverType || 'all');
    if (serverType.toLowerCase() === 'deathmatch') return deathmatchStoreBlocked(res, 'loja');
    const claimed = await prisma.$transaction(async (tx) => {
      const deliveries = await tx.deliveryQueue.findMany({
        where: {
          steam64,
          status: 'PENDING',
          ...(serverType === 'all'
            ? { serverType: { not: 'deathmatch' } }
            : { AND: [{ serverType: { not: 'deathmatch' } }, { OR: [{ serverType }, { serverType: 'all' }] }] })
        },
        orderBy: { createdAt: 'asc' },
        take: 25
      });
      for (const delivery of deliveries) {
        await tx.deliveryQueue.update({ where: { id: delivery.id }, data: { status: 'PROCESSING', claimedAt: new Date(), error: null } });
      }
      return deliveries.map(d => ({ ...d, status: 'PROCESSING' }));
    });
    await logAudit({ actor: steam64, action: 'delivery.claimed', target: null, data: { count: claimed.length, serverType } });
    res.json({ ok: true, deliveries: claimed });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

apiRoutes.post('/deliveries/:id/confirm', async (req, res) => {
  try {
    const data = { ...req.query, ...req.body };
    const ok = resolveDeliveryOk(data);
    const delivery = await prisma.deliveryQueue.update({
      where: { id: req.params.id },
      data: ok
        ? { status: 'DELIVERED', deliveredAt: new Date(), error: null }
        : { status: 'FAILED', error: String(data.error || req.body.error || 'Falha informada pelo servidor DayZ').slice(0, 900) }
    });
    await logDelivery({ delivery, ok, error: data.error || req.body.error });
    await markVehicleDeliveryResult(delivery, ok, data.error || req.body.error);
    await logAudit({ actor: delivery.steam64, action: ok ? 'delivery.delivered' : 'delivery.failed', target: delivery.id, data: { productName: delivery.productName, classname: delivery.classname, quantity: delivery.quantity, error: data.error || req.body.error || null } });
    res.json({ ok: true, delivery });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});
