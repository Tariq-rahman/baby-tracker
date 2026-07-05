# Roadmap: Baby Tracker

_Distilled from a grilling session on 2026-07-03. Terms in **bold** are defined in [CONTEXT.md](CONTEXT.md); decisions link to their ADR._

## Framing

- **Audience: A now → C later.** The app is a personal tool today, but the intent is to promote it to a public product. Every item below is judged on both lenses: does it add personal-use value *now*, and does it avoid a corner that's expensive to undo at public launch?
- **The wedges:** (1) the **clock dial** — see the whole day at a glance; (2) a **beautiful, simple** UI in a market of boring, bloated apps; (3) **local-first + privacy** as the trust story.
- **Depth over breadth.** The roadmap is led by making the dial *smart* (insights), because depth compounds the wedge and is hard to copy — not by matching competitors' feature checklists. The one breadth exception is **breastfeeding**, pulled forward because "bottle only" *disqualifies* the largest new-parent segment and gates audience C.

## Organizing principles (the ADRs)

| Principle | ADR |
| --- | --- |
| Complexity is **opt-in per household** via **Enabled Event Types** — the default stays calm no matter how many types exist. | [0004](docs/adr/0004-per-household-enabled-event-types.md) |
| **Insights are reflective only** — "mirror, not doctor". Reflect the baby's own data; never diagnose, reassure, or prescribe. | [0005](docs/adr/0005-reflective-insights-mirror-not-doctor.md) |
| Insights are **gated by data-sufficiency**, **baselined on the baby's own trailing window**, and **confidence-aware**; the math sits behind a swappable strategy. | [0006](docs/adr/0006-insight-data-sufficiency-and-baseline.md) |
| **Breast feed is a Feed method** reusing the Sleep duration pattern; side + duration only; insights branch to frequency/minutes. | [0007](docs/adr/0007-breast-feed-as-feed-method-reusing-duration-pattern.md) |
| **Solids**: curated food catalog, reflective allergen tracking with medical hand-off, suggestions = filtered published guidance. | [0008](docs/adr/0008-solids-curated-catalog-and-reflective-allergen-tracking.md) |

**Key sequencing insight:** depth features are *starved without data*. Prediction and "vs baseline" need weeks of logged events to mean anything, so the tracking surfaces must ship and accumulate data **before** the smart layer can prove itself.

## Horizons

### H0 — Foundations (unlock everything cleanly)
- **Enabled Event Types** infrastructure — per-household setting + conditional log buttons. ([0004](docs/adr/0004-per-household-enabled-event-types.md))
- **Insight strategy scaffold** — the swappable strategy interface with data-sufficiency gating and own-baseline; no user-facing insight yet, just the frame. ([0006](docs/adr/0006-insight-data-sufficiency-and-baseline.md))

### H1 — Close the disqualifier + reflective depth (starts accumulating data)
- **Breastfeeding** — Feed gains `method: bottle | breast`; breast reuses the Sleep duration pattern (live timer, in-progress, sync). Side + duration only. ([0007](docs/adr/0007-breast-feed-as-feed-method-reusing-duration-pattern.md))
- **Trends view** — a new screen of small-multiple charts (one per Enabled Event Type), selectable window, **Baseline** band overlaid. Upgrades today's basic History; History stays the raw log.
- **First reflective Insights** — volume-vs-baseline (bottle) and frequency/nursing-minutes-vs-baseline (breast), rendered on their Trends cards.
- **Dark mode** — system default + manual override; framed as a 3am-feed feature and part of "beautiful". Needs `palette` to become theme-aware (both Tailwind classes and runtime hex).
- **Settings restructure (light)** — grouped sections (Baby & Household · Tracking · Notifications · Appearance · Data · Account) so new config has an obvious home.
- **Duration-event resume** — start within ~5 min of the last one ending → offer-with-undo to continue the previous Sleep/breast Feed rather than create a second. (QoL)

### H2 — The smart layer (now data exists)
- **Predictive feed-reminder mode** — Reminder gains a mode: fixed-interval (today) *or* predictive (fires ahead of the baby's typical next feed). Modes co-exist.
- **Medication Schedule** — a Medication optionally gains a schedule (every N hours / fixed times); drives "next dose due" in-app, with a Reminder layerable on top.
- **Insight Nudges** — Insights delivered as an opt-in, low-frequency (once-daily digest) notification. Reflective phrasing rules apply. ([0005](docs/adr/0005-reflective-insights-mirror-not-doctor.md))

### H3 — Solids (the big content feature)
- **Solids event** — food (curated **Food Catalog** + free-text fallback) + reaction (liked/disliked/neutral); no amount.
- **Allergen tracking (first-class)** — reflect introduction state + reaction-noted; medical hand-off, never triage.
- **Food suggestions** — filter over a published age-staged weaning list, ordered by liked flavors; "ideas to try", never "should". ([0008](docs/adr/0008-solids-curated-catalog-and-reflective-allergen-tracking.md))

### H4 — Productization for C
- **Onboarding** — includes the "what do you want to track?" step that writes Enabled Event Types.
- **Branding / identity** — a real name, icon, and identity (today's "Baby Tracker" undersells the beauty wedge).
- **Marketing landing page.**
- **Install / native packaging** — PWA install prompt or a Capacitor wrapper for the app stores.
- **Billing / subscription.**
- **Support / feedback** plumbing.
- **Settings full visual polish** (with branding).

### Opportunistic (slot into H1–H3, cheap + toggled)
- **Growth** (height / head circumference) — sibling of Weight, same chart primitive.
- **Pumping** — duration + volume event; matters to the expressing segment.
- **Free-text Note** — deliberately minimal ("rash today"); guard against it becoming a dumping ground.

### DX — Developer experience & testability (cross-cutting; do DX.1 now)
_Not a product horizon — tooling that unblocks building the rest. Plan: [2026-07-05-developer-experience.md](docs/superpowers/plans/2026-07-05-developer-experience.md). Distilled from a grilling session on 2026-07-05._

- **DX.1 — Local visual-check loop** (self-contained, in-sandbox, no cost — ship first):
  - **Dev entry point** — `index.dev.html` → `main.dev.tsx` renders the app shell **skipping `AuthGate`**. Structurally absent from the prod build (not a flag or runtime toggle), so the bypass can never ship enabled.
  - **Seeded local data** — one shared TS fixture (`src/dev/fixture.ts`) written to Dexie via `storage.ts`, anchored to *now* so every screen is populated and insights fire.
  - **Playwright screenshot script** (`npm run shots`) — visits each route in light + dark, writes gitignored PNGs so AI (and you) can *see* UI changes. Eyes, not an assertion suite; no CI gating (keeps the MVP "no E2E" line).
- **DX.2 — Staging + test account** (backend-side, later; free-tier cloud footprint):
  - **Dedicated staging Supabase project** + automatic **Vercel preview** deploys wired to it; **prod is never the test target**. Migrations land on staging first.
  - **Test account** — a real inbox + magic link (no password auth); its data seeded from the *same* fixture via `npm run seed:staging`, guarded to refuse the prod ref.

## Explicit non-goals (protecting the wedge)
- Population-norm comparisons ("is my baby normal vs others") — advisory and anxiety-inducing. ([0005](docs/adr/0005-reflective-insights-mirror-not-doctor.md))
- Reaction *severity* / medical triage logging for allergens.
- Per-side breast-feed switch logging; solids portion/amount — clutter with no insight payoff.
- Real-time "your baby is below average!" alarms — Insight Nudges are a calm daily digest, not pings.
