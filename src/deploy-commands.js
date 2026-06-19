const { REST, Routes } = require('discord.js');
const { config, validateConfig } = require('./config');
const { readCommandFiles } = require('./utils/readFiles');

validateConfig(['TOKEN', 'CLIENT_ID', 'GUILD_ID']);

const commands = readCommandFiles()
  .filter((file) => !file.endsWith('regras.js'))
  .map((file) => {
    const command = require(file);
    return command.data.toJSON();
  });

const rest = new REST({ version: '10' }).setToken(config.TOKEN);

async function removeOldRegrasCommand() {
  // Remove /regras se algum dia ele ficou registrado como comando global antigo.
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

(async () => {
  try {
    console.log(`Registrando ${commands.length} comando(s) no servidor ${config.GUILD_ID}: ${commands.map((command) => `/${command.name}`).join(', ')}`);
    await rest.put(Routes.applicationGuildCommands(config.CLIENT_ID, config.GUILD_ID), { body: commands });
    await removeOldRegrasCommand();
    console.log('Comandos registrados com sucesso. Comandos ativos esperados: /setup e /regra.');
  } catch (error) {
    console.error('Erro ao registrar comandos:', error);
    process.exit(1);
  }
})();
