const CACHE='sales-tracker-2-0';
const ASSETS=["./", "./index.html?v=200", "./style.css?v=200", "./app.js?v=200", "./storage.js", "./engines.js", "./parser.js", "./catalog.json?v=200", "./easy-rent-list.json?v=200", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png"];
self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)))})
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request))));
