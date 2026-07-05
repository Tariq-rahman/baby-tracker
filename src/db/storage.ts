import { db, DEFAULT_ENABLED_EVENT_TYPES } from './schema'
import type { Baby, Medication, BabyEvent, BreastSide, EventType, SyncTable, SyncFields } from './schema'

const BABY_ID = 1

/** Fields the caller never supplies — the storage layer owns identity + bookkeeping. */
type SyncKeys = keyof SyncFields
export type BabyInput = Omit<Baby, 'id' | SyncKeys>
export type MedicationInput = Omit<Medication, 'id' | SyncKeys>

/** Queue a record for the sync outbox. Must run inside the caller's rw transaction. */
function enqueue(table: SyncTable, uid: string): Promise<[SyncTable, string]> {
  return db._pending.put({ table, uid, queuedAt: Date.now() })
}

// --- Baby ---
export async function getBaby(): Promise<Baby | undefined> {
  return db.babies.get(BABY_ID)
}
export async function saveBaby(input: BabyInput): Promise<void> {
  await db.transaction('rw', db.babies, db._pending, async () => {
    const existing = await db.babies.get(BABY_ID)
    const uid = existing?.uid ?? crypto.randomUUID()
    await db.babies.put({
      ...input,
      id: BABY_ID,
      uid,
      householdId: existing?.householdId ?? null,
      // `put` replaces the whole row, so carry settings forward unless the caller
      // supplied them — otherwise editing name/DOB would wipe Enabled Event Types.
      settings: input.settings ?? existing?.settings,
      updatedAt: Date.now(),
      deletedAt: null,
    })
    await enqueue('babies', uid)
  })
}

// --- Enabled Event Types (per-household config on the baby row; ADR-0004) ---
export async function getEnabledEventTypes(): Promise<EventType[]> {
  const baby = await db.babies.get(BABY_ID)
  return baby?.settings?.enabledEventTypes ?? [...DEFAULT_ENABLED_EVENT_TYPES]
}
export async function setEnabledEventTypes(enabled: EventType[]): Promise<void> {
  await db.transaction('rw', db.babies, db._pending, async () => {
    const existing = await db.babies.get(BABY_ID)
    if (!existing) return // no baby yet; the default set applies until one exists
    const uid = existing.uid ?? crypto.randomUUID()
    await db.babies.update(BABY_ID, {
      uid,
      settings: { ...existing.settings, enabledEventTypes: enabled },
      updatedAt: Date.now(),
    })
    await enqueue('babies', uid)
  })
}

// --- Medications ---
export async function listMedications(): Promise<Medication[]> {
  return db.medications.filter((m) => m.deletedAt == null).toArray()
}
export async function addMedication(input: MedicationInput): Promise<number> {
  return db.transaction('rw', db.medications, db._pending, async () => {
    const uid = crypto.randomUUID()
    const id = await db.medications.add({
      ...input,
      uid,
      householdId: null,
      updatedAt: Date.now(),
      deletedAt: null,
    } as Medication)
    await enqueue('medications', uid)
    return id
  })
}
export async function updateMedication(id: number, changes: Partial<Medication>): Promise<void> {
  await db.transaction('rw', db.medications, db._pending, async () => {
    const row = await db.medications.get(id)
    if (!row) return
    const uid = row.uid ?? crypto.randomUUID() // backfill if a legacy row slipped through
    await db.medications.update(id, { ...changes, uid, updatedAt: Date.now() })
    await enqueue('medications', uid)
  })
}
export async function deleteMedication(id: number): Promise<void> {
  await db.transaction('rw', db.medications, db._pending, async () => {
    const row = await db.medications.get(id)
    if (!row) return
    const uid = row.uid ?? crypto.randomUUID()
    const now = Date.now()
    await db.medications.update(id, { uid, deletedAt: now, updatedAt: now })
    await enqueue('medications', uid)
  })
}

