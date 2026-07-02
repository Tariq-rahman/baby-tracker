// Pure sync reconciliation. No network, no Dexie — just the last-write-wins
// decision logic and cursor arithmetic, so it can be exhaustively unit-tested.
//
// Timestamps are epoch milliseconds in UTC (see ADR-0002). A record is a
// tombstone when `deletedAt` is set; tombstones propagate deletes across devices.

export interface SyncRecord {
  id: string
  updatedAt: number
  deletedAt: number | null
}

export function isTombstone(r: Pick<SyncRecord, 'deletedAt'>): boolean {
  return r.deletedAt != null
}

/**
 * Decide which version of a record to keep when reconciling a remote row against
 * the local copy. Last-write-wins on `updatedAt`. On an exact tie the tombstone
 * wins (a delete beats a concurrent edit); if both sides share the same
 * deleted-state, the remote wins so all devices converge on the server's value.
 *
 * The returned object is one of the two inputs by reference — the caller writes
 * it back into local storage (idempotent when local already won).
 */
export function mergeRecord<T extends SyncRecord>(local: T | undefined, remote: T): T {
  if (!local) return remote
  if (remote.updatedAt > local.updatedAt) return remote
  if (remote.updatedAt < local.updatedAt) return local

  // Equal timestamps: prefer the tombstone, then the server copy.
  const localDeleted = isTombstone(local)
  const remoteDeleted = isTombstone(remote)
  if (localDeleted !== remoteDeleted) return localDeleted ? local : remote
  return remote
}

/**
 * The high-water mark for the next pull. Returns the largest `updatedAt` in the
 * batch, never regressing below the current cursor. Empty batch → cursor
 * unchanged.
 *
 * The engine should query the server with `updated_at >= cursor` (not `>`) so a
 * row sharing the boundary timestamp is never skipped; merges are idempotent, so
 * re-fetching the boundary is harmless.
 */
export function nextCursor(records: Pick<SyncRecord, 'updatedAt'>[], cursor: number): number {
  return records.reduce((max, r) => (r.updatedAt > max ? r.updatedAt : max), cursor)
}
