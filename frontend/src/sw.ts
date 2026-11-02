/// <reference lib="webworker" />
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'
import { clientsClaim } from 'workbox-core'

declare const self: ServiceWorkerGlobalScope & { __WB_MANIFEST: any }

self.skipWaiting()
clientsClaim()
cleanupOutdatedCaches()
precacheAndRoute(self.__WB_MANIFEST)
registerRoute(new NavigationRoute(createHandlerBoundToURL('/index.html'), { denylist: [/^\/api\//] }))

self.addEventListener('push', (e) => {
  let d: { title?: string; body?: string; tag?: string; url?: string } = {}
  try { d = e.data?.json() ?? {} } catch { d = { title: e.data?.text() } }
  e.waitUntil(self.registration.showNotification(d.title || 'Forma', {
    body: d.body || '', tag: d.tag || 'forma', icon: '/icon-192.png', badge: '/badge-96.png', data: { url: d.url || '/workout' },
  } as NotificationOptions))
})

self.addEventListener('notificationclick', (e) => {
  e.notification.close()
  const url = (e.notification.data && e.notification.data.url) || '/'
  e.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    for (const c of all) { if ('focus' in c) { await (c as WindowClient).focus(); (c as WindowClient).navigate?.(url); return } }
    await self.clients.openWindow(url)
  })())
})
