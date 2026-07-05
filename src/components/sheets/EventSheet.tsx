import type { BabyEvent, FeedEvent, Medication } from '../../db/schema'
import {
  addEvent,
  updateEvent,
  deleteEvent,
  startSleep,
  startBreastFeed,
  type StartDurationResult,
} from '../../db/storage'
import FeedSheet from './FeedSheet'
import NappySheet from './NappySheet'
import DoseSheet from './DoseSheet'
import WeightSheet from './WeightSheet'
import GrowthSheet from './GrowthSheet'
import SleepSheet from './SleepSheet'

interface Props {
  adding: 'bottle' | 'nappy' | 'dose' | 'weight' | 'growth' | 'sleep' | null
  editing: BabyEvent | null
  medications: Medication[]
  /** Most recent feed — used to prefill a new feed sheet. */
  lastFeed?: FeedEvent
  /** True when a sleep is already open — hides "Start sleep now" in the sleep sheet. */
  hasRunningSleep?: boolean
  /** True when a breast feed is already open — hides "Start feed now" in the feed sheet. */
  hasRunningBreastFeed?: boolean
  onClose: () => void
  onSaved?: (event: BabyEvent, resume?: StartDurationResult) => void
}

export default function EventSheet({
  adding,
  editing,
  medications,
  lastFeed,
  hasRunningSleep,
  hasRunningBreastFeed,
  onClose,
  onSaved,
}: Props) {
  if (!adding && !editing) return null

  async function handleSave(event: BabyEvent) {
    if (editing?.id) {
      await updateEvent(editing.id, event)
      return
    }
    // Starting a running duration event (sleep / breast feed) goes through the
    // resume-aware helpers so a just-ended session is reopened, not duplicated (Task 1.6).
    if (event.type === 'sleep' && event.endedAt == null) {
      onSaved?.(event, await startSleep(event.occurredAt))
      return
    }
    if (event.type === 'feed' && event.method === 'breast' && event.endedAt == null) {
      onSaved?.(event, await startBreastFeed(event.occurredAt, event.side))
      return
    }
    await addEvent(event)
    onSaved?.(event)
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
          <FeedSheet
            initial={editing?.type === 'feed' ? editing : undefined}
            lastFeed={editing ? undefined : lastFeed}
            hasRunningBreastFeed={hasRunningBreastFeed}
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
        {kind === 'growth' && (
          <GrowthSheet
            initial={editing?.type === 'growth' ? editing : undefined}
            onSave={handleSave}
            onDelete={editing ? handleDelete : undefined}
            onClose={onClose}
          />
        )}
        {kind === 'sleep' && (
          <SleepSheet
            initial={editing?.type === 'sleep' ? editing : undefined}
            hasRunning={hasRunningSleep}
            onSave={handleSave}
            onDelete={editing ? handleDelete : undefined}
            onClose={onClose}
          />
        )}
      </div>
    </div>
  )
}
