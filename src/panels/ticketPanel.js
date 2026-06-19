const path = require('path');
const { ActionRowBuilder, AttachmentBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { CHANNELS, PANEL_IMAGES, TICKET_TYPES } = require('../config/constants');
const { baseEmbed } = require('../utils/embeds');
const { getMainStaffRole, getSupportStatus } = require('./supportStatus');

function panelImage(fileName) {
  return new AttachmentBuilder(path.join(process.cwd(), 'assets', 'painels', fileName));
}

function buildSupportStaffText(staffInSupport = []) {
  if (!staffInSupport.length) return 'Ninguém está dentro do atendimento por voz agora.';

  const byChannel = new Map();
  for (const member of staffInSupport) {
    const channelName = member.voice?.channel?.name || 'atendimento';
    if (!byChannel.has(channelName)) byChannel.set(channelName, []);
    byChannel.get(channelName).push(member);
  }

  return [...byChannel.entries()]
    .map(([channelName, members]) => {
      const people = members
        .map((member) => `• **${getMainStaffRole(member)}** — ${member.user}`)
        .join('\n');
      return `🎧 **${channelName}**\n${people}`;
    })
    .join('\n\n');
}

function buildTicketPanel(guild) {
  const imageName = PANEL_IMAGES.ticket;
  const supportStatus = guild
    ? getSupportStatus(guild)
    : { emoji: '🟡', label: 'STAFF ONLINE', description: 'Status será atualizado quando o bot estiver ligado no servidor.', staffInSupport: [] };

  const staffText = buildSupportStaffText(supportStatus.staffInSupport || []);

  const embed = baseEmbed()
    .setColor(supportStatus.emoji === '🟢' ? 0x2ecc71 : supportStatus.emoji === '🟡' ? 0xf1c40f : 0xe74c3c)
    .setTitle('🎫 Central de Atendimento Sobreviventes Z')
    .setDescription([
      `${supportStatus.emoji} **${supportStatus.label}** — ${supportStatus.description}`,
      '',
      '**Como funciona o atendimento por voz:**',
      `1. Entre em **${CHANNELS.waitingRoom}**.`,
      '2. Se houver staff em um canal de atendimento livre, o bot te move automaticamente.',
      '3. Cada atendimento aceita vários staff, mas apenas **1 player** por vez.',
      '4. Para denúncias e bugs, use os painéis específicos abaixo.'
    ].join('\n'))
    .setImage(`attachment://${imageName}`)
    .addFields(
      { name: '🟢🟡🔴 Status', value: '🟢 staff no atendimento\n🟡 staff online fora do atendimento\n🔴 sem staff online', inline: false },
      { name: '👥 Atendendo agora', value: staffText, inline: false }
    );

  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(TICKET_TYPES.support.customId).setLabel(TICKET_TYPES.support.label).setEmoji(TICKET_TYPES.support.emoji).setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(TICKET_TYPES.vip.customId).setLabel(TICKET_TYPES.vip.label).setEmoji(TICKET_TYPES.vip.emoji).setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(TICKET_TYPES.base.customId).setLabel(TICKET_TYPES.base.label).setEmoji(TICKET_TYPES.base.emoji).setStyle(ButtonStyle.Secondary)
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(TICKET_TYPES.pvp.customId).setLabel(TICKET_TYPES.pvp.label).setEmoji(TICKET_TYPES.pvp.emoji).setStyle(ButtonStyle.Secondary)
  );

  return { embeds: [embed], components: [row1, row2], files: [panelImage(imageName)] };
}

module.exports = { buildTicketPanel };
