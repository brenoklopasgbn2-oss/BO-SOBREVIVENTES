const path = require('path');
const { AttachmentBuilder } = require('discord.js');
const { baseEmbed } = require('../utils/embeds');
const { getCategories, getCategorySummary, getRuleSet } = require('../data/rulesRepository');

function rulesImageAttachment(ruleSetKey = 'geral') {
  const set = getRuleSet(ruleSetKey);
  return new AttachmentBuilder(path.join(process.cwd(), 'assets', 'painels', set.image));
}

function buildRulesIndexEmbeds(ruleSetKey = 'geral') {
  const set = getRuleSet(ruleSetKey);
  const categories = getCategories(set.key);

  const header = baseEmbed()
    .setColor(set.color)
    .setTitle(`${set.emoji} ${set.label} — Sobreviventes Z`)
    .setDescription([
      'As regras ficam separadas por servidor e numeradas para consulta rápida.',
      '',
      'Use **/regra numero servidor** para puxar uma regra específica.',
      'Exemplo: **/regra numero: 34 servidor: Vanilla**',
      '',
      '**Categorias:**',
      getCategorySummary(set.key),
      '',
      set.rules.length > 0
        ? `Total de regras cadastradas: **${set.rules.length}**`
        : `⚠️ **${set.emptyMessage}**`
    ].join('\n'))
    .setImage(`attachment://${set.image}`);

  const embeds = [header];

  for (const category of categories) {
    const lines = category.rules.map((rule) => `**${rule.number}.** ${rule.title}`);
    embeds.push(
      baseEmbed()
        .setColor(0x2b2d31)
        .setTitle(`${category.emoji} ${category.name}`)
        .setDescription(lines.join('\n'))
    );
  }

  return embeds;
}

function buildRulesPanel(ruleSetKey = 'geral') {
  return {
    embeds: buildRulesIndexEmbeds(ruleSetKey),
    files: [rulesImageAttachment(ruleSetKey)]
  };
}

module.exports = {
  buildRulesIndexEmbeds,
  buildRulesPanel,
  rulesImageAttachment
};
