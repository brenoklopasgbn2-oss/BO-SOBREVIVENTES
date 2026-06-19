const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  PermissionFlagsBits
} = require('discord.js');
const Ticket = require('../database/models/Ticket');
const { STAFF_ROLES, TICKET_TYPES } = require('../config/constants');
const { baseEmbed, errorEmbed, successEmbed } = require('../utils/embeds');
const { resolveRoles, staffPermissionOverwrites } = require('../utils/permissions');
const { logEvent } = require('../utils/logger');
const { createTranscriptAttachment } = require('./transcript');

function buildTicketControls(ticketId) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`ticket_claim:${ticketId}`)
      .setLabel('Assumir Ticket')
      .setEmoji('🙋')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`ticket_transcript:${ticketId}`)
      .setLabel('Salvar Transcript')
      .setEmoji('🧾')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`ticket_close:${ticketId}`)
      .setLabel('Fechar Ticket')
      .setEmoji('🔒')
      .setStyle(ButtonStyle.Danger)
  );
}

function isStaffMember(member) {
  return member.roles.cache.some((role) => STAFF_ROLES.includes(role.name));
}

function canCloseTicket(member, ticket) {
  return isStaffMember(member) || member.id === ticket.ownerId;
}

async function openTicket(interaction, typeKey) {
  const ticketType = TICKET_TYPES[typeKey];
  if (!ticketType) {
    return interaction.reply({ embeds: [errorEmbed('Tipo de ticket inválido.')], ephemeral: true });
  }

  const existing = await Ticket.findOne({
    guildId: interaction.guild.id,
    ownerId: interaction.user.id,
    status: 'open'
  });

  if (existing) {
    return interaction.reply({
      embeds: [errorEmbed(`Você já possui um ticket aberto: <#${existing.channelId}>`)],
      ephemeral: true
    });
  }

  const categoryName = '🎫 SUPORTE';
  const category = interaction.guild.channels.cache.find(
    (channel) => channel.type === ChannelType.GuildCategory && channel.name === categoryName
  );

  const safeName = interaction.user.username.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 18) || 'usuario';
  const channel = await interaction.guild.channels.create({
    name: `ticket-${ticketType.name}-${safeName}`,
    type: ChannelType.GuildText,
    parent: category?.id,
    topic: `Ticket ${ticketType.label} aberto por ${interaction.user.tag} (${interaction.user.id})`,
    permissionOverwrites: [
      { id: interaction.guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
      {
        id: interaction.user.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
          PermissionFlagsBits.AttachFiles,
          PermissionFlagsBits.EmbedLinks
        ]
      },
      ...staffPermissionOverwrites(interaction.guild)
    ]
  });

  const ticket = await Ticket.create({
    guildId: interaction.guild.id,
    channelId: channel.id,
    ownerId: interaction.user.id,
    type: typeKey
  });

  const embed = baseEmbed()
    .setColor(ticketType.color)
    .setTitle(`${ticketType.emoji} Ticket de ${ticketType.label}`)
    .setDescription([
      `${interaction.user}, a equipe já pode acompanhar seu atendimento.`,
      '',
      'Explique o caso com detalhes e envie prints, vídeos, IDs ou horários quando necessário.'
    ].join('\n'))
    .addFields(
      { name: 'Autor', value: `${interaction.user} (${interaction.user.id})`, inline: true },
      { name: 'Categoria', value: ticketType.label, inline: true },
      { name: 'Status', value: 'Aberto', inline: true }
    );

  await channel.send({
    content: `${interaction.user} ${resolveRoles(interaction.guild, STAFF_ROLES).join(' ')}`,
    embeds: [embed],
    components: [buildTicketControls(ticket.id)]
  });

  await logEvent(interaction.guild, 'ticket_opened', '🎫 Ticket aberto', `${interaction.user} abriu ${channel}.`, [
    { name: 'Tipo', value: ticketType.label, inline: true },
    { name: 'Canal', value: `${channel}`, inline: true }
  ]);

  return interaction.reply({
    embeds: [successEmbed(`Ticket criado com sucesso: ${channel}`)],
    ephemeral: true
  });
}

