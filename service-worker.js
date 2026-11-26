const CACHE_NAME = "car-nappy-v67";
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
  "./rental-fleet.v61.js",
  "./rental-fleet.css",
  "./fleet_check_sheet.html",
  "./fleet-check-sheet.js",
  "./fleet-check-sheet.css",
  "./fleet-check-sheet-pdf.js",
  "./vendor/pdf-lib.min.js",
  "./car-add-date.js",
  "./common.css",
  "./app.js",
  "./ring-sync-store.js",
  "./ring-sync-engine.js",
  "./theme.js",
  "./ring-media-import.js",
  "./gemini-ocr.js",
  "./gemini-invoice-ocr.js",
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
  "./history_visibility_settings.html",
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
  "./staff_admin.js",
  "./vin-search.js",
  "./account_withdraw.html",
  "./ring-history-list.js",
  "./ring-browse-warmup.js",
  "./ring-browse-coordinator.js",
  "./ring-history-list-test.html",
  "./ring-sync-test.html",
  "./common.css?v=20261126-v67",
  "./app.js?v=20261126-v67",
  "./ring-browse-coordinator.js?v=20261126-v67",
  "./theme.js?v=20261126-v67",
  "./owner-platform.js?v=20261126-v67",
  "./vendor/qr/qrcode.js?v=20261126-v67",
  "./owner-platform-ui.js?v=20261126-v67",
  "./gemini-ocr.js?v=20261126-v67",
  "./ring-media-import.js?v=20261126-v67",
  "./staff_admin.js?v=20261126-v67",
  "./ring-history-list.js?v=20261126-v67",
  "./gemini-invoice-ocr.js?v=20261126-v67",
  "./vin-search.js?v=20261126-v67",
  "./fleet-check-sheet.css?v=20261126-v67",
  "./fleet-check-sheet.js?v=20261126-v67",
  "./fleet-check-sheet-pdf.js?v=20261126-v67",
  "./rental-fleet.css?v=20261126-v67",
  "./rental-fleet.v61.js?v=20261126-v67",
  "./ring-browse-warmup.js?v=20261126-v67"
];

