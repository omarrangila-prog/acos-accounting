'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Delete } from 'lucide-react'

const PIN_LENGTH = 4

export default function LoginPage() {
  const router = useRouter()
  const [digits, setDigits] = useState<string[]>([])
  const [status, setStatus] = useState<'idle' | 'loading' | 'error' | 'locked'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const submitting = useRef(false)

  const submit = useCallback(async (pin: string) => {
    if (submitting.current) return
    submitting.current = true
    setStatus('loading')
    setErrorMsg('')
    try {
      const res = await fetch('/api/auth/verify-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      })
      const data = await res.json()
      if (res.ok) {
        router.replace('/')
        router.refresh()
      } else {
        const locked = res.status === 429
        setStatus(locked ? 'locked' : 'error')
        setErrorMsg(data.error || 'Incorrect PIN. Please try again.')
        setDigits([])
        if (navigator.vibrate) navigator.vibrate([80, 40, 80])
      }
    } catch {
      setStatus('error')
      setErrorMsg('Network error. Please try again.')
      setDigits([])
    } finally {
      submitting.current = false
    }
  }, [router])

  const push = useCallback((d: string) => {
    if (status === 'loading' || status === 'locked') return
    setStatus('idle')
    setErrorMsg('')
    setDigits((prev) => {
      if (prev.length >= PIN_LENGTH) return prev
      const next = [...prev, d]
      if (next.length === PIN_LENGTH) {
        // Slight delay so the 4th dot fills before we submit
        setTimeout(() => submit(next.join('')), 120)
      }
      return next
    })
  }, [status, submit])

  const backspace = useCallback(() => {
    if (status === 'loading' || status === 'locked') return
    setStatus('idle')
    setErrorMsg('')
    setDigits((prev) => prev.slice(0, -1))
  }, [status])

  const clear = useCallback(() => {
    if (status === 'loading' || status === 'locked') return
    setStatus('idle')
    setErrorMsg('')
    setDigits([])
  }, [status])

  // Keyboard support
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') push(e.key)
      else if (e.key === 'Backspace') backspace()
      else if (e.key === 'Escape') clear()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [push, backspace, clear])

  const busy = status === 'loading'

  return (
    <div className="min-h-screen bg-surface-1 flex items-center justify-center p-4">
      <div className="w-full max-w-[340px]">
        {/* Logo / brand */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-accent text-white flex items-center justify-center font-bold text-3xl shadow-lg mb-4">
            A
          </div>
          <h1 className="text-xl font-bold text-text-primary">ACOS Accounting</h1>
          <p className="text-sm text-text-muted mt-1">Enter your PIN to continue</p>
        </div>

        {/* PIN dot indicators */}
        <div className="flex items-center justify-center gap-4 mb-6" aria-label="PIN entry progress">
          {Array.from({ length: PIN_LENGTH }).map((_, i) => (
            <div
              key={i}
              className={[
                'w-4 h-4 rounded-full border-2 transition-all duration-150',
                digits.length > i
                  ? 'bg-accent border-accent scale-110'
                  : 'bg-transparent border-border-strong',
                status === 'error' || status === 'locked' ? 'border-danger' : '',
              ].filter(Boolean).join(' ')}
            />
          ))}
        </div>

        {/* Error / lock message */}
        <div className="h-7 flex items-center justify-center mb-4">
          {errorMsg && (
            <p className={`text-sm text-center ${status === 'locked' ? 'text-warning' : 'text-danger'}`} role="alert">
              {errorMsg}
            </p>
          )}
          {busy && <p className="text-sm text-text-muted">Verifying…</p>}
        </div>

        {/* Keypad */}
        <div className="card p-4 shadow-card">
          <div className="grid grid-cols-3 gap-2">
            {['1','2','3','4','5','6','7','8','9'].map((d) => (
              <KeyButton key={d} label={d} onClick={() => push(d)} disabled={busy || status === 'locked'} />
            ))}
            {/* Bottom row: Clear · 0 · Backspace */}
            <button
              onClick={clear}
              disabled={busy || status === 'locked' || digits.length === 0}
              className="h-14 rounded-xl text-sm font-medium text-text-muted hover:bg-surface-2 disabled:opacity-40 transition-all duration-150 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              aria-label="Clear PIN"
            >
              CLR
            </button>
            <KeyButton label="0" onClick={() => push('0')} disabled={busy || status === 'locked'} />
            <button
              onClick={backspace}
              disabled={busy || status === 'locked' || digits.length === 0}
              className="h-14 rounded-xl flex items-center justify-center text-text-secondary hover:bg-surface-2 disabled:opacity-40 transition-all duration-150 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              aria-label="Backspace"
            >
              <Delete size={20} />
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-text-muted mt-6 opacity-60">
          ACOS Accounting Software · Secure Access
        </p>
      </div>
    </div>
  )
}

function KeyButton({ label, onClick, disabled }: { label: string; onClick: () => void; disabled: boolean }) {
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
