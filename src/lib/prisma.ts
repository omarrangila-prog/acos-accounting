import { PrismaClient } from '@prisma/client'
import { PrismaLibSQL } from '@prisma/adapter-libsql'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

// Turso (libSQL) connection. In production set:
//   TURSO_DATABASE_URL=libsql://<db>.turso.io
//   TURSO_AUTH_TOKEN=<token>
// For local dev without Turso, fall back to a local SQLite file URL.
const url = process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL || 'file:./prisma/dev.db'
const authToken = process.env.TURSO_AUTH_TOKEN

const adapter = new PrismaLibSQL({ url, authToken })

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient({ adapter, log: ['error'] })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

// libSQL/SQLite does not accept Prisma's `mode: 'insensitive'` arg, so search
// filters omit it. (SQLite `contains` is already case-insensitive for ASCII.)
export const insensitive = {} as const
