const { REST, Routes } = require('discord.js');
const { config, validateConfig } = require('./config');
const { readCommandFiles } = require('./utils/readFiles');
const { ACTIVE_COMMAND_FILES } = require('./utils/loadCommands');

validateConfig(['TOKEN', 'CLIENT_ID', 'GUILD_ID']);


const commands = readCommandFiles()
  .filter((file) => ACTIVE_COMMAND_FILES.has(file.split(/[\\/]/).pop()))
  .map((file) => {
    const command = require(file);
    return command.data.toJSON();
  });

const rest = new REST({ version: '10' }).setToken(config.TOKEN);

async function removeOldGlobalCommands() {
  try {
    const globalCommands = await rest.get(Routes.applicationCommands(config.CLIENT_ID));
    for (const command of globalCommands) {
      await rest.delete(Routes.applicationCommand(config.CLIENT_ID, command.id));
      console.log(`Comando global antigo /${command.name} removido.`);
    }
  } catch (error) {
    console.log('Não foi possível limpar comandos globais antigos:', error.message);
  }
}

(async () => {
  try {
    console.log(`Registrando ${commands.length} comando(s) no servidor ${config.GUILD_ID}: ${commands.map((command) => `/${command.name}`).join(', ')}`);
    await rest.put(Routes.applicationGuildCommands(config.CLIENT_ID, config.GUILD_ID), { body: commands });
    await removeOldGlobalCommands();
    console.log('Comandos registrados com sucesso. Apenas /setup e /atualizarcanais ficam ativos.');
  } catch (error) {
    console.error('Erro ao registrar comandos:', error);
    process.exit(1);
  }
})();
