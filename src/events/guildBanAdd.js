const path = require('path');
const { AttachmentBuilder, AuditLogEvent, Events } = require('discord.js');
const { CHANNELS, PANEL_IMAGES } = require('../config/constants');
const { baseEmbed } = require('../utils/embeds');
const { logEvent } = require('../utils/logger');

function localImage(fileName) {
  return new AttachmentBuilder(path.join(process.cwd(), 'assets', 'painels', fileName));
}

module.exports = {
  name: Events.GuildBanAdd,
  async execute(ban) {
    const channel = ban.guild.channels.cache.find((item) => item.name === CHANNELS.bans && item.isTextBased());

    let executor = null;
    let reason = ban.reason || 'Não informado';
    try {
      const audit = await ban.guild.fetchAuditLogs({ type: AuditLogEvent.MemberBanAdd, limit: 5 });
      const entry = audit.entries.find((item) => item.target?.id === ban.user.id);
      if (entry) {
        executor = entry.executor || null;
        reason = entry.reason || reason;
      }
    } catch {
      // ignore audit errors
    }

    if (channel) {
      const imageName = PANEL_IMAGES.banApplied;
      const embed = baseEmbed()
        .setColor(0xc0392b)
        .setTitle('🚫 Banimento Aplicado')
        .setDescription([
          `O jogador **${ban.user.tag}** foi banido da comunidade.`,
          '',
          `**Motivo:** ${reason}`,
          executor ? `**Aplicado por:** ${executor}` : '**Aplicado por:** Staff'
        ].join('\n'))
        .setThumbnail(ban.user.displayAvatarURL({ size: 256 }))
        .setImage(`attachment://${imageName}`)
        .addFields(
          { name: '👤 Usuário', value: `${ban.user.tag}`, inline: true },
          { name: '🆔 ID', value: `${ban.user.id}`, inline: true },
          { name: '⛔ Ação', value: 'Banimento', inline: true }
        );

      await channel.send({ embeds: [embed], files: [localImage(imageName)] }).catch(() => null);
    }

    await logEvent(ban.guild, 'guild_ban_add', '🚫 Banimento detectado', `${ban.user.tag} foi banido.`, [
      { name: 'Motivo', value: reason, inline: false },
      { name: 'Executor', value: executor ? executor.tag : 'Não identificado', inline: true }
    ]);
  }
};
