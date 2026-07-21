import { cookies } from 'next/headers'

export type ServerAccount = {
  accountId: string
  tenantId: string
  isDemo: boolean
  databaseMode: 'production' | 'tenant'
}

const KNOWN_ACCOUNTS: Record<string, ServerAccount> = {
  cfood_production: {
    accountId: 'cfood_production',
    tenantId: 'cfood_production',
    isDemo: false,
    databaseMode: 'production',
  },
  demo: {
    accountId: 'demo',
    tenantId: 'demo',
    isDemo: true,
    databaseMode: 'tenant',
  },
}

export function getServerAccount(): ServerAccount | null {
  const raw = cookies().get('acos_account')?.value
  if (!raw) return null

  try {
    const parsed = JSON.parse(raw)
    const accountId = parsed?.accountId
    return KNOWN_ACCOUNTS[accountId] ?? null
  } catch {
    // Cookie may be a plain accountId string from an older client
    return KNOWN_ACCOUNTS[raw] ?? null
  }
}
