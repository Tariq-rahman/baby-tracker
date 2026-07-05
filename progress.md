# Progress: Opportunistic H1 event types (Growth / Pumping / Note)
_Updated: 2026-07-05 18:45 · Branch: main (5ff7319, clean, synced) · paused before starting — decision pending_

Shipped: H1 complete (PRs #12–#20), H1 docs → ADRs 0009/0010, and **DX.1 local visual-check loop** (PR #21). See the plans' ✅ markers. Now starting: **opportunistic H1 event types**.

## Goal
Add the remaining opportunistic H1 event types behind Enabled Event Types (ADR-0004): **Growth** (height / head circumference), **Pumping**, and a free-text **Note**. Done when each is loggable, appears in History, respects the enabled-types toggle, and has unit tests — surfaced only when its type is enabled.

## Status
Not started. Clean base on `main`; DX.1 merged, so `npm run shots` is available to visually check each new form + History row. H1's five core types (feed/nappy/weight/dose/sleep) all shipped.

## Next
1. **Settle the open question first** (see Blocked) — default-on vs opt-in — because it decides whether `DEFAULT_ENABLED_EVENT_TYPES` changes.
2. **Scope the event model:** extend `EventType` + the `BabyEvent` discriminated union in [schema.ts](src/db/schema.ts). Growth ≈ a numeric measurement (store metric as integers per CONTEXT), Pumping ≈ volume + optional side/duration, Note ≈ free text. Check whether any needs a Dexie version bump (weight/dose didn't — non-indexed fields don't).
3. **Wire storage + UI:** `storage.ts` add/list, the log sheet ([EventSheet.tsx](src/components/sheets/EventSheet.tsx)), History rows, Trends if applicable.
4. **Tests first** for pure logic (any unit conversion / aggregation), then light RTL on the new forms; then `npm run shots` to eyeball light/dark.
_Later:_ **DX.2** (staging + test account) · **H2** (the smart layer) — see roadmap plan.

## Context & decisions (this task only)
- **Pumping vs breast feed:** pumping is a *supply* event (volume expressed), distinct from a breast *feed* (nursing duration, ADR-0007). Keep it its own type — don't conflate.
- Every new type must read through `storage.ts` (soft-delete `deletedAt == null` filter + sync bookkeeping), never raw Dexie.
- To visually verify a new type, add sample rows to [fixture.ts](src/dev/fixture.ts) then `npm run shots`.

## Blocked / open questions
- **Default-on or opt-in?** Are Growth/Pumping/Note in `DEFAULT_ENABLED_EVENT_TYPES` (affects every existing household) or purely opt-in via Settings → Enabled Event Types? Leaning opt-in; needs the user's call before coding. Also: which of the three to build first?

## Key files & links
- Where new types land: [schema.ts](src/db/schema.ts) (`EventType`, `BabyEvent` union, Dexie version) · [storage.ts](src/db/storage.ts) (add/list) · [EventSheet.tsx](src/components/sheets/EventSheet.tsx) (log forms) · [HistoryPage.tsx](src/pages/HistoryPage.tsx) (rows)
- _Always:_ [roadmap plan](docs/superpowers/plans/2026-07-03-roadmap-implementation.md) · [DX plan](docs/superpowers/plans/2026-07-05-developer-experience.md) (DX.1 ✅ + harness op-notes) · [CONTEXT.md](CONTEXT.md) · [ADRs](docs/adr/) (0004 enabled-types · 0007 breast-as-method)

## Verify & run
- Gate (all must pass): **`npm run build`** (= `tsc -b && vite build`) · `npx eslint src/` · `npm test` (sets `TZ=UTC`).
- Visual check: **`npm run shots`** → PNGs in gitignored `screenshots/`. One-time `npx playwright install chromium`; needs the sandbox disabled (see DX plan op-notes).
- App: `npm run dev` → open `/index.dev.html` for the seeded, auth-free shell. `git push`/`gh` need the sandbox disabled (env blocks TLS to github.com).
