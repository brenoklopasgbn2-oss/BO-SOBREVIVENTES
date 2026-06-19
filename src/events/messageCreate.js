const path = require('path');
const { AttachmentBuilder, Events, PermissionFlagsBits } = require('discord.js');
const { CHANNELS, PANEL_IMAGES, STAFF_ROLES } = require('../config/constants');
const { baseEmbed } = require('../utils/embeds');

function isStaffMember(member) {
  return member?.permissions?.has(PermissionFlagsBits.ManageGuild)
    || member?.permissions?.has(PermissionFlagsBits.Administrator)
    || member?.roles?.cache?.some((role) => STAFF_ROLES.includes(role.name));
}

function localImage(fileName) {
  return new AttachmentBuilder(path.join(process.cwd(), 'assets', 'painels', fileName));
}

function channelMode(channelName) {
  if (channelName === CHANNELS.announcements) {
    return {
      color: 0xf39c12,
      title: '📣 Comunicado Oficial',
      fallbackImage: PANEL_IMAGES.announcement,
      footer: 'Sobreviventes Z • Aviso da Administração'
    };
  }

  if (channelName === CHANNELS.bans) {
    return {
      color: 0xc0392b,
      title: '🚫 Registro de Banimento / Punição',
      fallbackImage: PANEL_IMAGES.banPanel,
      footer: 'Sobreviventes Z • Banimentos e Punições'
    };
  }

  return null;
}

module.exports = {
  name: Events.MessageCreate,
  async execute(message) {
    if (!message.guild || !message.channel || message.author.bot) return;
    const mode = channelMode(message.channel.name);
    if (!mode) return;
    if (!isStaffMember(message.member)) return;

    const attachment = message.attachments.find((file) => file.contentType?.startsWith('image/')) || null;
    const embed = baseEmbed()
      .setColor(mode.color)
      .setAuthor({ name: `Publicado por ${message.member.displayName || message.author.username}`, iconURL: message.author.displayAvatarURL() })
      .setTitle(mode.title)
      .setDescription(message.content?.trim() || 'Sem descrição informada.')
      .setFooter({ text: mode.footer })
      .setTimestamp();

    const files = [];
    if (attachment) {
      embed.setImage(attachment.url);
    } else {
      files.push(localImage(mode.fallbackImage));
      embed.setImage(`attachment://${mode.fallbackImage}`);
    }

    await message.delete().catch(() => null);
    await message.channel.send({ embeds: [embed], files }).catch(() => null);
  }
};
