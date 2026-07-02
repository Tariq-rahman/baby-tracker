import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

interface SessionState {
  session: Session | null
  /** True until the initial session lookup resolves — render a splash meanwhile. */
  loading: boolean
}

/**
 * Tracks the current Supabase auth session. Reads the persisted session once on
 * mount, then stays live via `onAuthStateChange` (magic-link callback, sign-out,
 * token refresh).
 */
export function useSession(): SessionState {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next)
      setLoading(false)
    })

    return () => sub.subscription.unsubscribe()
  }, [])

  return { session, loading }
}
