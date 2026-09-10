const path = require('path');
const { AttachmentBuilder } = require('discord.js');
const { PANEL_IMAGES } = require('../config/constants');
const { baseEmbed } = require('../utils/embeds');

function rulesImageAttachment() {
  return new AttachmentBuilder(path.join(process.cwd(), 'assets', 'painels', PANEL_IMAGES.rules));
}

function buildRulesPanel() {
  const embed = baseEmbed()
    .setColor(0xd4af37)
    .setTitle('📜 REGRAS OFICIAIS — CHAMPIONS Z')
    .setDescription([
      'O **CHAMPIONS Z** está sendo montado para uma experiência competitiva, justa e organizada.',
      '',
      '👁️ **1PP:** servidor focado em primeira pessoa.',
      '🏷️ **TAG obrigatória:** jogadores e clãs devem manter identificação clara.',
      '🚫 **Sem Pay-to-Win:** não serão vendidas vantagens competitivas.',
      '🛡️ **Anti-cheat:** tolerância zero com cheats, exploits e abuso de falhas.',
      '🤝 **Respeito:** mantenha o ambiente competitivo sem racismo, preconceito ou assédio.',
      '',
      '⚠️ **As regras detalhadas ainda serão adicionadas aqui conforme você for definindo cada parte do novo servidor.**'
    ].join('\n'))
    .setImage(`attachment://${PANEL_IMAGES.rules}`);

  return [{ embeds: [embed], files: [rulesImageAttachment()], legacyTitles: ['📜 Regras oficiais • ZONA-Z', '📜 Regras Gerais', '🔴 Regras ZONA-Z Vanilla'] }];
}

function buildRulesMessages() { return buildRulesPanel(); }
function buildRulesHeaderPayload() { return buildRulesPanel()[0]; }

module.exports = { buildRulesHeaderPayload, buildRulesMessages, buildRulesPanel, rulesImageAttachment };
