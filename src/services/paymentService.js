import crypto from 'crypto';
import QRCode from 'qrcode';
import { prisma } from '../db/prisma.js';
import { env } from '../config/env.js';
import { changePlayerCoins } from './playerService.js';
import { logPaymentApproved } from './discordLogger.js';
import { logAudit } from './auditService.js';
import { findActiveStreamerCode, recordStreamerSupportSale } from './supportService.js';

function mpHeaders(extra = {}) {
  if (!env.mercadoPagoAccessToken) {
    throw new Error('MERCADOPAGO_ACCESS_TOKEN não configurado.');
  }
  return {
    Authorization: `Bearer ${env.mercadoPagoAccessToken}`,
    'Content-Type': 'application/json',
    'X-Idempotency-Key': crypto.randomUUID(),
    ...extra
  };
}

function payerEmailFor(player) {
  if (player.discordId) return `discord-${player.discordId}@raidz.local`;
  return env.defaultPayerEmail || `steam-${player.steam64}@raidz.local`;
}

export async function createPixPayment({ playerId, packageId, customAmountBrl = null, customCoins = null, customLabel = null, streamerCode = null }) {
  const player = await prisma.player.findUnique({ where: { id: playerId } });
  if (!player) throw new Error('Player não encontrado.');

  let pack = null;
  if (packageId) {
    pack = await prisma.coinPackage.findUnique({ where: { id: packageId } });
    if (!pack || !pack.active) throw new Error('Pacote de moedas inválido.');
  }

  let amount = pack ? Number(pack.amountBrl) : Number(customAmountBrl || 0);
  let coinsAmount = pack ? pack.coins : Number(customCoins || 0);
  const label = pack ? pack.name : String(customLabel || `Doação personalizada ${coinsAmount} moedas`);

  if (!Number.isFinite(amount) || amount < 1) throw new Error('Valor mínimo para Pix é R$1.');
  if (!Number.isFinite(coinsAmount) || coinsAmount < 1000) throw new Error('Doação mínima é 1.000 moedas.');

  const supportStreamer = await findActiveStreamerCode(streamerCode);
  const externalReference = `RZ-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

  const localPayment = await prisma.payment.create({
    data: {
      playerId: player.id,
      packageId: pack?.id || null,
      amountBrl: amount,
      coins: coinsAmount,
      externalReference,
      payerEmail: payerEmailFor(player),
      supportStreamerCode: supportStreamer?.code || null,
      supportStreamerCodeId: supportStreamer?.id || null,
      supportCommissionPercent: supportStreamer?.percent || 0
    }
  });

  await logAudit({ actor: player.steam64, action: 'payment.created', target: localPayment.id, data: { packageId: pack?.id || null, amount: amount, coins: coinsAmount, supportStreamerCode: supportStreamer?.code || null } });

  const payload = {
    transaction_amount: amount,
    description: `${label} - RAID-Z Store`,
    payment_method_id: 'pix',
    external_reference: externalReference,
    notification_url: `${env.publicUrl}/webhooks/mercadopago`,
    payer: {
      email: localPayment.payerEmail,
      first_name: player.nickname || 'Player',
      last_name: player.steam64
    },
    metadata: {
      local_payment_id: localPayment.id,
      player_id: player.id,
      steam64: player.steam64,
      coins: coinsAmount,
      support_streamer_code: supportStreamer?.code || null
    }
  };

  const res = await fetch('https://api.mercadopago.com/v1/payments', {
    method: 'POST',
    headers: mpHeaders(),
    body: JSON.stringify(payload)
  });

  const data = await res.json();
  if (!res.ok) {
    await prisma.payment.update({
      where: { id: localPayment.id },
      data: { status: 'ERROR', rawProviderData: data }
    });
    throw new Error(`Mercado Pago recusou a criação do Pix: ${JSON.stringify(data).slice(0, 500)}`);
  }

  const qr = data.point_of_interaction?.transaction_data?.qr_code || null;
  const qrBase64FromMp = data.point_of_interaction?.transaction_data?.qr_code_base64 || null;
  const qrBase64 = qrBase64FromMp || (qr ? await QRCode.toDataURL(qr) : null);

  return prisma.payment.update({
    where: { id: localPayment.id },
    data: {
      providerPaymentId: String(data.id),
      status: 'PENDING',
      qrCode: qr,
      qrCodeBase64: qrBase64,
      rawProviderData: data
    },
    include: { player: true, coinPackage: true }
  });
}

export async function fetchMercadoPagoPayment(providerPaymentId) {
  const res = await fetch(`https://api.mercadopago.com/v1/payments/${providerPaymentId}`, {
    headers: { Authorization: `Bearer ${env.mercadoPagoAccessToken}` }
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Erro ao consultar Mercado Pago: ${JSON.stringify(data).slice(0, 500)}`);
  return data;
}

export async function approvePaymentFromProvider(providerPaymentId) {
  const providerData = await fetchMercadoPagoPayment(providerPaymentId);
  const providerStatus = String(providerData.status || '').toLowerCase();

  const payment = await prisma.payment.findFirst({
    where: {
      OR: [
        { providerPaymentId: String(providerPaymentId) },
        { externalReference: providerData.external_reference || '__none__' }
      ]
    }
  });

  if (!payment) throw new Error(`Pagamento local não encontrado: ${providerPaymentId}`);

  if (payment.status === 'APPROVED') {
    return prisma.payment.findUnique({ where: { id: payment.id }, include: { player: true } });
  }

  if (providerStatus !== 'approved') {
    const mapped = providerStatus === 'cancelled' ? 'CANCELLED' : providerStatus === 'rejected' ? 'REJECTED' : 'PENDING';
    return prisma.payment.update({
      where: { id: payment.id },
      data: { status: mapped, rawProviderData: providerData },
      include: { player: true }
    });
  }

  const result = await prisma.$transaction(async (tx) => {
    const fresh = await tx.payment.findUnique({ where: { id: payment.id } });
    if (!fresh || fresh.status === 'APPROVED') {
      return tx.payment.findUnique({ where: { id: payment.id }, include: { player: true } });
    }

    const updatedPayment = await tx.payment.update({
      where: { id: payment.id },
      data: {
        status: 'APPROVED',
        approvedAt: new Date(),
        providerPaymentId: String(providerData.id),
        rawProviderData: providerData
      }
    });

    const updatedPlayer = await changePlayerCoins({
      playerId: updatedPayment.playerId,
      amount: updatedPayment.coins,
      reason: `Pix aprovado ${updatedPayment.id}`,
      refType: 'payment',
      refId: updatedPayment.id,
      tx
    });

    if (fresh.supportStreamerCodeId || fresh.supportStreamerCode) {
      const streamerCode = fresh.supportStreamerCodeId
        ? await tx.streamerCode.findUnique({ where: { id: fresh.supportStreamerCodeId } })
        : await tx.streamerCode.findUnique({ where: { code: fresh.supportStreamerCode } });
      if (streamerCode) {
        await recordStreamerSupportSale({ tx, streamerCode, player: updatedPlayer, paymentId: updatedPayment.id, source: 'DONATION', totalCoins: updatedPayment.coins });
      }
    }

    return { ...updatedPayment, player: updatedPlayer };
  });

  await logPaymentApproved({ player: result.player, payment: result });
  await logAudit({ actor: result.player.steam64, action: 'payment.approved', target: result.id, data: { amountBrl: Number(result.amountBrl), coins: result.coins } });
  return result;
}

export async function manuallyApprovePayment(paymentId, actor = 'admin') {
  const result = await prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({ where: { id: paymentId } });
    if (!payment) throw new Error('Pagamento não encontrado.');
    if (payment.status === 'APPROVED') return tx.payment.findUnique({ where: { id: payment.id }, include: { player: true } });

    const updatedPayment = await tx.payment.update({
      where: { id: payment.id },
      data: { status: 'APPROVED', approvedAt: new Date() }
    });
    const updatedPlayer = await changePlayerCoins({
      playerId: payment.playerId,
      amount: payment.coins,
      reason: `Aprovação manual Pix por ${actor}`,
      refType: 'payment',
      refId: payment.id,
      tx
    });
    if (payment.supportStreamerCodeId || payment.supportStreamerCode) {
      const streamerCode = payment.supportStreamerCodeId
        ? await tx.streamerCode.findUnique({ where: { id: payment.supportStreamerCodeId } })
        : await tx.streamerCode.findUnique({ where: { code: payment.supportStreamerCode } });
      if (streamerCode) {
        await recordStreamerSupportSale({ tx, streamerCode, player: updatedPlayer, paymentId: updatedPayment.id, source: 'DONATION', totalCoins: updatedPayment.coins });
      }
    }
    return { ...updatedPayment, player: updatedPlayer };
  });

  await logPaymentApproved({ player: result.player, payment: result });
  await logAudit({ actor: result.player.steam64, action: 'payment.approved', target: result.id, data: { amountBrl: Number(result.amountBrl), coins: result.coins } });
  return result;
}
