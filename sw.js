const CACHE = 'bokha-tripsplit-v3';
const SHELL = ['./', './index.html', './manifest.webmanifest'];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(SHELL).catch(() => {})).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const r = e.request;
  if (r.method !== 'GET') return;
  let u;
  try { u = new URL(r.url); } catch (_) { return; }

  // Never cache live Supabase data / realtime / storage / auth — always hit network.
  if (u.hostname.endsWith('supabase.co') &&
      (u.pathname.startsWith('/rest') || u.pathname.startsWith('/realtime') ||
       u.pathname.startsWith('/auth') || u.pathname.startsWith('/storage'))) {
    return;
  }

  // App navigations: network-first so updates show; fall back to cached shell offline.
  if (r.mode === 'navigate') {
    e.respondWith(
      fetch(r).then((res) => {
        const cp = res.clone();
        caches.open(CACHE).then((c) => c.put('./index.html', cp)).catch(() => {});
        return res;
      }).catch(() => caches.match('./index.html').then((m) => m || caches.match('./')))
    );
    return;
  }

  // Static assets & CDN libraries: stale-while-revalidate for fast repeat loads + offline.
  e.respondWith(
    caches.match(r).then((cached) => {
      const net = fetch(r).then((res) => {
        if (res && (res.status === 200 || res.type === 'opaque')) {
          const cp = res.clone();
          caches.open(CACHE).then((c) => c.put(r, cp)).catch(() => {});
        }
        return res;
      }).catch(() => cached);
      return cached || net;
    })
  );
});
