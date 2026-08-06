const path = require('path');
const { AttachmentBuilder, Events } = require('discord.js');
const { CHANNELS, PANEL_IMAGES } = require('../config/constants');
const { baseEmbed } = require('../utils/embeds');
const { getMainStaffRole, isStaffMember } = require('../panels/supportStatus');
const { logEvent } = require('../utils/logger');
const { handleAntiXinga } = require('../moderation/antiXinga');
const { recordTicketAnswered, recordTicketMessage } = require('../stats/staffStats');
const { handleRulesQuestion } = require('../rules/rulesAssistant');
const { handleTicketTranslation } = require('../services/ticketTranslationService');

// Evita duas mensagens simultâneas assumirem e anunciarem o mesmo ticket.
const autoClaimLocks = new Set();
const knownClaimedTickets = new Set();

function localImage(fileName) {
  return new AttachmentBuilder(path.join(process.cwd(), 'assets', 'painels', fileName));
}

function channelMode(channelName) {
  if (channelName === CHANNELS.announcements) {
    return {
      color: 0xf39c12,
      title: '📣 Comunicado Oficial',
      fallbackImage: PANEL_IMAGES.announcement,
      footer: 'RAID-Z • Aviso da Administração'
    };
  }

  if (channelName === CHANNELS.bans) {
    return {
      color: 0xc0392b,
      title: '🚫 Registro de Banimento / Punição',
      fallbackImage: PANEL_IMAGES.banApplied,
      footer: 'RAID-Z • Banimentos e Punições'
    };
  }

  if (channelName === CHANNELS.info) {
    return {
      color: 0x3498db,
      title: '📘 Informação Importante',
      fallbackImage: PANEL_IMAGES.announcement,
      footer: 'RAID-Z • Central de Informações'
    };
  }

  return null;
}

function parseClaimedBy(topic = '') {
  return topic.match(/(?:^|\|)CLAIMED_BY:(\d+)/)?.[1] || null;
}

function setTopicField(topic = '', key, value) {
  const cleanParts = String(topic)
    .split('|')
    .map((part) => part.trim())
    .filter(Boolean)
    .filter((part) => !part.startsWith(`${key}:`));

  cleanParts.push(`${key}:${value}`);
  return cleanParts.join('|').slice(0, 1024);
}

function isTicketChannel(channel) {
  return Boolean(channel?.topic?.includes('RAIDZ_TICKET') || channel?.name?.includes('ticket-'));
}

async function autoClaimTicket(message) {
  if (!isTicketChannel(message.channel)) return false;
  if (!isStaffMember(message.member)) return false;

  recordTicketMessage(message.member, message.channel.id);

  // Depois que o ticket já foi assumido, outras mensagens da equipe não geram
  // mais embeds de "apoio" ou "ticket assumido".
  if (knownClaimedTickets.has(message.channel.id)) return false;
  if (autoClaimLocks.has(message.channel.id)) return false;

  autoClaimLocks.add(message.channel.id);

  try {
    const freshChannel = await message.guild.channels.fetch(message.channel.id).catch(() => message.channel);
    const claimedBy = parseClaimedBy(freshChannel?.topic || message.channel.topic || '');

    if (claimedBy) {
      knownClaimedTickets.add(message.channel.id);
      return false;
    }

    const newTopic = setTopicField(freshChannel?.topic || message.channel.topic || '', 'CLAIMED_BY', message.author.id);
    const topicUpdated = await freshChannel.setTopic(newTopic).then(() => true).catch(() => false);
    if (!topicUpdated) return false;

    knownClaimedTickets.add(message.channel.id);
    recordTicketAnswered(message.member, message.channel.id);

    const roleName = getMainStaffRole(message.member);
    const embed = baseEmbed()
      .setColor(0x2ecc71)
      .setTitle('🙋 Ticket assumido')
      .setDescription(`${message.author} assumiu este atendimento automaticamente.`)
      .addFields(
        { name: '👤 Atendente', value: `${message.author}`, inline: true },
        { name: '🛡️ Cargo em destaque', value: `**${roleName}**`, inline: true }
      );

    await freshChannel.send({ embeds: [embed] }).catch(() => null);
    await logEvent(message.guild, 'ticket_auto_claimed', '🙋 Ticket assumido automaticamente', `${message.author} assumiu ${freshChannel}.`, [
      { name: 'Cargo', value: roleName, inline: true }
    ]);

    return true;
  } finally {
    autoClaimLocks.delete(message.channel.id);
  }
}

module.exports = {
  name: Events.MessageCreate,
  async execute(message) {
    if (!message.guild || !message.channel || message.author.bot) return;

    if (await handleAntiXinga(message)) return;

    if (await handleRulesQuestion(message)) return;

    await autoClaimTicket(message);
    await handleTicketTranslation(message);

    const mode = channelMode(message.channel.name);
    if (!mode) return;
    if (!isStaffMember(message.member)) return;

    const attachment = message.attachments.find((file) => {
      if (file.contentType?.startsWith('image/')) return true;
      return /\.(png|jpe?g|gif|webp)$/i.test(file.name || '');
    }) || null;

    // No canal de avisos, mensagens com imagem ficam originais.
    // O bot não apaga e não remanda, evitando perder a imagem ou criar duplicata.
    if (message.channel.name === CHANNELS.announcements && attachment) return;

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
