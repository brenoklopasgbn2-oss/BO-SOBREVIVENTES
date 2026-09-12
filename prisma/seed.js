import { PrismaClient } from '@prisma/client';
import { defaultPackages, storeCategories, starterKitConfig, vanillaProducts } from '../src/data/vanillaStoreData.js';
import { vipOutfitsV201 } from '../src/data/vipOutfitsV201.js';

const prisma = new PrismaClient();

async function setting(key, value) {
  const existing = await prisma.appSetting.findUnique({ where: { key } });
  if (!existing) await prisma.appSetting.create({ data: { key, value } });
}

async function coinPackage(pack) {
  const data = {
    name: pack.name,
    amountBrl: Number(pack.amountBrl),
    coins: Number(pack.coins),
    bonusText: pack.bonusText || null,
    active: true
  };
  const existing = await prisma.coinPackage.findFirst({ where: { name: pack.name } });
  if (existing) {
    await prisma.coinPackage.update({ where: { id: existing.id }, data });
    return;
  }
  await prisma.coinPackage.create({ data });
}


async function vipOutfit(outfit) {
  const existing = await prisma.outfitTemplate.findUnique({ where: { slug: outfit.slug } });
  const data = {
    name: outfit.name,
    description: outfit.description || null,
    serverType: outfit.serverType || 'vanilla',
    level: Math.max(1, Number(outfit.level || 1)),
    priceCoins: Math.max(0, Number(outfit.priceCoins || 0)),
    durationDays: Math.max(1, Number(outfit.durationDays || 30)),
    imageUrl: outfit.imageUrl || null,
    imageData: null,
    imageMime: null,
    items: outfit.items || [],
    active: outfit.active !== false,
    streamerRewardEnabled: false,
    isPrivate: Boolean(outfit.isPrivate)
  };
  if (existing) {
    await prisma.outfitTemplate.update({ where: { id: existing.id }, data });
    return;
  }
  await prisma.outfitTemplate.create({ data: { ...data, slug: outfit.slug } });
}

async function constructionProduct(product) {
  const existing = await prisma.product.findUnique({ where: { slug: product.slug } });
  if (existing) return;
  const { items = [], ...data } = product;
  await prisma.product.create({
    data: {
      ...data,
      deliveryType: 'drop_at_feet',
      dropBoxClassname: null,
      imageUrl: null,
      imageData: null,
      imageMime: null,
      items: { create: items.map((item, index) => ({ ...item, sortOrder: item.sortOrder ?? index })) }
    }
  });
}

async function main() {
  await setting('store_categories_v1', { categories: storeCategories });
  await setting('starterKit.v1', starterKitConfig);
  await setting('store.globalPromo', { enabled: false, percent: 0, label: '', color: '#ff7a18' });
  await setting('store.delivery.v200', { physicalItems: 'drop_at_feet', dropBoxesEnabled: false, vehiclesUseModPreset: true, vehiclePresetKey: 'vehicleClassname', vipMedia: 'video', vipItemPayloadVersion: 2 });
  for (const pack of defaultPackages) await coinPackage(pack);
  for (const product of vanillaProducts) await constructionProduct(product);
  for (const outfit of vipOutfitsV201) await vipOutfit(outfit);
  console.log(`[SEED_V201] Base pronta: ${vanillaProducts.length} produto(s) de Construção, 0 veículos, ${vipOutfitsV201.length} variações de traje VIP.`);
}

main().finally(() => prisma.$disconnect());
