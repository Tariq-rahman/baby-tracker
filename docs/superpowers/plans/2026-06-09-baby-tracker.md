# Baby Tracker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local-first, installable Android PWA for tracking a single baby's bottle feeds, nappies, weight, and medication doses, with a glanceable home screen, day-by-day history, weight trend chart, and JSON backup.

**Architecture:** Client-only React + TypeScript SPA. All data persists in IndexedDB via Dexie, behind a single `storage` module so a backend can be added later (see `docs/adr/0001-local-first-storage.md`). Pure logic (unit conversion, stats) lives in framework-free modules that are unit-tested first (TDD). UI is built with Tailwind for large one-handed tap targets. Installability via vite-plugin-pwa.

**Tech Stack:** React, Vite, TypeScript, Dexie.js (IndexedDB), Tailwind CSS, Recharts, vite-plugin-pwa (Workbox), Vitest + React Testing Library, deployed to Vercel.

---

## File Structure

```
src/
├── main.tsx                  # React entry, router mount
├── App.tsx                   # Route layout + bottom nav
├── db/
│   ├── schema.ts             # Dexie DB definition + TypeScript entity types
│   └── storage.ts            # The ONLY module that calls Dexie; typed CRUD
├── lib/
│   ├── units.ts              # Pure weight conversions (lb+oz/kg <-> grams)
│   ├── units.test.ts
│   ├── stats.ts              # Pure time-since-last + daily totals
│   ├── stats.test.ts
│   ├── datetime.ts           # Pure datetime-local input <-> ISO helpers
│   ├── datetime.test.ts
│   ├── backup.ts             # Pure export/import (serialize/parse JSON)
│   └── backup.test.ts
├── hooks/
│   └── useEvents.ts          # Dexie live-query hooks wrapping storage
├── components/
│   ├── QuickLogButtons.tsx
│   ├── SinceLast.tsx
│   ├── DailyTotals.tsx
│   ├── Timeline.tsx
│   ├── EventRow.tsx
│   └── sheets/
│       ├── EventSheet.tsx     # Modal + add/edit/delete wiring (picks the right sheet)
│       ├── BottleSheet.tsx
│       ├── NappySheet.tsx
│       ├── DoseSheet.tsx
│       └── WeightSheet.tsx
├── pages/
│   ├── HomePage.tsx
│   ├── HistoryPage.tsx
│   ├── WeightPage.tsx
│   └── SettingsPage.tsx
└── index.css                 # Tailwind directives
```

Files that change together live together. `storage.ts` is the single Dexie boundary; pure logic in `lib/` has no React or Dexie imports so it is trivially testable.

---

## CHECKPOINT MODEL

There are **5 checkpoints**. Stop at each, let the user verify, then continue:

- **Checkpoint A** — Scaffold runs (`npm run dev` shows a blank app; tests run).
- **Checkpoint B** — Pure logic (units, stats, backup) complete and green.
- **Checkpoint C** — Logging + home screen usable on desktop browser.
- **Checkpoint D** — History, weight trend, settings/backup complete.
- **Checkpoint E** — Deployed to Vercel and installed on the user's Android phone.

(Notifications are a deliberately separate follow-up plan, built after Checkpoint E.)

---

# PHASE 1 — Scaffold

### Task 1: Initialise the Vite + React + TS project

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`, `src/main.tsx`, `src/App.tsx`, `src/index.css`

- [ ] **Step 1: Scaffold with Vite**

Run from the project root (the directory already contains `.git`, `CLAUDE.md`, `CONTEXT.md`, `docs/`):

```bash
npm create vite@latest . -- --template react-ts
```

If prompted that the directory is not empty, choose **"Ignore files and continue"** (it will not delete `.git`, `docs/`, `CLAUDE.md`, `CONTEXT.md`).

- [ ] **Step 2: Install dependencies**

```bash
npm install
```

- [ ] **Step 3: Verify the dev server boots**

Run: `npm run dev`
Expected: Vite prints a `localhost:5173` URL and the page loads the default Vite+React template. Stop the server (Ctrl-C) after confirming.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: scaffold Vite React TS project"
```

---

### Task 2: Add Tailwind CSS

**Files:**
- Create: `tailwind.config.js`, `postcss.config.js`
- Modify: `src/index.css`

- [ ] **Step 1: Install Tailwind**

```bash
npm install -D tailwindcss@3 postcss autoprefixer
npx tailwindcss init -p
```

- [ ] **Step 2: Configure content paths**

Replace `tailwind.config.js` with:

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: { extend: {} },
  plugins: [],
}
```

- [ ] **Step 3: Add Tailwind directives**

Replace the entire contents of `src/index.css` with:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 4: Smoke-test a Tailwind class**

Replace `src/App.tsx` with:

```tsx
export default function App() {
  return (
    <main className="min-h-screen bg-slate-50 p-4">
      <h1 className="text-2xl font-bold text-slate-800">Baby Tracker</h1>
    </main>
  )
}
```

Run: `npm run dev` and confirm the heading renders with styling. Stop the server.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: add Tailwind CSS"
```

---

### Task 3: Add Vitest + React Testing Library

**Files:**
- Modify: `vite.config.ts`, `package.json`
- Create: `src/setupTests.ts`

- [ ] **Step 1: Install test tooling**

```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom fake-indexeddb
```

- [ ] **Step 2: Configure Vitest in `vite.config.ts`**

Replace `vite.config.ts` with:

```ts
/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/setupTests.ts'],
  },
})
```

- [ ] **Step 3: Create the test setup file**

Create `src/setupTests.ts`:

```ts
import '@testing-library/jest-dom'
```

- [ ] **Step 4: Add a `test` script**

In `package.json`, add to `"scripts"`:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 5: Write a trivial passing test to prove the harness works**

Create `src/lib/sanity.test.ts`:

```ts
import { describe, it, expect } from 'vitest'

describe('test harness', () => {
  it('runs', () => {
    expect(1 + 1).toBe(2)
  })
})
```

- [ ] **Step 6: Run the tests**

Run: `npm run test`
Expected: 1 passing test. Then delete the sanity file:

```bash
rm src/lib/sanity.test.ts
```

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: add Vitest and React Testing Library"
```

---

### Task 4: Add PWA manifest + service worker

**Files:**
- Modify: `vite.config.ts`
- Create: `public/icon-192.png`, `public/icon-512.png` (placeholder icons)

- [ ] **Step 1: Install vite-plugin-pwa**

```bash
npm install -D vite-plugin-pwa
```

- [ ] **Step 2: Create placeholder PWA icons**

Generate two solid-colour PNG placeholders (replace with real art later):

```bash
npm install -D sharp-cli
npx sharp-cli --input /dev/null create 192 192 --background "#2563eb" -o public/icon-192.png 2>/dev/null || node -e "const fs=require('fs');const b=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==','base64');fs.writeFileSync('public/icon-192.png',b);fs.writeFileSync('public/icon-512.png',b)"
```

(The fallback writes a 1×1 PNG so the build succeeds; swap in real 192×192 / 512×512 icons before Checkpoint E.)

- [ ] **Step 3: Register the PWA plugin in `vite.config.ts`**

Replace `vite.config.ts` with:

```ts
/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon-192.png', 'icon-512.png'],
      manifest: {
        name: 'Baby Tracker',
        short_name: 'Baby',
        description: 'Track feeds, nappies, weight and medication',
        theme_color: '#2563eb',
        background_color: '#f8fafc',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
    }),
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/setupTests.ts'],
  },
})
```

- [ ] **Step 4: Verify the production build emits a manifest + service worker**

Run: `npm run build`
Expected: build succeeds; `dist/` contains `manifest.webmanifest` and `sw.js`.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add PWA manifest and service worker"
```

> **CHECKPOINT A** — `npm run dev` serves the app, `npm run test` is green, `npm run build` produces a PWA manifest + service worker. Pause for user verification.

---

# PHASE 2 — Data model + pure logic (TDD)

### Task 5: Define entity types and Dexie schema

**Files:**
- Create: `src/db/schema.ts`

- [ ] **Step 1: Write the schema and types**

Create `src/db/schema.ts`:

```ts
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
```

- [ ] **Step 2: Install Dexie**

```bash
npm install dexie dexie-react-hooks
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: define Dexie schema and entity types"
```

---

### Task 6: Weight unit conversions (`units.ts`) — TDD

