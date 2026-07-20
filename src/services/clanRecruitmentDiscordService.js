import { prisma } from '../db/prisma.js';
import { env } from '../config/env.js';
import { sendDiscord } from './discordLogger.js';
import { getRecruitingClans } from './clanHubService.js';

const SETTING_KEY = 'clanRecruitmentDiscord.v107';
const DEFAULT_CONFIG = {
  enabled: false,
  webhookUrl1: '',
  webhookUrl2: '',
  intervalHours: 6,
  sendInstructions: true,
  lastSentAt: null,
  lastAttemptAt: null,
  lastStatus: 'NEVER',
  lastError: null,
  lastSentClans: 0,
  lastSentClanId: null,
  lastSentClanName: null,
  clanSchedule: {},
  updatedAt: null
};

function clamp(value, min, max, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

function bool(value, fallback = false) {
  if (typeof value === 'boolean') return value;
  const text = String(value ?? '').trim().toLowerCase();
  if (!text) return fallback;
  return ['1', 'true', 'yes', 'sim', 'on'].includes(text);
}

function cleanWebhookUrl(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  let url;
  try {
    url = new URL(raw);
  } catch {
    throw new Error('Webhook inválido. Cole o endereço completo gerado pelo Discord.');
  }
  const host = url.hostname.toLowerCase();
  const allowed = host === 'discord.com'
    || host.endsWith('.discord.com')
    || host === 'discordapp.com'
    || host.endsWith('.discordapp.com');
  if (!allowed || !url.pathname.includes('/api/webhooks/')) {
    throw new Error('Use somente um webhook oficial do Discord.');
  }
  return url.toString();
}

function normalizeClanSchedule(value = {}) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const normalized = {};
  for (const [clanId, raw] of Object.entries(value)) {
    if (!clanId || !raw || typeof raw !== 'object') continue;
    normalized[clanId] = {
      lastSentAt: raw.lastSentAt || null,
      lastAttemptAt: raw.lastAttemptAt || null,
      lastStatus: String(raw.lastStatus || 'NEVER'),
      lastError: raw.lastError ? String(raw.lastError).slice(0, 1000) : null,
      clanName: raw.clanName ? String(raw.clanName).slice(0, 180) : null
    };
  }
  return normalized;
}

function normalizeConfig(value = {}) {
  const source = value && typeof value === 'object' ? value : {};
  return {
    ...DEFAULT_CONFIG,
    ...source,
    enabled: bool(source.enabled, false),
    webhookUrl1: String(source.webhookUrl1 || '').trim(),
    webhookUrl2: String(source.webhookUrl2 || '').trim(),
    intervalHours: clamp(source.intervalHours, 1, 168, 6),
    sendInstructions: bool(source.sendInstructions, true),
    clanSchedule: normalizeClanSchedule(source.clanSchedule)
  };
}

function absolute(path = '/') {
  const base = String(env.publicUrl || '').replace(/\/$/, '');
  if (!base || /^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/i.test(base)) return '';
  return `${base}${String(path).startsWith('/') ? path : `/${path}`}`;
}

function colorToInt(value) {
  const clean = String(value || '').replace('#', '');
  return /^[0-9a-f]{6}$/i.test(clean) ? Number.parseInt(clean, 16) : 0xef4444;
}

function trimField(value, max = 1024, fallback = 'Não informado') {
  const text = String(value || '').trim() || fallback;
  return text.length > max ? `${text.slice(0, max - 3)}...` : text;
}

function webhookTargets(config) {
  return [...new Set([config.webhookUrl1, config.webhookUrl2].map(v => String(v || '').trim()).filter(Boolean))];
}

export async function getClanRecruitmentDiscordConfig() {
  const row = await prisma.appSetting.findUnique({ where: { key: SETTING_KEY } });
  return normalizeConfig(row?.value || {});
}

export async function saveClanRecruitmentDiscordConfig(body = {}) {
  const current = await getClanRecruitmentDiscordConfig();
  const webhookUrl1 = cleanWebhookUrl(body.webhookUrl1);
  const webhookUrl2 = cleanWebhookUrl(body.webhookUrl2);
  const next = normalizeConfig({
    ...current,
    enabled: bool(body.enabled, false),
    webhookUrl1,
    webhookUrl2,
    intervalHours: clamp(body.intervalHours, 1, 168, 6),
    sendInstructions: bool(body.sendInstructions, false),
    updatedAt: new Date().toISOString()
  });
  if (next.enabled && !webhookTargets(next).length) {
    throw new Error('Para ativar, informe pelo menos 1 webhook do Discord.');
  }
  await prisma.appSetting.upsert({
    where: { key: SETTING_KEY },
    update: { value: next },
    create: { key: SETTING_KEY, value: next }
  });
  return next;
}

