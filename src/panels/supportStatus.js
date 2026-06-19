const { PermissionFlagsBits } = require('discord.js');
const { CATEGORY_NAMES, CHANNELS, STAFF_ROLES, SUPPORT_VOICE_CHANNELS } = require('../config/constants');

const SUPPORT_CATEGORY_NAMES = [
  CATEGORY_NAMES.support,
  '🎫・SUPORTE',
  '🎫 SUPORTE',
  '🟢・SUPORTE',
  '🟡・SUPORTE',
  '🔴・SUPORTE'
];

function isStaffMember(member) {
  if (!member || member.user?.bot) return false;

  return Boolean(
    member.permissions?.has(PermissionFlagsBits.Administrator) ||
    member.permissions?.has(PermissionFlagsBits.ManageGuild) ||
    member.permissions?.has(PermissionFlagsBits.ManageChannels) ||
    member.roles?.cache?.some((role) => STAFF_ROLES.includes(role.name))
  );
}

function findVoiceChannel(guild, name) {
  return guild.channels.cache.find((channel) => channel.name === name && channel.isVoiceBased());
}

function findSupportCategory(guild) {
  return guild.channels.cache.find(
    (channel) => channel.type === 4 && SUPPORT_CATEGORY_NAMES.includes(channel.name)
  );
}

function memberIsOnlineByPresence(member) {
  const status = member?.presence?.status;
  return status && status !== 'offline' && status !== 'invisible';
}

function memberIsInAnyVoice(member) {
  return Boolean(member?.voice?.channelId);
}

function getStaffMembers(guild) {
  return [...guild.members.cache.values()].filter((member) => isStaffMember(member));
}

function getSupportStatus(guild) {
  const supportChannels = SUPPORT_VOICE_CHANNELS
    .map((name) => findVoiceChannel(guild, name))
    .filter(Boolean);

  const staffInSupport = supportChannels.some((channel) =>
    [...channel.members.values()].some((member) => isStaffMember(member))
  );

  const staffMembers = getStaffMembers(guild);

  const staffOnline = staffMembers.some((member) =>
    memberIsOnlineByPresence(member) || memberIsInAnyVoice(member)
  );

  if (staffInSupport) {
    return {
      emoji: '🟢',
      categoryName: '🟢・SUPORTE',
      label: 'ATENDIMENTO ON',
      description: 'Há staff dentro dos canais de atendimento por voz agora.'
    };
  }

  if (staffOnline) {
    return {
      emoji: '🟡',
      categoryName: '🟡・SUPORTE',
      label: 'STAFF ONLINE',
      description: 'Há staff online no Discord, mas ninguém está nos canais de atendimento por voz agora.'
    };
  }

  return {
    emoji: '🔴',
    categoryName: '🔴・SUPORTE',
    label: 'SEM STAFF ONLINE',
    description: 'Nenhum membro da equipe está online no Discord agora.'
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
  getSupportStatus,
  isStaffMember,
  updateSupportCategoryStatus
};
