import 'dotenv/config';

const isProduction = String(process.env.NODE_ENV || '').toLowerCase() === 'production';
const errors = [];
const warnings = [];

function value(name) {
  return String(process.env[name] || '').trim();
}

function requireVar(name, message = '') {
  if (!value(name)) errors.push(`${name} ausente${message ? ` — ${message}` : ''}`);
}

function requireSecret(name, min = 32) {
  const v = value(name);
  if (!v) {
    errors.push(`${name} ausente — gere uma chave com: npm run setup:secrets`);
    return;
  }
  if (v.length < min) errors.push(`${name} muito curta — use pelo menos ${min} caracteres aleatórios.`);
  if (/troque|change|senha|secret|exemplo|example|123456/i.test(v)) {
    warnings.push(`${name} parece usar um valor de exemplo. Troque antes de publicar.`);
  }
}

requireVar('DATABASE_URL', 'aponte para o PostgreSQL do Railway.');
requireVar('ADMIN_PASSWORD', 'senha usada para entrar no painel /admin/login.');

if (isProduction) {
  requireVar('PUBLIC_URL', 'use a URL pública HTTPS sem barra no final.');
  requireSecret('COOKIE_SECRET');

  const publicUrl = value('PUBLIC_URL');
  if (publicUrl && !/^https:\/\//i.test(publicUrl)) {
    warnings.push('PUBLIC_URL em produção normalmente deve começar com https://.');
  }
} else {
  if (!value('COOKIE_SECRET')) warnings.push('COOKIE_SECRET vazio em desenvolvimento: sessões serão invalidadas ao reiniciar.');
}

if (!value('API_KEY')) warnings.push('API_KEY vazia: todas as rotas /api do MOD ficam bloqueadas (HTTP 503).');
if (!value('MERCADOPAGO_ACCESS_TOKEN')) warnings.push('MERCADOPAGO_ACCESS_TOKEN vazio: pagamentos Pix ficam desativados.');
if (!value('DISCORD_WEBHOOK_URL') && !value('DISCORD_SALES_WEBHOOK_URL')) warnings.push('Nenhum webhook principal do Discord configurado: logs/vendas não serão enviados.');

for (const warning of warnings) console.warn(`⚠️ CONFIG: ${warning}`);

if (errors.length) {
  console.error('\n🚫 CONFIGURAÇÃO INCOMPLETA:');
  for (const error of errors) console.error(`- ${error}`);
  console.error('\nVeja LEIA-ME-NOVO-DONO.md e docs/02-VARIAVEIS.md.\n');
  process.exit(1);
}

console.log('✅ Configuração mínima validada sem exibir segredos.');
