import { describe, it, expect } from 'vitest'
import type { BabyEvent } from '../../db/schema'
import {
  runStrategies,
  insufficientData,
  assessSufficiency,
  dailyBaseline,
  predictNext,
  type Insight,
  type InsightStrategy,
} from './index'

const HOUR = 60 * 60 * 1000
const NOW = new Date('2026-07-08T12:00:00.000Z') // TZ=UTC in tests

const feed = (occurredAt: string, volumeMl = 100): BabyEvent => ({
  type: 'feed',
  volumeMl,
  occurredAt,
  createdAt: occurredAt,
})
const ago = (hours: number): string => new Date(NOW.getTime() - hours * HOUR).toISOString()

/**
 * A representative strategy built entirely from the scaffold helpers, proving the
 * contract end-to-end: it gates on data-sufficiency, states a baseline *fact*,
 * and adds a confidence-gated prediction. Concrete strategies (Task 1.3) follow
 * this shape.
 */
const bottleVolumeStrategy: InsightStrategy = {
  id: 'bottle-volume',
  compute({ events, now }) {
    if (!assessSufficiency(events, 'feed', now, { minDays: 3, minEvents: 5 }).sufficient) {
      return [insufficientData('bottle-volume', 'Keep logging — patterns appear after about a week.')]
    }
    const perDay = Math.round(dailyBaseline(events, 'feed', now, (e) => e.volumeMl))
    const insights: Insight[] = [
      { strategyId: 'bottle-volume', kind: 'observation', fact: `${perDay} ml/day this week on average.` },
    ]
    // Predict off recent intervals (last day), not the whole 7-day baseline window.
    const prediction = predictNext(events, 'feed', now, {
      window: { windowDays: 1 },
      minIntervals: 3,
      maxCv: 0.5,
      minConfidence: 0.5,
    })
    if (prediction) {
      insights.push({
        strategyId: 'bottle-volume',
        kind: 'prediction' as const,
        fact: 'Next feed likely soon.',
        confidence: prediction.confidence,
      })
    }
    return insights
  },
}

describe('runStrategies', () => {
  it('surfaces the insufficient-data gate on cold start', () => {
    const insights = runStrategies([bottleVolumeStrategy], { events: [], now: NOW })
    expect(insights).toHaveLength(1)
    expect(insights[0].kind).toBe('insufficient-data')
  })

  it('emits a baseline observation once the gate is met', () => {
    const events: BabyEvent[] = [feed(ago(1)), feed(ago(2)), feed(ago(25)), feed(ago(26)), feed(ago(49))]
    const insights = runStrategies([bottleVolumeStrategy], { events, now: NOW })
    const observation = insights.find((i) => i.kind === 'observation')
    expect(observation).toBeDefined()
    expect(observation?.fact).toContain('ml/day')
  })

  it('adds a confidence-gated prediction when feeds are regular', () => {
    // Enough days/events to clear the gate, plus regular recent hourly feeds.
    const events: BabyEvent[] = [
      feed(ago(49)),
      feed(ago(26)),
      feed(ago(25)),
      feed(ago(4)),
      feed(ago(3)),
      feed(ago(2)),
      feed(ago(1)),
    ]
    const insights = runStrategies([bottleVolumeStrategy], { events, now: NOW })
    const prediction = insights.find((i) => i.kind === 'prediction')
    expect(prediction).toBeDefined()
    expect(prediction?.confidence).toBeGreaterThan(0.5)
  })

  it('flattens insights across multiple strategies in order', () => {
    const other: InsightStrategy = {
      id: 'other',
      compute: () => [{ strategyId: 'other', kind: 'observation', fact: 'hello' }],
    }
    const insights = runStrategies([bottleVolumeStrategy, other], { events: [], now: NOW })
    expect(insights.map((i) => i.strategyId)).toEqual(['bottle-volume', 'other'])
  })
})
