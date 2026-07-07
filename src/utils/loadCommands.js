const { readCommandFiles } = require('./readFiles');

const ACTIVE_COMMAND_FILES = new Set(['setup.js', 'atualizarcanais.js']);

function loadCommands(client) {
  for (const file of readCommandFiles()) {
    const fileName = file.split(/[\\/]/).pop();
    if (!ACTIVE_COMMAND_FILES.has(fileName)) continue;

    const command = require(file);
    if (!command.data || !command.execute) continue;
    client.commands.set(command.data.name, command);
  }
}

module.exports = { loadCommands, ACTIVE_COMMAND_FILES };
