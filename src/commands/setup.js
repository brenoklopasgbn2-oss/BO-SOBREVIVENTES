const { ChannelType, PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');
const { CATEGORY_DEFINITIONS, CHANNELS, ROLE_DEFINITIONS, ROLE_NAMES, LEGACY_ROLE_NAMES, SERVER_ROLES, STAFF_ROLES } = require('../config/constants');
const { buildWelcomePanel } = require('../panels/welcomePanel');
const { buildTicketPanel } = require('../panels/ticketPanel');
const { buildReportPanel } = require('../panels/reportPanel');
const { buildBugPanel } = require('../panels/bugPanel');
const { buildBanPanel } = require('../panels/banPanel');
const { buildRulesPanel } = require('../panels/rulesPanel');
const { buildAiPanel } = require('../panels/aiPanel');
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
  return category.permissionOverwrites.cache.map((overwrite) => ({ id: overwrite.id, allow: BigInt(overwrite.allow.bitfield), deny: BigInt(overwrite.deny.bitfield) }));
}

function enrichVoiceOverwrites(permissionOverwrites, guild) {
  return permissionOverwrites.map((overwrite) => {
    const updated = { ...overwrite, allow: BigInt(overwrite.allow), deny: BigInt(overwrite.deny) };
    if (overwrite.id !== guild.roles.everyone.id && updated.allow > 0n) {
      updated.allow = updated.allow | BigInt(PermissionFlagsBits.Connect) | BigInt(PermissionFlagsBits.Speak) | BigInt(PermissionFlagsBits.Stream) | BigInt(PermissionFlagsBits.UseVAD) | BigInt(PermissionFlagsBits.ViewChannel);
    }
    return updated;
  });
}

function matchNames(name, aliases = []) {
  return [name, ...aliases].filter(Boolean);
}

function canUseSetup(member) {
  if (!member) return false;
  if (member.permissions?.has(PermissionFlagsBits.Administrator)) return true;
  return member.roles?.cache?.some((role) => STAFF_ROLES.includes(role.name));
}

async function ensureRole(guild, roleDefinition) {
  const existing = guild.roles.cache.find((role) => role.name === roleDefinition.name);
  if (existing) {
    await existing.edit({ color: roleDefinition.color, hoist: roleDefinition.hoist, mentionable: true }).catch(() => null);
    return existing;
  }
  return guild.roles.create({ name: roleDefinition.name, color: roleDefinition.color, hoist: roleDefinition.hoist, mentionable: true, reason: 'Setup automático RAID-Z' });
}

async function migrateLegacyRoles(guild) {
  await guild.members.fetch().catch(() => null);

  const vanillaRole = guild.roles.cache.find((role) => role.name === ROLE_NAMES.vanilla);
  const vanillaPlusRole = guild.roles.cache.find((role) => role.name === ROLE_NAMES.vanillaPlus);
  const oldVanillaRoles = LEGACY_ROLE_NAMES.vanilla.map((name) => guild.roles.cache.find((role) => role.name === name)).filter(Boolean);
  const oldBbpRoles = LEGACY_ROLE_NAMES.bbp.map((name) => guild.roles.cache.find((role) => role.name === name)).filter(Boolean);
  const oldDmRoles = LEGACY_ROLE_NAMES.deathmatch.map((name) => guild.roles.cache.find((role) => role.name === name)).filter(Boolean);

  let vanillaPlusMoved = 0;
  let vanillaMoved = 0;

  for (const member of guild.members.cache.values()) {
    if (member.user.bot) continue;
    const hadBbp = oldBbpRoles.some((role) => member.roles.cache.has(role.id));
    const hadVanilla = oldVanillaRoles.some((role) => member.roles.cache.has(role.id));
    const hadDm = oldDmRoles.some((role) => member.roles.cache.has(role.id));

    if (hadBbp && vanillaPlusRole) {
      await member.roles.add(vanillaPlusRole, 'Migração BBP para Vanilla+ RAID-Z').catch(() => null);
      vanillaPlusMoved += 1;
    } else if ((hadVanilla || hadDm) && vanillaRole) {
      await member.roles.add(vanillaRole, 'Migração para RAID-Z Vanilla').catch(() => null);
      vanillaMoved += 1;
    }

    const legacyToRemove = [...oldVanillaRoles, ...oldBbpRoles, ...oldDmRoles];
    if (legacyToRemove.length) await member.roles.remove(legacyToRemove, 'Removendo cargos antigos Sobreviventes Z/BBP/DM').catch(() => null);
  }

  for (const role of [...oldBbpRoles, ...oldDmRoles, ...oldVanillaRoles]) {
    if (role && role.editable && !STAFF_ROLES.includes(role.name)) {
      await role.delete('Cargo antigo removido após migração RAID-Z').catch(() => null);
    }
  }

  return { vanillaPlusMoved, vanillaMoved };
}

