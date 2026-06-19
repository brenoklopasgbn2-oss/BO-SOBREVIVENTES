const { EmbedBuilder, Events } = require('discord.js');
const { CHANNELS } = require('../config/constants');
const { logEvent } = require('../utils/logger');

function findTextChannel(guild, name) {
  return guild.channels.cache.find((channel) => channel.name === name && channel.isTextBased());
}

module.exports = {
  name: Events.GuildMemberRemove,
  async execute(member) {
    const leaveChannel = findTextChannel(member.guild, CHANNELS.memberLeave);
    const user = member.user;

    if (leaveChannel && user) {
      const embed = new EmbedBuilder()
        .setColor(0x2f3136)
        .setAuthor({ name: `Sobrevivente saiu: ${user.tag}`, iconURL: user.displayAvatarURL({ size: 128 }) })
        .setTitle('📤 Um sobrevivente deixou a comunidade')
        .setDescription([
          `**${user.tag}** saiu da **Sobreviventes Z**.`,
          '',
          'As portas continuam abertas caso queira voltar para a sobrevivência.'
        ].join('\n'))
        .setThumbnail(user.displayAvatarURL({ size: 256 }))
        .addFields(
          { name: '👤 Usuário', value: `${user.tag}`, inline: true },
          { name: '🆔 ID', value: member.id, inline: true },
          { name: '🌎 Membros agora', value: `${member.guild.memberCount}`, inline: true }
        )
        .setFooter({ text: 'Sobreviventes Z • Registro de saída' })
        .setTimestamp();

      await leaveChannel.send({ embeds: [embed] }).catch(() => null);
    }

    await logEvent(member.guild, 'member_leave', '📤 Saída de usuário', `${user?.tag || member.id} saiu do servidor.`, [
      { name: 'ID', value: member.id, inline: true }
    ]);
  }
};
