const { readButtonFiles } = require('./readFiles');

function loadButtons(client) {
  for (const file of readButtonFiles()) {
    const button = require(file);
    if (!button.execute) continue;

    const customIds = button.customIds || [button.customId];
    for (const customId of customIds.filter(Boolean)) {
      client.buttons.set(customId, button);
    }
  }
}

module.exports = { loadButtons };
