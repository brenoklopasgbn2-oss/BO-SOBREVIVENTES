const path = require('path');
const { ActionRowBuilder, AttachmentBuilder, ButtonBuilder, ButtonStyle, ChannelType, ModalBuilder, PermissionFlagsBits, TextInputBuilder, TextInputStyle } = require('discord.js');
const { CATEGORY_NAMES, CHANNELS, ROLE_NAMES, STAFF_ROLES, TICKET_TYPES } = require('../config/constants');
const { baseEmbed, errorEmbed, successEmbed } = require('../utils/embeds');
const { resolveRoles, staffPermissionOverwrites } = require('../utils/permissions');
const { logEvent } = require('../utils/logger');
const { getMainStaffRole } = require('../panels/supportStatus');
const { createTranscriptAttachment } = require('./transcript');
const { recordTicketAnswered } = require('../stats/staffStats');
const { getProfile, saveGameNickname } = require('./ticketProfileStore');

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
    { roleName: ROLE_NAMES.vanillaPlus, emoji: '🔴', prefix: '🔴', label: 'Vanilla+' },
    { roleName: ROLE_NAMES.vanilla, emoji: '🔴', prefix: '🔴', label: 'Vanilla' }
  ];

  return servers.find((server) => member.roles.cache.some((role) => role.name === server.roleName)) || { roleName: null, emoji: '🔴', prefix: '🔴', label: 'RAID-Z Vanilla' };
}

function parseTicketTopic(topic = '') {
  const ownerId = topic.match(/OWNER_ID:(\d+)/)?.[1] || null;
  const type = topic.match(/TYPE:([a-z_]+)/)?.[1] || null;
  const claimedById = topic.match(/(?:^|\|)CLAIMED_BY:(\d+)/)?.[1] || null;
  return { ownerId, type, claimedById };
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

function normalizeGameNickname(value = '') {
  return String(value).replace(/\s+/g, ' ').trim().slice(0, 32);
}

function normalizeTicketReason(value = '') {
  return String(value).replace(/\r\n/g, '\n').trim().slice(0, 1000);
}


function formatDateTime(date) {
  try {
    return new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  } catch {
    return date?.toLocaleString?.('pt-BR') || 'Horário não disponível';
  }
}

function truncateText(value = '', maxLength = 950) {
  const text = String(value).trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, Math.max(0, maxLength - 3))}...`;
}

async function getLastStaffReplies(channel, limit = 5) {
  const messages = await channel.messages.fetch({ limit: 100 }).catch(() => null);
  if (!messages) return [];

  return [...messages.values()]
    .filter((message) => {
      if (!message.author || message.author.bot) return false;
      const member = message.member || channel.guild.members.cache.get(message.author.id);
      return isStaffMember(member);
    })
    .sort((a, b) => a.createdTimestamp - b.createdTimestamp)
    .slice(-limit);
}

function replyFieldValue(message) {
  const parts = [];
  const content = String(message.content || '').trim();
  if (content) parts.push(content);

  const attachmentLinks = [...message.attachments.values()].map((attachment) => attachment.url).filter(Boolean);
  if (attachmentLinks.length) {
    parts.push(`📎 ${attachmentLinks.join('\n📎 ')}`);
  }

  if (!parts.length && message.embeds?.length) {
    const embedTexts = message.embeds
      .flatMap((embed) => [embed.title, embed.description])
      .filter(Boolean)
      .join('\n');
    if (embedTexts) parts.push(embedTexts);
  }

  return truncateText(parts.join('\n') || 'Mensagem sem texto.', 1000);
}

async function sendLastStaffRepliesToOwner(channel, ownerId, closedBy) {
  const owner = await channel.client.users.fetch(ownerId).catch(() => null);
  if (!owner) return { sent: false, reason: 'owner_not_found' };

  const replies = await getLastStaffReplies(channel, 5);
  const embed = baseEmbed()
    .setColor(0x3498db)
    .setTitle('📩 Resumo do seu ticket')
    .setDescription([
      `O ticket **#${channel.name}** foi fechado por **${closedBy.displayName || closedBy.user?.username || 'um membro da equipe'}**.`,
      '',
      replies.length
        ? 'Abaixo estão as últimas respostas enviadas pela administração:'
        : 'Não foi encontrada nenhuma resposta da administração nas últimas mensagens do ticket.'
    ].join('\n'))
    .setTimestamp();

  replies.forEach((message, index) => {
    const staffName = message.member?.displayName || message.author.globalName || message.author.username;
    embed.addFields({
      name: `${index + 1}. ${staffName} • ${formatDateTime(message.createdAt)}`,
      value: replyFieldValue(message),
      inline: false
    });
  });

  const sent = await owner.send({
    embeds: [embed],
    allowedMentions: { parse: [], users: [], roles: [], repliedUser: false }
  }).then(() => true).catch(() => false);

  return { sent, reason: sent ? null : 'dm_closed' };
}

