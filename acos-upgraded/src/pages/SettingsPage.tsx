import React, { useEffect, useState } from 'react'
import { Save, RefreshCw, Database, Globe, Moon, Sun, Bell } from 'lucide-react'
import { api } from '../lib/api'
import { useStore } from '../store'
import toast from 'react-hot-toast'

export function SettingsPage() {
  const { darkMode, setDarkMode, language, setLanguage } = useStore()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    companyName: '', address: '', phone: '', email: '', ntn: '', currency: 'PKR', language: 'en', darkMode: false
  })

  useEffect(() => {
    api.getSettings().then((s: any) => {
      if (s) setForm({ companyName: s.companyName||'', address: s.address||'', phone: s.phone||'', email: s.email||'', ntn: s.ntn||'', currency: s.currency||'PKR', language: s.language||'en', darkMode: !!s.darkMode })
      setLoading(false)
    })
  }, [])

  const handleSave = async () => {
    setSaving(true)
    const res: any = await api.saveSettings(form)
    if (res?.success) {
      toast.success('Settings saved')
      setDarkMode(form.darkMode)
      setLanguage(form.language as any)
    } else toast.error('Failed to save')
    setSaving(false)
  }

  const handleBackup = async () => {
    const res: any = await api.backupDatabase()
    if (res?.success) toast.success(`Backup saved: ${res.path}`)
    else toast.error('Backup failed or cancelled')
  }

  if (loading) return <div className="flex-1 flex items-center justify-center text-text-muted"><RefreshCw size={20} className="animate-spin" /></div>

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 animate-enter max-w-2xl">
      {/* Company Info */}
      <div className="card p-6">
        <p className="section-title mb-4">Company Information</p>
        <div className="space-y-4">
          {[['companyName','Company Name'],['address','Address'],['phone','Phone'],['email','Email'],['ntn','NTN / Tax ID']].map(([f,l]) => (
            <div key={f}>
              <label className="label">{l}</label>
              <input className="input" value={(form as any)[f]} onChange={e => setForm(p => ({...p, [f]: e.target.value}))} />
            </div>
          ))}
        </div>
      </div>

      {/* Preferences */}
      <div className="card p-6">
        <p className="section-title mb-4">Preferences</p>
        <div className="space-y-4">
          <div>
            <label className="label">Currency</label>
            <select className="input" value={form.currency} onChange={e => setForm(p => ({...p, currency: e.target.value}))}>
              {['PKR','USD','EUR','GBP','AED'].map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Language</label>
            <select className="input" value={form.language} onChange={e => setForm(p => ({...p, language: e.target.value}))}>
              <option value="en">English</option>
              <option value="ur">Roman Urdu</option>
            </select>
          </div>
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-sm font-medium text-text-primary">Dark Mode</p>
              <p className="text-xs text-text-muted">Switch to dark theme</p>
            </div>
            <button onClick={() => setForm(p => ({...p, darkMode: !p.darkMode}))} className={`relative w-11 h-6 rounded-full transition-colors ${form.darkMode ? 'bg-accent' : 'bg-surface-3'}`}>
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${form.darkMode ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Backup */}
      <div className="card p-6">
        <p className="section-title mb-2">Backup & Recovery</p>
        <p className="text-xs text-text-muted mb-4">Create a full backup of your database to a local file.</p>
        <button onClick={handleBackup} className="btn-secondary"><Database size={14} /> Backup Database</button>
      </div>

      {/* Save */}
      <div className="flex justify-end">
        <button className="btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      {/* App Info */}
      <div className="card p-5 bg-surface-1">
        <p className="text-xs text-text-muted mb-2 font-semibold">ACOS Accounting v2.0</p>
        <p className="text-xs text-text-muted">Built with Electron · React · TypeScript · SQLite</p>
        <p className="text-xs text-text-muted mt-1">All data stored locally on your device</p>
      </div>
    </div>
  )
}
