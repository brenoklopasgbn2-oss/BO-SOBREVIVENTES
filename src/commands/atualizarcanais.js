const { ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder } = require('discord.js');
const { OWNER_IDS } = require('../config/constants');
const { successEmbed, errorEmbed } = require('../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('atualizarcanais')
    .setDescription('Aplica a estrutura oficial e a nova identidade da ZONA-Z.'),

  async execute(interaction) {
    if (!OWNER_IDS.includes(interaction.user.id)) {
      return interaction.reply({ embeds: [errorEmbed('Apenas o dono do bot pode usar este comando.')], ephemeral: true });
    }

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('update_channels:run')
        .setLabel('Aplicar nova ZONA-Z')
        .setEmoji('🔄')
        .setStyle(ButtonStyle.Primary)
    );

    return interaction.reply({
      embeds: [successEmbed([
        'O botão abaixo aplica a **repaginação ZONA-Z**.',
        '',
        '✅ Renomeia e reorganiza os canais principais.',
        '✅ Troca os painéis pelas novas imagens.',
        '✅ Resume as regras.',
        '✅ Mantém KOTH e adiciona Airdrop/Eventos.',
        '🧹 Remove canais antigos de bunker, chaves, plataforma, Vanilla Pro, carro blindado, bandeira e outros guias do servidor anterior.',
        '',
        'Canais manuais que não fazem parte da lista antiga continuam preservados.'
      ].join('\n'))],
      components: [row],
      ephemeral: true
    });
  }
};
