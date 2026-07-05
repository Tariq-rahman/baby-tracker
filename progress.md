# Progress: between slices — opportunistic H1 done; pick DX.2 or an H2 item next
_Updated: 2026-07-05 19:45 · Branch: main (e3dcbd0, clean, synced) · paused after Pumping merged (PR #24)_

Shipped: H1 complete (PRs #12–#20), DX.1 (#21), and the full opportunistic-H1 slice — **Growth** (#22), **Note** (#23), **Pumping** (#24). No event types remain deferred. See the plan's ✅ markers.

## Goal
Decide and start the next roadmap slice. Opportunistic H1 is done, so the choice is between **DX.2** (staging environment + a test account) and an **H2** item (the smart layer — insights/baselines). This is an open decision to make with the user, not yet scoped.

## Status
`main` is clean and synced at e3dcbd0. Nothing in flight. Gate is green as of last run (build, eslint, 309 tests, shots). Next session starts by choosing the slice.

## Next
1. **Pick the next slice with the user:** DX.2 (staging + test account) or an H2 item. Read the roadmap plan's Phase 2 §"The smart layer (H2)" and the DX section to frame the trade-off before asking.
2. Once chosen, scope it (grill/plan if non-trivial), then TDD as usual.
_Later:_ the rest of H2 — insights, baselines, reflective Trends cards.

## Context & decisions
- (Empty — no task in flight. Opportunistic-H1 decisions graduated to CONTEXT.md's glossary and ADRs 0004/0007 when those tasks merged.)

## Key files & links
- _Always:_ [roadmap plan](docs/superpowers/plans/2026-07-03-roadmap-implementation.md) (Phase 2 = H2; DX section) · [CONTEXT.md](CONTEXT.md) · [ADRs](docs/adr/) · [ROADMAP.md](ROADMAP.md)

## Verify & run
- Gate (all must pass): **`npm run build`** (= `tsc -b && vite build`) · `npx eslint src/ scripts/` · `npm test` (sets `TZ=UTC`).
- Visual check: **`npm run shots`** → PNGs in gitignored `screenshots/`. Needs the sandbox disabled (Chromium Mach-port `Permission denied 1100`). If it reports "dev server did not start", first `pkill -f node_modules/.bin/vite`.
- App: `npm run dev` → open `/index.dev.html` for the seeded, auth-free shell. `git push`/`gh` also need the sandbox disabled (env blocks TLS to github.com).
