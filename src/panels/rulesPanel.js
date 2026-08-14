const path = require('path');
const { AttachmentBuilder } = require('discord.js');
const { baseEmbed } = require('../utils/embeds');
const { getCategories, getRuleSet } = require('../data/rulesRepository');

function rulesImageAttachment() {
  const set = getRuleSet();
  return new AttachmentBuilder(path.join(process.cwd(), 'assets', 'painels', set.image));
}

function compactText(text = '') {
  return String(text).replace(/\s+/g, ' ').trim();
}

function buildRulesPanel() {
  const set = getRuleSet();
  const header = baseEmbed()
    .setColor(set.color)
    .setTitle('📜 Regras oficiais • ZONA-Z')
    .setDescription([
      '**Regras diretas, sem texto gigante.** Leia antes de jogar.',
      '',
      'A ideia é simples: jogue limpo, respeite a comunidade e não use falhas para ganhar vantagem.',
      '',
      `📊 **${set.rules.length} regras principais** • ${getCategories().map((c) => c.name).join(' • ')}`,
      '',
      '⚠️ Eventos e raids podem receber regras específicas nos avisos oficiais.'
    ].join('\n'))
    .setImage(`attachment://${set.image}`);

  const body = set.rules.map((rule) => `**${rule.number}. ${rule.title}**\n${compactText(rule.description)}`).join('\n\n');
  const rulesEmbed = baseEmbed()
    .setColor(set.color)
    .setTitle('🔴 Resumo completo')
    .setDescription(body);

  return [
    { embeds: [header], files: [rulesImageAttachment()], legacyTitles: ['📜 Regras Gerais', '🔴 Regras ZONA-Z Vanilla', '🏳️ Regra de Bandeira no Raid'] },
    { embeds: [rulesEmbed] }
  ];
}

function buildRulesMessages() { return buildRulesPanel(); }
function buildRulesHeaderPayload() { return buildRulesPanel()[0]; }

module.exports = { buildRulesHeaderPayload, buildRulesMessages, buildRulesPanel, rulesImageAttachment };
