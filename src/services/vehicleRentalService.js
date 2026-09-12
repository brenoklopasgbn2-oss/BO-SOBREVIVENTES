import { prisma } from '../db/prisma.js';
import { changePlayerCoins } from './playerService.js';
import { logAudit } from './auditService.js';
import { slugify } from '../utils/slug.js';

const GAME_SERVER_TYPES = ['vanilla', 'bbp'];
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
export const NORMAL_INSURANCE_DISTANCE_METERS = 250;

function runDetached(label, task) {
  setImmediate(() => {
    Promise.resolve()
      .then(task)
      .catch(error => console.error(`[${label}]`, error?.message || error));
  });
}

export function getVehicleMonthlyInsurancePrice(template, plan = null) {
  const fixedPrice = Math.max(0, Number(plan?.priceCoins || 0));
  if (plan?.templateId && fixedPrice > 0) return fixedPrice;
  const value = Math.max(0, Number(template?.buyPriceCoins || 0));
  return Math.round(value * 0.5);
}

export function getVehicleInsurancePlanPrice(plan, template, { chargeAtPurchase = false } = {}) {
  if (!plan) return 0;

  // O primeiro mês do seguro mensal já está incluso na compra do veículo.
  if (chargeAtPurchase) return 0;
  return getVehicleMonthlyInsurancePrice(template, plan);
}

async function resolveMonthlyInsurancePlan(tx, template, requestedPlanId = null) {
  // Planos exclusivos sempre têm prioridade. Isso impede a camionete de usar o
  // seguro global mais barato e garante a renovação fixa cadastrada para o modelo.
  const templatePlan = await tx.vehicleInsurancePlan.findFirst({
    where: { active: true, billingType: 'SUBSCRIPTION', templateId: template.id },
    orderBy: { updatedAt: 'desc' }
  });
  if (templatePlan) {
    if (requestedPlanId && requestedPlanId !== templatePlan.id) {
      throw new Error('Este veículo possui um seguro mensal exclusivo. Use o plano exibido para ele.');
    }
    return templatePlan;
  }

  if (requestedPlanId) {
    const requested = await tx.vehicleInsurancePlan.findUnique({ where: { id: requestedPlanId } });
    if (!requested || !requested.active) throw new Error('Seguro não encontrado ou inativo.');
    if (requested.billingType !== 'SUBSCRIPTION') throw new Error('O seguro por uso foi removido. Escolha o seguro mensal.');
    if (requested.templateId && requested.templateId !== template.id) throw new Error('Esse seguro pertence a outro veículo.');
    return requested;
  }

  // V129: todo veículo novo sai obrigatoriamente com seguro mensal ativo.
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
    const [name, classname, imageUrl, manualClassname, autoClassname] = clean.split('|').map(v => String(v || '').trim());
    if (!name || !(classname || manualClassname || autoClassname)) return null;
    return {
      name,
      vehicleClassname: classname || manualClassname || autoClassname,
      imageUrl: imageUrl || null,
      manualClassname: manualClassname || '',
      autoClassname: autoClassname || '',
      sortOrder: index
    };
  }).filter(Boolean);
}

export function variantsToText(variants) {
  const list = Array.isArray(variants) ? variants : [];
  return list
    .map(v => `${v.name || ''}|${v.vehicleClassname || ''}${v.imageUrl ? '|' + v.imageUrl : ''}${v.manualClassname ? '|' + v.manualClassname : ''}${v.autoClassname ? '|' + v.autoClassname : ''}`)
    .join('\n');
}

export function normalizeVehicleVariants(template) {
  const raw = Array.isArray(template?.variants) ? template.variants : [];
  const valid = raw.map((variant, index) => ({
    name: String(variant?.name || `Opção ${index + 1}`).trim(),
    vehicleClassname: String(variant?.vehicleClassname || '').trim(),
    manualClassname: String(variant?.manualClassname || '').trim(),
    autoClassname: String(variant?.autoClassname || '').trim(),
    imageUrl: String(variant?.imageUrl || '').trim() || null,
    parts: Array.isArray(variant?.parts) ? variant.parts : null,
    cargoItems: Array.isArray(variant?.cargoItems) ? variant.cargoItems : null,
    sortOrder: Number.isFinite(Number(variant?.sortOrder)) ? Number(variant.sortOrder) : index,
    index
  })).filter(variant => variant.vehicleClassname || variant.manualClassname || variant.autoClassname);

  if (valid.length) {
    return valid.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)).map((variant, index) => ({ ...variant, index }));
  }

  return [{
    name: 'Padrão',
    vehicleClassname: template.vehicleClassname,
    manualClassname: '',
    autoClassname: '',
    imageUrl: template.imageUrl || null,
    parts: null,
    cargoItems: null,
    sortOrder: 0,
    index: 0,
    isDefault: true
  }];
}

