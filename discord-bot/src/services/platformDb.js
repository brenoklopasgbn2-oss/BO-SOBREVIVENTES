const { PrismaClient } = require('@prisma/client');
const prisma = global.__championsPrisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') global.__championsPrisma = prisma;
module.exports = { prisma };
