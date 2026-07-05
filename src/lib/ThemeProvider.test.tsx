import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ThemeProvider } from './ThemeProvider'
import {
  THEME_STORAGE_KEY,
  readStoredChoice,
  resolveTheme,
  useTheme,
  type ThemeChoice,
} from './theme-context'

describe('resolveTheme', () => {
  const cases: { choice: ThemeChoice; systemDark: boolean; want: 'light' | 'dark' }[] = [
    { choice: 'light', systemDark: false, want: 'light' },
    { choice: 'light', systemDark: true, want: 'light' },
    { choice: 'dark', systemDark: false, want: 'dark' },
    { choice: 'dark', systemDark: true, want: 'dark' },
    { choice: 'system', systemDark: true, want: 'dark' },
    { choice: 'system', systemDark: false, want: 'light' },
  ]
  for (const c of cases) {
    it(`${c.choice} + system=${c.systemDark} => ${c.want}`, () => {
      expect(resolveTheme(c.choice, c.systemDark)).toBe(c.want)
    })
  }
})

describe('readStoredChoice', () => {
  const cases: { raw: string | null; want: ThemeChoice }[] = [
    { raw: 'light', want: 'light' },
    { raw: 'dark', want: 'dark' },
    { raw: 'system', want: 'system' },
    { raw: null, want: 'system' },
    { raw: 'garbage', want: 'system' },
    { raw: '', want: 'system' },
  ]
  for (const c of cases) {
    it(`"${c.raw}" => ${c.want}`, () => {
      expect(readStoredChoice(c.raw)).toBe(c.want)
    })
  }
})

/** Stub window.matchMedia and return a handle to flip the system preference. */
function stubMatchMedia(initialDark: boolean) {
  const listeners = new Set<() => void>()
  const mql = {
    matches: initialDark,
    media: '(prefers-color-scheme: dark)',
    addEventListener: (_: string, cb: () => void) => listeners.add(cb),
    removeEventListener: (_: string, cb: () => void) => listeners.delete(cb),
    addListener: (cb: () => void) => listeners.add(cb),
    removeListener: (cb: () => void) => listeners.delete(cb),
    dispatchEvent: () => true,
    onchange: null,
  }
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => mql),
  )
  return {
    setDark(dark: boolean) {
      mql.matches = dark
      act(() => listeners.forEach((cb) => cb()))
    },
  }
}

function Probe() {
  const { choice, resolved, setTheme } = useTheme()
  return (
    <div>
      <span data-testid="choice">{choice}</span>
      <span data-testid="resolved">{resolved}</span>
      <button onClick={() => setTheme('dark')}>go dark</button>
      <button onClick={() => setTheme('light')}>go light</button>
      <button onClick={() => setTheme('system')}>go system</button>
    </div>
  )
}

describe('ThemeProvider', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.classList.remove('dark')
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('defaults to system: light OS preference => light, no dark class', () => {
    stubMatchMedia(false)
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    )
    expect(screen.getByTestId('choice')).toHaveTextContent('system')
    expect(screen.getByTestId('resolved')).toHaveTextContent('light')
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })

  it('respects system dark preference when no override is stored', () => {
    stubMatchMedia(true)
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    )
    expect(screen.getByTestId('resolved')).toHaveTextContent('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('a stored dark override wins over a light system preference', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'dark')
    stubMatchMedia(false)
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    )
    expect(screen.getByTestId('choice')).toHaveTextContent('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('setTheme(dark) toggles the class and persists the choice', async () => {
    stubMatchMedia(false)
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    )
    await userEvent.click(screen.getByText('go dark'))
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark')

    await userEvent.click(screen.getByText('go light'))
    expect(document.documentElement.classList.contains('dark')).toBe(false)
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light')
  })

  it('setTheme(system) clears the stored override', async () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'dark')
    stubMatchMedia(false)
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    )
    await userEvent.click(screen.getByText('go system'))
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBeNull()
    expect(screen.getByTestId('choice')).toHaveTextContent('system')
  })

  it('follows live OS changes while on system', () => {
    const mm = stubMatchMedia(false)
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    )
    expect(document.documentElement.classList.contains('dark')).toBe(false)
    mm.setDark(true)
    expect(screen.getByTestId('resolved')).toHaveTextContent('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })
})
