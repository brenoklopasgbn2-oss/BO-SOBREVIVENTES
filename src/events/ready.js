const { Events, ActivityType } = require('discord.js');

module.exports = {
  name: Events.ClientReady,
  once: true,
  execute(client) {
    client.user.setPresence({
      activities: [{ name: 'Sobreviventes Z', type: ActivityType.Watching }],
      status: 'online'
    });
    console.log(`Bot online como ${client.user.tag}`);
  }
};
