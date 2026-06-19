const { Events, PermissionFlagsBits } = require('discord.js');
const { CHANNELS, SUPPORT_VOICE_CHANNELS } = require('../config/constants');
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

    // Regra: vários staff podem ficar no atendimento, mas só 1 player por canal.
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

module.exports = {
  name: Events.VoiceStateUpdate,
  async execute(oldState, newState) {
    const guild = newState.guild || oldState.guild;
    if (!guild) return;

    const oldRelevant = oldState.channel && (oldState.channel.name === CHANNELS.waitingRoom || isSupportVoiceChannel(oldState.channel));
    const newRelevant = newState.channel && (newState.channel.name === CHANNELS.waitingRoom || isSupportVoiceChannel(newState.channel));

    if (!oldRelevant && !newRelevant) return;

    await enforceSinglePlayerPerSupport(oldState, newState);
    await assignWaitingMembers(guild);
    await refreshTicketPanel(guild);

    setTimeout(() => {
      assignWaitingMembers(guild).then(() => refreshTicketPanel(guild)).catch(() => null);
    }, 1000);
  }
};
