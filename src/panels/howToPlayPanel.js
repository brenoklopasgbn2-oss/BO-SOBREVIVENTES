const path = require('path');
const { AttachmentBuilder } = require('discord.js');
const { PANEL_IMAGES } = require('../config/constants');
const { baseEmbed } = require('../utils/embeds');

function buildHowToPlayPanel() {
  const image = PANEL_IMAGES.howToPlay;
  const file = new AttachmentBuilder(path.join(process.cwd(), 'assets', 'painels', image));
  const embed = baseEmbed()
    .setColor(0xd4af37)
    .setTitle('🧭 COMO JOGAR — CHAMPIONS Z')
    .setDescription([
      'O **CHAMPIONS Z** é um servidor DayZ competitivo em **Chernarus**, mantendo a essência vanilla e adicionando conteúdo próprio sem exagero.',
      '',
      '👁️ Jogue em **1PP**.',
      '🪖 Explore as **10 novas áreas militares** em busca de loot valioso.',
      '🔐 Descubra a sequência de acesso dos **2 bunkers exclusivos**.',
      '☣️ Cuidado com o **Infectado NBC Amarelo**: ao morrer, a POX pode liberar gás letal.',
      '⚔️ Esteja preparado para PvP nos pontos de alto interesse.',
      '🚫 Não existe Pay-to-Win.',
      '',
      'Confira a categoria **GUIAS CHAMPIONS Z** para ver cada etapa com imagens.'
    ].join('\n'))
    .setImage(`attachment://${image}`);
  return { embeds: [embed], files: [file] };
}
module.exports = { buildHowToPlayPanel };
