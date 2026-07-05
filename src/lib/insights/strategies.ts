import type { BabyEvent, FeedEvent } from '../../db/schema'
import { isBreastFeed, isFlaggedBreastFeed } from '../stats'
import {
  assessCompleteCoverage,
  compareDirection,
  completeDayBaseline,
  daySum,
  lastCompleteDay,
  predictNext,
  type Metric,
  type PredictionConfig,
  type WindowConfig,
} from './baseline'
import { insufficientData, type Insight, type InsightStrategy } from './types'

/**
 * Tunable parameters for the feed insights. Kept together (ADR-0006) so windows
 * and thresholds live in one reviewed place, never as magic numbers in the UI.
 */
export interface FeedInsightConfig {
  /** Trailing window of complete days for the baby's own baseline. */
  window: WindowConfig
  /** Min events in the window before a baseline is stated (full-window history is also required). */
  minEvents: number
  /** Relative band for "about the same as" the baseline (0.1 ⇒ ±10%). */
  tolerance: number
  /** Confidence-gated next-feed prediction params. */
  prediction: PredictionConfig
}

export const DEFAULT_FEED_CONFIG: FeedInsightConfig = {
  window: { windowDays: 7 },
  minEvents: 5,
  tolerance: 0.1,
  // Predict off recent intervals (last day), not the whole baseline window — a
  // 7-day window makes day-gaps look erratic and suppresses every prediction.
  prediction: { window: { windowDays: 1 }, minIntervals: 3, maxCv: 0.5, minConfidence: 0.5 },
}

const KEEP_LOGGING = 'Keep logging — a weekly pattern will appear after about a week of data.'

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
 * Bottle volume vs the baby's own baseline. Compares *yesterday* (the last
 * complete day) against the N-day daily average — a fact, not a verdict
 * (ADR-0005). Silent when the family bottle-feeds not at all; withheld ("keep
 * logging") until there's a full week of history to divide by honestly.
 */
export function bottleVolumeStrategy(config: FeedInsightConfig = DEFAULT_FEED_CONFIG): InsightStrategy {
  const id = 'bottle-volume'
  return {
    id,
    compute({ events, now }) {
      const bottles = listBottleFeeds(events)
      if (bottles.length === 0) return []
      if (!assessCompleteCoverage(bottles, 'feed', now, config.minEvents, config.window).sufficient) {
        return [insufficientData(id, KEEP_LOGGING)]
      }
      const baseline = Math.round(completeDayBaseline(bottles, 'feed', now, bottleVolume, config.window))
      const yesterday = Math.round(daySum(bottles, 'feed', lastCompleteDay(now), bottleVolume))
      const dir = compareDirection(yesterday, baseline, config.tolerance)
      return [
        {
          strategyId: id,
          kind: 'comparison',
          fact: `Yesterday's bottles (${yesterday} ml) were ${dir} this baby's ${config.window.windowDays}-day average (${baseline} ml/day).`,
        },
      ]
    },
  }
}

/**
 * Nursing minutes vs the baby's own baseline. Sums each breast feed's duration
 * (running/flagged sessions contribute 0), keyed by the day it started, and
 * compares *yesterday* against the complete-day average. Silent with no breast
 * feeds; withheld until a full week of history.
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
      if (!assessCompleteCoverage(breast, 'feed', now, config.minEvents, config.window).sufficient) {
        return [insufficientData(id, KEEP_LOGGING)]
      }
      const baseline = Math.round(completeDayBaseline(breast, 'feed', now, nursingMinutes, config.window))
      const yesterday = Math.round(daySum(breast, 'feed', lastCompleteDay(now), nursingMinutes))
      const dir = compareDirection(yesterday, baseline, config.tolerance)
      return [
        {
          strategyId: id,
          kind: 'comparison',
          fact: `Yesterday's nursing (${yesterday} min) was ${dir} this baby's ${config.window.windowDays}-day average (${baseline} min/day).`,
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
