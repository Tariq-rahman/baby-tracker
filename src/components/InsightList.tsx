import type { Insight } from '../lib/insights'

interface Props {
  insights: Insight[]
}

/**
 * Renders reflective insights as a short stack of facts (ADR-0005 — a mirror, not
 * a doctor). The `insufficient-data` gate reads as muted "keep logging" copy;
 * predictions get a clock marker. Copy is authored in the strategies, never here.
 */
export default function InsightList({ insights }: Props) {
  if (insights.length === 0) return null
  return (
    <ul className="flex flex-col gap-1.5">
      {insights.map((insight, i) => (
        <li
          key={`${insight.strategyId}-${i}`}
          className={`flex gap-1.5 text-sm ${
            insight.kind === 'insufficient-data' ? 'text-inkSoft' : 'text-ink'
          }`}
        >
          {insight.kind === 'prediction' && <span aria-hidden>🕐</span>}
          <span>{insight.fact}</span>
        </li>
      ))}
    </ul>
  )
}
