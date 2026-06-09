import { describe, it, expect } from 'vitest'
import { serializeBackup, parseBackup } from './backup'
import type { Baby, Medication, BabyEvent } from '../db/schema'

const baby: Baby = { id: 1, name: 'Sam', dateOfBirth: '2026-05-01' }
const medications: Medication[] = [{ id: 1, name: 'Vitamin D', defaultDose: 400, unit: 'IU' }]
const events: BabyEvent[] = [
  { id: 1, type: 'feed', volumeMl: 120, occurredAt: '2026-06-09T08:00:00.000Z', createdAt: '2026-06-09T08:00:00.000Z' },
]

describe('backup round-trip', () => {
  it('serializes and parses back to equal data', () => {
    const json = serializeBackup({ baby, medications, events })
    const parsed = parseBackup(json)
    expect(parsed).toEqual({ baby, medications, events })
  })

  it('includes a version field in the serialized output', () => {
    const json = serializeBackup({ baby, medications, events })
    expect(JSON.parse(json).version).toBe(1)
  })
})

describe('parseBackup validation', () => {
  it('throws on malformed JSON', () => {
    expect(() => parseBackup('not json')).toThrow()
  })
  it('throws when the version is unsupported', () => {
    expect(() => parseBackup(JSON.stringify({ version: 99, baby, medications, events }))).toThrow(
      /unsupported backup version/i,
    )
  })
})
