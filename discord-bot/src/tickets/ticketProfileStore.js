const { prisma } = require('../services/platformDb');

function cleanId(value) {
  return String(value || '').replace(/\D/g, '').slice(0, 24);
}

function cleanNickname(value) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, 32);
}

async function getProfile(guildId, userId) {
  const gid = String(guildId || '').trim();
  const uid = cleanId(userId);
  if (!gid || !uid) return null;

  const [ticketProfile, linkedPlayer] = await Promise.all([
    prisma.ticketPlayerProfile.findUnique({
      where: { guildId_discordUserId: { guildId: gid, discordUserId: uid } }
    }).catch(() => null),
    prisma.player.findUnique({
      where: { discordId: uid },
      select: { nickname: true, steam64: true }
    }).catch(() => null)
  ]);

  if (!ticketProfile && !linkedPlayer) return null;

  return {
    ...(ticketProfile || {}),
    gameNickname: cleanNickname(ticketProfile?.gameNickname || linkedPlayer?.nickname || ''),
    linkedSteam64: linkedPlayer?.steam64 || null
  };
}

async function saveGameNickname(guildId, userId, gameNickname) {
  const gid = String(guildId || '').trim();
  const uid = cleanId(userId);
  const nickname = cleanNickname(gameNickname);
  if (!gid || !uid || !nickname) return false;

  try {
    await prisma.ticketPlayerProfile.upsert({
      where: { guildId_discordUserId: { guildId: gid, discordUserId: uid } },
      update: { gameNickname: nickname },
      create: { guildId: gid, discordUserId: uid, gameNickname: nickname }
    });
    return true;
  } catch (error) {
    console.error('Erro ao salvar perfil persistente de ticket:', error);
    return false;
  }
}

module.exports = { getProfile, saveGameNickname };
