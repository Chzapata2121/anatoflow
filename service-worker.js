const CACHE_NAME = "anatoflow-v22-cache-20251129"; // cambia el sufijo cada vez que actualices

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
  // No tocar POST / ni orígenes externos (Worker, HF, etc.)
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      return cached || fetch(event.request).then(resp => {
        const copy = resp.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy)).catch(() => {});
        return resp;
      }).catch(() => caches.match("./index.html"));
    })
  );
});
