const CACHE_NAME = "car-nappy-v60";
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
  "./rental-fleet.v60.js",
  "./rental-fleet.css",
  "./fleet_check_sheet.html",
  "./fleet-check-sheet.js",
  "./fleet-check-sheet.css",
  "./fleet-check-sheet-pdf.js",
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
  "./common.css?v=20261120-v54",
  "./app.js?v=20261123-v56",
  "./owner-platform.js?v=20261120-v54",
  "./vendor/qr/qrcode.js?v=20261120-v54",
  "./owner-platform-ui.js?v=20261120-v54",
  "./gemini-ocr.js?v=20261120-v54",
  "./staff_admin.js",
  "./staff_admin.js?v=20261120-v54",
  "./vin-search.js",
  "./vin-search.js?v=20261123-v56",
  "./fleet-check-sheet.css?v=20261120-v54",
  "./fleet-check-sheet.js?v=20261120-v54",
  "./fleet-check-sheet-pdf.js?v=20261120-v54",
  "./rental-fleet.css?v=20261123-v57-fleet",
  "./account_withdraw.html"
];

// Hash the exact response bytes. The release manifest admits only the approved LF/CRLF byte sequences.
// Changing these files requires new hashes AND a new CACHE_NAME.
// Both bare URLs (already-open pages) and versioned URLs must contain the same release bytes.
const RELEASE_SHA256 = {
  "./admin_dashboard.html": [
    "582ce7b49bf52f4ea2b4a45f9b0b246fb39ccb0d0fde424fe75270b13346fe3c",
    "fe619e783e8ca57e9e8759577bbbaf3b3599ad452449a3c070ce1e83159dd627"
  ],
  "./app.js": [
    "374f93d81916767300f9053d71d5149c18490fefe27599f05e20686e78ba13e6",
    "9fde3fc738b24b5cc7fffc2418ccd373c2e8be4c5e2010207291939856a12c07"
  ],
  "./biz_register.html": [
    "e0e2579a0d8b2424a6c9009192377e42149b6bd6225e191feb48dc8f1b4718fb",
    "365bf96d9390e4a9ca57c61067847b1ea92cc70a0acb2a4270b0833177e97907"
  ],
  "./car_add.html": [
    "a70938bcb1d08a2cd6e40a8375880770425c243177c9ea924e30fc4b60271a65",
    "895bb717bcc5303a900f8f51529498537674da728f98049153a6d2912f58e027"
  ],
  "./car-add-date.js": [
    "4458b2a5c43b9e5738b06441e53bdc187ad1cc4a666709fc98e980193dac8257",
    "75a157f6b047cdcf356d5381aa9eb56a64b7cae63d095b37f4c4a061e19db1af"
  ],
  "./change_password.html": [
    "51a129dc676c7b2d3c39e6a84ee5e66c3d78546301f640ed450807b4b298840c",
    "2493c274acef4c8fb8ecd64716973dfae5c67db1803666dc8f10605adf66f6fb"
  ],
  "./common.css": [
    "c8ed0e94d5de5d9e39f382176f2fc6739c1141540748b4d253b67e409c9c3824",
    "1e742610c0a6c3fc272b05267175c709c33315e84adecedab9dec0a93892dd65"
  ],
  "./contact.html": [
    "398457e3566864d28b98c503e6c654a2aa9f40f0fab918744c29288ecfdf3ad8",
    "c87014ce295d675a4e838ec75d2e23a0a6481d68b86e0bdf4c4c7de5a6e92d88"
  ],
  "./daily_history.html": [
    "fccc43c89650ede038431ae12465626f947395e52c4fb47afdeefc4edc20e6fd",
    "b47fe05d7819a0540673d33a23644967b8dd1ac44700a8eb27ffdc91ab731db6"
  ],
  "./daily_history_detail.html": [
    "e506b56bcfa6469954901c03995f2c8cdbb26c14b32358e22a528b43f0bc1b1a",
    "db96a0ebc54e215b602086e50c7b55d38f50266be34602f8372a42d272aada86"
  ],
  "./dealer_admin.html": [
    "037d07bb48498292b00cd20cb18ff790d9ba3718cdf21f060d33c20eb93d02d7",
    "8d6a0a2694d1d01bb874d1fa7da960fd8f2913fdf059d80bbac40791136f4b79"
  ],
  "./dealer_home.html": [
    "014dfb9aa9f3e02b53451af065040abc1c0b9fba82c826298703315e7768fe7b",
    "2690dde12fd4d846687f6b8f7ad3c82f46e90cf52583a1024e5ab7dd27a85a36"
  ],
  "./dealer_info.html": [
    "c1aea158536f2d06d06e71047d6e0b12656fa5c6fbddbcba3aa84f9e44a67cfa",
    "8f73ad0a61afa42aa4b0c62953ca5ce88dd4f208c3f40c305cdbbf5af2227036"
  ],
  "./dealer_input.html": [
    "dfe7f532d6984337191090de2605f21bae3889c392bc4b22dc2445e62cb96f44",
    "2d0d5dbc2efeac66b74be9a9463634ac52e52c447ba0cb0c20a0d70fc6192e99"
  ],
  "./demo_preview.html": [
    "429bc00c8c2636df97025b6b8a0916d9ff536757b60952a237226229e41ddea5",
    "e7a617b2e2f015fdd1d34f56fa8b5367fa3473ed61709d6a2b4618367e8ffb77"
  ],
  "./detail.html": [
    "f080afa87549a8532b6436735cac07fa8140dbd5e64a39fd27bf738b159a8350",
    "40f6939e88460754f8d2bad361c44dbeb13b231825b4b4150545a750d9a44ec4"
  ],
  "./factory_admin.html": [
    "b8785e041461dacf2b14a20c822d0f7d653e8daf892546f1164418e5515eeea7",
    "a93ff4e360de64e5ae2544d0794d904bc4a32ad565dc727661af8df2bff23242"
  ],
  "./factory_detail.html": [
    "153ca0adb8a6595531e2d0ce6dd04cacf592d09876e1a0ec393388355259a693",
    "ec7e49c3d00143c9278682bf5391564abd916450d75284896c59c6ca879d2fe7"
  ],
  "./factory_edit_detail.html": [
    "b3abafc683edb358b6cee366237c30a91a20d690389ebdedcd5584915b3ffd90",
    "f9c2a01113feec2368a1f527fb2c8af2c0f451c0e95936ba5ccf92c5091f829d"
  ],
  "./factory_edit_list.html": [
    "5c3cd6ea64b5ebc37f1bd6a0fa31d111e8d2b13e75eafe8ff26c1112356f81ac",
    "b5574430d1377e20e3244afd0c972b1059317f9645e91ca24b34232e701ec858"
  ],
  "./factory_history.html": [
    "7f1bc81ed6671e3fc507de4ecc76969def2204a0f349114d1a1011b956ea4468",
    "8cdfa0245c865d2e24ffa04629402e8e3835c8b27ffb1ddcb9dfbb6a3e807e63"
  ],
  "./factory_home.html": [
    "99237c31cd92117ffac544760de2a90d3ae3339754be15402a80d966c56a5090",
    "50b7a1e456b087c2fa46cbe3bb37c4ca3f13fb9896a55210e5ce077174be1501"
  ],
  "./factory_info.html": [
    "d28afaa11d5c8d10220b4abc0ba931169cc68a4b223c721fc927d577fc146cac",
    "c467e1ec9163855ae010f440cb074a3a85ac0e15acd3ff3fb6b031ee08d2f8f7"
  ],
  "./factory_input.html": [
    "25f41db26cc7af91eb9c1ad52e25920be38115ca4150e08f9969041c82bb8416",
    "0226f747c7c8606726938a0412c08ac2d6b3a251d4c79b047b76e6c8ffe1bdfe"
  ],
  "./factory_inspection.html": [
    "22a077925906d3f189702689063ab262db6c6acc88f5f856ab7a2d938df6ffd0",
    "1a57266ceed3af97ed1ac3e6862e2b11cc34d4dc4ba1edba1a768caee9bb4ff9"
  ],
  "./factory_search.html": [
    "3a771b75728d93927839b6578de3f7a188c5ad4bd77740dfe2bfefce9cc0d954",
    "c7a839f5189452d10dee091f514cfa1a49d7a35223c150e98e2f50e04f63f281"
  ],
  "./faq.html": [
    "b280754030b7fece48f23116342a348fd0a79592f653eade7f9cceec09012f0d",
    "1c39a102e3491c55065b25c29d4fa21961ff06e3702c36b55bbd300ca1088cee"
  ],
  "./fleet_check_sheet.html": [
    "6ba8aa5b3f9dedc8add3822a12d805d7ec4d3ff6093a7445e1d37cb968a691c2",
    "2e81ed363d837e469ae86392fe4336edcb616cd4c167e5cc4def212e0cbcd901"
  ],
  "./fleet-check-sheet.css": [
    "2949529d5139af1eaf96e233b6b37aca030134b48598045ec54f078fb0a03f5c",
    "bb78956fa062dd763693534c4bece1c4625cd5cd4a4596366632bfcb8f216cc0"
  ],
  "./fleet-check-sheet.js": [
    "c56233eb0643972da7fce628a6661d0d25d8e37889206e4ae249400eb89da14e",
    "8065ae330fbefbb4060175650fa6945ead0597c3c8d8d5f928c04de5fa173493"
  ],
  "./fleet-check-sheet-pdf.js": [
    "e69861c25682712c47fdf743d027fa1a8ee98f9fddbf5b86bd5e087c4dffa88e",
    "3a14b1a58ecec3d0cd78bf27d5f4dce76c45b2716e4cc4595090e23c46edc236"
  ],
  "./forgot_password.html": [
    "00b55578a82043299d8ab4590bd9e37c15a1d1b1f86778c0ebf79308444ea935",
    "bf0189b083345001069955baa5330d66de5dd476c97ca8e3744d1031b117afde"
  ],
  "./gemini-invoice-ocr.js": [
    "96b4d24691a84ffd58046fbf7270e0107cfd4eb27debb9a0f33c9f98f32b03d7",
    "6cc98c30bea1ee53e9d437de91aa8688e841fa124aff999d8b390425759b58e5"
  ],
  "./gemini-ocr.js": [
    "bdf43f4fd276473dc69b106a7da67103167b4c315ff21317e906574a109cb113",
    "9ffd58d7d2dc31140cf93f26285c1af64f6f3ddc9f7c4b4bd9b07217f765e776"
  ],
  "./history.html": [
    "926fc9c3442a29327dd1f820d11ceede8501fa2189f98eb4e7a3c598c693a048",
    "ef71161e81b5a8e88a8a42dbafb35ad5e023dff32fdddd89a98e397a853ddbf6"
  ],
  "./history_detail.html": [
    "3e7983637d05ffc93ad27fc55892ac4d3ad72283f565af552a965ff9f07926ac",
    "180aa5ed4688eba9ce2331423e119a2fe2203abd6bbd223acadf1004dfaa239f"
  ],
  "./history_visibility_settings.html": [
    "97e56231f01de4ea98b539a84fb06f1c5589d2fca6ac7cb3f9824f560b6910d9",
    "5ed4f16f734d376673d1cd0b6df2884999cdc8a7cef316ff446eea57b6179a62"
  ],
  "./index.html": [
    "64fa545d6b04e439d71f2002da87da4387ac8b7ab3e8d48d752e96e961ee266d",
    "a75b7fbd6aa800a8fd4e7d4fdc934a0bf563018ef87a03b440b90d97343994c2"
  ],
  "./inspection_biz.html": [
    "96919b43bb459d408f7af6d0bd438b266274fc802f6d5754cc569347f78f9a0b",
    "d323d3d2ec616e13316782d454f1826338c163d0327569ec8887a7e521112e74"
  ],
  "./inspection_user.html": [
    "429cd98e62eb3deeec014858f0969590f6e673d6c343dc2f56d2210fc220a8cd",
    "c9a26d8192732f2b2ab981325745250bb9453e318ab4cd61372fc4fcc8b53c59"
  ],
  "./login.html": [
    "d0473e80d84b7e789c61f55bbc67cd1662abadc224a5b63580cef21b529c0403",
    "0755fba4fe94c0526e9f1e765384f7cd08be865a22920913ab6af9774959d417"
  ],
  "./maintenance_input.html": [
    "ee2294a94b1d3e5aacb715f83eec8fa70365e94936c5480d4a7f36ab55020e5f",
    "2275b6ec63d385b927ab04a1d36beb747a78d9c76a4aff9d5f0c40be2be040f1"
  ],
  "./manual.html": [
    "5b6aa5a26cd87076c6034cbef7810b8cfd0e2bc6ce0c42b4a49694166647f60d",
    "58d05f9dad884cf633062608c0fa4f482572003251003d7fdbfa9493b62d9492"
  ],
  "./offline.html": [
    "01ecd51ce20df12d40eeffe5c31d87868e8e9a97d67223438c072ece6537d1c0",
    "00d1fbde2435df8730aa3e26ffada2cd22fd42f6bfc07ce047f510ed7abe294a"
  ],
  "./owner-platform.js": [
    "f4d3316cdfe72ea0ed6e753ad74f758eea10a2e4afdde81f48a5cff96fecbd29",
    "99c6f191bbcad58bb0a804960f988174d577f5e9a9bfb7b4407e04dc52ea5979"
  ],
  "./owner-platform-ui.js": [
    "69467889ad36f8e01eeb856e9a8e988420041e8dea162a0402efe24538207421",
    "c5ee33ef941804d59d83da5cccc8b8e6813a6c3c237c16c4e87c68e092dcc771"
  ],
  "./privacy.html": [
    "9e3c093da311585dce1e07025dba590abc4346006dcf1720cbbb3a47c282a19f",
    "9a3a28de9655b9052a09812fd7b51060154d20de848334ee455ca45208a61b32"
  ],
  "./qr_scan.html": [
    "c7fd07d7f85f7b19f9b160241744b552ea1147b915eb0e905184a03d516c09da",
    "f0ca1d6ba07172f82b949ab3ba70e03ff5f3cf79cdd1d984a9367cda72e83d94"
  ],
  "./register.html": [
    "46e8c35aceec0644e6eb442847ceeac9588c9cc9cb7e9a005a2564a79b112ee3",
    "739f1b70818ca7d71128f69dde1cde51e0d7e9242a9abd09696dc90b9396a49b"
  ],
  "./rental_fleet.html": [
    "117f74cafa6b82379ff46244b2c5e09305a859cf31facf04b13bea86d45a49d0",
    "efbe8df0a567c1ee6d3485855eeb3e3f993837deee7e85b4680277f03146ef4e"
  ],
  "./rental-fleet.css": [
    "2cb4f02551eaa74d340750f0b74ec95ccdb500198198868ae89f2113bda12e77",
    "0ef166139509aba1b3a28876141449c317541a932858e0434f44e7687d10118b"
  ],
  "./rental-fleet.js": [
    "4629fc0c19c6f4792a10ce9fc749570330c6321b3977cdcba4eba80fa8c10d42",
    "6c0690c8fe06051048dea34bd6fee5fb52f96ed8f0e9cad7452f39bdc7568452"
  ],
  "./rental-fleet.v60.js": [
    "4629fc0c19c6f4792a10ce9fc749570330c6321b3977cdcba4eba80fa8c10d42",
    "6c0690c8fe06051048dea34bd6fee5fb52f96ed8f0e9cad7452f39bdc7568452"
  ],
  "./reset_password.html": [
    "3ae99411cca082eb67a3d929770e5cc841b201542221ce9df8265db889dce069",
    "d81d65f6d7961d6c54b2b6539614731cd752e3aefc146d341df944ff9f2f920d"
  ],
  "./ring-media-import.js": [
    "640d189cd264ac5b9060719f6eda573680b8c65cd6344e44c158e1aec89dbbea",
    "7d6821ff2bb52c70e2ca52ef2254e297300e3418f1aec160e98cc708d39308a8"
  ],
  "./splash.html": [
    "ccacf02706f6eb09a3fd345d2f8ca2eac13f5b78b74346c36cbc16fdc13fb5f9",
    "e6bd3e14eb9232ddb2a852631b0feca2e2c25ac95fec720e0d227b2361d222fd"
  ],
  "./staff_admin.js": [
    "050735c31339e28d0e2da85fbc5be1f155785453c1dd04a176c2d960f0c7fcc3",
    "d2a67581dbdbb291e68e0bc6581941c95b666c84863097c9b449c9324ea4bd80"
  ],
  "./terms.html": [
    "5f6724961329d448eef05872c586ed133b74b98028b3b5e4bbb0f6879efe2aee",
    "9c0fdef8df1594ed4714a51cd55fcbdb7ab3f2ae89681d583d5c932112a116f8"
  ],
  "./theme.js": [
    "82e4179bd9d4dd92ecbe26acfb589a5d9f48d9c9d93a4a1842bff0c6843cdd01",
    "bbdd7054d8272c9b9f726f96cce97058b55f77549fe00c763d43b80977d12920"
  ],
  "./tokushoho.html": [
    "1cce9350af5559bc4936bae5c6ae05deb336d4345052d8c44c624c4fc7ca4c9c",
    "2a1fb4071c9b210180521620bfaa572e957ad1b81c9ea7a978a1a09e141df584"
  ],
  "./user_detail.html": [
    "5c17b78af74ece92f8d212ad5bbf4aff188563219a5c479fe9aaa9c9c96de7f1",
    "9d875730033847309acb1c2a6f07d81640cfe462a7bf3892a316ba0123c517c8"
  ],
  "./user_fav_shop_edit.html": [
    "1ed69c6e87cf93c88b3df18922d47fb57b5cc31ac0634f24b7fc0c7e8735f9f7",
    "1d7ca087e3e5dbfbd20162c158cc090dc2ed9197f8afc64036b4ed8c7b22d496"
  ],
  "./user_fav_shops.html": [
    "69edefb9c78135b0476a4bd07caffdd4ebb83b02a04be4682fcfbf9b6dfeb0fb",
    "381c712f38317e8bd3cd828e5d0b7cbebacc7c05c87f754b7dfe0c2902070daa"
  ],
  "./user_history.html": [
    "49f8204fcaa9730a8fbb6d9453c9f9c52c1d4e5a801ebe393a00ea1f18398506",
    "dbc5c1a0b80c51de981cee307f2a6e132e33fa55c7afce08495f5ceb2cdb6758"
  ],
  "./user_home.html": [
    "d2adbdc8d44404c27403c86dcfa782af5ab9e0a73cfeaa253134ec5d7beaeca2",
    "70f44bbf5fe898ded8e9ab697fbb5772d67c8c59d8f4d72f2615495e9eb6c52d"
  ],
  "./user_inspection.html": [
    "f558c677a8c8347f3f2c3606e7754e7c0154a5523bfa96ebb8c414f2a9f51187",
    "089a31ebbd1505ac14dec5655b9c7280ec49f2d1ed3d0b17abe3d1b5c5a93903"
  ],
  "./user_inspection_history.html": [
    "aa5d0fe2bc3a4c753ac1d5b591dce38b1998f45f5b29266289ce2fffab07ea37",
    "1a66042037617721177e7160802735a748e78daf5a4e03d44eb9baccf6fc2714"
  ],
  "./user_line_callback.html": [
    "d4097d3e9209455477be6ac25501bfdafec82bbb5d08bc777e91f746ed0b41a2",
    "85f8e7bb93f9e50c526ea06ed8ecbe7de6ea9877421935ce40ae21746e101f91"
  ],
  "./user_login.html": [
    "565126a078a1dc55723eba50c097af2159f2af2e35351d7269a8ca4624f26013",
    "4da05a5938a61de9021337f35748e2d9f14747dcd35decaec752494f437d0104"
  ],
  "./user_mypage.html": [
    "54c0d0ef90ea990535c46e18e47e197870402b2689c5688229609a3b2420c4f7",
    "efa854a3de27e0fd5a0c4902c281ae011da4eeaba95929dd769e57abff1b35aa"
  ],
  "./user_past_vehicles.html": [
    "0566e4a59bba94c22627b808b230503097177df6c0a105e8cb39edac864965dd",
    "086ab58bc674c97f71223d6b7bc9e76b85295166556ab5450a2b5de4a3af8b51"
  ],
  "./user_sub_invite_accept.html": [
    "a4a28c00c5a035104f5c9cdbdf51ae7092438f1410821d690e9d36aa6ca52faf",
    "a7996dceef7a69a4344abd3f08a7343d2462533a0d17029a8a96908d4aef5c4f"
  ],
  "./vehicle_detail.html": [
    "607ad10f25e34c161b84daa34c985cbf47afe48935d3839d45ab8a1becd82440",
    "9097afe531c0b671b189849c5ae0ed487a085460715b9bd42b092d59caee13b9"
  ],
  "./vehicle_info.html": [
    "b9a5028ac4b27db64c73efe482c6f2bb0d7a5044bcba78719bc82a3234ef7426",
    "2e83e318b28b6bc1b30a7f85b47d43b1c8a08a8d3a2b53fc4d9225258f7517d3"
  ],
  "./vehicles.html": [
    "08baa67c1685e70f9182f2ec87573c0211c7554b71d1f166aae77a3256343423",
    "11c12f4a98aee960224f87c0c8947525167ef2e9825a56c32c68ac76d4afddcd"
  ],
  "./vendor/pdfjs/pdf.min.mjs": [
    "410b149eae133506e6c3f2764e95d5d444fa706bbc450d6e63060ea7605c707d",
    "11c8ed9baf31ed90572cffefecf09fca3f6a6a4e17eb5b5fc12a0b4d964a8376"
  ],
  "./vendor/pdfjs/pdf.worker.min.mjs": [
    "094d2c8f779f6bc19d81bca80711748a63b4a95ffa79a5b67f9fcc6cd8c85e3b",
    "b6bc13c22ccd75825e883c049607e658f9a8c21815d167e5c5dca7f1eeb38f50"
  ],
  "./vendor/pdf-lib.min.js": [
    "0f9a5cad07941f0826586c94e089d89b918c46e5c17cf2d5a3c6f666e3bc694f",
    "e407401e1d27c95af336de6c0583ec048b7decf4b9c3d60f14de0f7b5b0e4ecc"
  ],
  "./vendor/qr/qrcode.js": [
    "18ae399f81182bc9de916e9c77b195df20cc58d6f2d55a62b085a299f1bf1780",
    "4b6133cbb5a13ecdc26cfa897d0daf7bb9b08232032cdd381e82f2baf3653b5f"
  ],
  "./vin-search.js": [
    "9080f6763a29c15f3dcc102df07b185b074babfbbba180348a6bab14b75c8c05",
    "2818fc73715585324cca43bda8dec6745a962b4200ce57115a08ecb2a13a1d71"
  ],
  "./account_withdraw.html": [
    "9cbba07b88b48814c217035bd99c3f280f81293ae435871177d272ee44066e66",
    "12bae90541c60ed1981a8db61991eded19776d8f3384585498407a26cef0b4b4"
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
