import type { Baby, Medication, BabyEvent } from '../db/schema'

export interface BackupData {
  baby: Baby | undefined
  medications: Medication[]
  events: BabyEvent[]
}

const BACKUP_VERSION = 1

export function serializeBackup(data: BackupData): string {
  return JSON.stringify({ version: BACKUP_VERSION, ...data }, null, 2)
}

export function parseBackup(json: string): BackupData {
  const obj = JSON.parse(json)
  if (obj.version !== BACKUP_VERSION) {
    throw new Error(`unsupported backup version: ${obj.version}`)
  }
  return { baby: obj.baby, medications: obj.medications ?? [], events: obj.events ?? [] }
}
