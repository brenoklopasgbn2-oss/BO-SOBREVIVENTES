const { Client, Collection, GatewayIntentBits, Partials } = require('discord.js');
const { config, validateConfig } = require('./config');
const { connectDatabase } = require('./database/mongoose');
const { loadButtons } = require('./utils/loadButtons');
const { loadCommands } = require('./utils/loadCommands');
const { loadEvents } = require('./utils/loadEvents');

validateConfig();

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

connectDatabase(config.MONGODB_URI)
  .then(() => client.login(config.TOKEN))
  .catch((error) => {
    console.error('Falha ao iniciar o bot:', error);
    process.exit(1);
  });
