import './globals.css'
import type { Metadata } from 'next'
import { AppShell } from '@/components/AppShell'
import { headers } from 'next/headers'

export const metadata: Metadata = {
  title: 'ACOS Accounting Software',
  description: 'ACOS Accounting Software',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // The middleware attaches x-tenant-id when authenticated.
  // The login page (/login) is served without a tenant header.
  // We read the path from the referer-like mechanism via headers().
  // Actually: Next.js App Router doesn't give us the pathname in the root
  // server layout. The AppShell is a client component that reads usePathname()
  // so it can self-exclude on /login.
  return (
    <html lang="en">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  )
}