**Files:**
- Create: `src/lib/units.test.ts`, `src/lib/units.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/units.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { kgToGrams, gramsToKg, lbOzToGrams, gramsToLbOz } from './units'

describe('kgToGrams', () => {
  it.each([
    [4.2, 4200],
    [3.456, 3456],
    [0, 0],
    [4.2005, 4201], // rounds to nearest gram
  ])('converts %s kg to %s g', (kg, grams) => {
    expect(kgToGrams(kg)).toBe(grams)
  })
})

describe('gramsToKg', () => {
  it('converts grams to kg as a number', () => {
    expect(gramsToKg(4200)).toBeCloseTo(4.2, 5)
  })
})

describe('lbOzToGrams', () => {
  it.each([
    [9, 4, 4196], // 9lb 4oz = 4195.8g -> 4196
    [0, 0, 0],
    [1, 0, 454], // 453.592 -> 454
  ])('converts %s lb %s oz to %s g', (lb, oz, grams) => {
    expect(lbOzToGrams(lb, oz)).toBe(grams)
  })
})

describe('gramsToLbOz', () => {
  it('converts grams to lb + oz, rounding oz to nearest whole', () => {
    expect(gramsToLbOz(4196)).toEqual({ lb: 9, oz: 4 })
  })
  it('carries 16 oz into a pound', () => {
    expect(gramsToLbOz(453)).toEqual({ lb: 1, oz: 0 })
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `npm run test -- units`
Expected: FAIL — `units.ts` does not exist / functions undefined.

- [ ] **Step 3: Implement `units.ts`**

Create `src/lib/units.ts`:

```ts
const GRAMS_PER_LB = 453.59237
const GRAMS_PER_OZ = GRAMS_PER_LB / 16

export function kgToGrams(kg: number): number {
  return Math.round(kg * 1000)
}

export function gramsToKg(grams: number): number {
  return grams / 1000
}

export function lbOzToGrams(lb: number, oz: number): number {
  return Math.round(lb * GRAMS_PER_LB + oz * GRAMS_PER_OZ)
}

export function gramsToLbOz(grams: number): { lb: number; oz: number } {
  const totalOz = Math.round(grams / GRAMS_PER_OZ)
  return { lb: Math.floor(totalOz / 16), oz: totalOz % 16 }
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npm run test -- units`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add weight unit conversions with tests"
```

---

### Task 7: Stats — time-since-last + daily totals (`stats.ts`) — TDD

**Files:**
- Create: `src/lib/stats.test.ts`, `src/lib/stats.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/stats.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { getLastEventOfType, listEventsForDay, getDailyTotals } from './stats'
import type { BabyEvent } from '../db/schema'

const events: BabyEvent[] = [
  { id: 1, type: 'feed', volumeMl: 120, occurredAt: '2026-06-09T08:00:00.000Z', createdAt: '2026-06-09T08:00:00.000Z' },
  { id: 2, type: 'feed', volumeMl: 100, occurredAt: '2026-06-09T11:00:00.000Z', createdAt: '2026-06-09T11:00:00.000Z' },
  { id: 3, type: 'nappy', nappyType: 'wet', occurredAt: '2026-06-09T09:30:00.000Z', createdAt: '2026-06-09T09:30:00.000Z' },
  { id: 4, type: 'nappy', nappyType: 'both', size: 'medium', occurredAt: '2026-06-09T12:00:00.000Z', createdAt: '2026-06-09T12:00:00.000Z' },
  { id: 5, type: 'feed', volumeMl: 90, occurredAt: '2026-06-08T22:00:00.000Z', createdAt: '2026-06-08T22:00:00.000Z' },
]

describe('getLastEventOfType', () => {
  it('returns the most recent event of the given type', () => {
    const last = getLastEventOfType(events, 'feed')
    expect(last?.id).toBe(2)
  })
  it('returns undefined when no event of that type exists', () => {
    expect(getLastEventOfType(events, 'weight')).toBeUndefined()
  })
})

describe('listEventsForDay', () => {
  it('returns only events on the given local day, newest first', () => {
    const day = listEventsForDay(events, '2026-06-09')
    expect(day.map((e) => e.id)).toEqual([4, 2, 3, 1])
  })
})

describe('getDailyTotals', () => {
  it('aggregates feeds, nappies and doses for the day', () => {
    const totals = getDailyTotals(events, '2026-06-09')
    expect(totals.feedCount).toBe(2)
    expect(totals.feedVolumeMl).toBe(220)
    expect(totals.nappyWet).toBe(1)
    expect(totals.nappyDirty).toBe(1) // 'both' counts as a dirty
    expect(totals.doseCount).toBe(0)
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `npm run test -- stats`
Expected: FAIL — functions undefined.

- [ ] **Step 3: Implement `stats.ts`**

Create `src/lib/stats.ts`:

```ts
import type { BabyEvent, EventType } from '../db/schema'

export function getLastEventOfType<T extends EventType>(
  events: BabyEvent[],
  type: T,
): Extract<BabyEvent, { type: T }> | undefined {
  return events
    .filter((e): e is Extract<BabyEvent, { type: T }> => e.type === type)
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))[0]
}

/** day is a local 'YYYY-MM-DD'. Matches events whose local date equals it. */
export function listEventsForDay(events: BabyEvent[], day: string): BabyEvent[] {
  return events
    .filter((e) => toLocalDay(e.occurredAt) === day)
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
}

export interface DailyTotals {
  feedCount: number
  feedVolumeMl: number
  nappyWet: number
  nappyDirty: number
  doseCount: number
}

export function getDailyTotals(events: BabyEvent[], day: string): DailyTotals {
  const dayEvents = listEventsForDay(events, day)
  const totals: DailyTotals = {
    feedCount: 0,
    feedVolumeMl: 0,
    nappyWet: 0,
    nappyDirty: 0,
    doseCount: 0,
  }
  for (const e of dayEvents) {
    if (e.type === 'feed') {
      totals.feedCount += 1
      totals.feedVolumeMl += e.volumeMl
    } else if (e.type === 'nappy') {
      if (e.nappyType === 'wet' || e.nappyType === 'both') totals.nappyWet += 1
      if (e.nappyType === 'dirty' || e.nappyType === 'both') totals.nappyDirty += 1
    } else if (e.type === 'dose') {
      totals.doseCount += 1
    }
  }
  return totals
}

