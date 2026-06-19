const { SlashCommandBuilder } = require('discord.js');
const { baseEmbed } = require('../utils/embeds');
const { getRuleByNumber, getRuleSet, inferRuleSetFromChannel } = require('../data/rulesRepository');
const { rulesImageAttachment } = require('../panels/rulesPanel');

function addServerOption(option) {
  return option
    .setName('servidor')
    .setDescription('De qual servidor é a regra?')
    .setRequired(false)
    .addChoices(
      { name: 'Gerais / Discord', value: 'geral' },
      { name: 'Vanilla', value: 'vanilla' },
      { name: 'BBP', value: 'bbp' },
      { name: 'Deathmatch', value: 'deathmatch' }
    );
}

function cleanDescription(description = '') {
  return String(description)
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('regra')
    .setDescription('Mostra uma regra pelo número.')
    .addIntegerOption((option) =>
      option
        .setName('numero')
        .setDescription('Número da regra.')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(300)
    )
    .addStringOption(addServerOption),

  async execute(interaction) {
    const number = interaction.options.getInteger('numero', true);
    const selected = interaction.options.getString('servidor') || inferRuleSetFromChannel(interaction.channel?.name || '');
    const set = getRuleSet(selected);
    const rule = getRuleByNumber(set.key, number);

    if (!rule) {
      const detail = set.rules.length > 0
        ? `Use um número entre **1** e **${set.rules.length}**.`
        : set.emptyMessage;

      return interaction.reply({
        content: `❌ Não encontrei essa regra em **${set.label}**. ${detail}`,
        ephemeral: true
      });
    }

    const embed = baseEmbed()
      .setColor(set.color)
      .setTitle(`${rule.emoji} Regra ${String(rule.number).padStart(2, '0')} — ${rule.title}`)
      .setDescription([
        '```',
        `${set.label.toUpperCase()} • SOBREVIVENTES Z`,
        '```',
        cleanDescription(rule.description)
      ].join('\n'))
      .setImage(`attachment://${set.image}`)
      .addFields(
        { name: '🎮 Servidor', value: rule.server || set.server, inline: true },
        { name: '📌 Parte', value: rule.category, inline: true }
      );

    await interaction.reply({ embeds: [embed], files: [rulesImageAttachment(set.key)] });
  }
};
