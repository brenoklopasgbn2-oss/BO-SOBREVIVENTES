const path = require('path');
const { AttachmentBuilder, EmbedBuilder, Events } = require('discord.js');
const { CHANNELS, PANEL_IMAGES, ROLE_NAMES } = require('../config/constants');
const { logEvent } = require('../utils/logger');

function findTextChannel(guild, name) {
  return guild.channels.cache.find((channel) => channel.name === name && channel.isTextBased());
}
function panelImage(fileName) {
  return new AttachmentBuilder(path.join(process.cwd(), 'assets', 'painels', fileName));
}

module.exports = {
  name: Events.GuildMemberAdd,
  async execute(member) {
    const survivorRole = member.guild.roles.cache.find((role) => role.name === ROLE_NAMES.survivor);
    if (survivorRole) await member.roles.add(survivorRole, 'Entrada automática ZONA-Z').catch(() => null);

    const welcomeChannel = findTextChannel(member.guild, CHANNELS.memberWelcome);
    if (welcomeChannel) {
      const accountCreated = Math.floor(member.user.createdTimestamp / 1000);
      const imageName = PANEL_IMAGES.welcomeMember;
      const embed = new EmbedBuilder()
        .setColor(0xe3263e)
        .setAuthor({ name: `Novo sobrevivente: ${member.user.tag}`, iconURL: member.user.displayAvatarURL({ size: 128 }) })
        .setTitle('🔴 Bem-vindo à ZONA-Z!')
        .setDescription([
          `${member}, bem-vindo à nossa comunidade DayZ PC.`,
          '',
          '🗺️ **Alteria** • 👁️ **1PP** • 📦 **Loot 1.3x**',
          '🚩 **KOTH** • 🪂 **Airdrop** • 👥 **Grupo até 15**',
          '',
          'Seu cargo de **Sobrevivente** foi liberado automaticamente. Leia as regras resumidas e boa jornada.'
        ].join('\n'))
        .setThumbnail(member.user.displayAvatarURL({ size: 256 }))
        .setImage(`attachment://${imageName}`)
        .addFields(
          { name: '👤 Usuário', value: `${member.user.tag}`, inline: true },
          { name: '🆔 ID', value: member.id, inline: true },
          { name: '📅 Conta criada', value: `<t:${accountCreated}:R>`, inline: true },
          { name: '🌎 Membro número', value: `${member.guild.memberCount}`, inline: true }
        )
        .setFooter({ text: 'ZONA-Z • Bem-vindo a Alteria' })
        .setTimestamp();

      await welcomeChannel.send({ content: `👋 Bem-vindo, ${member}!`, embeds: [embed], files: [panelImage(imageName)] }).catch(() => null);
    }

    await logEvent(member.guild, 'member_join', '📥 Entrada de usuário', `${member.user} entrou no servidor.`, [
      { name: 'Usuário', value: `${member.user.tag} (${member.id})`, inline: false }
    ]);
  }
};
