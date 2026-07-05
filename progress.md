# Progress: DX.1 shipped — pick next (DX.2, opportunistic H1, or H2)
_Updated: 2026-07-05 18:15 · Branch: feat/dx1-visual-check-loop (cddce44) · DX.1 committed, not yet pushed/PR'd_

Shipped: H1 complete (PRs #12–#20) + H1 docs graduated to ADRs 0009/0010 (commit 913e0c5). **DX.1 local visual-check loop done & verified** (commit cddce44, branch not yet pushed). Now: open the DX.1 PR, then choose the next unit of work.

## Goal
DX.1 (headless visual-check loop) is code-complete, verified, and committed. Definition-of-done for the immediate step: get DX.1 merged, then pick the next roadmap item.

## Status
**DX.1 DONE & VERIFIED**, committed on `feat/dx1-visual-check-loop` (not pushed — `git push`/`gh` need the sandbox disabled here). Ran `npm run shots` end-to-end: all 5 screens render seeded in light + dark, reflective insights fire, weight chart draws. Gate green: `npm run build` ✓, eslint ✓, **276 tests** ✓. Prod `dist/` confirmed free of dev-entry code (SECURITY req).

## Next
1. **Push the branch + open the DX.1 PR** (needs sandbox disabled for TLS to github.com). Then merge.
2. Then pick the next unit of work (see _Later_).

_Later / choose from:_
- **DX.2 — Staging + test account** (backend-side) — dedicated staging Supabase project + Vercel preview wiring + `npm run seed:staging` reusing `src/dev/fixture.ts`. See DX plan tasks DX.2.1–DX.2.3. Has a (free-tier) cloud footprint.
- **Opportunistic H1** behind Enabled Event Types: Growth (height/head circ), Pumping, free-text Note.
- **H2** — the smart layer (see roadmap plan).

## Context & decisions (this task only)
- **`npm run shots` needs Chromium + the sandbox off.** One-time: `npx playwright install chromium`. The browser won't launch inside the command sandbox (Mach-port EPERM) — run shots with the sandbox disabled.
- The dev entry drives routes via `pushState` + a manual `popstate` (React Router listens for it), so non-nav routes like `/weight` screenshot fine.
- `seedDevData()` clears the store each load (idempotent) and anchors the fixture to `new Date()`, so every run is fresh and current — screenshots are for eyeballing, not pixel-diffing (DX plan decision 4).
- (When DX.1 merges, the harness "how it works" is worth a short note in the DX plan/README rather than here.)

## Key files & links
- DX.1 in-play: [App.tsx](src/App.tsx) (`AppShell` export) · [main.dev.tsx](src/main.dev.tsx) + [index.dev.html](index.dev.html) (dev entry, NOT a prod build input) · [fixture.ts](src/dev/fixture.ts) + [seed.ts](src/dev/seed.ts) · [shots.mjs](scripts/shots.mjs)
- _Always:_ [roadmap plan](docs/superpowers/plans/2026-07-03-roadmap-implementation.md) · [DX plan](docs/superpowers/plans/2026-07-05-developer-experience.md) (DX.1 ✅, DX.2 next) · [CONTEXT.md](CONTEXT.md) · [ADRs](docs/adr/)

## Verify & run
- Gate (all must pass): **`npm run build`** (= `tsc -b && vite build`) · `npx eslint src/` · `npm test` (sets `TZ=UTC`).
- Visual check: **`npm run shots`** → PNGs in gitignored `screenshots/` (open with Read tool). Needs Chromium installed + sandbox disabled.
- App: `npm run dev` then open `/index.dev.html` for the seeded, auth-free shell. `gh` / `git push` need the sandbox disabled (env blocks TLS to github.com).
