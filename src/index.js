const { Client, Collection, GatewayIntentBits, Partials } = require('discord.js');
const { config, validateConfig } = require('./config');
const { loadButtons } = require('./utils/loadButtons');
const { loadCommands } = require('./utils/loadCommands');
const { loadEvents } = require('./utils/loadEvents');

validateConfig(['TOKEN']);

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Channel, Partials.GuildMember, Partials.Message, Partials.User]
});

client.commands = new Collection();
client.buttons = new Collection();

loadCommands(client);
loadButtons(client);
loadEvents(client);

client.login(config.TOKEN).catch((error) => {
  console.error('Falha ao iniciar o bot. Confira TOKEN no Railway:', error);
  process.exit(1);
});
