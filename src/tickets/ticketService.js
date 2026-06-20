const path = require('path');
const { ActionRowBuilder, AttachmentBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionFlagsBits } = require('discord.js');
const { CATEGORY_NAMES, CHANNELS, ROLE_NAMES, STAFF_ROLES, TICKET_TYPES } = require('../config/constants');
const { baseEmbed, errorEmbed, successEmbed } = require('../utils/embeds');
const { resolveRoles, staffPermissionOverwrites } = require('../utils/permissions');
const { logEvent } = require('../utils/logger');
const { getMainStaffRole } = require('../panels/supportStatus');
const { createTranscriptAttachment } = require('./transcript');
const { recordTicketAnswered } = require('../stats/staffStats');

function buildTicketControls(channelId) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`ticket_claim:${channelId}`).setLabel('Assumir Ticket').setEmoji('🙋').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`ticket_transcript:${channelId}`).setLabel('Salvar Transcript').setEmoji('🧾').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`ticket_close:${channelId}`).setLabel('Fechar Ticket').setEmoji('🔒').setStyle(ButtonStyle.Danger)
  );
}

function isStaffMember(member) {
  return member.roles.cache.some((role) => STAFF_ROLES.includes(role.name));
}

function panelImage(fileName) {
  return new AttachmentBuilder(path.join(process.cwd(), 'assets', 'painels', fileName));
}

function getMemberServerInfo(member) {
  const servers = [
    { roleName: ROLE_NAMES.vanilla, emoji: '🔴', prefix: '🔴', label: 'Vanilla' },
    { roleName: ROLE_NAMES.bbp, emoji: '🔵', prefix: '🔵', label: 'BBP' },
    { roleName: ROLE_NAMES.deathmatch, emoji: '🌈', prefix: '🌈', label: 'Deathmatch' }
  ];

  return servers.find((server) => member.roles.cache.some((role) => role.name === server.roleName)) || { roleName: null, emoji: '⚪', prefix: '⚪', label: 'Sem servidor escolhido' };
}

function parseTicketTopic(topic = '') {
  const ownerId = topic.match(/OWNER_ID:(\d+)/)?.[1] || null;
  const type = topic.match(/TYPE:([a-z_]+)/)?.[1] || null;
  const claimedById = topic.match(/CLAIMED_BY:(\d+)/)?.[1] || null;
  return { ownerId, type, claimedById };
}

function findOpenTicketByOwner(guild, ownerId) {
  return guild.channels.cache.find((channel) => channel.type === ChannelType.GuildText && channel.name.includes('ticket-') && parseTicketTopic(channel.topic || '').ownerId === ownerId);
}

async function resolveTicketChannel(interaction, channelId) {
  if (interaction.channel?.id === channelId) return interaction.channel;
  return interaction.guild.channels.fetch(channelId).catch(() => null);
}

function canCloseTicket(member, ownerId) {
  return isStaffMember(member) || member.id === ownerId;
}

async function openTicket(interaction, typeKey) {
  const ticketType = TICKET_TYPES[typeKey];
  if (!ticketType) return interaction.reply({ embeds: [errorEmbed('Tipo de ticket inválido.')], ephemeral: true });

  const existing = findOpenTicketByOwner(interaction.guild, interaction.user.id);
  if (existing) {
    return interaction.reply({ embeds: [errorEmbed(`Você já possui um ticket aberto: <#${existing.id}>`)], ephemeral: true });
  }

  const category = interaction.guild.channels.cache.find((channel) => channel.type === ChannelType.GuildCategory && channel.name === CATEGORY_NAMES.ticketsOpen)
    || interaction.guild.channels.cache.find((channel) => channel.type === ChannelType.GuildCategory && channel.name === CATEGORY_NAMES.support);

  const serverInfo = getMemberServerInfo(interaction.member);
  const safeName = interaction.user.username.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 16) || 'usuario';
  const channel = await interaction.guild.channels.create({
    name: `${serverInfo.prefix}-ticket-${ticketType.name}-${safeName}`,
    type: ChannelType.GuildText,
    parent: category?.id,
    topic: `SZ_TICKET|OWNER_ID:${interaction.user.id}|TYPE:${typeKey}|SERVER:${serverInfo.label}|STATUS:OPEN`,
    permissionOverwrites: [
      { id: interaction.guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
      {
        id: interaction.user.id,
        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AttachFiles, PermissionFlagsBits.EmbedLinks]
      },
      ...staffPermissionOverwrites(interaction.guild)
    ]
  });

  const imageName = ticketType.image;
  const embed = baseEmbed()
    .setColor(ticketType.color)
    .setTitle(`${ticketType.emoji} Ticket de ${ticketType.label}`)
    .setDescription([
      `${interaction.user}, seu ticket foi criado com sucesso e a equipe já pode acompanhar o atendimento.`,
      `${serverInfo.emoji} **Servidor detectado:** ${serverInfo.label}.`,
      '',
      'Envie **todas as informações importantes**, como prints, vídeos, IDs, nomes, horários e detalhes do ocorrido.',
      'Isso ajuda a equipe a responder muito mais rápido.'
    ].join('\n'))
    .setImage(`attachment://${imageName}`)
    .addFields(
      { name: '👤 Autor', value: `${interaction.user} (${interaction.user.id})`, inline: false },
      { name: '📂 Categoria', value: ticketType.label, inline: true },
      { name: `${serverInfo.emoji} Servidor`, value: serverInfo.label, inline: true },
      { name: '📌 Status', value: 'Aberto', inline: true }
    );

  await channel.send({
    content: `${interaction.user} ${resolveRoles(interaction.guild, STAFF_ROLES).join(' ')}`,
    embeds: [embed],
    components: [buildTicketControls(channel.id)],
    files: [panelImage(imageName)]
  });

  await logEvent(interaction.guild, 'ticket_opened', '🎫 Ticket aberto', `${interaction.user} abriu ${channel}.`, [
    { name: 'Tipo', value: ticketType.label, inline: true },
    { name: 'Servidor', value: `${serverInfo.emoji} ${serverInfo.label}`, inline: true },
    { name: 'Canal', value: `${channel}`, inline: true }
  ]);

  return interaction.reply({ embeds: [successEmbed(`Ticket criado com sucesso: ${channel}`)], ephemeral: true });
}

