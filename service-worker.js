const CACHE_NAME = "car-nappy-v53";
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
  "./theme.js",
  "./ring-media-import.js",
  "./gemini-ocr.js",
  "./gemini-invoice-ocr.js",
  "./ring-media-import.js?v=20261114-v39",
  "./gemini-invoice-ocr.js?v=20261114-v39",
  "./vendor/pdfjs/pdf.min.mjs",
  "./vendor/pdfjs/pdf.worker.min.mjs",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./owner-platform.js",
  "./owner-platform-ui.js",
  "./vendor/qr/qrcode.js",
  "./admin_dashboard.html",
  "./biz_register.html",
  "./change_password.html",
  "./contact.html",
  "./daily_history_detail.html",
  "./dealer_admin.html",
  "./dealer_info.html",
  "./demo_preview.html",
  "./detail.html",
  "./factory_admin.html",
  "./factory_detail.html",
  "./factory_edit_detail.html",
  "./factory_info.html",
  "./factory_inspection.html",
  "./factory_search.html",
  "./faq.html",
  "./forgot_password.html",
  "./history_detail.html",
  "./manual.html",
  "./privacy.html",
  "./qr_scan.html",
  "./register.html",
  "./reset_password.html",
  "./terms.html",
  "./tokushoho.html",
  "./user_detail.html",
  "./user_fav_shops.html",
  "./user_fav_shop_edit.html",
  "./user_inspection.html",
  "./user_line_callback.html",
  "./user_login.html",
  "./user_mypage.html",
  "./user_past_vehicles.html",
  "./user_sub_invite_accept.html",
  "./vehicle_detail.html",
  "./common.css?v=20261119-v53",
  "./app.js?v=20261119-v53",
  "./owner-platform.js?v=20261119-v53",
  "./vendor/qr/qrcode.js?v=20261119-v53",
  "./owner-platform-ui.js?v=20261119-v53",
  "./gemini-ocr.js?v=20261119-v53",
  "./rental-fleet.js?v=20261119-v53"
];

