import { initializeApp, getApps, cert, applicationDefault } from 'firebase-admin/app'
import { getFirestore, Timestamp, FieldValue } from 'firebase-admin/firestore'

// Firebase Admin init.
// - Explicit service-account credentials via env (works on Vercel/local):
//     FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY ("\n" escaped)
// - Otherwise fall back to Application Default Credentials, which Firebase
//   App Hosting / Google Cloud provide automatically.
// Normalize a private key pasted into a host's env UI, which may:
//  - wrap it in single/double quotes
//  - keep literal "\n" (and sometimes double-escaped "\\n")
//  - or already contain real newlines
function normalizeKey(raw: string): string {
  let k = raw.trim()
  if ((k.startsWith('"') && k.endsWith('"')) || (k.startsWith("'") && k.endsWith("'"))) {
    k = k.slice(1, -1)
  }
  return k.replace(/\\\\n/g, '\n').replace(/\\n/g, '\n')
}

function init() {
  if (getApps().length) return
  const projectId = process.env.FIREBASE_PROJECT_ID
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
  const privateKey = normalizeKey(process.env.FIREBASE_PRIVATE_KEY || '')
  if (projectId && clientEmail && privateKey) {
    initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) })
  } else {
    // App Hosting / GCP: ADC is available; projectId inferred from env if set.
    initializeApp({ credential: applicationDefault(), projectId: projectId || undefined })
  }
}

// Cache the Firestore instance on globalThis so Next.js dev hot-reloads and
// concurrent route handlers share one instance — settings() may only be called
// once per Firestore object, before any other use.
const g = globalThis as unknown as { _fdb?: FirebaseFirestore.Firestore }
export function fdb(): FirebaseFirestore.Firestore {
  init()
  if (!g._fdb) {
    const db = getFirestore()
    db.settings({ ignoreUndefinedProperties: true })
    g._fdb = db
  }
  return g._fdb
}

// ---- helpers ----------------------------------------------------------------

// Collection-prefixed, time-ordered, collision-resistant id (cuid-ish).
export function newId(): string {
  return (
    'c' +
    Date.now().toString(36) +
    Math.random().toString(36).slice(2, 10)
  )
}

// Recursively convert Firestore Timestamps -> JS Date so the API returns the
// same shapes the frontend already expects (it does `new Date(x)`).
function fromFs<T = any>(v: any): T {
  if (v instanceof Timestamp) return v.toDate() as any
  if (Array.isArray(v)) return v.map(fromFs) as any
  if (v && typeof v === 'object') {
    const out: any = {}
    for (const k of Object.keys(v)) out[k] = fromFs(v[k])
    return out
  }
  return v
}

// Convert JS Dates -> Firestore Timestamps on write; strip undefined.
function toFs(data: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {}
  for (const k of Object.keys(data)) {
    const val = data[k]
    if (val === undefined) continue
    out[k] = val instanceof Date ? Timestamp.fromDate(val) : val
  }
  return out
}

function docToObj(d: FirebaseFirestore.DocumentSnapshot): any {
  return fromFs({ id: d.id, ...d.data() })
}

export { Timestamp, FieldValue, fromFs, toFs, docToObj }
