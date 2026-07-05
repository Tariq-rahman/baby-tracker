# Progress: Roadmap implementation

_Updated: 2026-07-05 12:20 · Branch: main @ 4e538fc · Task 1.2 MERGED + visually verified, Task 1.3 next_

## Goal
Implement the roadmap (H0–H4) one task/PR at a time, per the implementation plan. Planning lives on `main` (ROADMAP.md, ADRs, plan).

## Status
**H1 Task 1.2 (Trends view) is DONE and MERGED to `main`** (PR #15, merge `4e538fc`) and visually verified by the user. Working tree clean, on `main`. Full gate was green (build, eslint, 215 tests incl. 13 new). The `/trends` page has per-metric small-multiple cards (feeds, sleep, nappies, doses), a 7d/30d/All window selector, and a dashed baseline reference line per card; Weight is a card linking to the retained `/weight` page; the bottom-nav "Weight" tab is now "Trends". Insight strategies + "not enough data" copy are deferred to Task 1.3 (each card has an `insight` slot; feed card shows factual avg ml/nursing-min as a placeholder). Nothing in flight — next is Task 1.3 on a fresh branch off `main`.

## Done
- **Planning** — ROADMAP.md, CONTEXT.md glossary, ADRs 0004–0008, implementation plan. On `main`.
- **H0 Task 0.1 — Enabled Event Types** — merged (PR #12). Migration `0009_baby_settings.sql` applied to remote.
- **H0 Task 0.2 — Insight strategy scaffold** — merged (PR #13, `6f30776`), pure logic, no UI. `src/lib/insights/` baseline helpers + runner; thresholds/windows are strategy params.
- **Migration ledger reconciled** — `0008_cron_auth_key` backfilled (version `20260702184527`); ledger contiguous `0001`–`0009`; cron healthy.
- **H1 Task 1.1 — Breastfeeding (ADR-0007)** — MERGED (PR #14, merge `35be98d`; feature commit `05bcb7c`):
  - `FeedEvent` is now a discriminated union: `BottleFeedEvent` (`method?: 'bottle'`, `volumeMl`+`content`) | `BreastFeedEvent` (`method: 'breast'`, `side`, `endedAt`). `method` optional on bottle ⇒ **legacy rows read as bottles, no Dexie/server migration**; all in `payload`.
  - `mapping.ts` branches on method, defaults no-method payloads to bottle. `storage.ts` `startBreastFeed`/`stopBreastFeed`. `stats.ts` NaN guard + `getRunningBreastFeed`/`isFlaggedBreastFeed`/`nursingMinutesForDay`/`isBreastFeed`.
  - UI: `FeedSheet` (bottle/breast toggle) wraps body-only `BottleSheet` + new `BreastSheet` (timer + side chips). `RunningSleepBanner` → generic `RunningBanner`; both sleep and breast-feed banners render. One running breast feed enforced.
  - +13 tests (mapping legacy default, breast round-trips, storage start/stop, nursing aggregation, running/flag detection, feedCount-not-volume). Suite 202, all green.

## Next
1. **H1 Task 1.3 — First reflective insights** (see plan §"Task 1.3"). Branch off `main` (`feat/insights`). Implement concrete strategies against the 0.2 scaffold (`src/lib/insights/`): volume-vs-baseline (bottle), frequency/nursing-min-vs-baseline (breast), confidence-gated next-feed prediction. Render into the **insight slot already on each `TrendCard`** (`insight` prop) + honest "not enough data yet" state. Copy rules ADR-0005 (no "enough"/"normal"/"should"; optional "worth mentioning to your pediatrician" hand-off only).
2. **Deferred (Phase 2 edge-function work):** feed reminders' "last feed" must be the last feed of *either* method — a nursing session counts. `getLastEventOfType(events,'feed')` already returns either method client-side; the `feed-reminder` Edge Function needs the same treatment server-side.

## Context & decisions
- **Task 1.2 nav decision:** replaced the bottom-nav "Weight" tab with "Trends" (chose the recommended option; user was away for the AskUserQuestion). `/weight` route is *kept* (not in the tab bar) — reached by tapping the Trends weight card; WeightPage gained a "← Trends" back link. All weight CRUD stays on `/weight` (didn't cram it into a card).
- **Task 1.2 scope decision:** built page+cards+window+baseline only; deferred real insight strategies to 1.3 (recommended option). `TrendCard` has an `insight?: ReactNode` slot ready to fill.
- **Trends aggregation reuses the audited single-day helpers** (`getDailyTotals`/`sleepMinutesForDay`/`nursingMinutesForDay`) per day — so breast feeds count toward frequency without their absent volume being read, and duration events clip per day. `src/lib/trends.ts` is pure + fully tested (13 tests); the UI just maps its output into Recharts `BarChart`s.
- **Baseline is rendered as a dashed `ReferenceLine` at the series mean** (`seriesMean`), not a full ±σ band. The richer baseline visual is tied to the insight strategies in 1.3.
- **Insight/aggregation code must branch on `method` — never read a breast feed's absent `volumeMl` as 0/NaN.** `getDailyTotals` now counts a breast feed toward `feedCount` but skips its volume. Volume insights stay bottle-only; breastfeeding gets frequency / nursing-minutes. #1 gotcha for Task 1.3.
- **Breast feed reuses the Sleep duration pattern verbatim** (ADR-0003/0007): running row has `endedAt: null`, stop = one update. Running breast feed and running sleep are independent; only one running breast feed at a time. Chose a **3h "forgotten" flag** for nursing (vs 18h sleep) — nursing rarely runs hours.
- **Prediction uses a shorter window than the baseline** (`predictNext` samples all intervals; a 7-day window makes day-gaps look erratic). Baseline over 7d, predict off ~1d — see `strategy.test.ts`.
- **`dailyBaseline` divides by calendar days** — 0-event days count as 0; sufficiency gate guards sparse cold-start.
- **Enabled Event Types live as `jsonb` on the baby row** (ADR-0004); `saveBaby` must preserve `settings` on any baby-row edit.
- **`progress.md` is committed in this repo** (project CLAUDE.md overrides the resume default).

## Key files & links
- Plan (start here): [2026-07-03-roadmap-implementation.md](docs/superpowers/plans/2026-07-03-roadmap-implementation.md)
- ADR: [0007 breast feed as a feed method](docs/adr/0007-breast-feed-as-feed-method-reusing-duration-pattern.md) · [0006 insights baseline](docs/adr/0006-insight-data-sufficiency-and-baseline.md) · [0005 reflective line](docs/adr/0005-reflective-insights-mirror-not-doctor.md)
- Task 1.2 files: [trends.ts](src/lib/trends.ts) + [trends.test.ts](src/lib/trends.test.ts) (pure aggregation) · [TrendCard.tsx](src/components/TrendCard.tsx) (small-multiple card, has the `insight` slot) · [TrendsPage.tsx](src/pages/TrendsPage.tsx) · [App.tsx](src/App.tsx) (nav+route swap) · [WeightPage.tsx](src/pages/WeightPage.tsx:38) (back link)
- Task 1.1 shipped files: [schema.ts](src/db/schema.ts) · [mapping.ts](src/lib/sync/mapping.ts) · [storage.ts](src/db/storage.ts) · [stats.ts](src/lib/stats.ts) · [FeedSheet.tsx](src/components/sheets/FeedSheet.tsx) · [BreastSheet.tsx](src/components/sheets/BreastSheet.tsx) · [RunningBanner.tsx](src/components/RunningBanner.tsx)
- Insight scaffold (reference for 1.3): [types.ts](src/lib/insights/types.ts) · [baseline.ts](src/lib/insights/baseline.ts)

## Verify & run
- Gate (all must pass): **`npm run build`** (= `tsc -b && vite build` — NOT `npx tsc --noEmit`, which misses errors) · `npx eslint src/` · `npm test` (sets `TZ=UTC`).
- App: `npm run dev`. `gh` / `git push` need the sandbox disabled (env blocks TLS to github.com).
