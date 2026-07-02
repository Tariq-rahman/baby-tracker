import { useEffect } from 'react'
import { useSession } from './useSession'
import { pushOutbox, pull, subscribeRealtime, getHouseholdId } from '../lib/sync/engine'
import { migrateLocalData } from '../lib/migrateLocal'

const SYNC_INTERVAL_MS = 30_000
const REALTIME_DEBOUNCE_MS = 400

/**
 * Drives background sync while the user is signed in. Runs a push+pull cycle on:
 * login (after seeding any pre-account local data), foreground, realtime row
 * changes (debounced), and a periodic interval while the tab is visible. Every
 * cycle is fire-and-forget — failures are logged, never surfaced to the UI, and
 * local writes are never blocked. Mount it inside the authenticated subtree.
 */
export function useSync(): void {
  const { session } = useSession()
  const userId = session?.user.id

  useEffect(() => {
    if (!userId) return
    let cancelled = false

    const syncOnce = async () => {
      if (cancelled) return
      try {
        await pushOutbox()
        await pull()
      } catch (err) {
        console.warn('sync cycle failed:', err)
      }
    }

    // First login: seed pre-account local data into the outbox, then a full cycle.
    void (async () => {
      await migrateLocalData()
      await syncOnce()
    })()

    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') void syncOnce()
    }, SYNC_INTERVAL_MS)

    const onVisible = () => {
      if (document.visibilityState === 'visible') void syncOnce()
    }
    document.addEventListener('visibilitychange', onVisible)

    // Realtime: collapse a burst of row changes into a single pull.
    let unsubscribe = () => {}
    let debounce: ReturnType<typeof setTimeout> | undefined
    const onRealtime = () => {
      if (debounce) clearTimeout(debounce)
      debounce = setTimeout(() => void syncOnce(), REALTIME_DEBOUNCE_MS)
    }
    void getHouseholdId().then((householdId) => {
      if (householdId && !cancelled) unsubscribe = subscribeRealtime(householdId, onRealtime)
    })

    return () => {
      cancelled = true
      clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisible)
      if (debounce) clearTimeout(debounce)
      unsubscribe()
    }
  }, [userId])
}
