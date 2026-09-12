const path = require('path');
const { AttachmentBuilder } = require('discord.js');
const { PANEL_IMAGES } = require('../config/constants');
const { baseEmbed } = require('../utils/embeds');

function buildEventsPanel() {
  const image = PANEL_IMAGES.events;
  const file = new AttachmentBuilder(path.join(process.cwd(), 'assets', 'painels', image));
  const embed = baseEmbed()
    .setColor(0xd4af37)
    .setTitle('🎯 Eventos • CHAMPIONS Z')
    .setDescription([
      'Este canal será o centro das **competições e premiações** do servidor.',
      '',
      '🚩 KOTH e disputas PvP',
      '🪂 Airdrops e objetivos especiais',
      '🔥 Eventos organizados pela administração',
      '💰 Premiações e desafios da temporada',
      '',
      'Horários, regras e valores serão publicados nos comunicados oficiais.'
    ].join('\n'))
    .setImage(`attachment://${image}`);
  return { embeds: [embed], files: [file] };
}
module.exports = { buildEventsPanel };
