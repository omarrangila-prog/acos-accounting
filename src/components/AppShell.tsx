'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutGrid, FileText, Users, CreditCard, Receipt, Database,
  BarChart3, FileBarChart, RefreshCw, Moon, Sun, Bell, CloudOff, Menu, X, LogOut, UserCheck,
} from 'lucide-react'
import { Toaster } from 'react-hot-toast'
import { cn } from '@/lib/utils'
import { loadAccount, clearAccount, type ActiveAccount } from '@/lib/account'

// ---- Global refresh + account context ----
type ShellCtx = {
  refreshKey: number
  triggerRefresh: () => void
  account: ActiveAccount | null
}
const Ctx = createContext<ShellCtx>({ refreshKey: 0, triggerRefresh: () => {}, account: null })
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

const PAGE_TITLES: Record<string, string> = {
  '/': 'Dashboard',
  '/invoices': 'Invoices',
  '/customers': 'Customers / Ledger',
  '/pdc': 'Post Dated Cheques',
  '/expenses': 'Expenses',
  '/records': 'All Records',
  '/analytics': 'Analytics',
  '/reports': 'Reports',
}

function DemoBadge() {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 tracking-wide">
      DEMO
    </span>
  )
}

function Sidebar({
  mobileOpen, onClose, isDemo, onLogout, onSwitchAccount,
}: {
  mobileOpen: boolean; onClose: () => void; isDemo: boolean
  onLogout: () => void; onSwitchAccount: () => void
}) {
  const pathname = usePathname()
  return (
    <>
      {mobileOpen && <div className="fixed inset-0 z-40 bg-black/40 md:hidden" onClick={onClose} />}
      <aside className={cn(
        'w-[208px] shrink-0 h-screen bg-surface-0 border-r border-border flex flex-col z-50',
        'fixed inset-y-0 left-0 transition-transform duration-200 md:static md:translate-x-0',
        mobileOpen ? 'translate-x-0' : '-translate-x-full',
      )}>
        <div className="flex items-center justify-between px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-accent text-white flex items-center justify-center font-bold text-lg">A</div>
            <div>
              <div className="flex items-center gap-1.5">
                <p className="font-bold text-text-primary leading-tight">ACOS</p>
                {isDemo && <DemoBadge />}
              </div>
              <p className="text-[11px] text-text-muted leading-tight">Accounting Software</p>
            </div>
          </div>
          <button onClick={onClose} className="btn-ghost !px-2 !py-2 md:hidden"><X size={18} /></button>
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
                    <Link key={it.href} href={it.href} onClick={onClose}
                      className={active ? 'nav-item-active' : 'nav-item'}>
                      <Icon size={18} />{it.label}
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="px-3 py-3 border-t border-border space-y-0.5">
          <button onClick={onSwitchAccount} className="nav-item w-full text-left">
            <UserCheck size={16} /> Switch Account
          </button>
          <button onClick={onLogout} className="nav-item w-full text-left text-danger hover:text-danger">
            <LogOut size={16} /> Logout
          </button>
        </div>
      </aside>
    </>
  )
}

function TopBar({ onRefresh, onMenu, isDemo }: { onRefresh: () => void; onMenu: () => void; isDemo: boolean }) {
  const pathname = usePathname()
  const [dark, setDark] = useState(false)
  const title = PAGE_TITLES[pathname] ?? 'Dashboard'
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

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
    <header className="h-[68px] shrink-0 bg-surface-0 border-b border-border flex items-center justify-between px-4 md:px-6 gap-2">
      <div className="flex items-center gap-2 min-w-0">
        <button onClick={onMenu} className="btn-ghost !px-2 md:hidden" title="Menu"><Menu size={20} /></button>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-base md:text-lg font-bold text-text-primary leading-tight truncate">{title}</h1>
            {isDemo && <DemoBadge />}
          </div>
          <p className="text-xs text-text-muted hidden sm:block">{today}</p>
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button onClick={onRefresh} className="btn-ghost !px-2.5" title="Refresh"><RefreshCw size={17} /></button>
        <button onClick={toggleDark} className="btn-ghost !px-2.5" title="Toggle theme">{dark ? <Sun size={17} /> : <Moon size={17} />}</button>
        <button className="btn-ghost !px-2.5" title="Notifications"><Bell size={17} /></button>
        <button className="btn-secondary !py-2 ml-1 hidden sm:inline-flex"><CloudOff size={16} /> Connect Drive</button>
      </div>
    </header>
  )
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [refreshKey, setRefreshKey] = useState(0)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [account, setAccount] = useState<ActiveAccount | null>(null)
  const triggerRefresh = useCallback(() => setRefreshKey((k) => k + 1), [])

  // Restore account from localStorage on mount
  useEffect(() => {
    if (pathname === '/login') return
    const saved = loadAccount()
    if (saved) setAccount(saved)
  }, [pathname])

  const handleLogout = () => {
    clearAccount()
    setAccount(null)
    router.replace('/login')
  }

  const handleSwitchAccount = () => {
    clearAccount()
    setAccount(null)
    router.replace('/login')
  }

  // Login page: no shell
  if (pathname === '/login') {
    return (
      <>
        {children}
        <Toaster position="top-right" toastOptions={{ style: { fontSize: '13px' } }} />
      </>
    )
  }

  const isDemo = account?.isDemo ?? false

  return (
    <Ctx.Provider value={{ refreshKey, triggerRefresh, account }}>
      <div className="flex h-screen overflow-hidden">
        <Sidebar
          mobileOpen={mobileOpen}
          onClose={() => setMobileOpen(false)}
          isDemo={isDemo}
          onLogout={handleLogout}
          onSwitchAccount={handleSwitchAccount}
        />
        <div className="flex-1 flex flex-col min-w-0">
          <TopBar onRefresh={triggerRefresh} onMenu={() => setMobileOpen(true)} isDemo={isDemo} />
          <main className="flex-1 overflow-y-auto bg-surface-1">{children}</main>
        </div>
      </div>
      <Toaster position="top-right" toastOptions={{ style: { fontSize: '13px' } }} />
    </Ctx.Provider>
  )
}
