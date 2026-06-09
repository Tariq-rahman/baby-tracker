import { useState } from 'react'
import type { WeightEvent } from '../../db/schema'
import { kgToGrams, lbOzToGrams, gramsToKg } from '../../lib/units'
import { isoToLocalInput, localInputToIso, nowLocalInput } from '../../lib/datetime'

interface Props {
  initial?: WeightEvent
  onSave: (event: WeightEvent) => void
  onDelete?: () => void
  onClose: () => void
}

export default function WeightSheet({ initial, onSave, onDelete, onClose }: Props) {
  const [mode, setMode] = useState<'metric' | 'imperial'>('metric')
  const [kg, setKg] = useState(initial ? String(gramsToKg(initial.grams)) : '')
  const [lb, setLb] = useState('')
  const [oz, setOz] = useState('')
  const [when, setWhen] = useState(initial ? isoToLocalInput(initial.occurredAt) : nowLocalInput())

  function handleSave() {
    const grams = mode === 'metric' ? kgToGrams(Number(kg)) : lbOzToGrams(Number(lb), Number(oz))
    if (!grams) return
    onSave({
      type: 'weight',
      grams,
      occurredAt: localInputToIso(when),
      createdAt: initial?.createdAt ?? new Date().toISOString(),
    })
    onClose()
  }

  return (
    <div className="space-y-4 p-4">
      <h2 className="text-lg font-bold">Weight</h2>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setMode('metric')}
          className={`flex-1 rounded border p-2 ${mode === 'metric' ? 'bg-blue-600 text-white' : 'bg-white'}`}
        >
          kg
        </button>
        <button
          type="button"
          onClick={() => setMode('imperial')}
          className={`flex-1 rounded border p-2 ${mode === 'imperial' ? 'bg-blue-600 text-white' : 'bg-white'}`}
        >
          lb + oz
        </button>
      </div>
      {mode === 'metric' ? (
        <label className="block">
          <span className="text-sm text-slate-600">kg</span>
          <input
            type="number"
            step="0.001"
            inputMode="decimal"
            value={kg}
            onChange={(e) => setKg(e.target.value)}
            className="mt-1 w-full rounded border p-3 text-lg"
          />
        </label>
      ) : (
        <div className="flex gap-2">
          <label className="block flex-1">
            <span className="text-sm text-slate-600">lb</span>
            <input
              type="number"
              inputMode="numeric"
              value={lb}
              onChange={(e) => setLb(e.target.value)}
              className="mt-1 w-full rounded border p-3 text-lg"
            />
          </label>
          <label className="block flex-1">
            <span className="text-sm text-slate-600">oz</span>
            <input
              type="number"
              inputMode="numeric"
              value={oz}
              onChange={(e) => setOz(e.target.value)}
              className="mt-1 w-full rounded border p-3 text-lg"
            />
          </label>
        </div>
      )}
      <label className="block">
        <span className="text-sm text-slate-600">Time</span>
        <input
          type="datetime-local"
          value={when}
          onChange={(e) => setWhen(e.target.value)}
          className="mt-1 w-full rounded border p-3"
        />
      </label>
      <div className="flex gap-2">
        <button onClick={onClose} className="flex-1 rounded border p-3">
          Cancel
        </button>
        <button onClick={handleSave} className="flex-1 rounded bg-blue-600 p-3 font-bold text-white">
          Save
        </button>
      </div>
      {initial && onDelete && (
        <button onClick={onDelete} className="w-full rounded border border-red-500 p-3 font-semibold text-red-600">
          Delete
        </button>
      )}
    </div>
  )
}