// Release manifest uses LF-normalized UTF-8 (Git checkout may convert CRLF).
// Changing these files requires new hashes AND a new CACHE_NAME.
// Both bare URLs (already-open pages) and versioned URLs must contain the same release bytes.
const RELEASE_SHA256 = {
  "./inspection_user.html": "3f3af6ea7c57aa0bd8a4bd86bcb6b00649258358b8b84940ab28dd8d0d5cc106",
  "./user_inspection_history.html": "776f21d3a126318d17f05f7b5f4ae89420f1baaf557b8ccc745f06c9605b8e96",
  "./factory_edit_list.html": "0dde599919194be74976546a32fed7c2b41a151ca62e34337ff3b24aebe0d58b",
  "./factory_history.html": "ea713cc6620fb87c2a7a9c70ca856542e50f22bac2dfa4f9247d092ee3f6613e",
  "./user_history.html": "fcd6c2bc143f82633b599f7d492c789cb7006af6c4bd95a586186dc229f2edc3",
  "./index.html": "692d8994e6e185823d514ab3c84d26fd899bbe05026c38c92cf74e76daaf26d5",
  "./splash.html": "2c564632161bbdef0cce3ceb9f0d22d9acc7248783fc330ee2cd103973e7ac46",
  "./offline.html": "865459a7942cc8353df7696b019261d1d5233230b51c24d71f162be8253f3142",
  "./login.html": "c7b6b2f587889980186a7beda234f6be83b830e9c05b86a2b70f6fb3f62ea9e7",
  "./factory_home.html": "3eaf41d8b477d3d98f28b921ceb434dbc9830734e2bfcb29da985e04aec3b6bf",
  "./dealer_home.html": "8c645c479ea613569a40c7b1b8d42349e497f9780a6e27e57476675613fdc4f7",
  "./user_home.html": "ac0e2c168103571a5a353abd0a216aa63721843804cf2128039e18cba0f33f8a",
  "./maintenance_input.html": "314861ca2abe398f21f4a02c7720f07e489490836a3adc7674b231a32f22ba1a",
  "./factory_input.html": "20704d8bc0e04769c42ac37ebea1f846bc8c8562f85c6b1fb821e5e002f5697a",
  "./dealer_input.html": "ec57a3624b3d65f4f65ec32e26899bf1874cde344abab54b63636e223aa7a4bb",
  "./car_add.html": "528be252e75fd649e123338a752cdcb74fcb0c8f4868f776991582aa373c4bf7",
  "./vehicle_info.html": "ecfcfd64429fe20860bcedd81fc7fa4c997a3217a0b61db00760b6e692aadbc5",
  "./history.html": "efe0d7f8d8865fdabba54626bb185c08ba65e2ff347f996c27acd6119727f476",
  "./daily_history.html": "bcede868cca5015ffde7c4ad82dcafe9e0f6886c2442b24f33d7e752d8f7fb3f",
  "./inspection_biz.html": "2e70ca0d82981f0a33717715e1777f061d220c3051bf540eb23007a2fa4dbe68",
  "./vehicles.html": "36567acf01f721c16c3158b8dfd380df9d4c6ff26e224f20b5770b2c7ad6132c",
  "./rental_fleet.html": "1435146f5642dd36500eb9dbe968c04592eff4666cea60573dc6f389924d8f35",
  "./rental-fleet.js": "a75648a7ce1b84488aaa310b3f364c150b5450797bf868c40cc119f03d98cd9b",
  "./rental-fleet.css": "6268621eb71fe95d829909107753d901b53f8bee3600362dc0b244eb0ec2d847",
  "./fleet_check_sheet.html": "945fbb19359e6eaede0e52c26eee7164cd85e8f0783709ff0f8e16456aa1e63d",
  "./fleet-check-sheet.js": "c56233eb0643972da7fce628a6661d0d25d8e37889206e4ae249400eb89da14e",
  "./fleet-check-sheet.css": "2949529d5139af1eaf96e233b6b37aca030134b48598045ec54f078fb0a03f5c",
  "./fleet-check-sheet-pdf.js": "e69861c25682712c47fdf743d027fa1a8ee98f9fddbf5b86bd5e087c4dffa88e",
  "./vendor/pdf-lib.min.js": "0f9a5cad07941f0826586c94e089d89b918c46e5c17cf2d5a3c6f666e3bc694f",
  "./car-add-date.js": "4458b2a5c43b9e5738b06441e53bdc187ad1cc4a666709fc98e980193dac8257",
  "./common.css": "80bb9c6e1df1fde1def1dc0a8e80ea84850e3f817244485bbb4fcdc3a46efc98",
  "./app.js": "1f2f09fbd290a7b70508152612f904a9e158c12151e87e288f5ae44386d351e5",
  "./theme.js": "82e4179bd9d4dd92ecbe26acfb589a5d9f48d9c9d93a4a1842bff0c6843cdd01",
  "./ring-media-import.js": "640d189cd264ac5b9060719f6eda573680b8c65cd6344e44c158e1aec89dbbea",
  "./gemini-ocr.js": "bdf43f4fd276473dc69b106a7da67103167b4c315ff21317e906574a109cb113",
  "./gemini-invoice-ocr.js": "96b4d24691a84ffd58046fbf7270e0107cfd4eb27debb9a0f33c9f98f32b03d7",
  "./vendor/pdfjs/pdf.min.mjs": "410b149eae133506e6c3f2764e95d5d444fa706bbc450d6e63060ea7605c707d",
  "./vendor/pdfjs/pdf.worker.min.mjs": "094d2c8f779f6bc19d81bca80711748a63b4a95ffa79a5b67f9fcc6cd8c85e3b",
  "./owner-platform.js": "f4d3316cdfe72ea0ed6e753ad74f758eea10a2e4afdde81f48a5cff96fecbd29",
  "./owner-platform-ui.js": "4cab9d72edf9d35b875b4b5d2b0a2b169a0729b0be1da304fa97f37e233f2d51",
  "./vendor/qr/qrcode.js": "18ae399f81182bc9de916e9c77b195df20cc58d6f2d55a62b085a299f1bf1780",
  "./admin_dashboard.html": "40da106be1fe187802fd0556e07c3ca01222d491fc569f70408520d110686a13",
  "./biz_register.html": "dc9f7497f79a03e02eed741d93ef6b851a96421a61103f85d38929fc6b83cfcb",
  "./change_password.html": "34f27fe23e695ac987e6312f7c6337d83d1c235cd47db163b7eee5ec09f72cb0",
  "./contact.html": "368fffbfa38a74548044a596386f9368f0ea9438931dc72a95c5a45225dbe2d1",
  "./daily_history_detail.html": "5b9321564050f30e79b08a5c6d4bb347417d1f65c5822bdcffb12df8e00a4409",
  "./dealer_admin.html": "00aa4f3cfb07b60f8dc032ba02c46a5e991138c85c9e37a28b47d5f4a1a361fc",
  "./dealer_info.html": "c1aea158536f2d06d06e71047d6e0b12656fa5c6fbddbcba3aa84f9e44a67cfa",
  "./demo_preview.html": "22c7ed0aa55c620c8e49b77d0cdb1bc4f0755512f4633e9ca68f3f0879b29ba6",
  "./detail.html": "d1429ce62c20fdb34e296cfcdb66de4b2edfd4349667051d9dcc57864e90b4b2",
  "./factory_admin.html": "0fbbe4f85729fd5c59e300d0a6ec7de3d0faf2d1096cde3d67bf0a51bdc70d53",
  "./factory_detail.html": "a9b6e6a494a761b2f7b93fbae017745fe1d6dbc704c91eafcc4eb08a8a21dbf5",
  "./factory_edit_detail.html": "60752eac35d87c5e8a6fd207045dab5322cf0eacb3d272ddd848145fc1c1e0af",
  "./factory_info.html": "26edb4b484b5c5a9365398ebfe4fb4cb5f7ab7c52481e36417f2db5bc4c154e0",
  "./factory_inspection.html": "22a077925906d3f189702689063ab262db6c6acc88f5f856ab7a2d938df6ffd0",
  "./factory_search.html": "03eecb6aae62d796003898af47ab67cf13ed448872fc440e7b229732cc106f8a",
  "./faq.html": "2a66f4ed31c9f15f0ae305550f112b4ce391100c7866d27a1623a718d519fe38",
  "./forgot_password.html": "156262f76868f16691c6d343c8ef622f68c66141f4b0ea0bbc1ebce18ec4781e",
  "./history_detail.html": "70db6bd71fa47484b561a8bf7506d68c2e1d4d60fd7956a2b04ea6eded97c3f8",
  "./manual.html": "a227cb3c1365acaa17ed2cb600c05ca3b0aa90795d4463a75f93dff27f154b39",
  "./privacy.html": "0760ce2e26cf3bd00b8c7977c7b76879a79c4ff2e9f52feff4eda91f6792b5b7",
  "./qr_scan.html": "a104a8f28e5c6e34b0b709cd2854746ad7736b0747a7d46a5137472213c59787",
  "./register.html": "5801144f25fc2bfe28139aa8477cafcdf3d792368876e6ee1c95ce52c7bdebf2",
  "./reset_password.html": "900a5e0eb76441861055a5cdd927efe47d449d97b8115ddbf97b24008a2e1cbc",
  "./terms.html": "fa56b057ed56f6069e2ad6d00bc1e63bc325dc1fab99836e280e5d53c2f47d4c",
  "./tokushoho.html": "76a36fefbce154fdad16f67ff21a69e807d01a653ed59bc7880439cc3daa8f53",
  "./user_detail.html": "b1a37c99b28af0384668f0a50c1296a2e41cffaf4efa9d70088f74a00ffd49e8",
  "./user_fav_shops.html": "fd46a041c50748ea43f37f6f377b199e18d65727b9594af92fae7c8d1c562cc0",
  "./user_fav_shop_edit.html": "ac89863d2757ed2d26996197537d94bffc842237688dc53d07298c3e1180aceb",
  "./user_inspection.html": "f558c677a8c8347f3f2c3606e7754e7c0154a5523bfa96ebb8c414f2a9f51187",
  "./user_line_callback.html": "d4097d3e9209455477be6ac25501bfdafec82bbb5d08bc777e91f746ed0b41a2",
  "./user_login.html": "565126a078a1dc55723eba50c097af2159f2af2e35351d7269a8ca4624f26013",
  "./user_mypage.html": "900cb2c2210c091afd9e5db8394f26a6ed5d6a837e461e02bc38d319d600bbaf",
  "./user_past_vehicles.html": "2babb542cc46de053212f2ef8f54864eef4a4bbaa3b5786998e2a0fa25a51bde",
  "./user_sub_invite_accept.html": "3c57239162076fd877e488cd8e0404168ca960073a737e0bc6053b543f0a522c",
  "./vehicle_detail.html": "7070eaf288f548d9ac6245e44b86153f8bcc19d558e34af34933b16e24a27017"
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
