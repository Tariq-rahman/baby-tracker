import type { Insight, InsightInput, InsightStrategy } from './types'

export * from './types'
export * from './baseline'

/**
 * Run every strategy over the same input and flatten their insights. Strategies
 * are independent (ADR-0006) — order of the returned insights follows the order
 * of `strategies`.
 */
export function runStrategies(strategies: InsightStrategy[], input: InsightInput): Insight[] {
  return strategies.flatMap((strategy) => strategy.compute(input))
}
