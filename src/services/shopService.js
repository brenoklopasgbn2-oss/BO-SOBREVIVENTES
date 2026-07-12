import { prisma } from '../db/prisma.js';
import { changePlayerCoins } from './playerService.js';
import { logPurchase, logCartPurchase } from './discordLogger.js';
import { logAudit } from './auditService.js';
import { describeProductItems } from '../utils/productItems.js';
import { getGlobalPromo, applyPromotionToProduct } from './promotionService.js';
import { validateCouponCode, registerCouponUse, findActiveStreamerCode, recordStreamerSupportSale } from './supportService.js';

const GAME_SERVER_TYPES = ['vanilla', 'bbp'];

function normalizeGiftSteam64(value) {
  const steam64 = String(value || '').trim();
  if (!steam64) return null;
  if (!/^7656119\d{10}$/.test(steam64)) {
    throw new Error('Steam64 do amigo inválido. Ele precisa começar com 7656119 e ter 17 números.');
  }
  return steam64;
}

function buildDeliveryMetaForProduct(product) {
  const meta = {
    dropBoxOverflowBehavior: 'DROP_OUTSIDE',
    dropOutsideIfCannotFit: true,
    oversizedItemsDropOutside: true
  };
  if (product?.dropBoxClassname) meta.dropBoxClassname = product.dropBoxClassname;
  return meta;
}

export async function listActiveProducts({ category, serverType } = {}) {
  const normalizedServerType = GAME_SERVER_TYPES.includes(String(serverType || '').toLowerCase())
    ? String(serverType).toLowerCase()
    : 'vanilla';

  const [products, globalPromo] = await Promise.all([
    prisma.product.findMany({
      where: {
        status: 'ACTIVE',
        serverType: normalizedServerType,
        ...(category ? { category } : {})
      },
      orderBy: [{ featured: 'desc' }, { category: 'asc' }, { priceCoins: 'asc' }, { name: 'asc' }],
      include: { items: { orderBy: { sortOrder: 'asc' } } }
    }),
    getGlobalPromo(prisma)
  ]);

  return products
    .map(product => applyPromotionToProduct(product, globalPromo))
    .sort((a, b) => Number(Boolean(b.promo?.active)) - Number(Boolean(a.promo?.active)) || Number(Boolean(b.featured)) - Number(Boolean(a.featured)) || a.displayPriceCoins - b.displayPriceCoins || a.name.localeCompare(b.name));
}

export async function listGameProducts({ serverType }) {
  if (!GAME_SERVER_TYPES.includes(serverType)) {
    throw new Error('Servidor inválido. Use vanilla ou bbp.');
  }

  const [products, globalPromo] = await Promise.all([
    prisma.product.findMany({
      where: {
        status: 'ACTIVE',
        serverType
      },
      orderBy: [{ featured: 'desc' }, { category: 'asc' }, { priceCoins: 'asc' }, { name: 'asc' }],
      select: {
        id: true,
        name: true,
        description: true,
        category: true,
        serverType: true,
        classname: true,
        quantity: true,
        priceCoins: true,
        stock: true,
        deliveryType: true,
        dropBoxClassname: true,
        featured: true,
        highlightColor: true,
        promoActive: true,
        promoPercent: true,
        promoLabel: true,
        promoColor: true,
        updatedAt: true,
        items: {
          orderBy: { sortOrder: 'asc' },
          select: { label: true, classname: true, quantity: true, sortOrder: true }
        }
      }
    }),
    getGlobalPromo(prisma)
  ]);

  return products.map(product => {
    const withPromo = applyPromotionToProduct(product, globalPromo);
    return {
      ...withPromo,
      priceCoins: withPromo.displayPriceCoins,
      originalPriceCoins: withPromo.basePriceCoins
    };
  });
}

