const CACHE = 'bokha-tripsplit-v4';
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


// ===== Web Push: phone notifications + app icon badge =====
self.addEventListener('push', function(e){
  var data={};
  try{ data = e.data ? e.data.json() : {}; }catch(_){ try{ data={ body: e.data && e.data.text() }; }catch(__){} }
  var title = data.title || 'Bokha tripsplit';
  var body  = data.body  || 'New activity in your trip';
  var tag   = data.tag   || ('bt-'+Date.now());
  var count = Number(data.count) || 0;
  e.waitUntil((async function(){
    await self.registration.showNotification(title, {
      body: body, tag: tag, renotify: true,
      icon: './icon-ocean-192.png', badge: './icon-ocean-192.png',
      data: { url: data.url || './index.html' }
    });
    try{ if (self.registration && navigator.setAppBadge){ if(count>0){ await navigator.setAppBadge(count); } else { await navigator.setAppBadge(); } } }catch(_){}
  })());
});

self.addEventListener('notificationclick', function(e){
  e.notification.close();
  var url = (e.notification.data && e.notification.data.url) || './index.html';
  e.waitUntil((async function(){
    try{ if(navigator.clearAppBadge) await navigator.clearAppBadge(); }catch(_){}
    var all = await self.clients.matchAll({ type:'window', includeUncontrolled:true });
    for (var i=0;i<all.length;i++){ var c=all[i]; if('focus' in c){ try{ await c.focus(); return; }catch(_){} } }
    if (self.clients.openWindow) return self.clients.openWindow(url);
  })());
});

// allow the page to clear the icon badge when the user reads notifications
self.addEventListener('message', function(e){
  if(e.data === 'bt-clear-badge'){ try{ if(navigator.clearAppBadge) navigator.clearAppBadge(); }catch(_){} }
});
