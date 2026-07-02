import Dexie, { type Table, type Transaction } from 'dexie'

export type EventType = 'feed' | 'nappy' | 'weight' | 'dose'
export type FeedContent = 'formula' | 'breastmilk'
export type NappyType = 'wet' | 'dirty' | 'both'
export type NappySize = 'small' | 'medium' | 'large'
export type MedicationUnit = 'ml' | 'mg' | 'IU' | 'drops'

/** Tables whose rows replicate to the server. */
export type SyncTable = 'babies' | 'medications' | 'events'

/**
 * Sync bookkeeping carried by every replicated record. All fields are optional
 * at the type level (like `id?`) because the UI constructs records without them;
 * `storage.ts` stamps them on write, so every *persisted* row has a `uid` and
 * `updatedAt`. The sync engine maps these to `reconcile.ts`'s `SyncRecord` at the
 * boundary — the local numeric `id` is the Dexie primary key, `uid` is the global
 * (server) identity. Timestamps are epoch-ms UTC to match the server's timestamptz.
 */
export interface SyncFields {
  /** Global UUID identity — the server primary key. Stable across devices. */
  uid?: string
  /** Set once the record belongs to a household (stamped at first login). */
  householdId?: string | null
  /** Last local mutation, epoch-ms UTC. Drives last-write-wins. */
  updatedAt?: number
  /** Soft-delete tombstone, epoch-ms UTC; null/absent means live. */
  deletedAt?: number | null
}

export interface Baby extends SyncFields {
  id: number // always 1 (singleton)
  name: string
  dateOfBirth: string // ISO date 'YYYY-MM-DD'
}

export interface Medication extends SyncFields {
  id?: number
  name: string
  defaultDose: number
  unit: MedicationUnit
}

// Discriminated union on `type`.
interface BaseEvent extends SyncFields {
  id?: number
  occurredAt: string // ISO datetime
  createdAt: string // ISO datetime
}
export interface FeedEvent extends BaseEvent {
  type: 'feed'
  volumeMl: number
  content?: FeedContent
}
export interface NappyEvent extends BaseEvent {
  type: 'nappy'
  nappyType: NappyType
  size?: NappySize // present only when nappyType is 'dirty' or 'both'
}
export interface WeightEvent extends BaseEvent {
  type: 'weight'
  grams: number
}
export interface DoseEvent extends BaseEvent {
  type: 'dose'
  medicationId: number
  doseAmount: number
}
export type BabyEvent = FeedEvent | NappyEvent | WeightEvent | DoseEvent

/** Outbox: a record awaiting push. Compound key `[table+uid]` dedupes re-queues. */
export interface PendingRef {
  table: SyncTable
  uid: string
  queuedAt: number
}

/** Per-table pull high-water mark (last `updatedAt` seen from the server). */
export interface SyncMeta {
  table: SyncTable
  cursor: number
}

/**
 * Backfill sync bookkeeping onto pre-v3 (integer-id) rows. Every live row gets a
 * fresh `uid`, an `updatedAt` derived from `createdAt` when present (else now),
 * and a null tombstone. Idempotent: rows that already carry a `uid` are left
 * untouched, so a partially-migrated store re-runs safely.
 */
export async function migrateToV3(tx: Transaction): Promise<void> {
  const stamp = (row: SyncFields & { createdAt?: string }) => {
    if (row.uid) return // already migrated
    row.uid = crypto.randomUUID()
    row.updatedAt = row.createdAt ? Date.parse(row.createdAt) : Date.now()
    row.deletedAt = null
    row.householdId = null
  }
  for (const name of ['babies', 'medications', 'events'] as const) {
    await tx.table(name).toCollection().modify(stamp)
  }
}

export class BabyTrackerDB extends Dexie {
  babies!: Table<Baby, number>
  medications!: Table<Medication, number>
  events!: Table<BabyEvent, number>
  _pending!: Table<PendingRef, [SyncTable, string]>
  _sync!: Table<SyncMeta, SyncTable>

  constructor() {
    super('baby-tracker')
    this.version(1).stores({
      babies: 'id',
      medications: '++id, name',
      events: '++id, type, occurredAt',
    })
    // v3: add global `uid` (unique) + `updatedAt` indexes for sync, plus the
    // outbox and pull-cursor tables. Primary keys are unchanged (numeric), so
    // Dexie migrates data in place — see ADR-0002 / Design D.
    this.version(3)
      .stores({
        babies: 'id, &uid, updatedAt',
        medications: '++id, name, &uid, updatedAt',
        events: '++id, type, occurredAt, &uid, updatedAt',
        _pending: '[table+uid], table, queuedAt',
        _sync: 'table',
      })
      .upgrade(migrateToV3)
  }
}

export const db = new BabyTrackerDB()
