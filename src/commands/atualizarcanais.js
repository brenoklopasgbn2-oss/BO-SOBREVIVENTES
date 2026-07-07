const { ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder } = require('discord.js');
const { OWNER_IDS } = require('../config/constants');
const { successEmbed, errorEmbed } = require('../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('atualizarcanais')
    .setDescription('Mostra o botão para atualizar os canais oficiais sem apagar nada.'),

  async execute(interaction) {
    if (!OWNER_IDS.includes(interaction.user.id)) {
      return interaction.reply({ embeds: [errorEmbed('Apenas o dono do bot pode usar este comando.')], ephemeral: true });
    }

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('update_channels:run')
        .setLabel('Atualizar canais RAID-Z')
        .setEmoji('🔄')
        .setStyle(ButtonStyle.Primary)
    );

    return interaction.reply({
      embeds: [successEmbed('Clique no botão abaixo para **criar/atualizar** os canais oficiais RAID-Z. Ele **não apaga mensagens**, **não apaga canais manuais** e **não apaga categorias manuais**. Vai atualizar os canais: **⛏️・bunker-subterraneo**, **🏗️・construcoes-vanilla-pro**, **🚙・carro-blindado**, **🛏️・saco-de-dormir** e a IA.')],
      components: [row],
      ephemeral: true
    });
  }
};
