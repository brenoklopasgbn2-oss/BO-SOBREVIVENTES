const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  ModalBuilder,
  StringSelectMenuBuilder,
  TextInputBuilder,
  TextInputStyle,
  UserSelectMenuBuilder,
  PermissionFlagsBits
} = require('discord.js');
const { CHANNELS, ROLE_NAMES, STAFF_ROLES, OWNER_IDS } = require('../config/constants');
const { baseEmbed, successEmbed, errorEmbed } = require('../utils/embeds');
const {
  cleanId,
  getLinkedPlayerByDiscord,
  syncExistingReferralSteam,
  listStreamerProfiles,
  getStreamerRanking,
  getReferralSummary,
  upsertStreamerProfile,
  setStreamerActive,
  getStreamerProfile,
  getExistingReferral,
  createReferral
} = require('./streamerReferralService');
const { buildStreamerStaffPanel } = require('../panels/streamerStaffPanel');

function hasStaffAccess(interaction) {
  if (!interaction?.member) return false;
  if (OWNER_IDS.includes(interaction.user.id)) return true;
  if (interaction.member.permissions?.has?.(PermissionFlagsBits.Administrator)) return true;
  if (interaction.member.permissions?.has?.(PermissionFlagsBits.ManageGuild)) return true;
  return interaction.member.roles?.cache?.some?.((role) => STAFF_ROLES.includes(role.name)) || false;
}


function linkChannelText(guild) {
  const channel = guild?.channels?.cache?.find?.((item) => item.name === CHANNELS.linkAccount && item.isTextBased?.());
  return channel ? `${channel}` : `#${CHANNELS.linkAccount}`;
}

function linkRequiredEmbed(guild) {
  return errorEmbed(`Somente jogadores com o **Discord vinculado à Steam** podem escolher quem os trouxe.\n\nFaça o vínculo primeiro em ${linkChannelText(guild)} e depois volte a este painel.`);
}

async function denyStaff(interaction) {
  const payload = { embeds: [errorEmbed('Apenas a staff pode usar este painel.')], ephemeral: true };
  if (interaction.replied || interaction.deferred) return interaction.followUp(payload);
  return interaction.reply(payload);
}

function chunks(list, size) {
  const out = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}

function short(value, max) {
  const text = String(value || '');
  return text.length <= max ? text : `${text.slice(0, Math.max(0, max - 1))}…`;
}

async function ensureStreamerRole(guild) {
  let role = guild.roles.cache.find((item) => item.name === ROLE_NAMES.streamer);
  if (role) return role;
  role = await guild.roles.create({
    name: ROLE_NAMES.streamer,
    color: 0xd4af37,
    hoist: true,
    mentionable: true,
    reason: 'Cargo automático do programa de streamers CHAMPIONS Z'
  });
  return role;
}

async function syncActiveStreamerRoles(guild) {
  if (!guild) return { checked: 0, added: 0 };
  const profiles = await listStreamerProfiles(guild.id, { activeOnly: true });
  if (!profiles.length) return { checked: 0, added: 0 };
  const role = await ensureStreamerRole(guild);
  let added = 0;
  for (const profile of profiles) {
    const member = await guild.members.fetch(profile.discordUserId).catch(() => null);
    if (!member || member.user.bot || member.roles.cache.has(role.id)) continue;
    const ok = await member.roles.add(role, 'Sincronização de streamer cadastrado no banco').then(() => true).catch(() => false);
    if (ok) added += 1;
  }
  return { checked: profiles.length, added };
}

async function refreshStreamerStaffPanel(guild) {
  if (!guild) return null;
  const channel = guild.channels.cache.find((item) => item.name === CHANNELS.streamerStaffPanel && item.isTextBased?.());
  if (!channel) return null;

  const payload = await buildStreamerStaffPanel(guild.id);
  const messages = await channel.messages.fetch({ limit: 50 }).catch(() => null);
  const existing = messages
    ? [...messages.values()].find((message) => message.author.id === guild.client.user.id && message.embeds?.[0]?.title === '🎬 Central de Streamers • Staff')
    : null;

  if (existing) return existing.edit(payload).catch(() => null);
  return channel.send(payload).catch(() => null);
}

