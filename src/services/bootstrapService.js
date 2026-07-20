import { prisma } from '../db/prisma.js';
import {
  defaultPackages,
  storeCategories,
  starterKitConfig,
  vanillaProducts,
  defaultVehicles,
  defaultInsurancePlans
} from '../data/vanillaStoreData.js';
import { defaultOutfitTemplates } from '../data/outfitTemplates.js';
import { seedOutfitTemplates, assignPrivateVipMembers, normalizeItems } from './outfitService.js';
import { ensureManagedOwnerAccess, STREAMER_OWNER_SOURCE, STREAMER_MEMBER_SOURCE } from './managedOutfitService.js';
import { ensureVehicleRequiredEquipment, vehicleTemplatePayload, createVehiclePlayerInventoryAccessoryDeliveries } from './vehicleRentalService.js';

function envFlag(name, fallback = false) {
  const raw = process.env[name];
  if (raw === undefined || raw === null || raw === '') return fallback;
  return ['1', 'true', 'yes', 'sim', 'on'].includes(String(raw).trim().toLowerCase());
}

// V62: modo seguro por padrão.
// GitHub/deploy deve atualizar código, não conteúdo cadastrado no painel ADM.
// Para forçar overwrite manualmente, configure explicitamente as variáveis abaixo como true.
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

  // Atualização segura: preserva preço, promoção, status, imagem enviada no ADM,
  // categoria editada, estoque, destaque e itens do produto.
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
  const vehicleData = {
    ...vehicle,
    fluids: vehicle.fluids || { fuelPercent: 80, waterPercent: 100, oilPercent: 100 },
    variants: vehicle.variants || null,
    cargoItems: vehicle.cargoItems || []
  };

  const existing = await prisma.vehicleTemplate.findUnique({ where: { slug: vehicle.slug } });
  if (!existing) return prisma.vehicleTemplate.create({ data: vehicleData });

  if (OVERWRITE_VEHICLES) {
    return prisma.vehicleTemplate.update({ where: { slug: vehicle.slug }, data: vehicleData });
  }

  // Preserva preço, imagem enviada pelo ADM, status ativo/inativo e ajustes manuais.
  // Só completa campos que estiverem vazios para veículo antigo não quebrar.
  const safeData = {};
  if (!hasText(existing.description) && hasText(vehicle.description)) safeData.description = vehicle.description;
  if (!hasText(existing.serverType) && hasText(vehicle.serverType)) safeData.serverType = vehicle.serverType;
  if (!hasText(existing.vehicleClassname) && hasText(vehicle.vehicleClassname)) safeData.vehicleClassname = vehicle.vehicleClassname;
  if (!hasText(existing.imageUrl) && !hasText(existing.imageData) && hasText(vehicle.imageUrl)) safeData.imageUrl = vehicle.imageUrl;
  if (isEmptyJson(existing.parts) && !isEmptyJson(vehicle.parts)) safeData.parts = vehicle.parts;
  if (isEmptyJson(existing.cargoItems) && !isEmptyJson(vehicleData.cargoItems)) safeData.cargoItems = vehicleData.cargoItems;
  if (isEmptyJson(existing.fluids) && !isEmptyJson(vehicleData.fluids)) safeData.fluids = vehicleData.fluids;
  if (isEmptyJson(existing.variants) && !isEmptyJson(vehicleData.variants)) safeData.variants = vehicleData.variants;

  return Object.keys(safeData).length
    ? prisma.vehicleTemplate.update({ where: { slug: vehicle.slug }, data: safeData })
    : existing;
}

