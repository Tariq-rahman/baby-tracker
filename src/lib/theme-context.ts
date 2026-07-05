import { createContext, useContext } from 'react'
import { refreshPaletteFromCss } from './theme'

/** What the user chose. `system` follows the OS `prefers-color-scheme`. */
export type ThemeChoice = 'light' | 'dark' | 'system'
/** The concrete theme actually applied to the document. */
export type ResolvedTheme = 'light' | 'dark'

/**
 * Device-only preference key. Deliberately NOT part of the synced Dexie store —
 * theme is a per-device choice (a phone kept by the bed may want dark while the
 * kitchen tablet stays light). Keep this key in sync with the pre-paint inline
 * script in `index.html`.
 */
export const THEME_STORAGE_KEY = 'bt.theme'

/** Browser-chrome colour (address bar / status bar) per resolved theme. */
const META_THEME_COLOR: Record<ResolvedTheme, string> = {
  light: '#FBF3EA',
  dark: '#1C1613',
}

/** Coerce a raw localStorage value into a valid choice (absent/garbage ⇒ system). */
export function readStoredChoice(raw: string | null): ThemeChoice {
  return raw === 'light' || raw === 'dark' || raw === 'system' ? raw : 'system'
}

/** Resolve a choice to the concrete theme, given the current system preference. */
export function resolveTheme(choice: ThemeChoice, systemDark: boolean): ResolvedTheme {
  if (choice === 'system') return systemDark ? 'dark' : 'light'
  return choice
}

/** Whether the OS currently prefers a dark colour scheme. */
export function systemPrefersDark(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
  )
}

/** The persisted choice (or `system` when nothing is stored). */
export function currentChoice(): ThemeChoice {
  if (typeof localStorage === 'undefined') return 'system'
  return readStoredChoice(localStorage.getItem(THEME_STORAGE_KEY))
}

/**
 * Apply a resolved theme to the document: toggle the `.dark` class (which flips the
 * CSS custom properties), refresh the runtime palette from those variables, and
 * update the `meta[name=theme-color]` for browser chrome.
 */
export function applyResolvedTheme(resolved: ResolvedTheme): void {
  if (typeof document === 'undefined') return
  document.documentElement.classList.toggle('dark', resolved === 'dark')
  refreshPaletteFromCss()
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', META_THEME_COLOR[resolved])
}

/**
 * Compute and apply the theme once at startup — before React's first render — so
 * the runtime palette is correct on the very first paint. The `.dark` class is
 * already set by the inline script in `index.html`; this reconciles the JS palette
 * with the loaded stylesheet. Returns the resolved theme for the initial state.
 */
export function initTheme(): ResolvedTheme {
  const resolved = resolveTheme(currentChoice(), systemPrefersDark())
  applyResolvedTheme(resolved)
  return resolved
}

export type ThemeContextValue = {
  choice: ThemeChoice
  resolved: ResolvedTheme
  setTheme: (choice: ThemeChoice) => void
}

export const ThemeContext = createContext<ThemeContextValue | null>(null)

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider')
  return ctx
}