async function sendReferralLog(guild, { referral, profile, member }) {
  const channel = guild.channels.cache.find((item) => item.name === CHANNELS.streamerReferralLogs && item.isTextBased?.());
  if (!channel) return null;

  const embed = baseEmbed()
    .setColor(0x2ecc71)
    .setTitle('📥 Nova indicação de streamer')
    .setDescription(`${member} informou que conheceu o CHAMPIONS Z por <@${profile.discordUserId}>.`)
    .addFields(
      { name: '👤 Jogador', value: `${member}\nID: \`${referral.playerDiscordId}\``, inline: true },
      { name: '🎥 Streamer', value: `<@${profile.discordUserId}>\n${profile.streamerName}`, inline: true },
      { name: '🎮 Steam64 vinculado', value: `\`${referral.playerSteam64}\``, inline: false },
      { name: '🕒 Registrado em', value: `<t:${Math.floor(new Date(referral.selectedAt).getTime() / 1000)}:F>`, inline: false }
    )
    .setFooter({ text: 'CHAMPIONS Z • Log permanente no banco' });

  return channel.send({ embeds: [embed] }).catch(() => null);
}

async function handleReferralOpen(interaction) {
  // Não mostra nem a lista de streamers para contas ainda não vinculadas.
  const linkedPlayer = await getLinkedPlayerByDiscord(interaction.user.id);
  if (!linkedPlayer) {
    return interaction.reply({ embeds: [linkRequiredEmbed(interaction.guild)], ephemeral: true });
  }

  let existing = await getExistingReferral(interaction.guildId, interaction.user.id);
  if (existing && !existing.playerSteam64) {
    existing = await syncExistingReferralSteam({
      guildId: interaction.guildId,
      playerDiscordId: interaction.user.id,
      steam64: linkedPlayer.steam64
    });
  }
  if (existing) {
    return interaction.reply({
      embeds: [baseEmbed()
        .setColor(0xd4af37)
        .setTitle('✅ Sua indicação já está registrada')
        .setDescription(`Você informou que veio por **${existing.streamerProfile.streamerName}** (<@${existing.streamerProfile.discordUserId}>).\n\nPara proteger o ranking, cada jogador pode registrar somente uma vez.`)],
      ephemeral: true
    });
  }

  const streamers = await listStreamerProfiles(interaction.guildId, { activeOnly: true });
  if (!streamers.length) {
    return interaction.reply({ embeds: [errorEmbed('Ainda não há streamers cadastrados pela staff.')], ephemeral: true });
  }

  const limited = streamers.slice(0, 125);
  const rows = chunks(limited, 25).map((group, index) => {
    const menu = new StringSelectMenuBuilder()
      .setCustomId(`streamer_referral_select:${index}`)
      .setPlaceholder(index === 0 ? 'Selecione o streamer que trouxe você' : `Mais streamers • página ${index + 1}`)
      .setMinValues(1)
      .setMaxValues(1)
      .addOptions(group.map((profile) => ({
        label: short(profile.streamerName, 100),
        description: short(`${profile._count?.referrals || 0} indicação(ões) registrada(s)`, 100),
        value: profile.id,
        emoji: '🎥'
      })));
    return new ActionRowBuilder().addComponents(menu);
  });

  const note = streamers.length > 125 ? '\n\n⚠️ A lista possui mais de 125 streamers. A staff deve desativar cadastros antigos para exibir todos.' : '';
  return interaction.reply({
    embeds: [baseEmbed()
      .setColor(0xd4af37)
      .setTitle('🎬 Escolha quem trouxe você')
      .setDescription(`A lista abaixo mostra **somente streamers cadastrados pela staff**. Sua escolha será definitiva.${note}`)],
    components: rows,
    ephemeral: true
  });
}

