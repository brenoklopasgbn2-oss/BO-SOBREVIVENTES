const { Events } = require('discord.js');
const { refreshTicketPanel } = require('../panels/refreshTicketPanel');
const { isStaffMember } = require('../panels/supportStatus');

module.exports = {
  name: Events.PresenceUpdate,
  async execute(oldPresence, newPresence) {
    const guild = newPresence?.guild || oldPresence?.guild;
    const member = newPresence?.member || oldPresence?.member;
    if (!guild || !member || member.user?.bot || !isStaffMember(member)) return;
    await refreshTicketPanel(guild);
  }
};
