const CACHE_NAME = "car-nappy-v42";
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
  "./history.html",
  "./daily_history.html",
  "./inspection_biz.html",
  "./vehicles.html",
  "./rental_fleet.html",
  "./rental-fleet.js",
  "./rental-fleet.js?v=20261114-v42",
  "./rental-fleet.css",
  "./rental-fleet.css?v=20261114-v42",
  "./fleet_check_sheet.html",
  "./fleet-check-sheet.js",
  "./fleet-check-sheet.js?v=20261114-v42",
  "./fleet-check-sheet.css",
  "./fleet-check-sheet.css?v=20261114-v42",
  "./fleet-check-sheet-pdf.js",
  "./fleet-check-sheet-pdf.js?v=20261114-v42",
  "./vendor/pdf-lib.min.js",
  "./car-add-date.js",
  "./common.css",
  "./app.js",
  "./app.js?v=20261114-v42",
  "./theme.js",
  "./ring-media-import.js",
  "./gemini-ocr.js",
  "./gemini-invoice-ocr.js",
  "./ring-media-import.js?v=20261114-v39",
  "./gemini-ocr.js?v=20261114-v39",
  "./gemini-invoice-ocr.js?v=20261114-v39",
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
  "./index.html": "85600a56f886855561e71ba1dd3ebe48214047db010996c5ca71771863e593d8",
  "./splash.html": "4da2152b933f4c7c66af997b2caedce92297fd581fff0ca784e6a1c0d3c2cec3",
  "./offline.html": "88ec82fb54c94f65084ba04a0e637caff17c8b6b455c7d463498164c82747d61",
  "./login.html": "6937f486e0681f1461804344e7ef55e6ad406913623de8738664282cd3b619b9",
  "./factory_home.html": "241ddd7963f864efcf4419e47b68b6c267eaa687b5027aaef435030652b72a5b",
  "./dealer_home.html": "626c814d0c6decb31965e878b39578339dbf39ae511ef0841131199035e2e95a",
  "./user_home.html": "8e8c59f2a1b9c3a82ec2a61d3c11a0cb37bdf84611978fc16a06412980e856fb",
  "./maintenance_input.html": "6c40cf90fc56c2c63cee556d029f1db89a0325392e77d0519fcf2d01943ef385",
  "./factory_input.html": "5f82bf5066a2ddf1aacd0d607a69a9aa18e927fc1c90043dcf832b5ae5063803",
  "./dealer_input.html": "983a7a12c831bea96aac86a621f0cf917c06665e5135741c27ada7dbed71ea25",
  "./car_add.html": "5f58d0336c1482d05f79a1c5958182893c6f835c1dbee9ab0a753447918d8760",
  "./vehicle_info.html": "3eed8a58d51014e2497fb05a25fa85915813d4407b6c9d8531ca876cd1555f56",
  "./history.html": "397376cf6e175cc79aae861193a440f015155e7089efdd8aa075d37e415521af",
  "./daily_history.html": "da1699ce4e1af7bffaec0aa3962297622a4d967f6033283387d5924572e55eff",
  "./inspection_biz.html": "8a3e813a390b4fc478b09af401fe7fcf6129584f005e67312aba0898d0d754ce",
  "./vehicles.html": "2eb819eb4db110f8ebb661cf6b7345d42d1da692ada6003f8cd2bdce0ccb6a36",
  "./rental_fleet.html": "81231e5b3e79d8295bcb710e976592b5377459faddb42761dea7419d7bbd2bf4",
  "./rental-fleet.js": "aa00ecc2c9eff176af5fa5b7ba5ad326ba3469632ea50523c430dcfa2622208d",
  "./rental-fleet.css": "b37c9a58ec5f11c6d391c1fbf141985e4d177a7c757240eaf3f44b1919c0f028",
  "./fleet_check_sheet.html": "10bc6a4014f68b7500cdf2cbacc657b98e1fb8ba48e3acc449c9f3e50f52c8a4",
  "./fleet-check-sheet.js": "c973186d0d9e12820649f31b5700c40c254279c72cdd25c90c60b4fe791434ca",
  "./fleet-check-sheet.css": "c9cae4aef69f928c9e248b923683ed36c240cd005e1bdd0c1fb23e7498ecaa42",
  "./fleet-check-sheet-pdf.js": "d4c0c652b5e18d8ae0d6ff43556c737d0cfde5cacea13677905f9ed1be82cfdb",
  "./vendor/pdf-lib.min.js": "0f9a5cad07941f0826586c94e089d89b918c46e5c17cf2d5a3c6f666e3bc694f",
  "./car-add-date.js": "4458b2a5c43b9e5738b06441e53bdc187ad1cc4a666709fc98e980193dac8257",
  "./common.css": "5ce7a56e31493309ef40673bd797a92ccfcf8c4ec3d89464538a6a29b4cd8650",
  "./app.js": "693fb47c894d6142d3ea7740f40f3bb4cd3eff06b66cf26bf6f82fdc25a8df88",
  "./theme.js": "82e4179bd9d4dd92ecbe26acfb589a5d9f48d9c9d93a4a1842bff0c6843cdd01",
  "./ring-media-import.js": "640d189cd264ac5b9060719f6eda573680b8c65cd6344e44c158e1aec89dbbea",
  "./gemini-ocr.js": "e7614b2fe0f8d8f3163cda5098396e34e0960035be8ba456339c1b65a2a766ad",
  "./gemini-invoice-ocr.js": "96b4d24691a84ffd58046fbf7270e0107cfd4eb27debb9a0f33c9f98f32b03d7"
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
  const key = './' + (new URL(url, self.location.href).pathname.slice(new URL('./', self.location.href).pathname.length) || 'index.html');
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
