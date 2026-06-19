const { PermissionFlagsBits } = require('discord.js');
const { ROLE_NAMES, SERVER_ROLES, STAFF_ROLES } = require('../config/constants');

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
      PermissionFlagsBits.ManageMessages
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

module.exports = {
  findRole,
  resolveRoles,
  staffPermissionOverwrites,
  visibleToEveryoneOverwrites,
  roleOnlyOverwrites,
  serverMemberOverwrites
};
