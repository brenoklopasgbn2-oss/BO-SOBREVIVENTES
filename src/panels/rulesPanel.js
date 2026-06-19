const path = require('path');
const { AttachmentBuilder } = require('discord.js');
const { baseEmbed } = require('../utils/embeds');
const { getCategories, getCategorySummary, getRuleSet } = require('../data/rulesRepository');

const DESCRIPTION_LIMIT = 3600;

function rulesImageAttachment(ruleSetKey = 'geral') {
  const set = getRuleSet(ruleSetKey);
  return new AttachmentBuilder(path.join(process.cwd(), 'assets', 'painels', set.image));
}

function quoteDescription(description = '') {
  return String(description)
    .split('\n')
    .map((line) => line.trim() ? `> ${line.trim()}` : '>')
    .join('\n');
}

function formatRuleBlock(rule) {
  return [
    `**${rule.emoji || '📌'} ${rule.number}. ${rule.title}**`,
    quoteDescription(rule.description)
  ].join('\n');
}

function chunkRuleBlocks(rules) {
  const chunks = [];
  let current = [];
  let currentLength = 0;

  for (const rule of rules) {
    const block = formatRuleBlock(rule);
    const extraLength = block.length + (current.length > 0 ? 24 : 0);

    if (current.length > 0 && currentLength + extraLength > DESCRIPTION_LIMIT) {
      chunks.push(current);
      current = [];
      currentLength = 0;
    }

    current.push(rule);
    currentLength += extraLength;
  }

  if (current.length > 0) chunks.push(current);
  return chunks;
}

function buildRulesHeaderPayload(ruleSetKey = 'geral') {
  const set = getRuleSet(ruleSetKey);
  const hasRules = set.rules.length > 0;

  const description = hasRules
    ? [
        '```ansi',
        'REGRAS OFICIAIS • SOBREVIVENTES Z',
        '```',
        '📌 **Leia com atenção antes de jogar.**',
        'As regras abaixo estão completas, separadas por parte e numeradas.',
        '',
        '🔎 **Consultar uma regra específica:**',
        `Use **/regra numero servidor**`,
        `Exemplo: **/regra numero: 1 servidor: ${set.server}**`,
        '',
        '🧭 **Partes cadastradas:**',
        getCategorySummary(set.key),
        '',
        `📊 Total cadastrado: **${set.rules.length} regras**`
      ].join('\n')
    : [
        `⚠️ **${set.emptyMessage}**`,
        '',
        'Quando as regras forem cadastradas, este canal será preenchido automaticamente pelo **/setup**.'
      ].join('\n');

  const embed = baseEmbed()
    .setColor(set.color)
    .setTitle(`${set.emoji} ${set.label} — Sobreviventes Z`)
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
    const chunks = chunkRuleBlocks(category.rules);

    for (const [index, chunk] of chunks.entries()) {
      const first = chunk[0].number;
      const last = chunk[chunk.length - 1].number;
      const description = chunk.map(formatRuleBlock).join('\n\n━━━━━━━━━━━━━━━━━━\n\n');

      const titleSuffix = chunks.length > 1
        ? ` — Página ${index + 1}/${chunks.length}`
        : '';

      payloads.push({
        embeds: [
          baseEmbed()
            .setColor(set.color)
            .setTitle(`${category.emoji} ${category.name}${titleSuffix}`)
            .setDescription(description)
            .addFields(
              { name: '🎮 Servidor', value: set.server, inline: true },
              { name: '🔢 Numeração', value: first === last ? `Regra **${first}**` : `Regras **${first} a ${last}**`, inline: true }
            )
        ]
      });
    }
  }

  return payloads;
}

// Compatibilidade com comandos antigos: painel = mensagens completas.
function buildRulesPanel(ruleSetKey = 'geral') {
  return buildRulesMessages(ruleSetKey);
}

module.exports = {
  buildRulesHeaderPayload,
  buildRulesMessages,
  buildRulesPanel,
  rulesImageAttachment
};
