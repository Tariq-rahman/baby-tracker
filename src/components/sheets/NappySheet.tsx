import { useState } from 'react'
import type { NappyEvent, NappyType, NappySize } from '../../db/schema'
import { isoToLocalInput, localInputToIso, nowLocalInput } from '../../lib/datetime'

interface Props {
  initial?: NappyEvent
  onSave: (event: NappyEvent) => void
  onDelete?: () => void
  onClose: () => void
}

const needsSize = (t: NappyType) => t === 'dirty' || t === 'both'

export default function NappySheet({ initial, onSave, onDelete, onClose }: Props) {
  const [nappyType, setNappyType] = useState<NappyType | undefined>(initial?.nappyType)
  const [size, setSize] = useState<NappySize | undefined>(initial?.size)
  const [when, setWhen] = useState(initial ? isoToLocalInput(initial.occurredAt) : nowLocalInput())

  function handleSave() {
    if (!nappyType) return
    if (needsSize(nappyType) && !size) return
    onSave({
      type: 'nappy',
      nappyType,
      size: needsSize(nappyType) ? size : undefined,
      occurredAt: localInputToIso(when),
      createdAt: initial?.createdAt ?? new Date().toISOString(),
    })
    onClose()
  }

  return (
    <div className="space-y-4 p-4">
      <h2 className="text-lg font-bold">Nappy</h2>
      <div className="flex gap-2">
        {(['wet', 'dirty', 'both'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => {
              setNappyType(t)
              if (!needsSize(t)) setSize(undefined)
            }}
            className={`flex-1 rounded border p-3 capitalize ${
              nappyType === t ? 'bg-blue-600 text-white' : 'bg-white'
            }`}
          >
            {t}
          </button>
        ))}
      </div>
      {nappyType && needsSize(nappyType) && (
        <div className="flex gap-2">
          {(['small', 'medium', 'large'] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSize(s)}
              className={`flex-1 rounded border p-3 capitalize ${
                size === s ? 'bg-blue-600 text-white' : 'bg-white'
              }`}
            >
              {s}
            </button>
          ))}
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
