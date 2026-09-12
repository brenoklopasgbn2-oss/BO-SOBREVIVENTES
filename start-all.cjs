const { spawn } = require('node:child_process');
const path = require('node:path');

const root = __dirname;
let webChild = null;
let botChild = null;
let shuttingDown = false;
let botRestartTimer = null;

function spawnChild(name, script) {
  const child = spawn(process.execPath, [script], {
    cwd: root,
    env: process.env,
    stdio: 'inherit'
  });

  child.on('error', (error) => {
    console.error(`[${name}] falha ao iniciar:`, error);
  });

  return child;
}

function startWeb() {
  webChild = spawnChild('WEB', path.join(root, 'src', 'index.js'));
  webChild.on('exit', (code, signal) => {
    if (shuttingDown) return;
    console.error(`[WEB] encerrou (${signal || code}). Solicitando restart da plataforma pelo Railway.`);
    shutdown('SIGTERM', code || 1);
  });
}

function startDiscord() {
  const token = process.env.TOKEN || process.env.DISCORD_TOKEN || process.env.BOT_TOKEN;
  if (!token) {
    console.warn('[DISCORD] TOKEN/DISCORD_TOKEN/BOT_TOKEN ausente. Site continuará online; bot fica desativado.');
    return;
  }

  botChild = spawnChild('DISCORD', path.join(root, 'discord-bot', 'src', 'index.js'));
  botChild.on('exit', (code, signal) => {
    if (shuttingDown) return;
    console.error(`[DISCORD] encerrou (${signal || code}). O site continuará online. Nova tentativa em 5 segundos.`);
    botRestartTimer = setTimeout(startDiscord, 5000);
    botRestartTimer.unref?.();
  });
}

function shutdown(signal = 'SIGTERM', exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  if (botRestartTimer) clearTimeout(botRestartTimer);
  if (botChild && !botChild.killed) botChild.kill(signal);
  if (webChild && !webChild.killed) webChild.kill(signal);
  setTimeout(() => process.exit(exitCode), 1500).unref();
}

startWeb();
startDiscord();

process.on('SIGINT', () => shutdown('SIGINT', 0));
process.on('SIGTERM', () => shutdown('SIGTERM', 0));