function buildRecruitmentPayload(clan, config) {
  const clanUrl = absolute(`/clans/${encodeURIComponent(clan.slug)}`);
  const clanFlag = absolute(`/clan-flag/${clan.id}`);
  const clanBanner = absolute(`/clan-banner/${clan.id}`);
  const raidzLogo = absolute('/images/sz-logo-main.png');
  const hero = absolute('/images/raidz-discord-community.webp');
  const vipText = (clan.activeOutfitNames || []).length
    ? clan.activeOutfitNames.join(', ')
    : 'Nenhum traje VIP ativo registrado no momento';
  const leader = clan.ownerPlayer?.nickname || clan.ownerPlayer?.steam64 || 'Líder não informado';

  const mainEmbed = {
    author: {
      name: 'RAID-Z • CLÃ RECRUTANDO',
      ...(raidzLogo ? { icon_url: raidzLogo } : {})
    },
    title: `🛡️ [${clan.tag}] ${clan.name} ESTÁ RECRUTANDO`,
    url: clanUrl || undefined,
    description: trimField(clan.recruitmentMessage || clan.description || 'O clã abriu vagas para novos sobreviventes no RAID-Z.', 1200),
    color: colorToInt(clan.accentColor),
    ...(clanFlag ? { thumbnail: { url: clanFlag } } : {}),
    ...((clanBanner || hero) ? { image: { url: clanBanner || hero } } : {}),
    fields: [
      { name: '👑 Líder do clã', value: trimField(leader, 200), inline: true },
      { name: '👥 Membros atuais', value: `**${clan.memberCount || 0}** membro(s)`, inline: true },
      { name: '🎮 Servidor', value: `**${String(clan.serverType || 'vanilla').toUpperCase()}**`, inline: true },
      { name: '📢 O que o clã procura', value: trimField(clan.recruitmentTitle || 'Players ativos e comprometidos com o clã', 400), inline: false },
      { name: '📋 Requisitos', value: trimField(clan.recruitmentRequirements || 'Leia a descrição do clã e envie seu formulário pelo site.', 700), inline: false },
      { name: '👕 Traje VIP personalizado / ativo', value: trimField(vipText, 500), inline: false },
      { name: '💬 Contato', value: trimField(clan.recruitmentContact || 'Fale com o líder depois de enviar o formulário.', 250), inline: true },
      { name: '🔗 Página do clã', value: clanUrl ? `[Ver dados e enviar formulário](${clanUrl})` : 'Abra a aba Clãs & Recrutamento na loja RAID-Z.', inline: true }
    ],
    footer: {
      text: 'RAID-Z • Recrutamento oficial de clãs',
      ...(raidzLogo ? { icon_url: raidzLogo } : {})
    },
    timestamp: new Date().toISOString()
  };

  const embeds = [mainEmbed];
  if (config.sendInstructions) {
    embeds.push({
      author: {
        name: 'COMO PARTICIPAR DO RECRUTAMENTO',
        ...(raidzLogo ? { icon_url: raidzLogo } : {})
      },
      title: '📝 Envie sua solicitação direto para o dono do clã',
      description: [
        '**1.** Abra a loja pelo **L dentro do DayZ** para entrar com seu Steam64 correto.',
        '**2.** Entre na aba **Clãs & Recrutamento**.',
        `**3.** Abra o clã **[${clan.tag}] ${clan.name}**.`,
        '**4.** Preencha seu **nick in-game** e o pequeno formulário.',
        '**5.** O dono ou sub dono recebe no painel e pode aprovar ou recusar.',
        '**6.** Se for aprovado, você entra automaticamente na lista pública do clã.'
      ].join('\n'),
      color: 0x111827,
      ...((hero || clanFlag) ? { image: { url: hero || clanFlag } } : {}),
      fields: [
        { name: '⚠️ Importante', value: 'O Steam64 aparece automaticamente. Um player não pode fazer parte de dois clãs ao mesmo tempo.', inline: false },
        { name: '🌐 Abrir recrutamento', value: clanUrl ? `[CLIQUE AQUI PARA SE CANDIDATAR](${clanUrl}#form-recrutamento)` : 'Abra a loja RAID-Z e acesse a aba Clãs.', inline: false }
      ],
      footer: {
        text: 'Sistema automático RAID-Z Store',
        ...(raidzLogo ? { icon_url: raidzLogo } : {})
      }
    });
  }

  return {
    content: `🔥 **RAID-Z RECRUTAMENTO:** o clã **[${clan.tag}] ${clan.name}** abriu vagas agora.`,
    embeds
  };
}

async function persistStatus(patch = {}) {
  const current = await getClanRecruitmentDiscordConfig();
  const next = normalizeConfig({ ...current, ...patch });
  await prisma.appSetting.upsert({
    where: { key: SETTING_KEY },
    update: { value: next },
    create: { key: SETTING_KEY, value: next }
  });
  return next;
}

