import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..', '..');
const prismaCli = path.join(root, 'node_modules', 'prisma', 'build', 'index.js');

const recoverableMigrations = [
  '20260730112500_v152_game_access_tokens'
];

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL não está definida; não é possível recuperar as migrations.');
  process.exit(1);
}

if (!fs.existsSync(prismaCli)) {
  console.error(`❌ Prisma CLI não encontrado em ${prismaCli}.`);
  process.exit(1);
}

for (const migration of recoverableMigrations) {
  const result = spawnSync(
    process.execPath,
    [prismaCli, 'migrate', 'resolve', '--rolled-back', migration],
    {
      cwd: root,
      env: process.env,
      encoding: 'utf8'
    }
  );

  const output = `${result.stdout || ''}\n${result.stderr || ''}`.trim();

  if (result.status === 0) {
    console.log(`✅ Migration falha marcada para reaplicação segura: ${migration}`);
    continue;
  }

  // Em deploys futuros ela já estará aplicada ou não estará mais em estado de
  // falha. Nesses casos o Prisma retorna P3008/P3012 e podemos seguir normalmente.
  const alreadyHealthy = /P3008|P3012|already recorded as applied|not in a failed state/i.test(output);
  if (alreadyHealthy) {
    console.log(`✅ Migration sem falha pendente: ${migration}`);
    continue;
  }

  console.error(`❌ Não foi possível recuperar a migration ${migration}.`);
  if (output) console.error(output);
  process.exit(result.status || 1);
}
