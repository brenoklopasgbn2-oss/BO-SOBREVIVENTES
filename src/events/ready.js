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

async function registerGuildCommands(client) {
  const commands = getLocalCommands();
  const applicationId = client.application?.id || client.user?.id || config.CLIENT_ID;

  if (!applicationId) {
    console.log('Não foi possível descobrir o Application ID. Comandos slash não foram registrados.');
    return;
  }

  const rest = new REST({ version: '10' }).setToken(config.TOKEN);

  // Registra automaticamente em TODOS os servidores em que o bot está.
  // Isso evita depender de CLIENT_ID/GUILD_ID preenchidos manualmente.
  const guilds = [...client.guilds.cache.values()];
  if (guilds.length === 0) {
    console.log('O bot ainda não está em nenhum servidor. Nenhum comando slash foi registrado.');
    return;
  }

  for (const guild of guilds) {
    try {
      await rest.put(
        Routes.applicationGuildCommands(applicationId, guild.id),
        { body: commands }
      );
      console.log(`[${guild.name}] ${commands.length} comando(s) slash registrado(s): ${commands.map((command) => `/${command.name}`).join(', ')}`);
    } catch (error) {
      console.error(`[${guild.name}] Erro ao registrar comandos slash:`, error);
    }
  }
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
      await registerGuildCommands(client);
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
