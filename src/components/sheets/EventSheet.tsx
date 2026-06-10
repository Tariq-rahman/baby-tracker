import type { BabyEvent, FeedEvent, Medication } from '../../db/schema'
import { addEvent, updateEvent, deleteEvent } from '../../db/storage'
import BottleSheet from './BottleSheet'
import NappySheet from './NappySheet'
import DoseSheet from './DoseSheet'
import WeightSheet from './WeightSheet'

interface Props {
  adding: 'bottle' | 'nappy' | 'dose' | 'weight' | null
  editing: BabyEvent | null
  medications: Medication[]
  /** Most recent feed — used to prefill a new feed sheet. */
  lastFeed?: FeedEvent
  onClose: () => void
  onSaved?: (event: BabyEvent) => void
}

export default function EventSheet({ adding, editing, medications, lastFeed, onClose, onSaved }: Props) {
  if (!adding && !editing) return null

  async function handleSave(event: BabyEvent) {
    if (editing?.id) {
      await updateEvent(editing.id, event)
    } else {
      await addEvent(event)
      onSaved?.(event)
    }
  }

  async function handleDelete() {
    if (editing?.id && confirm('Delete this event?')) {
      await deleteEvent(editing.id)
      onClose()
    }
  }

  const kind = editing ? editing.type : adding

  return (
    <div className="fixed inset-0 z-20 flex items-end" onClick={onClose}>
      <div className="scrim-in absolute inset-0" style={{ background: 'rgba(40,28,20,0.4)' }} />
      <div
        className="sheet-in relative w-full rounded-t-sheet bg-surface"
        style={{ boxShadow: '0 -16px 40px #3A2E2726' }}
        onClick={(e) => e.stopPropagation()}
      >
        {(kind === 'feed' || kind === 'bottle') && (
          <BottleSheet
            initial={editing?.type === 'feed' ? editing : undefined}
            lastFeed={editing ? undefined : lastFeed}
            onSave={handleSave}
            onDelete={editing ? handleDelete : undefined}
            onClose={onClose}
          />
        )}
        {kind === 'nappy' && (
          <NappySheet
            initial={editing?.type === 'nappy' ? editing : undefined}
            onSave={handleSave}
            onDelete={editing ? handleDelete : undefined}
            onClose={onClose}
          />
        )}
        {kind === 'dose' && (
          <DoseSheet
            medications={medications}
            initial={editing?.type === 'dose' ? editing : undefined}
            onSave={handleSave}
            onDelete={editing ? handleDelete : undefined}
            onClose={onClose}
          />
        )}
        {kind === 'weight' && (
          <WeightSheet
            initial={editing?.type === 'weight' ? editing : undefined}
            onSave={handleSave}
            onDelete={editing ? handleDelete : undefined}
            onClose={onClose}
          />
        )}
      </div>
    </div>
  )
}
