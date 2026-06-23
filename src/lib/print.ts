'use client'

export const COMPANY_NAME = 'WAHHAJ SEAFOOD'

// Opens a clean, branded HTML document in a new window and triggers print
// (the browser's "Save as PDF" produces a premium, print-ready report).
export function printHtml(title: string, bodyHtml: string) {
  const w = window.open('', '_blank', 'width=900,height=1100')
  if (!w) { alert('Please allow popups to download/print the report.'); return }
  w.document.write(`<!doctype html>
<html><head><meta charset="utf-8"><title>${title}</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  * { box-sizing: border-box; }
  body { font-family: 'Segoe UI', Inter, -apple-system, sans-serif; color: #0F172A; margin: 0; padding: 32px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .rpt-header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #3B6FFF; padding-bottom: 14px; margin-bottom: 18px; }
  .rpt-company { font-size: 22px; font-weight: 800; color: #3B6FFF; letter-spacing: .3px; }
  .rpt-sub { font-size: 11px; color: #64748B; margin-top: 2px; }
  .rpt-title { font-size: 15px; font-weight: 700; text-align: right; }
  .rpt-meta { font-size: 11px; color: #475569; text-align: right; margin-top: 2px; }
  .rpt-info { display: flex; flex-wrap: wrap; gap: 24px; margin-bottom: 16px; font-size: 12px; }
  .rpt-info b { color: #0F172A; }
  .rpt-info .lbl { color: #64748B; }
  .summary { display: flex; gap: 12px; margin-bottom: 18px; flex-wrap: wrap; }
  .summary .box { flex: 1; min-width: 140px; border: 1px solid #E8ECF2; border-radius: 10px; padding: 10px 14px; }
  .summary .box .k { font-size: 10px; text-transform: uppercase; letter-spacing: .5px; color: #64748B; }
  .summary .box .v { font-size: 18px; font-weight: 700; margin-top: 2px; }
  .red { color: #DC2626; } .green { color: #12A150; } .blue { color: #3B6FFF; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  thead th { background: #3B6FFF; color: #fff; padding: 8px 10px; text-align: left; font-weight: 600; font-size: 11px; }
  thead th.r { text-align: right; }
  tbody td { padding: 7px 10px; border-bottom: 1px solid #EEF1F6; }
  tbody td.r { text-align: right; }
  tbody tr:nth-child(even) { background: #F8F9FB; }
  .opening td { font-style: italic; color: #64748B; background: #F1F3F7 !important; }
  tfoot td { padding: 9px 10px; font-weight: 700; border-top: 2px solid #CBD5E1; }
  tfoot td.r { text-align: right; }
  .rpt-footer { margin-top: 22px; font-size: 10px; color: #94A3B8; text-align: center; border-top: 1px solid #E8ECF2; padding-top: 10px; }
  @media print { body { padding: 0; } @page { margin: 16mm; } }
</style></head>
<body onload="window.print()">${bodyHtml}
</body></html>`)
  w.document.close()
}

export function fmt(n: number): string {
  return 'Rs. ' + (Number(n) || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })
}

// Generic table report → print/save-as-PDF. Reused by Expenses, PDC, Invoices, Reports.
export function printTableReport(
  reportTitle: string,
  columns: { header: string; key: string; align?: 'left' | 'right' }[],
  rows: Record<string, any>[],
  opts?: {
    subtitle?: string
    total?: { label: string; value: string }
    summary?: { k: string; v: string; cls?: string }[]
  },
) {
  const head = columns.map((c) => `<th class="${c.align === 'right' ? 'r' : ''}">${c.header}</th>`).join('')
  const bodyRows = rows.map((r) =>
    `<tr>${columns.map((c) => `<td class="${c.align === 'right' ? 'r' : ''}">${r[c.key] ?? ''}</td>`).join('')}</tr>`,
  ).join('')
  const totalRow = opts?.total
    ? `<tfoot><tr><td colspan="${columns.length - 1}">${opts.total.label}</td><td class="r">${opts.total.value}</td></tr></tfoot>`
    : ''
  const summaryHtml = opts?.summary?.length
    ? `<div class="summary">${opts.summary.map((s) => `<div class="box"><div class="k">${s.k}</div><div class="v ${s.cls || ''}">${s.v}</div></div>`).join('')}</div>`
    : ''
  printHtml(reportTitle, `
    <div class="rpt-header">
      <div><div class="rpt-company">${COMPANY_NAME}</div></div>
      <div><div class="rpt-title">${reportTitle}</div>${opts?.subtitle ? `<div class="rpt-meta">${opts.subtitle}</div>` : ''}</div>
    </div>
    ${summaryHtml}
    <table>
      <thead><tr>${head}</tr></thead>
      <tbody>${bodyRows || `<tr><td colspan="${columns.length}" style="text-align:center;color:#94A3B8">No records</td></tr>`}</tbody>
      ${totalRow}
    </table>`)
}
