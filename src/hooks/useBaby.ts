import { useLiveQuery } from 'dexie-react-hooks'
import { db, DEFAULT_ENABLED_EVENT_TYPES } from '../db/schema'
import { getEnabledEventTypes } from '../db/storage'
import type { Baby, EventType } from '../db/schema'

export function useBaby(): Baby | undefined {
  return useLiveQuery(() => db.babies.get(1), [], undefined)
}

/** The household's Enabled Event Types, reactive to changes on the baby row (ADR-0004). */
export function useEnabledEventTypes(): EventType[] {
  const initial = [...DEFAULT_ENABLED_EVENT_TYPES]
  return useLiveQuery(() => getEnabledEventTypes(), [], initial) ?? initial
}
