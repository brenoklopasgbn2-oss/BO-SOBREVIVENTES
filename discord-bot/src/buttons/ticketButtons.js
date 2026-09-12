const { openTicket, claimTicket, saveTranscript, closeTicket, showTicketLanguageChange } = require('../tickets/ticketService');

module.exports = {
  customIds: ['ticket_open', 'ticket_claim', 'ticket_transcript', 'ticket_language_change', 'ticket_close'],
  async execute(interaction) {
    const [action, value] = interaction.customId.split(':');

    if (action === 'ticket_open') return openTicket(interaction, value);
    if (action === 'ticket_claim') return claimTicket(interaction, value);
    if (action === 'ticket_transcript') return saveTranscript(interaction, value);
    if (action === 'ticket_language_change') return showTicketLanguageChange(interaction, value);
    if (action === 'ticket_close') return closeTicket(interaction, value);

    return interaction.reply({ content: 'Botão de ticket inválido.', ephemeral: true });
  }
};
