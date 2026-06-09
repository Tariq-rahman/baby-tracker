import type { BabyEvent, Medication } from '../../db/schema'
import { addEvent, updateEvent, deleteEvent } from '../../db/storage'
import BottleSheet from './BottleSheet'
import NappySheet from './NappySheet'
import DoseSheet from './DoseSheet'
import WeightSheet from './WeightSheet'

interface Props {
  adding: 'bottle' | 'nappy' | 'dose' | 'weight' | null
  editing: BabyEvent | null
  medications: Medication[]
  onClose: () => void
}

export default function EventSheet({ adding, editing, medications, onClose }: Props) {
  if (!adding && !editing) return null

  async function handleSave(event: BabyEvent) {
    if (editing?.id) {
      await updateEvent(editing.id, event)
    } else {
      await addEvent(event)
    }
  }

  async function handleDelete() {
    if (editing?.id && confirm('Delete this event?')) {
      await deleteEvent(editing.id)
      onClose()
    }
  }

  // Decide which sheet to render: the editing event's type wins, else the adding kind.
  const kind = editing ? editing.type : adding

  return (
    <div className="fixed inset-0 z-10 flex items-end bg-black/40" onClick={onClose}>
      <div className="w-full rounded-t-2xl bg-white" onClick={(e) => e.stopPropagation()}>
        {(kind === 'feed' || kind === 'bottle') && (
          <BottleSheet
            initial={editing?.type === 'feed' ? editing : undefined}
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
