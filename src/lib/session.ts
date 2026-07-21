// Server-side helper: reads the active account from the request cookie.
// The cookie value is just the accountId string set by saveAccount() in account.ts.
import { cookies } from 'next/headers'

const PRODUCTION_ACCOUNT = 'cfood_production'

export type ServerAccount = {
  accountId: string
  tenantId: string  // same as accountId for now
  isProduction: boolean
}

export function getServerAccount(): ServerAccount | null {
  const store = cookies()
  const accountId = store.get('acos_account')?.value
  if (!accountId) return null
  return {
    accountId,
    tenantId: accountId,
    isProduction: accountId === PRODUCTION_ACCOUNT,
  }
}
