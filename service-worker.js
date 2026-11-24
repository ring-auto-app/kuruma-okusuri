const CACHE_NAME = "car-nappy-v63";
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
  "./common.css?v=20261124-v63",
  "./app.js?v=20261124-v63",
  "./owner-platform.js?v=20261124-v63",
  "./vendor/qr/qrcode.js?v=20261124-v63",
  "./owner-platform-ui.js?v=20261124-v63",
  "./gemini-ocr.js?v=20261124-v63",
  "./staff_admin.js?v=20261124-v63",
  "./vin-search.js?v=20261124-v63",
  "./fleet-check-sheet.css?v=20261124-v63",
  "./fleet-check-sheet.js?v=20261124-v63",
  "./fleet-check-sheet-pdf.js?v=20261124-v63",
  "./rental-fleet.css?v=20261124-v63"
];

// Hash the exact response bytes. The release manifest admits only the approved LF/CRLF byte sequences.
// Changing these files requires new hashes AND a new CACHE_NAME.
// Both bare URLs (already-open pages) and versioned URLs must contain the same release bytes.
const RELEASE_SHA256 = {
  "./admin_dashboard.html": [
    "85ba8706415d80b8c282205a43d3cad6e3d174d1e8bfc1619404a10efe41c1c6",
    "f40fd312bc453843a205ac748f8ebf2f814734a413acfa9be756b48665bee322"
  ],
  "./app.js": [
    "eb8e6f3c7e0c4e08de53a2cbffb3fccc7e29b99b05219ec46fabf5aa47abcf45",
    "0eb2ebca781b1348573b43db8cbdd67fc819037b565f6ff0e74412fc0a48ebc5"
  ],
  "./biz_register.html": [
    "a8150cae688b210bd84ed402664f24eca5c125ca51197d9ab465158e14059103",
    "e6df7f8df06a99f1ff8cfd4838c2f7b0571d442af24f08aa9d53684905bd6a64"
  ],
  "./car_add.html": [
    "1cba899a81e7262f587d8e2900336e3cf308c3256c0a3a5ba64a18b73a9a29d0",
    "b763549e09984ab070b39e91bb3ef06b1afd303a685595cf924a8226c29a72e4"
  ],
  "./car-add-date.js": [
    "4458b2a5c43b9e5738b06441e53bdc187ad1cc4a666709fc98e980193dac8257",
    "75a157f6b047cdcf356d5381aa9eb56a64b7cae63d095b37f4c4a061e19db1af"
  ],
  "./change_password.html": [
    "5e49d20995c3d7e916be2394c792f61e9fd84af953ea03fe1ec9bcb6be456c93",
    "251c4e5a623fde8f512589d0ad2d70f06d5ed68f7a23daa8f3738a213f7bf7c8"
  ],
  "./common.css": [
    "117c234a05465ef84da6826098421b86c4765e98ca9a8275e20186bef0fc98c5",
    "2d07c7e219d74975e5c2a452011a052aa3277d587273c8fa03702585c23f187c"
  ],
  "./contact.html": [
    "f3cac8d0847a759480b6ec40a5ba621f14f68ed650a343bd643e6338e82a5d15",
    "19ecc9fa8fa3f9a64a6cb7979604347aca64806a1523b7578e7edfb660ae50c8"
  ],
  "./daily_history.html": [
    "905902bff4c57071201c5fac4ea50be961bf65816fc977e6ee5e3c9a506c4aff",
    "f2104b15c7833b88633e49a4a76420d7445b6d43399ec38a3b92cb1237d96cbc"
  ],
  "./daily_history_detail.html": [
    "06e1b5d2906b417c4e273101f0bb769298b605877a7577c59dadbf5d719fea43",
    "02d246e94bcedaccf911ad3b9f7ad8fb0536e8ea9ad4a71124eb842a707895e3"
  ],
  "./dealer_admin.html": [
    "b08de8f09f26a9a6383ba9182bff000d4d4d5c654445c30d38f5b0a49892a843",
    "b451a6276088282779f2d3f13de20676abf603fd7726a3a3c75e8af54f3db73f"
  ],
  "./dealer_home.html": [
    "1c5c15a593b49e07bcc3883a1c30e7c70329efb344d181f9e67430693dc57976",
    "866a0b260ca64be01d5765b85cea9f4cadc28567ced7bbaacb4bf34fb36c86fa"
  ],
  "./dealer_info.html": [
    "c1aea158536f2d06d06e71047d6e0b12656fa5c6fbddbcba3aa84f9e44a67cfa",
    "8f73ad0a61afa42aa4b0c62953ca5ce88dd4f208c3f40c305cdbbf5af2227036"
  ],
  "./dealer_input.html": [
    "5114d3e9decdd28f61850e54751a6f9a65e9b275c78f6bcbc81355c4791675c6",
    "d3bba050e4541915b00320dfa4c5417ecc139957976a40364222522351d01376"
  ],
  "./demo_preview.html": [
    "8fb98805d8e5d9361f13724b7d5ebc180a2b8ef2ec4dc738dbeeb6b4be3b8b79",
    "029bd77f7cf7c71ed8b6884ee729d4b4306407ccf70d0424a9bbdea8eac6906e"
  ],
  "./detail.html": [
    "fd8c5dcbee81001b4e7e619dbf12b2e6dc41e2e4126b1be35d38d5493dfc0062",
    "15b994b7c655d07befdeffe6f29c0f590e81d5d3af4ff2aabbc72bb3f5ff889e"
  ],
  "./factory_admin.html": [
    "5c062f4dbb6b6f58f3867f16fe98ada7cea5cff64eed43e5cacb118c8fd8d3e1",
    "495ecf037b1320d0707335acf0566b87b272f5028dfa83be0bc0fb8822aadfb3"
  ],
  "./factory_detail.html": [
    "6a33ced3d93c65d76c5fece4863e0523db60d4ef4c1b56742fbceb9308af0963",
    "2cb86b0708e9e9fbade15dc88b3e11f7d0fe9d385cf699e025dcfccc561a759b"
  ],
  "./factory_edit_detail.html": [
    "cb7157d9d8db0aea4941625422fd1038b35317aac65c2900ea457dbe21686617",
    "b3fdb6a87c3a9bd5fce7c4f99669157f3404b8c7bd4c04666b46d56c557fc31e"
  ],
  "./factory_edit_list.html": [
    "c777ae1f364085dc5fd31df3b4903f90b8f19ae2cf3f7e16ef0f981e3c501b9b",
    "153bee4ec873dfa46401d5dca98c9cc69e1a4419a5301b8fd92673c8cb611b1e"
  ],
  "./factory_history.html": [
    "0147f4c608f318efca59fa278ead9ec9074980b5a8e29253b696d5c44dda68e0",
    "6dac0b8294a3f5e8b7635bdf9350cb48a3243ad0d244370c5c180005c7433372"
  ],
  "./factory_home.html": [
    "9a4c5f4796d0e2b805cfb16bd528d62b82bb9efd86c08c6543b2bfd12dcc2b40",
    "1aa130a1f4896cfd739f6ec43c318582424d6cfbf1bdfb92326ff9618d1ebad6"
  ],
  "./factory_info.html": [
    "729ca8e582ee4414190787edd17eb760ab13502bd52dfb5968b6bd0876894baf",
    "21332e637e1ee59dc41e3bc8a18fc743882216d9699d6e0995196cad120863ce"
  ],
  "./factory_input.html": [
    "88f48522d987e56caa1c989f0e2021263ed0e16163452d7a1c31dd71db30d8fb",
    "709c42ad542d5413dbd03c2a9e79df209e347ead22c5c1304b9c7e9cded0698f"
  ],
  "./factory_inspection.html": [
    "22a077925906d3f189702689063ab262db6c6acc88f5f856ab7a2d938df6ffd0",
    "1a57266ceed3af97ed1ac3e6862e2b11cc34d4dc4ba1edba1a768caee9bb4ff9"
  ],
  "./factory_search.html": [
    "3637bd81f4f29c201d3b4a8042050d1e64011861a5647b3a4249af925177f8b6",
    "fa20232fb05c22b9aa7841df2ca19be865b811c5d1fbd61680c62ab8d6ae5668"
  ],
  "./faq.html": [
    "e576d1150fdd2936264bfde0beed0226c3a8989822ffcd8bedc65cc7cf9bf3f4",
    "03df533ca929ec9c69f4a5819b080ba9b25db1e877a16c69a1ee7203edeec6d3"
  ],
  "./fleet_check_sheet.html": [
    "b1899b2ec519c5992a916e4c49fd3365e07f90e2d575007b9f0983df2886e46b",
    "52dc48d6ec0dc62980f06f600b6f052f65142b48570df2b83b88c20f1202e357"
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
    "a261791e3c7571ec667ca28cd42d817b12530bd5d82055104597c53e5b59945e",
    "e09656303c2cd690e9c1894463562a0418adba00c8eb461d2adcff6d2341576b"
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
    "02f5e66f2667fe45e6ac76d34c4db2e76db36e2510eff1095db11140c7985571",
    "5db01e6d885d782b826114c802b0eb5acb1f05dafc620eb5bc251c54b34b7bd2"
  ],
  "./history_detail.html": [
    "a077d537d9fe9b077581dbdb33254657f7c9ddbe95bd254f294f311452ffb719",
    "614b49bf46f23f31fb23b38c20d1385467c469a766f353b932fad3d16ecaf75f"
  ],
  "./history_visibility_settings.html": [
    "932a0a41b91da267dc15bc8b21a57f6598ee50d54b2427ef9cff8e616fa94f5c",
    "8f17cbe656403de85ef265fb2164ab5576a4ede96251d713ce27920f063b5df9"
  ],
  "./index.html": [
    "b34657a7bc0ed04f28805ee682235584647b32b86b9780008d6977a25cc2f827",
    "0fc333bce2f0a727209c787a000ecfd8c4c86e23c3896543f7facf4cc188c2a0"
  ],
  "./inspection_biz.html": [
    "08d204b8f47068e0b9cada840b97aaaf4e1fc79888d84db6865c5156dc010f7d",
    "4fdb4e41951d1ba5122bd71368f85d1854c8b88111b95d9ef443a4b6bb0a3bba"
  ],
  "./inspection_user.html": [
    "4dbb4e84df4b2c18ce88921844adf17f40459c579454e2a58fdd314f4623d83c",
    "fd3f029729fc4a0c00d165ff6e4f520d88106d5133c090a26e6ef0fc81bcda9d"
  ],
  "./login.html": [
    "b3110e89453f2832f0223bece294d3abc98d638fda9818602182aba1363baaf3",
    "561a5b9372934fac809d020b2282965e7c89dce62d1881842ab792c54980d21f"
  ],
  "./maintenance_input.html": [
    "821e2e2b9196644e79c6c453fcc1a3b7b2e009d807d501c3a84f539e52615311",
    "12db5ca641d7001ec6c6f6eba3de4ba998055ecc009c5b445b930561ac2ffa73"
  ],
  "./manual.html": [
    "d0ccc51dc36b1c915849681d6bfcfd4724de5b50d624d77a7adf3b9f9623d4f4",
    "8f82a0e08d1223d3ed12eef188c4b0234d8f0127f0d63aa1d66f45fd6db1eea7"
  ],
  "./offline.html": [
    "9199499be3c9a9b044802f608a608944949ff88ee9044a932a28817aab67f530",
    "26a53593191e537162c295e69ca8bb023ecf1614a4deb57f7f08bde2c3c08f72"
  ],
  "./owner-platform.js": [
    "f4d3316cdfe72ea0ed6e753ad74f758eea10a2e4afdde81f48a5cff96fecbd29",
    "99c6f191bbcad58bb0a804960f988174d577f5e9a9bfb7b4407e04dc52ea5979"
  ],
  "./owner-platform-ui.js": [
    "d8e3b81dd073db74b3ae43ad409d97f4466f9dc401cd4e1cd9aaf48da3d4d05b",
    "4ef0ee40afdfd5957d35cf4550cf207e8e45048ddb7e1ef46bfd76dff4b7e332"
  ],
  "./privacy.html": [
    "d1c68f63c82a44a1d040e1434bba5da3f0871233c8ab98ee051eb55b99b46a10",
    "e3a4ee168284a1d7e13be260b6900e501072b7cca5216a3c547d27bac177814b"
  ],
  "./qr_scan.html": [
    "adc22aaca68c82793dd313dd0a9fcdd494672623aef0805ea97fe71bb416a2fd",
    "5bd9871238ab3b2385803a3afe928b0bd721e104b9f46ec19dec6793ab772e40"
  ],
  "./register.html": [
    "c3811e813a657d1e7ea30177b6e805f408caea8c7fd623f438b4164c2e30b31f",
    "2acea7c9072fc017c8b371ddcfc43e1df0a8fd9c0ae2c3f9f379f3219e62dc63"
  ],
  "./rental_fleet.html": [
    "49617becd916b1fb5b194dff354c761abb9223fcbcc04d3181be952f344c5fe3",
    "1d23795ef696db5488d9e951a25f42d8054f7cd9ff57ddcaf4238108e41a07b6"
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
    "ea237c7f76285d57d89864f017ec07737f538cdeedc69505a750718951fe1217",
    "3d73ef2b6782098d2a1075a2a71d37699e70d0e8b575c8d21de23903080e9f21"
  ],
  "./ring-media-import.js": [
    "640d189cd264ac5b9060719f6eda573680b8c65cd6344e44c158e1aec89dbbea",
    "7d6821ff2bb52c70e2ca52ef2254e297300e3418f1aec160e98cc708d39308a8"
  ],
  "./splash.html": [
    "26a0fa881087c0c5e041e8830343e7c46a44afa5dc0fcb125eba9d0dd1850ff4",
    "32f7eb9f50057c44d9dfc5e261d52b06d8dfe54954c5d34bbfc4fcfa1557d00a"
  ],
  "./staff_admin.js": [
    "050735c31339e28d0e2da85fbc5be1f155785453c1dd04a176c2d960f0c7fcc3",
    "d2a67581dbdbb291e68e0bc6581941c95b666c84863097c9b449c9324ea4bd80"
  ],
  "./terms.html": [
    "d1181436793c38feddf82c82f8af4d8f0ab014a367d86e47c20e7ba6ab1a62aa",
    "c3bef8d75d152af27cc4a230adcc85d210f975775ae955e9df151f4f8e341850"
  ],
  "./theme.js": [
    "82e4179bd9d4dd92ecbe26acfb589a5d9f48d9c9d93a4a1842bff0c6843cdd01",
    "bbdd7054d8272c9b9f726f96cce97058b55f77549fe00c763d43b80977d12920"
  ],
  "./tokushoho.html": [
    "7d886b15782dfe502bf41087f84d02953f8678b6decf258d3864cb9be6576006",
    "064d8fcbb0940f447ca3b1ff20cdd5116c67bc6d5b8e003a1d921c5caa189eb4"
  ],
  "./user_detail.html": [
    "2c403539e8da99d0d747c71f6ab7a88ac529b9b2973b51b77c28f661b3b76a8e",
    "ccfc1922d0aa23aac8681b1b81caefc54844bf5f57cf1c56ed565eab6bfcacbe"
  ],
  "./user_fav_shop_edit.html": [
    "d4cc06b35eb033632111c3194c124130462f9c01eb2a780ac9ebbbb73af2c25d",
    "64c858d24214bf6a6e7db1b19393393ef96e1508820011cdde4e61de4158ee36"
  ],
  "./user_fav_shops.html": [
    "9823c21d127f60abbd9b5cd097f8c1a554a0d531579766e6152e58c57be9f5a2",
    "3ffcf506cb592c0c77a08e1214a30ff40f3bd479a31d7c46853c1cb104a25dbf"
  ],
  "./user_history.html": [
    "b49f388811519916c59d7418ad87f08ad63c3501ba92b3b0612fd510cb3598ce",
    "b035073966ac6d1bda0f42a8dd68cf0f9df132c6020dabc7dd376961a8ce129b"
  ],
  "./user_home.html": [
    "de56c2560d132c68398ff0769f99a08c58901d8475496a656e16805714070841",
    "24548bf248d546d10a4428f62b62668b95cbd13b0641cd727b62d94ecf78fb49"
  ],
  "./user_inspection.html": [
    "f558c677a8c8347f3f2c3606e7754e7c0154a5523bfa96ebb8c414f2a9f51187",
    "089a31ebbd1505ac14dec5655b9c7280ec49f2d1ed3d0b17abe3d1b5c5a93903"
  ],
  "./user_inspection_history.html": [
    "bd412eaa5f25d9814ec120247c139e4979fb7c0e4a05f19c9c46ea56765c104a",
    "8ed6425322892aaa014945a2e46a6806c1fdf90639a1ff1557bd0b840f7d0234"
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
    "05ae8a73027839a61e78c83158ace0eab4394fce562dcebd45740cbea791f4bd",
    "d28ddbf891a6b715f16c690290eff7896caa462f480be90413f670e5ac143211"
  ],
  "./user_past_vehicles.html": [
    "927382c93aab393cb1b0edfe5b1603348e80e98ae352d7141623518007e8ad3b",
    "9be2eece7b9dc9693cb146e2689249b343b544893482d8bc10479cb21edae6de"
  ],
  "./user_sub_invite_accept.html": [
    "e7114157b8557b0927ea17a1e9287f31a2e171ff4d5522aceeace792b88dd664",
    "b5982c37be1aabb41d8d9d171948e2876e3a3cd9cf7830f4279604411459d422"
  ],
  "./vehicle_detail.html": [
    "e0352148a9881eea3ea269bef9b4d594702b18537d9af05444af59027f8846c9",
    "bc127ba7763dbd52977f65e694ae7affb96683ec67205d4a65c45a526dd91211"
  ],
  "./vehicle_info.html": [
    "70e71ccb32a418fb50d780adb88457865d27b08bc1e5a0020051e00610b69ffd",
    "2044d5ab5a539a65297b8a91980eed4ed3db751a577b78c49f89792d19b22468"
  ],
  "./vehicles.html": [
    "758301dc47f17612c99ce264721da39a5f61518becca6060801b226c509c6e05",
    "d7daa6956e12e1abf385e50de0738c6e0a9d4bfb125454e7f35980970adb90eb"
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
    "f7985addee0a06d5a911979703f3fc78d91e30ecaa665f8238621f5cec8466f3",
    "476645b09a3bb3c6a7c22409bd017809ec04059dd6c46ba705508a25f8239608"
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
