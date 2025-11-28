// Nombre del caché
const CACHE_NAME = "anatoflow-v22-cache";

// Archivos a cachear (rutas RELATIVAS para GitHub Pages)
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
  "./js/ai.js",
  "./js/report.js"
];

// INSTALACIÓN DEL SW
self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

// ACTIVACIÓN / LIMPIEZA DE CACHÉS VIEJOS
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// RESPUESTAS DESDE CACHÉ (con fallback al index en fallo de red)
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return cached || fetch(event.request).catch(() => caches.match("./index.html"));
    })
  );
});
