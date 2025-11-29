const CACHE_NAME = "anatoflow-v22-cache-v3";

// IMPORTANTE: en GitHub Pages (repo pages) usa rutas RELATIVAS "./"
const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./service-worker.js",
  "./assets/icon-192.png",
  "./assets/icon-512.png",
  "./js/ui.js",
  "./js/protocols.js",
  "./js/timer.js",
  "./js/inventory.js",
  "./js/ai.js",
  "./js/report.js"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request).then(hit => {
      if (hit) return hit;
      return fetch(event.request).catch(() => caches.match("./index.html"));
    })
  );
});
