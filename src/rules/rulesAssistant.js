const { CHANNELS } = require('../config/constants');
const { RULE_SETS, getRuleSet } = require('../data/rulesRepository');
const { baseEmbed } = require('../utils/embeds');

const STOP_WORDS = new Set([
  'a', 'o', 'os', 'as', 'um', 'uma', 'uns', 'umas',
  'de', 'da', 'do', 'das', 'dos', 'em', 'no', 'na', 'nos', 'nas',
  'por', 'pra', 'para', 'com', 'sem', 'sobre', 'isso', 'essa', 'esse',
  'eu', 'ele', 'ela', 'eles', 'elas', 'meu', 'minha', 'nosso', 'nossa',
  'pode', 'posso', 'podemos', 'tem', 'ter', 'regra', 'regras',
  'é', 'e', 'ou', 'que', 'qual', 'quando', 'onde', 'como', 'quanto',
  'jogar', 'servidor', 'server', 'serve', 'player', 'jogador'
]);

const KEYWORD_BOOSTS = [
  { words: ['raid', 'raide', 'raidadas', 'raidear'], add: ['raid', 'gravação', 'provas', 'portão', 'base'] },
  { words: ['base', 'bases'], add: ['base', 'construção', 'portões', 'loot'] },
  { words: ['clan', 'clã', 'cla', 'grupo', 'squad', 'quinteto', 'duo', 'trio', 'solo'], add: ['clã', 'jogadores', 'limite', 'tag'] },
  { words: ['carro', 'veiculo', 'veículo', 'veiculos', 'veículos'], add: ['veículos', 'carro', 'devolução', 'seguro'] },
  { words: ['bug', 'glitch', 'exploit', 'render'], add: ['bug', 'glitch', 'exploit', 'renderização'] },
  { words: ['ban', 'banido', 'punição', 'punicao'], add: ['punição', 'banimento', 'staff'] },
  { words: ['dm', 'deathmatch', 'death', 'math'], add: ['deathmatch', 'pvp', 'spawn'] },
  { words: ['bbp'], add: ['bbp', 'limite', '10'] },
  { words: ['vanilla', 'vanila'], add: ['vanilla', 'solo', 'duo', 'trio', 'squad', 'quinteto'] }
];

function normalizeText(text = '') {
  return String(text)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(text = '') {
  const normalized = normalizeText(text);
  const tokens = normalized
    .split(' ')
    .map((item) => item.trim())
    .filter((item) => item.length >= 2 && !STOP_WORDS.has(item));

  const expanded = new Set(tokens);

  for (const boost of KEYWORD_BOOSTS) {
    if (tokens.some((token) => boost.words.map(normalizeText).includes(token))) {
      boost.add.forEach((word) => expanded.add(normalizeText(word)));
    }
  }

  return [...expanded];
}

function wantedRuleSets(question = '') {
  const text = normalizeText(question);

  if (text.includes('vanilla') || text.includes('vanila')) return ['vanilla'];
  if (text.includes('bbp')) return ['bbp'];
  if (text.includes('deathmatch') || text.includes('death math') || text.includes(' dm ') || text === 'dm' || text.includes(' pvp ')) return ['deathmatch'];
  if (text.includes('discord') || text.includes('geral') || text.includes('comunidade')) return ['geral'];

  return ['geral', 'vanilla', 'bbp', 'deathmatch'];
}

function scoreRule(rule, tokens) {
  const haystack = normalizeText([
    rule.server,
    rule.category,
    rule.title,
    rule.description
  ].join(' '));

  let score = 0;

  for (const token of tokens) {
    if (haystack.includes(token)) score += 2;
    if (normalizeText(rule.title).includes(token)) score += 4;
    if (normalizeText(rule.category).includes(token)) score += 3;
    if (normalizeText(rule.server).includes(token)) score += 2;
  }

  return score;
}

function searchRules(question = '') {
  const tokens = tokenize(question);
  if (tokens.length === 0) return [];

  const setKeys = wantedRuleSets(question);
  const results = [];

  for (const key of setKeys) {
    const set = getRuleSet(key);
    for (const rule of set.rules || []) {
      const score = scoreRule(rule, tokens);
      if (score <= 0) continue;
      results.push({ set, rule, score });
    }
  }

  return results
    .sort((a, b) => b.score - a.score || a.rule.number - b.rule.number)
    .slice(0, 3);
}

function shortDescription(text = '') {
  const value = String(text).replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim();
  if (value.length <= 520) return value;
  return `${value.slice(0, 517)}...`;
}

function buildRulesAnswerEmbed(message, results) {
  if (!results.length) {
    return baseEmbed()
      .setColor(0xe67e22)
      .setTitle('❓ Não achei uma regra exata')
      .setDescription([
        `${message.author}, não encontrei uma regra bem clara para essa pergunta.`,
        '',
        'Tente perguntar com palavras mais diretas, tipo:',
        '• "qual limite de grupo no vanilla?"',
        '• "pode camperar spawn no dm?"',
        '• "qual horário de raid?"',
        '',
        'Se for caso sério, abra ticket para a staff confirmar.'
      ].join('\n'));
  }

  const fields = results.map(({ set, rule }) => ({
    name: `${set.emoji} ${set.server} • Regra ${rule.number} — ${rule.title}`,
    value: [
      `**Parte:** ${rule.category}`,
      shortDescription(rule.description),
      `Use: **/regra numero:${rule.number} servidor:${set.server}**`
    ].join('\n'),
    inline: false
  }));

  return baseEmbed()
    .setColor(0x3498db)
    .setTitle('📚 Resposta baseada nas regras')
    .setDescription([
      `${message.author}, achei isso nas regras da comunidade:`,
      '',
      '⚠️ O bot ajuda a localizar regras, mas em caso de dúvida a decisão final é da staff.'
    ].join('\n'))
    .addFields(fields);
}

async function handleRulesQuestion(message) {
  if (!message.guild || message.author.bot) return false;
  if (message.channel?.name !== CHANNELS.rulesAsk) return false;

  const content = message.content?.trim();
  if (!content) return false;

  const results = searchRules(content);
  const embed = buildRulesAnswerEmbed(message, results);

  await message.reply({ embeds: [embed], allowedMentions: { repliedUser: true } }).catch(() => null);
  return true;
}

module.exports = {
  handleRulesQuestion,
  searchRules
};
