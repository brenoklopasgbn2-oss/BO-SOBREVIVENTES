import dotenv from 'dotenv';
import crypto from 'crypto';

dotenv.config();

const DEFAULT_WEBHOOKS = {
  sales: '',
  playersVanilla: '',
  clansVanilla: '',
  playersBbp: '',
  lands: '',
  playersGlobal: '',
  clansGlobal: ''
};


function required(name) {
  const value = process.env[name];
  if (!value || !value.trim()) {
    throw new Error(`Variável obrigatória ausente: ${name}`);
  }
  return value;
}

function optional(name, fallback = '') {
  return process.env[name] || fallback;
}

export const env = {
  nodeEnv: optional('NODE_ENV', 'development'),
  port: Number(optional('PORT', '3000')),
  publicUrl: optional('PUBLIC_URL', `http://localhost:${optional('PORT', '3000')}`).replace(/\/$/, ''),
  appName: optional('APP_NAME', 'RAID-Z Store'),
  cookieSecret: optional('COOKIE_SECRET', crypto.randomBytes(32).toString('hex')),
  ftpConfigSecret: optional('FTP_CONFIG_SECRET', optional('COOKIE_SECRET', 'raidz-file-bridge-change-me')),
  adminUser: optional('ADMIN_USER', 'admin'),
  adminPassword: required('ADMIN_PASSWORD'),
  // API HTTP antiga do mod. É opcional: sem chave, as rotas /api ficam fechadas, mas o site inicia normalmente.
  apiKey: optional('API_KEY'),
  mercadoPagoAccessToken: optional('MERCADOPAGO_ACCESS_TOKEN'),
  // auto: tenta Orders primeiro e, se a própria transação falhar com 402/409,
  // tenta a API de Pagamentos automaticamente com o mesmo Access Token.
  mercadoPagoApiMode: optional('MERCADOPAGO_API_MODE', 'auto'),
  mercadoPagoWebhookSecret: optional('MERCADOPAGO_WEBHOOK_SECRET'),
  defaultPayerEmail: optional('DEFAULT_PAYER_EMAIL'),
  discordWebhookUrl: optional('DISCORD_WEBHOOK_URL', DEFAULT_WEBHOOKS.sales),
  discordSalesWebhookUrl: optional('DISCORD_SALES_WEBHOOK_URL', DEFAULT_WEBHOOKS.sales),
  discordRankingPlayersVanillaWebhookUrl: optional('DISCORD_RANKING_PLAYERS_VANILLA_WEBHOOK_URL', DEFAULT_WEBHOOKS.playersVanilla),
  discordRankingClansVanillaWebhookUrl: optional('DISCORD_RANKING_CLANS_VANILLA_WEBHOOK_URL', DEFAULT_WEBHOOKS.clansVanilla),
  discordRankingPlayersBbpWebhookUrl: optional('DISCORD_RANKING_PLAYERS_BBP_WEBHOOK_URL', DEFAULT_WEBHOOKS.playersBbp),
  discordRankingClansBbpWebhookUrl: optional('DISCORD_RANKING_CLANS_BBP_WEBHOOK_URL'),
  discordRankingPlayersGlobalWebhookUrl: optional('DISCORD_RANKING_PLAYERS_GLOBAL_WEBHOOK_URL', DEFAULT_WEBHOOKS.playersGlobal),
  discordRankingClansGlobalWebhookUrl: optional('DISCORD_RANKING_CLANS_GLOBAL_WEBHOOK_URL', DEFAULT_WEBHOOKS.clansGlobal),
  discordRankingLandsWebhookUrl: optional('DISCORD_RANKING_LANDS_WEBHOOK_URL', DEFAULT_WEBHOOKS.lands),
  discordWebhookName: optional('DISCORD_WEBHOOK_NAME', 'RAID-Z • Logs'),
  discordWebhookAvatarUrl: optional('DISCORD_WEBHOOK_AVATAR_URL'),
  currencyName: optional('STORE_CURRENCY_NAME', 'RZ Coins'),
  monthlyReportCron: optional('MONTHLY_REPORT_CRON', '0 9 1 * *'),
  timezone: optional('TIMEZONE', 'America/Sao_Paulo')
};
