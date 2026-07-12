import { prisma } from '../db/prisma.js';
import { logAudit } from './auditService.js';

export function normalizeMarketingCode(value) {
  return String(value || '')
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z0-9_-]/g, '')
    .slice(0, 32);
}

function toPercent(value, fallback = 0, max = 90) {
  const n = Number(value ?? fallback);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.min(Math.floor(n), max));
}

function parseOptionalDate(value) {
  const raw = String(value || '').trim();
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toOptionalPositiveInt(value) {
  const raw = String(value || '').trim();
  if (!raw) return null;
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  return Math.max(1, Math.floor(n));
}

function toNonNegativeInt(value, fallback = 0) {
  const n = Number(value ?? fallback);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.floor(n));
}

function coinsToBrl(coins = 0) {
  return Number((Number(coins || 0) / 1000).toFixed(2));
}

export async function validateCouponCode({ code, totalCoins, playerId = null, steam64 = null, tx = prisma } = {}) {
  const normalized = normalizeMarketingCode(code);
  if (!normalized) return null;
  const coupon = await tx.couponCode.findUnique({ where: { code: normalized } });
  if (!coupon || !coupon.active) throw new Error('Cupom inválido ou desativado.');
  const now = new Date();
  if (coupon.startsAt && coupon.startsAt > now) throw new Error('Esse cupom ainda não começou.');
  if (coupon.endsAt && coupon.endsAt < now) throw new Error('Esse cupom já expirou.');
  if (coupon.maxUses !== null && coupon.maxUses !== undefined && coupon.usedCount >= coupon.maxUses) throw new Error('Esse cupom já atingiu o limite total de usos.');
  if (Number(coupon.minCoins || 0) > Number(totalCoins || 0)) throw new Error(`Esse cupom exige doação mínima de ${coupon.minCoins} RZ.`);

  const maxUsesPerSteam = Number(coupon.maxUsesPerSteam || 0);
  if (maxUsesPerSteam > 0) {
    const normalizedSteam = String(steam64 || '').trim();
    if (!normalizedSteam) throw new Error('Esse cupom tem limite por Steam64 e precisa de player logado.');
    const usedBySteam = await tx.couponUse.count({
      where: {
        couponId: coupon.id,
        OR: [
          { playerSteam64: normalizedSteam },
          ...(playerId ? [{ playerId }] : [])
        ]
      }
    });
    if (usedBySteam >= maxUsesPerSteam) {
      throw new Error(maxUsesPerSteam === 1 ? 'Esse cupom só pode ser usado 1 vez por Steam64.' : `Esse cupom só pode ser usado ${maxUsesPerSteam} vezes por Steam64.`);
    }
  }

  const percent = toPercent(coupon.percent, 0, 90);
  const discountCoins = Math.floor(Number(totalCoins || 0) * percent / 100);
  return { coupon, code: normalized, percent, discountCoins, maxUsesPerSteam };
}

export async function registerCouponUse({ tx = prisma, couponResult, player, source = 'PRODUCT', purchaseId = null, totalCoins = 0, discountCoins = 0 }) {
  if (!couponResult?.coupon) return null;
  await tx.couponCode.update({ where: { id: couponResult.coupon.id }, data: { usedCount: { increment: 1 } } });
  return tx.couponUse.create({
    data: {
      couponId: couponResult.coupon.id,
      code: couponResult.code,
      playerId: player?.id || null,
      playerSteam64: player?.steam64 || null,
      source,
      purchaseId,
      totalCoins: Number(totalCoins || 0),
      discountCoins: Number(discountCoins || 0)
    }
  });
}

export async function findActiveStreamerCode(code, tx = prisma) {
  const normalized = normalizeMarketingCode(code);
  if (!normalized) return null;
  const streamerCode = await tx.streamerCode.findUnique({ where: { code: normalized } });
  if (!streamerCode || !streamerCode.active) throw new Error('Código do streamer inválido ou desativado.');
  return streamerCode;
}

