import { db } from './schema'
import type { Baby, Medication, BabyEvent } from './schema'

const BABY_ID = 1

// --- Baby ---
export async function getBaby(): Promise<Baby | undefined> {
  return db.babies.get(BABY_ID)
}
export async function saveBaby(input: Omit<Baby, 'id'>): Promise<void> {
  await db.babies.put({ id: BABY_ID, ...input })
}

// --- Medications ---
export async function listMedications(): Promise<Medication[]> {
  return db.medications.toArray()
}
export async function addMedication(input: Omit<Medication, 'id'>): Promise<number> {
  return db.medications.add(input as Medication)
}
export async function updateMedication(id: number, changes: Partial<Medication>): Promise<void> {
  await db.medications.update(id, changes)
}
export async function deleteMedication(id: number): Promise<void> {
  await db.medications.delete(id)
}

// --- Events ---
export async function listEvents(): Promise<BabyEvent[]> {
  return db.events.orderBy('occurredAt').reverse().toArray()
}
export async function addEvent(event: BabyEvent): Promise<number> {
  return db.events.add(event)
}
export async function updateEvent(id: number, changes: Partial<BabyEvent>): Promise<void> {
  await db.events.update(id, changes)
}
export async function deleteEvent(id: number): Promise<void> {
  await db.events.delete(id)
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
  await db.transaction('rw', db.babies, db.medications, db.events, async () => {
    await db.babies.clear()
    await db.medications.clear()
    await db.events.clear()
    if (data.baby) await db.babies.put(data.baby)
    if (data.medications.length) await db.medications.bulkAdd(data.medications)
    if (data.events.length) await db.events.bulkAdd(data.events)
  })
}
