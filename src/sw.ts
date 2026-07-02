/// <reference lib="webworker" />
//
// Custom service worker (injectManifest). Owns Workbox precaching plus the Web
// Push handlers the feed-reminder Edge Function relies on. The payload shape is
// set server-side in supabase/functions/feed-reminder/index.ts:
//   { title, body, tag }  (with an optional `url` for deep-linking).
import { precacheAndRoute } from 'workbox-precaching'

declare const self: ServiceWorkerGlobalScope

precacheAndRoute(self.__WB_MANIFEST)

interface PushPayload {
  title?: string
  body?: string
  tag?: string
  url?: string
}

self.addEventListener('push', (event: PushEvent) => {
  const data: PushPayload = (() => {
    try {
      return (event.data?.json() as PushPayload) ?? {}
    } catch {
      return { title: 'Baby Tracker', body: event.data?.text() ?? '' }
    }
  })()

  const title = data.title ?? 'Baby Tracker'
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body ?? '',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: data.tag ?? 'feed-reminder',
      data: { url: data.url ?? '/' },
    }),
  )
})

self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close()
  const url = (event.notification.data?.url as string | undefined) ?? '/'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      const existing = clients.find((c) => 'focus' in c)
      if (existing) return (existing as WindowClient).focus()
      return self.clients.openWindow(url)
    }),
  )
})
