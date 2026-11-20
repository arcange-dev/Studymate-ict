/*
  StudyMate ICT — offline service worker
  --------------------------------------
  Strategy:
    • On install, precache the complete application shell (HTML, CSS, JS, icons).
    • Navigations and static assets are served cache-first, then network.
    • A navigation that is not cached falls back to the cached index.html, so the
      hash router keeps working offline.
  The app makes no third-party requests, so every cached URL is same-origin.
*/

var VERSION = 'studymate-ict-v1';
var SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/styles.css',
  './assets/favicon.svg',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/icons/icon-512-maskable.png',
  './js/storage.js',
  './js/ui.js',
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
  './js/app.js'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches
      .open(VERSION)
      .then(function (cache) {
        return cache.addAll(SHELL);
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

  event.respondWith(
    caches.match(request, { ignoreSearch: request.mode === 'navigate' }).then(function (cached) {
      if (cached) {
        // Refresh the copy in the background so a future load is current.
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
              /* offline: keep the cached copy */
            })
        );
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
            return caches.match('./index.html');
          }
          return Response.error();
        });
    })
  );
});
