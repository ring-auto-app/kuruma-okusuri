const CACHE_NAME = "car-nappy-v38";
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
  "./maintenance_input.html",
  "./factory_input.html",
  "./dealer_input.html",
  "./car_add.html",
  "./vehicle_info.html",
  "./vehicles.html",
  "./rental_fleet.html",
  "./rental-fleet.js",
  "./rental-fleet.js?v=20261114-v38",
  "./rental-fleet.css",
  "./rental-fleet.css?v=20261114-v38",
  "./fleet_check_sheet.html",
  "./fleet-check-sheet.js",
  "./fleet-check-sheet.js?v=20261114-v38",
  "./fleet-check-sheet.css",
  "./fleet-check-sheet.css?v=20261114-v38",
  "./fleet-check-sheet-pdf.js",
  "./fleet-check-sheet-pdf.js?v=20261114-v38",
  "./vendor/pdf-lib.min.js",
  "./car-add-date.js",
  "./common.css",
  "./app.js?v=20261113-v36",
  "./theme.js",
  "./ring-media-import.js",
  "./gemini-ocr.js",
  "./gemini-invoice-ocr.js",
  "./ring-media-import.js?v=20261113-v36",
  "./gemini-ocr.js?v=20261113-v36",
  "./gemini-invoice-ocr.js?v=20261113-v36",
  "./vendor/pdfjs/pdf.min.mjs",
  "./vendor/pdfjs/pdf.worker.min.mjs",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

// Release manifest uses LF-normalized UTF-8 (Git checkout may convert CRLF).
// Changing these files requires new hashes AND a new CACHE_NAME.
// Both bare URLs (already-open pages) and versioned URLs must contain the same release bytes.
const RELEASE_SHA256 = {
  "./fleet_check_sheet.html": "5f152eecfdde832f6d11803b4465b90dd0664ee49f7f41bf59b81444f48cd8b1",
  "./fleet-check-sheet.js": "be249a54c604743e79dac20135c993dfb09222a702c0a6aebf21eef171b11470",
  "./fleet-check-sheet.css": "28f02b775bdef1ebec4e8ba18d79d326c440ff2e3278e9164baa57e13ceaf50a",
  "./fleet-check-sheet-pdf.js": "35270399c2d15f4d1445a4581fecbadc920b4bfd15663d13a2ed496bb7947d7f",
  "./rental_fleet.html": "3d118d5235fe6f59601394b0a6872e81c9ef40f3b1ab94c969687b08fd5c66cf",
  "./rental-fleet.js": "953c7892d764ee70c36c1178aa808b4c5470cb1043db86b7edf5eefcb0e930af",
  "./rental-fleet.css": "5d2fb5e5fe56827a1bd3dd9d8d9921c85e408bd022dd8a4a72158209b241125b"
};
const PRECACHE_KEYS = PRECACHE_URLS.map(url => new URL(url, self.location.href).href);

async function fetchWithTimeout(req, ms) {
  const controller = new AbortController();
  let timer;
  try {
    return await Promise.race([
      fetch(req, { signal: controller.signal }),
      new Promise((_, reject) => {
        timer = setTimeout(() => { controller.abort(); reject(new Error('TIMEOUT')); }, ms || 8000);
      })
    ]);
  } finally { clearTimeout(timer); }
}

async function verifyReleaseResponse(url, response) {
  if (!response || !response.ok || response.type === 'opaque') throw new Error('PRECACHE_FAILED: ' + url);
  const key = './' + new URL(url, self.location.href).pathname.slice(new URL('./', self.location.href).pathname.length);
  const expected = RELEASE_SHA256[key];
  if (expected) {
    const bytes = new TextEncoder().encode((await response.clone().text()).replace(/\r\n/g, '\n'));
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    const actual = Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
    if (actual !== expected) throw new Error('RELEASE_MISMATCH: ' + key);
  }
}

async function verifyPrecache(cache) {
  for (const url of PRECACHE_URLS) await verifyReleaseResponse(url, await cache.match(url));
}

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    try {
      const cache = await caches.open(CACHE_NAME);
      for (const url of PRECACHE_URLS) {
        // Reload bypasses HTTP max-age. Bound body reading/cache.put too (not just response headers).
        const controller = new AbortController();
        let timer;
        try {
          await Promise.race([
            (async () => {
              const response = await fetch(new Request(url, { cache: 'reload', signal: controller.signal }));
              await verifyReleaseResponse(url, response);
              if (controller.signal.aborted) throw new Error('TIMEOUT');
              await cache.put(url, response);
            })(),
            new Promise((_, reject) => {
              timer = setTimeout(() => { controller.abort(); reject(new Error('PRECACHE_TIMEOUT: ' + url)); }, 15000);
            })
          ]);
        } finally { clearTimeout(timer); }
      }
      await verifyPrecache(cache);
      // Never replace a working worker until its replacement is complete.
      await self.skipWaiting();
    } catch (error) {
      await caches.delete(CACHE_NAME);
      throw error; // rejecting install keeps the current worker + cache alive
    }
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    await verifyPrecache(await caches.open(CACHE_NAME));
    const names = await caches.keys();
    await Promise.all(names.filter(name => /^car-nappy-v/.test(name) && name !== CACHE_NAME).map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  // Precached release files are immutable. Background refresh of individual shell files
  // would combine a new HTML with old JS/CSS while another worker is still installing.
  let releaseKey = PRECACHE_KEYS.includes(url.href) ? url.href : null;
  if (!releaseKey && req.mode === 'navigate') {
    const pageKey = new URL(url.pathname, url.origin).href;
    if (PRECACHE_KEYS.includes(pageKey)) releaseKey = pageKey;
  }
  if (releaseKey) {
    event.respondWith(caches.open(CACHE_NAME).then(async cache => {
      const cached = await cache.match(releaseKey);
      if (cached) return cached;
      // Cache eviction: only refill from matching release content, never from an older bundle.
      try {
        const response = await fetchWithTimeout(new Request(releaseKey, { cache: 'reload' }));
        await verifyReleaseResponse(releaseKey, response);
        await cache.put(releaseKey, response.clone());
        return response;
      } catch (_) {
        if (req.mode === 'navigate') return (await cache.match(OFFLINE_URL)) || Response.error();
        return Response.error();
      }
    }));
    return;
  }
  // Only this pinned PDF.js pair may share queryless precache entries.
  // A different version or unrelated query must never use these entries.
  const pdfBase = new URL('./vendor/pdfjs/', self.location.href);
  const pdfCanonical = url.origin === pdfBase.origin &&
    (url.pathname === pdfBase.pathname + 'pdf.min.mjs' || url.pathname === pdfBase.pathname + 'pdf.worker.min.mjs') &&
    url.searchParams.get('v') === '4.2.67' &&
    Array.from(url.searchParams.keys()).every(k => k === 'v' || k === 'ringtry');
  if (pdfCanonical) {
    const key = new URL(url.pathname, url.origin).href;
    event.respondWith(caches.open(CACHE_NAME).then(async cache => {
      const cached = await cache.match(key);
      if (cached) return cached;
      const res = await fetch(req);
      if (res && res.ok) await cache.put(key, res.clone());
      return res;
    }));
    return;
  }
  const isAppShell = url.origin === self.location.origin &&
    /\.(html|js|mjs|css|json)$/.test(url.pathname);

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
            // iOS Safari terminates the worker after respondWith unless the refresh is kept alive.
            event.waitUntil(networkUpdate);
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
