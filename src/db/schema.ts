import Dexie, { type Table } from 'dexie'

export type EventType = 'feed' | 'nappy' | 'weight' | 'dose'
export type FeedContent = 'formula' | 'breastmilk'
export type NappyType = 'wet' | 'dirty' | 'both'
export type NappySize = 'small' | 'medium' | 'large'
export type MedicationUnit = 'ml' | 'mg' | 'IU' | 'drops'

export interface Baby {
  id: number // always 1 (singleton)
  name: string
  dateOfBirth: string // ISO date 'YYYY-MM-DD'
}

export interface Medication {
  id?: number
  name: string
  defaultDose: number
  unit: MedicationUnit
}

// Discriminated union on `type`.
interface BaseEvent {
  id?: number
  occurredAt: string // ISO datetime
  createdAt: string // ISO datetime
}
export interface FeedEvent extends BaseEvent {
  type: 'feed'
  volumeMl: number
  content?: FeedContent
}
export interface NappyEvent extends BaseEvent {
  type: 'nappy'
  nappyType: NappyType
  size?: NappySize // present only when nappyType is 'dirty' or 'both'
}
export interface WeightEvent extends BaseEvent {
  type: 'weight'
  grams: number
}
export interface DoseEvent extends BaseEvent {
  type: 'dose'
  medicationId: number
  doseAmount: number
}
export type BabyEvent = FeedEvent | NappyEvent | WeightEvent | DoseEvent

export class BabyTrackerDB extends Dexie {
  babies!: Table<Baby, number>
  medications!: Table<Medication, number>
  events!: Table<BabyEvent, number>

  constructor() {
    super('baby-tracker')
    this.version(1).stores({
      babies: 'id',
      medications: '++id, name',
      events: '++id, type, occurredAt',
    })
  }
}

export const db = new BabyTrackerDB()
