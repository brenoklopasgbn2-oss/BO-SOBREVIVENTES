const { Events } = require('discord.js');
const { errorEmbed } = require('../utils/embeds');
const { logEvent } = require('../utils/logger');

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction, client) {
    try {
      if (interaction.isChatInputCommand()) {
        const command = client.commands.get(interaction.commandName);
        if (!command) return;

        await command.execute(interaction, client);
        await logEvent(
          interaction.guild,
          'command_executed',
          '🤖 Comando executado',
          `${interaction.user} executou \`/${interaction.commandName}\`.`,
          [{ name: 'Canal', value: `${interaction.channel}`, inline: true }]
        );
        return;
      }

      if (interaction.isButton()) {
        const buttonKey = interaction.customId.split(':')[0];
        const button = client.buttons.get(buttonKey);
        if (!button) return;
        await button.execute(interaction, client);
      }
    } catch (error) {
      console.error('Erro ao processar interação:', error);
      const payload = { embeds: [errorEmbed('Não consegui concluir essa ação. Verifique minhas permissões e tente novamente.')], ephemeral: true };
      if (interaction.deferred || interaction.replied) {
        await interaction.followUp(payload).catch(() => null);
      } else {
        await interaction.reply(payload).catch(() => null);
      }
    }
  }
};
