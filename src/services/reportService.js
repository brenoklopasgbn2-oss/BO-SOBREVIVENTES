import { prisma } from '../db/prisma.js';
import { logMonthlyReport } from './discordLogger.js';

export function monthRange(date = new Date()) {
  const start = new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 1, 0, 0, 0, 0);
  return { start, end };
}

export function monthLabel(date = new Date()) {
  return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}

export function parseMonthKey(monthKey) {
  if (!monthKey || !/^\d{4}-\d{2}$/.test(monthKey)) return new Date();
  const [year, month] = monthKey.split('-').map(Number);
  return new Date(year, month - 1, 1, 0, 0, 0, 0);
}

export function toMonthKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export async function getMonthlyStats(date = new Date()) {
  const { start, end } = monthRange(date);
  const [payments, purchases, playersCreated] = await Promise.all([
    prisma.payment.findMany({
      where: { status: 'APPROVED', approvedAt: { gte: start, lt: end } },
      select: { amountBrl: true, coins: true }
    }),
    prisma.purchase.count({ where: { createdAt: { gte: start, lt: end } } }),
    prisma.player.count({ where: { createdAt: { gte: start, lt: end } } })
  ]);

  const totalBrl = payments.reduce((sum, p) => sum + Number(p.amountBrl), 0);
  const coinsSold = payments.reduce((sum, p) => sum + Number(p.coins), 0);

  return {
    monthKey: toMonthKey(date),
    monthLabel: monthLabel(date),
    totalBrl,
    approvedPayments: payments.length,
    coinsSold,
    purchases,
    playersCreated
  };
}

export async function getMonthlyHistory(monthsBack = 12) {
  const out = [];
  const now = new Date();
  for (let i = 0; i < monthsBack; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push(await getMonthlyStats(date));
  }
  return out;
}

export async function sendCurrentMonthlyReport() {
  const stats = await getMonthlyStats(new Date());
  await logMonthlyReport(stats);
  return stats;
}
