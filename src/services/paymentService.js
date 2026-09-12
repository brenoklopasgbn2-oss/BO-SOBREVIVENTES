import crypto from 'crypto';
import QRCode from 'qrcode';
import { prisma } from '../db/prisma.js';
import { env } from '../config/env.js';
import { changePlayerCoins } from './playerService.js';
import { logPaymentApproved } from './discordLogger.js';
import { logAudit } from './auditService.js';
import { enqueueDiscordEvent } from './discordOutboxService.js';
import { findActiveStreamerCode, recordStreamerSupportSale } from './supportService.js';

const FINAL_PAYMENT_STATUSES = new Set(['APPROVED', 'REJECTED', 'CANCELLED', 'REFUNDED', 'ERROR']);
const PROVIDER_CHECK_MIN_AGE_MS = 8_000;

function mercadoPagoMode() {
  const mode = String(env.mercadoPagoApiMode || 'auto').trim().toLowerCase();
  if (mode === 'payments') return 'payments';
  if (mode === 'orders') return 'orders';
  return 'auto';
}

function providerNameForMode(mode = mercadoPagoMode()) {
  return mode === 'payments' ? 'mercadopago_payments' : 'mercadopago_orders';
}

function providerKindFromId(providerId, providerHint = '') {
  const id = String(providerId || '').trim().toUpperCase();
  const hint = String(providerHint || '').trim().toLowerCase();
  if (id.startsWith('ORD') || hint.includes('orders')) return 'orders';
  return 'payments';
}

function mpHeaders({ idempotency = false } = {}) {
  if (!env.mercadoPagoAccessToken) {
    throw new Error('MERCADOPAGO_ACCESS_TOKEN não configurado. Coloque o Access Token de PRODUÇÃO da nova conta no Railway.');
  }

  const headers = {
    Authorization: `Bearer ${env.mercadoPagoAccessToken}`,
    Accept: 'application/json',
    'Content-Type': 'application/json'
  };

  if (idempotency) headers['X-Idempotency-Key'] = crypto.randomUUID();
  return headers;
}

function isValidEmail(value) {
  const email = String(value || '').trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && !email.toLowerCase().endsWith('.local');
}

function payerEmailFor(player) {
  const configured = String(env.defaultPayerEmail || '').trim();
  if (isValidEmail(configured)) return configured;

  // O Mercado Pago exige e-mail com domínio válido. Evita os antigos endereços @raidz.local,
  // que podem ser recusados pela API de Orders.
  return `comprador-${String(player.steam64 || player.id).replace(/[^0-9a-z]/gi, '').slice(-18)}@example.com`;
}

function compactProviderError(data) {
  if (!data) return 'resposta vazia';
  if (typeof data === 'string') return data.slice(0, 500);

  const errors = Array.isArray(data.errors)
    ? data.errors.map((item) => item?.message || item?.code || JSON.stringify(item)).filter(Boolean)
    : [];
  const causes = Array.isArray(data.cause)
    ? data.cause.map((item) => item?.description || item?.code || JSON.stringify(item)).filter(Boolean)
    : [];

  const transactionPayments = Array.isArray(data?.transactions?.payments)
    ? data.transactions.payments
    : [];
  const transactionDetails = transactionPayments.flatMap((payment) => [
    payment?.message,
    payment?.error,
    payment?.code,
    payment?.status,
    payment?.status_detail,
    payment?.payment_method?.status,
    payment?.payment_method?.status_detail
  ]).filter(Boolean);

  const detailItems = Array.isArray(data?.details)
    ? data.details.flatMap((item) => [item?.message, item?.code, item?.status, item?.status_detail]).filter(Boolean)
    : [];

  const parts = [
    data.message,
    data.error,
    data.code,
    data.status,
    data.status_detail,
    ...errors,
    ...causes,
    ...transactionDetails,
    ...detailItems
  ].filter(Boolean);

  return (parts.length ? parts.join(' | ') : JSON.stringify(data)).slice(0, 500);
}

