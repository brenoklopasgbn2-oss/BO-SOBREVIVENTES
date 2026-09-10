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
      '**Aqui, sobreviver é só o começo.**',
      '',
      '🗺️ **Mapa:** Chernarus',
      '👁️ **Perspectiva:** 1PP',
      '⚔️ **Foco:** competitivo, sobrevivência e PvP',
      '🎯 **Eventos:** disputas, eventos especiais e premiações',
      '🏆 **Temporadas:** competição entre jogadores e clãs',
      '🚫 **Sem Pay-to-Win:** vantagem competitiva não está à venda',
      '',
      'Leia as regras, acompanhe os avisos e entre na comunidade.',
      '',
      '**SOBREVIVA. DOMINE. SEJA CAMPEÃO.**'
    ].join('\n'))
    .setImage(`attachment://${imageName}`)
    .addFields({ name: 'CHAMPIONS Z', value: 'Uma nova disputa começa em Chernarus.' });

  return { embeds: [embed], files: [panelImage(imageName)], legacyTitles: ['🔴 Bem-vindo à ZONA-Z', '🔴 Bem-vindo ao ZONA-Z'] };
}

module.exports = { buildWelcomePanel };
