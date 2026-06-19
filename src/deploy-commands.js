const { REST, Routes } = require('discord.js');
const { config, validateConfig } = require('./config');
const { readCommandFiles } = require('./utils/readFiles');

validateConfig(['TOKEN', 'CLIENT_ID', 'GUILD_ID']);

const commands = readCommandFiles().map((file) => {
  const command = require(file);
  return command.data.toJSON();
});

const rest = new REST({ version: '10' }).setToken(config.TOKEN);

(async () => {
  try {
    console.log(`Registrando ${commands.length} comando(s) no servidor ${config.GUILD_ID}...`);
    await rest.put(Routes.applicationGuildCommands(config.CLIENT_ID, config.GUILD_ID), { body: commands });
    console.log('Comandos registrados com sucesso.');
  } catch (error) {
    console.error('Erro ao registrar comandos:', error);
    process.exit(1);
  }
})();
