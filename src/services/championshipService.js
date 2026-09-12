import { prisma } from '../db/prisma.js';
import { slugify } from '../utils/slug.js';
import { enqueueDiscordEvent } from './discordOutboxService.js';

export const MAX_CLAN_MEMBERS = 5;

export async function listAvailableClanFlags() {
  return prisma.clanFlagOption.findMany({
    where: { status: 'AVAILABLE' },
    orderBy: [{ name: 'asc' }, { createdAt: 'asc' }]
  });
}

export async function createClanFlagOption({ name, classname = '', description = '', imageData = null, imageMime = null, imageUrl = null }) {
  const cleanName = String(name || '').trim().slice(0, 100);
  if (!cleanName) throw new Error('Digite o nome da bandeira.');
  let slug = slugify(cleanName) || `flag-${Date.now().toString(36)}`;
  const exists = await prisma.clanFlagOption.findUnique({ where: { slug } });
  if (exists) slug = `${slug}-${Date.now().toString(36)}`;
  return prisma.clanFlagOption.create({
    data: {
      name: cleanName,
      slug,
      classname: String(classname || '').trim().slice(0, 160) || null,
      description: String(description || '').trim().slice(0, 1000) || null,
      imageData,
      imageMime,
      imageUrl: String(imageUrl || '').trim().slice(0, 1000) || null,
      status: 'AVAILABLE'
    }
  });
}

export async function registerClanForChampionship({ clanId, playerId, flagId }) {
  const clan = await prisma.clan.findUnique({
    where: { id: clanId },
    include: {
      members: { where: { status: 'ACTIVE' }, include: { player: true } },
      selectedFlag: true
    }
  });
  if (!clan || clan.status !== 'ACTIVE') throw new Error('Clã não encontrado.');
  const manager = clan.members.find(member => member.playerId === playerId && ['OWNER', 'SUB_OWNER'].includes(member.role));
  if (!manager) throw new Error('Apenas dono ou sub dono pode inscrever o clã.');
  if (clan.members.length > MAX_CLAN_MEMBERS) throw new Error(`O campeonato aceita no máximo ${MAX_CLAN_MEMBERS} integrantes por clã.`);
  if (!clan.members.length) throw new Error('O clã precisa ter integrantes.');

  const notLinked = clan.members.filter(member => !member.player?.discordId);
  if (notLinked.length) {
    const names = notLinked.map(member => member.player?.nickname || member.steam64).join(', ');
    throw new Error(`Todos precisam vincular Discord ↔ Steam antes da inscrição. Falta: ${names}.`);
  }

  if (clan.championshipRegistered && clan.selectedFlagId) throw new Error('Este clã já está inscrito no campeonato e já possui bandeira reservada.');
  const cleanFlagId = String(flagId || '').trim();
  if (!cleanFlagId) throw new Error('Escolha uma bandeira disponível.');

  return prisma.$transaction(async (tx) => {
    const flag = await tx.clanFlagOption.findUnique({ where: { id: cleanFlagId } });
    if (!flag || flag.status !== 'AVAILABLE') throw new Error('Essa bandeira não está mais disponível. Atualize a página e escolha outra.');

    const reserved = await tx.clanFlagOption.updateMany({
      where: { id: flag.id, status: 'AVAILABLE' },
      data: { status: 'RESERVED', reservedAt: new Date() }
    });
    if (reserved.count !== 1) throw new Error('Outro clã acabou de reservar essa bandeira. Escolha outra.');

    const updatedClan = await tx.clan.update({
      where: { id: clan.id },
      data: {
        championshipRegistered: true,
        championshipRegisteredAt: new Date(),
        selectedFlagId: flag.id,
        flagDeliveryStatus: 'RESERVED'
      }
    });

    await enqueueDiscordEvent('FLAG_RESERVATION_TICKET', { clanId: clan.id, flagId: flag.id, requestedByPlayerId: playerId }, { tx });
    return { clan: updatedClan, flag };
  });
}

export async function markClanFlagDelivered({ clanId, actor = 'admin' }) {
  const clan = await prisma.clan.findUnique({ where: { id: clanId }, include: { selectedFlag: true } });
  if (!clan?.selectedFlagId) throw new Error('O clã ainda não possui bandeira reservada.');
  return prisma.$transaction(async tx => {
    await tx.clanFlagOption.update({ where: { id: clan.selectedFlagId }, data: { status: 'DELIVERED', deliveredAt: new Date() } });
    const updated = await tx.clan.update({ where: { id: clan.id }, data: { flagDeliveryStatus: 'DELIVERED', flagDeliveredAt: new Date() } });
    await enqueueDiscordEvent('FLAG_DELIVERED', { clanId: clan.id, flagId: clan.selectedFlagId, actor }, { tx });
    return updated;
  });
}

export async function createChampionshipResult({ clanId, eventName, title = '', description = '', points = 0, imageData = null, imageMime = null, adminActor = 'admin', occurredAt = null }) {
  const cleanEvent = String(eventName || '').trim().slice(0, 120);
  if (!cleanEvent) throw new Error('Informe o nome do evento.');
  const parsedPoints = Number(points);
  if (!Number.isFinite(parsedPoints) || parsedPoints < -100000 || parsedPoints > 100000) throw new Error('Pontuação inválida.');
  const pts = Math.trunc(parsedPoints);

  return prisma.$transaction(async tx => {
    const clan = await tx.clan.findUnique({ where: { id: clanId } });
    if (!clan || clan.status !== 'ACTIVE') throw new Error('Clã não encontrado.');
    if (!clan.championshipRegistered) throw new Error('Esse clã ainda não está inscrito no campeonato.');

    const result = await tx.championshipResult.create({
      data: {
        clanId: clan.id,
        eventName: cleanEvent,
        title: String(title || '').trim().slice(0, 140) || null,
        description: String(description || '').trim().slice(0, 3000) || null,
        points: pts,
        imageData,
        imageMime,
        adminActor: String(adminActor || 'admin').slice(0, 120),
        occurredAt: occurredAt ? new Date(occurredAt) : new Date()
      }
    });

    await tx.clan.update({
      where: { id: clan.id },
      data: {
        championshipPoints: { increment: pts },
        ...(pts > 0 ? { eventWins: { increment: 1 } } : {})
      }
    });

    await enqueueDiscordEvent('CHAMPIONSHIP_RESULT', { resultId: result.id }, { tx });
    return result;
  });
}

export async function getChampionshipDashboard() {
  const [clans, results, flags] = await Promise.all([
    prisma.clan.findMany({
      where: { status: 'ACTIVE' },
      include: {
        selectedFlag: true,
        members: { where: { status: 'ACTIVE' }, include: { player: true }, orderBy: [{ role: 'asc' }, { joinedAt: 'asc' }] }
      },
      orderBy: [{ championshipPoints: 'desc' }, { eventWins: 'desc' }, { name: 'asc' }]
    }),
    prisma.championshipResult.findMany({ include: { clan: true }, orderBy: { occurredAt: 'desc' }, take: 100 }),
    prisma.clanFlagOption.findMany({ orderBy: [{ status: 'asc' }, { name: 'asc' }] })
  ]);
  return { clans, results, flags };
}
