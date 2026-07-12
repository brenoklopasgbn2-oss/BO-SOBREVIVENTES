import { env } from '../config/env.js';
import { brl, coins } from '../utils/format.js';

const COLORS = {
  green: 0x22c55e,
  red: 0xef4444,
  orange: 0xf97316,
  blue: 0x38bdf8,
  yellow: 0xfacc15,
  purple: 0x8b5cf6,
  gold: 0xf7bd44,
  dark: 0x111827
};

const DISCORD_STYLE = {
  storeIcon: 'https://cdn-icons-png.flaticon.com/512/869/869636.png',
  pixIcon: 'https://cdn-icons-png.flaticon.com/512/190/190411.png',
  cartIcon: 'https://cdn-icons-png.flaticon.com/512/3144/3144456.png',
  trophyIcon: 'https://cdn-icons-png.flaticon.com/512/2583/2583344.png'
};

function discordLink(path = '/') {
  const base = String(env.publicUrl || '').replace(/\/$/, '');
  return base ? `${base}${path.startsWith('/') ? path : '/' + path}` : '-';
}

function resolveWebhookUrl(kind = 'default') {
  if (kind === 'sales') return env.discordSalesWebhookUrl || env.discordWebhookUrl;
  if (kind === 'players_vanilla') return env.discordRankingPlayersVanillaWebhookUrl || env.discordWebhookUrl;
  if (kind === 'clans_vanilla') return env.discordRankingClansVanillaWebhookUrl || env.discordWebhookUrl;
  if (kind === 'players_bbp') return env.discordRankingPlayersBbpWebhookUrl || env.discordWebhookUrl;
  if (kind === 'clans_bbp') return env.discordRankingClansBbpWebhookUrl || env.discordWebhookUrl;
  if (kind === 'players_global') return env.discordRankingPlayersGlobalWebhookUrl || env.discordWebhookUrl;
  if (kind === 'clans_global') return env.discordRankingClansGlobalWebhookUrl || env.discordWebhookUrl;
  if (kind === 'lands') return env.discordRankingLandsWebhookUrl || env.discordWebhookUrl;
  return env.discordWebhookUrl;
}

export async function sendDiscord(payload, { kind = 'default', webhookUrl = null, username = null } = {}) {
  const targetUrl = webhookUrl || resolveWebhookUrl(kind);
  if (!targetUrl) return { ok: false, skipped: true };
  const body = {
    username: username || env.discordWebhookName,
    avatar_url: env.discordWebhookAvatarUrl || undefined,
    allowed_mentions: { parse: [] },
    ...payload
  };
  try {
    const res = await fetch(targetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      console.error('Discord webhook erro:', res.status, await res.text());
    }
    return { ok: res.ok };
  } catch (err) {
    console.error('Falha ao enviar log Discord:', err.message);
    return { ok: false, error: err.message };
  }
}

function safe(value, fallback = '-') {
  const text = String(value ?? '').trim();
  return text || fallback;
}

function shortId(id = '') {
  const text = String(id || '');
  return text.length > 12 ? `${text.slice(0, 6)}...${text.slice(-4)}` : text;
}

function deliverySummary(deliveries = [], fallbackProduct = null, fallbackPurchase = null) {
  const lines = deliveries.length
    ? deliveries.map((d) => `• **${d.quantity}x** \`${d.classname}\` — ${safe(d.productName)}`)
    : [`• **${(fallbackProduct?.quantity || 1) * (fallbackPurchase?.quantity || 1)}x** \`${fallbackProduct?.classname || '-'}\``];
  const text = lines.join('\n');
  return text.length > 1000 ? `${text.slice(0, 980)}\n...` : text;
}

