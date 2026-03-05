const CACHE_NAME = 'predletna-v2';

const APP_SHELL = [
  './dronski-pomocnik.html',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
];

// Install: pre-cache app shell
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

// Activate: clean old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch strategy
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Network-only for API calls, map tiles, and external services
  if (
    url.hostname.includes('arcgis') ||
    url.hostname.includes('nominatim') ||
    url.hostname.includes('tile.openstreetmap') ||
    url.hostname.includes('opentopomap') ||
    url.hostname.includes('basemaps.cartocdn') ||
    url.hostname.includes('arcgisonline') ||
    url.hostname.includes('discomap.eea') ||
    url.hostname.includes('githubusercontent') ||
    url.hostname.includes('open-meteo')
  ) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Cache-first for app shell, network-first fallback for others
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        // Don't cache non-OK or opaque responses except for basic same-origin
        if (!response || response.status !== 200) return response;
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return response;
      });
    }).catch(() => {
      // Offline fallback — return cached HTML if available
      if (event.request.mode === 'navigate') {
        return caches.match('./dronski-pomocnik.html');
      }
    })
  );
});
