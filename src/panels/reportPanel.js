const path = require('path');
const { ActionRowBuilder, AttachmentBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { TICKET_TYPES } = require('../config/constants');
const { baseEmbed } = require('../utils/embeds');

function panelImage(fileName) {
  return new AttachmentBuilder(path.join(process.cwd(), 'assets', 'painels', fileName));
}

function buildReportPanel() {
  const imageName = '02-tickets.png';
  const embed = baseEmbed()
    .setColor(0xff6b00)
    .setTitle('⚠️ Canal de Denúncias')
    .setDescription([
      'Use este painel para denunciar jogadores, infrações, cheats, abusos ou quebras de regra.',
      '',
      'Quando abrir o ticket, envie o máximo de detalhes possível: nome, ID, horário, prints e vídeos.'
    ].join('\n'))
    .setImage(`attachment://${imageName}`)
    .addFields({ name: 'Importante', value: 'Denúncias falsas ou sem provas podem ser desconsideradas.', inline: false });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(TICKET_TYPES.report.customId)
      .setLabel(TICKET_TYPES.report.label)
      .setEmoji(TICKET_TYPES.report.emoji)
      .setStyle(ButtonStyle.Danger)
  );

  return { embeds: [embed], components: [row], files: [panelImage(imageName)] };
}

module.exports = { buildReportPanel };
