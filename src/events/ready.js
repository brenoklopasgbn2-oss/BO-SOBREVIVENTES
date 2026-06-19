const { Events, ActivityType, REST, Routes } = require('discord.js');
const { config } = require('../config');
const { readCommandFiles } = require('../utils/readFiles');
const { refreshTicketPanel } = require('../panels/refreshTicketPanel');

async function registerGuildCommands() {
  if (!config.CLIENT_ID || !config.GUILD_ID) {
    console.log('CLIENT_ID ou GUILD_ID não configurado. Comandos slash não foram registrados automaticamente.');
    return;
  }

  const commands = readCommandFiles().map((file) => {
    const command = require(file);
    return command.data.toJSON();
  });

  const rest = new REST({ version: '10' }).setToken(config.TOKEN);
  await rest.put(Routes.applicationGuildCommands(config.CLIENT_ID, config.GUILD_ID), { body: commands });
  console.log(`${commands.length} comando(s) slash registrado(s) no servidor ${config.GUILD_ID}.`);
}

module.exports = {
  name: Events.ClientReady,
  once: true,
  async execute(client) {
    client.user.setPresence({
      activities: [{ name: 'Sobreviventes Z', type: ActivityType.Watching }],
      status: 'online'
    });

    console.log(`Bot online como ${client.user.tag}`);

    try {
      await registerGuildCommands();
    } catch (error) {
      console.error('Erro ao registrar comandos slash automaticamente:', error);
    }

    for (const guild of client.guilds.cache.values()) {
      await guild.members.fetch().catch(() => null);
      await refreshTicketPanel(guild).catch(() => null);
    }
  }
};