export async function recordStreamerSupportSale({ tx = prisma, streamerCode, player, purchaseId = null, paymentId = null, source = 'PRODUCT', totalCoins = 0, couponCode = null }) {
  if (!streamerCode) return null;
  const commissionPercent = toPercent(streamerCode.percent, 0, 80);
  const commissionCoins = Math.floor(Number(totalCoins || 0) * commissionPercent / 100);
  const sale = await tx.streamerSupportSale.create({
    data: {
      streamerCodeId: streamerCode.id,
      code: streamerCode.code,
      streamerName: streamerCode.streamerName,
      playerId: player?.id || null,
      playerSteam64: player?.steam64 || null,
      playerName: player?.nickname || null,
      purchaseId,
      paymentId,
      source,
      totalCoins: Number(totalCoins || 0),
      commissionPercent,
      commissionCoins,
      couponCode: couponCode || null
    }
  });
  await tx.streamerCode.update({
    where: { id: streamerCode.id },
    data: {
      totalSalesCoins: { increment: Number(totalCoins || 0) },
      totalCommissionCoins: { increment: commissionCoins }
    }
  });
  return sale;
}

export async function upsertCouponFromBody(body = {}) {
  const code = normalizeMarketingCode(body.code);
  if (!code) throw new Error('Digite um código de cupom.');
  let maxUsesPerSteam = toNonNegativeInt(body.maxUsesPerSteam, 0);
  if (body.oneUsePerSteam === 'on' || body.oneUsePerSteam === true) maxUsesPerSteam = 1;
  const data = {
    code,
    label: String(body.label || '').trim() || null,
    percent: toPercent(body.percent, 0, 90),
    active: body.active === 'on' || body.active === true,
    maxUses: toOptionalPositiveInt(body.maxUses),
    maxUsesPerSteam,
    minCoins: toNonNegativeInt(body.minCoins, 0),
    startsAt: parseOptionalDate(body.startsAt),
    endsAt: parseOptionalDate(body.endsAt)
  };
  if (data.percent <= 0) throw new Error('O desconto precisa ser maior que 0%.');
  const saved = await prisma.couponCode.upsert({ where: { code }, update: data, create: data });
  await logAudit({ actor: 'admin', action: 'coupon.upserted', target: code, data: { percent: data.percent, active: data.active, maxUses: data.maxUses, maxUsesPerSteam: data.maxUsesPerSteam } });
  return saved;
}

export async function upsertStreamerCodeFromBody(body = {}) {
  const code = normalizeMarketingCode(body.code);
  if (!code) throw new Error('Digite o código do streamer.');
  const streamerName = String(body.streamerName || '').trim();
  if (!streamerName) throw new Error('Digite o nome do streamer.');
  const steam64 = String(body.streamerSteam64 || '').trim();
  const data = {
    code,
    streamerName,
    streamerSteam64: steam64 || null,
    pixKey: String(body.pixKey || '').trim() || null,
    percent: toPercent(body.percent, 10, 80),
    active: body.active === 'on' || body.active === true
  };
  const saved = await prisma.streamerCode.upsert({ where: { code }, update: data, create: data });
  await logAudit({ actor: 'admin', action: 'streamer_support.code.upserted', target: code, data: { streamerName, percent: data.percent, active: data.active } });
  return saved;
}

function periodStarts(now = new Date()) {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const week = new Date(today);
  const day = week.getDay();
  const daysSinceMonday = (day + 6) % 7;
  week.setDate(week.getDate() - daysSinceMonday);
  const month = new Date(today.getFullYear(), today.getMonth(), 1);
  const year = new Date(today.getFullYear(), 0, 1);
  return { today, week, month, year };
}

