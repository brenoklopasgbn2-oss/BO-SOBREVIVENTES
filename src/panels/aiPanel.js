const path = require('path');
const { AttachmentBuilder } = require('discord.js');
const { ROLE_NAMES, PANEL_IMAGES } = require('../config/constants');
const { baseEmbed } = require('../utils/embeds');

function aiImageAttachment() {
  return new AttachmentBuilder(path.join(process.cwd(), 'assets', 'painels', PANEL_IMAGES.ai));
}

function buildAiPanel(guild) {
  const role = guild?.roles?.cache?.find((item) => item.name === ROLE_NAMES.ai);
  const mention = role ? `${role}` : '@Champions Z';
  const embed = baseEmbed()
    .setColor(0xd4af37)
    .setTitle('🤖 CHAMPIONS Z • Ajuda rápida')
    .setDescription([
      'Use este canal para dúvidas básicas sobre **servidor, eventos, denúncias, tickets e suporte**.',
      '',
      'As regras detalhadas do novo projeto ainda serão cadastradas. O bot não reutilizará regras antigas da RAID-Z/ZONA-Z.',
      '',
      `Você também pode me marcar usando ${mention}.`,
      '',
      '⚠️ Em situações de punição ou análise de provas, a decisão final é da staff.'
    ].join('\n'))
    .setImage(`attachment://${PANEL_IMAGES.ai}`);

  return { embeds: [embed], files: [aiImageAttachment()] };
}

module.exports = { buildAiPanel };
