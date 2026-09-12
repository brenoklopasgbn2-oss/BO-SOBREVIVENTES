const { PermissionFlagsBits } = require('discord.js');
const { ROLE_NAMES, SERVER_ROLES, STAFF_ROLES } = require('../config/constants');

const READ_ONLY_DENY = [
  PermissionFlagsBits.SendMessages,
  PermissionFlagsBits.SendMessagesInThreads,
  PermissionFlagsBits.CreatePublicThreads,
  PermissionFlagsBits.CreatePrivateThreads,
  PermissionFlagsBits.AddReactions,
  PermissionFlagsBits.AttachFiles,
  PermissionFlagsBits.EmbedLinks,
  PermissionFlagsBits.UseExternalEmojis,
  PermissionFlagsBits.UseExternalStickers
];

function findRole(guild, roleName) {
  return guild.roles.cache.find((role) => role.name === roleName);
}

function resolveRoles(guild, roleNames) {
  const roles = roleNames.map((roleName) => findRole(guild, roleName)).filter(Boolean);

  if (roleNames.includes(ROLE_NAMES.vip) && guild.roles.premiumSubscriberRole) {
    roles.push(guild.roles.premiumSubscriberRole);
  }

  return [...new Map(roles.map((role) => [role.id, role])).values()];
}

function staffPermissionOverwrites(guild) {
  return resolveRoles(guild, STAFF_ROLES).map((role) => ({
    id: role.id,
    allow: [
      PermissionFlagsBits.ViewChannel,
      PermissionFlagsBits.SendMessages,
      PermissionFlagsBits.ReadMessageHistory,
      PermissionFlagsBits.ManageMessages,
      PermissionFlagsBits.AttachFiles,
      PermissionFlagsBits.EmbedLinks,
      PermissionFlagsBits.AddReactions,
      PermissionFlagsBits.CreatePublicThreads,
      PermissionFlagsBits.CreatePrivateThreads,
      PermissionFlagsBits.SendMessagesInThreads
    ]
  }));
}

function visibleToEveryoneOverwrites(guild) {
  return [
    {
      id: guild.roles.everyone.id,
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory],
      deny: [PermissionFlagsBits.SendMessages]
    },
    ...staffPermissionOverwrites(guild)
  ];
}

function roleOnlyOverwrites(guild, roleNames) {
  return [
    {
      id: guild.roles.everyone.id,
      deny: [PermissionFlagsBits.ViewChannel]
    },
    ...resolveRoles(guild, roleNames).map((role) => ({
      id: role.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.AttachFiles,
        PermissionFlagsBits.EmbedLinks
      ]
    })),
    ...staffPermissionOverwrites(guild)
  ];
}

function serverMemberOverwrites(guild) {
  return roleOnlyOverwrites(guild, SERVER_ROLES);
}

function readOnlyRoleOverwrite(role) {
  return {
    id: role.id,
    allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory],
    deny: READ_ONLY_DENY
  };
}

function readOnlyChannelOverwrites(guild, categoryDefinition = {}) {
  const overwrites = [];

  if (categoryDefinition.visibleToEveryone) {
    overwrites.push({
      id: guild.roles.everyone.id,
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory],
      deny: READ_ONLY_DENY
    });
  } else {
    overwrites.push({
      id: guild.roles.everyone.id,
      deny: [PermissionFlagsBits.ViewChannel, ...READ_ONLY_DENY]
    });

    const roleNames = categoryDefinition.visibleToServerMembers
      ? SERVER_ROLES
      : (categoryDefinition.allowedRoles || []);

    for (const role of resolveRoles(guild, roleNames)) {
      overwrites.push(readOnlyRoleOverwrite(role));
    }
  }

  return [
    ...overwrites,
    ...staffPermissionOverwrites(guild)
  ];
}

module.exports = {
  findRole,
  resolveRoles,
  staffPermissionOverwrites,
  visibleToEveryoneOverwrites,
  roleOnlyOverwrites,
  serverMemberOverwrites,
  readOnlyChannelOverwrites
};