function mercadoPagoRequestError(status, data, requestId = '') {
  const details = compactProviderError(data);
  const normalized = `${details} ${JSON.stringify(data || {})}`.toLowerCase();
  const requestSuffix = requestId ? ` [x-request-id: ${requestId}]` : '';

  let error;

  if (status === 401 || normalized.includes('unauthorized') || normalized.includes('access token')) {
    error = new Error(`Mercado Pago recusou o Access Token. Troque MERCADOPAGO_ACCESS_TOKEN pelo token de PRODUÇÃO da nova conta e faça um novo deploy.${requestSuffix}`);
  } else if (normalized.includes('13253') || normalized.includes('collector user without key') || normalized.includes('financial identity use case')) {
    error = new Error(`A conta Mercado Pago ligada ao token não está habilitada para gerar QR Code Pix. Cadastre/ative uma chave Pix nessa mesma conta e confirme a identidade da conta. Erro 13253.${requestSuffix}`);
  } else if (normalized.includes('invalid payer') || normalized.includes('payer.email') || normalized.includes('invalid_email')) {
    error = new Error(`O Mercado Pago recusou o e-mail do pagador. Preencha DEFAULT_PAYER_EMAIL no Railway com um e-mail real e válido, diferente do e-mail da conta recebedora.${requestSuffix}`);
  } else {
    error = new Error(`Mercado Pago recusou a criação/consulta do Pix (${status}): ${details}${requestSuffix}`);
  }

  error.status = status;
  error.providerData = data;
  error.requestId = requestId || null;
  error.normalizedProviderError = normalized;
  return error;
}

function shouldFallbackFromOrders(error) {
  const normalized = String(error?.normalizedProviderError || error?.message || '').toLowerCase();

  // Não adianta trocar de endpoint quando o problema é token, chave Pix ou cadastro da conta.
  if (
    error?.status === 401 ||
    normalized.includes('13253') ||
    normalized.includes('collector user without key') ||
    normalized.includes('financial identity use case')
  ) return false;

  // A Orders informa falha de processamento da transação com 402; algumas contas/aplicações
  // ainda processam Pix normalmente pelo endpoint /v1/payments.
  return error?.status === 402 || error?.status === 409;
}

function orderPayment(data) {
  return data?.transactions?.payments?.[0] || null;
}

function normalizeProviderSnapshot(providerData, providerKind) {
  if (providerKind === 'orders') {
    const transaction = orderPayment(providerData);
    const status = String(transaction?.status || providerData?.status || '').toLowerCase();
    const detail = String(transaction?.status_detail || providerData?.status_detail || '').toLowerCase();
    const paymentMethod = transaction?.payment_method || {};

    return {
      externalReference: providerData?.external_reference || transaction?.external_reference || null,
      status,
      detail,
      approved: status === 'processed' && detail === 'accredited',
      refunded: status === 'refunded' || detail.includes('refunded'),
      cancelled: ['cancelled', 'canceled', 'expired'].includes(status) || ['cancelled', 'canceled', 'expired'].includes(detail),
      rejected: ['rejected', 'failed'].includes(status) || detail.includes('rejected') || detail.includes('failed'),
      qrCode: paymentMethod.qr_code || null,
      qrCodeBase64: paymentMethod.qr_code_base64 || null
    };
  }

  const status = String(providerData?.status || '').toLowerCase();
  const detail = String(providerData?.status_detail || '').toLowerCase();
  return {
    externalReference: providerData?.external_reference || null,
    status,
    detail,
    approved: status === 'approved',
    refunded: ['refunded', 'charged_back'].includes(status),
    cancelled: ['cancelled', 'canceled'].includes(status),
    rejected: status === 'rejected',
    qrCode: providerData?.point_of_interaction?.transaction_data?.qr_code || null,
    qrCodeBase64: providerData?.point_of_interaction?.transaction_data?.qr_code_base64 || null
  };
}

function mapSnapshotStatus(snapshot) {
  if (snapshot.approved) return 'APPROVED';
  if (snapshot.refunded) return 'REFUNDED';
  if (snapshot.cancelled) return 'CANCELLED';
  if (snapshot.rejected) return 'REJECTED';
  return 'PENDING';
}

function providerPaidAmount(providerData, providerKind) {
  if (providerKind === 'orders') {
    const transaction = orderPayment(providerData);
    const raw = transaction?.amount ?? providerData?.total_amount ?? providerData?.amount;
    const amount = Number(raw);
    return Number.isFinite(amount) ? amount : null;
  }

  const amount = Number(providerData?.transaction_amount ?? providerData?.amount);
  return Number.isFinite(amount) ? amount : null;
}

