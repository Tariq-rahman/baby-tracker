import { useState } from 'react'
import type { DoseEvent, Medication } from '../../db/schema'
import { eventColor, palette } from '../../lib/theme'
import { DeleteButton, DragHandle, QuickTimeRow, SaveButton, SheetHeader } from './sheetParts'

interface Props {
  medications: Medication[]
  initial?: DoseEvent
  onSave: (event: DoseEvent) => void
  onDelete?: () => void
  onClose: () => void
}

const col = eventColor.dose

export default function DoseSheet({ medications, initial, onSave, onDelete, onClose }: Props) {
  const [medId, setMedId] = useState<number | undefined>(initial?.medicationId ?? medications[0]?.id)
  const selected = medications.find((m) => m.id === medId)
  const [dose, setDose] = useState(
    initial ? String(initial.doseAmount) : String(medications[0]?.defaultDose ?? ''),
  )
  const [when, setWhen] = useState(() => (initial ? new Date(initial.occurredAt) : new Date()))

  if (medications.length === 0) {
    return (
      <div className="px-5 pb-7 pt-3.5">
        <DragHandle />
        <SheetHeader type="dose" title="Log meds" onClose={onClose} />
        <p className="mb-4 text-inkSoft">No medications yet. Add one in Settings first.</p>
        <button onClick={onClose} className="press w-full rounded-2xl border border-faint py-3 font-semibold text-ink">
          Close
        </button>
      </div>
    )
  }

  function handleSave() {
    if (medId === undefined) return
    const doseAmount = Number(dose)
    if (!doseAmount) return
    onSave({
      type: 'dose',
      medicationId: medId,
      doseAmount,
      occurredAt: when.toISOString(),
      createdAt: initial?.createdAt ?? new Date().toISOString(),
    })
    onClose()
  }

  return (
    <div className="px-5 pb-7 pt-3.5">
      <DragHandle />
      <SheetHeader type="dose" title={initial ? 'Edit meds' : 'Log meds'} onClose={onClose} />

      <div className="mb-3 flex flex-wrap gap-2">
        {medications.map((m) => {
          const active = medId === m.id
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => {
                setMedId(m.id)
                setDose(String(m.defaultDose ?? ''))
              }}
              className="press rounded-2xl px-3.5 py-2.5 text-sm font-bold"
              style={
                active
                  ? { border: `1.8px solid ${col}`, background: `${col}1f`, color: col }
                  : { border: `1.6px solid ${palette.faint}`, background: palette.surface, color: palette.inkSoft }
              }
            >
              {m.name}
            </button>
          )
        })}
      </div>

      <label className="mb-4 block">
        <span className="text-sm text-inkSoft">Dose ({selected?.unit})</span>
        <input
          type="number"
          inputMode="decimal"
          value={dose}
          onChange={(e) => setDose(e.target.value)}
          className="mt-1 w-full rounded-2xl border border-faint bg-surface p-3 text-lg text-ink"
        />
      </label>

      <QuickTimeRow value={when} onChange={setWhen} />
      <SaveButton color={col} label="meds" onClick={handleSave} />
      {initial && onDelete && <DeleteButton onClick={onDelete} />}
    </div>
  )
}
