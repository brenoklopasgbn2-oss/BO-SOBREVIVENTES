const { ChannelType } = require('discord.js');
const { CATEGORY_DEFINITIONS, CHANNELS } = require('../config/constants');
const { readOnlyChannelOverwrites } = require('../utils/permissions');
const { buildKothPanel } = require('../panels/kothPanel');

const KOTH_REASON = 'Canal oficial KOTH RAID-Z';

function getKothCategoryDefinition() {
  return CATEGORY_DEFINITIONS.find((definition) =>
    definition.channels?.some((channel) => channel.name === CHANNELS.koth)
  );
}

function findKothCategory(guild, definition) {
  if (!definition) return null;
  const names = [definition.name, ...(definition.aliases || [])];

  return guild.channels.cache.find(
    (channel) => channel.type === ChannelType.GuildCategory && channel.name === definition.name
  ) || guild.channels.cache.find(
    (channel) => channel.type === ChannelType.GuildCategory && names.includes(channel.name)
  ) || null;
}

function getKothTopic(definition) {
  return definition?.channels?.find((channel) => channel.name === CHANNELS.koth)?.topic
    || 'KOTH RAID-Z: fumaça branca livre, fumaça vermelha em progresso e loot dinâmico conforme a quantidade de jogadores dentro da área.';
}

function payloadTitle(payload) {
  const embed = payload?.embeds?.[0];
  return embed?.data?.title || embed?.title || null;
}

async function updateKothPanel(channel) {
  if (!channel?.isTextBased()) return;

  const payloads = buildKothPanel();
  const list = Array.isArray(payloads) ? payloads : [payloads];
  const messages = await channel.messages.fetch({ limit: 100 }).catch(() => null);
  const botMessages = messages
    ? [...messages.values()].filter((message) => message.author.id === channel.client.user.id)
    : [];
  const usedMessageIds = new Set();

  for (const payload of list) {
    const { legacyTitles = [], ...sendPayload } = payload;
    const acceptedTitles = [payloadTitle(sendPayload), ...legacyTitles].filter(Boolean);
    const existing = botMessages.find((message) =>
      !usedMessageIds.has(message.id) && acceptedTitles.includes(message.embeds?.[0]?.title)
    );

    if (existing) {
      usedMessageIds.add(existing.id);
      const edited = await existing.edit(sendPayload).catch(() => null);
      if (edited) continue;
    }

    await channel.send(sendPayload);
  }
}

async function ensureKothChannel(guild, options = {}) {
  const {
    category: providedCategory = null,
    updatePanel = true,
    skipIfNoCategory = false
  } = options;

  await guild.channels.fetch().catch(() => null);

  const categoryDefinition = getKothCategoryDefinition();
  const category = providedCategory || findKothCategory(guild, categoryDefinition);

  if (!category) {
    if (skipIfNoCategory) {
      return { channel: null, created: false, moved: false, skipped: true };
    }
    throw new Error('A categoria CENTRAL RAID-Z não foi encontrada para criar o canal do KOTH.');
  }

  const topic = getKothTopic(categoryDefinition);
  const permissionOverwrites = readOnlyChannelOverwrites(guild, categoryDefinition);

  // Procura somente o nome oficial. Um canal antigo chamado apenas "koth"
  // não impede a criação do canal visível 🚩・koth na CENTRAL RAID-Z.
  let channel = guild.channels.cache.find(
    (candidate) => candidate.type === ChannelType.GuildText && candidate.name === CHANNELS.koth
  );

  let created = false;
  let moved = false;

  if (!channel) {
    channel = await guild.channels.create({
      name: CHANNELS.koth,
      type: ChannelType.GuildText,
      parent: category.id,
      topic,
      permissionOverwrites,
      reason: KOTH_REASON
    });
    created = true;
  } else {
    if (channel.parentId !== category.id) {
      await channel.setParent(category.id, { lockPermissions: false, reason: KOTH_REASON });
      moved = true;
    }

    await channel.edit({ topic, reason: KOTH_REASON });
    await channel.permissionOverwrites.set(permissionOverwrites, KOTH_REASON);
  }

  const raidMissionsDefinition = categoryDefinition?.channels?.find((item) => item.name === CHANNELS.raidMissions);
  const raidMissionNames = [CHANNELS.raidMissions, ...(raidMissionsDefinition?.aliases || [])];
  const raidMissionsChannel = guild.channels.cache.find((candidate) =>
    candidate.type === ChannelType.GuildText
      && candidate.parentId === category.id
      && raidMissionNames.includes(candidate.name)
  );

  if (raidMissionsChannel && channel.position !== raidMissionsChannel.position + 1) {
    await channel.setPosition(raidMissionsChannel.position + 1, { reason: KOTH_REASON }).catch(() => null);
  }

  if (updatePanel) await updateKothPanel(channel);

  return { channel, created, moved, skipped: false };
}

module.exports = {
  ensureKothChannel,
  updateKothPanel
};
