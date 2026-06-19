const { Events } = require('discord.js');
const { CHANNELS, STAFF_ROLES, SUPPORT_VOICE_CHANNELS } = require('../config/constants');
const { logEvent } = require('../utils/logger');

function isStaffMember(member) {
  return member?.roles?.cache?.some((role) => STAFF_ROLES.includes(role.name));
}

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

module.exports = {
  name: Events.VoiceStateUpdate,
  async execute(oldState, newState) {
    const guild = newState.guild || oldState.guild;
    if (!guild) return;

    const watchedNames = [CHANNELS.waitingRoom, ...SUPPORT_VOICE_CHANNELS];
    const oldName = oldState.channel?.name;
    const newName = newState.channel?.name;
    if (!watchedNames.includes(oldName) && !watchedNames.includes(newName)) return;

    await assignWaitingMembers(guild);
  }
};
