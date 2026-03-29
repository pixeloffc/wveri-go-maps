const CACHE_NAME = 'offline-map-shell-v3';

// List of static assets to cache
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './css/style.css',
  './js/app.js',
  './lib/leaflet/leaflet.css',
  './lib/leaflet/leaflet.js',
  './lib/localforage.min.js',
  './icons/icon.svg',
  './lib/leaflet/images/marker-icon.png',
  './lib/leaflet/images/marker-icon-2x.png',
  './lib/leaflet/images/marker-shadow.png'
];

// Install Event: Precaching App Shell
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] Precaching app shell...');
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate Event: Cleaning up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            console.log('[Service Worker] Deleting old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    })
    .then(() => self.clients.claim())
  );
});

// Fetch Event: Serving from Cache (Cache-First strategy)
// Bypassing Map Tiles to avoid interferring with localforage logic
self.addEventListener('fetch', event => {
  const requestUrl = new URL(event.request.url);

  // Ignore requests map tiles (they have specific hosts we use in app.js)
  if (
    requestUrl.hostname.includes('tile.openstreetmap.org') ||
    requestUrl.hostname.includes('arcgisonline.com')
  ) {
    return; // Let the browser/plugin handle map tile requests via localforage
  }

  // For app shell: Serve from cache, fallback to network
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response; // Return from cache
        }
        
        // Otherwise, fetch from network
        return fetch(event.request).catch(err => {
          console.warn('[Service Worker] Offline and resource not cached:', event.request.url);
        });
      })
  );
});
