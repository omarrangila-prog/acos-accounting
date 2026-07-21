import { NextRequest, NextResponse } from 'next/server'
import { makeDb } from '@/lib/db'
import { getSession } from '@/lib/session'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const s = getSession()
    if (!s) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const type = req.nextUrl.searchParams.get('type') || ''
    const list = (await makeDb(s.tenantId).pdc.findMany())
      .filter((p) => (type ? p.pdcType === type : true))
      .sort((a, b) => {
        const ax = a.chequeDate ? new Date(a.chequeDate).getTime() : 0
        const bx = b.chequeDate ? new Date(b.chequeDate).getTime() : 0
        return ax - bx
      })
    return NextResponse.json(list)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const s = getSession()
    if (!s) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const b = await req.json()
    if (!b.partyName) return NextResponse.json({ error: 'Party name required' }, { status: 400 })
    const p = await makeDb(s.tenantId).pdc.create({
      pdcType: b.pdcType === 'payable' ? 'payable' : 'receivable',
      partyName: b.partyName,
      chequeNumber: b.chequeNumber || null,
      bank: b.bank || null,
      amount: Number(b.amount) || 0,
      chequeDate: b.chequeDate ? new Date(b.chequeDate) : null,
      status: b.status || 'pending',
      remarks: b.remarks || null,
    })
    return NextResponse.json({ success: true, id: p.id })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
