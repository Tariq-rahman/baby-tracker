import type { BabyEvent } from '../db/schema'
import { gramsToKg } from '../lib/units'

function timeOf(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export function describeEvent(e: BabyEvent): string {
  switch (e.type) {
    case 'feed':
      return `Bottle ${e.volumeMl}ml${e.content ? ` (${e.content})` : ''}`
    case 'nappy':
      return `Nappy ${e.nappyType}${e.size ? ` (${e.size})` : ''}`
    case 'weight':
      return `Weight ${gramsToKg(e.grams).toFixed(3)} kg`
    case 'dose':
      return `Dose ${e.doseAmount}`
  }
}

interface Props {
  event: BabyEvent
  onClick?: () => void
}

export default function EventRow({ event, onClick }: Props) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center justify-between border-b bg-white px-4 py-3 text-left"
    >
      <span>{describeEvent(event)}</span>
      <span className="text-sm text-slate-400">{timeOf(event.occurredAt)}</span>
    </button>
  )
}