export async function logPaymentApproved({ player, payment }) {
  const supportField = payment.supportStreamerCode
    ? [{ name: '❤️ Streamer apoiado', value: `Código: **${payment.supportStreamerCode}**\nComissão: **${payment.supportCommissionPercent || 0}%**`, inline: true }]
    : [];
  const embed = {
    author: { name: 'RAID-Z • PIX aprovado', icon_url: DISCORD_STYLE.pixIcon },
    title: '✅ DOAÇÃO PIX CONFIRMADA',
    description: 'Pagamento aprovado automaticamente. As moedas já foram creditadas no saldo do player.',
    color: COLORS.green,
    thumbnail: { url: DISCORD_STYLE.pixIcon },
    fields: [
      { name: '👤 Player', value: `${safe(player.nickname, 'Sem nome')}\n\`${player.steam64}\``, inline: true },
      { name: '💸 Valor recebido', value: `**${brl(payment.amountBrl)}**`, inline: true },
      { name: '🪙 Moedas entregues', value: `**+${coins(payment.coins)} ${env.currencyName}**`, inline: true },
      { name: '🏦 Saldo atual', value: `**${coins(player.coins)} ${env.currencyName}**`, inline: true },
      { name: '🧾 ID Pix', value: `\`${shortId(payment.providerPaymentId || payment.id)}\``, inline: true },
      { name: '🛒 Loja', value: `[Abrir painel](${discordLink('/admin/payments')})`, inline: true },
      ...supportField
    ],
    footer: { text: 'RAID-Z Store • Sistema automático de doações' },
    timestamp: new Date().toISOString()
  };
  await sendDiscord({ embeds: [embed] }, { kind: 'sales', username: '💸 RAID-Z • Doações' });
  if (env.discordSalesWebhookUrl && env.discordWebhookUrl && env.discordSalesWebhookUrl !== env.discordWebhookUrl) {
    await sendDiscord({ embeds: [embed] }, { kind: 'default', username: '💸 RAID-Z • Doações' });
  }
}

export async function logPurchase({ player, product, purchase, delivery, deliveries = [], coupon = null, support = null, gift = null }) {
  return sendDiscord({
    embeds: [{
      author: { name: 'RAID-Z • Loja Vanilla', icon_url: DISCORD_STYLE.storeIcon },
      title: '🛒 NOVA DOAÇÃO DE ITEM',
      description: `O player fez uma doação e escolheu **${safe(product.name)}**. A entrega foi criada para cair no DayZ.`,
      color: COLORS.orange,
      thumbnail: product.imageUrl ? { url: product.imageUrl } : { url: DISCORD_STYLE.storeIcon },
      fields: [
        { name: '👤 Player', value: `${safe(player.nickname, 'Sem nome')}\n\`${player.steam64}\``, inline: true },
        { name: '🎮 Servidor', value: `**${safe(product.serverType).toUpperCase()}**`, inline: true },
        { name: '💰 Total pago', value: `**${coins(purchase.totalCoins)} ${env.currencyName}**`, inline: true },
        { name: '📦 Produto', value: `${safe(product.name)}\nQtd: **${purchase.quantity}x**`, inline: true },
        { name: '🏦 Saldo após', value: `**${coins(player.coins)} ${env.currencyName}**`, inline: true },
        { name: '🚚 Entrega no jogo', value: `Status: **${delivery?.status || 'PENDING'}**\nModo: **${delivery?.deliveryType || product.deliveryType || '-'}**`, inline: true },
        { name: '📋 Itens / Classnames', value: deliverySummary(deliveries, product, purchase), inline: false },
        ...(coupon?.code ? [{ name: '🏷️ Cupom aplicado', value: `**${coupon.code}**\nDesconto: **-${coins(coupon.discountCoins)} RZ**`, inline: true }] : []),
        ...(support?.code ? [{ name: '❤️ Streamer apoiado', value: `**${support.streamerName}**\nCódigo: **${support.code}**\nComissão: **${coins(support.commissionCoins)} RZ**`, inline: true }] : []),
        ...(gift?.steam64 ? [{ name: '🎁 Presente para', value: `\`${gift.steam64}\``, inline: true }] : [])
      ],
      footer: { text: `Compra ${shortId(purchase.id)} • RAID-Z Store` },
      timestamp: new Date().toISOString()
    }]
  }, { kind: 'sales', username: '🛒 RAID-Z • Vendas' });
}

