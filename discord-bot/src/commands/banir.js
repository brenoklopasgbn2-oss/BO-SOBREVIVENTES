const { PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');
const { errorEmbed } = require('../utils/embeds');
const { buildAdminBanModal, isAdminForBan } = require('../services/adminBanService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('banir')
    .setDescription('Registra um banimento no painel do CHAMPIONS Z.')
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

  async execute(interaction) {
    if (!isAdminForBan(interaction.member)) {
      return interaction.reply({
        embeds: [errorEmbed('Apenas **Fundador/Administrador** com permissão de ban pode usar este comando.')],
        ephemeral: true
      });
    }

    await interaction.showModal(buildAdminBanModal());
  }
};
