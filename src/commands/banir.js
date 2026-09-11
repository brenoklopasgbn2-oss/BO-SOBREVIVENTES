const { PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');
const { errorEmbed } = require('../utils/embeds');
const { buildAdminBanModal, isAdminForBan } = require('../services/adminBanService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('banir')
    .setDescription('Abre o painel administrativo de banimento do CHAMPIONS Z.')
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addUserOption((option) =>
      option
        .setName('discord')
        .setDescription('Marque o Discord do jogador que será banido.')
        .setRequired(true)
    ),

  async execute(interaction) {
    if (!isAdminForBan(interaction.member)) {
      return interaction.reply({
        embeds: [errorEmbed('Apenas **Fundador/Administrador** com permissão de ban pode usar este comando.')],
        ephemeral: true
      });
    }

    const targetUser = interaction.options.getUser('discord', true);

    if (targetUser.id === interaction.user.id) {
      return interaction.reply({ embeds: [errorEmbed('Você não pode selecionar a si mesmo para banimento.')], ephemeral: true });
    }

    if (targetUser.bot) {
      return interaction.reply({ embeds: [errorEmbed('Este painel foi criado para banir jogadores, não bots.')], ephemeral: true });
    }

    await interaction.showModal(buildAdminBanModal(targetUser));
  }
};
