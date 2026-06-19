const { SERVER_SELECTIONS } = require('../config/constants');
const { errorEmbed, successEmbed } = require('../utils/embeds');
const { findRole } = require('../utils/permissions');
const { logEvent } = require('../utils/logger');

module.exports = {
  customId: 'server_select',
  async execute(interaction) {
    const [, selectionKey] = interaction.customId.split(':');
    const selection = SERVER_SELECTIONS[selectionKey];

    if (!selection) {
      return interaction.reply({ embeds: [errorEmbed('Seleção de servidor inválida.')], ephemeral: true });
    }

    const targetRole = findRole(interaction.guild, selection.roleName);
    const removeRoles = selection.removeRoles.map((roleName) => findRole(interaction.guild, roleName)).filter(Boolean);

    if (!targetRole) {
      return interaction.reply({
        embeds: [errorEmbed(`O cargo **${selection.roleName}** ainda não existe. Peça para a staff executar /setup.`)],
        ephemeral: true
      });
    }

    await interaction.member.roles.remove(removeRoles, 'Troca de servidor via painel de entrada').catch(() => null);
    await interaction.member.roles.add(targetRole, 'Seleção de servidor via painel de entrada');

    await logEvent(
      interaction.guild,
      'server_role_changed',
      '🔁 Cargo de servidor alterado',
      `${interaction.user} selecionou **${selection.label}**.`,
      [{ name: 'Cargo aplicado', value: targetRole.name, inline: true }]
    );

    return interaction.reply({
      embeds: [successEmbed(`Você entrou na área **${selection.label}**. Os canais foram liberados.`)],
      ephemeral: true
    });
  }
};
