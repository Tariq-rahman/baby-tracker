import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/schema'
import type { Baby } from '../db/schema'

export function useBaby(): Baby | undefined {
  return useLiveQuery(() => db.babies.get(1), [], undefined)
}
