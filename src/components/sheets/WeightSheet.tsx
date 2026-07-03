import { useState } from 'react'
import type { WeightEvent } from '../../db/schema'
import { kgToGrams, lbOzToGrams, gramsToKg } from '../../lib/units'
import { eventColor, palette } from '../../lib/theme'
import { DeleteButton, DragHandle, QuickTimeRow, SaveButton, SheetHeader } from './sheetParts'

interface Props {
  initial?: WeightEvent
  onSave: (event: WeightEvent) => void
  onDelete?: () => void
  onClose: () => void
}

const col = eventColor.weight
const field = 'mt-1 w-full rounded-2xl border border-faint bg-surface p-3 text-lg text-ink'

export default function WeightSheet({ initial, onSave, onDelete, onClose }: Props) {
  const [mode, setMode] = useState<'metric' | 'imperial'>('metric')
  const [kg, setKg] = useState(initial ? String(gramsToKg(initial.grams)) : '')
  const [lb, setLb] = useState('')
  const [oz, setOz] = useState('')
  const [when, setWhen] = useState(() => (initial ? new Date(initial.occurredAt) : new Date()))

  function handleSave() {
    const grams = mode === 'metric' ? kgToGrams(Number(kg)) : lbOzToGrams(Number(lb), Number(oz))
    if (!grams) return
    onSave({
      type: 'weight',
      grams,
      occurredAt: when.toISOString(),
      createdAt: initial?.createdAt ?? new Date().toISOString(),
    })
    onClose()
  }

  function toggle(m: 'metric' | 'imperial') {
    return {
      className: 'press flex-1 rounded-2xl py-2.5 font-bold',
      style:
        mode === m
          ? { background: col, color: '#fff' }
          : { background: palette.surface, color: palette.inkSoft, border: `1.6px solid ${palette.faint}` },
    }
  }

  return (
    <div className="px-5 pb-7 pt-3.5">
      <DragHandle />
      <SheetHeader type="weight" title={initial ? 'Edit weight' : 'Log weight'} onClose={onClose} />

      <div className="mb-4 flex gap-2">
        <button type="button" {...toggle('metric')} onClick={() => setMode('metric')}>
          kg
        </button>
        <button type="button" {...toggle('imperial')} onClick={() => setMode('imperial')}>
          lb + oz
        </button>
      </div>

      {mode === 'metric' ? (
        <label className="mb-4 block">
          <span className="text-sm text-inkSoft">kg</span>
          <input
            type="number"
            step="0.001"
            inputMode="decimal"
            value={kg}
            onChange={(e) => setKg(e.target.value)}
            className={field}
          />
        </label>
      ) : (
        <div className="mb-4 flex gap-2">
          <label className="block flex-1">
            <span className="text-sm text-inkSoft">lb</span>
            <input
              type="number"
              inputMode="numeric"
              value={lb}
              onChange={(e) => setLb(e.target.value)}
              className={field}
            />
          </label>
          <label className="block flex-1">
            <span className="text-sm text-inkSoft">oz</span>
            <input
              type="number"
              inputMode="numeric"
              value={oz}
              onChange={(e) => setOz(e.target.value)}
              className={field}
            />
          </label>
        </div>
      )}

      <QuickTimeRow value={when} onChange={setWhen} />
      <SaveButton color={col} label="weight" onClick={handleSave} />
      {initial && onDelete && <DeleteButton onClick={onDelete} />}
    </div>
  )
}