async function claimTicket(interaction, ticketId) {
  const ticket = await Ticket.findById(ticketId);
  if (!ticket || ticket.status !== 'open') {
    return interaction.reply({ embeds: [errorEmbed('Ticket não encontrado ou já fechado.')], ephemeral: true });
  }

  if (!isStaffMember(interaction.member)) {
    return interaction.reply({ embeds: [errorEmbed('Apenas a equipe pode assumir tickets.')], ephemeral: true });
  }

  if (ticket.claimedById) {
    return interaction.reply({
      embeds: [errorEmbed(`Esse ticket já foi assumido por <@${ticket.claimedById}>.`)],
      ephemeral: true
    });
  }

  ticket.claimedById = interaction.user.id;
  await ticket.save();

  await interaction.reply({
    embeds: [successEmbed(`${interaction.user} assumiu este ticket.`)]
  });

  await logEvent(interaction.guild, 'ticket_claimed', '🙋 Ticket assumido', `${interaction.user} assumiu <#${ticket.channelId}>.`);
}

async function saveTranscript(interaction, ticketId, closeAfter = false) {
  const ticket = await Ticket.findById(ticketId);
  if (!ticket) {
    return interaction.reply({ embeds: [errorEmbed('Ticket não encontrado.')], ephemeral: true });
  }

  if (!isStaffMember(interaction.member)) {
    return interaction.reply({ embeds: [errorEmbed('Apenas a equipe pode salvar transcripts.')], ephemeral: true });
  }

  await interaction.deferReply({ ephemeral: true });
  const attachment = await createTranscriptAttachment(interaction.channel);
  const logChannel = interaction.guild.channels.cache.find((channel) => channel.name === 'logs-staff');

  if (logChannel?.isTextBased()) {
    const message = await logChannel.send({
      embeds: [
        baseEmbed()
          .setTitle('🧾 Transcript salvo')
          .setDescription(`Transcript do ticket <#${ticket.channelId}> salvo por ${interaction.user}.`)
          .addFields(
            { name: 'Autor do ticket', value: `<@${ticket.ownerId}>`, inline: true },
            { name: 'Status', value: closeAfter ? 'Fechado' : 'Aberto', inline: true }
          )
      ],
      files: [attachment]
    });
    ticket.transcriptUrl = message.attachments.first()?.url || null;
    await ticket.save();
  }

  await interaction.editReply({ embeds: [successEmbed('Transcript salvo em logs-staff.')] });
}

async function closeTicket(interaction, ticketId) {
  const ticket = await Ticket.findById(ticketId);
  if (!ticket || ticket.status !== 'open') {
    return interaction.reply({ embeds: [errorEmbed('Ticket não encontrado ou já fechado.')], ephemeral: true });
  }

  if (!canCloseTicket(interaction.member, ticket)) {
    return interaction.reply({ embeds: [errorEmbed('Apenas o autor ou a equipe pode fechar este ticket.')], ephemeral: true });
  }

  if (isStaffMember(interaction.member)) {
    await saveTranscript(interaction, ticketId, true);
  } else {
    await interaction.deferReply({ ephemeral: true });
    await interaction.editReply({ embeds: [successEmbed('Ticket fechado. A equipe ainda poderá consultar os logs do canal se necessário.')] });
  }

  await Ticket.updateOne(
    { _id: ticket.id },
    { $set: { status: 'closed', closedById: interaction.user.id } }
  );

  await logEvent(interaction.guild, 'ticket_closed', '🔒 Ticket fechado', `${interaction.user} fechou <#${ticket.channelId}>.`, [
    { name: 'Autor', value: `<@${ticket.ownerId}>`, inline: true }
  ]);

  await interaction.channel.send({ embeds: [successEmbed('Ticket fechado. Este canal será removido em 10 segundos.')] });
  setTimeout(() => interaction.channel.delete('Ticket fechado').catch(() => null), 10000);
}

module.exports = { openTicket, claimTicket, saveTranscript, closeTicket };