async function showTicketForm(interaction, typeKey) {
  const ticketType = TICKET_TYPES[typeKey];
  if (!ticketType) return interaction.reply({ embeds: [errorEmbed('Tipo de ticket inválido.')], ephemeral: true });

  const existing = findOpenTicketByOwner(interaction.guild, interaction.user.id);
  if (existing) {
    return interaction.reply({ embeds: [errorEmbed(`Você já possui um ticket aberto: <#${existing.id}>`)], ephemeral: true });
  }

  const profile = getProfile(interaction.guild.id, interaction.user.id);
  const savedNickname = normalizeGameNickname(profile?.gameNickname || '');
  const modal = new ModalBuilder()
    .setCustomId(`ticket_form:${typeKey}`)
    .setTitle(`Abrir ticket: ${ticketType.label}`.slice(0, 45));

  if (!savedNickname) {
    const nicknameInput = new TextInputBuilder()
      .setCustomId('game_nickname')
      .setLabel('Qual é seu nick dentro do jogo?')
      .setPlaceholder('Digite exatamente como aparece no DayZ')
      .setStyle(TextInputStyle.Short)
      .setMinLength(2)
      .setMaxLength(32)
      .setRequired(true);

    modal.addComponents(new ActionRowBuilder().addComponents(nicknameInput));
  }

  const reasonInput = new TextInputBuilder()
    .setCustomId('ticket_reason')
    .setLabel('O que você precisa?')
    .setPlaceholder('Explique o problema, pedido ou denúncia com detalhes')
    .setStyle(TextInputStyle.Paragraph)
    .setMinLength(10)
    .setMaxLength(1000)
    .setRequired(true);

  modal.addComponents(new ActionRowBuilder().addComponents(reasonInput));
  return interaction.showModal(modal);
}

