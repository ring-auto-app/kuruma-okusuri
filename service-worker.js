const CACHE_NAME = "car-nappy-v4";

// キャッシュするファイルのリスト（現在のプロジェクト構成に完全同期）
const urlsToCache = [
  "./",
  "./index.html",
  "./login.html",
  "./factory_home.html",
  "./dealer_home.html",
  "./user_home.html",
  "./user_mypage.html",
  "./user_fav_shops.html",
  "./user_fav_shop_edit.html",
  "./change_password.html",
  "./vehicles.html",
  "./factory_info.html",
  "./terms.html",
  "./privacy.html",
  "./tokushoho.html",
  "./contact.html",
  "./manual.html",
  "./faq.html",
  "./common.css",
  "./app.js",
  "./theme.js",
  "./ads/ring-ads.css",
  "./ads/ads.js",
  "./ads/ad_recruit.html",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

// インストール処理：ファイルをキャッシュに保存
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(urlsToCache);
    })
  );
});

// フェッチ処理：オフライン時にキャッシュから読み込む
self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      // キャッシュがあればそれを返し、なければネットワークへ取りに行く
      return response || fetch(event.request);
    })
  );
});

// アクティベート処理：古いキャッシュを削除
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});