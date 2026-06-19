const geral = require('./rulesGeneral');
const vanilla = require('./rulesVanilla');
const deathmatch = require('./rulesDeathmatch');

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
    label: 'Regras Vanilla',
    server: 'Vanilla',
    emoji: '🔴',
    color: 0xc0392b,
    image: vanilla.RULE_IMAGE || DEFAULT_RULE_IMAGE,
    rules: vanilla.RULES,
    emptyMessage: 'As regras do Vanilla ainda não foram cadastradas.'
  },
  bbp: {
    key: 'bbp',
    label: 'Regras BBP',
    server: 'BBP',
    emoji: '🔵',
    color: 0x3498db,
    image: DEFAULT_RULE_IMAGE,
    rules: [],
    emptyMessage: 'As regras do BBP ainda serão cadastradas. Quando você mandar, eu separo e coloco nesse painel.'
  },
  deathmatch: {
    key: 'deathmatch',
    label: 'Regras Deathmatch',
    server: 'Deathmatch',
    emoji: '🌈',
    color: 0xff00ff,
    image: deathmatch.RULE_IMAGE || DEFAULT_RULE_IMAGE,
    rules: deathmatch.RULES,
    emptyMessage: 'As regras do Deathmatch ainda não foram cadastradas.'
  }
};

function normalizeRuleSetKey(key = 'geral') {
  const value = String(key || '').toLowerCase();
  if (['geral', 'gerais', 'global', 'discord'].includes(value)) return 'geral';
  if (['vanilla', 'vanila'].includes(value)) return 'vanilla';
  if (['bbp'].includes(value)) return 'bbp';
  if (['dm', 'deathmatch', 'death', 'death-match', 'death math'].includes(value)) return 'deathmatch';
  return 'geral';
}

function inferRuleSetFromChannel(channelName = '') {
  const name = channelName.toLowerCase();
  if (name.includes('vanilla')) return 'vanilla';
  if (name.includes('bbp')) return 'bbp';
  if (name.includes('dm') || name.includes('death')) return 'deathmatch';
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
    if (current) {
      current.rules.push(rule);
    } else {
      categories.push({ name: rule.category, emoji: rule.emoji, rules: [rule] });
    }
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
