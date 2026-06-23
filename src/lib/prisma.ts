import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

// PostgreSQL connection via DATABASE_URL.
// On Railway, set in the service Variables:
//   DATABASE_URL=${{Postgres.DATABASE_URL}}
export const prisma =
  globalForPrisma.prisma ?? new PrismaClient({ log: ['error'] })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

// Postgres supports case-insensitive search via Prisma's `mode: 'insensitive'`.
export const insensitive = { mode: 'insensitive' } as const
