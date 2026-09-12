const { prisma } = require('./platformDb');

function cleanId(value) {
  return String(value || '').replace(/\D/g, '').slice(0, 24);
}

function cleanName(value, fallback = 'Streamer') {
  const name = String(value || '').trim().replace(/\s+/g, ' ');
  return (name || fallback).slice(0, 80);
}

function linkRequiredError() {
  const error = new Error('Para registrar uma indicação, seu Discord precisa estar vinculado a um jogador/Steam64.');
  error.code = 'STREAMER_REFERRAL_LINK_REQUIRED';
  return error;
}

async function getLinkedPlayerByDiscord(discordUserId, db = prisma) {
  const uid = cleanId(discordUserId);
  if (!uid) return null;
  const player = await db.player.findUnique({
    where: { discordId: uid },
    select: { id: true, steam64: true, nickname: true, discordLinkedAt: true }
  }).catch(() => null);
  if (!player || !/^\d{17}$/.test(String(player.steam64 || '').trim())) return null;
  return player;
}

async function syncExistingReferralSteam({ guildId, playerDiscordId, steam64 }) {
  const gid = String(guildId || '').trim();
  const playerId = cleanId(playerDiscordId);
  const safeSteam64 = String(steam64 || '').trim();
  if (!gid || !playerId || !/^\d{17}$/.test(safeSteam64)) return getExistingReferral(gid, playerId);

  const existing = await getExistingReferral(gid, playerId);
  if (!existing || existing.playerSteam64 === safeSteam64) return existing;
  return prisma.streamerReferral.update({
    where: { guildId_playerDiscordId: { guildId: gid, playerDiscordId: playerId } },
    data: { playerSteam64: safeSteam64 },
    include: { streamerProfile: true }
  });
}

async function listStreamerProfiles(guildId, { activeOnly = false } = {}) {
  const profiles = await prisma.streamerReferralProfile.findMany({
    where: {
      guildId: String(guildId),
      ...(activeOnly ? { active: true } : {})
    },
    include: { _count: { select: { referrals: { where: { playerSteam64: { not: null } } } } } },
    orderBy: [{ active: 'desc' }, { streamerName: 'asc' }]
  });

  return profiles.sort((a, b) => {
    const diff = Number(b._count?.referrals || 0) - Number(a._count?.referrals || 0);
    return diff || a.streamerName.localeCompare(b.streamerName, 'pt-BR');
  });
}

async function getStreamerRanking(guildId, { activeOnly = false, limit = 50 } = {}) {
  const profiles = await listStreamerProfiles(guildId, { activeOnly });
  return profiles.slice(0, Math.max(1, Math.min(Number(limit) || 50, 125)));
}

async function getReferralSummary(guildId) {
  const [streamers, activeStreamers, referrals] = await Promise.all([
    prisma.streamerReferralProfile.count({ where: { guildId: String(guildId) } }),
    prisma.streamerReferralProfile.count({ where: { guildId: String(guildId), active: true } }),
    prisma.streamerReferral.count({ where: { guildId: String(guildId), playerSteam64: { not: null } } })
  ]);
  return { streamers, activeStreamers, referrals };
}

async function upsertStreamerProfile({ guildId, discordUserId, streamerName, registeredByDiscordId }) {
  const gid = String(guildId || '').trim();
  const uid = cleanId(discordUserId);
  if (!gid || !uid) throw new Error('Servidor ou usuário do streamer inválido.');

  return prisma.streamerReferralProfile.upsert({
    where: { guildId_discordUserId: { guildId: gid, discordUserId: uid } },
    update: {
      streamerName: cleanName(streamerName),
      active: true,
      registeredByDiscordId: cleanId(registeredByDiscordId) || null
    },
    create: {
      guildId: gid,
      discordUserId: uid,
      streamerName: cleanName(streamerName),
      active: true,
      registeredByDiscordId: cleanId(registeredByDiscordId) || null
    },
    include: { _count: { select: { referrals: { where: { playerSteam64: { not: null } } } } } }
  });
}

