import { prisma } from '../db/prisma.js';
import { changePlayerCoins } from './playerService.js';
import { logAudit } from './auditService.js';
import { slugify } from '../utils/slug.js';
import { prepareUploadedImage } from '../utils/pngTransparency.js';

const GAME_SERVER_TYPES = ['vanilla', 'bbp'];
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
export const NORMAL_INSURANCE_DISTANCE_METERS = 250;
export const VEHICLE_PER_USE_INSURANCE_PRICE = 10000;

export function getVehicleMonthlyInsurancePrice(template) {
  const value = Math.max(0, Number(template?.buyPriceCoins || 0));
  return Math.round(value * 0.5);
}

export function getVehicleInsurancePlanPrice(plan, template, { chargeAtPurchase = false } = {}) {
  if (!plan) return 0;

  // V61: na hora de comprar/doar o veículo, o primeiro mês do seguro já está incluso
  // no valor cheio do carro. Depois disso: mensal custa 50% do veículo, e por uso cobra 10k ao acionar.
  if (chargeAtPurchase) return 0;

  if (plan.billingType === 'PER_USE') return VEHICLE_PER_USE_INSURANCE_PRICE;
  return getVehicleMonthlyInsurancePrice(template);
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
    classname,
    className: classname,
    type: classname,
    quantity: Number.isFinite(quantity) ? quantity : 1,
    label: item?.label || classname,
    sortOrder: Number.isFinite(Number(item?.sortOrder)) ? Number(item.sortOrder) : index
  };
}

