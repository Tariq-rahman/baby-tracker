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
const NOW = new Date('2026-07-08T12:00:00.000Z')

const ago = (hours: number): string => new Date(NOW.getTime() - hours * HOUR).toISOString()

/** A bottle feed (absent method ⇒ bottle). */
const bottle = (occurredAt: string, volumeMl = 100): BabyEvent => ({
  type: 'feed',
  volumeMl,
  occurredAt,
  createdAt: occurredAt,
})

/** A completed nursing session of `durationMin`, starting `startAgoH` hours ago. */
const breast = (startAgoH: number, durationMin: number): BabyEvent => {
  const start = new Date(NOW.getTime() - startAgoH * HOUR)
  return {
    type: 'feed',
    method: 'breast',
    side: 'left',
    occurredAt: start.toISOString(),
    endedAt: new Date(start.getTime() + durationMin * MIN).toISOString(),
    createdAt: start.toISOString(),
  }
}

describe('bottleVolumeStrategy', () => {
  const strategy = bottleVolumeStrategy()

  it('stays silent when the family never bottle-feeds', () => {
    const events = [breast(1, 20), breast(25, 20), breast(49, 20)]
    expect(strategy.compute({ events, now: NOW })).toEqual([])
  })

  it('withholds a baseline until the sufficiency gate is met', () => {
    const events = [bottle(ago(1)), bottle(ago(2))] // 1 day, 2 events — below the gate
    const insights = strategy.compute({ events, now: NOW })
    expect(insights).toHaveLength(1)
    expect(insights[0].kind).toBe('insufficient-data')
  })

  it('states today vs the baby\'s own baseline once the gate is met', () => {
    // 5 events over 3 days clears the gate; two 100ml bottles today.
    const events = [
      bottle(ago(1), 100),
      bottle(ago(2), 100),
      bottle(ago(25), 100),
      bottle(ago(26), 100),
      bottle(ago(49), 100),
    ]
    const insights = strategy.compute({ events, now: NOW })
    expect(insights).toHaveLength(1)
    expect(insights[0].kind).toBe('comparison')
    // Today = 200ml; baseline = 500ml / 7d ≈ 71ml/day → today is above.
    expect(insights[0].fact).toContain("Today's bottles (200 ml)")
    expect(insights[0].fact).toContain('above')
    expect(insights[0].fact).toContain('7-day average (71 ml/day)')
  })

  it('never uses judgment words (ADR-0005)', () => {
    const events = [
      bottle(ago(1)),
      bottle(ago(2)),
      bottle(ago(25)),
      bottle(ago(26)),
      bottle(ago(49)),
    ]
    const fact = strategy.compute({ events, now: NOW })[0].fact.toLowerCase()
    for (const banned of ['enough', 'normal', 'should', 'ok']) {
      expect(fact).not.toContain(banned)
    }
  })
})

describe('breastNursingStrategy', () => {
  const strategy = breastNursingStrategy()

  it('stays silent when the family never breastfeeds', () => {
    const events = [bottle(ago(1)), bottle(ago(25)), bottle(ago(49))]
    expect(strategy.compute({ events, now: NOW })).toEqual([])
  })

  it('withholds a baseline until the gate is met', () => {
    const insights = strategy.compute({ events: [breast(1, 20)], now: NOW })
    expect(insights).toHaveLength(1)
    expect(insights[0].kind).toBe('insufficient-data')
  })

  it('states today\'s nursing minutes vs the baseline', () => {
    // 5 sessions over 3 days; today two 20-min sessions = 40 min.
    const events = [
      breast(1, 20),
      breast(2, 20),
      breast(25, 20),
      breast(26, 20),
      breast(49, 20),
    ]
    const insights = strategy.compute({ events, now: NOW })
    expect(insights).toHaveLength(1)
    expect(insights[0].kind).toBe('comparison')
    // Today = 40 min; baseline = 100 min / 7d ≈ 14 min/day → above.
    expect(insights[0].fact).toContain("Today's nursing (40 min)")
    expect(insights[0].fact).toContain('14 min/day')
  })

  it('ignores a running (not-yet-ended) session in the totals', () => {
    const running: BabyEvent = {
      type: 'feed',
      method: 'breast',
      side: 'right',
      occurredAt: ago(0.25), // 15 min ago, still going
      endedAt: null,
      createdAt: ago(0.25),
    }
    const events = [running, breast(1, 20), breast(2, 20), breast(25, 20), breast(26, 20), breast(49, 20)]
    const insights = strategy.compute({ events, now: NOW })
    // The running session contributes 0 min; today's two done sessions = 40 min.
    expect(insights[0].kind).toBe('comparison')
    expect(insights[0].fact).toContain("Today's nursing (40 min)")
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
    const events = [breast(4, 15), bottle(ago(3)), breast(2, 15), bottle(ago(1))]
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
    // A mixed-feeding family with a regular rhythm: bottle + nursing + prediction.
    const events: BabyEvent[] = [
      bottle(ago(1), 120),
      bottle(ago(2), 120),
      bottle(ago(3), 120),
      breast(4, 20),
      breast(25, 20),
      breast(26, 20),
      breast(49, 20),
      bottle(ago(26), 120),
      bottle(ago(49), 120),
    ]
    const insights = runStrategies(listFeedStrategies(), { events, now: NOW })
    expect(insights.map((i) => i.strategyId)).toEqual(['bottle-volume', 'breast-nursing', 'next-feed'])
  })

  it('exposes tunable config as the documented defaults', () => {
    expect(DEFAULT_FEED_CONFIG.window.windowDays).toBe(7)
    expect(DEFAULT_FEED_CONFIG.gate).toEqual({ minDays: 3, minEvents: 5 })
  })
})
