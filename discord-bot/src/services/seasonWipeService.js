import { prisma } from '../db/prisma.js';

export const SEASON_WIPE_BONUS_COINS = 50000;
export const SEASON_WIPE_KEY = 'raidz.seasonWipe.2026-07-31.v160';
export const SEASON_WIPE_REPAIR_KEY = 'raidz.seasonWipe.2026-07-31.v161.fullHistoryAutoRepair';
export const SEASON_WIPE_FIXED_BALANCE_KEY = 'raidz.seasonWipe.2026-07-31.v163.fixedOldPlayerBalance50k';
export const SEASON_WIPE_LAST_COMPLETED_KEY = 'raidz.seasonWipe.lastCompleted';
const SEED_DELETED_PRODUCTS_KEY = 'seed.deletedProducts.v66';

// Apenas gastos reais da loja. Transferências entre players, ajustes de ADM,
// recompensas, Pix e créditos não entram para não duplicar moeda.
export const REFUNDABLE_STORE_REF_TYPES = [
  'product',
  'cart',
  'outfit',
  'managed_outfit_member',
  'clan_outfit_month',
  'custom_outfit_order',
  'vehicle_direct',
  'vehicle',
  'vehicle_respawn',
  'vehicle_renew',
  'vehicle_insurance',
  'vehicle_insurance_upgrade'
];

