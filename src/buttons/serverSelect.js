const { ROLE_NAMES } = require('../config/constants');
const { errorEmbed, successEmbed } = require('../utils/embeds');
const { findRole } = require('../utils/permissions');
const { logEvent } = require('../utils/logger');

module.exports = {
  customId: 'server_select',
  async execute(interaction) {
    const targetRole = findRole(interaction.guild, ROLE_NAMES.survivor);
    if (!targetRole) {
      return interaction.reply({ embeds: [errorEmbed('O cargo **Champion** ainda não existe. Peça para a staff executar /setup.')], ephemeral: true });
    }

    await interaction.member.roles.add(targetRole, 'Entrada CHAMPIONS Z via painel');
    await logEvent(interaction.guild, 'server_role_changed', '🏆 Acesso CHAMPIONS Z liberado', `${interaction.user} recebeu o cargo **Champion**.`, [
      { name: 'Cargo aplicado', value: targetRole.name, inline: true }
    ]);

    return interaction.reply({ embeds: [successEmbed('Acesso ao **CHAMPIONS Z** liberado. Cargo **Champion** aplicado.')], ephemeral: true });
  }
};
