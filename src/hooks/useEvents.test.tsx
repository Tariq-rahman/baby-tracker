import { describe, it, expect, beforeEach } from 'vitest'
import 'fake-indexeddb/auto'
import { renderHook, waitFor } from '@testing-library/react'
import { db } from '../db/schema'
import { addEvent, deleteEvent, addMedication, deleteMedication } from '../db/storage'
import { useEvents, useMedications } from './useEvents'

const feed = {
  type: 'feed' as const,
  volumeMl: 120,
  occurredAt: '2026-06-09T08:00:00.000Z',
  createdAt: '2026-06-09T08:00:00.000Z',
}

describe('useEvents / useMedications', () => {
  beforeEach(async () => {
    await Promise.all([db.events.clear(), db.medications.clear(), db._pending.clear()])
  })

  it('excludes soft-deleted events from the live query', async () => {
    const keep = await addEvent(feed)
    const drop = await addEvent({ ...feed, occurredAt: '2026-06-09T09:00:00.000Z' })

    const { result } = renderHook(() => useEvents())
    await waitFor(() => expect(result.current).toHaveLength(2))

    await deleteEvent(drop)
    await waitFor(() => expect(result.current).toHaveLength(1))
    expect(result.current[0].id).toBe(keep)
  })

  it('excludes soft-deleted medications from the live query', async () => {
    const drop = await addMedication({ name: 'Vit D', defaultDose: 1, unit: 'drops' })

    const { result } = renderHook(() => useMedications())
    await waitFor(() => expect(result.current).toHaveLength(1))

    await deleteMedication(drop)
    await waitFor(() => expect(result.current).toHaveLength(0))
  })
})
