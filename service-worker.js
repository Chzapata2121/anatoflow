const CACHE_NAME = "anatoflow-v22-cache-v3";

const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./assets/icon-192.png",
  "./assets/icon-512.png",
  "./js/ui.js",
  "./js/protocols.js",
  "./js/timer.js",
  "./js/inventory.js",
  "./js/ai-final.js",
  "./js/report.js"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  // No tocar POST/PUT/etc
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      return (
        cached ||
        fetch(event.request).then((res) => {
          // cachea “lo estático”
          const url = new URL(event.request.url);
          if (res.ok && (url.pathname.includes("/anatoflow/"))) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return res;
        }).catch(() => caches.match("./index.html"))
      );
    })
  );
});
