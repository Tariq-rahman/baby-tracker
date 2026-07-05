import { NavLink, Route, Routes } from 'react-router-dom'
import HomePage from './pages/HomePage'
import HistoryPage from './pages/HistoryPage'
import WeightPage from './pages/WeightPage'
import TrendsPage from './pages/TrendsPage'
import SettingsPage from './pages/SettingsPage'
import AuthGate from './components/AuthGate'
import { HomeIcon, CalendarIcon, ChartIcon, GearIcon } from './components/icons'
import { palette } from './lib/theme'
import { useSync } from './hooks/useSync'

const navItems = [
  { to: '/', label: 'Home', Icon: HomeIcon },
  { to: '/history', label: 'History', Icon: CalendarIcon },
  { to: '/trends', label: 'Trends', Icon: ChartIcon },
  { to: '/settings', label: 'Settings', Icon: GearIcon },
]

export default function App() {
  return (
    <AuthGate>
      <AppShell />
    </AuthGate>
  )
}

/**
 * The signed-in app: routes, nav, and background sync. Exported so the dev entry
 * point (`main.dev.tsx`) can mount it directly, skipping `AuthGate`. `useSync`
 * no-ops without a session, so the shell renders inert-sync in dev. See the
 * DX plan (docs/superpowers/plans/2026-07-05-developer-experience.md).
 */
export function AppShell() {
  useSync()
  return (
    <>
      <div className="mx-auto min-h-screen max-w-md bg-cream pb-24">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/trends" element={<TrendsPage />} />
          <Route path="/weight" element={<WeightPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>

        <nav className="fixed inset-x-0 bottom-0 z-10 mx-auto grid max-w-md grid-cols-4 border-t border-faint bg-surface">
          {navItems.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className="flex flex-col items-center gap-1 py-2.5"
            >
              {({ isActive }) => (
                <>
                  <Icon size={23} color={isActive ? palette.ring : palette.inkSoft} sw={isActive ? 2.2 : 1.9} />
                  <span
                    className="text-[11px] font-semibold"
                    style={{ color: isActive ? palette.ring : palette.inkSoft }}
                  >
                    {label}
                  </span>
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </div>
    </>
  )
}