async function wipeDiscordChannels(guild) {
  const channels = [...guild.channels.cache.values()];
  const nonCategories = channels.filter((channel) => channel.type !== ChannelType.GuildCategory);
  const categories = channels.filter((channel) => channel.type === ChannelType.GuildCategory);
  let deleted = 0;

  for (const channel of nonCategories) {
    if (channel.deletable) {
      await channel.delete('Reset RAID-Z: apagando canais antigos').then(() => { deleted += 1; }).catch(() => null);
      await new Promise((resolve) => setTimeout(resolve, 150));
    }
  }

  for (const channel of categories) {
    if (channel.deletable) {
      await channel.delete('Reset RAID-Z: apagando categorias antigas').then(() => { deleted += 1; }).catch(() => null);
      await new Promise((resolve) => setTimeout(resolve, 150));
    }
  }

  return deleted;
}

async function ensureCategory(guild, definition, position) {
  const acceptableNames = definition.name.includes('SUPORTE') ? [...new Set([...matchNames(definition.name, definition.aliases), ...SUPPORT_CATEGORY_NAMES])] : matchNames(definition.name, definition.aliases);
  const existing = guild.channels.cache.find((channel) => channel.type === ChannelType.GuildCategory && acceptableNames.includes(channel.name));
  const overwrites = getCategoryOverwrites(guild, definition);

  if (existing) {
    await existing.edit({ name: definition.name, position, permissionOverwrites: overwrites }).catch(() => null);
    return existing;
  }

  return guild.channels.create({ name: definition.name, type: ChannelType.GuildCategory, position, permissionOverwrites: overwrites, reason: 'Setup automático RAID-Z' });
}

async function ensureTextChannel(guild, category, channelDefinition, categoryDefinition) {
  const acceptableNames = matchNames(channelDefinition.name, channelDefinition.aliases);
  const existing = guild.channels.cache.find((channel) => channel.type === ChannelType.GuildText && acceptableNames.includes(channel.name) && channel.parentId === category.id);
  const permissionOverwrites = channelDefinition.readOnly ? readOnlyChannelOverwrites(guild, categoryDefinition) : cloneCategoryOverwrites(category);
  const options = { name: channelDefinition.name, topic: channelDefinition.topic, parent: category.id, permissionOverwrites };
  if (existing) {
    await existing.edit(options).catch(() => null);
    return existing;
  }
  return guild.channels.create({ type: ChannelType.GuildText, ...options, reason: 'Setup automático RAID-Z' });
}

async function ensureVoiceChannel(guild, category, channelDefinition) {
  const acceptableNames = matchNames(channelDefinition.name, channelDefinition.aliases);
  const existing = guild.channels.cache.find((channel) => channel.type === ChannelType.GuildVoice && acceptableNames.includes(channel.name) && channel.parentId === category.id);
  const permissionOverwrites = enrichVoiceOverwrites(cloneCategoryOverwrites(category), guild);
  const options = { name: channelDefinition.name, parent: category.id, userLimit: channelDefinition.userLimit || 0, bitrate: 64000, permissionOverwrites };
  if (existing) {
    await existing.edit(options).catch(() => null);
    return existing;
  }
  return guild.channels.create({ type: ChannelType.GuildVoice, ...options, reason: 'Setup automático RAID-Z' });
}

async function cleanupLegacyAiChannels(guild, officialAiChannel) {
  if (!officialAiChannel?.id) return;
  const legacyNames = new Set(['❓・pergunte-as-regras', 'pergunte-as-regras', 'duvidas-regras', 'perguntas-regras', 'sobrevivente-ia']);
  const legacyChannels = guild.channels.cache.filter((channel) => channel.type === ChannelType.GuildText && channel.id !== officialAiChannel.id && legacyNames.has(channel.name));
  for (const channel of legacyChannels.values()) await channel.delete('Canal antigo de IA/regras removido.').catch(() => null);
}

