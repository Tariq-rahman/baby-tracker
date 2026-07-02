import { describe, expect, it } from 'vitest'
import {
  babyToRow,
  babyFromRow,
  medicationToRow,
  medicationFromRow,
  eventToRow,
  eventFromRow,
  type EventToRowCtx,
  type EventFromRowCtx,
} from './mapping'
import type { Baby, Medication, BabyEvent } from '../../db/schema'

const HH = 'household-1'
const T = Date.UTC(2026, 6, 2, 10, 0, 0) // 2026-07-02T10:00:00Z
const T_ISO = new Date(T).toISOString()

describe('babyToRow / babyFromRow', () => {
  it('maps a live baby to a row and back (round-trip)', () => {
    const baby: Baby = {
      id: 1,
      uid: 'baby-uid',
      householdId: HH,
      name: 'Ada',
      dateOfBirth: '2026-01-01',
      updatedAt: T,
      deletedAt: null,
    }
    const row = babyToRow(baby, HH)
    expect(row).toEqual({
      id: 'baby-uid',
      household_id: HH,
      name: 'Ada',
      date_of_birth: '2026-01-01',
      updated_at: T_ISO,
      deleted_at: null,
    })
    const back = babyFromRow(row)
    expect(back).toEqual({
      uid: 'baby-uid',
      householdId: HH,
      name: 'Ada',
      dateOfBirth: '2026-01-01',
      updatedAt: T,
      deletedAt: null,
    })
  })

  it('maps a tombstone deletedAt to/from ISO', () => {
    const baby: Baby = {
      id: 1,
      uid: 'baby-uid',
      householdId: HH,
      name: 'Ada',
      dateOfBirth: '2026-01-01',
      updatedAt: T,
      deletedAt: T,
    }
    expect(babyToRow(baby, HH).deleted_at).toBe(T_ISO)
    expect(babyFromRow(babyToRow(baby, HH)).deletedAt).toBe(T)
  })
})

describe('medicationToRow / medicationFromRow', () => {
  it('round-trips numeric dose and unit', () => {
    const med: Medication = {
      id: 5,
      uid: 'med-uid',
      householdId: HH,
      name: 'Vitamin D',
      defaultDose: 400,
      unit: 'IU',
      updatedAt: T,
      deletedAt: null,
    }
    const row = medicationToRow(med, HH)
    expect(row).toEqual({
      id: 'med-uid',
      household_id: HH,
      name: 'Vitamin D',
      default_dose: 400,
      unit: 'IU',
      updated_at: T_ISO,
      deleted_at: null,
    })
    expect(medicationFromRow(row)).toEqual({
      uid: 'med-uid',
      householdId: HH,
      name: 'Vitamin D',
      defaultDose: 400,
      unit: 'IU',
      updatedAt: T,
      deletedAt: null,
    })
  })
})

describe('eventToRow (payload packing)', () => {
  const ctx: EventToRowCtx = {
    householdId: HH,
    babyUid: 'baby-uid',
    medUidByLocalId: new Map([[5, 'med-uid']]),
  }

  const cases: { name: string; event: BabyEvent; wantPayload: Record<string, unknown> }[] = [
    {
      name: 'feed with content',
      event: {
        type: 'feed',
        uid: 'e1',
        occurredAt: T_ISO,
        createdAt: T_ISO,
        updatedAt: T,
        deletedAt: null,
        volumeMl: 120,
        content: 'formula',
      },
      wantPayload: { volumeMl: 120, content: 'formula' },
    },
    {
      name: 'feed without content packs null',
      event: {
        type: 'feed',
        uid: 'e1',
        occurredAt: T_ISO,
        createdAt: T_ISO,
        updatedAt: T,
        deletedAt: null,
        volumeMl: 120,
      },
      wantPayload: { volumeMl: 120, content: null },
    },
    {
      name: 'nappy with size',
      event: {
        type: 'nappy',
        uid: 'e2',
        occurredAt: T_ISO,
        createdAt: T_ISO,
        updatedAt: T,
        deletedAt: null,
        nappyType: 'dirty',
        size: 'large',
      },
      wantPayload: { nappyType: 'dirty', size: 'large' },
    },
    {
      name: 'weight',
      event: {
        type: 'weight',
        uid: 'e3',
        occurredAt: T_ISO,
        createdAt: T_ISO,
        updatedAt: T,
        deletedAt: null,
        grams: 4200,
      },
      wantPayload: { grams: 4200 },
    },
    {
      name: 'dose translates local medicationId to uid',
      event: {
        type: 'dose',
        uid: 'e4',
        occurredAt: T_ISO,
        createdAt: T_ISO,
        updatedAt: T,
        deletedAt: null,
        medicationId: 5,
        doseAmount: 2.5,
      },
      wantPayload: { medicationUid: 'med-uid', doseAmount: 2.5 },
    },
    {
      name: 'dose with unknown medicationId packs null uid',
      event: {
        type: 'dose',
        uid: 'e5',
        occurredAt: T_ISO,
        createdAt: T_ISO,
        updatedAt: T,
        deletedAt: null,
        medicationId: 999,
        doseAmount: 1,
      },
      wantPayload: { medicationUid: null, doseAmount: 1 },
    },
  ]

  for (const c of cases) {
    it(c.name, () => {
      const row = eventToRow(c.event, ctx)
      expect(row.payload).toEqual(c.wantPayload)
      expect(row.baby_id).toBe('baby-uid')
      expect(row.household_id).toBe(HH)
      expect(row.updated_at).toBe(T_ISO)
    })
  }
})

describe('eventFromRow (payload unpacking + round-trip)', () => {
  const toCtx: EventToRowCtx = {
    householdId: HH,
    babyUid: 'baby-uid',
    medUidByLocalId: new Map([[5, 'med-uid']]),
  }
  const fromCtx: EventFromRowCtx = { medLocalIdByUid: new Map([['med-uid', 5]]) }

  const events: BabyEvent[] = [
    {
      type: 'feed',
      uid: 'e1',
      householdId: HH,
      occurredAt: T_ISO,
      createdAt: T_ISO,
      updatedAt: T,
      deletedAt: null,
      volumeMl: 120,
      content: 'breastmilk',
    },
    {
      type: 'nappy',
      uid: 'e2',
      householdId: HH,
      occurredAt: T_ISO,
      createdAt: T_ISO,
      updatedAt: T,
      deletedAt: null,
      nappyType: 'both',
      size: 'medium',
    },
    {
      type: 'weight',
      uid: 'e3',
      householdId: HH,
      occurredAt: T_ISO,
      createdAt: T_ISO,
      updatedAt: T,
      deletedAt: null,
      grams: 4200,
    },
    {
      type: 'dose',
      uid: 'e4',
      householdId: HH,
      occurredAt: T_ISO,
      createdAt: T_ISO,
      updatedAt: T,
      deletedAt: null,
      medicationId: 5,
      doseAmount: 2.5,
    },
  ]

  for (const e of events) {
    it(`round-trips a ${e.type} event`, () => {
      const back = eventFromRow(eventToRow(e, toCtx), fromCtx)
      expect(back).toEqual(e)
    })
  }

  it('maps a dose with an unresolvable medication uid to medicationId 0', () => {
    const row = eventToRow(events[3], toCtx)
    const back = eventFromRow(row, { medLocalIdByUid: new Map() })
    expect(back).toMatchObject({ type: 'dose', medicationId: 0, doseAmount: 2.5 })
  })
})
