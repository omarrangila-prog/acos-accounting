import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient({ log: ['error'] })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

// Postgres supports case-insensitive `contains`; SQLite (local dev) does not
// accept the `mode` arg. Use this so search filters work on both.
const isSqlite = (process.env.DATABASE_URL || '').startsWith('file:')
export const insensitive = isSqlite ? {} : ({ mode: 'insensitive' } as const)
