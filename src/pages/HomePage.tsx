import { useMemo, useRef, useState } from 'react'
import { useEvents, useMedications } from '../hooks/useEvents'
import { useBaby } from '../hooks/useBaby'
import { listEventsForDay, getLastEventOfType } from '../lib/stats'
import { fmtClock, relativeTime } from '../lib/format'
import type { BabyEvent } from '../db/schema'
import type { LogKind } from '../components/LogButtons'
import Header from '../components/Header'
import Clock from '../components/Clock'
import LogButtons from '../components/LogButtons'
import EventList from '../components/EventList'
import Toast, { type ToastData } from '../components/Toast'
import EventSheet from '../components/sheets/EventSheet'

function localToday(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export default function HomePage() {
  const events = useEvents()
  const medications = useMedications()
  const baby = useBaby()
  const [adding, setAdding] = useState<LogKind | null>(null)
  const [editing, setEditing] = useState<BabyEvent | null>(null)
  const [toast, setToast] = useState<ToastData | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const now = new Date()
  const todays = listEventsForDay(events, localToday())

  const counts = useMemo(() => {
    const c = { feed: 0, nappy: 0, dose: 0 }
    for (const e of todays) if (e.type in c) c[e.type as keyof typeof c] += 1
    return c
  }, [todays])

  const lastFeed = getLastEventOfType(events, 'feed')
  const hint = lastFeed ? `Last feed ${relativeTime(lastFeed.occurredAt, now)}` : 'No feeds yet'
  const center = fmtClock(now)

  function showToast(event: BabyEvent) {
    const text =
      event.type === 'feed'
        ? `Feed logged · ${event.volumeMl} ml`
        : event.type === 'nappy'
          ? `${event.nappyType} nappy logged`
          : event.type === 'weight'
            ? 'Weight logged'
            : 'Meds logged'
    setToast({ type: event.type, text })
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 2600)
  }

  return (
    <div>
      <Header
        baby={baby}
        now={now}
        stats={[
          { type: 'feed', count: counts.feed, label: 'feeds' },
          { type: 'nappy', count: counts.nappy, label: 'changes' },
          { type: 'dose', count: counts.dose, label: 'meds' },
        ]}
      />

      <div className="flex flex-col gap-6 px-5 pb-6 pt-1.5">
        <Clock events={events} now={now} centerTime={center.time} centerAmpm={center.ampm} hint={hint} />
        <LogButtons onPick={setAdding} />

        <div>
          <div className="flex items-baseline justify-between px-1 pb-2.5">
            <span className="text-base font-bold text-ink">Today</span>
            <span className="text-xs font-semibold text-inkSoft">{todays.length} events</span>
          </div>
          <EventList
            events={todays}
            now={now}
            medications={medications}
            onSelect={setEditing}
            emptyText="No events yet today."
          />
        </div>
      </div>

      <EventSheet
        adding={adding}
        editing={editing}
        medications={medications}
        lastFeed={lastFeed}
        onSaved={showToast}
        onClose={() => {
          setAdding(null)
          setEditing(null)
        }}
      />
      <Toast data={toast} />
    </div>
  )
}
