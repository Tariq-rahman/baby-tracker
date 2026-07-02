import { useState } from 'react'
import { signInWithMagicLink } from '../lib/auth'
import { palette } from '../lib/theme'

const field = 'w-full rounded-2xl border border-faint bg-cream p-3 text-ink placeholder:text-inkSoft'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent'>('idle')
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email || status === 'sending') return
    setStatus('sending')
    setError(null)
    try {
      await signInWithMagicLink(email)
      setStatus('sent')
    } catch (err) {
      setError((err as Error).message)
      setStatus('idle')
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm space-y-6 rounded-3xl bg-surface p-6 shadow-md">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-ink">Baby Tracker</h1>
          <p className="mt-1 text-sm text-inkSoft">Sign in to sync across your devices.</p>
        </div>

        {status === 'sent' ? (
          <div className="text-center">
            <p className="font-semibold text-ink">Check your email</p>
            <p className="mt-1 text-sm text-inkSoft">
              We sent a magic link to <span className="font-medium text-ink">{email}</span>. Open it
              on this device to sign in.
            </p>
            <button
              onClick={() => setStatus('idle')}
              className="mt-4 text-sm font-semibold"
              style={{ color: palette.ring }}
            >
              Use a different email
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={field}
              required
            />
            {error && <p className="text-sm font-medium text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={status === 'sending'}
              className="press w-full rounded-2xl py-3 font-bold text-white disabled:opacity-60"
              style={{ background: palette.ring }}
            >
              {status === 'sending' ? 'Sending…' : 'Send magic link'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