function periodRange(periodType = 'ALL') {
  const starts = periodStarts();
  const type = String(periodType || 'ALL').toUpperCase();
  if (type === 'WEEKLY') {
    const end = new Date(starts.week);
    end.setDate(end.getDate() + 7);
    return { periodType: 'WEEKLY', start: starts.week, end };
  }
  if (type === 'MONTHLY') {
    const end = new Date(starts.month.getFullYear(), starts.month.getMonth() + 1, 1);
    return { periodType: 'MONTHLY', start: starts.month, end };
  }
  return { periodType: 'ALL', start: null, end: null };
}

function periodWhere({ code, start = null, end = null, onlyUnpaid = false } = {}) {
  const where = { code };
  if (onlyUnpaid) where.paidAt = null;
  if (start || end) {
    where.createdAt = {};
    if (start) where.createdAt.gte = start;
    if (end) where.createdAt.lt = end;
  }
  return where;
}

function summarizeSales(sales = [], fromDate = null, onlyUnpaid = false) {
  const filtered = sales.filter((sale) => {
    if (fromDate && new Date(sale.createdAt) < fromDate) return false;
    if (onlyUnpaid && sale.paidAt) return false;
    return true;
  });
  const totalSalesCoins = filtered.reduce((sum, sale) => sum + Number(sale.totalCoins || 0), 0);
  const totalCommissionCoins = filtered.reduce((sum, sale) => sum + Number(sale.commissionCoins || 0), 0);
  return {
    saleCount: filtered.length,
    supporters: new Set(filtered.map(s => s.playerSteam64).filter(Boolean)).size,
    totalSalesCoins,
    totalCommissionCoins,
    totalCommissionBrl: coinsToBrl(totalCommissionCoins)
  };
}

function payoutSnapshotFromSales(sales = []) {
  const summary = summarizeSales(sales);
  return {
    saleCount: summary.saleCount,
    supporters: summary.supporters,
    salesCoins: summary.totalSalesCoins,
    amountCoins: summary.totalCommissionCoins,
    amountBrl: summary.totalCommissionBrl
  };
}

async function getSalesForPayout({ tx = prisma, code, start = null, end = null }) {
  return tx.streamerSupportSale.findMany({
    where: {
      ...periodWhere({ code, start, end, onlyUnpaid: true }),
      commissionCoins: { gt: 0 }
    },
    orderBy: { createdAt: 'asc' }
  });
}

async function getStreamerDashboard(streamerCode) {
  const [sales, payouts] = await Promise.all([
    prisma.streamerSupportSale.findMany({ where: { code: streamerCode.code }, orderBy: { createdAt: 'desc' }, take: 800 }),
    prisma.streamerPayout.findMany({ where: { code: streamerCode.code }, orderBy: { createdAt: 'desc' }, take: 60 })
  ]);
  const starts = periodStarts();
  const stats = {
    total: summarizeSales(sales),
    today: summarizeSales(sales, starts.today),
    weekly: summarizeSales(sales, starts.week),
    monthly: summarizeSales(sales, starts.month),
    yearly: summarizeSales(sales, starts.year),
    pending: summarizeSales(sales, null, true),
    pendingWeekly: summarizeSales(sales, starts.week, true),
    pendingMonthly: summarizeSales(sales, starts.month, true)
  };
  return { streamerCode, sales: sales.slice(0, 160), payouts, stats };
}

export async function getStreamerDashboardByCode(code) {
  const normalized = normalizeMarketingCode(code);
  if (!normalized) throw new Error('Digite o código do streamer.');
  const streamerCode = await prisma.streamerCode.findUnique({ where: { code: normalized } });
  if (!streamerCode || !streamerCode.active) throw new Error('Código streamer não encontrado ou desativado pelo ADM.');
  return getStreamerDashboard(streamerCode);
}

