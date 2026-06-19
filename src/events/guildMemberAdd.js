const path = require('path');
const { AttachmentBuilder, EmbedBuilder, Events } = require('discord.js');
const { CHANNELS, PANEL_IMAGES } = require('../config/constants');
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
    const welcomeChannel = findTextChannel(member.guild, CHANNELS.memberWelcome);
    const selectionChannel = findTextChannel(member.guild, CHANNELS.welcome);

    if (welcomeChannel) {
      const accountCreated = Math.floor(member.user.createdTimestamp / 1000);
      const imageName = PANEL_IMAGES.welcomeMember;
      const embed = new EmbedBuilder()
        .setColor(0xe74c3c)
        .setAuthor({ name: `Novo sobrevivente: ${member.user.tag}`, iconURL: member.user.displayAvatarURL({ size: 128 }) })
        .setTitle('🧟 Bem-vindo à Sobreviventes Z!')
        .setDescription([
          `${member}, você acabou de entrar na nossa comunidade DayZ PC.`,
          '',
          '🔴 **Vanilla** — sobrevivência pura e realista.',
          '🔵 **BBP** — construção, bases e progressão.',
          '🌈 **DeathMatch** — PvP intenso sem parar.',
          '',
          selectionChannel
            ? `➡️ Vá em ${selectionChannel} e escolha o servidor que deseja acessar.`
            : '➡️ Escolha seu servidor no painel de entrada para liberar os canais.',
          '',
          'Leia as regras, respeite a comunidade e boa sobrevivência!'
        ].join('\n'))
        .setThumbnail(member.user.displayAvatarURL({ size: 256 }))
        .setImage(`attachment://${imageName}`)
        .addFields(
          { name: '👤 Usuário', value: `${member.user.tag}`, inline: true },
          { name: '🆔 ID', value: member.id, inline: true },
          { name: '📅 Conta criada', value: `<t:${accountCreated}:R>`, inline: true },
          { name: '🌎 Membro número', value: `${member.guild.memberCount}`, inline: true }
        )
        .setFooter({ text: 'Sobreviventes Z • Seja bem-vindo ao apocalipse' })
        .setTimestamp();

      await welcomeChannel.send({ content: `👋 Bem-vindo, ${member}!`, embeds: [embed], files: [panelImage(imageName)] }).catch(() => null);
    }

    await logEvent(member.guild, 'member_join', '📥 Entrada de usuário', `${member.user} entrou no servidor.`, [
      { name: 'Usuário', value: `${member.user.tag} (${member.id})`, inline: false }
    ]);
  }
};
