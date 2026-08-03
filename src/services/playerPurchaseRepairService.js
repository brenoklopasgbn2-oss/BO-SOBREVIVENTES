import { prisma } from '../db/prisma.js';

export const V168_TARGET_STEAM64 = '76561199549567187';
const V168_REPAIR_KEY = `raidz.hotfix.v168.player_purchase_reset.${V168_TARGET_STEAM64}`;
const RESET_TRANSACTION_OPTIONS = { maxWait: 15_000, timeout: 60_000 };

function normalizeSteam64(value) {
  const steam64 = String(value || '').trim();
  if (!/^7656119\d{10}$/.test(steam64)) throw new Error('Steam64 inválido para limpar compras.');
  return steam64;
}

function summarizeDeliveries(rows = []) {
  const byStatus = {};
  const errors = new Set();
  for (const row of rows) {
    const status = String(row.status || 'UNKNOWN');
    byStatus[status] = (byStatus[status] || 0) + 1;
    if (row.error) errors.add(String(row.error).slice(0, 240));
  }
  return {
    total: rows.length,
    byStatus,
    errors: Array.from(errors).slice(0, 20),
    hadBlockedBatch: rows.some(row => ['PENDING', 'PROCESSING', 'FAILED'].includes(String(row.status || '')))
  };
}

export async function resetPlayerPurchaseAndDeliveryHistory({ playerId = null, steam64 = null, actor = 'admin' } = {}) {
  const cleanSteam64 = steam64 ? normalizeSteam64(steam64) : null;

  return prisma.$transaction(async tx => {
    const player = playerId
      ? await tx.player.findUnique({ where: { id: String(playerId) } })
      : await tx.player.findUnique({ where: { steam64: cleanSteam64 } });
    if (!player) throw new Error('Player não encontrado para limpar compras.');

    const targetSteam64 = normalizeSteam64(player.steam64);
    const deliveryWhere = {
      OR: [
        { playerId: player.id },
        { steam64: targetSteam64 }
      ]
    };

    const [purchasesBefore, checkoutAttemptsBefore, deliveryRows] = await Promise.all([
      tx.purchase.count({ where: { playerId: player.id } }),
      tx.checkoutAttempt.count({ where: { playerId: player.id } }),
      tx.deliveryQueue.findMany({
        where: deliveryWhere,
        select: { id: true, status: true, error: true, claimedAt: true, createdAt: true },
        orderBy: { createdAt: 'asc' }
      })
    ]);

    // Apaga primeiro a fila, inclusive presentes destinados ao Steam64. Depois
    // remove o histórico de compras e os tokens antigos de checkout. Saldo,
    // pagamentos Pix, ledger, VIP, veículos e dados do player são preservados.
    const deliveriesDeleted = (await tx.deliveryQueue.deleteMany({ where: deliveryWhere })).count;
    const purchasesDeleted = (await tx.purchase.deleteMany({ where: { playerId: player.id } })).count;
    const checkoutAttemptsDeleted = (await tx.checkoutAttempt.deleteMany({ where: { playerId: player.id } })).count;

    const result = {
      actor,
      playerId: player.id,
      steam64: targetSteam64,
      nickname: player.nickname || null,
      purchasesBefore,
      checkoutAttemptsBefore,
      deliveryDiagnosis: summarizeDeliveries(deliveryRows),
      purchasesDeleted,
      deliveriesDeleted,
      checkoutAttemptsDeleted,
      coinsPreserved: player.coins,
      completedAt: new Date().toISOString()
    };

    return result;
  }, RESET_TRANSACTION_OPTIONS);
}

export async function prepareV168TargetPlayerReset() {
  const marker = await prisma.appSetting.findUnique({ where: { key: V168_REPAIR_KEY } });
  const previous = marker?.value && typeof marker.value === 'object' ? marker.value : {};
  if (previous.dbCleared) return { ...previous, alreadyApplied: true, markerKey: V168_REPAIR_KEY };

  const player = await prisma.player.findUnique({ where: { steam64: V168_TARGET_STEAM64 }, select: { id: true } });
  if (!player) {
    return {
      markerKey: V168_REPAIR_KEY,
      steam64: V168_TARGET_STEAM64,
      dbCleared: false,
      playerFound: false
    };
  }

  const reset = await resetPlayerPurchaseAndDeliveryHistory({
    playerId: player.id,
    actor: 'bootstrap-v168-specific-player-repair'
  });

  const value = {
    version: 168,
    steam64: V168_TARGET_STEAM64,
    playerFound: true,
    dbCleared: true,
    ftpCleared: false,
    reset
  };
  await prisma.appSetting.upsert({
    where: { key: V168_REPAIR_KEY },
    update: { value },
    create: { key: V168_REPAIR_KEY, value }
  });
  return { ...value, markerKey: V168_REPAIR_KEY, alreadyApplied: false };
}

export async function markV168TargetPlayerFtpCleared(ftpResult = {}) {
  const marker = await prisma.appSetting.findUnique({ where: { key: V168_REPAIR_KEY } });
  const previous = marker?.value && typeof marker.value === 'object' ? marker.value : {};
  const value = {
    ...previous,
    version: 168,
    steam64: V168_TARGET_STEAM64,
    ftpCleared: true,
    ftpClearedAt: new Date().toISOString(),
    ftpResult
  };
  await prisma.appSetting.upsert({
    where: { key: V168_REPAIR_KEY },
    update: { value },
    create: { key: V168_REPAIR_KEY, value }
  });
  return value;
}

export async function getV168TargetPlayerRepairState() {
  const marker = await prisma.appSetting.findUnique({ where: { key: V168_REPAIR_KEY } });
  const value = marker?.value && typeof marker.value === 'object' ? marker.value : {};
  return { markerKey: V168_REPAIR_KEY, ...value };
}
