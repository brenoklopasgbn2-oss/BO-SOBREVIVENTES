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
import { seedOutfitTemplates } from './outfitService.js';
import { vehicleTemplatePayload } from './vehicleRentalService.js';

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
    update: { value: { appliedAt: new Date().toISOString(), packages: defaultPackages.length, vehicles: defaultVehicles.length, carlock: 'MuranoCarlock', m1025Key: 'CarKey', fixes: ['modal_scroll', 'garage_for_all_vehicle_purchases', 'm1025_parts_complete'] } },
    create: { key: 'raidz.catalog.v70', value: { appliedAt: new Date().toISOString(), packages: defaultPackages.length, vehicles: defaultVehicles.length, carlock: 'MuranoCarlock', m1025Key: 'CarKey', fixes: ['modal_scroll', 'garage_for_all_vehicle_purchases', 'm1025_parts_complete'] } }
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
    items: starterItems
  };

  await prisma.appSetting.upsert({
    where: { key: 'starterKit.v1' },
    update: { value: fixedStarterKit },
    create: { key: 'starterKit.v1', value: fixedStarterKit }
  });

  const pendingStarterPlanks = await prisma.deliveryQueue.findMany({
    where: {
      classname: 'WoodenPlank',
      status: { in: ['PENDING', 'PROCESSING'] },
      productName: { contains: '[KIT INICIAL]' }
    },
    orderBy: { createdAt: 'asc' }
  });

  let pendingPlankDeliveriesFixed = 0;
  for (const delivery of pendingStarterPlanks) {
    const meta = delivery.meta && typeof delivery.meta === 'object' && !Array.isArray(delivery.meta) ? delivery.meta : {};
    await prisma.deliveryQueue.update({
      where: { id: delivery.id },
      data: {
        quantity: 10,
        productName: String(delivery.productName || '').includes('Fardo de tábuas')
          ? delivery.productName
          : `${String(delivery.productName || '[KIT INICIAL] Kit Inicial').replace(/:.*$/, '')}: Fardo de tábuas 1/2 (10)`,
        deliveryType: 'drop_at_feet',
        meta: { ...meta, itemLabel: 'Fardo de tábuas 1/2 (10)', sortOrder: 6, v86StarterPlanksFix: true }
      }
    });
    pendingPlankDeliveriesFixed++;

    const secondExists = await prisma.deliveryQueue.findFirst({
      where: {
        steam64: delivery.steam64,
        status: { in: ['PENDING', 'PROCESSING'] },
        classname: 'WoodenPlank',
        productName: { contains: 'Fardo de tábuas 2/2' }
      },
      select: { id: true }
    });

    if (!secondExists) {
      await prisma.deliveryQueue.create({
        data: {
          purchaseId: delivery.purchaseId || null,
          playerId: delivery.playerId,
          steam64: delivery.steam64,
          serverType: delivery.serverType || fixedStarterKit.serverType || 'vanilla',
          productName: `${String(delivery.productName || '[KIT INICIAL] Kit Inicial').replace(/:.*$/, '')}: Fardo de tábuas 2/2 (10)`,
          classname: 'WoodenPlank',
          quantity: 10,
          deliveryType: 'drop_at_feet',
          meta: { ...meta, itemLabel: 'Fardo de tábuas 2/2 (10)', sortOrder: 7, v86StarterPlanksFix: true }
        }
      });
      pendingPlankDeliveriesFixed++;
    }
  }

  await prisma.appSetting.upsert({
    where: { key: 'raidz.catalog.v86.vip_starter_fix' },
    update: {
      value: {
        appliedAt: new Date().toISOString(),
        defaultOutfitsFixed,
        customOutfitsCleaned,
        pendingPlankDeliveriesFixed,
        fixes: ['vip_outfits_complete_items', 'vip_medicines_removed', 'starter_kit_2x_woodenplank_10']
      }
    },
    create: {
      key: 'raidz.catalog.v86.vip_starter_fix',
      value: {
        appliedAt: new Date().toISOString(),
        defaultOutfitsFixed,
        customOutfitsCleaned,
        pendingPlankDeliveriesFixed,
        fixes: ['vip_outfits_complete_items', 'vip_medicines_removed', 'starter_kit_2x_woodenplank_10']
      }
    }
  });
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
      'PlayerOutfitSubscription'
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
  await seedOutfitTemplates(defaultOutfitTemplates);
  await applyRaidZV69CatalogCleanup();
  await applyRaidZV72CategoryCleanup();
  await applyRaidZV77OutfitImageRefresh();
  await applyRaidZV86VipStarterKitFix();
  await applyRaidZV85M1025FullParts();
  await applyRaidZV80CleanPublicCategories();
  await applyRaidZBrandingCleanup();
}
