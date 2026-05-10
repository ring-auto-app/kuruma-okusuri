const CACHE_NAME = "car-nappy-v5";

const PRECACHE_URLS = [
  "./",
  "./index.html",
  "./common.css",
  "./app.js",
  "./theme.js",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

self.addEventListener("install", event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE_URLS))
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
  const isAppShell = url.origin === location.origin &&
    /\.(html|js|css|json)$/.test(url.pathname);

  if (isAppShell) {
    // HTML/JS/CSS/JSON: network-first（常に最新コードを取得、失敗時キャッシュ）
    event.respondWith(
      fetch(req)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req))
    );
  } else {
    // 画像など静的リソース: cache-first
    event.respondWith(
      caches.match(req).then(cached => cached || fetch(req))
    );
  }
});
