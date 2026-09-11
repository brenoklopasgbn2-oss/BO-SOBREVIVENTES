const path = require('path');
const {
  AttachmentBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  PermissionFlagsBits
} = require('discord.js');
const { CHANNELS, PANEL_IMAGES, OWNER_IDS, ROLE_NAMES } = require('../config/constants');
const { baseEmbed, errorEmbed, successEmbed } = require('../utils/embeds');
const { logEvent } = require('../utils/logger');

const MANAGED_BAN_PREFIX = '[CHAMPIONS_Z_PANEL]';
const managedBanTargets = new Set();

function markManagedBanTarget(userId) {
  managedBanTargets.add(String(userId));
  const timer = setTimeout(() => managedBanTargets.delete(String(userId)), 15000);
  timer.unref?.();
}

function consumeManagedBanTarget(userId) {
  const key = String(userId);
  const found = managedBanTargets.has(key);
  if (found) managedBanTargets.delete(key);
  return found;
}

function localImage(fileName) {
  return new AttachmentBuilder(path.join(process.cwd(), 'assets', 'painels', fileName));
}

function isAdminForBan(member) {
  if (!member) return false;
  if (OWNER_IDS.includes(member.id)) return true;
  if (!member.permissions?.has(PermissionFlagsBits.BanMembers)) return false;
  return member.roles?.cache?.some((role) => [ROLE_NAMES.founder, ROLE_NAMES.admin].includes(role.name));
}

function buildAdminBanModal(targetUser) {
  const steam = new TextInputBuilder()
    .setCustomId('ban_steam64')
    .setLabel('Steam64 do jogador')
    .setPlaceholder('Ex.: 7656119XXXXXXXXXX')
    .setStyle(TextInputStyle.Short)
    .setMinLength(17)
    .setMaxLength(17)
    .setRequired(true);

  const nickname = new TextInputBuilder()
    .setCustomId('ban_nickname')
    .setLabel('Nick do jogador no DayZ')
    .setPlaceholder('Nick usado no servidor')
    .setStyle(TextInputStyle.Short)
    .setMinLength(1)
    .setMaxLength(64)
    .setRequired(true);

  const reason = new TextInputBuilder()
    .setCustomId('ban_reason')
    .setLabel('Motivo do banimento')
    .setPlaceholder('Descreva o motivo de forma clara...')
    .setStyle(TextInputStyle.Paragraph)
    .setMinLength(3)
    .setMaxLength(500)
    .setRequired(true);

  return new ModalBuilder()
    .setCustomId(`admin_ban_form:${targetUser.id}`)
    .setTitle(`Banir ${targetUser.username}`.slice(0, 45))
    .addComponents(
      new ActionRowBuilder().addComponents(steam),
      new ActionRowBuilder().addComponents(nickname),
      new ActionRowBuilder().addComponents(reason)
    );
}

function makeAuditReason({ moderator, steam64, nickname, reason }) {
  const full = `${MANAGED_BAN_PREFIX} Steam64=${steam64} | Nick=${nickname} | Motivo=${reason} | ADM=${moderator.tag}`;
  return full.slice(0, 510);
}

function isManagedBanReason(reason = '') {
  return String(reason || '').startsWith(MANAGED_BAN_PREFIX);
}

