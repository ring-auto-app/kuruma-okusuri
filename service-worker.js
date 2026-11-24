const CACHE_NAME = "car-nappy-v64";
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
  "./common.css?v=20261124-v64",
  "./app.js?v=20261124-v64",
  "./owner-platform.js?v=20261124-v64",
  "./vendor/qr/qrcode.js?v=20261124-v64",
  "./owner-platform-ui.js?v=20261124-v64",
  "./gemini-ocr.js?v=20261124-v64",
  "./staff_admin.js?v=20261124-v64",
  "./vin-search.js?v=20261124-v64",
  "./fleet-check-sheet.css?v=20261124-v64",
  "./fleet-check-sheet.js?v=20261124-v64",
  "./fleet-check-sheet-pdf.js?v=20261124-v64",
  "./rental-fleet.css?v=20261124-v64"
];

// Hash the exact response bytes. The release manifest admits only the approved LF/CRLF byte sequences.
// Changing these files requires new hashes AND a new CACHE_NAME.
// Both bare URLs (already-open pages) and versioned URLs must contain the same release bytes.
const RELEASE_SHA256 = {
  "./admin_dashboard.html": [
    "374a5a4080a102b6a25796751d707e14171123244c07614f35ab56886c1d17ad",
    "aca58c5c69b06c02700b178af521f950fd660300ab34428b68b720f063920f35"
  ],
  "./app.js": [
    "d83d86cca58c43589cc2ab9d90012b6edec907f20b14af9098c350eddbfd7726",
    "486044fb1f2dbe1cbdfe402ea8c99ba84b7bed240131e3dd2a4f6e2cccc96dc3"
  ],
  "./biz_register.html": [
    "17d4ee62a1e035cfe670be47428490ca0e88dc79600a7dd744c1fe5786f49e74",
    "017f0ebad7102431352ab68fc479689f195430397f97ca6ac1fe835b9724b48f"
  ],
  "./car_add.html": [
    "0ed6f4137d759692070852116ca995cf2f73a0a3347ecf5cf1162b46ed679938",
    "68c8dd729735d60c415f0f3c4097248d3fc4509c19f49e0e24a7468b5997b159"
  ],
  "./car-add-date.js": [
    "4458b2a5c43b9e5738b06441e53bdc187ad1cc4a666709fc98e980193dac8257",
    "75a157f6b047cdcf356d5381aa9eb56a64b7cae63d095b37f4c4a061e19db1af"
  ],
  "./change_password.html": [
    "befb4ea52107825d6c6958f05986cd9171532efaaff31d08d8d54b6da71ab8a6",
    "1486b731524d926b39cf4e1067adc910e247a681db4cd69a9c5e0209e357a963"
  ],
  "./common.css": [
    "364a0c221697280801d4b7582e94ae1db2cc0a8950ba57049fcf3350a184524c",
    "fb1a63324243791a6b436588c22448764d865a2206bd0e1aeec13f77312cd737"
  ],
  "./contact.html": [
    "9a7aac980031f1601e1a69e60bb9ab8535b744b610fb792c75c67b2cb943178d",
    "a493bf8607a51e8a7873f6079603303e62507c086bab0d79e78193f31e4f90ff"
  ],
  "./daily_history.html": [
    "8bada860d1b625b189a9e19c319c32ca1884d79f76e82efa6fe545186eba5f1f",
    "22f892a824bd82d3209787733bc3f846b54734ba8f3c7044d6afd92ed4601db4"
  ],
  "./daily_history_detail.html": [
    "063625e02c24ebb7eeba524323380cbb06a7bdaadee8038e20fa57008f48d985",
    "31a98afb156c4ad05489d1235e11bf6b5b0da764da95e07edfc0cc6c61f61a94"
  ],
  "./dealer_admin.html": [
    "07dc699aab1de9c42e4101efbfa04897d18022f9f4f8fcd06114f2b37ab3272d",
    "a7f575743280051a811a2668cbee4224ac76e7766e3f7a313692ab8e4bd4cd54"
  ],
  "./dealer_home.html": [
    "5396ed6ee991b0af5ec39958dda66a1e6bbcc50837f4b5b01c90d41e60f85038",
    "35047cf924efa47a9d3ef2656ed2d46b328492bf95ca8b6bec950febc76b4685"
  ],
  "./dealer_info.html": [
    "c1aea158536f2d06d06e71047d6e0b12656fa5c6fbddbcba3aa84f9e44a67cfa",
    "8f73ad0a61afa42aa4b0c62953ca5ce88dd4f208c3f40c305cdbbf5af2227036"
  ],
  "./dealer_input.html": [
    "adb201c7c79b51421c7a08345de8d0ce189f07d5038241056379a7d0aa20cf14",
    "2fd1d9ab523e24d215f4b5e7a2d01871ab4097642773edddda9684ab16dd5622"
  ],
  "./demo_preview.html": [
    "c505093a899963ac59e2069d1a22dd21da1aaf0fe9cc4961d89662182bb115cc",
    "56c6581a08f192762c31234af383836c5d9ec39bc205b29d91c1cc5cf30992c0"
  ],
  "./detail.html": [
    "4598aeeb6c1d7e1c4163ade0db801f8e3f45122afc319f6b43e95248e3e48736",
    "9080a7a8b8606ed04af56e0ccf416814047e3bbf4e68252d73573983bbe0e67b"
  ],
  "./factory_admin.html": [
    "850b01e259b0f8575c9db919735659ffd5a04add86bca8c56ff3b43243de2fdc",
    "fa6fdb3824093630abd41ee69db3f72f9817fd0255d17ddd3d0bec848a83fa33"
  ],
  "./factory_detail.html": [
    "7419bd947d06b52e74b76210b208301a223cacebed1bf8d3831364020b008444",
    "22be84f5c9f8e26dd2a5da2ee9d003fc26bd20ca914e4edc575abf96aca4f93c"
  ],
  "./factory_edit_detail.html": [
    "0c4bc867963ad64843f06ad7e3d25820a967a19f57f44e1a8d6bf59ae1082a50",
    "ffe527177ce0bd41405c47bb44e8a9c9bdeb8075d6045423cc7f0b6e51beea74"
  ],
  "./factory_edit_list.html": [
    "ff1968e9bd240fd1d52c6ab9d551ed17a989ee2c41e41099fe28dc4b008e2db2",
    "5f3a5fce4cf558c0e14febe34e1b4f0bc1f958d2591aa5c4b7710539df0fa37e"
  ],
  "./factory_history.html": [
    "2aa05404766284579768e5cba2f8aeeee4fd9190231f8e50f46fad065d6ea1a0",
    "e12c9b23b74104ca667ef4c21bac0fc0d490ce94f66705b2ea3c2c4b94d30c92"
  ],
  "./factory_home.html": [
    "59d98126edb812cd29297a8d076528e2398797104a126f0a1e99a2a6b9b70756",
    "7b737a1166e9eb598a2f2cf8d35cb5df225e1a85d01847c064d6a0ca1d8682ad"
  ],
  "./factory_info.html": [
    "802c08fe7881719b89176cd6f6c7f38e667dd98a905e5eab506af75956f819da",
    "5475e7e45e0d6d8b4a14564812421b7e7e1916f0de3eb17079bd36045468a304"
  ],
  "./factory_input.html": [
    "16e85897662d2602d51746edacc558cce1c70749d69090e4fe60a57a9d58fe4c",
    "7bacfd7ccf1fcc6627b6ea684ad7686ad4033437821c1162b121d4f0aaca2e78"
  ],
  "./factory_inspection.html": [
    "22a077925906d3f189702689063ab262db6c6acc88f5f856ab7a2d938df6ffd0",
    "1a57266ceed3af97ed1ac3e6862e2b11cc34d4dc4ba1edba1a768caee9bb4ff9"
  ],
  "./factory_search.html": [
    "44a38be210ab703053ec55528ba19a5b7981c59efa99301408157adb5cde048c",
    "64a75059b2a54085cdedf3c0944edab91ba7cd6ae6dfc05036c227dd2f366a55"
  ],
  "./faq.html": [
    "01541e071dd028fc516190228bbbbd7136d6f939b5df2c8bea28de84d4133db3",
    "897df83b281a06cf7ea87fd542dce66a8d2249ee612b5d7bdb8726d468933b54"
  ],
  "./fleet_check_sheet.html": [
    "1b1d282079873d7963f3518794c566bdaa95cd4a8e458c51123df288edf8c6b2",
    "1d2cbb16f1c1e42285ed7d77fe0f38d96af4e4a55795e5ceddd158fcf98fe269"
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
    "59d09a9b5030be73fef7692158c2ef24b5b397e6978bb210727f182debafbd86",
    "f6821d30236b6d6d1851cdcc906f435cbe6981d72dd3c9a7ec2741f11c09c93a"
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
    "dd5f5a07a6cc10a59ca3b7192bf5213f60562b42a3cb123344f032c31d8b3c7e",
    "8fb31e029fe6a047a3bbb999dc721396385e13a87f8ffa78d8f11d4af3603f24"
  ],
  "./history_detail.html": [
    "fd99df1e8bcc1232f4d2a997e6407eff4800477fbd644c722d797d075374b6b6",
    "fc31e39090168fce7b7be4d398e7fc8c36167f9ff0cfe8faad0ab9f1e6276070"
  ],
  "./history_visibility_settings.html": [
    "315787b6c959c8cb7622cc5f0d2749105c74b94296c9584aab8ba2e153850277",
    "a6c1caf6fd2d77a3d8643c4010bb5c36761822a8d44fcfc1c63b2b9346c56bb9"
  ],
  "./index.html": [
    "af8075283a98ed199c71f73b4a81b3593f3bf9204bd2e33a11f13eb26c112f6c",
    "f6559d8a57b115a2f5f7c10914a09a766169bbf554ad17e9d3aae533b8f0dc96"
  ],
  "./inspection_biz.html": [
    "59694bd4a890373a822581bd998c14ef50010859866db62a4c2794fe05153515",
    "8a2ea01e9f8fe09aa1bfe7ef9e1df0b659453bc6a4ad66cd902721601b3691bc"
  ],
  "./inspection_user.html": [
    "35037b6f393a6d28be484430ed2967c897fcf7822a28a97d84779d87c6875ffa",
    "358c81fc165eca90ea99f411f468933db49df46c0671a8ef4d6289e5713d5595"
  ],
  "./login.html": [
    "ea6fd7efc08817537491c0f1b56c6e099200aa01c59a082bf3889b792aed1710",
    "3cf3938c1c0d524e53db900d47eae0415c0d2e73f81a97b467da04adcc78592e"
  ],
  "./maintenance_input.html": [
    "b005d7d216904e0ad995d963a43756bcedfbf8a889221929edb42c30b124eef1",
    "5c35932540896935077719389d3d8e6e3990256bf51514a05157f58fbc1aa7f0"
  ],
  "./manual.html": [
    "5973bf56014c783a8ceaa2c032a6e3e3a4a60f369abbd14b6f662279eddfc8a9",
    "3075651ad672f5c475177ef988361f50877c747b9cc21208a615a2a50e483a9a"
  ],
  "./offline.html": [
    "d6a032c942714a6976b907390e342ec503bae657b6d9911fb4e1e614cc6be282",
    "1c33cbe50436ff4b6674d095694a137a5f4132031ec69ed78fa9d2e3580c1181"
  ],
  "./owner-platform.js": [
    "f4d3316cdfe72ea0ed6e753ad74f758eea10a2e4afdde81f48a5cff96fecbd29",
    "99c6f191bbcad58bb0a804960f988174d577f5e9a9bfb7b4407e04dc52ea5979"
  ],
  "./owner-platform-ui.js": [
    "532fa14723669ee77ecd8b152305d555e3c8a19a6178119ac37f1b6f776e6024",
    "6f652f180d76839a957ac1a0e3b6c5591b135d5714b516e2425542d89fe827b7"
  ],
  "./privacy.html": [
    "44e37654d892ba94a6f07f1f1a98f13e3ad0ed2a0adae59b00c90636d506da95",
    "8a8f9f702af41b52ab95d28f4e3622343e7083f929843e8593be91af51f2d4e2"
  ],
  "./qr_scan.html": [
    "4068d721a0182ad214744f82a49863422738ce2e1f4d3b3cba528f332415d390",
    "92c5e4715145190244cd660bdd8864e3d7c6a1a65e92c4f1921c8b08c94dec7c"
  ],
  "./register.html": [
    "4851e9ddbc50e021c1aa0721fe1d8bbf539649331c2a22a7d9391388f13e5b1c",
    "2d1d01cad34ce0e7850c06ca19e5624dd92cafa6a8a54142bceed07d85afaa7b"
  ],
  "./rental_fleet.html": [
    "9046fcbf4f627221222b21b5988662fcc9e52ee26548a8dcf667085f53e20fed",
    "74d1cbf8600a10860275e75eda7fe9078a8d2af929e0efc40aaa2cbad2e6c84f"
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
    "1079a3647aff40f4748129fba4d1c894bd68049f0e8730377d26ffd24968655a",
    "34ca49c543b09e887b564ecd16f3db4cb0e132f2c00ad6c2a083750a85a86289"
  ],
  "./ring-media-import.js": [
    "640d189cd264ac5b9060719f6eda573680b8c65cd6344e44c158e1aec89dbbea",
    "7d6821ff2bb52c70e2ca52ef2254e297300e3418f1aec160e98cc708d39308a8"
  ],
  "./splash.html": [
    "4527326ee05ce6cd5123bfa9c996a391bcb54b0db23a5c0341bd3c5cf0ea0581",
    "19dffb8adf788ebeb1e32ff892e20f9e6ffa158d72477e4397024cd1662f7f9a"
  ],
  "./staff_admin.js": [
    "050735c31339e28d0e2da85fbc5be1f155785453c1dd04a176c2d960f0c7fcc3",
    "d2a67581dbdbb291e68e0bc6581941c95b666c84863097c9b449c9324ea4bd80"
  ],
  "./terms.html": [
    "663d25b89cb2a8cca864aafc9137736dc2db38a297e8c1769db9fa42ef19658b",
    "bf36cb1c8753afdb65b41ac06f722d4451c782cfd1a46c5c2cd04040e96a83d9"
  ],
  "./theme.js": [
    "82e4179bd9d4dd92ecbe26acfb589a5d9f48d9c9d93a4a1842bff0c6843cdd01",
    "bbdd7054d8272c9b9f726f96cce97058b55f77549fe00c763d43b80977d12920"
  ],
  "./tokushoho.html": [
    "c3d2bf5f3591474be2e0f8768bddc728270fa3eb67481650ba72b82692c91fe7",
    "0c7a926aa0ad81a506e23c45e80897e0d48deae154e8146903bf2c8bc587450d"
  ],
  "./user_detail.html": [
    "1640e65da4a213740e1d25a6b2be2f80d5dfcc8d5b362d3139311e852f29c02d",
    "0bd425263d01d36847c45730cbb7f1e002506cbe3aa9ae1e860c0560687e12f1"
  ],
  "./user_fav_shop_edit.html": [
    "458bdf00c8beb221c1d09f42988fe23522590c2ae3a4da2ca9faf36796d0b7f8",
    "1bf7cfd1cb0c459719df3843aa5fe4f44a8986a406783cf94fa11c5f64efa3b6"
  ],
  "./user_fav_shops.html": [
    "dcd76038d52f1424ea2e65c8aad25a5dee172ed076f427d4297c82dccb4d5518",
    "718a89c93572b1fa419c3d3a293a25da7fcbfb20840fb2a33cc683688561b069"
  ],
  "./user_history.html": [
    "3c55881f15c3eaf8faec06c8a93bd32b5f30ced16b2160df9b6bf2387aa80131",
    "838cc488e9a2b052e639801c835669a89a4603abdc8203721ac377d9bf8d0785"
  ],
  "./user_home.html": [
    "83b1ad079e38e2bc8c8f8a7f1e9baf0fbcc3eb2501457be7c122dbf50daca11f",
    "ef3d59b395aa1fc59a6de68b84d24610214b9b9428519de6421191faa6a7eec1"
  ],
  "./user_inspection.html": [
    "f558c677a8c8347f3f2c3606e7754e7c0154a5523bfa96ebb8c414f2a9f51187",
    "089a31ebbd1505ac14dec5655b9c7280ec49f2d1ed3d0b17abe3d1b5c5a93903"
  ],
  "./user_inspection_history.html": [
    "69fdc36e1cc8164068e0f39d2ea93ca3f4841a75d6ce03ee22a8344ac5e007f6",
    "e1d186a3f5fac2a98b240b4f1dcfccac236a9da4bf147fc095acb86748a4ff34"
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
    "1e8ff401dab1705af531564cdfa80cb69539d14d335e6544c62329855f9b5bc6",
    "668d6ea91a651af55650e8efd7da24da51e08e21c2e95b888cf73153206e7428"
  ],
  "./user_past_vehicles.html": [
    "d369fcffc192c94bbda5af93c4ee4182bafbc3a77f8072ff97b9ed249094de61",
    "ec0c5acae1be352676eff199b9b12c78ffdbc59e6fecf362c4422a99fc91da80"
  ],
  "./user_sub_invite_accept.html": [
    "6810faa09916d5b6b75fe61159886b043a5563ae0f80c84549dbf4776f3a57c8",
    "b3daa853f004dfad100f79080677d28e00407f5953952e79ba3e97851f6fc46d"
  ],
  "./vehicle_detail.html": [
    "42ee03af2be1e66f220c706f0726c09dd429bbc9774f40e8730663948e12f785",
    "ffd6305048fd642a4c4ea8ce2d25e5348356256edc2ddf4a2da792a1a62926c5"
  ],
  "./vehicle_info.html": [
    "41fb7e7fcc9f40484faf9a91e2e7fcb5b43e1fbf6735adb69341934efce6105d",
    "a56f6901d166753b72d87fd424fbd31b353a89237dbedbb70305fb199f5dc45d"
  ],
  "./vehicles.html": [
    "ec079b8a01f89c1c5af38bafec531b98eeec9f9135d063d24a07e42c9a6557b9",
    "d843963c6791aba6e3a3f51d41e531f9503a1aa49f8626f503fb69810e77f1c1"
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
    "6edbee40fb46947f8155d369a4c33f8fe9c4400668a5997bcc480c693391117e",
    "9604d6697bd005c6aaa1fcb469dab9d53111a9bda403638c74f4497c3834e056"
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
