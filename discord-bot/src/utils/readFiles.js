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

function readCommandFiles() {
  return readJsFiles(path.join(process.cwd(), 'src', 'commands'));
}

function readEventFiles() {
  return readJsFiles(path.join(process.cwd(), 'src', 'events'));
}

function readButtonFiles() {
  return readJsFiles(path.join(process.cwd(), 'src', 'buttons'));
}

module.exports = { readJsFiles, readCommandFiles, readEventFiles, readButtonFiles };
