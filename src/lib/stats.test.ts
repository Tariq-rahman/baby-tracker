import { describe, it, expect } from 'vitest'
import { getLastEventOfType, listEventsForDay, getDailyTotals } from './stats'
import type { BabyEvent } from '../db/schema'

const events: BabyEvent[] = [
  { id: 1, type: 'feed', volumeMl: 120, occurredAt: '2026-06-09T08:00:00.000Z', createdAt: '2026-06-09T08:00:00.000Z' },
  { id: 2, type: 'feed', volumeMl: 100, occurredAt: '2026-06-09T11:00:00.000Z', createdAt: '2026-06-09T11:00:00.000Z' },
  { id: 3, type: 'nappy', nappyType: 'wet', occurredAt: '2026-06-09T09:30:00.000Z', createdAt: '2026-06-09T09:30:00.000Z' },
  { id: 4, type: 'nappy', nappyType: 'both', size: 'medium', occurredAt: '2026-06-09T12:00:00.000Z', createdAt: '2026-06-09T12:00:00.000Z' },
  { id: 5, type: 'feed', volumeMl: 90, occurredAt: '2026-06-08T22:00:00.000Z', createdAt: '2026-06-08T22:00:00.000Z' },
]

describe('getLastEventOfType', () => {
  it('returns the most recent event of the given type', () => {
    const last = getLastEventOfType(events, 'feed')
    expect(last?.id).toBe(2)
  })
  it('returns undefined when no event of that type exists', () => {
    expect(getLastEventOfType(events, 'weight')).toBeUndefined()
  })
})

describe('listEventsForDay', () => {
  it('returns only events on the given local day, newest first', () => {
    const day = listEventsForDay(events, '2026-06-09')
    expect(day.map((e) => e.id)).toEqual([4, 2, 3, 1])
  })
})

describe('getDailyTotals', () => {
  it('aggregates feeds, nappies and doses for the day', () => {
    const totals = getDailyTotals(events, '2026-06-09')
    expect(totals.feedCount).toBe(2)
    expect(totals.feedVolumeMl).toBe(220)
    expect(totals.nappyWet).toBe(1)
    expect(totals.nappyDirty).toBe(1) // 'both' counts as a dirty
    expect(totals.doseCount).toBe(0)
  })
})
