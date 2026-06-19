const { Events } = require('discord.js');
const { CHANNELS, SUPPORT_VOICE_CHANNELS } = require('../config/constants');
const { logEvent } = require('../utils/logger');
const { isStaffMember } = require('../panels/supportStatus');
const { refreshTicketPanel } = require('../panels/refreshTicketPanel');

function findVoiceChannel(guild, name) {
  return guild.channels.cache.find((channel) => channel.name === name && channel.isVoiceBased());
}

async function assignWaitingMembers(guild) {
  const waitingChannel = findVoiceChannel(guild, CHANNELS.waitingRoom);
  if (!waitingChannel) return;

  const queue = [...waitingChannel.members.values()].filter((member) => !member.user.bot && !isStaffMember(member));
  if (queue.length === 0) return;

  for (const channelName of SUPPORT_VOICE_CHANNELS) {
    if (queue.length === 0) break;
    const supportChannel = findVoiceChannel(guild, channelName);
    if (!supportChannel) continue;

    const activePlayers = [...supportChannel.members.values()].filter((member) => !member.user.bot && !isStaffMember(member));
    if (activePlayers.length > 0) continue;

    const nextMember = queue.shift();
    if (!nextMember?.voice?.channelId || nextMember.voice.channelId !== waitingChannel.id) continue;

    await nextMember.voice.setChannel(supportChannel).catch(() => null);
    await logEvent(guild, 'voice_support_move', '🎙️ Atendimento por voz', `${nextMember.user} foi movido para ${supportChannel}.`, [
      { name: 'Canal de espera', value: waitingChannel.name, inline: true },
      { name: 'Atendimento', value: supportChannel.name, inline: true }
    ]);
  }
}

async function enforceSinglePlayerPerSupport(oldState, newState) {
  const guild = newState.guild || oldState.guild;
  const waitingChannel = findVoiceChannel(guild, CHANNELS.waitingRoom);
  const joinedSupport = newState.channel && SUPPORT_VOICE_CHANNELS.includes(newState.channel.name);
  if (!joinedSupport || !waitingChannel) return;
  if (!newState.member || newState.member.user.bot || isStaffMember(newState.member)) return;

  const nonStaffMembers = [...newState.channel.members.values()].filter((member) => !member.user.bot && !isStaffMember(member));
  if (nonStaffMembers.length <= 1) return;

  await newState.member.voice.setChannel(waitingChannel).catch(() => null);
  await logEvent(guild, 'voice_support_queue', '⏳ Fila de atendimento', `${newState.member.user} voltou para ${waitingChannel} porque ${newState.channel} já possuía um jogador em atendimento.`, [
    { name: 'Canal ocupado', value: newState.channel.name, inline: true }
  ]);
}

module.exports = {
  name: Events.VoiceStateUpdate,
  async execute(oldState, newState) {
    const guild = newState.guild || oldState.guild;
    if (!guild) return;

    const watchedNames = [CHANNELS.waitingRoom, ...SUPPORT_VOICE_CHANNELS];
    const oldName = oldState.channel?.name;
    const newName = newState.channel?.name;
    if (!watchedNames.includes(oldName) && !watchedNames.includes(newName)) return;

    await enforceSinglePlayerPerSupport(oldState, newState);
    await assignWaitingMembers(guild);
    await refreshTicketPanel(guild);
  }
};
