const CACHE_NAME = "car-nappy-v54";
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
  "./inspection_user.html": [
    "7a6047f5082d630c7fd3beb121abd743e576419f235177a301ead20b0b6a76c2",
    "1d550b03f51fc24e8ad39f85cbb18bf9cf6d5ecec48557792a8f10d0fe794f31"
  ],
  "./user_inspection_history.html": [
    "de1dcd60064605cf2bb43f54831f5fcf7f0434649cd3fb7fafe4d149d9f76af4",
    "1e9e03ad797fc6c95b3eeb72e17677fa5211fd5da188a5cf90cb8dfbb01d8b8f"
  ],
  "./factory_edit_list.html": [
    "13405ae339f6c76c746c7ee981426d94b9704c5dc85304e67981993e189aa01a",
    "0c29f421e261bb448a9c537ac9f4ea693dbee10f28ce4ca41df5377e8ebcb65d"
  ],
  "./factory_history.html": [
    "d393ccecbe7d7944de1de69c0f28a37d8e0c0e7bdd578bd8c83489c14128d60c",
    "15222ed31048a164f98698f839518bfaad5e6ed9761e4f741b6f73c58adeecfb"
  ],
  "./user_history.html": [
    "a267246d606a8fedb160842c28671bd505fd8ea224701d5a1a1b1df132110e73",
    "134ea09cbc8ebf619761798e724b6008c473ba2be219da256e3f6dbf743ac0e8"
  ],
  "./index.html": [
    "97b57e41fb10107f0bbcf5817a3ac9b0dc8012b32d4efddec53dfd2f3537e510",
    "0c564ed2797a169458e0cbb456614e71898ce29162f7ecb91ab1b7705a93435d"
  ],
  "./splash.html": [
    "ff20bcccfe0850c34e5197338b76f8f1e1aa885e9cea711b63df89986bc64bfc",
    "984bd18e9a3170d81a67740260a5ba1c2d13b9d99604fb935ba805fb28ca136a"
  ],
  "./offline.html": [
    "01ecd51ce20df12d40eeffe5c31d87868e8e9a97d67223438c072ece6537d1c0",
    "00d1fbde2435df8730aa3e26ffada2cd22fd42f6bfc07ce047f510ed7abe294a"
  ],
  "./login.html": [
    "17f7403e7eb3dedf4570410ce9548595d6d7c59ab2a4566d76ec6189b8c954fd",
    "ef4f1239db7e2804a2fa2669816d9f74eae3f108e4bad6fe444caf833e781149"
  ],
  "./factory_home.html": [
    "bc91964248d7ddef632fab7a9d5911e9480037e5140b3c5decdbfe5f0a704549",
    "180970ab27f4b354cc1c6f57b533410ee125811c7ae7dfa1d224987d1ea4e689"
  ],
  "./dealer_home.html": [
    "162a9747223794b83da46bad10d257e9c17778703dd14ad2d11420c564ae8302",
    "013ce84253198d538ea24af035fb4f4b366e332d310b840a744b9cbb41dfdc7b"
  ],
  "./user_home.html": [
    "af9ca9e0e1a1df41917f2790eac45899958c73f91e62bb7083f2826a8e2beef1",
    "7aa0f49215eb295b29d351f303098e4fd3bfda703708cb6e90974175cfe343cd"
  ],
  "./maintenance_input.html": [
    "f4ab70d274bb5f45d84e59f99e6cc18c892035d27d752329cfff2b1275151fd9",
    "52da421bd37ed1dcf29e0c42294c8e0f904e98157ee37eb3da79511243348ca5"
  ],
  "./factory_input.html": [
    "95083e2c9a6fbf9b3851c286a630115543ff10f9471c2cf4bad7345a93d1a0e6",
    "357bad60508a60cadc97ea9d578f35aa7ad3a9a424d9e4b6223b13887d9467f7"
  ],
  "./dealer_input.html": [
    "e4f0bad2f10103946c1130894d8af10cc931e31b94bddf5b72446690d8f32f90",
    "6b7153233e560058101e901db9a6d0ac4ad39e180f9555c98ce14de26590910b"
  ],
  "./car_add.html": [
    "90782680d3dbd4be1a2033fd156fdb4da1a2923eb9b5a4ef10a9ef7fb33b07d7",
    "998be18344221456f826c94a614cde9e4c5d5dba8598c41102f063d10b0397f6"
  ],
  "./vehicle_info.html": [
    "1683162cf065fafab21d7608bbc7280f424c4107d38be14e8a4c380f4ef2d3f7",
    "45578b6f85fc31321e13c6b49ff73d10f480c5fc4e28e8bf19e803416b50408a"
  ],
  "./history.html": [
    "c3ce1039beac0053ffdecfc2cc6e838dd9463de2d41ff187af1c04178b6a488d",
    "0f93559d582ffcef41fde23c7336676bbfed47fc40d8178640289b2b162cadd0"
  ],
  "./daily_history.html": [
    "3503d75713f40c962ec4a7646a865de41dcf7fbe1659c5e02c3d585132dc64a6",
    "47a5dcf077da0f260da54c8c14adcde2ecb0d5532b5912e0180d81b7a8471cd9"
  ],
  "./inspection_biz.html": [
    "9d609bf17ec4ae9949cb138f93d237a675fb232b739c4dc23ed203717b28428a",
    "5d6fe6643fa5cada679a8f4ecb7ef9c1b4ddc5855c4846ac69fbe8d07edf95f3"
  ],
  "./vehicles.html": [
    "795e9128b9c620d80f6870a1aeac066a1b04586268e10a3926d7ce74b75fc3f9",
    "47f2526fc1b10dfb6a19b98ebd9ccd10f7d87fc8ec3f2680dd4195c1a83cdc18"
  ],
  "./rental_fleet.html": [
    "2ae5bd15114da63c00c5df3bb1e8fa5cdec58b3c988d6380710886b19c881bbe",
    "e781316aae5cb87d210f1623522707211990067a3ef08e6dcaa0703b2a08e5ee"
  ],
  "./rental-fleet.js": [
    "a75648a7ce1b84488aaa310b3f364c150b5450797bf868c40cc119f03d98cd9b",
    "1c4bced9ef00fdef0f57f1086491aae8f5ee28b77e67868295538dffb87d7c37"
  ],
  "./rental-fleet.css": [
    "6268621eb71fe95d829909107753d901b53f8bee3600362dc0b244eb0ec2d847",
    "34dfdbb7fc66e6848a6c056fa266355bf7cbe0e852e48c57674bc01bc08e29c7"
  ],
  "./fleet_check_sheet.html": [
    "7d50ef61bff51bfe94669c30144cbde4a0471b4f1e0f6802ca37ef015bd13793",
    "22fcaad235f744f63fc1c441ed900a36a9129b559d2d54a17e516513048322d5"
  ],
  "./fleet-check-sheet.js": [
    "c56233eb0643972da7fce628a6661d0d25d8e37889206e4ae249400eb89da14e",
    "8065ae330fbefbb4060175650fa6945ead0597c3c8d8d5f928c04de5fa173493"
  ],
  "./fleet-check-sheet.css": [
    "2949529d5139af1eaf96e233b6b37aca030134b48598045ec54f078fb0a03f5c",
    "bb78956fa062dd763693534c4bece1c4625cd5cd4a4596366632bfcb8f216cc0"
  ],
  "./fleet-check-sheet-pdf.js": [
    "e69861c25682712c47fdf743d027fa1a8ee98f9fddbf5b86bd5e087c4dffa88e",
    "3a14b1a58ecec3d0cd78bf27d5f4dce76c45b2716e4cc4595090e23c46edc236"
  ],
  "./vendor/pdf-lib.min.js": [
    "0f9a5cad07941f0826586c94e089d89b918c46e5c17cf2d5a3c6f666e3bc694f",
    "e407401e1d27c95af336de6c0583ec048b7decf4b9c3d60f14de0f7b5b0e4ecc"
  ],
  "./car-add-date.js": [
    "4458b2a5c43b9e5738b06441e53bdc187ad1cc4a666709fc98e980193dac8257",
    "75a157f6b047cdcf356d5381aa9eb56a64b7cae63d095b37f4c4a061e19db1af"
  ],
  "./common.css": [
    "c8ed0e94d5de5d9e39f382176f2fc6739c1141540748b4d253b67e409c9c3824",
    "1e742610c0a6c3fc272b05267175c709c33315e84adecedab9dec0a93892dd65"
  ],
  "./app.js": [
    "6337d8adec72c4984279a4da1aae093459de731d0d7841058554e793ab67bf18",
    "66e37510f6d8668d40c4e6bd752068a15c8c7bce7596eb5adf31922d16fd4f1b"
  ],
  "./theme.js": [
    "82e4179bd9d4dd92ecbe26acfb589a5d9f48d9c9d93a4a1842bff0c6843cdd01",
    "bbdd7054d8272c9b9f726f96cce97058b55f77549fe00c763d43b80977d12920"
  ],
  "./ring-media-import.js": [
    "640d189cd264ac5b9060719f6eda573680b8c65cd6344e44c158e1aec89dbbea",
    "7d6821ff2bb52c70e2ca52ef2254e297300e3418f1aec160e98cc708d39308a8"
  ],
  "./gemini-ocr.js": [
    "bdf43f4fd276473dc69b106a7da67103167b4c315ff21317e906574a109cb113",
    "9ffd58d7d2dc31140cf93f26285c1af64f6f3ddc9f7c4b4bd9b07217f765e776"
  ],
  "./gemini-invoice-ocr.js": [
    "96b4d24691a84ffd58046fbf7270e0107cfd4eb27debb9a0f33c9f98f32b03d7",
    "6cc98c30bea1ee53e9d437de91aa8688e841fa124aff999d8b390425759b58e5"
  ],
  "./vendor/pdfjs/pdf.min.mjs": [
    "410b149eae133506e6c3f2764e95d5d444fa706bbc450d6e63060ea7605c707d",
    "11c8ed9baf31ed90572cffefecf09fca3f6a6a4e17eb5b5fc12a0b4d964a8376"
  ],
  "./vendor/pdfjs/pdf.worker.min.mjs": [
    "094d2c8f779f6bc19d81bca80711748a63b4a95ffa79a5b67f9fcc6cd8c85e3b",
    "b6bc13c22ccd75825e883c049607e658f9a8c21815d167e5c5dca7f1eeb38f50"
  ],
  "./owner-platform.js": [
    "f4d3316cdfe72ea0ed6e753ad74f758eea10a2e4afdde81f48a5cff96fecbd29",
    "99c6f191bbcad58bb0a804960f988174d577f5e9a9bfb7b4407e04dc52ea5979"
  ],
  "./owner-platform-ui.js": [
    "e2a46313c7e5271a61ef618a8b46507724b33bd986f4243295ff5e717e69396e",
    "c6c4cdc9c6a058eb2aee82bc707a195b6b3d3614de1169a604162cb334cb2fd6"
  ],
  "./vendor/qr/qrcode.js": [
    "18ae399f81182bc9de916e9c77b195df20cc58d6f2d55a62b085a299f1bf1780",
    "4b6133cbb5a13ecdc26cfa897d0daf7bb9b08232032cdd381e82f2baf3653b5f"
  ],
  "./admin_dashboard.html": [
    "375a039d6a290ae6fcd0bd964b58bd54ce3c914b8d92bad702f39477cd0facbb",
    "15533815c6b15003522e188cdc22f4c266a1ef15c8007edc23950ccb260e872a"
  ],
  "./biz_register.html": [
    "f6cba3e03fc25669a5be574bf31716ac1e76be61cbcc14676e365180f8183ca8",
    "5cd9540af0850b4cd651cc26e4d84998b0805dcef9913f5b4403710f5906d9e8"
  ],
  "./change_password.html": [
    "2fdd6cfe2936ca6c7019cdbbcb50fb4cf75a174c3bd46a9fa9e9e966aaa56593",
    "f16fa417d17c0034cf61bf3de13a50664ea88c659d652820ecd3c54d5f779431"
  ],
  "./contact.html": [
    "da85aa7af2acef6ad2614f536542b2bcf1850a1123c5b260ca12b3e73e3bf9e8",
    "3fc4b79e56a56b41531a1390bd5df633e242cdab11987845b03ead7d103be41c"
  ],
  "./daily_history_detail.html": [
    "23f3ea72a1059cd4ae1c168f844657f2ed0ee3907dd1b75616b89e41dc904bdc",
    "a78cbab0c08b35ae61caf3b599b315f51e2eb6af80bc23c0e6a0b084e4158f7a"
  ],
  "./dealer_admin.html": [
    "27df86e76f4e9fb1ff5cc8d027df2aba821fb8175865a8c2b07af647ff546445",
    "6a224c221b939f0168f8cb252d93c3a36f27ac9de02d32c0dae887434cf1fb67"
  ],
  "./dealer_info.html": [
    "c1aea158536f2d06d06e71047d6e0b12656fa5c6fbddbcba3aa84f9e44a67cfa",
    "8f73ad0a61afa42aa4b0c62953ca5ce88dd4f208c3f40c305cdbbf5af2227036"
  ],
  "./demo_preview.html": [
    "429bc00c8c2636df97025b6b8a0916d9ff536757b60952a237226229e41ddea5",
    "e7a617b2e2f015fdd1d34f56fa8b5367fa3473ed61709d6a2b4618367e8ffb77"
  ],
  "./detail.html": [
    "dc69b5ffaa9211c20572d15e93463634bea7ec583e59dbcb2a511b0d048904ac",
    "ecde1f176d8f377ba5cffaeb18a95659af9d48dff39b38de0b28e8d8d068fa01"
  ],
  "./factory_admin.html": [
    "f432623f4800399c31c989b03bb613879f126cce897e64ea96348d362f57e7c9",
    "c003fd6f41fcd333ee4cc4009ad278c0a7679f843ad73baba713cf44696681d9"
  ],
  "./factory_detail.html": [
    "acd319c27802ba6d3fe0605c4baa6d053f430c3d08009414c4428f923282fea7",
    "b616d5a5f0c129d3850fc2a940424fe9b4f5f2dc5563ac480ea948632ed7394d"
  ],
  "./factory_edit_detail.html": [
    "42c6fdefe0a96ec671d44b1e26ded0b091b03b8f85bb5d2060588a8034636a1c",
    "51bbf6f9c3b291cdfb52a47ade1670ba6e6e357ea02379fa07009bb3a30508a4"
  ],
  "./factory_info.html": [
    "74538b1a3d0eeeffe6732f95dcd7a040153d2f7e2d1327a6aed50160f538d76b",
    "cb82fa02440dac57365f25ed281e2ed798eea341187629108720e4849ef9452c"
  ],
  "./factory_inspection.html": [
    "22a077925906d3f189702689063ab262db6c6acc88f5f856ab7a2d938df6ffd0",
    "1a57266ceed3af97ed1ac3e6862e2b11cc34d4dc4ba1edba1a768caee9bb4ff9"
  ],
  "./factory_search.html": [
    "c7dea1e333524e14eef660c5c498a23efad389dc4e94009bb8d6d42d79a2862d",
    "7b27efa9dce8939f773e87faa8f8535dfb267d9cd72a1708658d87713b7d1225"
  ],
  "./faq.html": [
    "47a024f106d8dd4cc1f5b714e78fe170a9364e37c96bb9854717d0aa173adea8",
    "73b4b891a305f82f37b8a05972d76838b604f497480fbb2f1b2463950ed9ea4a"
  ],
  "./forgot_password.html": [
    "5532e791c7b26016aef4bb02159953cdf9efe4f0ac2307ad1b9aa398117d3e02",
    "90c5b9b248354c3f6c2cfa848e09ed8edc5ea36fb650189dbd0c117b4ad0ecbd"
  ],
  "./history_detail.html": [
    "1ac5a9f5f2e7524a2b99de0f9ed4ca8c68600bd56c8969de39d550adcd816d76",
    "81ba9a2fb6f13f43472b0478b4c2a7f4de9f35555429969906908e6257096c9f"
  ],
  "./manual.html": [
    "934b97fb7ea2d0754342b49381813b622f90acf5dd7b0b5094f146c4748aa078",
    "f85c63e062915b10f25ca2d2e17d71d04e59df3219d0094d53ac5501a898947c"
  ],
  "./privacy.html": [
    "a13db5c6933c3e9d6ab1a8ef9fa845b3eebc34345bfd48ae1b24bc9671d20126",
    "4a24eb26db89e539420ad3599e69e2993310012ba2c9cf6e49df8500c9a35ed8"
  ],
  "./qr_scan.html": [
    "28ad49a7fa8339a308c162a205456aea8e20c7648024f4fee44df2265acabdba",
    "5d8b87be8f0d9e9501c7cbae2814548e4ad1269094baeb0d86287eb1e89aabfc"
  ],
  "./register.html": [
    "25bb6722319f76b79ff124574751dc22113f220bdcaa3b7d3fab252168d1eed5",
    "cbe007301af0d5f9a04dbbeb793f55e05fd986d2676fd95848c74949c6b1c475"
  ],
  "./reset_password.html": [
    "ac6bb4ce1af9cdcc1d2bee88a0de157a54b2b4ef1c306f93e2b8728c0b42edb0",
    "c6494856a9e650761ac1fb74b0942989273a1ee4dd92c004f34491216cd0db91"
  ],
  "./terms.html": [
    "efa36f6caa389c231f07486fab541418a3815a454df78c7816d6dbab73813547",
    "07d98e3dc83d57b35885dc1a73769e5ed8fbf6d75f5b7602ee60ebaedb1d4416"
  ],
  "./tokushoho.html": [
    "6037caacfd276a3b3600ba72a57e76d692fbe5ffc41e616d503e0e1b8e472923",
    "836b4e0401e19d7429fc080dba8958fb8e83572cca64fe2353504b5155ff1b53"
  ],
  "./user_detail.html": [
    "1ff151e2c3ad0c7712aa0396279fc7fdfcbec30bac1a5aa25f90e0e78139910e",
    "1185fc460d3caf8a237010f805a91aa781376dadbaa2d3057512eeec0995a000"
  ],
  "./user_fav_shops.html": [
    "36aa1e7175ebe16e3079aa526805af468f143d40f31905af130d9386cdd19df5",
    "d8bc6ace6e8aa0f6ec72c1b324791bb7f47adc28efd9d45ba783fbd1ac3b514a"
  ],
  "./user_fav_shop_edit.html": [
    "1e032037c32590188d53642e0a9ba9e4ae49f571fb7e3fbc86565f02ad6d6b6b",
    "77255b49fb8a77e40bc73063f1926e6f0fe94e9388024f18e1f136460a891eb8"
  ],
  "./user_inspection.html": [
    "f558c677a8c8347f3f2c3606e7754e7c0154a5523bfa96ebb8c414f2a9f51187",
    "089a31ebbd1505ac14dec5655b9c7280ec49f2d1ed3d0b17abe3d1b5c5a93903"
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
    "f283e581356ee03378b9782bad61e46230d2e15f8bf1b7a690268ac3b3676a4c",
    "87435381083104088952c32641a852499bcbaa9be38603ddcb460b2fb9044231"
  ],
  "./user_past_vehicles.html": [
    "5f9413bbe71a0596f95d9670a74ca2c2bb21f65a158b5cc8a1ca3127ad0a8200",
    "47827f027b5a835b1c9536b01253dc942be82a99a417ce1cb4902ffabf94bb3e"
  ],
  "./user_sub_invite_accept.html": [
    "cd163b08a77aac87d45f432145bdc09e150ffa835dcd0de05e6393901fcf36d8",
    "eb55f70c4b4e371d4054891ebd18f561baa8a3ac63bec950208be4060e9ef8b7"
  ],
  "./vehicle_detail.html": [
    "b636d39b4453512047a4ad0672e98b694ce5a6bdc0fb6d8fb6e83bf0f1a3622b",
    "61f824dae71b7f38aefdf12918fb356b0fc0a39bebf85db23d54ab300f8d0376"
  ],
  "./staff_admin.js": [
    "050735c31339e28d0e2da85fbc5be1f155785453c1dd04a176c2d960f0c7fcc3",
    "d2a67581dbdbb291e68e0bc6581941c95b666c84863097c9b449c9324ea4bd80"
  ],
  "./vin-search.js": [
    "a850084c6d5047a92c3640ef4cd937c6da1f9cd9845953e56bfa7044540e7d33",
    "9824789ec158ea95d234508c3c99aa4e05be120a5c7084966975ca586e05e8b3"
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
