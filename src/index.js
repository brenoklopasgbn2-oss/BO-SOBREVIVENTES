import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import cron from 'node-cron';
import { env } from './config/env.js';
import { prisma } from './db/prisma.js';
import { attachPlayer } from './middleware/auth.js';
import { templateLocals } from './middleware/locals.js';
import { notFound, errorHandler } from './middleware/errors.js';
import { publicRoutes } from './routes/publicRoutes.js';
import { adminRoutes } from './routes/adminRoutes.js';
import { apiRoutes } from './routes/apiRoutes.js';
import { webhookRoutes } from './routes/webhookRoutes.js';
import { sendCurrentMonthlyReport } from './services/reportService.js';
import { ensureDefaultStoreData } from './services/bootstrapService.js';
import { getGameApiBridgeStatus } from './services/gameApiBridgeService.js';
import { runClanRecruitmentDiscordCycle } from './services/clanRecruitmentDiscordService.js';
import { syncAllClanManagedOutfits } from './services/managedOutfitService.js';
import { repairAllClanOwnerMemberships } from './services/clanHubService.js';
import { syncAutomaticTrophiesForActivePlayers } from './services/trophyService.js';
import { syncPendingMercadoPagoPayments } from './services/paymentService.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(root, 'views'));
app.set('view cache', env.nodeEnv === 'production');
app.set('trust proxy', 1);

app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      "img-src": ["'self'", 'data:', 'https:'],
      "script-src": ["'self'", "'unsafe-inline'"],
      "style-src": ["'self'", "'unsafe-inline'", 'https:']
    }
  }
}));
app.use(compression());

// V142: compatibilidade com URLs antigas .png. As imagens locais foram convertidas
// para WebP, reduzindo drasticamente o peso das páginas sem quebrar registros antigos.
const publicRoot = path.join(root, 'public');
app.use((req, res, next) => {
  if (!['GET', 'HEAD'].includes(req.method)
    || !String(req.path || '').toLowerCase().endsWith('.png')) return next();

  const relativeWebp = String(req.path || '')
    .replace(/^\/+/, '')
    .replace(/\.png$/i, '.webp');
  const candidate = path.resolve(publicRoot, relativeWebp);
  if (!candidate.startsWith(`${publicRoot}${path.sep}`) || !fs.existsSync(candidate)) return next();

  res.setHeader('Cache-Control', 'public, max-age=2592000, immutable');
  res.type('image/webp');
  return res.sendFile(candidate);
});
app.use(express.static(publicRoot, { maxAge: '30d', immutable: true, etag: true }));
app.use(express.urlencoded({ extended: true, limit: '3mb' }));
app.use(express.json({ limit: '2mb' }));
app.use(cookieParser(env.cookieSecret));

// V166: mostra no log exatamente qual rota ainda estiver lenta em produção,
// sem registrar Steam64, token ou parâmetros da URL.
app.use((req, res, next) => {
  const startedAt = process.hrtime.bigint();
  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
    if (durationMs >= 900) {
      console.warn(`[SLOW_HTTP] ${req.method} ${req.path} ${res.statusCode} ${durationMs.toFixed(0)}ms`);
    }
  });
  next();
});
// V53: o painel ADM pode carregar muitas imagens reais do catálogo DayZ.
// As rotas de imagem não podem consumir o limite de cliques/forms, senão o ADM cai em
// "Too many requests" só por abrir a lista ou trocar imagem de produto.
const normalLimiter = rateLimit({
  windowMs: 60_000,
  limit: 240,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    const p = String(req.path || '');
    return p.startsWith('/dayz-wiki-image')
      || p.startsWith('/product-image')
      || p.startsWith('/vehicle-image')
      || p.startsWith('/outfit-image')
      || p.startsWith('/player-avatar')
      || p.startsWith('/clan-flag')
      || p.startsWith('/clan-banner')
      || p.startsWith('/images/')
      || p.startsWith('/css/')
      || p.startsWith('/js/')
      || p.startsWith('/audio/');
  }
});
app.use(normalLimiter);

const adminLoginLimiter = rateLimit({
  windowMs: 15 * 60_000,
  limit: 8,
  standardHeaders: true,
  legacyHeaders: false,
  skip: req => req.method !== 'POST',
  message: 'Muitas tentativas de login. Aguarde 15 minutos e tente novamente.'
});
app.use('/admin/login', adminLoginLimiter);


