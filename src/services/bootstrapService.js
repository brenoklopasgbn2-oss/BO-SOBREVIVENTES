import { prisma } from '../db/prisma.js';
import {
  defaultPackages,
  storeCategories,
  starterKitConfig,
  vanillaProducts
} from '../data/vanillaStoreData.js';
import { vipOutfitsV201 } from '../data/vipOutfitsV201.js';
import { defaultVehicleTemplatesV213 } from '../data/defaultVehicleTemplatesV213.js';

const CLEAN_SLATE_KEY = 'store.cleanSlate.v200';
const STARTER_KIT_V225_KEY = 'starterKit.v225.initialBaseVip7d';
const STARTER_KIT_V610_KEY = 'starterKit.v610.fullDropStacks';

async function settingExists(key) {
  return prisma.appSetting.findUnique({ where: { key }, select: { key: true } });
}

async function createSettingIfMissing(key, value) {
  const existing = await settingExists(key);
  if (existing) return existing;
  return prisma.appSetting.create({ data: { key, value } });
}

async function applyCleanSlateOnce() {
  const done = await settingExists(CLEAN_SLATE_KEY);
  if (done) return { applied: false };

  const result = await prisma.$transaction(async (tx) => {
    // Fila/histórico de produtos antigos. Coins, pagamentos e players NÃO são zerados.
    // Sessões antigas são removidas para o novo servidor emitir acesso novamente.
    const accessTokens = await tx.gameAccessToken.deleteMany({});
    const disabledCoupons = await tx.couponCode.updateMany({ data: { active: false } });
    const disabledStreamerCodes = await tx.streamerCode.updateMany({ data: { active: false } });
    const disabledCoinPackages = await tx.coinPackage.updateMany({ data: { active: false } });
    const deliveries = await tx.deliveryQueue.deleteMany({});
    const purchases = await tx.purchase.deleteMany({});
    const checkouts = await tx.checkoutAttempt.deleteMany({});
    const starterClaims = await tx.starterKitClaim.deleteMany({});

    // Veículos antigos e dependências.
    const vehicleLogs = await tx.vehicleRespawnLog.deleteMany({});
    const playerVehicles = await tx.playerVehicle.deleteMany({});
    const insurancePlans = await tx.vehicleInsurancePlan.deleteMany({});
    const vehicles = await tx.vehicleTemplate.deleteMany({});

    // Trajes/VIPs antigos e dependências.
    const outfitFlags = await tx.outfitFlagRequest.deleteMany({});
    const outfitSubs = await tx.playerOutfitSubscription.deleteMany({});
    const outfitOrders = await tx.customOutfitOrder.deleteMany({});
    const outfits = await tx.outfitTemplate.deleteMany({});

    // Catálogo antigo inteiro; a etapa seguinte recria somente Construção.
    const productItems = await tx.productItem.deleteMany({});
    const products = await tx.product.deleteMany({});

    // Remove configurações antigas que não existem mais no modelo novo.
    await tx.appSetting.deleteMany({
      where: {
        OR: [
          {
            key: {
              in: [
                'drop_box_types_v1',
                'store_categories_v1',
                'starterKit.v1',
                'store.globalPromo',
                'fileBridge.ftp.v1',
                'fileBridge.health.v1',
                'fileBridge.diagnostics.v2',
                'store.ftp.clean.v200',
                'admin.ownerSteam64',
                'admin.ownerSteam64.v144'
              ]
            }
          },
          { key: { startsWith: 'raidz.ftp.preset.' } }
        ]
      }
    });

    await tx.appSetting.create({
      data: {
        key: CLEAN_SLATE_KEY,
        value: {
          appliedAt: new Date().toISOString(),
          mode: 'clean_store_for_new_server',
          kept: ['Player', 'Player.coins', 'CoinLedger', 'Payment', 'Streamer financial history'],
          removed: ['old access tokens', 'old products', 'old purchases/deliveries', 'vehicles', 'insurance', 'VIP outfits', 'starter claims', 'drop box settings', 'old FTP/server connection settings', 'old admin Steam link'],
          disabled: ['old coupons', 'old streamer codes', 'old coin packages']
        }
      }
    });

    return {
      accessTokens: accessTokens.count,
      disabledCoupons: disabledCoupons.count,
      disabledStreamerCodes: disabledStreamerCodes.count,
      disabledCoinPackages: disabledCoinPackages.count,
      deliveries: deliveries.count,
      purchases: purchases.count,
      checkouts: checkouts.count,
      starterClaims: starterClaims.count,
      vehicleLogs: vehicleLogs.count,
      playerVehicles: playerVehicles.count,
      insurancePlans: insurancePlans.count,
      vehicles: vehicles.count,
      outfitFlags: outfitFlags.count,
      outfitSubs: outfitSubs.count,
      outfitOrders: outfitOrders.count,
      outfits: outfits.count,
      productItems: productItems.count,
      products: products.count
    };
  }, { maxWait: 20_000, timeout: 120_000 });

  console.log('[STORE_CLEAN_V200] Loja antiga limpa:', result);
  return { applied: true, ...result };
}