// --- Events ---
export async function listEvents(): Promise<BabyEvent[]> {
  const rows = await db.events.orderBy('occurredAt').reverse().toArray()
  return rows.filter((e) => e.deletedAt == null)
}
export async function addEvent(event: BabyEvent): Promise<number> {
  return db.transaction('rw', db.events, db._pending, async () => {
    const uid = crypto.randomUUID()
    const id = await db.events.add({
      ...event,
      id: undefined, // let Dexie assign the local auto-increment key
      uid,
      householdId: event.householdId ?? null,
      updatedAt: Date.now(),
      deletedAt: null,
    })
    await enqueue('events', uid)
    return id
  })
}
export async function updateEvent(id: number, changes: Partial<BabyEvent>): Promise<void> {
  await db.transaction('rw', db.events, db._pending, async () => {
    const row = await db.events.get(id)
    if (!row) return
    const uid = row.uid ?? crypto.randomUUID() // backfill if a legacy row slipped through
    await db.events.update(id, { ...changes, uid, updatedAt: Date.now() })
    await enqueue('events', uid)
  })
}
export async function deleteEvent(id: number): Promise<void> {
  await db.transaction('rw', db.events, db._pending, async () => {
    const row = await db.events.get(id)
    if (!row) return
    const uid = row.uid ?? crypto.randomUUID()
    const now = Date.now()
    await db.events.update(id, { uid, deletedAt: now, updatedAt: now })
    await enqueue('events', uid)
  })
}

// --- Sleep (a duration event: start now, stop later) ---
/** Begin a running sleep — a synced row with `endedAt: null` (visible to all caregivers). */
export async function startSleep(occurredAt: string): Promise<number> {
  return addEvent({
    type: 'sleep',
    occurredAt,
    endedAt: null,
    createdAt: new Date().toISOString(),
  })
}
/** Stop a running sleep by setting its end. Editing a running sleep's end IS the stop. */
export async function stopSleep(id: number, endedAt: string): Promise<void> {
  await updateEvent(id, { endedAt })
}

// --- Breastfeeding (a Feed that is a duration event; mirrors Sleep — ADR-0007) ---
/** Begin a running breast feed — a synced Feed row with `endedAt: null` (visible to all caregivers). */
export async function startBreastFeed(occurredAt: string, side: BreastSide): Promise<number> {
  return addEvent({
    type: 'feed',
    method: 'breast',
    side,
    occurredAt,
    endedAt: null,
    createdAt: new Date().toISOString(),
  })
}
/** Stop a running breast feed by setting its end. Editing a running feed's end IS the stop. */
export async function stopBreastFeed(id: number, endedAt: string): Promise<void> {
  await updateEvent(id, { endedAt })
}

// --- Backup ---
export async function exportAll() {
  return {
    baby: await getBaby(),
    medications: await listMedications(),
    events: await listEvents(),
  }
}
export async function importAll(data: {
  baby: Baby | undefined
  medications: Medication[]
  events: BabyEvent[]
}): Promise<void> {
  await db.transaction('rw', db.babies, db.medications, db.events, db._pending, async () => {
    await db.babies.clear()
    await db.medications.clear()
    await db.events.clear()
    await db._pending.clear() // restore replaces local state; old queue is moot

    const now = Date.now()
    // Preserve an incoming uid (restoring a synced backup keeps identity stable);
    // stamp a fresh one for legacy/pre-v3 backups so the invariant holds.
    const prep = <T extends SyncFields>(r: T): T => ({
      ...r,
      uid: r.uid ?? crypto.randomUUID(),
      householdId: r.householdId ?? null,
      updatedAt: r.updatedAt ?? now,
      deletedAt: r.deletedAt ?? null,
    })
    const pendingFor = (table: SyncTable, rows: SyncFields[]) =>
      rows.map((r) => ({ table, uid: r.uid as string, queuedAt: now }))

    const baby = data.baby ? prep(data.baby) : undefined
    const meds = data.medications.map(prep)
    const events = data.events.map(prep)
    if (baby) await db.babies.put(baby)
    if (meds.length) await db.medications.bulkAdd(meds)
    if (events.length) await db.events.bulkAdd(events)

    const refs = [
      ...(baby ? pendingFor('babies', [baby]) : []),
      ...pendingFor('medications', meds),
      ...pendingFor('events', events),
    ]
    if (refs.length) await db._pending.bulkPut(refs)
  })
}
