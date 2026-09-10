const { ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder } = require('discord.js');
const { OWNER_IDS } = require('../config/constants');
const { successEmbed, errorEmbed } = require('../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('atualizarcanais')
    .setDescription('Aplica a estrutura oficial e a nova identidade do CHAMPIONS Z.'),

  async execute(interaction) {
    if (!OWNER_IDS.includes(interaction.user.id)) {
      return interaction.reply({ embeds: [errorEmbed('Apenas o dono do bot pode usar este comando.')], ephemeral: true });
    }

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('update_channels:run')
        .setLabel('Aplicar CHAMPIONS Z')
        .setEmoji('🔄')
        .setStyle(ButtonStyle.Primary)
    );

    return interaction.reply({
      embeds: [successEmbed([
        'O botão abaixo aplica a **estrutura CHAMPIONS Z**.',
        '',
        '✅ Renomeia e reorganiza os canais principais.',
        '✅ Troca os painéis pelas novas imagens.',
        '✅ Atualiza o painel de regras.',
        '✅ Mantém KOTH e Airdrop.',
        '🧹 Cria os novos guias de Bunker 1, Bunker 2, áreas militares e infectado NBC amarelo, removendo estruturas antigas conhecidas.',
        '',
        'Canais manuais que não fazem parte da lista antiga continuam preservados.'
      ].join('\n'))],
      components: [row],
      ephemeral: true
    });
  }
};
