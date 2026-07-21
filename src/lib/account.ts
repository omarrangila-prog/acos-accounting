'use client'

// Central account configuration.
// PIN lookup and session storage happen entirely in the browser —
// no API call, no network round-trip, instant response.

export type ActiveAccount = {
  accountId: string
  isDemo: boolean
  databaseMode: 'production' | 'tenant'
  tenantId: string
}

// PIN → account map. Lives in the browser bundle.
// This is a convenience account-selector, not security authentication.
// Firebase collections are what actually hold the data.
const PIN_ACCOUNTS: Record<string, ActiveAccount> = {
  '4444': {
    accountId: 'cfood_production',
    isDemo: false,
    databaseMode: 'production',
    tenantId: 'cfood_production',
  },
  '5555': {
    accountId: 'demo',
    isDemo: true,
    databaseMode: 'tenant',
    tenantId: 'demo',
  },
}

const STORAGE_KEY = 'acos_active_account'

export function verifyPin(pin: string): { success: true; account: ActiveAccount } | { success: false; message: string } {
  const account = PIN_ACCOUNTS[pin]
  if (!account) {
    return { success: false, message: 'Incorrect PIN. Please try again.' }
  }
  return { success: true, account }
}

export function saveAccount(account: ActiveAccount): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(account))
    // Also set a plain (non-sensitive) cookie so the server middleware
    // knows the user has selected an account and can allow page access.
    // The cookie value is just the accountId — no PIN, no secret.
    document.cookie = `acos_account=${account.accountId}; path=/; max-age=${60 * 60 * 24 * 7}; samesite=lax`
  } catch { /* localStorage unavailable */ }
}

export function loadAccount(): ActiveAccount | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    // Validate shape
    if (!parsed.accountId || !parsed.databaseMode) return null
    return parsed as ActiveAccount
  } catch {
    return null
  }
}

export function clearAccount(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
    // Expire the cookie
    document.cookie = 'acos_account=; path=/; max-age=0; samesite=lax'
  } catch { /* ignore */ }
}
