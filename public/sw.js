/* Achilyon service worker — offline fallback only.
   Market data is never cached here: stale prices are worse than no prices. */
const CACHE = 'achilyon-shell-v1'
const OFFLINE_URL = '/offline'

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll([OFFLINE_URL, '/icon.svg'])).then(() => self.skipWaiting()))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.mode !== 'navigate') return
  event.respondWith(fetch(req).catch(() => caches.match(OFFLINE_URL)))
})
