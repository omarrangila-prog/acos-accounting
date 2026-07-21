'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Delete } from 'lucide-react'
import { verifyPin, saveAccount } from '@/lib/account'

const PIN_LENGTH = 4

export default function LoginPage() {
  const router = useRouter()
  const [digits, setDigits] = useState<string[]>([])
  const [error, setError] = useState('')
  const submitting = useRef(false)

  const submit = useCallback((pin: string) => {
    if (submitting.current) return
    submitting.current = true

    const result = verifyPin(pin)

    if (result.success === false) {
      setError(result.message)
      setDigits([])
      if (navigator.vibrate) navigator.vibrate([80, 40, 80])
      submitting.current = false
      return
    }

    // Save account and navigate immediately — no API call
    saveAccount(result.account)
    router.replace('/')
  }, [router])

  const push = useCallback((d: string) => {
    setError('')
    setDigits((prev) => {
      if (prev.length >= PIN_LENGTH) return prev
      const next = [...prev, d]
      if (next.length === PIN_LENGTH) {
        setTimeout(() => submit(next.join('')), 80)
      }
      return next
    })
  }, [submit])

  const backspace = useCallback(() => {
    setError('')
    setDigits((prev) => prev.slice(0, -1))
  }, [])

  const clear = useCallback(() => {
    setError('')
    setDigits([])
    submitting.current = false
  }, [])

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

        {/* Error message */}
        <div className="h-6 flex items-center justify-center mb-4">
          {error && (
            <p className="text-sm text-danger text-center" role="alert">{error}</p>
          )}
        </div>

        {/* Keypad */}
        <div className="card p-4 shadow-card">
          <div className="grid grid-cols-3 gap-2">
            {['1','2','3','4','5','6','7','8','9'].map((d) => (
              <KeyButton key={d} label={d} onClick={() => push(d)} />
            ))}
            <button
              onClick={clear}
              disabled={digits.length === 0}
              className="h-14 rounded-xl text-sm font-medium text-text-muted hover:bg-surface-2 disabled:opacity-30 transition-all duration-150 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              CLR
            </button>
            <KeyButton label="0" onClick={() => push('0')} />
            <button
              onClick={backspace}
              disabled={digits.length === 0}
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

function KeyButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="h-14 rounded-xl text-xl font-semibold text-text-primary bg-surface-0 hover:bg-accent hover:text-white transition-all duration-150 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent shadow-sm border border-border"
      aria-label={`Digit ${label}`}
    >
      {label}
    </button>
  )
}