export async function getStreamerDashboardBySteam64(steam64) {
  const normalizedSteam = String(steam64 || '').trim();
  if (!/^\d{17}$/.test(normalizedSteam)) throw new Error('Digite seu Steam64 completo para entrar no painel streamer.');
  const streamerCode = await prisma.streamerCode.findFirst({ where: { streamerSteam64: normalizedSteam, active: true }, orderBy: { updatedAt: 'desc' } });
  if (!streamerCode) throw new Error('Seu Steam64 ainda não foi liberado pelo ADM para painel streamer. Abra ticket no Discord ou peça para o ADM liberar em Admin > Apoio Streamer.');
  return getStreamerDashboard(streamerCode);
}

export async function requestStreamerWeeklyPayout({ code, steam64 = null } = {}) {
  const normalized = normalizeMarketingCode(code);
  if (!normalized) throw new Error('Código streamer inválido.');
  const streamerCode = await prisma.streamerCode.findUnique({ where: { code: normalized } });
  if (!streamerCode || !streamerCode.active) throw new Error('Código streamer não encontrado ou desativado.');
  const normalizedSteam = String(steam64 || '').trim();
  if (streamerCode.streamerSteam64 && normalizedSteam !== streamerCode.streamerSteam64) {
    throw new Error('Steam64 não confere com o streamer liberado pelo ADM.');
  }
  const range = periodRange('WEEKLY');

  const existing = await prisma.streamerPayout.findFirst({
    where: {
      code: streamerCode.code,
      status: 'PENDING',
      periodType: 'WEEKLY',
      periodStart: range.start
    },
    orderBy: { createdAt: 'desc' }
  });
  if (existing) return existing;

  const sales = await getSalesForPayout({ code: streamerCode.code, start: range.start, end: range.end });
  const snapshot = payoutSnapshotFromSales(sales);
  if (snapshot.amountCoins <= 0) throw new Error('Ainda não tem ganho semanal novo para solicitar pagamento.');

  const payout = await prisma.streamerPayout.create({
    data: {
      streamerCodeId: streamerCode.id,
      code: streamerCode.code,
      streamerName: streamerCode.streamerName,
      status: 'PENDING',
      periodType: 'WEEKLY',
      periodStart: range.start,
      periodEnd: range.end,
      ...snapshot,
      requestedByStreamer: true,
      requestedAt: new Date(),
      note: 'Solicitado pelo streamer no painel público.'
    }
  });
  await logAudit({ actor: streamerCode.streamerSteam64 || streamerCode.code, action: 'streamer_payout.requested', target: streamerCode.code, data: { payoutId: payout.id, amountCoins: payout.amountCoins, amountBrl: Number(payout.amountBrl) } });
  return payout;
}

