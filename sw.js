const CACHE_NAME = "kemp-scanner-v1";

const FILES_TO_CACHE = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./manifest.json",
  "https://unpkg.com/html5-qrcode"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(FILES_TO_CACHE))
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", event => {

  if (event.request.method !== "GET") {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {

        if (response) {
          return response;
        }

        return fetch(event.request)
          .then(networkResponse => {

            const copy = networkResponse.clone();

            caches.open(CACHE_NAME)
              .then(cache => cache.put(event.request, copy));

            return networkResponse;

          });

      })
      .catch(() => caches.match("./index.html"))
  );

});
