import { spawnSync } from 'node:child_process';

const prismaCommand = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const recoverableMigrations = new Set([
  '20260730112500_v152_game_access_tokens',
  '20260731162000_v158_territory_kill_events'
]);

function runPrisma(args, { print = true } = {}) {
  const result = spawnSync(prismaCommand, ['prisma', ...args], {
    encoding: 'utf8',
    env: process.env,
    stdio: ['inherit', 'pipe', 'pipe']
  });

  const stdout = result.stdout || '';
  const stderr = result.stderr || '';
  if (print) {
    if (stdout) process.stdout.write(stdout);
    if (stderr) process.stderr.write(stderr);
  }

  return {
    status: result.status ?? 1,
    output: `${stdout}\n${stderr}`
  };
}

function failedMigrationFrom(output) {
  const match = output.match(/The `([^`]+)` migration started at .* failed/i);
  return match?.[1] || null;
}

console.log('🔒 Aplicando migrations no modo seguro RAID-Z...');
let deploy = runPrisma(['migrate', 'deploy']);

if (deploy.status === 0) {
  console.log('✅ Banco atualizado com segurança.');
  process.exit(0);
}

const failedMigration = failedMigrationFrom(deploy.output);
if (!failedMigration || !recoverableMigrations.has(failedMigration)) {
  console.error('🚫 Migration não reconhecida falhou. O banco não será alterado automaticamente.');
  process.exit(deploy.status);
}

console.warn(`⚠️ Recuperando somente a migration conhecida: ${failedMigration}`);
const resolve = runPrisma(['migrate', 'resolve', '--rolled-back', failedMigration]);
if (resolve.status !== 0) {
  console.error('🚫 Não foi possível marcar a tentativa anterior como revertida.');
  process.exit(resolve.status);
}

console.log('🔁 Tentando aplicar novamente a migration corrigida...');
deploy = runPrisma(['migrate', 'deploy']);
if (deploy.status !== 0) {
  console.error('🚫 A migration corrigida ainda falhou. O processo foi interrompido sem resetar o banco.');
  process.exit(deploy.status);
}

console.log('✅ Migration recuperada e banco atualizado com segurança.');
