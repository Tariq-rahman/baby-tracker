# Progress: Opportunistic H1 event types — Note & Pumping (Growth done)
_Updated: 2026-07-05 19:20 · Branch: main (b5b758f, clean, synced) · paused after Growth merged_

Shipped: H1 complete (PRs #12–#20), DX.1 (#21), and **Growth** event type (#22). See the plan's ✅ markers. Now on: the last two opportunistic H1 types — **Note** and **Pumping**.

## Goal
Add the two remaining opportunistic H1 event types behind Enabled Event Types (ADR-0004): a free-text **Note** and **Pumping** (volume expressed). Each: loggable, in History, opt-in via the Settings toggle, unit-tested. Part of the opportunistic-H1 slice — see plan §"Opportunistic in H1".

## Status
Growth just merged to `main` (clean). Not started on Note/Pumping. The Weight→Growth pattern is now the proven template for a new per-measurement type; Note/Pumping differ from it (see decisions).

## Next
1. **Pick order** — recommend **Note first** (simplest: free text, no units, no chart, no Trends card — just a log sheet + History row). Pumping second.
2. **Build Note:** `type: 'note'; text: string` on the `BabyEvent` union ([schema.ts](src/db/schema.ts)); no Dexie bump. Wire the six exhaustive `EventType` touchpoints the compiler flags — the build errors are a checklist: `eventColor`/`eventLabel`/`EVENT_VARS` ([theme.ts](src/lib/theme.ts)) + `--note` in [index.css](src/index.css), `EventIcon` ([icons.tsx](src/components/icons.tsx)), `packPayload`+`eventFromRow` ([mapping.ts](src/lib/sync/mapping.ts) + tests), `describeEvent` ([EventList.tsx](src/components/EventList.tsx)), `showToast` ([HomePage.tsx](src/pages/HomePage.tsx:85)). Note likely IS a home quick-log type (unlike Growth) → also `LogButtons.KINDS`, `EventSheet.adding` union, a `NoteSheet`.
3. **Then Pumping** — see the distinct-from-breast-feed decision below.
4. Tests first (pure logic), light RTL on the sheet, then `npm run shots`.
_Later:_ **DX.2** (staging + test account) · **H2** (the smart layer) — see roadmap plan.

## Context & decisions (this task only)
- **Note is NOT a measurement type** (unlike Growth/Weight): no chart, no Trends card, no units. It's a home quick-log type — mirror the feed/nappy pattern (`LogButtons.KINDS` + `EventSheet.adding` + a sheet + `showToast` case), not the Weight/Growth own-page pattern. Guard hard against scope creep (plan §146: "deliberately minimal timestamped note").
- **Pumping vs breast feed:** pumping is a *supply* event (volume expressed), distinct from a breast *feed* (nursing duration, ADR-0007). Keep it its own type — don't conflate. Plan calls it "duration + volume"; decide at build time whether duration is worth it or volume-only is enough (lean volume + optional side, keep minimal).
- **Opt-in mechanics** (proven on Growth #22): leave new types OUT of `DEFAULT_ENABLED_EVENT_TYPES`, ADD them to `TOGGLEABLE_TYPES` in [SettingsPage.tsx](src/pages/SettingsPage.tsx:32). Adding a value to the `EventType` union makes `tsc -b` flag every exhaustive switch/Record that needs a case — use the build as the checklist.
- Every new type reads through `storage.ts` (`addEvent`/`updateEvent`/`listEvents` — soft-delete filter + sync bookkeeping), never raw Dexie. A plain instant event needs no new storage fn.
- To eyeball a new type in `npm run shots`: enable it in [fixture.ts](src/dev/fixture.ts) (`settings.enabledEventTypes`) and seed sample rows; add its route to `scripts/shots.mjs` only if it has its own page (Note won't).

## Key files & links
- Model + wiring (same touchpoints Growth used): [schema.ts](src/db/schema.ts) · [mapping.ts](src/lib/sync/mapping.ts) · [theme.ts](src/lib/theme.ts) · [icons.tsx](src/components/icons.tsx) · [EventList.tsx](src/components/EventList.tsx) · [EventSheet.tsx](src/components/sheets/EventSheet.tsx) · [SettingsPage.tsx](src/pages/SettingsPage.tsx) · [fixture.ts](src/dev/fixture.ts)
- _Always:_ [roadmap plan](docs/superpowers/plans/2026-07-03-roadmap-implementation.md) (§"Opportunistic in H1") · [CONTEXT.md](CONTEXT.md) · [ADRs](docs/adr/) (0004 enabled-types · 0007 breast-as-method)

## Verify & run
- Gate (all must pass): **`npm run build`** (= `tsc -b && vite build`) · `npx eslint src/` · `npm test` (sets `TZ=UTC`).
- Visual check: **`npm run shots`** → PNGs in gitignored `screenshots/`. Needs the sandbox disabled (Chromium Mach-port `Permission denied 1100` under sandbox); one-time `npx playwright install chromium`.
- App: `npm run dev` → open `/index.dev.html` for the seeded, auth-free shell. `git push`/`gh` also need the sandbox disabled (env blocks TLS to github.com).
