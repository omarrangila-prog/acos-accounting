'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Delete } from 'lucide-react'
import { saveAccount, type ActiveAccount } from '@/lib/account'

const PIN_LENGTH = 4

export default function LoginPage() {
  const router = useRouter()
  const [digits, setDigits] = useState<string[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const submitting = useRef(false)

  const submit = useCallback(async (pin: string) => {
    if (submitting.current) return
    submitting.current = true
    setLoading(true)

    try {
      const res = await fetch('/api/account/select', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        setError(data.error || 'Incorrect PIN. Please try again.')
        setDigits([])
        if (navigator.vibrate) navigator.vibrate([80, 40, 80])
        submitting.current = false
        setLoading(false)
        return
      }

      // Mirror to localStorage so AppShell can read isDemo / accountId client-side
      saveAccount(data.account as ActiveAccount)
      router.replace('/')
    } catch {
      setError('Unable to connect. Please try again.')
      setDigits([])
      submitting.current = false
      setLoading(false)
    }
  }, [router])

  const push = useCallback((d: string) => {
    if (loading) return
    setError('')
    setDigits((prev) => {
      if (prev.length >= PIN_LENGTH) return prev
      const next = [...prev, d]
      if (next.length === PIN_LENGTH) {
        setTimeout(() => submit(next.join('')), 80)
      }
      return next
    })
  }, [submit, loading])

  const backspace = useCallback(() => {
    if (loading) return
    setError('')
    setDigits((prev) => prev.slice(0, -1))
  }, [loading])

  const clear = useCallback(() => {
    if (loading) return
    setError('')
    setDigits([])
    submitting.current = false
  }, [loading])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') push(e.key)
      else if (e.key === 'Backspace') backspace()
      else if (e.key === 'Escape') clear()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [push, backspace, clear])

  return (
    <div className="min-h-screen bg-surface-1 flex items-center justify-center p-4">
      <div className="w-full max-w-[340px]">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-accent text-white flex items-center justify-center font-bold text-3xl shadow-lg mb-4">
            A
          </div>
          <h1 className="text-xl font-bold text-text-primary">ACOS Accounting</h1>
          <p className="text-sm text-text-muted mt-1">Enter your PIN to continue</p>
        </div>

        {/* PIN dot indicators */}
        <div className="flex items-center justify-center gap-4 mb-6">
          {Array.from({ length: PIN_LENGTH }).map((_, i) => (
            <div
              key={i}
              className={[
                'w-4 h-4 rounded-full border-2 transition-all duration-150',
                digits.length > i ? 'bg-accent border-accent scale-110' : 'bg-transparent border-border-strong',
                error ? 'border-danger' : '',
              ].filter(Boolean).join(' ')}
            />
          ))}
        </div>

        {/* Status */}
        <div className="h-6 flex items-center justify-center mb-4">
          {loading && (
            <p className="text-sm text-text-muted text-center">Opening account…</p>
          )}
          {!loading && error && (
            <p className="text-sm text-danger text-center" role="alert">{error}</p>
          )}
        </div>

        {/* Keypad */}
        <div className="card p-4 shadow-card">
          <div className="grid grid-cols-3 gap-2">
            {['1','2','3','4','5','6','7','8','9'].map((d) => (
              <KeyButton key={d} label={d} onClick={() => push(d)} disabled={loading} />
            ))}
            <button
              onClick={clear}
              disabled={digits.length === 0 || loading}
              className="h-14 rounded-xl text-sm font-medium text-text-muted hover:bg-surface-2 disabled:opacity-30 transition-all duration-150 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              CLR
            </button>
            <KeyButton label="0" onClick={() => push('0')} disabled={loading} />
            <button
              onClick={backspace}
              disabled={digits.length === 0 || loading}
              className="h-14 rounded-xl flex items-center justify-center text-text-secondary hover:bg-surface-2 disabled:opacity-30 transition-all duration-150 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              aria-label="Backspace"
            >
              <Delete size={20} />
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-text-muted mt-6 opacity-60">
          ACOS Accounting Software
        </p>
      </div>
    </div>
  )
}

function KeyButton({ label, onClick, disabled }: { label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="h-14 rounded-xl text-xl font-semibold text-text-primary bg-surface-0 hover:bg-accent hover:text-white disabled:opacity-40 transition-all duration-150 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent shadow-sm border border-border"
      aria-label={`Digit ${label}`}
    >
      {label}
    </button>
  )
}
