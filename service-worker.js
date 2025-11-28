// service-worker.js – GitHub Pages friendly (rutas relativas + instalación tolerante)
const CACHE_NAME = "anatoflow-v22-cache-5";

// Lista “candidata”: cachea lo que exista (sin romper si falta algo)
const CANDIDATES = [
  "./",
  "./index.html",
  "./manifest.json",
  "./service-worker.js",

  // Si tus JS están en /js/
  "./js/ui.js",
  "./js/protocols.js",
  "./js/timer.js",
  "./js/inventory.js",
  "./js/ai.js",
  "./js/report.js",

  // Si tus JS están en el root (por si acaso)
  "./ui.js",
  "./protocols.js",
  "./timer.js",
  "./inventory.js",
  "./ai.js",
  "./report.js",

  // Íconos (en /assets/ o en root, por si acaso)
  "./assets/icon-192.png",
  "./assets/icon-512.png",
  "./icon-192.png",
  "./icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await Promise.allSettled(
      CANDIDATES.map(async (p) => {
        try {
          const url = new URL(p, self.registration.scope).toString();
          await cache.add(new Request(url, { cache: "reload" }));
        } catch (_) { /* ignorar */ }
      })
    );
    self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)));
    self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const req = event.request;

  event.respondWith((async () => {
    const cached = await caches.match(req);
    if (cached) return cached;

    try {
      return await fetch(req);
    } catch (e) {
      // Fallback para navegaciones
      if (req.mode === "navigate") {
        const fallback = await caches.match(new URL("./index.html", self.registration.scope));
        if (fallback) return fallback;
      }
      throw e;
    }
  })());
});
