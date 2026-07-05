import { describe, it, expect } from 'vitest'
import {
  listTrendDays,
  daysSinceBirth,
  listWindowDays,
  listDailyTrend,
  seriesMean,
  TREND_WINDOWS,
} from './trends'
import type { BabyEvent, BreastFeedEvent, SleepEvent } from '../db/schema'

function breastFeed(over: Partial<BreastFeedEvent>): BreastFeedEvent {
  return {
    type: 'feed',
    method: 'breast',
    side: 'left',
    occurredAt: '2026-06-09T14:00:00.000Z',
    endedAt: '2026-06-09T14:20:00.000Z',
    createdAt: '2026-06-09T14:00:00.000Z',
    ...over,
  }
}

function sleep(over: Partial<SleepEvent>): SleepEvent {
  return {
    type: 'sleep',
    occurredAt: '2026-06-09T20:00:00.000Z',
    endedAt: '2026-06-09T22:00:00.000Z',
    createdAt: '2026-06-09T20:00:00.000Z',
    ...over,
  }
}

describe('listTrendDays', () => {
  it('returns the trailing N days ending today, oldest first', () => {
    const now = new Date('2026-07-05T09:00:00.000Z')
    expect(listTrendDays(now, 3)).toEqual(['2026-07-03', '2026-07-04', '2026-07-05'])
  })

  it('crosses a month boundary correctly', () => {
    const now = new Date('2026-07-02T09:00:00.000Z')
    expect(listTrendDays(now, 4)).toEqual(['2026-06-29', '2026-06-30', '2026-07-01', '2026-07-02'])
  })

  it('a single-day window is just today', () => {
    const now = new Date('2026-07-05T09:00:00.000Z')
    expect(listTrendDays(now, 1)).toEqual(['2026-07-05'])
  })
})

describe('daysSinceBirth', () => {
  it('counts both endpoints — born today gives 1', () => {
    const now = new Date('2026-07-05T09:00:00.000Z')
    expect(daysSinceBirth('2026-07-05', now)).toBe(1)
  })

  it('spans birth to today inclusive', () => {
    const now = new Date('2026-07-05T09:00:00.000Z')
    expect(daysSinceBirth('2026-07-01', now)).toBe(5)
  })

  it('never returns less than 1 for a future birth date', () => {
    const now = new Date('2026-07-05T09:00:00.000Z')
    expect(daysSinceBirth('2026-07-10', now)).toBe(1)
  })
})

describe('listWindowDays', () => {
  const now = new Date('2026-07-05T09:00:00.000Z')

  it('a fixed window ignores birth date', () => {
    const days = listWindowDays({ label: '7d', windowDays: 7 }, '2020-01-01', now)
    expect(days).toHaveLength(7)
    expect(days[days.length - 1]).toBe('2026-07-05')
  })

  it('a null window spans since birth', () => {
    const days = listWindowDays({ label: 'All', windowDays: null }, '2026-07-01', now)
    expect(days).toEqual(['2026-07-01', '2026-07-02', '2026-07-03', '2026-07-04', '2026-07-05'])
  })

  it('exposes 7d / 30d / All as the standard windows', () => {
    expect(TREND_WINDOWS.map((w) => w.windowDays)).toEqual([7, 30, null])
  })
})

describe('listDailyTrend', () => {
  const now = new Date('2026-06-10T12:00:00.000Z')
  const events: BabyEvent[] = [
    { id: 1, type: 'feed', volumeMl: 120, occurredAt: '2026-06-09T08:00:00.000Z', createdAt: '2026-06-09T08:00:00.000Z' },
    { id: 2, type: 'feed', volumeMl: 100, occurredAt: '2026-06-09T11:00:00.000Z', createdAt: '2026-06-09T11:00:00.000Z' },
    breastFeed({ id: 3, occurredAt: '2026-06-09T14:00:00.000Z', endedAt: '2026-06-09T14:20:00.000Z' }),
    { id: 4, type: 'nappy', nappyType: 'wet', occurredAt: '2026-06-09T09:30:00.000Z', createdAt: '2026-06-09T09:30:00.000Z' },
    { id: 5, type: 'nappy', nappyType: 'both', size: 'medium', occurredAt: '2026-06-09T12:00:00.000Z', createdAt: '2026-06-09T12:00:00.000Z' },
    sleep({ id: 6, occurredAt: '2026-06-09T20:00:00.000Z', endedAt: '2026-06-09T22:00:00.000Z' }),
    { id: 7, type: 'dose', medicationId: 1, doseAmount: 2, occurredAt: '2026-06-08T10:00:00.000Z', createdAt: '2026-06-08T10:00:00.000Z' },
  ]

  it('aggregates every metric per day, oldest first', () => {
    const series = listDailyTrend(events, ['2026-06-08', '2026-06-09'], now)

    expect(series.map((p) => p.day)).toEqual(['2026-06-08', '2026-06-09'])

    const [d8, d9] = series
    expect(d8.doseCount).toBe(1)
    expect(d8.feedCount).toBe(0)

    expect(d9.feedCount).toBe(3) // 2 bottles + 1 breast
    expect(d9.feedVolumeMl).toBe(220) // breast feed adds no volume (ADR-0007)
    expect(d9.nursingMinutes).toBe(20)
    expect(d9.sleepMinutes).toBe(120)
    expect(d9.nappyWet).toBe(1)
    expect(d9.nappyDirty).toBe(1) // 'both' counts as dirty
    expect(d9.doseCount).toBe(0)
  })

  it('emits a zero point for a day with no events', () => {
    const series = listDailyTrend(events, ['2026-06-07'], now)
    expect(series).toEqual([
      {
        day: '2026-06-07',
        feedCount: 0,
        feedVolumeMl: 0,
        nursingMinutes: 0,
        sleepMinutes: 0,
        nappyWet: 0,
        nappyDirty: 0,
        doseCount: 0,
      },
    ])
  })
})

describe('seriesMean', () => {
  it('averages a series', () => {
    expect(seriesMean([2, 4, 6])).toBe(4)
  })

  it('is 0 for an empty series', () => {
    expect(seriesMean([])).toBe(0)
  })
})
