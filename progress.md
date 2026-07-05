# Progress: Roadmap implementation

_Updated: 2026-07-05 12:05 · Branch: main @ 35be98d · Task 1.1 MERGED, Task 1.2 next_

## Goal
Implement the roadmap (H0–H4) one task/PR at a time, per the implementation plan. Planning lives on `main` (ROADMAP.md, ADRs, plan).

## Status
**H1 Task 1.1 (Breastfeeding) is DONE and MERGED to `main`** (PR #14, merge `35be98d`). Working tree clean, on `main`. Full gate was green (build, eslint, 202 tests). Nothing in flight — next is Task 1.2 (Trends view) on a fresh branch off `main`. The merged `feat/breastfeeding` branch still exists locally + on origin and can be deleted.

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
1. **Quick tidy:** delete the merged `feat/breastfeeding` branch — `git branch -d feat/breastfeeding` and `git push origin --delete feat/breastfeeding` (push needs sandbox disabled).
2. **H1 Task 1.2 — Trends view** (see plan §"Task 1.2"). Branch off `main` (`feat/trends`), scope from the plan, then TDD. Not yet read this session — start by reading the plan's Task 1.2 section.
3. Then Task 1.3 (first reflective insights — concrete strategies against the 0.2 scaffold, branching on method).
4. **Deferred (Phase 2 edge-function work):** feed reminders' "last feed" must be the last feed of *either* method — a nursing session counts. `getLastEventOfType(events,'feed')` already returns either method client-side; the `feed-reminder` Edge Function needs the same treatment server-side.

## Context & decisions
- **Insight/aggregation code must branch on `method` — never read a breast feed's absent `volumeMl` as 0/NaN.** `getDailyTotals` now counts a breast feed toward `feedCount` but skips its volume. Volume insights stay bottle-only; breastfeeding gets frequency / nursing-minutes. #1 gotcha for Task 1.3.
- **Breast feed reuses the Sleep duration pattern verbatim** (ADR-0003/0007): running row has `endedAt: null`, stop = one update. Running breast feed and running sleep are independent; only one running breast feed at a time. Chose a **3h "forgotten" flag** for nursing (vs 18h sleep) — nursing rarely runs hours.
- **Prediction uses a shorter window than the baseline** (`predictNext` samples all intervals; a 7-day window makes day-gaps look erratic). Baseline over 7d, predict off ~1d — see `strategy.test.ts`.
- **`dailyBaseline` divides by calendar days** — 0-event days count as 0; sufficiency gate guards sparse cold-start.
- **Enabled Event Types live as `jsonb` on the baby row** (ADR-0004); `saveBaby` must preserve `settings` on any baby-row edit.
- **`progress.md` is committed in this repo** (project CLAUDE.md overrides the resume default).

## Key files & links
- Plan (start here): [2026-07-03-roadmap-implementation.md](docs/superpowers/plans/2026-07-03-roadmap-implementation.md)
- ADR: [0007 breast feed as a feed method](docs/adr/0007-breast-feed-as-feed-method-reusing-duration-pattern.md) · [0006 insights baseline](docs/adr/0006-insight-data-sufficiency-and-baseline.md) · [0005 reflective line](docs/adr/0005-reflective-insights-mirror-not-doctor.md)
- Task 1.1 shipped files: [schema.ts](src/db/schema.ts) · [mapping.ts](src/lib/sync/mapping.ts) · [storage.ts](src/db/storage.ts) · [stats.ts](src/lib/stats.ts) · [FeedSheet.tsx](src/components/sheets/FeedSheet.tsx) · [BreastSheet.tsx](src/components/sheets/BreastSheet.tsx) · [RunningBanner.tsx](src/components/RunningBanner.tsx)
- Insight scaffold (reference for 1.3): [types.ts](src/lib/insights/types.ts) · [baseline.ts](src/lib/insights/baseline.ts)

## Verify & run
- Gate (all must pass): **`npm run build`** (= `tsc -b && vite build` — NOT `npx tsc --noEmit`, which misses errors) · `npx eslint src/` · `npm test` (sets `TZ=UTC`).
- App: `npm run dev`. `gh` / `git push` need the sandbox disabled (env blocks TLS to github.com).
