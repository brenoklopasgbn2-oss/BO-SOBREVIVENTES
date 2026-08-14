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
    .setColor(0xe3263e)
    .setTitle('🔴 Bem-vindo à ZONA-Z')
    .setDescription([
      '**DayZ no mapa Alteria**, com progressão direta e sem exagero.',
      '',
      '🗺️ **Mapa:** Alteria',
      '👁️ **Visão:** 1PP',
      '📦 **Loot:** 1.3x equilibrado',
      '🚩 **Eventos:** KOTH + Airdrop',
      '🔫 **Estilo:** armas e veículos coerentes com a proposta do servidor',
      '👥 **Grupo/clã:** até 15 jogadores',
      '',
      'Leia as regras resumidas, acompanhe os avisos e use ticket quando precisar da staff.'
    ].join('\n'))
    .setImage(`attachment://${imageName}`)
    .addFields({ name: 'ZONA-Z', value: 'Sobreviva. Evolua. Dispute território. Faça seu nome em Alteria.' });

  return { embeds: [embed], files: [panelImage(imageName)], legacyTitles: ['🔴 Bem-vindo ao ZONA-Z', '🔴 Bem-vindo ao ZONA-Z!'] };
}

module.exports = { buildWelcomePanel };
