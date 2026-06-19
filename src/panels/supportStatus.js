const { CHANNELS, STAFF_ROLES, SUPPORT_VOICE_CHANNELS } = require('../config/constants');

function isStaffMember(member) {
  return member?.roles?.cache?.some((role) => STAFF_ROLES.includes(role.name));
}

function hasOnlinePresence(member) {
  const status = member?.presence?.status;
  return status && status !== 'offline' && status !== 'invisible';
}

function getSupportStatus(guild) {
  const supportChannels = SUPPORT_VOICE_CHANNELS
    .map((name) => guild.channels.cache.find((channel) => channel.name === name && channel.isVoiceBased()))
    .filter(Boolean);

  const staffInSupport = supportChannels.some((channel) =>
    [...channel.members.values()].some((member) => !member.user.bot && isStaffMember(member))
  );

  const staffOnline = guild.members.cache.some((member) => !member.user.bot && isStaffMember(member) && hasOnlinePresence(member));

  if (staffInSupport) {
    return {
      emoji: '🟢',
      label: 'ATENDIMENTO ON',
      description: 'Há staff nos canais de atendimento por voz agora.'
    };
  }

  if (staffOnline) {
    return {
      emoji: '🟡',
      label: 'EQUIPE ONLINE',
      description: `Há staff online no Discord, mas ninguém está em ${CHANNELS.supportRoom1} ou ${CHANNELS.supportRoom2} no momento.`
    };
  }

  return {
    emoji: '🔴',
    label: 'SEM STAFF ONLINE',
    description: 'Nenhum membro da equipe está online no Discord agora.'
  };
}

module.exports = { getSupportStatus, isStaffMember };