function assertProviderPaymentIntegrity(payment, snapshot, providerData, providerKind, providerId) {
  const receivedReference = String(snapshot.externalReference || '').trim();
  const expectedReference = String(payment.externalReference || '').trim();
  if (!receivedReference || receivedReference !== expectedReference) {
    throw new Error(`PIX ${providerId} bloqueado: referência externa diferente do pagamento local.`);
  }

  const paidAmount = providerPaidAmount(providerData, providerKind);
  const expectedAmount = Number(payment.amountBrl);
  if (paidAmount === null || !Number.isFinite(expectedAmount) || Math.abs(paidAmount - expectedAmount) > 0.009) {
    throw new Error(`PIX ${providerId} bloqueado: valor pago não corresponde ao valor do pedido.`);
  }
}

async function createOrderPix({ amount, label, externalReference, payerEmail, player }) {
  const amountText = Number(amount).toFixed(2);
  const firstName = String(player?.nickname || 'Comprador').replace(/[^\p{L}\p{N} ._-]/gu, '').trim().slice(0, 60) || 'Comprador';
  const payload = {
    type: 'online',
    total_amount: amountText,
    external_reference: externalReference,
    processing_mode: 'automatic',
    payer: {
      email: payerEmail,
      first_name: firstName
    },
    transactions: {
      payments: [
        {
          amount: amountText,
          payment_method: {
            id: 'pix',
            type: 'bank_transfer'
          }
        }
      ]
    }
  };

  const res = await fetch('https://api.mercadopago.com/v1/orders', {
    method: 'POST',
    headers: mpHeaders({ idempotency: true }),
    body: JSON.stringify(payload)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw mercadoPagoRequestError(res.status, data, res.headers.get('x-request-id') || '');
  return data;
}

async function createLegacyPaymentPix({ amount, label, externalReference, payerEmail, player, localPaymentId, coinsAmount, supportStreamer }) {
  const payload = {
    transaction_amount: Number(amount),
    description: `${label} - ${env.appName}`.slice(0, 150),
    payment_method_id: 'pix',
    external_reference: externalReference,
    payer: {
      email: payerEmail,
      first_name: String(player.nickname || 'Player').slice(0, 60),
      last_name: String(player.steam64 || '').slice(0, 60)
    },
    metadata: {
      local_payment_id: localPaymentId,
      player_id: player.id,
      steam64: player.steam64,
      coins: coinsAmount,
      support_streamer_code: supportStreamer?.code || null
    }
  };

  if (/^https:\/\//i.test(env.publicUrl || '')) {
    payload.notification_url = `${env.publicUrl}/webhooks/mercadopago`;
  }

  const res = await fetch('https://api.mercadopago.com/v1/payments', {
    method: 'POST',
    headers: mpHeaders({ idempotency: true }),
    body: JSON.stringify(payload)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw mercadoPagoRequestError(res.status, data, res.headers.get('x-request-id') || '');
  return data;
}

async function creditPaymentExactlyOnce({ paymentId, approvalData, reason }) {
  return prisma.$transaction(async (tx) => {
    const fresh = await tx.payment.findUnique({ where: { id: paymentId } });
    if (!fresh) throw new Error('Pagamento não encontrado.');

    if (fresh.status === 'APPROVED') {
      await tx.paymentCreditGuard.createMany({
        data: [{
          paymentId: fresh.id,
          playerId: fresh.playerId,
          providerPaymentId: fresh.providerPaymentId || null
        }],
        skipDuplicates: true
      });
      const alreadyApproved = await tx.payment.findUnique({
        where: { id: fresh.id },
        include: { player: true, coinPackage: true }
      });
      return { payment: alreadyApproved, creditedNow: false };
    }

    // Primeira trava: o ID local do pagamento é chave primária. Em duas confirmações
    // simultâneas, somente uma consegue criar a trava; a outra recebe count=0.
    const guard = await tx.paymentCreditGuard.createMany({
      data: [{
        paymentId: fresh.id,
        playerId: fresh.playerId,
        providerPaymentId: approvalData?.providerPaymentId || fresh.providerPaymentId || null
      }],
      skipDuplicates: true
    });

    if (guard.count !== 1) {
      // Pagamento antigo já presente no histórico ou outra confirmação venceu.
      // Corrige apenas o status, sem adicionar moedas novamente.
      await tx.payment.updateMany({
        where: { id: fresh.id, status: { not: 'APPROVED' } },
        data: {
          ...approvalData,
          status: 'APPROVED',
          approvedAt: fresh.approvedAt || new Date()
        }
      });
      const alreadyCredited = await tx.payment.findUnique({
        where: { id: fresh.id },
        include: { player: true, coinPackage: true }
      });
      return { payment: alreadyCredited, creditedNow: false };
    }

    // Segunda trava: alteração condicional do status. Evita disputa entre webhook,
    // consulta da tela, sincronização automática e aprovação manual.
    const claimed = await tx.payment.updateMany({
      where: { id: fresh.id, status: { not: 'APPROVED' } },
      data: {
        ...approvalData,
        status: 'APPROVED',
        approvedAt: approvalData?.approvedAt || new Date()
      }
    });

    if (claimed.count !== 1) {
      const alreadyApproved = await tx.payment.findUnique({
        where: { id: fresh.id },
        include: { player: true, coinPackage: true }
      });
      return { payment: alreadyApproved, creditedNow: false };
    }

    const updatedPayment = await tx.payment.findUnique({ where: { id: fresh.id } });
    const updatedPlayer = await changePlayerCoins({
      playerId: updatedPayment.playerId,
      amount: updatedPayment.coins,
      reason,
      refType: 'payment',
      refId: updatedPayment.id,
      // Terceira trava: se qualquer caminho tentar criar outro lançamento,
      // o índice único desfaz toda a transação, incluindo o incremento do saldo.
      idempotencyKey: `payment:${updatedPayment.id}`,
      tx
    });

    // CHAMPIONS Z: o site mantém o saldo central e também entrega o mesmo crédito
    // para a carteira local do mod. A criação fica DENTRO da transação que ganha
    // a trava de aprovação, então webhook/poll/manual não conseguem duplicar o crédito.
    await tx.deliveryQueue.create({
      data: {
        playerId: updatedPlayer.id,
        steam64: updatedPlayer.steam64,
        serverType: 'vanilla',
        productName: `Crédito de moedas • ${updatedPayment.coins}`,
        classname: 'WalletCredit',
        quantity: Math.max(1, Number(updatedPayment.coins || 0)),
        deliveryType: 'wallet_credit',
        meta: {
          kind: 'wallet_credit',
          action: 'wallet_credit',
          walletCoins: Math.max(1, Number(updatedPayment.coins || 0)),
          paymentId: updatedPayment.id,
          source: 'champions_z_pix'
        }
      }
    });

    // Usa os dados lidos após a trava de aprovação. Assim, se o player acabou
    // de confirmar o código antes do webhook obter a linha, a comissão entra
    // nesta mesma aprovação; se o webhook venceu a corrida, a edição é bloqueada.
    if (updatedPayment.supportStreamerCodeId || updatedPayment.supportStreamerCode) {
      const streamerCode = updatedPayment.supportStreamerCodeId
        ? await tx.streamerCode.findUnique({ where: { id: updatedPayment.supportStreamerCodeId } })
        : await tx.streamerCode.findUnique({ where: { code: updatedPayment.supportStreamerCode } });
      if (streamerCode) {
        await recordStreamerSupportSale({ tx, streamerCode, player: updatedPlayer, paymentId: updatedPayment.id });
      }
    }

    return {
      payment: { ...updatedPayment, player: updatedPlayer },
      creditedNow: true
    };
  });
}

async function logNewPaymentCredit(result) {
  if (!result.creditedNow || !result.payment) return result.payment;
  await logPaymentApproved({ player: result.payment.player, payment: result.payment });
  await enqueueDiscordEvent('COIN_PURCHASE', { paymentId: result.payment.id }).catch((error) => console.error('[DISCORD_OUTBOX_PAYMENT]', error.message));
  await logAudit({
    actor: result.payment.player.steam64,
    action: 'payment.approved',
    target: result.payment.id,
    data: { amountBrl: Number(result.payment.amountBrl), coins: result.payment.coins }
  });
  return result.payment;
}

async function creditApprovedPayment(payment, providerData, providerId, providerName) {
  const result = await creditPaymentExactlyOnce({
    paymentId: payment.id,
    approvalData: {
      provider: providerName || payment.provider,
      providerPaymentId: String(providerId),
      rawProviderData: providerData
    },
    reason: `Pix aprovado ${payment.id}`
  });
  return logNewPaymentCredit(result);
}

async function applyProviderData(providerData, providerId, providerKind) {
  const snapshot = normalizeProviderSnapshot(providerData, providerKind);
  const providerName = providerNameForMode(providerKind);
  const providerIdText = String(providerId);

  const [byProviderId, byExternalReference] = await Promise.all([
    prisma.payment.findUnique({ where: { providerPaymentId: providerIdText } }),
    snapshot.externalReference
      ? prisma.payment.findUnique({ where: { externalReference: snapshot.externalReference } })
      : Promise.resolve(null)
  ]);

  if (byProviderId && byExternalReference && byProviderId.id !== byExternalReference.id) {
    throw new Error(`PIX ${providerIdText} bloqueado: ID e referência apontam para pagamentos diferentes.`);
  }

  const payment = byProviderId || byExternalReference;
  if (!payment) throw new Error(`Pagamento local não encontrado para o ID Mercado Pago: ${providerId}`);
  if (payment.status === 'APPROVED') {
    return prisma.payment.findUnique({ where: { id: payment.id }, include: { player: true } });
  }

  if (snapshot.approved) {
    assertProviderPaymentIntegrity(payment, snapshot, providerData, providerKind, providerIdText);
    return creditApprovedPayment(payment, providerData, providerIdText, providerName);
  }

  // Nunca deixa uma notificação atrasada voltar um pagamento aprovado para PENDING/REJECTED.
  await prisma.payment.updateMany({
    where: { id: payment.id, status: { not: 'APPROVED' } },
    data: {
      provider: providerName,
      providerPaymentId: String(providerId),
      status: mapSnapshotStatus(snapshot),
      qrCode: snapshot.qrCode || payment.qrCode,
      qrCodeBase64: snapshot.qrCodeBase64 || payment.qrCodeBase64,
      rawProviderData: providerData
    }
  });

  return prisma.payment.findUnique({
    where: { id: payment.id },
    include: { player: true, coinPackage: true }
  });
}

export async function setPaymentStreamerSupport({ paymentId, playerId, streamerCode }) {
  const normalizedPaymentId = String(paymentId || '').trim();
  const normalizedPlayerId = String(playerId || '').trim();
  if (!normalizedPaymentId || !normalizedPlayerId) throw new Error('Pagamento inválido.');
  if (!String(streamerCode || '').trim()) throw new Error('Digite o código do streamer.');

  const updatedPayment = await prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findFirst({
      where: { id: normalizedPaymentId, playerId: normalizedPlayerId },
      select: { id: true, status: true }
    });
    if (!payment) throw new Error('Esse Pix não pertence ao player logado.');
    if (payment.status !== 'PENDING') {
      throw new Error('O código do streamer só pode ser definido enquanto o Pix está aguardando pagamento.');
    }

    const supportStreamer = await findActiveStreamerCode(streamerCode, tx);
    const claimed = await tx.payment.updateMany({
      where: { id: payment.id, playerId: normalizedPlayerId, status: 'PENDING' },
      data: {
        supportStreamerCode: supportStreamer.code,
        supportStreamerCodeId: supportStreamer.id,
        supportCommissionPercent: supportStreamer.percent
      }
    });

    // Se o webhook aprovou o Pix enquanto o formulário era enviado, não altera
    // retroativamente o pagamento nem cria comissão depois da aprovação.
    if (claimed.count !== 1) {
      throw new Error('Este Pix acabou de ser aprovado. Não foi possível adicionar o código depois da confirmação.');
    }

    return tx.payment.findUnique({
      where: { id: payment.id },
      include: { player: true, coinPackage: true }
    });
  });

  await logAudit({
    actor: updatedPayment.player?.steam64 || normalizedPlayerId,
    action: 'payment.streamer_support.updated',
    target: updatedPayment.id,
    data: {
      supportStreamerCode: updatedPayment.supportStreamerCode,
      supportCommissionPercent: updatedPayment.supportCommissionPercent
    }
  });

  return updatedPayment;
}

export async function createPixPayment({ playerId, packageId, customAmountBrl = null, customCoins = null, customLabel = null, streamerCode = null }) {
  const player = await prisma.player.findUnique({ where: { id: playerId } });
  if (!player) throw new Error('Player não encontrado.');

  let pack = null;
  if (packageId) {
    pack = await prisma.coinPackage.findUnique({ where: { id: packageId } });
    if (!pack || !pack.active) throw new Error('Pacote de moedas inválido.');
  }

  const amount = pack ? Number(pack.amountBrl) : Number(customAmountBrl || 0);
  const coinsAmount = pack ? pack.coins : Number(customCoins || 0);
  const label = pack ? pack.name : String(customLabel || `Doação personalizada ${coinsAmount} moedas`);

  if (!Number.isFinite(amount) || amount < 1) throw new Error('Valor mínimo para Pix é R$1.');
  if (!Number.isFinite(coinsAmount) || coinsAmount < 1000) throw new Error('Doação mínima é 1.000 moedas.');

  const supportStreamer = await findActiveStreamerCode(streamerCode);
  const externalReference = `RZ-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
  const configuredMode = mercadoPagoMode();
  const initialMode = configuredMode === 'payments' ? 'payments' : 'orders';
  let effectiveMode = initialMode;
  let providerName = providerNameForMode(effectiveMode);
  const payerEmail = payerEmailFor(player);

  const localPayment = await prisma.payment.create({
    data: {
      playerId: player.id,
      packageId: pack?.id || null,
      provider: providerName,
      amountBrl: amount,
      coins: coinsAmount,
      externalReference,
      payerEmail,
      supportStreamerCode: supportStreamer?.code || null,
      supportStreamerCodeId: supportStreamer?.id || null,
      supportCommissionPercent: supportStreamer?.percent || 0
    }
  });

  await logAudit({
    actor: player.steam64,
    action: 'payment.created',
    target: localPayment.id,
    data: { packageId: pack?.id || null, amount, coins: coinsAmount, supportStreamerCode: supportStreamer?.code || null, mercadoPagoMode: configuredMode }
  });

  try {
    let data;

    if (initialMode === 'orders') {
      try {
        data = await createOrderPix({ amount, label, externalReference, payerEmail, player });
      } catch (ordersError) {
        if (!shouldFallbackFromOrders(ordersError)) throw ordersError;

        effectiveMode = 'payments';
        providerName = providerNameForMode(effectiveMode);
        console.warn(`Mercado Pago Orders falhou; tentando /v1/payments. ${ordersError.message}`);
        await logAudit({
          actor: player.steam64,
          action: 'payment.orders_fallback',
          target: localPayment.id,
          data: {
            status: ordersError.status || null,
            requestId: ordersError.requestId || null,
            reason: ordersError.message
          }
        }).catch(() => {});

        data = await createLegacyPaymentPix({
          amount,
          label,
          externalReference,
          payerEmail,
          player,
          localPaymentId: localPayment.id,
          coinsAmount,
          supportStreamer
        });
      }
    } else {
      data = await createLegacyPaymentPix({
        amount,
        label,
        externalReference,
        payerEmail,
        player,
        localPaymentId: localPayment.id,
        coinsAmount,
        supportStreamer
      });
    }

    const providerId = String(data.id || '');
    if (!providerId) throw new Error('Mercado Pago não retornou o ID do Pix.');

    const snapshot = normalizeProviderSnapshot(data, effectiveMode);
    const qrCode = snapshot.qrCode;
    const qrBase64FromMp = snapshot.qrCodeBase64;
    const qrCodeBase64 = qrBase64FromMp || (qrCode ? await QRCode.toDataURL(qrCode) : null);

    await prisma.payment.update({
      where: { id: localPayment.id },
      data: {
        provider: providerName,
        providerPaymentId: providerId,
        // Se a API já devolver aprovado, mantém PENDING por alguns milissegundos
        // para a rotina transacional creditar as moedas exatamente uma vez.
        status: snapshot.approved ? 'PENDING' : mapSnapshotStatus(snapshot),
        qrCode,
        qrCodeBase64,
        rawProviderData: data
      }
    });

    if (snapshot.approved) {
      return applyProviderData(data, providerId, effectiveMode);
    }

    return prisma.payment.findUnique({
      where: { id: localPayment.id },
      include: { player: true, coinPackage: true }
    });
  } catch (error) {
    await prisma.payment.update({
      where: { id: localPayment.id },
      data: {
        status: 'ERROR',
        rawProviderData: {
          error: error.message,
          mode: configuredMode,
          effectiveMode,
          status: error.status || null,
          requestId: error.requestId || null,
          providerData: error.providerData || null
        }
      }
    }).catch(() => {});
    throw error;
  }
}

export async function fetchMercadoPagoResource(providerId, providerHint = '') {
  const providerKind = providerKindFromId(providerId, providerHint);
  const endpoint = providerKind === 'orders'
    ? `https://api.mercadopago.com/v1/orders/${encodeURIComponent(providerId)}`
    : `https://api.mercadopago.com/v1/payments/${encodeURIComponent(providerId)}`;

  const res = await fetch(endpoint, { headers: mpHeaders() });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw mercadoPagoRequestError(res.status, data, res.headers.get('x-request-id') || '');
  return { data, providerKind };
}

// Mantido com esse nome para compatibilidade com as rotas antigas.
export async function fetchMercadoPagoPayment(providerPaymentId, providerHint = '') {
  const result = await fetchMercadoPagoResource(providerPaymentId, providerHint);
  return result.data;
}

export async function approvePaymentFromProvider(providerPaymentId, providerHint = '') {
  const { data, providerKind } = await fetchMercadoPagoResource(providerPaymentId, providerHint);
  return applyProviderData(data, providerPaymentId, providerKind);
}

export async function syncPaymentStatusByLocalId(paymentId, { force = false } = {}) {
  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!payment) throw new Error('Pagamento não encontrado.');
  if (FINAL_PAYMENT_STATUSES.has(payment.status) || !payment.providerPaymentId) return payment;

  const ageMs = Date.now() - new Date(payment.updatedAt).getTime();
  if (!force && ageMs < PROVIDER_CHECK_MIN_AGE_MS) return payment;

  return approvePaymentFromProvider(payment.providerPaymentId, payment.provider);
}

export async function syncPendingMercadoPagoPayments({ limit = 20 } = {}) {
  if (!env.mercadoPagoAccessToken) return { checked: 0, updated: 0, errors: 0, skipped: 'token_missing' };

  const now = Date.now();
  const payments = await prisma.payment.findMany({
    where: {
      status: 'PENDING',
      providerPaymentId: { not: null },
      createdAt: { gte: new Date(now - 2 * 24 * 60 * 60 * 1000) },
      updatedAt: { lte: new Date(now - 15_000) }
    },
    orderBy: { updatedAt: 'asc' },
    take: Math.max(1, Math.min(Number(limit) || 20, 50))
  });

  let updated = 0;
  let errors = 0;
  for (const payment of payments) {
    try {
      const result = await approvePaymentFromProvider(payment.providerPaymentId, payment.provider);
      if (result.status !== payment.status) updated += 1;
    } catch (error) {
      errors += 1;
      console.error(`Sincronização Mercado Pago ${payment.id}:`, error.message);
    }
  }

  return { checked: payments.length, updated, errors };
}

export async function checkMercadoPagoConnection() {
  if (!env.mercadoPagoAccessToken) {
    throw new Error('MERCADOPAGO_ACCESS_TOKEN não configurado.');
  }

  const res = await fetch('https://api.mercadopago.com/v1/payment_methods', {
    headers: mpHeaders()
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw mercadoPagoRequestError(res.status, data, res.headers.get('x-request-id') || '');

  const methods = Array.isArray(data) ? data : [];
  const pix = methods.find((method) => String(method?.id || '').toLowerCase() === 'pix');
  if (!pix) {
    throw new Error('O token foi aceito, mas o Pix não apareceu entre os meios de pagamento disponíveis dessa conta. Verifique chave Pix, identidade e limitações da conta.');
  }

  return {
    ok: true,
    mode: mercadoPagoMode(),
    pixAvailable: true,
    pixStatus: pix.status || 'available'
  };
}

export async function manuallyApprovePayment(paymentId, actor = 'admin') {
  const result = await creditPaymentExactlyOnce({
    paymentId,
    approvalData: {},
    reason: `Aprovação manual Pix por ${actor}`
  });
  return logNewPaymentCredit(result);
}
