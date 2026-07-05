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
      settings: {},
      updated_at: T_ISO,
      deleted_at: null,
    })
    const back = babyFromRow(row)
    // No settings on the row ⇒ omitted locally, so defaults apply.
    expect(back).toEqual({
      uid: 'baby-uid',
      householdId: HH,
      name: 'Ada',
      dateOfBirth: '2026-01-01',
      updatedAt: T,
      deletedAt: null,
    })
  })

  it('round-trips enabled event types through settings', () => {
    const baby: Baby = {
      id: 1,
      uid: 'baby-uid',
      householdId: HH,
      name: 'Ada',
      dateOfBirth: '2026-01-01',
      settings: { enabledEventTypes: ['feed', 'sleep'] },
      updatedAt: T,
      deletedAt: null,
    }
    const row = babyToRow(baby, HH)
    expect(row.settings).toEqual({ enabledEventTypes: ['feed', 'sleep'] })
    expect(babyFromRow(row).settings).toEqual({ enabledEventTypes: ['feed', 'sleep'] })
  })

  it('treats an empty settings object as no settings (defaults apply)', () => {
    const row = babyToRow(
      { id: 1, uid: 'u', householdId: HH, name: 'Ada', dateOfBirth: '2026-01-01', updatedAt: T, deletedAt: null },
      HH,
    )
    expect(babyFromRow(row).settings).toBeUndefined()
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
      wantPayload: { method: 'bottle', volumeMl: 120, content: 'formula' },
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
      wantPayload: { method: 'bottle', volumeMl: 120, content: null },
    },
    {
      name: 'breast feed in progress packs side + endedAt null',
      event: {
        type: 'feed',
        method: 'breast',
        uid: 'bf1',
        occurredAt: T_ISO,
        createdAt: T_ISO,
        updatedAt: T,
        deletedAt: null,
        side: 'left',
        endedAt: null,
      },
      wantPayload: { method: 'breast', side: 'left', endedAt: null },
    },
    {
      name: 'finished breast feed packs its end',
      event: {
        type: 'feed',
        method: 'breast',
        uid: 'bf2',
        occurredAt: T_ISO,
        createdAt: T_ISO,
        updatedAt: T,
        deletedAt: null,
        side: 'both',
        endedAt: T_ISO,
      },
      wantPayload: { method: 'breast', side: 'both', endedAt: T_ISO },
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
    {
      name: 'running sleep packs endedAt null',
      event: {
        type: 'sleep',
        uid: 'e6',
        occurredAt: T_ISO,
        createdAt: T_ISO,
        updatedAt: T,
        deletedAt: null,
        endedAt: null,
      },
      wantPayload: { endedAt: null },
    },
    {
      name: 'finished sleep packs its end',
      event: {
        type: 'sleep',
        uid: 'e7',
        occurredAt: T_ISO,
        createdAt: T_ISO,
        updatedAt: T,
        deletedAt: null,
        endedAt: T_ISO,
      },
      wantPayload: { endedAt: T_ISO },
    },
    {
      name: 'growth packs both metrics',
      event: {
        type: 'growth',
        uid: 'e8',
        occurredAt: T_ISO,
        createdAt: T_ISO,
        updatedAt: T,
        deletedAt: null,
        heightMm: 525,
        headCircumferenceMm: 380,
      },
      wantPayload: { heightMm: 525, headCircumferenceMm: 380 },
    },
    {
      name: 'growth with only height packs the other metric as null',
      event: {
        type: 'growth',
        uid: 'e9',
        occurredAt: T_ISO,
        createdAt: T_ISO,
        updatedAt: T,
        deletedAt: null,
        heightMm: 525,
      },
      wantPayload: { heightMm: 525, headCircumferenceMm: null },
    },
    {
      name: 'note packs its text',
      event: {
        type: 'note',
        uid: 'e10',
        occurredAt: T_ISO,
        createdAt: T_ISO,
        updatedAt: T,
        deletedAt: null,
        text: 'first smile today',
      },
      wantPayload: { text: 'first smile today' },
    },
    {
      name: 'pumping packs its volume and side',
      event: {
        type: 'pumping',
        uid: 'e11',
        occurredAt: T_ISO,
        createdAt: T_ISO,
        updatedAt: T,
        deletedAt: null,
        volumeMl: 120,
        side: 'left',
      },
      wantPayload: { volumeMl: 120, side: 'left' },
    },
    {
      name: 'pumping without a side packs it as null',
      event: {
        type: 'pumping',
        uid: 'e12',
        occurredAt: T_ISO,
        createdAt: T_ISO,
        updatedAt: T,
        deletedAt: null,
        volumeMl: 90,
      },
      wantPayload: { volumeMl: 90, side: null },
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
      method: 'bottle',
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
      type: 'feed',
      method: 'breast',
      uid: 'e1b',
      householdId: HH,
      occurredAt: T_ISO,
      createdAt: T_ISO,
      updatedAt: T,
      deletedAt: null,
      side: 'right',
      endedAt: null,
    },
    {
      type: 'feed',
      method: 'breast',
      uid: 'e1c',
      householdId: HH,
      occurredAt: T_ISO,
      createdAt: T_ISO,
      updatedAt: T,
      deletedAt: null,
      side: 'both',
      endedAt: T_ISO,
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
    {
      type: 'sleep',
      uid: 'e6',
      householdId: HH,
      occurredAt: T_ISO,
      createdAt: T_ISO,
      updatedAt: T,
      deletedAt: null,
      endedAt: null,
    },
    {
      type: 'sleep',
      uid: 'e7',
      householdId: HH,
      occurredAt: T_ISO,
      createdAt: T_ISO,
      updatedAt: T,
      deletedAt: null,
      endedAt: T_ISO,
    },
    {
      type: 'growth',
      uid: 'e8',
      householdId: HH,
      occurredAt: T_ISO,
      createdAt: T_ISO,
      updatedAt: T,
      deletedAt: null,
      heightMm: 525,
      headCircumferenceMm: 380,
    },
    {
      type: 'growth',
      uid: 'e9',
      householdId: HH,
      occurredAt: T_ISO,
      createdAt: T_ISO,
      updatedAt: T,
      deletedAt: null,
      heightMm: 525,
    },
    {
      type: 'note',
      uid: 'e10',
      householdId: HH,
      occurredAt: T_ISO,
      createdAt: T_ISO,
      updatedAt: T,
      deletedAt: null,
      text: 'first smile today',
    },
    {
      type: 'pumping',
      uid: 'e11',
      householdId: HH,
      occurredAt: T_ISO,
      createdAt: T_ISO,
      updatedAt: T,
      deletedAt: null,
      volumeMl: 120,
      side: 'left',
    },
  ]

  for (const e of events) {
    it(`round-trips a ${e.type} event`, () => {
      const back = eventFromRow(eventToRow(e, toCtx), fromCtx)
      expect(back).toEqual(e)
    })
  }

  it('round-trips a side-less pumping event without inventing a side field', () => {
    const pumping = {
      type: 'pumping' as const,
      uid: 'e12',
      householdId: HH,
      occurredAt: T_ISO,
      createdAt: T_ISO,
      updatedAt: T,
      deletedAt: null,
      volumeMl: 90,
    }
    const back = eventFromRow(eventToRow(pumping, toCtx), fromCtx)
    expect(back).toEqual(pumping)
    expect(back).not.toHaveProperty('side')
  })

  it('maps a dose with an unresolvable medication uid to medicationId 0', () => {
    const dose = events.find((e) => e.type === 'dose')!
    const row = eventToRow(dose, toCtx)
    const back = eventFromRow(row, { medLocalIdByUid: new Map() })
    expect(back).toMatchObject({ type: 'dose', medicationId: 0, doseAmount: 2.5 })
  })

  it('defaults a pre-ADR-0007 feed row (no method in payload) to a bottle', () => {
    const legacyRow = {
      id: 'legacy',
      baby_id: 'baby-uid',
      household_id: HH,
      type: 'feed',
      occurred_at: T_ISO,
      payload: { volumeMl: 90 }, // no method — a bottle logged before breastfeeding shipped
      created_at: T_ISO,
      updated_at: T_ISO,
      deleted_at: null,
    }
    const back = eventFromRow(legacyRow, fromCtx)
    expect(back).toMatchObject({ type: 'feed', method: 'bottle', volumeMl: 90 })
  })
})
