const CACHE_NAME = "kemp-scanner-v1";

const FILES_TO_CACHE = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./manifest.json"
];

self.addEventListener("install", event => {

  event.waitUntil(

    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(FILES_TO_CACHE))
      .then(() => self.skipWaiting())

  );

});

self.addEventListener("activate", event => {

  event.waitUntil(

    caches.keys().then(keys => {

      return Promise.all(

        keys.map(key => {

          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }

        })

      );

    }).then(() => self.clients.claim())

  );

});

self.addEventListener("fetch", event => {

  if (event.request.method !== "GET") {
    return;
  }

  event.respondWith(

    caches.match(event.request)

      .then(cachedResponse => {

        if (cachedResponse) {
          return cachedResponse;
        }

        return fetch(event.request)

          .then(networkResponse => {

            // Huwag i-cache ang external requests
            if (
              event.request.url.startsWith(self.location.origin)
            ) {

              const copy = networkResponse.clone();

              caches.open(CACHE_NAME)
                .then(cache => {

                  cache.put(event.request, copy);

                });

            }

            return networkResponse;

          });

      })

      .catch(() => {

        return caches.match("./index.html");

      })

  );

});