function normalizeTransmission(value) {
  const v = String(value || '').trim().toLowerCase();
  if (['manual', 'm', 'marchas'].includes(v)) return 'manual';
  if (['auto', 'automatico', 'automático', 'a'].includes(v)) return 'auto';
  return '';
}

function selectVehicleVariant(template, variantIndex = 0, transmission = '') {
  const variants = normalizeVehicleVariants(template);
  const index = Math.max(0, Math.min(Number(variantIndex || 0), variants.length - 1));
  const selected = variants[index] || variants[0];
  const allowsTransmissionChoice = String(template?.slug || '') === 'apoc-suv-pack';
  const normalizedTransmission = allowsTransmissionChoice ? normalizeTransmission(transmission) : '';
  const hasTransmissionChoice = allowsTransmissionChoice && Boolean(selected.manualClassname && selected.autoClassname);
  const vehicleClassname = normalizedTransmission === 'manual'
    ? (selected.manualClassname || selected.vehicleClassname || selected.autoClassname)
    : normalizedTransmission === 'auto'
      ? (selected.autoClassname || selected.vehicleClassname || selected.manualClassname)
      : (selected.vehicleClassname || selected.manualClassname || selected.autoClassname);

  return {
    ...selected,
    vehicleClassname,
    transmission: hasTransmissionChoice ? (normalizedTransmission || 'auto') : null,
    hasTransmissionChoice
  };
}