export async function logCartPurchase({ player, purchases = [], deliveries = [], totalCoins = 0, coupon = null, support = null }) {
  const productsLine = purchases.map((p, idx) => `**${idx + 1}.** ${p.productName || p.product?.name || 'Produto'} — ${p.quantity}x — **${coins(p.totalCoins)} RZ**`).join('\n').slice(0, 1000) || '-';
  return sendDiscord({
    embeds: [{
      author: { name: 'RAID-Z • Carrinho finalizado', icon_url: DISCORD_STYLE.cartIcon },
      title: '🧺 CARRINHO FINALIZADO NA LOJA',
      description: 'Player comprou vários itens de uma vez. O sistema recalculou tudo no servidor e criou as entregas no DayZ.',
      color: COLORS.gold,
      thumbnail: { url: DISCORD_STYLE.cartIcon },
      fields: [
        { name: '👤 Player', value: `${safe(player.nickname, 'Sem nome')}\n\`${player.steam64}\``, inline: true },
        { name: '💰 Total pago', value: `**${coins(totalCoins)} ${env.currencyName}**`, inline: true },
        { name: '📦 Quantidade de produtos', value: `**${purchases.length}**`, inline: true },
        { name: '🧾 Lista do carrinho', value: productsLine, inline: false },
        { name: '🚚 Entregas criadas', value: `**${deliveries.length}**`, inline: true },
        { name: '🏦 Saldo após', value: `**${coins(player.coins)} ${env.currencyName}**`, inline: true },
        ...(coupon?.code ? [{ name: '🏷️ Cupom aplicado', value: `**${coupon.code}**\nDesconto: **-${coins(coupon.discountCoins)} RZ**`, inline: true }] : []),
        ...(support?.code ? [{ name: '❤️ Streamer apoiado', value: `**${support.streamerName}**\nCódigo: **${support.code}**\nComissão: **${coins(support.commissionCoins)} RZ**`, inline: true }] : [])
      ],
      footer: { text: 'RAID-Z Store • Carrinho e cupom' },
      timestamp: new Date().toISOString()
    }]
  }, { kind: 'sales', username: '🧺 RAID-Z • Carrinho' });
}

export async function logBalanceChange({ player, amount, type, reason }) {
  const isCredit = Number(amount) >= 0 || type === 'CREDIT';
  return sendDiscord({
    embeds: [{
      title: isCredit ? '➕ Saldo entrou' : '➖ Saldo saiu',
      color: isCredit ? COLORS.green : COLORS.red,
      fields: [
        { name: 'Steam64', value: player.steam64, inline: true },
        { name: 'Player', value: player.nickname || 'Sem nome', inline: true },
        { name: 'Movimento', value: `${isCredit ? '+' : ''}${coins(amount)} ${env.currencyName}`, inline: true },
        { name: 'Saldo atual', value: `${coins(player.coins)} ${env.currencyName}`, inline: true },
        { name: 'Motivo', value: reason || '-', inline: false }
      ],
      timestamp: new Date().toISOString()
    }]
  });
}

export async function logDelivery({ delivery, ok, error }) {
  return sendDiscord({
    embeds: [{
      title: ok ? '📦 Item entregue no DayZ' : '⚠️ Falha na entrega',
      color: ok ? COLORS.blue : COLORS.yellow,
      fields: [
        { name: 'Steam64', value: delivery.steam64, inline: true },
        { name: 'Item', value: delivery.productName, inline: true },
        { name: 'Classname', value: delivery.classname, inline: true },
        { name: 'Quantidade', value: String(delivery.quantity), inline: true },
        { name: 'Servidor', value: delivery.serverType, inline: true },
        { name: 'Status', value: ok ? 'DELIVERED' : 'FAILED', inline: true },
        ...(delivery.meta?.dropBoxClassname ? [{ name: 'Caixa usada', value: `\`${delivery.meta.dropBoxClassname}\``, inline: true }] : []),
        ...(error ? [{ name: 'Erro', value: String(error).slice(0, 900), inline: false }] : [])
      ],
      timestamp: new Date().toISOString()
    }]
  });
}

