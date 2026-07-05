# Theming: one CSS-custom-property source of truth, bridged to runtime hex, chosen per device

The app has two consumers of colour that must agree: **Tailwind static classes** (CSS-land, resolved at build/paint) and `theme.ts` **runtime hex** read in JS for SVG/chart fills and an alpha-tint idiom (`` `${col}55` `` — string-concatenating an alpha channel, which *requires* a real hex value, so these cannot be Tailwind `dark:` classes). Adding a dark mode meant flipping both worlds together without a flash of the wrong theme on first paint, and without rewiring ~20 files that `import { palette, eventColor }` directly.

## Decision

- **Single source of truth = CSS custom properties** in `src/index.css`: a `:root` (light) block and a `.dark` (dark) block, including the body radial-gradient (`--app-bg`). `tailwind.config.js` runs `darkMode: 'class'` and its named colours point at `var(--…)`.
- **`theme.ts` keeps the same importable `palette` / `eventColor` objects, mutated in place** (never reassigned) by `refreshPaletteFromCss()`, which re-reads the resolved vars via `getComputedStyle` on every theme flip. Consumers keep their existing imports; the objects just hold new values after a flip. The alpha-tint idiom still works because the values stay real hex.
- **Theme is chosen per device, not synced.** The override lives in device-only `localStorage['bt.theme']` (Light / Dark / System). `system` = no key, and we follow `prefers-color-scheme` live.
- **No-flash first paint.** An inline script in `index.html` sets `.dark` + `meta[theme-color]` *before* first paint; `main.tsx` calls `initTheme()` *before* React renders, so the JS palette matches the stylesheet on the very first frame.

## Why

- **Rewiring ~20 direct importers to a hook was too invasive** and the alpha-concat idiom needs real hex, so `dark:` classes couldn't cover them. Mutating the shared objects + re-rendering the tree lets every consumer re-read with zero changes at the call sites.
- **Applying the palette before React renders** also sidesteps `react-hooks/set-state-in-effect`: a mount `useEffect`+`setState` to force the re-read trips the lint rule. `initTheme()` (pre-render) plus a no-`setState` `useLayoutEffect` in the provider (for test self-sufficiency) avoids it.
- **Device-local, not synced:** a bedside phone may want dark while the kitchen tablet stays light. Theme is a per-device ergonomic choice, not household data.

## Consequences

- **A new colour must be added in three places to stay in sync:** the `:root` **and** `.dark` var blocks in `index.css`, and — if it is read at runtime — the `PALETTE_VARS` / `EVENT_VARS` maps in `theme.ts`. (Note `eventColor.dose` reads `--meds`: the Tailwind colour is named `meds`, the event type is `dose`.)
- **A few overlays stay theme-agnostic on purpose:** the Toast is a fixed dark chip (white text needs a dark background in *both* themes — recolouring it to `palette.ink` would make it off-white in dark and break contrast) and the sheet scrim is a dimming layer. These are intentionally hardcoded, not oversights.
- `src/lib/theme-context.ts` holds the pure helpers + context + `useTheme` so `ThemeProvider.tsx` can export only a component (satisfies `react-refresh/only-export-components`).
