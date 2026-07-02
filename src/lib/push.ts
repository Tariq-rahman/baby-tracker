// Client-side Web Push subscription management (ADR-0002, Task 10 client half).
//
// The feed-reminder Edge Function owns all scheduling and sending — the client's
// only job is to register a browser push subscription and toggle reminders on/off
// by upserting a row in `push_subscriptions`. See
// supabase/functions/feed-reminder/index.ts. The server recomputes the next
// reminder off the latest feed on every run, so there is no client re-arm.

import { supabase } from './supabase'
import { getHouseholdId } from './sync/engine'

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY

/** Default reminder cadence, matching the `push_subscriptions.interval_minutes` DB default. */
export const DEFAULT_INTERVAL_MINUTES = 180

/** Current reminder configuration for this device, as reflected in the UI. */
export interface ReminderState {
  /** Whether this browser can register push subscriptions at all. */
  supported: boolean
  /** Whether reminders are currently enabled for this device's subscription. */
  enabled: boolean
  intervalMinutes: number
  permission: NotificationPermission
}

/** Whether this browser supports the Push API + notifications. */
export function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

/**
 * Decode a base64url VAPID public key into the `Uint8Array` that
 * `pushManager.subscribe` expects as `applicationServerKey`. Pure — unit-tested.
 */
export function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const output = new Uint8Array(new ArrayBuffer(raw.length))
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i)
  return output
}

/** The browser push subscription for this device, if one exists. */
async function getExistingSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null
  const reg = await navigator.serviceWorker.ready
  return reg.pushManager.getSubscription()
}

/** Read the current reminder state for this device (drives the Settings toggle). */
export async function getReminderState(): Promise<ReminderState> {
  const supported = isPushSupported()
  const permission = supported ? Notification.permission : 'denied'
  const base: ReminderState = {
    supported,
    enabled: false,
    intervalMinutes: DEFAULT_INTERVAL_MINUTES,
    permission,
  }
  if (!supported) return base

  const sub = await getExistingSubscription()
  if (!sub) return base

  const { data } = await supabase
    .from('push_subscriptions')
    .select('reminder_enabled, interval_minutes')
    .eq('endpoint', sub.endpoint)
    .maybeSingle()

  return {
    ...base,
    enabled: data?.reminder_enabled ?? false,
    intervalMinutes: data?.interval_minutes ?? DEFAULT_INTERVAL_MINUTES,
  }
}

/**
 * Enable feed reminders on this device: request notification permission, register
 * (or reuse) a push subscription, and upsert an enabled `push_subscriptions` row.
 * `last_notified_feed_id` is cleared so an overdue feed re-arms immediately.
 * Throws with a user-facing message on any failure.
 */
export async function enableReminders(intervalMinutes = DEFAULT_INTERVAL_MINUTES): Promise<void> {
  if (!isPushSupported()) throw new Error('Push notifications are not supported on this device.')
  if (!VAPID_PUBLIC_KEY) throw new Error('Push is not configured (missing VITE_VAPID_PUBLIC_KEY).')

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') throw new Error('Notification permission was not granted.')

  const householdId = await getHouseholdId()
  if (!householdId) throw new Error('No household found — sign in first.')

  const { data: userData, error: userErr } = await supabase.auth.getUser()
  if (userErr || !userData.user) throw new Error('Not signed in.')

  const reg = await navigator.serviceWorker.ready
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    }))

  const json = sub.toJSON()
  const { error } = await supabase.from('push_subscriptions').upsert(
    {
      user_id: userData.user.id,
      household_id: householdId,
      endpoint: sub.endpoint,
      p256dh: json.keys?.p256dh ?? '',
      auth: json.keys?.auth ?? '',
      reminder_enabled: true,
      interval_minutes: intervalMinutes,
      last_notified_feed_id: null,
    },
    { onConflict: 'endpoint' },
  )
  if (error) throw new Error(error.message)
}

/** Disable reminders on this device (keeps the subscription; just flips the flag). */
export async function disableReminders(): Promise<void> {
  const sub = await getExistingSubscription()
  if (!sub) return
  const { error } = await supabase
    .from('push_subscriptions')
    .update({ reminder_enabled: false })
    .eq('endpoint', sub.endpoint)
  if (error) throw new Error(error.message)
}

/** Change the reminder cadence for this device's (already registered) subscription. */
export async function setReminderInterval(intervalMinutes: number): Promise<void> {
  const sub = await getExistingSubscription()
  if (!sub) return
  const { error } = await supabase
    .from('push_subscriptions')
    .update({ interval_minutes: intervalMinutes })
    .eq('endpoint', sub.endpoint)
  if (error) throw new Error(error.message)
}
