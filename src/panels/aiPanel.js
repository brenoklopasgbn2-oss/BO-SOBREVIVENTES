const path = require('path');
const { AttachmentBuilder } = require('discord.js');
const { ROLE_NAMES, PANEL_IMAGES } = require('../config/constants');
const { baseEmbed } = require('../utils/embeds');

function aiImageAttachment() {
  return new AttachmentBuilder(path.join(process.cwd(), 'assets', 'painels', PANEL_IMAGES.ai));
}

function buildAiPanel(guild) {
  const role = guild?.roles?.cache?.find((item) => item.name === ROLE_NAMES.ai);
  const mention = role ? `${role}` : '@ZONA-Z IA';
  const embed = baseEmbed()
    .setColor(0xe3263e)
    .setTitle('🤖 ZONA-Z IA — Ajuda rápida')
    .setDescription([
      'Pergunte aqui sobre **regras, Alteria, grupo, base, KOTH, Airdrop, tickets, loja e suporte**.',
      '',
      '**Exemplos:**',
      '• qual é o limite do grupo?',
      '• como funciona o KOTH?',
      '• como funciona o Airdrop?',
      '• onde reporto um bug?',
      '• como abro uma denúncia?',
      '',
      `Você também pode me marcar usando ${mention}.`,
      '',
      '⚠️ Em casos de punição, perda de item ou situação que precise de prova, a decisão final é da staff.'
    ].join('\n'))
    .setImage(`attachment://${PANEL_IMAGES.ai}`);

  return { embeds: [embed], files: [aiImageAttachment()], legacyTitles: ['🤖 ZONA-Z IA — Ajuda rápida da comunidade'] };
}

module.exports = { buildAiPanel };
