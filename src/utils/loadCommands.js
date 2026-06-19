const { readCommandFiles } = require('./readFiles');

function loadCommands(client) {
  for (const file of readCommandFiles()) {
    const command = require(file);
    if (!command.data || !command.execute) continue;
    client.commands.set(command.data.name, command);
  }
}

module.exports = { loadCommands };
