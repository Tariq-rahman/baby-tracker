// Dexie record <-> Postgres row mapping — the ONLY place local and server shapes
// meet (ADR-0002). Kept pure (no Dexie, no network) so it is exhaustively
// unit-testable; the engine resolves the async context (household, baby uid,
// medication id map) and hands it in.
//
// Key translations:
//   - local `uid` (string)      <-> server `id` (uuid primary key)
//   - local `updatedAt`/`deletedAt` epoch-ms UTC <-> server ISO `timestamptz`
//   - event type-specific fields <-> server `payload` jsonb
//   - DoseEvent.medicationId (local Dexie numeric key, NOT portable) <->
//     `payload.medicationUid` (the medication's global uid) so doses survive
//     across devices. See EventToRowCtx / EventFromRowCtx.

import type {
  Baby,
  Medication,
  MedicationUnit,
  BabyEvent,
  EventType,
  FeedContent,
  NappyType,
  NappySize,
} from '../../db/schema'

// --- Postgres row shapes (snake_case) as accepted by upsert / returned by select ---

export interface BabyRow {
  id: string
  household_id: string
  name: string
  date_of_birth: string
  updated_at: string
  deleted_at: string | null
}

export interface MedicationRow {
  id: string
  household_id: string
  name: string
  default_dose: number
  unit: string
  updated_at: string
  deleted_at: string | null
}

/** Distributive Omit — over the BabyEvent union it drops `id` from *each* member,
 * preserving type-specific fields (a plain `Omit<BabyEvent,'id'>` keeps only the
 * common keys). */
export type WithoutId<T> = T extends unknown ? Omit<T, 'id'> : never

export interface EventRow {
  id: string
  baby_id: string
  household_id: string
  type: string
  occurred_at: string
  payload: Record<string, unknown>
  created_at: string
  updated_at: string
  deleted_at: string | null
}

// --- timestamp helpers (epoch-ms <-> ISO timestamptz) ---

const toIso = (ms: number): string => new Date(ms).toISOString()
const toMs = (iso: string): number => Date.parse(iso)
const isoOrNull = (ms: number | null | undefined): string | null => (ms == null ? null : toIso(ms))
const msOrNull = (iso: string | null | undefined): number | null => (iso == null ? null : toMs(iso))

// --- babies ---

export function babyToRow(b: Baby, householdId: string): BabyRow {
  return {
    id: b.uid as string,
    household_id: householdId,
    name: b.name,
    date_of_birth: b.dateOfBirth,
    updated_at: toIso(b.updatedAt as number),
    deleted_at: isoOrNull(b.deletedAt),
  }
}

/** Server row -> local Baby fields (without the singleton local `id`, which the engine owns). */
export function babyFromRow(r: BabyRow): Omit<Baby, 'id'> {
  return {
    uid: r.id,
    householdId: r.household_id,
    name: r.name,
    dateOfBirth: r.date_of_birth,
    updatedAt: toMs(r.updated_at),
    deletedAt: msOrNull(r.deleted_at),
  }
}

// --- medications ---

export function medicationToRow(m: Medication, householdId: string): MedicationRow {
  return {
    id: m.uid as string,
    household_id: householdId,
    name: m.name,
    default_dose: m.defaultDose,
    unit: m.unit,
    updated_at: toIso(m.updatedAt as number),
    deleted_at: isoOrNull(m.deletedAt),
  }
}

/** Server row -> local Medication fields (without the local auto-increment `id`). */
export function medicationFromRow(r: MedicationRow): Omit<Medication, 'id'> {
  return {
    uid: r.id,
    householdId: r.household_id,
    name: r.name,
    defaultDose: r.default_dose,
    unit: r.unit as MedicationUnit,
    updatedAt: toMs(r.updated_at),
    deletedAt: msOrNull(r.deleted_at),
  }
}

// --- events ---

/** Context the engine supplies to push an event: which household/baby it belongs
 * to, and how to translate a local medication id to its portable uid. */
export interface EventToRowCtx {
  householdId: string
  babyUid: string
  /** local medication `id` -> medication `uid`. */
  medUidByLocalId: Map<number, string>
}

/** Context to reconstruct a local event from a server row: how to translate a
 * medication uid back to the local medication id. */
export interface EventFromRowCtx {
  /** medication `uid` -> local medication `id`. */
  medLocalIdByUid: Map<string, number>
}

function packPayload(e: BabyEvent, ctx: EventToRowCtx): Record<string, unknown> {
  switch (e.type) {
    case 'feed':
      return { volumeMl: e.volumeMl, content: e.content ?? null }
    case 'nappy':
      return { nappyType: e.nappyType, size: e.size ?? null }
    case 'weight':
      return { grams: e.grams }
    case 'dose':
      return {
        medicationUid: ctx.medUidByLocalId.get(e.medicationId) ?? null,
        doseAmount: e.doseAmount,
      }
    case 'sleep':
      return { endedAt: e.endedAt }
  }
}

export function eventToRow(e: BabyEvent, ctx: EventToRowCtx): EventRow {
  return {
    id: e.uid as string,
    baby_id: ctx.babyUid,
    household_id: ctx.householdId,
    type: e.type,
    occurred_at: e.occurredAt,
    payload: packPayload(e, ctx),
    created_at: e.createdAt,
    updated_at: toIso(e.updatedAt as number),
    deleted_at: isoOrNull(e.deletedAt),
  }
}

/**
 * Server row -> local BabyEvent (without the local auto-increment `id`). The
 * discriminated union is rebuilt from `type` + `payload`. A dose whose
 * `medicationUid` has no local medication yet maps to `medicationId: 0` (orphan);
 * a later pull, once the medication has synced, does not repair it, so callers
 * should pull medications before events (the engine does).
 */
export function eventFromRow(r: EventRow, ctx: EventFromRowCtx): WithoutId<BabyEvent> {
  const base = {
    uid: r.id,
    householdId: r.household_id,
    occurredAt: r.occurred_at,
    createdAt: r.created_at,
    updatedAt: toMs(r.updated_at),
    deletedAt: msOrNull(r.deleted_at),
  }
  const p = r.payload as Record<string, unknown>
  switch (r.type as EventType) {
    case 'feed':
      return {
        ...base,
        type: 'feed',
        volumeMl: Number(p.volumeMl),
        ...(p.content != null ? { content: p.content as FeedContent } : {}),
      }
    case 'nappy':
      return {
        ...base,
        type: 'nappy',
        nappyType: p.nappyType as NappyType,
        ...(p.size != null ? { size: p.size as NappySize } : {}),
      }
    case 'weight':
      return { ...base, type: 'weight', grams: Number(p.grams) }
    case 'dose':
      return {
        ...base,
        type: 'dose',
        medicationId:
          p.medicationUid != null ? (ctx.medLocalIdByUid.get(p.medicationUid as string) ?? 0) : 0,
        doseAmount: Number(p.doseAmount),
      }
    case 'sleep':
      return { ...base, type: 'sleep', endedAt: (p.endedAt as string | null) ?? null }
  }
}
