import React, { useEffect } from 'react'
import { useStore } from './store'
import { Sidebar } from './components/shared/Sidebar'
import { TopBar } from './components/shared/TopBar'
import { DashboardPage } from './pages/DashboardPage'
import { InvoicesPage } from './pages/InvoicesPage'
import { ReceivablesPage } from './pages/ReceivablesPage'
import { PayablesPage } from './pages/PayablesPage'
import { PDCPage } from './pages/PDCPage'
import { ExpensesPage } from './pages/ExpensesPage'
import { AnalyticsPage } from './pages/AnalyticsPage'
import { ReportsPage } from './pages/ReportsPage'

export default function App() {
  const { activePage, darkMode, setDarkMode } = useStore()
  useEffect(() => { document.documentElement.classList.toggle('dark', darkMode) }, [darkMode])
  const pages: Record<string, React.ReactNode> = {
    dashboard: <DashboardPage />, invoices: <InvoicesPage />,
    receivables: <ReceivablesPage />, payables: <PayablesPage />,
    pdc: <PDCPage />, expenses: <ExpensesPage />,
    analytics: <AnalyticsPage />, reports: <ReportsPage />,
  }
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-surface-1">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-hidden flex flex-col">{pages[activePage] || <DashboardPage />}</main>
      </div>
    </div>
  )
}
