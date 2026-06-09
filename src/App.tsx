import { NavLink, Route, Routes } from 'react-router-dom'
import HomePage from './pages/HomePage'
import HistoryPage from './pages/HistoryPage'
import WeightPage from './pages/WeightPage'
import SettingsPage from './pages/SettingsPage'

const navItems = [
  { to: '/', label: 'Home' },
  { to: '/history', label: 'History' },
  { to: '/weight', label: 'Weight' },
  { to: '/settings', label: 'Settings' },
]

export default function App() {
  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/weight" element={<WeightPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>
      <nav className="fixed bottom-0 inset-x-0 grid grid-cols-4 border-t bg-white">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `py-3 text-center text-sm ${isActive ? 'font-bold text-blue-600' : 'text-slate-500'}`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
