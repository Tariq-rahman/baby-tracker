import { useState } from 'react'
import type { NappyEvent, NappyType, NappySize } from '../../db/schema'
import { eventColor } from '../../lib/theme'
import { Chip, DeleteButton, DragHandle, QuickTimeRow, SaveButton, SheetHeader } from './sheetParts'

interface Props {
  initial?: NappyEvent
  onSave: (event: NappyEvent) => void
  onDelete?: () => void
  onClose: () => void
}

const needsSize = (t: NappyType) => t === 'dirty' || t === 'both'
const col = eventColor.nappy

export default function NappySheet({ initial, onSave, onDelete, onClose }: Props) {
  const [nappyType, setNappyType] = useState<NappyType | undefined>(initial?.nappyType)
  const [size, setSize] = useState<NappySize | undefined>(initial?.size)
  const [when, setWhen] = useState(() => (initial ? new Date(initial.occurredAt) : new Date()))

  function handleSave() {
    if (!nappyType) return
    if (needsSize(nappyType) && !size) return
    onSave({
      type: 'nappy',
      nappyType,
      size: needsSize(nappyType) ? size : undefined,
      occurredAt: when.toISOString(),
      createdAt: initial?.createdAt ?? new Date().toISOString(),
    })
    onClose()
  }

  return (
    <div className="px-5 pb-7 pt-3.5">
      <DragHandle />
      <SheetHeader type="nappy" title={initial ? 'Edit change' : 'Log change'} onClose={onClose} />

      <div className="mb-4 flex gap-2">
        {(['wet', 'dirty', 'both'] as const).map((t) => (
          <Chip
            key={t}
            active={nappyType === t}
            color={col}
            onClick={() => {
              setNappyType(t)
              if (!needsSize(t)) setSize(undefined)
            }}
          >
            {t}
          </Chip>
        ))}
      </div>

      {nappyType && needsSize(nappyType) && (
        <div className="mb-4 flex gap-2">
          {(['small', 'medium', 'large'] as const).map((s) => (
            <Chip key={s} active={size === s} color={col} onClick={() => setSize(s)}>
              {s}
            </Chip>
          ))}
        </div>
      )}

      <QuickTimeRow value={when} onChange={setWhen} />
      <SaveButton color={col} label="nappy" onClick={handleSave} />
      {initial && onDelete && <DeleteButton onClick={onDelete} />}
    </div>
  )
}
