const path = require('path');
const { AttachmentBuilder } = require('discord.js');
const { baseEmbed } = require('../utils/embeds');
const { getCategories, getCategorySummary, getRuleSet } = require('../data/rulesRepository');

const RULES_PER_CARD = 4;
const DESCRIPTION_LIMIT = 3900;

function rulesImageAttachment(ruleSetKey = 'geral') {
  const set = getRuleSet(ruleSetKey);
  return new AttachmentBuilder(path.join(process.cwd(), 'assets', 'painels', set.image));
}

function cleanDescription(description = '') {
  return String(description)
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function formatRuleBlock(rule) {
  const desc = cleanDescription(rule.description);
  return [
    `### ${rule.emoji || '📌'} Regra ${String(rule.number).padStart(2, '0')} — ${rule.title}`,
    `${desc}`
  ].join('\n');
}

function splitCategoryRules(rules) {
  const chunks = [];
  let current = [];
  let currentLength = 0;

  for (const rule of rules) {
    const block = formatRuleBlock(rule);
    const extra = block.length + (current.length > 0 ? 34 : 0);
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
        '```',
        'SOBREVIVENTES Z • REGRAS OFICIAIS',
        '```',
        `🎮 **Servidor:** ${set.server}`,
        '📌 **Leia com atenção antes de jogar.**',
        '',
        'As regras abaixo estão separadas por parte e numeradas para ficar fácil de consultar.',
        '',
        '🔎 **Consultar uma regra específica:**',
        `Use **/regra numero servidor**`,
        `Exemplo: **/regra numero: 1 servidor: ${set.server}**`,
        '',
        '🧭 **Partes:**',
        getCategorySummary(set.key),
        '',
        `📊 **Total:** ${set.rules.length} regras`
      ].join('\n')
    : [
        '```',
        'SOBREVIVENTES Z • REGRAS OFICIAIS',
        '```',
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

    for (const [index, chunk] of chunks.entries()) {
      const first = chunk[0].number;
      const last = chunk[chunk.length - 1].number;
      const body = chunk.map(formatRuleBlock).join('\n\n━━━━━━━━━━━━━━━━━━━━\n\n');

      const title = chunks.length > 1
        ? `${category.emoji} ${category.name} • ${String(first).padStart(2, '0')} até ${String(last).padStart(2, '0')}`
        : `${category.emoji} ${category.name}`;

      payloads.push({
        embeds: [
          baseEmbed()
            .setColor(set.color)
            .setTitle(title)
            .setDescription(body)
            .setFooter({ text: `Sobreviventes Z • ${set.server} • use /regra numero servidor para consultar rápido` })
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
