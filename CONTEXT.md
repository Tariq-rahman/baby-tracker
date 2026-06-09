# Context: Baby Tracker

A glossary of the core domain language for this project. Implementation details do not belong here.

## Glossary

### Caregiver
A person who logs and views events for a baby. **MVP scope: a single caregiver on a single device.** Multi-caregiver shared/synced data is a deliberate post-MVP concern.

### Baby
The single infant being tracked. **MVP scope: exactly one baby**, configured once (name, date of birth) in settings. Events do not need to name the baby — there is only one. Multiple babies (twins, future children) is deferred.

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
