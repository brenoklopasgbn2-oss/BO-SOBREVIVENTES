const { prisma } = require('./platformDb');

function cleanId(value) {
  return String(value || '').replace(/\D/g, '').slice(0, 24);
}

function formatDate(value) {
  if (!value) return '—';
  try {
    return new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    }).format(new Date(value));
  } catch {
    return '—';
  }
}

function discordTimestamp(ms) {
  if (!ms) return '—';
  return `<t:${Math.floor(Number(ms) / 1000)}:F>`;
}

async function getTicketPlayerData({ guildId, member }) {
  const discordId = cleanId(member?.id);
  const gid = String(guildId || '').trim();
  if (!discordId) return null;

  const [player, referral] = await Promise.all([
    prisma.player.findUnique({
      where: { discordId },
      select: {
        id: true,
        steam64: true,
        discordId: true,
        discordUsername: true,
        discordLinkedAt: true,
        nickname: true,
        coins: true,
        cash: true,
        lastSeenOnlineAt: true,
        onlineSince: true,
        lastSeenServerId: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            payments: true,
            purchases: true,
            deliveries: true,
            ownedVehicles: true,
            outfitSubscriptions: true,
            starterKitClaims: true,
            clanMemberships: true
          }
        }
      }
    }).catch((error) => {
      console.error('Erro ao consultar player vinculado para ticket:', error?.message || error);
      return null;
    }),
    gid ? prisma.streamerReferral.findUnique({
      where: { guildId_playerDiscordId: { guildId: gid, playerDiscordId: discordId } },
      include: { streamerProfile: { select: { streamerName: true, discordUserId: true, active: true } } }
    }).catch(() => null) : Promise.resolve(null)
  ]);

  const roles = member?.roles?.cache
    ? [...member.roles.cache.values()]
      .filter((role) => role.id !== member.guild.id)
      .sort((a, b) => b.position - a.position)
      .map((role) => role.name)
    : [];

  return {
    linked: Boolean(player && /^\d{17}$/.test(String(player.steam64 || ''))),
    discord: {
      id: discordId,
      username: member?.user?.username || '—',
      globalName: member?.user?.globalName || null,
      displayName: member?.displayName || member?.user?.globalName || member?.user?.username || '—',
      accountCreatedAt: member?.user?.createdAt || null,
      joinedAt: member?.joinedAt || null,
      roles
    },
    player,
    referral,
    formatDate,
    discordTimestamp
  };
}

function buildTicketLinkFields(data) {
  if (!data?.linked || !data.player) {
    return [
      { name: '🔗 Vínculo Discord ↔ Steam', value: '❌ **NÃO VINCULADO**', inline: true },
      { name: '🆔 Discord ID', value: data?.discord?.id || '—', inline: true },
      { name: '🎮 Steam64', value: 'Não disponível', inline: true }
    ];
  }

  const p = data.player;
  return [
    { name: '🔗 Vínculo Discord ↔ Steam', value: '✅ **VINCULADO**', inline: true },
    { name: '🎮 Steam64', value: `\`${p.steam64}\``, inline: true },
    { name: '🪪 Nick cadastrado', value: p.nickname || 'Não informado', inline: true }
  ];
}

function buildStaffProfileFields(data) {
  const discord = data?.discord || {};
  const p = data?.player || null;
  const fields = [
    { name: '🔗 Status do vínculo', value: data?.linked ? '✅ VINCULADO' : '❌ NÃO VINCULADO', inline: true },
    { name: '👤 Discord', value: `${discord.displayName || '—'}\n@${discord.username || '—'}`, inline: true },
    { name: '🆔 Discord ID', value: `\`${discord.id || '—'}\``, inline: true },
    { name: '📅 Conta Discord criada', value: data?.discordTimestamp?.(discord.accountCreatedAt?.getTime?.()) || '—', inline: true },
    { name: '📥 Entrou no Discord', value: data?.discordTimestamp?.(discord.joinedAt?.getTime?.()) || '—', inline: true },
    { name: '🎭 Cargos', value: discord.roles?.length ? discord.roles.slice(0, 15).join(', ').slice(0, 1024) : 'Nenhum cargo adicional', inline: false }
  ];

  if (!p) {
    fields.push({ name: '🎮 Dados do jogador', value: 'Nenhum Player do PostgreSQL está vinculado a este Discord.', inline: false });
  } else {
    fields.push(
      { name: '🎮 Steam64', value: `\`${p.steam64}\``, inline: true },
      { name: '🪪 Nick', value: p.nickname || 'Não informado', inline: true },
      { name: '🔗 Vinculado em', value: data.formatDate(p.discordLinkedAt), inline: true },
      { name: '🟢 Online desde', value: p.onlineSince ? data.formatDate(p.onlineSince) : 'Offline', inline: true },
      { name: '👁️ Último online', value: data.formatDate(p.lastSeenOnlineAt), inline: true },
      { name: '🖥️ Último servidor', value: p.lastSeenServerId || '—', inline: true },
      { name: '🪙 Saldo', value: `Moedas: **${Number(p.coins || 0).toLocaleString('pt-BR')}**\nCash: **${Number(p.cash || 0).toLocaleString('pt-BR')}**`, inline: true },
      { name: '🛒 Histórico', value: `Compras: **${p._count?.purchases || 0}**\nPagamentos: **${p._count?.payments || 0}**\nEntregas: **${p._count?.deliveries || 0}**`, inline: true },
      { name: '🏕️ Conta de jogo', value: `Veículos: **${p._count?.ownedVehicles || 0}**\nVIP/trajes: **${p._count?.outfitSubscriptions || 0}**\nClãs: **${p._count?.clanMemberships || 0}**\nKit inicial: **${p._count?.starterKitClaims || 0}**`, inline: true },
      { name: '🕒 Último login no site', value: data.formatDate(p.lastLoginAt), inline: true },
      { name: '🗃️ Player criado no banco', value: data.formatDate(p.createdAt), inline: true },
      { name: '♻️ Perfil atualizado', value: data.formatDate(p.updatedAt), inline: true }
    );
  }

  if (data?.referral?.streamerProfile) {
    fields.push({
      name: '🎥 Veio por streamer',
      value: `**${data.referral.streamerProfile.streamerName}** (<@${data.referral.streamerProfile.discordUserId}>)\nRegistrado em: ${data.formatDate(data.referral.selectedAt)}`,
      inline: false
    });
  } else {
    fields.push({ name: '🎥 Indicação de streamer', value: 'Nenhuma indicação registrada.', inline: false });
  }

  return fields.slice(0, 25);
}

module.exports = { getTicketPlayerData, buildTicketLinkFields, buildStaffProfileFields };
