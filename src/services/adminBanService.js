const path = require('path');
const {
  AttachmentBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  PermissionFlagsBits
} = require('discord.js');
const { CHANNELS, PANEL_IMAGES, OWNER_IDS, ROLE_NAMES } = require('../config/constants');
const { baseEmbed, errorEmbed, successEmbed } = require('../utils/embeds');
const { logEvent } = require('../utils/logger');

function localImage(fileName) {
  return new AttachmentBuilder(path.join(process.cwd(), 'assets', 'painels', fileName));
}

function isAdminForBan(member) {
  if (!member) return false;
  if (OWNER_IDS.includes(member.id)) return true;
  if (!member.permissions?.has(PermissionFlagsBits.BanMembers)) return false;
  return member.roles?.cache?.some((role) => [ROLE_NAMES.founder, ROLE_NAMES.admin].includes(role.name));
}

function buildAdminBanModal() {
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

  const discordName = new TextInputBuilder()
    .setCustomId('ban_discord_name')
    .setLabel('Discord do banido (opcional)')
    .setPlaceholder('Ex.: @Ocletin ou nome sem marcar')
    .setStyle(TextInputStyle.Short)
    .setMinLength(0)
    .setMaxLength(80)
    .setRequired(false);

  const reason = new TextInputBuilder()
    .setCustomId('ban_reason')
    .setLabel('Motivo do banimento')
    .setPlaceholder('Descreva o motivo de forma clara...')
    .setStyle(TextInputStyle.Paragraph)
    .setMinLength(3)
    .setMaxLength(500)
    .setRequired(true);

  return new ModalBuilder()
    .setCustomId('admin_ban_form:register')
    .setTitle('Registrar Banimento')
    .addComponents(
      new ActionRowBuilder().addComponents(steam),
      new ActionRowBuilder().addComponents(nickname),
      new ActionRowBuilder().addComponents(discordName),
      new ActionRowBuilder().addComponents(reason)
    );
}

async function submitAdminBan(interaction) {
  if (!interaction.guild || !interaction.member) {
    return interaction.reply({ embeds: [errorEmbed('Este comando só pode ser usado dentro do servidor.')], ephemeral: true });
  }

  if (!isAdminForBan(interaction.member)) {
    return interaction.reply({ embeds: [errorEmbed('Apenas **Fundador/Administrador** com permissão de ban pode usar este painel.')], ephemeral: true });
  }

  const steam64 = interaction.fields.getTextInputValue('ban_steam64').trim();
  const nickname = interaction.fields.getTextInputValue('ban_nickname').trim();
  const discordName = interaction.fields.getTextInputValue('ban_discord_name').trim() || 'Não informado';
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

  await interaction.deferReply({ ephemeral: true });

  const banChannel = interaction.guild.channels.cache.find(
    (channel) => channel.name === CHANNELS.bans && channel.isTextBased?.()
  );

  let published = false;
  if (banChannel) {
    const imageName = PANEL_IMAGES.banApplied;
    const embed = baseEmbed()
      .setColor(0xc0392b)
      .setTitle('🚫 BANIMENTO REGISTRADO • CHAMPIONS Z')
      .setDescription([
        `O jogador **${nickname}** foi **banido do servidor**.`,
        '',
        `**Discord:** ${discordName}`,
        `**Steam64:** \`${steam64}\``,
        `**Motivo:** ${reason}`,
        '',
        `**Registrado por:** ${interaction.user}`
      ].join('\n'))
      .setImage(`attachment://${imageName}`)
      .addFields(
        { name: '🎮 Nick DayZ', value: nickname, inline: true },
        { name: '💬 Discord', value: discordName, inline: true },
        { name: '🔗 Steam64', value: steam64, inline: false },
        { name: '⛔ Situação', value: '**BANIDO**', inline: true },
        { name: '👑 Administração', value: `${interaction.user.tag}`, inline: true },
        { name: '📝 Motivo', value: reason.slice(0, 1024), inline: false }
      )
      .setFooter({ text: 'CHAMPIONS Z • Jogo limpo sempre' });

    const sent = await banChannel.send({
      content: '🚫 **Banimento registrado com sucesso.**',
      embeds: [embed],
      files: [localImage(imageName)]
    }).catch(() => null);
    published = Boolean(sent);
  }

  await logEvent(interaction.guild, 'admin_ban_panel', '🚫 Banimento registrado pelo painel', `${interaction.user} registrou o banimento de ${nickname}.`, [
    { name: 'Nick DayZ', value: nickname, inline: true },
    { name: 'Steam64', value: steam64, inline: true },
    { name: 'Discord', value: discordName, inline: false },
    { name: 'Motivo', value: reason, inline: false }
  ]);

  const result = [
    `O banimento de **${nickname}** foi registrado com sucesso.`,
    `🎮 Nick: **${nickname}**`,
    `💬 Discord: **${discordName}**`,
    `🔗 Steam64: \`${steam64}\``,
    published ? `📢 Registro publicado em **${CHANNELS.bans}**.` : `⚠️ O canal **${CHANNELS.bans}** não foi encontrado; o registro não foi publicado.`
  ].join('\n');

  return interaction.editReply({ embeds: [successEmbed(result)] });
}

module.exports = {
  buildAdminBanModal,
  isAdminForBan,
  submitAdminBan
};
