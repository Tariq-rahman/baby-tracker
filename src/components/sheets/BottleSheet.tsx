import { useState } from 'react'
import type { FeedEvent, FeedContent } from '../../db/schema'
import { isoToLocalInput, localInputToIso, nowLocalInput } from '../../lib/datetime'

interface Props {
  initial?: FeedEvent
  onSave: (event: FeedEvent) => void
  onDelete?: () => void
  onClose: () => void
}

export default function BottleSheet({ initial, onSave, onDelete, onClose }: Props) {
  const [volume, setVolume] = useState(initial ? String(initial.volumeMl) : '')
  const [content, setContent] = useState<FeedContent | undefined>(initial?.content)
  const [when, setWhen] = useState(initial ? isoToLocalInput(initial.occurredAt) : nowLocalInput())

  function handleSave() {
    const volumeMl = Number(volume)
    if (!volumeMl) return
    onSave({
      type: 'feed',
      volumeMl,
      content,
      occurredAt: localInputToIso(when),
      createdAt: initial?.createdAt ?? new Date().toISOString(),
    })
    onClose()
  }

  return (
    <div className="space-y-4 p-4">
      <h2 className="text-lg font-bold">Bottle</h2>
      <label className="block">
        <span className="text-sm text-slate-600">Volume (ml)</span>
        <input
          type="number"
          inputMode="numeric"
          value={volume}
          onChange={(e) => setVolume(e.target.value)}
          className="mt-1 w-full rounded border p-3 text-lg"
        />
      </label>
      <div className="flex gap-2">
        {(['formula', 'breastmilk'] as const).map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setContent(content === c ? undefined : c)}
            className={`flex-1 rounded border p-3 capitalize ${
              content === c ? 'bg-blue-600 text-white' : 'bg-white'
            }`}
          >
            {c}
          </button>
        ))}
      </div>
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
