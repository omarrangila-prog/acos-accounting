// Server-side session helpers — read/write the httpOnly auth cookie.
// The cookie stores a signed JSON payload: { tenantId, isDemo, iat }.
// "Signed" here means we HMAC-SHA256 the JSON with SESSION_SECRET so the
// client cannot tamper with the tenantId value.
import { cookies } from 'next/headers'
import crypto from 'crypto'

const COOKIE = 'acos_session'
const SECRET = process.env.SESSION_SECRET || 'acos-dev-secret-change-in-prod'
const MAX_AGE = 60 * 60 * 24 * 7 // 7 days

export interface Session {
  tenantId: string
  isDemo: boolean
  iat: number
}

function sign(payload: string): string {
  return crypto.createHmac('sha256', SECRET).update(payload).digest('hex')
}

export function encodeSession(s: Session): string {
  const payload = JSON.stringify(s)
  const b64 = Buffer.from(payload).toString('base64url')
  const sig = sign(b64)
  return `${b64}.${sig}`
}

export function decodeSession(raw: string): Session | null {
  try {
    const dot = raw.lastIndexOf('.')
    if (dot === -1) return null
    const b64 = raw.slice(0, dot)
    const sig = raw.slice(dot + 1)
    if (sign(b64) !== sig) return null
    const payload = JSON.parse(Buffer.from(b64, 'base64url').toString('utf8'))
    if (!payload.tenantId || typeof payload.isDemo !== 'boolean') return null
    return payload as Session
  } catch {
    return null
  }
}

// Call from API route handlers to get the current session.
export function getSession(): Session | null {
  const store = cookies()
  const raw = store.get(COOKIE)?.value
  if (!raw) return null
  return decodeSession(raw)
}

// Call from API route handlers to set the session cookie after login.
export function setSessionCookie(s: Session): { name: string; value: string; opts: object } {
  return {
    name: COOKIE,
    value: encodeSession(s),
    opts: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: MAX_AGE,
    },
  }
}

export const SESSION_COOKIE_NAME = COOKIE
