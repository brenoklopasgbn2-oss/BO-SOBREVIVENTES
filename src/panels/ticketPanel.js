const path = require('path');
const { ActionRowBuilder, AttachmentBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { TICKET_TYPES } = require('../config/constants');
const { baseEmbed } = require('../utils/embeds');

function panelImage(fileName) {
  return new AttachmentBuilder(path.join(process.cwd(), 'assets', 'painels', fileName));
}

function buildTicketPanel() {
  const imageName = '02-tickets.png';
  const embed = baseEmbed()
    .setColor(0xe74c3c)
    .setTitle('🎫 Central de Atendimento')
    .setDescription([
      'Abra o atendimento correto para falar com a equipe da **Sobreviventes Z**.',
      '',
      'Use este painel para suporte geral, loja/doações, problemas em base e reports de PvP.',
      'Os canais **denúncias** e **reportar-bug** possuem painéis próprios para agilizar o atendimento.'
    ].join('\n'))
    .setImage(`attachment://${imageName}`)
    .addFields(
      { name: '🎧 Suporte Geral', value: 'Dúvidas, ajuda e suporte comum.', inline: true },
      { name: '💰 Loja / Doações', value: 'VIP, benefícios e contribuições.', inline: true },
      { name: '🏠 / ⚔️ Base e PvP', value: 'Problemas em base e report PvP.', inline: false }
    );

  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(TICKET_TYPES.support.customId).setLabel(TICKET_TYPES.support.label).setEmoji(TICKET_TYPES.support.emoji).setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(TICKET_TYPES.vip.customId).setLabel(TICKET_TYPES.vip.label).setEmoji(TICKET_TYPES.vip.emoji).setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(TICKET_TYPES.base.customId).setLabel(TICKET_TYPES.base.label).setEmoji(TICKET_TYPES.base.emoji).setStyle(ButtonStyle.Secondary)
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(TICKET_TYPES.pvp.customId).setLabel(TICKET_TYPES.pvp.label).setEmoji(TICKET_TYPES.pvp.emoji).setStyle(ButtonStyle.Secondary)
  );

  return { embeds: [embed], components: [row1, row2], files: [panelImage(imageName)] };
}

module.exports = { buildTicketPanel };
