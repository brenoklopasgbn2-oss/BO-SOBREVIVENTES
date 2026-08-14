const { ChannelType, PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');
const {
  CATEGORY_DEFINITIONS,
  CATEGORY_NAMES,
  CATEGORY_ALIASES,
  CHANNELS,
  ROLE_DEFINITIONS,
  ROLE_NAMES,
  LEGACY_ROLE_NAMES,
  SERVER_ROLES,
  STAFF_ROLES,
  OWNER_IDS,
  LEGACY_CHANNEL_NAMES
} = require('../config/constants');
const { buildWelcomePanel } = require('../panels/welcomePanel');
const { buildTicketPanel } = require('../panels/ticketPanel');
const { buildReportPanel } = require('../panels/reportPanel');
const { buildBugPanel } = require('../panels/bugPanel');
const { buildBanPanel } = require('../panels/banPanel');
const { buildRulesPanel } = require('../panels/rulesPanel');
const { buildAiPanel } = require('../panels/aiPanel');
const { buildKothPanel } = require('../panels/kothPanel');
const { buildAirdropPanel } = require('../panels/airdropPanel');
const { buildEventsPanel } = require('../panels/eventsPanel');
const { buildHowToPlayPanel } = require('../panels/howToPlayPanel');
const { SUPPORT_CATEGORY_NAMES, updateSupportCategoryStatus } = require('../panels/supportStatus');
const { refreshTicketPanel } = require('../panels/refreshTicketPanel');
const { readOnlyChannelOverwrites, roleOnlyOverwrites, serverMemberOverwrites, visibleToEveryoneOverwrites } = require('../utils/permissions');
const { successEmbed } = require('../utils/embeds');
const { logEvent } = require('../utils/logger');

function getCategoryOverwrites(guild, definition) {
  if (definition.visibleToEveryone) return visibleToEveryoneOverwrites(guild);
  if (definition.visibleToServerMembers) return serverMemberOverwrites(guild);
  return roleOnlyOverwrites(guild, definition.allowedRoles || []);
}

function cloneCategoryOverwrites(category) {
  return category.permissionOverwrites.cache.map((overwrite) => ({
    id: overwrite.id,
    allow: BigInt(overwrite.allow.bitfield),
    deny: BigInt(overwrite.deny.bitfield)
  }));
}

function enrichVoiceOverwrites(permissionOverwrites, guild) {
  return permissionOverwrites.map((overwrite) => {
    const updated = { ...overwrite, allow: BigInt(overwrite.allow), deny: BigInt(overwrite.deny) };
    if (overwrite.id !== guild.roles.everyone.id && updated.allow > 0n) {
      updated.allow = updated.allow
        | BigInt(PermissionFlagsBits.Connect)
        | BigInt(PermissionFlagsBits.Speak)
        | BigInt(PermissionFlagsBits.Stream)
        | BigInt(PermissionFlagsBits.UseVAD)
        | BigInt(PermissionFlagsBits.ViewChannel);
    }
    return updated;
  });
}

function canUseSetup(member) {
  return Boolean(member && OWNER_IDS.includes(member.id));
}

async function ensureRole(guild, roleDefinition) {
  const existing = guild.roles.cache.find((role) => role.name === roleDefinition.name);
  if (existing) {
    await existing.edit({ color: roleDefinition.color, hoist: roleDefinition.hoist, mentionable: true }).catch(() => null);
    return existing;
  }
  return guild.roles.create({
    name: roleDefinition.name,
    color: roleDefinition.color,
    hoist: roleDefinition.hoist,
    mentionable: true,
    reason: 'Setup automático ZONA-Z'
  });
}

async function migrateLegacyRoles(guild) {
  await guild.members.fetch().catch(() => null);
  const survivorRole = guild.roles.cache.find((role) => role.name === ROLE_NAMES.survivor);
  const legacyNames = [...new Set([
    ...LEGACY_ROLE_NAMES.vanilla,
    ...LEGACY_ROLE_NAMES.bbp,
    ...LEGACY_ROLE_NAMES.deathmatch,
    'RAID-Z IA'
  ])];
  const legacyRoles = legacyNames.map((name) => guild.roles.cache.find((role) => role.name === name)).filter(Boolean);
  let moved = 0;

  if (survivorRole) {
    for (const member of guild.members.cache.values()) {
      if (member.user.bot) continue;
      if (legacyRoles.some((role) => member.roles.cache.has(role.id)) && !member.roles.cache.has(survivorRole.id)) {
        await member.roles.add(survivorRole, 'Migração para ZONA-Z').catch(() => null);
        moved += 1;
      }
    }
  }

  let removedRoles = 0;
  for (const role of legacyRoles) {
    if (role.managed || role.name === ROLE_NAMES.survivor || role.name === ROLE_NAMES.ai) continue;
    const deleted = await role.delete('Limpeza de cargos do servidor antigo na migração ZONA-Z').then(() => true).catch(() => false);
    if (deleted) removedRoles += 1;
  }

  return { moved, removedRoles };
}

function allNames(definition) {
  return [definition.name, ...(definition.aliases || [])].filter(Boolean);
}

async function ensureCategory(guild, definition, position) {
  const acceptableNames = definition.name.includes('SUPORTE')
    ? [...new Set([...allNames(definition), ...SUPPORT_CATEGORY_NAMES])]
    : allNames(definition);

  let category = guild.channels.cache.find((channel) => channel.type === ChannelType.GuildCategory && acceptableNames.includes(channel.name));
  const permissionOverwrites = getCategoryOverwrites(guild, definition);

  if (!category) {
    return guild.channels.create({
      name: definition.name,
      type: ChannelType.GuildCategory,
      position,
      permissionOverwrites,
      reason: 'Setup automático ZONA-Z'
    });
  }

  const isSupport = definition.name.includes('SUPORTE');
  if (!isSupport && category.name !== definition.name) {
    await category.setName(definition.name, 'Atualização visual ZONA-Z').catch(() => null);
  }
  await category.permissionOverwrites.set(permissionOverwrites, 'Permissões ZONA-Z').catch(() => null);
  return category;
}

async function ensureTextChannel(guild, category, channelDefinition, categoryDefinition) {
  const names = allNames(channelDefinition);
  let channel = guild.channels.cache.find((item) => item.type === ChannelType.GuildText && names.includes(item.name));
  const permissionOverwrites = channelDefinition.readOnly
    ? readOnlyChannelOverwrites(guild, categoryDefinition)
    : cloneCategoryOverwrites(category);

  if (!channel) {
    return guild.channels.create({
      type: ChannelType.GuildText,
      name: channelDefinition.name,
      topic: channelDefinition.topic,
      parent: category.id,
      permissionOverwrites,
      reason: 'Setup automático ZONA-Z'
    });
  }

  if (channel.name !== channelDefinition.name) await channel.setName(channelDefinition.name, 'Renomeado para ZONA-Z').catch(() => null);
  if (channel.topic !== channelDefinition.topic) await channel.setTopic(channelDefinition.topic, 'Tópico atualizado para ZONA-Z').catch(() => null);
  if (channel.parentId !== category.id) await channel.setParent(category.id, { lockPermissions: false, reason: 'Organização ZONA-Z' }).catch(() => null);
  await channel.permissionOverwrites.set(permissionOverwrites, 'Permissões ZONA-Z').catch(() => null);
  return channel;
}

async function ensureVoiceChannel(guild, category, channelDefinition) {
  const names = allNames(channelDefinition);
  let channel = guild.channels.cache.find((item) => item.type === ChannelType.GuildVoice && names.includes(item.name));
  const permissionOverwrites = enrichVoiceOverwrites(cloneCategoryOverwrites(category), guild);

  if (!channel) {
    return guild.channels.create({
      type: ChannelType.GuildVoice,
      name: channelDefinition.name,
      parent: category.id,
      userLimit: channelDefinition.userLimit || 0,
      bitrate: 64000,
      permissionOverwrites,
      reason: 'Setup automático ZONA-Z'
    });
  }

  if (channel.name !== channelDefinition.name) await channel.setName(channelDefinition.name, 'Renomeado para ZONA-Z').catch(() => null);
  if (channel.parentId !== category.id) await channel.setParent(category.id, { lockPermissions: false, reason: 'Organização ZONA-Z' }).catch(() => null);
  if (channel.userLimit !== (channelDefinition.userLimit || 0)) await channel.setUserLimit(channelDefinition.userLimit || 0, 'Limite ZONA-Z').catch(() => null);
  await channel.permissionOverwrites.set(permissionOverwrites, 'Permissões ZONA-Z').catch(() => null);
  return channel;
}

async function removeLegacyChannels(guild, protectedIds = new Set()) {
  const names = new Set(LEGACY_CHANNEL_NAMES.map((name) => String(name).toLowerCase()));
  let removed = 0;

  for (const channel of [...guild.channels.cache.values()]) {
    if (protectedIds.has(channel.id)) continue;
    if (channel.type !== ChannelType.GuildText && channel.type !== ChannelType.GuildVoice) continue;
    const low = String(channel.name || '').toLowerCase();
    const isLegacy = names.has(low) || low.includes('bunker') || low.includes('banker');
    if (!isLegacy) continue;

    const ok = await channel.delete('Remoção de canal do servidor antigo na repaginação ZONA-Z').then(() => true).catch(() => false);
    if (ok) removed += 1;
  }

  return removed;
}

async function removeLegacyServerCategories(guild, protectedIds = new Set()) {
  const oldNames = new Set([
    CATEGORY_NAMES.vanilla,
    ...(CATEGORY_ALIASES[CATEGORY_NAMES.vanilla] || []),
    '🔴・RAID-Z VANILLA',
    '🔴・SOBREVIVENTES Z VANILLA'
  ].map((name) => String(name).toLowerCase()));

  let removed = 0;
  for (const category of [...guild.channels.cache.values()]) {
    if (category.type !== ChannelType.GuildCategory || protectedIds.has(category.id)) continue;
    if (!oldNames.has(String(category.name || '').toLowerCase())) continue;

    // Só apaga a categoria antiga se não restarem canais dentro dela.
    const hasChildren = guild.channels.cache.some((channel) => channel.parentId === category.id);
    if (hasChildren) continue;
    const ok = await category.delete('Categoria antiga removida na migração ZONA-Z').then(() => true).catch(() => false);
    if (ok) removed += 1;
  }
  return removed;
}

function payloadTitle(payload) {
  const embed = payload?.embeds?.[0];
  return embed?.data?.title || embed?.title || null;
}

async function clearAndSendPanel(channel, panelBuilder, { replaceBotMessages = false } = {}) {
  if (!channel?.isTextBased()) return;
  const ownBotId = channel.client.user.id;
  const payloads = panelBuilder();
  const list = Array.isArray(payloads) ? payloads : [payloads];
  const messages = await channel.messages.fetch({ limit: 100 }).catch(() => null);
  const botMessages = messages ? [...messages.values()].filter((message) => message.author.id === ownBotId) : [];

  if (replaceBotMessages) {
    for (const message of botMessages) await message.delete().catch(() => null);
    for (const payload of list) {
      const { legacyTitles, ...sendPayload } = payload;
      await channel.send(sendPayload).catch(() => null);
    }
    return;
  }

  const usedMessageIds = new Set();
  for (const payload of list) {
    const { legacyTitles = [], ...sendPayload } = payload;
    const acceptedTitles = [payloadTitle(sendPayload), ...legacyTitles].filter(Boolean);
    const existing = botMessages.find((message) => !usedMessageIds.has(message.id) && acceptedTitles.includes(message.embeds?.[0]?.title));

    if (existing) {
      usedMessageIds.add(existing.id);
      const edited = await existing.edit(sendPayload).catch(() => null);
      if (edited) continue;
    }
    await channel.send(sendPayload).catch(() => null);
  }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup')
    .setDescription('Repagina e atualiza o Discord oficial da ZONA-Z.'),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    if (!canUseSetup(interaction.member)) {
      return interaction.editReply('❌ Apenas o dono do bot pode usar este comando.');
    }

    const guild = interaction.guild;
    const botMember = await guild.members.fetchMe();
    if (!botMember.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.editReply('Preciso da permissão **Administrador** para repaginar cargos, canais e permissões.');
    }

    await guild.channels.fetch().catch(() => null);
    await guild.roles.fetch().catch(() => null);

    for (const roleDefinition of ROLE_DEFINITIONS) await ensureRole(guild, roleDefinition);
    const migration = await migrateLegacyRoles(guild);

    const aiRole = guild.roles.cache.find((role) => role.name === ROLE_NAMES.ai);
    if (aiRole && !botMember.roles.cache.has(aiRole.id)) await botMember.roles.add(aiRole).catch(() => null);

    const ensuredChannels = new Map();
    const ensuredCategories = [];

    for (const [index, definition] of CATEGORY_DEFINITIONS.entries()) {
      const category = await ensureCategory(guild, definition, index);
      ensuredCategories.push(category);
      for (const channelDefinition of definition.channels) {
        const channel = (channelDefinition.type || 'text') === 'voice'
          ? await ensureVoiceChannel(guild, category, channelDefinition)
          : await ensureTextChannel(guild, category, channelDefinition, definition);
        if (channel) ensuredChannels.set(channelDefinition.name, channel);
      }
    }

    const protectedChannelIds = new Set([...ensuredChannels.values()].map((channel) => channel.id));
    const removedLegacyChannels = await removeLegacyChannels(guild, protectedChannelIds);
    const protectedCategoryIds = new Set(ensuredCategories.map((category) => category.id));
    const removedLegacyCategories = await removeLegacyServerCategories(guild, protectedCategoryIds);

    const findChannel = (name) => ensuredChannels.get(name) || guild.channels.cache.find((channel) => channel.name === name && channel.isTextBased?.());

    await clearAndSendPanel(findChannel(CHANNELS.welcome), buildWelcomePanel, { replaceBotMessages: true });
    await clearAndSendPanel(findChannel(CHANNELS.rules), buildRulesPanel, { replaceBotMessages: true });
    await clearAndSendPanel(findChannel(CHANNELS.howToPlay), buildHowToPlayPanel, { replaceBotMessages: true });
    await clearAndSendPanel(findChannel(CHANNELS.events), buildEventsPanel, { replaceBotMessages: true });
    await clearAndSendPanel(findChannel(CHANNELS.koth), buildKothPanel, { replaceBotMessages: true });
    await clearAndSendPanel(findChannel(CHANNELS.airdrop), buildAirdropPanel, { replaceBotMessages: true });
    await clearAndSendPanel(findChannel(CHANNELS.rulesAsk), () => buildAiPanel(guild), { replaceBotMessages: true });
    await clearAndSendPanel(findChannel(CHANNELS.openTicket), () => buildTicketPanel(guild), { replaceBotMessages: true });
    await clearAndSendPanel(findChannel(CHANNELS.reportsPanel), buildReportPanel, { replaceBotMessages: true });
    await clearAndSendPanel(findChannel(CHANNELS.bugPanel), buildBugPanel, { replaceBotMessages: true });
    await clearAndSendPanel(findChannel(CHANNELS.bans), buildBanPanel);

    await updateSupportCategoryStatus(guild);
    await refreshTicketPanel(guild);

    await logEvent(guild, 'setup_completed', '✅ Setup ZONA-Z executado', `${interaction.user} aplicou a nova estrutura ZONA-Z.`, [
      { name: 'Canais antigos removidos', value: String(removedLegacyChannels), inline: true },
      { name: 'Categorias antigas removidas', value: String(removedLegacyCategories), inline: true },
      { name: 'Cargos antigos removidos', value: String(migration.removedRoles), inline: true },
      { name: 'Jogadores migrados', value: String(migration.moved), inline: true },
      { name: 'Cargos ativos', value: SERVER_ROLES.join(', '), inline: false },
      { name: 'Staff', value: STAFF_ROLES.join(', '), inline: false }
    ]);

    return interaction.editReply({
      embeds: [successEmbed([
        '**ZONA-Z repaginada com sucesso.**',
        '',
        `🧹 ${removedLegacyChannels} canal(is) antigo(s) removido(s).`,
        `📁 ${removedLegacyCategories} categoria(s) antiga(s) removida(s).`,
        `🎭 ${migration.removedRoles} cargo(s) antigo(s) removido(s).`,
        '',
        'A estrutura agora está focada em **Alteria, regras resumidas, eventos, KOTH, Airdrop, comunidade e suporte**.'
      ].join('\n'))]
    });
  }
};
