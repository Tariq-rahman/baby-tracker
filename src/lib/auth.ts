import { supabase } from './supabase'

/**
 * Send a passwordless magic-link sign-in email. The link redirects back to the
 * current origin, where `detectSessionInUrl` (see `supabase.ts`) consumes the
 * token and establishes the session.
 */
export async function signInWithMagicLink(email: string): Promise<void> {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: window.location.origin },
  })
  if (error) throw error
}

/** Clear the local session and sign the user out. */
export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}