async function upsertSetting(key, value, { overwrite = OVERWRITE_SETTINGS } = {}) {
  return prisma.appSetting.upsert({
    where: { key },
    update: overwrite ? { value } : {},
    create: { key, value }
  });
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


async function applyRaidZBrandingCleanup() {
  // V67: remove marcas antigas visíveis em dados já salvos no banco.
  // Não mexe em preços, saldos, compras, garagem, entregas ou imagens.
  try {
    const oldSupplyCategory = 'Sobre' + 'vivência';
    const oldBrandPlural = 'Sobre' + 'viventes';
    await prisma.product.updateMany({ where: { category: oldSupplyCategory }, data: { category: 'Suprimentos' } });
    await prisma.appSetting.upsert({
      where: { key: 'brand.raidz.v67' },
      update: { value: { name: 'RAID-Z', currency: 'RZ Coins', oldBrandRemoved: true, updatedAt: new Date().toISOString() } },
      create: { key: 'brand.raidz.v67', value: { name: 'RAID-Z', currency: 'RZ Coins', oldBrandRemoved: true, updatedAt: new Date().toISOString() } }
    });
    const categorySetting = await prisma.appSetting.findUnique({ where: { key: 'store_categories_v1' } });
    const categories = Array.isArray(categorySetting?.value?.categories) ? categorySetting.value.categories : null;
    if (categories) {
      const cleaned = categories.map((cat) => ({
        ...cat,
        name: String(cat.name || '').replace(new RegExp(oldSupplyCategory, 'gi'), 'Suprimentos').replace(new RegExp(oldBrandPlural + '\\s*Z', 'gi'), 'RAID-Z').replace(new RegExp(oldBrandPlural, 'gi'), 'Players')
      }));
      await prisma.appSetting.update({ where: { key: 'store_categories_v1' }, data: { value: { ...categorySetting.value, categories: cleaned } } });
    }
  } catch (err) {
    console.warn('Aviso: limpeza de marca RAID-Z não aplicada:', err.message);
  }
}


function packageKey(pack) {
  const amount = Number(pack?.amountBrl || 0).toFixed(2);
  return `${amount}:${Number(pack?.coins || 0)}`;
}


async function backfillDirectVehicleDeliveriesToGarageV70() {
  // V70: compras antigas de veículo sem seguro também devem aparecer na Minha Garagem.
  // Não cobra nada, não mexe em saldo e não cria nova entrega: só cria o registro de garagem.
  try {
    const deliveries = await prisma.deliveryQueue.findMany({
      where: { productName: { startsWith: 'Veículo comprado sem seguro:' } },
      orderBy: { createdAt: 'desc' },
      take: 1000
    });

    for (const delivery of deliveries) {
      const meta = delivery.meta || {};
      const vehicleKey = String(meta.vehicleKey || '').trim();
      const vehicleClassname = String(meta.vehicleClassname || delivery.classname || '').trim();
      if (!vehicleKey || !vehicleClassname) continue;

      const existing = await prisma.playerVehicle.findFirst({ where: { currentVehicleKey: vehicleKey } });
      if (existing) continue;

      const template = await prisma.vehicleTemplate.findFirst({
        where: { vehicleClassname, active: true },
        orderBy: { updatedAt: 'desc' }
      });
      if (!template) continue;

      const displayNameRaw = String(meta.displayName || delivery.productName || template.name || 'Veículo').replace(/^Veículo comprado sem seguro:\s*/i, '').trim();
      const playerVehicle = await prisma.playerVehicle.create({
        data: {
          playerId: delivery.playerId,
          steam64: delivery.steam64,
          templateId: template.id,
          insurancePlanId: null,
          serverType: delivery.serverType || template.serverType || 'vanilla',
          displayName: displayNameRaw || template.name,
          vehicleClassname,
          ownershipType: 'OWNED',
          status: 'ACTIVE',
          expiresAt: null,
          insuranceExpiresAt: null,
          insuranceUsesWeekStart: new Date(),
          insuranceUsesThisWeek: 0,
          insuranceUsesTotal: 0,
          deliveriesCreated: 1,
          currentVehicleKey: vehicleKey,
          lastRespawnAt: delivery.createdAt || new Date(),
          currentVehicleMoving: false,
          currentVehicleOccupied: false,
          currentVehicleCanTheftClaim: true,
          currentVehicleSpeedKmh: 0
        }
      });

      await prisma.vehicleRespawnLog.create({
        data: {
          playerVehicleId: playerVehicle.id,
          playerId: delivery.playerId,
          deliveryId: delivery.id,
          action: 'BUY_BACKFILL_GARAGE_V70',
          newVehicleKey: vehicleKey,
          costCoins: 0,
          status: delivery.status === 'DELIVERED' ? 'DELIVERED' : 'PENDING'
        }
      });
    }
  } catch (err) {
    console.warn('Aviso: backfill de garagem V70 não aplicado:', err.message);
  }
}

async function applyRaidZV69CatalogCleanup() {
  // V69: deixa doações, veículos, carlock e traje FOG exatamente como solicitado.
  // Não mexe em saldos, compras, pagamentos, entregas nem garagem dos players.
  const desiredPackageByKey = new Map(defaultPackages.map((pack) => [`${Number(pack.amountBrl).toFixed(2)}:${Number(pack.coins)}`, pack]));
  const allPackages = await prisma.coinPackage.findMany({ orderBy: { createdAt: 'asc' } });
  const activePackageKeys = new Set();

  for (const pack of allPackages) {
    const key = packageKey(pack);
    const desired = desiredPackageByKey.get(key);
    if (desired && !activePackageKeys.has(key)) {
      activePackageKeys.add(key);
      await prisma.coinPackage.update({
        where: { id: pack.id },
        data: { name: desired.name, amountBrl: desired.amountBrl, coins: desired.coins, bonusText: desired.bonusText, active: true }
      });
    } else {
      await prisma.coinPackage.update({
        where: { id: pack.id },
        data: { active: false, name: String(pack.name || '').replace(/SZ/g, 'RZ'), bonusText: pack.bonusText ? String(pack.bonusText).replace(/SZ/g, 'RZ') : pack.bonusText }
      });
    }
  }

  for (const pack of defaultPackages) {
    const key = `${Number(pack.amountBrl).toFixed(2)}:${Number(pack.coins)}`;
    if (!activePackageKeys.has(key)) {
      await prisma.coinPackage.create({ data: { ...pack, active: true } });
      activePackageKeys.add(key);
    }
  }

  const desiredVehiclesBySlug = new Map(defaultVehicles.map((vehicle) => [cleanTombstoneSlug(vehicle.slug), vehicle]));
  for (const vehicle of defaultVehicles) {
    const data = {
      name: vehicle.name,
      description: vehicle.description,
      serverType: vehicle.serverType || 'vanilla',
      vehicleClassname: vehicle.vehicleClassname,
      buyPriceCoins: vehicle.buyPriceCoins || 70000,
      rent1DayCoins: 0,
      rent7DaysCoins: 0,
      rent30DaysCoins: 0,
      imageUrl: vehicle.imageUrl,
      imageData: null,
      imageMime: null,
      parts: vehicle.parts || [],
      cargoItems: vehicle.cargoItems || [],
      fluids: vehicle.fluids || { fuelPercent: 80, waterPercent: 100, oilPercent: 100 },
      variants: vehicle.variants || null,
      active: true
    };
    await prisma.vehicleTemplate.upsert({
      where: { slug: vehicle.slug },
      update: data,
      create: { ...data, slug: vehicle.slug }
    });
  }

  const oldVehicleClassnames = new Set([
    'Truck_01_Covered', 'Truck_01_Covered_Blue', 'Truck_01_Covered_Orange',
    'MSFZ_LandRover', 'MSFZ_LandRover_ind', 'MSFZ_LandRover_black'
  ]);
  const desiredClassnames = new Set(defaultVehicles.map((vehicle) => vehicle.vehicleClassname));
  const templates = await prisma.vehicleTemplate.findMany({ select: { id: true, slug: true, vehicleClassname: true } });
  for (const template of templates) {
    const slug = cleanTombstoneSlug(template.slug);
    const isDesired = desiredVehiclesBySlug.has(slug);
    const isOldDefault = oldVehicleClassnames.has(template.vehicleClassname) && !desiredClassnames.has(template.vehicleClassname);
    const isM3S = String(template.vehicleClassname || '').startsWith('Truck_01_Covered');
    const isNoGunM1025 = String(template.vehicleClassname || '').includes('TP_Apoc_M1025_NoGun');
    if (!isDesired && (isOldDefault || isM3S || isNoGunM1025)) {
      await prisma.vehicleTemplate.update({ where: { id: template.id }, data: { active: false } });
    }
  }

  const murano = vanillaProducts.find((product) => product.slug === 'murano-carlock-5k');
  if (murano) {
    const { items = [], ...productData } = murano;
    const saved = await prisma.product.upsert({
      where: { slug: murano.slug },
      update: { ...productData, imageData: null, imageMime: null, status: 'ACTIVE' },
      create: { ...productData, status: 'ACTIVE' }
    });
    await prisma.productItem.deleteMany({ where: { productId: saved.id } });
    await ensureProductItems(saved.id, saved, items);
  }

  await backfillDirectVehicleDeliveriesToGarageV70();

  await prisma.appSetting.upsert({
    where: { key: 'raidz.catalog.v70' },
    update: { value: { appliedAt: new Date().toISOString(), packages: defaultPackages.length, vehicles: defaultVehicles.length, carlock: 'MuranoCarlock', m1025Key: 'MuranoCarlock', fixes: ['modal_scroll', 'garage_for_all_vehicle_purchases', 'm1025_parts_complete'] } },
    create: { key: 'raidz.catalog.v70', value: { appliedAt: new Date().toISOString(), packages: defaultPackages.length, vehicles: defaultVehicles.length, carlock: 'MuranoCarlock', m1025Key: 'MuranoCarlock', fixes: ['modal_scroll', 'garage_for_all_vehicle_purchases', 'm1025_parts_complete'] } }
  });
}


async function applyRaidZV72CategoryCleanup() {
  // V72: organiza peças de veículos em uma categoria única e evita produto sem categoria útil.
  const vehiclePartSlugs = [
    'murano-carlock-5k','glowplug-veiculo','vela-humvee-glowplug','pneu-humvee-offroad-02','bateria-caminhao-truckbattery',
    'roda-land-rover-msfz','capo-land-rover-msfz','porta-motorista-land-rover-msfz','porta-passageiro-land-rover-msfz','porta-malas-land-rover-msfz',
    'pneu-hatchback-vanilla','pneu-caminhao-m3s','pneu-duplo-caminhao-m3s','radiador-veiculo-vanilla','bateria-carro-vanilla','vela-ignicao-vanilla'
  ];
  const vehiclePartClassnames = [
    'MuranoCarlock','GlowPlug','Offroad_02_Wheel','TruckBattery','MSFZ_LandRover_Wheel','MSFZ_LandRover_Hood','MSFZ_LandRover_Driver_Door',
    'MSFZ_LandRover_CoDriver_Door','MSFZ_LandRover_Trunk','HatchbackWheel','Truck_01_Wheel','Truck_01_WheelDouble','CarRadiator','CarBattery','SparkPlug'
  ];
  await prisma.product.updateMany({
    where: {
      OR: [
        { slug: { in: vehiclePartSlugs } },
        { classname: { in: vehiclePartClassnames } },
        { name: { contains: 'Land Rover' } },
        { name: { contains: 'Humvee' } },
        { name: { contains: 'M1025' } },
        { name: { contains: 'Radiador' } },
        { name: { contains: 'Bateria de Carro' } },
        { name: { contains: 'Vela de Ignição' } },
        { name: { contains: 'CarLock' } }
      ]
    },
    data: { category: 'Peças de Veículos' }
  });

  await prisma.product.updateMany({ where: { category: '' }, data: { category: 'Geral' } });
  await prisma.product.updateMany({ where: { category: null }, data: { category: 'Geral' } }).catch(() => {});

  await prisma.appSetting.upsert({
    where: { key: 'raidz.catalog.v72' },
    update: { value: { appliedAt: new Date().toISOString(), fixes: ['vehicle_parts_category', 'carlock_in_vehicle_parts', 'extra_vip_outfits'] } },
    create: { key: 'raidz.catalog.v72', value: { appliedAt: new Date().toISOString(), fixes: ['vehicle_parts_category', 'carlock_in_vehicle_parts', 'extra_vip_outfits'] } }
  });
}


async function applyRaidZV77OutfitImageRefresh() {
  // V77: força as imagens corretas dos trajes VIP enviados pelo usuário na loja pública.
  const outfits = [
    { slug: 'traje-vip-comando-raidz', imageUrl: '/images/outfits/traje-vip-comando-real-v79.png' },
    { slug: 'traje-vip-esquadrao-raidz', imageUrl: '/images/outfits/traje-vip-esquadrao-real-v79.png' },
    { slug: 'traje-vip-boost-raidz', imageUrl: '/images/outfits/traje-vip-boost-real-v79.png' }
  ];
  for (const outfit of outfits) {
    await prisma.outfitTemplate.updateMany({
      where: { slug: outfit.slug },
      data: { imageUrl: outfit.imageUrl, imageData: null, imageMime: null, active: true }
    });
  }
  await prisma.appSetting.upsert({
    where: { key: 'raidz.catalog.v77' },
    update: { value: { appliedAt: new Date().toISOString(), fixes: ['refresh_outfit_images_public_store'] } },
    create: { key: 'raidz.catalog.v77', value: { appliedAt: new Date().toISOString(), fixes: ['refresh_outfit_images_public_store'] } }
  });
}



function isM1025Classname(value) {
  return String(value || '').toLowerCase().includes('m1025') || String(value || '').trim() === 'Offroad_02';
}

async function applyRaidZV85M1025FullParts() {
  // V85: corrige M1025 TP_Apoc nascido sem peças usando as classes reais TP_Apoc_M1025_*.
  // Atualiza os templates do banco e também entregas pendentes já criadas,
  // reforçando meta.parts e aliases que o mod DayZ pode ler.
  const m1025Vehicles = defaultVehicles.filter((vehicle) => isM1025Classname(vehicle.vehicleClassname) || isM1025Classname(vehicle.slug));
  const byClassname = new Map(m1025Vehicles.map((vehicle) => [vehicle.vehicleClassname, vehicle]));

  for (const vehicle of m1025Vehicles) {
    await prisma.vehicleTemplate.updateMany({
      where: {
        OR: [
          { slug: vehicle.slug },
          { vehicleClassname: vehicle.vehicleClassname }
        ]
      },
      data: {
        parts: vehicle.parts || [],
        cargoItems: vehicle.cargoItems || [],
        fluids: vehicle.fluids || { fuelPercent: 80, waterPercent: 100, oilPercent: 100 },
        active: true
      }
    });
  }

  const classnames = Array.from(byClassname.keys());
  const pendingDeliveries = await prisma.deliveryQueue.findMany({
    where: {
      status: { in: ['PENDING', 'PROCESSING'] },
      OR: [
        { classname: { in: classnames } },
        { productName: { contains: 'M1025' } },
        { productName: { contains: 'Humvee' } }
      ]
    }
  });

  for (const delivery of pendingDeliveries) {
    const meta = delivery.meta && typeof delivery.meta === 'object' && !Array.isArray(delivery.meta) ? delivery.meta : {};
    const metaClass = String(meta.vehicleClassname || '').trim();
    const vehicle = byClassname.get(delivery.classname) || byClassname.get(metaClass) || m1025Vehicles.find((item) => String(delivery.productName || '').toLowerCase().includes(String(item.name || '').toLowerCase().slice(0, 8))) || m1025Vehicles[0];
    if (!vehicle) continue;
    const payload = vehicleTemplatePayload(vehicle);
    await prisma.deliveryQueue.update({
      where: { id: delivery.id },
      data: {
        classname: payload.vehicleClassname || delivery.classname,
        deliveryType: 'drop_at_feet',
        meta: {
          ...meta,
          ...payload,
          kind: meta.kind || 'vehicle_rental',
          deliveryMode: 'vehicle_full_mounted',
          fullVehicle: true,
          mounted: true,
          shouldMountParts: true,
          m1025FullPartsFix: 'v85'
        }
      }
    });
  }

  await prisma.appSetting.upsert({
    where: { key: 'raidz.catalog.v85.m1025_full_parts' },
    update: { value: { appliedAt: new Date().toISOString(), vehicles: m1025Vehicles.length, pendingDeliveriesFixed: pendingDeliveries.length, fixes: ['m1025_tp_apoc_custom_parts', 'm1025_hood_body', 'm1025_slot_aliases', 'm1025_wheels'] } },
    create: { key: 'raidz.catalog.v85.m1025_full_parts', value: { appliedAt: new Date().toISOString(), vehicles: m1025Vehicles.length, pendingDeliveriesFixed: pendingDeliveries.length, fixes: ['m1025_tp_apoc_custom_parts', 'm1025_hood_body', 'm1025_slot_aliases', 'm1025_wheels'] } }
  });
}

async function applyRaidZV103VehicleAccessoriesToPlayerInventory() {
  // V103: remove as tentativas antigas de colocar Murano/H7 no veículo e cria
  // entregas independentes direcionadas ao inventário do jogador para compras,
  // seguros e reposições administrativas.
  const templates = await prisma.vehicleTemplate.findMany({
    select: { id: true, vehicleClassname: true, parts: true, cargoItems: true }
  });
  let templatesUpdated = 0;

  for (const template of templates) {
    const fixed = ensureVehicleRequiredEquipment(template);
    const oldParts = Array.isArray(template.parts) ? template.parts : [];
    const oldCargo = Array.isArray(template.cargoItems) ? template.cargoItems : [];
    if (JSON.stringify(oldParts) === JSON.stringify(fixed.parts) && JSON.stringify(oldCargo) === JSON.stringify(fixed.cargoItems)) continue;
    await prisma.vehicleTemplate.update({
      where: { id: template.id },
      data: { parts: fixed.parts, cargoItems: fixed.cargoItems }
    });
    templatesUpdated++;
  }

  const pendingDeliveries = await prisma.deliveryQueue.findMany({
    where: { status: { in: ['PENDING', 'PROCESSING'] } },
    orderBy: { createdAt: 'desc' },
    take: 5000
  });

  const existingAccessoryDeliveries = await prisma.deliveryQueue.findMany({
    where: {
      classname: 'HeadlightH7',
      productName: { contains: 'Acessório do veículo' }
    },
    select: { meta: true },
    take: 20000
  });
  const accessoryParents = new Set();
  for (const row of existingAccessoryDeliveries) {
    const meta = row.meta && typeof row.meta === 'object' && !Array.isArray(row.meta) ? row.meta : {};
    if (String(meta.kind || '').trim().toLowerCase() !== 'vehicle_player_inventory_accessory') continue;
    if (meta.parentVehicleDeliveryId) accessoryParents.add(String(meta.parentVehicleDeliveryId));
  }

  let pendingVehicleDeliveriesUpdated = 0;
  let accessoryDeliveriesCreated = 0;

  for (const delivery of pendingDeliveries) {
    const meta = delivery.meta && typeof delivery.meta === 'object' && !Array.isArray(delivery.meta) ? delivery.meta : {};
    const kind = String(meta.kind || '').trim().toLowerCase();
    const name = String(delivery.productName || '').toLowerCase();
    const isVehicleDelivery = kind === 'vehicle_rental'
      || kind === 'vehicle_direct_purchase'
      || Boolean(meta.vehicleClassname)
      || name.includes('veículo')
      || name.includes('veiculo');
    if (!isVehicleDelivery || kind === 'vehicle_player_inventory_accessory') continue;

    const sourceTemplate = {
      vehicleClassname: meta.vehicleClassname || delivery.classname,
      parts: meta.parts || meta.vehicleParts || meta.attachments || [],
      cargoItems: meta.cargoItems || meta.vehicleCargoItems || meta.trunkItems || meta.itemsInsideVehicle || meta.inventoryItems || meta.storageItems || meta.items || [],
      fluids: meta.fluids || { fuelPercent: 80, waterPercent: 100, oilPercent: 100 }
    };
    const payload = vehicleTemplatePayload(sourceTemplate);
    const alreadyFixed = meta.requiredEquipmentFix === 'v103_player_inventory_accessories'
      && delivery.deliveryType === 'drop_at_feet'
      && JSON.stringify(meta.parts || []) === JSON.stringify(payload.parts || [])
      && JSON.stringify(meta.cargoItems || []) === JSON.stringify(payload.cargoItems || []);

    if (!alreadyFixed) {
      await prisma.deliveryQueue.update({
        where: { id: delivery.id },
        data: {
          deliveryType: 'drop_at_feet',
          meta: {
            ...meta,
            ...payload,
            vehicleClassname: payload.vehicleClassname || delivery.classname,
            deliveryMode: 'vehicle_full_mounted',
            fullVehicle: true,
            mounted: true,
            shouldMountParts: true,
            requiredEquipmentFix: 'v103_player_inventory_accessories'
          }
        }
      });
      pendingVehicleDeliveriesUpdated++;
    }

    if (!accessoryParents.has(delivery.id)) {
      const accessories = await createVehiclePlayerInventoryAccessoryDeliveries({
        tx: prisma,
        playerId: delivery.playerId,
        steam64: delivery.steam64,
        serverType: delivery.serverType,
        action: meta.action || 'PENDING_VEHICLE',
        parentDeliveryId: delivery.id,
        playerVehicleId: meta.playerVehicleId || null,
        displayName: meta.displayName || delivery.productName || 'Veículo'
      });
      accessoryDeliveriesCreated += accessories.length;
      accessoryParents.add(delivery.id);
    }
  }

  await prisma.appSetting.upsert({
    where: { key: 'raidz.catalog.v103.vehicle_accessories_player_inventory' },
    update: {
      value: {
        appliedAt: new Date().toISOString(),
        templatesUpdated,
        pendingVehicleDeliveriesUpdated,
        accessoryDeliveriesCreated,
        playerInventoryItems: [{ classname: 'HeadlightH7', quantity: 2 }],
        ftpMode: 'background_immediate_queue',
        appliesTo: ['BUY', 'RESPAWN', 'ADMIN_RESPAWN', 'ADMIN_RESTORE_MISSING', 'PENDING_DELIVERY']
      }
    },
    create: {
      key: 'raidz.catalog.v103.vehicle_accessories_player_inventory',
      value: {
        appliedAt: new Date().toISOString(),
        templatesUpdated,
        pendingVehicleDeliveriesUpdated,
        accessoryDeliveriesCreated,
        playerInventoryItems: [{ classname: 'HeadlightH7', quantity: 2 }],
        ftpMode: 'background_immediate_queue',
        appliesTo: ['BUY', 'RESPAWN', 'ADMIN_RESPAWN', 'ADMIN_RESTORE_MISSING', 'PENDING_DELIVERY']
      }
    }
  });
}

function detectAvatarMimeFromBase64(value = '') {
  try {
    const buffer = Buffer.from(String(value || '').slice(0, 256), 'base64');
    if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]))) return 'image/png';
    if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg';
    if (buffer.length >= 6 && ['GIF87a','GIF89a'].includes(buffer.subarray(0, 6).toString('ascii'))) return 'image/gif';
    if (buffer.length >= 12 && buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP') return 'image/webp';
  } catch {}
  return 'image/png';
}

