import { useState } from 'react'
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
import type { WeightEvent } from '../db/schema'
import EventSheet from '../components/sheets/EventSheet'

export default function WeightPage() {
  const events = useEvents()
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<WeightEvent | null>(null)

  const weights = events
    .filter((e): e is WeightEvent => e.type === 'weight')
    .sort((a, b) => a.occurredAt.localeCompare(b.occurredAt))

  const chartData = weights.map((e) => ({
    date: new Date(e.occurredAt).toLocaleDateString(),
    kg: Number(gramsToKg(e.grams).toFixed(3)),
  }))

  const latest = getLastEventOfType(events, 'weight')

  return (
    <div className="p-4">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">Weight</h1>
        <button onClick={() => setAdding(true)} className="rounded bg-blue-600 px-4 py-2 font-bold text-white">
          Add
        </button>
      </div>

      {latest && (
        <p className="mb-4 text-slate-600">Latest: {gramsToKg(latest.grams).toFixed(3)} kg</p>
      )}

      {chartData.length >= 2 ? (
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis domain={['auto', 'auto']} />
              <Tooltip />
              <Line type="monotone" dataKey="kg" stroke="#2563eb" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p className="text-slate-400">Add at least two measurements to see a trend.</p>
      )}

      <ul className="mt-4 divide-y">
        {[...weights].reverse().map((w) => (
          <li key={w.id}>
            <button onClick={() => setEditing(w)} className="flex w-full justify-between py-2 text-left">
              <span>{new Date(w.occurredAt).toLocaleDateString()}</span>
              <span className="font-medium">{gramsToKg(w.grams).toFixed(3)} kg</span>
            </button>
          </li>
        ))}
      </ul>

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
