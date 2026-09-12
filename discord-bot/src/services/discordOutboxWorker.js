const { AttachmentBuilder, ChannelType, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { prisma } = require('./platformDb');
const { CHANNELS, CATEGORY_NAMES, STAFF_ROLES } = require('../config/constants');

let timer = null;
let running = false;
let lastRecoveryAt = 0;

function channelByName(guild, name) {
  return guild?.channels?.cache?.find(ch => ch.name === name && ch.isTextBased?.()) || null;
}
function categoryByName(guild, name) {
  return guild?.channels?.cache?.find(ch => ch.type === ChannelType.GuildCategory && ch.name === name) || null;
}
function bufferAttachment(data, mime, fallbackName) {
  if (!data) return null;
  const ext = String(mime || '').includes('png') ? 'png' : String(mime || '').includes('webp') ? 'webp' : 'jpg';
  return new AttachmentBuilder(Buffer.from(data, 'base64'), { name: `${fallbackName}.${ext}` });
}
function safeChannelSlug(value) {
  return String(value || 'cla').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 70) || 'cla';
}
function findGuild(client) {
  const configured = process.env.GUILD_ID;
  return (configured && client.guilds.cache.get(configured)) || client.guilds.cache.first() || null;
}

async function sendUnlinkedAlert(guild, payload) {
  const channel = channelByName(guild, CHANNELS.linkAlerts);
  if (!channel) throw new Error(`Canal ${CHANNELS.linkAlerts} não encontrado.`);
  const embed = new EmbedBuilder().setColor(0xf39c12).setTitle('⚠️ Player jogando sem vínculo').setDescription([
    `**${payload.nickname || 'Player sem nick'}** já está jogando há **${payload.minutesOnline || payload.onlineMinutes || 30}+ minutos** sem vincular o Discord.`,
    '', `🎮 Steam64: \`${payload.steam64}\``, `🌐 Servidor: **${payload.serverId || '-'}**`, '', 'Peça para o jogador usar o painel **🔗・vincular-conta**.'
  ].join('\n')).setTimestamp();
  await channel.send({ embeds: [embed] });
}

async function sendCoinPurchase(guild, payload) {
  const payment = await prisma.payment.findUnique({ where: { id: payload.paymentId }, include: { player: true, coinPackage: true } });
  if (!payment) throw new Error('Pagamento do outbox não encontrado.');
  const channel = channelByName(guild, CHANNELS.purchaseLogs);
  if (!channel) throw new Error(`Canal ${CHANNELS.purchaseLogs} não encontrado.`);
  const discord = payment.player?.discordId ? `<@${payment.player.discordId}>` : 'Não vinculado';
  const embed = new EmbedBuilder().setColor(0x2ecc71).setTitle('💰 Compra de moedas aprovada').addFields(
    { name: '👤 Player', value: payment.player?.nickname || 'Sem nick', inline: true },
    { name: '🎮 Steam64', value: `\`${payment.player?.steam64 || '-'}\``, inline: true },
    { name: '💬 Discord', value: discord, inline: true },
    { name: '🪙 Moedas', value: Number(payment.coins || 0).toLocaleString('pt-BR'), inline: true },
    { name: '💵 Valor', value: `R$ ${Number(payment.amountBrl || 0).toFixed(2).replace('.', ',')}`, inline: true },
    { name: '📦 Pacote', value: payment.coinPackage?.name || 'Compra de moedas', inline: true },
    { name: '🧾 Pagamento', value: `\`${payment.id}\``, inline: false }
  ).setFooter({ text: 'CHAMPIONS Z • Compra registrada automaticamente' }).setTimestamp(payment.updatedAt || new Date());
  await channel.send({ embeds: [embed], allowedMentions: { users: [] } });
}

async function sendAccountLinked(guild, payload) {
  const channel = channelByName(guild, CHANNELS.linkAlerts);
  if (!channel) return;
  const embed = new EmbedBuilder().setColor(0x2ecc71).setTitle('✅ Conta vinculada').setDescription(`**${payload.nickname || payload.steam64}** vinculou Discord ↔ Steam.`).addFields(
    { name: 'Steam64', value: `\`${payload.steam64}\``, inline: true },
    { name: 'Discord', value: payload.discordId ? `<@${payload.discordId}>` : (payload.discordUsername || '-'), inline: true }
  ).setTimestamp();
  await channel.send({ embeds: [embed], allowedMentions: { users: [] } });
}

