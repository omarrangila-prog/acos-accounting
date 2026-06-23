'use client'

// Client-side helper that requests an Excel file from the server and downloads it.
// Reused by every page (Customers, Expenses, PDC, etc.) so the button behaves identically.
export async function downloadExcel(
  fileName: string,
  sheetName: string,
  columns: { header: string; key: string; width?: number }[],
  rows: Record<string, any>[],
) {
  const res = await fetch('/api/export', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileName, sheetName, columns, rows }),
  })
  if (!res.ok) throw new Error('Export failed')
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName.endsWith('.xlsx') ? fileName : `${fileName}.xlsx`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
