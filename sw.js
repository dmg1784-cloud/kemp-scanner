const CACHE_NAME = "kemp-scanner-v2";

const FILES_TO_CACHE = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./offline.js",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
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

    fetch(event.request)

      .then(networkResponse => {

        if (event.request.url.startsWith(self.location.origin)) {

         if (networkResponse.ok) {

    const copy = networkResponse.clone();

    caches.open(CACHE_NAME)
        .then(cache => cache.put(event.request, copy));

}

        }

        return networkResponse;

      })

      .catch(() => {

        return caches.match(event.request)
          .then(response => {

            if (response) {

              return response;

            }

            return caches.match("./index.html");

          });

      })

  );

});
