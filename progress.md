# Progress: Roadmap implementation

_Updated: 2026-07-05 10:18 · Branch: main @ 15fd454 · Phase 0 complete_

## Goal
Implement the roadmap (H0–H4) one task/PR at a time, per the implementation plan. Planning lives on `main` (ROADMAP.md, ADRs, plan).

## Status
**Phase 0 (H0) is DONE and merged to `main`.** Both H0 tasks shipped via PRs #12 (Enabled Event Types) and #13 (Insight strategy scaffold). Migration ledger reconciled. Nothing in flight — next is H1 Task 1.1 (Breastfeeding), the priority feature, on a fresh branch off `main`. Only `progress.md` is uncommitted.

## Done
- **Planning** — ROADMAP.md, CONTEXT.md glossary, ADRs 0004–0008, implementation plan. On `main`.
- **H0 Task 0.1 — Enabled Event Types** — merged (PR #12). Migration `0009_baby_settings.sql` applied to remote.
- **H0 Task 0.2 — Insight strategy scaffold** — merged (PR #13, `6f30776`), pure logic, **no UI**:
  - `src/lib/insights/` — `InsightStrategy` contract, `Insight` (fact, never advice; ADR-0005), `insufficient-data` as a first-class gate result. Trailing-window baseline helpers over the baby's own events: `assessSufficiency`, `windowSum`/`dailyBaseline`, `intervalStats` (sample sd + cv), `confidenceFromCv`, `predictNext` (suppresses on high variance). `runStrategies` runner. Thresholds/windows are strategy params.
  - 24 tests (`baseline.test.ts`, `strategy.test.ts`). Suite total 189, all green.
- **Migration ledger reconciled** (this session) — `0008_cron_auth_key` was live but unrecorded; inserted a text-only `schema_migrations` row (version `20260702184527`). Ledger now contiguous `0001`–`0009`. Cron verified healthy (fires every minute, all runs succeed).

## Next
1. **H1 Task 1.1 — Breastfeeding (ADR-0007), the priority item.** Branch off `main`. Steps (see plan §"Task 1.1"):
   - `schema.ts`: `FeedEvent` gets `method: 'bottle' | 'breast'`. Bottle keeps `volumeMl` (required) + optional `content`. Breast **reuses the Sleep duration shape** — `occurredAt`=start, `endedAt: string | null` (null ⇒ nursing in progress), `side: 'left' | 'right' | 'both'`, **no `volumeMl`**. Model as a discriminated sub-shape. **No server migration** — all in `payload`.
   - `mapping.ts`: extend feed `packPayload`/`eventFromRow` for `method`/`side`/`endedAt`; **default legacy feeds (no `method`) to `bottle`**.
   - `storage.ts`: `startBreastFeed(occurredAt, side)` / `stopBreastFeed(id, endedAt)` mirroring `startSleep`/`stopSleep`.
   - UI: feed flow picks bottle vs breast; breast uses a live timer + running banner (model on `SleepSheet` + `RunningSleepBanner`). **Enforce one running breast feed at a time** (independent of a running sleep).
   - Reminders: "last feed" = last feed of *either* method (nursing counts) — note for Phase 2 edge-function work.
2. Then Task 1.2 (Trends view) and 1.3 (first reflective insights — concrete strategies against the 0.2 scaffold).

## Context & decisions
- **Insight code must branch on `method` — never read a breast feed's absent `volumeMl` as 0.** Volume insights are bottle-only; breastfeeding gets frequency / total-nursing-minutes. This is the #1 gotcha for Task 1.1 + 1.3.
- **Prediction uses a shorter window than the baseline.** `predictNext` samples *all* intervals in its window, so passing the 7-day baseline window makes day-gaps look erratic and suppresses everything. Concrete strategies should predict off a recent window (e.g. 1 day) while baselining over 7 — the reference strategy in `strategy.test.ts` shows this.
- **`dailyBaseline` divides by calendar days (`sum / windowDays`)** — a 0-event day counts as 0 (honest daily rate). The sufficiency gate protects against dividing sparse cold-start data.
- **Enabled Event Types live as `jsonb` on the baby row** (ADR-0004); `saveBaby` must preserve `settings` on any baby-row edit or a name/DOB change wipes them.
- **`progress.md` is committed in this repo** (project CLAUDE.md overrides the resume default). It's currently uncommitted on `main` — either commit it here or let it ride onto the H1 branch.

## Key files & links
- Plan (start here): [2026-07-03-roadmap-implementation.md](docs/superpowers/plans/2026-07-03-roadmap-implementation.md)
- ADRs: [0007 breastfeeding](docs/adr/0007-breastfeeding.md) (next) · [0006 insights baseline](docs/adr/0006-insight-data-sufficiency-and-baseline.md) · [0005 reflective line](docs/adr/0005-reflective-not-advice.md)
- Task 0.2 (reference for insight work): [types.ts](src/lib/insights/types.ts) · [baseline.ts](src/lib/insights/baseline.ts)
- Task 1.1 files to touch: [schema.ts](src/db/schema.ts) · [mapping.ts](src/lib/sync/mapping.ts) · [storage.ts](src/db/storage.ts) · SleepSheet / RunningSleepBanner (model for the timer UI) · [stats.ts](src/lib/stats.ts) (sleep-duration helpers to mirror)

## Verify & run
- Gate (all must pass): **`npm run build`** (= `tsc -b && vite build` — NOT `npx tsc --noEmit`, which misses errors) · `npx eslint src/` · `npm test` (sets `TZ=UTC`).
- App: `npm run dev`. `gh` / `git push` need the sandbox disabled (env blocks TLS to github.com).
