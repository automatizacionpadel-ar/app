const CACHE_NAME = 'padel-chat-v1'
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/src/main.jsx',
]

const WEBHOOK_ORIGIN = 'https://n8n.simplificia.com.ar'

// Install: pre-cache shell
self.addEventListener('install', (event) => {
  console.log('[SW] Instalando...')
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(['/index.html']).catch(() => {})
    })
  )
  self.skipWaiting()
})

// Activate: limpiar caches viejos
self.addEventListener('activate', (event) => {
  console.log('[SW] Activado')
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Network-first para webhooks
  if (url.origin === WEBHOOK_ORIGIN) {
    event.respondWith(networkFirst(request))
    return
  }

  // Network-first para navegación (HTML)
  if (request.mode === 'navigate') {
    event.respondWith(networkFirstWithOfflineFallback(request))
    return
  }

  // Cache-first para assets estáticos
  if (
    url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|ico|json|woff2?)$/)
  ) {
    event.respondWith(cacheFirst(request))
    return
  }

  // Default: network first
  event.respondWith(networkFirst(request))
})

async function cacheFirst(request) {
  const cached = await caches.match(request)
  if (cached) return cached
  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME)
      cache.put(request, response.clone())
    }
    return response
  } catch {
    return new Response('Recurso no disponible offline', { status: 503 })
  }
}

async function networkFirst(request) {
  try {
    const response = await fetch(request)
    if (response.ok && request.method === 'GET') {
      const cache = await caches.open(CACHE_NAME)
      cache.put(request, response.clone())
    }
    return response
  } catch {
    const cached = await caches.match(request)
    if (cached) return cached
    return new Response(
      JSON.stringify({ error: 'Sin conexión. Intentá de nuevo.' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

async function networkFirstWithOfflineFallback(request) {
  try {
    const response = await fetch(request)
    const cache = await caches.open(CACHE_NAME)
    cache.put(request, response.clone())
    return response
  } catch {
    const cached = await caches.match('/index.html')
    return cached || new Response('<h1>Sin conexión</h1>', {
      headers: { 'Content-Type': 'text/html' },
    })
  }
}
