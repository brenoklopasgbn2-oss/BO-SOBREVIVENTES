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
    const vanillaRole = member.guild.roles.cache.find((role) => role.name === ROLE_NAMES.vanilla);
    if (vanillaRole) await member.roles.add(vanillaRole, 'Entrada automática RAID-Z Vanilla').catch(() => null);

    const welcomeChannel = findTextChannel(member.guild, CHANNELS.memberWelcome);

    if (welcomeChannel) {
      const accountCreated = Math.floor(member.user.createdTimestamp / 1000);
      const imageName = PANEL_IMAGES.welcomeMember;
      const embed = new EmbedBuilder()
        .setColor(0xff3131)
        .setAuthor({ name: `Novo raider: ${member.user.tag}`, iconURL: member.user.displayAvatarURL({ size: 128 }) })
        .setTitle('🔴 Bem-vindo ao RAID-Z!')
        .setDescription([
          `${member}, você acabou de entrar na nossa comunidade DayZ PC.`,
          '',
          'Agora temos **1 servidor apenas: RAID-Z Vanilla**.',
          'Seu acesso ao Vanilla é liberado automaticamente.',
          '',
          '⚔️ Clã com máximo de **10 jogadores**.',
          '🏳️ Bandeira no raid precisa de solicitação para ADM.',
          '🤍 Bandeira branca pode ser solicitada **1 vez por mês**.',
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
        .setFooter({ text: 'RAID-Z • Seja bem-vindo ao apocalipse' })
        .setTimestamp();

      await welcomeChannel.send({ content: `👋 Bem-vindo, ${member}!`, embeds: [embed], files: [panelImage(imageName)] }).catch(() => null);
    }

    await logEvent(member.guild, 'member_join', '📥 Entrada de usuário', `${member.user} entrou no servidor.`, [
      { name: 'Usuário', value: `${member.user.tag} (${member.id})`, inline: false }
    ]);
  }
};