export function vehicleTemplatePayload(template) {
  const parts = (Array.isArray(template.parts) ? template.parts : [])
    .map(normalizeVehiclePartForPayload)
    .filter(Boolean);
  const cargoItems = (Array.isArray(template.cargoItems) ? template.cargoItems : [])
    .map(normalizeCargoItemForPayload)
    .filter(Boolean);

  return {
    vehicleClassname: template.vehicleClassname,
    parts,
    // aliases para o mod DayZ aceitar o mesmo conteúdo com nomes diferentes
    vehicleParts: parts,
    attachments: parts,
    attachmentItems: parts,
    attachToVehicle: parts,
    mountParts: parts,
    cargoItems,
    inventoryItems: cargoItems,
    storageItems: cargoItems,
    itemsInsideVehicle: cargoItems,
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

  return delivery;
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

  await logAudit({
    actor: player.steam64,
    action: 'vehicle.direct_purchase.delivery_created',
    target: delivery.id,
    data: { templateId: template.id, vehicleClassname: payloadTemplate.vehicleClassname, variant: variant?.name || null, vehicleKey, costCoins }
  });

  return delivery;
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

    let insurancePlan = null;
    let insurancePrice = 0;
    let insuranceExpiresAt = null;
    let selectedInsurancePlanId = insurancePlanId || null;

    // V70: seguro opcional.
    // Sem seguro: compra normal, entrega no pé e aparece na garagem sem direito a reposição.
    // O player pode adicionar seguro depois pela Minha Garagem.
    // Com seguro escolhido na compra: o primeiro mês já está incluso no valor do veículo.
    // Depois vence e o player escolhe renovar mensal por 50% do valor ou usar plano por uso pagando 10k por acionamento.

    if (selectedInsurancePlanId) {
      insurancePlan = await tx.vehicleInsurancePlan.findUnique({ where: { id: selectedInsurancePlanId } });
      if (!insurancePlan || !insurancePlan.active) throw new Error('Seguro não encontrado ou inativo.');
      if (insurancePlan.templateId && insurancePlan.templateId !== template.id) throw new Error('Esse seguro pertence a outro veículo.');
      insurancePrice = getVehicleInsurancePlanPrice(insurancePlan, template, { chargeAtPurchase: true });
      insuranceExpiresAt = addDays(new Date(), insurancePlan.durationDays || 30); // primeiro mês incluso no valor do veículo, inclusive plano por uso
    }

    const total = vehiclePrice + insurancePrice;
    const updatedPlayer = await changePlayerCoins({
      playerId,
      amount: -total,
      reason: `Veículo doado: ${template.name}${insurancePlan ? ' + seguro ' + insurancePlan.name : ' sem seguro'}`,
      refType: 'vehicle',
      refId: template.id,
      tx
    });

    // V70: todo veículo comprado fica na Minha Garagem.
    // Sem seguro: aparece na garagem para o player poder adicionar seguro depois,
    // mas não libera reposição enquanto não tiver plano ativo.
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

    const delivery = await createVehicleDelivery({ tx, player: updatedPlayer, playerVehicle, template, action: 'BUY', costCoins: total, variant: selectedVariant });
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

    if (plan.billingType === 'PER_USE') {
      // Se o seguro por uso foi escolhido na compra, o primeiro mês já ficou incluso no valor do veículo.
      // Durante esse período, acionar reposição não cobra 10k. Depois do vencimento, cobra 10k por uso.
      cost = vehicle.insuranceExpiresAt && !isExpired(vehicle.insuranceExpiresAt)
        ? 0
        : getVehicleInsurancePlanPrice(plan, vehicle.template);
      newUses += 1;
    } else {
      if (isExpired(vehicle.insuranceExpiresAt)) throw new Error('Seu seguro mensal venceu. Renove antes de usar.');
      if (newUses >= Number(plan.maxUsesPerWeek || 1)) throw new Error(`Seu seguro já usou ${newUses}/${plan.maxUsesPerWeek} reposições nesta semana.`);
      cost = Number(plan.respawnFeeCoins || 0);
      newUses += 1;
    }

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
  return result;
}

export async function renewInsurance({ playerId, playerVehicleId }) {
  const result = await prisma.$transaction(async (tx) => {
    const player = await tx.player.findUnique({ where: { id: playerId } });
    const vehicle = await tx.playerVehicle.findFirst({ where: { id: playerVehicleId, playerId }, include: { insurancePlan: true, template: true } });
    if (!player || !vehicle) throw new Error('Veículo não encontrado.');
    const plan = vehicle.insurancePlan;
    if (!plan) throw new Error('Esse veículo não tem plano de seguro mensal.');
    if (plan.billingType !== 'SUBSCRIPTION') throw new Error('Esse seguro é por uso, não precisa renovar.');
    const price = getVehicleInsurancePlanPrice(plan, vehicle.template);
    const baseDate = vehicle.insuranceExpiresAt && new Date(vehicle.insuranceExpiresAt).getTime() > Date.now() ? new Date(vehicle.insuranceExpiresAt) : new Date();
    const insuranceExpiresAt = addDays(baseDate, plan.durationDays || 30);
    const updatedPlayer = await changePlayerCoins({ playerId, amount: -price, reason: `Renovação seguro ${plan.name}`, refType: 'vehicle_insurance', refId: vehicle.id, tx });
    const updatedVehicle = await tx.playerVehicle.update({ where: { id: vehicle.id }, data: { insuranceExpiresAt, insuranceUsesThisWeek: 0, insuranceUsesWeekStart: new Date() } });
    await tx.vehicleRespawnLog.create({ data: { playerVehicleId: vehicle.id, playerId, action: 'RENEW_INSURANCE', costCoins: price, status: 'DELIVERED' } });
    return { player: updatedPlayer, vehicle: updatedVehicle, price };
  });
  await logAudit({ actor: result.player.steam64, action: 'vehicle.insurance.renewed', target: result.vehicle.id, data: { costCoins: result.price } });
  return result;
}

export async function upgradeInsurancePlan({ playerId, playerVehicleId, planId }) {
  const result = await prisma.$transaction(async (tx) => {
    const player = await tx.player.findUnique({ where: { id: playerId } });
    const vehicle = await tx.playerVehicle.findFirst({ where: { id: playerVehicleId, playerId }, include: { insurancePlan: true, template: true } });
    if (!player || !vehicle) throw new Error('Veículo não encontrado.');

    const plan = await tx.vehicleInsurancePlan.findUnique({ where: { id: planId } });
    if (!plan || !plan.active) throw new Error('Plano de seguro inválido ou inativo.');
    if (plan.templateId && plan.templateId !== vehicle.templateId) throw new Error('Esse plano pertence a outro veículo.');

    const price = plan.billingType === 'SUBSCRIPTION'
      ? getVehicleInsurancePlanPrice(plan, vehicle.template)
      : 0;
    const updatedPlayer = price > 0
      ? await changePlayerCoins({ playerId, amount: -price, reason: `${vehicle.insurancePlanId ? 'Upgrade' : 'Contratação'} seguro ${plan.name} para ${vehicle.displayName}`, refType: 'vehicle_insurance_upgrade', refId: vehicle.id, tx })
      : player;

    const data = {
      insurancePlanId: plan.id,
      insuranceUsesThisWeek: 0,
      insuranceUsesWeekStart: new Date()
    };

    if (plan.billingType === 'SUBSCRIPTION') {
      data.insuranceExpiresAt = addDays(new Date(), plan.durationDays || 30);
    } else {
      data.insuranceExpiresAt = null;
    }

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
  return result;
}

export async function cancelPlayerVehicle({ playerId, playerVehicleId }) {
  const vehicle = await prisma.playerVehicle.findFirst({ where: { id: playerVehicleId, playerId } });
  if (!vehicle) throw new Error('Veículo não encontrado.');
  const updated = await prisma.playerVehicle.update({ where: { id: vehicle.id }, data: { status: 'CANCELLED' } });
  await logAudit({ actor: vehicle.steam64, action: 'vehicle.cancelled', target: vehicle.id, data: { currentVehicleKey: vehicle.currentVehicleKey } });
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
    parts,
    cargoItems: cargoItems.length ? cargoItems : null,
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
  const billingType = String(body.billingType || 'PER_USE').toUpperCase() === 'SUBSCRIPTION' ? 'SUBSCRIPTION' : 'PER_USE';
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