export async function buyProduct({ playerId, productId, quantity = 1, expectedServerType = null, source = 'site', giftSteam64 = null, couponCode = null, streamerCode = null }) {
  const qty = Math.max(1, Math.min(Number(quantity || 1), 10));
  const normalizedGiftSteam64 = normalizeGiftSteam64(giftSteam64);

  const result = await prisma.$transaction(async (tx) => {
    const [player, product] = await Promise.all([
      tx.player.findUnique({ where: { id: playerId } }),
      tx.product.findUnique({
        where: { id: productId },
        include: { items: { orderBy: { sortOrder: 'asc' } } }
      })
    ]);
    if (!player) throw new Error('Player não encontrado.');
    if (!product || product.status !== 'ACTIVE') throw new Error('Produto não encontrado ou inativo.');

    if (expectedServerType) {
      if (!GAME_SERVER_TYPES.includes(expectedServerType)) {
        throw new Error('Servidor inválido. Use vanilla ou bbp.');
      }
      if (product.serverType !== expectedServerType) {
        throw new Error(`Esse item pertence ao servidor ${product.serverType}, não ao ${expectedServerType}.`);
      }
    }

    if (product.stock !== null && product.stock < qty) throw new Error('Estoque insuficiente.');

    const globalPromo = await getGlobalPromo(tx);
    const productWithPromo = applyPromotionToProduct(product, globalPromo);
    const baseTotalCoins = productWithPromo.displayPriceCoins * qty;
    const couponResult = await validateCouponCode({ code: couponCode, totalCoins: baseTotalCoins, playerId: player.id, steam64: player.steam64, tx });
    const discountCoins = couponResult?.discountCoins || 0;
    const totalCoins = Math.max(0, baseTotalCoins - discountCoins);
    const supportStreamer = await findActiveStreamerCode(streamerCode, tx);
    const updatedPlayer = await changePlayerCoins({
      playerId,
      amount: -totalCoins,
      reason: `Doação ${source}: ${product.name}`,
      refType: 'product',
      refId: product.id,
      tx
    });

    const targetSteam64 = normalizedGiftSteam64 || updatedPlayer.steam64;
    const isGift = Boolean(normalizedGiftSteam64 && normalizedGiftSteam64 !== updatedPlayer.steam64);

    if (product.stock !== null) {
      await tx.product.update({ where: { id: product.id }, data: { stock: product.stock - qty } });
    }

    const purchase = await tx.purchase.create({
      data: { playerId, productId: product.id, quantity: qty, totalCoins }
    });

    if (couponResult?.coupon) {
      await registerCouponUse({ tx, couponResult, player: updatedPlayer, source: 'PRODUCT', purchaseId: purchase.id, totalCoins, discountCoins });
    }

    const supportSale = supportStreamer
      ? await recordStreamerSupportSale({ tx, streamerCode: supportStreamer, player: updatedPlayer, purchaseId: purchase.id, source: 'PRODUCT', totalCoins, couponCode: couponResult?.code || null })
      : null;

    const productItems = describeProductItems(product);
    const deliveries = [];

    for (const [index, item] of productItems.entries()) {
      const delivery = await tx.deliveryQueue.create({
        data: {
          purchaseId: purchase.id,
          playerId,
          steam64: targetSteam64,
          serverType: product.serverType,
          productName: `${isGift ? '[Presente] ' : ''}${productItems.length > 1 ? `${product.name}: ${item.label || item.classname}` : product.name}`,
          classname: item.classname,
          quantity: item.quantity * qty,
          deliveryType: product.deliveryType,
          meta: buildDeliveryMetaForProduct(product)
        }
      });
      deliveries.push(delivery);
    }

    return { player: updatedPlayer, product: productWithPromo, purchase, delivery: deliveries[0], deliveries, source, gift: isGift ? { steam64: targetSteam64 } : null, coupon: couponResult ? { code: couponResult.code, percent: couponResult.percent, discountCoins } : null, support: supportSale ? { code: supportStreamer.code, streamerName: supportStreamer.streamerName, commissionCoins: supportSale.commissionCoins } : null };
  });

  await logPurchase(result);
  await logAudit({
    actor: result.player.steam64,
    action: source === 'game' ? 'game.purchase.created' : 'purchase.created',
    target: result.purchase.id,
    data: {
      source,
      productId: result.product.id,
      productName: result.product.name,
      quantity: result.purchase.quantity,
      totalCoins: result.purchase.totalCoins,
      coupon: result.coupon || null,
      support: result.support || null,
      serverType: result.product.serverType,
      giftSteam64: result.gift?.steam64 || null,
      deliveries: result.deliveries?.map(d => ({ steam64: d.steam64, classname: d.classname, quantity: d.quantity })) || []
    }
  });
  return result;
}


function parseCartItems(items = []) {
  if (!Array.isArray(items)) throw new Error('Carrinho inválido.');
  const compact = new Map();
  for (const item of items) {
    const productId = String(item?.productId || item?.id || '').trim();
    if (!productId) continue;
    const qtyRaw = Number(item?.quantity || 1);
    const qty = Number.isFinite(qtyRaw) ? Math.max(1, Math.min(Math.floor(qtyRaw), 10)) : 1;
    compact.set(productId, Math.min(10, (compact.get(productId) || 0) + qty));
  }
  const parsed = Array.from(compact.entries()).map(([productId, quantity]) => ({ productId, quantity }));
  if (!parsed.length) throw new Error('Seu carrinho está vazio.');
  if (parsed.length > 25) throw new Error('Carrinho grande demais. Finalize em partes.');
  return parsed;
}

