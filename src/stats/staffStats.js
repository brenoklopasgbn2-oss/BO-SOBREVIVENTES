const fs = require('node:fs');
const path = require('node:path');
const { CHANNELS, STAFF_ROLES } = require('../config/constants');
const { baseEmbed } = require('../utils/embeds');
const { getMainStaffRole, isStaffMember, isSupportVoiceChannel } = require('../panels/supportStatus');

const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'staffStats.json');
const BRAZIL_OFFSET_MS = -3 * 60 * 60 * 1000;

const PERIOD_LABELS = {
  diario: 'Diário',
  semanal: 'Semanal',
  mensal: 'Mensal',
  anual: 'Anual'
};

function emptyData() {
  return {
    version: 1,
    members: {},
    activeSupport: {},
    activeDiscord: {},
    dailyReports: {}
  };
}

function loadData() {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    if (!fs.existsSync(DATA_FILE)) {
      const data = emptyData();
      fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
      return data;
    }

    const parsed = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    return {
      ...emptyData(),
      ...parsed,
      members: parsed.members || {},
      activeSupport: parsed.activeSupport || {},
      activeDiscord: parsed.activeDiscord || {},
      dailyReports: parsed.dailyReports || {}
    };
  } catch (error) {
    console.error('Erro ao carregar staffStats.json:', error);
    return emptyData();
  }
}

function saveData(data) {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Erro ao salvar staffStats.json:', error);
  }
}

function getMemberName(member) {
  return member?.displayName || member?.user?.username || member?.user?.tag || 'Staff';
}

function ensureMember(data, member) {
  const id = member.id;
  if (!data.members[id]) {
    data.members[id] = {
      id,
      name: getMemberName(member),
      tag: member.user?.tag || member.user?.username || id,
      roleName: getMainStaffRole(member),
      ticketsById: {},
      ticketMessages: [],
      supportSessions: [],
      discordSessions: []
    };
  }

  data.members[id].name = getMemberName(member);
  data.members[id].tag = member.user?.tag || member.user?.username || id;
  data.members[id].roleName = getMainStaffRole(member);
  data.members[id].updatedAt = Date.now();

  if (!data.members[id].ticketsById) data.members[id].ticketsById = {};
  if (!Array.isArray(data.members[id].ticketMessages)) data.members[id].ticketMessages = [];
  if (!Array.isArray(data.members[id].supportSessions)) data.members[id].supportSessions = [];
  if (!Array.isArray(data.members[id].discordSessions)) data.members[id].discordSessions = [];

  return data.members[id];
}

function isOnlineStatus(status) {
  return Boolean(status && status !== 'offline' && status !== 'invisible');
}

function recordTicketAnswered(member, ticketId) {
  if (!member || !ticketId || member.user?.bot || !isStaffMember(member)) return;

  const data = loadData();
  const stats = ensureMember(data, member);

  if (!stats.ticketsById[ticketId]) {
    stats.ticketsById[ticketId] = {
      ticketId,
      at: Date.now()
    };
  }

  saveData(data);
}

function recordTicketMessage(member, ticketId) {
  if (!member || !ticketId || member.user?.bot || !isStaffMember(member)) return;

  const data = loadData();
  const stats = ensureMember(data, member);

  stats.ticketMessages.push({
    ticketId,
    at: Date.now()
  });

  // Evita arquivo infinito em servidor muito grande.
  if (stats.ticketMessages.length > 5000) {
    stats.ticketMessages = stats.ticketMessages.slice(-4000);
  }

  saveData(data);
}

function startSupportSession(member, channelId) {
  if (!member || member.user?.bot || !isStaffMember(member)) return;

  const data = loadData();
  ensureMember(data, member);

  if (!data.activeSupport[member.id]) {
    data.activeSupport[member.id] = {
      guildId: member.guild.id,
      channelId,
      start: Date.now()
    };
  } else {
    data.activeSupport[member.id].channelId = channelId;
  }

  saveData(data);
}

