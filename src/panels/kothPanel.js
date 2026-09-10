const path = require('path');
const { AttachmentBuilder } = require('discord.js');
const { PANEL_IMAGES } = require('../config/constants');
const { baseEmbed } = require('../utils/embeds');

function imageAttachment() {
  return new AttachmentBuilder(path.join(process.cwd(), 'assets', 'painels', PANEL_IMAGES.koth));
}

function buildKothPanel() {
  const embed = baseEmbed()
    .setColor(0xd4af37)
    .setTitle('🚩 KOTH • CHAMPIONS Z')
    .setDescription([
      'O **King of the Hill** será uma das disputas competitivas do servidor.',
      '',
      '⚔️ Entre preparado para PvP.',
      '🏆 Controle a área e lute pela recompensa.',
      '🚫 Exploit, bug ou qualquer vantagem irregular resultará em punição.',
      '',
      'Configuração, horários e recompensas serão publicados aqui.'
    ].join('\n'))
    .setImage(`attachment://${PANEL_IMAGES.koth}`);

  return { embeds: [embed], files: [imageAttachment()] };
}

module.exports = { buildKothPanel };
