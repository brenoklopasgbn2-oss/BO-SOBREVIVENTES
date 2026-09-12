const { SlashCommandBuilder } = require('discord.js');
const { buildRulesMessages } = require('../panels/rulesPanel');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('regras')
    .setDescription('Mostra as regras oficiais completas da ZONA-Z.'),

  async execute(interaction) {
    const payloads = buildRulesMessages();
    await interaction.reply(payloads[0]);
    for (const payload of payloads.slice(1)) await interaction.followUp(payload);
  }
};
