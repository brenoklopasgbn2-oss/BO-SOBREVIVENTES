const path = require('path');
const { ActionRowBuilder, AttachmentBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { PANEL_IMAGES, TICKET_TYPES } = require('../config/constants');
const { baseEmbed } = require('../utils/embeds');

function panelImage(fileName) {
  return new AttachmentBuilder(path.join(process.cwd(), 'assets', 'painels', fileName));
}

function buildBugPanel() {
  const imageName = PANEL_IMAGES.bug;
  const embed = baseEmbed()
    .setColor(0x00d1ff)
    .setTitle('🐞 Reportar Bug')
    .setDescription([
      'Encontrou um bug no Discord, no servidor ou em algum sistema da comunidade?',
      '',
      'Abra o ticket abaixo e descreva exatamente o que aconteceu, como reproduzir o problema e envie prints ou vídeos.'
    ].join('\n'))
    .setImage(`attachment://${imageName}`)
    .addFields({ name: 'Dica', value: 'Quanto mais detalhes forem enviados, mais rápido a equipe consegue corrigir.', inline: false });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(TICKET_TYPES.bug.customId).setLabel(TICKET_TYPES.bug.label).setEmoji(TICKET_TYPES.bug.emoji).setStyle(ButtonStyle.Primary)
  );

  return { embeds: [embed], components: [row], files: [panelImage(imageName)] };
}

module.exports = { buildBugPanel };
