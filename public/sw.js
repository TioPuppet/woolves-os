/*
 * Woolves Life OS — service worker (M0).
 * App-shell caching only. Network-first for navigations (fresh UI when online,
 * cached shell when offline); cache-first for static assets.
 *
 * The offline MUTATION queue (IndexedDB) for quick logs is added in M3 — this
 * file intentionally does not handle POST/mutation requests yet.
 */
// Bump this version on each deploy that must invalidate the installed PWA's
// cached shell (e.g., after fixing baked-in env vars). `activate` purges any
// cache whose name differs, forcing fresh HTML + JS on the next load.
const CACHE = 'woolves-shell-v3';
const SHELL = ['/', '/manifest.webmanifest'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL)),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
      ),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return; // never intercept mutations

  // Only ever touch same-origin http(s) requests. This excludes the Supabase
  // API, CDNs and chrome-extension:// requests (which throw on cache.put).
  let url;
  try {
    url = new URL(request.url);
  } catch {
    return;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;
  if (url.origin !== self.location.origin) return;

  // Navigations: network-first, fall back to cached shell.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('/').then((r) => r || Response.error())),
    );
    return;
  }

  // Static assets: cache-first.
  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ||
        fetch(request).then((res) => {
          if (res.ok && res.type === 'basic') {
            const copy = res.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy).catch(() => {}));
          }
          return res;
        }),
    ),
  );
});
