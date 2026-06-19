const path = require('path');
const { ActionRowBuilder, AttachmentBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { CHANNELS, PANEL_IMAGES, TICKET_TYPES } = require('../config/constants');
const { baseEmbed } = require('../utils/embeds');
const { getMainStaffRole, getSupportStatus } = require('./supportStatus');

function panelImage(fileName) {
  return new AttachmentBuilder(path.join(process.cwd(), 'assets', 'painels', fileName));
}

function buildTicketPanel(guild) {
  const imageName = PANEL_IMAGES.ticket;
  const supportStatus = guild
    ? getSupportStatus(guild)
    : { emoji: '🟡', label: 'STAFF ONLINE', description: 'Status será atualizado quando o bot estiver ligado no servidor.', staffInSupport: [] };

  const staffText = supportStatus.staffInSupport?.length
    ? supportStatus.staffInSupport.map((member) => `• ${member.user} — ${getMainStaffRole(member)} em **${member.voice.channel.name}**`).join('\n')
    : 'Nenhum staff dentro do atendimento por voz agora.';

  const embed = baseEmbed()
    .setColor(supportStatus.emoji === '🟢' ? 0x2ecc71 : supportStatus.emoji === '🟡' ? 0xf1c40f : 0xe74c3c)
    .setTitle('🎫 Central de Atendimento Sobreviventes Z')
    .setDescription([
      `${supportStatus.emoji} **${supportStatus.label}**`,
      `${supportStatus.description}`,
      '',
      '**Legenda das bolinhas:**',
      '🟢 **Atendimento ON** — tem staff dentro dos canais de atendimento.',
      '🟡 **Staff online** — tem staff online, mas fora do atendimento por voz.',
      '🔴 **Sem staff online** — nenhum staff online no Discord.',
      '',
      'Abra o atendimento correto para falar com a equipe da comunidade.',
      'Aqui você pode abrir tickets de **suporte geral**, **loja / doações**, **problemas em base** e **report PvP**.',
      'Para **denúncias** e **bugs**, use os canais próprios logo abaixo com painéis específicos.'
    ].join('\n'))
    .setImage(`attachment://${imageName}`)
    .addFields(
      { name: '👥 Quem está atendendo', value: staffText, inline: false },
      { name: '🎧 Atendimento', value: 'Suporte humano, rápido e organizado.', inline: true },
      { name: '📂 Tickets', value: 'Cada ticket é separado em categoria própria.', inline: true },
      { name: '🎙️ Voz', value: `Entre em ${CHANNELS.waitingRoom} para atendimento por voz.`, inline: false }
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
