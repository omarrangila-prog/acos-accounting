export function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(' ')
}

export function formatCurrency(amount: number, compact = false, currency = 'Rs.'): string {
  const n = Number(amount) || 0
  if (compact && Math.abs(n) >= 1000) {
    if (Math.abs(n) >= 1_000_000) return `${currency} ${(n / 1_000_000).toFixed(1)}M`
    return `${currency} ${(n / 1000).toFixed(0)}K`
  }
  return `${currency} ${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}`
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return '-'
  const d = new Date(date)
  if (isNaN(d.getTime())) return '-'
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-')
}

export function formatDateTime(date: Date | string | null | undefined): { date: string; time: string } {
  if (!date) return { date: '-', time: '' }
  const d = new Date(date)
  if (isNaN(d.getTime())) return { date: '-', time: '' }
  return {
    date: d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-'),
    time: d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }).toLowerCase(),
  }
}

export function toDateInput(date: Date | string | null | undefined): string {
  if (!date) return ''
  const d = new Date(date)
  if (isNaN(d.getTime())) return ''
  return d.toISOString().split('T')[0]
}

export const EXPENSE_CATEGORIES = [
  'rent', 'salaries', 'utilities', 'fuel', 'maintenance', 'office_supplies',
  'shipping', 'export_costs', 'packaging', 'logistics', 'miscellaneous', 'general', 'custom',
]

const CATEGORY_LABELS: Record<string, string> = {
  rent: 'Rent', salaries: 'Salaries', utilities: 'Utilities', fuel: 'Fuel',
  maintenance: 'Maintenance', office_supplies: 'Office Supplies', shipping: 'Shipping',
  export_costs: 'Export Costs', packaging: 'Packaging', logistics: 'Logistics',
  miscellaneous: 'Miscellaneous', general: 'General', custom: 'Custom',
}

export function expenseCategoryLabel(cat: string): string {
  return CATEGORY_LABELS[cat] || cat?.charAt(0).toUpperCase() + cat?.slice(1) || cat
}

export const CAT_COLORS: Record<string, string> = {
  rent: '#3B6FFF', salaries: '#12A150', utilities: '#D97706', fuel: '#DC2626',
  maintenance: '#8B5CF6', office_supplies: '#06B6D4', shipping: '#EC4899',
  export_costs: '#5C6BC0', packaging: '#F06292', logistics: '#8D6E63',
  miscellaneous: '#64748B', general: '#0EA5E9', custom: '#84CC16',
}

export const PAYMENT_METHODS = ['cash', 'bank', 'cheque', 'card', 'online']

export function paymentMethodLabel(m: string): string {
  const map: Record<string, string> = { cash: 'Cash', bank: 'Bank Transfer', cheque: 'Cheque', card: 'Card', online: 'Online' }
  return map[m] || m
}
