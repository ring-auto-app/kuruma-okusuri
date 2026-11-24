const CACHE_NAME = "car-nappy-v62";
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
  "./common.css?v=20261124-v62",
  "./app.js?v=20261124-v62",
  "./owner-platform.js?v=20261124-v62",
  "./vendor/qr/qrcode.js?v=20261120-v54",
  "./owner-platform-ui.js?v=20261124-v62",
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
    "9e28a2abd52d72c62823637c9d4e61a80113c8aa813cd18df728c46f1a895cfd",
    "f01d0fa7c3bf721708c3914e4515bc7953a76750e2c5de1f0d6ba0fc7e4fd30d"
  ],
  "./app.js": [
    "eb8e6f3c7e0c4e08de53a2cbffb3fccc7e29b99b05219ec46fabf5aa47abcf45",
    "0eb2ebca781b1348573b43db8cbdd67fc819037b565f6ff0e74412fc0a48ebc5"
  ],
  "./biz_register.html": [
    "3e30c33581d2e3a82b3d36bfc59adac44fd9bd9a983b046ccc2720d607632b54",
    "d2378709d8d2dd55bc943e746aaf9864302d7b6b6db59cdeafb5f1a4738e053e"
  ],
  "./car_add.html": [
    "aeff56e34c8e9eb811bd9de53a4221b35112a050642c130352eccfd46f60c2d5",
    "a43ccb656c70c258a540b90bb80d686ec057e12238b9f811ff9824d3a4800b40"
  ],
  "./car-add-date.js": [
    "4458b2a5c43b9e5738b06441e53bdc187ad1cc4a666709fc98e980193dac8257",
    "75a157f6b047cdcf356d5381aa9eb56a64b7cae63d095b37f4c4a061e19db1af"
  ],
  "./change_password.html": [
    "e1a67a35f9a79964196fa1d08044dff03a3de4f0fef240c7502e7a4d8a0cd549",
    "4a3c8783c273afdf4a8dd7621f5a5b2407507a2b0f60a98f3ab322b397ddb1e1"
  ],
  "./common.css": [
    "6db15909651d21085098b5de47c9507944b95f5136c2ec4431010b67128ae97e",
    "009f615a1f41b891043639abe30dcb814139e1886f7ff7f4a4e5b75397e30174"
  ],
  "./contact.html": [
    "f918ae4ee7593c6fdb5cf6babf803703865327e842efab96dc869a1ff5c5679c",
    "c9713c391a20d1e44450de7067b703dc1892b68c3b9fa6096efce1310d844ce8"
  ],
  "./daily_history.html": [
    "075470afeed85a0d5d337976c1447312d7bbdc129fb6d66ddae5be434529bdd9",
    "846b672ed7d38487edb8c26ea8408a8bed82655d5d003682b3af7b51c0b8ed70"
  ],
  "./daily_history_detail.html": [
    "34806f3d1fcaafb2f31af1ed6f00aec20d40230e3adf117f26b734c43fe5e590",
    "0f3998ab7efbed97c6cce8041f81b7979c429ae8fb8c136cdc301022beb2eb0b"
  ],
  "./dealer_admin.html": [
    "158a17a10aee3817f67f6cc6a8b5f778f0362c8595d3e0a46c516fa976f1a80d",
    "ed752716d0c4d6a31117a2db26302fa4ea8420152d8eabec2b3b2daf5607c9bd"
  ],
  "./dealer_home.html": [
    "dee2102f5fcd9e3298f310405ac27005496dcbbd89b4aa2373164565ac947b36",
    "65232601a3f4f857a95cc24900948506a063000f1bd89ec116512a96f926c03f"
  ],
  "./dealer_info.html": [
    "c1aea158536f2d06d06e71047d6e0b12656fa5c6fbddbcba3aa84f9e44a67cfa",
    "8f73ad0a61afa42aa4b0c62953ca5ce88dd4f208c3f40c305cdbbf5af2227036"
  ],
  "./dealer_input.html": [
    "883b00dbf4e9e61fd4de55fad2f52d133afb3b7bb296c1db1ed005927a0ec248",
    "f2eb0c44ec41916b8aa0438c17f1a7095744a64dbd4141cc841af5138b6160a6"
  ],
  "./demo_preview.html": [
    "0c5bdd38f3af2f12b8d15c6f2eedd0ea56e353d8f1c4805eaba78e95c1a21028",
    "136c0bcd2f6c8792a7460ade4d79344552bc44fedd7e13838790318c5aeb9941"
  ],
  "./detail.html": [
    "0cded62352bd9d219d3a57ed9391e3a28db14c80f134d82d86726d6630dd3ca9",
    "a39733ddda75d3a562eaca8fb53180a6be324d4d71cf3ff33eb57f47c831a905"
  ],
  "./factory_admin.html": [
    "9d1401cfcf3ff0559bd0bf1fe5bd23bbc5e5d66a00046ca82aaf39b501d439d1",
    "873a0624a30f145f86007a38861846537bee5aeb7f20f51437922acdf3107da3"
  ],
  "./factory_detail.html": [
    "5e487ed4b2aefbee552734ebc76dc8d60dd71c25ea42e7b98f2dc575de81fe1f",
    "1c632a2c788f728e1e8c6273af2e6645515b38aebd5154196ab70e20eaa23862"
  ],
  "./factory_edit_detail.html": [
    "8c8a6be3864823af562f688a61bd666baef592dca7f45591e5641af316ff8d2c",
    "cef78fc2100a562a7c287f64d05cc24113c96417845232a3f64ce6a5f3ecbc04"
  ],
  "./factory_edit_list.html": [
    "8c4d5dd24328b3ba209909eb424fbf155247eb8190edfb2b1021beb7468d8520",
    "e8e62c769e332fe505c711a058f57f26c117d74a2ff916d5650b708325de1ff0"
  ],
  "./factory_history.html": [
    "3bc90d6435898177cd04895b056cb42c9aed3de9decb40fb63a6bed2f1642f46",
    "c5d2a81a4b183ac6fe08a7199d3ba5ef098405a533d0b036b6bac5d0b84543f9"
  ],
  "./factory_home.html": [
    "42c5238aa0c5473f48baa91e62afae3157253f9ce555a8c607295028712ff133",
    "1f68cdaaaf6077019948eed67784e4fe3419eee24119043dc3f6e825660cd3b5"
  ],
  "./factory_info.html": [
    "a2c1a57f5458a3dbbbed3f8f4ff0cc4ceec3fcc7e21be50de7c8f796389ff3a8",
    "0de78c7b1ba7ca7256167198879f50b463059e74be7796f0492d7268e31cbcfc"
  ],
  "./factory_input.html": [
    "a258c7579a682aa8c2ea4dd1492b25d50ee199101834ec8b83bf8b3b3b2db5c6",
    "6c3e4e9e0f198fe177a26a5dc5cfc37d86b91bbf53cc929e15afd42080a24efe"
  ],
  "./factory_inspection.html": [
    "22a077925906d3f189702689063ab262db6c6acc88f5f856ab7a2d938df6ffd0",
    "1a57266ceed3af97ed1ac3e6862e2b11cc34d4dc4ba1edba1a768caee9bb4ff9"
  ],
  "./factory_search.html": [
    "4102aad945bb9291ea4c807e323083908b693b6b3b7c94f612251655d524d8d1",
    "3912aec0bd45d65e66b482e14ad50691239e68167760f61784da52e7e98b7255"
  ],
  "./faq.html": [
    "7a498d099645a1db0447e6c842b860014344002f4110e0222ee58d168ed4ccc2",
    "ac9189d2f2cadf3e44779e2198ff5c9d903e99addf0852cd5374d441c4e6a137"
  ],
  "./fleet_check_sheet.html": [
    "7e1acd962db4d41015dd8cd379e8408e9c2b61678e4c6d99683efb1a203d79e4",
    "b17a3983841f5a9fe196663e0fc39dff65f28372cd26f44a1e986eda9da5924d"
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
    "d7644a295c9697df0003d2f1993b2d2f6a3cece754df7477b5be9716d11e7071",
    "5f6409717aa3fbe6f6ec1813bc8c5869a06a23ff54a45d9fc6686991a766b90f"
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
    "af0d1b6d3079f12f79e838807ad478e694074a041f263ca01eb34d48dc20013b",
    "cc821e1a0af999e4cddc7e34c458b9f73196119a5894cf6ebdf2343a25174415"
  ],
  "./history_detail.html": [
    "87b416a719aee7a5a86103479a8205ef676e5bbbf889d501fa5b694fe2ade4dd",
    "7d09c45e5df6bd5ef0f98dab814d27fa76f94716cb76146803e96bda21e5e401"
  ],
  "./history_visibility_settings.html": [
    "099a7a84c7741f78dc8a8ff05ed66ff84453a41f13e6b626c2c294b708522e08",
    "c836fbca38b8c81ed2695e6f0a64dfc178436e73af8bd4bab43b7704d45a54c7"
  ],
  "./index.html": [
    "23b6e3baa3b653906d201d9a1aa5d8378cb3acbebc3a134d1bc6e77001471772",
    "c042f2a9e7499a7b1b16f38c7b07c4d2c0c0ec68805e677dd70c8256c75a614b"
  ],
  "./inspection_biz.html": [
    "19e0ece9f646cf33739d5882c709e9536c86ea1f402ce69c3a2d2409b9159cd1",
    "a9b26cee32d2226b50176bc97d7f19ea279d1bde49d4f70d15f66acc0bfd8df4"
  ],
  "./inspection_user.html": [
    "f415319690010dc3f28f441ccc267846e33f0cc807f8810c1fd8dc6ac1b35048",
    "20c1dc6fbd3fac4e49bfd0bd3c3d607bea2fc3344c26e4f3608f4f2ad1cc744c"
  ],
  "./login.html": [
    "15b70affb0340425178ab0ac181c6f776eae630095dcf2256f3e90daf60ce17c",
    "72561c99c8542e56ee3a174a3b3270d9b70ac2d1583466505a5ddee8a01a50e7"
  ],
  "./maintenance_input.html": [
    "856f40c7a08c6256369b9743e19b539e292606132d8bca3c9c92b3bdc6b8da7d",
    "b00822b732142721c37b184e96473171401310a79edec24c05950957d9a1a930"
  ],
  "./manual.html": [
    "2e0ea204745ad06d10137471904541d754b2242a471f94b46d223ccac0747784",
    "c5da42149d8243a3fc87ca3d22d8a0090268085fcba3801a5c6d9d7a0acc12a4"
  ],
  "./offline.html": [
    "01df89deb7151f199dbf7e549c49ed985c6d29199ec0607f41203763bbdc95d4",
    "7b4329d7734b72710c9af8ece5c248d0797d7bec81cd7394bfa00e3a1b5eb16e"
  ],
  "./owner-platform.js": [
    "f4d3316cdfe72ea0ed6e753ad74f758eea10a2e4afdde81f48a5cff96fecbd29",
    "99c6f191bbcad58bb0a804960f988174d577f5e9a9bfb7b4407e04dc52ea5979"
  ],
  "./owner-platform-ui.js": [
    "70338b3408464b2d0b6c87089174a5d2c457a7b206ae40e9ae9e8bb7c9e1aed5",
    "1674ead82b90ad21ac9e657235882e7a6485c25ec994bce02dbb37c2fcda0edb"
  ],
  "./privacy.html": [
    "6fccc0b18f5336847af4a43ed62f0934f1ca405a2a27f86ca7f4079eefe480a7",
    "0041a2021c65bdfce35eafaae64959314f96e138d044a3ded5fdb2f2c330b1c5"
  ],
  "./qr_scan.html": [
    "1405fbff38a7891a0b8a04dce6c7accca98af058ada2197fe267aaa708eb24e4",
    "a3ac6bda23c032e7d15cb1f1add191a5afb8d5ee694bf44fe89c3c2a4a85398e"
  ],
  "./register.html": [
    "19a0ca5d6803d4ba90895e8d1e8cf697e01e7061e4471ad270036834612617a1",
    "c406d24b13a4307f5979187441536c4da239beb49c6cb58cd64e956138395957"
  ],
  "./rental_fleet.html": [
    "2b6feb53a74e62c35aee60a92a27c4888d35eeb4432cfc7abf0063d8b398dac8",
    "0854a666d4d929280db89326d110aa374a5d3f9028381474d6dcbfdab01138e7"
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
    "a13c0e370ea238b539a6b99aed5e40832299458d2cf7d18d04241e53278073b2",
    "14f635928ede70a9db422a4cdb3c4bb386fe3bdcdb17875878a3aa96db4559af"
  ],
  "./ring-media-import.js": [
    "640d189cd264ac5b9060719f6eda573680b8c65cd6344e44c158e1aec89dbbea",
    "7d6821ff2bb52c70e2ca52ef2254e297300e3418f1aec160e98cc708d39308a8"
  ],
  "./splash.html": [
    "52d1ca894ca722c8b2a2f227eee25492fecd30f878f719b0f3ff0452a03f713e",
    "c3468787b1a24604513042303d5211c324e861331e24e9e990e1bf6c74f111c4"
  ],
  "./staff_admin.js": [
    "050735c31339e28d0e2da85fbc5be1f155785453c1dd04a176c2d960f0c7fcc3",
    "d2a67581dbdbb291e68e0bc6581941c95b666c84863097c9b449c9324ea4bd80"
  ],
  "./terms.html": [
    "6c6d6c090cd95c34e5e383d428745af9281dbfe52d3728139123fcb6baef0620",
    "89891fe446eeaa6d5a640faa552a4e8b4fd6aceae3fbff83e006e7ad25328d02"
  ],
  "./theme.js": [
    "82e4179bd9d4dd92ecbe26acfb589a5d9f48d9c9d93a4a1842bff0c6843cdd01",
    "bbdd7054d8272c9b9f726f96cce97058b55f77549fe00c763d43b80977d12920"
  ],
  "./tokushoho.html": [
    "88acc16c14b192f3afe5be0c1f3ab82571f1e408157c4e5959ecd9a48757d825",
    "5f0673449e9a1fc95b0a1a6d98c58384f342df7c839b02fec11bfab9f2755e79"
  ],
  "./user_detail.html": [
    "b1dfd1a8e1aeed7addb4788ab37c62c2a7fa2a40da8685cafca270215afdb694",
    "e6f83e264dcd5920850cdeb949a8c30eefef96fa74233bd2c7bab86432f6821e"
  ],
  "./user_fav_shop_edit.html": [
    "033f76393f307cdc56db4b897c695ee807b77e37452d01504e319346f303a346",
    "dda03d3aae835e942faa1deed187dffbd6edbc5fa1069ea8e036895c4b239f39"
  ],
  "./user_fav_shops.html": [
    "874a9dfb400347fb8a4503422c2c39a464dfaad1a83af0e67d9b52363e16cf3a",
    "bedba708d562aa6882169da6624144093c9b29d9af121dbb68f7691f6e1ad48b"
  ],
  "./user_history.html": [
    "168714c85b89f0fd2517964ccb3b946391740c7555aba5bdc4fd5585c7560aec",
    "b7bd6e437d787f9af86dc90a69dd35ed89b3300f0f8621f947c3b48314a8d131"
  ],
  "./user_home.html": [
    "de9f3b6f88f049ef771effc0252576ad8d22e117a2586fcbd9b17da2fd44ee88",
    "76358e57a947c20d33afb81590650393197ee53296eaf9c847c5f003ac459fb4"
  ],
  "./user_inspection.html": [
    "f558c677a8c8347f3f2c3606e7754e7c0154a5523bfa96ebb8c414f2a9f51187",
    "089a31ebbd1505ac14dec5655b9c7280ec49f2d1ed3d0b17abe3d1b5c5a93903"
  ],
  "./user_inspection_history.html": [
    "cd55f529de33b0af3b012d803320fbe5c49d3618b42f8252dd798dedce6af876",
    "e2efefc17e85c0beec2a8c8b41420c0b32f20abd62a715af7e6fac76840a4caf"
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
    "86aba5947cf207db867ce0ba98fc7261d496dd093f9c858b48ff8e868b8a8ee7",
    "1bd7dbbf15261c8ebc546126e12070d26e66f3b2bbc332c51c8ce518da29d03c"
  ],
  "./user_past_vehicles.html": [
    "b2d2bb67900656262b4cd406ec5b916b3ab2dcce46493baf19faa5961df47ed3",
    "2d61d9750b9bd7e00578fb7976311b75d14fa23323e0eadca6b9bf670edc9aef"
  ],
  "./user_sub_invite_accept.html": [
    "6ae0038d0d08733c1970641ea850fa03f50cf7340455c8a10573c055548515cb",
    "3ff22f0c2232248c9e510c8b3b855702020f605d9592db6e0ed8e532dfd5c763"
  ],
  "./vehicle_detail.html": [
    "6bfe6439259e476f8496177e7a05ee588bd147b4a2b90a022cef75967d1c6902",
    "9e9dec971ae847f90b30cfeba12238adedb6d7fad2e78778245309d54c98d0d2"
  ],
  "./vehicle_info.html": [
    "d0770251d7e376d64c0e7e0b7846823443452c4e46c1235973dcc5afa75ea1bb",
    "ecac2ae049092d8074ea76e2cd9d98474c27e107e186161034c5e4e1dbf3edd8"
  ],
  "./vehicles.html": [
    "20ad79a09e8867f11cef2dc45e81bfa62c432b1a317c6cf8492c946d65408b6f",
    "0ec7bfd9cce9c89c07766355fcb604d9f0f58a586f4b0529da818dbf7b5f148d"
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
    "c7cfbeeda65a3bead3640f0f7b82fe8829b91e31d3bdaa0f89276dfe86e7fe97",
    "c14a91f795a320e688c256902896c1f499d33246bf22637c882980176972f7a1"
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
