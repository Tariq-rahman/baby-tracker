import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Line,
  LineChart,
  ResponsiveContainer,
} from 'recharts'
import { useEvents } from '../hooks/useEvents'
import { useBaby, useEnabledEventTypes } from '../hooks/useBaby'
import { getLastEventOfType } from '../lib/stats'
import { listDailyTrend, listWindowDays, seriesMean, TREND_WINDOWS } from '../lib/trends'
import { listFeedStrategies, runStrategies } from '../lib/insights'
import { gramsToKg } from '../lib/units'
import { eventColor } from '../lib/theme'
import type { EventType, WeightEvent } from '../db/schema'
import TrendCard, { type TrendSeries } from '../components/TrendCard'
import InsightList from '../components/InsightList'
import { ChevronRight } from '../components/icons'

/** One-decimal average, blank when zero, for the header badges. */
function avgBadge(values: number[], unit: string): string | undefined {
  const mean = seriesMean(values)
  if (mean <= 0) return undefined
  const n = Math.round(mean * 10) / 10
  return `avg ${n}${unit}`
}

export default function TrendsPage() {
  const events = useEvents()
  const baby = useBaby()
  const enabled = useEnabledEventTypes()
  const [windowIdx, setWindowIdx] = useState(0)

  const now = new Date()
  const window = TREND_WINDOWS[windowIdx]
  const dob = baby?.dateOfBirth ?? '2020-01-01'
  const days = listWindowDays(window, dob, now)
  const trend = listDailyTrend(events, days, now)

  const shows = (t: EventType) => enabled.includes(t)

  const feedCount = trend.map((p) => p.feedCount)
  const sleepHours = trend.map((p) => Math.round((p.sleepMinutes / 60) * 10) / 10)
  const nappyWet = trend.map((p) => p.nappyWet)
  const nappyDirty = trend.map((p) => p.nappyDirty)
  const doses = trend.map((p) => p.doseCount)

  const nappySeries: TrendSeries[] = [
    { key: 'wet', label: 'Wet', color: '#E8A87C', values: nappyWet },
    { key: 'dirty', label: 'Dirty', color: eventColor.nappy, values: nappyDirty },
  ]

  // Reflective feed insights (Task 1.3). The baseline is the baby's own 7-day
  // window (ADR-0006), independent of the chart's window selector.
  const feedInsights = runStrategies(listFeedStrategies(), { events, now })

  return (
    <div className="px-5 pt-3">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-ink">Trends</h1>
        <div className="flex gap-1 rounded-2xl bg-surface p-1 shadow-sm">
          {TREND_WINDOWS.map((w, i) => (
            <button
              key={w.label}
              onClick={() => setWindowIdx(i)}
              className={`press rounded-xl px-3 py-1.5 text-sm font-semibold ${
                i === windowIdx ? 'text-white' : 'text-inkSoft'
              }`}
              style={i === windowIdx ? { background: eventColor.weight } : undefined}
            >
              {w.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-4 pb-4">
        {shows('feed') && (
          <TrendCard
            title="Feeds / day"
            color={eventColor.feed}
            days={days}
            series={[{ key: 'feed', label: 'Feeds', color: eventColor.feed, values: feedCount }]}
            badge={avgBadge(feedCount, '/day')}
            baseline={seriesMean(feedCount)}
            insight={feedInsights.length ? <InsightList insights={feedInsights} /> : undefined}
          />
        )}

        {shows('sleep') && (
          <TrendCard
            title="Sleep hours / day"
            color={eventColor.sleep}
            days={days}
            series={[{ key: 'sleep', label: 'Sleep', color: eventColor.sleep, values: sleepHours }]}
            badge={avgBadge(sleepHours, 'h')}
            baseline={seriesMean(sleepHours)}
          />
        )}

        {shows('nappy') && (
          <TrendCard
            title="Nappies / day"
            color={eventColor.nappy}
            days={days}
            series={nappySeries}
            badge={avgBadge(nappyWet.map((v, i) => v + nappyDirty[i]), '/day')}
            baseline={seriesMean(nappyWet.map((v, i) => v + nappyDirty[i]))}
          />
        )}

        {shows('dose') && (
          <TrendCard
            title="Doses / day"
            color={eventColor.dose}
            days={days}
            series={[{ key: 'dose', label: 'Doses', color: eventColor.dose, values: doses }]}
            badge={avgBadge(doses, '/day')}
            baseline={seriesMean(doses)}
          />
        )}

        {shows('weight') && <WeightCard />}
      </div>
    </div>
  )
}

/** Weight is per-measurement, not per-day — a preview that links to the full page. */
function WeightCard() {
  const events = useEvents()
  const col = eventColor.weight
  const weights = events
    .filter((e): e is WeightEvent => e.type === 'weight')
    .sort((a, b) => a.occurredAt.localeCompare(b.occurredAt))
  const latest = getLastEventOfType(events, 'weight')
  const data = weights.map((e) => ({ kg: Number(gramsToKg(e.grams).toFixed(3)) }))

  return (
    <Link to="/weight" className="press block rounded-3xl bg-surface p-4 shadow-md">
      <div className="mb-2 flex items-baseline justify-between">
        <h2 className="text-base font-bold" style={{ color: col }}>
          Weight
        </h2>
        <span className="flex items-center gap-0.5 text-xs font-semibold text-inkSoft">
          {latest ? `${gramsToKg(latest.grams).toFixed(3)} kg` : 'No data'}
          <ChevronRight size={14} color="#9A8979" />
        </span>
      </div>
      {data.length >= 2 ? (
        <div className="h-24 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
              <Line type="monotone" dataKey="kg" stroke={col} strokeWidth={2.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p className="py-6 text-center text-sm text-inkSoft">Add measurements to see a trend.</p>
      )}
    </Link>
  )
}