function normalized(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function cleanSlug(value) {
  return String(value || '').trim().toLowerCase();
}

function productIdentityValues(product) {
  return [
    product?.name,
    product?.slug,
    product?.category,
    product?.classname
  ].map(normalized).filter(Boolean);
}

function productValues(product) {
  return [
    ...productIdentityValues(product),
    ...(Array.isArray(product?.items) ? product.items.flatMap(item => [item?.label, item?.classname]) : [])
  ].map(normalized).filter(Boolean);
}

function productClassnames(product) {
  return [
    product?.classname,
    ...(Array.isArray(product?.items) ? product.items.map(item => item?.classname) : [])
  ].map(normalized).filter(Boolean);
}

function isVanillaStorageClassname(value) {
  const key = normalized(value);
  if (!key) return false;

  const exact = new Set([
    'woodencrate',
    'seachest',
    'smallprotectorcase',
    'ammobox',
    'firstaidkit',
    'largtent', // compatibilidade com cadastro antigo digitado incorretamente
    'largetent',
    'mediumtent',
    'cartent',
    'partytent',
    'shelterfabric',
    'shelterleather',
    'shelterstick'
  ]);
  if (exact.has(key)) return true;

  return key.startsWith('barrel_')
    || key.startsWith('drybag_')
    || key.startsWith('waterproofbag_')
    || key.startsWith('smallprotectorcase_');
}

export function isSleepingBagStoreProduct(product) {
  const values = productValues(product);
  return values.some(value =>
    value.includes('saco de dormir')
    || value.includes('saco-dormir')
    || value.includes('saco_dormir')
    || value.includes('sleeping bag')
    || value.includes('sleeping-bag')
    || value.includes('sleeping_bag')
    || value.includes('sleepingbag')
    || value.includes('bed roll')
    || value.includes('bedroll')
    || value.includes('respawn bag')
    || value.includes('respawn_bag')
  );
}

export function isMmgStorageProduct(product) {
  const values = productValues(product);
  const hasMmgPrefix = values.some(value =>
    value.startsWith('mmg_')
    || value.startsWith('mmg-')
    || value.startsWith('mmf_')
    || value.startsWith('mmf-')
  );
  if (!hasMmgPrefix) return false;

  // Não remove roupas/armas MMG por engano: exige sinal claro de storage.
  return values.some(value =>
    value.includes('locker')
    || value.includes('loker')
    || value.includes('gun rack')
    || value.includes('gun_rack')
    || value.includes('military case')
    || value.includes('military_case')
    || value.includes('equipment locker')
    || value.includes('equipment_locker')
    || value.includes('fridge')
    || value.includes('gear stand')
    || value.includes('gear_stand')
    || value.includes('storage')
    || value.includes('cabinet')
    || value.includes('safe')
  );
}

export function isNonVanillaStorageProduct(product) {
  if (isMmgStorageProduct(product)) return true;

  const identityValues = productIdentityValues(product);
  const category = normalized(product?.category);
  const looksLikeStandaloneStorage = category.includes('armazen')
    || category === 'storage'
    || identityValues.some(value =>
      value.includes('armario')
      || value.includes('locker')
      || value.includes('gun rack')
      || value.includes('gunrack')
      || value.includes('gear stand')
      || value.includes('gearstand')
      || value.includes('geladeira')
      || value.includes('fridge')
      || value.includes('storage')
      || value.includes('military case')
      || value.includes('weapon rack')
      || value.includes('cofre')
    );

  // Não transforma um kit inteiro em "storage" só porque ele contém barris,
  // tendas ou Sea Chests. A limpeza vale para produtos de armazenamento
  // independentes; kits continuam permitidos quando usam storages vanilla.
  if (!looksLikeStandaloneStorage) return false;
  const classnames = productClassnames(product);
  return !classnames.length || !classnames.every(isVanillaStorageClassname);
}

export function isDisallowedStoreProduct(product) {
  return isSleepingBagStoreProduct(product) || isNonVanillaStorageProduct(product);
}

async function listCatalogProducts(tx = prisma) {
  return tx.product.findMany({
    include: { items: { select: { classname: true, label: true } } }
  });
}

export async function findMmgStorageProductIds(tx = prisma) {
  const candidates = await listCatalogProducts(tx);
  return candidates.filter(isMmgStorageProduct).map(product => product.id);
}

export async function findDisallowedStoreProducts(tx = prisma) {
  const candidates = await listCatalogProducts(tx);
  return candidates.filter(isDisallowedStoreProduct);
}

export async function calculateRefunds(tx, playerIds = null, since = null) {
  const playerFilter = Array.isArray(playerIds) ? { playerId: { in: playerIds } } : {};
  const createdAtFilter = since instanceof Date && !Number.isNaN(since.getTime()) ? { createdAt: { gt: since } } : {};
  const [ledgerRows, purchaseRows] = await Promise.all([
    tx.coinLedger.groupBy({
      by: ['playerId', 'refType'],
      where: {
        ...playerFilter,
        ...createdAtFilter,
        type: 'DEBIT',
        amount: { lt: 0 },
        refType: { in: REFUNDABLE_STORE_REF_TYPES }
      },
      _sum: { amount: true },
      _count: { _all: true }
    }),
    tx.purchase.groupBy({
      by: ['playerId'],
      where: {
        ...(Array.isArray(playerIds) ? { playerId: { in: playerIds } } : {}),
        ...createdAtFilter,
        status: 'PAID'
      },
      _sum: { totalCoins: true },
      _count: { _all: true }
    })
  ]);

  const refunds = new Map();
  const ensure = (playerId) => {
    if (!refunds.has(playerId)) {
      refunds.set(playerId, {
        productLedgerCoins: 0,
        purchaseFallbackCoins: 0,
        otherCoins: 0,
        transactions: 0,
        coins: 0
      });
    }
    return refunds.get(playerId);
  };

  for (const row of ledgerRows) {
    const entry = ensure(row.playerId);
    const coins = Math.abs(Number(row._sum.amount || 0));
    if (row.refType === 'product' || row.refType === 'cart') entry.productLedgerCoins += coins;
    else entry.otherCoins += coins;
    entry.transactions += Number(row._count?._all || 0);
  }

  for (const row of purchaseRows) {
    const entry = ensure(row.playerId);
    entry.purchaseFallbackCoins = Math.max(0, Number(row._sum.totalCoins || 0));
    if (!entry.productLedgerCoins) entry.transactions += Number(row._count?._all || 0);
  }

  let totalCoins = 0;
  let totalTransactions = 0;
  for (const entry of refunds.values()) {
    // Usa o maior valor entre extrato e compras para cobrir compras antigas sem
    // CoinLedger, sem dobrar compras modernas que aparecem nas duas tabelas.
    entry.coins = entry.otherCoins + Math.max(entry.productLedgerCoins, entry.purchaseFallbackCoins);
    totalCoins += entry.coins;
    totalTransactions += entry.transactions;
  }
  return { refunds, totalCoins, totalTransactions };
}

function parseNumberFromReason(reason, labelPattern) {
  const match = String(reason || '').match(labelPattern);
  if (!match) return null;
  const value = Number(String(match[1] || '').replace(/\D/g, ''));
  return Number.isFinite(value) ? value : null;
}

async function calculatePriorWipeCredits(tx, playerIds) {
  const rows = await tx.coinLedger.findMany({
    where: {
      playerId: { in: playerIds },
      type: 'CREDIT',
      refType: 'season_wipe_refund',
      amount: { gt: 0 }
    },
    select: { playerId: true, amount: true, reason: true, refId: true }
  });

  const credits = new Map();
  const ensure = (playerId) => {
    if (!credits.has(playerId)) credits.set(playerId, { refundCoins: 0, bonusCoins: 0 });
    return credits.get(playerId);
  };

  for (const row of rows) {
    const entry = ensure(row.playerId);
    const amount = Math.max(0, Number(row.amount || 0));
    const refundFromReason = parseNumberFromReason(row.reason, /reembolso\s+([\d.,]+)/i);
    const bonusFromReason = parseNumberFromReason(row.reason, /b[oô]nus\s+([\d.,]+)/i);

    if (refundFromReason !== null || bonusFromReason !== null) {
      entry.refundCoins += Math.max(0, Number(refundFromReason || 0));
      entry.bonusCoins += Math.max(0, Number(bonusFromReason || 0));
      continue;
    }

    // Compatibilidade com o lançamento V160, cujo lançamento agrupava
    // reembolso + 50 mil no mesmo registro.
    if (row.refId === SEASON_WIPE_KEY) {
      const bonus = Math.min(SEASON_WIPE_BONUS_COINS, amount);
      entry.bonusCoins += bonus;
      entry.refundCoins += Math.max(0, amount - bonus);
      continue;
    }

    // Fallback conservador para qualquer lançamento antigo do mesmo tipo.
    const bonus = Math.min(SEASON_WIPE_BONUS_COINS, amount);
    entry.bonusCoins += bonus;
    entry.refundCoins += Math.max(0, amount - bonus);
  }

  return credits;
}

async function restoreStock(tx) {
  const purchasedStockRows = await tx.purchase.groupBy({
    by: ['productId'],
    where: { status: 'PAID' },
    _sum: { quantity: true }
  });
  let stockUnitsRestored = 0;
  for (const row of purchasedStockRows) {
    const quantity = Math.max(0, Number(row._sum.quantity || 0));
    if (!quantity) continue;
    const restored = await tx.product.updateMany({
      where: { id: row.productId, stock: { not: null } },
      data: { stock: { increment: quantity } }
    });
    if (restored.count) stockUnitsRestored += quantity;
  }
  return stockUnitsRestored;
}

function isSleepingCategoryName(value) {
  const key = normalized(value);
  return (key.includes('saco') && key.includes('dormir'))
    || key.includes('sleeping bag')
    || key.includes('sleepingbag');
}

async function removeSleepingBagCategory(tx) {
  const setting = await tx.appSetting.findUnique({ where: { key: 'store_categories_v1' } });
  const categories = Array.isArray(setting?.value?.categories) ? setting.value.categories : [];
  const filtered = categories.filter(category => !isSleepingCategoryName(category?.name));
  if (filtered.length === categories.length) return 0;

  await tx.appSetting.upsert({
    where: { key: 'store_categories_v1' },
    update: { value: { ...(setting?.value || {}), categories: filtered } },
    create: { key: 'store_categories_v1', value: { categories: filtered } }
  });
  return categories.length - filtered.length;
}

async function removeDisallowedProducts(tx) {
  const products = await findDisallowedStoreProducts(tx);
  if (!products.length) return { found: 0, deleted: 0, slugs: [] };

  const ids = products.map(product => product.id);
  const slugs = products.map(product => cleanSlug(product.slug)).filter(Boolean);
  const deleted = await tx.product.deleteMany({ where: { id: { in: ids } } });

  const tombstoneSetting = await tx.appSetting.findUnique({ where: { key: SEED_DELETED_PRODUCTS_KEY } });
  const oldSlugs = Array.isArray(tombstoneSetting?.value?.slugs) ? tombstoneSetting.value.slugs : [];
  const tombstones = new Set(oldSlugs.map(cleanSlug).filter(Boolean));
  for (const slug of slugs) tombstones.add(slug);
  const value = { slugs: Array.from(tombstones).sort() };
  await tx.appSetting.upsert({
    where: { key: SEED_DELETED_PRODUCTS_KEY },
    update: { value },
    create: { key: SEED_DELETED_PRODUCTS_KEY, value }
  });

  return { found: products.length, deleted: deleted.count, slugs };
}

async function clearStoreProgress(tx) {
  const deleted = {};
  deleted.couponUses = (await tx.couponUse.deleteMany({})).count;
  await tx.couponCode.updateMany({ data: { usedCount: 0 } });

  deleted.outfitSubscriptions = (await tx.playerOutfitSubscription.deleteMany({})).count;
  deleted.outfitFlagRequests = (await tx.outfitFlagRequest.deleteMany({})).count;
  deleted.customOutfitOrders = (await tx.customOutfitOrder.deleteMany({})).count;
  deleted.starterKitClaims = (await tx.starterKitClaim.deleteMany({})).count;

  deleted.vehicleRespawnLogs = (await tx.vehicleRespawnLog.deleteMany({})).count;
  deleted.playerVehicles = (await tx.playerVehicle.deleteMany({})).count;

  deleted.stockUnitsRestored = await restoreStock(tx);
  deleted.deliveries = (await tx.deliveryQueue.deleteMany({})).count;
  deleted.purchases = (await tx.purchase.deleteMany({})).count;
  deleted.checkoutAttempts = (await tx.checkoutAttempt.deleteMany({})).count;

  const removedProducts = await removeDisallowedProducts(tx);
  deleted.disallowedStoreProducts = removedProducts.deleted;
  deleted.sleepingBagCategories = await removeSleepingBagCategory(tx);
  deleted.removedProductSlugs = removedProducts.slugs;
  return deleted;
}

function wipeExecutedAt(value) {
  const raw = value?.executedAt || value?.startedAt;
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function getSeasonWipePreview() {
  const [v160, v161, playerCount, purchases, vehicles, outfits, starterClaims, deliveries] = await Promise.all([
    prisma.appSetting.findUnique({ where: { key: SEASON_WIPE_KEY } }),
    prisma.appSetting.findUnique({ where: { key: SEASON_WIPE_REPAIR_KEY } }),
    prisma.player.count(),
    prisma.purchase.count(),
    prisma.playerVehicle.count(),
    prisma.playerOutfitSubscription.count(),
    prisma.starterKitClaim.count(),
    prisma.deliveryQueue.count()
  ]);

  const refundCalculation = await calculateRefunds(prisma);
  return {
    alreadyExecuted: Boolean(v160 || v161),
    executedData: v161?.value || v160?.value || null,
    playerCount,
    refundableCoins: refundCalculation.totalCoins,
    refundableTransactions: refundCalculation.totalTransactions,
    bonusCoins: playerCount * SEASON_WIPE_BONUS_COINS,
    purchases,
    vehicles,
    outfits,
    starterClaims,
    deliveries
  };
}

export async function executeSeasonStoreWipe({ actor = 'admin' } = {}) {
  const repaired = await prisma.appSetting.findUnique({ where: { key: SEASON_WIPE_REPAIR_KEY } });
  if (repaired) {
    throw new Error('O wipe automático V161 já foi concluído. A trava impediu um novo crédito duplicado.');
  }

  const executedAt = new Date();
  return prisma.$transaction(async (tx) => {
    const previous = await tx.appSetting.findUnique({ where: { key: SEASON_WIPE_KEY } });
    if (previous) throw new Error('Este wipe de temporada já foi executado. A trava impediu reembolso e bônus duplicados.');

    await tx.appSetting.create({
      data: { key: SEASON_WIPE_KEY, value: { status: 'RUNNING', startedAt: executedAt.toISOString(), actor } }
    });

    const players = await tx.player.findMany({
      select: { id: true, steam64: true },
      orderBy: { createdAt: 'asc' }
    });
    const ids = players.map(player => player.id);
    const refundCalculation = await calculateRefunds(tx, ids);

    let totalRefundedCoins = 0;
    let totalBonusCoins = 0;
    let refundedPlayers = 0;
    for (const player of players) {
      const refund = refundCalculation.refunds.get(player.id)?.coins || 0;
      const credit = refund + SEASON_WIPE_BONUS_COINS;
      const updated = await tx.player.update({
        where: { id: player.id },
        data: { coins: { increment: credit } },
        select: { coins: true }
      });
      await tx.coinLedger.create({
        data: {
          playerId: player.id,
          type: 'CREDIT',
          amount: credit,
          balanceAfter: updated.coins,
          reason: `Wipe de temporada: reembolso ${refund} RZ + bônus ${SEASON_WIPE_BONUS_COINS} RZ`,
          refType: 'season_wipe_refund',
          refId: SEASON_WIPE_KEY,
          idempotencyKey: `${SEASON_WIPE_KEY}:${player.id}`
        }
      });
      totalRefundedCoins += refund;
      totalBonusCoins += SEASON_WIPE_BONUS_COINS;
      if (refund > 0) refundedPlayers += 1;
    }

    const deleted = await clearStoreProgress(tx);
    const summary = {
      status: 'COMPLETED',
      executedAt: executedAt.toISOString(),
      actor,
      playersRewarded: players.length,
      refundedPlayers,
      totalRefundedCoins,
      totalBonusCoins,
      bonusPerExistingPlayer: SEASON_WIPE_BONUS_COINS,
      deleted,
      preserved: ['players', 'payments', 'coin ledger', 'killfeed', 'ranking', 'clans', 'territory kills']
    };

    await tx.appSetting.update({ where: { key: SEASON_WIPE_KEY }, data: { value: summary } });
    await tx.appSetting.upsert({
      where: { key: SEASON_WIPE_LAST_COMPLETED_KEY },
      update: { value: { key: SEASON_WIPE_KEY, executedAt: summary.executedAt } },
      create: { key: SEASON_WIPE_LAST_COMPLETED_KEY, value: { key: SEASON_WIPE_KEY, executedAt: summary.executedAt } }
    });
    await tx.auditLog.create({ data: { actor, action: 'wipe.season_store.v160', target: SEASON_WIPE_KEY, data: summary } });
    return { ...summary, playerSteam64s: players.map(player => player.steam64) };
  }, { isolationLevel: 'Serializable', maxWait: 15000, timeout: 180000 });
}

// V161: correção automática e idempotente. Recalcula TODAS as compras desde o
// início do histórico e deposita apenas o valor que ainda estiver faltando.
export async function executeAutomaticSeasonWipeRepairV161({ actor = 'system:auto-v161' } = {}) {
  const existing = await prisma.appSetting.findUnique({ where: { key: SEASON_WIPE_REPAIR_KEY } });
  if (existing) return { ...(existing.value || {}), skipped: true };

  const executedAt = new Date();
  return prisma.$transaction(async (tx) => {
    const alreadyDone = await tx.appSetting.findUnique({ where: { key: SEASON_WIPE_REPAIR_KEY } });
    if (alreadyDone) return { ...(alreadyDone.value || {}), skipped: true };

    await tx.appSetting.create({
      data: { key: SEASON_WIPE_REPAIR_KEY, value: { status: 'RUNNING', startedAt: executedAt.toISOString(), actor } }
    });

    const [v160, lastCompleted, players] = await Promise.all([
      tx.appSetting.findUnique({ where: { key: SEASON_WIPE_KEY } }),
      tx.appSetting.findUnique({ where: { key: SEASON_WIPE_LAST_COMPLETED_KEY } }),
      tx.player.findMany({
        select: { id: true, steam64: true, nickname: true, coins: true, createdAt: true },
        orderBy: { createdAt: 'asc' }
      })
    ]);

    const playerIds = players.map(player => player.id);
    const [refundCalculation, previousCredits] = await Promise.all([
      calculateRefunds(tx, playerIds),
      calculatePriorWipeCredits(tx, playerIds)
    ]);

    // Quando o V160 já foi executado, a data dele define quem já estava no
    // servidor e tem direito aos 50 mil. Contas criadas depois recebem só o
    // Kit Inicial normal de 5 mil.
    const bonusCutoff = wipeExecutedAt(v160?.value)
      || wipeExecutedAt(lastCompleted?.value)
      || executedAt;

    let totalRefundedNow = 0;
    let totalBonusNow = 0;
    let totalLifetimeSpend = 0;
    let playersCredited = 0;
    let playersWithRefund = 0;
    let bonusEligiblePlayers = 0;

    for (const player of players) {
      const lifetimeRefund = Math.max(0, Number(refundCalculation.refunds.get(player.id)?.coins || 0));
      const paid = previousCredits.get(player.id) || { refundCoins: 0, bonusCoins: 0 };
      const missingRefund = Math.max(0, lifetimeRefund - Math.max(0, Number(paid.refundCoins || 0)));
      const bonusEligible = player.createdAt <= bonusCutoff;
      const missingBonus = bonusEligible
        ? Math.max(0, SEASON_WIPE_BONUS_COINS - Math.max(0, Number(paid.bonusCoins || 0)))
        : 0;
      const credit = missingRefund + missingBonus;

      totalLifetimeSpend += lifetimeRefund;
      if (bonusEligible) bonusEligiblePlayers += 1;
      if (missingRefund > 0) playersWithRefund += 1;
      if (!credit) continue;

      const updated = await tx.player.update({
        where: { id: player.id },
        data: { coins: { increment: credit } },
        select: { coins: true }
      });
      await tx.coinLedger.create({
        data: {
          playerId: player.id,
          type: 'CREDIT',
          amount: credit,
          balanceAfter: updated.coins,
          reason: `Correção automática V161: reembolso faltante ${missingRefund} RZ + bônus faltante ${missingBonus} RZ`,
          refType: 'season_wipe_refund',
          refId: SEASON_WIPE_REPAIR_KEY,
          idempotencyKey: `${SEASON_WIPE_REPAIR_KEY}:${player.id}`
        }
      });
      totalRefundedNow += missingRefund;
      totalBonusNow += missingBonus;
      playersCredited += 1;
    }

    const deleted = await clearStoreProgress(tx);
    const summary = {
      status: 'COMPLETED',
      executedAt: executedAt.toISOString(),
      actor,
      bonusCutoff: bonusCutoff.toISOString(),
      playersAtRepair: players.length,
      bonusEligiblePlayers,
      playersCredited,
      playersWithRefund,
      totalLifetimeSpendFound: totalLifetimeSpend,
      totalRefundedNow,
      totalBonusNow,
      bonusPerEligiblePlayer: SEASON_WIPE_BONUS_COINS,
      deleted,
      preserved: [
        'Player/accounts/profiles/current balances',
        'Payment and PaymentCreditGuard',
        'CoinLedger/audit history',
        'KillEvent/killfeed and territory kill data',
        'Clan, ranking, seasons, awards and badges',
        'Streamer payment/support history',
        'Vanilla storage products only'
      ]
    };

    await tx.appSetting.update({ where: { key: SEASON_WIPE_REPAIR_KEY }, data: { value: summary } });
    if (!v160) {
      await tx.appSetting.create({
        data: {
          key: SEASON_WIPE_KEY,
          value: { status: 'SUPERSEDED_BY_V161', executedAt: summary.executedAt, actor, repairKey: SEASON_WIPE_REPAIR_KEY }
        }
      });
    }
    await tx.appSetting.upsert({
      where: { key: SEASON_WIPE_LAST_COMPLETED_KEY },
      update: { value: { key: SEASON_WIPE_REPAIR_KEY, executedAt: summary.executedAt } },
      create: { key: SEASON_WIPE_LAST_COMPLETED_KEY, value: { key: SEASON_WIPE_REPAIR_KEY, executedAt: summary.executedAt } }
    });
    await tx.auditLog.create({
      data: { actor, action: 'wipe.season_store.v161.auto_full_history_repair', target: SEASON_WIPE_REPAIR_KEY, data: summary }
    });

    return { ...summary, playerSteam64s: players.map(player => player.steam64) };
  }, { isolationLevel: 'Serializable', maxWait: 20000, timeout: 240000 });
}


// V163: decisão administrativa pós-wipe. Todos os jogadores que já existiam no
// corte do wipe ficam com saldo EXATO de 50.000 RZ. Nenhum reembolso de compras
// é calculado aqui; valores adicionais serão lançados manualmente pelo ADM.
// A rotina é idempotente e nunca inclui contas criadas depois do corte.
export async function executeAutomaticOldPlayerFixedBalanceV163({ actor = 'system:auto-v163' } = {}) {
  // V170: rotina antiga desativada permanentemente. Ela definia o saldo exato
  // dos jogadores antigos em 50.000 RZ e poderia apagar moedas adicionadas pelo ADM.
  // Atualizações normais do site jamais devem alterar Player.coins.
  const result = {
    status: 'DISABLED_BY_V170',
    skipped: true,
    actor,
    playerSteam64s: [],
    playersAdjusted: 0,
    totalCoinsAdded: 0,
    totalCoinsRemoved: 0,
    note: 'Proteção de saldo ativa: nenhum saldo foi alterado.'
  };
  await prisma.appSetting.upsert({
    where: { key: 'raidz.safety.v170.disabled_v163_fixed_balance' },
    update: { value: { ...result, checkedAt: new Date().toISOString() } },
    create: { key: 'raidz.safety.v170.disabled_v163_fixed_balance', value: { ...result, checkedAt: new Date().toISOString() } }
  });
  return result;
}
