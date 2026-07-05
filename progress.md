# Progress: Roadmap implementation

_Updated: 2026-07-05 15:10 · Branch: main @ 2c2bb86 · Task 1.3 MERGED (PR #16), user deploying to verify live; Task 1.4 next_

## Goal
Implement the roadmap (H0–H4) one task/PR at a time, per the implementation plan. Planning lives on `main` (ROADMAP.md, ADRs, plan).

## Status
**H1 Task 1.3 (first reflective insights) is DONE and MERGED to `main`** (PR #16, merge `2c2bb86`). Working tree clean, on `main`. Full gate was green: `npm run build`, `eslint`, **236 tests** (+21 new). The Trends **feed** card's `insight` slot renders real reflective insights (bottle-volume vs baseline, breast-nursing vs baseline, confidence-gated next-feed prediction), replacing the placeholder avg text. User is deploying to Vercel to verify on the live version. Next is Task 1.4 (dark mode) on a fresh branch off `main`.

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
- **H1 Task 1.2 — Trends view** — MERGED (PR #15, merge `4e538fc`), visually verified. Per-metric small-multiple cards + 7d/30d/All selector + dashed baseline line; Weight is a card linking to `/weight`; nav "Weight"→"Trends". +13 tests.
- **H1 Task 1.3 — First reflective insights** — MERGED (PR #16, merge `2c2bb86`; feature `2420bee`):
  - `src/lib/insights/strategies.ts`: `bottleVolumeStrategy` (today ml vs own N-day daily avg), `breastNursingStrategy` (today nursing-min vs baseline; running/flagged = 0), `nextFeedStrategy` (confidence-gated prediction, either method). `listFeedStrategies()` builds all three w/ `DEFAULT_FEED_CONFIG`.
  - Each self-gates: **silent** if method unused, **"keep logging"** (insufficient-data) if used-but-sparse, **comparative fact** once gate (3d + 5 events / 7d window) met.
  - New baseline helpers: `localDay`, `todaySum`, `compareDirection` (±tol band → only `below`/`above`/`about the same as`).
  - `InsightList.tsx` renders facts into the feed `TrendCard` slot (muted for insufficient-data, 🕐 for prediction). +21 tests, suite 236.

## Next
1. **User is verifying Task 1.3 on the live Vercel deploy.** If insights look off against real data, fix on a new branch. Otherwise proceed.
2. **H1 Task 1.4 — Dark mode** (see plan §"Task 1.4"). Fresh branch off `main`.
3. **Deferred (Phase 2 edge-function work):** feed reminders' "last feed" must be the last feed of *either* method — a nursing session counts. `getLastEventOfType(events,'feed')` already returns either method client-side; the `feed-reminder` Edge Function needs the same treatment server-side.

## Context & decisions
- **Task 1.3 gating decision:** a strategy returns `[]` (silent) when its method has *zero* events, vs `insufficient-data` ("keep logging") when the method is used but below the sufficiency gate. So a bottle-only family never sees an empty "not enough nursing data" line. Distinction: empty = "you don't do this"; insufficient-data = "you do this, not enough history yet".
- **Task 1.3 baseline window is fixed 7d** (`DEFAULT_FEED_CONFIG`), independent of the Trends page's 7d/30d/All chart selector — the baseline is the baby's own recent normal (ADR-0006), not the viewed range.
- **Task 1.3 copy safety:** `compareDirection` only ever emits `below`/`above`/`about the same as`; a test asserts facts never contain `enough`/`normal`/`should`/`ok` (ADR-0005). Copy is authored in the strategies, never in `InsightList`.
- **Task 1.3 today-vs-baseline both keyed by `occurredAt`'s local day** (`todaySum` + `dailyBaseline`), so a midnight-spanning nursing session is attributed to its start day consistently on both sides (no per-day clipping like `nursingMinutesForDay`). Prediction counts feeds of *either* method (matches client `getLastEventOfType`).
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
- Task 1.3 files: [strategies.ts](src/lib/insights/strategies.ts) + [strategies.test.ts](src/lib/insights/strategies.test.ts) (the 3 concrete strategies) · [baseline.ts](src/lib/insights/baseline.ts) (added `localDay`/`todaySum`/`compareDirection`) · [InsightList.tsx](src/components/InsightList.tsx) · [TrendsPage.tsx](src/pages/TrendsPage.tsx:56) (runs strategies, feeds the card slot)
- Task 1.2 files: [trends.ts](src/lib/trends.ts) + [trends.test.ts](src/lib/trends.test.ts) (pure aggregation) · [TrendCard.tsx](src/components/TrendCard.tsx) (small-multiple card, has the `insight` slot) · [TrendsPage.tsx](src/pages/TrendsPage.tsx) · [App.tsx](src/App.tsx) (nav+route swap) · [WeightPage.tsx](src/pages/WeightPage.tsx:38) (back link)
- Task 1.1 shipped files: [schema.ts](src/db/schema.ts) · [mapping.ts](src/lib/sync/mapping.ts) · [storage.ts](src/db/storage.ts) · [stats.ts](src/lib/stats.ts) · [FeedSheet.tsx](src/components/sheets/FeedSheet.tsx) · [BreastSheet.tsx](src/components/sheets/BreastSheet.tsx) · [RunningBanner.tsx](src/components/RunningBanner.tsx)
- Insight scaffold (reference for 1.3): [types.ts](src/lib/insights/types.ts) · [baseline.ts](src/lib/insights/baseline.ts)

## Verify & run
- Gate (all must pass): **`npm run build`** (= `tsc -b && vite build` — NOT `npx tsc --noEmit`, which misses errors) · `npx eslint src/` · `npm test` (sets `TZ=UTC`).
- App: `npm run dev`. `gh` / `git push` need the sandbox disabled (env blocks TLS to github.com).