async function handleReferralSelect(interaction) {
  // Revalida no clique final. Isso impede bypass por interação antiga/forjada.
  const linkedPlayer = await getLinkedPlayerByDiscord(interaction.user.id);
  if (!linkedPlayer) {
    return interaction.update({ embeds: [linkRequiredEmbed(interaction.guild)], components: [] });
  }

  const profileId = interaction.values?.[0];
  let result;
  try {
    result = await createReferral({
      guildId: interaction.guildId,
      playerDiscordId: interaction.user.id,
      playerDiscordUsername: interaction.user.username,
      playerDisplayName: interaction.member?.displayName || interaction.user.globalName || interaction.user.username,
      streamerProfileId: profileId
    });
  } catch (error) {
    if (error?.code === 'STREAMER_REFERRAL_LINK_REQUIRED') {
      return interaction.update({ embeds: [linkRequiredEmbed(interaction.guild)], components: [] });
    }
    throw error;
  }

  if (result.alreadyExisted) {
    return interaction.update({
      embeds: [baseEmbed().setColor(0xd4af37).setTitle('✅ Indicação já registrada').setDescription(`Sua indicação já pertence a **${result.profile.streamerName}** (<@${result.profile.discordUserId}>).`)],
      components: []
    });
  }

  await sendReferralLog(interaction.guild, { referral: result.referral, profile: result.profile, member: interaction.member });
  await refreshStreamerStaffPanel(interaction.guild);

  return interaction.update({
    embeds: [successEmbed(`Sua indicação foi registrada para **${result.profile.streamerName}** (<@${result.profile.discordUserId}>).\n\nObrigado por informar como você conheceu o CHAMPIONS Z.`)],
    components: []
  });
}

async function handleStaffRegisterButton(interaction) {
  if (!hasStaffAccess(interaction)) return denyStaff(interaction);

  const selector = new UserSelectMenuBuilder()
    .setCustomId('streamer_staff_register_user_select')
    .setPlaceholder('Selecione o membro que será cadastrado como streamer')
    .setMinValues(1)
    .setMaxValues(1);

  return interaction.reply({
    embeds: [baseEmbed()
      .setColor(0xd4af37)
      .setTitle('➕ Cadastrar streamer')
      .setDescription('Escolha abaixo o membro do Discord. O cadastro será salvo no PostgreSQL e o cargo **Streamer** será aplicado automaticamente.')],
    components: [new ActionRowBuilder().addComponents(selector)],
    ephemeral: true
  });
}

async function handleStaffRegisterUserSelect(interaction) {
  if (!hasStaffAccess(interaction)) return denyStaff(interaction);
  const userId = cleanId(interaction.values?.[0]);
  const member = await interaction.guild.members.fetch(userId).catch(() => null);
  if (!member || member.user.bot) {
    return interaction.update({ embeds: [errorEmbed('Selecione um membro válido que não seja bot.')], components: [] });
  }

  const streamerName = String(member.displayName || member.user.globalName || member.user.username).trim();
  const profile = await upsertStreamerProfile({
    guildId: interaction.guildId,
    discordUserId: member.id,
    streamerName,
    registeredByDiscordId: interaction.user.id
  });

  const role = await ensureStreamerRole(interaction.guild);
  let roleAdded = member.roles.cache.has(role.id);
  if (!roleAdded) roleAdded = await member.roles.add(role, `Streamer cadastrado por ${interaction.user.tag}`).then(() => true).catch(() => false);

  await refreshStreamerStaffPanel(interaction.guild);
  const logChannel = interaction.guild.channels.cache.find((item) => item.name === CHANNELS.streamerReferralLogs && item.isTextBased?.());
  if (logChannel) {
    await logChannel.send({ embeds: [baseEmbed()
      .setColor(0xd4af37)
      .setTitle('🎥 Streamer cadastrado/reativado')
      .setDescription(`${member} foi cadastrado por ${interaction.user}.`)
      .addFields(
        { name: 'Nome no painel', value: profile.streamerName, inline: true },
        { name: 'Indicações existentes', value: String(profile._count?.referrals || 0), inline: true },
        { name: 'Cargo Streamer', value: roleAdded ? '✅ aplicado' : '⚠️ não consegui aplicar', inline: true }
      )] }).catch(() => null);
  }

  return interaction.update({
    embeds: [successEmbed(`${member} foi cadastrado como **Streamer**.\nIndicações atuais: **${profile._count?.referrals || 0}**.${roleAdded ? '\nO cargo **Streamer** foi aplicado automaticamente.' : '\n⚠️ O cadastro foi salvo, mas não consegui aplicar o cargo. Verifique a hierarquia do bot.'}`)],
    components: []
  });
}

