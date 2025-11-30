const CACHE_NAME = 'anatoflow-v22-cache';
const urlsToCache = [
  // Archivos App Shell para el inicio sin conexión
  '/', 
  '/index.html',
  '/manifest.json',

  // Archivos JavaScript
  '/js/ui.js',
  '/js/protocols.js',
  '/js/timer.js',
  '/js/inventory.js',
  '/js/ai-final.js', // ⭐️ Ruta corregida
  '/js/report.js',

  // Archivos de Íconos (rutas forzadas para actualización)
  '/assets/icon-192.png?v=2', // ⭐️ Ruta corregida para forzar la actualización del ícono
  '/assets/icon-512.png?v=2'  // ⭐️ Ruta corregida para forzar la actualización del ícono
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
  // Estrategia: Cache-First, con Fallback de App Shell para navegación
  
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // 1. Si está en caché, devolver respuesta
        if (response) {
          return response;
        }

        // 2. Si no está en caché, ir a la red
        return fetch(event.request).catch(() => {
          // 3. Fallback: Si falla la red (offline), y la solicitud es de navegación, 
          //    servir el App Shell (index.html)
          if (event.request.mode === 'navigate') {
            return caches.match('/index.html');
          }
          // Para otros recursos, simplemente lanzamos un error (indicando que no se pudo obtener)
          throw new Error('Recurso no encontrado en caché ni en red.');
        });
      })
  );
});

// Opcional: Limpieza de cachés antiguas
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