async function submitTicketForm(interaction, typeKey) {
  const ticketType = TICKET_TYPES[typeKey];
  if (!ticketType) return interaction.reply({ embeds: [errorEmbed('Tipo de ticket inválido.')], ephemeral: true });

  const existing = findOpenTicketByOwner(interaction.guild, interaction.user.id);
  if (existing) {
    return interaction.reply({ embeds: [errorEmbed(`Você já possui um ticket aberto: <#${existing.id}>`)], ephemeral: true });
  }

  const profile = getProfile(interaction.guild.id, interaction.user.id);
  const savedNickname = normalizeGameNickname(profile?.gameNickname || '');
  let submittedNickname = '';
  try {
    submittedNickname = normalizeGameNickname(interaction.fields.getTextInputValue('game_nickname'));
  } catch {
    submittedNickname = '';
  }
  const gameNickname = savedNickname || submittedNickname;
  const ticketReason = normalizeTicketReason(interaction.fields.getTextInputValue('ticket_reason'));

  if (gameNickname.length < 2) {
    return interaction.reply({ embeds: [errorEmbed('Informe um nick válido do jogo para abrir o ticket.')], ephemeral: true });
  }

  if (ticketReason.length < 10) {
    return interaction.reply({ embeds: [errorEmbed('Explique com mais detalhes o que você precisa.')], ephemeral: true });
  }

  await interaction.deferReply({ ephemeral: true });

  if (!savedNickname) {
    const nicknameSaved = saveGameNickname(interaction.guild.id, interaction.user.id, gameNickname);
    if (!nicknameSaved) {
      return interaction.editReply({ embeds: [errorEmbed('Não consegui salvar seu nick. Tente abrir o ticket novamente.') ] });
    }
  }

  const category = interaction.guild.channels.cache.find((channel) => channel.type === ChannelType.GuildCategory && channel.name === CATEGORY_NAMES.ticketsOpen)
    || interaction.guild.channels.cache.find((channel) => channel.type === ChannelType.GuildCategory && channel.name === CATEGORY_NAMES.support);

  const serverInfo = getMemberServerInfo(interaction.member);
  const safeName = interaction.user.username.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 16) || 'usuario';
  const channel = await interaction.guild.channels.create({
    name: `${serverInfo.prefix}-ticket-${ticketType.name}-${safeName}`,
    type: ChannelType.GuildText,
    parent: category?.id,
    topic: `RAIDZ_TICKET|OWNER_ID:${interaction.user.id}|TYPE:${typeKey}|SERVER:${serverInfo.label}|STATUS:OPEN`,
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
      'O seu **nick do jogo ficou salvo**. Nos próximos tickets, você só precisará explicar o que precisa.',
      'Envie prints, vídeos, IDs, horários e outras provas neste canal quando necessário.'
    ].join('\n'))
    .setImage(`attachment://${imageName}`)
    .addFields(
      { name: '👤 Autor', value: `${interaction.user} (${interaction.user.id})`, inline: false },
      { name: '🎮 Nick no jogo', value: gameNickname, inline: true },
      { name: '📂 Categoria', value: ticketType.label, inline: true },
      { name: `${serverInfo.emoji} Servidor`, value: serverInfo.label, inline: true },
      { name: '📝 O que o player precisa', value: ticketReason, inline: false },
      { name: '📌 Status', value: 'Aberto', inline: true }
    );

  await channel.send({
    content: `${interaction.user} ${resolveRoles(interaction.guild, STAFF_ROLES).join(' ')}`,
    embeds: [embed],
    components: [buildTicketControls(channel.id)],
    files: [panelImage(imageName)]
  });

  await logEvent(interaction.guild, 'ticket_opened', '🎫 Ticket aberto', `${interaction.user} abriu ${channel}.`, [
    { name: 'Nick no jogo', value: gameNickname, inline: true },
    { name: 'Tipo', value: ticketType.label, inline: true },
    { name: 'Servidor', value: `${serverInfo.emoji} ${serverInfo.label}`, inline: true },
    { name: 'Motivo informado', value: ticketReason, inline: false },
    { name: 'Canal', value: `${channel}`, inline: true }
  ]);

  return interaction.editReply({ embeds: [successEmbed(`Ticket criado com sucesso: ${channel}`)] });
}

async function openTicket(interaction, typeKey) {
  return showTicketForm(interaction, typeKey);
}

async function claimTicket(interaction, channelId) {
  const channel = await resolveTicketChannel(interaction, channelId);
  if (!channel) return interaction.reply({ embeds: [errorEmbed('Ticket não encontrado.')], ephemeral: true });
  if (!isStaffMember(interaction.member)) return interaction.reply({ embeds: [errorEmbed('Apenas a equipe pode assumir tickets.')], ephemeral: true });

  const data = parseTicketTopic(channel.topic || '');
  if (data.claimedById) {
    return interaction.reply({ embeds: [errorEmbed(`Esse ticket já foi assumido por <@${data.claimedById}>.`)], ephemeral: true });
  }

  await channel.setTopic(setTopicField(channel.topic || '', 'CLAIMED_BY', interaction.user.id)).catch(() => null);
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

  // Antes de apagar o canal, envia por DM ao dono as 5 últimas respostas da equipe.
  const dmResult = await sendLastStaffRepliesToOwner(channel, ticketData.ownerId, interaction.member);

  await logEvent(interaction.guild, 'ticket_closed', '🔒 Ticket fechado', `${interaction.user} fechou ${channel}.`, [
    { name: 'Autor', value: `<@${ticketData.ownerId}>`, inline: true },
    { name: 'Resumo enviado por DM', value: dmResult.sent ? 'Sim' : 'Não foi possível (DM fechada ou usuário indisponível)', inline: true }
  ]);

  await channel.send({
    embeds: [successEmbed(dmResult.sent
      ? 'Ticket fechado. As últimas respostas da administração foram enviadas ao player por mensagem privada. Este canal será removido em 10 segundos.'
      : 'Ticket fechado. Não foi possível enviar mensagem privada ao player. Este canal será removido em 10 segundos.')]
  }).catch(() => null);

  setTimeout(() => channel.delete('Ticket fechado').catch(() => null), 10000);
}

module.exports = { openTicket, submitTicketForm, claimTicket, saveTranscript, closeTicket };
