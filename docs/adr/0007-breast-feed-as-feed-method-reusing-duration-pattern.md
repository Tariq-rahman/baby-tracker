# Breast feed as a Feed method, reusing the Sleep duration pattern

A `FeedEvent` today is fundamentally a bottle: `volumeMl` (required) plus optional `content`. A breast feed has no volume — it has a **side** and a **duration**, and is often **timed live** while nursing. "Bottle feeds only" doesn't just narrow the market, it disqualifies the largest new-parent segment (exclusive/combo breastfeeders), so it gates the public-launch ambition (audience C). We add breastfeeding by giving Feed a **method**.

## Decision

- **Keep it a Feed**, discriminated by `method: 'bottle' | 'breast'` — so breast feeds live on the clock dial and can drive feed Reminders like any other feed.
- **Bottle** keeps `volumeMl` + optional `content` (instant event, unchanged).
- **Breast** is a **duration event that reuses the Sleep pattern exactly** (ADR-0003): `occurredAt` = start, `endedAt: string | null` (null ⇒ nursing in progress). It carries a **side** (`left | right | both`). Total duration is derived from start→end.
- **Granularity is side + duration only.** No per-side switch logging ("left 8m, right 5m") — that is the fussy, screen-cluttering breadth our simplicity wedge exists to reject. It can hide behind Enabled Event Types later if genuinely demanded.

## Why

- **Massive reuse, no new plumbing.** The Sleep duration model already gives us a live timer, an "in progress" banner, one-running-at-a-time enforcement, and cross-device sync of the running row — all built and tested. A breast feed is "a Sleep that is a Feed."
- **Stays on the dial and in reminders** because it's still a Feed, not a new top-level type.
- **Simplicity preserved** by refusing switch-tracking as the default.

## Consequences

- **Insights branch by method.** The depth wedge leans on volume ("today's milk total vs baseline"), but breast feeds have none. So volume Insights are **bottle-only**, and breastfeeding households get **frequency / total-nursing-minutes** Insights instead. Insight code must handle both; "milk total" must not silently read as zero for a breastfeeding baby.
- **Feed reminders** must treat "last feed" as the last feed of *either* method (a nursing session counts).
- Two feeds can't both be "in progress"; a running breast feed and a running Sleep are independent (different types), but only one running breast feed at a time.
- `FeedContent` (formula / expressed breast milk) stays a *bottle content*, orthogonal to `method` — expressed milk in a bottle is still a bottle feed.
