import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import {
  defaultPackages,
  storeCategories,
  starterKitConfig,
  vanillaProducts,
  defaultVehicles,
  defaultInsurancePlans
} from '../src/data/vanillaStoreData.js';

dotenv.config();
const prisma = new PrismaClient();

function envFlag(name, fallback = false) {
  const raw = process.env[name];
  if (raw === undefined || raw === null || raw === '') return fallback;
  return ['1', 'true', 'yes', 'sim', 'on'].includes(String(raw).trim().toLowerCase());
}

// V62: seed seguro. Por padrão ele só cria o que falta e preserva tudo que o ADM editou.
const OVERWRITE_PRODUCTS = envFlag('SEED_OVERWRITE_EXISTING_PRODUCTS', false);
const OVERWRITE_VEHICLES = envFlag('SEED_OVERWRITE_EXISTING_VEHICLES', false);
const OVERWRITE_SETTINGS = envFlag('SEED_OVERWRITE_EXISTING_SETTINGS', false);
const OVERWRITE_PACKAGES = envFlag('SEED_OVERWRITE_EXISTING_PACKAGES', false);
const OVERWRITE_INSURANCE_PLANS = envFlag('SEED_OVERWRITE_EXISTING_INSURANCE_PLANS', false);

const SEED_DELETED_PRODUCTS_KEY = 'seed.deletedProducts.v66';
const SEED_DELETED_VEHICLES_KEY = 'seed.deletedVehicles.v66';

function cleanTombstoneSlug(value) {
  return String(value || '').trim().toLowerCase();
}

function extractTombstoneSlugs(value) {
  const source = Array.isArray(value?.slugs) ? value.slugs : (Array.isArray(value) ? value : []);
  return new Set(source.map(cleanTombstoneSlug).filter(Boolean));
}

async function getSeedTombstones(key) {
  const setting = await prisma.appSetting.findUnique({ where: { key } });
  return extractTombstoneSlugs(setting?.value || {});
}

