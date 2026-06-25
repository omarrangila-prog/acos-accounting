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
  body { font-family: 'Segoe UI', Inter, -apple-system, sans-serif; color: #1A1A1A; margin: 0; padding: 28px 32px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .rpt-header { padding-bottom: 14px; margin-bottom: 16px; border-bottom: 1px solid #E5E7EB; }
  .rpt-company { font-size: 14px; font-weight: 700; color: #1A1A1A; }
  .rpt-sub { font-size: 11px; color: #64748B; margin-top: 2px; }
  .rpt-title { font-size: 17px; font-weight: 800; margin-top: 10px; }
  .rpt-meta { font-size: 12px; color: #6B7280; margin-top: 2px; }
  .rpt-info { display: flex; flex-wrap: wrap; gap: 24px; margin-bottom: 16px; font-size: 12px; }
  .rpt-info b { color: #0F172A; }
  .rpt-info .lbl { color: #64748B; }
  .summary { display: flex; gap: 40px; margin-bottom: 20px; flex-wrap: wrap; }
  .summary .box .k { font-size: 12px; color: #6B7280; }
  .summary .box .v { font-size: 15px; font-weight: 700; margin-top: 4px; }
  .red { color: #DC2626; } .green { color: #14A35B; } .blue { color: #3B6FFF; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  thead th { background: #fff; color: #1A1A1A; padding: 10px 10px; text-align: left; font-weight: 700; font-size: 13px; border-bottom: 2px solid #1A1A1A; }
  thead th.r { text-align: right; }
  thead th.balance-col { background: #F2F4F7; }
  tbody td { padding: 10px 10px; border-bottom: 1px solid #EEF1F6; vertical-align: top; }
  tbody td.r { text-align: right; }
  tbody td.balance-col { background: #F7F8FA; font-weight: 600; }
  .opening td { font-style: italic; color: #64748B; }
  .opening td.balance-col { font-style: normal; }
  tfoot td { padding: 10px 10px; font-weight: 700; border-top: 2px solid #1A1A1A; }
  tfoot td.r { text-align: right; }
  tfoot td.balance-col { background: #F2F4F7; }
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
  columns: { header: string; key: string; align?: 'left' | 'right'; balanceCol?: boolean }[],
  rows: Record<string, any>[],
  opts?: {
    subtitle?: string
    total?: { label: string; value: string }
    summary?: { k: string; v: string; cls?: string }[]
  },
) {
  const cellCls = (c: typeof columns[number]) => `${c.align === 'right' ? 'r' : ''} ${c.balanceCol ? 'balance-col' : ''}`.trim()
  const head = columns.map((c) => `<th class="${cellCls(c)}">${c.header}</th>`).join('')
  const bodyRows = rows.map((r) =>
    `<tr>${columns.map((c) => {
      const cls = c.balanceCol && typeof r[c.key] === 'object' && r[c.key] ? `${cellCls(c)} ${r[c.key].cls || ''}` : cellCls(c)
      const val = c.balanceCol && typeof r[c.key] === 'object' && r[c.key] ? r[c.key].text : r[c.key]
      return `<td class="${cls}">${val ?? ''}</td>`
    }).join('')}</tr>`,
  ).join('')
  const totalRow = opts?.total
    ? `<tfoot><tr><td colspan="${columns.length - 1}">${opts.total.label}</td><td class="r">${opts.total.value}</td></tr></tfoot>`
    : ''
  const summaryHtml = opts?.summary?.length
    ? `<div class="summary">${opts.summary.map((s) => `<div class="box"><div class="k">${s.k}</div><div class="v ${s.cls || ''}">${s.v}</div></div>`).join('')}</div>`
    : ''
  printHtml(reportTitle, `
    <div class="rpt-header">
      <div class="rpt-company">${COMPANY_NAME}</div>
      <div class="rpt-title">${reportTitle}</div>
      ${opts?.subtitle ? `<div class="rpt-meta">${opts.subtitle}</div>` : ''}
    </div>
    ${summaryHtml}
    <table>
      <thead><tr>${head}</tr></thead>
      <tbody>${bodyRows || `<tr><td colspan="${columns.length}" style="text-align:center;color:#94A3B8">No records</td></tr>`}</tbody>
      ${totalRow}
    </table>`)
}
