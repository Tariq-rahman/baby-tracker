import type { ReactNode } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { palette } from '../lib/theme'

/** One stacked series within a card (e.g. wet vs dirty nappies). */
export interface TrendSeries {
  key: string
  label: string
  color: string
  values: number[]
}

interface Props {
  title: string
  /** Accent colour for the card heading and the single-series bars. */
  color: string
  /** Local 'YYYY-MM-DD' per point, aligned with each series' values. */
  days: string[]
  series: TrendSeries[]
  /** Right-aligned summary in the header (e.g. "avg 6/day"). */
  badge?: string
  /** A dashed reference line drawn on the stacked total — the baseline (ADR-0006). */
  baseline?: number
  /** Reflective insight text — wired in Task 1.3; a slot for now. */
  insight?: ReactNode
}

const shortDay = (day: string): string => {
  const [, m, d] = day.split('-').map(Number)
  return `${m}/${d}`
}

/**
 * A small-multiple card for one metric: a bar chart over the selected window with
 * an optional baseline line and a slot for its reflective insight. Renders an
 * honest empty state when the window holds no data for the metric.
 */
export default function TrendCard({ title, color, days, series, badge, baseline, insight }: Props) {
  const total = days.map((_, i) => series.reduce((sum, s) => sum + (s.values[i] ?? 0), 0))
  const hasData = total.some((v) => v > 0)

  const data = days.map((day, i) => {
    const row: Record<string, string | number> = { day: shortDay(day) }
    for (const s of series) row[s.key] = s.values[i] ?? 0
    return row
  })

  return (
    <div className="rounded-3xl bg-surface p-4 shadow-md">
      <div className="mb-2 flex items-baseline justify-between">
        <h2 className="text-base font-bold" style={{ color }}>
          {title}
        </h2>
        {badge && <span className="tnum text-xs font-semibold text-inkSoft">{badge}</span>}
      </div>

      {hasData ? (
        <div className="h-36 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -22 }} barCategoryGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke={palette.faint} vertical={false} />
              <XAxis
                dataKey="day"
                tick={{ fill: palette.inkSoft, fontSize: 10 }}
                stroke={palette.faint}
                interval="preserveStartEnd"
                minTickGap={24}
              />
              <YAxis
                allowDecimals={false}
                width={34}
                tick={{ fill: palette.inkSoft, fontSize: 10 }}
                stroke={palette.faint}
              />
              <Tooltip
                cursor={{ fill: `${color}18` }}
                contentStyle={{
                  borderRadius: 12,
                  border: `1px solid ${palette.faint}`,
                  background: palette.surface,
                  color: palette.ink,
                  fontSize: 12,
                }}
              />
              {series.map((s, i) => (
                <Bar
                  key={s.key}
                  dataKey={s.key}
                  name={s.label}
                  stackId="a"
                  fill={s.color}
                  radius={i === series.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                />
              ))}
              {baseline != null && baseline > 0 && (
                <ReferenceLine
                  y={baseline}
                  stroke={palette.ink}
                  strokeDasharray="4 4"
                  strokeOpacity={0.45}
                />
              )}
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p className="py-6 text-center text-sm text-inkSoft">No data in this window yet.</p>
      )}

      {series.length > 1 && (
        <div className="mt-2 flex gap-4">
          {series.map((s) => (
            <span key={s.key} className="flex items-center gap-1.5 text-xs font-medium text-inkSoft">
              <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: s.color }} />
              {s.label}
            </span>
          ))}
        </div>
      )}

      {insight && <div className="mt-3 border-t border-faint pt-3 text-sm text-ink">{insight}</div>}
    </div>
  )
}