async function submitAdminBan(interaction, targetUserId) {
  if (!interaction.guild || !interaction.member) {
    return interaction.reply({ embeds: [errorEmbed('Este comando só pode ser usado dentro do servidor.')], ephemeral: true });
  }

  if (!isAdminForBan(interaction.member)) {
    return interaction.reply({ embeds: [errorEmbed('Apenas **Fundador/Administrador** com permissão de ban pode usar este painel.')], ephemeral: true });
  }

  const steam64 = interaction.fields.getTextInputValue('ban_steam64').trim();
  const nickname = interaction.fields.getTextInputValue('ban_nickname').trim();
  const reason = interaction.fields.getTextInputValue('ban_reason').trim();

  if (!/^\d{17}$/.test(steam64)) {
    return interaction.reply({ embeds: [errorEmbed('O Steam64 precisa ter exatamente **17 números**.')], ephemeral: true });
  }

  if (!nickname || nickname.length > 64) {
    return interaction.reply({ embeds: [errorEmbed('Informe um nick válido do jogador.')], ephemeral: true });
  }

  if (!reason || reason.length < 3) {
    return interaction.reply({ embeds: [errorEmbed('Informe um motivo válido para o banimento.')], ephemeral: true });
  }

  if (targetUserId === interaction.user.id) {
    return interaction.reply({ embeds: [errorEmbed('Você não pode banir a si mesmo por este painel.')], ephemeral: true });
  }

  if (targetUserId === interaction.guild.ownerId) {
    return interaction.reply({ embeds: [errorEmbed('O dono do servidor não pode ser banido pelo bot.')], ephemeral: true });
  }

  await interaction.deferReply({ ephemeral: true });

  const targetUser = await interaction.client.users.fetch(targetUserId).catch(() => null);
  if (!targetUser) {
    return interaction.editReply({ embeds: [errorEmbed('Não consegui localizar o usuário do Discord informado.')] });
  }

  const targetMember = await interaction.guild.members.fetch(targetUserId).catch(() => null);
  if (targetMember && !targetMember.bannable) {
    return interaction.editReply({ embeds: [errorEmbed('Não consigo banir esse usuário. Verifique a hierarquia dos cargos e a permissão **Banir membros** do bot.')] });
  }

  const auditReason = makeAuditReason({
    moderator: interaction.user,
    steam64,
    nickname,
    reason
  });

  markManagedBanTarget(targetUserId);
  try {
    await interaction.guild.members.ban(targetUserId, {
      deleteMessageSeconds: 0,
      reason: auditReason
    });
  } catch (error) {
    managedBanTargets.delete(String(targetUserId));
    console.error('Erro ao aplicar ban pelo painel:', error);
    return interaction.editReply({ embeds: [errorEmbed('O Discord recusou o banimento. Verifique permissões e hierarquia do bot.')] });
  }

  const banChannel = interaction.guild.channels.cache.find(
    (channel) => channel.name === CHANNELS.bans && channel.isTextBased?.()
  );

  let published = false;
  if (banChannel) {
    const imageName = PANEL_IMAGES.banApplied;
    const embed = baseEmbed()
      .setColor(0xc0392b)
      .setTitle('🚫 BANIMENTO APLICADO • CHAMPIONS Z')
      .setDescription([
        `O jogador **${nickname}** foi removido da comunidade e banido do Discord.`,
        '',
        `**Discord:** <@${targetUser.id}>`,
        `**Steam64:** \`${steam64}\``,
        `**Motivo:** ${reason}`,
        '',
        `**Aplicado por:** ${interaction.user}`
      ].join('\n'))
      .setThumbnail(targetUser.displayAvatarURL({ size: 256 }))
      .setImage(`attachment://${imageName}`)
      .addFields(
        { name: '🎮 Nick DayZ', value: nickname, inline: true },
        { name: '🆔 Discord ID', value: targetUser.id, inline: true },
        { name: '🔗 Steam64', value: steam64, inline: false },
        { name: '⛔ Situação', value: '**BANIDO**', inline: true },
        { name: '👑 Administração', value: `${interaction.user.tag}`, inline: true }
      )
      .setFooter({ text: 'CHAMPIONS Z • Jogo limpo sempre' });

    const sent = await banChannel.send({
      content: `🚫 **Banimento registrado:** <@${targetUser.id}>`,
      embeds: [embed],
      files: [localImage(imageName)],
      allowedMentions: { users: [] }
    }).catch(() => null);
    published = Boolean(sent);
  }

  await logEvent(interaction.guild, 'admin_ban_panel', '🚫 Ban aplicado pelo painel', `${interaction.user} baniu ${targetUser.tag}.`, [
    { name: 'Nick DayZ', value: nickname, inline: true },
    { name: 'Steam64', value: steam64, inline: true },
    { name: 'Discord', value: `${targetUser.tag} (${targetUser.id})`, inline: false },
    { name: 'Motivo', value: reason, inline: false }
  ]);

  const result = [
    `**${targetUser.tag}** foi banido com sucesso.`,
    `🎮 Nick: **${nickname}**`,
    `🔗 Steam64: \`${steam64}\``,
    published ? `📢 Registro publicado em **${CHANNELS.bans}**.` : `⚠️ O canal **${CHANNELS.bans}** não foi encontrado; o ban foi aplicado, mas o anúncio não foi publicado.`
  ].join('\n');

  return interaction.editReply({ embeds: [successEmbed(result)] });
}

module.exports = {
  MANAGED_BAN_PREFIX,
  consumeManagedBanTarget,
  buildAdminBanModal,
  isAdminForBan,
  isManagedBanReason,
  submitAdminBan
};