export async function buyCart({ playerId, items = [], couponCode = null, streamerCode = null, source = 'cart' }) {
  const cartItems = parseCartItems(items);

  const result = await prisma.$transaction(async (tx) => {
    const player = await tx.player.findUnique({ where: { id: playerId } });
    if (!player) throw new Error('Player não encontrado.');

    const ids = cartItems.map(item => item.productId);
    const products = await tx.product.findMany({
      where: { id: { in: ids }, status: 'ACTIVE' },
      include: { items: { orderBy: { sortOrder: 'asc' } } }
    });
    const productById = new Map(products.map(product => [product.id, product]));
    if (products.length !== ids.length) throw new Error('Um ou mais produtos do carrinho não existem ou estão inativos.');

    const globalPromo = await getGlobalPromo(tx);
    const prepared = cartItems.map((item) => {
      const product = productById.get(item.productId);
      if (!GAME_SERVER_TYPES.includes(product.serverType)) throw new Error(`Produto ${product.name} pertence a servidor inválido.`);
      if (product.stock !== null && product.stock < item.quantity) throw new Error(`Estoque insuficiente para ${product.name}.`);
      const productWithPromo = applyPromotionToProduct(product, globalPromo);
      const lineTotal = productWithPromo.displayPriceCoins * item.quantity;
      return { product, productWithPromo, quantity: item.quantity, lineTotal };
    });

    const baseTotalCoins = prepared.reduce((sum, item) => sum + item.lineTotal, 0);
    const couponResult = await validateCouponCode({ code: couponCode, totalCoins: baseTotalCoins, playerId: player.id, steam64: player.steam64, tx });
    const discountCoins = couponResult?.discountCoins || 0;
    const totalCoins = Math.max(0, baseTotalCoins - discountCoins);
    const supportStreamer = await findActiveStreamerCode(streamerCode, tx);

    const updatedPlayer = await changePlayerCoins({
      playerId,
      amount: -totalCoins,
      reason: `Carrinho ${source}: ${prepared.length} produto(s)`,
      refType: 'cart',
      refId: null,
      tx
    });

    if (couponResult?.coupon) {
      await registerCouponUse({ tx, couponResult, player: updatedPlayer, source: 'CART', purchaseId: null, totalCoins, discountCoins });
    }

    const purchases = [];
    const deliveries = [];

    for (const entry of prepared) {
      if (entry.product.stock !== null) {
        await tx.product.update({ where: { id: entry.product.id }, data: { stock: { decrement: entry.quantity } } });
      }
      const ratio = baseTotalCoins > 0 ? entry.lineTotal / baseTotalCoins : 0;
      const lineDiscount = Math.floor(discountCoins * ratio);
      const paidLine = Math.max(0, entry.lineTotal - lineDiscount);
      const purchase = await tx.purchase.create({
        data: { playerId, productId: entry.product.id, quantity: entry.quantity, totalCoins: paidLine }
      });
      purchases.push({ ...purchase, productName: entry.product.name, product: entry.productWithPromo });

      const productItems = describeProductItems(entry.product);
      for (const item of productItems) {
        const delivery = await tx.deliveryQueue.create({
          data: {
            purchaseId: purchase.id,
            playerId,
            steam64: updatedPlayer.steam64,
            serverType: entry.product.serverType,
            productName: productItems.length > 1 ? `${entry.product.name}: ${item.label || item.classname}` : entry.product.name,
            classname: item.classname,
            quantity: item.quantity * entry.quantity,
            deliveryType: entry.product.deliveryType,
            meta: buildDeliveryMetaForProduct(entry.product)
          }
        });
        deliveries.push(delivery);
      }
    }

    const supportSale = supportStreamer
      ? await recordStreamerSupportSale({ tx, streamerCode: supportStreamer, player: updatedPlayer, purchaseId: null, source: 'CART', totalCoins, couponCode: couponResult?.code || null })
      : null;

    return {
      player: updatedPlayer,
      purchases,
      deliveries,
      totalCoins,
      coupon: couponResult ? { code: couponResult.code, percent: couponResult.percent, discountCoins } : null,
      support: supportSale ? { code: supportStreamer.code, streamerName: supportStreamer.streamerName, commissionCoins: supportSale.commissionCoins } : null
    };
  });

  await logCartPurchase(result);
  await logAudit({
    actor: result.player.steam64,
    action: 'cart.purchase.created',
    target: null,
    data: {
      totalCoins: result.totalCoins,
      items: result.purchases.map(p => ({ purchaseId: p.id, productName: p.productName, quantity: p.quantity, totalCoins: p.totalCoins })),
      deliveryIds: result.deliveries.map(d => d.id),
      coupon: result.coupon || null,
      support: result.support || null
    }
  });
  return result;
}
