const CACHE_NAME = "car-nappy-v15";
const OFFLINE_URL = "./offline.html";

const PRECACHE_URLS = [
  "./",
  "./index.html",
  "./offline.html",
  "./common.css",
  "./app.js",
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
    event.respondWith((async function () {
      try {
        const res = await fetchWithTimeout(req, req.mode === "navigate" ? 5000 : 8000);
        const copy = res.clone();
        const cache = await caches.open(CACHE_NAME);
        await cache.put(req, copy);
        return res;
      } catch (e) {
        const cached = await caches.match(req);
        if (cached) return cached;
        if (req.mode === "navigate") {
          const offline = await caches.match(OFFLINE_URL);
          if (offline) return offline;
        }
        throw e;
      }
    })());
    return;
  }

  event.respondWith(
    caches.match(req).then(cached => cached || fetch(req))
  );
});