async function clearAndSendPanel(channel, panelBuilder) {
  if (!channel?.isTextBased()) return;
  const ownBotId = channel.client.user.id;
  const payloads = panelBuilder();
  const list = Array.isArray(payloads) ? payloads : [payloads];
  const sentMessages = [];
  for (const payload of list) {
    const sent = await channel.send(payload).catch((error) => {
      console.error(`Erro ao enviar painel no canal ${channel.name}:`, error);
      return null;
    });
    if (sent) sentMessages.push(sent);
  }
  if (sentMessages.length === 0) return;
  const keepIds = new Set(sentMessages.map((message) => message.id));
  for (let i = 0; i < 10; i += 1) {
    const messages = await channel.messages.fetch({ limit: 100 }).catch(() => null);
    if (!messages?.size) break;
    const oldBotMessages = messages.filter((message) => message.author.id === ownBotId && !keepIds.has(message.id));
    if (!oldBotMessages.size) break;
    await Promise.all(oldBotMessages.map((message) => message.delete().catch(() => null)));
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup')
    .setDescription('APAGA os canais antigos e recria o Discord oficial RAID-Z Vanilla.'),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    if (!canUseSetup(interaction.member)) {
      return interaction.editReply('❌ Apenas Fundador, Administrador, Moderador, Suporte, Desenvolvedor ou alguém com permissão Administrador pode usar este comando.');
    }

    const botMember = await interaction.guild.members.fetchMe();
    if (!botMember.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.editReply('Preciso da permissão Administrador para apagar e montar o servidor automaticamente.');
    }

    for (const roleDefinition of ROLE_DEFINITIONS) await ensureRole(interaction.guild, roleDefinition);
    const migration = await migrateLegacyRoles(interaction.guild);

    const aiRole = interaction.guild.roles.cache.find((role) => role.name === ROLE_NAMES.ai);
    if (aiRole && !botMember.roles.cache.has(aiRole.id)) await botMember.roles.add(aiRole).catch(() => null);

    const deletedChannels = await wipeDiscordChannels(interaction.guild);

    const categories = [];
    const ensuredChannels = new Map();
    for (const [index, definition] of CATEGORY_DEFINITIONS.entries()) {
      const category = await ensureCategory(interaction.guild, definition, index);
      categories.push(category);
      for (const channelDefinition of definition.channels) {
        const channel = (channelDefinition.type || 'text') === 'voice'
          ? await ensureVoiceChannel(interaction.guild, category, channelDefinition)
          : await ensureTextChannel(interaction.guild, category, channelDefinition, definition);
        if (channel) ensuredChannels.set(channelDefinition.name, channel);
      }
    }

    const findChannel = (name) => ensuredChannels.get(name) || interaction.guild.channels.cache.find((channel) => channel.name === name && channel.isTextBased?.());

    await clearAndSendPanel(findChannel(CHANNELS.welcome), buildWelcomePanel);
    await clearAndSendPanel(findChannel(CHANNELS.rules), () => buildRulesPanel('geral'));
    await clearAndSendPanel(findChannel(CHANNELS.rulesVanilla), () => buildRulesPanel('vanilla'));
    await clearAndSendPanel(findChannel(CHANNELS.rulesFlagRaid), () => buildRulesPanel('bandeira'));
    const aiChannel = findChannel(CHANNELS.rulesAsk);
    await clearAndSendPanel(aiChannel, () => buildAiPanel(interaction.guild));
    await cleanupLegacyAiChannels(interaction.guild, aiChannel);
    await clearAndSendPanel(findChannel(CHANNELS.openTicket), () => buildTicketPanel(interaction.guild));
    await updateSupportCategoryStatus(interaction.guild);
    await clearAndSendPanel(findChannel(CHANNELS.reportsPanel), buildReportPanel);
    await clearAndSendPanel(findChannel(CHANNELS.bugPanel), buildBugPanel);
    await clearAndSendPanel(findChannel(CHANNELS.bans), buildBanPanel);
    await refreshTicketPanel(interaction.guild);

    await logEvent(interaction.guild, 'setup_completed', '✅ Setup RAID-Z executado', `${interaction.user} apagou os canais antigos e recriou o Discord RAID-Z Vanilla.`, [
      { name: 'Canais apagados', value: String(deletedChannels), inline: true },
      { name: 'Categorias novas', value: String(categories.length), inline: true },
      { name: 'BBP → Vanilla+', value: String(migration.vanillaPlusMoved), inline: true },
      { name: 'Antigos → Vanilla', value: String(migration.vanillaMoved), inline: true },
      { name: 'Cargos do servidor', value: SERVER_ROLES.join(', '), inline: false }
    ]);

    await interaction.editReply({ embeds: [successEmbed(`RAID-Z pronto. Apaguei **${deletedChannels}** canais/categorias antigos, recriei tudo para **1 servidor Vanilla**, migrei BBP para **Vanilla+** e criei o canal de **bandeira no raid**.`)] }).catch(() => null);
  }
};
