import { describe, it, expect, beforeEach } from 'vitest'
import 'fake-indexeddb/auto'
import Dexie from 'dexie'
import { db, migrateToV3 } from './schema'
import {
  addEvent,
  listEvents,
  updateEvent,
  deleteEvent,
  getBaby,
  saveBaby,
  addMedication,
  listMedications,
  updateMedication,
  deleteMedication,
  getEnabledEventTypes,
  setEnabledEventTypes,
  importAll,
  startSleep,
  stopSleep,
  startBreastFeed,
  stopBreastFeed,
} from './storage'
import { DEFAULT_ENABLED_EVENT_TYPES } from './schema'
import type { BreastFeedEvent, SleepEvent } from './schema'

const feed = {
  type: 'feed' as const,
  volumeMl: 120,
  occurredAt: '2026-06-09T08:00:00.000Z',
  createdAt: '2026-06-09T08:00:00.000Z',
}

describe('storage', () => {
  beforeEach(async () => {
    await Promise.all([
      db.events.clear(),
      db.babies.clear(),
      db.medications.clear(),
      db._pending.clear(),
    ])
  })

  it('adds an event, lists it back, and stamps sync fields', async () => {
    const id = await addEvent(feed)
    const all = await listEvents()
    expect(all).toHaveLength(1)
    expect(all[0].id).toBe(id)
    expect(all[0].uid).toMatch(/^[0-9a-f-]{36}$/)
    expect(all[0].updatedAt).toBeTypeOf('number')
    expect(all[0].deletedAt).toBeNull()
  })

  it('enqueues every write into the outbox by uid', async () => {
    const id = await addEvent(feed)
    const row = await db.events.get(id)
    const pending = await db._pending.toArray()
    expect(pending).toEqual([
      expect.objectContaining({ table: 'events', uid: row!.uid }),
    ])
  })

  it('updates an event and bumps updatedAt + re-enqueues', async () => {
    const id = await addEvent(feed)
    const before = (await db.events.get(id))!.updatedAt!
    await db._pending.clear()

    await updateEvent(id, { volumeMl: 150 })

    const all = await listEvents()
    expect((all[0] as { volumeMl: number }).volumeMl).toBe(150)
    expect(all[0].updatedAt!).toBeGreaterThanOrEqual(before)
    const pending = await db._pending.toArray()
    expect(pending).toHaveLength(1)
    expect(pending[0]).toMatchObject({ table: 'events', uid: all[0].uid })
  })

  it('soft-deletes an event: hidden from listEvents but a tombstone remains + enqueued', async () => {
    const id = await addEvent({
      type: 'nappy',
      nappyType: 'wet',
      occurredAt: feed.occurredAt,
      createdAt: feed.createdAt,
    })
    await db._pending.clear()

    await deleteEvent(id)

    expect(await listEvents()).toHaveLength(0)
    const row = await db.events.get(id)
    expect(row).toBeDefined()
    expect(row!.deletedAt).toBeTypeOf('number')
    const pending = await db._pending.toArray()
    expect(pending).toEqual([
      expect.objectContaining({ table: 'events', uid: row!.uid }),
    ])
  })

  it('startSleep creates an open sleep row (endedAt null); stopSleep sets its end', async () => {
    const start = '2026-06-09T13:00:00.000Z'
    const id = await startSleep(start)

    const open = (await db.events.get(id)) as SleepEvent
    expect(open.type).toBe('sleep')
    expect(open.occurredAt).toBe(start)
    expect(open.endedAt).toBeNull()

    const end = '2026-06-09T14:30:00.000Z'
    await stopSleep(id, end)
    const stopped = (await db.events.get(id)) as SleepEvent
    expect(stopped.endedAt).toBe(end)
    expect((await db._pending.toArray()).length).toBeGreaterThan(0) // start + stop both queued
  })

  it('startBreastFeed creates an open breast feed (endedAt null); stopBreastFeed sets its end', async () => {
    const start = '2026-06-09T13:00:00.000Z'
    const id = await startBreastFeed(start, 'left')

    const open = (await db.events.get(id)) as BreastFeedEvent
    expect(open.type).toBe('feed')
    expect(open.method).toBe('breast')
    expect(open.side).toBe('left')
    expect(open.occurredAt).toBe(start)
    expect(open.endedAt).toBeNull()

    const end = '2026-06-09T13:12:00.000Z'
    await stopBreastFeed(id, end)
    const stopped = (await db.events.get(id)) as BreastFeedEvent
    expect(stopped.endedAt).toBe(end)
  })

  it('saves the singleton baby, stamps a uid, and preserves it across saves', async () => {
    await saveBaby({ name: 'Sam', dateOfBirth: '2026-05-01' })
    const first = await getBaby()
    expect(first?.id).toBe(1)
    expect(first?.uid).toMatch(/^[0-9a-f-]{36}$/)

    await saveBaby({ name: 'Samantha', dateOfBirth: '2026-05-01' })
    const second = await getBaby()
    expect(second?.name).toBe('Samantha')
    expect(second?.uid).toBe(first?.uid) // identity stable across edits
  })

  it('returns the default enabled event types when unset', async () => {
    expect(await getEnabledEventTypes()).toEqual([...DEFAULT_ENABLED_EVENT_TYPES])
    await saveBaby({ name: 'Sam', dateOfBirth: '2026-05-01' })
    expect(await getEnabledEventTypes()).toEqual([...DEFAULT_ENABLED_EVENT_TYPES])
  })

  it('persists a customised enabled set and enqueues the baby for sync', async () => {
    await saveBaby({ name: 'Sam', dateOfBirth: '2026-05-01' })
    await db._pending.clear()
    await setEnabledEventTypes(['feed', 'sleep'])

    expect(await getEnabledEventTypes()).toEqual(['feed', 'sleep'])
    const pending = await db._pending.toArray()
    expect(pending).toEqual([expect.objectContaining({ table: 'babies' })])
  })

  it('preserves the enabled set when the baby name/DOB is edited', async () => {
    await saveBaby({ name: 'Sam', dateOfBirth: '2026-05-01' })
    await setEnabledEventTypes(['nappy'])
    await saveBaby({ name: 'Samantha', dateOfBirth: '2026-05-02' }) // no settings supplied

    const baby = await getBaby()
    expect(baby?.name).toBe('Samantha')
    expect(await getEnabledEventTypes()).toEqual(['nappy'])
  })

  it('does not create a baby just to store settings', async () => {
    await setEnabledEventTypes(['feed']) // no baby exists yet
    expect(await getBaby()).toBeUndefined()
    expect(await getEnabledEventTypes()).toEqual([...DEFAULT_ENABLED_EVENT_TYPES])
  })

  it('soft-deletes a medication and hides it from listMedications', async () => {
    const id = await addMedication({ name: 'Vit D', defaultDose: 1, unit: 'drops' })
    expect(await listMedications()).toHaveLength(1)

    await updateMedication(id, { defaultDose: 2 })
    expect((await listMedications())[0].defaultDose).toBe(2)

    await deleteMedication(id)
    expect(await listMedications()).toHaveLength(0)
    expect((await db.medications.get(id))?.deletedAt).toBeTypeOf('number')
  })

  it('importAll stamps missing sync fields and re-queues everything', async () => {
    // Legacy backup: no uid / updatedAt / deletedAt anywhere.
    await importAll({
      baby: { id: 1, name: 'Sam', dateOfBirth: '2026-05-01' } as never,
      medications: [{ id: 3, name: 'Vit D', defaultDose: 1, unit: 'drops' } as never],
      events: [{ id: 7, ...feed } as never],
    })

    const baby = await getBaby()
    const meds = await listMedications()
    const events = await listEvents()
    expect(baby?.uid).toMatch(/^[0-9a-f-]{36}$/)
    expect(meds[0].uid).toBeDefined()
    expect(events[0].uid).toBeDefined()
    expect(meds[0].id).toBe(3) // numeric ids preserved so dose FKs still resolve

    const pending = await db._pending.toArray()
    expect(pending).toHaveLength(3)
    const uids = pending.map((p) => p.uid).sort()
    expect(uids).toEqual([baby!.uid, meds[0].uid, events[0].uid].sort())
  })

  it('importAll preserves an existing uid from a synced backup', async () => {
    const uid = '11111111-1111-4111-8111-111111111111'
    await importAll({
      baby: undefined,
      medications: [],
      events: [{ id: 7, uid, updatedAt: 42, deletedAt: null, ...feed } as never],
    })
    const events = await listEvents()
    expect(events[0].uid).toBe(uid)
    expect(events[0].updatedAt).toBe(42)
  })
})

