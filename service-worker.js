const CACHE_NAME = "car-nappy-v55";
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
  "./app.js?v=20261120-v54",
  "./owner-platform.js?v=20261120-v54",
  "./vendor/qr/qrcode.js?v=20261120-v54",
  "./owner-platform-ui.js?v=20261120-v54",
  "./gemini-ocr.js?v=20261120-v54",
  "./staff_admin.js",
  "./staff_admin.js?v=20261120-v54",
  "./vin-search.js",
  "./vin-search.js?v=20261120-v54",
  "./fleet-check-sheet.css?v=20261120-v54",
  "./fleet-check-sheet.js?v=20261120-v54",
  "./fleet-check-sheet-pdf.js?v=20261120-v54",
  "./rental-fleet.css?v=20261120-v54",
  "./rental-fleet.js?v=20261120-v54"
];

// Hash the exact response bytes. The release manifest admits only the approved LF/CRLF byte sequences.
// Changing these files requires new hashes AND a new CACHE_NAME.
// Both bare URLs (already-open pages) and versioned URLs must contain the same release bytes.
const RELEASE_SHA256 = {
  "./admin_dashboard.html": [
    "6a5307df4ba0332bf4abdfe6c8f7da5236204ce87cf9e4a5ac76c5fa7b7d9950",
    "cf5102f2ce1ee941f08343419dbcc97d84b81c4eedb94293cfbaf9b2488dc853"
  ],
  "./app.js": [
    "105fe0f79acbe44e86aabd46984b111531315da321239fc1b6016c6402c21be9",
    "dbbbeeb5012a5c01208a345eacbbdc33f0b8715c75af69b0b8082f0652c2468f"
  ],
  "./biz_register.html": [
    "4ec5e1ca10cc92554971d0f72956f11e84412192036c406bd9826b57e48d321e",
    "c6ac86a9488aafeba6d7f744fb3c413dbe31d95b79a9efafe1b9ba7effc9f08b"
  ],
  "./car_add.html": [
    "62844c44f168491a4c8e7f333cb05cc1197448fd6d3cd930f89cf6881ff9b9c9",
    "7a14e3ee0a52b3bf336da3ee0d9e94b8f7d6bf7e435f8539cccca6bbe7a2265b"
  ],
  "./car-add-date.js": [
    "4458b2a5c43b9e5738b06441e53bdc187ad1cc4a666709fc98e980193dac8257",
    "75a157f6b047cdcf356d5381aa9eb56a64b7cae63d095b37f4c4a061e19db1af"
  ],
  "./change_password.html": [
    "0a692d4881f78095c14fa9ba474367becf5edec3d3d15cb86b24c81dbed43134",
    "67c43272db15266d20dffab2ed521765bc116a6b687305deb7bc0a9c7cb180ab"
  ],
  "./common.css": [
    "1e742610c0a6c3fc272b05267175c709c33315e84adecedab9dec0a93892dd65",
    "c8ed0e94d5de5d9e39f382176f2fc6739c1141540748b4d253b67e409c9c3824"
  ],
  "./contact.html": [
    "96afcea53d10e598d55687e2a6bed35649e9909997d292f45107e241f46ea167",
    "daa3be8c5e0dbc901788229b68d585d02455d22d3c07cc21180e74d47980717c"
  ],
  "./daily_history.html": [
    "a0de5c037eef6385045732abce52b492be4a9e0c49d51613aa70d18bddee9157",
    "e19898ad3a989166ee43a7085a4e2df7bede804805e6679a430215ef858b0a88"
  ],
  "./daily_history_detail.html": [
    "bd411fc913ee36846bc1cab50cd605c32d4a4fce78c9d4d8172d497412ccd9a0",
    "bf45f4c61eec451aefdda676a96cc5311093f41239c15638b6dc3cda76356d9e"
  ],
  "./dealer_admin.html": [
    "edb73cc0704b2b73d6dcfb32a79bef619b40c78f3d07b0ebdfb831309d704e09",
    "fb65efc778d62b3c9385500955fb5d58cd01ccd7ba8003c12c426dee969aa63c"
  ],
  "./dealer_home.html": [
    "476ee83ba61a5ee27711488fcb0a93ca46aa1924b18e48a856e6beeefdadb5fe",
    "f9a17993271f4d9b0a30b864258325e3a6ba1c4060a8b86ba6779e6e78a2d6af"
  ],
  "./dealer_info.html": [
    "8f73ad0a61afa42aa4b0c62953ca5ce88dd4f208c3f40c305cdbbf5af2227036",
    "c1aea158536f2d06d06e71047d6e0b12656fa5c6fbddbcba3aa84f9e44a67cfa"
  ],
  "./dealer_input.html": [
    "082a2e47c79c8f9fc79e3692ea04da2c40407144ffc7bc695d491bf5ce1f8829",
    "8dbc54f88aca7043d340b5492dadefe43aca924c7242af6d427e0ee50a07f0fd"
  ],
  "./demo_preview.html": [
    "429bc00c8c2636df97025b6b8a0916d9ff536757b60952a237226229e41ddea5",
    "e7a617b2e2f015fdd1d34f56fa8b5367fa3473ed61709d6a2b4618367e8ffb77"
  ],
  "./detail.html": [
    "401de924b094424f10e870af6d4da65115e70bb926cec973a11cdc87013f4532",
    "e251bb23e56bfdd8788894c6aaabc6d754b2c77387cf4f05fa54dd215f36885e"
  ],
  "./factory_admin.html": [
    "adc30acaa640325f76562841c37953cfd166f7c6c7dced27f78999522f87c450",
    "e2596a409cfe96164ee0fde7ce74685894d4a4c66af56705a13163817621867a"
  ],
  "./factory_detail.html": [
    "28b20a35d7e1b008d737c8d98afd5af37609904eda8efec792123db5e1fd2ff4",
    "522bf11ec96725ddd6c241a566db1a6e6488e4e3bad331437b5729f16b38150f"
  ],
  "./factory_edit_detail.html": [
    "1a0fb71f6bc0a0af790e8bfaba5bf8110a2bd15abca9b97608f8ec36bd42751a",
    "cd2318dc8cfc800618a2d8fe4f1b12136b81b276cec01ddd7f63129296aaf45f"
  ],
  "./factory_edit_list.html": [
    "026a951836087f704b6756a04d32aaff82230b3b5b7165dc74cfa393e5c13f38",
    "833f3d9774ffcbd982b858b981de051516951e1c54517c65425a6da6a6ebcb80"
  ],
  "./factory_history.html": [
    "47d6dc3494b12aaa3c3b5263499c6b56cf17e0bd637616b6322222bbf8619989",
    "d08640e1d3ca01e3b598d5bd85a078ebff22968b94a62fff887695adbbe5efaa"
  ],
  "./factory_home.html": [
    "3dc961755e6a8901ae2391df6712d5b5b78dafb588368a3be56fff7b9d43229f",
    "54ee8241c406caa1e476c65afc36b8c8f03c5e075e232cbea61fee925cd94120"
  ],
  "./factory_info.html": [
    "5ddea7bcf863ca383a6239451e5e87b5fe9065d430bed13ce77f00df18c354d8",
    "7b8ea469d89f43e58810b8470bdde0320c743d13084fd8814f73ba980ad8982d"
  ],
  "./factory_input.html": [
    "1d83d230a76d6adc4a93f3dd4361ba108884a970efcb41a152ff3c5112d144e8",
    "a278da8140a8e24f6b3803ec92f279d0c84df830da84d7e72ce4242e8604bff7"
  ],
  "./factory_inspection.html": [
    "1a57266ceed3af97ed1ac3e6862e2b11cc34d4dc4ba1edba1a768caee9bb4ff9",
    "22a077925906d3f189702689063ab262db6c6acc88f5f856ab7a2d938df6ffd0"
  ],
  "./factory_search.html": [
    "b0b9115d77817dab584498c7021a342728a13f346ac496a47f58c2396af13019",
    "c1bfcf2259c56a176e0af8eb9b46bd99a20c092e70d6ea5377a9e7638c9774fe"
  ],
  "./faq.html": [
    "21a4c621cf6a32b14da56809b4c8c1f51188334bea273d51b736b6f9593246df",
    "e0b6c19dcaa394c5d0c625ead446f63c606316227decd8cdf23912fbd787f0f0"
  ],
  "./fleet_check_sheet.html": [
    "37c1ce59623ed836865a01cbf877090e08ac665fb3b65a7b4a39bc04666e75f5",
    "5cdea725df474ebdcd679f946f3a0300c4e8067e64880095f2d7b8ef1228d7d9"
  ],
  "./fleet-check-sheet.css": [
    "2949529d5139af1eaf96e233b6b37aca030134b48598045ec54f078fb0a03f5c",
    "bb78956fa062dd763693534c4bece1c4625cd5cd4a4596366632bfcb8f216cc0"
  ],
  "./fleet-check-sheet.js": [
    "8065ae330fbefbb4060175650fa6945ead0597c3c8d8d5f928c04de5fa173493",
    "c56233eb0643972da7fce628a6661d0d25d8e37889206e4ae249400eb89da14e"
  ],
  "./fleet-check-sheet-pdf.js": [
    "3a14b1a58ecec3d0cd78bf27d5f4dce76c45b2716e4cc4595090e23c46edc236",
    "e69861c25682712c47fdf743d027fa1a8ee98f9fddbf5b86bd5e087c4dffa88e"
  ],
  "./forgot_password.html": [
    "0a644ca39cde215d80decab6a601b47b4436dff505b3283024175ec492a04ca0",
    "48b2c1adc79b77c23e7e44e0767383a18b6bf52a976ee80bdc8904be70ee9e89"
  ],
  "./gemini-invoice-ocr.js": [
    "6cc98c30bea1ee53e9d437de91aa8688e841fa124aff999d8b390425759b58e5",
    "96b4d24691a84ffd58046fbf7270e0107cfd4eb27debb9a0f33c9f98f32b03d7"
  ],
  "./gemini-ocr.js": [
    "9ffd58d7d2dc31140cf93f26285c1af64f6f3ddc9f7c4b4bd9b07217f765e776",
    "bdf43f4fd276473dc69b106a7da67103167b4c315ff21317e906574a109cb113"
  ],
  "./history.html": [
    "1bd3d1c848671eeb28c66b1b2c5c168a80ca2646022afc7ec0245c4c042bd6a6",
    "ac937c7b184e9d724e17c42540e5d66d71e5fd861f3b7276b317cd172403bae5"
  ],
  "./history_detail.html": [
    "799feb90dd8a564199cad4ca63f4ea70f9e224f467b5e9516309434054b9d8c3",
    "bc6c024dc3bdb40590b08a346533350f72e447492ce81c6d5b36071b42ee273e"
  ],
  "./history_visibility_settings.html": [
    "1de60401ce0640023c0ef6eebd5317560a3818c3509bfbc017ff24de2d6df51e",
    "860c40cca764bc7ef5c2b9493f147c0cecf302bd5e7c92a19ae1ee5ff5a2f4bf"
  ],
  "./index.html": [
    "8b16532bec15c4c09343446378e74fbeeca9ba9de5893c6f54d3800d87b08d88",
    "ab75014070011b6de90aebd263785de44ceb3d8e2747167743fa8c116739c79f"
  ],
  "./inspection_biz.html": [
    "b6bc5bf360c038286352ba041883c2bff0317b4821bdec9914ee1850b3e17ae5",
    "c28bd4d20f7bc8155dd6d920f323735b5bf353aceb906d93422fff4917858b62"
  ],
  "./inspection_user.html": [
    "92c1465f5f821223c48b8337b5983c5da7dc7f015089fbac76f3d4a2b6929bd2",
    "9a701c69dca4432d09eb177224af3dd629eca6befe9baaf7b1a850c6b208b3ed"
  ],
  "./login.html": [
    "24e8e4f4e57b8a69ae39872d1940a9f1657c83640656fdfe7544955d0a176644",
    "c21cb211dd807ece9a233cb7581b2c29d52f004128ed3c43ee5e9ebbd7631a25"
  ],
  "./maintenance_input.html": [
    "45eec53d95e592732390ac16043d0ad46c6e538e47fc86856542cf2982b92d49",
    "59744a6948e9f600eae2dcb9db4765ac13dbf4051a48b0e6198ec0669f5a3211"
  ],
  "./manual.html": [
    "81789afe7b37d1029008616a3690a76c71c8ccdc9bc3d30f4493075c0a0decc5",
    "fe4206b2cafe2865122c3cc61863ec2e13602d6383ecb1ed9238d32a5dea8918"
  ],
  "./offline.html": [
    "00d1fbde2435df8730aa3e26ffada2cd22fd42f6bfc07ce047f510ed7abe294a",
    "01ecd51ce20df12d40eeffe5c31d87868e8e9a97d67223438c072ece6537d1c0"
  ],
  "./owner-platform.js": [
    "99c6f191bbcad58bb0a804960f988174d577f5e9a9bfb7b4407e04dc52ea5979",
    "f4d3316cdfe72ea0ed6e753ad74f758eea10a2e4afdde81f48a5cff96fecbd29"
  ],
  "./owner-platform-ui.js": [
    "69467889ad36f8e01eeb856e9a8e988420041e8dea162a0402efe24538207421",
    "c5ee33ef941804d59d83da5cccc8b8e6813a6c3c237c16c4e87c68e092dcc771"
  ],
  "./privacy.html": [
    "02136f82eed0382439380146182e1e3cbdc47b1d9100c89fdf500ac03de3f8c2",
    "54e4b0a167e7c3c54e954b7fdc21da2f1fefa828a54cf4520db8cd9b3c2ca187"
  ],
  "./qr_scan.html": [
    "df6be6737a228c466366a6b0d0c18187de61b089a44168c443e9c5c2938eacee",
    "ee301c4b8bbc41df3a5306b8b825d5f86e786e70cc0866c524a91fbf759820ae"
  ],
  "./register.html": [
    "793680fdbbc583c1e27510c656ecb9b2ef18c5514a6e6c8c1b97d2bcfacae011",
    "f394722e4d7ae6f421ec9181420cc4d88047d28b745e921e34c5cc9dbbe2b4bd"
  ],
  "./rental_fleet.html": [
    "790170c9e5caf4e42b54cbf4bdfff9ec4e5f19d498cfc4b1dd3bc6c7cb7f78c4",
    "ca819fed8ed63d9e7368b8593030466b2d2168c02344f39db7f6a53f4cc1dd60"
  ],
  "./rental-fleet.css": [
    "34dfdbb7fc66e6848a6c056fa266355bf7cbe0e852e48c57674bc01bc08e29c7",
    "6268621eb71fe95d829909107753d901b53f8bee3600362dc0b244eb0ec2d847"
  ],
  "./rental-fleet.js": [
    "1c4bced9ef00fdef0f57f1086491aae8f5ee28b77e67868295538dffb87d7c37",
    "a75648a7ce1b84488aaa310b3f364c150b5450797bf868c40cc119f03d98cd9b"
  ],
  "./reset_password.html": [
    "a4dce5ad5630a2f6f436a015187517e72017a0501f2d7cb5e807a37cb3639261",
    "f3238abde94397bb71a9154c2f37de64a1c9a47a5fcd2927493efa9dea4c7bae"
  ],
  "./ring-media-import.js": [
    "640d189cd264ac5b9060719f6eda573680b8c65cd6344e44c158e1aec89dbbea",
    "7d6821ff2bb52c70e2ca52ef2254e297300e3418f1aec160e98cc708d39308a8"
  ],
  "./splash.html": [
    "1824e7b3cf8f68c68bfe6eab35eb118bb5f25343454081821d3fe87808931461",
    "1ab620a9ae9f99ee61fa73770e37d917947551894d8336289c2a30412e35f3c7"
  ],
  "./staff_admin.js": [
    "050735c31339e28d0e2da85fbc5be1f155785453c1dd04a176c2d960f0c7fcc3",
    "d2a67581dbdbb291e68e0bc6581941c95b666c84863097c9b449c9324ea4bd80"
  ],
  "./terms.html": [
    "3b607fe5a48feb1e31bdc319751f206b983e085614ed1274150f1a844b81ba19",
    "5ee8898205c8c8e0f45cc0b5c184dac89d756a48483cc2cede489e8498191c18"
  ],
  "./theme.js": [
    "82e4179bd9d4dd92ecbe26acfb589a5d9f48d9c9d93a4a1842bff0c6843cdd01",
    "bbdd7054d8272c9b9f726f96cce97058b55f77549fe00c763d43b80977d12920"
  ],
  "./tokushoho.html": [
    "c1dc9c5e88a8c7deee856ef5e424ae99a6ee2247f7564e18b93caa7655061a7b",
    "e1cbb09b9a46b6603bf99feecfa0dfa59dfec0acba5ec747b3b24d91f0ca5a1b"
  ],
  "./user_detail.html": [
    "6e073ae9131e67a9c400d551cb6e4f2a926f7af586fe41a7f40701f8c5c45311",
    "81d5a5eaafec46a95a9b81e0c2a891d43912702f0d394e2f1e16c3101c50e6a7"
  ],
  "./user_fav_shop_edit.html": [
    "43689d04104697281ffeceedc2fd4804a109ba1563bcb2e4d7b6cc996f253ac1",
    "72dc7e1873929ce8d617b3cacec95621b13c80e231d31d5bb7c1d0d960fb53b8"
  ],
  "./user_fav_shops.html": [
    "45b701bab05828918f4ed60af419bd77543e9ea4a4be5d6eb6e04ebedadd7334",
    "cd02cc459e7acd12c6522dfd5a8168b889232e81fcc744a5b2f6b9d2dd9fc0c7"
  ],
  "./user_history.html": [
    "795bf318ad360f05c9c1a716be315bdf490ba34b1be0a188c252743f16eafc09",
    "85ce191f7d237110d2d8739d268d2fc22734003b3b458043ac775fd79d894df0"
  ],
  "./user_home.html": [
    "301064401cac4abae8c8019b79d721f097c7baf20666800c436be9fa50399a36",
    "75591419570dff29f706ef5c91ff611048a6a8f32bc35545bff6a67770771c51"
  ],
  "./user_inspection.html": [
    "089a31ebbd1505ac14dec5655b9c7280ec49f2d1ed3d0b17abe3d1b5c5a93903",
    "f558c677a8c8347f3f2c3606e7754e7c0154a5523bfa96ebb8c414f2a9f51187"
  ],
  "./user_inspection_history.html": [
    "ab5697e4f7fe24d8441ff65e8352865d5eba0073cc1745c743aef5872afd8e9e",
    "b94f48246f2a6544cc2202a0b3af8ec8b5100136fb69025df0386c88bef3639f"
  ],
  "./user_line_callback.html": [
    "85f8e7bb93f9e50c526ea06ed8ecbe7de6ea9877421935ce40ae21746e101f91",
    "d4097d3e9209455477be6ac25501bfdafec82bbb5d08bc777e91f746ed0b41a2"
  ],
  "./user_login.html": [
    "4da05a5938a61de9021337f35748e2d9f14747dcd35decaec752494f437d0104",
    "565126a078a1dc55723eba50c097af2159f2af2e35351d7269a8ca4624f26013"
  ],
  "./user_mypage.html": [
    "8e3adfb8256a62d58978bd564655416fdb02c086852695ec154ca880ce65d53e",
    "d496bf721e49de91d0d47b3aced4fe8e1fd483c47005e5d1ade2769bd9b94e5f"
  ],
  "./user_past_vehicles.html": [
    "0dd44024eb53563793466efbf1f092d9ad3d00f0176b7212fa6223c5b8c53090",
    "777af30c8d0978a369644279e645078ce86d38ec6a6be0b118f5381fe9e8fde2"
  ],
  "./user_sub_invite_accept.html": [
    "8789d2665260c1f46dcc2b2118b3d191890588a5ca66f394d834e88a295f8987",
    "8d0a13f95845dfb223a2e92106d763bafa3b849e0dacf349bb5ea411f60fd283"
  ],
  "./vehicle_detail.html": [
    "108a064130bbd404a7b37150a3739b3d7e1d6c8436e76b82409c1aef36f67f1a",
    "5b5af722ef8b822e34c65b8591511afa5ee9dd06c4d89a0ee1dfc5b822578001"
  ],
  "./vehicle_info.html": [
    "3f59615c2f969beba49decb6c6986d87e7fc104e7775e44853accf2b4428dbf9",
    "63b1c96310dfa38ac26bd8d02f135ac8e885b26dff5286adf1083a42f177c37c"
  ],
  "./vehicles.html": [
    "a8b6733e12f840f22749273ba8cd9dee0aac38bf596ec2c5d021adeb0225975d",
    "c821a4d150bea96aa019adcc4f06203163afbf4183e7b6c41bddbbeb053a0037"
  ],
  "./vendor/pdfjs/pdf.min.mjs": [
    "11c8ed9baf31ed90572cffefecf09fca3f6a6a4e17eb5b5fc12a0b4d964a8376",
    "410b149eae133506e6c3f2764e95d5d444fa706bbc450d6e63060ea7605c707d"
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
    "94510f3fc75575df45d06e48b39830b9d48e477ede7b5b981d38ebe8f234c368",
    "fa0ed7d9a806adc69b87d02fd79ce761798eea264ad8236f5d5302b85b8a38a2"
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
