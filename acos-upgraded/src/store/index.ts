import { create } from 'zustand'
export type ActivePage = 'dashboard' | 'receivables' | 'payables' | 'pdc' | 'expenses' | 'invoices' | 'reports' | 'analytics'
interface AppStore {
  activePage: ActivePage
  setActivePage: (p: ActivePage) => void
  darkMode: boolean
  setDarkMode: (v: boolean) => void
  language: 'en' | 'ur'
  setLanguage: (v: 'en' | 'ur') => void
  refreshKey: number
  triggerRefresh: () => void
  notifications: any[]
  setNotifications: (n: any[]) => void
}
export const useStore = create<AppStore>((set) => ({
  activePage: 'dashboard',
  setActivePage: (page) => set({ activePage: page }),
  darkMode: false,
  setDarkMode: (v) => set({ darkMode: v }),
  language: 'en',
  setLanguage: (v) => set({ language: v }),
  refreshKey: 0,
  triggerRefresh: () => set((s) => ({ refreshKey: s.refreshKey + 1 })),
  notifications: [],
  setNotifications: (n) => set({ notifications: n }),
}))
