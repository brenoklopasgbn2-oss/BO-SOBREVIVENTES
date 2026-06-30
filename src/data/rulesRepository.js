const geral = require('./rulesGeneral');
const vanilla = require('./rulesVanilla');
const bandeira = require('./rulesFlagRaid');

const DEFAULT_RULE_IMAGE = vanilla.RULE_IMAGE || '16-regras-sobrevivente.png';

const RULE_SETS = {
  geral: {
    key: 'geral',
    label: 'Regras Gerais',
    server: 'Geral',
    emoji: '📜',
    color: 0xf1c40f,
    image: geral.RULE_IMAGE || DEFAULT_RULE_IMAGE,
    rules: geral.RULES,
    emptyMessage: 'As regras gerais ainda serão cadastradas.'
  },
  vanilla: {
    key: 'vanilla',
    label: 'Regras RAID-Z Vanilla',
    server: 'RAID-Z Vanilla',
    emoji: '🔴',
    color: 0xc0392b,
    image: vanilla.RULE_IMAGE || DEFAULT_RULE_IMAGE,
    rules: vanilla.RULES,
    emptyMessage: 'As regras do RAID-Z Vanilla ainda não foram cadastradas.'
  },
  bandeira: {
    key: 'bandeira',
    label: 'Regra de Bandeira no Raid',
    server: 'RAID-Z Vanilla',
    emoji: '🏳️',
    color: 0xff3131,
    image: bandeira.RULE_IMAGE || DEFAULT_RULE_IMAGE,
    rules: bandeira.RULES,
    emptyMessage: 'As regras de bandeira ainda não foram cadastradas.'
  }
};

function normalizeRuleSetKey(key = 'geral') {
  const value = String(key || '').toLowerCase();
  if (['geral', 'gerais', 'global', 'discord'].includes(value)) return 'geral';
  if (['vanilla', 'vanila', 'raidz', 'raid-z', 'raid z'].includes(value)) return 'vanilla';
  if (['bandeira', 'bandeira-raid', 'flag', 'whiteflag', 'bandeira branca', 'bandeira-branca'].includes(value)) return 'bandeira';
  return 'geral';
}

function inferRuleSetFromChannel(channelName = '') {
  const name = channelName.toLowerCase();
  if (name.includes('bandeira')) return 'bandeira';
  if (name.includes('vanilla')) return 'vanilla';
  return 'geral';
}

function getRuleSet(key = 'geral') {
  return RULE_SETS[normalizeRuleSetKey(key)] || RULE_SETS.geral;
}

function getRuleByNumber(key, number) {
  const set = getRuleSet(key);
  const normalized = Number(number);
  return set.rules.find((rule) => rule.number === normalized) || null;
}

function getCategories(key = 'geral') {
  const set = getRuleSet(key);
  const categories = [];

  for (const rule of set.rules) {
    const current = categories.find((item) => item.name === rule.category);
    if (current) current.rules.push(rule);
    else categories.push({ name: rule.category, emoji: rule.emoji, rules: [rule] });
  }

  return categories;
}

function getCategorySummary(key = 'geral') {
  const categories = getCategories(key);
  if (categories.length === 0) return 'Nenhuma regra cadastrada ainda.';

  return categories.map((category) => {
    const first = category.rules[0].number;
    const last = category.rules[category.rules.length - 1].number;
    const range = first === last ? `regra **${first}**` : `regras **${first} a ${last}**`;
    return `${category.emoji} **${category.name}** — ${range}`;
  }).join('\n');
}

module.exports = {
  RULE_SETS,
  normalizeRuleSetKey,
  inferRuleSetFromChannel,
  getRuleSet,
  getRuleByNumber,
  getCategories,
  getCategorySummary
};
