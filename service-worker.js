var cacheName = "sgtoilet-cache-" + Date.now();
var filesToCache = [
  "/mostik-demo/",
  "/mostik-demo/main.css",
  "/mostik-demo/main.js",
  "/mostik-demo/components.css",
  "https://fonts.googleapis.com/css?family=Oswald|Roboto&display=swap"
];
self.addEventListener("install", function(e) {
  e.waitUntil(
    caches.open(cacheName).then(function(cache) {
      return cache.addAll(filesToCache);
    })
  );
});
self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(thisCacheName) {
          if (thisCacheName !== cacheName) {
            return caches.delete(thisCacheName);
          }
        })
      );
    })
  );
});
self.addEventListener("fetch", e => {
  e.respondWith(
    (async function() {
      const response = await caches.match(e.request);
      return response || fetch(e.request);
    })()
  );
});
