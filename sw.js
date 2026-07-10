/* Service Worker — offline-first (see docs/adr/0009-offline-first-service-worker.md).
   Strategy: same-origin GET = stale-while-revalidate (serve cache, refresh in
   background, next load gets the update). Cross-origin (the cloud-archive
   Worker) is never intercepted.
   Any change to this file must bump CACHE_VERSION, or old caches linger and
   the new precache never installs. */
const CACHE_VERSION = 'atlas-v2';
const PRECACHE = [
  './',
  'index.html',
  'config.js?v=1',
  'data.js?v=1',
  'i18n.js?v=2',
  'app.js?v=2',
  'ledger.js?v=1',
  'scratchable.js?v=1',
  'd3.min.js?v=1',
  'topojson.min.js?v=1',
  'states-10m.json?v=1'
];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE_VERSION).then(c => c.addAll(PRECACHE)));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  if (new URL(req.url).origin !== self.location.origin) return;
  e.respondWith((async () => {
    const c = await caches.open(CACHE_VERSION);
    const cached = await c.match(req);
    const revalidate = fetch(req)
      .then(r => { if (r && r.ok) c.put(req, r.clone()); return r; })
      .catch(() => null);
    if (cached) { e.waitUntil(revalidate); return cached; }
    const fresh = await revalidate;
    if (fresh) return fresh;
    if (req.mode === 'navigate') {
      const idx = await c.match('index.html');
      if (idx) return idx;
    }
    return new Response('offline', { status: 503, statusText: 'offline' });
  })());
});
