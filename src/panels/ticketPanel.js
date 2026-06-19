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
      'Precisa de ajuda? Abra um ticket para falar com a equipe da **Sobreviventes Z**.',
      '',
      'Escolha a categoria correta para agilizar o atendimento.'
    ].join('\n'))
    .setImage(`attachment://${imageName}`)
    .addFields(
      { name: '🎧 Suporte Geral', value: 'Dúvidas e problemas gerais.', inline: true },
      { name: '⚠️ Denúncias', value: 'Jogadores quebrando regras.', inline: true },
      { name: '💰 Loja / Base / PvP', value: 'Doações, problemas em base e reports de PvP.', inline: false }
    );

  const row = new ActionRowBuilder().addComponents(
    Object.values(TICKET_TYPES).map((type) =>
      new ButtonBuilder()
        .setCustomId(type.customId)
        .setLabel(type.label)
        .setEmoji(type.emoji)
        .setStyle(type.name === 'denuncia' ? ButtonStyle.Danger : ButtonStyle.Secondary)
    )
  );

  return { embeds: [embed], components: [row], files: [panelImage(imageName)] };
}

module.exports = { buildTicketPanel };
