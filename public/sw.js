// public/sw.js — SimplificIA PWA + Push
const CACHE_NAME = 'simplificia-v3'

self.addEventListener('install', () => self.skipWaiting())

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k)))).then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return
  if (!event.request.url.startsWith(self.location.origin)) return
  // No cachear APIs
  if (event.request.url.includes('/api/')) return

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok && event.request.destination !== 'video') {
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone))
        }
        return response
      })
      .catch(() => caches.match(event.request))
  )
})

self.addEventListener('push', (event) => {
  if (!event.data) return
  let data = {}
  try {
    data = event.data.json()
  } catch {
    data = { title: 'SimplificIA', body: event.data.text() }
  }
  const { title = 'SimplificIA', body = '', icon = '/favicon.ico', badge = '/favicon.ico', image, data: extraData = {} } = data

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon,
      badge,
      image,
      vibrate: [200, 100, 200],
      tag: extraData.tag || 'simplificia-notif',
      renotify: true,
      data: extraData,
      requireInteraction: false,
      actions: extraData.cita_id
        ? [
            { action: 'ver', title: 'Ver' },
            { action: 'cerrar', title: 'Cerrar' },
          ]
        : [],
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const data = event.notification.data || {}
  const url = data.url || '/'

  // Normalizar URL: si viene con campania param, preservarlo
  const targetUrl = url.startsWith('/') ? self.location.origin + url : url

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        // si ya hay una ventana con el mismo origin, navegarla
        if (client.url.startsWith(self.location.origin) && 'navigate' in client) {
          return client.focus().then(() => (client as any).navigate(targetUrl))
        }
        if (client.url === targetUrl && 'focus' in client) return client.focus()
      }
      if (clients.openWindow) return clients.openWindow(targetUrl)
    })
  )
})
