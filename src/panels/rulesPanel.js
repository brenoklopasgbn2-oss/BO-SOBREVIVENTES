const path = require('path');
const { AttachmentBuilder } = require('discord.js');
const { baseEmbed } = require('../utils/embeds');
const { getCategories, getCategorySummary, getRuleSet } = require('../data/rulesRepository');

const RULES_PER_CARD = 6;
const DESCRIPTION_LIMIT = 3800;

function rulesImageAttachment(ruleSetKey = 'geral') {
  const set = getRuleSet(ruleSetKey);
  return new AttachmentBuilder(path.join(process.cwd(), 'assets', 'painels', set.image));
}

function cleanDescription(description = '') {
  return String(description)
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\s+$/g, '')
    .trim();
}

function compactText(text = '') {
  return cleanDescription(text)
    .replace(/\n•\s*/g, '; • ')
    .replace(/\n-\s*/g, '; - ')
    .replace(/\n/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function formatRuleBlock(rule) {
  const desc = compactText(rule.description);
  return `**${rule.number}. ${rule.title}** — ${desc}`;
}

function splitCategoryRules(rules) {
  const chunks = [];
  let current = [];
  let currentLength = 0;

  for (const rule of rules) {
    const block = formatRuleBlock(rule);
    const extra = block.length + (current.length > 0 ? 2 : 0);
    const reachedCount = current.length >= RULES_PER_CARD;
    const reachedLimit = current.length > 0 && currentLength + extra > DESCRIPTION_LIMIT;

    if (reachedCount || reachedLimit) {
      chunks.push(current);
      current = [];
      currentLength = 0;
    }

    current.push(rule);
    currentLength += extra;
  }

  if (current.length > 0) chunks.push(current);
  return chunks;
}

function buildRulesHeaderPayload(ruleSetKey = 'geral') {
  const set = getRuleSet(ruleSetKey);
  const hasRules = set.rules.length > 0;

  const description = hasRules
    ? [
        `🎮 **Servidor:** ${set.server}`,
        `📊 **Total:** ${set.rules.length} regras`,
        '',
        '🔎 **Consultar regra específica:** use **/regra numero servidor**',
        `Exemplo: **/regra numero: 1 servidor: ${set.server}**`,
        '',
        '🧭 **Partes:**',
        getCategorySummary(set.key)
      ].join('\n')
    : [
        `⚠️ **${set.emptyMessage}**`,
        '',
        'Quando as regras forem cadastradas, este canal será preenchido automaticamente pelo **/setup**.'
      ].join('\n');

  const embed = baseEmbed()
    .setColor(set.color)
    .setTitle(`${set.emoji} ${set.label}`)
    .setDescription(description)
    .setImage(`attachment://${set.image}`);

  return {
    embeds: [embed],
    files: [rulesImageAttachment(set.key)]
  };
}

function buildRulesMessages(ruleSetKey = 'geral') {
  const set = getRuleSet(ruleSetKey);
  const payloads = [buildRulesHeaderPayload(set.key)];

  if (set.rules.length === 0) return payloads;

  const categories = getCategories(set.key);

  for (const category of categories) {
    const chunks = splitCategoryRules(category.rules);

    for (const chunk of chunks) {
      const first = chunk[0].number;
      const last = chunk[chunk.length - 1].number;
      const body = chunk.map(formatRuleBlock).join('\n\n');

      const title = chunks.length > 1
        ? `${category.emoji} ${category.name} • ${first}-${last}`
        : `${category.emoji} ${category.name}`;

      payloads.push({
        embeds: [
          baseEmbed()
            .setColor(set.color)
            .setTitle(title)
            .setDescription(body)
        ]
      });
    }
  }

  return payloads;
}

function buildRulesPanel(ruleSetKey = 'geral') {
  return buildRulesMessages(ruleSetKey);
}

module.exports = {
  buildRulesHeaderPayload,
  buildRulesMessages,
  buildRulesPanel,
  rulesImageAttachment
};
