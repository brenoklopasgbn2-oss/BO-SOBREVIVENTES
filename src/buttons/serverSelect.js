const { ROLE_NAMES } = require('../config/constants');
const { errorEmbed, successEmbed } = require('../utils/embeds');
const { findRole } = require('../utils/permissions');
const { logEvent } = require('../utils/logger');

module.exports = {
  customId: 'server_select',
  async execute(interaction) {
    const targetRole = findRole(interaction.guild, ROLE_NAMES.vanilla);
    if (!targetRole) {
      return interaction.reply({ embeds: [errorEmbed('O cargo **Vanilla** ainda não existe. Peça para a staff executar /setup.')], ephemeral: true });
    }

    await interaction.member.roles.add(targetRole, 'Entrada RAID-Z Vanilla via painel antigo');

    await logEvent(interaction.guild, 'server_role_changed', '🔴 Acesso RAID-Z liberado', `${interaction.user} recebeu acesso ao **RAID-Z Vanilla**.`, [
      { name: 'Cargo aplicado', value: targetRole.name, inline: true }
    ]);

    return interaction.reply({ embeds: [successEmbed('Você recebeu acesso ao **RAID-Z Vanilla**.')], ephemeral: true });
  }
};
