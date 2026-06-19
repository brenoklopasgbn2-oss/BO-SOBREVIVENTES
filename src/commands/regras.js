const { SlashCommandBuilder } = require('discord.js');
const { buildRulesPanel } = require('../panels/rulesPanel');
const { inferRuleSetFromChannel } = require('../data/rulesRepository');

function addServerOption(option) {
  return option
    .setName('servidor')
    .setDescription('Qual lista de regras deseja ver?')
    .setRequired(false)
    .addChoices(
      { name: 'Gerais', value: 'geral' },
      { name: 'Vanilla', value: 'vanilla' },
      { name: 'BBP', value: 'bbp' },
      { name: 'Deathmatch', value: 'deathmatch' }
    );
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('regras')
    .setDescription('Mostra o índice numerado das regras.')
    .addStringOption(addServerOption),

  async execute(interaction) {
    const selected = interaction.options.getString('servidor') || inferRuleSetFromChannel(interaction.channel?.name || '');
    await interaction.reply(buildRulesPanel(selected));
  }
};
