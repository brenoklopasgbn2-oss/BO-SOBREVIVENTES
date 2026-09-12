const {
  handleReferralOpen,
  handleStaffRegisterButton,
  handleStaffRanking,
  handleStaffManage,
  handleStaffToggle,
  handleStaffRefresh
} = require('../services/streamerReferralDiscordService');

module.exports = {
  customIds: [
    'streamer_referral_open',
    'streamer_staff_register',
    'streamer_staff_ranking',
    'streamer_staff_manage',
    'streamer_staff_toggle',
    'streamer_staff_refresh'
  ],
  async execute(interaction) {
    const [action, value] = interaction.customId.split(':');
    if (action === 'streamer_referral_open') return handleReferralOpen(interaction);
    if (action === 'streamer_staff_register') return handleStaffRegisterButton(interaction);
    if (action === 'streamer_staff_ranking') return handleStaffRanking(interaction);
    if (action === 'streamer_staff_manage') return handleStaffManage(interaction);
    if (action === 'streamer_staff_toggle') return handleStaffToggle(interaction, value);
    if (action === 'streamer_staff_refresh') return handleStaffRefresh(interaction);
  }
};