async function createFlagTicket(guild, payload) {
  const clan = await prisma.clan.findUnique({
    where: { id: payload.clanId },
    include: { selectedFlag: true, members: { where: { status: 'ACTIVE' }, include: { player: true }, orderBy: [{ role: 'asc' }, { joinedAt: 'asc' }] } }
  });
  if (!clan?.selectedFlag) throw new Error('Clã/bandeira da reserva não encontrado.');
  const category = categoryByName(guild, CATEGORY_NAMES.ticketsOpen);
  if (!category) throw new Error('Categoria de tickets não encontrada.');
  const already = guild.channels.cache.find(ch => ch.parentId === category.id && ch.topic?.includes(`CHAMPIONS_FLAG:${clan.id}`));
  if (already) return;
  const overwrites = [{ id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] }];
  for (const roleName of STAFF_ROLES) {
    const role = guild.roles.cache.find(r => r.name === roleName);
    if (role) overwrites.push({ id: role.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AttachFiles] });
  }
  for (const member of clan.members) {
    if (member.player?.discordId) overwrites.push({ id: member.player.discordId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] });
  }
  const ticket = await guild.channels.create({
    type: ChannelType.GuildText,
    name: `🏳️-${safeChannelSlug(clan.tag)}-bandeira`, parent: category.id,
    topic: `CHAMPIONS_FLAG:${clan.id}|FLAG:${clan.selectedFlag.id}`, permissionOverwrites: overwrites,
    reason: 'Reserva de bandeira do campeonato CHAMPIONS Z'
  });
  const file = bufferAttachment(clan.selectedFlag.imageData, clan.selectedFlag.imageMime, 'bandeira-escolhida');
  const linkedMentions = clan.members.filter(m => m.player?.discordId).map(m => `<@${m.player.discordId}>`).join(' ');
  const embed = new EmbedBuilder().setColor(0xd4af37).setTitle('🏳️ Nova bandeira reservada • Campeonato').setDescription([
    `O clã **[${clan.tag}] ${clan.name}** concluiu a inscrição no campeonato.`, '', `**Bandeira:** ${clan.selectedFlag.name}`,
    clan.selectedFlag.classname ? `**Classname:** \`${clan.selectedFlag.classname}\`` : '', '', '**Integrantes:**', ...clan.members.map(m => `• ${m.player?.nickname || m.steam64} — \`${m.steam64}\` ${m.player?.discordId ? `<@${m.player.discordId}>` : '❌ sem Discord'}`),
    '', 'A administração deve entregar a bandeira no jogo e depois marcar **Entregue** no painel ADM do site.'
  ].filter(Boolean).join('\n')).setFooter({ text: 'CHAMPIONS Z • Reserva automática pelo site' }).setTimestamp();
  if (file) embed.setImage(`attachment://${file.name}`);
  await ticket.send({ content: linkedMentions || undefined, embeds: [embed], files: file ? [file] : [], allowedMentions: { users: [] } });
}

async function sendFlagDelivered(guild, payload) {
  const clan = await prisma.clan.findUnique({ where: { id: payload.clanId }, include: { selectedFlag: true } });
  if (!clan) return;
  const category = categoryByName(guild, CATEGORY_NAMES.ticketsOpen);
  const ticket = category && guild.channels.cache.find(ch => ch.parentId === category.id && ch.topic?.includes(`CHAMPIONS_FLAG:${clan.id}`));
  if (ticket?.isTextBased?.()) await ticket.send(`✅ **Bandeira entregue no jogo.** ${clan.selectedFlag?.name || ''}\nRegistrado por: **${payload.actor || 'admin'}**`);
}

