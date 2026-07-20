import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../db/prisma.js';
import { steamLooksValid } from '../utils/format.js';
import { logAudit } from './auditService.js';

export async function getPlayerFromCookie(req) {
  const token = req.cookies?.sz_player_token;
  if (!token) return null;
  const player = await prisma.player.findUnique({
    where: { rememberToken: token },
    omit: { avatarData: true }
  });
  return player ? { ...player, hasAvatar: Boolean(player.avatarMime) } : null;
}

export async function upsertPlayerBySteam64({ steam64, nickname, discordId, overwriteNickname = false }) {
  const cleanedSteam = String(steam64 || '').trim();
  if (!steamLooksValid(cleanedSteam)) {
    throw new Error('Steam64 inválido. Ele precisa ter 17 números.');
  }

  const cleanedNickname = nickname?.trim() || undefined;
  const data = {
    nickname: cleanedNickname,
    discordId: discordId?.trim() || undefined
  };

  const existing = await prisma.player.findUnique({ where: { steam64: cleanedSteam } });
  if (existing) {
    const updated = await prisma.player.update({
      where: { id: existing.id },
      data: {
        nickname: overwriteNickname ? cleanedNickname : (existing.nickname || cleanedNickname || undefined),
        discordId: data.discordId,
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

  let updatedPlayer;
  if (amount < 0) {
    const debit = Math.abs(amount);
    const changed = await tx.player.updateMany({
      where: { id: playerId, coins: { gte: debit } },
      data: { coins: { decrement: debit } }
    });
    if (!changed.count) {
      const exists = await tx.player.findUnique({ where: { id: playerId }, select: { id: true } });
      if (!exists) throw new Error('Player não encontrado.');
      throw new Error('Saldo insuficiente.');
    }
    updatedPlayer = await tx.player.findUnique({ where: { id: playerId } });
  } else {
    updatedPlayer = await tx.player.update({
      where: { id: playerId },
      data: { coins: { increment: amount } }
    });
  }

  const balanceAfter = updatedPlayer.coins;

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
