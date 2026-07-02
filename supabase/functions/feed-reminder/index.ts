// feed-reminder — scheduled Edge Function (invoked every minute by pg_cron).
//
// For every push subscription with reminders enabled, it finds the household's
// most recent non-deleted feed and, if more than `interval_minutes` have passed
// since it AND we haven't already notified for that exact feed, sends a Web Push
// reminder. Because the server owns the data, the reminder always recomputes off
// the latest feed — no client re-arm needed (this is the payoff of ADR-0002).
//
// Runs with the service-role key, so RLS is bypassed. Secrets required as
// function config: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT.

import { createClient } from 'npm:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'

interface PushSubscriptionRow {
  id: string
  household_id: string
  endpoint: string
  p256dh: string
  auth: string
  interval_minutes: number
  last_notified_feed_id: string | null
}

interface FeedEvent {
  id: string
  occurred_at: string
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

webpush.setVapidDetails(
  Deno.env.get('VAPID_SUBJECT') ?? 'mailto:admin@example.com',
  Deno.env.get('VAPID_PUBLIC_KEY')!,
  Deno.env.get('VAPID_PRIVATE_KEY')!,
)

/** Latest non-deleted feed per household, cached within one invocation. */
async function getLatestFeed(
  householdId: string,
  cache: Map<string, FeedEvent | null>,
): Promise<FeedEvent | null> {
  if (cache.has(householdId)) return cache.get(householdId)!

  const { data, error } = await supabase
    .from('events')
    .select('id, occurred_at')
    .eq('household_id', householdId)
    .eq('type', 'feed')
    .is('deleted_at', null)
    .order('occurred_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error(`latest feed query failed for ${householdId}:`, error.message)
    cache.set(householdId, null)
    return null
  }
  const feed = (data as FeedEvent | null) ?? null
  cache.set(householdId, feed)
  return feed
}

async function sendReminder(sub: PushSubscriptionRow, feed: FeedEvent, minutesSince: number) {
  const payload = JSON.stringify({
    title: 'Time for a feed?',
    body: `It's been ${Math.floor(minutesSince)} min since the last bottle.`,
    tag: 'feed-reminder',
  })

  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      payload,
    )
    await supabase
      .from('push_subscriptions')
      .update({ last_notified_feed_id: feed.id, last_notified_at: new Date().toISOString() })
      .eq('id', sub.id)
  } catch (err) {
    const statusCode = (err as { statusCode?: number }).statusCode
    // 404/410 → the browser dropped this subscription; stop trying to reach it.
    if (statusCode === 404 || statusCode === 410) {
      await supabase.from('push_subscriptions').delete().eq('id', sub.id)
    } else {
      console.error(`push failed for subscription ${sub.id}:`, err)
    }
  }
}

Deno.serve(async () => {
  const { data: subs, error } = await supabase
    .from('push_subscriptions')
    .select('id, household_id, endpoint, p256dh, auth, interval_minutes, last_notified_feed_id')
    .eq('reminder_enabled', true)

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const feedCache = new Map<string, FeedEvent | null>()
  const now = Date.now()
  let sent = 0

  for (const sub of (subs ?? []) as PushSubscriptionRow[]) {
    const feed = await getLatestFeed(sub.household_id, feedCache)
    if (!feed) continue

    const minutesSince = (now - new Date(feed.occurred_at).getTime()) / 60_000
    const due = minutesSince >= sub.interval_minutes
    const alreadyNotified = sub.last_notified_feed_id === feed.id
    if (due && !alreadyNotified) {
      await sendReminder(sub, feed, minutesSince)
      sent++
    }
  }

  return new Response(JSON.stringify({ checked: subs?.length ?? 0, sent }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
