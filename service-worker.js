const CACHE_NAME = 'anatoflow-v22-cache';
const urlsToCache = [
  // ⭐️ Rutas corregidas: Usamos el punto y barra "./" o quitamos la barra inicial
  './',               // La ruta raíz de la aplicación
  'index.html',
  'manifest.json',

  // Archivos JavaScript
  'js/ui.js',
  'js/protocols.js',
  'js/timer.js',
  'js/inventory.js',
  'js/ai-final.js', 
  'js/report.js',

  // Archivos de Íconos
  'assets/icon-192.png', 
  'assets/icon-512.png'  
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] Precaching App Shell');
        // El Promise.all maneja los fallos, pero la ruta debería estar bien ahora.
        return cache.addAll(urlsToCache);
      })
      .catch(error => {
        // Este error de caché ya no debería aparecer.
        console.error('[Service Worker] Error durante la instalación:', error);
      })
  );
});

self.addEventListener('fetch', event => {
  // Estrategia App Shell: Sirve el index.html si no hay red y es navegación.
  
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }

        return fetch(event.request).catch(() => {
          if (event.request.mode === 'navigate') {
            // Usa la ruta relativa para el App Shell
            return caches.match('index.html'); 
          }
        });
      })
  );
});

// Opcional: Limpieza de cachés antiguas (Se mantiene para consistencia)
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
