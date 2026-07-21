// Login page has its own minimal layout — no AppShell sidebar/topbar.
export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
