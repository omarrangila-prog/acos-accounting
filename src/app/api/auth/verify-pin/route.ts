import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { setSessionCookie } from '@/lib/session'
import { fdb } from '@/lib/firestore'

export const runtime = 'nodejs'

// ---- Firestore-backed rate limiter -----------------------------------------
// Persists across Vercel serverless instances. Records live in
// _auth_attempts/{hashedIp} and expire automatically via TTL field.
// The IP is SHA-256 hashed before storage — never stored in plain text.

import { createHash } from 'crypto'

function hashIp(ip: string): string {
  return createHash('sha256').update(ip + (process.env.SESSION_SECRET || '')).digest('hex').slice(0, 32)
}

function clientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  )
}

const MAX_ATTEMPTS = 5
const LOCK_MS = 5 * 60 * 1000 // 5 minutes

async function getRateLimitRec(key: string): Promise<{ count: number; lockedUntil: number }> {
  try {
    const doc = await fdb().collection('_auth_attempts').doc(key).get()
    if (!doc.exists) return { count: 0, lockedUntil: 0 }
    const d = doc.data()!
    // Auto-expire: if lockedUntil is in the past, treat as clean
    if (d.lockedUntil && d.lockedUntil < Date.now()) return { count: 0, lockedUntil: 0 }
    return { count: d.count ?? 0, lockedUntil: d.lockedUntil ?? 0 }
  } catch {
    // If Firestore is unreachable, fail open (don't lock out users)
    return { count: 0, lockedUntil: 0 }
  }
}

async function incrementFailure(key: string, currentCount: number, now: number): Promise<void> {
  try {
    const newCount = currentCount + 1
    const lockedUntil = newCount >= MAX_ATTEMPTS ? now + LOCK_MS : 0
    await fdb().collection('_auth_attempts').doc(key).set({
      count: newCount,
      lockedUntil,
      updatedAt: now,
    })
  } catch { /* non-fatal */ }
}

async function clearFailures(key: string): Promise<void> {
  try {
    await fdb().collection('_auth_attempts').doc(key).delete()
  } catch { /* non-fatal */ }
}

// ---- Tenant map ------------------------------------------------------------
// Read env vars inside the handler, not at module scope, so they are always
// current on each cold start and not captured as empty strings at build time.

function getTenants() {
  return [
    {
      tenantId: 'cfood_production',
      isDemo: false,
      hash: process.env.PIN_HASH_PRODUCTION ?? '',
    },
    {
      tenantId: 'demo',
      isDemo: true,
      hash: process.env.PIN_HASH_DEMO ?? '',
    },
  ]
}

// ---- Handler ----------------------------------------------------------------

export async function POST(req: NextRequest) {
  const now = Date.now()
  const ip = clientIp(req)
  const key = hashIp(ip)

  // --- 1. Validate server configuration BEFORE doing anything else ----------
  const tenants = getTenants()
  const missingHashes = tenants.filter((t) => !t.hash)
  if (missingHashes.length > 0) {
    console.error(
      '[auth] PIN_HASH env vars missing for tenants:',
      missingHashes.map((t) => t.tenantId).join(', '),
      '— check Vercel environment variables',
    )
    // Return a config error — do NOT increment the failure counter
    return NextResponse.json(
      { error: 'Authentication is temporarily unavailable. Please contact support.' },
      { status: 503 },
    )
  }

  // --- 2. Rate-limit check --------------------------------------------------
  const rec = await getRateLimitRec(key)
  if (rec.lockedUntil > now) {
    const waitSecs = Math.ceil((rec.lockedUntil - now) / 1000)
    return NextResponse.json(
      { error: `Too many attempts. Please try again in ${waitSecs} seconds.` },
      { status: 429 },
    )
  }

  // --- 3. Parse and validate PIN shape -------------------------------------
  let pin: string
  try {
    const body = await req.json()
    pin = String(body?.pin ?? '').trim()
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  }

  if (!/^\d{4}$/.test(pin)) {
    return NextResponse.json({ error: 'PIN must be exactly 4 digits.' }, { status: 400 })
  }

  // --- 4. Compare PIN against all tenant hashes ----------------------------
  let matched: ReturnType<typeof getTenants>[0] | null = null
  for (const t of tenants) {
    if (await bcrypt.compare(pin, t.hash)) {
      matched = t
      break
    }
  }

  // --- 5. Handle failure ----------------------------------------------------
  if (!matched) {
    await incrementFailure(key, rec.count, now)
    const newCount = rec.count + 1
    const isNowLocked = newCount >= MAX_ATTEMPTS
    return NextResponse.json(
      {
        error: isNowLocked
          ? 'Too many attempts. Please try again in 5 minutes.'
          : 'Incorrect PIN. Please try again.',
      },
      { status: 401 },
    )
  }

  // --- 6. Success -----------------------------------------------------------
  await clearFailures(key)
  const sess = { tenantId: matched.tenantId, isDemo: matched.isDemo, iat: now }
  const { name, value, opts } = setSessionCookie(sess)
  const res = NextResponse.json({ ok: true, isDemo: matched.isDemo, tenantId: matched.tenantId })
  res.cookies.set(name, value, opts as any)
  return res
}
