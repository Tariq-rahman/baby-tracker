import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
import { useEvents } from '../hooks/useEvents'
import { getLastEventOfType } from '../lib/stats'
import { mmToCm } from '../lib/units'
import { eventColor, palette } from '../lib/theme'
import type { GrowthEvent } from '../db/schema'
import EventSheet from '../components/sheets/EventSheet'
import { PlusIcon, ChevronLeft } from '../components/icons'

const col = eventColor.growth
const headCol = palette.ring // terracotta — clearly distinct from the dusty-blue height line

/** cm to one decimal, or null so a missing metric leaves a gap in its line. */
const cm = (mm: number | undefined): number | null => (mm == null ? null : Number(mmToCm(mm).toFixed(1)))

export default function GrowthPage() {
  const events = useEvents()
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<GrowthEvent | null>(null)

  const measurements = events
    .filter((e): e is GrowthEvent => e.type === 'growth')
    .sort((a, b) => a.occurredAt.localeCompare(b.occurredAt))

  const chartData = measurements.map((e) => ({
    date: new Date(e.occurredAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    height: cm(e.heightMm),
    head: cm(e.headCircumferenceMm),
  }))

  const latest = getLastEventOfType(events, 'growth')

  return (
    <div className="px-5 pt-3">
      <Link to="/trends" className="press mb-2 inline-flex items-center gap-1 text-sm font-semibold text-inkSoft">
        <ChevronLeft size={16} color={palette.inkSoft} /> Trends
      </Link>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-ink">Growth</h1>
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
          <div className="flex gap-6">
            {latest.heightMm != null && (
              <div>
                <div className="text-xs font-medium text-inkSoft">Height</div>
                <div className="tnum text-3xl font-bold text-ink">
                  {mmToCm(latest.heightMm).toFixed(1)}
                  <span className="ml-1 text-lg font-semibold text-inkSoft">cm</span>
                </div>
              </div>
            )}
            {latest.headCircumferenceMm != null && (
              <div>
                <div className="text-xs font-medium text-inkSoft">Head</div>
                <div className="tnum text-3xl font-bold text-ink">
                  {mmToCm(latest.headCircumferenceMm).toFixed(1)}
                  <span className="ml-1 text-lg font-semibold text-inkSoft">cm</span>
                </div>
              </div>
            )}
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
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line
                type="monotone"
                dataKey="height"
                name="Height (cm)"
                stroke={col}
                strokeWidth={2.5}
                dot={{ fill: col }}
                connectNulls
              />
              <Line
                type="monotone"
                dataKey="head"
                name="Head (cm)"
                stroke={headCol}
                strokeWidth={2.5}
                dot={{ fill: headCol }}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p className="mb-4 text-inkSoft">Add at least two measurements to see a trend.</p>
      )}

      <div className="overflow-hidden rounded-3xl bg-surface shadow-md">
        {[...measurements].reverse().map((m, i) => (
          <button
            key={m.id}
            onClick={() => setEditing(m)}
            className="press flex w-full items-center justify-between px-4 py-3 text-left"
            style={{ borderTop: i === 0 ? 'none' : `1px solid ${palette.cream}` }}
          >
            <span className="text-sm font-medium text-inkSoft">
              {new Date(m.occurredAt).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
            </span>
            <span className="tnum font-bold text-ink">
              {[
                m.heightMm != null ? `${mmToCm(m.heightMm).toFixed(1)} cm` : null,
                m.headCircumferenceMm != null ? `head ${mmToCm(m.headCircumferenceMm).toFixed(1)} cm` : null,
              ]
                .filter(Boolean)
                .join(' · ')}
            </span>
          </button>
        ))}
      </div>

      <EventSheet
        adding={adding ? 'growth' : null}
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