async function handleStaffRegisterModal(interaction) {
  if (!hasStaffAccess(interaction)) return denyStaff(interaction);

  const rawUser = interaction.fields.getTextInputValue('streamer_user');
  const userId = cleanId(rawUser);
  if (!userId) return interaction.reply({ embeds: [errorEmbed('Informe uma menção ou ID válido do Discord.')], ephemeral: true });

  const member = await interaction.guild.members.fetch(userId).catch(() => null);
  if (!member || member.user.bot) {
    return interaction.reply({ embeds: [errorEmbed('Esse usuário precisa estar dentro do Discord e não pode ser um bot.')], ephemeral: true });
  }

  const requestedName = interaction.fields.getTextInputValue('streamer_name');
  const streamerName = String(requestedName || member.displayName || member.user.globalName || member.user.username).trim();
  const profile = await upsertStreamerProfile({
    guildId: interaction.guildId,
    discordUserId: member.id,
    streamerName,
    registeredByDiscordId: interaction.user.id
  });

  const role = await ensureStreamerRole(interaction.guild);
  let roleAdded = false;
  if (!member.roles.cache.has(role.id)) {
    roleAdded = await member.roles.add(role, `Streamer cadastrado por ${interaction.user.tag}`).then(() => true).catch(() => false);
  } else {
    roleAdded = true;
  }

  await refreshStreamerStaffPanel(interaction.guild);
  const logChannel = interaction.guild.channels.cache.find((item) => item.name === CHANNELS.streamerReferralLogs && item.isTextBased?.());
  if (logChannel) {
    await logChannel.send({ embeds: [baseEmbed()
      .setColor(0xd4af37)
      .setTitle('🎥 Streamer cadastrado/reativado')
      .setDescription(`${member} foi cadastrado por ${interaction.user}.`)
      .addFields(
        { name: 'Nome no painel', value: profile.streamerName, inline: true },
        { name: 'Indicações existentes', value: String(profile._count?.referrals || 0), inline: true },
        { name: 'Cargo Streamer', value: roleAdded ? '✅ aplicado' : '⚠️ não consegui aplicar', inline: true }
      )] }).catch(() => null);
  }

  return interaction.reply({
    embeds: [successEmbed(`${member} foi cadastrado como **Streamer**.\nIndicações atuais: **${profile._count?.referrals || 0}**.${roleAdded ? '\nO cargo **Streamer** foi aplicado automaticamente.' : '\n⚠️ O cadastro foi salvo, mas não consegui aplicar o cargo. Verifique a hierarquia do bot.'}`)],
    ephemeral: true
  });
}

async function handleStaffRanking(interaction) {
  if (!hasStaffAccess(interaction)) return denyStaff(interaction);
  const ranking = await getStreamerRanking(interaction.guildId, { activeOnly: false, limit: 25 });
  const summary = await getReferralSummary(interaction.guildId);
  const text = ranking.length
    ? ranking.map((item, i) => {
        const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `**${i + 1}.**`;
        return `${medal} ${item.active ? '🟢' : '⚫'} <@${item.discordUserId}> — **${item._count?.referrals || 0}**`;
      }).join('\n')
    : 'Nenhum streamer cadastrado.';
  return interaction.reply({
    embeds: [baseEmbed()
      .setColor(0xd4af37)
      .setTitle('🏆 Ranking de indicações • Streamers')
      .setDescription(text.slice(0, 3900))
      .setFooter({ text: `${summary.referrals} indicações totais • 🟢 ativo • ⚫ inativo` })],
    ephemeral: true
  });
}

async function handleStaffManage(interaction) {
  if (!hasStaffAccess(interaction)) return denyStaff(interaction);
  const profiles = await listStreamerProfiles(interaction.guildId, { activeOnly: false });
  if (!profiles.length) return interaction.reply({ embeds: [errorEmbed('Nenhum streamer cadastrado ainda.')], ephemeral: true });

  const rows = chunks(profiles.slice(0, 125), 25).map((group, index) => new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`streamer_staff_details_select:${index}`)
      .setPlaceholder(index === 0 ? 'Clique em um streamer para abrir os detalhes' : `Mais streamers • página ${index + 1}`)
      .addOptions(group.map((profile) => ({
        label: short(profile.streamerName, 100),
        description: short(`${profile.active ? 'ATIVO' : 'INATIVO'} • ${profile._count?.referrals || 0} indicação(ões)`, 100),
        value: profile.id,
        emoji: profile.active ? '🟢' : '⚫'
      })))
  ));

  return interaction.reply({
    embeds: [baseEmbed().setColor(0xd4af37).setTitle('⚙️ Gerenciar streamers').setDescription('Selecione um streamer para ver total, últimas indicações e ativar/desativar o cadastro.')],
    components: rows,
    ephemeral: true
  });
}

