# Progress: Pumping on PR #24 — opportunistic H1 complete; next is DX.2 / H2
_Updated: 2026-07-05 19:35 · Branch: feat/h1-pumping-event-type ([PR #24](https://github.com/Tariq-rahman/baby-tracker/pull/24)) · paused with Pumping pushed, awaiting merge_

Shipped: H1 complete (PRs #12–#20), DX.1 (#21), and the opportunistic-H1 slice — **Growth** (#22), **Note** (#23). **Pumping** is built and on **PR #24** (green locally, not yet merged). See the plan's ✅ markers.

## Goal
Ship the final opportunistic H1 event type — **Pumping** (volume expressed + optional side), opt-in via Enabled Event Types (ADR-0004). Done once PR #24 merges. This closes the opportunistic-H1 slice; the next real task is **DX.2** or picking an **H2** item.

## Status
Pumping is fully implemented, tested, visually verified, committed (351047d), pushed, and PR #24 is open. Gate is green: `npm run build` ✅, `npx eslint src/ scripts/` ✅, `npm test` ✅ (309), `npm run shots` ✅ (button on home, "180 Ml Pumped" row in History light+dark, Settings toggle). Nothing left on Pumping but merge.

## Next
1. **Watch PR #24** to green/merge (use the `monitor` skill if CI/review comments come in). On merge, this task is done.
2. **After merge:** pick the next slice — **DX.2** (staging + test account) or an **H2** item (the smart layer). Decide with the user.
3. On merge, prune this file down to the DX.2/H2 task (graduate nothing new — Pumping's durable "why" already lives in CONTEXT.md's glossary + ADR-0004/0007).
_Later:_ **H2** — the smart layer (insights/baselines), see roadmap plan §"Phase 2".

## Context & decisions (this task only)
- **Shape chosen: volume-only + optional side** (`volumeMl: number; side?: BreastSide`), no duration. The plan floated "duration + volume" but duration didn't earn its place — output is the datum. Recorded in CONTEXT.md's Pumping glossary entry.
- **Supply ≠ Feed:** Pumping is its own type, not conflated with breast (nursing, ADR-0007) or bottle (consumed) feeds. A pumped bottle later fed is still a separate Feed event.
- **Home quick-log, not own-page:** it's a `LogKind` (button + sheet, `PumpingSheet`), reusing BottleSheet's volume stepper + preset carousel; side is an optional tap-to-toggle chip (undefined → left/right/both → clear).
- Colour: dusty rose `#C08497` (light) / `#D19DAC` (dark) — distinct from feed amber / sleep mauve. Icon: funnel-over-bottle pump glyph (`PumpIcon`).
- Adding to the `EventType` union made `tsc -b` flag every exhaustive switch — used the build as the checklist (same touchpoints as Note #23).
- (When PR #24 merges, this whole section leaves the file — the PR + CONTEXT.md + ADRs are the record.)

## Key files & links
- New: [PumpingSheet.tsx](src/components/sheets/PumpingSheet.tsx) + [test](src/components/sheets/PumpingSheet.test.tsx). Touched (same set as Note #23): [schema.ts](src/db/schema.ts) · [mapping.ts](src/lib/sync/mapping.ts) · [theme.ts](src/lib/theme.ts) · [index.css](src/index.css) · [icons.tsx](src/components/icons.tsx) · [EventList.tsx](src/components/EventList.tsx) · [LogButtons.tsx](src/components/LogButtons.tsx) · [EventSheet.tsx](src/components/sheets/EventSheet.tsx) · [HomePage.tsx](src/pages/HomePage.tsx) · [SettingsPage.tsx](src/pages/SettingsPage.tsx) · [fixture.ts](src/dev/fixture.ts)
- _Always:_ [roadmap plan](docs/superpowers/plans/2026-07-03-roadmap-implementation.md) · [CONTEXT.md](CONTEXT.md) · [ADRs](docs/adr/) (0004 enabled-types · 0007 breast-as-method)

## Verify & run
- Gate (all must pass): **`npm run build`** (= `tsc -b && vite build`) · `npx eslint src/ scripts/` · `npm test` (sets `TZ=UTC`).
- Visual check: **`npm run shots`** → PNGs in gitignored `screenshots/`. Needs the sandbox disabled (Chromium Mach-port `Permission denied 1100`). If it reports "dev server did not start", first `pkill -f node_modules/.bin/vite`.
- App: `npm run dev` → open `/index.dev.html` for the seeded, auth-free shell. `git push`/`gh` also need the sandbox disabled (env blocks TLS to github.com).
