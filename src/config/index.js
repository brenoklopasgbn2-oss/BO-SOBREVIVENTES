const fs = require('node:fs');
const path = require('node:path');
require('dotenv').config();

const rootConfigPath = path.join(process.cwd(), 'config.json');
const fileConfig = fs.existsSync(rootConfigPath)
  ? JSON.parse(fs.readFileSync(rootConfigPath, 'utf8'))
  : {};

const config = {
  TOKEN: process.env.TOKEN || fileConfig.TOKEN,
  CLIENT_ID: process.env.CLIENT_ID || fileConfig.CLIENT_ID,
  GUILD_ID: process.env.GUILD_ID || fileConfig.GUILD_ID,
  MONGODB_URI: process.env.MONGODB_URI || fileConfig.MONGODB_URI
};

function validateConfig(requiredKeys = ['TOKEN', 'CLIENT_ID', 'GUILD_ID', 'MONGODB_URI']) {
  const missing = requiredKeys.filter((key) => !config[key]);
  if (missing.length > 0) {
    throw new Error(`Configuração ausente: ${missing.join(', ')}`);
  }
}

module.exports = { config, validateConfig };