export async function logMonthlyReport({ monthLabel, totalBrl, approvedPayments, coinsSold, purchases, playersCreated }) {
  return sendDiscord({
    embeds: [{
      title: `📊 Resumo mensal da loja - ${monthLabel}`,
      color: COLORS.purple,
      fields: [
        { name: 'Reais recebidos', value: brl(totalBrl), inline: true },
        { name: 'Pix aprovados', value: String(approvedPayments), inline: true },
        { name: 'Moedas vendidas', value: `${coins(coinsSold)} ${env.currencyName}`, inline: true },
        { name: 'Compras de itens', value: String(purchases), inline: true },
        { name: 'Players novos', value: String(playersCreated), inline: true }
      ],
      timestamp: new Date().toISOString()
    }]
  });
}

function rankingLines(rows, kind) {
  if (!rows.length) return ['Sem dados ainda.'];
  return rows.map((row, index) => {
    const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`;
    if (kind === 'clans') {
      return `${medal} **[${row.tag}] ${row.name}**\n┗ **${row.score} pts** • ${row.kills} kills • ${row.deaths} mortes • KD **${row.kd}** • ${row.membersCount} membros`;
    }
    return `${medal} **${row.name || row.steam64}**\n┗ **${row.score} pts** • ${row.kills} kills • ${row.deaths} mortes • HS ${row.headshots} • KD **${row.kd}** • maior kill ${Math.round(row.longestKill || 0)}m`;
  });
}

function chunkLines(lines, maxLen = 950) {
  const chunks = [];
  let current = '';
  for (const line of lines) {
    if ((current + '\n' + line).length > maxLen && current) {
      chunks.push(current);
      current = line;
    } else {
      current = current ? `${current}\n${line}` : line;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

function rankingKindFor(server, kind) {
  const s = server === 'global' ? 'global' : server;
  return `${kind}_${s}`;
}

export async function sendRankingToDiscord({ rankingData, kind = 'players', server = 'vanilla', period = 'weekly', title = '' }) {
  const rows = kind === 'clans' ? rankingData.clanRanking : rankingData.playerRanking;
  const totalRows = rows.length;
  const lines = rankingLines(rows.slice(0, 60), kind);
  const chunks = chunkLines(lines, 1200);
  const labelKind = kind === 'clans' ? 'CLÃS' : 'PLAYERS';
  const labelServer = server === 'global' ? 'GERAL' : server.toUpperCase();
  const color = kind === 'clans' ? COLORS.purple : (server === 'bbp' ? COLORS.blue : COLORS.red);
  const periodLabel = rankingData.range?.label || period;
  const embeds = chunks.slice(0, 10).map((chunk, idx) => ({
    author: idx === 0 ? { name: `RAID-Z • Ranking ${labelServer}`, icon_url: DISCORD_STYLE.trophyIcon } : undefined,
    title: idx === 0 ? (title || `🏆 RANKING ${labelKind} ${labelServer}`) : `🏆 RANKING ${labelKind} ${labelServer} • PARTE ${idx + 1}`,
    description: idx === 0
      ? `**Período:** ${periodLabel}\n**Servidor:** ${labelServer}\n\n${chunk}`
      : chunk,
    color,
    thumbnail: idx === 0 ? { url: DISCORD_STYLE.trophyIcon } : undefined,
    fields: idx === 0 ? [
      { name: '📊 Listados', value: String(totalRows), inline: true },
      { name: '💀 Kills', value: String(rankingData.totals?.kills || 0), inline: true },
      { name: '🎯 Headshots', value: String(rankingData.totals?.headshots || 0), inline: true },
      { name: '📏 Maior kill', value: `${Math.round(rankingData.totals?.longestKill || 0)}m`, inline: true },
      { name: '🔗 Painel', value: `[Ver ranking no site](${discordLink('/ranking')})`, inline: true },
      { name: '⏱️ Atualizado', value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true }
    ] : [],
    footer: { text: 'RAID-Z • Ranking automático completo' },
    timestamp: new Date().toISOString()
  }));
  return sendDiscord({ embeds }, { kind: rankingKindFor(server, kind), username: `🏆 Ranking ${labelServer} • ${labelKind}` });
}
