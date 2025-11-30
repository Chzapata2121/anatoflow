const CACHE_NAME = 'anatoflow-v22-cache';
const urlsToCache = [
  // ⭐️ Incluir explícitamente la raíz '/' como App Shell
  '/', 
  '/index.html',
  '/manifest.json',
  '/js/ui.js',
  '/js/protocols.js',
  '/js/timer.js',
  '/js/inventory.js',
  '/js/ai-final.js', // ⭐️ Cambiado de /js/ai.js a /js/ai-final.js
  '/js/report.js',
  '/assets/icon-192.png',
  '/assets/icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] Precaching App Shell');
        return cache.addAll(urlsToCache);
      })
      .catch(error => {
        console.error('[Service Worker] Error during installation: ', error);
      })
  );
});

self.addEventListener('fetch', event => {
  // ⭐️ ESTRATEGIA: Cache-First, con Fallback de App Shell para navegación
  
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // 1. Si está en caché (Cache-First), devolver respuesta
        if (response) {
          return response;
        }

        // 2. Si no está en caché, ir a la red (si hay conexión)
        return fetch(event.request).catch(() => {
          // 3. Fallback: Si falla la red (offline), y la solicitud es de navegación, 
          //    servir el App Shell (index.html)
          if (event.request.mode === 'navigate') {
            return caches.match('/index.html');
          }
          // Para otros recursos (imágenes, fuentes), devolver una respuesta de error.
          throw new Error('Recurso no encontrado en caché ni en red.');
        });
      })
  );
});

// Opcional: Limpieza de cachés antiguas (Mejora la actualización)
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