async function applyRaidZV113RepairPlayerAvatarMime() {
  const players = await prisma.player.findMany({
    where: { avatarData: { not: null } },
    select: { id: true, avatarData: true, avatarMime: true }
  });
  let repaired = 0;
  for (const player of players) {
    if (String(player.avatarMime || '').trim()) continue;
    await prisma.player.update({
      where: { id: player.id },
      data: { avatarMime: detectAvatarMimeFromBase64(player.avatarData) }
    });
    repaired += 1;
  }
  await prisma.appSetting.upsert({
    where: { key: 'raidz.catalog.v113.avatar_mime_repair' },
    update: { value: { appliedAt: new Date().toISOString(), repaired } },
    create: { key: 'raidz.catalog.v113.avatar_mime_repair', value: { appliedAt: new Date().toISOString(), repaired } }
  });
}

async function applyRaidZV113PersonalizedVipClanOwners() {
  // Os dois trajes personalizados existentes pertencem a clãs. Mantemos todos os
  // Steam64 e acessos salvos e apenas mudamos o modo de gerenciamento para CLAN.
  const configs = [
    { slug: 'traje-vip-privado-stz', tag: 'STZ', name: 'STZ' },
    { slug: 'traje-ocl-streamer', tag: 'OCL', name: 'OCL' }
  ];
  const updated = [];
  for (const config of configs) {
    const outfit = await prisma.outfitTemplate.findUnique({ where: { slug: config.slug } });
    if (!outfit?.managedOwnerSteam64) continue;
    const saved = await prisma.outfitTemplate.update({
      where: { id: outfit.id },
      data: {
        isPrivate: true,
        active: true,
        managedAccessEnabled: true,
        managedOwnerType: 'CLAN',
        // Mantém gratuito se já era gratuito. O ADM pode mudar para 20.000/mês.
        memberMonthlyPriceCoins: Math.max(0, Number(outfit.memberMonthlyPriceCoins || 0))
      }
    });
    updated.push({ id: saved.id, slug: saved.slug, ownerSteam64: saved.managedOwnerSteam64, tag: config.tag, name: config.name });
  }
  await prisma.appSetting.upsert({
    where: { key: 'raidz.catalog.v113.personalized_vip_clans' },
    update: { value: { appliedAt: new Date().toISOString(), outfits: updated } },
    create: { key: 'raidz.catalog.v113.personalized_vip_clans', value: { appliedAt: new Date().toISOString(), outfits: updated } }
  });
}