async function handleStaffDetailsSelect(interaction) {
  if (!hasStaffAccess(interaction)) return denyStaff(interaction);
  const profile = await getStreamerProfile(interaction.guildId, interaction.values?.[0]);
  if (!profile) return interaction.update({ embeds: [errorEmbed('Streamer não encontrado.')], components: [] });

  const recent = profile.referrals.length
    ? profile.referrals.map((item) => `• <@${item.playerDiscordId}>${item.playerSteam64 ? ` • \`${item.playerSteam64}\`` : ''} • <t:${Math.floor(new Date(item.selectedAt).getTime() / 1000)}:d>`).join('\n')
    : 'Nenhuma indicação ainda.';

  const toggle = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`streamer_staff_toggle:${profile.id}`)
      .setLabel(profile.active ? 'Desativar streamer' : 'Reativar streamer')
      .setEmoji(profile.active ? '⛔' : '✅')
      .setStyle(profile.active ? ButtonStyle.Danger : ButtonStyle.Success)
  );

  return interaction.update({
    embeds: [baseEmbed()
      .setColor(profile.active ? 0x2ecc71 : 0x7f8c8d)
      .setTitle(`🎥 ${profile.streamerName}`)
      .setDescription(`<@${profile.discordUserId}> • ${profile.active ? '**ATIVO**' : '**INATIVO**'}`)
      .addFields(
        { name: '👥 Total de indicações', value: `**${profile._count?.referrals || 0}**`, inline: true },
        { name: '🗓️ Cadastrado', value: `<t:${Math.floor(new Date(profile.createdAt).getTime() / 1000)}:d>`, inline: true },
        { name: '🧾 Últimas indicações', value: recent.slice(0, 1024), inline: false }
      )],
    components: [toggle]
  });
}

async function handleStaffToggle(interaction, profileId) {
  if (!hasStaffAccess(interaction)) return denyStaff(interaction);
  const current = await getStreamerProfile(interaction.guildId, profileId);
  if (!current) return interaction.reply({ embeds: [errorEmbed('Streamer não encontrado.')], ephemeral: true });
  const updated = await setStreamerActive({ guildId: interaction.guildId, profileId, active: !current.active });

  const member = await interaction.guild.members.fetch(updated.discordUserId).catch(() => null);
  const role = interaction.guild.roles.cache.find((item) => item.name === ROLE_NAMES.streamer);
  if (member && role) {
    if (updated.active) await member.roles.add(role, 'Streamer reativado pela staff').catch(() => null);
    else await member.roles.remove(role, 'Streamer desativado pela staff').catch(() => null);
  }

  await refreshStreamerStaffPanel(interaction.guild);
  return interaction.reply({
    embeds: [successEmbed(`**${updated.streamerName}** agora está ${updated.active ? '**ATIVO**' : '**INATIVO**'} no painel de indicações.${updated.active ? '\nO cargo Streamer foi restaurado.' : '\nO histórico e ranking foram preservados no banco.'}`)],
    ephemeral: true
  });
}

async function handleStaffRefresh(interaction) {
  if (!hasStaffAccess(interaction)) return denyStaff(interaction);
  await interaction.deferReply({ ephemeral: true });
  await refreshStreamerStaffPanel(interaction.guild);
  return interaction.editReply({ embeds: [successEmbed('Painel e ranking de streamers atualizados.')] });
}

module.exports = {
  hasStaffAccess,
  syncActiveStreamerRoles,
  refreshStreamerStaffPanel,
  handleReferralOpen,
  handleReferralSelect,
  handleStaffRegisterButton,
  handleStaffRegisterUserSelect,
  handleStaffRegisterModal,
  handleStaffRanking,
  handleStaffManage,
  handleStaffDetailsSelect,
  handleStaffToggle,
  handleStaffRefresh
};
