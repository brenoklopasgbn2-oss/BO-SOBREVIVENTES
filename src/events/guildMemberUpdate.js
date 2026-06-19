const { Events } = require('discord.js');
const { logEvent } = require('../utils/logger');

module.exports = {
  name: Events.GuildMemberUpdate,
  async execute(oldMember, newMember) {
    const oldRoles = new Set(oldMember.roles.cache.keys());
    const added = newMember.roles.cache.filter((role) => !oldRoles.has(role.id));
    const newRoles = new Set(newMember.roles.cache.keys());
    const removed = oldMember.roles.cache.filter((role) => !newRoles.has(role.id));

    if (added.size === 0 && removed.size === 0) return;

    await logEvent(newMember.guild, 'roles_changed', '🧾 Mudança de cargos', `${newMember.user} teve cargos alterados.`, [
      { name: 'Adicionados', value: added.map((role) => role.name).join(', ') || 'Nenhum', inline: false },
      { name: 'Removidos', value: removed.map((role) => role.name).join(', ') || 'Nenhum', inline: false }
    ]);
  }
};