async function applyRaidZV113RemoveMuranoFromVehicles() {
  // O mod do veículo agora cria/instala o MuranoCarlock. O site não deve mais
  // incluir CarLock em compra, seguro, reposição ou entrega pendente de veículo.
  const templates = await prisma.vehicleTemplate.findMany({
    select: { id: true, description: true, parts: true, cargoItems: true }
  });
  let templatesUpdated = 0;

  for (const template of templates) {
    const fixed = ensureVehicleRequiredEquipment(template);
    let description = String(template.description || '');
    description = description
      .replace(/MuranoCarlock\s*e\s*2\s*lâmpadas\s*H7\s*são enviados separadamente ao inventário do jogador,?\s*sem chave antiga\.?/gi, '2 lâmpadas H7 são enviadas separadamente ao inventário do jogador. O MuranoCarlock é instalado pelo mod do veículo.')
      .replace(/MuranoCarlock\s*e\s*2\s*lâmpadas\s*H7\s*são enviados separadamente ao inventário do jogador\.?/gi, '2 lâmpadas H7 são enviadas separadamente ao inventário do jogador. O MuranoCarlock é instalado pelo mod do veículo.')
      .replace(/\s{2,}/g, ' ')
      .trim();

    const partsChanged = JSON.stringify(Array.isArray(template.parts) ? template.parts : []) !== JSON.stringify(fixed.parts);
    const cargoChanged = JSON.stringify(Array.isArray(template.cargoItems) ? template.cargoItems : []) !== JSON.stringify(fixed.cargoItems);
    const descriptionChanged = description !== String(template.description || '');
    if (!partsChanged && !cargoChanged && !descriptionChanged) continue;

    await prisma.vehicleTemplate.update({
      where: { id: template.id },
      data: {
        parts: fixed.parts,
        cargoItems: fixed.cargoItems,
        ...(descriptionChanged ? { description: description || null } : {})
      }
    });
    templatesUpdated += 1;
  }

  const removedPendingMurano = await prisma.deliveryQueue.deleteMany({
    where: {
      classname: 'MuranoCarlock',
      status: { in: ['PENDING', 'PROCESSING'] },
      productName: { contains: 'Acessório do veículo' }
    }
  });

  await prisma.appSetting.upsert({
    where: { key: 'raidz.catalog.v113.murano_by_vehicle_mod' },
    update: {
      value: {
        appliedAt: new Date().toISOString(),
        templatesUpdated,
        removedPendingMuranoDeliveries: removedPendingMurano.count,
        websiteVehicleAccessories: [{ classname: 'HeadlightH7', quantity: 2 }],
        muranoSource: 'vehicle_mod'
      }
    },
    create: {
      key: 'raidz.catalog.v113.murano_by_vehicle_mod',
      value: {
        appliedAt: new Date().toISOString(),
        templatesUpdated,
        removedPendingMuranoDeliveries: removedPendingMurano.count,
        websiteVehicleAccessories: [{ classname: 'HeadlightH7', quantity: 2 }],
        muranoSource: 'vehicle_mod'
      }
    }
  });
}

async function applyRaidZV80CleanPublicCategories() {
  // V80: remove a aba "Todas", cria/garante "Peças de Veículos" e manda itens sem categoria para "Diversos".
  const strip = (value) => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase().replace(/\s+/g, ' ');
  const canonical = (value) => {
    const raw = String(value || '').trim().replace(/\s+/g, ' ');
    const key = strip(raw);
    if (!key || key === 'geral' || key === 'geral dayz' || key === 'itens da loja' || key === 'sem categoria') return 'Diversos';
    if (key === 'todas' || key === 'todos') return '';
    if (key === 'equipamento') return 'Equipamentos';
    if ((key.includes('peca') && key.includes('veicul')) || key === 'pecas') return 'Peças de Veículos';
    if (key === 'veiculos disponiveis' || key === 'veiculo') return 'Veículos';
    return raw;
  };

  const vehiclePartSlugs = [
    'murano-carlock-5k','glowplug-veiculo','vela-humvee-glowplug','pneu-humvee-offroad-02','bateria-caminhao-truckbattery',
    'roda-land-rover-msfz','capo-land-rover-msfz','porta-motorista-land-rover-msfz','porta-passageiro-land-rover-msfz','porta-malas-land-rover-msfz',
    'pneu-hatchback-vanilla','pneu-caminhao-m3s','pneu-duplo-caminhao-m3s','radiador-veiculo-vanilla','bateria-carro-vanilla','vela-ignicao-vanilla'
  ];
  const vehiclePartClassnames = [
    'MuranoCarlock','GlowPlug','Offroad_02_Wheel','TruckBattery','MSFZ_LandRover_Wheel','MSFZ_LandRover_Hood','MSFZ_LandRover_Driver_Door',
    'MSFZ_LandRover_CoDriver_Door','MSFZ_LandRover_Trunk','HatchbackWheel','Hatchback_02_Wheel','CivSedanWheel','Sedan_02_Wheel',
    'Truck_01_Wheel','Truck_01_WheelDouble','Truck_01_Hood','Truck_01_Door_1_1','Truck_01_Door_2_1','CarRadiator','CarBattery','TruckBattery','SparkPlug'
  ];

  await prisma.product.updateMany({
    where: {
      OR: [
        { slug: { in: vehiclePartSlugs } },
        { classname: { in: vehiclePartClassnames } },
        { classname: { contains: 'Wheel' } },
        { classname: { contains: 'LandRover' } },
        { classname: { contains: 'HMMWV' } },
        { name: { contains: 'Pneu' } },
        { name: { contains: 'Roda' } },
        { name: { contains: 'Land Rover' } },
        { name: { contains: 'Humvee' } },
        { name: { contains: 'M1025' } },
        { name: { contains: 'Radiador' } },
        { name: { contains: 'Bateria de Carro' } },
        { name: { contains: 'Bateria de Caminhão' } },
        { name: { contains: 'Vela de Ignição' } },
        { name: { contains: 'Glow Plug' } },
        { name: { contains: 'CarLock' } }
      ]
    },
    data: { category: 'Peças de Veículos' }
  });

  await prisma.product.updateMany({ where: { category: { in: ['', 'Geral', 'Geral DayZ', 'Itens da Loja', 'Sem categoria'] } }, data: { category: 'Diversos' } });
  await prisma.product.updateMany({ where: { category: null }, data: { category: 'Diversos' } }).catch(() => {});

  const desired = [
    { name: 'Kits Base', serverType: 'vanilla', order: 10, active: true },
    { name: 'Veículos', serverType: 'vanilla', order: 15, active: true },
    { name: 'Peças de Veículos', serverType: 'vanilla', order: 18, active: true },
    { name: 'Trajes VIPs', serverType: 'vanilla', order: 20, active: true },
    { name: 'Saco de Dormir', serverType: 'vanilla', order: 25, active: true },
    { name: 'Construção', serverType: 'vanilla', order: 30, active: true },
    { name: 'Ferramentas', serverType: 'vanilla', order: 40, active: true },
    { name: 'Suprimentos', serverType: 'vanilla', order: 50, active: true },
    { name: 'Armazenamento', serverType: 'vanilla', order: 60, active: true },
    { name: 'Diversos', serverType: 'vanilla', order: 90, active: true }
  ];

  const setting = await prisma.appSetting.findUnique({ where: { key: 'store_categories_v1' } });
  const current = Array.isArray(setting?.value?.categories) ? setting.value.categories : [];
  const byKey = new Map();
  for (const cat of current) {
    const name = canonical(cat?.name);
    if (!name) continue;
    const key = strip(name);
    if (!byKey.has(key)) byKey.set(key, { ...cat, name, serverType: cat?.serverType || 'vanilla', active: cat?.active !== false });
  }
  for (const cat of desired) {
    const key = strip(cat.name);
    byKey.set(key, { ...(byKey.get(key) || {}), ...cat });
  }
  const categories = Array.from(byKey.values()).sort((a, b) => Number(a.order || 999) - Number(b.order || 999) || String(a.name).localeCompare(String(b.name), 'pt-BR'));
  await prisma.appSetting.upsert({
    where: { key: 'store_categories_v1' },
    update: { value: { categories } },
    create: { key: 'store_categories_v1', value: { categories } }
  });

  await prisma.appSetting.upsert({
    where: { key: 'raidz.catalog.v80' },
    update: { value: { appliedAt: new Date().toISOString(), fixes: ['remove_todas_tab', 'vehicle_parts_public_category', 'uncategorized_to_diversos'] } },
    create: { key: 'raidz.catalog.v80', value: { appliedAt: new Date().toISOString(), fixes: ['remove_todas_tab', 'vehicle_parts_public_category', 'uncategorized_to_diversos'] } }
  });
}


const RAIDZ_V86_MEDICAL_OUTFIT_CLASSNAMES = new Set([
  'tetracyclineantibiotics',
  'morphine',
  'morphineautoinjector',
  'epinephrine',
  'epinephrineautoinjector',
  'painkillertablets',
  'charcoaltablets',
  'vitaminbottle',
  'salinebag',
  'salinebagiv',
  'bloodbagempty',
  'bloodbagfull',
  'bloodbagiv',
  'startkitiv'
]);

