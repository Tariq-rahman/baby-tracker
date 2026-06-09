# Baby Tracker — Design Spec

**Date:** 2026-06-09
**Status:** Approved

A local-first, installable Progressive Web App for tracking a baby's daily care events. Built for a single caregiver, on a single Android device, tracking a single baby. Multi-caregiver sync, multiple babies, and a backend are deliberately deferred.

See `CONTEXT.md` for the domain glossary and `docs/adr/0001-local-first-storage.md` for the storage decision.

---

## 1. Goals & scope

### In scope (MVP)
- Track four event types: **Feed** (bottle), **Nappy**, **Weight**, **Medication dose**.
- Fast one-handed logging with sensible defaults.
- Glanceable home screen: "time since last", today's totals, today's timeline.
- Day-by-day history browsing.
- Weight trend chart.
- Settings: baby profile, medication management, JSON export/import.
- Installable PWA (Android), offline-capable.
- Push notifications (interval + scheduled) — **built last**, after the core app is solid.

### Deferred (documented, not built)
- Multi-caregiver shared/synced data and any backend.
- Multiple babies / baby switcher.
- Breast feeds (side + duration) and solids.
- Sleep, pumping, free-text notes, height/other measurements.
- Richer analytics beyond daily totals and the weight trend.
- CSV export.
- Audit trail of edits.

---

## 2. Architecture

A **client-only React PWA**. No backend. All data persists in the browser's **IndexedDB** via **Dexie.js**, accessed exclusively through a `storage` module so a backend/sync layer can be added later without touching feature code.

**Tech stack**
- React + Vite + TypeScript (TypeScript mandatory).
- Dexie.js over IndexedDB.
- Tailwind CSS (large, one-handed tap targets).
- Recharts (weight trend).
- vite-plugin-pwa / Workbox (service worker + manifest).
- Deployment: static build to **Vercel** (Cloudflare Pages interchangeable); HTTPS required for service worker.

**Module boundaries**
- `storage` — the only place that talks to Dexie. Exposes typed CRUD over entities. Functions returning collections prefixed `list`, single items `get`.
- `units` — pure conversions: lb+oz ↔ grams, kg (decimal) ↔ grams. All rounding to nearest gram happens here.
- `stats` — pure aggregation: time-since-last per event type, daily totals.
- UI feature modules (home, logging, history, weight, settings) — consume `storage`, `units`, `stats`.

---

## 3. Data model

All persistence is local. Weight is always stored internally as **integer grams**; conversion happens only at the UI boundary via `units`.

### Baby (singleton)
```
{ name: string, dateOfBirth: ISODate }
```
Configured once in settings. Events do not reference the baby — there is only one.

### Medication (definition)
```
{ id, name: string, defaultDose: number, unit: 'ml' | 'mg' | 'IU' | 'drops' }
```
Defined once for reuse. Defining a medication is a setup action, not a logged event.

### Event (single table, discriminated by `type`)
Common fields:
```
{ id, type: 'feed' | 'nappy' | 'weight' | 'dose', occurredAt: ISODateTime, createdAt: ISODateTime }
```
Per-type fields:
- **feed:** `{ volumeMl: number, content?: 'formula' | 'breastmilk' }`
- **nappy:** `{ nappyType: 'wet' | 'dirty' | 'both', size?: 'small' | 'medium' | 'large' }`
  - `size` is present only when `nappyType` is `dirty` or `both`; absent for `wet`.
- **weight:** `{ grams: number }`
- **dose:** `{ medicationId, doseAmount: number }` — always references an existing Medication.

A single events table keeps the home timeline and daily totals as one sorted query (`occurredAt`).

---

## 4. Screens & UX

### Home (main screen)
- **Quick-log buttons** (big tap targets): Bottle, Nappy, Dose. Smaller link to Weight.
- **"Since last" status:** e.g. "Last bottle: 2h 15m ago (120ml)", "Last nappy: 45m ago".
- **Daily totals card:** e.g. "Today: 6 bottles / 720ml · 5 nappies (3 wet, 2 dirty) · 2 doses".
- **Today's timeline:** reverse-chronological list of today's events; tap any to edit or delete.

### Logging flows
- **Bottle:** sheet with ml entry (number pad) + optional content toggle (formula / breast milk) + time (defaults to now). Save.
- **Nappy:** wet = one tap to save; dirty/both reveals the size picker. Time defaults to now.
- **Dose:** pick medication (default dose pre-filled, editable) + time.
- **Weight:** lb+oz or kg (decimal) entry, converted to grams on save.
- All event times default to "now" but are editable (backdating supported).
- Delete is available with an undo/confirm to prevent fat-finger loss. No audit trail.

### History
- Day-by-day browser: date navigator + that day's events + that day's totals.

### Weight
- Trend line chart (Recharts) + list of measurements.

### Settings
- Baby profile (name, DOB).
- Manage medications (create/edit/delete definitions).
- JSON export (lossless, re-importable) and import to restore.

### Notifications (built last)
- **Interval reminders:** e.g. "3h since last bottle" against a caregiver-set target interval.
- **Scheduled reminders:** fixed times, e.g. "Vitamin D at 9am" (pairs with medications).
- Best-effort local notifications first. If reliability proves inadequate on PWA, revisit the local-first decision (a backend/push server) — see ADR-0001.

---

## 5. Testing

- **Vitest** unit tests on all pure logic — mandatory for:
  - unit conversions (lb+oz ↔ grams, kg ↔ grams)
  - time-since-last calculations
  - daily-total aggregation
  - export/import JSON round-trip
- **React Testing Library** component tests on the critical logging forms.
- **No E2E** for the MVP.

---

## 6. Build sequence

1. **Scaffold** — Vite + React + TS + Tailwind + Dexie; PWA manifest + service worker; storage abstraction + schema.
2. **Pure logic (TDD)** — `units` and `stats`, Vitest from the start.
3. **Logging + home** — quick-log buttons, the four log forms, "since last" + daily totals + today's timeline; edit/delete with undo.
4. **History** — day-by-day browser.
5. **Weight trend** — Recharts chart + measurement list.
6. **Settings** — baby profile, medication management, JSON export/import (with round-trip test).
7. **Deploy** — Vercel; install to Android home screen; live-test on device.
8. **Notifications (last)** — interval + scheduled; best-effort local first.

---

## 7. Risks & open questions

- **Data durability:** local-only storage is vulnerable to cache eviction / device loss. Mitigated (not eliminated) by manual JSON export/import. The caregiver must back up periodically. (ADR-0001.)
- **Notification reliability:** PWA local scheduled notifications can be killed by the OS. If interval/scheduled reminders prove unreliable, this forces revisiting the no-backend decision.
- **iOS:** out of scope (Android-only target), so iOS Safari PWA limitations are not a concern for the MVP.