function applyVehicleVariant(template, variant) {
  return {
    ...template,
    vehicleClassname: variant?.vehicleClassname || template.vehicleClassname,
    imageUrl: variant?.imageUrl || template.imageUrl || null,
    parts: Array.isArray(variant?.parts) ? variant.parts : template.parts,
    cargoItems: Array.isArray(variant?.cargoItems) ? variant.cargoItems : template.cargoItems,
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
  if (!classname) return null;
  const automaticAttach = !slot || Boolean(part?.automaticAttach || part?.attachByClassname);
  const quantity = Math.max(1, Math.min(Number(part?.quantity || 1), 12));
  const normalized = {
    ...part,
    slot,
    slotName: slot,
    attachSlot: slot,
    automaticAttach,
    attachByClassname: automaticAttach,
    autoAttach: automaticAttach,
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
  normalized.slotAliases = Array.from(new Set([slot, ...slotAliases].filter(Boolean)));
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

export const VEHICLE_PLAYER_INVENTORY_ACCESSORIES = [];

// Clean Store v200: montagem, peças, fluidos e carga são resolvidos pelo preset local do mod.
export function ensureVehicleRequiredEquipment() {
  // Clean Store v200: o SITE não monta mais o veículo.
  // Peças, rodas, bateria, radiador, fluidos e carga ficam 100% no preset do mod.
  return { parts: [], cargoItems: [] };
}

export function vehicleTemplatePayload(template) {
  const chassis = String(template?.vehicleClassname || '').trim();
  return {
    vehicleClassname: chassis,
    chassisClassname: chassis,
    presetKey: chassis,
    presetMode: 'mod_file',
    useModPreset: true,
    assembleVehicleInMod: true,
    siteProvidesParts: false,
    siteProvidesCargo: false,
    siteProvidesFluids: false
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

export function publishVehicleDeliveryImmediately(steam64, context = 'vehicle') {
  const cleaned = String(steam64 || '').trim();
  if (!/^7656119\d{10}$/.test(cleaned)) return { ok: false, skipped: true, reason: 'invalid_steam64' };

  // V166: compra, seguro e renovação não ficam aguardando a rede da API HTTP.
  // O sincronizador rápido já faz tentativas e o ciclo normal mantém o fallback.
  setImmediate(async () => {
    try {
      const { queueImmediatePlayerFileSync } = await import('./gameApiBridgeService.js');
      queueImmediatePlayerFileSync(cleaned);
    } catch (error) {
      console.error(`[VEHICLE_API_QUEUE] ${context} salvo e ficará disponível no próximo ciclo da API:`, error?.message || error);
    }
  });
  return { ok: true, queued: true, background: true, durationMs: 0 };
}

export async function queueVehicleDeliveryImmediately(steam64, context = 'vehicle') {
  const cleaned = String(steam64 || '').trim();
  if (!/^7656119\d{10}$/.test(cleaned)) return { ok: false, skipped: true, reason: 'invalid_steam64' };

  try {
    const { queueImmediatePlayerFileSync } = await import('./gameApiBridgeService.js');
    const queued = queueImmediatePlayerFileSync(cleaned);
    return { ok: Boolean(queued), queued: Boolean(queued), background: true };
  } catch (error) {
    console.error(`[VEHICLE_API_QUEUE] ${context} salvo e ficará disponível no próximo ciclo da API rápido:`, error.message);
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

// Clean Store v200: veículo usa protocolo próprio. O site envia o chassi e o mod
// resolve a montagem a partir do preset local com a mesma chave/classname.
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
    selectedVariant: variant ? { name: variant.name, vehicleClassname: variant.vehicleClassname, imageUrl: variant.imageUrl || null, index: variant.index || 0, transmission: variant.transmission || null } : null,
    serverType: playerVehicle.serverType,
    deliveryMode: 'vehicle_mod_preset',
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
      deliveryType: 'vehicle_mod_preset',
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
        deliveryType: 'vehicle_mod_preset',
        status: 'PENDING',
        meta: {
          kind: 'vehicle_rental',
          action: 'ADMIN_RESTORE_MISSING',
          playerVehicleId: vehicle.id,
          vehicleKey: stableVehicleKey,
          deleteOldVehicleKey: null,
          displayName: vehicle.displayName,
          serverType: vehicle.serverType,
          deliveryMode: 'vehicle_mod_preset',
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
    selectedVariant: variant ? { name: variant.name, vehicleClassname: variant.vehicleClassname, imageUrl: variant.imageUrl || null, index: variant.index || 0, transmission: variant.transmission || null } : null,
    serverType: template.serverType,
    deliveryMode: 'vehicle_mod_preset',
    note: 'O site envia somente o chassi. O mod monta pelo preset local.',
    noInsurancePurchase: true,
    skipGarageBackfill: true,
    insuranceIncluded: false,
    ...vehicleTemplatePayload(payloadTemplate)
  };

  const delivery = await tx.deliveryQueue.create({
    data: {
      purchaseId: null,
      playerId: player.id,
      steam64: player.steam64,
      serverType: template.serverType,
      productName: `Veículo comprado: ${template.name}${variant && !variant.isDefault ? ' - ' + variant.name : ''}`,
      classname: payloadTemplate.vehicleClassname,
      quantity: 1,
      deliveryType: 'vehicle_mod_preset',
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

  // A auditoria geral da compra é gravada após a transação. Evitar uma segunda
  // conexão de auditoria aqui reduz bastante o tempo da compra sem perder histórico.
  return { ...delivery, accessoryDeliveries };
}

export async function buyOrRentVehicle({ playerId, templateId, ownershipType = 'OWNED', insurancePlanId = null, variantIndex = 0, transmission = '' }) {
  const result = await prisma.$transaction(async (tx) => {
    const player = await tx.player.findUnique({ where: { id: playerId } });
    if (!player) throw new Error('Player não encontrado.');

    const template = await tx.vehicleTemplate.findUnique({ where: { id: templateId } });
    if (!template || !template.active) throw new Error('Veículo não encontrado ou inativo.');

    const selectedVariant = selectVehicleVariant(template, variantIndex, transmission);
    const selectedTemplate = applyVehicleVariant(template, selectedVariant);
    const displayName = selectedVariant && !selectedVariant.isDefault ? `${template.name} - ${selectedVariant.name}${selectedVariant.transmission ? ' (' + (selectedVariant.transmission === 'auto' ? 'Automática' : 'Manual') + ')' : ''}` : template.name;

    const normalizedOwnership = normalizeOwnershipType(ownershipType);
    const vehiclePrice = getRentPrice(template, normalizedOwnership);
    if (vehiclePrice <= 0) throw new Error('Esse veículo está sem valor de doação cadastrado.');

    const wantsNoInsurance = String(insurancePlanId || '').trim().toUpperCase() === 'NONE';
    if (wantsNoInsurance) {
      const directPrice = Math.max(0, Number(template.noInsurancePriceCoins || 0));
      if (directPrice <= 0) throw new Error('Este veículo não possui opção de compra sem seguro.');
      const updatedPlayer = await changePlayerCoins({
        playerId,
        amount: -directPrice,
        reason: `Veículo sem seguro: ${displayName}`,
        refType: 'vehicle_direct',
        refId: template.id,
        tx,
        audit: false
      });
      const delivery = await createDirectVehicleDelivery({ tx, player: updatedPlayer, template, costCoins: directPrice, variant: selectedVariant });
      return { player: updatedPlayer, template: selectedTemplate, insurancePlan: null, playerVehicle: null, delivery, total: directPrice, direct: true, variant: selectedVariant };
    }

    // Primeiro mês do seguro incluso no valor anunciado do veículo.
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
      tx,
      audit: false
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

  // Banco confirmado: o navegador pode receber a resposta agora. Auditoria e
  // fila do mod continuam em segundo plano sem segurar a tela de compra.
  result.fileBridgeImmediate = publishVehicleDeliveryImmediately(result.player.steam64, 'compra de veículo');
  runDetached('VEHICLE_PURCHASE_AUDIT', () => logAudit({
    actor: result.player.steam64,
    action: 'vehicle.buy_or_rent',
    target: result.playerVehicle?.id || result.delivery.id,
    data: {
      templateId,
      ownershipType,
      totalCoins: result.total,
      insurancePlanId: result.insurancePlan?.id || null,
      variant: result.variant ? { name: result.variant.name, vehicleClassname: result.variant.vehicleClassname, index: result.variant.index, transmission: result.variant.transmission || null } : null,
      direct: Boolean(result.direct),
      deliveryId: result.delivery?.id,
      accessoryDeliveryIds: result.delivery?.accessoryDeliveries?.map(item => item.id) || []
    }
  }));
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
  result.fileBridgeImmediate = await publishVehicleDeliveryImmediately(result.player.steam64, 'reposição de seguro');
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
  result.fileBridgeImmediate = await publishVehicleDeliveryImmediately(result.player.steam64, 'renovação de veículo');
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
  result.fileBridgeImmediate = await publishVehicleDeliveryImmediately(result.player.steam64, 'renovação de seguro');
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

    const exclusivePlan = await tx.vehicleInsurancePlan.findFirst({
      where: { active: true, billingType: 'SUBSCRIPTION', templateId: vehicle.templateId },
      orderBy: { updatedAt: 'desc' }
    });
    if (exclusivePlan && exclusivePlan.id !== plan.id) {
      throw new Error('Este veículo usa um seguro mensal exclusivo e não pode trocar para o plano global.');
    }

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
  result.fileBridgeImmediate = await publishVehicleDeliveryImmediately(result.player.steam64, 'atualização de seguro');
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
  // Assim o veículo removido some sem esperar o próximo ciclo periódico da API.
  updated.fileBridgeImmediate = await publishVehicleDeliveryImmediately(vehicle.steam64, 'remoção de veículo da conta');
  return updated;
}

export async function markVehicleDeliveryResult(delivery, ok, error = null) {
  const meta = delivery?.meta || {};
  if (meta.kind !== 'vehicle_rental' || !meta.playerVehicleId) return;

  await prisma.$transaction(async tx => {
    const log = await tx.vehicleRespawnLog.findFirst({ where: { deliveryId: delivery.id } });
    if (!log) return;

    // Idempotência: arquivo repetido após falha de comunicação não executa a transição duas vezes.
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
  const data = {
    name: String(body.name || '').trim(),
    description: String(body.description || '').trim() || null,
    serverType: normalizeServerType(body.serverType),
    vehicleClassname: String(body.vehicleClassname || '').trim(),
    buyPriceCoins: Math.max(0, Number(body.buyPriceCoins || 0)),
    noInsurancePriceCoins: body.noInsurancePriceCoins === '' || body.noInsurancePriceCoins == null ? null : Math.max(0, Number(body.noInsurancePriceCoins || 0)),
    rent1DayCoins: 0,
    rent7DaysCoins: 0,
    rent30DaysCoins: 0,
    imageUrl: null,
    imageData: null,
    imageMime: null,
    parts: [],
    cargoItems: [],
    fluids: null,
    variants: null,
    active: body.active === 'on' || body.active === 'true'
  };
  if (!data.name || !data.vehicleClassname) throw new Error('Informe nome e classname do chassi.');
  if (id) return prisma.vehicleTemplate.update({ where: { id }, data });
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
