const { Events, ActivityType, REST, Routes } = require('discord.js');
const { config } = require('../config');
const { readCommandFiles } = require('../utils/readFiles');
const { refreshTicketPanel } = require('../panels/refreshTicketPanel');
const { initializeStaffStatsForGuild, setupDailyStaffStatsReport } = require('../stats/staffStats');
const { ensureKothChannel } = require('../services/kothChannelService');

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
      activities: [{ name: 'RAID-Z', type: ActivityType.Watching }],
      status: 'online'
    });

    console.log(`Bot online como ${client.user.tag}`);

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

      try {
        const result = await ensureKothChannel(guild, { updatePanel: true, skipIfNoCategory: true });
        if (result.created) console.log(`Canal ${result.channel.name} criado automaticamente em ${guild.name}.`);
        else if (result.moved) console.log(`Canal ${result.channel.name} movido para a CENTRAL RAID-Z em ${guild.name}.`);
      } catch (error) {
        console.error(`Erro ao criar/atualizar o canal KOTH em ${guild.name}:`, error);
      }
    }
  }
};
