import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
import { useEvents } from '../hooks/useEvents'
import { getLastEventOfType } from '../lib/stats'
import { gramsToKg } from '../lib/units'
import { eventColor, palette } from '../lib/theme'
import type { WeightEvent } from '../db/schema'
import EventSheet from '../components/sheets/EventSheet'
import { PlusIcon, ChevronLeft } from '../components/icons'

const col = eventColor.weight

export default function WeightPage() {
  const events = useEvents()
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<WeightEvent | null>(null)

  const weights = events
    .filter((e): e is WeightEvent => e.type === 'weight')
    .sort((a, b) => a.occurredAt.localeCompare(b.occurredAt))

  const chartData = weights.map((e) => ({
    date: new Date(e.occurredAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    kg: Number(gramsToKg(e.grams).toFixed(3)),
  }))

  const latest = getLastEventOfType(events, 'weight')

  return (
    <div className="px-5 pt-3">
      <Link to="/trends" className="press mb-2 inline-flex items-center gap-1 text-sm font-semibold text-inkSoft">
        <ChevronLeft size={16} color="#9A8979" /> Trends
      </Link>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-ink">Weight</h1>
        <button
          onClick={() => setAdding(true)}
          className="press flex items-center gap-1.5 rounded-2xl px-4 py-2.5 font-bold text-white"
          style={{ background: col, boxShadow: `0 8px 18px ${col}55` }}
        >
          <PlusIcon size={16} color="#fff" sw={2.4} /> Add
        </button>
      </div>

      {latest && (
        <div className="mb-4 rounded-3xl bg-surface p-4 shadow-md">
          <div className="text-xs font-semibold uppercase tracking-wide text-inkSoft">Latest</div>
          <div className="tnum text-3xl font-bold text-ink">
            {gramsToKg(latest.grams).toFixed(3)}
            <span className="ml-1 text-lg font-semibold text-inkSoft">kg</span>
          </div>
        </div>
      )}

      {chartData.length >= 2 ? (
        <div className="mb-4 h-64 w-full rounded-3xl bg-surface p-3 shadow-md">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={palette.faint} />
              <XAxis dataKey="date" tick={{ fill: palette.inkSoft, fontSize: 12 }} stroke={palette.faint} />
              <YAxis domain={['auto', 'auto']} tick={{ fill: palette.inkSoft, fontSize: 12 }} stroke={palette.faint} />
              <Tooltip
                contentStyle={{
                  borderRadius: 12,
                  border: `1px solid ${palette.faint}`,
                  background: palette.surface,
                  color: palette.ink,
                }}
              />
              <Line type="monotone" dataKey="kg" stroke={col} strokeWidth={2.5} dot={{ fill: col }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p className="mb-4 text-inkSoft">Add at least two measurements to see a trend.</p>
      )}

      <div className="overflow-hidden rounded-3xl bg-surface shadow-md">
        {[...weights].reverse().map((w, i) => (
          <button
            key={w.id}
            onClick={() => setEditing(w)}
            className="press flex w-full items-center justify-between px-4 py-3 text-left"
            style={{ borderTop: i === 0 ? 'none' : '1px solid #FBF3EA' }}
          >
            <span className="text-sm font-medium text-inkSoft">
              {new Date(w.occurredAt).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
            </span>
            <span className="tnum font-bold text-ink">{gramsToKg(w.grams).toFixed(3)} kg</span>
          </button>
        ))}
      </div>

      <EventSheet
        adding={adding ? 'weight' : null}
        editing={editing}
        medications={[]}
        onClose={() => {
          setAdding(false)
          setEditing(null)
        }}
      />
    </div>
  )
}
