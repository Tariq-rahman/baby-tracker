# Insights are gated by data-sufficiency, baselined on the baby's own trailing window, and confidence-aware

The depth wedge (predictive reminders, "below average" nudges, "typical" dial bands, trends) all depend on a baseline. But a newborn's data is sparse (cold start) and erratic (cluster feeding, growth spurts in the first ~6–8 weeks). Naive averages and rhythm predictions would show garbage exactly when a new user is deciding whether to keep the app — breaking the wedge at its most fragile moment.

## The rule

- **Data-sufficiency gate.** An Insight that needs history is not shown until a minimum is met (e.g. ≥N days with ≥M events of the relevant type). Below threshold: show nothing, or a plain "keep logging — patterns appear after about a week." Never a number derived from noise.
- **Baseline = the baby's own trailing window** (e.g. rolling 7 days), never population norms. Keeps us reflective (ADR-0005) and sidesteps "normal vs other babies."
- **Confidence-aware predictions.** "Next feed likely ~14:30" is surfaced only when recent intervals are consistent; when variance is high, degrade to a range or suppress entirely. Honest silence beats a confident wrong guess for a sleep-deprived parent.

## Implementation

- The baseline/prediction computation sits behind a **swappable strategy interface** (strategy pattern), so the algorithm can be changed or A/B-tested without touching the insight surfaces. Thresholds and confidence bars are strategy parameters, not magic numbers scattered across the UI.

## Consequences

- Every insight surface must handle a "not enough data yet / low confidence" state as a first-class case, not an afterthought.
- Because strategies are swappable, insight copy must be written against the *contract* (fact + optional confidence), not a specific algorithm.
- Population-norm comparisons are deliberately out of scope; adding them later would be a conscious move across the reflective line (ADR-0005).
