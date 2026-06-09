import { describe, it, expect } from 'vitest'
import { isoToLocalInput, localInputToIso } from './datetime'

// Tests pin TZ=UTC (see package.json test script), so local == UTC here.
describe('isoToLocalInput', () => {
  it('formats an ISO datetime as YYYY-MM-DDTHH:mm', () => {
    expect(isoToLocalInput('2026-06-09T08:05:00.000Z')).toBe('2026-06-09T08:05')
  })
})

describe('localInputToIso', () => {
  it('round-trips with isoToLocalInput (to the minute)', () => {
    const iso = '2026-06-09T08:05:00.000Z'
    expect(localInputToIso(isoToLocalInput(iso))).toBe(iso)
  })
})
