import bcrypt from 'bcryptjs';
import { prisma } from '../db/prisma.js';
import { steamLooksValid } from '../utils/format.js';
import { upsertPlayerBySteam64 } from './playerService.js';
import { logAudit } from './auditService.js';

const BCRYPT_ROUNDS = 12;

function cleanSteam64(value) {
  const steam64 = String(value || '').trim();
  if (!steamLooksValid(steam64)) {
    throw new Error('Steam64 inválido. Informe exatamente 17 números.');
  }
  return steam64;
}

function validatePassword(value) {
  const password = String(value || '');
  if (password.length < 8) throw new Error('A senha precisa ter pelo menos 8 caracteres.');
  if (password.length > 72) throw new Error('A senha pode ter no máximo 72 caracteres.');
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    throw new Error('Use pelo menos uma letra e um número na senha.');
  }
  return password;
}

export async function registerPlayerPassword({ steam64, password, confirmPassword, nickname = '' }) {
  const cleanSteam = cleanSteam64(steam64);
  const cleanPassword = validatePassword(password);
  if (cleanPassword !== String(confirmPassword || '')) throw new Error('A confirmação da senha não confere.');

  const existing = await prisma.player.findUnique({
    where: { steam64: cleanSteam },
    select: { id: true, passwordHash: true }
  });
  if (existing?.passwordHash) {
    throw new Error('Este Steam64 já possui senha. Use a área “Já tenho senha” ou peça ao ADM para resetar.');
  }

  const player = existing
    ? await prisma.player.findUnique({ where: { id: existing.id } })
    : await upsertPlayerBySteam64({ steam64: cleanSteam, nickname: String(nickname || '').trim() });

  const passwordHash = await bcrypt.hash(cleanPassword, BCRYPT_ROUNDS);
  const claimed = await prisma.player.updateMany({
    where: { id: player.id, passwordHash: null },
    data: {
      passwordHash,
      passwordSetAt: new Date(),
      passwordResetAt: null,
      lastLoginAt: new Date(),
      rememberToken: null
    }
  });
  if (!claimed.count) {
    throw new Error('Este Steam64 acabou de receber uma senha. Entre com a senha correta ou peça um reset ao ADM.');
  }
  const updated = await prisma.player.findUnique({ where: { id: player.id } });

  await logAudit({
    actor: cleanSteam,
    action: 'player.password.created',
    target: updated.id,
    data: { method: 'steam64_password_first_access' }
  });
  return updated;
}

export async function authenticatePlayerPassword({ steam64, password }) {
  const cleanSteam = cleanSteam64(steam64);
  const cleanPassword = String(password || '');
  if (!cleanPassword) throw new Error('Informe sua senha.');

  const player = await prisma.player.findUnique({ where: { steam64: cleanSteam } });
  if (!player?.passwordHash) {
    throw new Error('Primeiro acesso: crie sua senha no formulário “Criar minha senha”.');
  }

  const valid = await bcrypt.compare(cleanPassword, player.passwordHash);
  if (!valid) {
    await logAudit({
      actor: cleanSteam,
      action: 'player.password.login_failed',
      target: player.id,
      data: { reason: 'invalid_password' }
    });
    throw new Error('Steam64 ou senha incorretos.');
  }

  const updated = await prisma.player.update({
    where: { id: player.id },
    data: { lastLoginAt: new Date() }
  });
  await logAudit({ actor: cleanSteam, action: 'player.password.login_success', target: player.id });
  return updated;
}

export async function resetPlayerPasswordByAdmin(playerId) {
  const player = await prisma.player.update({
    where: { id: String(playerId || '') },
    data: {
      passwordHash: null,
      passwordSetAt: null,
      passwordResetAt: new Date(),
      rememberToken: null
    },
    select: { id: true, steam64: true, nickname: true }
  });
  await logAudit({
    actor: 'admin',
    action: 'player.password.reset',
    target: player.id,
    data: { steam64: player.steam64, nickname: player.nickname || null }
  });
  return player;
}
