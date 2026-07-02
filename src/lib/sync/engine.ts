// Sync orchestrator — the network side of sync, sitting behind storage.ts. Local
// writes are never blocked: storage.ts commits to Dexie and enqueues into
// `_pending`; this engine drains that outbox to Supabase (push) and folds server
// changes back into Dexie (pull). All operations are best-effort — failures are
// logged and left for the next cycle, never thrown into the UI.
//
// Conflict model (ADR-0002): push is a plain `upsert`, so the server takes
// whatever a device sends; pull resolves local vs remote with mergeRecord
// (last-write-wins on `updatedAt`). Because the server's `set_updated_at` trigger
// stamps `updated_at = now()` on UPDATE, effective semantics are
// last-writer-to-sync-wins, which is acceptable for the 2-caregiver MVP.

import { supabase } from '../supabase'
import { db } from '../../db/schema'
import type { SyncTable, Baby, Medication, BabyEvent } from '../../db/schema'
import { mergeRecord, nextCursor, type SyncRecord } from './reconcile'
import {
  babyToRow,
  medicationToRow,
  eventToRow,
  babyFromRow,
  medicationFromRow,
  eventFromRow,
  type EventToRowCtx,
  type EventFromRowCtx,
  type BabyRow,
  type MedicationRow,
  type EventRow,
} from './mapping'

const BABY_ID = 1
/** FK-safe order: babies before events (events.baby_id references babies.id). */
const TABLES: readonly SyncTable[] = ['babies', 'medications', 'events']

/**
 * The current user's household id. The signup trigger (`handle_new_user`)
 * guarantees every authenticated user owns exactly one household for the MVP, so
 * we take the first membership. Returns null if not signed in / not reachable.
 */
export async function getHouseholdId(): Promise<string | null> {
  const { data, error } = await supabase
    .from('household_members')
    .select('household_id')
    .limit(1)
    .maybeSingle()
  if (error) {
    console.warn('sync: could not resolve household id:', error.message)
    return null
  }
  return data?.household_id ?? null
}

/** local medication id <-> uid maps, for translating dose-event references. */
async function loadMedicationMaps(): Promise<{
  uidByLocalId: Map<number, string>
  localIdByUid: Map<string, number>
}> {
  const meds = await db.medications.toArray()
  const uidByLocalId = new Map<number, string>()
  const localIdByUid = new Map<string, number>()
  for (const m of meds) {
    if (m.id != null && m.uid) {
      uidByLocalId.set(m.id, m.uid)
      localIdByUid.set(m.uid, m.id)
    }
  }
  return { uidByLocalId, localIdByUid }
}

/**
 * Drain the `_pending` outbox to Supabase via upsert, oldest first. Rows are
 * pushed per table in FK-safe order; a ref is cleared only after its row's table
 * upsert succeeds. `storage.ts` writes are auth-agnostic and stamp
 * `householdId: null`, so this is where a row acquires its household: any
 * null-household row is stamped (and persisted) with the resolved id before push.
 * Refs whose local row has vanished are dropped. Never throws.
 */
export async function pushOutbox(): Promise<void> {
  const pending = await db._pending.orderBy('queuedAt').toArray()
  if (pending.length === 0) return

  const householdId = await getHouseholdId()
  if (!householdId) {
    console.warn('sync: no household resolved; skipping push')
    return
  }

  const { uidByLocalId } = await loadMedicationMaps()
  const babyUid = (await db.babies.get(BABY_ID))?.uid ?? null

  const staleRefs: [SyncTable, string][] = []

  for (const table of TABLES) {
    const refs = pending.filter((p) => p.table === table)
    if (refs.length === 0) continue

    const rows: object[] = []
    const pushedRefs: [SyncTable, string][] = []

    for (const ref of refs) {
      const local = await db.table(table).where('uid').equals(ref.uid).first()
      if (!local) {
        staleRefs.push([ref.table, ref.uid]) // nothing to push; drop the ref
        continue
      }
      // Acquire the household on first push and persist it locally.
      if (!local.householdId) {
        local.householdId = householdId
        await db.table(table).update(local.id, { householdId })
      }

      if (table === 'babies') {
        rows.push(babyToRow(local as Baby, householdId))
      } else if (table === 'medications') {
        rows.push(medicationToRow(local as Medication, householdId))
      } else {
        if (!babyUid) continue // can't attach an event to a baby that has no uid yet
        const ctx: EventToRowCtx = { householdId, babyUid, medUidByLocalId: uidByLocalId }
        rows.push(eventToRow(local as BabyEvent, ctx))
      }
      pushedRefs.push([ref.table, ref.uid])
    }

    if (rows.length === 0) continue

    const { error } = await supabase.from(table).upsert(rows)
    if (error) {
      console.warn(`sync: push ${table} failed:`, error.message)
      continue // leave these refs queued; retry next cycle
    }
    await db._pending.bulkDelete(pushedRefs)
  }

  if (staleRefs.length) await db._pending.bulkDelete(staleRefs)
}

// --- pull ---

