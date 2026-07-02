// Household invites (ADR-0002, Task 9). Thin wrappers over the security-definer
// RPCs in migration 0005 (`create_invite`, `accept_invite`), plus the two pure
// helpers that build and parse the shareable link. The owner mints a code and
// shares it out-of-band (WhatsApp/text); the invitee redeems it, which joins the
// household server-side and resets the local cache so a fresh pull brings in the
// shared baby.

import { supabase } from './supabase'
import { pull, resetLocalSync } from './sync/engine'

/** Query-param carrying an invite code on a shareable link. */
const INVITE_PARAM = 'invite'

/** Household the invitee joined, returned by `acceptInvite`. */
export interface JoinedHousehold {
  householdId: string
  householdName: string
}

/**
 * Mint a single-use invite code for the caller's household. Returns the raw code
 * to display/share. Throws if not signed in or the RPC fails.
 */
export async function createInvite(): Promise<string> {
  const { data, error } = await supabase.rpc('create_invite')
  if (error) throw new Error(error.message)
  return data as string
}

/**
 * Redeem an invite code: join the household server-side, then reset the local
 * cache and pull the joined household's data. Trims/upper-cases the code to match
 * how it is stored. Throws on an invalid/expired code or a network error; on
 * success the local DB now mirrors the joined household.
 */
export async function acceptInvite(code: string): Promise<JoinedHousehold> {
  const { data, error } = await supabase.rpc('accept_invite', { p_code: code.trim().toUpperCase() })
  if (error) throw new Error(error.message)
  const row = data as { household_id: string; household_name: string }

  // Old household's singleton baby + cursors are stale — swap the cache wholesale.
  await resetLocalSync()
  await pull()

  return { householdId: row.household_id, householdName: row.household_name }
}

/** Build a shareable invite link that deep-links to Settings with the code prefilled. */
export function buildInviteLink(code: string, origin: string): string {
  return `${origin}/settings?${INVITE_PARAM}=${encodeURIComponent(code)}`
}

/** Extract an invite code from a URL query string (`?invite=CODE`); null if absent. */
export function parseInviteCode(search: string): string | null {
  const code = new URLSearchParams(search).get(INVITE_PARAM)
  return code && code.trim() ? code.trim().toUpperCase() : null
}
