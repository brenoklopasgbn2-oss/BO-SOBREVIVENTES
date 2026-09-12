const { SlashCommandBuilder } = require('discord.js');
const { baseEmbed } = require('../utils/embeds');
const { getRuleByNumber, getRuleSet } = require('../data/rulesRepository');
const { rulesImageAttachment } = require('../panels/rulesPanel');

function cleanDescription(description = '') {
  return String(description).replace(/\n{3,}/g, '\n\n').trim();
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('regra')
    .setDescription('Mostra uma regra oficial da ZONA-Z pelo número.')
    .addIntegerOption((option) => option.setName('numero').setDescription('Número da regra.').setRequired(true).setMinValue(1).setMaxValue(300)),

  async execute(interaction) {
    const number = interaction.options.getInteger('numero', true);
    const set = getRuleSet();
    const rule = getRuleByNumber(set.key, number);

    if (!rule) {
      const detail = set.rules.length > 0 ? `Use um número entre **1** e **${set.rules.length}**.` : set.emptyMessage;
      return interaction.reply({ content: `❌ Não encontrei essa regra em **${set.label}**. ${detail}`, ephemeral: true });
    }

    const embed = baseEmbed()
      .setColor(set.color)
      .setTitle(`${rule.emoji} Regra ${String(rule.number).padStart(2, '0')} — ${rule.title}`)
      .setDescription(['```', `${set.label.toUpperCase()} • ZONA-Z`, '```', cleanDescription(rule.description)].join('\n'))
      .setImage(`attachment://${set.image}`)
      .addFields({ name: '🎮 Servidor', value: rule.server || set.server, inline: true }, { name: '📌 Parte', value: rule.category, inline: true });

    await interaction.reply({ embeds: [embed], files: [rulesImageAttachment()] });
  }
};
