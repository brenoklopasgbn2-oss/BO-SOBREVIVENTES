import { prisma } from '../db/prisma.js';

export const GLOBAL_PROMO_KEY = 'store.globalPromo';

export function normalizePromoColor(value, fallback = '#ff7a18') {
  const color = String(value || '').trim();
  return /^#[0-9a-f]{6}$/i.test(color) ? color : fallback;
}

export function normalizePromoPercent(value, fallback = 0) {
  const num = Math.floor(Number(value || fallback));
  if (!Number.isFinite(num)) return fallback;
  return Math.max(0, Math.min(95, num));
}

export function normalizeGlobalPromo(raw = {}) {
  return {
    enabled: raw?.enabled === true || raw?.enabled === 'true' || raw?.enabled === 'on',
    percent: normalizePromoPercent(raw?.percent, 10),
    label: String(raw?.label || 'PROMO RELÂMPAGO').trim().slice(0, 60) || 'PROMO RELÂMPAGO',
    color: normalizePromoColor(raw?.color, '#ff7a18')
  };
}

export async function getGlobalPromo(tx = prisma) {
  const setting = await tx.appSetting.findUnique({ where: { key: GLOBAL_PROMO_KEY } });
  return normalizeGlobalPromo(setting?.value || {});
}

export async function saveGlobalPromo(data, tx = prisma) {
  const value = normalizeGlobalPromo(data);
  await tx.appSetting.upsert({
    where: { key: GLOBAL_PROMO_KEY },
    update: { value },
    create: { key: GLOBAL_PROMO_KEY, value }
  });
  return value;
}

export function getEffectivePromotion(product, globalPromo = null) {
  const productPromoActive = !!product?.promoActive && normalizePromoPercent(product?.promoPercent, 0) > 0;
  if (productPromoActive) {
    return {
      active: true,
      source: 'product',
      percent: normalizePromoPercent(product?.promoPercent, 0),
      label: String(product?.promoLabel || 'OFERTA ESPECIAL').trim() || 'OFERTA ESPECIAL',
      color: normalizePromoColor(product?.promoColor, '#ff7a18')
    };
  }
  const normalizedGlobal = normalizeGlobalPromo(globalPromo || {});
  if (normalizedGlobal.enabled && normalizedGlobal.percent > 0) {
    return { active: true, source: 'global', ...normalizedGlobal };
  }
  return { active: false, source: null, percent: 0, label: '', color: '#ff7a18' };
}

export function applyPromotionToProduct(product, globalPromo = null) {
  const originalPriceCoins = Number(product?.priceCoins || 0);
  const promo = getEffectivePromotion(product, globalPromo);
  const discountFactor = promo.active ? (100 - promo.percent) / 100 : 1;
  const discounted = originalPriceCoins > 0 ? Math.max(1, Math.round(originalPriceCoins * discountFactor)) : 0;
  const finalPriceCoins = promo.active ? discounted : originalPriceCoins;
  return {
    ...product,
    basePriceCoins: originalPriceCoins,
    displayPriceCoins: finalPriceCoins,
    savingsCoins: Math.max(0, originalPriceCoins - finalPriceCoins),
    promo: {
      ...promo,
      originalPriceCoins,
      finalPriceCoins,
      savingsCoins: Math.max(0, originalPriceCoins - finalPriceCoins)
    }
  };
}
