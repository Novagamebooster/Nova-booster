const CACHE_NAME = 'nova-booster-v3';
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/css/style.css',
    '/js/app.js',
    '/js/games.js'
];

// Install
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(ASSETS_TO_CACHE))
            .then(() => self.skipWaiting())
    );
});

// Activate
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(names =>
            Promise.all(
                names.filter(n => n !== CACHE_NAME)
                    .map(n => caches.delete(n))
            )
        ).then(() => self.clients.claim())
    );
});

// Fetch - Cache first for icons and assets
self.addEventListener('fetch', event => {
    // Skip non-GET requests
    if (event.request.method !== 'GET') return;

    event.respondWith(
        caches.match(event.request).then(cached => {
            if (cached) return cached;

            return fetch(event.request).then(response => {
                // Cache images
                if (event.request.destination === 'image') {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, clone);
                    });
                }
                return response;
            });
        }).catch(() => {
            // Fallback for offline
            if (event.request.destination === 'image') {
                return caches.match('/index.html');
            }
        })
    );
});