function toLocalDay(iso: string): string {
  const d = new Date(iso)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
```

> **Note for the implementer:** the `listEventsForDay` test assumes the test runner's local timezone is UTC. If your machine is not UTC the expected IDs may differ. Either run tests with `TZ=UTC` (add `"test": "TZ=UTC vitest run"` to package.json) or keep this in mind. Add `TZ=UTC` to the test script now.

- [ ] **Step 4: Pin the test timezone**

In `package.json`, change the test scripts to:

```json
"test": "TZ=UTC vitest run",
"test:watch": "TZ=UTC vitest"
```

- [ ] **Step 5: Run to verify pass**

Run: `npm run test -- stats`
Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add stats (since-last, daily totals) with tests"
```

---

### Task 8: Backup export/import (`backup.ts`) — TDD

**Files:**
- Create: `src/lib/backup.test.ts`, `src/lib/backup.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/backup.test.ts`:

```ts
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
```

- [ ] **Step 2: Run to verify failure**

Run: `npm run test -- backup`
Expected: FAIL — functions undefined.

- [ ] **Step 3: Implement `backup.ts`**

Create `src/lib/backup.ts`:

```ts
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
```

- [ ] **Step 4: Run to verify pass**

Run: `npm run test -- backup`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add JSON backup serialize/parse with tests"
```

---

### Task 8b: Datetime input helpers (`datetime.ts`) — TDD

These DRY up the `<input type="datetime-local">` handling shared by all four sheets: produce the local "now" string, convert a stored ISO string to the local-input format, and convert a local-input string back to ISO.

**Files:**
- Create: `src/lib/datetime.test.ts`, `src/lib/datetime.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/datetime.test.ts`:

```ts
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
```

- [ ] **Step 2: Run to verify failure**

Run: `npm run test -- datetime`
Expected: FAIL — functions undefined.

- [ ] **Step 3: Implement `datetime.ts`**

Create `src/lib/datetime.ts`:

```ts
function pad(n: number): string {
  return String(n).padStart(2, '0')
}

/** Current local time formatted for an <input type="datetime-local">. */
export function nowLocalInput(): string {
  return isoToLocalInput(new Date().toISOString())
}

/** Convert a stored ISO datetime to the local 'YYYY-MM-DDTHH:mm' input format. */
export function isoToLocalInput(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** Convert a local 'YYYY-MM-DDTHH:mm' input value back to an ISO string. */
export function localInputToIso(value: string): string {
  return new Date(value).toISOString()
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npm run test -- datetime`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add datetime input helpers with tests"
```

---

### Task 9: Storage module over Dexie

**Files:**
- Create: `src/db/storage.ts`, `src/db/storage.test.ts`

- [ ] **Step 1: Write the failing test (uses fake-indexeddb)**

Create `src/db/storage.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import 'fake-indexeddb/auto'
import { db } from './schema'
import { addEvent, listEvents, updateEvent, deleteEvent, getBaby, saveBaby } from './storage'

describe('storage', () => {
  beforeEach(async () => {
    await db.events.clear()
    await db.babies.clear()
  })

  it('adds an event and lists it back', async () => {
    const id = await addEvent({
      type: 'feed',
      volumeMl: 120,
      occurredAt: '2026-06-09T08:00:00.000Z',
      createdAt: '2026-06-09T08:00:00.000Z',
    })
    const all = await listEvents()
    expect(all).toHaveLength(1)
    expect(all[0].id).toBe(id)
  })

  it('updates an event', async () => {
    const id = await addEvent({
      type: 'feed',
      volumeMl: 120,
      occurredAt: '2026-06-09T08:00:00.000Z',
      createdAt: '2026-06-09T08:00:00.000Z',
    })
    await updateEvent(id, { volumeMl: 150 })
    const all = await listEvents()
    expect((all[0] as { volumeMl: number }).volumeMl).toBe(150)
  })

  it('deletes an event', async () => {
    const id = await addEvent({
      type: 'nappy',
      nappyType: 'wet',
      occurredAt: '2026-06-09T08:00:00.000Z',
      createdAt: '2026-06-09T08:00:00.000Z',
    })
    await deleteEvent(id)
    expect(await listEvents()).toHaveLength(0)
  })

  it('saves and gets the singleton baby', async () => {
    await saveBaby({ name: 'Sam', dateOfBirth: '2026-05-01' })
    const baby = await getBaby()
    expect(baby?.name).toBe('Sam')
    expect(baby?.id).toBe(1)
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `npm run test -- storage`
Expected: FAIL — functions undefined.

- [ ] **Step 3: Implement `storage.ts`**

Create `src/db/storage.ts`:

```ts
import { db } from './schema'
import type { Baby, Medication, BabyEvent } from './schema'

const BABY_ID = 1

// --- Baby ---
export async function getBaby(): Promise<Baby | undefined> {
  return db.babies.get(BABY_ID)
}
export async function saveBaby(input: Omit<Baby, 'id'>): Promise<void> {
  await db.babies.put({ id: BABY_ID, ...input })
}

// --- Medications ---
export async function listMedications(): Promise<Medication[]> {
  return db.medications.toArray()
}
export async function addMedication(input: Omit<Medication, 'id'>): Promise<number> {
  return db.medications.add(input as Medication)
}
export async function updateMedication(id: number, changes: Partial<Medication>): Promise<void> {
  await db.medications.update(id, changes)
}
export async function deleteMedication(id: number): Promise<void> {
  await db.medications.delete(id)
}

// --- Events ---
export async function listEvents(): Promise<BabyEvent[]> {
  return db.events.orderBy('occurredAt').reverse().toArray()
}
export async function addEvent(event: BabyEvent): Promise<number> {
  return db.events.add(event)
}
export async function updateEvent(id: number, changes: Partial<BabyEvent>): Promise<void> {
  await db.events.update(id, changes)
}
export async function deleteEvent(id: number): Promise<void> {
  await db.events.delete(id)
}

// --- Backup ---
export async function exportAll() {
  return {
    baby: await getBaby(),
    medications: await listMedications(),
    events: await listEvents(),
  }
}
export async function importAll(data: {
  baby: Baby | undefined
  medications: Medication[]
  events: BabyEvent[]
}): Promise<void> {
  await db.transaction('rw', db.babies, db.medications, db.events, async () => {
    await db.babies.clear()
    await db.medications.clear()
    await db.events.clear()
    if (data.baby) await db.babies.put(data.baby)
    if (data.medications.length) await db.medications.bulkAdd(data.medications)
    if (data.events.length) await db.events.bulkAdd(data.events)
  })
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npm run test -- storage`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add storage module over Dexie with tests"
```

> **CHECKPOINT B** — All pure logic and storage are implemented and `npm run test` is fully green. Pause for user verification.

---

# PHASE 3 — Logging + home screen

### Task 10: App shell, routing, and bottom navigation

**Files:**
- Modify: `src/App.tsx`, `src/main.tsx`
- Create: `src/pages/HomePage.tsx`, `src/pages/HistoryPage.tsx`, `src/pages/WeightPage.tsx`, `src/pages/SettingsPage.tsx`

- [ ] **Step 1: Install the router**

```bash
npm install react-router-dom
```

- [ ] **Step 2: Create placeholder pages**

Create each of these four files with a minimal stub:

`src/pages/HomePage.tsx`:
```tsx
export default function HomePage() {
  return <div className="p-4">Home</div>
}
```

`src/pages/HistoryPage.tsx`:
```tsx
export default function HistoryPage() {
  return <div className="p-4">History</div>
}
```

`src/pages/WeightPage.tsx`:
```tsx
export default function WeightPage() {
  return <div className="p-4">Weight</div>
}
```

`src/pages/SettingsPage.tsx`:
```tsx
export default function SettingsPage() {
  return <div className="p-4">Settings</div>
}
```

- [ ] **Step 3: Wire routing + bottom nav in `App.tsx`**

Replace `src/App.tsx`:

```tsx
import { NavLink, Route, Routes } from 'react-router-dom'
import HomePage from './pages/HomePage'
import HistoryPage from './pages/HistoryPage'
import WeightPage from './pages/WeightPage'
import SettingsPage from './pages/SettingsPage'

const navItems = [
  { to: '/', label: 'Home' },
  { to: '/history', label: 'History' },
  { to: '/weight', label: 'Weight' },
  { to: '/settings', label: 'Settings' },
]

export default function App() {
  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/weight" element={<WeightPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>
      <nav className="fixed bottom-0 inset-x-0 grid grid-cols-4 border-t bg-white">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `py-3 text-center text-sm ${isActive ? 'font-bold text-blue-600' : 'text-slate-500'}`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
```

- [ ] **Step 4: Mount the router in `main.tsx`**

Replace `src/main.tsx`:

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
```

- [ ] **Step 5: Verify in browser**

Run: `npm run dev` and confirm tapping each nav item switches the page. Stop the server.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add app shell, routing and bottom nav"
```

---

### Task 11: Live-query hook for events

**Files:**
- Create: `src/hooks/useEvents.ts`

- [ ] **Step 1: Implement the hook**

Create `src/hooks/useEvents.ts`:

```ts
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/schema'
import type { BabyEvent, Medication } from '../db/schema'

export function useEvents(): BabyEvent[] {
  return useLiveQuery(() => db.events.orderBy('occurredAt').reverse().toArray(), [], []) ?? []
}

export function useMedications(): Medication[] {
  return useLiveQuery(() => db.medications.toArray(), [], []) ?? []
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: add live-query hooks for events and medications"
```

---

### Task 12: BottleSheet logging form — TDD (component test)

**Files:**
- Create: `src/components/sheets/BottleSheet.tsx`, `src/components/sheets/BottleSheet.test.tsx`

- [ ] **Step 1: Write the failing component test**

Create `src/components/sheets/BottleSheet.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import BottleSheet from './BottleSheet'

describe('BottleSheet', () => {
  it('submits the entered volume and defaults content to undefined', async () => {
    const onSave = vi.fn()
    render(<BottleSheet onSave={onSave} onClose={() => {}} />)
    await userEvent.type(screen.getByLabelText(/volume/i), '120')
    await userEvent.click(screen.getByRole('button', { name: /save/i }))
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'feed', volumeMl: 120 }),
    )
  })

  it('includes content when a content option is chosen', async () => {
    const onSave = vi.fn()
    render(<BottleSheet onSave={onSave} onClose={() => {}} />)
    await userEvent.type(screen.getByLabelText(/volume/i), '90')
    await userEvent.click(screen.getByRole('button', { name: /formula/i }))
    await userEvent.click(screen.getByRole('button', { name: /save/i }))
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ volumeMl: 90, content: 'formula' }),
    )
  })

  it('prefills from an initial event for editing and preserves createdAt', async () => {
    const onSave = vi.fn()
    const initial = {
      id: 7,
      type: 'feed' as const,
      volumeMl: 120,
      occurredAt: '2026-06-09T08:00:00.000Z',
      createdAt: '2026-06-09T08:00:00.000Z',
    }
    render(<BottleSheet initial={initial} onSave={onSave} onClose={() => {}} />)
    expect(screen.getByLabelText(/volume/i)).toHaveValue(120)
    await userEvent.click(screen.getByRole('button', { name: /save/i }))
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ volumeMl: 120, createdAt: '2026-06-09T08:00:00.000Z' }),
    )
  })

  it('shows a delete button only when editing', async () => {
    const onDelete = vi.fn()
    const initial = {
      id: 7,
      type: 'feed' as const,
      volumeMl: 120,
      occurredAt: '2026-06-09T08:00:00.000Z',
      createdAt: '2026-06-09T08:00:00.000Z',
    }
    const { rerender } = render(<BottleSheet onSave={() => {}} onClose={() => {}} />)
    expect(screen.queryByRole('button', { name: /delete/i })).toBeNull()
    rerender(<BottleSheet initial={initial} onSave={() => {}} onDelete={onDelete} onClose={() => {}} />)
    await userEvent.click(screen.getByRole('button', { name: /delete/i }))
    expect(onDelete).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `npm run test -- BottleSheet`
Expected: FAIL — component does not exist.

- [ ] **Step 3: Implement `BottleSheet.tsx`**

Create `src/components/sheets/BottleSheet.tsx`:

```tsx
import { useState } from 'react'
import type { FeedEvent, FeedContent } from '../../db/schema'
import { isoToLocalInput, localInputToIso, nowLocalInput } from '../../lib/datetime'

interface Props {
  initial?: FeedEvent
  onSave: (event: FeedEvent) => void
  onDelete?: () => void
  onClose: () => void
}

export default function BottleSheet({ initial, onSave, onDelete, onClose }: Props) {
  const [volume, setVolume] = useState(initial ? String(initial.volumeMl) : '')
  const [content, setContent] = useState<FeedContent | undefined>(initial?.content)
  const [when, setWhen] = useState(initial ? isoToLocalInput(initial.occurredAt) : nowLocalInput())

  function handleSave() {
    const volumeMl = Number(volume)
    if (!volumeMl) return
    onSave({
      type: 'feed',
      volumeMl,
      content,
      occurredAt: localInputToIso(when),
      createdAt: initial?.createdAt ?? new Date().toISOString(),
    })
    onClose()
  }

  return (
    <div className="space-y-4 p-4">
      <h2 className="text-lg font-bold">Bottle</h2>
      <label className="block">
        <span className="text-sm text-slate-600">Volume (ml)</span>
        <input
          type="number"
          inputMode="numeric"
          value={volume}
          onChange={(e) => setVolume(e.target.value)}
          className="mt-1 w-full rounded border p-3 text-lg"
        />
      </label>
      <div className="flex gap-2">
        {(['formula', 'breastmilk'] as const).map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setContent(content === c ? undefined : c)}
            className={`flex-1 rounded border p-3 capitalize ${
              content === c ? 'bg-blue-600 text-white' : 'bg-white'
            }`}
          >
            {c}
          </button>
        ))}
      </div>
      <label className="block">
        <span className="text-sm text-slate-600">Time</span>
        <input
          type="datetime-local"
          value={when}
          onChange={(e) => setWhen(e.target.value)}
          className="mt-1 w-full rounded border p-3"
        />
      </label>
      <div className="flex gap-2">
        <button onClick={onClose} className="flex-1 rounded border p-3">
          Cancel
        </button>
        <button onClick={handleSave} className="flex-1 rounded bg-blue-600 p-3 font-bold text-white">
          Save
        </button>
      </div>
      {initial && onDelete && (
        <button onClick={onDelete} className="w-full rounded border border-red-500 p-3 font-semibold text-red-600">
          Delete
        </button>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npm run test -- BottleSheet`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add BottleSheet logging form with tests"
```

---

### Task 13: NappySheet logging form — TDD (component test)

**Files:**
- Create: `src/components/sheets/NappySheet.tsx`, `src/components/sheets/NappySheet.test.tsx`

- [ ] **Step 1: Write the failing component test**

Create `src/components/sheets/NappySheet.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import NappySheet from './NappySheet'

describe('NappySheet', () => {
  it('saves a wet nappy with no size and without needing a second tap on size', async () => {
    const onSave = vi.fn()
    render(<NappySheet onSave={onSave} onClose={() => {}} />)
    await userEvent.click(screen.getByRole('button', { name: /^wet$/i }))
    await userEvent.click(screen.getByRole('button', { name: /save/i }))
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'nappy', nappyType: 'wet' }),
    )
    expect(onSave.mock.calls[0][0].size).toBeUndefined()
  })

  it('requires and includes a size for a dirty nappy', async () => {
    const onSave = vi.fn()
    render(<NappySheet onSave={onSave} onClose={() => {}} />)
    await userEvent.click(screen.getByRole('button', { name: /^dirty$/i }))
    await userEvent.click(screen.getByRole('button', { name: /medium/i }))
    await userEvent.click(screen.getByRole('button', { name: /save/i }))
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ nappyType: 'dirty', size: 'medium' }),
    )
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `npm run test -- NappySheet`
Expected: FAIL — component does not exist.

- [ ] **Step 3: Implement `NappySheet.tsx`**

Create `src/components/sheets/NappySheet.tsx`:

```tsx
import { useState } from 'react'
import type { NappyEvent, NappyType, NappySize } from '../../db/schema'
import { isoToLocalInput, localInputToIso, nowLocalInput } from '../../lib/datetime'

interface Props {
  initial?: NappyEvent
  onSave: (event: NappyEvent) => void
  onDelete?: () => void
  onClose: () => void
}

const needsSize = (t: NappyType) => t === 'dirty' || t === 'both'

export default function NappySheet({ initial, onSave, onDelete, onClose }: Props) {
  const [nappyType, setNappyType] = useState<NappyType | undefined>(initial?.nappyType)
  const [size, setSize] = useState<NappySize | undefined>(initial?.size)
  const [when, setWhen] = useState(initial ? isoToLocalInput(initial.occurredAt) : nowLocalInput())

  function handleSave() {
    if (!nappyType) return
    if (needsSize(nappyType) && !size) return
    onSave({
      type: 'nappy',
      nappyType,
      size: needsSize(nappyType) ? size : undefined,
      occurredAt: localInputToIso(when),
      createdAt: initial?.createdAt ?? new Date().toISOString(),
    })
    onClose()
  }

  return (
    <div className="space-y-4 p-4">
      <h2 className="text-lg font-bold">Nappy</h2>
      <div className="flex gap-2">
        {(['wet', 'dirty', 'both'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => {
              setNappyType(t)
              if (!needsSize(t)) setSize(undefined)
            }}
            className={`flex-1 rounded border p-3 capitalize ${
              nappyType === t ? 'bg-blue-600 text-white' : 'bg-white'
            }`}
          >
            {t}
          </button>
        ))}
      </div>
      {nappyType && needsSize(nappyType) && (
        <div className="flex gap-2">
          {(['small', 'medium', 'large'] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSize(s)}
              className={`flex-1 rounded border p-3 capitalize ${
                size === s ? 'bg-blue-600 text-white' : 'bg-white'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      )}
      <label className="block">
        <span className="text-sm text-slate-600">Time</span>
        <input
          type="datetime-local"
          value={when}
          onChange={(e) => setWhen(e.target.value)}
          className="mt-1 w-full rounded border p-3"
        />
      </label>
      <div className="flex gap-2">
        <button onClick={onClose} className="flex-1 rounded border p-3">
          Cancel
        </button>
        <button onClick={handleSave} className="flex-1 rounded bg-blue-600 p-3 font-bold text-white">
          Save
        </button>
      </div>
      {initial && onDelete && (
        <button onClick={onDelete} className="w-full rounded border border-red-500 p-3 font-semibold text-red-600">
          Delete
        </button>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npm run test -- NappySheet`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add NappySheet logging form with tests"
```

---

### Task 14: WeightSheet logging form — TDD (component test)

**Files:**
- Create: `src/components/sheets/WeightSheet.tsx`, `src/components/sheets/WeightSheet.test.tsx`

- [ ] **Step 1: Write the failing component test**

Create `src/components/sheets/WeightSheet.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import WeightSheet from './WeightSheet'

describe('WeightSheet', () => {
  it('saves kg input converted to grams', async () => {
    const onSave = vi.fn()
    render(<WeightSheet onSave={onSave} onClose={() => {}} />)
    // metric is the default mode
    await userEvent.type(screen.getByLabelText(/kg/i), '4.2')
    await userEvent.click(screen.getByRole('button', { name: /save/i }))
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'weight', grams: 4200 }),
    )
  })

  it('saves lb + oz input converted to grams', async () => {
    const onSave = vi.fn()
    render(<WeightSheet onSave={onSave} onClose={() => {}} />)
    await userEvent.click(screen.getByRole('button', { name: /lb \+ oz/i }))
    await userEvent.type(screen.getByLabelText(/^lb$/i), '9')
    await userEvent.type(screen.getByLabelText(/^oz$/i), '4')
    await userEvent.click(screen.getByRole('button', { name: /save/i }))
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'weight', grams: 4196 }),
    )
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `npm run test -- WeightSheet`
Expected: FAIL — component does not exist.

- [ ] **Step 3: Implement `WeightSheet.tsx`**

Create `src/components/sheets/WeightSheet.tsx`:

```tsx
import { useState } from 'react'
import type { WeightEvent } from '../../db/schema'
import { kgToGrams, lbOzToGrams, gramsToKg } from '../../lib/units'
import { isoToLocalInput, localInputToIso, nowLocalInput } from '../../lib/datetime'

interface Props {
  initial?: WeightEvent
  onSave: (event: WeightEvent) => void
  onDelete?: () => void
  onClose: () => void
}

export default function WeightSheet({ initial, onSave, onDelete, onClose }: Props) {
  const [mode, setMode] = useState<'metric' | 'imperial'>('metric')
  const [kg, setKg] = useState(initial ? String(gramsToKg(initial.grams)) : '')
  const [lb, setLb] = useState('')
  const [oz, setOz] = useState('')
  const [when, setWhen] = useState(initial ? isoToLocalInput(initial.occurredAt) : nowLocalInput())

  function handleSave() {
    const grams = mode === 'metric' ? kgToGrams(Number(kg)) : lbOzToGrams(Number(lb), Number(oz))
    if (!grams) return
    onSave({
      type: 'weight',
      grams,
      occurredAt: localInputToIso(when),
      createdAt: initial?.createdAt ?? new Date().toISOString(),
    })
    onClose()
  }

  return (
    <div className="space-y-4 p-4">
      <h2 className="text-lg font-bold">Weight</h2>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setMode('metric')}
          className={`flex-1 rounded border p-2 ${mode === 'metric' ? 'bg-blue-600 text-white' : 'bg-white'}`}
        >
          kg
        </button>
        <button
          type="button"
          onClick={() => setMode('imperial')}
          className={`flex-1 rounded border p-2 ${mode === 'imperial' ? 'bg-blue-600 text-white' : 'bg-white'}`}
        >
          lb + oz
        </button>
      </div>
      {mode === 'metric' ? (
        <label className="block">
          <span className="text-sm text-slate-600">kg</span>
          <input
            type="number"
            step="0.001"
            inputMode="decimal"
            value={kg}
            onChange={(e) => setKg(e.target.value)}
            className="mt-1 w-full rounded border p-3 text-lg"
          />
        </label>
      ) : (
        <div className="flex gap-2">
          <label className="block flex-1">
            <span className="text-sm text-slate-600">lb</span>
            <input
              type="number"
              inputMode="numeric"
              value={lb}
              onChange={(e) => setLb(e.target.value)}
              className="mt-1 w-full rounded border p-3 text-lg"
            />
          </label>
          <label className="block flex-1">
            <span className="text-sm text-slate-600">oz</span>
            <input
              type="number"
              inputMode="numeric"
              value={oz}
              onChange={(e) => setOz(e.target.value)}
              className="mt-1 w-full rounded border p-3 text-lg"
            />
          </label>
        </div>
      )}
      <label className="block">
        <span className="text-sm text-slate-600">Time</span>
        <input
          type="datetime-local"
          value={when}
          onChange={(e) => setWhen(e.target.value)}
          className="mt-1 w-full rounded border p-3"
        />
      </label>
      <div className="flex gap-2">
        <button onClick={onClose} className="flex-1 rounded border p-3">
          Cancel
        </button>
        <button onClick={handleSave} className="flex-1 rounded bg-blue-600 p-3 font-bold text-white">
          Save
        </button>
      </div>
      {initial && onDelete && (
        <button onClick={onDelete} className="w-full rounded border border-red-500 p-3 font-semibold text-red-600">
          Delete
        </button>
      )}
    </div>
  )
}
```

> **Note:** edit mode prefills the kg field (metric). Switching to lb+oz while editing recomputes from the lb/oz inputs as normal. This is acceptable for the MVP.

- [ ] **Step 4: Run to verify pass**

Run: `npm run test -- WeightSheet`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add WeightSheet logging form with tests"
```

---

### Task 15: DoseSheet logging form — TDD (component test)

**Files:**
- Create: `src/components/sheets/DoseSheet.tsx`, `src/components/sheets/DoseSheet.test.tsx`

- [ ] **Step 1: Write the failing component test**

Create `src/components/sheets/DoseSheet.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import DoseSheet from './DoseSheet'
import type { Medication } from '../../db/schema'

const meds: Medication[] = [{ id: 1, name: 'Vitamin D', defaultDose: 400, unit: 'IU' }]

describe('DoseSheet', () => {
  it('pre-fills the default dose for the selected medication and saves it', async () => {
    const onSave = vi.fn()
    render(<DoseSheet medications={meds} onSave={onSave} onClose={() => {}} />)
    // single med is auto-selected; default dose 400 pre-filled
    await userEvent.click(screen.getByRole('button', { name: /save/i }))
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'dose', medicationId: 1, doseAmount: 400 }),
    )
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `npm run test -- DoseSheet`
Expected: FAIL — component does not exist.

- [ ] **Step 3: Implement `DoseSheet.tsx`**

Create `src/components/sheets/DoseSheet.tsx`:

```tsx
import { useState } from 'react'
import type { DoseEvent, Medication } from '../../db/schema'
import { isoToLocalInput, localInputToIso, nowLocalInput } from '../../lib/datetime'

interface Props {
  medications: Medication[]
  initial?: DoseEvent
  onSave: (event: DoseEvent) => void
  onDelete?: () => void
  onClose: () => void
}

export default function DoseSheet({ medications, initial, onSave, onDelete, onClose }: Props) {
  const [medId, setMedId] = useState<number | undefined>(initial?.medicationId ?? medications[0]?.id)
  const selected = medications.find((m) => m.id === medId)
  const [dose, setDose] = useState(
    initial ? String(initial.doseAmount) : String(medications[0]?.defaultDose ?? ''),
  )
  const [when, setWhen] = useState(initial ? isoToLocalInput(initial.occurredAt) : nowLocalInput())

  if (medications.length === 0) {
    return (
      <div className="space-y-4 p-4">
        <h2 className="text-lg font-bold">Dose</h2>
        <p className="text-slate-600">No medications yet. Add one in Settings first.</p>
        <button onClick={onClose} className="w-full rounded border p-3">
          Close
        </button>
      </div>
    )
  }

  function handleSave() {
    if (medId === undefined) return
    const doseAmount = Number(dose)
    if (!doseAmount) return
    onSave({
      type: 'dose',
      medicationId: medId,
      doseAmount,
      occurredAt: localInputToIso(when),
      createdAt: initial?.createdAt ?? new Date().toISOString(),
    })
    onClose()
  }

  return (
    <div className="space-y-4 p-4">
      <h2 className="text-lg font-bold">Dose</h2>
      <label className="block">
        <span className="text-sm text-slate-600">Medication</span>
        <select
          value={medId}
          onChange={(e) => {
            const id = Number(e.target.value)
            setMedId(id)
            const m = medications.find((x) => x.id === id)
            setDose(String(m?.defaultDose ?? ''))
          }}
          className="mt-1 w-full rounded border p-3"
        >
          {medications.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="text-sm text-slate-600">Dose ({selected?.unit})</span>
        <input
          type="number"
          inputMode="decimal"
          value={dose}
          onChange={(e) => setDose(e.target.value)}
          className="mt-1 w-full rounded border p-3 text-lg"
        />
      </label>
      <label className="block">
        <span className="text-sm text-slate-600">Time</span>
        <input
          type="datetime-local"
          value={when}
          onChange={(e) => setWhen(e.target.value)}
          className="mt-1 w-full rounded border p-3"
        />
      </label>
      <div className="flex gap-2">
        <button onClick={onClose} className="flex-1 rounded border p-3">
          Cancel
        </button>
        <button onClick={handleSave} className="flex-1 rounded bg-blue-600 p-3 font-bold text-white">
          Save
        </button>
      </div>
      {initial && onDelete && (
        <button onClick={onDelete} className="w-full rounded border border-red-500 p-3 font-semibold text-red-600">
          Delete
        </button>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npm run test -- DoseSheet`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add DoseSheet logging form with tests"
```

---

### Task 15b: Shared EventSheet (add/edit/delete wiring + modal)

A single component that owns the bottom-sheet modal and the storage side-effects, so Home and History don't duplicate add/edit/delete logic. It picks the right sheet from either the `adding` kind or the `editing` event's `type`.

**Files:**
- Create: `src/components/sheets/EventSheet.tsx`, `src/components/sheets/EventSheet.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/components/sheets/EventSheet.test.tsx`:

```tsx
import { describe, it, expect, beforeEach } from 'vitest'
import 'fake-indexeddb/auto'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import EventSheet from './EventSheet'
import { db } from '../../db/schema'
import { listEvents } from '../../db/storage'

describe('EventSheet', () => {
  beforeEach(async () => {
    await db.events.clear()
  })

  it('adds an event in add mode', async () => {
    render(<EventSheet adding="bottle" editing={null} medications={[]} onClose={() => {}} />)
    await userEvent.type(screen.getByLabelText(/volume/i), '100')
    await userEvent.click(screen.getByRole('button', { name: /save/i }))
    const events = await listEvents()
    expect(events).toHaveLength(1)
    expect((events[0] as { volumeMl: number }).volumeMl).toBe(100)
  })

  it('updates an event in edit mode', async () => {
    const id = await db.events.add({
      type: 'feed',
      volumeMl: 120,
      occurredAt: '2026-06-09T08:00:00.000Z',
      createdAt: '2026-06-09T08:00:00.000Z',
    })
    const editing = await db.events.get(id)
    render(<EventSheet adding={null} editing={editing!} medications={[]} onClose={() => {}} />)
    const input = screen.getByLabelText(/volume/i)
    await userEvent.clear(input)
    await userEvent.type(input, '150')
    await userEvent.click(screen.getByRole('button', { name: /save/i }))
    const events = await listEvents()
    expect(events).toHaveLength(1)
    expect((events[0] as { volumeMl: number }).volumeMl).toBe(150)
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `npm run test -- EventSheet`
Expected: FAIL — component does not exist.

- [ ] **Step 3: Implement `EventSheet.tsx`**

Create `src/components/sheets/EventSheet.tsx`:

```tsx
import type { BabyEvent, Medication } from '../../db/schema'
import { addEvent, updateEvent, deleteEvent } from '../../db/storage'
import BottleSheet from './BottleSheet'
import NappySheet from './NappySheet'
import DoseSheet from './DoseSheet'
import WeightSheet from './WeightSheet'

interface Props {
  adding: 'bottle' | 'nappy' | 'dose' | 'weight' | null
  editing: BabyEvent | null
  medications: Medication[]
  onClose: () => void
}

export default function EventSheet({ adding, editing, medications, onClose }: Props) {
  if (!adding && !editing) return null

  async function handleSave(event: BabyEvent) {
    if (editing?.id) {
      await updateEvent(editing.id, event)
    } else {
      await addEvent(event)
    }
  }

  async function handleDelete() {
    if (editing?.id && confirm('Delete this event?')) {
      await deleteEvent(editing.id)
      onClose()
    }
  }

  // Decide which sheet to render: the editing event's type wins, else the adding kind.
  const kind = editing ? editing.type : adding

  return (
    <div className="fixed inset-0 z-10 flex items-end bg-black/40" onClick={onClose}>
      <div className="w-full rounded-t-2xl bg-white" onClick={(e) => e.stopPropagation()}>
        {(kind === 'feed' || kind === 'bottle') && (
          <BottleSheet
            initial={editing?.type === 'feed' ? editing : undefined}
            onSave={handleSave}
            onDelete={editing ? handleDelete : undefined}
            onClose={onClose}
          />
        )}
        {kind === 'nappy' && (
          <NappySheet
            initial={editing?.type === 'nappy' ? editing : undefined}
            onSave={handleSave}
            onDelete={editing ? handleDelete : undefined}
            onClose={onClose}
          />
        )}
        {kind === 'dose' && (
          <DoseSheet
            medications={medications}
            initial={editing?.type === 'dose' ? editing : undefined}
            onSave={handleSave}
            onDelete={editing ? handleDelete : undefined}
            onClose={onClose}
          />
        )}
        {kind === 'weight' && (
          <WeightSheet
            initial={editing?.type === 'weight' ? editing : undefined}
            onSave={handleSave}
            onDelete={editing ? handleDelete : undefined}
            onClose={onClose}
          />
        )}
      </div>
    </div>
  )
}
```

> **Note:** `adding` uses the UI label `'bottle'` while the feed event type is `'feed'` — the BottleSheet branch matches both. Weight is added from the Weight page (Task 18) but editing a weight event from a timeline also routes here.

- [ ] **Step 4: Run to verify pass**

Run: `npm run test -- EventSheet`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add shared EventSheet add/edit/delete wiring"
```

---

### Task 16: Home screen — quick-log buttons, since-last, daily totals, timeline

**Files:**
- Create: `src/components/SinceLast.tsx`, `src/components/DailyTotals.tsx`, `src/components/Timeline.tsx`, `src/components/EventRow.tsx`
- Modify: `src/pages/HomePage.tsx`

- [ ] **Step 1: Implement `EventRow.tsx`**

Create `src/components/EventRow.tsx`:

```tsx
import type { BabyEvent } from '../db/schema'
import { gramsToKg } from '../lib/units'

function timeOf(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export function describeEvent(e: BabyEvent): string {
  switch (e.type) {
    case 'feed':
      return `Bottle ${e.volumeMl}ml${e.content ? ` (${e.content})` : ''}`
    case 'nappy':
      return `Nappy ${e.nappyType}${e.size ? ` (${e.size})` : ''}`
    case 'weight':
      return `Weight ${gramsToKg(e.grams).toFixed(3)} kg`
    case 'dose':
      return `Dose ${e.doseAmount}`
  }
}

interface Props {
  event: BabyEvent
  onClick?: () => void
}

export default function EventRow({ event, onClick }: Props) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center justify-between border-b bg-white px-4 py-3 text-left"
    >
      <span>{describeEvent(event)}</span>
      <span className="text-sm text-slate-400">{timeOf(event.occurredAt)}</span>
    </button>
  )
}
```

- [ ] **Step 2: Implement `SinceLast.tsx`**

Create `src/components/SinceLast.tsx`:

```tsx
import type { BabyEvent } from '../db/schema'
import { getLastEventOfType } from '../lib/stats'

function ago(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 60) return `${mins}m ago`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return `${h}h ${m}m ago`
}

export default function SinceLast({ events }: { events: BabyEvent[] }) {
  const lastFeed = getLastEventOfType(events, 'feed')
  const lastNappy = getLastEventOfType(events, 'nappy')
  return (
    <div className="grid grid-cols-2 gap-3 p-4">
      <div className="rounded bg-white p-3 shadow-sm">
        <div className="text-xs uppercase text-slate-400">Last bottle</div>
        <div className="text-lg font-semibold">
          {lastFeed ? `${ago(lastFeed.occurredAt)}` : '—'}
        </div>
        {lastFeed && <div className="text-sm text-slate-500">{lastFeed.volumeMl}ml</div>}
      </div>
      <div className="rounded bg-white p-3 shadow-sm">
        <div className="text-xs uppercase text-slate-400">Last nappy</div>
        <div className="text-lg font-semibold">
          {lastNappy ? `${ago(lastNappy.occurredAt)}` : '—'}
        </div>
        {lastNappy && <div className="text-sm capitalize text-slate-500">{lastNappy.nappyType}</div>}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Implement `DailyTotals.tsx`**

Create `src/components/DailyTotals.tsx`:

```tsx
import type { BabyEvent } from '../db/schema'
import { getDailyTotals } from '../lib/stats'

function localToday(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export default function DailyTotals({ events, day }: { events: BabyEvent[]; day?: string }) {
  const t = getDailyTotals(events, day ?? localToday())
  return (
    <div className="mx-4 rounded bg-white p-4 shadow-sm">
      <div className="text-xs uppercase text-slate-400">Today</div>
      <div className="text-sm text-slate-700">
        {t.feedCount} bottles / {t.feedVolumeMl}ml · {t.nappyWet} wet, {t.nappyDirty} dirty · {t.doseCount} doses
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Implement `Timeline.tsx`**

Create `src/components/Timeline.tsx`:

```tsx
import type { BabyEvent } from '../db/schema'
import EventRow from './EventRow'

interface Props {
  events: BabyEvent[]
  onSelect: (event: BabyEvent) => void
}

export default function Timeline({ events, onSelect }: Props) {
  if (events.length === 0) {
    return <p className="p-4 text-slate-400">No events yet today.</p>
  }
  return (
    <div className="mt-2">
      {events.map((e) => (
        <EventRow key={e.id} event={e} onClick={() => onSelect(e)} />
      ))}
    </div>
  )
}
```

- [ ] **Step 5: Implement `HomePage.tsx` wiring it all together**

Replace `src/pages/HomePage.tsx`:

```tsx
import { useState } from 'react'
import { useEvents, useMedications } from '../hooks/useEvents'
import { listEventsForDay } from '../lib/stats'
import type { BabyEvent } from '../db/schema'
import SinceLast from '../components/SinceLast'
import DailyTotals from '../components/DailyTotals'
import Timeline from '../components/Timeline'
import EventSheet from '../components/sheets/EventSheet'

function localToday(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export default function HomePage() {
  const events = useEvents()
  const medications = useMedications()
  const [adding, setAdding] = useState<'bottle' | 'nappy' | 'dose' | null>(null)
  const [editing, setEditing] = useState<BabyEvent | null>(null)
  const todays = listEventsForDay(events, localToday())

  return (
    <div>
      <div className="grid grid-cols-3 gap-3 p-4">
        <button onClick={() => setAdding('bottle')} className="rounded bg-blue-600 p-6 text-lg font-bold text-white">
          Bottle
        </button>
        <button onClick={() => setAdding('nappy')} className="rounded bg-amber-500 p-6 text-lg font-bold text-white">
          Nappy
        </button>
        <button onClick={() => setAdding('dose')} className="rounded bg-emerald-600 p-6 text-lg font-bold text-white">
          Dose
        </button>
      </div>

      <SinceLast events={events} />
      <DailyTotals events={events} />
      <Timeline events={todays} onSelect={(e) => setEditing(e)} />

      <EventSheet
        adding={adding}
        editing={editing}
        medications={medications}
        onClose={() => {
          setAdding(null)
          setEditing(null)
        }}
      />
    </div>
  )
}
```

> **Note:** tapping a quick-log button opens a sheet in *add* mode; tapping a timeline row opens the same sheet in *edit* mode (prefilled, with a Delete button). Add/edit/delete wiring is centralised in the shared `EventSheet` (Task 15b) so Home and History stay DRY. Delete uses a `confirm()` safety check; an undo-toast is a documented post-MVP nicety.

- [ ] **Step 6: Run all tests + type-check**

Run: `npm run test`
Run: `npx tsc --noEmit`
Expected: all green, no type errors.

- [ ] **Step 7: Manual check in browser**

Run: `npm run dev`. Log a bottle, a nappy (wet, then dirty+size), confirm they appear in the timeline, the since-last and daily totals update, and tapping a row offers delete. Stop the server.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: build home screen with quick-log, since-last, totals, timeline"
```

> **CHECKPOINT C** — The app is usable in a desktop browser: you can log all event types and see them reflected live. Pause for user verification.

---

# PHASE 4 — History, weight trend, settings/backup

### Task 17: History page (day-by-day browser)

**Files:**
- Modify: `src/pages/HistoryPage.tsx`

- [ ] **Step 1: Implement `HistoryPage.tsx`**

Replace `src/pages/HistoryPage.tsx`:

```tsx
import { useState } from 'react'
import { useEvents, useMedications } from '../hooks/useEvents'
import { listEventsForDay } from '../lib/stats'
import Timeline from '../components/Timeline'
import DailyTotals from '../components/DailyTotals'
import EventSheet from '../components/sheets/EventSheet'
import type { BabyEvent } from '../db/schema'

function localToday(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function shiftDay(day: string, delta: number): string {
  const d = new Date(day + 'T12:00:00')
  d.setDate(d.getDate() + delta)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export default function HistoryPage() {
  const events = useEvents()
  const medications = useMedications()
  const [day, setDay] = useState(localToday())
  const [editing, setEditing] = useState<BabyEvent | null>(null)
  const dayEvents = listEventsForDay(events, day)

  return (
    <div>
      <div className="flex items-center justify-between p-4">
        <button onClick={() => setDay(shiftDay(day, -1))} className="rounded border px-4 py-2">
          ‹ Prev
        </button>
        <span className="font-semibold">{day}</span>
        <button
          onClick={() => setDay(shiftDay(day, 1))}
          disabled={day >= localToday()}
          className="rounded border px-4 py-2 disabled:opacity-40"
        >
          Next ›
        </button>
      </div>
      <DailyTotals events={events} day={day} />
      <Timeline events={dayEvents} onSelect={(e) => setEditing(e)} />

      <EventSheet
        adding={null}
        editing={editing}
        medications={medications}
        onClose={() => setEditing(null)}
      />
    </div>
  )
}
```

- [ ] **Step 2: Type-check + manual check**

Run: `npx tsc --noEmit` (expected: no errors).
Run: `npm run dev`, log events across "yesterday" (use a sheet's time field to backdate), then verify the History prev/next navigation shows the right day's events and totals. Stop the server.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: add day-by-day history page"
```

---

### Task 18: Weight trend page (Recharts)

**Files:**
- Modify: `src/pages/WeightPage.tsx`

- [ ] **Step 1: Install Recharts**

```bash
npm install recharts
```

- [ ] **Step 2: Implement `WeightPage.tsx`**

Replace `src/pages/WeightPage.tsx`:

```tsx
import { useState } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
import { useEvents } from '../hooks/useEvents'
import { getLastEventOfType } from '../lib/stats'
import { gramsToKg } from '../lib/units'
import type { WeightEvent } from '../db/schema'
import EventSheet from '../components/sheets/EventSheet'

export default function WeightPage() {
  const events = useEvents()
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<WeightEvent | null>(null)

  const weights = events
    .filter((e): e is WeightEvent => e.type === 'weight')
    .sort((a, b) => a.occurredAt.localeCompare(b.occurredAt))

  const chartData = weights.map((e) => ({
    date: new Date(e.occurredAt).toLocaleDateString(),
    kg: Number(gramsToKg(e.grams).toFixed(3)),
  }))

  const latest = getLastEventOfType(events, 'weight')

  return (
    <div className="p-4">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">Weight</h1>
        <button onClick={() => setAdding(true)} className="rounded bg-blue-600 px-4 py-2 font-bold text-white">
          Add
        </button>
      </div>

      {latest && (
        <p className="mb-4 text-slate-600">Latest: {gramsToKg(latest.grams).toFixed(3)} kg</p>
      )}

      {chartData.length >= 2 ? (
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis domain={['auto', 'auto']} />
              <Tooltip />
              <Line type="monotone" dataKey="kg" stroke="#2563eb" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p className="text-slate-400">Add at least two measurements to see a trend.</p>
      )}

      <ul className="mt-4 divide-y">
        {[...weights].reverse().map((w) => (
          <li key={w.id}>
            <button onClick={() => setEditing(w)} className="flex w-full justify-between py-2 text-left">
              <span>{new Date(w.occurredAt).toLocaleDateString()}</span>
              <span className="font-medium">{gramsToKg(w.grams).toFixed(3)} kg</span>
            </button>
          </li>
        ))}
      </ul>

      <EventSheet
        adding={adding ? 'weight' : null}
        editing={editing}
        medications={[]}
        onClose={() => {
          setAdding(false)
          setEditing(null)
        }}
      />
    </div>
  )
}
```

- [ ] **Step 3: Type-check + manual check**

Run: `npx tsc --noEmit` (expected: no errors).
Run: `npm run dev`, add two weights and confirm the chart renders. Stop the server.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: add weight trend page with Recharts"
```

---

### Task 19: Settings — baby profile + medication management

**Files:**
- Modify: `src/pages/SettingsPage.tsx`
- Create: `src/hooks/useBaby.ts`

- [ ] **Step 1: Implement `useBaby.ts`**

Create `src/hooks/useBaby.ts`:

```ts
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/schema'
import type { Baby } from '../db/schema'

export function useBaby(): Baby | undefined {
  return useLiveQuery(() => db.babies.get(1), [], undefined)
}
```

- [ ] **Step 2: Implement the baby + medication sections in `SettingsPage.tsx`**

Replace `src/pages/SettingsPage.tsx`:

```tsx
import { useState } from 'react'
import { useBaby } from '../hooks/useBaby'
import { useMedications } from '../hooks/useEvents'
import {
  saveBaby,
  addMedication,
  deleteMedication,
} from '../db/storage'
import type { MedicationUnit } from '../db/schema'

const UNITS: MedicationUnit[] = ['ml', 'mg', 'IU', 'drops']

export default function SettingsPage() {
  const baby = useBaby()
  const medications = useMedications()

  const [name, setName] = useState('')
  const [dob, setDob] = useState('')
  const [medName, setMedName] = useState('')
  const [medDose, setMedDose] = useState('')
  const [medUnit, setMedUnit] = useState<MedicationUnit>('IU')

  return (
    <div className="space-y-8 p-4">
      <section>
        <h2 className="mb-2 text-lg font-bold">Baby</h2>
        <p className="mb-2 text-sm text-slate-500">
          Current: {baby ? `${baby.name} (born ${baby.dateOfBirth})` : 'not set'}
        </p>
        <input
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mb-2 w-full rounded border p-3"
        />
        <input
          type="date"
          value={dob}
          onChange={(e) => setDob(e.target.value)}
          className="mb-2 w-full rounded border p-3"
        />
        <button
          onClick={() => name && dob && saveBaby({ name, dateOfBirth: dob })}
          className="w-full rounded bg-blue-600 p-3 font-bold text-white"
        >
          Save baby
        </button>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-bold">Medications</h2>
        <ul className="mb-3 divide-y">
          {medications.map((m) => (
            <li key={m.id} className="flex items-center justify-between py-2">
              <span>
                {m.name} — {m.defaultDose} {m.unit}
              </span>
              <button
                onClick={() => m.id && deleteMedication(m.id)}
                className="text-sm text-red-600"
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
        <input
          placeholder="Name (e.g. Vitamin D)"
          value={medName}
          onChange={(e) => setMedName(e.target.value)}
          className="mb-2 w-full rounded border p-3"
        />
        <div className="mb-2 flex gap-2">
          <input
            type="number"
            placeholder="Default dose"
            value={medDose}
            onChange={(e) => setMedDose(e.target.value)}
            className="flex-1 rounded border p-3"
          />
          <select
            value={medUnit}
            onChange={(e) => setMedUnit(e.target.value as MedicationUnit)}
            className="rounded border p-3"
          >
            {UNITS.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={() => {
            if (!medName || !medDose) return
            addMedication({ name: medName, defaultDose: Number(medDose), unit: medUnit })
            setMedName('')
            setMedDose('')
          }}
          className="w-full rounded bg-emerald-600 p-3 font-bold text-white"
        >
          Add medication
        </button>
      </section>
    </div>
  )
}
```

- [ ] **Step 3: Type-check + manual check**

Run: `npx tsc --noEmit` (expected: no errors).
Run: `npm run dev`, set the baby profile, add a medication, then confirm the Dose sheet on Home now lists it. Stop the server.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: add settings for baby profile and medications"
```

---

### Task 20: Settings — JSON export/import (backup)

**Files:**
- Modify: `src/pages/SettingsPage.tsx`

- [ ] **Step 1: Add the backup section to `SettingsPage.tsx`**

Add these imports at the top of `src/pages/SettingsPage.tsx`:

```tsx
import { exportAll, importAll } from '../db/storage'
import { serializeBackup, parseBackup } from '../lib/backup'
```

Then add this `<section>` immediately before the closing `</div>` of the returned markup:

```tsx
      <section>
        <h2 className="mb-2 text-lg font-bold">Backup</h2>
        <button
          onClick={async () => {
            const data = await exportAll()
            const json = serializeBackup(data)
            const blob = new Blob([json], { type: 'application/json' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `baby-tracker-backup-${new Date().toISOString().slice(0, 10)}.json`
            a.click()
            URL.revokeObjectURL(url)
          }}
          className="mb-3 w-full rounded bg-slate-700 p-3 font-bold text-white"
        >
          Export JSON
        </button>
        <label className="block w-full rounded border-2 border-dashed p-3 text-center text-slate-600">
          Import JSON
          <input
            type="file"
            accept="application/json"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0]
              if (!file) return
              try {
                const text = await file.text()
                const data = parseBackup(text)
                if (!confirm('Importing will REPLACE all current data. Continue?')) return
                await importAll(data)
                alert('Import complete.')
              } catch (err) {
                alert(`Import failed: ${(err as Error).message}`)
              }
            }}
          />
        </label>
      </section>
```

- [ ] **Step 2: Type-check + manual round-trip check**

Run: `npx tsc --noEmit` (expected: no errors).
Run: `npm run dev`. Export a JSON file, clear data by importing it back (or open in a fresh browser profile and import), and confirm events/medications/baby restore correctly. Stop the server.

- [ ] **Step 3: Run the full test suite**

Run: `npm run test`
Expected: all green.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: add JSON export/import backup in settings"
```

> **CHECKPOINT D** — History browsing, weight trend, baby/medication settings, and JSON backup all work end-to-end in the browser, and the full test suite is green. Pause for user verification.

---

# PHASE 5 — Deploy + install

### Task 21: Replace placeholder PWA icons with real ones

**Files:**
- Replace: `public/icon-192.png`, `public/icon-512.png`

- [ ] **Step 1: Provide real icons**

Create or obtain a 512×512 PNG app icon and a 192×192 version (any simple baby/bottle glyph on the `#2563eb` background is fine). Overwrite `public/icon-192.png` and `public/icon-512.png`.

- [ ] **Step 2: Rebuild and confirm**

Run: `npm run build`
Expected: build succeeds; `dist/manifest.webmanifest` references both icons.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "chore: add real PWA icons"
```

---

### Task 22: Deploy to Vercel

**Files:**
- Create: `vercel.json`

- [ ] **Step 1: Add SPA rewrite config**

Create `vercel.json` (so client-side routes like `/history` resolve on refresh):

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/" }]
}
```

- [ ] **Step 2: Push to a Git remote**

Create a remote repo (GitHub) and push:

```bash
git remote add origin <your-repo-url>
git push -u origin main
```

(If `main` is protected by hooks, this is the user's own personal repo — push is expected. The user performs the GitHub repo creation.)

- [ ] **Step 3: Connect Vercel**

In the Vercel dashboard: New Project → import the repo. Framework preset: **Vite**. Build command `npm run build`, output dir `dist`. Deploy.

- [ ] **Step 4: Verify the deployed URL**

Open the Vercel URL in desktop Chrome. Confirm the app loads, routing works on refresh, and (DevTools → Application) a service worker + manifest are registered.

- [ ] **Step 5: Commit the config**

```bash
git add -A
git commit -m "chore: add Vercel SPA rewrite config"
git push
```

---

### Task 23: Install on the Android phone + smoke test

- [x] **Step 1: Install**

On the Android phone, open the Vercel URL in Chrome → menu → **Add to Home screen / Install app**. Confirm it installs with the icon and launches standalone (no browser chrome).

- [x] **Step 2: Real-world smoke test**

Log a bottle, a nappy, a dose, and a weight. Confirm since-last, daily totals, history, and the weight chart all behave. Toggle airplane mode and confirm the app still opens and logs offline (data persists locally).

- [x] **Step 3: Export a backup from the phone**

Use Settings → Export JSON and confirm the file saves to the device. Keep this as your first backup.

> **CHECKPOINT E** ✅ **COMPLETE (2026-06-10)** — The PWA is installed on the user's Android phone, works offline, and backs up. **MVP COMPLETE.** Live at https://baby-tracker-seven-gray.vercel.app/.

---

## Post-MVP (separate plans, not built here)

- **Notifications** (interval "3h since last bottle" + scheduled "Vitamin D 9am"). Built last, as its own plan; may require revisiting the no-backend decision (see ADR-0001). Best-effort local notifications first.
- Breast feeds (side + duration) and solids.
- Sleep, pumping, free-text notes, height/other measurements.
- Undo-toast in place of `confirm()` for deletes.
- CSV export.
- Multiple babies; multi-caregiver sync (requires a backend).

---

## Notes for the implementer

- All `*.test.ts(x)` files use Vitest globals (`describe`/`it`/`expect`) — enabled via `globals: true` in `vite.config.ts`. No per-file import of the test runner is required, but importing from `vitest` (as shown) is also fine.
- Storage tests rely on `fake-indexeddb/auto` — keep that import at the top of any test that touches `db`.
- Keep all Dexie access inside `src/db/storage.ts` and the `src/hooks/*` live-query hooks. Components and pages must not import `db` directly — this is what keeps a future backend swap cheap (ADR-0001).
- The test script pins `TZ=UTC`; the day-bucketing logic is timezone-sensitive, so don't remove it.
```