async function ensureCoinPackage(pack) {
  const amount = Number(pack.amountBrl);
  const coins = Number(pack.coins);
  // Ao renomear a moeda da loja, reaproveita os pacotes existentes em vez de
  // criar duplicados no banco. O valor em BRL é estável e identifica o pacote.
  const existing = await prisma.coinPackage.findFirst({
    where: {
      OR: [
        { name: pack.name },
        { amountBrl: amount, coins },
        { amountBrl: amount }
      ]
    },
    orderBy: { createdAt: 'asc' }
  });

  const data = {
    name: pack.name,
    amountBrl: amount,
    coins,
    bonusText: pack.bonusText || null,
    active: true
  };

  if (existing) {
    const updated = await prisma.coinPackage.update({ where: { id: existing.id }, data });
    // Se alguma versão anterior já criou um pacote duplicado com o mesmo valor,
    // mantém somente o registro canônico ativo.
    await prisma.coinPackage.updateMany({
      where: { amountBrl: amount, id: { not: existing.id } },
      data: { active: false }
    });
    return updated;
  }

  return prisma.coinPackage.create({ data });
}


async function ensureVipOutfitV201(outfit) {
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
    return prisma.outfitTemplate.update({ where: { id: existing.id }, data });
  }
  return prisma.outfitTemplate.create({ data: { ...data, slug: outfit.slug } });
}




async function retireLegacyVipOutfitsV613() {
  const allowedSlugs = vipOutfitsV201.map(outfit => outfit.slug);
  const legacy = await prisma.outfitTemplate.findMany({
    where: {
      slug: { notIn: allowedSlugs },
      managedOwnerSteam64: null,
      managedAccessEnabled: false,
      OR: [
        { slug: { startsWith: 'vip-' } },
        { slug: { startsWith: 'traje-vip-' } }
      ]
    },
    select: { id: true, slug: true }
  });

  if (!legacy.length) return { retired: 0 };
  const ids = legacy.map(row => row.id);

  await prisma.$transaction(async (tx) => {
    await tx.playerOutfitSubscription.updateMany({
      where: { outfitTemplateId: { in: ids }, status: 'ACTIVE' },
      data: { status: 'CANCELLED' }
    });
    await tx.outfitTemplate.updateMany({
      where: { id: { in: ids } },
      data: { active: false, isPrivate: true }
    });
  });

  return { retired: legacy.length };
}

