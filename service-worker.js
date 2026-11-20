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
  "./inspection_user.html": "ea694e3282214bc355f99a600ffa7c7d670376933d0cbfa4f7b203f63d81f888",
  "./user_inspection_history.html": "8bddae814ea4bfab2b89433c8b40a125b2c875c115f1338aae080ee711438d18",
  "./factory_edit_list.html": "cfd5f2e257c6c09fb3fa34133050abba9743788a3886cc0799e7b38d3f093a58",
  "./factory_history.html": "d332493cf739f4c3317a4aa2d2fcd7410863ab3e00c6a07656b587c5f5b8c730",
  "./user_history.html": "358fe1d7bfa25a8a458cc35934be9ce46420a8fc722279f4424ead1465c1d045",
  "./index.html": "86e04f51e94102d927bdcb09318aa00282516271b6dd7178558ec92be123a989",
  "./splash.html": "9a20dc8a1fd775db351d16557cd788b1dde5a47080c80540958a4b836b6c4bed",
  "./offline.html": "865459a7942cc8353df7696b019261d1d5233230b51c24d71f162be8253f3142",
  "./login.html": "525f3d6623809b5b58615b91c2859273987bbca2208ad3a25eee93bdfa1bfe81",
  "./factory_home.html": "82b9732a36016682e3f8f026dc64bbeb09be37f692946d2a4116749ac74c883b",
  "./dealer_home.html": "53f0a6cf90ac6113b7baff135439b4378266383b78a95de1e20cb98be863bc9e",
  "./user_home.html": "917c882be1d318181938745528a4c07343c9a3a8212f2ad60c819a6e656c19c7",
  "./maintenance_input.html": "f39e3c3f1718608b78c606b1cf8fb52c3ea67df0d41e02d06ff2cc6011cd7516",
  "./factory_input.html": "973a60efaf9a7abf7916a3de842a3511609e6e9fc479f9b31e229af1ba4c78dc",
  "./dealer_input.html": "56244a4e0fa183becc4e3df140df56d30e9462309f3b9f091f36a9f930bdca80",
  "./car_add.html": "75d162a9345c899db1fa0ca5800f54c83392483e04fe0200b8d3e999e1c45365",
  "./vehicle_info.html": "c6ec45ff6b30759b2902e7decb6e49fe960aa7bbe1ae51460e39b4411718ba47",
  "./history.html": "3e475c5f0e631c9b5f325e95260bc36975153b6bf10fbaaa56f9a8877384bf6c",
  "./daily_history.html": "8e4bd5bf647ab6696e4747384a9d594261dd0b0fe5408f66636992c91ae1a09f",
  "./inspection_biz.html": "5b9a32aa728dee50f8351a0b147548dc9d85615fc8781f57c22d993f1617a7f1",
  "./vehicles.html": "8e3c4af8a3f6c12b621f629af91c08961fca647d2ebe80f9f50cb05cec03937b",
  "./rental_fleet.html": "46e2b11d59313e26a6b7939b10a614ad36fab0833ff683aa976bc411d7432116",
  "./rental-fleet.js": "859f6e309cdce9348c79ebf82c5097489fce3cbcfd687d405df833fd4ccb4d36",
  "./rental-fleet.css": "6268621eb71fe95d829909107753d901b53f8bee3600362dc0b244eb0ec2d847",
  "./fleet_check_sheet.html": "be9bae11d1651a96fcc09dc1ec26264e1ea8c6e294592bce7f1d92b2f5555025",
  "./fleet-check-sheet.js": "c56233eb0643972da7fce628a6661d0d25d8e37889206e4ae249400eb89da14e",
  "./fleet-check-sheet.css": "2949529d5139af1eaf96e233b6b37aca030134b48598045ec54f078fb0a03f5c",
  "./fleet-check-sheet-pdf.js": "e69861c25682712c47fdf743d027fa1a8ee98f9fddbf5b86bd5e087c4dffa88e",
  "./vendor/pdf-lib.min.js": "0f9a5cad07941f0826586c94e089d89b918c46e5c17cf2d5a3c6f666e3bc694f",
  "./car-add-date.js": "4458b2a5c43b9e5738b06441e53bdc187ad1cc4a666709fc98e980193dac8257",
  "./common.css": "80bb9c6e1df1fde1def1dc0a8e80ea84850e3f817244485bbb4fcdc3a46efc98",
  "./app.js": "99892f32432d8648c0c50b8d1b9881a4e3ce560871767e2ad9e581f647b11fed",
  "./theme.js": "82e4179bd9d4dd92ecbe26acfb589a5d9f48d9c9d93a4a1842bff0c6843cdd01",
  "./ring-media-import.js": "640d189cd264ac5b9060719f6eda573680b8c65cd6344e44c158e1aec89dbbea",
  "./gemini-ocr.js": "bdf43f4fd276473dc69b106a7da67103167b4c315ff21317e906574a109cb113",
  "./gemini-invoice-ocr.js": "96b4d24691a84ffd58046fbf7270e0107cfd4eb27debb9a0f33c9f98f32b03d7",
  "./vendor/pdfjs/pdf.min.mjs": "410b149eae133506e6c3f2764e95d5d444fa706bbc450d6e63060ea7605c707d",
  "./vendor/pdfjs/pdf.worker.min.mjs": "094d2c8f779f6bc19d81bca80711748a63b4a95ffa79a5b67f9fcc6cd8c85e3b",
  "./owner-platform.js": "f4d3316cdfe72ea0ed6e753ad74f758eea10a2e4afdde81f48a5cff96fecbd29",
  "./owner-platform-ui.js": "4cab9d72edf9d35b875b4b5d2b0a2b169a0729b0be1da304fa97f37e233f2d51",
  "./vendor/qr/qrcode.js": "18ae399f81182bc9de916e9c77b195df20cc58d6f2d55a62b085a299f1bf1780",
  "./admin_dashboard.html": "3e612632344c92d8548b3e6f2f883b1101cad3f7d2c7086afb52543395112122",
  "./biz_register.html": "4d53796455d93db3287948fb144d0e2398e4d7b1d56a81655ee10b248cd9ffbc",
  "./change_password.html": "407c45650f708449b438657f4690325c983799def7be34c83738a444f6832153",
  "./contact.html": "16a9af5c43c8b84b59c2ce0b021748e209745ee143b5b2df6900ddceaae332a8",
  "./daily_history_detail.html": "bf838f5e12e6ebc03ec76f9d0efd6022b30b803252f04caf6182c56426e18c7b",
  "./dealer_admin.html": "78cf9385709af9a2f7d0f6bf124dda23ecb4a8812e78d6622c80fd0fd25bf578",
  "./dealer_info.html": "c1aea158536f2d06d06e71047d6e0b12656fa5c6fbddbcba3aa84f9e44a67cfa",
  "./demo_preview.html": "22c7ed0aa55c620c8e49b77d0cdb1bc4f0755512f4633e9ca68f3f0879b29ba6",
  "./detail.html": "f4358c64a29cfff74d3dc2ad7f6ae8b0f6a65893ad107d87502e0a0593daa21a",
  "./factory_admin.html": "cf4a06bbf9033f1027076b527e3c07313c2e0b7a871de0ca927b616d976da26b",
  "./factory_detail.html": "968350576e2ffdc612cefd35fc6c49e5d250c9f120e94172ea241b745b515173",
  "./factory_edit_detail.html": "2fb683629dd7fb9e95d5ee1c66107dbd979aca37b123cb5e5db77b9f756355fc",
  "./factory_info.html": "4f2aa5682feb66244f5b0df20e28c470ce643ee36fe7a5a131c8d42f647b4109",
  "./factory_inspection.html": "22a077925906d3f189702689063ab262db6c6acc88f5f856ab7a2d938df6ffd0",
  "./factory_search.html": "0f3ea203f6e616fdcd3b2a67e37d5e0d79a5774691f8a57eac71b09106785461",
  "./faq.html": "6079cadac8faf54be857e7694332eae13a831457d7ec4dcfaf5450c73350e3e8",
  "./forgot_password.html": "7d71c605bce2228b289c1f2bc700d02af46f46a7a1fefc56eb1df0b2b33b085a",
  "./history_detail.html": "9477cf0064c77f3e7f0a6ba9f9c829eeef7cadab9a2fdf73be49f60bfcedb538",
  "./manual.html": "f248d18023ce20d7319517c8be9a9fb118db20982663648db15ae173561c42e8",
  "./privacy.html": "1859f50cad89db7958e4898d3cd2fe18e359e9da71b65c88ba59dd912b67cd9a",
  "./qr_scan.html": "9e90512fd5ea2bb4b5f02bbe78a00e011371b0dd5581cb14a0e9e9480b5d7ed0",
  "./register.html": "c73c10d2d912991e65f9fefa97a22647d8d064b9b686f8fdf06025fbc19ff166",
  "./reset_password.html": "713c3845eba3e3cd181c7fdfdb86dc2a4e805f04a9cfa6590b9d196b885d08b9",
  "./terms.html": "78dfd357d461f0f4836f495713820ae0d64de84e10d2649b40a01a004a6f5db8",
  "./tokushoho.html": "3bd218b3ac1f9a18d324ae2126bbdbdcadc9e70bbe29af008a4a0c7f24c9cb56",
  "./user_detail.html": "b601f657437de944716bc872b55f1f98fb8122964e1395000828d48d9271960d",
  "./user_fav_shops.html": "b0240c34aa3172eec8d00ed02c384b2255b1b54d253653817ce204cb938ed436",
  "./user_fav_shop_edit.html": "97df2b060d155455ab486534a8a35f3570e0b927dfdb92fc6ec81d1466a1651c",
  "./user_inspection.html": "f558c677a8c8347f3f2c3606e7754e7c0154a5523bfa96ebb8c414f2a9f51187",
  "./user_line_callback.html": "d4097d3e9209455477be6ac25501bfdafec82bbb5d08bc777e91f746ed0b41a2",
  "./user_login.html": "565126a078a1dc55723eba50c097af2159f2af2e35351d7269a8ca4624f26013",
  "./user_mypage.html": "da6564cbb873297b40a3c2c6a05bb0c8fb8756956907bf0a2201fc8de591be60",
  "./user_past_vehicles.html": "98af6febe94a7eb7057e6dece7ec260ed0015be5ae52c95b359634dc4d795dcb",
  "./user_sub_invite_accept.html": "d9100ab76a492132530ecaf0a2bbd725dc30e0761e3684f6d1c452b66ee34cc1",
  "./vehicle_detail.html": "788dd78cf6a37f466056e1e9a98dd283d34b8d137978cf8440ac3daaa6d72876"
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
