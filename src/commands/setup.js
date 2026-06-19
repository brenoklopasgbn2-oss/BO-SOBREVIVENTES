const {
  ChannelType,
  PermissionFlagsBits,
  SlashCommandBuilder
} = require('discord.js');
const {
  CATEGORY_DEFINITIONS,
  CHANNELS,
  ROLE_DEFINITIONS,
  ROLE_NAMES,
  SERVER_ROLES
} = require('../config/constants');
const { buildWelcomePanel } = require('../panels/welcomePanel');
const { buildTicketPanel } = require('../panels/ticketPanel');
const {
  roleOnlyOverwrites,
  serverMemberOverwrites,
  visibleToEveryoneOverwrites
} = require('../utils/permissions');
const { successEmbed } = require('../utils/embeds');
const { logEvent } = require('../utils/logger');

function getCategoryOverwrites(guild, definition) {
  if (definition.visibleToEveryone) return visibleToEveryoneOverwrites(guild);
  if (definition.visibleToServerMembers) return serverMemberOverwrites(guild);
  return roleOnlyOverwrites(guild, definition.allowedRoles || []);
}

async function ensureRole(guild, roleDefinition) {
  const existing = guild.roles.cache.find((role) => role.name === roleDefinition.name);
  if (existing) {
    await existing.edit({
      color: roleDefinition.color,
      hoist: roleDefinition.hoist,
      mentionable: true
    }).catch(() => null);
    return existing;
  }

  return guild.roles.create({
    name: roleDefinition.name,
    color: roleDefinition.color,
    hoist: roleDefinition.hoist,
    mentionable: true,
    reason: 'Setup automático Sobreviventes Z'
  });
}

async function ensureCategory(guild, definition, position) {
  const overwrites = getCategoryOverwrites(guild, definition);
  const existing = guild.channels.cache.find(
    (channel) => channel.type === ChannelType.GuildCategory && channel.name === definition.name
  );

  if (existing) {
    await existing.permissionOverwrites.set(overwrites);
    await existing.setPosition(position).catch(() => null);
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
  const existing = guild.channels.cache.find(
    (channel) => channel.type === ChannelType.GuildText && channel.name === channelDefinition.name
  );

  const permissionOverwrites = category.permissionOverwrites.cache.map((overwrite) => ({
    id: overwrite.id,
    allow: overwrite.allow.bitfield,
    deny: overwrite.deny.bitfield
  }));

  if (channelDefinition.readOnly) {
    const everyoneOverwrite = permissionOverwrites.find((item) => item.id === guild.roles.everyone.id);
    if (everyoneOverwrite) {
      everyoneOverwrite.deny = BigInt(everyoneOverwrite.deny) | PermissionFlagsBits.SendMessages;
    }

    const readOnlyRoleNames = [...SERVER_ROLES, ROLE_NAMES.vip];
    for (const roleName of readOnlyRoleNames) {
      const role = guild.roles.cache.find((item) => item.name === roleName);
      if (!role) continue;

      const overwrite = permissionOverwrites.find((item) => item.id === role.id);
      if (overwrite) {
        overwrite.deny = BigInt(overwrite.deny) | PermissionFlagsBits.SendMessages;
      }
    }
  }

  const options = {
    topic: channelDefinition.topic,
    parent: category.id,
    permissionOverwrites
  };

  if (existing) {
    await existing.edit(options).catch(() => null);
    return existing;
  }

  return guild.channels.create({
    name: channelDefinition.name,
    type: ChannelType.GuildText,
    ...options,
    reason: 'Setup automático Sobreviventes Z'
  });
}

async function clearAndSendPanel(channel, panelBuilder) {
  if (!channel?.isTextBased()) return;
  const messages = await channel.messages.fetch({ limit: 20 }).catch(() => null);
  const botMessages = messages?.filter((message) => message.author.bot) || [];
  await Promise.all(botMessages.map((message) => message.delete().catch(() => null)));
  await channel.send(panelBuilder());
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup')
    .setDescription('Cria cargos, canais, permissões e painéis da Sobreviventes Z.')
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
        await ensureTextChannel(interaction.guild, category, channelDefinition);
      }
    }

    const welcomeChannel = interaction.guild.channels.cache.find((channel) => channel.name === CHANNELS.welcome);
    const ticketChannel = interaction.guild.channels.cache.find((channel) => channel.name === CHANNELS.openTicket);

    await clearAndSendPanel(welcomeChannel, buildWelcomePanel);
    await clearAndSendPanel(ticketChannel, buildTicketPanel);

    const everyoneOverwrite = welcomeChannel.permissionOverwrites.cache.get(interaction.guild.roles.everyone.id);
    if (everyoneOverwrite) {
      await welcomeChannel.permissionOverwrites.edit(interaction.guild.roles.everyone.id, {
        ViewChannel: true,
        SendMessages: false,
        ReadMessageHistory: true
      });
    }

    await logEvent(interaction.guild, 'setup_completed', '✅ Setup executado', `${interaction.user} executou o setup automático.`, [
      { name: 'Categorias', value: String(categories.length), inline: true },
      { name: 'Cargos de servidor', value: SERVER_ROLES.join(', '), inline: false }
    ]);

    await interaction.editReply({
      embeds: [successEmbed('Setup concluído. Cargos, categorias, canais, permissões e painéis foram criados/atualizados.')]
    });
  }
};
