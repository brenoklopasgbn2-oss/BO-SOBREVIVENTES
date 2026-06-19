const { Events, ActivityType, REST, Routes } = require('discord.js');
const { config } = require('../config');
const { readCommandFiles } = require('../utils/readFiles');
const { refreshTicketPanel } = require('../panels/refreshTicketPanel');

function getLocalCommands() {
  return readCommandFiles()
    .filter((file) => !file.endsWith('regras.js'))
    .map((file) => {
      const command = require(file);
      return command.data.toJSON();
    });
}

async function removeOldRegrasCommand(rest) {
  // Remove /regras se ele ficou registrado como comando global antigo.
  // Isso não apaga /regra nem /setup.
  try {
    const globalCommands = await rest.get(Routes.applicationCommands(config.CLIENT_ID));
    const oldRegras = globalCommands.filter((command) => command.name === 'regras');

    for (const command of oldRegras) {
      await rest.delete(Routes.applicationCommand(config.CLIENT_ID, command.id));
      console.log('Comando global antigo /regras removido.');
    }
  } catch (error) {
    console.log('Não foi possível limpar comando global /regras:', error.message);
  }
}

async function registerGuildCommands() {
  if (!config.CLIENT_ID || !config.GUILD_ID) {
    console.log('CLIENT_ID ou GUILD_ID não configurado. Comandos slash não foram registrados automaticamente.');
    return;
  }

  const commands = getLocalCommands();
  const rest = new REST({ version: '10' }).setToken(config.TOKEN);

  await rest.put(Routes.applicationGuildCommands(config.CLIENT_ID, config.GUILD_ID), { body: commands });
  await removeOldRegrasCommand(rest);

  console.log(`${commands.length} comando(s) slash registrado(s): ${commands.map((command) => `/${command.name}`).join(', ')}`);
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
