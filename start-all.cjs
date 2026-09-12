const { spawn } = require('node:child_process');
const path = require('node:path');

const root = __dirname;
const children = [];
let shuttingDown = false;

function start(name, script) {
  const child = spawn(process.execPath, [script], {
    cwd: root,
    env: process.env,
    stdio: 'inherit'
  });
  children.push(child);
  child.on('exit', (code, signal) => {
    if (shuttingDown) return;
    console.error(`[${name}] encerrou (${signal || code}). Encerrando plataforma para o Railway reiniciar tudo junto.`);
    shuttingDown = true;
    for (const other of children) {
      if (other !== child && !other.killed) other.kill('SIGTERM');
    }
    process.exit(code || 1);
  });
  return child;
}

start('WEB', path.join(root, 'src', 'index.js'));

const token = process.env.TOKEN || process.env.DISCORD_TOKEN || process.env.BOT_TOKEN;
if (token) {
  start('DISCORD', path.join(root, 'discord-bot', 'src', 'index.js'));
} else {
  console.warn('[DISCORD] TOKEN/DISCORD_TOKEN/BOT_TOKEN ausente. Site inicia normalmente, bot fica desativado.');
}

function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) if (!child.killed) child.kill(signal);
  setTimeout(() => process.exit(0), 3000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
