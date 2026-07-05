import { describe, it, expect } from 'vitest'
import type { BabyEvent } from '../../db/schema'
import { runStrategies } from './index'
import {
  bottleVolumeStrategy,
  breastNursingStrategy,
  nextFeedStrategy,
  listFeedStrategies,
  DEFAULT_FEED_CONFIG,
} from './strategies'

const HOUR = 60 * 60 * 1000
const MIN = 60 * 1000
// Tests run under TZ=UTC (see npm test), so local day == UTC day.
// NOW is midday 2026-07-08 → yesterday is 07-07, the complete 7-day window is
// [07-01 00:00, 07-08 00:00), and full history requires a feed on/before 07-01.
const NOW = new Date('2026-07-08T12:00:00.000Z')

const ago = (hours: number): string => new Date(NOW.getTime() - hours * HOUR).toISOString()

/** A bottle feed (absent method ⇒ bottle) at an explicit ISO time. */
const bottle = (occurredAt: string, volumeMl = 100): BabyEvent => ({
  type: 'feed',
  volumeMl,
  occurredAt,
  createdAt: occurredAt,
})

/** A completed nursing session of `durationMin`, starting at `start` (ISO). */
const breast = (start: string, durationMin: number): BabyEvent => ({
  type: 'feed',
  method: 'breast',
  side: 'left',
  occurredAt: start,
  endedAt: new Date(Date.parse(start) + durationMin * MIN).toISOString(),
  createdAt: start,
})

// A full week of bottle history: first feed on the window start (07-01), five
// feeds in the complete window, two of them yesterday (07-07) totalling 250 ml.
const fullWeekBottles: BabyEvent[] = [
  bottle('2026-07-01T00:00:00.000Z', 100),
  bottle('2026-07-02T09:00:00.000Z', 100),
  bottle('2026-07-05T09:00:00.000Z', 100),
  bottle('2026-07-07T08:00:00.000Z', 120),
  bottle('2026-07-07T14:00:00.000Z', 130),
]

describe('bottleVolumeStrategy', () => {
  const strategy = bottleVolumeStrategy()

  it('stays silent when the family never bottle-feeds', () => {
    const events = [breast('2026-07-01T00:00:00.000Z', 20), breast('2026-07-05T09:00:00.000Z', 20)]
    expect(strategy.compute({ events, now: NOW })).toEqual([])
  })

  it('withholds a comparison until there is a full week of history', () => {
    // Five feeds over three recent days, but the first is only ~4 days old.
    const events = [
      bottle('2026-07-05T09:00:00.000Z'),
      bottle('2026-07-05T15:00:00.000Z'),
      bottle('2026-07-06T09:00:00.000Z'),
      bottle('2026-07-07T09:00:00.000Z'),
      bottle('2026-07-07T15:00:00.000Z'),
    ]
    const insights = strategy.compute({ events, now: NOW })
    expect(insights).toHaveLength(1)
    expect(insights[0].kind).toBe('insufficient-data')
  })

  it('withholds when a full week exists but too few events', () => {
    const events = [bottle('2026-07-01T00:00:00.000Z'), bottle('2026-07-07T09:00:00.000Z')]
    expect(strategy.compute({ events, now: NOW })[0].kind).toBe('insufficient-data')
  })

  it('compares yesterday against the complete-day baseline', () => {
    const insights = strategy.compute({ events: fullWeekBottles, now: NOW })
    expect(insights).toHaveLength(1)
    expect(insights[0].kind).toBe('comparison')
    // Yesterday (07-07) = 250 ml; baseline = 550 ml / 7 ≈ 79 ml/day → above.
    expect(insights[0].fact).toContain("Yesterday's bottles (250 ml)")
    expect(insights[0].fact).toContain('above')
    expect(insights[0].fact).toContain('7-day average (79 ml/day)')
  })

  it('excludes the in-progress day (today) from the baseline and comparison', () => {
    // A big feed today must not change yesterday's number or the baseline.
    const withToday = [...fullWeekBottles, bottle('2026-07-08T09:00:00.000Z', 999)]
    const insights = strategy.compute({ events: withToday, now: NOW })
    expect(insights[0].fact).toContain("Yesterday's bottles (250 ml)")
    expect(insights[0].fact).toContain('7-day average (79 ml/day)')
  })

  it('never uses judgment words (ADR-0005)', () => {
    const fact = strategy.compute({ events: fullWeekBottles, now: NOW })[0].fact.toLowerCase()
    for (const banned of ['enough', 'normal', 'should', 'ok']) {
      expect(fact).not.toContain(banned)
    }
  })
})

