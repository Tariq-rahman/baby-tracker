# Progress: Roadmap implementation

_Updated: 2026-07-05 · Branch: feat/insight-strategy-scaffold @ 7c2363c · PR #13_

## Goal
Implement the roadmap (H0–H4) one task/PR at a time, per the implementation plan. Planning is committed on `main`.

## Status
**H0 complete pending review.** Task 0.1 (Enabled Event Types) is **merged** (PR #12, `0fcdaad`). Task 0.2 (Insight strategy scaffold) is **committed** on `feat/insight-strategy-scaffold` (`6f30776`) — build green, eslint clean, 189 tests pass (24 new). No PR opened yet. Next up is H1 (breastfeeding, the priority item).

## Done
- **Planning** — ROADMAP.md, CONTEXT.md glossary, ADRs 0004–0008, implementation plan. On `main`.
- **H0 Task 0.1 — Enabled Event Types** — merged via PR #12. Migration `0009_baby_settings.sql` applied to remote.
- **Docs fix** — plan verification-gate now says `npm run build` not `tsc --noEmit` (`03975e0` on main).
- **H0 Task 0.2 — Insight strategy scaffold** (`6f30776`), pure logic, **no UI**:
  - `src/lib/insights/types.ts` — `InsightStrategy` contract, `Insight` ({strategyId, kind, fact, confidence?}), `insufficientData()` gate helper. Copy is a *fact*, never advice (ADR-0005).
  - `src/lib/insights/baseline.ts` — trailing-window helpers over the baby's own events: `listEventsInWindow`, `assessSufficiency` (the data-sufficiency gate), `windowSum`/`dailyBaseline`, `listIntervalsMs`/`intervalStats` (sample sd + cv), `confidenceFromCv`, `predictNext` (suppresses on high variance). Thresholds/windows are parameters.
  - `src/lib/insights/index.ts` — barrel + `runStrategies`.
  - Tests: `baseline.test.ts` (window bounds, gate, baseline math, variance suppression) + `strategy.test.ts` (reference strategy end-to-end through the contract).

## Next
1. **Review/merge PR #13** (Task 0.2, `feat/insight-strategy-scaffold` → main).
2. **H1 Task 1.1 — Breastfeeding (ADR-0007), the priority item.** `FeedEvent` gets `method: 'bottle' | 'breast'`; breast reuses the Sleep duration shape (`endedAt: string | null`, `side`), no `volumeMl`. All in `payload` — **no server migration**. Mapping defaults legacy feeds to `bottle`. `storage.ts` `startBreastFeed`/`stopBreastFeed` mirroring sleep. UI: bottle-vs-breast pick + live timer/running banner; one running breast feed at a time. **Insight code must branch on method — never read a breast feed's absent volume as 0.** See plan §"Task 1.1".
3. Then Task 1.2 (Trends view), 1.3 (first reflective insights — concrete strategies against the 0.2 scaffold).

## Context & decisions
- **Prediction uses a shorter window than the baseline.** `predictNext` samples *all* intervals in its window, so passing the 7-day baseline window makes day-gaps look erratic and suppresses everything. Concrete strategies should predict off a recent window (e.g. 1 day) while baselining over 7 — the reference strategy in `strategy.test.ts` shows this.
- **`dailyBaseline` divides by calendar days (`sum / windowDays`)**, so a zero-event day counts as 0 — the honest daily rate. The sufficiency gate is what protects against dividing sparse cold-start data.
- **Enabled Event Types live as `jsonb` on the baby row** (ADR-0004); `saveBaby` must preserve `settings` on any baby-row edit.

## Blocked / open questions
- **Missing `0008` on remote**: remote migrations table lists only 0001–0007 but the repo has `0008_cron_auth_key.sql` (feed-reminder cron auth depends on it) — appears never applied. Unverified; raised with user, not yet actioned.
- **Billing tiers (H4.5)** never grilled — needs its own decision before that phase.

## Key files & links
- Plan (start here): [2026-07-03-roadmap-implementation.md](docs/superpowers/plans/2026-07-03-roadmap-implementation.md)
- ADRs: [0006 insights baseline](docs/adr/0006-insight-data-sufficiency-and-baseline.md) · [0007 breastfeeding](docs/adr/0007-breastfeeding.md) (next) · [0005 reflective line](docs/adr/0005-reflective-not-advice.md)
- Task 0.2 files: [types.ts](src/lib/insights/types.ts) · [baseline.ts](src/lib/insights/baseline.ts) · [index.ts](src/lib/insights/index.ts)
- Task 1.1 files to touch: [schema.ts](src/db/schema.ts) · [mapping.ts](src/lib/sync/mapping.ts) · [storage.ts](src/db/storage.ts) · SleepSheet / RunningSleepBanner (model for the timer UI)

## Verify & run
- Gate (all must pass): **`npm run build`** (= `tsc -b && vite build` — NOT `npx tsc --noEmit`, which misses errors) · `npx eslint src/` · `npm test` (sets `TZ=UTC`).
- App: `npm run dev`. `gh` needs the sandbox disabled (env blocks TLS to api.github.com).