export async function sendClanRecruitmentWebhookTest(webhookUrl, slot = '1') {
  const targetUrl = cleanWebhookUrl(webhookUrl);
  const raidzLogo = absolute('/images/sz-logo-main.png');
  const hero = absolute('/images/raidz-discord-community.webp') || absolute('/images/store-hero-main.png');
  const result = await sendDiscord({
    content: `✅ Teste do Webhook ${slot} de recrutamento RAID-Z.`,
    embeds: [{
      author: { name: 'RAID-Z • TESTE DE RECRUTAMENTO', ...(raidzLogo ? { icon_url: raidzLogo } : {}) },
      title: '🛡️ WEBHOOK CONFIGURADO COM SUCESSO',
      description: 'Quando houver clãs recrutando, este canal receberá os cards completos com imagem do clã, banner, VIPs, requisitos e instruções de candidatura.',
      color: 0xef4444,
      ...(hero ? { image: { url: hero } } : {}),
      fields: [
        { name: '🔁 Automático', value: 'O intervalo é controlado em horas pelo painel ADM.', inline: true },
        { name: '🖼️ Visual', value: 'Logo RAID-Z + imagem e banner do clã.', inline: true },
        { name: '📝 Recrutamento', value: 'O player abre a aba Clãs, informa o nick e envia o formulário ao dono.', inline: false }
      ],
      footer: { text: 'RAID-Z Store • Sistema de recrutamento', ...(raidzLogo ? { icon_url: raidzLogo } : {}) },
      timestamp: new Date().toISOString()
    }]
  }, { webhookUrl: targetUrl, username: '🛡️ RAID-Z • Recrutamento de Clãs' });
  if (!result.ok) throw new Error(result.error || 'O Discord recusou o webhook. Confira o endereço e as permissões do canal.');
  return result;
}

function scheduleEntry(config, clanId) {
  return config?.clanSchedule?.[clanId] || null;
}

function validTime(value) {
  const timestamp = value ? new Date(value).getTime() : 0;
  return Number.isFinite(timestamp) && timestamp > 0 ? timestamp : 0;
}

export function getClanRecruitmentTiming(clan, config, now = Date.now()) {
  const entry = scheduleEntry(config, clan.id);
  const lastSentMs = validTime(entry?.lastSentAt);
  const intervalMs = Number(config.intervalHours || 6) * 60 * 60 * 1000;
  const nextSentMs = lastSentMs ? lastSentMs + intervalMs : now;
  return {
    clanId: clan.id,
    clanName: `[${clan.tag}] ${clan.name}`,
    lastSentAt: lastSentMs ? new Date(lastSentMs).toISOString() : null,
    nextSentAt: new Date(nextSentMs).toISOString(),
    due: now >= nextSentMs,
    lastStatus: entry?.lastStatus || 'NEVER',
    lastError: entry?.lastError || null
  };
}

export function getClanRecruitmentScheduleRows(clans = [], config = {}) {
  const now = Date.now();
  return (clans || [])
    .map(clan => ({ clan, ...getClanRecruitmentTiming(clan, config, now) }))
    .sort((a, b) => new Date(a.nextSentAt).getTime() - new Date(b.nextSentAt).getTime());
}

async function persistClanStatus(clan, patch = {}) {
  const current = await getClanRecruitmentDiscordConfig();
  const previous = scheduleEntry(current, clan.id) || {};
  const clanSchedule = {
    ...(current.clanSchedule || {}),
    [clan.id]: {
      ...previous,
      ...patch,
      clanName: `[${clan.tag}] ${clan.name}`
    }
  };
  return persistStatus({ clanSchedule });
}

export async function resetClanRecruitmentSchedule(clanId) {
  const cleanId = String(clanId || '').trim();
  if (!cleanId) return null;
  const current = await getClanRecruitmentDiscordConfig();
  const clanSchedule = { ...(current.clanSchedule || {}) };
  delete clanSchedule[cleanId];
  return persistStatus({ clanSchedule });
}

async function sendOneClan(clan, config, targets) {
  const attemptAt = new Date().toISOString();
  await persistClanStatus(clan, { lastAttemptAt: attemptAt, lastStatus: 'SENDING', lastError: null });

  let successfulMessages = 0;
  const errors = [];
  for (const targetUrl of targets) {
    const result = await sendDiscord(buildRecruitmentPayload(clan, config), {
      webhookUrl: targetUrl,
      username: '🛡️ RAID-Z • Recrutamento de Clãs'
    });
    if (result.ok) successfulMessages += 1;
    else errors.push(result.error || 'Discord recusou o webhook.');
    await new Promise(resolve => setTimeout(resolve, 650));
  }

  const finishedAt = new Date().toISOString();
  const success = successfulMessages > 0;
  const statusPatch = {
    lastAttemptAt: finishedAt,
    lastStatus: errors.length ? (success ? 'PARTIAL' : 'ERROR') : 'OK',
    lastError: errors.length ? errors.slice(0, 3).join(' | ') : null
  };
  if (success) statusPatch.lastSentAt = finishedAt;
  await persistClanStatus(clan, statusPatch);

  return {
    clan,
    success,
    successfulMessages,
    errors,
    sentAt: success ? finishedAt : null
  };
}