describe('migrateToV3', () => {
  it('backfills uid/updatedAt/deletedAt on pre-v3 rows, deriving updatedAt from createdAt', async () => {
    const name = 'migrate-test-db'
    await Dexie.delete(name)

    // Stand up a v1-shaped database with legacy integer-id rows.
    const old = new Dexie(name)
    old.version(1).stores({
      babies: 'id',
      medications: '++id, name',
      events: '++id, type, occurredAt',
    })
    await old.open()
    await old.table('babies').put({ id: 1, name: 'Sam', dateOfBirth: '2026-05-01' })
    await old.table('events').add({
      type: 'feed',
      volumeMl: 120,
      occurredAt: '2026-06-09T08:00:00.000Z',
      createdAt: '2026-06-09T08:00:00.000Z',
    })
    old.close()

    // Reopen with the v3 schema + upgrade.
    const next = new Dexie(name)
    next
      .version(1)
      .stores({ babies: 'id', medications: '++id, name', events: '++id, type, occurredAt' })
    next
      .version(3)
      .stores({
        babies: 'id, &uid, updatedAt',
        medications: '++id, name, &uid, updatedAt',
        events: '++id, type, occurredAt, &uid, updatedAt',
        _pending: '[table+uid], table, queuedAt',
        _sync: 'table',
      })
      .upgrade(migrateToV3)
    await next.open()

    const baby = await next.table('babies').get(1)
    const events = await next.table('events').toArray()
    expect(baby.uid).toMatch(/^[0-9a-f-]{36}$/)
    expect(baby.deletedAt).toBeNull()
    expect(events[0].uid).toMatch(/^[0-9a-f-]{36}$/)
    // updatedAt derived from the ISO createdAt.
    expect(events[0].updatedAt).toBe(Date.parse('2026-06-09T08:00:00.000Z'))
    expect(baby.uid).not.toBe(events[0].uid) // distinct uuids per row

    next.close()
    await Dexie.delete(name)
  })
})
