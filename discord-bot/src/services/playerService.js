import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../db/prisma.js';
import { steamLooksValid } from '../utils/format.js';
import { logAudit } from './auditService.js';

export async function getPlayerFromCookie(req) {
  const token = req.cookies?.sz_player_token;
  if (!token) return null;
  return prisma.player.findUnique({ where: { rememberToken: token } });
}

export async function upsertPlayerBySteam64({ steam64, nickname, discordId }) {
  const cleanedSteam = String(steam64 || '').trim();
  if (!steamLooksValid(cleanedSteam)) {
    throw new Error('Steam64 inválido. Ele precisa ter 17 números.');
  }

  const data = {
    nickname: nickname?.trim() || undefined,
    discordId: discordId?.trim() || undefined
  };

  const existing = await prisma.player.findUnique({ where: { steam64: cleanedSteam } });
  if (existing) {
    const updated = await prisma.player.update({
      where: { id: existing.id },
      data: {
        ...data,
        rememberToken: existing.rememberToken || uuidv4()
      }
    });
    await logAudit({ actor: cleanedSteam, action: 'player.updated', target: updated.id, data: { nickname: updated.nickname, discordId: updated.discordId } });
    return updated;
  }

  const created = await prisma.player.create({
    data: {
      steam64: cleanedSteam,
      nickname: data.nickname,
      discordId: data.discordId,
      rememberToken: uuidv4()
    }
  });
  await logAudit({ actor: cleanedSteam, action: 'player.created', target: created.id, data: { nickname: created.nickname, discordId: created.discordId } });
  return created;
}

export async function setPlayerCookie(res, player) {
  res.cookie('sz_player_token', player.rememberToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 1000 * 60 * 60 * 24 * 365
  });
}

export async function changePlayerCoins({ playerId, amount, reason, refType, refId, tx = prisma }) {
  if (!Number.isInteger(amount) || amount === 0) {
    throw new Error('Quantidade de moedas inválida.');
  }

  const player = await tx.player.findUnique({ where: { id: playerId } });
  if (!player) throw new Error('Player não encontrado.');
  const balanceAfter = player.coins + amount;
  if (balanceAfter < 0) throw new Error('Saldo insuficiente.');

  const updatedPlayer = await tx.player.update({
    where: { id: playerId },
    data: { coins: balanceAfter }
  });

  await tx.coinLedger.create({
    data: {
      playerId,
      type: amount > 0 ? 'CREDIT' : 'DEBIT',
      amount,
      balanceAfter,
      reason,
      refType,
      refId
    }
  });

  await logAudit({ actor: 'system', action: amount > 0 ? 'coins.credit' : 'coins.debit', target: updatedPlayer.id, data: { amount, balanceAfter, reason, refType, refId }, tx });

  return updatedPlayer;
}
