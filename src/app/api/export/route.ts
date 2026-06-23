import { NextRequest, NextResponse } from 'next/server'
import ExcelJS from 'exceljs'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const { fileName, sheetName, columns, rows } = await req.json()

    const wb = new ExcelJS.Workbook()
    wb.creator = 'ACOS Accounting'
    wb.created = new Date()
    const ws = wb.addWorksheet(sheetName || 'Sheet1')

    ws.columns = (columns || []).map((c: any) => ({
      header: c.header,
      key: c.key,
      width: c.width || 20,
    }))

    // Header styling
    const headerRow = ws.getRow(1)
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3B6FFF' } }
    headerRow.alignment = { vertical: 'middle' }
    headerRow.height = 20

    ;(rows || []).forEach((r: any) => ws.addRow(r))

    ws.eachRow((row, n) => {
      if (n === 1) return
      row.eachCell((cell) => {
        cell.border = {
          bottom: { style: 'thin', color: { argb: 'FFE8ECF2' } },
        }
      })
    })

    const buffer = await wb.xlsx.writeBuffer()
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${(fileName || 'export').replace(/[^a-zA-Z0-9_.-]/g, '_')}"`,
      },
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
