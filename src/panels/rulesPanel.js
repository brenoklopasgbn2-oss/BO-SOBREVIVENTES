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
    .setTitle('📜 Regras oficiais • CHAMPIONS Z')
    .setDescription([
      '**As regras do novo servidor estão sendo organizadas para esta temporada.**',
      '',
      '✅ Jogue limpo e respeite a comunidade.',
      '🚫 Cheat, exploit, dupe, abuso de bug e qualquer vantagem externa são proibidos.',
      '🎥 Denúncias devem ser acompanhadas de provas sempre que possível.',
      '🏆 Regras competitivas, raid, clãs, bunkers e eventos serão publicadas aqui conforme forem fechadas.',
      '',
      '⚠️ **Nenhuma regra antiga da RAID-Z/ZONA-Z deve ser considerada válida no Champions Z.**',
      '',
      'Em caso de dúvida, abra um ticket e confirme com a staff.'
    ].join('\n'))
    .setImage(`attachment://${PANEL_IMAGES.rules}`);

  return [{ embeds: [embed], files: [rulesImageAttachment()] }];
}

function buildRulesMessages() { return buildRulesPanel(); }
function buildRulesHeaderPayload() { return buildRulesPanel()[0]; }

module.exports = { buildRulesHeaderPayload, buildRulesMessages, buildRulesPanel, rulesImageAttachment };
