// PIN verification is now handled entirely client-side in src/lib/account.ts.
// This route is no longer called. Kept as a stub to avoid 404s from any
// cached clients that still reference it.
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function POST() {
  return NextResponse.json({ error: 'Use client-side PIN verification.' }, { status: 410 })
}
