import { db } from '../db/schema'
import { addEvent, addMedication, saveBaby } from '../db/storage'
import { buildFixture } from './fixture'

/**
 * Seed the local Dexie store with the demo fixture for the dev entry point
 * (DX.1). Idempotent: it clears the store first, so every `npm run dev` load
 * against `index.dev.html` starts from a clean, freshly-anchored dataset.
 *
 * Writes go through `storage.ts` (not raw Dexie) so the data passes through the
 * real abstraction — soft-delete fields, sync bookkeeping, and the outbox all
 * get stamped exactly as they would in production.
 *
 * DEV-ONLY: reached solely via `main.dev.tsx`, which the prod build never imports.
 */
export async function seedDevData(): Promise<void> {
  await db.transaction('rw', [db.babies, db.medications, db.events, db._pending, db._sync], async () => {
    await db.babies.clear()
    await db.medications.clear()
    await db.events.clear()
    await db._pending.clear()
    await db._sync.clear()
  })

  const now = new Date()
  const fixture = buildFixture(now)

  await saveBaby(fixture.baby)

  const medicationIds: number[] = []
  for (const med of fixture.medications) {
    medicationIds.push(await addMedication(med))
  }

  for (const event of fixture.buildEvents(now, medicationIds)) {
    await addEvent(event)
  }
}
