const { Events, ActivityType, REST, Routes } = require('discord.js');
const { config } = require('../config');
const { readCommandFiles } = require('../utils/readFiles');
const { ACTIVE_COMMAND_FILES } = require('../utils/loadCommands');
const { refreshTicketPanel } = require('../panels/refreshTicketPanel');
const { initializeStaffStatsForGuild, setupDailyStaffStatsReport } = require('../stats/staffStats');

function getLocalCommands() {
  return readCommandFiles()
    .filter((file) => ACTIVE_COMMAND_FILES.has(file.split(/[\\/]/).pop()))
    .map((file) => require(file).data.toJSON());
}

async function registerGuildCommands() {
  if (!config.CLIENT_ID || !config.GUILD_ID) {
    console.log('CLIENT_ID ou GUILD_ID não configurado. Comandos slash não foram registrados automaticamente.');
    return;
  }

  const commands = getLocalCommands();
  const rest = new REST({ version: '10' }).setToken(config.TOKEN);
  await rest.put(Routes.applicationGuildCommands(config.CLIENT_ID, config.GUILD_ID), { body: commands });
  console.log(`${commands.length} comando(s) slash registrado(s): ${commands.map((command) => `/${command.name}`).join(', ')}`);
}

module.exports = {
  name: Events.ClientReady,
  once: true,
  async execute(client) {
    client.user.setPresence({
      activities: [{ name: 'ZONA-Z • Alteria', type: ActivityType.Watching }],
      status: 'online'
    });

    console.log(`Bot ZONA-Z online como ${client.user.tag}`);

    try {
      await registerGuildCommands();
    } catch (error) {
      console.error('Erro ao registrar comandos slash automaticamente:', error);
    }

    setupDailyStaffStatsReport(client);
    for (const guild of client.guilds.cache.values()) {
      await guild.members.fetch().catch(() => null);
      initializeStaffStatsForGuild(guild);
      await refreshTicketPanel(guild).catch(() => null);
    }
  }
};
