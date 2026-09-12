const zonaz = require('./rulesGeneral');

const RULE_SETS = {
  zonaz: {
    key: 'zonaz',
    label: 'Regras ZONA-Z',
    server: 'ZONA-Z • Alteria',
    emoji: '🔴',
    color: 0xe3263e,
    image: zonaz.RULE_IMAGE,
    rules: zonaz.RULES,
    emptyMessage: 'As regras da ZONA-Z ainda serão cadastradas.'
  }
};

function normalizeRuleSetKey() { return 'zonaz'; }
function inferRuleSetFromChannel() { return 'zonaz'; }
function getRuleSet() { return RULE_SETS.zonaz; }
function getRuleByNumber(_key, number) {
  const normalized = Number(number);
  return RULE_SETS.zonaz.rules.find((rule) => rule.number === normalized) || null;
}
function getCategories() {
  const categories = [];
  for (const rule of RULE_SETS.zonaz.rules) {
    const current = categories.find((item) => item.name === rule.category);
    if (current) current.rules.push(rule);
    else categories.push({ name: rule.category, emoji: rule.emoji, rules: [rule] });
  }
  return categories;
}
function getCategorySummary() {
  return getCategories().map((category) => `${category.emoji} **${category.name}**`).join('  •  ');
}

module.exports = { RULE_SETS, normalizeRuleSetKey, inferRuleSetFromChannel, getRuleSet, getRuleByNumber, getCategories, getCategorySummary };
