'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutGrid, FileText, Users, CreditCard, Receipt, Database,
  BarChart3, FileBarChart, RefreshCw, Moon, Sun, Bell, CloudOff,
} from 'lucide-react'
import { Toaster } from 'react-hot-toast'

// ---- Global refresh + theme context ----
type ShellCtx = { refreshKey: number; triggerRefresh: () => void }
const Ctx = createContext<ShellCtx>({ refreshKey: 0, triggerRefresh: () => {} })
export const useShell = () => useContext(Ctx)

const NAV = [
  { group: 'FINANCE', items: [
    { href: '/', label: 'Dashboard', icon: LayoutGrid },
    { href: '/invoices', label: 'Invoices', icon: FileText },
    { href: '/customers', label: 'Customers/Ledger', icon: Users },
    { href: '/pdc', label: 'PDC Cheques', icon: CreditCard },
    { href: '/expenses', label: 'Expenses', icon: Receipt },
  ]},
  { group: 'INSIGHTS', items: [
    { href: '/records', label: 'All Records', icon: Database },
    { href: '/analytics', label: 'Analytics', icon: BarChart3 },
    { href: '/reports', label: 'Reports', icon: FileBarChart },
  ]},
]

const TITLES: Record<string, string> = {
  '/': 'Dashboard', '/invoices': 'Invoices', '/customers': 'WAHHAJ SEAFOOD Software',
  '/pdc': 'Post Dated Cheques', '/expenses': 'Expenses', '/records': 'WAHHAJ SEAFOOD Software',
  '/analytics': 'Analytics', '/reports': 'Reports',
}

function Sidebar() {
  const pathname = usePathname()
  return (
    <aside className="w-[208px] shrink-0 h-screen bg-surface-0 border-r border-border flex flex-col">
      <div className="flex items-center gap-3 px-5 py-4">
        <div className="w-9 h-9 rounded-xl bg-accent text-white flex items-center justify-center font-bold text-lg">A</div>
        <div>
          <p className="font-bold text-text-primary leading-tight">ACOS</p>
          <p className="text-[11px] text-text-muted leading-tight">Accounting Software</p>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-4">
        {NAV.map((g) => (
          <div key={g.group}>
            <p className="px-3 mb-1 text-[10px] font-semibold text-text-muted tracking-wider">{g.group}</p>
            <div className="space-y-0.5">
              {g.items.map((it) => {
                const active = pathname === it.href
                const Icon = it.icon
                return (
                  <Link key={it.href} href={it.href} className={active ? 'nav-item-active' : 'nav-item'}>
                    <Icon size={18} />
                    {it.label}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  )
}

function TopBar({ onRefresh }: { onRefresh: () => void }) {
  const pathname = usePathname()
  const [dark, setDark] = useState(false)
  const title = TITLES[pathname] ?? 'Dashboard'
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  useEffect(() => {
    const saved = localStorage.getItem('acos-theme') === 'dark'
    setDark(saved)
    document.documentElement.classList.toggle('dark', saved)
  }, [])

  const toggleDark = () => {
    const next = !dark
    setDark(next)
    document.documentElement.classList.toggle('dark', next)
    localStorage.setItem('acos-theme', next ? 'dark' : 'light')
  }

  return (
    <header className="h-[68px] shrink-0 bg-surface-0 border-b border-border flex items-center justify-between px-6">
      <div>
        <h1 className="text-lg font-bold text-text-primary leading-tight">{title}</h1>
        <p className="text-xs text-text-muted">{today}</p>
      </div>
      <div className="flex items-center gap-1">
        <button onClick={onRefresh} className="btn-ghost !px-2.5" title="Refresh"><RefreshCw size={17} /></button>
        <button onClick={toggleDark} className="btn-ghost !px-2.5" title="Toggle theme">{dark ? <Sun size={17} /> : <Moon size={17} />}</button>
        <button className="btn-ghost !px-2.5" title="Notifications"><Bell size={17} /></button>
        <button className="btn-secondary !py-2 ml-2"><CloudOff size={16} /> Connect Drive</button>
      </div>
    </header>
  )
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [refreshKey, setRefreshKey] = useState(0)
  const triggerRefresh = useCallback(() => setRefreshKey((k) => k + 1), [])

  return (
    <Ctx.Provider value={{ refreshKey, triggerRefresh }}>
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <TopBar onRefresh={triggerRefresh} />
          <main className="flex-1 overflow-y-auto bg-surface-1">{children}</main>
        </div>
      </div>
      <Toaster position="top-right" toastOptions={{ style: { fontSize: '13px' } }} />
    </Ctx.Provider>
  )
}
