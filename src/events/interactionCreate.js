const { Events } = require('discord.js');
const { errorEmbed } = require('../utils/embeds');
const { logEvent } = require('../utils/logger');
const { submitTicketForm, handleTicketLanguageSelect } = require('../tickets/ticketService');

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
        return;
      }

      if (interaction.isStringSelectMenu()) {
        const action = interaction.customId.split(':')[0];
        if (action === 'ticket_language_select') {
          await handleTicketLanguageSelect(interaction);
        }
        return;
      }

      if (interaction.isModalSubmit()) {
        const [action, value, language] = interaction.customId.split(':');
        if (action === 'ticket_form') {
          await submitTicketForm(interaction, value, language);
        }
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
