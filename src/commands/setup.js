const { ChannelType, PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');
const { CATEGORY_DEFINITIONS, CHANNELS, ROLE_DEFINITIONS, ROLE_NAMES, LEGACY_ROLE_NAMES, SERVER_ROLES, STAFF_ROLES, OWNER_IDS } = require('../config/constants');
const { buildWelcomePanel } = require('../panels/welcomePanel');
const { buildTicketPanel } = require('../panels/ticketPanel');
const { buildReportPanel } = require('../panels/reportPanel');
const { buildBugPanel } = require('../panels/bugPanel');
const { buildBanPanel } = require('../panels/banPanel');
const { buildRulesPanel } = require('../panels/rulesPanel');
const { buildAiPanel } = require('../panels/aiPanel');
const { buildBunkerPanel } = require('../panels/bunkerPanel');
const { buildGorkaBunkerPanel, buildTisyBunkerPanel, buildPavlovoBunkerPanel, buildAirfieldBunkerPanel, buildSolnechnyBunkerPanel, buildPlataformaCongelantePanel } = require('../panels/bunkerLocationsPanel');
const { buildBoatContainerPanel } = require('../panels/boatContainerPanel');
const { buildVanillaProPanel } = require('../panels/vanillaProPanel');
const { buildArmoredCarPanel } = require('../panels/armoredCarPanel');
const { buildSleepingBagPanel } = require('../panels/sleepingBagPanel');
const { buildRaidMissionsPanel } = require('../panels/raidMissionsPanel');
const { SUPPORT_CATEGORY_NAMES, updateSupportCategoryStatus } = require('../panels/supportStatus');
const { refreshTicketPanel } = require('../panels/refreshTicketPanel');
const { readOnlyChannelOverwrites, roleOnlyOverwrites, serverMemberOverwrites, visibleToEveryoneOverwrites } = require('../utils/permissions');
const { successEmbed } = require('../utils/embeds');
const { logEvent } = require('../utils/logger');
const { ensureKothChannel } = require('../services/kothChannelService');

function getCategoryOverwrites(guild, definition) {
  if (definition.visibleToEveryone) return visibleToEveryoneOverwrites(guild);
  if (definition.visibleToServerMembers) return serverMemberOverwrites(guild);
  return roleOnlyOverwrites(guild, definition.allowedRoles || []);
}

function cloneCategoryOverwrites(category) {
  return category.permissionOverwrites.cache.map((overwrite) => ({ id: overwrite.id, allow: BigInt(overwrite.allow.bitfield), deny: BigInt(overwrite.deny.bitfield) }));
}

function enrichVoiceOverwrites(permissionOverwrites, guild) {
  return permissionOverwrites.map((overwrite) => {
    const updated = { ...overwrite, allow: BigInt(overwrite.allow), deny: BigInt(overwrite.deny) };
    if (overwrite.id !== guild.roles.everyone.id && updated.allow > 0n) {
      updated.allow = updated.allow | BigInt(PermissionFlagsBits.Connect) | BigInt(PermissionFlagsBits.Speak) | BigInt(PermissionFlagsBits.Stream) | BigInt(PermissionFlagsBits.UseVAD) | BigInt(PermissionFlagsBits.ViewChannel);
    }
    return updated;
  });
}

function matchNames(name, aliases = []) {
  return [name, ...aliases].filter(Boolean);
}

function canUseSetup(member) {
  if (!member) return false;
  return OWNER_IDS.includes(member.id);
}

async function ensureRole(guild, roleDefinition) {
  const existing = guild.roles.cache.find((role) => role.name === roleDefinition.name);
  if (existing) {
    await existing.edit({ color: roleDefinition.color, hoist: roleDefinition.hoist, mentionable: true }).catch(() => null);
    return existing;
  }
  return guild.roles.create({ name: roleDefinition.name, color: roleDefinition.color, hoist: roleDefinition.hoist, mentionable: true, reason: 'Setup automático RAID-Z' });
}

async function migrateLegacyRoles(guild) {
  await guild.members.fetch().catch(() => null);

  const vanillaRole = guild.roles.cache.find((role) => role.name === ROLE_NAMES.vanilla);
  const vanillaPlusRole = guild.roles.cache.find((role) => role.name === ROLE_NAMES.vanillaPlus);
  const oldVanillaRoles = LEGACY_ROLE_NAMES.vanilla.map((name) => guild.roles.cache.find((role) => role.name === name)).filter(Boolean);
  const oldBbpRoles = LEGACY_ROLE_NAMES.bbp.map((name) => guild.roles.cache.find((role) => role.name === name)).filter(Boolean);
  const oldDmRoles = LEGACY_ROLE_NAMES.deathmatch.map((name) => guild.roles.cache.find((role) => role.name === name)).filter(Boolean);

  let vanillaPlusMoved = 0;
  let vanillaMoved = 0;

  for (const member of guild.members.cache.values()) {
    if (member.user.bot) continue;
    const hadBbp = oldBbpRoles.some((role) => member.roles.cache.has(role.id));
    const hadVanilla = oldVanillaRoles.some((role) => member.roles.cache.has(role.id));
    const hadDm = oldDmRoles.some((role) => member.roles.cache.has(role.id));

    if (hadBbp && vanillaPlusRole) {
      await member.roles.add(vanillaPlusRole, 'Migração BBP para Vanilla+ RAID-Z').catch(() => null);
      vanillaPlusMoved += 1;
    } else if ((hadVanilla || hadDm) && vanillaRole) {
      await member.roles.add(vanillaRole, 'Migração para RAID-Z Vanilla').catch(() => null);
      vanillaMoved += 1;
    }

    // Atualização segura: não remove cargos antigos dos jogadores.
  }

  // Atualização segura: não apaga cargos antigos do servidor.
  return { vanillaPlusMoved, vanillaMoved };
}

async function preserveDiscordChannels() {
  // Atualização segura: não apaga canais, categorias nem mensagens manuais.
  // O setup apenas cria o que estiver faltando e atualiza painéis do próprio bot.
  return 0;
}

async function ensureCategory(guild, definition, position) {
  const acceptableNames = definition.name.includes('SUPORTE') ? [...new Set([...matchNames(definition.name, definition.aliases), ...SUPPORT_CATEGORY_NAMES])] : matchNames(definition.name, definition.aliases);
  const existing = guild.channels.cache.find((channel) => channel.type === ChannelType.GuildCategory && acceptableNames.includes(channel.name));
  const overwrites = getCategoryOverwrites(guild, definition);

  if (existing) {
    // Não renomeia, não move e não altera permissões de categorias que já existem.
    return existing;
  }

  return guild.channels.create({ name: definition.name, type: ChannelType.GuildCategory, position, permissionOverwrites: overwrites, reason: 'Setup automático RAID-Z' });
}

async function ensureTextChannel(guild, category, channelDefinition, categoryDefinition) {
  const acceptableNames = matchNames(channelDefinition.name, channelDefinition.aliases);
  const existing = guild.channels.cache.find((channel) => channel.type === ChannelType.GuildText && acceptableNames.includes(channel.name));
  const permissionOverwrites = channelDefinition.readOnly ? readOnlyChannelOverwrites(guild, categoryDefinition) : cloneCategoryOverwrites(category);
  const options = { name: channelDefinition.name, topic: channelDefinition.topic, parent: category.id, permissionOverwrites };
  if (existing) {
    // Canal pronto fica exatamente onde está, com nome, tópico e permissões preservados.
    return existing;
  }
  return guild.channels.create({ type: ChannelType.GuildText, ...options, reason: 'Setup automático RAID-Z' });
}

async function ensureVoiceChannel(guild, category, channelDefinition) {
  const acceptableNames = matchNames(channelDefinition.name, channelDefinition.aliases);
  const existing = guild.channels.cache.find((channel) => channel.type === ChannelType.GuildVoice && acceptableNames.includes(channel.name));
  const permissionOverwrites = enrichVoiceOverwrites(cloneCategoryOverwrites(category), guild);
  const options = { name: channelDefinition.name, parent: category.id, userLimit: channelDefinition.userLimit || 0, bitrate: 64000, permissionOverwrites };
  if (existing) {
    // Canal de voz pronto também não é movido, renomeado ou reconfigurado.
    return existing;
  }
  return guild.channels.create({ type: ChannelType.GuildVoice, ...options, reason: 'Setup automático RAID-Z' });
}

async function cleanupLegacyAiChannels() {
  // Mantido por compatibilidade, mas não apaga mais nenhum canal.
  // Canais manuais ou antigos ficam preservados.
}

function payloadTitle(payload) {
  const embed = payload?.embeds?.[0];
  return embed?.data?.title || embed?.title || null;
}

async function clearAndSendPanel(channel, panelBuilder) {
  if (!channel?.isTextBased()) return;

  const ownBotId = channel.client.user.id;
  const payloads = panelBuilder();
  const list = Array.isArray(payloads) ? payloads : [payloads];
  const messages = await channel.messages.fetch({ limit: 100 }).catch(() => null);
  const botMessages = messages ? [...messages.values()].filter((message) => message.author.id === ownBotId) : [];
  const usedMessageIds = new Set();

  for (const payload of list) {
    const { legacyTitles = [], ...sendPayload } = payload;
    const title = payloadTitle(sendPayload);
    const acceptedTitles = [title, ...legacyTitles].filter(Boolean);
    const existing = acceptedTitles.length
      ? botMessages.find((message) => !usedMessageIds.has(message.id) && acceptedTitles.includes(message.embeds?.[0]?.title))
      : null;

    if (existing) {
      usedMessageIds.add(existing.id);
      const edited = await existing.edit(sendPayload).catch((error) => {
        console.error(`Erro ao editar painel no canal ${channel.name}:`, error);
        return null;
      });
      if (edited) continue;
    }

    await channel.send(sendPayload).catch((error) => {
      console.error(`Erro ao enviar painel no canal ${channel.name}:`, error);
      return null;
    });
  }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup')
    .setDescription('Atualiza/cria os canais oficiais RAID-Z sem apagar canais ou mensagens.'),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    if (!canUseSetup(interaction.member)) {
      return interaction.editReply('❌ Apenas o dono do bot pode usar este comando.');
    }

    const botMember = await interaction.guild.members.fetchMe();
    if (!botMember.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.editReply('Preciso da permissão Administrador para criar/atualizar canais, cargos e permissões automaticamente.');
    }

    for (const roleDefinition of ROLE_DEFINITIONS) await ensureRole(interaction.guild, roleDefinition);
    const migration = await migrateLegacyRoles(interaction.guild);

    const aiRole = interaction.guild.roles.cache.find((role) => role.name === ROLE_NAMES.ai);
    if (aiRole && !botMember.roles.cache.has(aiRole.id)) await botMember.roles.add(aiRole).catch(() => null);

    const deletedChannels = await preserveDiscordChannels(interaction.guild);

    const categories = [];
    const ensuredChannels = new Map();
    for (const [index, definition] of CATEGORY_DEFINITIONS.entries()) {
      const category = await ensureCategory(interaction.guild, definition, index);
      categories.push(category);
      for (const channelDefinition of definition.channels) {
        const channel = (channelDefinition.type || 'text') === 'voice'
          ? await ensureVoiceChannel(interaction.guild, category, channelDefinition)
          : await ensureTextChannel(interaction.guild, category, channelDefinition, definition);
        if (channel) ensuredChannels.set(channelDefinition.name, channel);
      }
    }

    let kothResult;
    try {
      kothResult = await ensureKothChannel(interaction.guild, { updatePanel: true });
      if (kothResult.channel) ensuredChannels.set(CHANNELS.koth, kothResult.channel);
    } catch (error) {
      console.error('Erro ao garantir o canal KOTH:', error);
      return interaction.editReply(`❌ Não consegui criar o canal **${CHANNELS.koth}**. Motivo: ${error.message}`);
    }

    const findChannel = (name) => ensuredChannels.get(name) || interaction.guild.channels.cache.find((channel) => channel.name === name && channel.isTextBased?.());

    await clearAndSendPanel(findChannel(CHANNELS.welcome), buildWelcomePanel);
    await clearAndSendPanel(findChannel(CHANNELS.rules), () => buildRulesPanel('geral'));
    await clearAndSendPanel(findChannel(CHANNELS.rulesVanilla), () => buildRulesPanel('vanilla'));
    await clearAndSendPanel(findChannel(CHANNELS.rulesFlagRaid), () => buildRulesPanel('bandeira'));
    await clearAndSendPanel(findChannel(CHANNELS.raidMissions), buildRaidMissionsPanel);
    await clearAndSendPanel(findChannel(CHANNELS.bunkerSubterraneo), buildBunkerPanel);
    await clearAndSendPanel(findChannel(CHANNELS.bunkerGorka), buildGorkaBunkerPanel);
    await clearAndSendPanel(findChannel(CHANNELS.containerBarco), buildBoatContainerPanel);
    await clearAndSendPanel(findChannel(CHANNELS.bunkerTisy), buildTisyBunkerPanel);
    await clearAndSendPanel(findChannel(CHANNELS.bunkerPavlovo), buildPavlovoBunkerPanel);
    await clearAndSendPanel(findChannel(CHANNELS.bunkerAirfield), buildAirfieldBunkerPanel);
    await clearAndSendPanel(findChannel(CHANNELS.bunkerSolnechny), buildSolnechnyBunkerPanel);
    await clearAndSendPanel(findChannel(CHANNELS.plataformaCongelante), buildPlataformaCongelantePanel);
    await clearAndSendPanel(findChannel(CHANNELS.construcoesVanillaPro), buildVanillaProPanel);
    await clearAndSendPanel(findChannel(CHANNELS.carroBlindado), buildArmoredCarPanel);
    await clearAndSendPanel(findChannel(CHANNELS.sacoDeDormir), buildSleepingBagPanel);
    const aiChannel = findChannel(CHANNELS.rulesAsk);
    await clearAndSendPanel(aiChannel, () => buildAiPanel(interaction.guild));
    await cleanupLegacyAiChannels(interaction.guild, aiChannel);
    await clearAndSendPanel(findChannel(CHANNELS.openTicket), () => buildTicketPanel(interaction.guild));
    await updateSupportCategoryStatus(interaction.guild);
    await clearAndSendPanel(findChannel(CHANNELS.reportsPanel), buildReportPanel);
    await clearAndSendPanel(findChannel(CHANNELS.bugPanel), buildBugPanel);
    await clearAndSendPanel(findChannel(CHANNELS.bans), buildBanPanel);
    await refreshTicketPanel(interaction.guild);

    await logEvent(interaction.guild, 'setup_completed', '✅ Setup RAID-Z executado', `${interaction.user} atualizou os canais oficiais RAID-Z sem apagar canais ou mensagens.`, [
      { name: 'Canais apagados', value: '0 (atualização segura)', inline: true },
      { name: 'Categorias novas', value: String(categories.length), inline: true },
      { name: 'BBP → Vanilla+', value: String(migration.vanillaPlusMoved), inline: true },
      { name: 'Antigos → Vanilla', value: String(migration.vanillaMoved), inline: true },
      { name: 'Canal KOTH', value: kothResult.created ? 'Criado agora' : (kothResult.moved ? 'Movido para a CENTRAL RAID-Z' : 'Confirmado e atualizado'), inline: true },
      { name: 'Cargos do servidor', value: SERVER_ROLES.join(', '), inline: false }
    ]);

    await interaction.editReply({ embeds: [successEmbed(`RAID-Z atualizado com segurança. **Não apaguei canais, categorias nem mensagens antigas**. Criei/atualizei os canais oficiais, incluindo a rota do **container do barco/Chave Verde**, os canais de **Gorka, Tisy/Troitskoe, Pavlovo, Airfield/Chave Prata e Solnechny**, o canal **🚩・koth** com loot dinâmico, as **missões de raid via rádio**, **bunker subterrâneo**, **construções Vanilla Pro**, **carro blindado** e **saco de dormir**.`)] }).catch(() => null);
  }
};
