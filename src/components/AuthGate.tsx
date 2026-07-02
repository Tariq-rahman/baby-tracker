import type { ReactNode } from 'react'
import { useSession } from '../hooks/useSession'
import LoginPage from '../pages/LoginPage'

/**
 * Gates the app behind an authenticated session: a splash while the session
 * resolves, the login page when signed out, otherwise the app.
 */
export default function AuthGate({ children }: { children: ReactNode }) {
  const { session, loading } = useSession()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream">
        <p className="animate-pulse text-inkSoft">Loading…</p>
      </div>
    )
  }

  if (!session) return <LoginPage />

  return <>{children}</>
}
