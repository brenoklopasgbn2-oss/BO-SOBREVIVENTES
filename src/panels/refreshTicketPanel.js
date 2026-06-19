const { CHANNELS } = require('../config/constants');
const { updateSupportCategoryStatus } = require('./supportStatus');
const { buildTicketPanel } = require('./ticketPanel');

async function refreshTicketPanel(guild) {
  await updateSupportCategoryStatus(guild);

  const channel = guild.channels.cache.find((item) => item.name === CHANNELS.openTicket && item.isTextBased());
  if (!channel) return;

  const messages = await channel.messages.fetch({ limit: 20 }).catch(() => null);
  const botPanel = messages?.find((message) => message.author.bot && message.components?.length > 0) || null;
  const payload = buildTicketPanel(guild);

  if (botPanel) {
    await botPanel.edit(payload).catch(() => null);
    return;
  }

  await channel.send(payload).catch(() => null);
}

module.exports = { refreshTicketPanel };
