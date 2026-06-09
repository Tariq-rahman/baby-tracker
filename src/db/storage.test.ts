import { describe, it, expect, beforeEach } from 'vitest'
import 'fake-indexeddb/auto'
import { db } from './schema'
import { addEvent, listEvents, updateEvent, deleteEvent, getBaby, saveBaby } from './storage'

describe('storage', () => {
  beforeEach(async () => {
    await db.events.clear()
    await db.babies.clear()
  })

  it('adds an event and lists it back', async () => {
    const id = await addEvent({
      type: 'feed',
      volumeMl: 120,
      occurredAt: '2026-06-09T08:00:00.000Z',
      createdAt: '2026-06-09T08:00:00.000Z',
    })
    const all = await listEvents()
    expect(all).toHaveLength(1)
    expect(all[0].id).toBe(id)
  })

  it('updates an event', async () => {
    const id = await addEvent({
      type: 'feed',
      volumeMl: 120,
      occurredAt: '2026-06-09T08:00:00.000Z',
      createdAt: '2026-06-09T08:00:00.000Z',
    })
    await updateEvent(id, { volumeMl: 150 })
    const all = await listEvents()
    expect((all[0] as { volumeMl: number }).volumeMl).toBe(150)
  })

  it('deletes an event', async () => {
    const id = await addEvent({
      type: 'nappy',
      nappyType: 'wet',
      occurredAt: '2026-06-09T08:00:00.000Z',
      createdAt: '2026-06-09T08:00:00.000Z',
    })
    await deleteEvent(id)
    expect(await listEvents()).toHaveLength(0)
  })

  it('saves and gets the singleton baby', async () => {
    await saveBaby({ name: 'Sam', dateOfBirth: '2026-05-01' })
    const baby = await getBaby()
    expect(baby?.name).toBe('Sam')
    expect(baby?.id).toBe(1)
  })
})
