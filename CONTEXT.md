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
A single timestamped thing the caregiver records about the baby. Every Event has a type and a time at which it occurred. The MVP supports four event types: **Feed**, **Nappy**, **Weight**, and **Medication**.

Deferred event types (documented, not built for MVP): Sleep, Pumping, free-text Note, height/other growth measurements.

### Feed
An Event recording the baby being fed. **MVP scope: bottle feeds only**, capturing volume in millilitres plus an optional content type (formula / expressed breast milk). Deferred (documented): breast feeds (side + duration) and solids (food + amount).

### Nappy
An Event recording a nappy change. Fields: time, and type (wet / dirty / both). When the type includes a dirty component (dirty or both), a size is also recorded (small / medium / large). Purely wet nappies have no size.

### Weight
An Event recording a body-weight measurement of the baby. Fields: time and weight value. Weight may be entered as imperial (pounds + ounces) or metric (kilograms, decimal), but is always stored internally as grams, rounded to the nearest gram. Weight has a trend view (line chart over time).

### Medication
A medication or supplement the caregiver has **defined once** for reuse — name, default dose amount, and unit (ml / mg / IU / drops). Defining a Medication is a setup action, not a logged Event. (e.g. "Vitamin D / 400 / IU".)

### Dose
An Event recording that a defined Medication was given to the baby at a particular time. Fields: time, the Medication given, and dose amount (defaults to the Medication's default dose, editable per dose). A Dose always references an existing Medication.

### Reminder
An opt-in nudge to a caregiver that it has been a while since the last Feed. A caregiver turns reminders on and picks an interval (e.g. "3 hours since the last bottle"). Reminders are computed and sent from the cloud off the household's latest non-deleted Feed, so they arrive even with the app closed and require no client-side timer or re-arming. Deleting the latest Feed recomputes the reminder off the previous one.

### Push Subscription
The server-side record that lets a Reminder reach a specific device — the browser's Web Push endpoint plus the caregiver's chosen interval and whether reminders are enabled. Created when a caregiver turns reminders on (granting notification permission) and removed when they turn them off or the browser drops the subscription. One device = one Push Subscription.
