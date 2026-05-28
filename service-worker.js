const CACHE_NAME = "car-nappy-v22";
const OFFLINE_URL = "./offline.html";

const PRECACHE_URLS = [
  "./",
  "./index.html",
  "./splash.html",
  "./offline.html",
  "./login.html",
  "./factory_home.html",
  "./dealer_home.html",
  "./user_home.html",
  "./factory_input.html",
  "./dealer_input.html",
  "./car_add.html",
  "./common.css",
  "./app.js?v=20260528-v22",
  "./theme.js",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

function fetchWithTimeout(req, ms) {
  const timeout = ms || 8000;
  return Promise.race([
    fetch(req),
    new Promise(function (_, reject) {
      setTimeout(function () { reject(new Error("TIMEOUT")); }, timeout);
    })
  ]);
}

self.addEventListener("install", event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(async function (cache) {
      for (const url of PRECACHE_URLS) {
        try {
          await cache.add(url);
        } catch (e) { /* H-05: 1件失敗でも他を温存 */ }
      }
    })
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(names => Promise.all(
        names.filter(name => name !== CACHE_NAME).map(name => caches.delete(name))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  const isAppShell = url.origin === self.location.origin &&
    /\.(html|js|css|json)$/.test(url.pathname);

  if (isAppShell) {
    event.respondWith(
      caches.open(CACHE_NAME).then(function (cache) {
        return cache.match(req).then(function (cached) {
          var networkUpdate = fetchWithTimeout(req, req.mode === "navigate" ? 5000 : 8000)
            .then(function (res) {
              if (res && res.ok) {
                return cache.put(req, res.clone()).then(function () { return res; });
              }
              return res;
            })
            .catch(function () { return null; });

          if (cached) {
            networkUpdate.catch(function () {});
            return cached;
          }

          return networkUpdate.then(function (res) {
            if (res) return res;
            if (req.mode === "navigate") {
              return cache.match(OFFLINE_URL);
            }
            throw new Error("offline");
          });
        });
      })
    );
    return;
  }

  event.respondWith(
    caches.match(req).then(function (cached) { return cached || fetch(req); })
  );
});
