import type { BabyEvent } from '../../db/schema'

/**
 * What sort of statement an insight makes. Copy is always a *fact* about the
 * baby's own data (ADR-0005), never advice. `insufficient-data` is the
 * data-sufficiency gate (ADR-0006) surfaced as a first-class result, so every
 * insight surface renders a "not enough data yet" state explicitly rather than
 * a number derived from noise.
 */
export type InsightKind = 'observation' | 'comparison' | 'prediction' | 'insufficient-data'

export interface Insight {
  /** The strategy that produced this insight (provenance for the UI/debugging). */
  strategyId: string
  kind: InsightKind
  /** Human-facing copy — a fact, never advice (ADR-0005). */
  fact: string
  /** 0..1 confidence; present only for confidence-gated insights (predictions). */
  confidence?: number
}

/**
 * Everything a strategy needs to compute, passed in so `compute` stays pure and
 * testable — no `Date.now()`, no DB, no network. `events` is expected to be
 * already soft-delete-filtered (read via `storage.listEvents`).
 */
export interface InsightInput {
  events: BabyEvent[]
  now: Date
}

/**
 * A swappable baseline/prediction algorithm (strategy pattern, ADR-0006).
 * Thresholds and windows are the strategy's own parameters, never magic numbers
 * scattered across the UI, so a strategy can be changed or A/B-tested without
 * touching the insight surfaces. A strategy returns an `insufficient-data`
 * insight (not an empty array) when its data-sufficiency gate isn't met.
 */
export interface InsightStrategy {
  readonly id: string
  compute(input: InsightInput): Insight[]
}

/** Build the standard data-sufficiency insight (the ADR-0006 gate). */
export function insufficientData(strategyId: string, fact: string): Insight {
  return { strategyId, kind: 'insufficient-data', fact }
}
