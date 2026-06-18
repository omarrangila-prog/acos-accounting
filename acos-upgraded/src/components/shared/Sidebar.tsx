import React from 'react'
import { useStore } from '../../store'
import { cn } from '../../lib/utils'
import type { ActivePage } from '../../store'
import {
  LayoutDashboard, Users, Building2, CreditCard,
  Receipt, BarChart3, FileText, FileSpreadsheet,
} from 'lucide-react'

const NAV: { id: ActivePage; label: string; icon: React.ReactNode; group: string }[] = [
  { id: 'dashboard',   label: 'Dashboard',    icon: <LayoutDashboard size={17} />, group: 'main' },
  { id: 'invoices',    label: 'Invoices',     icon: <FileSpreadsheet size={17} />, group: 'finance' },
  { id: 'receivables', label: 'Receivables',  icon: <Users size={17} />,           group: 'finance' },
  { id: 'payables',    label: 'Payables',     icon: <Building2 size={17} />,       group: 'finance' },
  { id: 'pdc',         label: 'PDC Checks',   icon: <CreditCard size={17} />,      group: 'finance' },
  { id: 'expenses',    label: 'Expenses',     icon: <Receipt size={17} />,         group: 'finance' },
  { id: 'analytics',   label: 'Analytics',    icon: <BarChart3 size={17} />,       group: 'insights' },
  { id: 'reports',     label: 'Reports',      icon: <FileText size={17} />,        group: 'insights' },
]

const GROUP_LABELS: Record<string, string> = { main: '', finance: 'FINANCE', insights: 'INSIGHTS' }

export function Sidebar() {
  const { activePage, setActivePage } = useStore()

  return (
    <aside className="flex flex-col h-full bg-surface-0 border-r border-border w-[210px] flex-shrink-0">

      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 py-4 border-b border-border">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-accent to-blue-700 flex items-center justify-center shadow-sm flex-shrink-0">
          <span className="text-white font-bold text-sm">A</span>
        </div>
        <div>
          <p className="text-sm font-bold text-text-primary leading-none">ACOS</p>
          <p className="text-[10px] text-text-muted mt-0.5">Accounting v2</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {['main','finance','insights'].map(group => {
          const items = NAV.filter(n => n.group === group)
          return (
            <div key={group} className="mb-1">
              {GROUP_LABELS[group] && (
                <p className="text-[9px] font-bold text-text-muted/60 tracking-widest px-3 py-1.5 uppercase">
                  {GROUP_LABELS[group]}
                </p>
              )}
              {items.map(item => (
                <button
                  key={item.id}
                  onClick={() => setActivePage(item.id)}
                  className={cn(
                    'w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-150 mb-0.5',
                    activePage === item.id
                      ? 'bg-accent text-white shadow-sm'
                      : 'text-text-secondary hover:bg-surface-2 hover:text-text-primary'
                  )}
                >
                  <span className="flex-shrink-0">{item.icon}</span>
                  <span className="flex-1 text-left truncate">{item.label}</span>
                </button>
              ))}
            </div>
          )
        })}
      </nav>

      {/* Footer — just version info, no admin row */}
      <div className="px-4 py-3 border-t border-border">
        <p className="text-[10px] text-text-muted">ACOS v2.0 · All data saved locally</p>
      </div>
    </aside>
  )
}
