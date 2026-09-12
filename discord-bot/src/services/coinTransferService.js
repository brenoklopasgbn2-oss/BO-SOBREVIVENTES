import { randomUUID } from 'crypto';
import { prisma } from '../db/prisma.js';
import { env } from '../config/env.js';
import { changePlayerCoins } from './playerService.js';
import { logAudit } from './auditService.js';

function normalizeSteam64(value) {
  const steam64 = String(value || '').trim();
  if (!/^7656119\d{10}$/.test(steam64)) {
    throw new Error('Steam64 de destino inválido. Ele deve começar com 7656119 e ter 17 números.');
  }
  return steam64;
}

function normalizeToken(value) {
  const token = String(value || '').trim().toLowerCase();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(token)) {
    throw new Error('Identificador da transferência inválido. Atualize a página e tente novamente.');
  }
  return token;
}

function normalizeAmount(value) {
  const raw = Number(value);
  if (!Number.isFinite(raw) || !Number.isInteger(raw)) throw new Error('Quantidade de moedas inválida.');
  if (raw < env.coinTransferMin) {
    throw new Error(`A transferência mínima é de ${env.coinTransferMin.toLocaleString('pt-BR')} RZ.`);
  }
  if (raw > env.coinTransferMax) {
    throw new Error(`Cada transferência pode ter no máximo ${env.coinTransferMax.toLocaleString('pt-BR')} RZ.`);
  }
  return raw;
}

function isUniqueTokenConflict(error) {
  if (error?.code !== 'P2002') return false;
  const target = Array.isArray(error?.meta?.target) ? error.meta.target.join(',') : String(error?.meta?.target || '');
  return target.includes('token');
}

async function loadExistingTransfer({ token, senderId }) {
  const existing = await prisma.coinTransfer.findUnique({
    where: { token },
    include: {
      sender: { select: { id: true, steam64: true, nickname: true, coins: true } },
      recipient: { select: { id: true, steam64: true, nickname: true, coins: true } }
    }
  });
  if (!existing || existing.senderId !== senderId) {
    throw new Error('Essa transferência não pertence a esta conta. Atualize a página.');
  }
  return { ...existing, duplicate: true };
}

export async function transferCoins({ senderId, recipientSteam64, amount, token }) {
  const cleanSteam64 = normalizeSteam64(recipientSteam64);
  const cleanAmount = normalizeAmount(amount);
  const cleanToken = normalizeToken(token);

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await prisma.$transaction(async (tx) => {
        const [sender, recipient] = await Promise.all([
          tx.player.findUnique({ where: { id: senderId }, select: { id: true, steam64: true, nickname: true, coins: true } }),
          tx.player.findUnique({ where: { steam64: cleanSteam64 }, select: { id: true, steam64: true, nickname: true, coins: true } })
        ]);

        if (!sender) throw new Error('Sua conta não foi encontrada. Entre novamente no site.');
        if (!recipient) throw new Error('O Steam64 informado ainda não possui conta cadastrada na loja.');
        if (recipient.id === sender.id) throw new Error('Você não pode transferir moedas para a própria conta.');

        const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const sent = await tx.coinTransfer.aggregate({
          where: { senderId, createdAt: { gte: since } },
          _sum: { amount: true }
        });
        const alreadySent = Number(sent._sum.amount || 0);
        if (alreadySent + cleanAmount > env.coinTransferDailyLimit) {
          const remaining = Math.max(0, env.coinTransferDailyLimit - alreadySent);
          throw new Error(`Limite de transferência das últimas 24 horas atingido. Você ainda pode enviar ${remaining.toLocaleString('pt-BR')} RZ.`);
        }

        const transferId = randomUUID();
        const senderLabel = sender.nickname || sender.steam64;
        const recipientLabel = recipient.nickname || recipient.steam64;

        const updatedSender = await changePlayerCoins({
          playerId: sender.id,
          amount: -cleanAmount,
          reason: `Transferência enviada para ${recipientLabel}`,
          refType: 'coin_transfer',
          refId: transferId,
          tx
        });
        const updatedRecipient = await changePlayerCoins({
          playerId: recipient.id,
          amount: cleanAmount,
          reason: `Transferência recebida de ${senderLabel}`,
          refType: 'coin_transfer',
          refId: transferId,
          tx
        });

        const transfer = await tx.coinTransfer.create({
          data: {
            id: transferId,
            token: cleanToken,
            senderId: sender.id,
            recipientId: recipient.id,
            amount: cleanAmount,
            senderBalanceAfter: updatedSender.coins,
            recipientBalanceAfter: updatedRecipient.coins
          },
          include: {
            sender: { select: { id: true, steam64: true, nickname: true, coins: true } },
            recipient: { select: { id: true, steam64: true, nickname: true, coins: true } }
          }
        });

        await logAudit({
          actor: sender.steam64,
          action: 'coins.transfer.completed',
          target: transfer.id,
          data: {
            senderSteam64: sender.steam64,
            recipientSteam64: recipient.steam64,
            amount: cleanAmount,
            senderBalanceAfter: updatedSender.coins,
            recipientBalanceAfter: updatedRecipient.coins
          },
          tx
        });

        return { ...transfer, duplicate: false };
      }, { isolationLevel: 'Serializable' });
    } catch (error) {
      if (isUniqueTokenConflict(error)) return loadExistingTransfer({ token: cleanToken, senderId });
      if (error?.code === 'P2034' && attempt < 2) continue;
      throw error;
    }
  }
  throw new Error('Não foi possível concluir a transferência. Tente novamente.');
}
