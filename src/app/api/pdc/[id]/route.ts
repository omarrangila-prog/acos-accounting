import { NextRequest, NextResponse } from 'next/server'
import { makeDb } from '@/lib/db'
import { getServerAccount } from '@/lib/session'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const s = getServerAccount()
    if (!s) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const b = await req.json()
    await makeDb(s.tenantId).pdc.update(params.id, {
      partyName: b.partyName,
      chequeNumber: b.chequeNumber || null,
      bank: b.bank || null,
      amount: Number(b.amount) || 0,
      chequeDate: b.chequeDate ? new Date(b.chequeDate) : null,
      status: b.status,
      remarks: b.remarks || null,
    })
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const s = getServerAccount()
    if (!s) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    await makeDb(s.tenantId).pdc.remove(params.id)
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
