const { ChannelType } = require('discord.js');
const { CATEGORY_NAMES, CHANNELS, STAFF_ROLES } = require('../config/constants');

const SUPPORT_CATEGORY_NAMES = [
  CATEGORY_NAMES.support,
  '🎫・SUPORTE',
  '🎫 SUPORTE',
  '🟢・SUPORTE',
  '🟡・SUPORTE',
  '🔴・SUPORTE'
];

const SUPPORT_NAME_MATCHES = ['atendimento-1', 'atendimento-2', 'atendimento'];

function isStaffMember(member) {
  if (!member || member.user?.bot) return false;
  return member.roles?.cache?.some((role) => STAFF_ROLES.includes(role.name));
}

function getMainStaffRole(member) {
  const role = member.roles?.cache?.find((item) => STAFF_ROLES.includes(item.name));
  return role?.name || 'Staff';
}

function isSupportVoiceChannel(channel) {
  if (!channel || !channel.isVoiceBased?.()) return false;
  return SUPPORT_NAME_MATCHES.some((name) => channel.name.includes(name));
}

function findSupportCategory(guild) {
  const ticketChannel = guild.channels.cache.find((channel) => channel.name === CHANNELS.openTicket);
  if (ticketChannel?.parent && ticketChannel.parent.type === ChannelType.GuildCategory) {
    return ticketChannel.parent;
  }

  return guild.channels.cache.find(
    (channel) =>
      channel.type === ChannelType.GuildCategory &&
      (SUPPORT_CATEGORY_NAMES.includes(channel.name) || channel.name.includes('SUPORTE'))
  );
}

function memberIsOnline(member) {
  if (!member || member.user?.bot) return false;

  // Voz conta como online mesmo se o Discord não entregar Presence.
  if (member.voice?.channelId) return true;

  const status = member.presence?.status;
  return Boolean(status && status !== 'offline' && status !== 'invisible');
}

function getStaffMembers(guild) {
  return [...guild.members.cache.values()].filter((member) => isStaffMember(member));
}

function getStaffInSupport(guild) {
  const staffMembers = getStaffMembers(guild);

  return staffMembers.filter((member) => {
    const channel = member.voice?.channel;
    return isSupportVoiceChannel(channel);
  });
}

function getSupportStatus(guild) {
  const staffInSupport = getStaffInSupport(guild);
  const staffMembers = getStaffMembers(guild);
  const staffOnline = staffMembers.some(memberIsOnline);

  if (staffInSupport.length > 0) {
    return {
      emoji: '🟢',
      categoryName: '🟢・SUPORTE',
      label: 'ATENDIMENTO ON',
      description: 'Há staff dentro dos canais de atendimento por voz agora.',
      staffInSupport
    };
  }

  if (staffOnline) {
    return {
      emoji: '🟡',
      categoryName: '🟡・SUPORTE',
      label: 'STAFF ONLINE',
      description: 'Há staff online no Discord, mas ninguém está nos canais de atendimento por voz agora.',
      staffInSupport: []
    };
  }

  return {
    emoji: '🔴',
    categoryName: '🔴・SUPORTE',
    label: 'SEM STAFF ONLINE',
    description: 'Nenhum membro da equipe está online no Discord agora.',
    staffInSupport: []
  };
}

async function updateSupportCategoryStatus(guild) {
  const category = findSupportCategory(guild);
  if (!category) return null;

  const status = getSupportStatus(guild);
  if (category.name !== status.categoryName) {
    await category.setName(status.categoryName, 'Atualização automática do status de atendimento').catch(() => null);
  }

  return status;
}

module.exports = {
  SUPPORT_CATEGORY_NAMES,
  findSupportCategory,
  getMainStaffRole,
  getStaffInSupport,
  getSupportStatus,
  isStaffMember,
  isSupportVoiceChannel,
  updateSupportCategoryStatus
};
