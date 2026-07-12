import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..', '..');
const migrationsDir = path.join(root, 'prisma', 'migrations');

function envFlag(name, fallback = false) {
  const raw = process.env[name];
  if (raw === undefined || raw === null || raw === '') return fallback;
  return ['1', 'true', 'yes', 'sim', 'on'].includes(String(raw).trim().toLowerCase());
}

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    return entry.isFile() && entry.name.endsWith('.sql') ? [full] : [];
  });
}

function stripComments(sql) {
  return sql
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/^\s*--.*$/gm, ' ');
}

const destructiveChecks = [
  { name: 'DROP TABLE', re: /\bDROP\s+TABLE\b/i },
  { name: 'DROP COLUMN', re: /\bDROP\s+COLUMN\b/i },
  { name: 'DROP DATABASE', re: /\bDROP\s+DATABASE\b/i },
  { name: 'DROP SCHEMA', re: /\bDROP\s+SCHEMA\b/i },
  { name: 'TRUNCATE TABLE', re: /\bTRUNCATE\s+TABLE\b/i },
  { name: 'DELETE FROM', re: /\bDELETE\s+FROM\b/i },
  { name: 'ALTER TABLE DROP COLUMN', re: /\bALTER\s+TABLE[\s\S]{0,300}?\bDROP\s+COLUMN\b/i }
];

const allowDestructive = envFlag('ALLOW_DESTRUCTIVE_MIGRATIONS', false);
const files = walk(migrationsDir);
const problems = [];

for (const file of files) {
  const sql = stripComments(fs.readFileSync(file, 'utf8'));
  for (const check of destructiveChecks) {
    if (check.re.test(sql)) {
      problems.push({ file: path.relative(root, file), check: check.name });
    }
  }
}

if (problems.length && !allowDestructive) {
  console.error('\n🚫 DEPLOY BLOQUEADO PELO MODO SEGURO DO RAID-Z');
  console.error('Encontrei migration com comando que pode apagar dados de players/saldos/seguros.');
  console.error('Isso evita perder saldo, garagem, quantas vezes usou seguro e histórico em atualização normal.\n');
  for (const p of problems) console.error(`- ${p.file}: ${p.check}`);
  console.error('\nPara rodar mesmo assim, só colocando ALLOW_DESTRUCTIVE_MIGRATIONS=true no Railway.');
  console.error('Use isso apenas se for wipe/migração planejada.\n');
  process.exit(1);
}

if (problems.length && allowDestructive) {
  console.warn('⚠️ Modo seguro encontrou comandos destrutivos, mas ALLOW_DESTRUCTIVE_MIGRATIONS=true permitiu continuar.');
} else {
  console.log('✅ Deploy seguro: migrations sem DROP TABLE, DROP COLUMN, TRUNCATE ou DELETE FROM.');
}
