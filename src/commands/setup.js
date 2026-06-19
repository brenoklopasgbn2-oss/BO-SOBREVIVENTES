const { ChannelType, PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');
const { CATEGORY_DEFINITIONS, CHANNELS, ROLE_DEFINITIONS, ROLE_NAMES, SERVER_ROLES } = require('../config/constants');
const { buildWelcomePanel } = require('../panels/welcomePanel');
const { buildTicketPanel } = require('../panels/ticketPanel');
const { buildReportPanel } = require('../panels/reportPanel');
const { buildBugPanel } = require('../panels/bugPanel');
const { buildBanPanel } = require('../panels/banPanel');
const { roleOnlyOverwrites, serverMemberOverwrites, visibleToEveryoneOverwrites } = require('../utils/permissions');
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
  const acceptableNames = matchNames(definition.name, definition.aliases);
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

async function ensureTextChannel(guild, category, channelDefinition) {
  const acceptableNames = matchNames(channelDefinition.name, channelDefinition.aliases);
  const existing = guild.channels.cache.find((channel) => channel.type === ChannelType.GuildText && acceptableNames.includes(channel.name));
  const permissionOverwrites = cloneCategoryOverwrites(category);

  if (channelDefinition.readOnly) {
    const everyoneOverwrite = permissionOverwrites.find((item) => item.id === guild.roles.everyone.id);
    if (everyoneOverwrite) everyoneOverwrite.deny = BigInt(everyoneOverwrite.deny) | BigInt(PermissionFlagsBits.SendMessages);

    const readOnlyRoleNames = [...SERVER_ROLES, ROLE_NAMES.vip];
    for (const roleName of readOnlyRoleNames) {
      const role = guild.roles.cache.find((item) => item.name === roleName);
      if (!role) continue;
      const overwrite = permissionOverwrites.find((item) => item.id === role.id);
      if (overwrite) overwrite.deny = BigInt(overwrite.deny) | BigInt(PermissionFlagsBits.SendMessages);
    }
  }

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
  const messages = await channel.messages.fetch({ limit: 50 }).catch(() => null);
  const botMessages = messages?.filter((message) => message.author.bot) || [];
  await Promise.all(botMessages.map((message) => message.delete().catch(() => null)));
  await channel.send(panelBuilder());
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
          await ensureTextChannel(interaction.guild, category, channelDefinition);
        }
      }
    }

    const findChannel = (name) => interaction.guild.channels.cache.find((channel) => channel.name === name);

    await clearAndSendPanel(findChannel(CHANNELS.welcome), buildWelcomePanel);
    await clearAndSendPanel(findChannel(CHANNELS.openTicket), buildTicketPanel);
    await clearAndSendPanel(findChannel(CHANNELS.reportsPanel), buildReportPanel);
    await clearAndSendPanel(findChannel(CHANNELS.bugPanel), buildBugPanel);
    await clearAndSendPanel(findChannel(CHANNELS.bans), buildBanPanel);

    await logEvent(interaction.guild, 'setup_completed', '✅ Setup executado', `${interaction.user} executou o setup automático.`, [
      { name: 'Categorias', value: String(categories.length), inline: true },
      { name: 'Atendimento voz', value: `${CHANNELS.waitingRoom}, ${CHANNELS.supportRoom1}, ${CHANNELS.supportRoom2}`, inline: false },
      { name: 'Cargos de servidor', value: SERVER_ROLES.join(', '), inline: false }
    ]);

    await interaction.editReply({ embeds: [successEmbed('Setup concluído. Canais, categorias, painéis, voz e anúncios automáticos foram criados/atualizados. Rodar /setup novamente atualiza a estrutura existente.')] });
  }
};
