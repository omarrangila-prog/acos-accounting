import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, compact = false, currency = 'PKR'): string {
  const sym = currency === 'PKR' ? 'Rs.' : currency
  if (compact) {
    if (Math.abs(amount) >= 1_000_000) return `${sym} ${(amount / 1_000_000).toFixed(1)}M`
    if (Math.abs(amount) >= 1_000) return `${sym} ${(amount / 1_000).toFixed(0)}K`
    return `${sym} ${amount.toFixed(0)}`
  }
  return `${sym} ${new Intl.NumberFormat('en-PK').format(Math.round(amount))}`
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return '-'
  const d = typeof date === 'string' ? new Date(date) : date
  if (isNaN(d.getTime())) return '-'
  return d.toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function formatDateInput(date: Date | string | null | undefined): string {
  if (!date) return ''
  const d = typeof date === 'string' ? new Date(date) : date
  if (isNaN(d.getTime())) return ''
  return d.toISOString().split('T')[0]
}

export function daysUntil(date: Date | string): number {
  const d = typeof date === 'string' ? new Date(date) : date
  return Math.ceil((d.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
}

export function isOverdue(date: Date | string): boolean {
  return daysUntil(date) < 0
}

export function getStatusColor(status: string): string {
  const map: Record<string, string> = {
    paid: 'badge-success', cleared: 'badge-success', active: 'badge-success',
    pending: 'badge-warning', deposited: 'badge-accent', presented: 'badge-accent', partial: 'badge-accent',
    overdue: 'badge-danger', returned: 'badge-danger', cancelled: 'badge-danger',
    draft: 'badge-neutral', sent: 'badge-accent',
  }
  return map[status] ?? 'badge-neutral'
}

export function getStatusLabel(status: string): string {
  const map: Record<string, string> = {
    paid: 'Paid', partial: 'Partial', pending: 'Pending', overdue: 'Overdue',
    draft: 'Draft', cleared: 'Cleared', deposited: 'Deposited', returned: 'Returned',
    presented: 'Presented', cancelled: 'Cancelled', sent: 'Sent',
  }
  return map[status] || (status.charAt(0).toUpperCase() + status.slice(1))
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5)
}

export function expenseCategoryLabel(cat: string): string {
  const map: Record<string, string> = {
    salaries: 'Salaries', rent: 'Rent', utilities: 'Utilities', internet: 'Internet',
    fuel: 'Fuel', marketing: 'Marketing', office_supplies: 'Office Supplies',
    shipping: 'Shipping', export_costs: 'Export Costs', packaging: 'Packaging',
    logistics: 'Logistics', miscellaneous: 'Miscellaneous', general: 'General', custom: 'Other',
  }
  return map[cat] ?? cat
}

export function percentChange(current: number, previous: number): number {
  if (previous === 0) return 0
  return ((current - previous) / previous) * 100
}

export const EXPENSE_CATEGORIES = [
  'salaries', 'rent', 'utilities', 'internet', 'fuel', 'marketing',
  'office_supplies', 'shipping', 'export_costs', 'packaging', 'logistics', 'miscellaneous', 'general', 'custom'
] as const

export const CAT_COLORS: Record<string, string> = {
  salaries: '#3B6FFF', rent: '#12A150', utilities: '#F5A623', internet: '#00BCD4',
  fuel: '#9C27B0', marketing: '#E53935', office_supplies: '#FF7043', shipping: '#26A69A',
  export_costs: '#5C6BC0', packaging: '#F06292', logistics: '#8D6E63',
  miscellaneous: '#78909C', general: '#546E7A', custom: '#607D8B',
}
