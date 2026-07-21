'use client'

// Client-side mirror of the active account.
// The authoritative account cookie is set server-side by POST /api/account/select.
// localStorage is only used so AppShell can read isDemo / accountId without an API call.

export type ActiveAccount = {
  accountId: string
  isDemo: boolean
  databaseMode: 'production' | 'tenant'
  tenantId: string
}

const STORAGE_KEY = 'acos_active_account'

export function saveAccount(account: ActiveAccount): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(account))
  } catch { /* localStorage unavailable */ }
}

export function loadAccount(): ActiveAccount | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed.accountId || !parsed.databaseMode) return null
    return parsed as ActiveAccount
  } catch {
    return null
  }
}

export function clearAccount(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch { /* ignore */ }
}
