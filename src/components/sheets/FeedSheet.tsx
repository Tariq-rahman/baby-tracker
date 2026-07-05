import { useState } from 'react'
import type { FeedEvent, FeedMethod } from '../../db/schema'
import { eventColor, palette } from '../../lib/theme'
import BottleSheet from './BottleSheet'
import BreastSheet from './BreastSheet'
import { DragHandle, SheetHeader } from './sheetParts'

interface Props {
  /** Present when editing an existing feed — its method is then fixed. */
  initial?: FeedEvent
  /** When adding, prefill the bottle volume / toggle from the last feed. */
  lastFeed?: FeedEvent
  /** A breast feed is already in progress → hide "Start feed now" (one running at a time). */
  hasRunningBreastFeed?: boolean
  onSave: (event: FeedEvent) => void
  onDelete?: () => void
  onClose: () => void
}

const col = eventColor.feed

const methodOf = (feed: FeedEvent | undefined): FeedMethod | undefined =>
  feed ? (feed.method === 'breast' ? 'breast' : 'bottle') : undefined

/**
 * The feed sheet: a bottle/breast method toggle over the shared header, then the
 * chosen body (ADR-0007). Editing an existing feed locks the method to what it is
 * (a bottle can't become a breast feed); adding prefills the toggle from the last feed.
 */
export default function FeedSheet({
  initial,
  lastFeed,
  hasRunningBreastFeed,
  onSave,
  onDelete,
  onClose,
}: Props) {
  const editingMethod = methodOf(initial)
  const [picked, setPicked] = useState<FeedMethod>(methodOf(lastFeed) ?? 'bottle')
  const method = editingMethod ?? picked

  return (
    <div className="px-5 pb-7 pt-3.5">
      <DragHandle />
      <SheetHeader type="feed" title={initial ? 'Edit feed' : 'Log feed'} onClose={onClose} />

      {/* Method is only choosable when adding — editing keeps the feed's own method. */}
      {!initial && (
        <div className="mb-4 flex gap-2">
          {(['bottle', 'breast'] as const).map((m) => {
            const active = method === m
            return (
              <button
                key={m}
                type="button"
                onClick={() => setPicked(m)}
                className="press flex-1 rounded-2xl px-2 py-3 text-[15px] font-bold capitalize"
                style={
                  active
                    ? { border: `1.8px solid ${col}`, background: `${col}1f`, color: col }
                    : {
                        border: `1.6px solid ${palette.faint}`,
                        background: palette.surface,
                        color: palette.inkSoft,
                      }
                }
              >
                {m}
              </button>
            )
          })}
        </div>
      )}

      {method === 'breast' ? (
        <BreastSheet
          initial={initial?.method === 'breast' ? initial : undefined}
          hasRunning={hasRunningBreastFeed}
          onSave={onSave}
          onDelete={onDelete}
          onClose={onClose}
        />
      ) : (
        <BottleSheet
          initial={initial?.method !== 'breast' ? initial : undefined}
          lastFeed={initial ? undefined : lastFeed}
          onSave={onSave}
          onDelete={onDelete}
          onClose={onClose}
        />
      )}
    </div>
  )
}
