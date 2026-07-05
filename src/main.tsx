import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { ThemeProvider } from './lib/ThemeProvider'
import { initTheme } from './lib/theme-context'
import './index.css'

// Reconcile the runtime palette with the stylesheet before React's first render so
// SVG/chart colours are correct on the first paint (the `.dark` class is already
// set pre-paint by the inline script in index.html).
initTheme()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ThemeProvider>
  </StrictMode>,
)