async function ensureVehicleTemplateV213(entry) {
  const data = {
    name: entry.name,
    description: entry.description || null,
    serverType: entry.serverType || 'vanilla',
    vehicleClassname: entry.vehicleClassname,
    buyPriceCoins: Math.max(0, Number(entry.buyPriceCoins || 0)),
    noInsurancePriceCoins: entry.noInsurancePriceCoins === '' || entry.noInsurancePriceCoins == null ? null : Math.max(0, Number(entry.noInsurancePriceCoins || 0)),
    rent1DayCoins: Math.max(0, Number(entry.rent1DayCoins || 0)),
    rent7DaysCoins: Math.max(0, Number(entry.rent7DaysCoins || 0)),
    rent30DaysCoins: Math.max(0, Number(entry.rent30DaysCoins || 0)),
    imageUrl: entry.imageUrl || null,
    imageData: null,
    imageMime: null,
    parts: Array.isArray(entry.parts) ? entry.parts : [],
    cargoItems: Array.isArray(entry.cargoItems) ? entry.cargoItems : [],
    fluids: entry.fluids || null,
    variants: Array.isArray(entry.variants) ? entry.variants : [],
    active: entry.active !== false
  };

  const existing = await prisma.vehicleTemplate.findUnique({ where: { slug: entry.slug } });
  const template = existing
    ? await prisma.vehicleTemplate.update({ where: { id: existing.id }, data })
    : await prisma.vehicleTemplate.create({ data: { ...data, slug: entry.slug } });

  if (entry.insurancePlan) {
    const planData = {
      name: entry.insurancePlan.name,
      billingType: entry.insurancePlan.billingType || 'SUBSCRIPTION',
      coverageType: entry.insurancePlan.coverageType || 'NORMAL',
      priceCoins: Math.max(0, Number(entry.insurancePlan.priceCoins || 0)),
      respawnFeeCoins: Math.max(0, Number(entry.insurancePlan.respawnFeeCoins || 0)),
      durationDays: Math.max(1, Number(entry.insurancePlan.durationDays || 30)),
      maxUsesPerWeek: Math.max(1, Number(entry.insurancePlan.maxUsesPerWeek || 1)),
      description: entry.insurancePlan.description || null,
      active: entry.insurancePlan.active !== false
    };
    const current = await prisma.vehicleInsurancePlan.findFirst({
      where: { templateId: template.id, billingType: 'SUBSCRIPTION' },
      orderBy: { createdAt: 'asc' }
    });
    if (current) {
      await prisma.vehicleInsurancePlan.update({ where: { id: current.id }, data: planData });
    } else {
      await prisma.vehicleInsurancePlan.create({ data: { ...planData, templateId: template.id } });
    }
  }

  return template;
}

async function ensureStoreProduct(product) {
  const { items = [], ...rawData } = product;
  const data = {
    ...rawData,
    deliveryType: 'drop_at_feet',
    dropBoxClassname: null,
    imageUrl: rawData.imageUrl || null,
    imageData: null,
    imageMime: null,
    status: rawData.status || 'ACTIVE'
  };

  const itemCreates = items.map((item, index) => ({
    classname: String(item.classname || '').trim(),
    quantity: Math.max(1, Number(item.quantity || 1)),
    label: item.label || item.classname || null,
    sortOrder: Number.isFinite(Number(item.sortOrder)) ? Number(item.sortOrder) : index
  })).filter(item => item.classname);

  const existing = await prisma.product.findUnique({
    where: { slug: data.slug },
    include: { items: true }
  });

  if (existing) {
    return prisma.product.update({
      where: { id: existing.id },
      data: {
        name: data.name,
        description: data.description || null,
        category: data.category,
        serverType: data.serverType || 'vanilla',
        classname: data.classname,
        quantity: Math.max(1, Number(data.quantity || 1)),
        priceCoins: Math.max(0, Number(data.priceCoins || 0)),
        stock: data.stock ?? null,
        imageUrl: data.imageUrl,
        imageData: null,
        imageMime: null,
        deliveryType: 'drop_at_feet',
        dropBoxClassname: null,
        featured: Boolean(data.featured),
        highlightColor: data.highlightColor || '#ef4444',
        status: data.status || 'ACTIVE',
        promoActive: Boolean(data.promoActive),
        promoPercent: Math.max(0, Number(data.promoPercent || 0)),
        promoLabel: data.promoLabel || null,
        promoColor: data.promoColor || '#ff7a18',
        items: {
          deleteMany: {},
          create: itemCreates
        }
      }
    });
  }

  return prisma.product.create({
    data: {
      ...data,
      items: { create: itemCreates }
    }
  });
}

