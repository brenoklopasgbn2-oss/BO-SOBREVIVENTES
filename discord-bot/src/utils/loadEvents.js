const { readEventFiles } = require('./readFiles');

function loadEvents(client) {
  for (const file of readEventFiles()) {
    const event = require(file);
    if (!event.name || !event.execute) continue;

    if (event.once) {
      client.once(event.name, (...args) => event.execute(...args, client));
    } else {
      client.on(event.name, (...args) => event.execute(...args, client));
    }
  }
}

module.exports = { loadEvents };
