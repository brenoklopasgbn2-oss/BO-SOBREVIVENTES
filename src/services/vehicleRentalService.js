import { prisma } from '../db/prisma.js';
import { changePlayerCoins } from './playerService.js';
import { logAudit } from './auditService.js';
import { slugify } from '../utils/slug.js';
import { prepareUploadedImage } from '../utils/pngTransparency.js';

const GAME_SERVER_TYPES = ['vanilla', 'bbp'];
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
export const NORMAL_INSURANCE_DISTANCE_METERS = 250;

export function getVehicleMonthlyInsurancePrice(template) {
  const value = Math.max(0, Number(template?.buyPriceCoins || 0));
  return Math.round(value * 0.5);
}

export function getVehicleInsurancePlanPrice(plan, template, { chargeAtPurchase = false } = {}) {
  if (!plan) return 0;

  // O primeiro mês do seguro mensal já está incluso na compra do veículo.
  if (chargeAtPurchase) return 0;
  return getVehicleMonthlyInsurancePrice(template);
}

async function resolveMonthlyInsurancePlan(tx, template, requestedPlanId = null) {
  if (requestedPlanId) {
    const requested = await tx.vehicleInsurancePlan.findUnique({ where: { id: requestedPlanId } });
    if (!requested || !requested.active) throw new Error('Seguro não encontrado ou inativo.');
    if (requested.billingType !== 'SUBSCRIPTION') throw new Error('O seguro por uso foi removido. Escolha o seguro mensal.');
    if (requested.templateId && requested.templateId !== template.id) throw new Error('Esse seguro pertence a outro veículo.');
    return requested;
  }

  // V129: todo veículo novo sai obrigatoriamente com seguro mensal ativo.
  // Primeiro tenta um plano exclusivo do modelo; se não existir, usa o plano global.
  const templatePlan = await tx.vehicleInsurancePlan.findFirst({
    where: { active: true, billingType: 'SUBSCRIPTION', templateId: template.id },
    orderBy: { updatedAt: 'desc' }
  });
  if (templatePlan) return templatePlan;

  const globalPlan = await tx.vehicleInsurancePlan.findFirst({
    where: { active: true, billingType: 'SUBSCRIPTION', templateId: null },
    orderBy: { updatedAt: 'desc' }
  });
  if (globalPlan) return globalPlan;

  throw new Error('Nenhum seguro mensal ativo foi encontrado. Cadastre ou ative um plano no painel ADM.');
}

export function normalizeServerType(value, fallback = 'vanilla') {
  const serverType = String(value || fallback).trim().toLowerCase();
  return GAME_SERVER_TYPES.includes(serverType) ? serverType : fallback;
}

export function parseVehiclePartsInput(text) {
  const raw = String(text || '').trim();
  if (!raw) return [];
  return raw.split(/\r?\n/).map((line, index) => {
    const clean = line.trim();
    if (!clean || clean.startsWith('#')) return null;
    const [slot, classname, quantityRaw, label] = clean.split('|').map(v => String(v || '').trim());
    if (!slot || !classname) return null;
    const qty = Math.max(1, Math.min(Number(quantityRaw || 1), 12));
    return { slot, classname, quantity: Number.isFinite(qty) ? qty : 1, label: label || null, sortOrder: index };
  }).filter(Boolean);
}

export function partsToText(parts) {
  const list = Array.isArray(parts) ? parts : [];
  return list.map(p => `${p.slot || ''}|${p.classname || ''}|${p.quantity || 1}${p.label ? '|' + p.label : ''}`).join('\n');
}

export function parseVehicleCargoItemsInput(text) {
  const raw = String(text || '').trim();
  if (!raw) return [];
  return raw.split(/\r?\n/).map((line, index) => {
    const clean = line.trim();
    if (!clean || clean.startsWith('#')) return null;
    const [slotRaw, classnameRaw, quantityRaw, labelRaw] = clean.split('|').map(v => String(v || '').trim());

    // Aceita dois formatos:
    // 1) slot|Classname|Quantidade|Nome
    // 2) Classname|Quantidade|Nome
    let slot = slotRaw || 'cargo';
    let classname = classnameRaw || '';
    let quantity = quantityRaw;
    let label = labelRaw;

    if (slotRaw && (!classnameRaw || /^\d+$/.test(classnameRaw))) {
      slot = 'cargo';
      classname = slotRaw;
      quantity = classnameRaw || quantityRaw;
      label = quantityRaw && !/^\d+$/.test(quantityRaw) ? quantityRaw : labelRaw;
    }

    if (!classname) return null;
    const qty = Math.max(1, Math.min(Number(quantity || 1), 200));
    return {
      slot: slot || 'cargo',
      classname,
      quantity: Number.isFinite(qty) ? qty : 1,
      label: label || null,
      sortOrder: index
    };
  }).filter(Boolean);
}

export function cargoItemsToText(items) {
  const list = Array.isArray(items) ? items : [];
  return list
    .map(item => `${item.slot || 'cargo'}|${item.classname || ''}|${item.quantity || 1}${item.label ? '|' + item.label : ''}`)
    .join('\n');
}


export function parseVehicleVariantsInput(text) {
  const raw = String(text || '').trim();
  if (!raw) return [];
  return raw.split(/\r?\n/).map((line, index) => {
    const clean = line.trim();
    if (!clean || clean.startsWith('#')) return null;
    const [name, classname, imageUrl] = clean.split('|').map(v => String(v || '').trim());
    if (!name || !classname) return null;
    return {
      name,
      vehicleClassname: classname,
      imageUrl: imageUrl || null,
      sortOrder: index
    };
  }).filter(Boolean);
}

export function variantsToText(variants) {
  const list = Array.isArray(variants) ? variants : [];
  return list
    .map(v => `${v.name || ''}|${v.vehicleClassname || ''}${v.imageUrl ? '|' + v.imageUrl : ''}`)
    .join('\n');
}

export function normalizeVehicleVariants(template) {
  const raw = Array.isArray(template?.variants) ? template.variants : [];
  const valid = raw.map((variant, index) => ({
    name: String(variant?.name || `Opção ${index + 1}`).trim(),
    vehicleClassname: String(variant?.vehicleClassname || '').trim(),
    imageUrl: String(variant?.imageUrl || '').trim() || null,
    sortOrder: Number.isFinite(Number(variant?.sortOrder)) ? Number(variant.sortOrder) : index,
    index
  })).filter(variant => variant.vehicleClassname);

  if (valid.length) {
    return valid.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)).map((variant, index) => ({ ...variant, index }));
  }

  return [{
    name: 'Padrão',
    vehicleClassname: template.vehicleClassname,
    imageUrl: template.imageUrl || null,
    sortOrder: 0,
    index: 0,
    isDefault: true
  }];
}

function selectVehicleVariant(template, variantIndex = 0) {
  const variants = normalizeVehicleVariants(template);
  const index = Math.max(0, Math.min(Number(variantIndex || 0), variants.length - 1));
  return variants[index] || variants[0];
}