function endSupportSession(member, channelId = null) {
  if (!member || member.user?.bot || !isStaffMember(member)) return;

  const data = loadData();
  const active = data.activeSupport[member.id];
  if (!active) return;

  const stats = ensureMember(data, member);
  const end = Date.now();

  if (end > active.start) {
    stats.supportSessions.push({
      guildId: active.guildId || member.guild.id,
      channelId: active.channelId || channelId,
      start: active.start,
      end
    });
  }

  delete data.activeSupport[member.id];
  saveData(data);
}

function startDiscordSession(member, status = 'online') {
  if (!member || member.user?.bot || !isStaffMember(member)) return;

  const data = loadData();
  ensureMember(data, member);

  if (!data.activeDiscord[member.id]) {
    data.activeDiscord[member.id] = {
      guildId: member.guild.id,
      status,
      start: Date.now()
    };
  } else {
    data.activeDiscord[member.id].status = status;
  }

  saveData(data);
}

function endDiscordSession(member) {
  if (!member || member.user?.bot || !isStaffMember(member)) return;

  const data = loadData();
  const active = data.activeDiscord[member.id];
  if (!active) return;

  const stats = ensureMember(data, member);
  const end = Date.now();

  if (end > active.start) {
    stats.discordSessions.push({
      guildId: active.guildId || member.guild.id,
      status: active.status || 'online',
      start: active.start,
      end
    });
  }

  delete data.activeDiscord[member.id];
  saveData(data);
}

function handleStaffVoiceStateUpdate(oldState, newState) {
  const member = newState.member || oldState.member;
  if (!member || member.user?.bot || !isStaffMember(member)) return;

  const oldSupport = isSupportVoiceChannel(oldState.channel);
  const newSupport = isSupportVoiceChannel(newState.channel);

  if (!oldSupport && newSupport) {
    startSupportSession(member, newState.channelId);
    return;
  }

  if (oldSupport && !newSupport) {
    endSupportSession(member, oldState.channelId);
    return;
  }

  if (oldSupport && newSupport && oldState.channelId !== newState.channelId) {
    endSupportSession(member, oldState.channelId);
    startSupportSession(member, newState.channelId);
  }
}

function handleStaffPresenceUpdate(oldPresence, newPresence) {
  const member = newPresence?.member || oldPresence?.member;
  if (!member || member.user?.bot || !isStaffMember(member)) return;

  const oldOnline = isOnlineStatus(oldPresence?.status);
  const newOnline = isOnlineStatus(newPresence?.status);

  if (!oldOnline && newOnline) {
    startDiscordSession(member, newPresence.status);
    return;
  }

  if (oldOnline && !newOnline) {
    endDiscordSession(member);
    return;
  }

  if (oldOnline && newOnline) {
    startDiscordSession(member, newPresence.status);
  }
}

function getBrazilDateParts(ts = Date.now()) {
  const shifted = new Date(ts + BRAZIL_OFFSET_MS);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
    hour: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes()
  };
}

function pad(value) {
  return String(value).padStart(2, '0');
}

