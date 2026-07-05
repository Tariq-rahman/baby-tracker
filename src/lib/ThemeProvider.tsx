import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react'
import {
  applyResolvedTheme,
  currentChoice,
  resolveTheme,
  systemPrefersDark,
  THEME_STORAGE_KEY,
  ThemeContext,
  type ThemeChoice,
  type ThemeContextValue,
  type ResolvedTheme,
} from './theme-context'

/**
 * Owns the active theme. The initial palette + `.dark` class are set before render
 * by `initTheme()` (called in main.tsx) and the inline script in index.html, so
 * this provider only tracks the choice, reacts to the Settings control, and follows
 * live OS changes while on `system`.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [choice, setChoice] = useState<ThemeChoice>(currentChoice)
  const [resolved, setResolved] = useState<ResolvedTheme>(() =>
    resolveTheme(currentChoice(), systemPrefersDark()),
  )

  // Reconcile the document with the current choice on mount (applies the `.dark`
  // class + refreshes the palette). Idempotent with initTheme() in main.tsx, and
  // keeps the provider self-sufficient when used without it. No setState here.
  useLayoutEffect(() => {
    applyResolvedTheme(resolveTheme(currentChoice(), systemPrefersDark()))
  }, [])

  // While on `system`, follow live OS theme changes.
  useEffect(() => {
    if (choice !== 'system' || typeof window.matchMedia !== 'function') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => {
      const next = resolveTheme('system', mq.matches)
      applyResolvedTheme(next)
      setResolved(next)
    }
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [choice])

  const setTheme = useCallback((next: ThemeChoice) => {
    if (typeof localStorage !== 'undefined') {
      if (next === 'system') localStorage.removeItem(THEME_STORAGE_KEY)
      else localStorage.setItem(THEME_STORAGE_KEY, next)
    }
    const nextResolved = resolveTheme(next, systemPrefersDark())
    // Apply synchronously (before the re-render) so the palette is current by the
    // time consumers re-read it.
    applyResolvedTheme(nextResolved)
    setChoice(next)
    setResolved(nextResolved)
  }, [])

  const value = useMemo<ThemeContextValue>(
    () => ({ choice, resolved, setTheme }),
    [choice, resolved, setTheme],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
