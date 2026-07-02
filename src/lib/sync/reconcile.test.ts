import { describe, expect, it } from 'vitest'
import { mergeRecord, nextCursor, type SyncRecord } from './reconcile'

function rec(updatedAt: number, deletedAt: number | null = null): SyncRecord {
  return { id: 'x', updatedAt, deletedAt }
}

describe('mergeRecord (last-write-wins)', () => {
  const cases: {
    name: string
    local: SyncRecord | undefined
    remote: SyncRecord
    want: 'local' | 'remote'
  }[] = [
    { name: 'no local record: remote wins', local: undefined, remote: rec(100), want: 'remote' },
    { name: 'remote strictly newer: remote wins', local: rec(100), remote: rec(200), want: 'remote' },
    { name: 'local strictly newer: local kept', local: rec(200), remote: rec(100), want: 'local' },
    {
      name: 'equal ts, remote is tombstone: tombstone wins',
      local: rec(100),
      remote: rec(100, 100),
      want: 'remote',
    },
    {
      name: 'equal ts, local is tombstone: tombstone wins',
      local: rec(100, 100),
      remote: rec(100),
      want: 'local',
    },
    {
      name: 'equal ts, both live: remote wins (deterministic server convergence)',
      local: rec(100),
      remote: rec(100),
      want: 'remote',
    },
    {
      name: 'equal ts, both tombstones: remote wins (deterministic)',
      local: rec(100, 100),
      remote: rec(100, 100),
      want: 'remote',
    },
  ]

  for (const c of cases) {
    it(c.name, () => {
      const winner = mergeRecord(c.local, c.remote)
      expect(winner).toBe(c.want === 'remote' ? c.remote : c.local)
    })
  }

  it('is deterministic: same inputs always yield the same winner', () => {
    const local = rec(150)
    const remote = rec(150, 150)
    expect(mergeRecord(local, remote)).toBe(mergeRecord(local, remote))
  })
})

describe('nextCursor', () => {
  const cases: {
    name: string
    records: number[]
    cursor: number
    want: number
  }[] = [
    { name: 'empty batch leaves cursor unchanged', records: [], cursor: 500, want: 500 },
    { name: 'advances to max updatedAt in batch', records: [100, 300, 200], cursor: 50, want: 300 },
    { name: 'never regresses below current cursor', records: [10, 20], cursor: 500, want: 500 },
    { name: 'mixed above and below: takes overall max', records: [10, 900, 400], cursor: 500, want: 900 },
  ]

  for (const c of cases) {
    it(c.name, () => {
      const records = c.records.map((u) => rec(u))
      expect(nextCursor(records, c.cursor)).toBe(c.want)
    })
  }
})
