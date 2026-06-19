const { ChannelType, PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');
const { CATEGORY_DEFINITIONS, CHANNELS, ROLE_DEFINITIONS, ROLE_NAMES, SERVER_ROLES } = require('../config/constants');
const { buildWelcomePanel } = require('../panels/welcomePanel');
const { buildTicketPanel } = require('../panels/ticketPanel');
const { buildReportPanel } = require('../panels/reportPanel');
const { buildBugPanel } = require('../panels/bugPanel');
const { buildBanPanel } = require('../panels/banPanel');
const { buildRulesPanel } = require('../panels/rulesPanel');
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
      updated.allow = updated.allow |
        BigInt(PermissionFlagsBits.Connect) |
        BigInt(PermissionFlagsBits.Speak) |
        BigInt(PermissionFlagsBits.Stream) |
        BigInt(PermissionFlagsBits.UseVAD) |
        BigInt(PermissionFlagsBits.ViewChannel);
    }
    return updated;
  });
}

function matchNames(name, aliases = []) {
  return [name, ...aliases].filter(Boolean);
}

async function ensureRole(guild, roleDefinition) {
  const existing = guild.roles.cache.find((role) => role.name === roleDefinition.name);
  if (existing) {
    await existing.edit({ color: roleDefinition.color, hoist: roleDefinition.hoist, mentionable: true }).catch(() => null);
    return existing;
  }
  return guild.roles.create({ name: roleDefinition.name, color: roleDefinition.color, hoist: roleDefinition.hoist, mentionable: true, reason: 'Setup automático Sobreviventes Z' });
}

async function ensureCategory(guild, definition, position) {
  const acceptableNames = definition.name.includes('SUPORTE')
    ? [...new Set([...matchNames(definition.name, definition.aliases), ...SUPPORT_CATEGORY_NAMES])]
    : matchNames(definition.name, definition.aliases);
  const existing = guild.channels.cache.find((channel) => channel.type === ChannelType.GuildCategory && acceptableNames.includes(channel.name));
  const overwrites = getCategoryOverwrites(guild, definition);

  if (existing) {
    await existing.edit({ name: definition.name, position, permissionOverwrites: overwrites }).catch(() => null);
    return existing;
  }

  return guild.channels.create({
    name: definition.name,
    type: ChannelType.GuildCategory,
    position,
    permissionOverwrites: overwrites,
    reason: 'Setup automático Sobreviventes Z'
  });
}

async function ensureTextChannel(guild, category, channelDefinition, categoryDefinition) {
  const acceptableNames = matchNames(channelDefinition.name, channelDefinition.aliases);
  const existing = guild.channels.cache.find((channel) => channel.type === ChannelType.GuildText && acceptableNames.includes(channel.name));
  const permissionOverwrites = channelDefinition.readOnly
    ? readOnlyChannelOverwrites(guild, categoryDefinition)
    : cloneCategoryOverwrites(category);

  const options = { name: channelDefinition.name, topic: channelDefinition.topic, parent: category.id, permissionOverwrites };
  if (existing) {
    await existing.edit(options).catch(() => null);
    return existing;
  }

  return guild.channels.create({ type: ChannelType.GuildText, ...options, reason: 'Setup automático Sobreviventes Z' });
}

async function ensureVoiceChannel(guild, category, channelDefinition) {
  const acceptableNames = matchNames(channelDefinition.name, channelDefinition.aliases);
  const existing = guild.channels.cache.find((channel) => channel.type === ChannelType.GuildVoice && acceptableNames.includes(channel.name));
  const permissionOverwrites = enrichVoiceOverwrites(cloneCategoryOverwrites(category), guild);
  const options = { name: channelDefinition.name, parent: category.id, userLimit: channelDefinition.userLimit || 0, bitrate: 64000, permissionOverwrites };

  if (existing) {
    await existing.edit(options).catch(() => null);
    return existing;
  }

  return guild.channels.create({ type: ChannelType.GuildVoice, ...options, reason: 'Setup automático Sobreviventes Z' });
}

async function clearAndSendPanel(channel, panelBuilder) {
  if (!channel?.isTextBased()) return;

  for (let i = 0; i < 5; i += 1) {
    const messages = await channel.messages.fetch({ limit: 100 }).catch(() => null);
    const botMessages = messages?.filter((message) => message.author.bot) || [];
    if (!botMessages.size) break;

    await Promise.all(botMessages.map((message) => message.delete().catch(() => null)));
    if (botMessages.size < 100) break;
  }

  const payloads = panelBuilder();
  const list = Array.isArray(payloads) ? payloads : [payloads];

  for (const payload of list) {
    await channel.send(payload);
  }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup')
    .setDescription('Cria ou atualiza cargos, canais, permissões e painéis da Sobreviventes Z.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const botMember = await interaction.guild.members.fetchMe();
    if (!botMember.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.editReply('Preciso da permissão Administrador para montar o servidor automaticamente.');
    }

    for (const roleDefinition of ROLE_DEFINITIONS) {
      await ensureRole(interaction.guild, roleDefinition);
    }

    const categories = [];
    for (const [index, definition] of CATEGORY_DEFINITIONS.entries()) {
      const category = await ensureCategory(interaction.guild, definition, index);
      categories.push(category);
      for (const channelDefinition of definition.channels) {
        if ((channelDefinition.type || 'text') === 'voice') {
          await ensureVoiceChannel(interaction.guild, category, channelDefinition);
        } else {
          await ensureTextChannel(interaction.guild, category, channelDefinition, definition);
        }
      }
    }

    const findChannel = (name) => interaction.guild.channels.cache.find((channel) => channel.name === name);

    await clearAndSendPanel(findChannel(CHANNELS.welcome), buildWelcomePanel);
    await clearAndSendPanel(findChannel(CHANNELS.rules), () => buildRulesPanel('geral'));
    await clearAndSendPanel(findChannel(CHANNELS.rulesVanilla), () => buildRulesPanel('vanilla'));
    await clearAndSendPanel(findChannel(CHANNELS.rulesBbp), () => buildRulesPanel('bbp'));
    await clearAndSendPanel(findChannel(CHANNELS.rulesDeathmatch), () => buildRulesPanel('deathmatch'));
    await clearAndSendPanel(findChannel(CHANNELS.openTicket), () => buildTicketPanel(interaction.guild));
    await updateSupportCategoryStatus(interaction.guild);
    await clearAndSendPanel(findChannel(CHANNELS.reportsPanel), buildReportPanel);
    await clearAndSendPanel(findChannel(CHANNELS.bugPanel), buildBugPanel);
    await clearAndSendPanel(findChannel(CHANNELS.bans), buildBanPanel);
    await refreshTicketPanel(interaction.guild);

    await logEvent(interaction.guild, 'setup_completed', '✅ Setup executado', `${interaction.user} executou o setup automático.`, [
      { name: 'Categorias', value: String(categories.length), inline: true },
      { name: 'Atendimento voz', value: `${CHANNELS.waitingRoom}, ${CHANNELS.supportRoom1}, ${CHANNELS.supportRoom2}`, inline: false },
      { name: 'Cargos de servidor', value: SERVER_ROLES.join(', '), inline: false }
    ]);

    await interaction.editReply({ embeds: [successEmbed('Setup concluído. Canais, categorias, painéis, voz e anúncios automáticos foram criados/atualizados. Rodar /setup novamente atualiza a estrutura existente.')] });
  }
};