async function claimTicket(interaction, channelId) {
  const channel = await resolveTicketChannel(interaction, channelId);
  if (!channel) return interaction.reply({ embeds: [errorEmbed('Ticket não encontrado.')], ephemeral: true });
  if (!isStaffMember(interaction.member)) return interaction.reply({ embeds: [errorEmbed('Apenas a equipe pode assumir tickets.')], ephemeral: true });

  const data = parseTicketTopic(channel.topic || '');
  if (data.claimedById) {
    return interaction.reply({ embeds: [errorEmbed(`Esse ticket já foi assumido por <@${data.claimedById}>.`)], ephemeral: true });
  }

  await channel.setTopic(`${channel.topic || ''}|CLAIMED_BY:${interaction.user.id}`.slice(0, 1024)).catch(() => null);
  recordTicketAnswered(interaction.member, channel.id);
  const roleName = getMainStaffRole(interaction.member);
  await interaction.reply({ embeds: [successEmbed(`${interaction.user} assumiu este ticket como **${roleName.toUpperCase()}**.`)] });
  await logEvent(interaction.guild, 'ticket_claimed', '🙋 Ticket assumido', `${interaction.user} assumiu ${channel}.`, [
    { name: 'Cargo', value: roleName, inline: true }
  ]);
}

async function saveTranscript(interaction, channelId, closeAfter = false) {
  const channel = await resolveTicketChannel(interaction, channelId);
  if (!channel) return interaction.reply({ embeds: [errorEmbed('Ticket não encontrado.')], ephemeral: true });
  if (!isStaffMember(interaction.member)) return interaction.reply({ embeds: [errorEmbed('Apenas a equipe pode salvar transcripts.')], ephemeral: true });

  await interaction.deferReply({ ephemeral: true });
  const attachment = await createTranscriptAttachment(channel);
  const logChannel = interaction.guild.channels.cache.find((item) => item.name === CHANNELS.logsStaff);
  const ticketData = parseTicketTopic(channel.topic || '');

  if (logChannel?.isTextBased()) {
    await logChannel.send({
      embeds: [baseEmbed().setTitle('🧾 Transcript salvo').setDescription(`Transcript do ticket ${channel} salvo por ${interaction.user}.`).addFields(
        { name: 'Autor do ticket', value: ticketData.ownerId ? `<@${ticketData.ownerId}>` : 'Não identificado', inline: true },
        { name: 'Status', value: closeAfter ? 'Fechado' : 'Aberto', inline: true }
      )],
      files: [attachment]
    });
  }

  await interaction.editReply({ embeds: [successEmbed('Transcript salvo em logs-staff.')] });
}

async function closeTicket(interaction, channelId) {
  const channel = await resolveTicketChannel(interaction, channelId);
  if (!channel) return interaction.reply({ embeds: [errorEmbed('Ticket não encontrado ou já fechado.')], ephemeral: true });

  const ticketData = parseTicketTopic(channel.topic || '');
  if (!ticketData.ownerId) return interaction.reply({ embeds: [errorEmbed('Não consegui identificar o dono deste ticket.')], ephemeral: true });
  if (!canCloseTicket(interaction.member, ticketData.ownerId)) return interaction.reply({ embeds: [errorEmbed('Apenas o autor ou a equipe pode fechar este ticket.')], ephemeral: true });

  if (isStaffMember(interaction.member)) {
    await saveTranscript(interaction, channelId, true);
  } else {
    await interaction.deferReply({ ephemeral: true });
    await interaction.editReply({ embeds: [successEmbed('Ticket fechado. A equipe ainda poderá consultar os logs do canal se necessário.')] });
  }

  await logEvent(interaction.guild, 'ticket_closed', '🔒 Ticket fechado', `${interaction.user} fechou ${channel}.`, [{ name: 'Autor', value: `<@${ticketData.ownerId}>`, inline: true }]);
  await channel.send({ embeds: [successEmbed('Ticket fechado. Este canal será removido em 10 segundos.')] }).catch(() => null);
  setTimeout(() => channel.delete('Ticket fechado').catch(() => null), 10000);
}

module.exports = { openTicket, claimTicket, saveTranscript, closeTicket };
