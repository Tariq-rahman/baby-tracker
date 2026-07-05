import { useState } from 'react'
import type { GrowthEvent } from '../../db/schema'
import { cmToMm, inchesToMm, mmToCm } from '../../lib/units'
import { eventColor, palette } from '../../lib/theme'
import { DeleteButton, DragHandle, QuickTimeRow, SaveButton, SheetHeader } from './sheetParts'

interface Props {
  initial?: GrowthEvent
  onSave: (event: GrowthEvent) => void
  onDelete?: () => void
  onClose: () => void
}

const col = eventColor.growth
const field = 'mt-1 w-full rounded-2xl border border-faint bg-surface p-3 text-lg text-ink'

export default function GrowthSheet({ initial, onSave, onDelete, onClose }: Props) {
  // Prefill is always in cm (metric); toggling to inches expects a fresh entry,
  // mirroring WeightSheet's kg/lb-oz behaviour.
  const [mode, setMode] = useState<'metric' | 'imperial'>('metric')
  const [height, setHeight] = useState(initial?.heightMm != null ? String(mmToCm(initial.heightMm)) : '')
  const [head, setHead] = useState(
    initial?.headCircumferenceMm != null ? String(mmToCm(initial.headCircumferenceMm)) : '',
  )
  const [when, setWhen] = useState(() => (initial ? new Date(initial.occurredAt) : new Date()))

  const unit = mode === 'metric' ? 'cm' : 'in'

  function handleSave() {
    const toMm = mode === 'metric' ? cmToMm : inchesToMm
    const parse = (s: string): number | undefined => {
      const n = Number(s)
      return s.trim() && n > 0 ? toMm(n) : undefined
    }
    const heightMm = parse(height)
    const headCircumferenceMm = parse(head)
    if (heightMm == null && headCircumferenceMm == null) return // need at least one metric
    onSave({
      type: 'growth',
      ...(heightMm != null ? { heightMm } : {}),
      ...(headCircumferenceMm != null ? { headCircumferenceMm } : {}),
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
      <SheetHeader type="growth" title={initial ? 'Edit growth' : 'Log growth'} onClose={onClose} />

      <div className="mb-4 flex gap-2">
        <button type="button" {...toggle('metric')} onClick={() => setMode('metric')}>
          cm
        </button>
        <button type="button" {...toggle('imperial')} onClick={() => setMode('imperial')}>
          in
        </button>
      </div>

      <label className="mb-4 block">
        <span className="text-sm text-inkSoft">Height ({unit})</span>
        <input
          type="number"
          step="0.1"
          inputMode="decimal"
          value={height}
          onChange={(e) => setHeight(e.target.value)}
          className={field}
        />
      </label>

      <label className="mb-4 block">
        <span className="text-sm text-inkSoft">Head circumference ({unit})</span>
        <input
          type="number"
          step="0.1"
          inputMode="decimal"
          value={head}
          onChange={(e) => setHead(e.target.value)}
          className={field}
        />
      </label>

      <p className="mb-4 -mt-2 text-xs text-inkSoft">Fill in either or both.</p>

      <QuickTimeRow value={when} onChange={setWhen} />
      <SaveButton color={col} label="growth" onClick={handleSave} />
      {initial && onDelete && <DeleteButton onClick={onDelete} />}
    </div>
  )
}
