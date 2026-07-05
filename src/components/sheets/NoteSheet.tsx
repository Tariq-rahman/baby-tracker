import { useState } from 'react'
import type { NoteEvent } from '../../db/schema'
import { eventColor } from '../../lib/theme'
import { DeleteButton, DragHandle, QuickTimeRow, SaveButton, SheetHeader } from './sheetParts'

interface Props {
  initial?: NoteEvent
  onSave: (event: NoteEvent) => void
  onDelete?: () => void
  onClose: () => void
}

const col = eventColor.note

export default function NoteSheet({ initial, onSave, onDelete, onClose }: Props) {
  const [text, setText] = useState(initial?.text ?? '')
  const [when, setWhen] = useState(() => (initial ? new Date(initial.occurredAt) : new Date()))

  const trimmed = text.trim()

  function handleSave() {
    if (!trimmed) return
    onSave({
      type: 'note',
      text: trimmed,
      occurredAt: when.toISOString(),
      createdAt: initial?.createdAt ?? new Date().toISOString(),
    })
    onClose()
  }

  return (
    <div className="px-5 pb-7 pt-3.5">
      <DragHandle />
      <SheetHeader type="note" title={initial ? 'Edit note' : 'Add note'} onClose={onClose} />

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="What happened? (e.g. first smile, seems congested)"
        rows={3}
        autoFocus
        className="mb-4 w-full resize-none rounded-2xl border border-faint bg-cream p-3 text-ink placeholder:text-inkSoft"
      />

      <QuickTimeRow value={when} onChange={setWhen} />
      <SaveButton color={col} label="note" onClick={handleSave} />
      {initial && onDelete && <DeleteButton onClick={onDelete} />}
    </div>
  )
}