async function sendChampionshipResult(guild, payload) {
  const result = await prisma.championshipResult.findUnique({
    where: { id: payload.resultId },
    include: { clan: { include: { selectedFlag: true, members: { where: { status: 'ACTIVE' }, include: { player: true } } } } }
  });
  if (!result) throw new Error('Resultado do campeonato não encontrado.');
  const channel = channelByName(guild, CHANNELS.championship);
  if (!channel) throw new Error(`Canal ${CHANNELS.championship} não encontrado.`);
  const better = await prisma.clan.count({ where: { status: 'ACTIVE', championshipRegistered: true, championshipPoints: { gt: result.clan.championshipPoints } } });
  const position = better + 1;
  const file = bufferAttachment(result.imageData, result.imageMime, 'resultado-evento');
  const mentions = result.clan.members.filter(m => m.player?.discordId).map(m => `<@${m.player.discordId}>`).join(' ');
  const embed = new EmbedBuilder().setColor(0xd4af37)
    .setTitle(`🏆 ${result.title || result.eventName}`)
    .setDescription([
      `## CAMPEÕES: [${result.clan.tag}] ${result.clan.name}`,
      result.description || '', '', `🏅 **Evento:** ${result.eventName}`, `➕ **Pontos conquistados:** ${result.points >= 0 ? '+' : ''}${result.points}`,
      `🏆 **Total do clã:** ${result.clan.championshipPoints} pontos`, `📊 **Posição atual:** #${position}`,
      '', '**Equipe campeã:**', ...result.clan.members.map(m => `• ${m.player?.discordId ? `<@${m.player.discordId}>` : (m.player?.nickname || m.steam64)}`)
    ].filter(Boolean).join('\n'))
    .setFooter({ text: `CHAMPIONS Z • Resultado registrado por ${result.adminActor || 'Administração'}` }).setTimestamp(result.occurredAt);
  if (file) embed.setImage(`attachment://${file.name}`);
  await channel.send({ content: mentions ? `🎉 Parabéns, campeões! ${mentions}` : undefined, embeds: [embed], files: file ? [file] : [], allowedMentions: { users: result.clan.members.map(m => m.player?.discordId).filter(Boolean) } });
  await prisma.championshipResult.update({ where: { id: result.id }, data: { discordPublishedAt: new Date() } });
}

async function processItem(client, item) {
  const guild = findGuild(client);
  if (!guild) throw new Error('Bot não está conectado a nenhum servidor Discord.');
  const payload = item.payload || {};
  if (item.type === 'UNLINKED_PLAYER_ALERT') return sendUnlinkedAlert(guild, payload);
  if (item.type === 'COIN_PURCHASE') return sendCoinPurchase(guild, payload);
  if (item.type === 'ACCOUNT_LINKED') return sendAccountLinked(guild, payload);
  if (item.type === 'FLAG_RESERVATION_TICKET') return createFlagTicket(guild, payload);
  if (item.type === 'FLAG_DELIVERED') return sendFlagDelivered(guild, payload);
  if (item.type === 'CHAMPIONSHIP_RESULT') return sendChampionshipResult(guild, payload);
  if (item.type === 'ACCOUNT_UNLINKED_BY_ADMIN') return;
}

async function tick(client) {
  if (running) return;
  running = true;
  try {
    if (Date.now() - lastRecoveryAt > 60_000) {
      lastRecoveryAt = Date.now();
      await prisma.discordOutbox.updateMany({
        where: { status: 'PROCESSING', updatedAt: { lt: new Date(Date.now() - 2 * 60_000) } },
        data: { status: 'PENDING', availableAt: new Date() }
      });
    }
    const rows = await prisma.discordOutbox.findMany({ where: { status: 'PENDING', availableAt: { lte: new Date() } }, orderBy: { createdAt: 'asc' }, take: 10 });
    for (const row of rows) {
      const claimed = await prisma.discordOutbox.updateMany({ where: { id: row.id, status: 'PENDING' }, data: { status: 'PROCESSING', attempts: { increment: 1 } } });
      if (!claimed.count) continue;
      try {
        await processItem(client, row);
        await prisma.discordOutbox.update({ where: { id: row.id }, data: { status: 'SENT', sentAt: new Date(), lastError: null } });
      } catch (error) {
        const attempt = Number(row.attempts || 0) + 1;
        const failed = attempt >= 5;
        await prisma.discordOutbox.update({ where: { id: row.id }, data: { status: failed ? 'FAILED' : 'PENDING', availableAt: new Date(Date.now() + Math.min(300, attempt * 30) * 1000), lastError: String(error?.message || error).slice(0, 2000) } }).catch(() => null);
        console.error(`[DISCORD_OUTBOX:${row.type}]`, error?.message || error);
      }
    }
  } finally { running = false; }
}

function startDiscordOutboxWorker(client) {
  if (timer) return;
  timer = setInterval(() => tick(client).catch(err => console.error('[DISCORD_OUTBOX]', err)), 3000);
  timer.unref?.();
  setTimeout(() => tick(client).catch(() => null), 1500).unref?.();
  console.log('Discord Outbox CHAMPIONS Z iniciado (3s).');
}
module.exports = { startDiscordOutboxWorker };
