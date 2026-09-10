const path = require('path');
const { AttachmentBuilder } = require('discord.js');
const { PANEL_IMAGES } = require('../config/constants');
const { baseEmbed } = require('../utils/embeds');

function imageAttachment() {
  return new AttachmentBuilder(path.join(process.cwd(), 'assets', 'painels', PANEL_IMAGES.koth));
}

function buildKothPanel() {
  const embed = baseEmbed()
    .setColor(0xe3263e)
    .setTitle('🚩 KOTH • CHAMPIONS Z')
    .setDescription([
      'O **King of the Hill** é uma área de disputa PvP com recompensa para quem assumir o risco.',
      '',
      '• Entre preparado para combate.',
      '• Controle a área conforme o evento indicar.',
      '• O loot e a dificuldade podem variar conforme a configuração ativa.',
      '• Não use bug, render ou exploit para obter vantagem.',
      '',
      '📣 Mudanças de funcionamento ou regras especiais serão publicadas em **avisos**.'
    ].join('\n'))
    .setImage(`attachment://${PANEL_IMAGES.koth}`);

  return { embeds: [embed], files: [imageAttachment()], legacyTitles: ['🚩 KOTH ZONA-Z — PvP e loot dinâmico', '🚩 KOTH ZONA-Z'] };
}

module.exports = { buildKothPanel };
