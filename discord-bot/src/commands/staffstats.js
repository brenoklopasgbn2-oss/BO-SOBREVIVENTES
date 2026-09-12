const { PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');
const { STAFF_ROLES, CHANNELS } = require('../config/constants');
const { buildStaffStatsEmbeds, sendStaffStatsReport } = require('../stats/staffStats');

function canUseStaffStats(member) {
  if (!member) return false;
  if (member.permissions?.has(PermissionFlagsBits.Administrator)) return true;
  return member.roles?.cache?.some((role) => STAFF_ROLES.includes(role.name));
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('staffstats')
    .setDescription('Mostra ranking e estatísticas da staff.')
    .addStringOption((option) =>
      option
        .setName('periodo')
        .setDescription('Período das estatísticas.')
        .setRequired(true)
        .addChoices(
          { name: 'Diário', value: 'diario' },
          { name: 'Semanal', value: 'semanal' },
          { name: 'Mensal', value: 'mensal' },
          { name: 'Anual', value: 'anual' }
        )
    )
    .addUserOption((option) =>
      option
        .setName('staff')
        .setDescription('Ver estatística de uma staff específica.')
        .setRequired(false)
    )
    .addBooleanOption((option) =>
      option
        .setName('publicar')
        .setDescription(`Publicar no canal ${CHANNELS.staffRanking}?`)
        .setRequired(false)
    ),

  async execute(interaction) {
    if (!canUseStaffStats(interaction.member)) {
      return interaction.reply({
        content: '❌ Apenas a staff pode ver estatísticas da equipe.',
        ephemeral: true
      });
    }

    const periodo = interaction.options.getString('periodo', true);
    const staffUser = interaction.options.getUser('staff');
    const publicar = interaction.options.getBoolean('publicar') || false;

    await interaction.deferReply({ ephemeral: !publicar });

    if (publicar && !staffUser) {
      await sendStaffStatsReport(interaction.guild, periodo);
      return interaction.editReply(`✅ Ranking da staff publicado em ${CHANNELS.staffRanking}.`);
    }

    const embeds = buildStaffStatsEmbeds(interaction.guild, periodo, {
      userId: staffUser?.id || null
    });

    return interaction.editReply({ embeds });
  }
};
