'use client'

import { X, RefreshCw, Inbox } from 'lucide-react'

export function StatCard({ label, value, sub, accent }: { label: string; value: React.ReactNode; sub?: React.ReactNode; accent?: string }) {
  return (
    <div className="card p-5">
      <p className="text-xs text-text-muted mb-1">{label}</p>
      <p className={`text-2xl font-bold ${accent || 'text-text-primary'}`}>{value}</p>
      {sub && <div className="text-xs text-text-muted mt-1">{sub}</div>}
    </div>
  )
}

export function Modal({ open, onClose, title, children, size = 'md' }: any) {
  if (!open) return null
  const max = size === 'lg' ? 'max-w-2xl' : size === 'sm' ? 'max-w-sm' : 'max-w-md'
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative bg-surface-0 rounded-2xl shadow-modal w-full ${max} max-h-[90vh] overflow-y-auto`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-semibold text-text-primary">{title}</h2>
          <button onClick={onClose} className="btn-ghost !px-2 !py-2"><X size={16} /></button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}

export function Loading({ label = 'Loading...' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center py-14 text-text-muted gap-2">
      <RefreshCw size={16} className="animate-spin" />
      <span className="text-sm">{label}</span>
    </div>
  )
}

export function Empty({ title, icon }: { title: string; icon?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-text-muted gap-3">
      {icon ?? <Inbox size={40} className="opacity-40" />}
      <p className="text-sm">{title}</p>
    </div>
  )
}
