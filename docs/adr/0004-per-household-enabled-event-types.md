# Per-household enabled event types (progressive disclosure)

Two of the product's wedges — the clock dial and a **beautiful, simple** UI — are in direct tension with the breadth a public launch (audience "C") demands. Every competitor started calm and became bloated because commercial pressure forced them to match feature checklists on one screen for everyone.

We resolve this with **per-household Enabled Event Types**: the app can support many event types, but each Household switches on only the ones it uses. The default home screen shows a minimal set; additional types (breast Feeds, Solids, Pumping, Notes, growth measurements) are opt-in per Household. Complexity is therefore *opt-in*, and the default stays calm no matter how many types exist in the codebase.

## Why

- **Reconciles the wedges with breadth.** A breastfeeding family gets its live-timer feed; a minimalist bottle-feeding family still sees three buttons. We can serve more segments (required for C) without a busier default screen.
- **Cheap and already precedented.** Medications are already user-defined, and defining one implicitly enables Dose logging — this generalises that pattern. It costs a small settings surface plus conditional rendering of the log buttons.
- **Protects the roadmap.** New event types become opt-in additions rather than forced additions, lowering the bar for shipping one and removing "but it clutters the home screen" as a reason not to.

## Considered and rejected

- **Hard feature ceiling** (fix a small set, refuse the rest): forecloses C — it permanently excludes breastfeeders, solids-trackers, pumpers.
- **Grow freely, defend simplicity later with design/IA**: this is exactly how every competitor got bloated. Simplicity defended only by taste erodes under feature pressure.

## Consequences

- A Household carries an **Enabled Event Types** setting (which types are on). It must sync like other household data and have a sensible default for new households.
- The log-button row and, where relevant, history/stats surfaces render conditionally on the enabled set.
- Enabling/disabling a type must not destroy existing data — disabling hides the log affordance but historical events of that type remain and stay visible in history.
- Onboarding (for C) should offer a quick "what do you want to track?" step that writes this setting.
