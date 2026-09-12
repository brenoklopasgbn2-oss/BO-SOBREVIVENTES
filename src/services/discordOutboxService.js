import { prisma } from '../db/prisma.js';

export async function enqueueDiscordEvent(type, payload = {}, { tx = prisma, availableAt = new Date() } = {}) {
  const cleanType = String(type || '').trim().toUpperCase().slice(0, 80);
  if (!cleanType) throw new Error('Tipo de evento Discord inválido.');
  return tx.discordOutbox.create({
    data: {
      type: cleanType,
      payload: payload && typeof payload === 'object' ? payload : {},
      availableAt
    }
  });
}

export async function getDiscordOutboxStats() {
  const [pending, failed, sent] = await Promise.all([
    prisma.discordOutbox.count({ where: { status: 'PENDING' } }),
    prisma.discordOutbox.count({ where: { status: 'FAILED' } }),
    prisma.discordOutbox.count({ where: { status: 'SENT' } })
  ]);
  return { pending, failed, sent };
}