// Hash the exact response bytes. The release manifest admits only the approved LF/CRLF byte sequences.
// Changing these files requires new hashes AND a new CACHE_NAME.
// Both bare URLs (already-open pages) and versioned URLs must contain the same release bytes.
const RELEASE_SHA256 = {
  "./fleet-check-sheet.css": [
    "2949529d5139af1eaf96e233b6b37aca030134b48598045ec54f078fb0a03f5c",
    "bb78956fa062dd763693534c4bece1c4625cd5cd4a4596366632bfcb8f216cc0"
  ],
  "./register.html": [
    "75a85d9ede3894383bd4f4d01306993ff13a0bd18c0448d4f0a235b3ff7fb2b6"
  ],
  "./forgot_password.html": [
    "3793999486045e390f63927b122a90f5f00bc3b4b79fd1d78f8e4c397621e40f"
  ],
  "./app.js": [
    "2c2da428913c4b8c9b170ebf63d47b8196a5018c968865b41ee9651d405599d7",
    "8d700504edb98d99bf08a47c2d8153467436b68e87be23375a70c70c31590c97"
  ],
  "./gemini-invoice-ocr.js": [
    "96b4d24691a84ffd58046fbf7270e0107cfd4eb27debb9a0f33c9f98f32b03d7",
    "6cc98c30bea1ee53e9d437de91aa8688e841fa124aff999d8b390425759b58e5"
  ],
  "./user_inspection_history.html": [
    "79e1adfda25e0c1340bd331039d3711aec2ccf97e6ebd2697f2b9448c1a21326"
  ],
  "./account_withdraw.html": [
    "593a3362225829f1c351c80ddf6a14cf9e68d83eeb410463d4dfd6b843a79645"
  ],
  "./history_visibility_settings.html": [
    "e83993d433c17219fa5182c176664db214723b012c103d6e33ec78dbabe02e1d"
  ],
  "./factory_info.html": [
    "0696598369c41ac61dcb140372b3f8926df06678f2e5ab90ddc15b0443e0e065"
  ],
  "./user_history.html": [
    "64921033a89d74f73c2885e6d677f339067768cdb0a96f8a3137ff7f4640dfcb",
    "872fa3e0515ee70c309f114ca3e580792e0d06fedc14e3d2d89345bdb08cc68e"
  ],
  "./manual.html": [
    "716d2793983c420923504218f69d9ed547585b68f183627ce111baecf91d3611",
    "312c5b5c3926059a271ffdc571bf9cf3d77abbcb9ab876a932811ed404e28f5a"
  ],
  "./fleet-check-sheet.js": [
    "c56233eb0643972da7fce628a6661d0d25d8e37889206e4ae249400eb89da14e",
    "8065ae330fbefbb4060175650fa6945ead0597c3c8d8d5f928c04de5fa173493"
  ],
  "./factory_input.html": [
    "218ed65ead524dc2ab65cff99eab673487026701769576c7b07f95c606ed6fa1"
  ],
  "./owner-platform.js": [
    "8e43c410be8ffd34dd1a593521802d940f9f436cdef5bd98238d8a4de90ea71c",
    "166bb1a44fb4589db4a63186a360c3a2ad78fd454dbd11755330e09eb47d9bbc"
  ],
  "./vendor/pdfjs/pdf.min.mjs": [
    "410b149eae133506e6c3f2764e95d5d444fa706bbc450d6e63060ea7605c707d",
    "11c8ed9baf31ed90572cffefecf09fca3f6a6a4e17eb5b5fc12a0b4d964a8376"
  ],
  "./fleet-check-sheet-pdf.js": [
    "e69861c25682712c47fdf743d027fa1a8ee98f9fddbf5b86bd5e087c4dffa88e",
    "3a14b1a58ecec3d0cd78bf27d5f4dce76c45b2716e4cc4595090e23c46edc236"
  ],
  "./factory_admin.html": [
    "df2f0f8ae75baf05a0c320d0acc14707d7b8832103b1a4187ec868f1e3029de5"
  ],
  "./maintenance_input.html": [
    "468a75f4a79c0a77d4726e5fbf8b9361d8109f585331fc78617a0b9aed899c0a"
  ],
  "./dealer_home.html": [
    "b048b4759f520b1b01e6ba9b809e9612389d74c58d9fb915ff45cfed38b40417"
  ],
  "./contact.html": [
    "6043099135f0cde11360ad3bb376f7e624f8bf285665338f3399e2f4c47d468a"
  ],
  "./dealer_info.html": [
    "c1aea158536f2d06d06e71047d6e0b12656fa5c6fbddbcba3aa84f9e44a67cfa",
    "8f73ad0a61afa42aa4b0c62953ca5ce88dd4f208c3f40c305cdbbf5af2227036"
  ],
  "./qr_scan.html": [
    "0eb6bf83dc064e7816b616f133faca14314bdc609adab97d1df4a31c53a65369"
  ],
  "./user_login.html": [
    "565126a078a1dc55723eba50c097af2159f2af2e35351d7269a8ca4624f26013",
    "4da05a5938a61de9021337f35748e2d9f14747dcd35decaec752494f437d0104"
  ],
  "./offline.html": [
    "baccc2f91b7d1bd8ada37052a8312ca2209a7265282cae94c6b7ecf285e20354",
    "fe53de3736252570da880cf6a7ebaa72da05592fc140dfce16960961853c596d"
  ],
  "./tokushoho.html": [
    "7e8c4cf6b5077d9746d338a4e2e768b87e37656ee251849fd179f2cf1ec4dadf",
    "e615d4da218f41ed3bb810d601f407edc89fda58d995e1a94a24e06ac5063cb9"
  ],
  "./admin_dashboard.html": [
    "f9b187c2b00c35e2c27a8569cc12a37b7321364974a1c098e7835e6bd05ba8bb"
  ],
  "./inspection_user.html": [
    "cc1755167fbc1f53c38da2b997cf38a764f5c32376e25130f6cb707c9d3bb1d7"
  ],
  "./detail.html": [
    "fbc98089d2636d3a3819d8af6d690e63e9bd9d20f3c372429fc0bdd7042b9889"
  ],
  "./vendor/pdfjs/pdf.worker.min.mjs": [
    "094d2c8f779f6bc19d81bca80711748a63b4a95ffa79a5b67f9fcc6cd8c85e3b",
    "b6bc13c22ccd75825e883c049607e658f9a8c21815d167e5c5dca7f1eeb38f50"
  ],
  "./splash.html": [
    "8f3d8abad6e206949ac0a5959c1574a70db4f2361f6a0c1494d1944f6878aba0"
  ],
  "./vendor/pdf-lib.min.js": [
    "0f9a5cad07941f0826586c94e089d89b918c46e5c17cf2d5a3c6f666e3bc694f",
    "e407401e1d27c95af336de6c0583ec048b7decf4b9c3d60f14de0f7b5b0e4ecc"
  ],
  "./change_password.html": [
    "accab1b3787fa00daa5dd626081af6a84e436ec2337b6eefda4f8ad725581f39"
  ],
  "./car-add-date.js": [
    "4458b2a5c43b9e5738b06441e53bdc187ad1cc4a666709fc98e980193dac8257",
    "75a157f6b047cdcf356d5381aa9eb56a64b7cae63d095b37f4c4a061e19db1af"
  ],
  "./gemini-ocr.js": [
    "bdf43f4fd276473dc69b106a7da67103167b4c315ff21317e906574a109cb113",
    "9ffd58d7d2dc31140cf93f26285c1af64f6f3ddc9f7c4b4bd9b07217f765e776"
  ],
  "./user_sub_invite_accept.html": [
    "21541072586d7f4196b10da52c18c5e7a1fbda77607088cd4bce55cd08358407"
  ],
  "./user_home.html": [
    "7ea494993550992dc60a11702a0a9a59da872e099b4f6ee23a5e6fb894f36f47",
    "a5acbf7ef76c1f40cb5b9286d5b997f7e760bb65c797b7971e3d3cb9ae92a323"
  ],
  "./rental-fleet.v61.js": [
    "c589e6dec279c45b5dc1ffb3967161d2e305e2ab5faf424900f645ce14fc34ff",
    "21b4ea3db51ca854031f8404be253982c1de4ee0cef6531112d20c49f01c3a00"
  ],
  "./factory_detail.html": [
    "028fa1d8f1e8e1d61008eb48c613b0c4af5acd990d366444fe56a848b7282e7d"
  ],
  "./login.html": [
    "ef0c276a163330bf05ed213770df5a9da259a2a1199713cc2cf1ac9f1935256a"
  ],
  "./daily_history.html": [
    "f29a753ea3b6d5551f694c8a9f711be30f4158447d412d74afdb4d074c75ed1b"
  ],
  "./theme.js": [
    "ccab0f51499785fa4483a7c42f1b44073cc5c83a0f3159985f972e5234a40034",
    "85072a759fa34010adeb4e210e879c707bd334bca86adeb81351190ca6c26e7c"
  ],
  "./demo_preview.html": [
    "f7f658a6166a0cdd14d480ac14433b823c848eda4646207d00f3187a787afe8e",
    "a85375ece04170c55824e50227f80920f758fd28fbef1e50753034a7d7424933"
  ],
  "./ring-media-import.js": [
    "640d189cd264ac5b9060719f6eda573680b8c65cd6344e44c158e1aec89dbbea",
    "7d6821ff2bb52c70e2ca52ef2254e297300e3418f1aec160e98cc708d39308a8"
  ],
  "./vehicle_info.html": [
    "9a8bfe708c757ce26e43ce66f36d192cb1dba03f067b5d873879527140815b02"
  ],
  "./rental-fleet.css": [
    "2cb4f02551eaa74d340750f0b74ec95ccdb500198198868ae89f2113bda12e77",
    "0ef166139509aba1b3a28876141449c317541a932858e0434f44e7687d10118b"
  ],
  "./common.css": [
    "bab51b66553b18fc0391dd8358feea5f5d8bf4c7571827cfb18121e4eeccd7b9",
    "8f356f722fbeaf4b694f556e59c277cd8ee379de346cdfc36919c3dcd14f9d40"
  ],
  "./factory_search.html": [
    "8468d8e1edeb1a2433079771a39ef044ba68260548faa9d0b373c426a439a2ef"
  ],
  "./factory_history.html": [
    "a8e721a5321a3e22996c291f287fde4dffcd8effd9694f5a883ffdb1cf1b578e"
  ],
  "./ring-browse-coordinator.js": [
    "2cad0a8a10e2ada17633db94f6c50238c0765a4c3b275f834f03684d2a700dcc",
    "cb5a79505238cfa073172c3e5ae997bb10c4855b77ea0080605716ab30f39c5b"
  ],
  "./factory_inspection.html": [
    "22a077925906d3f189702689063ab262db6c6acc88f5f856ab7a2d938df6ffd0",
    "1a57266ceed3af97ed1ac3e6862e2b11cc34d4dc4ba1edba1a768caee9bb4ff9"
  ],
  "./owner-platform-ui.js": [
    "63225f64d2ab56d34a4dc8816ab5dab24218e7bca9141ac3f77ced2224b899f2",
    "f2cc4d123591c31d00659cde38ea48a8d459e3a4250fbc3b0caa4d0786b55689"
  ],
  "./fleet_check_sheet.html": [
    "bc3085ade4853c9527067a1502335559bba3e38c6bcc421d7788424c99993166",
    "903abe69f8720b9b1e77c89b41db8bcb722d855243bbe4c56bdcca2e885e9069"
  ],
  "./reset_password.html": [
    "8e6f106bd70b8ef99c33f8bf3402038509b3df2bf09b998b02c635994d3508c3"
  ],
  "./terms.html": [
    "66e2a4c81a78089e3bf455010cc9c3baa7c0ccd88c0c3dfb41fe9fde17f0aad8",
    "b234bbe8ce2c61fe28e322439c39bcec2d6639517f44fbabc177d3ab9019e2e6"
  ],
  "./daily_history_detail.html": [
    "8e9d7be8ffc5f78fa108adbafe3bdc490abc9b7525d8e7a924eb4d9cdaf98331"
  ],
  "./privacy.html": [
    "cc7260709c717a27b663f5409d5f45aafe565779ee80e9bcbeea55cee6957008",
    "e2355c1f1ad31228ef5c0f8743f4a9e581a1cbb3dfb8a4f2ee0d89541320e562"
  ],
  "./rental-fleet.js": [
    "950abef4d428ef7117208337f79d0c90038ca18699ed5de68e47a9d0892a2037",
    "b55a2197117e38bbfbb0d041644b5ccfed60d1ce75e5d301bb7d66a9d59326d7"
  ],
  "./biz_register.html": [
    "766af1d05540f6e0e101fb18fed2eed5536dde9019c787818481d085f00c0c6f"
  ],
  "./user_fav_shop_edit.html": [
    "dca9759142b1f6e4d04cf0d34cb3dea62e59bd765a0b18538f6045381235911a"
  ],
  "./staff_admin.js": [
    "050735c31339e28d0e2da85fbc5be1f155785453c1dd04a176c2d960f0c7fcc3",
    "d2a67581dbdbb291e68e0bc6581941c95b666c84863097c9b449c9324ea4bd80"
  ],
  "./factory_home.html": [
    "8136570c1ca377590dddf091309d4903562ea9540c32097726c3c1fbe7c5d4b2"
  ],
  "./ring-history-list.js": [
    "8b3b02b51dc314cddb9ddee24549a6582e98ef18df14c39094e7f36acc5f2b01",
    "166bf4ec2a0ae015fa7dc597c804cdd877cf1f1e82e74721aeb261c19b58d018"
  ],
  "./rental_fleet.html": [
    "39168856089bf47bb181f88ae07eda7d89e433a3a6c6bc65b8e54a69957b1276"
  ],
  "./faq.html": [
    "c059474f84d2678238afe3cbde772f0bef8949239a808fecf0d1ac75665315cc",
    "2fd5012c2dc359162e886b8366fb855d338121c0a360ea6082691012c155b9d8"
  ],
  "./ring-sync-engine.js": [
    "27321e158cad0aa7829623b090aaee4ea95521bcb773250a933168dc79ff18fc",
    "c1c534bdb93d6389fc2367e3718b6beadb38696eceb952918e6acbcd5b1dea0b"
  ],
  "./vehicle_detail.html": [
    "1bc6ed0500b503834e35033f1b37dda490792762f683c1604bf6540a96733f6b"
  ],
  "./history_detail.html": [
    "3aaf666ad4ac24e5b7a7b3cb03ae6e8297be4f6fc6933be844810ddf214549a7"
  ],
  "./factory_edit_list.html": [
    "e7f4298b54b087c6e494c9c16831283caa3a4482473471c0816b3bfabd368b72",
    "f4705f92017a83f8f08cbe0f428ad0e472bdee999bad7730cc47c7d87d91ae5e"
  ],
  "./inspection_biz.html": [
    "e288ee1627239cdbf0ded75dc90b8f6e2a24baa1ff9bfee9709460d643791e69"
  ],
  "./user_detail.html": [
    "17b8952db4b1e443369988c39ae8233019d532ff52ca83de624817152583fd47"
  ],
  "./user_past_vehicles.html": [
    "4906833ce348f3d5aa9243b63bb7555a6020cd4de410be8511dbb9bd35cb79d2"
  ],
  "./car_add.html": [
    "85396ebabe64d328c33f244f43f0195aa87f2113a7c0e76f50afec3439844969"
  ],
  "./factory_edit_detail.html": [
    "249ae76a61571a74bb1a514b2259c970123ad0f626071093c14c73da57176612"
  ],
  "./user_mypage.html": [
    "f8c802b6301e4268349772bb0eca62d5c9b48ff4306542bc43cc3fd9c759017f"
  ],
  "./ring-sync-store.js": [
    "f8e0d9f2f8ae35e7661a9072acfd354a565b6cc7e42981343b625d411c591d67",
    "f16c1ab5c32780e2002897e2dc031bcdfc3c47e82935939cf57af3bc5bc75521"
  ],
  "./vin-search.js": [
    "9080f6763a29c15f3dcc102df07b185b074babfbbba180348a6bab14b75c8c05",
    "2818fc73715585324cca43bda8dec6745a962b4200ce57115a08ecb2a13a1d71"
  ],
  "./history.html": [
    "4dac612378edf013d8bbeeea11610ea1e27bbfc14facb1ed4d5cfb13c8b4d789",
    "c2bd11e736e455d21a79e04694956a7c26e3f91bf839e5b3f9018e713c72e615"
  ],
  "./dealer_input.html": [
    "b5f14887b62c6f0c40dcb42e6b0a0f8e2390640e5297299743ca5eb54534a4fe"
  ],
  "./ring-browse-warmup.js": [
    "6c09d98e26d5be0ebe32d29db92a32ee83311b64958b421c63085c81233dd67b",
    "0141bafa056090015c068f3aa076d5c7289039a5a04692669e5fa6a97aa75f31"
  ],
  "./dealer_admin.html": [
    "311adbba990262f48472191c225f03dcd125a8c1a301a8e230eeb44c5860b455"
  ],
  "./user_fav_shops.html": [
    "ff56c5d197eab1f7f02607181d5f32f59d344416e710a9d902d9d7366d91f8e4"
  ],
  "./user_line_callback.html": [
    "d4097d3e9209455477be6ac25501bfdafec82bbb5d08bc777e91f746ed0b41a2",
    "85f8e7bb93f9e50c526ea06ed8ecbe7de6ea9877421935ce40ae21746e101f91"
  ],
  "./user_inspection.html": [
    "f558c677a8c8347f3f2c3606e7754e7c0154a5523bfa96ebb8c414f2a9f51187",
    "089a31ebbd1505ac14dec5655b9c7280ec49f2d1ed3d0b17abe3d1b5c5a93903"
  ],
  "./vehicles.html": [
    "164287b5993eecc2bc3b41328a0bfbcf299c688ffe54388ffc7cd75b0a2d9d09",
    "6ddb3f7efdc260dc37d7e1333f98ee045f13262b7e897690e9c11b6d2dba1632"
  ],
  "./index.html": [
    "8f159b92b084b04f212567fe1f6fb357743f0c5393edd537671b74053e6873a2"
  ],
  "./vendor/qr/qrcode.js": [
    "18ae399f81182bc9de916e9c77b195df20cc58d6f2d55a62b085a299f1bf1780",
    "4b6133cbb5a13ecdc26cfa897d0daf7bb9b08232032cdd381e82f2baf3653b5f"
  ],
  "./ring-history-list-test.html": [
    "4ac22e1981128a85602e959292ec6216f91987f0d460e49f00c2324205f27b0d",
    "dea0c89a125199b95092866d15041c38ed0c6af83366e01559645a7887480e7c"
  ],
  "./ring-sync-test.html": [
    "18b368c08b4a5df9becd89f802675405dc2a7b030fc050a8f08253eeb72176da",
    "d431e63a094196c63c63d1c1285a10114b6179cdb0481df1b900540665fca15c"
  ]
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
    const bytes = await response.clone().arrayBuffer();
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    const actual = Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
    if (!(Array.isArray(expected) ? expected.includes(actual) : actual === expected)) throw new Error('RELEASE_MISMATCH: ' + key);
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
