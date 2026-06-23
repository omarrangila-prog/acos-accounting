import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const type = req.nextUrl.searchParams.get('type') || ''
    const pdcs = await prisma.pDC.findMany({
      where: type ? { pdcType: type } : undefined,
      orderBy: { chequeDate: 'asc' },
    })
    return NextResponse.json(pdcs)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const b = await req.json()
    if (!b.partyName) return NextResponse.json({ error: 'Party name required' }, { status: 400 })
    const p = await prisma.pDC.create({
      data: {
        pdcType: b.pdcType === 'payable' ? 'payable' : 'receivable',
        partyName: b.partyName,
        chequeNumber: b.chequeNumber || null,
        bank: b.bank || null,
        amount: Number(b.amount) || 0,
        chequeDate: b.chequeDate ? new Date(b.chequeDate) : null,
        status: b.status || 'pending',
        remarks: b.remarks || null,
      },
    })
    return NextResponse.json({ success: true, id: p.id })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
