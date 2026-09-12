const fs = require('node:fs');
const path = require('node:path');

const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'ticketPlayerProfiles.json');

function emptyData() {
  return {
    version: 1,
    profiles: {}
  };
}

function ensureStorage() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(emptyData(), null, 2));
  }
}

function loadData() {
  try {
    ensureStorage();
    const parsed = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    return {
      ...emptyData(),
      ...parsed,
      profiles: parsed?.profiles || {}
    };
  } catch (error) {
    console.error('Erro ao carregar ticketPlayerProfiles.json:', error);
    return emptyData();
  }
}

function saveData(data) {
  try {
    ensureStorage();
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error('Erro ao salvar ticketPlayerProfiles.json:', error);
    return false;
  }
}

function getProfile(guildId, userId) {
  if (!guildId || !userId) return null;
  const data = loadData();
  return data.profiles?.[guildId]?.[userId] || null;
}

function saveGameNickname(guildId, userId, gameNickname) {
  if (!guildId || !userId || !gameNickname) return false;

  const data = loadData();
  if (!data.profiles[guildId]) data.profiles[guildId] = {};

  const previous = data.profiles[guildId][userId] || {};
  data.profiles[guildId][userId] = {
    ...previous,
    gameNickname,
    createdAt: previous.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  return saveData(data);
}

module.exports = { getProfile, saveGameNickname };
