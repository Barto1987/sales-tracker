const CACHE='sales-tracker-2-0-1-netto';
const ASSETS=["./", "./index.html?v=201", "./style.css?v=201", "./app.js?v=201", "./storage.js", "./engines.js", "./parser.js", "./catalog.json?v=201", "./easy-rent-list.json?v=201", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png"];
self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)))})
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request))));