app.use(attachPlayer);
app.use(templateLocals);

app.use('/', publicRoutes);
app.use('/admin', adminRoutes);
app.use('/api', apiRoutes);
app.use('/webhooks', webhookRoutes);

app.use(notFound);
app.use(errorHandler);

cron.schedule(env.monthlyReportCron, async () => {
  try {
    await sendCurrentMonthlyReport();
  } catch (err) {
    console.error('Erro ao enviar resumo mensal:', err.message);
  }
}, { timezone: env.timezone });

process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});


async function start() {
  try {
    await ensureDefaultStoreData();
    try {
      const ownerRepair = await repairAllClanOwnerMemberships();
      console.log(`Dono dos clãs conferido: ${ownerRepair.repaired}/${ownerRepair.checked}; erros: ${ownerRepair.errors}.`);
    } catch (error) {
      console.error('Correção automática dos donos de clã:', error.message);
    }
    try {
      const clanVipSync = await syncAllClanManagedOutfits();
      console.log(`Trajes VIP de clã sincronizados: ${clanVipSync.synced}/${clanVipSync.clans}; clãs automáticos criados: ${clanVipSync.autoClans?.created || 0}; membros importados: ${clanVipSync.autoClans?.membersImported || 0}`);
    } catch (error) {
      console.error('Sincronização inicial dos trajes VIP de clã:', error.message);
    }

    // Clean Store v200: o wipe do conteúdo antigo é executado uma única vez pelo bootstrap.
    // Players, saldos, ledger e pagamentos são preservados.

    // A integração DayZ agora é pull HTTP: não existe scheduler FTP no site.
    const apiBridgeStatus = await getGameApiBridgeStatus();

    // V107: verifica a cada minuto se chegou o horário configurado para divulgar
    // os clãs recrutando nos dois webhooks do Discord.
    const scheduleNextClanRecruitmentCycle = async () => {
      try {
        await runClanRecruitmentDiscordCycle();
      } catch (err) {
        console.error('Discord recrutamento de clãs:', err.message);
      } finally {
        setTimeout(scheduleNextClanRecruitmentCycle, 60_000);
      }
    };
    setTimeout(scheduleNextClanRecruitmentCycle, 15_000);

    // V117: faz backfill dos troféus automáticos sem bloquear a inicialização.
    const runAutomaticTrophyBackfill = async () => {
      try {
        const result = await syncAutomaticTrophiesForActivePlayers({ limit: 1000 });
        console.log(`Troféus automáticos sincronizados: ${result.players} players; ${result.created} novos.`);
      } catch (error) {
        console.error('Backfill de troféus automáticos:', error.message);
      }
    };
    const trophyBackfillTimer = setTimeout(runAutomaticTrophyBackfill, 30_000);
    trophyBackfillTimer.unref?.();
    const trophyInterval = setInterval(runAutomaticTrophyBackfill, 6 * 60 * 60 * 1000);
    trophyInterval.unref?.();

    // V128: confirma Pix pendentes mesmo se o webhook da nova conta ainda não estiver configurado
    // ou se o comprador fechar a tela antes da notificação chegar.
    const syncPendingPix = async () => {
      try {
        const result = await syncPendingMercadoPagoPayments({ limit: 20 });
        if (result.updated || result.errors) console.log('Sincronização Pix:', result);
      } catch (error) {
        console.error('Sincronização automática Pix:', error.message);
      }
    };
    const pixStartTimer = setTimeout(syncPendingPix, 12_000);
    pixStartTimer.unref?.();
    const pixInterval = setInterval(syncPendingPix, 30_000);
    pixInterval.unref?.();

    app.listen(env.port, () => {
      console.log(`${env.appName} rodando na porta ${env.port}`);
      console.log(`DayZ API Bridge: ${apiBridgeStatus.configured ? 'chave configurada' : 'API_KEY AUSENTE'}; endpoint /api/game/bridge/poll`);
      console.log(`DayZ Store:  itens no chão, veículos por preset do mod e VIPs com vídeo; Pix via ${env.mercadoPagoApiMode || 'auto'}.`);
      console.log('Painel da API DayZ disponível em /admin/ftp');

    });
  } catch (err) {
    console.error('Erro ao iniciar aplicação:', err);
    process.exit(1);
  }
}

start();
