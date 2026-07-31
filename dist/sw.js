// Migration service worker: it removes the legacy offline cache and then
// unregisters itself. Keeping deployment HTML out of a cache prevents stale
// asset references and blank screens after Vercel releases.
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith('velo-league-')).map((key) => caches.delete(key))))
      .then(() => self.registration.unregister())
      .then(() => self.clients.claim()),
  )
})
