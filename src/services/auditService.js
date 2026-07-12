import { prisma } from '../db/prisma.js';

export async function logAudit({ actor = 'system', action, target = null, data = null, tx = prisma }) {
  try {
    await tx.auditLog.create({ data: { actor, action, target, data } });
  } catch (err) {
    console.error('Falha ao gravar audit log:', err.message);
  }
}