/** Does the remote record win over the local one under last-write-wins? */
function remoteWins(
  local: { updatedAt?: number; deletedAt?: number | null } | undefined,
  remote: SyncRecord,
): boolean {
  const localRec: SyncRecord | undefined = local
    ? { id: remote.id, updatedAt: local.updatedAt ?? 0, deletedAt: local.deletedAt ?? null }
    : undefined
  return mergeRecord(localRec, remote) === remote
}

/** Advance a table's pull cursor to the newest `updated_at` in the batch. */
async function advanceCursor(
  table: SyncTable,
  rows: { updated_at: string }[],
  cursor: number,
): Promise<void> {
  const next = nextCursor(
    rows.map((r) => ({ updatedAt: Date.parse(r.updated_at) })),
    cursor,
  )
  if (next !== cursor) await db._sync.put({ table, cursor: next })
}

/** Fetch a table's rows changed at/after the cursor (>= so a boundary-timestamp
 * row is never skipped — merges are idempotent). Null on network/RLS error. */
async function fetchSince<T>(table: SyncTable, cursor: number): Promise<T[] | null> {
  const { data, error } = await supabase
    .from(table)
    .select('*')
    .gte('updated_at', new Date(cursor).toISOString())
    .order('updated_at', { ascending: true })
  if (error) {
    console.warn(`sync: pull ${table} failed:`, error.message)
    return null
  }
  return (data ?? []) as T[]
}

async function pullBabies(): Promise<void> {
  const cursor = (await db._sync.get('babies'))?.cursor ?? 0
  const rows = await fetchSince<BabyRow>('babies', cursor)
  if (!rows) return
  for (const row of rows) {
    const fields = babyFromRow(row)
    const local = await db.babies.get(BABY_ID)
    // Single-baby MVP: the local baby is the singleton id=1. If a different baby
    // identity already occupies it, keep local (independent-baby conflict is out
    // of scope) — otherwise reconcile by last-write-wins.
    if (local?.uid && local.uid !== fields.uid) continue
    const remote: SyncRecord = {
      id: fields.uid as string,
      updatedAt: fields.updatedAt as number,
      deletedAt: fields.deletedAt ?? null,
    }
    if (remoteWins(local, remote)) await db.babies.put({ id: BABY_ID, ...fields })
  }
  await advanceCursor('babies', rows, cursor)
}

async function pullMedications(): Promise<void> {
  const cursor = (await db._sync.get('medications'))?.cursor ?? 0
  const rows = await fetchSince<MedicationRow>('medications', cursor)
  if (!rows) return
  for (const row of rows) {
    const fields = medicationFromRow(row)
    const local = await db.medications.where('uid').equals(fields.uid as string).first()
    const remote: SyncRecord = {
      id: fields.uid as string,
      updatedAt: fields.updatedAt as number,
      deletedAt: fields.deletedAt ?? null,
    }
    if (!remoteWins(local, remote)) continue
    if (local?.id != null) await db.medications.put({ ...fields, id: local.id } as Medication)
    else await db.medications.add(fields as Medication)
  }
  await advanceCursor('medications', rows, cursor)
}

async function pullEvents(): Promise<void> {
  const cursor = (await db._sync.get('events'))?.cursor ?? 0
  const rows = await fetchSince<EventRow>('events', cursor)
  if (!rows) return
  // Resolve dose medication uids against the just-pulled local medications.
  const { localIdByUid } = await loadMedicationMaps()
  const ctx: EventFromRowCtx = { medLocalIdByUid: localIdByUid }
  for (const row of rows) {
    const fields = eventFromRow(row, ctx)
    const local = await db.events.where('uid').equals(fields.uid as string).first()
    const remote: SyncRecord = {
      id: fields.uid as string,
      updatedAt: fields.updatedAt as number,
      deletedAt: fields.deletedAt ?? null,
    }
    if (!remoteWins(local, remote)) continue
    if (local?.id != null) await db.events.put({ ...fields, id: local.id } as BabyEvent)
    else await db.events.add(fields as BabyEvent)
  }
  await advanceCursor('events', rows, cursor)
}

/**
 * Pull server changes into Dexie, per table, advancing each cursor. Order matters:
 * medications before events so a dose event's `medicationUid` resolves to a local
 * medication id. Writes go straight to Dexie (never through storage.ts) so pulled
 * rows are not re-enqueued into the outbox. Never throws.
 */
export async function pull(): Promise<void> {
  await pullBabies()
  await pullMedications()
  await pullEvents()
}

// --- realtime ---

/**
 * Subscribe to row changes for this household across the synced tables and invoke
 * `onChange` on any change (the caller debounces into a pull). Returns an
 * unsubscribe function. Requires the tables to be in the `supabase_realtime`
 * publication (migration 0004); without it the periodic poll still converges.
 */
export function subscribeRealtime(householdId: string, onChange: () => void): () => void {
  const channel = supabase.channel(`sync:${householdId}`)
  for (const table of TABLES) {
    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table, filter: `household_id=eq.${householdId}` },
      onChange,
    )
  }
  channel.subscribe()
  return () => {
    void supabase.removeChannel(channel)
  }
}
