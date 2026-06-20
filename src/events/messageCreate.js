const path = require('path');
const { AttachmentBuilder, Events } = require('discord.js');
const { CHANNELS, PANEL_IMAGES } = require('../config/constants');
const { baseEmbed } = require('../utils/embeds');
const { getMainStaffRole, isStaffMember } = require('../panels/supportStatus');
const { logEvent } = require('../utils/logger');
const { handleAntiXinga } = require('../moderation/antiXinga');
const { recordTicketAnswered, recordTicketMessage } = require('../stats/staffStats');

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
      fallbackImage: PANEL_IMAGES.banApplied,
      footer: 'Sobreviventes Z • Banimentos e Punições'
    };
  }

  if (channelName === CHANNELS.info) {
    return {
      color: 0x3498db,
      title: '📘 Informação Importante',
      fallbackImage: PANEL_IMAGES.announcement,
      footer: 'Sobreviventes Z • Central de Informações'
    };
  }

  return null;
}

function parseClaimedBy(topic = '') {
  return topic.match(/CLAIMED_BY:(\d+)/)?.[1] || null;
}

function isTicketChannel(channel) {
  return Boolean(channel?.topic?.includes('SZ_TICKET') || channel?.name?.includes('ticket-'));
}

async function autoClaimTicket(message) {
  if (!isTicketChannel(message.channel)) return false;
  if (!isStaffMember(message.member)) return false;

  recordTicketAnswered(message.member, message.channel.id);
  recordTicketMessage(message.member, message.channel.id);

  const claimedBy = parseClaimedBy(message.channel.topic || '');
  const roleName = getMainStaffRole(message.member);

  if (claimedBy) {
    if (claimedBy === message.author.id) return false;

    const embed = baseEmbed()
      .setColor(0x3498db)
      .setTitle('👥 Apoio no atendimento')
      .setDescription(`${message.author} entrou para ajudar neste ticket.`)
      .addFields({ name: '🛡️ Cargo em destaque', value: `**${roleName}**`, inline: true });

    await message.channel.send({ embeds: [embed] }).catch(() => null);
    return false;
  }

  await message.channel.setTopic(`${message.channel.topic || ''}|CLAIMED_BY:${message.author.id}`.slice(0, 1024)).catch(() => null);

  const embed = baseEmbed()
    .setColor(0x2ecc71)
    .setTitle('🙋 Ticket assumido')
    .setDescription(`${message.author} assumiu este atendimento automaticamente.`)
    .addFields(
      { name: '👤 Atendente', value: `${message.author}`, inline: true },
      { name: '🛡️ Cargo em destaque', value: `**${roleName}**`, inline: true }
    );

  await message.channel.send({ embeds: [embed] }).catch(() => null);
  await logEvent(message.guild, 'ticket_auto_claimed', '🙋 Ticket assumido automaticamente', `${message.author} assumiu ${message.channel}.`, [
    { name: 'Cargo', value: roleName, inline: true }
  ]);

  return true;
}

module.exports = {
  name: Events.MessageCreate,
  async execute(message) {
    if (!message.guild || !message.channel || message.author.bot) return;

    if (await handleAntiXinga(message)) return;

    await autoClaimTicket(message);

    const mode = channelMode(message.channel.name);
    if (!mode) return;
    if (!isStaffMember(message.member)) return;

    const attachment = message.attachments.find((file) => file.contentType?.startsWith('image/')) || null;
    const roleName = getMainStaffRole(message.member);
    const embed = baseEmbed()
      .setColor(mode.color)
      .setAuthor({ name: `Publicado por ${message.member.displayName || message.author.username}`, iconURL: message.author.displayAvatarURL() })
      .setTitle(mode.title)
      .setDescription(message.content?.trim() || 'Sem descrição informada.')
      .addFields({ name: '🛡️ Cargo', value: `**${roleName}**`, inline: true })
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
