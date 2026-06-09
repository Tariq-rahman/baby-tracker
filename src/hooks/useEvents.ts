import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/schema'
import type { BabyEvent, Medication } from '../db/schema'

export function useEvents(): BabyEvent[] {
  return useLiveQuery(() => db.events.orderBy('occurredAt').reverse().toArray(), [], []) ?? []
}

export function useMedications(): Medication[] {
  return useLiveQuery(() => db.medications.toArray(), [], []) ?? []
}
