# Baby Tracker

A local-first, installable **PWA** for tracking a baby's feeds, nappies, weight, and
medication. It works offline on a phone's home screen, and — once you sign in — syncs
across devices so more than one caregiver can share a baby in real time.

- **Feeds** — bottle volume (ml) + optional content (formula / expressed).
- **Nappies** — wet / dirty / both (+ size for dirty).
- **Weight** — entered in lb+oz or kg, stored as grams, with a trend chart.
- **Medication** — define a med once (name, dose, unit), then log doses against it.
- **Feed reminders** — opt-in push notification when it's been N hours since the last
  bottle. Computed server-side, so it arrives even with the app closed.
- **Sharing** — invite a second caregiver by code; both devices sync live.
- **Backup** — JSON export / import.

## Tech stack

- **React + Vite + TypeScript** (TypeScript is mandatory).
- **Dexie.js / IndexedDB** as the local-first store, behind a `src/db/storage.ts`
  abstraction so the sync layer can sit underneath it — see
  [ADR-0001](docs/adr/0001-local-first-storage.md).
- **Supabase** (Postgres + Auth + RLS + Realtime + Edge Functions + `pg_cron`) as the
  cloud source of truth and sync backend — see
  [ADR-0002](docs/adr/0002-accounts-and-supabase-sync.md).
- **Tailwind CSS** for styling (large, one-handed tap targets).
- **Recharts** for the weight trend chart.
- **vite-plugin-pwa** (Workbox, `injectManifest`) for the service worker + manifest.
  We own `src/sw.ts` so it can handle Web Push `push` / `notificationclick` events.
- **Deployment:** static build to **Vercel**. HTTPS is required for the service worker.

## Architecture at a glance

- **Local-first:** the UI reads and writes Dexie synchronously for instant, offline
  UX. Every synced record carries a client-generated UUID, `updatedAt`, and a nullable
  `deletedAt` tombstone (soft delete).
- **Sync:** an outbox pushes local changes to Supabase; a pull cursor + Realtime
  subscription bring remote changes down. Conflicts resolve **last-write-wins** on
  `updatedAt`; tombstones propagate deletes.
- **Notifications:** push subscriptions live server-side. A scheduled Edge Function
  (`supabase/functions/feed-reminder`, run every minute by `pg_cron`) finds each
  household's latest non-deleted feed and sends a Web Push reminder when the interval
  has elapsed. No client-side timer.

## Getting started

```bash
npm install
npm run dev        # Vite dev server (localhost is a secure context, so push works here)
```

Copy `.env.example` to `.env.local` and fill in:

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
VITE_VAPID_PUBLIC_KEY=...        # public half of the Web Push VAPID keypair
```

## Scripts

| Command             | What it does                                            |
| ------------------- | ------------------------------------------------------- |
| `npm run dev`       | Start the Vite dev server.                              |
| `npm run build`     | Type-check (`tsc -b`) and build to `dist/` (emits `dist/sw.js`). |
| `npm run preview`   | Preview the production build.                           |
| `npm test`          | Run the Vitest unit suite (`TZ=UTC`).                   |
| `npm run lint`      | ESLint.                                                 |

## Testing

- **Vitest** for unit tests — all pure logic is covered (unit conversions,
  "time since last event", daily aggregation, backup round-trip).
- **React Testing Library** for the critical logging forms.
- No E2E for the MVP.

## Docs

- [CONTEXT.md](CONTEXT.md) — domain glossary.
- [docs/adr/](docs/adr/) — architectural decision records.
- Contributor conventions and standards live in [CLAUDE.md](CLAUDE.md).
