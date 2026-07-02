import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  // Fail loud in dev; in prod the app is unusable without a backend.
  console.warn(
    'Supabase env not configured: set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY',
  )
}

export const supabase = createClient(url ?? '', anonKey ?? '', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    // Magic-link / OAuth callbacks arrive in the URL; let the client consume them.
    detectSessionInUrl: true,
  },
})
