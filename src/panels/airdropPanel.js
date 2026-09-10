const path = require('path');
const { AttachmentBuilder } = require('discord.js');
const { PANEL_IMAGES } = require('../config/constants');
const { baseEmbed } = require('../utils/embeds');

function buildAirdropPanel() {
  const image = PANEL_IMAGES.airdrop;
  const file = new AttachmentBuilder(path.join(process.cwd(), 'assets', 'painels', image));
  const embed = baseEmbed()
    .setColor(0xd4af37)
    .setTitle('🪂 Airdrop • CHAMPIONS Z')
    .setDescription([
      'Os Airdrops criam pontos de disputa e risco em Chernarus.',
      '',
      '📦 Loot disputado',
      '⚔️ Alto risco de PvP',
      '🎯 Local e configuração definidos pelo servidor',
      '',
      'Frequência, conteúdo e regras serão publicados aqui quando fecharmos a configuração final.'
    ].join('\n'))
    .setImage(`attachment://${image}`);
  return { embeds: [embed], files: [file] };
}
module.exports = { buildAirdropPanel };