async function ensureStarterKitV225() {
  const applied = await settingExists(STARTER_KIT_V225_KEY);
  if (applied) return false;
  await prisma.$transaction(async (tx) => {
    await tx.appSetting.upsert({
      where: { key: 'starterKit.v1' },
      update: { value: starterKitConfig },
      create: { key: 'starterKit.v1', value: starterKitConfig }
    });
    await tx.appSetting.upsert({
      where: { key: STARTER_KIT_V225_KEY },
      update: { value: { appliedAt: new Date().toISOString() } },
      create: { key: STARTER_KIT_V225_KEY, value: { appliedAt: new Date().toISOString() } }
    });
  });
  return true;
}

async function ensureStarterKitV610() {
  const applied = await settingExists(STARTER_KIT_V610_KEY);
  if (applied) return false;

  // Corrige bancos que já tinham starterKit.v1 salvo com configuração antiga.
  // Executa uma única vez e não apaga claims, players, saldo ou histórico.
  await prisma.$transaction(async (tx) => {
    await tx.appSetting.upsert({
      where: { key: 'starterKit.v1' },
      update: { value: starterKitConfig },
      create: { key: 'starterKit.v1', value: starterKitConfig }
    });
    await tx.appSetting.upsert({
      where: { key: STARTER_KIT_V610_KEY },
      update: { value: { appliedAt: new Date().toISOString(), mode: 'full_quantity_stacks_and_complete_items' } },
      create: { key: STARTER_KIT_V610_KEY, value: { appliedAt: new Date().toISOString(), mode: 'full_quantity_stacks_and_complete_items' } }
    });
  });
  return true;
}

export async function ensureDefaultStoreData() {
  const clean = await applyCleanSlateOnce();

  await prisma.appSetting.upsert({
    where: { key: 'store_categories_v1' },
    update: { value: { categories: storeCategories } },
    create: { key: 'store_categories_v1', value: { categories: storeCategories } }
  });
  await ensureStarterKitV225();
  await ensureStarterKitV610();
  await createSettingIfMissing('store.globalPromo', { enabled: false, percent: 0, label: '', color: '#ff7a18' });
  await createSettingIfMissing('store.delivery.v200', {
    physicalItems: 'drop_at_feet',
    dropBoxesEnabled: false,
    vehiclesUseModPreset: true,
    vehiclePresetKey: 'vehicleClassname',
    vipMedia: 'video',
    vipItemPayloadVersion: 2
  });

  await prisma.product.updateMany({ where: { slug: 'blocos-concreto-5-vanilla' }, data: { status: 'INACTIVE' } });

  for (const pack of defaultPackages) await ensureCoinPackage(pack);
  for (const product of vanillaProducts) await ensureStoreProduct(product);
  for (const vehicle of defaultVehicleTemplatesV213) await ensureVehicleTemplateV213(vehicle);
  for (const outfit of vipOutfitsV201) await ensureVipOutfitV201(outfit);
  const legacyVipCleanup = await retireLegacyVipOutfitsV613();

  return {
    ok: true,
    cleanSlateApplied: clean.applied,
    constructionProducts: vanillaProducts.filter(product => product.category === 'Construção').length,
    restoredStorageProducts: vanillaProducts.filter(product => product.category === 'Armazenamento').length,
    restoredMiscProducts: vanillaProducts.filter(product => product.category === 'Diversos').length,
    defaultVehicles: defaultVehicleTemplatesV213.length,
    defaultOutfits: vipOutfitsV201.length,
    legacyVipOutfitsRetired: legacyVipCleanup.retired,
    dropBoxesEnabled: false
  };
}
