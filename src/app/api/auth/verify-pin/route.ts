import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { setSessionCookie } from '@/lib/session'

export const runtime = 'nodejs'

// In-memory rate limiter keyed by client IP.
// Resets when the server restarts — sufficient for a small single-tenant app.
// For multi-instance deployments, move this to Redis/KV.
const attempts = new Map<string, { count: number; lockedUntil: number }>()

const MAX_ATTEMPTS = 5
const LOCK_MS = 5 * 60 * 1000 // 5 minutes
const BACKOFF_MS = [0, 0, 0, 2000, 5000] // delay per attempt index (0-based)

function clientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  )
}

// Tenant map lives server-side only — never exposed to the client.
// PIN hashes are loaded from env vars; the mapping itself is in this file
// but only the hashes travel; PINs are never stored.
const TENANTS: { tenantId: string; isDemo: boolean; hash: string }[] = [
  {
    tenantId: 'cfood_production',
    isDemo: false,
    hash: process.env.PIN_HASH_PRODUCTION || '',
  },
  {
    tenantId: 'demo',
    isDemo: true,
    hash: process.env.PIN_HASH_DEMO || '',
  },
]

export async function POST(req: NextRequest) {
  const ip = clientIp(req)
  const now = Date.now()

  // Rate-limit check
  const rec = attempts.get(ip) ?? { count: 0, lockedUntil: 0 }
  if (rec.lockedUntil > now) {
    return NextResponse.json(
      { error: 'Too many attempts. Please try again shortly.' },
      { status: 429 },
    )
  }

  let pin: string
  try {
    const body = await req.json()
    pin = String(body?.pin ?? '').trim()
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  }

  // Basic shape check — never log the value
  if (!/^\d{4}$/.test(pin)) {
    return NextResponse.json({ error: 'PIN must be 4 digits.' }, { status: 400 })
  }

  // Try each tenant hash in constant time (bcrypt.compare is already constant-time)
  let matched: (typeof TENANTS)[0] | null = null
  for (const t of TENANTS) {
    if (t.hash && (await bcrypt.compare(pin, t.hash))) {
      matched = t
      break
    }
  }

  if (!matched) {
    // Increment failure counter
    const newCount = rec.count + 1
    const lockedUntil = newCount >= MAX_ATTEMPTS ? now + LOCK_MS : 0
    attempts.set(ip, { count: newCount, lockedUntil })

    // Progressive backoff delay before responding
    const delay = BACKOFF_MS[Math.min(newCount - 1, BACKOFF_MS.length - 1)] ?? 5000
    if (delay > 0) await new Promise((r) => setTimeout(r, delay))

    return NextResponse.json(
      { error: lockedUntil ? 'Too many attempts. Please try again shortly.' : 'Incorrect PIN. Please try again.' },
      { status: 401 },
    )
  }

  // Success — reset failure counter
  attempts.delete(ip)

  const sess = { tenantId: matched.tenantId, isDemo: matched.isDemo, iat: now }
  const { name, value, opts } = setSessionCookie(sess)

  const res = NextResponse.json({ ok: true, isDemo: matched.isDemo, tenantId: matched.tenantId })
  res.cookies.set(name, value, opts as any)
  return res
}
