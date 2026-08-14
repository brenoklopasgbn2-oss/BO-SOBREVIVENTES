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

function splitRuleBlocks(rules, maxLength = 3800) {
  const chunks = [];
  let current = '';
  for (const rule of rules) {
    const block = `**${rule.number}. ${rule.title}**\n${compactText(rule.description)}`;
    if (current && `${current}\n\n${block}`.length > maxLength) {
      chunks.push(current);
      current = block;
    } else {
      current = current ? `${current}\n\n${block}` : block;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

function buildRulesPanel() {
  const set = getRuleSet();
  const header = baseEmbed()
    .setColor(set.color)
    .setTitle('📜 Regras oficiais • ZONA-Z')
    .setDescription([
      '**Baseadas nas regras do RAID-Z antigo, adaptadas para a ZONA-Z.**',
      '',
      '🔥 Raid: **sábado 18h–23h**, máximo **10 jogadores por clã**, somente por **portões**.',
      '🔐 Base principal: máximo **10 portões com CodeLock**.',
      '🛏️ Sleeping Bag: até **5 por jogador**, cooldown global de **1 hora** e regras de posicionamento.',
      '',
      `📊 **${set.rules.length} regras principais** • ${getCategories().map((c) => c.name).join(' • ')}`,
      '',
      '⚠️ Um aviso oficial da staff pode alterar temporariamente horário/regra de evento ou raid.'
    ].join('\n'))
    .setImage(`attachment://${set.image}`);

  const chunks = splitRuleBlocks(set.rules);
  const messages = [
    { embeds: [header], files: [rulesImageAttachment()], legacyTitles: ['📜 Regras Gerais', '🔴 Regras ZONA-Z Vanilla', '🏳️ Regra de Bandeira no Raid'] }
  ];

  chunks.forEach((body, index) => {
    const embed = baseEmbed()
      .setColor(set.color)
      .setTitle(index === 0 ? '🔴 Regras completas' : `🔴 Regras completas • parte ${index + 1}`)
      .setDescription(body);
    messages.push({ embeds: [embed] });
  });

  return messages;
}

function buildRulesMessages() { return buildRulesPanel(); }
function buildRulesHeaderPayload() { return buildRulesPanel()[0]; }

module.exports = { buildRulesHeaderPayload, buildRulesMessages, buildRulesPanel, rulesImageAttachment };
