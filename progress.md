# Progress: Opportunistic H1 event types — Pumping (Note & Growth done)
_Updated: 2026-07-05 18:20 · Branch: main (28b155a, clean, synced) · paused after Note merged_

Shipped: H1 complete (PRs #12–#20), DX.1 (#21), **Growth** (#22), and **Note** (#23). See the plan's ✅ markers. Now on: the last opportunistic H1 type — **Pumping**.

## Goal
Add the final opportunistic H1 event type behind Enabled Event Types (ADR-0004): **Pumping** (volume expressed). Loggable, in History, opt-in via the Settings toggle, unit-tested. Part of the opportunistic-H1 slice — see plan §"Opportunistic in H1".

## Status
Note just merged to `main` (clean). Not started on Pumping. Two proven templates now exist: Growth (#22, per-measurement own-page type) and Note (#23, home quick-log type). Pumping is a home quick-log type like Note — mirror that pattern.

## Next
1. **Decide the shape first** — plan calls Pumping "duration + volume". Lean **volume-only + optional side** (ml expressed, optional left/right/both), keep it minimal; only add duration if it clearly earns its place. It's a *supply* event, distinct from a breast *feed* (nursing, ADR-0007) — keep it its own type, don't conflate.
2. **Build Pumping** as a home quick-log type (Note is the closest template, PR #23): `type: 'pumping'; volumeMl: number; side?: BreastSide` on the `BabyEvent` union ([schema.ts](src/db/schema.ts)); no Dexie bump. Wire the exhaustive `EventType` touchpoints the compiler flags — the build errors are the checklist: `eventColor`/`eventLabel`/`EVENT_VARS` ([theme.ts](src/lib/theme.ts)) + `--pumping` in [index.css](src/index.css), `EventIcon` ([icons.tsx](src/components/icons.tsx)), `packPayload`+`eventFromRow` ([mapping.ts](src/lib/sync/mapping.ts) + tests), `describeEvent` ([EventList.tsx](src/components/EventList.tsx)), `showToast` ([HomePage.tsx](src/pages/HomePage.tsx:85)), `LogButtons.KINDS`, `EventSheet.adding` union + a `PumpingSheet`.
3. **Opt-in mechanics** (proven on Growth #22 & Note #23): leave it OUT of `DEFAULT_ENABLED_EVENT_TYPES`, ADD it to `TOGGLEABLE_TYPES` in [SettingsPage.tsx](src/pages/SettingsPage.tsx:34).
4. Tests first (pure logic: mapping round-trip), light RTL on the sheet (save + validation), then `npm run shots` (enable it + seed a row in [fixture.ts](src/dev/fixture.ts)).
_Later:_ **DX.2** (staging + test account) · **H2** (the smart layer) — see roadmap plan.

## Context & decisions (this task only)
- **Pumping vs breast feed:** pumping is a *supply* event (volume expressed), distinct from a breast *feed* (nursing duration, ADR-0007). Its own type — don't conflate. Volume-only keeps it simple; a pumped bottle later fed is still a separate Feed-Bottle event.
- **Home quick-log, not own-page:** like Note, Pumping is a `LogKind` (button + sheet), not a per-measurement own-page type like Weight/Growth.
- Adding a value to the `EventType` union makes `tsc -b` flag every exhaustive switch/Record that needs a case — use the build as the checklist (both Growth and Note followed this exactly).
- Every new type reads through `storage.ts` (`addEvent`/`updateEvent`/`listEvents`), never raw Dexie. A plain instant event needs no new storage fn.

## Key files & links
- Same touchpoints Note used (PR #23 is the template): [schema.ts](src/db/schema.ts) · [mapping.ts](src/lib/sync/mapping.ts) · [theme.ts](src/lib/theme.ts) · [icons.tsx](src/components/icons.tsx) · [EventList.tsx](src/components/EventList.tsx) · [LogButtons.tsx](src/components/LogButtons.tsx) · [EventSheet.tsx](src/components/sheets/EventSheet.tsx) · [NoteSheet.tsx](src/components/sheets/NoteSheet.tsx) (copy for PumpingSheet) · [SettingsPage.tsx](src/pages/SettingsPage.tsx) · [fixture.ts](src/dev/fixture.ts)
- _Always:_ [roadmap plan](docs/superpowers/plans/2026-07-03-roadmap-implementation.md) (§"Opportunistic in H1") · [CONTEXT.md](CONTEXT.md) · [ADRs](docs/adr/) (0004 enabled-types · 0007 breast-as-method)

## Verify & run
- Gate (all must pass): **`npm run build`** (= `tsc -b && vite build`) · `npx eslint src/ scripts/` · `npm test` (sets `TZ=UTC`).
- Visual check: **`npm run shots`** → PNGs in gitignored `screenshots/`. Needs the sandbox disabled (Chromium Mach-port `Permission denied 1100`); one-time `npx playwright install chromium`. If it reports "dev server did not start", first `pkill -f node_modules/.bin/vite` to clear stray instances.
- App: `npm run dev` → open `/index.dev.html` for the seeded, auth-free shell. `git push`/`gh` also need the sandbox disabled (env blocks TLS to github.com).
