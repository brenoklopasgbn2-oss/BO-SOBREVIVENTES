const path = require('path');
const { ActionRowBuilder, AttachmentBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { CHANNELS, PANEL_IMAGES, TICKET_TYPES } = require('../config/constants');
const { baseEmbed } = require('../utils/embeds');
const { getMainStaffRole, getSupportStatus } = require('./supportStatus');

function panelImage(fileName) {
  return new AttachmentBuilder(path.join(process.cwd(), 'assets', 'painels', fileName));
}

function buildSupportStaffText(staffInSupport = []) {
  if (!staffInSupport.length) return 'Ninguém está em atendimento por voz agora.';

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
      return `🎧 **${channelName}**
${people}`;
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
    .setTitle('🎧 Central de Atendimento • CHAMPIONS Z')
    .setDescription([
      `${supportStatus.emoji} **Status atual:** **${supportStatus.label}**`,
      `${supportStatus.description}`,
      '',
      'Abra o ticket correto pelos botões abaixo ou use o atendimento por voz quando precisar.'
    ].join('\n'))
    .addFields(
      {
        name: '🎙️ Atendimento por voz',
        value: [
          `1. Entre em **${CHANNELS.waitingRoom}**.`,
          '2. Se houver staff em sala livre, o bot move você automaticamente.',
          '3. Nos atendimentos padrão entra **1 player por vez**.',
          '4. O canal **atendimento ADM** é para puxada manual da administração.'
        ].join('\n'),
        inline: false
      },
      {
        name: '📂 Tipos de ticket',
        value: [
          '🎧 **Suporte Geral**',
          '💰 **Loja / Doações**',
          '🏠 **Problema em Base**',
          '⚔️ **Report PvP**'
        ].join('\n'),
        inline: true
      },
      {
        name: '🟢🟡🔴 Leitura do status',
        value: [
          '🟢 Staff em atendimento',
          '🟡 Staff online fora do atendimento',
          '🔴 Sem staff online'
        ].join('\n'),
        inline: true
      },
      {
        name: '👥 Equipe atendendo agora',
        value: staffText,
        inline: false
      }
    )
    .setImage(`attachment://${imageName}`)
    .setFooter({ text: 'CHAMPIONS Z • Abra seu ticket e aguarde a equipe' });

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
