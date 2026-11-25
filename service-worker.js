const CACHE_NAME = "car-nappy-v65";
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
  "./staff_admin.js",
  "./vin-search.js",
  "./account_withdraw.html",
  "./common.css?v=20261125-v65",
  "./app.js?v=20261125-v65",
  "./owner-platform.js?v=20261125-v65",
  "./vendor/qr/qrcode.js?v=20261125-v65",
  "./owner-platform-ui.js?v=20261125-v65",
  "./gemini-ocr.js?v=20261125-v65",
  "./staff_admin.js?v=20261125-v65",
  "./vin-search.js?v=20261125-v65",
  "./fleet-check-sheet.css?v=20261125-v65",
  "./fleet-check-sheet.js?v=20261125-v65",
  "./fleet-check-sheet-pdf.js?v=20261125-v65",
  "./rental-fleet.css?v=20261125-v65"
];

// Hash the exact response bytes. The release manifest admits only the approved LF/CRLF byte sequences.
// Changing these files requires new hashes AND a new CACHE_NAME.
// Both bare URLs (already-open pages) and versioned URLs must contain the same release bytes.
const RELEASE_SHA256 = {
  "./admin_dashboard.html": [
    "ae3c50d0ecb1a17296e1ef1b671b272647ab585b41add4cb38e732287ce42b73",
    "072b97f77044f2cc2f2b5030f81251aa11e195fa15ba7558631f7e983e3804db"
  ],
  "./app.js": [
    "9734899fd9a220d57b329526bbd89efa05adf10ec56565967bffc52a58aace81",
    "e5fc6e8797cd20499d5dbd3a2c4a35f1b961136f8a06b5fc6ced85478b00fe09"
  ],
  "./biz_register.html": [
    "34d7b57b4772b12f98763d187518a0cfbbb61d03fd40093ca297e98f7b58b3d8",
    "2bdf81040076e26e3c9d47664f1dfd6e821d7bce39296c4a2e9180cb2b55763a"
  ],
  "./car_add.html": [
    "0ee58a6e421aa8c016dfaf2bc87363c409c673d9061a9ca0d7a16f3bb666836c",
    "4b25dc80a7a05d6adfb7bd6bbc970f2578fa84343f39137d292992e604457f33"
  ],
  "./car-add-date.js": [
    "4458b2a5c43b9e5738b06441e53bdc187ad1cc4a666709fc98e980193dac8257",
    "75a157f6b047cdcf356d5381aa9eb56a64b7cae63d095b37f4c4a061e19db1af"
  ],
  "./change_password.html": [
    "26caef7448fdbf4fcf67a125deeb80ded8b2960cb8faf81d70828c764669b6ba",
    "9a13d0c70ee5006724493b1ace3b710a147376b6b9937662b9c9698134908982"
  ],
  "./common.css": [
    "117c234a05465ef84da6826098421b86c4765e98ca9a8275e20186bef0fc98c5",
    "2d07c7e219d74975e5c2a452011a052aa3277d587273c8fa03702585c23f187c"
  ],
  "./contact.html": [
    "7af6f12099605ad8019e460e17c1501fc0f3fb791ab79386f0a7be07af596522",
    "fa61024c62e345e39f412bc315d71f9586b35fa88f8a226838f9c76851802060"
  ],
  "./daily_history.html": [
    "aec269b1ae8c00e6b28f342955191c2112f6afb5a900ac9b9d0ad1e7608092ab",
    "cde9bb662c50899b4c7ff9d4310a291d4bcd024f13004070a2e51516f678115d"
  ],
  "./daily_history_detail.html": [
    "778c0dbcd1cfc5072e3cea1cd14eb0891cb7e471dd754c3d9bcc1e65dfa34718",
    "eb32e108b93c1e902629d41f8a2c7b118602f5f920c8108507d4dc0dcca04a27"
  ],
  "./dealer_admin.html": [
    "b964cd5d45f14081ad672db29a0627875ff46a1c140f8459c2d9e9ad68909e8e",
    "82ee5abe4cbeb2343fb8f5b53e84675adca616eb5e6a3e1ec8ad9e91f1abf752"
  ],
  "./dealer_home.html": [
    "f872226fc50b9c7764042e22d8a767314c4595c269352c96b293932e0e2941d5",
    "f90f42578bfc7cee6dc97de0af61c460e845199d0411cd13744e262771087e46"
  ],
  "./dealer_info.html": [
    "c1aea158536f2d06d06e71047d6e0b12656fa5c6fbddbcba3aa84f9e44a67cfa",
    "8f73ad0a61afa42aa4b0c62953ca5ce88dd4f208c3f40c305cdbbf5af2227036"
  ],
  "./dealer_input.html": [
    "da333d88dec88be16578372304a5e9c6f51b4d118850566f945cd7575822b5c3",
    "697f0367addfd1160648e955a41399eaaca98cfd5b947d91ba7d415ede952cc9"
  ],
  "./demo_preview.html": [
    "18450297cadea93b915678ffe5a319c6364b800870259e56759b23682a18afa5",
    "ebd910c2fee97d55b5d1a4fa67c966ed98147ec85e2077c01ea85b3faf1d97a2"
  ],
  "./detail.html": [
    "e8d45090a3b86ede5d74b77d65cf7943f477e6f7e8aefb505b3e72a8d91a3dc5",
    "76c65fc7296e1fd9d2a02a5608eba07ce1f95b4cd17613e331d8f48037b28fbc"
  ],
  "./factory_admin.html": [
    "2e30718642fca172e4b9a8e4b4efcc8024fe5f7db978eabd40a7fe359dd94f92",
    "39b9f1b6edb19f7b16f9d599c73e0c97ccd31b718f230197f9912734a9b49c9f"
  ],
  "./factory_detail.html": [
    "016d26df5f51a50f96ac2476b58decb2a459d2ccb153a1e64bf250b04d451808",
    "fdcf411da34c3a7159665434f1f8967f953f7dce630426124612297a58a3d6f8"
  ],
  "./factory_edit_detail.html": [
    "ba1cbba9429ee955eae910c9059425d39f1a346e2689c153efb44887fd609b90",
    "574c2298cd3534303bad33d37d167caf8624406f2caed86737f838e498304f4a"
  ],
  "./factory_edit_list.html": [
    "56767702be87f8bd55ebc7aba959b3db7954f52841405c7185f8364aacb7b0c0",
    "d495b044bada6d8aa4a60fbdb89d4015f8fb6ac4e797fe213929cff2e34152e5"
  ],
  "./factory_history.html": [
    "e7064cff95a71f4c5da97e22df0288ea086848a28f8bee223f18c13cb9defddd",
    "914f92fdc1cae6a3323b1d9de021a74540f848458c785a6383b4a84403715484"
  ],
  "./factory_home.html": [
    "f127dba520326acba5792c41eed73018708d643cf30862ebbb65f17f75b2da1a",
    "d586b0f3c0dfb3b1638a5b53791f31486de2a541e46e615cdc8e0fbf7b9f2412"
  ],
  "./factory_info.html": [
    "747677da8f543a1260f7fe20bf590b23ecd3ed82e94a83bba66c53b12b397eb8",
    "c1463082789d980f2aebe92f03af67063e083ead6045bd7940c566a82a971371"
  ],
  "./factory_input.html": [
    "e3c9be18e819b0f394020aa9b5e05bd33a8d6ee20bae500c98865762a1578663",
    "3cc35df0a6f03e9881b7876a00b5618f979cb458df39dd92c2a38c867648d341"
  ],
  "./factory_inspection.html": [
    "22a077925906d3f189702689063ab262db6c6acc88f5f856ab7a2d938df6ffd0",
    "1a57266ceed3af97ed1ac3e6862e2b11cc34d4dc4ba1edba1a768caee9bb4ff9"
  ],
  "./factory_search.html": [
    "c9a986b89a36e70857beeda786b9dafd3e86c5d290a6895caba70a80bc95dbae",
    "7193759ffcdd301ee6f28fb2b783f880cfa0781539b6e6b65a04170c3cd65b95"
  ],
  "./faq.html": [
    "ce44357a4f7b6b7384744c9852442849babe2ec4256858b66a92dcf7848aca87",
    "abaa9247e347cdc00fce1f74a2531776150274f58bb442f5b557d70eedb9cd17"
  ],
  "./fleet_check_sheet.html": [
    "423e64856f537848a2c1fa63c398b84c77a3ac03c70669d1696b35010d7ce67f",
    "38795a3c9029bb9a4245361591274bfdb369e64b7eda5eb9b18836612b6e63c7"
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
    "cf098a40c53b711bb157383bbc6821374a4022d492b931e2b31bf14f7fdcfced",
    "02eb5b31fe53549d386cbcb1c0b6750d313e8bff70b258ab4b6bf5023fa0b779"
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
    "8df70a43694739f0711fff639c4c84d5d971729e4c2146f9835342075fc133ee",
    "001b1343b95a8da748cf989351588813ef79d85c58299760f751eb597f4ba450"
  ],
  "./history_detail.html": [
    "63096857ad99fddce87ce4551ec90e3d947d24be08354b5230ddc9e42e12899f",
    "54d6991bbe438db888728215d0cee617f5c0140d9f15896cf92da74950b950a6"
  ],
  "./history_visibility_settings.html": [
    "c3c7260de796f638d6b40c434a105afc21cf3c74f0cba23b2d454b83af10a396",
    "eaff772d735093fa4f3edad5979c05cacc125cc004401babb9722c4069879660"
  ],
  "./index.html": [
    "aa94a082908e21b4ca8a3f155fbde31990cdf8a13ec83e20981930f9c416f439",
    "f88a847682a8b2f1cee220cdcc7ef43825bd214f50eb62e6f2ecc2986f9cf11e"
  ],
  "./inspection_biz.html": [
    "6a90f68edd5e7f81460977e346d27d5bf4418506560df1789011c1dce86c3fcb",
    "0e8a9450375053cacc100898b5d5126b30386efbf57ee8cfd6caa594ca9cb59f"
  ],
  "./inspection_user.html": [
    "46af577245432f59a45067ea9545feb1f5d193d01c6b517182452510328f3fd8",
    "1d4cd620a426543c3de52a58421117cdb47015ca70d2d04a71a20a925957a2f9"
  ],
  "./login.html": [
    "935945185c55807ed8980aff6e325ae8f0d2deca87e5b841c13740b46125474f",
    "29ee87f1ed4b4e555b5d80c6a6968f07eafb2a7d9396dd2cb7c0e0aa36a8f566"
  ],
  "./maintenance_input.html": [
    "65f73a1d49938fe05d46f103b86140205f6aa46c937c8b9248c828c312029554",
    "3c3025e38c05562be4b5f24252756d78ede39481eb018cdf033fd2159505231a"
  ],
  "./manual.html": [
    "664509111e8d5c3cce90de0fb2c8aca77fbced12ace5b638928c5e00c74a8329",
    "129dd33ebcfef8f4b2930866707d86433de8f1ef87f6638b3e95e20b183eadb5"
  ],
  "./offline.html": [
    "3501c6cb84b7a7173f8e7de3f6f5bf1ac974a5018d9ccb035aebae27a59d25fc",
    "94ebcc6cc15cdac16f36a7ab15ca090851382d2fa0e4738dbab4dbab1f7647b6"
  ],
  "./owner-platform.js": [
    "8e43c410be8ffd34dd1a593521802d940f9f436cdef5bd98238d8a4de90ea71c",
    "166bb1a44fb4589db4a63186a360c3a2ad78fd454dbd11755330e09eb47d9bbc"
  ],
  "./owner-platform-ui.js": [
    "d8e3b81dd073db74b3ae43ad409d97f4466f9dc401cd4e1cd9aaf48da3d4d05b",
    "4ef0ee40afdfd5957d35cf4550cf207e8e45048ddb7e1ef46bfd76dff4b7e332"
  ],
  "./privacy.html": [
    "e6024ad94525aec0a5588998ca14ff1150e4c331f3a649d9a95dfa8239661b4b",
    "28405bc4c9d5ab21fcdb88e71a8d7a517bd98e55f33b3280b2e6c1ed388c6108"
  ],
  "./qr_scan.html": [
    "06d6a395a15b3fc1df0b76779c385c39872838b226fc0174042f6bfa91c8bc2c",
    "09ddcf19f52a4bcc4786fa0371501e76f13a6a520bd8cc2d4321198328053ef6"
  ],
  "./register.html": [
    "e72783fea97a24742809ce127281d791a2bb3caad0ee0e2d2e8392dc65e6b540",
    "bf0cfe80f01ab59e406aa061b280c43d0b42fd8d827b358ec89ab99c0c047e06"
  ],
  "./rental_fleet.html": [
    "ca84549fb5afc83cee90e7d682a08ec281e701a5d625295afc41fd5d19c4da64",
    "df4c3e86d91de763da9f57a80e16f87323553c314c7f205f881469b5665c4a0a"
  ],
  "./rental-fleet.css": [
    "2cb4f02551eaa74d340750f0b74ec95ccdb500198198868ae89f2113bda12e77",
    "0ef166139509aba1b3a28876141449c317541a932858e0434f44e7687d10118b"
  ],
  "./rental-fleet.js": [
    "228ed6b594838daf829a7025b28b08d6b838af5c6dc7391d77616323e95c06fc",
    "e72b7a92a4f0e901408e2c8cc61aa539f4eaa4dd75b4dafbacd0dedd04488885"
  ],
  "./rental-fleet.v61.js": [
    "228ed6b594838daf829a7025b28b08d6b838af5c6dc7391d77616323e95c06fc",
    "e72b7a92a4f0e901408e2c8cc61aa539f4eaa4dd75b4dafbacd0dedd04488885"
  ],
  "./reset_password.html": [
    "c138c88e7a7cbd81515c42438e868be698e8dc145f4e41c2c26b55c07364fd89",
    "a7093b61d6dd6061f9cb496539efbb59f62dfd61ef244dc9dcaec62a8012723f"
  ],
  "./ring-media-import.js": [
    "640d189cd264ac5b9060719f6eda573680b8c65cd6344e44c158e1aec89dbbea",
    "7d6821ff2bb52c70e2ca52ef2254e297300e3418f1aec160e98cc708d39308a8"
  ],
  "./splash.html": [
    "353b7007b41b78eeda0e4419587dd3b039fdf8f5738ca8d9f6144108694789a4",
    "d449c11ae63f2aa368af24741406625db08b5a1164fd9f5da10b5f88f19955e1"
  ],
  "./staff_admin.js": [
    "050735c31339e28d0e2da85fbc5be1f155785453c1dd04a176c2d960f0c7fcc3",
    "d2a67581dbdbb291e68e0bc6581941c95b666c84863097c9b449c9324ea4bd80"
  ],
  "./terms.html": [
    "51b31d3ea78a8b9631ba807ee0d67fa0e5dbdaf5c6d4c84ca8ce32e2bbe84e9d",
    "97e0b007bbcdbdb959bd98cf0bd1a4c8f9532912a1ca3b01dbee2527c62d16d4"
  ],
  "./theme.js": [
    "82e4179bd9d4dd92ecbe26acfb589a5d9f48d9c9d93a4a1842bff0c6843cdd01",
    "bbdd7054d8272c9b9f726f96cce97058b55f77549fe00c763d43b80977d12920"
  ],
  "./tokushoho.html": [
    "73aee4202609944fcd93c02786f6b0c25f68e210204a6aacea368ba11432a70c",
    "8553e93819f8ec09585bbd13e9306fb37740858a751d69265a47a559a011b4b5"
  ],
  "./user_detail.html": [
    "f6a1333452b46d0d2b93168e6b7d6cb5b819084d782f06367f07e82df9ad97de",
    "eae019215c8b44794da73fb464721960005b12bd35e3c3f7b46baafaae90f63b"
  ],
  "./user_fav_shop_edit.html": [
    "57f3903ec1fc9824c880d20ce0762e1a89c40ca0e53a75beb7d9084f289ff2d0",
    "7c88b3ce4591696bcddc231998b9b48f7ed1be469d3a7917fc9502467a268631"
  ],
  "./user_fav_shops.html": [
    "bdfe83dcc35bd6b63318476b0c93a9ece5b240e79ede6e351bd4d35aa91dbea8",
    "fd0e74b8f2bdca94dbb75727b96ab8e912d132cddbb758a3d7d2ea9601c1ca48"
  ],
  "./user_history.html": [
    "010905418ac2387f7b1271ccf7ba62e37813b9ca81f86d3eece657d5fa61f069",
    "4488249336e05a4dc06827c9900b046246fddeae299281a7be38bf7c67675f61"
  ],
  "./user_home.html": [
    "5d506b2eb1b6d1f5d23944871dc55cdf0e432260ac1fd7506a34072bebfbf924",
    "4038891714884f5fa90cddcd92dbb87ad6ee358b17b02b8b6faac6e196083618"
  ],
  "./user_inspection.html": [
    "f558c677a8c8347f3f2c3606e7754e7c0154a5523bfa96ebb8c414f2a9f51187",
    "089a31ebbd1505ac14dec5655b9c7280ec49f2d1ed3d0b17abe3d1b5c5a93903"
  ],
  "./user_inspection_history.html": [
    "90c82f706afb7cc3ee1fb103148b33b16ebe20c212490e96a24c7719df136c81",
    "b3bdb8a46679e1c7b0ffee2bb56b9a3dd58a0f2223e433a7cf3dd02cf80dfa8d"
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
    "586e5a36d00d499c09169cea8ec72af98c609805dffd6142f31ba645934c1bef",
    "c2489cc76f663f4ddb9a13000392ab38fd1c42b55e964c3e3e4f7a487d1c7498"
  ],
  "./user_past_vehicles.html": [
    "4b85b44ee50265ec6850cce7b6dc5e9241220c41502b0193872adc9e5ef7ca26",
    "c7a8927243580e1c77a82822d71dcec5b56447ca0b54e8b0b64120e56c6f0d3f"
  ],
  "./user_sub_invite_accept.html": [
    "88f8a755be1104f8262404589ca848ea91403bfe4de531f6a6d4ed5a1ce13171",
    "d8c44012e665b4e865477f2eeaa201d27e2d4f204e419c3bbccf2d36b023f838"
  ],
  "./vehicle_detail.html": [
    "f33a95aac55003dba0174febb4d0375d560cfd80d70ebbed4f01f589b35dd41b",
    "b15b6b63f73a9906f79ad81941ac520b83b5a45ddbb7d189af3dce978317b510"
  ],
  "./vehicle_info.html": [
    "506e24fa4025eae14bf2dddbb4a02f9f7aa731be1ece25c32098f9c8d7eb002f",
    "432c7d0c3569a5d98b2835d0e9394857361abeef5f3f0de5918d495c87ba3f6a"
  ],
  "./vehicles.html": [
    "7464865d647160b667a89feb599a410699107064200c62cd40dc3d3fde116529",
    "1ebf0f37f0e7adb936166d7286e5389c183a4da2372244e744b0216b40f29c1a"
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
    "9ab6179162ff2164e1901c8a6da743bd6d9a9a244259cd069daded7dd74931f7",
    "71b23af7c2ab6df1afd1f1e792e461d29adada7a27c10e2c367d7f10625af98b"
  ],
  "./ring-sync-store.js": [
    "f8e0d9f2f8ae35e7661a9072acfd354a565b6cc7e42981343b625d411c591d67",
    "f16c1ab5c32780e2002897e2dc031bcdfc3c47e82935939cf57af3bc5bc75521"
  ],
  "./ring-sync-engine.js": [
    "27321e158cad0aa7829623b090aaee4ea95521bcb773250a933168dc79ff18fc",
    "c1c534bdb93d6389fc2367e3718b6beadb38696eceb952918e6acbcd5b1dea0b"
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
