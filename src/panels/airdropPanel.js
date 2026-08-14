const path = require('path');
const { AttachmentBuilder } = require('discord.js');
const { PANEL_IMAGES } = require('../config/constants');
const { baseEmbed } = require('../utils/embeds');

function buildAirdropPanel() {
  const image = PANEL_IMAGES.airdrop;
  const file = new AttachmentBuilder(path.join(process.cwd(), 'assets', 'painels', image));
  const embed = baseEmbed()
    .setColor(0xe3263e)
    .setTitle('🪂 Airdrop • ZONA-Z')
    .setDescription([
      'Airdrops espalham pontos de disputa e loot pelo mapa.',
      '',
      '📦 Vá preparado: um drop pode atrair vários grupos.',
      '⚔️ A área é de risco e pode virar PvP rapidamente.',
      '🎯 Local, frequência e conteúdo podem mudar conforme o balanceamento.',
      '',
      'Qualquer regra especial será anunciada pela staff antes do evento.'
    ].join('\n'))
    .setImage(`attachment://${image}`);
  return { embeds: [embed], files: [file] };
}
module.exports = { buildAirdropPanel };
