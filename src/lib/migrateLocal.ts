// First-login data migration (ADR-0002, Task 6). An install that predates
// accounts has local records that were upgraded to v3 (uid/updatedAt stamped by
// `migrateToV3`) but never enqueued into the sync outbox. On first authenticated
// boot we seed the outbox with those rows so `pushOutbox` uploads them into the
// user's household.
//
// Non-destructive: local data is only stamped (household, in pushOutbox) and
// uploaded — never deleted or cleared. The JSON export in Settings therefore
// remains a complete safety net; there is no window in which data can be lost.

import { db } from '../db/schema'
import type { SyncTable, SyncFields } from '../db/schema'
import { getHouseholdId, pushOutbox } from './sync/engine'

const SEED_TABLES: readonly SyncTable[] = ['babies', 'medications', 'events']
const migratedKey = (householdId: string) => `bt.localMigrated.${householdId}`

/** Whether this device has already seeded its local data into the given household. */
export function hasMigratedLocalData(householdId: string): boolean {
  try {
    return localStorage.getItem(migratedKey(householdId)) === '1'
  } catch {
    return false
  }
}

function markMigrated(householdId: string): void {
  try {
    localStorage.setItem(migratedKey(householdId), '1')
  } catch {
    // Private-mode / storage-disabled: worst case the seed re-runs next login,
    // which is idempotent (outbox dedupes by [table+uid]).
  }
}

/**
 * Seed the outbox with any pre-existing local rows, then push. Idempotent and
 * guarded to run once per household per device. Safe to call on every login: it
 * no-ops for a fresh account (no legacy data) and after the first successful run.
 * Best-effort — if the push fails offline, the refs stay queued for the next
 * sync cycle.
 */
export async function migrateLocalData(): Promise<void> {
  const householdId = await getHouseholdId()
  if (!householdId) return // offline / unreachable — retry on next login
  if (hasMigratedLocalData(householdId)) return

  await db.transaction('rw', db.babies, db.medications, db.events, db._pending, async () => {
    const now = Date.now()
    for (const table of SEED_TABLES) {
      const rows = (await db.table(table).toArray()) as (SyncFields & { uid?: string })[]
      const refs = rows
        .filter((r) => r.uid)
        .map((r) => ({ table, uid: r.uid as string, queuedAt: now }))
      if (refs.length) await db._pending.bulkPut(refs)
    }
  })

  await pushOutbox()
  markMigrated(householdId)
}