describe('breastNursingStrategy', () => {
  const strategy = breastNursingStrategy()

  const fullWeekBreast: BabyEvent[] = [
    breast('2026-07-01T00:00:00.000Z', 20),
    breast('2026-07-02T09:00:00.000Z', 20),
    breast('2026-07-05T09:00:00.000Z', 20),
    breast('2026-07-07T08:00:00.000Z', 20),
    breast('2026-07-07T14:00:00.000Z', 20),
  ]

  it('stays silent when the family never breastfeeds', () => {
    expect(strategy.compute({ events: fullWeekBottles, now: NOW })).toEqual([])
  })

  it('withholds until a full week of history', () => {
    const events = [breast('2026-07-06T09:00:00.000Z', 20), breast('2026-07-07T09:00:00.000Z', 20)]
    expect(strategy.compute({ events, now: NOW })[0].kind).toBe('insufficient-data')
  })

  it('compares yesterday\'s nursing minutes against the baseline', () => {
    const insights = strategy.compute({ events: fullWeekBreast, now: NOW })
    expect(insights).toHaveLength(1)
    expect(insights[0].kind).toBe('comparison')
    // Yesterday (07-07) = 40 min; baseline = 100 min / 7 ≈ 14 min/day.
    expect(insights[0].fact).toContain("Yesterday's nursing (40 min)")
    expect(insights[0].fact).toContain('14 min/day')
  })

  it('ignores a running (not-yet-ended) session in the totals', () => {
    const running: BabyEvent = {
      type: 'feed',
      method: 'breast',
      side: 'right',
      occurredAt: '2026-07-07T20:00:00.000Z', // yesterday, still going
      endedAt: null,
      createdAt: '2026-07-07T20:00:00.000Z',
    }
    const insights = strategy.compute({ events: [...fullWeekBreast, running], now: NOW })
    // The running session contributes 0 min; yesterday's two done sessions = 40 min.
    expect(insights[0].kind).toBe('comparison')
    expect(insights[0].fact).toContain("Yesterday's nursing (40 min)")
  })
})

describe('nextFeedStrategy', () => {
  const strategy = nextFeedStrategy()

  it('predicts the next feed when recent timing is regular', () => {
    const events = [bottle(ago(4)), bottle(ago(3)), bottle(ago(2)), bottle(ago(1))]
    const insights = strategy.compute({ events, now: NOW })
    expect(insights).toHaveLength(1)
    expect(insights[0].kind).toBe('prediction')
    expect(insights[0].fact).toMatch(/Next feed around \d\d:\d\d/)
    expect(insights[0].confidence).toBeGreaterThan(0.5)
  })

  it('counts breast and bottle feeds together', () => {
    const events = [breast(ago(4), 15), bottle(ago(3)), breast(ago(2), 15), bottle(ago(1))]
    const insights = strategy.compute({ events, now: NOW })
    expect(insights).toHaveLength(1)
    expect(insights[0].kind).toBe('prediction')
  })

  it('stays silent when timing is too erratic to trust', () => {
    const events = [bottle(ago(20)), bottle(ago(19)), bottle(ago(6)), bottle(ago(1))]
    expect(strategy.compute({ events, now: NOW })).toEqual([])
  })
})

describe('listFeedStrategies via runStrategies', () => {
  it('flattens all feed strategies in render order', () => {
    // Both methods present (so neither is silent) + regular recent feeds today
    // (so next-feed fires). The exact insight bodies are covered above.
    const events: BabyEvent[] = [
      bottle('2026-07-01T00:00:00.000Z'),
      breast('2026-07-01T06:00:00.000Z', 20),
      bottle(ago(4)),
      bottle(ago(3)),
      bottle(ago(2)),
      bottle(ago(1)),
    ]
    const insights = runStrategies(listFeedStrategies(), { events, now: NOW })
    expect(insights.map((i) => i.strategyId)).toEqual(['bottle-volume', 'breast-nursing', 'next-feed'])
  })

  it('exposes tunable config as the documented defaults', () => {
    expect(DEFAULT_FEED_CONFIG.window.windowDays).toBe(7)
    expect(DEFAULT_FEED_CONFIG.minEvents).toBe(5)
  })
})
