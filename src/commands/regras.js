const { SlashCommandBuilder } = require('discord.js');
const { buildRulesMessages } = require('../panels/rulesPanel');
const { inferRuleSetFromChannel } = require('../data/rulesRepository');

function addServerOption(option) {
  return option
    .setName('lista')
    .setDescription('Qual lista de regras deseja ver?')
    .setRequired(false)
    .addChoices(
      { name: 'Gerais / Discord', value: 'geral' },
      { name: 'RAID-Z Vanilla', value: 'vanilla' },
      { name: 'Bandeira no Raid', value: 'bandeira' }
    );
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('regras')
    .setDescription('Mostra as regras completas.')
    .addStringOption(addServerOption),

  async execute(interaction) {
    const selected = interaction.options.getString('lista') || inferRuleSetFromChannel(interaction.channel?.name || '');
    const payloads = buildRulesMessages(selected);
    await interaction.reply(payloads[0]);
    for (const payload of payloads.slice(1)) await interaction.followUp(payload);
  }
};
