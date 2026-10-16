'use strict';
const CACHE = 'restaurant-bucket-list-v2';
const SHELL = ['./', './index.html', './location.js', './install.js', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png', './icons/maskable-512.png', './icons/apple-touch-icon.png'];
const ASSETS = [...SHELL, './vendor/leaflet/leaflet.css', './vendor/leaflet/leaflet.js',
  './vendor/leaflet/images/marker-icon.png', './vendor/leaflet/images/marker-icon-2x.png',
  './vendor/leaflet/images/marker-shadow.png', './vendor/leaflet/images/layers.png', './vendor/leaflet/images/layers-2x.png',
  './vendor/leaflet.markercluster/MarkerCluster.css', './vendor/leaflet.markercluster/MarkerCluster.Default.css',
  './vendor/leaflet.markercluster/leaflet.markercluster.js'];
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(ASSETS);
  })());
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) {
      if (key.startsWith('restaurant-bucket-list-') && key !== CACHE) await caches.delete(key);
    }
    await self.clients.claim();
  })());
});
self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET') return;
  const local = url.origin === self.location.origin && ASSETS.some(path => new URL(path, self.registration.scope).href === url.href);
  if (!local) return; // Never cache JSONP, geocoding or map tiles.
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      const response = await fetch(event.request);
      if (!response.ok && response.type !== 'opaque') throw new Error('Network response failed');
      await cache.put(event.request, response.clone()).catch(() => {});
      return response;
    } catch (error) {
      const cached = await cache.match(event.request);
      if (cached) return cached;
      throw error;
    }
  })());
});
