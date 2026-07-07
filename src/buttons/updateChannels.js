const { OWNER_IDS } = require('../config/constants');
const setupCommand = require('../commands/setup');
const { errorEmbed } = require('../utils/embeds');

module.exports = {
  customIds: ['update_channels'],
  async execute(interaction, client) {
    if (!OWNER_IDS.includes(interaction.user.id)) {
      return interaction.reply({ embeds: [errorEmbed('Apenas o dono do bot pode atualizar os canais.')], ephemeral: true });
    }
    return setupCommand.execute(interaction, client);
  }
};
