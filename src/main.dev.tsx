import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AppShell } from './App'
import { ThemeProvider } from './lib/ThemeProvider'
import { initTheme } from './lib/theme-context'
import { seedDevData } from './dev/seed'
import './index.css'

/**
 * DEV-ONLY entry point for the local visual-check loop (DX.1). Mirrors main.tsx's
 * provider stack but mounts `<AppShell/>` directly — no `AuthGate`, so screens
 * render without a Supabase magic-link login. `useSync` no-ops without a session,
 * so nothing hits the network; the app is fully local-first here.
 *
 * SECURITY: this bypass is a separate entry, not a runtime flag. It is reachable
 * only via index.dev.html, which is NOT in Vite's build input — so this file is
 * physically absent from the prod bundle, not merely disabled. Never add
 * index.dev.html to `build.rollupOptions.input`.
 */
initTheme()

// Seed the demo dataset before first render so every screen is populated.
async function bootstrap() {
  await seedDevData()
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <ThemeProvider>
        <BrowserRouter>
          <AppShell />
        </BrowserRouter>
      </ThemeProvider>
    </StrictMode>,
  )
}

void bootstrap()
