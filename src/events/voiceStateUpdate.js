const { Events, PermissionFlagsBits } = require('discord.js');
const { CHANNELS } = require('../config/constants');
const { logEvent } = require('../utils/logger');
const { isStaffMember, isSupportVoiceChannel } = require('../panels/supportStatus');
const { refreshTicketPanel } = require('../panels/refreshTicketPanel');

function findVoiceChannel(guild, name) {
  return guild.channels.cache.find((channel) => channel.name === name && channel.isVoiceBased());
}

function isPlayer(member) {
  return Boolean(member && !member.user.bot && !isStaffMember(member));
}

function getPlayers(channel) {
  return [...channel.members.values()].filter(isPlayer);
}

function getStaff(channel) {
  return [...channel.members.values()].filter((member) => !member.user.bot && isStaffMember(member));
}

function getWaitingPlayers(guild) {
  const waitingChannel = findVoiceChannel(guild, CHANNELS.waitingRoom);
  if (!waitingChannel) return { waitingChannel: null, players: [] };

  return {
    waitingChannel,
    players: [...waitingChannel.members.values()].filter(isPlayer)
  };
}

function getSupportChannelsWithStaff(guild) {
  return guild.channels.cache
    .filter((channel) => channel.isVoiceBased?.() && isSupportVoiceChannel(channel))
    .filter((channel) => getStaff(channel).length > 0)
    .map((channel) => channel);
}

async function movePlayerToStaffChannel(player, targetChannel, waitingChannel) {
  if (!player?.voice?.channelId || player.voice.channelId !== waitingChannel.id) return false;

  const permissions = targetChannel.permissionsFor(player);
  if (!permissions?.has(PermissionFlagsBits.Connect)) return false;

  await player.voice.setChannel(targetChannel, 'Atendimento automático Sobreviventes Z').catch(() => null);

  if (player.voice.channelId === targetChannel.id) {
    const staffList = getStaff(targetChannel).map((member) => `${member.user}`).join(', ') || 'Staff';
    await logEvent(player.guild, 'voice_support_move', '🎙️ Atendimento por voz', `${player.user} foi movido para ${targetChannel}.`, [
      { name: 'Canal de espera', value: waitingChannel.name, inline: true },
      { name: 'Atendimento', value: targetChannel.name, inline: true },
      { name: 'Staff no canal', value: staffList, inline: false }
    ]);
    return true;
  }

  return false;
}

async function assignWaitingMembers(guild) {
  const { waitingChannel, players } = getWaitingPlayers(guild);
  if (!waitingChannel || players.length === 0) return;

  const supportChannelsWithStaff = getSupportChannelsWithStaff(guild);
  if (supportChannelsWithStaff.length === 0) return;

  const queue = [...players];

  for (const supportChannel of supportChannelsWithStaff) {
    if (queue.length === 0) break;

    const activePlayers = getPlayers(supportChannel);
    if (activePlayers.length > 0) continue;

    const nextPlayer = queue.shift();
    await movePlayerToStaffChannel(nextPlayer, supportChannel, waitingChannel);
  }
}

async function enforceSinglePlayerPerSupport(oldState, newState) {
  const guild = newState.guild || oldState.guild;
  const waitingChannel = findVoiceChannel(guild, CHANNELS.waitingRoom);
  const joinedSupport = newState.channel && isSupportVoiceChannel(newState.channel);

  if (!joinedSupport || !waitingChannel) return;
  if (!isPlayer(newState.member)) return;

  const nonStaffMembers = getPlayers(newState.channel);
  if (nonStaffMembers.length <= 1) return;

  await newState.member.voice.setChannel(waitingChannel, 'Canal de atendimento já possui player').catch(() => null);

  await logEvent(guild, 'voice_support_queue', '⏳ Fila de atendimento', `${newState.member.user} voltou para ${waitingChannel} porque ${newState.channel} já possuía um jogador em atendimento.`, [
    { name: 'Canal ocupado', value: newState.channel.name, inline: true }
  ]);
}

async function refreshSupportUi(guild) {
  await refreshTicketPanel(guild).catch(() => null);
  setTimeout(() => refreshTicketPanel(guild).catch(() => null), 250);
  setTimeout(() => refreshTicketPanel(guild).catch(() => null), 1200);
}

module.exports = {
  name: Events.VoiceStateUpdate,
  async execute(oldState, newState) {
    const guild = newState.guild || oldState.guild;
    if (!guild) return;

    const relevantChannelIds = [CHANNELS.waitingRoom, CHANNELS.supportRoom1, CHANNELS.supportRoom2];
    const oldName = oldState.channel?.name;
    const newName = newState.channel?.name;
    const oldRelevant = oldName && relevantChannelIds.includes(oldName);
    const newRelevant = newName && relevantChannelIds.includes(newName);
    const staffChanged = isStaffMember(newState.member || oldState.member);

    if (!oldRelevant && !newRelevant && !staffChanged) return;

    await enforceSinglePlayerPerSupport(oldState, newState);
    await assignWaitingMembers(guild);
    await refreshSupportUi(guild);

    setTimeout(() => {
      assignWaitingMembers(guild).then(() => refreshSupportUi(guild)).catch(() => null);
    }, 800);
  }
};
