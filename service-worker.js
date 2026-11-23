const CACHE_NAME = "car-nappy-v56";
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
  "./rental-fleet.css?v=20261120-v54",
  "./rental-fleet.js?v=20261120-v54",
  "./account_withdraw.html"
];

// Hash the exact response bytes. The release manifest admits only the approved LF/CRLF byte sequences.
// Changing these files requires new hashes AND a new CACHE_NAME.
// Both bare URLs (already-open pages) and versioned URLs must contain the same release bytes.
const RELEASE_SHA256 = {
  "./admin_dashboard.html": [
    "450b25eccd1ff4c393c99552db1502bd1f0e001f4407bc304850086fd03cab40",
    "b1f52c838af988959cab6e1b4cd3f95ba32e953056e50ae76e963a6b7032376c"
  ],
  "./app.js": [
    "e4abb0a5cb138dd36cafaf6bd7ff7abb506bd462b162d29312018e7aeb20c2a0",
    "6548ad06877e9be89e79fa86a42184357648194ff4983fb1cab8f40b1a5ef528"
  ],
  "./biz_register.html": [
    "99a40b80b5b90cb8d0f3ac005534e019d44a1f3e55771ef29cf74edf5c3eed88",
    "c6b283ef28712fc6b5c079c75f895067498d989142d9855de84610bc9c891f3e"
  ],
  "./car_add.html": [
    "456e7ac6040a98eecb5259b7c30d4865d0dc416d377db131ddf0a195c3734e1f",
    "1967d70dfc3ee278cdb6830465eeb40f61655d535b2c4f2d7eb4b8219f68f065"
  ],
  "./car-add-date.js": [
    "4458b2a5c43b9e5738b06441e53bdc187ad1cc4a666709fc98e980193dac8257",
    "75a157f6b047cdcf356d5381aa9eb56a64b7cae63d095b37f4c4a061e19db1af"
  ],
  "./change_password.html": [
    "6a19d64103ac5aaca9534308c5b964c2f51410a4593285481331db33ec61b464",
    "d286f074b054a2c4667b99014dfdcc1ec83469836d4f1b191c0df720db1a781b"
  ],
  "./common.css": [
    "c8ed0e94d5de5d9e39f382176f2fc6739c1141540748b4d253b67e409c9c3824",
    "1e742610c0a6c3fc272b05267175c709c33315e84adecedab9dec0a93892dd65"
  ],
  "./contact.html": [
    "154ada1e080064817bc45e186a03a77b5233563aadb9e2ae34410fff07713487",
    "53b92a8dfe67da760b189723dda044be3ee88d353cab2c0458099c432eb5d014"
  ],
  "./daily_history.html": [
    "0bc8c52c793289ec634ff722d6afc55d754ea9cf1d3fcb997b9d84dc3af5ef0d",
    "1a4806a403e3fbb20334bd25b106c733624c301d745b9df42d1f47426991f04e"
  ],
  "./daily_history_detail.html": [
    "959df54691a9f069ec1c6993973dc9da1d90088d3000a315b42a94c571a67518",
    "f25f91e643be1e40cd97d8c6077e972bf751ccf0ded3d0c5c80129b981a89913"
  ],
  "./dealer_admin.html": [
    "b5cee3b1e090d835b10f327588718fca95767eda520c7f5ef59d9db92d344b8f",
    "81009f6e6769a014e94a971d0fe5239cdee3d6f8d839f39e64e8989112aa0c24"
  ],
  "./dealer_home.html": [
    "c4688fd0c55d741dd57a61707bb74d34d53f34e820a391e9dad739c004793f90",
    "3a2a7c16418f4fe957fdbe46c6e5054cdfea40459bb44c973a90b351e7fb999a"
  ],
  "./dealer_info.html": [
    "c1aea158536f2d06d06e71047d6e0b12656fa5c6fbddbcba3aa84f9e44a67cfa",
    "8f73ad0a61afa42aa4b0c62953ca5ce88dd4f208c3f40c305cdbbf5af2227036"
  ],
  "./dealer_input.html": [
    "19f23a644292ced14d9724923d27d674919c8e0e5b127ca7edf9551d8dc25807",
    "edbbf871ad534bd6d8d06c3e668bc0b05e432954425ad91d0bcca8bade7a8ba2"
  ],
  "./demo_preview.html": [
    "429bc00c8c2636df97025b6b8a0916d9ff536757b60952a237226229e41ddea5",
    "e7a617b2e2f015fdd1d34f56fa8b5367fa3473ed61709d6a2b4618367e8ffb77"
  ],
  "./detail.html": [
    "b844d0811c1daebd2cb7cc65adb662b79ec319bd96414c31b3213dda9dfcf556",
    "9172f9bb6062fd1eb3b8cf989b0ef56e0e8d8036e78adaef162af86e1051d8bb"
  ],
  "./factory_admin.html": [
    "adeb75bc8c0faf1864b2f4c5b30dde2b61f3a42a3a18705c5b033f47bd51be23",
    "994cc54f29288b14c6325186246ea3588de19dddd2f97a5b3525b73d1fcdcf59"
  ],
  "./factory_detail.html": [
    "0e30dd135432e9910575c4ce55f62d1d3b3e57f777a4b2c31198db6f9274a2e4",
    "aeffcee7b0db23c1d9962247042919ce182f5ec967af718ae5ff33b11dd0be97"
  ],
  "./factory_edit_detail.html": [
    "c0cba86f22c9b8401d6d7fb74ba1444177e11c6adf7a01e2734d7141d23850b0",
    "6f44c4932c4eae2b6018c1d8dd80bb8420bb3c5882b2c863648a331530fe5a78"
  ],
  "./factory_edit_list.html": [
    "bc5174fb5495305ff09594b2adba940a724b8a63ebde86556b40af5cc3882506",
    "294f37889a469f06ffabd5e4fc24fba5da996b2d6500010cdbc730472d5c258d"
  ],
  "./factory_history.html": [
    "c5e853fad23eb46a7d35b610c665550416a29c94077ee906c0e265ce44465033",
    "bc5a5d48b152e1b0d510e50e66fa173c0c89ab025032642b430a7f8342ca9ab4"
  ],
  "./factory_home.html": [
    "8993df47df305096a7ae2f07ea96c88497a742a6f8370e42f8bb08a652c0287d",
    "c08ad1c77e652ef21e119bfe93e2c42a9efac1e6e84d7d38ae801fc491db8a80"
  ],
  "./factory_info.html": [
    "cedd9e49c15f25b7ae49f743ffa57cf8fca9eec04f28ada44ee02185d6966703",
    "895a1b421a654289d6188f1035db3be565f724ffa73f9aab2bca1cdc8a2c3935"
  ],
  "./factory_input.html": [
    "64ebe7c1c6d6a94f524ee97134003de30ea331ba90e3f6bdc9adac2794ea734a",
    "9d00243339190ae641f7269e0ae46b9d79351cdc46fefca5488e62cbac7050db"
  ],
  "./factory_inspection.html": [
    "22a077925906d3f189702689063ab262db6c6acc88f5f856ab7a2d938df6ffd0",
    "1a57266ceed3af97ed1ac3e6862e2b11cc34d4dc4ba1edba1a768caee9bb4ff9"
  ],
  "./factory_search.html": [
    "b5c2177a2706d8d18de79576a4cb9a7dee28cc8683e5e10e4864ae0554cea9af",
    "b044763ea38cfd1e28053f13a317b7a54afea59336fcf4caf66739b358eff4c6"
  ],
  "./faq.html": [
    "b280754030b7fece48f23116342a348fd0a79592f653eade7f9cceec09012f0d",
    "1c39a102e3491c55065b25c29d4fa21961ff06e3702c36b55bbd300ca1088cee"
  ],
  "./fleet_check_sheet.html": [
    "fcee4e7d2a25f61990231ac36f26aa034e9d55991d3630d66bd513d889d32e1c",
    "04f9d143e10665a1e1b9b38e04164f26f751f423426f31884af99f6ca58f0d4f"
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
    "ca4554559a32d35ef7c444609ede54967f0dcc818501985f69db28c8d9a04de4",
    "1cde09582f260c0b4dbfc1f59521e38a06f00233b9520fdcdc49ddbdc8d508aa"
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
    "ff80b8eba84272acc56222c2d8ec3f623b0496e1a5141affc9d24a41eda229f4",
    "907bb477320fe023350f744f33fafd0c8cec55672d54f4a2eec648b0fc2fcfff"
  ],
  "./history_detail.html": [
    "6f5a5ce9458963183ce2627dde78425f5c745709a95caf0e7c81169a3e9f7e54",
    "c9de2e31b556b9b9beb7a07a98f4040558f209e142a510e38ba9dea759f934ae"
  ],
  "./history_visibility_settings.html": [
    "37cb7a3db38b2bb13e5658af65bb84b8eb79e1744d8649112513ee89ef9349e1",
    "b8c637d9e79ec5c4711103653a8917f7c368a400e2589287550b6ddc08e918ad"
  ],
  "./index.html": [
    "9f1bb0d1f14061e5c67bfec423099fa019efa957cc7d04387bc617484ca97c55",
    "c5c9e1e34497e837c7c968795dae70e2a7adaa8a73fcc24736930789c007b1d1"
  ],
  "./inspection_biz.html": [
    "99660c7d43294fbc526861df49b4717ef5d1f893d2bd5dfccccd309d5b796581",
    "a3367824875fbe44479576844dc5f4827e11e6840fe206d515693e0bbc87bc8f"
  ],
  "./inspection_user.html": [
    "f95caa387849283d8cc2ad1d607a3924d9386e0041ff9a0d58a3957efbf11e9d",
    "ae2083b2ecf63c2c36937014a3de1f2e065e9882b5ef8f9282fd6ef1afa678f7"
  ],
  "./login.html": [
    "ce1912791e828c73b9f5fb054b6edf5fd8e5545bd3b318e95f050d422f4d3c8c",
    "3dbe335cca942cf3c71c3671f8486ca55a141d08cc4a1f26a72400c06f48148d"
  ],
  "./maintenance_input.html": [
    "f1e49154f9352afadd6aa2dd8dad4c616267bf0fa21646824ceb1b6ab9450380",
    "349a4624b481994fc4b1767ce6b0808409cf4537af16372ed6539e1999bec879"
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
    "27da335ae112b3ef1c0813f0e888f8badbb8ca8e61743f3a8e47a031eb5ae5e3",
    "7cf3c449af558486af068c0530846722f82e968bac4f8176264695adee0cc3df"
  ],
  "./register.html": [
    "2ec409f18606c44aa31b340ee4650345603a3a3c1443c00db8387496a051bc85",
    "27ea0e8bcf07a0c4f8fe4578480779f9f9a4e1bebf79fbc666fa6ff42a2cbc21"
  ],
  "./rental_fleet.html": [
    "6a97d3cd81d227586f2f4579c62c1fe404ea1f18c535e0ab7a88fd37dbe9b510",
    "a8bce8ce3c53bffda3ad8c576cf371d973dbe94cabe477b8b310b473dd9b4d7c"
  ],
  "./rental-fleet.css": [
    "6268621eb71fe95d829909107753d901b53f8bee3600362dc0b244eb0ec2d847",
    "34dfdbb7fc66e6848a6c056fa266355bf7cbe0e852e48c57674bc01bc08e29c7"
  ],
  "./rental-fleet.js": [
    "a75648a7ce1b84488aaa310b3f364c150b5450797bf868c40cc119f03d98cd9b",
    "1c4bced9ef00fdef0f57f1086491aae8f5ee28b77e67868295538dffb87d7c37"
  ],
  "./reset_password.html": [
    "aafba2e7cbb1f3c27301407144cf1f3ccd88ed0ec37bc0065c7ff095b9761392",
    "cc6eb9bbc1673f385b00d816a97993ea755afdf814a28722d0f2144687421c4d"
  ],
  "./ring-media-import.js": [
    "640d189cd264ac5b9060719f6eda573680b8c65cd6344e44c158e1aec89dbbea",
    "7d6821ff2bb52c70e2ca52ef2254e297300e3418f1aec160e98cc708d39308a8"
  ],
  "./splash.html": [
    "7255418983cfa6b6f999743e9c8e3447718bd9fabf4a09e644a575d340b43fff",
    "cd0df9107cc6097c46ca3aea905d650f816f9867c5181c39c0c5663107ab39c7"
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
    "6ceaa6e261b52c5cd1cc3962ecd54c696fd8017ae1b5bf81c38301b140b35f86",
    "fa928f1c456e0820a32670d47ce9f21ea383fba9dbc078d9c034cd2a09f8f97e"
  ],
  "./user_fav_shop_edit.html": [
    "c1ecca71188a0925070e5e5ad7f6d9a4e019b3a79ace7bee5710d186f51089a2",
    "6d8cdfa5f28c9415061bb47c9349350c3e5cc1ab7fd1900e8b04e0b5c25c7d08"
  ],
  "./user_fav_shops.html": [
    "b241452f058acdeb3bb7555ce85b0dc8cae70a4632e14682655c78448ed0ec31",
    "416cea79e75ac2c9814d7aaca2e1c13a65e040c18a19a816a7aa815ce6bbaab6"
  ],
  "./user_history.html": [
    "e9eab449d46dc6ed7b4700060ef28712ab3d2f2ac3259620975ede8d337ba98b",
    "7cf910ebb319e537b162bed31e758ee22fe17a2e4ab327d5a34e9ab429007ad2"
  ],
  "./user_home.html": [
    "26b3272e5822160fe60023994f6d34830f4e426837e552dd2f5813f1795cc3f2",
    "6eeebf3d0aa6433fb0400c926632a593129d2f9cfede642aaee28882f2314b78"
  ],
  "./user_inspection.html": [
    "f558c677a8c8347f3f2c3606e7754e7c0154a5523bfa96ebb8c414f2a9f51187",
    "089a31ebbd1505ac14dec5655b9c7280ec49f2d1ed3d0b17abe3d1b5c5a93903"
  ],
  "./user_inspection_history.html": [
    "26b08db56012cdfaa3410e07d1dc6383d52687dafc885b7479b2e442247d03cf",
    "f779f653d48ca27c65b9af6fdb6aaf8ade0bd3e10763bfa2da91cae80445323a"
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
    "91b5ea784754b75993078593e324fcc070152c922d87fcae6584709987ed0c1a",
    "06f097a3e371f8235f9b3db5e5d1c4a38000c45d88ea31f794698ac0e4d559ed"
  ],
  "./user_past_vehicles.html": [
    "28d25f183e630920c3693053a74e1828efc27d8581f300a226b42833508b7481",
    "f4f33fdfbe4a30f0c192cc8900ddbfb5c5e45f80333f31e95a2d1a9578995960"
  ],
  "./user_sub_invite_accept.html": [
    "50e62425301c1a518615f79fb55139d25b8ba29ef6b4c59951a0d17f84b47134",
    "29b74108e37e688323042a5bfee1bd46cd4faccd36b8bea8de2c98ed9c789798"
  ],
  "./vehicle_detail.html": [
    "5c5ffc4c6b9edfc2f0c940e36c6fa23f90ebc6394048b73fc859e3edf3baa6cb",
    "dd584241019b991198b9d56111b80ea9dfa80af5626d4b00e02adcc2cf5feb69"
  ],
  "./vehicle_info.html": [
    "547eeb1bce4c90a4327dad94618c4004918a791e5b16d9ab4fea731e2c462412",
    "ddb77ae75a860ad914f9566cce7680ed941f6d6a528fc23114813f3ce4e8aa2a"
  ],
  "./vehicles.html": [
    "16de37475f5c273c1cb021574b799bc592f9376edc78b0071b77a2c6c9112862",
    "32c2fc7d39cea501ef281d26b9cfbe56aeb4531164f55f789b02d7a83211aa8f"
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
    "7fc60178722a707fa6a89950f4182c1aa6f503210f01ea0d1a755857551769f9",
    "e3f8eb0522443155b58ede93d0b028b0874f73b4946dd5424c88e5203a4a122e"
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
