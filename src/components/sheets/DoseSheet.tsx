import { useState } from 'react'
import type { DoseEvent, Medication } from '../../db/schema'
import { isoToLocalInput, localInputToIso, nowLocalInput } from '../../lib/datetime'

interface Props {
  medications: Medication[]
  initial?: DoseEvent
  onSave: (event: DoseEvent) => void
  onDelete?: () => void
  onClose: () => void
}

export default function DoseSheet({ medications, initial, onSave, onDelete, onClose }: Props) {
  const [medId, setMedId] = useState<number | undefined>(initial?.medicationId ?? medications[0]?.id)
  const selected = medications.find((m) => m.id === medId)
  const [dose, setDose] = useState(
    initial ? String(initial.doseAmount) : String(medications[0]?.defaultDose ?? ''),
  )
  const [when, setWhen] = useState(initial ? isoToLocalInput(initial.occurredAt) : nowLocalInput())

  if (medications.length === 0) {
    return (
      <div className="space-y-4 p-4">
        <h2 className="text-lg font-bold">Dose</h2>
        <p className="text-slate-600">No medications yet. Add one in Settings first.</p>
        <button onClick={onClose} className="w-full rounded border p-3">
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
      occurredAt: localInputToIso(when),
      createdAt: initial?.createdAt ?? new Date().toISOString(),
    })
    onClose()
  }

  return (
    <div className="space-y-4 p-4">
      <h2 className="text-lg font-bold">Dose</h2>
      <label className="block">
        <span className="text-sm text-slate-600">Medication</span>
        <select
          value={medId}
          onChange={(e) => {
            const id = Number(e.target.value)
            setMedId(id)
            const m = medications.find((x) => x.id === id)
            setDose(String(m?.defaultDose ?? ''))
          }}
          className="mt-1 w-full rounded border p-3"
        >
          {medications.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="text-sm text-slate-600">Dose ({selected?.unit})</span>
        <input
          type="number"
          inputMode="decimal"
          value={dose}
          onChange={(e) => setDose(e.target.value)}
          className="mt-1 w-full rounded border p-3 text-lg"
        />
      </label>
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
