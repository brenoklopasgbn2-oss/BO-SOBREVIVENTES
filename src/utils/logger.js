const { AuditLogEvent } = require('discord.js');
const { CHANNELS } = require('../config/constants');
const { baseEmbed } = require('./embeds');

async function saveLog(type, data) {
  // Bot simples: sem banco de dados. Os logs ficam no canal logs-staff.
  return { type, data };
}

async function sendLog(guild, title, description, fields = []) {
  if (!guild) return;
  const channel = guild.channels.cache.find((item) => item.name === CHANNELS.logsStaff);
  if (!channel || !channel.isTextBased()) return;

  const embed = baseEmbed().setTitle(title).setDescription(description);
  if (fields.length > 0) embed.addFields(fields);

  await channel.send({ embeds: [embed] }).catch(() => null);
}

async function logEvent(guild, type, title, description, fields = []) {
  await saveLog(type, { guildId: guild?.id, title, description, fields });
  await sendLog(guild, title, description, fields);
}

async function tryFetchExecutor(guild, targetId, type) {
  try {
    const logs = await guild.fetchAuditLogs({ type, limit: 5 });
    const entry = logs.entries.find((item) => item.target?.id === targetId);
    return entry?.executor || null;
  } catch {
    return null;
  }
}

module.exports = { logEvent, saveLog, sendLog, tryFetchExecutor, AuditLogEvent };
