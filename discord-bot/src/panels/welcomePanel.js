const path = require('path');
const { AttachmentBuilder } = require('discord.js');
const { PANEL_IMAGES } = require('../config/constants');
const { baseEmbed } = require('../utils/embeds');

function panelImage(fileName) {
  return new AttachmentBuilder(path.join(process.cwd(), 'assets', 'painels', fileName));
}

function buildWelcomePanel() {
  const imageName = PANEL_IMAGES.welcome;
  const embed = baseEmbed()
    .setColor(0xd4af37)
    .setTitle('🏆 Bem-vindo ao CHAMPIONS Z')
    .setDescription([
      '**Sua jornada começa aqui.**',
      '',
      '🗺️ **Mapa:** Chernarus',
      '👁️ **Visão:** 1PP',
      '⚔️ **Proposta:** competitivo com essência vanilla',
      '🔐 **Bunkers:** 2 experiências exclusivas',
      '🪖 **Exploração:** 10 novas áreas militares com loot valioso',
      '☣️ **Perigo extra:** infectado NBC amarelo com POX letal',
      '🚫 **Sem Pay-to-Win**',
      '',
      'Leia as regras, acompanhe os avisos e confira os guias antes de encarar Chernarus.'
    ].join('\n'))
    .setImage(`attachment://${imageName}`)
    .addFields({ name: 'CHAMPIONS Z', value: '**Sobreviva. Domine. Seja campeão.**' });

  return { embeds: [embed], files: [panelImage(imageName)], legacyTitles: ['🔴 Bem-vindo à ZONA-Z', '🔴 Bem-vindo ao ZONA-Z', '🔴 Bem-vindo ao ZONA-Z!'] };
}

module.exports = { buildWelcomePanel };