export async function sendClanRecruitmentDiscordNow({ force = false, onlyWebhookUrl = null, dueOnly = false, clanId = null } = {}) {
  const config = await getClanRecruitmentDiscordConfig();
  const targets = onlyWebhookUrl ? [cleanWebhookUrl(onlyWebhookUrl)] : webhookTargets(config);
  if (!targets.length) throw new Error('Nenhum webhook de recrutamento foi configurado.');
  if (!force && !config.enabled) return { ok: false, skipped: true, reason: 'disabled' };

  const clans = await getRecruitingClans({ limit: 100 });
  if (!clans.length) {
    const noClanRunAt = new Date().toISOString();
    await persistStatus({
      lastAttemptAt: noClanRunAt,
      lastStatus: 'NO_RECRUITING_CLANS',
      lastError: null,
      lastSentClans: 0
    });
    return { ok: true, sentClans: 0, targets: targets.length, reason: 'no_recruiting_clans' };
  }

  let selectedClans = clans;
  if (clanId) selectedClans = clans.filter(clan => clan.id === clanId);
  else if (dueOnly) selectedClans = getClanRecruitmentScheduleRows(clans, config).filter(row => row.due).map(row => row.clan);

  if (!selectedClans.length) {
    return { ok: true, skipped: true, sentClans: 0, targets: targets.length, reason: 'no_clans_due' };
  }

  const startedAt = new Date().toISOString();
  await persistStatus({ lastAttemptAt: startedAt, lastStatus: 'SENDING', lastError: null });
  const results = [];

  for (const clan of selectedClans) {
    results.push(await sendOneClan(clan, config, targets));
    if (selectedClans.length > 1) await new Promise(resolve => setTimeout(resolve, 1500));
  }

  const successful = results.filter(result => result.success);
  const errors = results.flatMap(result => result.errors || []);
  const finishedAt = new Date().toISOString();
  const lastClan = successful.at(-1)?.clan || null;
  await persistStatus({
    lastSentAt: successful.length ? finishedAt : config.lastSentAt,
    lastAttemptAt: finishedAt,
    lastStatus: errors.length ? (successful.length ? 'PARTIAL' : 'ERROR') : 'OK',
    lastError: errors.length ? errors.slice(0, 5).join(' | ') : null,
    lastSentClans: successful.length,
    lastSentClanId: lastClan?.id || config.lastSentClanId,
    lastSentClanName: lastClan ? `[${lastClan.tag}] ${lastClan.name}` : config.lastSentClanName
  });

  return {
    ok: successful.length === selectedClans.length && !errors.length,
    partial: successful.length > 0 && (successful.length < selectedClans.length || errors.length > 0),
    sentClans: successful.length,
    dueClans: selectedClans.length,
    availableRecruitingClans: clans.length,
    clans: successful.map(result => result.clan),
    clan: successful.length === 1 ? successful[0].clan : null,
    targets: targets.length,
    successfulMessages: successful.reduce((sum, result) => sum + result.successfulMessages, 0),
    errors
  };
}

export async function runClanRecruitmentDiscordCycle() {
  const config = await getClanRecruitmentDiscordConfig();
  if (!config.enabled || !webhookTargets(config).length) return { skipped: true, reason: 'disabled_or_missing_webhook' };
  return sendClanRecruitmentDiscordNow({ force: true, dueOnly: true });
}

export function getClanRecruitmentRecommendations(config = {}) {
  const suggestions = [];
  if (!config.webhookUrl1) suggestions.push('Configure o Webhook 1 para o canal principal de recrutamento.');
  if (!config.webhookUrl2) suggestions.push('O Webhook 2 é opcional e pode repetir o aviso em um segundo canal, como anúncios ou comunidade.');
  suggestions.push('Cada clã tem seu próprio relógio: ele é reenviado somente quando completar o intervalo desde o último anúncio daquele clã.');
  suggestions.push('Para não poluir o Discord, use um canal só para recrutamento e outro para anúncios gerais, caso queira preencher os dois webhooks.');
  suggestions.push('Solicitações individuais continuam no painel do dono do clã; não são publicadas no Discord para proteger o Steam64 dos players.');
  return suggestions;
}
