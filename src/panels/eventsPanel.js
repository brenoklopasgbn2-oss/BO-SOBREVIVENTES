const path = require('path');
const { AttachmentBuilder } = require('discord.js');
const { PANEL_IMAGES } = require('../config/constants');
const { baseEmbed } = require('../utils/embeds');

function buildEventsPanel() {
  const image = PANEL_IMAGES.events;
  const file = new AttachmentBuilder(path.join(process.cwd(), 'assets', 'painels', image));
  const embed = baseEmbed()
    .setColor(0xe3263e)
    .setTitle('🎯 Eventos ZONA-Z')
    .setDescription([
      'Este canal concentra a programação e as instruções dos eventos especiais.',
      '',
      '🚩 **KOTH** — disputa de área e recompensa.',
      '🪂 **Airdrop** — corrida por loot com alto risco de PvP.',
      '🔥 **Eventos da staff** — regras, horário e local serão publicados aqui ou em avisos.',
      '',
      'Quando um evento tiver regra própria, siga o comunicado daquele evento.'
    ].join('\n'))
    .setImage(`attachment://${image}`);
  return { embeds: [embed], files: [file] };
}
module.exports = { buildEventsPanel };
