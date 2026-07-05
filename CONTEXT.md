# Context: Baby Tracker

A glossary of the core domain language for this project. Implementation details do not belong here.

## Glossary

### Caregiver
A person who logs and views events for a baby. A caregiver belongs to one or more households and, once signed in, sees the same data on every device. Two caregivers can share a baby by joining the same Household (see below).

### Household
The unit of sharing and data ownership. A Household owns its babies, medications, and events, and has one or more caregivers as members. A caregiver creates a Household on first sign-in and can invite another caregiver to it by code; accepting the invite adds them as a member and syncs the shared data to their device. All server-side access is scoped to Household membership.

### Baby
An infant being tracked, configured with a name and date of birth. In practice there is usually **one baby per household**; events do not name the baby. Multiple babies (twins, future children) are supported by the data model — a Household can own several — but the UI is optimised for one.

### Event
A single thing the caregiver records about the baby. Every Event has a type. Most events happen at a single instant (a time at which they occurred); **Sleep** is the exception — it spans an interval (start → end). The supported event types are **Feed**, **Nappy**, **Weight**, **Medication** (as a Dose), **Sleep**, **Growth**, **Note**, and **Pumping**.

**Growth** is a per-measurement type (like Weight, not per-day): one event records optional **height** and/or **head circumference**, each stored as whole millimetres (integer, like Weight's grams). It's opt-in per household — not in the default enabled set — and logged from its own page. See PR #22.

**Note** is a deliberately minimal, free-text timestamped observation ("first smile", "seems congested"): a single `text` field, no units, no chart, no Trends card. Unlike Weight/Growth it's a home quick-log type (a log button + sheet, like Feed/Nappy). Opt-in per household — not in the default enabled set.

**Pumping** records the **volume of milk expressed** (whole millilitres) with an **optional side** (left / right / both) — no duration; output is the datum that matters. It's a **supply** event, deliberately distinct from a **Breast** [Feed](#feed) (nursing, no volume) and from a **Bottle** Feed (milk consumed): a pumped bottle later fed is still a separate Feed event. A home quick-log type (button + sheet, like Feed/Nappy), reusing the bottle volume UI. Opt-in per household — not in the default enabled set. See PR #23 for the Note template it follows.

All opportunistic H1 event types (Growth, Note, Pumping) are now built. No event types remain deferred.

### Duration Event
An Event that spans an interval (start → end) rather than happening at an instant. **Sleep** and a **Breast** [Feed](#feed) are the duration events. They share behaviour: a start time, an end time, an *in progress* state (`endedAt` null) that drives a live timer, at most **one running at a time** per type, and — for accidental stop-then-restart — a **resume window**: starting a new one within ~5 minutes of the last one ending offers to re-open (continue) the previous Event rather than create a second, shown as an undoable action. Instant events (Feed-Bottle, Nappy, Weight, Dose, Solid) have only an `occurredAt`.

### Sleep
An Event recording a stretch of the baby sleeping — a daytime nap or the long overnight sleep, tracked the same way. Unlike other Events it is a **duration**: it has a start time and an end time. A Sleep with no end yet is **in progress** (running) and drives the live timer and the pulsating arc on the clock. At most **one Sleep is in progress at a time** (enforced in the UI). A Sleep left running beyond ~18 hours is assumed forgotten: it is flagged as needing attention and excluded from sleep totals until an end time is set.
_Avoid_: Nap (a nap is one daytime instance of Sleep; the feature and its button are called "Sleep"), Doze.

### Feed
An Event recording the baby being fed milk. A Feed has a **method**:
- **Bottle** — an instant event capturing volume in millilitres plus an optional content type (formula / expressed breast milk). This was the MVP's only method.
- **Breast** — a **duration** event (like Sleep): it has a start, an end, and can be *in progress* while nursing (live timer). It records a **side** (left / right / both) and total duration. It has **no volume**. Per-side switch logging (left N min → right M min) is deliberately out of scope for simplicity; it may later hide behind [Enabled Event Types](#enabled-event-types) if demanded.

Because a Breast feed has no volume, volume-based Insights ("milk total vs baseline") are **bottle-only**. For breastfeeding households the comparable Insight reflects **feed frequency and total nursing minutes** instead. Solids are a separate event type (not a Feed) — see below.
_Note_: "expressed breast milk" (a bottle *content*) is distinct from a Breast feed (a *method*).

### Solid
An Event recording the baby eating solid food (weaning) — distinct from a [Feed](#feed), which is milk. A Solid records a **food** (chosen from a curated **Food Catalog**, with free-text fallback), a **reaction** (liked / disliked / neutral), and an optional note. It deliberately does **not** record a precise amount ("two spoons vs three" is noise). The curated catalog — not free text — is what enables likes/dislikes aggregation and food suggestions.

Solids carry first-class **allergen tracking**: catalog foods flag common allergens, and the app *reflects* introduction state ("first tried peanut 3 days ago; egg not yet introduced") and whether a reaction was **noted**. Per ADR-0005 this stays reflective — it never records reaction *severity* or triages; a flagged reaction hands off to "seek medical advice," never an analysis screen. Food **suggestions** are a filter over a **published age-staged weaning list** (foods not yet tried, optionally ordered by similarity to liked flavors), framed "ideas to try" — never "your baby should eat X".

### Nappy
An Event recording a nappy change. Fields: time, and type (wet / dirty / both). When the type includes a dirty component (dirty or both), a size is also recorded (small / medium / large). Purely wet nappies have no size.

### Weight
An Event recording a body-weight measurement of the baby. Fields: time and weight value. Weight may be entered as imperial (pounds + ounces) or metric (kilograms, decimal), but is always stored internally as grams, rounded to the nearest gram. Weight has a trend view (line chart over time).

### Medication
A medication or supplement the caregiver has **defined once** for reuse — name, default dose amount, and unit (ml / mg / IU / drops). Defining a Medication is a setup action, not a logged Event. (e.g. "Vitamin D / 400 / IU".) A Medication may optionally carry a **Schedule** (see below).

### Schedule
An optional recurrence attached to a Medication — either "every N hours" or fixed clock times (e.g. 8am & 8pm) — that defines when the next Dose is *due*. A Schedule is a property of the Medication, not a notification: the app can show "next dose due at 14:00" from it even with reminders off. A Reminder can be **laid on top of** a Schedule to push a nudge when a Dose comes due.

### Dose
An Event recording that a defined Medication was given to the baby at a particular time. Fields: time, the Medication given, and dose amount (defaults to the Medication's default dose, editable per dose). A Dose always references an existing Medication.

### Insight
A statement the app derives from the Household's *own* event data and shows back to the caregiver — e.g. "today's milk total is below this baby's 7-day average", "next feed likely around 14:30 based on recent rhythm", a trend line, or a "typical" band on the clock dial. Insights are strictly **reflective**: they describe the baby's own data and compare it to the baby's own baseline. They never diagnose, reassure, or prescribe ("mirror, not doctor" — see ADR-0005). Anything health-adjacent is stated as a neutral fact plus, at most, a "worth mentioning to your pediatrician" hand-off — never "is everything ok?" or "not enough milk".
_Avoid_: "advice", "recommendation" (implies the app is judging what the baby *should* do); use these only for suggestions sourced from a fixed published guideline (e.g. a weaning food list), never from inference about this baby.

### Baseline
The reference an [Insight](#insight) compares against: **the baby's own trailing window** (e.g. a rolling 7 days of that baby's events), never population/other-baby norms. Using the baby as its own reference keeps Insights reflective (ADR-0005) and avoids "is my baby normal compared to others", which is both advisory and anxiety-inducing. An Insight that needs a Baseline is suppressed until enough data exists to form one (see ADR-0006).

### Trends
The view showing a baby's metrics **aggregated over time** (feeds/day, ml or nursing-minutes/day, sleep hours/day, nappies/day, doses, weight), as opposed to **History**, which is the raw chronological log of individual Events. The three primary views answer three questions: the clock dial = *today at a glance*, History = *what happened* (the log), Trends = *how it's changing over time*. Trends is the home of reflective [Insights](#insight) — each metric card shows the [Baseline](#baseline) band and the Insight text sits on the chart it describes. Trends only shows cards for [Enabled Event Types](#enabled-event-types).

### Enabled Event Types
The set of Event types a Household has switched on. Not every Household tracks everything: an exclusively-bottle-feeding family with no medications sees only the buttons it uses, while a breastfeeding-plus-solids family opts into more. This keeps the default experience calm — complexity is opt-in per Household, not forced on everyone. The available set grows over the roadmap (breast Feeds, Solids, Pumping, Notes, growth measurements); which are on is Household configuration, not a code branch. Defining a Medication implicitly enables Dose logging, mirroring this pattern.
_Avoid_: "feature flags" (those are release-engineering constructs, global and temporary; Enabled Event Types are per-Household and permanent user choices).

### Reminder
An opt-in nudge to a caregiver, **laid on top of a source**. Reminders are computed and sent from the cloud so they arrive even with the app closed and require no client-side timer or re-arming. The source can be:
- a **Feed** — in **fixed-interval** mode ("3 hours since the last bottle", computed off the household's latest non-deleted Feed; deleting that Feed recomputes off the previous one) or **predictive** mode (fires ahead of the baby's *typical* next feed, from recent rhythm). The two modes co-exist; the caregiver picks one.
- a **Medication Schedule** — fires when a Dose comes due per the Medication's Schedule.

A Reminder is distinct from an Insight Nudge: a Reminder is time/schedule-driven ("something is due"); an Insight Nudge reflects a pattern.

### Insight Nudge
An [Insight](#insight) delivered as a notification rather than shown in-app. Opt-in and **low-frequency by design** — ideally a once-daily digest, never a real-time alarm. The reflective-phrasing rules (ADR-0005) apply verbatim: it states a fact about the baby's own data, never "is everything ok?".

### Push Subscription
The server-side record that lets a Reminder reach a specific device — the browser's Web Push endpoint plus the caregiver's chosen interval and whether reminders are enabled. Created when a caregiver turns reminders on (granting notification permission) and removed when they turn them off or the browser drops the subscription. One device = one Push Subscription.
