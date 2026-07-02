import { useLiveQuery } from 'dexie-react-hooks'
import { listEvents, listMedications } from '../db/storage'
import type { BabyEvent, Medication } from '../db/schema'

// Reuse the storage list* functions so soft-deleted (tombstoned) rows are
// filtered in exactly one place. useLiveQuery still tracks the underlying Dexie
// reads, so the UI re-renders on any change to the table.
export function useEvents(): BabyEvent[] {
  return useLiveQuery(() => listEvents(), [], []) ?? []
}

export function useMedications(): Medication[] {
  return useLiveQuery(() => listMedications(), [], []) ?? []
}
