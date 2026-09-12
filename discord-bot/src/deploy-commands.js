const { REST, Routes } = require('discord.js');
const { config, validateConfig } = require('./config');
const { readCommandFiles } = require('./utils/readFiles');
const { ACTIVE_COMMAND_FILES } = require('./utils/loadCommands');

validateConfig(['TOKEN']);

const commands = readCommandFiles()
  .filter((file) => ACTIVE_COMMAND_FILES.has(file.split(/[\\/]/).pop()))
  .map((file) => {
    const command = require(file);
    return command.data.toJSON();
  });

const rest = new REST({ version: '10' }).setToken(config.TOKEN);

(async () => {
  try {
    if (!config.CLIENT_ID || !config.GUILD_ID) {
      console.log('CLIENT_ID/GUILD_ID não preenchidos. Não há problema: ao iniciar com npm start, o bot registra /setup e /atualizarcanais automaticamente nos servidores em que estiver.');
      process.exit(0);
    }

    console.log(`Registrando ${commands.length} comando(s) no servidor ${config.GUILD_ID}: ${commands.map((command) => `/${command.name}`).join(', ')}`);
    await rest.put(Routes.applicationGuildCommands(config.CLIENT_ID, config.GUILD_ID), { body: commands });
    console.log('Comandos registrados com sucesso.');
  } catch (error) {
    console.error('Erro ao registrar comandos:', error);
    process.exit(1);
  }
})();
