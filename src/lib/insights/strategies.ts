import type { BabyEvent, FeedEvent } from '../../db/schema'
import { isBreastFeed, isFlaggedBreastFeed } from '../stats'
import {
  assessSufficiency,
  compareDirection,
  dailyBaseline,
  predictNext,
  todaySum,
  type Metric,
  type PredictionConfig,
  type SufficiencyGate,
  type WindowConfig,
} from './baseline'
import { insufficientData, type Insight, type InsightStrategy } from './types'

/**
 * Tunable parameters for the feed insights. Kept together (ADR-0006) so windows
 * and thresholds live in one reviewed place, never as magic numbers in the UI.
 */
export interface FeedInsightConfig {
  /** Trailing window for the baby's own baseline. */
  window: WindowConfig
  /** How much history before a baseline is stated rather than withheld. */
  gate: SufficiencyGate
  /** Relative band for "about the same as" the baseline (0.1 ⇒ ±10%). */
  tolerance: number
  /** Confidence-gated next-feed prediction params. */
  prediction: PredictionConfig
}

export const DEFAULT_FEED_CONFIG: FeedInsightConfig = {
  window: { windowDays: 7 },
  gate: { minDays: 3, minEvents: 5 },
  tolerance: 0.1,
  // Predict off recent intervals (last day), not the whole baseline window — a
  // 7-day window makes day-gaps look erratic and suppresses every prediction.
  prediction: { window: { windowDays: 1 }, minIntervals: 3, maxCv: 0.5, minConfidence: 0.5 },
}

/** Bottle feeds only (absent method ⇒ bottle). */
function listBottleFeeds(events: BabyEvent[]): BabyEvent[] {
  return events.filter((e) => e.type === 'feed' && !isBreastFeed(e))
}

/** A bottle feed's volume; a breast feed contributes 0 (it has no volume — ADR-0007). */
const bottleVolume: Metric<'feed'> = (e: FeedEvent) => (e.method === 'breast' ? 0 : e.volumeMl)

/** Local HH:MM of a Date (tests run in UTC, so deterministic). */
function hhmm(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/**
 * Bottle volume vs the baby's own baseline. States today's total against the
 * N-day daily average — a fact, not a verdict (ADR-0005). Silent when the family
 * bottle-feeds not at all; withheld ("keep logging") when they do but sparsely.
 */
export function bottleVolumeStrategy(config: FeedInsightConfig = DEFAULT_FEED_CONFIG): InsightStrategy {
  const id = 'bottle-volume'
  return {
    id,
    compute({ events, now }) {
      const bottles = listBottleFeeds(events)
      if (bottles.length === 0) return []
      if (!assessSufficiency(bottles, 'feed', now, config.gate, config.window).sufficient) {
        return [insufficientData(id, 'Keep logging bottles — a weekly pattern appears after a few days.')]
      }
      const baseline = Math.round(dailyBaseline(bottles, 'feed', now, bottleVolume, config.window))
      const today = Math.round(todaySum(bottles, 'feed', now, bottleVolume))
      const dir = compareDirection(today, baseline, config.tolerance)
      return [
        {
          strategyId: id,
          kind: 'comparison',
          fact: `Today's bottles (${today} ml) are ${dir} this baby's ${config.window.windowDays}-day average (${baseline} ml/day).`,
        },
      ]
    },
  }
}

/**
 * Nursing minutes vs the baby's own baseline. Sums each breast feed's duration
 * (running/flagged sessions contribute 0), keyed by the day it started, so today
 * and the baseline are measured the same way. Silent with no breast feeds.
 */
export function breastNursingStrategy(config: FeedInsightConfig = DEFAULT_FEED_CONFIG): InsightStrategy {
  const id = 'breast-nursing'
  return {
    id,
    compute({ events, now }) {
      const breast = events.filter(isBreastFeed)
      if (breast.length === 0) return []
      // Duration in minutes for a completed session; 0 while running or flagged (>3h).
      const nursingMinutes: Metric<'feed'> = (e: FeedEvent) => {
        if (e.method !== 'breast' || e.endedAt == null) return 0
        if (isFlaggedBreastFeed(e, now)) return 0
        const mins = (Date.parse(e.endedAt) - Date.parse(e.occurredAt)) / 60000
        return mins > 0 ? mins : 0
      }
      if (!assessSufficiency(breast, 'feed', now, config.gate, config.window).sufficient) {
        return [insufficientData(id, 'Keep logging nursing — a weekly pattern appears after a few days.')]
      }
      const baseline = Math.round(dailyBaseline(breast, 'feed', now, nursingMinutes, config.window))
      const today = Math.round(todaySum(breast, 'feed', now, nursingMinutes))
      const dir = compareDirection(today, baseline, config.tolerance)
      return [
        {
          strategyId: id,
          kind: 'comparison',
          fact: `Today's nursing (${today} min) is ${dir} this baby's ${config.window.windowDays}-day average (${baseline} min/day).`,
        },
      ]
    },
  }
}

/**
 * A next-feed prediction from the baby's own recent rhythm — an observation, not
 * an instruction (ADR-0005). Counts feeds of either method (a nursing session is
 * still a feed). Suppressed unless recent intervals are regular enough (ADR-0006).
 */
export function nextFeedStrategy(config: FeedInsightConfig = DEFAULT_FEED_CONFIG): InsightStrategy {
  const id = 'next-feed'
  return {
    id,
    compute({ events, now }) {
      const prediction = predictNext(events, 'feed', now, config.prediction)
      if (!prediction) return []
      return [
        {
          strategyId: id,
          kind: 'prediction',
          fact: `Next feed around ${hhmm(prediction.at)}, going by recent timing.`,
          confidence: prediction.confidence,
        },
      ]
    },
  }
}

/** The Task 1.3 feed strategies, built with the default config, in render order. */
export function listFeedStrategies(config: FeedInsightConfig = DEFAULT_FEED_CONFIG): InsightStrategy[] {
  return [bottleVolumeStrategy(config), breastNursingStrategy(config), nextFeedStrategy(config)]
}

// Re-export for consumers that only need the strategies + runner.
export type { Insight }