function isRaidZV86MedicalOutfitItem(item) {
  const classname = String(item?.classname || '').trim().toLowerCase();
  const label = String(item?.label || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
  if (!classname) return false;
  if (RAIDZ_V86_MEDICAL_OUTFIT_CLASSNAMES.has(classname)) return true;
  // Bandagem fica: o pedido foi para remover remédios, não curativo básico.
  if (classname.includes('bandage') || label.includes('bandagem')) return false;
  return label.includes('remedio')
    || label.includes('morfina')
    || label.includes('morphine')
    || label.includes('tetraciclina')
    || label.includes('tetracycline')
    || label.includes('antibiotico')
    || label.includes('antibiotic')
    || label.includes('comprimido');
}

function raidZV86OutfitItems(items = []) {
  const list = Array.isArray(items) ? items : [];
  return list
    .filter((item) => !isRaidZV86MedicalOutfitItem(item))
    .map((item, index) => ({
      slot: String(item?.slot || 'inventory').trim() || 'inventory',
      classname: String(item?.classname || '').trim(),
      quantity: Math.max(1, Math.min(Number(item?.quantity || 1), 999)),
      label: String(item?.label || item?.classname || '').trim() || null,
      sortOrder: Number.isFinite(Number(item?.sortOrder)) ? Number(item.sortOrder) : index
    }))
    .filter((item) => item.classname);
}

function raidZV86StarterKitItems() {
  return (starterKitConfig.items || []).map((item, index) => ({
    classname: String(item.classname || '').trim(),
    quantity: Math.max(1, Math.min(Number(item.quantity || 1), 999)),
    label: String(item.label || item.classname || '').trim(),
    sortOrder: Number.isFinite(Number(item.sortOrder)) ? Number(item.sortOrder) : index
  })).filter((item) => item.classname);
}

async function applyRaidZV86VipStarterKitFix() {
  // V86: corrige trajes VIP incompletos, remove remédios dos VIPs e troca o kit inicial
  // para 2 fardos de tábuas com 10 cada. Não mexe em saldo, compras, pagamentos ou garagem.
  const defaultBySlug = new Map(defaultOutfitTemplates.map((outfit) => [outfit.slug, outfit]));
  let defaultOutfitsFixed = 0;
  let customOutfitsCleaned = 0;

  for (const outfit of defaultOutfitTemplates) {
    const fixedItems = raidZV86OutfitItems(outfit.items);
    const result = await prisma.outfitTemplate.updateMany({
      where: { slug: outfit.slug },
      data: {
        description: outfit.description || null,
        items: fixedItems,
        active: true
      }
    });
    defaultOutfitsFixed += Number(result.count || 0);
  }

  const outfits = await prisma.outfitTemplate.findMany({ select: { id: true, slug: true, items: true } });
  for (const outfit of outfits) {
    if (defaultBySlug.has(outfit.slug)) continue;
    const before = Array.isArray(outfit.items) ? outfit.items : [];
    const after = raidZV86OutfitItems(before);
    if (after.length !== before.length) {
      await prisma.outfitTemplate.update({ where: { id: outfit.id }, data: { items: after } });
      customOutfitsCleaned++;
    }
  }

  const starterItems = raidZV86StarterKitItems();
  const v92StarterMarker = await prisma.appSetting.findUnique({ where: { key: 'raidz.catalog.v92.private_vip' } });
  const shouldApplyV92StarterFix = !v92StarterMarker;
  const starterSetting = await prisma.appSetting.findUnique({ where: { key: 'starterKit.v1' } });
  const currentStarter = starterSetting?.value && typeof starterSetting.value === 'object' && !Array.isArray(starterSetting.value)
    ? starterSetting.value
    : {};
  const fixedStarterKit = {
    ...starterKitConfig,
    ...currentStarter,
    enabled: currentStarter.enabled === undefined ? starterKitConfig.enabled : Boolean(currentStarter.enabled),
    name: String(currentStarter.name || starterKitConfig.name || 'Kit Inicial Vanilla').trim(),
    description: String(currentStarter.description || starterKitConfig.description || '').trim(),
    serverType: String(currentStarter.serverType || starterKitConfig.serverType || 'vanilla').trim(),
    bonusCoins: Number(currentStarter.bonusCoins ?? starterKitConfig.bonusCoins ?? 0),
    deliveryType: shouldApplyV92StarterFix ? 'drop_at_feet' : (currentStarter.deliveryType || 'drop_at_feet'),
    imageUrl: String(currentStarter.imageUrl || starterKitConfig.imageUrl || '').trim(),
    imageData: currentStarter.imageData || null,
    imageMime: currentStarter.imageMime || null,
    imageUpdatedAt: currentStarter.imageUpdatedAt || null,
    items: shouldApplyV92StarterFix
      ? starterItems
      : (Array.isArray(currentStarter.items) && currentStarter.items.length ? currentStarter.items : starterItems)
  };

  await prisma.appSetting.upsert({
    where: { key: 'starterKit.v1' },
    update: { value: fixedStarterKit },
    create: { key: 'starterKit.v1', value: fixedStarterKit }
  });

  // V95: não altera nem complementa entregas de players que já resgataram.
  // A configuração corrigida vale somente para novos resgates.
  const pendingPlankDeliveriesFixed = 0;
  const pendingLogDeliveriesFixed = 0;

  await prisma.appSetting.upsert({
    where: { key: 'raidz.catalog.v86.vip_starter_fix' },
    update: {
      value: {
        appliedAt: new Date().toISOString(),
        defaultOutfitsFixed,
        customOutfitsCleaned,
        pendingPlankDeliveriesFixed,
        pendingLogDeliveriesFixed,
        fixes: ['vip_outfits_complete_items', 'vip_medicines_removed', 'starter_kit_20_planks_4_logs']
      }
    },
    create: {
      key: 'raidz.catalog.v86.vip_starter_fix',
      value: {
        appliedAt: new Date().toISOString(),
        defaultOutfitsFixed,
        customOutfitsCleaned,
        pendingPlankDeliveriesFixed,
        pendingLogDeliveriesFixed,
        fixes: ['vip_outfits_complete_items', 'vip_medicines_removed', 'starter_kit_20_planks_4_logs']
      }
    }
  });
}

const RAIDZ_V92_REMOVED_OUTFIT_SLUGS = [
  'traje-vip-basico',
  'traje-vip-explorador',
  'traje-vip-cacador',
  'traje-vip-militar',
  'traje-vip-elite-player'
];

const RAIDZ_V92_PRIVATE_STZ_MEMBERS = [
  { nickname: '[STZ] ChoraNaum', steam64: '76561199498211298' },
  { nickname: '[STZ] Naksu', steam64: '76561199815970767' },
  { nickname: '[STZ] PeDeCoelho', steam64: '76561198298054615' },
  { nickname: '[STZ] CapTowers', steam64: '76561198859200077' },
  { nickname: '[STZ] Xiqui Xiqui', steam64: '76561199328121792' },
  { nickname: '[STZ] Barba', steam64: '76561198155183501' },
  { nickname: '[STZ] DEXX1', steam64: '76561198116435991' }
];

async function applyRaidZV92PrivateVipSetup() {
  const existingMarker = await prisma.appSetting.findUnique({ where: { key: 'raidz.catalog.v92.private_vip' } });
  // Remove os cinco trajes antigos da loja sem apagar histórico de compras/assinaturas.
  await prisma.outfitTemplate.updateMany({
    where: { slug: { in: RAIDZ_V92_REMOVED_OUTFIT_SLUGS } },
    data: { active: false, streamerRewardEnabled: false }
  });

  const privateOutfit = await prisma.outfitTemplate.findUnique({
    where: { slug: 'traje-vip-privado-stz' }
  });

  let assigned = Number(existingMarker?.value?.assignedMembers || 0);
  if (privateOutfit) {
    await prisma.outfitTemplate.update({
      where: { id: privateOutfit.id },
      data: { isPrivate: true, active: true, priceCoins: 0, streamerRewardEnabled: false }
    });
    if (!existingMarker) {
      const result = await assignPrivateVipMembers({
        outfitId: privateOutfit.id,
        members: RAIDZ_V92_PRIVATE_STZ_MEMBERS,
        actor: 'bootstrap-v92'
      });
      assigned = result.assigned.length;
    }
  }

  // A linha do Higor enviada na imagem tem 20 dígitos e não é um Steam64 válido.
  // Ela fica registrada no painel de versão para o ADM corrigir sem o sistema adivinhar o ID.
  await prisma.appSetting.upsert({
    where: { key: 'raidz.catalog.v92.private_vip' },
    update: {
      value: {
        appliedAt: new Date().toISOString(),
        removedOutfitSlugs: RAIDZ_V92_REMOVED_OUTFIT_SLUGS,
        privateOutfitSlug: 'traje-vip-privado-stz',
        assignedMembers: assigned,
        invalidProvidedSteam64: ['76561199180202004429'],
        privateRule: 'PRIVATE_LIFETIME blocks PURCHASE and STREAMER_REWARD while active',
        starterKit: ['WoodenPlank x20', 'WoodenLog x4', 'Pliers x1', 'MetalWire x1']
      }
    },
    create: {
      key: 'raidz.catalog.v92.private_vip',
      value: {
        appliedAt: new Date().toISOString(),
        removedOutfitSlugs: RAIDZ_V92_REMOVED_OUTFIT_SLUGS,
        privateOutfitSlug: 'traje-vip-privado-stz',
        assignedMembers: assigned,
        invalidProvidedSteam64: ['76561199180202004429'],
        privateRule: 'PRIVATE_LIFETIME blocks PURCHASE and STREAMER_REWARD while active',
        starterKit: ['WoodenPlank x20', 'WoodenLog x4', 'Pliers x1', 'MetalWire x1']
      }
    }
  });
}



const RAIDZ_V93_STARTER_UNIT_FIX_KEY = 'raidz.catalog.v93.starter_unit_deliveries';

async function applyRaidZV93StarterUnitDeliveryFix() {
  const marker = await prisma.appSetting.findUnique({ where: { key: RAIDZ_V93_STARTER_UNIT_FIX_KEY } });
  if (marker) return;

  // Mantém o Kit Inicial correto para novos resgates, sem criar complemento
  // para quem já resgatou e sem alterar entregas antigas.
  const starterSetting = await prisma.appSetting.findUnique({ where: { key: 'starterKit.v1' } });
  const currentStarter = starterSetting?.value && typeof starterSetting.value === 'object' && !Array.isArray(starterSetting.value)
    ? starterSetting.value
    : {};
  const fixedStarterKit = {
    ...starterKitConfig,
    ...currentStarter,
    enabled: currentStarter.enabled === undefined ? starterKitConfig.enabled : Boolean(currentStarter.enabled),
    name: String(currentStarter.name || starterKitConfig.name || 'Kit Inicial Vanilla').trim(),
    description: String(currentStarter.description || starterKitConfig.description || '').trim(),
    serverType: String(currentStarter.serverType || starterKitConfig.serverType || 'vanilla').trim(),
    bonusCoins: Number(currentStarter.bonusCoins ?? starterKitConfig.bonusCoins ?? 0),
    deliveryType: 'drop_at_feet',
    imageUrl: String(currentStarter.imageUrl || starterKitConfig.imageUrl || '').trim(),
    imageData: currentStarter.imageData || null,
    imageMime: currentStarter.imageMime || null,
    imageUpdatedAt: currentStarter.imageUpdatedAt || null,
    items: raidZV86StarterKitItems()
  };

  await prisma.appSetting.upsert({
    where: { key: 'starterKit.v1' },
    update: { value: fixedStarterKit },
    create: { key: 'starterKit.v1', value: fixedStarterKit }
  });

  await prisma.appSetting.create({
    data: {
      key: RAIDZ_V93_STARTER_UNIT_FIX_KEY,
      value: {
        appliedAt: new Date().toISOString(),
        starterKit: ['20 delivery rows of WoodenPlank x1', '4 delivery rows of WoodenLog x1'],
        retroactiveCompensationEnabled: false,
        note: 'Configuração aplicada somente a novos resgates.'
      }
    }
  });
}

const RAIDZ_V94_STARTER_MISSING_ITEMS_FIX_KEY = 'raidz.catalog.v94.starter_logs_pliers_wire';

async function applyRaidZV94StarterMissingItemsFix() {
  const existingMarker = await prisma.appSetting.findUnique({
    where: { key: RAIDZ_V94_STARTER_MISSING_ITEMS_FIX_KEY }
  });
  if (existingMarker) return;

  // Atualiza apenas a configuração usada nos próximos resgates.
  // Não cria entregas para quem já pegou o Kit Inicial.
  const starterSetting = await prisma.appSetting.findUnique({ where: { key: 'starterKit.v1' } });
  const currentStarter = starterSetting?.value && typeof starterSetting.value === 'object' && !Array.isArray(starterSetting.value)
    ? starterSetting.value
    : {};
  const fixedStarterKit = {
    ...starterKitConfig,
    ...currentStarter,
    enabled: currentStarter.enabled === undefined ? starterKitConfig.enabled : Boolean(currentStarter.enabled),
    name: String(currentStarter.name || starterKitConfig.name || 'Kit Inicial Vanilla').trim(),
    description: String(currentStarter.description || starterKitConfig.description || '').trim(),
    serverType: String(currentStarter.serverType || starterKitConfig.serverType || 'vanilla').trim(),
    bonusCoins: Number(currentStarter.bonusCoins ?? starterKitConfig.bonusCoins ?? 0),
    deliveryType: 'drop_at_feet',
    imageUrl: String(currentStarter.imageUrl || starterKitConfig.imageUrl || '').trim(),
    imageData: currentStarter.imageData || null,
    imageMime: currentStarter.imageMime || null,
    imageUpdatedAt: currentStarter.imageUpdatedAt || null,
    items: raidZV86StarterKitItems()
  };

  await prisma.appSetting.upsert({
    where: { key: 'starterKit.v1' },
    update: { value: fixedStarterKit },
    create: { key: 'starterKit.v1', value: fixedStarterKit }
  });

  await prisma.appSetting.create({
    data: {
      key: RAIDZ_V94_STARTER_MISSING_ITEMS_FIX_KEY,
      value: {
        appliedAt: new Date().toISOString(),
        starterKit: ['WoodenPlank x20', 'WoodenLog x4', 'Pliers x1', 'MetalWire x1'],
        retroactiveCompensationEnabled: false,
        note: 'Somente novos resgates recebem a lista atualizada.'
      }
    }
  });
}

const RAIDZ_V95_DISABLE_STARTER_BACKFILL_KEY = 'raidz.catalog.v95.disable_starter_backfill';

async function applyRaidZV95DisableStarterBackfill() {
  const existingMarker = await prisma.appSetting.findUnique({
    where: { key: RAIDZ_V95_DISABLE_STARTER_BACKFILL_KEY }
  });
  if (existingMarker) return;

  // Caso V93/V94 tenha sido publicada antes, remove somente compensações automáticas
  // ainda pendentes. Entregas normais e itens já entregues não são alterados.
  const pendingStarterRows = await prisma.deliveryQueue.findMany({
    where: {
      status: { in: ['PENDING', 'PROCESSING'] },
      productName: { contains: '[KIT INICIAL]' }
    },
    select: { id: true, meta: true }
  });

  const autoCompensationIds = pendingStarterRows
    .filter((row) => {
      const meta = row.meta && typeof row.meta === 'object' && !Array.isArray(row.meta) ? row.meta : {};
      return meta.v93StarterCompensation === true || meta.v94StarterCompensation === true;
    })
    .map((row) => row.id);

  if (autoCompensationIds.length) {
    await prisma.deliveryQueue.deleteMany({
      where: { id: { in: autoCompensationIds } }
    });
  }

  await prisma.appSetting.create({
    data: {
      key: RAIDZ_V95_DISABLE_STARTER_BACKFILL_KEY,
      value: {
        appliedAt: new Date().toISOString(),
        retroactiveCompensationEnabled: false,
        pendingAutomaticCompensationsRemoved: autoCompensationIds.length,
        note: 'Kit atualizado somente para novos resgates.'
      }
    }
  });
}

const RAIDZ_V96_STARTER_FAST_FTP_FIX_KEY = 'raidz.catalog.v96.starter_fast_ftp';

async function applyRaidZV96StarterFastFtpFix() {
  const existingMarker = await prisma.appSetting.findUnique({
    where: { key: RAIDZ_V96_STARTER_FAST_FTP_FIX_KEY }
  });
  if (existingMarker) return;

  // V96: força uma vez a lista correta para novos resgates. Isso contorna os
  // marcadores antigos V93/V94 que podiam existir enquanto starterKit.v1 ainda
  // estava com a lista anterior salva no banco. Não cria compensação nem mexe
  // em quem já resgatou.
  const starterSetting = await prisma.appSetting.findUnique({ where: { key: 'starterKit.v1' } });
  const currentStarter = starterSetting?.value && typeof starterSetting.value === 'object' && !Array.isArray(starterSetting.value)
    ? starterSetting.value
    : {};
  const correctItems = raidZV86StarterKitItems();
  const fixedStarterKit = {
    ...starterKitConfig,
    ...currentStarter,
    enabled: currentStarter.enabled === undefined ? starterKitConfig.enabled : Boolean(currentStarter.enabled),
    name: String(currentStarter.name || starterKitConfig.name || 'Kit Inicial Vanilla').trim(),
    description: String(currentStarter.description || starterKitConfig.description || '').trim(),
    serverType: String(currentStarter.serverType || starterKitConfig.serverType || 'vanilla').trim(),
    bonusCoins: Number(currentStarter.bonusCoins ?? starterKitConfig.bonusCoins ?? 0),
    deliveryType: 'drop_at_feet',
    imageUrl: String(currentStarter.imageUrl || starterKitConfig.imageUrl || '').trim(),
    imageData: currentStarter.imageData || null,
    imageMime: currentStarter.imageMime || null,
    imageUpdatedAt: currentStarter.imageUpdatedAt || null,
    items: correctItems
  };

  await prisma.appSetting.upsert({
    where: { key: 'starterKit.v1' },
    update: { value: fixedStarterKit },
    create: { key: 'starterKit.v1', value: fixedStarterKit }
  });

  await prisma.appSetting.create({
    data: {
      key: RAIDZ_V96_STARTER_FAST_FTP_FIX_KEY,
      value: {
        appliedAt: new Date().toISOString(),
        starterKit: [
          'Barrel_Red x1', 'NailBox x1', 'Shovel x1', 'CodeLock x1',
          'Rope x1', 'Hatchet x1', 'Pliers x1', 'MetalWire x1',
          'WoodenPlank x20', 'WoodenLog x4'
        ],
        ftpMode: 'immediate_after_claim',
        databaseInsertMode: 'single_createMany',
        retroactiveCompensationEnabled: false,
        note: 'A configuração vale somente para novos resgates.'
      }
    }
  });
}

const RAIDZ_V98_OUTFIT_REWARDS_KEY = 'raidz.catalog.v98.outfit_rewards';

function normalizeRaidZV98OutfitItems(items = []) {
  return (Array.isArray(items) ? items : []).map((item, index) => {
    const originalSlot = String(item?.slot || 'inventory').trim() || 'inventory';
    const slotKey = originalSlot.toLowerCase();
    const classname = String(item?.classname || '').trim();
    let slot = originalSlot;
    if (['headgear', 'head', 'hat'].includes(slotKey)) slot = 'Headgear';
    if (['hands', 'hand', 'gloves'].includes(slotKey)) slot = 'Gloves';

    const glassBottle = classname === 'WaterBottle';
    return {
      ...item,
      slot,
      classname: glassBottle ? 'GlassBottle' : classname,
      quantity: Math.max(1, Math.min(Number(item?.quantity || 1), 999)),
      label: glassBottle ? 'Garrafa de água de vidro' : (String(item?.label || classname).trim() || classname),
      sortOrder: Number.isFinite(Number(item?.sortOrder)) ? Number(item.sortOrder) : index
    };
  }).filter((item) => item.classname);
}

async function applyRaidZV98OutfitRewardsFix() {
  const outfits = await prisma.outfitTemplate.findMany({
    select: { id: true, slug: true, isPrivate: true, items: true, streamerRewardEnabled: true }
  });
  let updated = 0;

  for (const outfit of outfits) {
    const items = normalizeRaidZV98OutfitItems(outfit.items);
    const streamerRewardEnabled = !outfit.isPrivate && outfit.slug === 'traje-vip-boost-raidz';
    const itemsChanged = JSON.stringify(items) !== JSON.stringify(Array.isArray(outfit.items) ? outfit.items : []);
    if (!itemsChanged && outfit.streamerRewardEnabled === streamerRewardEnabled) continue;
    await prisma.outfitTemplate.update({
      where: { id: outfit.id },
      data: { items, streamerRewardEnabled }
    });
    updated++;
  }

  await prisma.appSetting.upsert({
    where: { key: RAIDZ_V98_OUTFIT_REWARDS_KEY },
    update: {
      value: {
        appliedAt: new Date().toISOString(),
        updatedOutfits: updated,
        normalReward: '7 days, once per Steam64, unlocked by Starter Kit, no streamer code',
        streamerReward: 'VIP Boost only, 7 days, one streamer code lifetime per Steam64',
        equipmentFixes: ['Headgear slot', 'Gloves slot', 'GlassBottle']
      }
    },
    create: {
      key: RAIDZ_V98_OUTFIT_REWARDS_KEY,
      value: {
        appliedAt: new Date().toISOString(),
        updatedOutfits: updated,
        normalReward: '7 days, once per Steam64, unlocked by Starter Kit, no streamer code',
        streamerReward: 'VIP Boost only, 7 days, one streamer code lifetime per Steam64',
        equipmentFixes: ['Headgear slot', 'Gloves slot', 'GlassBottle']
      }
    }
  });
}


const RAIDZ_V105_GLASS_BOTTLES_KEY = 'raidz.catalog.v105.vip_glass_bottles';
const RAIDZ_V105_PLASTIC_BOTTLES = new Set([
  'waterbottle',
  'plasticbottle',
  'plastic_bottle',
  'bottleplastic'
]);

function replaceVipPlasticBottles(items = []) {
  let replacements = 0;
  const fixedItems = (Array.isArray(items) ? items : []).map((item) => {
    const classname = String(item?.classname || '').trim();
    if (!RAIDZ_V105_PLASTIC_BOTTLES.has(classname.toLowerCase())) return item;
    replacements++;
    return {
      ...item,
      classname: 'GlassBottle',
      label: 'Garrafa de água de vidro'
    };
  });
  return { fixedItems, replacements };
}

async function applyRaidZV105VipGlassBottles() {
  const outfits = await prisma.outfitTemplate.findMany({
    select: { id: true, slug: true, name: true, items: true }
  });

  let updatedOutfits = 0;
  let replacedBottles = 0;
  const updatedSlugs = [];

  for (const outfit of outfits) {
    const { fixedItems, replacements } = replaceVipPlasticBottles(outfit.items);
    if (!replacements) continue;
    await prisma.outfitTemplate.update({
      where: { id: outfit.id },
      data: { items: fixedItems }
    });
    updatedOutfits++;
    replacedBottles += replacements;
    updatedSlugs.push(outfit.slug);
  }

  await prisma.appSetting.upsert({
    where: { key: RAIDZ_V105_GLASS_BOTTLES_KEY },
    update: {
      value: {
        appliedAt: new Date().toISOString(),
        updatedOutfits,
        replacedBottles,
        updatedSlugs,
        replacement: 'WaterBottle/PlasticBottle -> GlassBottle'
      }
    },
    create: {
      key: RAIDZ_V105_GLASS_BOTTLES_KEY,
      value: {
        appliedAt: new Date().toISOString(),
        updatedOutfits,
        replacedBottles,
        updatedSlugs,
        replacement: 'WaterBottle/PlasticBottle -> GlassBottle'
      }
    }
  });
}


const RAIDZ_V99_MANAGED_OUTFITS_KEY = 'raidz.catalog.v99.managed_custom_outfits';

async function applyRaidZV99ManagedOutfits() {
  const now = new Date();
  const managedDefaults = [
    { slug: 'traje-vip-privado-stz', owner: '76561198155183501', flag: 'STZ_Flag', code: 'STZ', name: 'Streamer STZ' },
    { slug: 'traje-ocl-streamer', owner: '76561199531978123', flag: 'OCL_Flag', code: 'OCL', name: 'Streamer OCL' }
  ];

  // Todo traje VIP recebe ChernarusMap. Bandeiras saem do inventário e passam a ser solicitadas no painel.
  const allOutfits = await prisma.outfitTemplate.findMany({ select: { id: true, items: true } });
  for (const outfit of allOutfits) {
    const fixedItems = normalizeItems(outfit.items || []);
    if (JSON.stringify(fixedItems) !== JSON.stringify(outfit.items || [])) {
      await prisma.outfitTemplate.update({ where: { id: outfit.id }, data: { items: fixedItems } });
    }
  }

  for (const cfg of managedDefaults) {
    const outfit = await prisma.outfitTemplate.findUnique({ where: { slug: cfg.slug } });
    if (!outfit) continue;
    const preserveClanMode = outfit.managedOwnerType === 'CLAN';
    await prisma.outfitTemplate.update({
      where: { id: outfit.id },
      data: {
        isPrivate: true,
        active: true,
        streamerRewardEnabled: false,
        managedAccessEnabled: true,
        managedOwnerSteam64: cfg.owner,
        managedOwnerType: preserveClanMode ? 'CLAN' : 'STREAMER',
        maxManagedMembers: Math.max(10, Number(outfit.maxManagedMembers || 10)),
        memberMonthlyPriceCoins: preserveClanMode ? Math.max(0, Number(outfit.memberMonthlyPriceCoins || 0)) : 0,
        creationPriceCoins: Math.max(0, Number(outfit.creationPriceCoins || 0)),
        flagClassname: cfg.flag,
        items: normalizeItems(outfit.items || [])
      }
    });

    // Migração antiga de streamer só roda enquanto o traje ainda estiver no modo
    // STREAMER. Depois que a V113 o transforma em CLAN, preservamos as regras e
    // vencimentos do clã em todos os próximos deploys.
    if (!preserveClanMode) {
      const subs = await prisma.playerOutfitSubscription.findMany({ where: { outfitTemplateId: outfit.id, status: 'ACTIVE' } });
      for (const sub of subs) {
        await prisma.playerOutfitSubscription.update({
          where: { id: sub.id },
          data: {
            source: sub.steam64 === cfg.owner ? STREAMER_OWNER_SOURCE : STREAMER_MEMBER_SOURCE,
            expiresAt: new Date('2999-12-31T23:59:59.000Z')
          }
        });
      }
      await ensureManagedOwnerAccess(outfit.id);
    }

    const existingStreamer = await prisma.streamerCode.findFirst({ where: { streamerSteam64: cfg.owner } });
    if (existingStreamer) {
      await prisma.streamerCode.update({ where: { id: existingStreamer.id }, data: { active: true, streamerName: existingStreamer.streamerName || cfg.name } });
    } else {
      const existingCode = await prisma.streamerCode.findUnique({ where: { code: cfg.code } });
      if (existingCode) {
        await prisma.streamerCode.update({ where: { id: existingCode.id }, data: { streamerSteam64: cfg.owner, streamerName: cfg.name, active: true } });
      } else {
        await prisma.streamerCode.create({ data: { code: cfg.code, streamerName: cfg.name, streamerSteam64: cfg.owner, percent: 10, active: true } });
      }
    }
  }

  await prisma.appSetting.upsert({
    where: { key: RAIDZ_V99_MANAGED_OUTFITS_KEY },
    update: { value: { appliedAt: now.toISOString(), streamerOwners: managedDefaults, customCreationPrice: 50000, monthlyMemberPrice: 20000, defaultMaxMembers: 10, allVipIncludes: 'ChernarusMap', flagsDeliveredInsideOutfit: false } },
    create: { key: RAIDZ_V99_MANAGED_OUTFITS_KEY, value: { appliedAt: now.toISOString(), streamerOwners: managedDefaults, customCreationPrice: 50000, monthlyMemberPrice: 20000, defaultMaxMembers: 10, allVipIncludes: 'ChernarusMap', flagsDeliveredInsideOutfit: false } }
  });
}

async function applyRaidZV125RemovePerUseInsurance() {
  try {
    let monthlyPlan = await prisma.vehicleInsurancePlan.findFirst({
      where: { billingType: 'SUBSCRIPTION', templateId: null },
      orderBy: [{ active: 'desc' }, { updatedAt: 'desc' }]
    });

    if (!monthlyPlan) {
      monthlyPlan = await prisma.vehicleInsurancePlan.create({
        data: {
          templateId: null,
          name: 'Seguro Mensal 50% do veículo',
          billingType: 'SUBSCRIPTION',
          coverageType: 'NORMAL',
          priceCoins: 35000,
          respawnFeeCoins: 0,
          durationDays: 30,
          maxUsesPerWeek: 5,
          description: 'Seguro mensal. Compra e renovação no site; uso somente dentro do jogo pela tecla L.',
          active: true
        }
      });
    } else {
      monthlyPlan = await prisma.vehicleInsurancePlan.update({
        where: { id: monthlyPlan.id },
        data: { active: true, maxUsesPerWeek: 5, durationDays: Math.max(1, Number(monthlyPlan.durationDays || 30)) }
      });
    }

    const legacyPlans = await prisma.vehicleInsurancePlan.findMany({ where: { billingType: 'PER_USE' } });
    let migratedVehicles = 0;

    for (const legacyPlan of legacyPlans) {
      const replacement = legacyPlan.templateId
        ? (await prisma.vehicleInsurancePlan.findFirst({
            where: { billingType: 'SUBSCRIPTION', templateId: legacyPlan.templateId, active: true },
            orderBy: { updatedAt: 'desc' }
          })) || monthlyPlan
        : monthlyPlan;

      const vehicles = await prisma.playerVehicle.findMany({
        where: { insurancePlanId: legacyPlan.id },
        select: { id: true, insuranceExpiresAt: true, insuranceUsesThisWeek: true }
      });

      for (const vehicle of vehicles) {
        const currentExpiry = vehicle.insuranceExpiresAt ? new Date(vehicle.insuranceExpiresAt) : null;
        const validExpiry = currentExpiry && Number.isFinite(currentExpiry.getTime()) && currentExpiry.getTime() > Date.now();
        const insuranceExpiresAt = validExpiry
          ? currentExpiry
          : new Date(Date.now() + Math.max(1, Number(replacement.durationDays || 30)) * 24 * 60 * 60 * 1000);

        await prisma.playerVehicle.update({
          where: { id: vehicle.id },
          data: {
            insurancePlanId: replacement.id,
            insuranceExpiresAt,
            insuranceUsesThisWeek: Math.min(Number(vehicle.insuranceUsesThisWeek || 0), Number(replacement.maxUsesPerWeek || 5))
          }
        });
        migratedVehicles += 1;
      }

      await prisma.vehicleInsurancePlan.update({ where: { id: legacyPlan.id }, data: { active: false } });
    }

    await prisma.appSetting.upsert({
      where: { key: 'insurance.removePerUse.v125' },
      update: { value: { appliedAt: new Date().toISOString(), legacyPlans: legacyPlans.length, migratedVehicles, replacementPlanId: monthlyPlan.id } },
      create: { key: 'insurance.removePerUse.v125', value: { appliedAt: new Date().toISOString(), legacyPlans: legacyPlans.length, migratedVehicles, replacementPlanId: monthlyPlan.id } }
    });
  } catch (err) {
    console.warn('Aviso: migração V125 do seguro por uso não aplicada:', err.message);
  }
}

async function applyRaidZV129AutomaticVehicleInsuranceAndActiveCleanup() {
  try {
    const now = new Date();

    // Esta limpeza pode rodar em todo boot: veículo temporário vencido não continua ACTIVE.
    const expired = await prisma.playerVehicle.updateMany({
      where: { status: 'ACTIVE', expiresAt: { lte: now } },
      data: { status: 'EXPIRED' }
    });

    // A liberação gratuita para corrigir veículos antigos roda somente uma vez.
    // Depois disso, seguros vencidos voltam a exigir renovação normal de 50%.
    const migrationKey = 'vehicles.autoInsurance.activeOnly.v129';
    const alreadyApplied = await prisma.appSetting.findUnique({ where: { key: migrationKey } });
    if (alreadyApplied) {
      if (expired.count > 0) {
        const previousValue = alreadyApplied.value && typeof alreadyApplied.value === 'object' && !Array.isArray(alreadyApplied.value)
          ? alreadyApplied.value
          : {};
        await prisma.appSetting.update({
          where: { key: migrationKey },
          data: { value: { ...previousValue, lastCleanupAt: new Date().toISOString(), lastExpiredVehicles: expired.count } }
        });
      }
      return;
    }

    let globalPlan = await prisma.vehicleInsurancePlan.findFirst({
      where: { active: true, billingType: 'SUBSCRIPTION', templateId: null },
      orderBy: { updatedAt: 'desc' }
    });
    if (!globalPlan) {
      globalPlan = await prisma.vehicleInsurancePlan.create({
        data: {
          templateId: null,
          name: 'Seguro Mensal 50% do veículo',
          billingType: 'SUBSCRIPTION',
          coverageType: 'NORMAL',
          priceCoins: 35000,
          respawnFeeCoins: 0,
          durationDays: 30,
          maxUsesPerWeek: 5,
          description: 'Seguro mensal obrigatório. Primeiro mês incluso na compra; renovação por 50% do valor do veículo.',
          active: true
        }
      });
    }

    const vehiclesToRepair = await prisma.playerVehicle.findMany({
      where: {
        status: 'ACTIVE',
        AND: [
          { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
          { OR: [{ insurancePlanId: null }, { insuranceExpiresAt: null }, { insuranceExpiresAt: { lte: now } }] }
        ]
      },
      select: { id: true, templateId: true }
    });

    let insured = 0;
    for (const vehicle of vehiclesToRepair) {
      const templatePlan = await prisma.vehicleInsurancePlan.findFirst({
        where: { active: true, billingType: 'SUBSCRIPTION', templateId: vehicle.templateId },
        orderBy: { updatedAt: 'desc' }
      });
      const plan = templatePlan || globalPlan;
      await prisma.playerVehicle.update({
        where: { id: vehicle.id },
        data: {
          insurancePlanId: plan.id,
          insuranceExpiresAt: new Date(Date.now() + Math.max(1, Number(plan.durationDays || 30)) * 24 * 60 * 60 * 1000),
          insuranceUsesWeekStart: now,
          insuranceUsesThisWeek: 0
        }
      });
      insured += 1;
    }

    await prisma.appSetting.create({
      data: {
        key: migrationKey,
        value: {
          appliedAt: new Date().toISOString(),
          repairedVehicles: insured,
          expiredVehicles: expired.count,
          globalPlanId: globalPlan.id,
          oneTimeFreeRepair: true
        }
      }
    });
  } catch (err) {
    console.warn('Aviso: correção V129 de seguro automático/veículos ativos não aplicada:', err.message);
  }
}

export async function ensureDefaultStoreData() {
  // V62: boot/deploy seguro. Não desativa, não apaga, não reseta e não sobrescreve
  // produtos, promoções, preços, imagens, veículos, seguros, saldos, compras, garagem ou trajes.
  await upsertSetting('store_categories_v1', { categories: storeCategories });
  await upsertSetting('starterKit.v1', starterKitConfig);
  await upsertSetting('store.globalPromo', { enabled: false, percent: 10, label: 'PROMO RELÂMPAGO', color: '#ff7a18' });
  await upsertSetting('drop_box_types_v1', { types: ['WoodenCrate', 'SeaChest', 'Barrel_Red', 'Barrel_Blue', 'Barrel_Green', 'FirstAidKit', 'AmmoBox'] });
  await upsertSetting('deploy.safety.v62', {
    safeDeployMode: true,
    protectedOnNormalUpdate: [
      'Product.priceCoins',
      'Product.promoActive',
      'Product.promoPercent',
      'Product.status',
      'Product.imageUrl/imageData',
      'ProductItem',
      'VehicleTemplate.price/status/image/parts/cargo',
      'Seed tombstones: produtos e veículos apagados não voltam após update',
      'VehicleInsurancePlan',
      'Player.coins',
      'CoinLedger',
      'Payment',
      'Purchase',
      'DeliveryQueue',
      'PlayerVehicle',
      'VehicleRespawnLog',
      'OutfitTemplate',
      'PlayerOutfitSubscription',
      'OutfitTemplate.isPrivate / VIP privado vitalício'
    ],
    note: 'Deploy normal pelo GitHub preserva alterações feitas no painel ADM. Produtos/veículos apagados pelo ADM entram em bloqueio e não voltam no seed.'
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
  await applyRaidZV125RemovePerUseInsurance();
  await applyRaidZV129AutomaticVehicleInsuranceAndActiveCleanup();
  await seedOutfitTemplates(defaultOutfitTemplates);
  await applyRaidZV69CatalogCleanup();
  await applyRaidZV72CategoryCleanup();
  await applyRaidZV77OutfitImageRefresh();
  await applyRaidZV86VipStarterKitFix();
  await applyRaidZV92PrivateVipSetup();
  await applyRaidZV93StarterUnitDeliveryFix();
  await applyRaidZV94StarterMissingItemsFix();
  await applyRaidZV95DisableStarterBackfill();
  await applyRaidZV96StarterFastFtpFix();
  await applyRaidZV98OutfitRewardsFix();
  await applyRaidZV99ManagedOutfits();
  await applyRaidZV113RepairPlayerAvatarMime();
  await applyRaidZV113PersonalizedVipClanOwners();
  await applyRaidZV105VipGlassBottles();
  await applyRaidZV85M1025FullParts();
  await applyRaidZV103VehicleAccessoriesToPlayerInventory();
  await applyRaidZV113RemoveMuranoFromVehicles();
  await applyRaidZV80CleanPublicCategories();
  await applyRaidZBrandingCleanup();
}
