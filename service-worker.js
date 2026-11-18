const CACHE_NAME = "car-nappy-v51";
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
  "./inspection_user.html",
  "./user_inspection_history.html",
  "./vehicles.html",
  "./factory_edit_list.html",
  "./factory_history.html",
  "./user_history.html",
  "./rental_fleet.html",
  "./rental-fleet.js",
  "./rental-fleet.js?v=20261118-v51",
  "./rental-fleet.css",
  "./rental-fleet.css?v=20261118-v51",
  "./fleet_check_sheet.html",
  "./fleet-check-sheet.js",
  "./fleet-check-sheet.js?v=20261118-v50",
  "./fleet-check-sheet.css",
  "./fleet-check-sheet.css?v=20261117-v49",
  "./fleet-check-sheet-pdf.js",
  "./fleet-check-sheet-pdf.js?v=20261115-v44",
  "./vendor/pdf-lib.min.js",
  "./car-add-date.js",
  "./common.css",
  "./app.js",
  "./app.js?v=20261118-v50",
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
  "./inspection_user.html": "55615441361401f2e022c52f17eb96f8dea461d7718a3b3ded7109288bab0eb4",
  "./user_inspection_history.html": "fc0f6d8f05ab6918cd09225f9650f0f309573e6a9ade7a64ebf458c3f9505725",
  "./factory_edit_list.html": "007d2a2afbdd0cd118d08589aa7f467576d092e48936b8190c742968531b2085",
  "./factory_history.html": "ca0e10bd47bbece15f764201966848c65a8bd36a88a48c6252d2036b4225d6c0",
  "./user_history.html": "2ebc69c079f492ee96554957140eb18d8f80b5651dbf8d0d184008650a3e28bb",
  "./index.html": "c458ccbf3d3315b62a5dd7023560c4736c08c58efd412cfb08add2cbf5d73b75",
  "./splash.html": "1a3c4942eae4b4a40ab78126ae9c1c6bdfa906048d9ecbd75144e3809ad3083f",
  "./offline.html": "88ec82fb54c94f65084ba04a0e637caff17c8b6b455c7d463498164c82747d61",
  "./login.html": "a4f431b04450bd39cad1951c8314c02e3d0dba791e9757f09916491403e8e69e",
  "./factory_home.html": "5119d5bba33f645b7fe0e131079f13d8fce1be06cbe927d7367482766b1f1095",
  "./dealer_home.html": "080db8fc252dcd27db0ee7c25110ab84b5da3e8b882016edd1a1c24608c1e0f4",
  "./user_home.html": "33100a41fb054442890221c56802484ab0db937c33e20a3881e0e2c12bc56858",
  "./maintenance_input.html": "678fd2c3a6623f2ad9cf99e7604b8eaa694c9493c4d850e4f7690c350f4d560d",
  "./factory_input.html": "85b338de2eef5dfb5daae603e235c27a5ba5ddf703aed55bad4cabc5f59c29b8",
  "./dealer_input.html": "4a3443f96a9a0f542e84494fa5a9a1c8e70dc9f29384f548ff61ccc7d0cb66d0",
  "./car_add.html": "bd7f48c7cb6725d5d2d03f92a9ea445cc09c1e4e9440ba7913f6522784ae0231",
  "./vehicle_info.html": "a65ddc3d7fd8fb8c30903c8e8699ead2ed4f7d923c7e8049838b896d3a484bb7",
  "./history.html": "269af09c35a2aaa04c2117c8b448aef2bb4bf49e1a75a7d1a58091f1876a4cb7",
  "./daily_history.html": "2c54c4d37e6460c196321b1f62cf41fbf67667abe231bc2c1a0f737d85382e36",
  "./inspection_biz.html": "e915bd7580b04074c9ac64ed2518dcd1f4bf124dd54040ba0f09b8f8fd4fc852",
  "./vehicles.html": "0ed567ccde92487e7a246ade922a5dbdb67a8d2700b0ce63029187742991f053",
  "./rental_fleet.html": "f6d0ecfe225031c666a585f33d6dd34189719e5f2ea3c7de173fb375fe80da4a",
  "./rental-fleet.js": "d6de699adf1c6f69835abf64f3292ad609b32d5c5d31d01d3ae4ac6f492f4b97",
  "./rental-fleet.css": "6268621eb71fe95d829909107753d901b53f8bee3600362dc0b244eb0ec2d847",
  "./fleet_check_sheet.html": "a3fc24b865dcb8849745227b7b3e4b6022ee610cf7277cf60a7ff2811e36a126",
  "./fleet-check-sheet.js": "c56233eb0643972da7fce628a6661d0d25d8e37889206e4ae249400eb89da14e",
  "./fleet-check-sheet.css": "2949529d5139af1eaf96e233b6b37aca030134b48598045ec54f078fb0a03f5c",
  "./fleet-check-sheet-pdf.js": "e69861c25682712c47fdf743d027fa1a8ee98f9fddbf5b86bd5e087c4dffa88e",
  "./vendor/pdf-lib.min.js": "0f9a5cad07941f0826586c94e089d89b918c46e5c17cf2d5a3c6f666e3bc694f",
  "./car-add-date.js": "4458b2a5c43b9e5738b06441e53bdc187ad1cc4a666709fc98e980193dac8257",
  "./common.css": "5ce7a56e31493309ef40673bd797a92ccfcf8c4ec3d89464538a6a29b4cd8650",
  "./app.js": "65ebdd2b34520a2e19dd1a1604ee62b2710711f05859644e7d28e5a002ab4857",
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