export async function markStreamerCommissionPaid({ streamerCodeId = null, payoutId = null, periodType = 'ALL', actor = 'admin' } = {}) {
  const streamer = streamerCodeId
    ? await prisma.streamerCode.findUnique({ where: { id: streamerCodeId } })
    : null;
  const existingPayout = payoutId ? await prisma.streamerPayout.findUnique({ where: { id: payoutId } }) : null;
  if (!streamer && !existingPayout) throw new Error('Streamer ou solicitação de pagamento não encontrada.');
  const code = streamer?.code || existingPayout.code;
  const name = streamer?.streamerName || existingPayout.streamerName;
  const codeId = streamer?.id || existingPayout.streamerCodeId || null;
  const range = existingPayout
    ? { periodType: existingPayout.periodType || 'MANUAL', start: existingPayout.periodStart || null, end: existingPayout.periodEnd || null }
    : periodRange(periodType);

  const result = await prisma.$transaction(async (tx) => {
    const sales = await getSalesForPayout({ tx, code, start: range.start, end: range.end });
    const snapshot = payoutSnapshotFromSales(sales);
    if (snapshot.amountCoins <= 0 || !sales.length) throw new Error('Esse streamer não tem comissão pendente nesse período.');
    const now = new Date();
    const payout = existingPayout
      ? await tx.streamerPayout.update({
          where: { id: existingPayout.id },
          data: {
            streamerCodeId: codeId,
            code,
            streamerName: name,
            status: 'PAID',
            periodType: range.periodType,
            periodStart: range.start,
            periodEnd: range.end,
            ...snapshot,
            paidAt: now,
            paidBy: actor
          }
        })
      : await tx.streamerPayout.create({
          data: {
            streamerCodeId: codeId,
            code,
            streamerName: name,
            status: 'PAID',
            periodType: range.periodType,
            periodStart: range.start,
            periodEnd: range.end,
            ...snapshot,
            paidAt: now,
            paidBy: actor,
            note: 'Marcado como pago pelo ADM.'
          }
        });

    await tx.streamerSupportSale.updateMany({
      where: { id: { in: sales.map(s => s.id) } },
      data: { payoutId: payout.id, paidAt: now }
    });

    const pendingRequestWhere = {
      code,
      status: 'PENDING',
      id: { not: payout.id }
    };
    if (range.start || range.end) {
      pendingRequestWhere.periodStart = {};
      if (range.start) pendingRequestWhere.periodStart.gte = range.start;
      if (range.end) pendingRequestWhere.periodStart.lt = range.end;
    }
    await tx.streamerPayout.updateMany({
      where: pendingRequestWhere,
      data: { status: 'PAID', paidAt: now, paidBy: actor, note: 'Pago junto com outro fechamento do ADM.' }
    });
    return payout;
  });

  await logAudit({ actor, action: 'streamer_payout.paid', target: code, data: { payoutId: result.id, periodType: result.periodType, amountCoins: result.amountCoins, amountBrl: Number(result.amountBrl), saleCount: result.saleCount } });
  return result;
}

export async function getAdminSupportDashboard() {
  const [streamerCodesRaw, coupons, sales, payouts] = await Promise.all([
    prisma.streamerCode.findMany({ orderBy: [{ active: 'desc' }, { updatedAt: 'desc' }], take: 100 }),
    prisma.couponCode.findMany({ orderBy: [{ active: 'desc' }, { updatedAt: 'desc' }], take: 100 }),
    prisma.streamerSupportSale.findMany({ orderBy: { createdAt: 'desc' }, take: 1000 }),
    prisma.streamerPayout.findMany({ orderBy: { createdAt: 'desc' }, take: 200 })
  ]);
  const starts = periodStarts();
  const streamerCodes = streamerCodesRaw.map((streamer) => {
    const streamerSales = sales.filter((sale) => sale.code === streamer.code);
    const streamerPayouts = payouts.filter((p) => p.code === streamer.code);
    return {
      ...streamer,
      periodStats: {
        total: summarizeSales(streamerSales),
        weekly: summarizeSales(streamerSales, starts.week),
        monthly: summarizeSales(streamerSales, starts.month),
        pending: summarizeSales(streamerSales, null, true),
        pendingWeekly: summarizeSales(streamerSales, starts.week, true),
        pendingMonthly: summarizeSales(streamerSales, starts.month, true)
      },
      pendingPayouts: streamerPayouts.filter((p) => p.status === 'PENDING').slice(0, 5),
      paidPayouts: streamerPayouts.filter((p) => p.status === 'PAID').slice(0, 5)
    };
  });
  const totals = {
    ...summarizeSales(sales),
    weekly: summarizeSales(sales, starts.week),
    monthly: summarizeSales(sales, starts.month),
    pending: summarizeSales(sales, null, true),
    pendingWeekly: summarizeSales(sales, starts.week, true),
    pendingMonthly: summarizeSales(sales, starts.month, true),
    activeStreamers: streamerCodes.filter(s => s.active).length,
    activeCoupons: coupons.filter(c => c.active).length,
    pendingPayouts: payouts.filter(p => p.status === 'PENDING').length
  };
  return { streamerCodes, coupons, sales: sales.slice(0, 250), payouts: payouts.slice(0, 120), totals };
}
