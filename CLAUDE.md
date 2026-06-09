# Baby Tracker — Project Instructions

A local-first, installable **PWA** for tracking a baby's feeds, nappies, weight, and medication. Single caregiver, single device, single baby for the MVP. See `CONTEXT.md` for domain glossary and `docs/adr/` for architectural decisions.

## Tech Stack

- **React + Vite + TypeScript** — TypeScript is mandatory; do not drop to plain JS.
- **Dexie.js over IndexedDB** for storage. All persistence goes through a storage abstraction (not scattered Dexie calls) so a backend/sync layer can be added later — see `docs/adr/0001-local-first-storage.md`.
- **Tailwind CSS** for styling. Favour large, one-handed tap targets.
- **Recharts** for the weight trend chart.
- **vite-plugin-pwa** (Workbox) for the service worker + manifest.
- **Deployment:** static build to **Vercel** (Cloudflare Pages interchangeable). HTTPS required for the service worker.

## Testing

- **Vitest** for unit tests. All pure logic MUST have tests, especially:
  - unit conversions (lb+oz ↔ grams, kg ↔ grams)
  - "time since last event" calculations
  - daily-total aggregation
  - export/import JSON round-trip
- **React Testing Library** for light component tests on the critical logging forms.
- **No E2E** for the MVP.
- New non-trivial functions get tests. Prefer table-driven test cases.

## Conventions

- Functions returning a collection are prefixed `list` (e.g. `listEvents`); functions returning a single item are prefixed `get` (e.g. `getEvent`).
- Weight is always stored internally as **grams (integer, rounded)**; convert only at the UI boundary.
- Event timestamps default to "now" but are always editable (backdating supported).