function dateKeyFromParts(parts) {
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`;
}

function brazilDateKey(ts = Date.now()) {
  return dateKeyFromParts(getBrazilDateParts(ts));
}

function brazilStartOfDayMs(year, month, day) {
  return Date.UTC(year, month - 1, day, 3, 0, 0, 0);
}

function addDaysToKey(dateKey, amount) {
  const [year, month, day] = dateKey.split('-').map(Number);
  const start = brazilStartOfDayMs(year, month, day);
  return brazilDateKey(start + amount * 24 * 60 * 60 * 1000);
}

function windowFromDateKey(dateKey) {
  const [year, month, day] = dateKey.split('-').map(Number);
  const start = brazilStartOfDayMs(year, month, day);
  return { start, end: start + 24 * 60 * 60 * 1000, label: `Dia ${pad(day)}/${pad(month)}/${year}` };
}

function getPeriodWindow(period = 'mensal', now = Date.now()) {
  const parts = getBrazilDateParts(now);

  if (period === 'diario') {
    const start = brazilStartOfDayMs(parts.year, parts.month, parts.day);
    return { start, end: now, label: 'Hoje' };
  }

  if (period === 'semanal') {
    return { start: now - 7 * 24 * 60 * 60 * 1000, end: now, label: 'Últimos 7 dias' };
  }

  if (period === 'anual') {
    return { start: brazilStartOfDayMs(parts.year, 1, 1), end: now, label: String(parts.year) };
  }

  return { start: brazilStartOfDayMs(parts.year, parts.month, 1), end: now, label: `${pad(parts.month)}/${parts.year}` };
}

function overlapDuration(start, end, windowStart, windowEnd) {
  const a = Math.max(start, windowStart);
  const b = Math.min(end || Date.now(), windowEnd);
  return Math.max(0, b - a);
}

function addActiveDays(set, start, end, windowStart, windowEnd) {
  const a = Math.max(start, windowStart);
  const b = Math.min(end || Date.now(), windowEnd);
  if (b <= a) return;

  let key = brazilDateKey(a);
  const lastKey = brazilDateKey(b - 1);

  while (true) {
    set.add(key);
    if (key === lastKey) break;
    key = addDaysToKey(key, 1);
  }
}

function formatDuration(ms) {
  const totalMinutes = Math.floor(ms / 60000);
  if (totalMinutes <= 0) return '0min';

  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function countTickets(stats, start, end) {
  return Object.values(stats.ticketsById || {}).filter((ticket) => ticket.at >= start && ticket.at < end).length;
}

function countTicketMessages(stats, start, end) {
  return (stats.ticketMessages || []).filter((message) => message.at >= start && message.at < end).length;
}

function summarizeSessions(stats, activeSession, sessionKey, start, end) {
  const days = new Set();
  let totalMs = 0;

  for (const session of stats[sessionKey] || []) {
    const duration = overlapDuration(session.start, session.end, start, end);
    if (duration <= 0) continue;

    totalMs += duration;
    addActiveDays(days, session.start, session.end, start, end);
  }

  if (activeSession) {
    const duration = overlapDuration(activeSession.start, Date.now(), start, end);
    if (duration > 0) {
      totalMs += duration;
      addActiveDays(days, activeSession.start, Date.now(), start, end);
    }
  }

  return { totalMs, days: days.size };
}

function collectStaffRanking(guild, period = 'mensal', windowOverride = null) {
  const data = loadData();
  const window = windowOverride || getPeriodWindow(period);
  const staffMembers = [...guild.members.cache.values()].filter((member) => isStaffMember(member));

  for (const member of staffMembers) {
    ensureMember(data, member);
  }
  saveData(data);

  return staffMembers.map((member) => {
    const stats = data.members[member.id] || ensureMember(data, member);
    const support = summarizeSessions(stats, data.activeSupport[member.id], 'supportSessions', window.start, window.end);
    const discord = summarizeSessions(stats, data.activeDiscord[member.id], 'discordSessions', window.start, window.end);

    return {
      id: member.id,
      mention: `<@${member.id}>`,
      name: getMemberName(member),
      roleName: getMainStaffRole(member),
      tickets: countTickets(stats, window.start, window.end),
      ticketMessages: countTicketMessages(stats, window.start, window.end),
      supportMs: support.totalMs,
      supportDays: support.days,
      discordMs: discord.totalMs,
      discordDays: discord.days
    };
  }).sort((a, b) =>
    b.tickets - a.tickets ||
    b.supportMs - a.supportMs ||
    b.discordMs - a.discordMs ||
    b.ticketMessages - a.ticketMessages
  );
}

function splitLines(lines, maxLength = 3900) {
  const chunks = [];
  let current = [];
  let length = 0;

  for (const line of lines) {
    const extra = line.length + (current.length > 0 ? 2 : 0);
    if (current.length > 0 && length + extra > maxLength) {
      chunks.push(current);
      current = [];
      length = 0;
    }
    current.push(line);
    length += extra;
  }

  if (current.length > 0) chunks.push(current);
  return chunks;
}

function buildStaffStatsEmbeds(guild, period = 'mensal', options = {}) {
  const window = options.window || getPeriodWindow(period);
  const label = options.titleLabel || PERIOD_LABELS[period] || 'Mensal';
  let ranking = collectStaffRanking(guild, period, window);

  if (options.userId) {
    ranking = ranking.filter((item) => item.id === options.userId);
  }

  const lines = ranking.map((item, index) => {
    const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `**${index + 1}.**`;
    return [
      `${medal} ${item.mention} — **${item.roleName}**`,
      `🎫 Tickets: **${item.tickets}** | 💬 Respostas: **${item.ticketMessages}**`,
      `🎧 Suporte: **${formatDuration(item.supportMs)}** em **${item.supportDays} dia(s)**`,
      `🟦 Discord: **${formatDuration(item.discordMs)}** em **${item.discordDays} dia(s)**`
    ].join('\n');
  });

  const descriptionLines = lines.length > 0
    ? lines
    : ['Nenhum dado de staff encontrado nesse período.'];

  const chunks = splitLines(descriptionLines);
  const embeds = [];

  chunks.forEach((chunk, index) => {
    const embed = baseEmbed()
      .setColor(0xf1c40f)
      .setTitle(`🏆 Ranking da Staff — ${label}${chunks.length > 1 ? ` (${index + 1}/${chunks.length})` : ''}`)
      .setDescription([
        `📅 **Período:** ${window.label}`,
        '',
        ...chunk
      ].join('\n\n'))
      .setFooter({ text: 'Tickets = staff que respondeu/assumiu ticket • Suporte = tempo nos canais de atendimento • Discord = tempo online' })
      .setTimestamp();

    embeds.push(embed);
  });

  return embeds;
}

async function sendStaffStatsReport(guild, period = 'mensal', options = {}) {
  const channel = guild.channels.cache.find((item) => item.name === CHANNELS.staffRanking && item.isTextBased())
    || guild.channels.cache.find((item) => item.name === CHANNELS.logsStaff && item.isTextBased());

  if (!channel) return false;

  const embeds = buildStaffStatsEmbeds(guild, period, options);
  await channel.send({ embeds }).catch((error) => {
    console.error('Erro ao enviar ranking da staff:', error);
  });

  return true;
}

function initializeStaffStatsForGuild(guild) {
  const data = loadData();

  for (const member of guild.members.cache.values()) {
    if (!isStaffMember(member) || member.user?.bot) continue;

    ensureMember(data, member);

    if (member.voice?.channel && isSupportVoiceChannel(member.voice.channel) && !data.activeSupport[member.id]) {
      data.activeSupport[member.id] = {
        guildId: guild.id,
        channelId: member.voice.channelId,
        start: Date.now()
      };
    }

    if (isOnlineStatus(member.presence?.status) && !data.activeDiscord[member.id]) {
      data.activeDiscord[member.id] = {
        guildId: guild.id,
        status: member.presence.status,
        start: Date.now()
      };
    }
  }

  saveData(data);
}

function setupDailyStaffStatsReport(client) {
  if (client.__szDailyStaffStatsStarted) return;
  client.__szDailyStaffStatsStarted = true;

  setInterval(async () => {
    const parts = getBrazilDateParts(Date.now());

    // Publica o fechamento entre 00:00 e 02:59, uma vez por dia.
    if (parts.hour < 0 || parts.hour > 2) return;

    const todayKey = dateKeyFromParts(parts);
    const yesterdayKey = addDaysToKey(todayKey, -1);

    const data = loadData();
    let changed = false;

    for (const guild of client.guilds.cache.values()) {
      const reportKey = `${guild.id}:${yesterdayKey}`;
      if (data.dailyReports[reportKey]) continue;

      const window = windowFromDateKey(yesterdayKey);
      await sendStaffStatsReport(guild, 'diario', {
        window,
        titleLabel: `Fechamento do Dia ${window.label}`
      });

      data.dailyReports[reportKey] = Date.now();
      changed = true;
    }

    if (changed) saveData(data);
  }, 60 * 1000);
}

module.exports = {
  buildStaffStatsEmbeds,
  collectStaffRanking,
  endDiscordSession,
  endSupportSession,
  handleStaffPresenceUpdate,
  handleStaffVoiceStateUpdate,
  initializeStaffStatsForGuild,
  recordTicketAnswered,
  recordTicketMessage,
  sendStaffStatsReport,
  setupDailyStaffStatsReport,
  startDiscordSession,
  startSupportSession
};
