import React, { useEffect, useState } from 'react'
import { Bell, RefreshCw, Moon, Sun, Cloud, CloudOff, UploadCloud as CloudUpload, X, CheckCircle, Loader, AlertCircle, ExternalLink } from 'lucide-react'
import { useStore } from '../../store'
import { api } from '../../lib/api'
import { cn } from '../../lib/utils'
import toast from 'react-hot-toast'

const PAGE_TITLES: Record<string, string> = {
  dashboard: 'Dashboard', invoices: 'Invoices',
  receivables: 'Accounts Receivable', payables: 'Accounts Payable',
  pdc: 'Post Dated Checks', expenses: 'Expenses',
  analytics: 'Analytics', reports: 'Reports',
}

/* ── Google Drive panel ── */
function DrivePanel({ onClose }: { onClose: () => void }) {
  const [status, setStatus] = useState<'idle'|'backing_up'|'done'|'error'>('idle')
  const [connected, setConnected] = useState(false)
  const [showConnect, setShowConnect] = useState(false)
  const [authStep, setAuthStep] = useState<'creds'|'code'>('creds')
  const [creds, setCreds] = useState({ client_id: '', client_secret: '' })
  const [authCode, setAuthCode] = useState('')
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    api.gdriveGetStatus().then((s: any) => setConnected(s?.connected))
  }, [])

  const openConnect = () => { setShowConnect(true); setAuthStep('creds'); setCreds({ client_id: '', client_secret: '' }); setAuthCode('') }

  const handleGetAuthUrl = async () => {
    if (!creds.client_id || !creds.client_secret) return toast.error('Enter both Client ID and Client Secret')
    setLoading(true)
    const res: any = await api.gdriveConnect(creds)
    setLoading(false)
    if (res?.success) { setAuthStep('code'); toast.success('Browser opened — sign in and paste the code below') }
    else toast.error(res?.error || 'Failed to generate auth URL')
  }

  const handleSetCode = async () => {
    if (!authCode.trim()) return toast.error('Paste the authorization code')
    setLoading(true)
    const res: any = await api.gdriveSetCode({ code: authCode.trim(), credentials: creds })
    setLoading(false)
    if (res?.success) { setConnected(true); setShowConnect(false); toast.success('Google Drive connected!') }
    else toast.error(res?.error || 'Invalid code')
  }

  const handleBackup = async () => {
    setStatus('backing_up')
    setResult(null)
    const res: any = await api.gdriveBackup()
    if (res?.success) { setStatus('done'); setResult(res) }
    else { setStatus('error'); setResult(res) }
  }

  const handleDisconnect = async () => {
    if (!confirm('Disconnect Google Drive?')) return
    await api.gdriveDisconnect()
    setConnected(false)
    setStatus('idle')
    toast('Google Drive disconnected')
  }

  return (
    <div className="absolute right-4 top-14 z-50 w-80 bg-surface-0 rounded-2xl shadow-modal border border-border overflow-hidden animate-enter">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
            <svg viewBox="0 0 87.3 78" width="16" height="16"><path d="M6.6 66.85l3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8H0c0 1.55.4 3.1 1.2 4.5l5.4 9.35z" fill="#0066da"/><path d="M43.65 25L29.9 1.2C28.55 2 27.4 3.1 26.6 4.5L1.2 49.5C.4 50.9 0 52.45 0 54h27.5l16.15-29z" fill="#00ac47"/><path d="M73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5H59.8l5.9 12.25 7.85 11.55z" fill="#ea4335"/><path d="M43.65 25L57.4 1.2C56.05.4 54.5 0 52.85 0H34.45c-1.65 0-3.2.45-4.55 1.2L43.65 25z" fill="#00832d"/><path d="M59.8 54H27.5L13.75 77.8c1.35.8 2.9 1.2 4.55 1.2h50.7c1.65 0 3.2-.45 4.55-1.2L59.8 54z" fill="#2684fc"/><path d="M73.4 27.5l-12.55-21.7c-.8-1.4-1.95-2.5-3.3-3.3L43.65 25l16.15 29h27.45c0-1.55-.4-3.1-1.2-4.5l-12.65-22z" fill="#ffba00"/></svg>
          </div>
          <p className="text-sm font-semibold text-text-primary">Google Drive</p>
        </div>
        <button onClick={onClose} className="btn-ghost !px-1.5 !py-1.5"><X size={14} /></button>
      </div>

      <div className="p-4 space-y-4">
        {/* Connection status */}
        <div className={cn('flex items-center gap-2.5 px-3 py-2.5 rounded-xl border', connected ? 'bg-success/5 border-success/20' : 'bg-surface-1 border-border')}>
          <div className={cn('w-2 h-2 rounded-full', connected ? 'bg-success' : 'bg-text-muted')} />
          <p className="text-xs font-medium text-text-primary">{connected ? 'Connected to Google Drive' : 'Not connected'}</p>
          {connected && <button onClick={handleDisconnect} className="ml-auto text-[10px] text-text-muted hover:text-danger transition-colors">Disconnect</button>}
        </div>

        {/* Connect flow */}
        {!connected && !showConnect && (
          <div className="space-y-3">
            <p className="text-xs text-text-secondary leading-relaxed">
              Connect your Google Drive to automatically back up your database to the cloud.
            </p>
            <button onClick={openConnect} className="btn-primary w-full justify-center text-xs">
              <Cloud size={14} /> Connect Google Drive
            </button>
            <a
              href="https://console.cloud.google.com/apis/credentials"
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-1 text-[10px] text-accent hover:underline"
            >
              <ExternalLink size={10} /> Get API credentials from Google Cloud Console
            </a>
          </div>
        )}

        {!connected && showConnect && authStep === 'creds' && (
          <div className="space-y-3">
            <p className="text-xs font-medium text-text-primary">Enter Google OAuth Credentials</p>
            <div>
              <label className="label text-[10px]">Client ID</label>
              <input className="input text-xs !py-1.5" placeholder="xxxxx.apps.googleusercontent.com" value={creds.client_id} onChange={e => setCreds(p => ({...p, client_id: e.target.value}))} />
            </div>
            <div>
              <label className="label text-[10px]">Client Secret</label>
              <input className="input text-xs !py-1.5" type="password" placeholder="GOCSPX-…" value={creds.client_secret} onChange={e => setCreds(p => ({...p, client_secret: e.target.value}))} />
            </div>
            <div className="flex gap-2">
              <button className="btn-secondary text-xs flex-1 justify-center" onClick={() => setShowConnect(false)}>Cancel</button>
              <button className="btn-primary text-xs flex-1 justify-center" onClick={handleGetAuthUrl} disabled={loading}>
                {loading ? <Loader size={12} className="animate-spin" /> : null} Open Google
              </button>
            </div>
          </div>
        )}

        {!connected && showConnect && authStep === 'code' && (
          <div className="space-y-3">
            <p className="text-xs text-text-secondary">Sign in with Google in the browser that opened, then paste the authorization code here.</p>
            <div>
              <label className="label text-[10px]">Authorization Code</label>
              <input className="input text-xs !py-1.5 font-mono" placeholder="4/0AX4…" value={authCode} onChange={e => setAuthCode(e.target.value)} />
            </div>
            <div className="flex gap-2">
              <button className="btn-secondary text-xs flex-1 justify-center" onClick={() => setAuthStep('creds')}>Back</button>
              <button className="btn-primary text-xs flex-1 justify-center" onClick={handleSetCode} disabled={loading}>
                {loading ? <Loader size={12} className="animate-spin" /> : null} Verify
              </button>
            </div>
          </div>
        )}

        {/* Backup section (when connected) */}
        {connected && (
          <div className="space-y-3">
            <p className="text-xs text-text-secondary">Your database will be saved to an <strong>ACOS Backups</strong> folder in your Google Drive.</p>

            {status === 'idle' && (
              <button onClick={handleBackup} className="btn-primary w-full justify-center">
                <CloudUpload size={15} /> Backup Now
              </button>
            )}
            {status === 'backing_up' && (
              <div className="flex items-center justify-center gap-2 py-3 text-accent text-sm">
                <Loader size={16} className="animate-spin" /> Uploading to Drive…
              </div>
            )}
            {status === 'done' && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-success text-xs font-medium">
                  <CheckCircle size={14} /> Backup complete!
                </div>
                <p className="text-[10px] text-text-muted">Saved as: {result?.fileName}</p>
                {result?.link && (
                  <a href={result.link} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[10px] text-accent hover:underline">
                    <ExternalLink size={10} /> Open in Google Drive
                  </a>
                )}
                <button onClick={() => { setStatus('idle'); setResult(null) }} className="btn-secondary w-full text-xs justify-center mt-1">Backup Again</button>
              </div>
            )}
            {status === 'error' && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-danger text-xs font-medium">
                  <AlertCircle size={14} /> Backup failed
                </div>
                <p className="text-[10px] text-text-muted">{result?.error}</p>
                <button onClick={() => setStatus('idle')} className="btn-secondary w-full text-xs justify-center">Try Again</button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Top bar ── */
export function TopBar() {
  const { activePage, notifications, setNotifications, darkMode, setDarkMode, triggerRefresh } = useStore()
  const [showDrive, setShowDrive] = useState(false)
  const [driveConnected, setDriveConnected] = useState(false)
  const unread = notifications.filter((n: any) => !n.read).length

  useEffect(() => {
    api.getNotifications().then((n: any) => setNotifications(n || []))
    api.gdriveGetStatus().then((s: any) => setDriveConnected(s?.connected))
  }, [])

  return (
    <header className="relative flex items-center justify-between px-6 py-3.5 border-b border-border bg-surface-0 flex-shrink-0">
      <div>
        <h1 className="text-base font-semibold text-text-primary">{PAGE_TITLES[activePage] || 'ACOS'}</h1>
        <p className="text-[11px] text-text-muted">
          {new Date().toLocaleDateString('en-PK', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      <div className="flex items-center gap-1.5">
        {/* Refresh */}
        <button onClick={triggerRefresh} className="btn-ghost !px-2 !py-2" title="Refresh">
          <RefreshCw size={15} />
        </button>

        {/* Dark mode */}
        <button onClick={() => setDarkMode(!darkMode)} className="btn-ghost !px-2 !py-2" title="Toggle dark mode">
          {darkMode ? <Sun size={15} /> : <Moon size={15} />}
        </button>

        {/* Notifications */}
        <button className="btn-ghost !px-2 !py-2 relative" title="Notifications">
          <Bell size={15} />
          {unread > 0 && <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-danger rounded-full" />}
        </button>

        {/* Divider */}
        <div className="w-px h-5 bg-border mx-1" />

        {/* Google Drive button */}
        <button
          onClick={() => setShowDrive(p => !p)}
          className={cn(
            'flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all duration-150',
            showDrive
              ? 'bg-blue-50 border-blue-200 text-blue-700'
              : driveConnected
                ? 'bg-success/5 border-success/25 text-success hover:bg-success/10'
                : 'bg-surface-1 border-border text-text-secondary hover:bg-surface-2 hover:text-text-primary'
          )}
          title="Google Drive Backup"
        >
          {driveConnected
            ? <><Cloud size={14} /> Drive Backup</>
            : <><CloudOff size={14} /> Connect Drive</>
          }
        </button>
      </div>

      {/* Drive Panel */}
      {showDrive && <DrivePanel onClose={() => { setShowDrive(false); api.gdriveGetStatus().then((s: any) => setDriveConnected(s?.connected)) }} />}
    </header>
  )
}
