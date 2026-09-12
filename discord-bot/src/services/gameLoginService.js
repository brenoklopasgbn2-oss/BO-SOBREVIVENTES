import crypto from 'crypto';
import { prisma } from '../db/prisma.js';

const TOKEN_TTL_SECONDS = 120;

function hashToken(token) {
  return crypto.createHash('sha256').update(String(token || '')).digest('hex');
}

function validateAccessInput({ steam64, nickname = '', serverType = 'vanilla' }) {
  const normalizedSteam64 = String(steam64 || '').trim();
  if (!/^\d{17}$/.test(normalizedSteam64)) throw new Error('Steam64 inválido para abrir a loja.');

  const normalizedServerType = String(serverType || 'vanilla').trim().toLowerCase();
  if (normalizedServerType !== 'vanilla') throw new Error('A loja pelo jogo está disponível somente no servidor Vanilla.');

  return {
    steam64: normalizedSteam64,
    nickname: String(nickname || '').trim().slice(0, 100) || null,
    serverType: normalizedServerType
  };
}

export async function createPlayerGameAccessToken(input) {
  const normalized = validateAccessInput(input || {});
  const token = crypto.randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + TOKEN_TTL_SECONDS * 1000);

  await prisma.gameAccessToken.create({
    data: {
      tokenHash: hashToken(token),
      steam64: normalized.steam64,
      nickname: normalized.nickname,
      serverType: normalized.serverType,
      expiresAt
    }
  });

  // Limpeza oportunista. Não bloqueia a criação do link quando houver falha de limpeza.
  prisma.gameAccessToken.deleteMany({
    where: {
      OR: [
        { expiresAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
        { usedAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } }
      ]
    }
  }).catch(() => {});

  return token;
}

export async function verifyAndConsumePlayerGameAccessToken(token) {
  const raw = String(token || '').trim();
  if (!/^[A-Za-z0-9_-]{32,}$/.test(raw)) return null;
  const tokenHash = hashToken(raw);
  const now = new Date();

  return prisma.$transaction(async (tx) => {
    const access = await tx.gameAccessToken.findUnique({ where: { tokenHash } });
    if (!access || access.usedAt || access.expiresAt <= now || access.serverType !== 'vanilla') return null;
    if (!/^\d{17}$/.test(String(access.steam64 || ''))) return null;

    // updateMany transforma o consumo em operação atômica: apenas a primeira
    // abertura consegue marcar o código. Recarregar ou reutilizar o link falha.
    const consumed = await tx.gameAccessToken.updateMany({
      where: { id: access.id, usedAt: null, expiresAt: { gt: now } },
      data: { usedAt: now }
    });
    if (consumed.count !== 1) return null;

    return {
      steam64: access.steam64,
      nickname: access.nickname || '',
      serverType: access.serverType
    };
  });
}

export const gameLoginConfig = {
  tokenTtlSeconds: TOKEN_TTL_SECONDS
};
