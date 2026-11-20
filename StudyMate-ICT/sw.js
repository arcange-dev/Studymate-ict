/* StudyMate ICT — offline service worker
  --------------------------------------
  Strategy:
    • On install, precache the complete application shell (HTML, CSS, JS, icons).
    • Navigations and static assets are served cache-first, then network.
    • A navigation that is not cached falls back to the cached "/", so the
      hash router keeps working offline.
    • API routes are never cached or intercepted: AI answers must be live, and
      a cached health check would lie about whether a key is configured.
  The app makes no third-party requests, so every cached URL is same-origin.
*/

var VERSION = 'studymate-ict-v3';
var SHELL = [
  './',
  './manifest.webmanifest',
  './css/styles.css',
  './assets/favicon.svg',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/icons/icon-512-maskable.png',
  './js/core.js',
  './js/storage.js',
  './js/ui.js',
  './js/ai.js',
  './js/prompts.js',
  './js/glossary-data.js',
  './js/explainer.js',
  './js/quiz.js',
  './js/planner.js',
  './js/glossary.js',
  './js/source.js',
  './js/library.js',
  './js/dashboard.js',
  './js/saved.js',
  './js/settings.js',
  './js/app.js'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches
      .open(VERSION)
      .then(function (cache) {
        // Precache each file independently. cache.addAll() is all-or-nothing:
        // one stalled request would leave install pending forever and the app
        // without a worker. Anything missed here is cached on first use.
        return Promise.all(
          SHELL.map(function (url) {
            return cache.add(url).catch(function () {
              return null;
            });
          })
        );
      })
      .then(function () {
        return self.skipWaiting();
      })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches
      .keys()
      .then(function (keys) {
        return Promise.all(
          keys.map(function (key) {
            return key === VERSION ? null : caches.delete(key);
          })
        );
      })
      .then(function () {
        return self.clients.claim();
      })
  );
});

self.addEventListener('fetch', function (event) {
  var request = event.request;

  // Only same-origin GETs are cached; anything else goes straight to the network.
  if (request.method !== 'GET') return;
  var url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.indexOf('/api/') === 0) return;

  event.respondWith(
    caches.match(request, { ignoreSearch: request.mode === 'navigate' }).then(function (cached) {
      if (cached) {
        // Refresh the copy in the background so a future load is current. Skipped
        // while offline, where that fetch could only fail.
        if (navigator.onLine) {
          event.waitUntil(
            fetch(request)
              .then(function (response) {
                if (response && response.ok && response.type === 'basic') {
                  return caches.open(VERSION).then(function (cache) {
                    return cache.put(request, response.clone());
                  });
                }
              })
              .catch(function () {
                /* network dropped mid-flight: keep the cached copy */
              })
          );
        }
        return cached;
      }

      return fetch(request)
        .then(function (response) {
          if (response && response.ok && response.type === 'basic') {
            var copy = response.clone();
            caches.open(VERSION).then(function (cache) {
              cache.put(request, copy);
            });
          }
          return response;
        })
        .catch(function () {
          if (request.mode === 'navigate') {
            return caches.match('./');
          }
          return Response.error();
        });
    })
  );
});
