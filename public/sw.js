// public/sw.js
// SimplificIA — Service Worker
// Sprint 5: Push Notifications + Offline básico

const CACHE_NAME = 'simplificia-v1'
const OFFLINE_URLS = ['/app', '/app/chat', '/logo.png', '/manifest.json']

// ─── Install ──────────────────────────────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(OFFLINE_URLS))
  )
  self.skipWaiting()
})

// ─── Activate ─────────────────────────────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  )
  self.clients.claim()
})

// ─── Fetch: network-first con fallback a cache ────────────────────────────────
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return
  if (!event.request.url.startsWith(self.location.origin)) return

  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (response.ok && event.request.destination !== 'video') {
          const clone = response.clone()
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone))
        }
        return response
      })
      .catch(() => caches.match(event.request))
  )
})

// ─── Push: recibir notificaciones ────────────────────────────────────────────
self.addEventListener('push', event => {
  if (!event.data) return

  let data = {}
  try { data = event.data.json() }
  catch { data = { title: 'SimplificIA', body: event.data.text() } }

  const {
    title = 'SimplificIA',
    body = '',
    icon = '/logo.png',
    badge = '/logo.png',
    data: extraData = {}
  } = data

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon,
      badge,
      vibrate:  [200, 100, 200],
      tag:      extraData.tag || 'simplificia-notif',
      renotify: true,
      data:     extraData,
      actions: extraData.cita_id ? [
        { action: 'ver',    title: 'Ver cita' },
        { action: 'cerrar', title: 'Cerrar' },
      ] : [],
    })
  )
})

// ─── Notification click ───────────────────────────────────────────────────────
self.addEventListener('notificationclick', event => {
  event.notification.close()

  const data = event.notification.data || {}
  const url  = event.action === 'ver' && data.cita_id
    ? `/app/cita/${data.cita_id}`
    : '/app'

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url)
          return client.focus()
        }
      }
      if (clients.openWindow) return clients.openWindow(url)
    })
  )
})