function hasText(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function isEmptyJson(value) {
  return value === null || value === undefined || (Array.isArray(value) && value.length === 0);
}

async function ensureProductItems(productId, savedProduct, defaultItems = []) {
  const count = await prisma.productItem.count({ where: { productId } });
  if (count > 0) return;
  const sourceItems = defaultItems.length
    ? defaultItems
    : [{ classname: savedProduct.classname, quantity: savedProduct.quantity, label: savedProduct.name }];

  await prisma.productItem.createMany({
    data: sourceItems
      .filter((item) => hasText(item.classname))
      .map((item, index) => ({
        productId,
        classname: item.classname,
        quantity: Number(item.quantity || 1),
        label: item.label || item.classname,
        sortOrder: Number.isFinite(Number(item.sortOrder)) ? Number(item.sortOrder) : index
      }))
  });
}

async function upsertProduct(product) {
  const { items = [], ...productData } = product;
  const existing = await prisma.product.findUnique({ where: { slug: product.slug }, include: { items: true } });

  if (!existing) {
    const saved = await prisma.product.create({ data: productData });
    await ensureProductItems(saved.id, saved, items);
    return saved;
  }

  if (OVERWRITE_PRODUCTS) {
    const saved = await prisma.product.update({ where: { slug: product.slug }, data: productData });
    await prisma.productItem.deleteMany({ where: { productId: saved.id } });
    await ensureProductItems(saved.id, saved, items);
    return saved;
  }

  const safeData = {};
  if (!hasText(existing.description) && hasText(productData.description)) safeData.description = productData.description;
  if (!hasText(existing.category) && hasText(productData.category)) safeData.category = productData.category;
  if (!hasText(existing.serverType) && hasText(productData.serverType)) safeData.serverType = productData.serverType;
  if (!hasText(existing.classname) && hasText(productData.classname)) safeData.classname = productData.classname;
  if (!hasText(existing.deliveryType) && hasText(productData.deliveryType)) safeData.deliveryType = productData.deliveryType;
  if (!hasText(existing.dropBoxClassname) && hasText(productData.dropBoxClassname)) safeData.dropBoxClassname = productData.dropBoxClassname;
  if (!hasText(existing.imageUrl) && !hasText(existing.imageData) && hasText(productData.imageUrl)) safeData.imageUrl = productData.imageUrl;

  const saved = Object.keys(safeData).length
    ? await prisma.product.update({ where: { slug: product.slug }, data: safeData })
    : existing;

  await ensureProductItems(saved.id, saved, items);
  return saved;
}

async function upsertVehicle(vehicle) {
  const data = {
    ...vehicle,
    fluids: vehicle.fluids || { fuelPercent: 80, waterPercent: 100, oilPercent: 100 },
    variants: vehicle.variants || null,
    cargoItems: vehicle.cargoItems || []
  };
  const existing = await prisma.vehicleTemplate.findUnique({ where: { slug: vehicle.slug } });
  if (!existing) return prisma.vehicleTemplate.create({ data });
  if (OVERWRITE_VEHICLES) return prisma.vehicleTemplate.update({ where: { slug: vehicle.slug }, data });

  const safeData = {};
  if (!hasText(existing.description) && hasText(vehicle.description)) safeData.description = vehicle.description;
  if (!hasText(existing.serverType) && hasText(vehicle.serverType)) safeData.serverType = vehicle.serverType;
  if (!hasText(existing.vehicleClassname) && hasText(vehicle.vehicleClassname)) safeData.vehicleClassname = vehicle.vehicleClassname;
  if (!hasText(existing.imageUrl) && !hasText(existing.imageData) && hasText(vehicle.imageUrl)) safeData.imageUrl = vehicle.imageUrl;
  if (isEmptyJson(existing.parts) && !isEmptyJson(vehicle.parts)) safeData.parts = vehicle.parts;
  if (isEmptyJson(existing.cargoItems) && !isEmptyJson(data.cargoItems)) safeData.cargoItems = data.cargoItems;
  if (isEmptyJson(existing.fluids) && !isEmptyJson(data.fluids)) safeData.fluids = data.fluids;
  if (isEmptyJson(existing.variants) && !isEmptyJson(data.variants)) safeData.variants = data.variants;

  return Object.keys(safeData).length ? prisma.vehicleTemplate.update({ where: { slug: vehicle.slug }, data: safeData }) : existing;
}

async function upsertSetting(key, value, { overwrite = OVERWRITE_SETTINGS } = {}) {
  return prisma.appSetting.upsert({ where: { key }, update: overwrite ? { value } : {}, create: { key, value } });
}

async function upsertCoinPackage(pack) {
  const exists = await prisma.coinPackage.findFirst({ where: { amountBrl: pack.amountBrl, coins: pack.coins } });
  if (!exists) return prisma.coinPackage.create({ data: { ...pack, active: true } });
  if (OVERWRITE_PACKAGES) return prisma.coinPackage.update({ where: { id: exists.id }, data: { ...pack, active: true } });
  return exists;
}

async function upsertInsurancePlan(plan) {
  const exists = await prisma.vehicleInsurancePlan.findFirst({ where: { name: plan.name, templateId: null } });
  const data = { ...plan, templateId: null, active: true };
  if (!exists) return prisma.vehicleInsurancePlan.create({ data });
  if (OVERWRITE_INSURANCE_PLANS) return prisma.vehicleInsurancePlan.update({ where: { id: exists.id }, data });
  return exists;
}

async function main() {
  await upsertSetting('store_categories_v1', { categories: storeCategories });
  await upsertSetting('starterKit.v1', starterKitConfig);
  await upsertSetting('store.globalPromo', { enabled: false, percent: 10, label: 'PROMO RELÂMPAGO', color: '#ff7a18' });
  await upsertSetting('drop_box_types_v1', { types: ['WoodenCrate', 'SeaChest', 'Barrel_Red', 'Barrel_Blue', 'Barrel_Green', 'FirstAidKit', 'AmmoBox'] });
  await upsertSetting('deploy.safety.v62', {
    safeDeployMode: true,
    note: 'Seed V62 preserva alterações feitas no painel ADM. Use variáveis SEED_OVERWRITE_* somente se quiser sobrescrever manualmente.'
  });

  const deletedProductSlugs = await getSeedTombstones(SEED_DELETED_PRODUCTS_KEY);
  const deletedVehicleSlugs = await getSeedTombstones(SEED_DELETED_VEHICLES_KEY);

  for (const pack of defaultPackages) await upsertCoinPackage(pack);
  for (const product of vanillaProducts) {
    if (deletedProductSlugs.has(cleanTombstoneSlug(product.slug))) continue;
    await upsertProduct(product);
  }
  for (const vehicle of defaultVehicles) {
    if (deletedVehicleSlugs.has(cleanTombstoneSlug(vehicle.slug))) continue;
    await upsertVehicle(vehicle);
  }
  for (const plan of defaultInsurancePlans) await upsertInsurancePlan(plan);

  console.log('✅ Seed V66 concluído em modo seguro: criou faltantes, preservou alterações do ADM e respeitou itens apagados.');
}

main()
  .catch((err) => {
    console.error('Erro no seed seguro V62:', err);
    process.exit(1);
  })
  .finally(async () => prisma.$disconnect());
