import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { Session } from '@supabase/supabase-js'
import AuthGate from './AuthGate'

const useSessionMock = vi.fn()

vi.mock('../hooks/useSession', () => ({
  useSession: () => useSessionMock(),
}))

// LoginPage pulls in supabase/auth via signInWithMagicLink; stub it so the gate
// test doesn't need a configured backend.
vi.mock('../lib/auth', () => ({ signInWithMagicLink: vi.fn(), signOut: vi.fn() }))

describe('AuthGate', () => {
  beforeEach(() => {
    useSessionMock.mockReset()
  })

  it('shows a splash while the session is loading', () => {
    useSessionMock.mockReturnValue({ session: null, loading: true })
    render(
      <AuthGate>
        <div>protected</div>
      </AuthGate>,
    )
    expect(screen.getByText(/loading/i)).toBeInTheDocument()
    expect(screen.queryByText('protected')).not.toBeInTheDocument()
  })

  it('renders the login page when there is no session', () => {
    useSessionMock.mockReturnValue({ session: null, loading: false })
    render(
      <AuthGate>
        <div>protected</div>
      </AuthGate>,
    )
    expect(screen.getByRole('button', { name: /send magic link/i })).toBeInTheDocument()
    expect(screen.queryByText('protected')).not.toBeInTheDocument()
  })

  it('renders children when a session exists', () => {
    useSessionMock.mockReturnValue({ session: {} as Session, loading: false })
    render(
      <AuthGate>
        <div>protected</div>
      </AuthGate>,
    )
    expect(screen.getByText('protected')).toBeInTheDocument()
  })
})
