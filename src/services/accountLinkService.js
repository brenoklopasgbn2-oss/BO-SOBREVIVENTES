import crypto from 'crypto';
import { prisma } from '../db/prisma.js';
import { enqueueDiscordEvent } from './discordOutboxService.js';

export function normalizeDiscordLinkCode(value) {
  return String(value || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 16);
}

export function hashDiscordLinkCode(value) {
  return crypto.createHash('sha256').update(normalizeDiscordLinkCode(value)).digest('hex');
}

export async function consumeDiscordLinkCode({ playerId, code }) {
  const normalized = normalizeDiscordLinkCode(code);
  if (normalized.length < 6) throw new Error('Código de vinculação inválido.');
  const codeHash = hashDiscordLinkCode(normalized);
  const now = new Date();

  return prisma.$transaction(async (tx) => {
    const link = await tx.discordLinkCode.findUnique({ where: { codeHash } });
    if (!link || link.usedAt || link.expiresAt <= now) throw new Error('Código inválido, expirado ou já utilizado. Gere outro código no Discord.');

    const player = await tx.player.findUnique({ where: { id: playerId } });
    if (!player) throw new Error('Player não encontrado. Abra o site novamente pelo DayZ.');

    const linkedElsewhere = await tx.player.findFirst({
      where: { discordId: link.discordId, id: { not: player.id } },
      select: { id: true, steam64: true, nickname: true }
    });
    if (linkedElsewhere) throw new Error('Esse Discord já está vinculado a outro Steam64. Procure a administração.');

    if (player.discordId && player.discordId !== link.discordId) {
      throw new Error('Este Steam64 já está vinculado a outro Discord. A troca precisa ser feita pela administração.');
    }

    const updated = await tx.player.update({
      where: { id: player.id },
      data: {
        discordId: link.discordId,
        discordUsername: link.discordUsername || player.discordUsername || null,
        discordLinkedAt: player.discordLinkedAt || now,
        unlinkedAlertedAt: null
      }
    });

    await tx.discordLinkCode.update({
      where: { id: link.id },
      data: { usedAt: now, playerId: player.id }
    });

    await tx.discordLinkCode.updateMany({
      where: { discordId: link.discordId, usedAt: null, id: { not: link.id } },
      data: { usedAt: now }
    });

    await enqueueDiscordEvent('ACCOUNT_LINKED', {
      playerId: updated.id,
      steam64: updated.steam64,
      nickname: updated.nickname || null,
      discordId: updated.discordId,
      discordUsername: updated.discordUsername || null
    }, { tx });

    return updated;
  });
}

export async function unlinkDiscordFromPlayer({ playerId, actor = 'admin' }) {
  const player = await prisma.player.findUnique({ where: { id: playerId } });
  if (!player) throw new Error('Player não encontrado.');
  const oldDiscordId = player.discordId;
  const updated = await prisma.player.update({
    where: { id: player.id },
    data: { discordId: null, discordUsername: null, discordLinkedAt: null, unlinkedAlertedAt: null }
  });
  await enqueueDiscordEvent('ACCOUNT_UNLINKED_BY_ADMIN', {
    steam64: player.steam64,
    nickname: player.nickname || null,
    discordId: oldDiscordId || null,
    actor
  });
  return updated;
}
