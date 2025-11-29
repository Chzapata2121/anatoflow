const CACHE_NAME = "anatoflow-v22-cache-2025-11-29";

// Lista “tolerante”: intentará cachear estas rutas relativas al scope del SW.
// Incluye variantes por si tus JS están en /js/ o en raíz.
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
  "./js/report.js",

  "./ui.js",
  "./protocols.js",
  "./timer.js",
  "./inventory.js",
  "./ai.js",
  "./report.js"
];

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);

    // “addAll” falla si 1 archivo da 404. Esto no.
    await Promise.allSettled(
      APP_SHELL.map((u) => cache.add(u).catch(() => null))
    );

    self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const req = event.request;

  // Navegación: intenta red y si falla, index cacheado
  if (req.mode === "navigate") {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req);
        const cache = await caches.open(CACHE_NAME);
        cache.put("./index.html", fresh.clone()).catch(() => {});
        return fresh;
      } catch {
        const cached = await caches.match("./index.html");
        return cached || new Response("Offline", { status: 200 });
      }
    })());
    return;
  }

  // Assets: cache-first
  event.respondWith((async () => {
    const cached = await caches.match(req);
    if (cached) return cached;

    try {
      const fresh = await fetch(req);
      const cache = await caches.open(CACHE_NAME);
      cache.put(req, fresh.clone()).catch(() => {});
      return fresh;
    } catch {
      return cached || new Response("", { status: 504 });
    }
  })());
});
