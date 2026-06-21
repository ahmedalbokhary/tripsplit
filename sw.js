const CACHE='tripsplit-v1';
self.addEventListener('install',e=>{self.skipWaiting();});
self.addEventListener('activate',e=>{e.waitUntil(self.clients.claim());});
self.addEventListener('fetch',e=>{
  const r=e.request;
  if(r.method!=='GET') return;
  if(r.url.includes('supabase.co/rest')||r.url.includes('supabase.co/realtime')||r.url.includes('supabase.co/auth')) return;
  if(r.mode==='navigate'){ e.respondWith(fetch(r).catch(()=>caches.match(r).then(c=>c||caches.match('./index.html')))); return; }
  e.respondWith(caches.match(r).then(c=>c||fetch(r).then(res=>{const cp=res.clone();caches.open(CACHE).then(ca=>ca.put(r,cp)).catch(()=>{});return res;}).catch(()=>c)));
});
