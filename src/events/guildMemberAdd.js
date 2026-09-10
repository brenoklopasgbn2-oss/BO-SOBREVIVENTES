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
    const championRole = member.guild.roles.cache.find((role) => role.name === ROLE_NAMES.survivor);
    if (championRole) await member.roles.add(championRole, 'Entrada automática CHAMPIONS Z').catch(() => null);

    const welcomeChannel = findTextChannel(member.guild, CHANNELS.memberWelcome);
    if (welcomeChannel) {
      const accountCreated = Math.floor(member.user.createdTimestamp / 1000);
      const imageName = PANEL_IMAGES.welcomeMember;
      const embed = new EmbedBuilder()
        .setColor(0xd4af37)
        .setAuthor({ name: `Novo Champion: ${member.user.tag}`, iconURL: member.user.displayAvatarURL({ size: 128 }) })
        .setTitle('🏆 BEM-VINDO AO CHAMPIONS Z!')
        .setDescription([
          `${member}, você acaba de entrar em uma nova disputa.`,
          '',
          '🗺️ **Chernarus** • 👁️ **1PP** • ⚔️ **Competitivo**',
          '🎯 **Eventos** • 🏆 **Temporadas** • 💰 **Premiações**',
          '',
          'Seu cargo **Champion** foi liberado automaticamente.',
          'Leia as regras, acompanhe os avisos e prepare seu clã.',
          '',
          '**SOBREVIVA. DOMINE. SEJA CAMPEÃO.**'
        ].join('\n'))
        .setThumbnail(member.user.displayAvatarURL({ size: 256 }))
        .setImage(`attachment://${imageName}`)
        .addFields(
          { name: '👤 Usuário', value: `${member.user.tag}`, inline: true },
          { name: '📅 Conta criada', value: `<t:${accountCreated}:R>`, inline: true },
          { name: '🏆 Champion nº', value: `${member.guild.memberCount}`, inline: true }
        )
        .setFooter({ text: 'CHAMPIONS Z • Chernarus' })
        .setTimestamp();

      await welcomeChannel.send({ content: `🏆 Bem-vindo, ${member}!`, embeds: [embed], files: [panelImage(imageName)] }).catch(() => null);
    }

    await logEvent(member.guild, 'member_join', '📥 Entrada de usuário', `${member.user} entrou no CHAMPIONS Z.`, [
      { name: 'Usuário', value: `${member.user.tag} (${member.id})`, inline: false }
    ]);
  }
};
