/**
 * Service Worker für Offline-Unterstützung und Caching
 */

const CACHE_NAME = 'duelpath-v1';
const STATIC_CACHE_NAME = 'duelpath-static-v1';
const IMAGE_CACHE_NAME = 'duelpath-images-v1';
const API_CACHE_NAME = 'duelpath-api-v1';

const STATIC_ASSETS = ['/', '/decks', '/offline.html'];

// Cache-Strategien
const CACHE_STRATEGIES = {
  STATIC: 'cache-first', // Statische Assets: Cache First
  IMAGES: 'cache-first', // Bilder: Cache First mit Revalidation
  API: 'network-first', // API: Network First
  HTML: 'network-first', // HTML: Network First
};

// Install Event - Cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    Promise.all([
      // Cache statische Assets
      caches.open(STATIC_CACHE_NAME).then((cache) => {
        return cache.addAll(STATIC_ASSETS).catch((error) => {
          console.warn('Failed to cache some static assets:', error);
        });
      }),
      // Cache CSS/JS von Next.js
      caches.open(STATIC_CACHE_NAME).then((cache) => {
        // Diese werden beim ersten Request gecacht
        return Promise.resolve();
      }),
    ])
  );
  self.skipWaiting();
});

// Activate Event - Clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      const validCaches = [CACHE_NAME, STATIC_CACHE_NAME, IMAGE_CACHE_NAME, API_CACHE_NAME];
      return Promise.all(
        cacheNames
          .filter((name) => !validCaches.includes(name))
          .map((name) => {
            console.log('Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    })
  );
  self.clients.claim();
});

// Fetch Event - Verschiedene Cache-Strategien je nach Ressourcentyp
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // API-Requests: Network First mit Cache-Fallback
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirstStrategy(request, API_CACHE_NAME));
    return;
  }

  // Bilder: Cache First mit Network-Fallback
  if (request.destination === 'image' || url.pathname.match(/\.(jpg|jpeg|png|gif|webp|avif)$/i)) {
    event.respondWith(cacheFirstStrategy(request, IMAGE_CACHE_NAME));
    return;
  }

  // Statische Assets (CSS, JS): Cache First
  if (
    url.pathname.startsWith('/_next/static/') ||
    request.destination === 'style' ||
    request.destination === 'script'
  ) {
    event.respondWith(cacheFirstStrategy(request, STATIC_CACHE_NAME));
    return;
  }

  // HTML pages: Network First mit Cache-Fallback
  if (request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(networkFirstStrategy(request, CACHE_NAME, '/offline.html'));
    return;
  }

  // Default: Network First
  event.respondWith(networkFirstStrategy(request, CACHE_NAME));
});

/**
 * Cache First Strategy: Versuche Cache, dann Network
 */
async function cacheFirstStrategy(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);

  if (cachedResponse) {
    // Revalidate im Hintergrund (stale-while-revalidate)
    fetch(request)
      .then((response) => {
        if (response.ok) {
          cache.put(request, response.clone());
        }
      })
      .catch(() => {
        // Ignore errors
      });

    return cachedResponse;
  }

  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    // Return 503 if network fails and no cache
    return new Response('Service Unavailable', {
      status: 503,
      statusText: 'Service Unavailable',
    });
  }
}

/**
 * Network First Strategy: Versuche Network, dann Cache
 */
async function networkFirstStrategy(request, cacheName, fallbackUrl) {
  const cache = await caches.open(cacheName);

  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    // Fallback to cache
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    // Fallback to offline page if provided
    if (fallbackUrl) {
      const offlineResponse = await cache.match(fallbackUrl);
      if (offlineResponse) {
        return offlineResponse;
      }
    }

    return new Response('Network error and no cache available', {
      status: 503,
      statusText: 'Service Unavailable',
    });
  }
}

// Background Sync (wenn unterstützt)
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-deck-operations') {
    event.waitUntil(syncDeckOperations());
  }
});

async function syncDeckOperations() {
  // TODO: Implementiere Background Sync für Deck-Operationen
  // Dies würde die Sync-Queue aus LocalStorage verarbeiten
  console.log('Background sync triggered');
}
