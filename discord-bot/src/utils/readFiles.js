const fs = require('node:fs');
const path = require('node:path');

function readJsFiles(directory) {
  if (!fs.existsSync(directory)) return [];

  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return readJsFiles(fullPath);
    return entry.isFile() && entry.name.endsWith('.js') ? [fullPath] : [];
  });
}

// IMPORTANTE NO MONOREPO:
// O Railway inicia tudo com cwd=/app. Se usarmos process.cwd(), o bot procura
// /app/src (site) em vez de /app/discord-bot/src. Sempre resolvemos a partir
// deste arquivo para manter comandos/eventos/botoes dentro do pacote do bot.
const BOT_SRC_DIR = path.resolve(__dirname, '..');

function readCommandFiles() {
  return readJsFiles(path.join(BOT_SRC_DIR, 'commands'));
}

function readEventFiles() {
  return readJsFiles(path.join(BOT_SRC_DIR, 'events'));
}

function readButtonFiles() {
  return readJsFiles(path.join(BOT_SRC_DIR, 'buttons'));
}

module.exports = { readJsFiles, readCommandFiles, readEventFiles, readButtonFiles };