function applyVehicleVariant(template, variant) {
  return {
    ...template,
    vehicleClassname: variant?.vehicleClassname || template.vehicleClassname,
    imageUrl: variant?.imageUrl || template.imageUrl || null,
    selectedVariant: variant || null
  };
}

export function normalizeFluids(body) {
  const fuel = Math.max(0, Math.min(Number(body.fuelPercent ?? 80), 100));
  const water = Math.max(0, Math.min(Number(body.waterPercent ?? 100), 100));
  const oil = Math.max(0, Math.min(Number(body.oilPercent ?? 100), 100));
  return { fuelPercent: fuel, waterPercent: water, oilPercent: oil };
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + Number(days || 0));
  return d;
}

function makeVehicleKey(seed = 'direct') {
  return `RZVEH_${seed}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

function normalizeVehiclePartForPayload(part, index = 0) {
  const slot = String(part?.slot || part?.slotName || part?.attachSlot || '').trim();
  const classname = String(part?.classname || part?.className || part?.type || '').trim();
  if (!slot || !classname) return null;
  const quantity = Math.max(1, Math.min(Number(part?.quantity || 1), 12));
  const normalized = {
    ...part,
    slot,
    slotName: slot,
    attachSlot: slot,
    classname,
    className: classname,
    type: classname,
    quantity: Number.isFinite(quantity) ? quantity : 1,
    label: part?.label || classname,
    sortOrder: Number.isFinite(Number(part?.sortOrder)) ? Number(part.sortOrder) : index
  };

  const fallbackClassnames = Array.isArray(part?.fallbackClassnames)
    ? part.fallbackClassnames.map((value) => String(value || '').trim()).filter(Boolean)
    : [];
  const slotAliases = [
    ...(Array.isArray(part?.slotAliases) ? part.slotAliases : []),
    ...(Array.isArray(part?.attachSlotAliases) ? part.attachSlotAliases : []),
    ...(Array.isArray(part?.fallbackSlots) ? part.fallbackSlots : [])
  ].map((value) => String(value || '').trim()).filter(Boolean);
  normalized.fallbackClassnames = Array.from(new Set([classname, ...fallbackClassnames]));
  normalized.slotAliases = Array.from(new Set([slot, ...slotAliases]));
  normalized.attachSlotAliases = normalized.slotAliases;
  normalized.fallbackSlots = normalized.slotAliases;
  normalized.attachClassname = classname;
  normalized.itemClassname = classname;
  return normalized;
}

function normalizeCargoItemForPayload(item, index = 0) {
  const classname = String(item?.classname || item?.className || item?.type || '').trim();
  if (!classname) return null;
  const slot = String(item?.slot || 'cargo').trim() || 'cargo';
  const quantity = Math.max(1, Math.min(Number(item?.quantity || 1), 200));
  return {
    ...item,
    slot,
    slotName: slot,
    location: 'cargo',
    destination: 'vehicle_cargo',
    container: 'vehicle',
    inventoryLocation: 'cargo',
    toCargo: true,
    putInCargo: true,
    mount: false,
    attached: false,
    classname,
    className: classname,
    type: classname,
    quantity: Number.isFinite(quantity) ? quantity : 1,
    label: item?.label || classname,
    sortOrder: Number.isFinite(Number(item?.sortOrder)) ? Number(item.sortOrder) : index
  };
}

export const VEHICLE_PLAYER_INVENTORY_ACCESSORIES = [
  {
    classname: 'HeadlightH7',
    quantity: 2,
    label: '2 lâmpadas H7'
  }
];

// O mod do veículo agora instala o MuranoCarlock. O site remove qualquer tentativa
// antiga de colocá-lo dentro do carro, mas não cria mais entrega do CarLock.
const LEGACY_REQUIRED_VEHICLE_CARGO_CLASSES = new Set(['muranocarlock', 'headlighth7']);

const V101_FORCED_HEADLIGHT_SLOTS = new Set([
  'reflector_1_1', 'reflector_1_2', 'reflector_1',
  'reflector_2_1', 'reflector_2_2', 'reflector_2'
]);

function normalizedClassname(value) {
  return String(value || '').trim().toLowerCase();
}

function nextSortOrder(items) {
  return (Array.isArray(items) ? items : []).reduce((max, item, index) => {
    const current = Number.isFinite(Number(item?.sortOrder)) ? Number(item.sortOrder) : index;
    return Math.max(max, current);
  }, -1) + 1;
}

function isV101ForcedMountedHeadlight(part) {
  const classname = normalizedClassname(part?.classname || part?.className || part?.type);
  if (classname !== 'headlighth7') return false;
  const slot = String(part?.slot || part?.slotName || part?.attachSlot || '').trim().toLowerCase();
  const label = String(part?.label || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  return V101_FORCED_HEADLIGHT_SLOTS.has(slot) || label.includes('lampada dianteira');
}

// Regra RAID-Z V113: o mod instala o MuranoCarlock. O site só mantém as 2 HeadlightH7
// como entregas separadas ao inventário. Aqui também removemos tentativas antigas
// de Murano/H7 dentro do veículo sem tocar nas demais peças ou cargas do painel.
export function ensureVehicleRequiredEquipment(template = {}) {
  const originalParts = Array.isArray(template?.parts) ? template.parts : [];
  const originalCargo = Array.isArray(template?.cargoItems) ? template.cargoItems : [];

  const parts = originalParts
    .filter((part) => !isV101ForcedMountedHeadlight(part))
    .map((item) => ({ ...item }));

  const cargoItems = originalCargo
    .filter((item) => !LEGACY_REQUIRED_VEHICLE_CARGO_CLASSES.has(normalizedClassname(item?.classname || item?.className || item?.type)))
    .map((item, index) => ({
      ...item,
      sortOrder: Number.isFinite(Number(item?.sortOrder)) ? Number(item.sortOrder) : index
    }));

  return { parts, cargoItems };
}

export function vehicleTemplatePayload(template) {
  const requiredEquipment = ensureVehicleRequiredEquipment(template);
  const parts = requiredEquipment.parts
    .map(normalizeVehiclePartForPayload)
    .filter(Boolean);
  const cargoItems = requiredEquipment.cargoItems
    .map(normalizeCargoItemForPayload)
    .filter(Boolean);

  return {
    vehicleClassname: template.vehicleClassname,
    parts,
    // aliases das peças montadas para compatibilidade com versões do mod
    vehicleParts: parts,
    attachments: parts,
    attachmentItems: parts,
    attachToVehicle: parts,
    mountParts: parts,

    // Cargas cadastradas manualmente continuam dentro do veículo. As 2 lâmpadas H7
    // são entregues separadamente; o MuranoCarlock fica por conta do mod.
    cargoItems,
    inventoryItems: cargoItems,
    storageItems: cargoItems,
    itemsInsideVehicle: cargoItems,
    vehicleCargoItems: cargoItems,
    vehicleInventoryItems: cargoItems,
    trunkItems: cargoItems,
    itemsInCargo: cargoItems,
    cargo: cargoItems,
    items: cargoItems,
    cargoDeliveryMode: 'vehicle_inventory',
    cargoDestination: 'vehicle_cargo',
    spawnCargoInsideVehicle: true,
    placeItemsInCargo: true,
    loadCargoAfterSpawn: true,

    fluids: template.fluids || { fuelPercent: 80, waterPercent: 100, oilPercent: 100 },
    fullVehicle: true,
    mounted: true,
    shouldMountParts: true
  };
}

function getRentPrice(template, ownershipType) {
  if (ownershipType === 'RENT_1D') return Number(template.rent1DayCoins || 0);
  if (ownershipType === 'RENT_7D') return Number(template.rent7DaysCoins || 0);
  if (ownershipType === 'RENT_30D') return Number(template.rent30DaysCoins || 0);
  return Number(template.buyPriceCoins || 0);
}

function getOwnershipDays(ownershipType) {
  if (ownershipType === 'RENT_1D') return 1;
  if (ownershipType === 'RENT_7D') return 7;
  if (ownershipType === 'RENT_30D') return 30;
  return null;
}

function normalizeOwnershipType(value) {
  // V59: planos por 1 dia/7 dias/30 dias removidos da loja.
  // Qualquer tentativa antiga cai como doação permanente.
  return 'OWNED';
}

function normalizeCoverageType(value) {
  const v = String(value || 'NORMAL').trim().toUpperCase();
  if (['THEFT', 'ROUBO', 'STOLEN'].includes(v)) return 'THEFT';
  return 'NORMAL';
}

export async function publishVehicleDeliveryImmediately(steam64, context = 'vehicle') {
  const cleaned = String(steam64 || '').trim();
  if (!/^7656119\d{10}$/.test(cleaned)) return { ok: false, skipped: true, reason: 'invalid_steam64' };

  try {
    const { publishPlayerDeliveryFilesNow } = await import('./fileBridgeService.js');
    return await publishPlayerDeliveryFilesNow([cleaned]);
  } catch (error) {
    try {
      const { queueImmediatePlayerFileSync } = await import('./fileBridgeService.js');
      queueImmediatePlayerFileSync(cleaned);
    } catch {}
    console.error(`[VEHICLE_FTP_NOW] ${context} salvo, mas o envio FTP imediato falhou:`, error.message);
    return { ok: false, error: String(error?.message || error) };
  }
}

export async function queueVehicleDeliveryImmediately(steam64, context = 'vehicle') {
  const cleaned = String(steam64 || '').trim();
  if (!/^7656119\d{10}$/.test(cleaned)) return { ok: false, skipped: true, reason: 'invalid_steam64' };

  try {
    const { queueImmediatePlayerFileSync } = await import('./fileBridgeService.js');
    const queued = queueImmediatePlayerFileSync(cleaned);
    return { ok: Boolean(queued), queued: Boolean(queued), background: true };
  } catch (error) {
    console.error(`[VEHICLE_FTP_QUEUE] ${context} salvo, mas não foi possível iniciar o envio rápido:`, error.message);
    return { ok: false, error: String(error?.message || error) };
  }
}

function playerInventoryAccessoryMeta({ action, parentDeliveryId, playerVehicleId = null, displayName = '', accessory = null } = {}) {
  return {
    kind: 'vehicle_player_inventory_accessory',
    action,
    parentVehicleDeliveryId: parentDeliveryId || null,
    playerVehicleId,
    vehicleDisplayName: displayName || '',
    deliveryMode: 'player_inventory',
    itemDeliveryMode: 'player_inventory',
    requestedDeliveryType: 'player_inventory',
    target: 'player_inventory',
    destination: 'player_inventory',
    destinationType: 'PLAYER_INVENTORY',
    preferredDestination: 'player_inventory',
    inventoryOwner: 'player',
    inventorySlot: 'inventory',
    slot: 'inventory',
    giveToPlayerInventory: true,
    createInPlayerInventory: true,
    placeInPlayerInventory: true,
    putInPlayerInventory: true,
    directToPlayerInventory: true,
    preferPlayerInventory: true,
    inventoryFirst: true,
    playerInventoryItems: accessory ? [{ slot: 'inventory', classname: accessory.classname, quantity: accessory.quantity, label: accessory.label }] : [],
    inventoryItems: accessory ? [{ slot: 'inventory', classname: accessory.classname, quantity: accessory.quantity, label: accessory.label }] : [],
    items: accessory ? [{ slot: 'inventory', classname: accessory.classname, quantity: accessory.quantity, label: accessory.label }] : [],
    fallbackDropAtFeet: true,
    fallbackDeliveryType: 'drop_at_feet',
    v103VehicleAccessoryInventory: true
  };
}

export async function createVehiclePlayerInventoryAccessoryDeliveries({
  tx,
  playerId,
  steam64,
  serverType,
  action,
  parentDeliveryId,
  playerVehicleId = null,
  displayName = ''
}) {
  if (!tx) throw new Error('Transação obrigatória para criar acessórios do veículo.');

  const deliveries = [];
  for (const accessory of VEHICLE_PLAYER_INVENTORY_ACCESSORIES) {
    const delivery = await tx.deliveryQueue.create({
      data: {
        purchaseId: null,
        playerId,
        steam64,
        serverType,
        productName: `Acessório do veículo: ${accessory.label} — inventário do jogador`,
        classname: accessory.classname,
        quantity: accessory.quantity,
        // Mantém drop_at_feet como fallback para versões antigas do mod. O meta
        // V103 manda primeiro criar direto no inventário do jogador.
        deliveryType: 'drop_at_feet',
        status: 'PENDING',
        meta: playerInventoryAccessoryMeta({ action, parentDeliveryId, playerVehicleId, displayName, accessory })
      }
    });
    deliveries.push(delivery);
  }
  return deliveries;
}

// IMPORTANTE:
// O mod v20 entende drop_at_feet. Se colocar deliveryType "rental_vehicle",
// ele trata como virtual e nao dropa nada. Por isso o site manda drop_at_feet,
// mas coloca todos os dados de veiculo completo em meta para o mod novo montar.
async function createVehicleDelivery({ tx, player, playerVehicle, template, action, deleteOldVehicleKey = null, costCoins = 0, insuranceCoverageType = 'NORMAL', variant = null }) {
  const newVehicleKey = makeVehicleKey(playerVehicle.id);
  const payloadTemplate = applyVehicleVariant(template, variant);
  const selectedCoverageType = normalizeCoverageType(insuranceCoverageType);
  const isTheftCoverage = selectedCoverageType === 'THEFT';
  const meta = {
    kind: 'vehicle_rental',
    action,
    playerVehicleId: playerVehicle.id,
    vehicleKey: newVehicleKey,
    deleteOldVehicleKey,
    displayName: playerVehicle.displayName,
    selectedVariant: variant ? { name: variant.name, vehicleClassname: variant.vehicleClassname, imageUrl: variant.imageUrl || null, index: variant.index || 0 } : null,
    serverType: playerVehicle.serverType,
    deliveryMode: 'vehicle_full_mounted',
    removeOldBeforeSpawn: Boolean(deleteOldVehicleKey),
    insuranceCoverageType: selectedCoverageType,

    // Regras usadas pelo mod DayZ na hora de apagar o carro antigo e dropar o novo.
    // NORMAL: player precisa estar perto do carro antigo, agora com limite de 250m.
    // THEFT/ROUBO: ignora distância do player; pode estar do outro lado do mapa.
    //              Só apaga se o veículo antigo estiver parado e sem player dentro.
    insuranceRules: {
      coverageType: selectedCoverageType,
      normalMaxDistanceMeters: NORMAL_INSURANCE_DISTANCE_METERS,
      maxDistanceMeters: isTheftCoverage ? null : NORMAL_INSURANCE_DISTANCE_METERS,
      requirePlayerNearOldVehicle: !isTheftCoverage,
      ignorePlayerDistance: isTheftCoverage,
      allowOldVehicleAnywhereOnMap: isTheftCoverage,
      requireOldVehicleStopped: isTheftCoverage,
      requireOldVehicleEmpty: isTheftCoverage,
      minSpeedToBlockKmh: 1
    },

    // Aliases simples para compatibilidade com versões antigas do mod.
    normalMaxDistanceMeters: NORMAL_INSURANCE_DISTANCE_METERS,
    insuranceNormalMaxDistanceMeters: NORMAL_INSURANCE_DISTANCE_METERS,
    maxDistanceMeters: isTheftCoverage ? null : NORMAL_INSURANCE_DISTANCE_METERS,
    requirePlayerNearOldVehicle: !isTheftCoverage,
    ignorePlayerDistance: isTheftCoverage,
    allowOldVehicleAnywhereOnMap: isTheftCoverage,
    theftIgnorePlayerDistance: isTheftCoverage,
    theftAllowAnyDistance: isTheftCoverage,
    theftRequiresVehicleStopped: isTheftCoverage,
    theftRequiresVehicleEmpty: isTheftCoverage,
    ...vehicleTemplatePayload(payloadTemplate)
  };

  const delivery = await tx.deliveryQueue.create({
    data: {
      purchaseId: null,
      playerId: player.id,
      steam64: player.steam64,
      serverType: playerVehicle.serverType,
      productName: `${action === 'RESPAWN' ? 'Reposição' : 'Veículo'}: ${playerVehicle.displayName}`,
      classname: playerVehicle.vehicleClassname,
      quantity: 1,
      deliveryType: 'drop_at_feet',
      meta
    }
  });

  await tx.playerVehicle.update({
    where: { id: playerVehicle.id },
    data: {
      currentVehicleKey: newVehicleKey,
      lastRespawnAt: new Date(),
      nextRespawnAt: addDays(new Date(), 1),
      deliveriesCreated: { increment: 1 }
    }
  });

  await tx.vehicleRespawnLog.create({
    data: {
      playerVehicleId: playerVehicle.id,
      playerId: player.id,
      deliveryId: delivery.id,
      action,
      oldVehicleKey: deleteOldVehicleKey,
      newVehicleKey,
      costCoins,
      status: 'PENDING'
    }
  });

  const accessoryDeliveries = await createVehiclePlayerInventoryAccessoryDeliveries({
    tx,
    playerId: player.id,
    steam64: player.steam64,
    serverType: playerVehicle.serverType,
    action,
    parentDeliveryId: delivery.id,
    playerVehicleId: playerVehicle.id,
    displayName: playerVehicle.displayName
  });

  return { ...delivery, accessoryDeliveries };
}


export async function restoreMissingVehicleWithSameId({ playerVehicleId }) {
  const result = await prisma.$transaction(async (tx) => {
    const vehicle = await tx.playerVehicle.findUnique({
      where: { id: playerVehicleId },
      include: { player: true, template: true, insurancePlan: true }
    });
    if (!vehicle) throw new Error('Veículo do player não encontrado.');
    if (vehicle.status !== 'ACTIVE') throw new Error('Esse veículo não está ativo na garagem.');
    if (isExpired(vehicle.expiresAt)) throw new Error('Esse veículo venceu. Renove antes de restaurar.');

    // O ID precisa continuar igual ao salvo na garagem. Se uma versão antiga nunca
    // gerou o ID, cria um único ID de recuperação e passa a mantê-lo dali em diante.
    const stableVehicleKey = vehicle.currentVehicleKey
      || `RZRECOVER_${vehicle.id}_${Date.now().toString(36)}`;

    // Uma solicitação de seguro travada pode deixar entrega/log PENDING para sempre.
    // O botão de recuperação cancela somente essas filas do mesmo veículo antes de
    // recriar o carro sumido. Assim não nasce uma segunda reposição atrasada depois.
    const pendingLogs = await tx.vehicleRespawnLog.findMany({
      where: {
        playerVehicleId: vehicle.id,
        status: 'PENDING',
        action: { in: ['RESPAWN', 'ADMIN_RESPAWN', 'ADMIN_RESTORE_MISSING'] }
      },
      orderBy: { createdAt: 'desc' }
    });

    const pendingDeliveryIds = pendingLogs.map(log => log.deliveryId).filter(Boolean);
    let cancelledDeliveryIds = [];
    if (pendingDeliveryIds.length) {
      const pendingPlayerDeliveries = await tx.deliveryQueue.findMany({
        where: {
          playerId: vehicle.playerId,
          status: { in: ['PENDING', 'PROCESSING'] }
        },
        select: { id: true, meta: true }
      });
      const parentIds = new Set(pendingDeliveryIds);
      cancelledDeliveryIds = pendingPlayerDeliveries
        .filter(item => parentIds.has(item.id) || parentIds.has(item.meta?.parentVehicleDeliveryId))
        .map(item => item.id);

      if (cancelledDeliveryIds.length) {
        await tx.deliveryQueue.updateMany({
          where: { id: { in: cancelledDeliveryIds } },
          data: {
            status: 'FAILED',
            claimedAt: null,
            error: 'Cancelada pelo ADM para restaurar o carro sumido com o mesmo ID.'
          }
        });
      }

      await tx.vehicleRespawnLog.updateMany({
        where: { id: { in: pendingLogs.map(log => log.id) } },
        data: {
          status: 'FAILED',
          error: 'Cancelada pelo ADM para restaurar o carro sumido com o mesmo ID.'
        }
      });
    }

    // Se uma reposição de seguro estava PENDING, devolve a cobrança e o uso porque
    // ela foi cancelada pelo botão de recuperação e não entregou o veículo.
    const cancelledInsuranceClaims = pendingLogs.filter(log => log.action === 'RESPAWN');
    const refundedCoins = cancelledInsuranceClaims.reduce((sum, log) => sum + Math.max(0, Number(log.costCoins || 0)), 0);
    if (refundedCoins > 0) {
      await changePlayerCoins({
        playerId: vehicle.playerId,
        amount: refundedCoins,
        reason: `Estorno de seguro travado: ${vehicle.displayName}`,
        refType: 'vehicle_admin_restore_refund',
        refId: vehicle.id,
        tx
      });
    }

    const restoredUses = cancelledInsuranceClaims.length;
    const payloadTemplate = {
      ...vehicle.template,
      vehicleClassname: vehicle.vehicleClassname
    };

    const delivery = await tx.deliveryQueue.create({
      data: {
        purchaseId: null,
        playerId: vehicle.playerId,
        steam64: vehicle.steam64,
        serverType: vehicle.serverType,
        productName: `ADM restaurar carro sumido (mesmo ID): ${vehicle.displayName}`,
        classname: vehicle.vehicleClassname,
        quantity: 1,
        deliveryType: 'drop_at_feet',
        status: 'PENDING',
        meta: {
          kind: 'vehicle_rental',
          action: 'ADMIN_RESTORE_MISSING',
          playerVehicleId: vehicle.id,
          vehicleKey: stableVehicleKey,
          deleteOldVehicleKey: null,
          displayName: vehicle.displayName,
          serverType: vehicle.serverType,
          deliveryMode: 'vehicle_full_mounted',
          restoreMissingVehicle: true,
          preserveVehicleKey: true,
          sameVehicleId: true,
          useExistingVehicleKey: true,
          forceSpawnIfMissing: true,
          skipOldVehicleLookup: true,
          doNotDeleteOldVehicle: true,
          removeOldBeforeSpawn: false,
          adminRecovery: true,
          skipInsuranceCharge: true,
          skipInsuranceUsage: true,
          ...vehicleTemplatePayload(payloadTemplate),
          vehicleClassname: vehicle.vehicleClassname
        }
      }
    });

    const updatedVehicle = await tx.playerVehicle.update({
      where: { id: vehicle.id },
      data: {
        currentVehicleKey: stableVehicleKey,
        currentVehicleMoving: false,
        currentVehicleOccupied: false,
        currentVehicleCanTheftClaim: true,
        currentVehicleSpeedKmh: 0,
        currentVehiclePosition: null,
        currentVehicleLastSeenAt: null,
        lastRespawnAt: new Date(),
        insuranceUsesThisWeek: Math.max(0, Number(vehicle.insuranceUsesThisWeek || 0) - restoredUses),
        insuranceUsesTotal: Math.max(0, Number(vehicle.insuranceUsesTotal || 0) - restoredUses),
        deliveriesCreated: { increment: 1 }
      }
    });

    await tx.vehicleRespawnLog.create({
      data: {
        playerVehicleId: vehicle.id,
        playerId: vehicle.playerId,
        deliveryId: delivery.id,
        action: 'ADMIN_RESTORE_MISSING',
        oldVehicleKey: stableVehicleKey,
        newVehicleKey: stableVehicleKey,
        costCoins: 0,
        status: 'PENDING'
      }
    });

    const accessoryDeliveries = await createVehiclePlayerInventoryAccessoryDeliveries({
      tx,
      playerId: vehicle.playerId,
      steam64: vehicle.steam64,
      serverType: vehicle.serverType,
      action: 'ADMIN_RESTORE_MISSING',
      parentDeliveryId: delivery.id,
      playerVehicleId: vehicle.id,
      displayName: vehicle.displayName
    });

    return {
      vehicle: updatedVehicle,
      steam64: vehicle.steam64,
      deliveryId: delivery.id,
      accessoryDeliveryIds: accessoryDeliveries.map(item => item.id),
      vehicleKey: stableVehicleKey,
      cancelledClaims: pendingLogs.length,
      cancelledDeliveryIds,
      refundedCoins,
      restoredInsuranceUses: restoredUses
    };
  }, { isolationLevel: 'Serializable' });

  await logAudit({
    actor: 'admin',
    action: 'vehicle.admin_restore_missing_same_id',
    target: result.vehicle.id,
    data: {
      deliveryId: result.deliveryId,
      accessoryDeliveryIds: result.accessoryDeliveryIds,
      vehicleKey: result.vehicleKey,
      cancelledClaims: result.cancelledClaims,
      cancelledDeliveryIds: result.cancelledDeliveryIds,
      refundedCoins: result.refundedCoins,
      restoredInsuranceUses: result.restoredInsuranceUses
    }
  });

  const immediate = await publishVehicleDeliveryImmediately(result.steam64, 'restauração admin de carro sumido com mesmo ID');
  if (!immediate?.ok) {
    await queueVehicleDeliveryImmediately(result.steam64, 'restauração admin de carro sumido com mesmo ID');
  }
  return { ...result, fileBridgeImmediate: immediate };
}

async function createDirectVehicleDelivery({ tx, player, template, costCoins = 0, variant = null }) {
  const vehicleKey = makeVehicleKey('direct');
  const payloadTemplate = applyVehicleVariant(template, variant);
  const meta = {
    kind: 'vehicle_direct_purchase',
    action: 'BUY_DIRECT',
    vehicleKey,
    displayName: template.name,
    selectedVariant: variant ? { name: variant.name, vehicleClassname: variant.vehicleClassname, imageUrl: variant.imageUrl || null, index: variant.index || 0 } : null,
    serverType: template.serverType,
    deliveryMode: 'vehicle_full_mounted',
    note: 'Compra permanente sem seguro. Não fica na garagem do player.',
    ...vehicleTemplatePayload(payloadTemplate)
  };

  const delivery = await tx.deliveryQueue.create({
    data: {
      purchaseId: null,
      playerId: player.id,
      steam64: player.steam64,
      serverType: template.serverType,
      productName: `Veículo comprado sem seguro: ${template.name}${variant && !variant.isDefault ? ' - ' + variant.name : ''}`,
      classname: payloadTemplate.vehicleClassname,
      quantity: 1,
      deliveryType: 'drop_at_feet',
      meta
    }
  });

  const accessoryDeliveries = await createVehiclePlayerInventoryAccessoryDeliveries({
    tx,
    playerId: player.id,
    steam64: player.steam64,
    serverType: template.serverType,
    action: 'BUY_DIRECT',
    parentDeliveryId: delivery.id,
    playerVehicleId: null,
    displayName: template.name
  });

  await logAudit({
    actor: player.steam64,
    action: 'vehicle.direct_purchase.delivery_created',
    target: delivery.id,
    data: { templateId: template.id, vehicleClassname: payloadTemplate.vehicleClassname, variant: variant?.name || null, vehicleKey, costCoins, accessoryDeliveryIds: accessoryDeliveries.map(item => item.id) }
  });

  return { ...delivery, accessoryDeliveries };
}

export async function buyOrRentVehicle({ playerId, templateId, ownershipType = 'OWNED', insurancePlanId = null, variantIndex = 0 }) {
  const result = await prisma.$transaction(async (tx) => {
    const player = await tx.player.findUnique({ where: { id: playerId } });
    if (!player) throw new Error('Player não encontrado.');

    const template = await tx.vehicleTemplate.findUnique({ where: { id: templateId } });
    if (!template || !template.active) throw new Error('Veículo não encontrado ou inativo.');

    const selectedVariant = selectVehicleVariant(template, variantIndex);
    const selectedTemplate = applyVehicleVariant(template, selectedVariant);
    const displayName = selectedVariant && !selectedVariant.isDefault ? `${template.name} - ${selectedVariant.name}` : template.name;

    const normalizedOwnership = normalizeOwnershipType(ownershipType);
    const vehiclePrice = getRentPrice(template, normalizedOwnership);
    if (vehiclePrice <= 0) throw new Error('Esse veículo está sem valor de doação cadastrado.');

    // V129: seguro mensal obrigatório em toda compra. O primeiro mês continua
    // incluso no valor do veículo; depois a renovação custa 50% do valor do carro.
    const insurancePlan = await resolveMonthlyInsurancePlan(tx, template, insurancePlanId || null);
    const insurancePrice = getVehicleInsurancePlanPrice(insurancePlan, template, { chargeAtPurchase: true });
    const insuranceExpiresAt = addDays(new Date(), insurancePlan.durationDays || 30);

    const total = vehiclePrice + insurancePrice;
    const updatedPlayer = await changePlayerCoins({
      playerId,
      amount: -total,
      reason: `Veículo doado: ${template.name} + seguro ${insurancePlan.name}`,
      refType: 'vehicle',
      refId: template.id,
      tx
    });

    // V129: todo veículo comprado fica na Minha Garagem com seguro mensal ativo.
    const days = getOwnershipDays(normalizedOwnership);
    const playerVehicle = await tx.playerVehicle.create({
      data: {
        playerId: updatedPlayer.id,
        steam64: updatedPlayer.steam64,
        templateId: template.id,
        insurancePlanId: insurancePlan?.id || null,
        serverType: template.serverType,
        displayName,
        vehicleClassname: selectedTemplate.vehicleClassname,
        ownershipType: normalizedOwnership,
        status: 'ACTIVE',
        expiresAt: days ? addDays(new Date(), days) : null,
        insuranceExpiresAt,
        insuranceUsesWeekStart: new Date(),
        insuranceUsesThisWeek: 0,
        insuranceUsesTotal: 0,
        deliveriesCreated: 0,
        currentVehicleMoving: false,
        currentVehicleOccupied: false,
        currentVehicleCanTheftClaim: true,
        currentVehicleSpeedKmh: 0
      }
    });

    const delivery = await createVehicleDelivery({
      tx,
      player: updatedPlayer,
      playerVehicle,
      template,
      action: 'BUY',
      costCoins: total,
      insuranceCoverageType: insurancePlan.coverageType || 'NORMAL',
      variant: selectedVariant
    });
    return { player: updatedPlayer, template: selectedTemplate, insurancePlan, playerVehicle, delivery, total, direct: false, variant: selectedVariant };
  });

  await logAudit({
    actor: result.player.steam64,
    action: 'vehicle.buy_or_rent',
    target: result.playerVehicle?.id || result.delivery.id,
    data: {
      templateId,
      ownershipType,
      totalCoins: result.total,
      insurancePlanId: result.insurancePlan?.id || null,
      variant: result.variant ? { name: result.variant.name, vehicleClassname: result.variant.vehicleClassname, index: result.variant.index } : null,
      direct: false,
      deliveryId: result.delivery?.id
    }
  });
  result.fileBridgeImmediate = await queueVehicleDeliveryImmediately(result.player.steam64, 'compra de veículo');
  return result;
}

function isExpired(date) {
  return date && new Date(date).getTime() < Date.now();
}

function resetWeeklyUsageIfNeeded(vehicle) {
  const start = vehicle.insuranceUsesWeekStart ? new Date(vehicle.insuranceUsesWeekStart) : null;
  if (!start || Date.now() - start.getTime() >= WEEK_MS) return { reset: true, uses: 0, weekStart: new Date() };
  return { reset: false, uses: vehicle.insuranceUsesThisWeek || 0, weekStart: start };
}

export async function requestVehicleRespawn({ playerId, playerVehicleId, coverageType = 'NORMAL' }) {
  const result = await prisma.$transaction(async (tx) => {
    const player = await tx.player.findUnique({ where: { id: playerId } });
    if (!player) throw new Error('Player não encontrado.');

    const vehicle = await tx.playerVehicle.findFirst({
      where: { id: playerVehicleId, playerId: player.id },
      include: { template: true, insurancePlan: true }
    });
    if (!vehicle) throw new Error('Veículo não encontrado na sua garagem.');

    // Trava persistente: um mesmo veículo nunca pode gerar duas reposições ao mesmo tempo,
    // mesmo que o jogador clique várias vezes ou o site/servidor reinicie no meio.
    const pendingClaim = await tx.vehicleRespawnLog.findFirst({
      where: {
        playerVehicleId: vehicle.id,
        status: 'PENDING',
        action: { in: ['RESPAWN', 'ADMIN_RESPAWN'] }
      },
      orderBy: { createdAt: 'desc' }
    });
    if (pendingClaim) throw new Error('Já existe uma reposição pendente para esse veículo. Aguarde o carro antigo parar e o servidor concluir.');

    if (vehicle.status !== 'ACTIVE') throw new Error('Esse veículo não está ativo.');
    if (isExpired(vehicle.expiresAt)) throw new Error('Esse veículo venceu. Fale com a staff para renovar antes de dropar outro.');
    if (!vehicle.insurancePlan) throw new Error('Esse veículo não tem seguro. Sem seguro, não pode pedir reposição.');

    const plan = vehicle.insurancePlan;
    const selectedCoverageType = normalizeCoverageType(coverageType);
    let cost = 0;
    let newUses = vehicle.insuranceUsesThisWeek || 0;
    let weekStart = vehicle.insuranceUsesWeekStart || new Date();
    const weekly = resetWeeklyUsageIfNeeded(vehicle);
    if (weekly.reset) {
      newUses = 0;
      weekStart = weekly.weekStart;
    }

    if (plan.billingType !== 'SUBSCRIPTION') throw new Error('O seguro por uso foi removido. Renove para o seguro mensal.');
    if (!vehicle.insuranceExpiresAt || isExpired(vehicle.insuranceExpiresAt)) throw new Error('Seu seguro mensal venceu. Renove antes de usar.');
    if (newUses >= Number(plan.maxUsesPerWeek || 5)) throw new Error(`Seu seguro já usou ${newUses}/${plan.maxUsesPerWeek || 5} reposições nesta semana.`);
    cost = Number(plan.respawnFeeCoins || 0);
    newUses += 1;

    const updatedPlayer = cost > 0
      ? await changePlayerCoins({ playerId: player.id, amount: -cost, reason: `Reposição seguro: ${vehicle.displayName}`, refType: 'vehicle_respawn', refId: vehicle.id, tx })
      : player;

    const oldKey = vehicle.currentVehicleKey || null;
    const delivery = await createVehicleDelivery({ tx, player: updatedPlayer, playerVehicle: vehicle, template: vehicle.template, action: 'RESPAWN', deleteOldVehicleKey: oldKey, costCoins: cost, insuranceCoverageType: selectedCoverageType });

    await tx.playerVehicle.update({
      where: { id: vehicle.id },
      data: {
        insuranceUsesThisWeek: newUses,
        insuranceUsesWeekStart: weekStart,
        insuranceUsesTotal: { increment: 1 },
        lastInsuranceUsedAt: new Date()
      }
    });
    return { player: updatedPlayer, vehicle, plan, delivery, cost, newUses };
  }, { isolationLevel: 'Serializable' });

  await logAudit({
    actor: result.player.steam64,
    action: 'vehicle.respawn.requested',
    target: result.vehicle.id,
    data: { costCoins: result.cost, deliveryId: result.delivery.id, planId: result.plan.id, coverageType: result.delivery.meta?.insuranceCoverageType || null, insuranceRules: result.delivery.meta?.insuranceRules || null, weeklyUsesAfter: result.newUses }
  });
  result.fileBridgeImmediate = await queueVehicleDeliveryImmediately(result.player.steam64, 'reposição de seguro');
  return result;
}

export async function renewVehicle({ playerId, playerVehicleId, days = 30 }) {
  const result = await prisma.$transaction(async (tx) => {
    const player = await tx.player.findUnique({ where: { id: playerId } });
    const vehicle = await tx.playerVehicle.findFirst({ where: { id: playerVehicleId, playerId }, include: { template: true } });
    if (!player || !vehicle) throw new Error('Veículo não encontrado.');
    const price = days <= 1 ? Number(vehicle.template.rent1DayCoins || 0) : days <= 7 ? Number(vehicle.template.rent7DaysCoins || 0) : Number(vehicle.template.rent30DaysCoins || 0);
    if (price <= 0) throw new Error('Esse veículo não tem renovação por período cadastrada.');
    const baseDate = vehicle.expiresAt && new Date(vehicle.expiresAt).getTime() > Date.now() ? new Date(vehicle.expiresAt) : new Date();
    const expiresAt = addDays(baseDate, days);
    const updatedPlayer = await changePlayerCoins({ playerId, amount: -price, reason: `Renovação veículo ${vehicle.displayName} por ${days} dia(s)`, refType: 'vehicle_renew', refId: vehicle.id, tx });
    const updatedVehicle = await tx.playerVehicle.update({ where: { id: vehicle.id }, data: { expiresAt, status: 'ACTIVE' } });
    await tx.vehicleRespawnLog.create({ data: { playerVehicleId: vehicle.id, playerId, action: 'RENEW_VEHICLE', costCoins: price, status: 'DELIVERED' } });
    return { player: updatedPlayer, vehicle: updatedVehicle, price };
  });
  await logAudit({ actor: result.player.steam64, action: 'vehicle.renewed', target: result.vehicle.id, data: { costCoins: result.price } });
  result.fileBridgeImmediate = await queueVehicleDeliveryImmediately(result.player.steam64, 'renovação de veículo');
  return result;
}

export async function renewInsurance({ playerId, playerVehicleId }) {
  const result = await prisma.$transaction(async (tx) => {
    const player = await tx.player.findUnique({ where: { id: playerId } });
    const vehicle = await tx.playerVehicle.findFirst({ where: { id: playerVehicleId, playerId }, include: { insurancePlan: true, template: true } });
    if (!player || !vehicle) throw new Error('Veículo não encontrado.');
    const plan = vehicle.insurancePlan;
    if (!plan) throw new Error('Esse veículo não tem plano de seguro mensal.');
    if (plan.billingType !== 'SUBSCRIPTION') throw new Error('O seguro por uso foi removido. Escolha o seguro mensal.');
    const price = getVehicleInsurancePlanPrice(plan, vehicle.template);
    const baseDate = vehicle.insuranceExpiresAt && new Date(vehicle.insuranceExpiresAt).getTime() > Date.now() ? new Date(vehicle.insuranceExpiresAt) : new Date();
    const insuranceExpiresAt = addDays(baseDate, plan.durationDays || 30);
    const updatedPlayer = await changePlayerCoins({ playerId, amount: -price, reason: `Renovação seguro ${plan.name}`, refType: 'vehicle_insurance', refId: vehicle.id, tx });
    const updatedVehicle = await tx.playerVehicle.update({ where: { id: vehicle.id }, data: { insuranceExpiresAt, insuranceUsesThisWeek: 0, insuranceUsesWeekStart: new Date() } });
    await tx.vehicleRespawnLog.create({ data: { playerVehicleId: vehicle.id, playerId, action: 'RENEW_INSURANCE', costCoins: price, status: 'DELIVERED' } });
    return { player: updatedPlayer, vehicle: updatedVehicle, price };
  });
  await logAudit({ actor: result.player.steam64, action: 'vehicle.insurance.renewed', target: result.vehicle.id, data: { costCoins: result.price } });
  result.fileBridgeImmediate = await queueVehicleDeliveryImmediately(result.player.steam64, 'renovação de seguro');
  return result;
}

export async function upgradeInsurancePlan({ playerId, playerVehicleId, planId }) {
  const result = await prisma.$transaction(async (tx) => {
    const player = await tx.player.findUnique({ where: { id: playerId } });
    const vehicle = await tx.playerVehicle.findFirst({ where: { id: playerVehicleId, playerId }, include: { insurancePlan: true, template: true } });
    if (!player || !vehicle) throw new Error('Veículo não encontrado.');

    const plan = await tx.vehicleInsurancePlan.findUnique({ where: { id: planId } });
    if (!plan || !plan.active) throw new Error('Plano de seguro inválido ou inativo.');
    if (plan.billingType !== 'SUBSCRIPTION') throw new Error('O seguro por uso foi removido. Escolha o seguro mensal.');
    if (plan.templateId && plan.templateId !== vehicle.templateId) throw new Error('Esse plano pertence a outro veículo.');

    const price = getVehicleInsurancePlanPrice(plan, vehicle.template);
    const updatedPlayer = price > 0
      ? await changePlayerCoins({ playerId, amount: -price, reason: `${vehicle.insurancePlanId ? 'Upgrade' : 'Contratação'} seguro ${plan.name} para ${vehicle.displayName}`, refType: 'vehicle_insurance_upgrade', refId: vehicle.id, tx })
      : player;

    const data = {
      insurancePlanId: plan.id,
      insuranceUsesThisWeek: 0,
      insuranceUsesWeekStart: new Date()
    };

    data.insuranceExpiresAt = addDays(new Date(), plan.durationDays || 30);

    const updatedVehicle = await tx.playerVehicle.update({ where: { id: vehicle.id }, data });
    await tx.vehicleRespawnLog.create({
      data: {
        playerVehicleId: vehicle.id,
        playerId,
        action: vehicle.insurancePlanId ? 'UPGRADE_INSURANCE' : 'ADD_INSURANCE',
        costCoins: price,
        status: 'DELIVERED'
      }
    });

    return { player: updatedPlayer, vehicle: updatedVehicle, oldPlanId: vehicle.insurancePlanId, newPlan: plan, price };
  });

  await logAudit({
    actor: result.player.steam64,
    action: 'vehicle.insurance.upgraded',
    target: result.vehicle.id,
    data: { oldPlanId: result.oldPlanId, newPlanId: result.newPlan.id, costCoins: result.price }
  });
  result.fileBridgeImmediate = await queueVehicleDeliveryImmediately(result.player.steam64, 'atualização de seguro');
  return result;
}

export async function cancelPlayerVehicle({ playerId, playerVehicleId }) {
  const vehicle = await prisma.playerVehicle.findFirst({ where: { id: playerVehicleId, playerId } });
  if (!vehicle) throw new Error('Veículo não encontrado.');
  if (vehicle.status !== 'ACTIVE') throw new Error('Esse veículo já não está ativo na conta.');

  const updated = await prisma.playerVehicle.update({
    where: { id: vehicle.id },
    data: { status: 'CANCELLED' }
  });
  await logAudit({ actor: vehicle.steam64, action: 'vehicle.cancelled', target: vehicle.id, data: { currentVehicleKey: vehicle.currentVehicleKey } });

  // A fila imediata também atualiza o arquivo de seguros/garagem do mod.
  // Assim o veículo removido some sem esperar o próximo ciclo periódico do FTP.
  updated.fileBridgeImmediate = await queueVehicleDeliveryImmediately(vehicle.steam64, 'remoção de veículo da conta');
  return updated;
}

export async function markVehicleDeliveryResult(delivery, ok, error = null) {
  const meta = delivery?.meta || {};
  if (meta.kind !== 'vehicle_rental' || !meta.playerVehicleId) return;

  await prisma.$transaction(async tx => {
    const log = await tx.vehicleRespawnLog.findFirst({ where: { deliveryId: delivery.id } });
    if (!log) return;

    // Idempotência: arquivo repetido após falha de FTP não executa a transição duas vezes.
    if (ok && log.status === 'DELIVERED') return;
    if (!ok && log.status === 'FAILED') return;

    if (ok) {
      await tx.vehicleRespawnLog.update({
        where: { id: log.id },
        data: { status: 'DELIVERED', error: null }
      });
      if (log.newVehicleKey) {
        await tx.playerVehicle.update({
          where: { id: meta.playerVehicleId },
          data: { currentVehicleKey: log.newVehicleKey }
        });
      }
      return;
    }

    const failure = String(error || delivery.error || 'Falha na entrega').slice(0, 900);
    await tx.vehicleRespawnLog.update({
      where: { id: log.id },
      data: { status: 'FAILED', error: failure }
    });

    // Se o novo veículo nunca nasceu, devolve a garagem para a chave antiga.
    // A condição evita desfazer uma entrega mais nova que já tenha sido criada depois.
    await tx.playerVehicle.updateMany({
      where: { id: meta.playerVehicleId, currentVehicleKey: log.newVehicleKey || undefined },
      data: { currentVehicleKey: log.oldVehicleKey || null }
    });
  });
}


export async function updateVehicleRuntimeStatusFromGame({ vehicleKey, classname, position, speedKmh = 0, moving = false, occupied = false, canTheftClaim = null }) {
  const key = String(vehicleKey || '').trim();
  if (!key) throw new Error('vehicleKey obrigatório.');

  const speed = Number(speedKmh || 0);
  const isMoving = Boolean(moving) || speed > 1;
  const isOccupied = Boolean(occupied);
  const theftReadyByCriteria = !isMoving && !isOccupied;
  const theftReady = canTheftClaim === null || typeof canTheftClaim === 'undefined'
    ? theftReadyByCriteria
    : Boolean(canTheftClaim) && theftReadyByCriteria;

  const updated = await prisma.playerVehicle.updateMany({
    where: { currentVehicleKey: key },
    data: {
      currentVehicleMoving: isMoving,
      currentVehicleOccupied: isOccupied,
      currentVehicleCanTheftClaim: theftReady,
      currentVehicleSpeedKmh: speed,
      currentVehiclePosition: String(position || ''),
      currentVehicleLastSeenAt: new Date()
    }
  });

  return { matched: updated.count, vehicleKey: key, theftReady };
}

export async function createOrUpdateVehicleTemplateFromBody({ body, file, id = null }) {
  const preparedImage = prepareUploadedImage(file);
  const imageData = preparedImage?.imageData;
  const imageMime = preparedImage?.imageMime;
  const parts = parseVehiclePartsInput(body.partsText);
  const cargoItems = parseVehicleCargoItemsInput(body.cargoItemsText);
  const fluids = normalizeFluids(body);
  const variants = parseVehicleVariantsInput(body.variantsText);
  const requiredEquipment = ensureVehicleRequiredEquipment({ parts, cargoItems });
  const data = {
    name: body.name,
    description: body.description || null,
    serverType: normalizeServerType(body.serverType),
    vehicleClassname: String(body.vehicleClassname || '').trim(),
    buyPriceCoins: Number(body.buyPriceCoins || 0),
    rent1DayCoins: Number(body.rent1DayCoins || 0),
    rent7DaysCoins: Number(body.rent7DaysCoins || 0),
    rent30DaysCoins: Number(body.rent30DaysCoins || 0),
    imageUrl: body.imageUrl || null,
    parts: requiredEquipment.parts,
    cargoItems: requiredEquipment.cargoItems,
    fluids,
    variants: variants.length ? variants : null,
    active: body.active === 'on'
  };
  if (!data.name || !data.vehicleClassname) throw new Error('Informe nome e classname do veículo.');
  if (imageData) {
    data.imageData = imageData;
    data.imageMime = imageMime;
  }
  if (id) {
    return prisma.vehicleTemplate.update({ where: { id }, data });
  }
  data.slug = `${slugify(data.name)}-${Date.now().toString(36)}`;
  return prisma.vehicleTemplate.create({ data });
}

export async function createInsurancePlanFromBody(body) {
  const billingType = 'SUBSCRIPTION';
  return prisma.vehicleInsurancePlan.create({
    data: {
      templateId: body.templateId || null,
      name: body.name,
      billingType,
      coverageType: normalizeCoverageType(body.coverageType),
      priceCoins: Number(body.priceCoins || 0),
      respawnFeeCoins: Number(body.respawnFeeCoins || 0),
      durationDays: Number(body.durationDays || 30),
      maxUsesPerWeek: Number(body.maxUsesPerWeek || 1),
      description: body.description || null,
      active: body.active === 'on'
    }
  });
}
