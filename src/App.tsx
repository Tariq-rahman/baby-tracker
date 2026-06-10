import { NavLink, Route, Routes } from 'react-router-dom'
import HomePage from './pages/HomePage'
import HistoryPage from './pages/HistoryPage'
import WeightPage from './pages/WeightPage'
import SettingsPage from './pages/SettingsPage'
import { HomeIcon, CalendarIcon, ChartIcon, GearIcon } from './components/icons'
import { palette } from './lib/theme'

const navItems = [
  { to: '/', label: 'Home', Icon: HomeIcon },
  { to: '/history', label: 'History', Icon: CalendarIcon },
  { to: '/weight', label: 'Weight', Icon: ChartIcon },
  { to: '/settings', label: 'Settings', Icon: GearIcon },
]

export default function App() {
  return (
    <div className="mx-auto min-h-screen max-w-md bg-cream pb-24">
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/history" element={<HistoryPage />} />
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
  )
}