async function setStreamerActive({ guildId, profileId, active }) {
  const current = await prisma.streamerReferralProfile.findFirst({
    where: { id: String(profileId), guildId: String(guildId) },
    include: { _count: { select: { referrals: { where: { playerSteam64: { not: null } } } } } }
  });
  if (!current) throw new Error('Streamer não encontrado.');

  return prisma.streamerReferralProfile.update({
    where: { id: current.id },
    data: { active: Boolean(active) },
    include: { _count: { select: { referrals: { where: { playerSteam64: { not: null } } } } } }
  });
}

async function getStreamerProfile(guildId, profileId) {
  return prisma.streamerReferralProfile.findFirst({
    where: { id: String(profileId), guildId: String(guildId) },
    include: {
      _count: { select: { referrals: { where: { playerSteam64: { not: null } } } } },
      referrals: { where: { playerSteam64: { not: null } }, orderBy: { selectedAt: 'desc' }, take: 10 }
    }
  });
}

async function findStreamerProfileByDiscord(guildId, discordUserId) {
  return prisma.streamerReferralProfile.findUnique({
    where: {
      guildId_discordUserId: {
        guildId: String(guildId),
        discordUserId: cleanId(discordUserId)
      }
    },
    include: { _count: { select: { referrals: { where: { playerSteam64: { not: null } } } } } }
  });
}

async function getExistingReferral(guildId, playerDiscordId) {
  return prisma.streamerReferral.findUnique({
    where: {
      guildId_playerDiscordId: {
        guildId: String(guildId),
        playerDiscordId: cleanId(playerDiscordId)
      }
    },
    include: { streamerProfile: true }
  });
}

async function createReferral({ guildId, playerDiscordId, playerDiscordUsername, playerDisplayName, streamerProfileId }) {
  const gid = String(guildId || '').trim();
  const playerId = cleanId(playerDiscordId);
  if (!gid || !playerId) throw new Error('Jogador inválido.');

  try {
    return await prisma.$transaction(async (tx) => {
      const profile = await tx.streamerReferralProfile.findFirst({
        where: { id: String(streamerProfileId), guildId: gid, active: true }
      });
      if (!profile) throw new Error('Esse streamer não está mais disponível para seleção.');
      if (profile.discordUserId === playerId) throw new Error('O próprio streamer não pode indicar a si mesmo.');

      // Validação definitiva no banco: nenhuma indicação entra sem Discord ↔ Steam vinculado.
      const linkedPlayer = await getLinkedPlayerByDiscord(playerId, tx);
      if (!linkedPlayer) throw linkRequiredError();

      const existing = await tx.streamerReferral.findUnique({
        where: { guildId_playerDiscordId: { guildId: gid, playerDiscordId: playerId } },
        include: { streamerProfile: true }
      });
      if (existing) {
        if (existing.playerSteam64 !== linkedPlayer.steam64) {
          const repaired = await tx.streamerReferral.update({
            where: { id: existing.id },
            data: { playerSteam64: linkedPlayer.steam64 },
            include: { streamerProfile: true }
          });
          return { referral: repaired, profile: repaired.streamerProfile, alreadyExisted: true };
        }
        return { referral: existing, profile: existing.streamerProfile, alreadyExisted: true };
      }

      const referral = await tx.streamerReferral.create({
        data: {
          guildId: gid,
          playerDiscordId: playerId,
          playerDiscordUsername: String(playerDiscordUsername || '').slice(0, 100) || null,
          playerDisplayName: String(playerDisplayName || '').slice(0, 100) || null,
          playerSteam64: linkedPlayer.steam64,
          streamerProfileId: profile.id
        }
      });

      return { referral, profile, alreadyExisted: false };
    });
  } catch (error) {
    // Dois cliques quase simultâneos continuam resultando em uma única indicação.
    if (error?.code === 'P2002') {
      const existing = await getExistingReferral(gid, playerId);
      if (existing) return { referral: existing, profile: existing.streamerProfile, alreadyExisted: true };
    }
    throw error;
  }
}

module.exports = {
  cleanId,
  getLinkedPlayerByDiscord,
  syncExistingReferralSteam,
  listStreamerProfiles,
  getStreamerRanking,
  getReferralSummary,
  upsertStreamerProfile,
  setStreamerActive,
  getStreamerProfile,
  findStreamerProfileByDiscord,
  getExistingReferral,
  createReferral
};
