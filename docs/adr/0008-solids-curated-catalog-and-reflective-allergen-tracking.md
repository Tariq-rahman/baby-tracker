# Solids: curated food catalog, reflective allergen tracking, suggestions-as-filtered-guidance

Solids (weaning) is a new event type — not a Feed (which is milk). Beyond simple logging, the roadmap wants likes/dislikes-driven food suggestions and allergen-introduction help. Both hinge on decisions with real cost and safety implications.

## Decisions

- **New event type** `solid` = **food** + **reaction** (liked / disliked / neutral) + optional note. **No precise amount** — it powers no useful insight and clutters logging (simplicity wedge).
- **Curated Food Catalog, not free text** (free text allowed only as a fallback for missing items). Aggregation ("liked flavors", "not yet tried") and suggestions are impossible over unstructured strings.
- **First-class allergen tracking, kept reflective.** Catalog foods flag common allergens; the app reflects introduction state and whether a reaction was *noted*. It does **not** record reaction severity or triage — a flagged reaction hands off to "seek medical advice." (ADR-0005.)
- **Suggestions = filter over a published age-staged weaning list** (foods not yet tried, optionally ordered by similarity to liked flavors), framed "ideas to try." Never an inference that this baby *should* eat a given food. (ADR-0005.)

## Why

- **The catalog is the enabler.** Curation cost is the price of the depth features that differentiate solids from a plain food diary.
- **Allergen introduction is the highest-value, most-shareable part** of solids for new parents — and safe *only* if it stays reflective.
- **Published guidance keeps suggestions defensible** and off the advisory side of the line.

## Considered and rejected

- **Free-text foods only:** cheap to build, but kills aggregation, suggestions, and reliable allergen flagging.
- **Amount/portion tracking:** clutter with no insight payoff at this stage.
- **Severity/triage logging for reactions:** crosses into medical territory (ADR-0005) and risks a parent typing instead of seeking help.

## Consequences

- Someone must **build and maintain the Food Catalog** (allergen flags, age stage) and source the **published weaning list** — a content dependency, not just code.
- The suggestion engine is another swappable strategy (ADR-0006): it consumes catalog + published list + this baby's reaction history.
- Free-text fallback foods won't get allergen flags or participate in suggestions until promoted into the catalog.
