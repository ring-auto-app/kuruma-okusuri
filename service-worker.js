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
  "./ring-history-list.js",
  "./ring-browse-warmup.js",
  "./common.css?v=20261125-v65",
  "./app.js?v=20261125-v65",
  "./owner-platform.js?v=20261125-v65",
  "./vendor/qr/qrcode.js?v=20261125-v65",
  "./owner-platform-ui.js?v=20261125-v65",
  "./gemini-ocr.js?v=20261125-v65",
  "./staff_admin.js?v=20261125-v65",
  "./ring-history-list.js?v=20261125-v65",
  "./vin-search.js?v=20261125-v65",
  "./fleet-check-sheet.css?v=20261125-v65",
  "./fleet-check-sheet.js?v=20261125-v65",
  "./fleet-check-sheet-pdf.js?v=20261125-v65",
  "./ring-browse-coordinator.js",
  "./ring-browse-coordinator.js?v=20261125-v65",
  "./rental-fleet.css?v=20261125-v65",
  "./ring-browse-warmup.js?v=20261125-v65"
];

// Hash the exact response bytes. The release manifest admits only the approved LF/CRLF byte sequences.
// Changing these files requires new hashes AND a new CACHE_NAME.
// Both bare URLs (already-open pages) and versioned URLs must contain the same release bytes.
const RELEASE_SHA256 = {
    "./fleet-check-sheet.css":  [
                                    "2949529d5139af1eaf96e233b6b37aca030134b48598045ec54f078fb0a03f5c",
                                    "bb78956fa062dd763693534c4bece1c4625cd5cd4a4596366632bfcb8f216cc0"
                                ],
    "./register.html":  [
                            "0f3a290b4c0f8346979dc9676d00c66a3a8d4710e80f45c86d87d0ff6e151a1d",
                            "4ef9c09d945f03a09361b73e3c5d1acf56d4130575084b2eea3ddcd9b6191d80",
                            "f03c8574e4cf8cfd5b56fdc48ed9a5c768b486544664743e2691a7eaeab38a19"
                        ],
    "./forgot_password.html":  [
                                   "c4c02534877d9bba2880a739b5c255d15b0e401fcd3d9d3ca3c875416d1cc943",
                                   "aef8140e19d16e5c82f8f5bc99ed97655c016463bf1c27955ce3a6f28f36c782",
                                   "ccf6bb255924a459922a14c53f38bf07f617a1396eec30d7a30c371ecae1c3dc"
                               ],
    "./app.js":  [
                     "1ad9e653dc8c9446f40c6d7a3d009bdd426e93be95c1f8838592039970eebd31",
                     "2c972591a9fb416b587db4534870dfdfe023e29edd7c9bd2f2088f86b9bede96"
                 ],
    "./gemini-invoice-ocr.js":  [
                                    "96b4d24691a84ffd58046fbf7270e0107cfd4eb27debb9a0f33c9f98f32b03d7",
                                    "6cc98c30bea1ee53e9d437de91aa8688e841fa124aff999d8b390425759b58e5"
                                ],
    "./user_inspection_history.html":  [
                                           "28fd939889fc62285bc8a9a564410178154ca857345ef9be98ead4cc93d81ca3",
                                           "23737a7e06d9e883b584f9a9f745ff4dc2062eeb26eea38f8092cb3f4d5920f8",
                                           "90d51ae92bf4ea84d95d804a78bdb87c32c8f7ef5ce00f9bcbdefaa454dcf10d"
                                       ],
    "./account_withdraw.html":  [
                                    "cd1d1bc557adcb740a3870e6da57e3818f7752d08422a81c611bc36add38b63f",
                                    "a715e1435e77a8dfa88b90e0f8ce45b14b6e36c2dcab22245484ba97b558320d",
                                    "a36c89ec2ee1418e70bcb2282141be37c45e3ed39fe48ac6c0ea6be9ba74edab"
                                ],
    "./history_visibility_settings.html":  [
                                               "9d730e98b1f9e0da75d11839573bcf3f027995300c19cf4b95661a6216c33270",
                                               "7d778d7b2c99b8088aa464b8e970ebd25b1d706d160820a43061d9ef57b98a6e",
                                               "59267a9182f5a35dad07288b1165c5884c219171173dfafb8cc6ae486b24cfbf"
                                           ],
    "./factory_info.html":  [
                                "44473ea190f14e1efae114b2bc2883cb9c611a9b55d517c9c0464fb779cd9fad",
                                "1db34046a03e8f8535e8f8a60bce23eed3f739aab2d402e7dd464c1757401c76",
                                "caf2b63bdcf5796765c3f67086e7241b4d8f66c4bf3556e5a301c8d233a8bac3"
                            ],
    "./user_history.html":  [
                                "c2da759b296907fc3ffb92eb9902121654c9a58c77c027d2a8db80633889ae24",
                                "c5707c74a88107a37f38719b63b8e2f26bab1e0d5fb81aa5d48a93c5b039b4d4"
                            ],
    "./manual.html":  [
                          "664509111e8d5c3cce90de0fb2c8aca77fbced12ace5b638928c5e00c74a8329",
                          "129dd33ebcfef8f4b2930866707d86433de8f1ef87f6638b3e95e20b183eadb5"
                      ],
    "./fleet-check-sheet.js":  [
                                   "c56233eb0643972da7fce628a6661d0d25d8e37889206e4ae249400eb89da14e",
                                   "8065ae330fbefbb4060175650fa6945ead0597c3c8d8d5f928c04de5fa173493"
                               ],
    "./factory_input.html":  [
                                 "8710518b673e0649c0baa0f4bd29029bf3ff04eeb38759aaab41e6e825b577ee",
                                 "50bd2ca84c53357750d6554f52627dcafec6ae1528cfaddbde5cfb81db00e90b",
                                 "1881105bbfcf098b993a05993698fbbad99820d6e44e2db2976f3402717ebb08"
                             ],
    "./owner-platform.js":  [
                                "8e43c410be8ffd34dd1a593521802d940f9f436cdef5bd98238d8a4de90ea71c",
                                "166bb1a44fb4589db4a63186a360c3a2ad78fd454dbd11755330e09eb47d9bbc"
                            ],
    "./vendor/pdfjs/pdf.min.mjs":  [
                                       "410b149eae133506e6c3f2764e95d5d444fa706bbc450d6e63060ea7605c707d",
                                       "11c8ed9baf31ed90572cffefecf09fca3f6a6a4e17eb5b5fc12a0b4d964a8376"
                                   ],
    "./fleet-check-sheet-pdf.js":  [
                                       "e69861c25682712c47fdf743d027fa1a8ee98f9fddbf5b86bd5e087c4dffa88e",
                                       "3a14b1a58ecec3d0cd78bf27d5f4dce76c45b2716e4cc4595090e23c46edc236"
                                   ],
    "./factory_admin.html":  [
                                 "4a40f68157544697c7b414382c1a1329f4409865e2ab61f7ee40b12c4bc27878",
                                 "beef2e4327b9e1ebd88adc2af7daa66ae32b67e2396d7d2fbab8f1feaac82b63",
                                 "176f842d3a575f7a71f4ffd1624c30b690517a1aad97cb3ac9341385a77295fc"
                             ],
    "./maintenance_input.html":  [
                                     "d23883399c7f0b3e6a29645d3e0b2d5a65fe70daed75739077fca667d783fbd7",
                                     "70fa2704e6a356ddcef7181dae813bc498508ef6f7be8ed3b235910465bf9b7c",
                                     "e3b227049477bbf9b3ca324d45cf2aba3acc3fd385ec931b7306bd1aab602279"
                                 ],
    "./dealer_home.html":  [
                               "02b226383cbc7414db2bcc20fdfc318c455463e5e8b7941d0bdd60fa7bcd948d",
                               "018dfa68a9e729470846f347c0e871c903fb3d27a97158e174958d9c4dcbd565",
                               "9e814644fe481f385a82e673667f2cd06d449a5a28e4a0ed9ac9be389c0a3651"
                           ],
    "./contact.html":  [
                           "a529fb8362cfbe0ecbc1d1e040c782c978bff914e2fa195e8831f807d15320ee",
                           "35510915831f1f96501ee86faf4640d396a025e1166859b577543a964aa9232c",
                           "f0ccd1534c3d5fb6272d7e9c703f410a28ed7a762c3dcd6467be13d61bbc882e"
                       ],
    "./dealer_info.html":  [
                               "c1aea158536f2d06d06e71047d6e0b12656fa5c6fbddbcba3aa84f9e44a67cfa",
                               "8f73ad0a61afa42aa4b0c62953ca5ce88dd4f208c3f40c305cdbbf5af2227036"
                           ],
    "./qr_scan.html":  [
                           "d95b4c21b3cd5ee64e5d813e00e4a4ba4f3defacae527ec9f4b0bc4c6d942039",
                           "c4cffadeae08a5692f810324abdbcd2f798ebf17b6e81f767e1771311299b7f9",
                           "2dd17133def42e96ee8a7199680bda16c761243468dbc0b47601d55d76abee92"
                       ],
    "./user_login.html":  [
                              "565126a078a1dc55723eba50c097af2159f2af2e35351d7269a8ca4624f26013",
                              "4da05a5938a61de9021337f35748e2d9f14747dcd35decaec752494f437d0104"
                          ],
    "./offline.html":  [
                           "3501c6cb84b7a7173f8e7de3f6f5bf1ac974a5018d9ccb035aebae27a59d25fc",
                           "94ebcc6cc15cdac16f36a7ab15ca090851382d2fa0e4738dbab4dbab1f7647b6"
                       ],
    "./tokushoho.html":  [
                             "73aee4202609944fcd93c02786f6b0c25f68e210204a6aacea368ba11432a70c",
                             "8553e93819f8ec09585bbd13e9306fb37740858a751d69265a47a559a011b4b5"
                         ],
    "./admin_dashboard.html":  [
                                   "516aaba3fe2bde2c2d57947a90cb81f59b02b93533a87e3d7d12ad81db27bb88",
                                   "27b754960b561e987ab113198ce2ba4710a0b52720c25e5465fe166bd945c7ca",
                                   "2da08721e56dc71e3f3869ba9b6ada310fb318ce91eb6f8a72963fde5b611612"
                               ],
    "./inspection_user.html":  [
                                   "ca45f95cb6f2823bba32d2920d3bdfa2e857087c1485408fe3829350260f44d4",
                                   "f4ce34d3f2c27aaa4b6f198966c2b1943abb8641506efef69050bad5e018f32d",
                                   "fab7ed0cf3daa139a664d7c9d16df0e2cd7d4bb4fb528bf1e492c2d8a464d068"
                               ],
    "./detail.html":  [
                          "3233f606737df7b2359b58e16952b7aded21982155b14e2a952cdb6c1c80fb7a",
                          "9ce4d88907d36cd0220a5f15fa74114a010428493e31f33e498090f7f76231b6",
                          "b1ff2fd1219e8e146402cdf88ffe8a9d26c2662eb9bd8e97e22e7f4a2aee7c5d"
                      ],
    "./vendor/pdfjs/pdf.worker.min.mjs":  [
                                              "094d2c8f779f6bc19d81bca80711748a63b4a95ffa79a5b67f9fcc6cd8c85e3b",
                                              "b6bc13c22ccd75825e883c049607e658f9a8c21815d167e5c5dca7f1eeb38f50"
                                          ],
    "./splash.html":  [
                          "104ea73fddabfa6925564b453a70369877cb324b2498ff5c42bdb25d09303f36",
                          "7b78aae7d02e036fd863e413540d21eff3edf49034a21cdb0f0cf0aa3e9621fd",
                          "1c2c09c6242809187f3123462375b012081aa71ecd15f32ff3e6d65ea892e01c"
                      ],
    "./vendor/pdf-lib.min.js":  [
                                    "0f9a5cad07941f0826586c94e089d89b918c46e5c17cf2d5a3c6f666e3bc694f",
                                    "e407401e1d27c95af336de6c0583ec048b7decf4b9c3d60f14de0f7b5b0e4ecc"
                                ],
    "./change_password.html":  [
                                   "48ed08c5c6f41e116aee80ad0852d056b25e94ffe553787f7b8279ce50a8128f",
                                   "cc425b908f1c50f8428f16a7cae5de96e334bb45dd99e9056ddfa9716a6b0b94",
                                   "f6fe1ae397db3142b31d77e5ef37211171d2cd7cf13edb334b11cd7f13b4be7b"
                               ],
    "./car-add-date.js":  [
                              "4458b2a5c43b9e5738b06441e53bdc187ad1cc4a666709fc98e980193dac8257",
                              "75a157f6b047cdcf356d5381aa9eb56a64b7cae63d095b37f4c4a061e19db1af"
                          ],
    "./gemini-ocr.js":  [
                            "bdf43f4fd276473dc69b106a7da67103167b4c315ff21317e906574a109cb113",
                            "9ffd58d7d2dc31140cf93f26285c1af64f6f3ddc9f7c4b4bd9b07217f765e776"
                        ],
    "./user_sub_invite_accept.html":  [
                                          "977e0628fbe52e97d02edf938d9f013b59a3f246ef02787f697d9aeb1bf27296",
                                          "7b6fba40a1db0b1cab5d24d883c8e16ecf3d120ea7fad44e1a8cdbe57c5532df",
                                          "1e5c6bfead506d11f7f44b3958b777421b10ae2b990a71564ec26b3b3f57d97b"
                                      ],
    "./user_home.html":  [
                             "b6ad57c99d37701860d2d6279ce4550b34fc2f007d94c1ccf895dc353734cde5",
                             "56890f2b6c5c5822e5049d573066af0d74bf9d0346b94bba3344beba6e2c094b"
                         ],
    "./rental-fleet.v61.js":  [
                                  "c589e6dec279c45b5dc1ffb3967161d2e305e2ab5faf424900f645ce14fc34ff",
                                  "21b4ea3db51ca854031f8404be253982c1de4ee0cef6531112d20c49f01c3a00"
                              ],
    "./factory_detail.html":  [
                                  "0be62921c2355c1f2d8b36fe93a67c0de8562579ddbc47fbc2294de9ac10b318",
                                  "3387b546b2f2c823ceeb8fc510d55edde13b4a9cdf3078c18429dcffad8c5753",
                                  "12b5bb424ec14e32050d1614d480eb47c2963a8bc0dec70fbf7c91de8885464b"
                              ],
    "./login.html":  [
                         "90d6741323a04d168007c27bd1d85ef2fa07784cc075f426c21d520b81529d6a",
                         "c3572add4226dbf56c223410bc82586b0bb5e00ef2ea4f91800e818d93bc03dd",
                         "3b776d45dabb2cf02e88f09f35cf8ab9a3d7d2e9ae3c3ed82f7012b07ecba9db"
                     ],
    "./daily_history.html":  [
                                 "6cbd60deb2e0a68511ff809503fe70cb0343d1d88778d1e16f405038a94c09fa",
                                 "bf138cf85e082ec2e64b546a2785524805a96ae2477cb1d58a69bff70659b22a",
                                 "627da391d41cfebaf14549b5bb3b03f4d3aaf8e9ea48ad08fe9229460df1775a"
                             ],
    "./theme.js":  [
                       "82e4179bd9d4dd92ecbe26acfb589a5d9f48d9c9d93a4a1842bff0c6843cdd01",
                       "bbdd7054d8272c9b9f726f96cce97058b55f77549fe00c763d43b80977d12920"
                   ],
    "./demo_preview.html":  [
                                "18450297cadea93b915678ffe5a319c6364b800870259e56759b23682a18afa5",
                                "ebd910c2fee97d55b5d1a4fa67c966ed98147ec85e2077c01ea85b3faf1d97a2"
                            ],
    "./ring-media-import.js":  [
                                   "640d189cd264ac5b9060719f6eda573680b8c65cd6344e44c158e1aec89dbbea",
                                   "7d6821ff2bb52c70e2ca52ef2254e297300e3418f1aec160e98cc708d39308a8"
                               ],
    "./vehicle_info.html":  [
                                "0f27ce48d545bb2b13086acf269eb44e64ba842a3f766f34d2fa47ac39e50914",
                                "82197c83175bb5bfb2414f018da6f358f3d9d70b31f86b133b2e5a1595490f64",
                                "55d3b3e9c5ca778fad057e08742b820e429699fdd48bab31bf63772b6c6f0ecc"
                            ],
    "./rental-fleet.css":  [
                               "2cb4f02551eaa74d340750f0b74ec95ccdb500198198868ae89f2113bda12e77",
                               "0ef166139509aba1b3a28876141449c317541a932858e0434f44e7687d10118b"
                           ],
    "./common.css":  [
                         "117c234a05465ef84da6826098421b86c4765e98ca9a8275e20186bef0fc98c5",
                         "2d07c7e219d74975e5c2a452011a052aa3277d587273c8fa03702585c23f187c"
                     ],
    "./factory_search.html":  [
                                  "dd331853c4b5b3c1f878f9410555b0a852298d366dca32b04427c22d4b3d65df",
                                  "0f93b404d39150b604e49907f0d1aafc3fe7d8799b2bf1dab3748131c92eb938",
                                  "281f3926662a57831256beb9af4eb450047ac973b533e6fc124313fe1934760d"
                              ],
    "./factory_history.html":  [
                                   "227a1b13bfbb26e852efdf26c0eeb7758608404bbe4233bd9aeb8860464fd74c",
                                   "297ab6f659c55878537231cac0c423c26cbaeec714c1c0875a747bfbebffa66d",
                                   "4203204e77afa0142ffc8def5a6fdef4a9cc42a6a84188d25a83df78ee47cbd6"
                               ],
    "./ring-browse-coordinator.js":  [
                                         "2cad0a8a10e2ada17633db94f6c50238c0765a4c3b275f834f03684d2a700dcc",
                                         "cb5a79505238cfa073172c3e5ae997bb10c4855b77ea0080605716ab30f39c5b"
                                     ],
    "./factory_inspection.html":  [
                                      "22a077925906d3f189702689063ab262db6c6acc88f5f856ab7a2d938df6ffd0",
                                      "1a57266ceed3af97ed1ac3e6862e2b11cc34d4dc4ba1edba1a768caee9bb4ff9"
                                  ],
    "./owner-platform-ui.js":  [
                                   "63225f64d2ab56d34a4dc8816ab5dab24218e7bca9141ac3f77ced2224b899f2",
                                   "f2cc4d123591c31d00659cde38ea48a8d459e3a4250fbc3b0caa4d0786b55689"
                               ],
    "./fleet_check_sheet.html":  [
                                     "ae54de6d75999b967b679492011e7b76f8f0194e3a5a333e710c131e3cdd5ee1",
                                     "dcdf5aa1b6d6d8f844026486c1c165c9ea0c600c2e19e87e0c5379f05bac6bb0"
                                 ],
    "./reset_password.html":  [
                                  "d66c693f4337b8a395639d5304e447e9ee33f35dfddc006cebbd6f7ca9127d66",
                                  "fa6268c1633ce88a36e9f9d8ff3aa414ffb72eec0079854e15947741c4980209",
                                  "0017164414691212cc3067c2ee348a86da729e0cc99548a2efe8ab47a3a1d2fc"
                              ],
    "./terms.html":  [
                         "51b31d3ea78a8b9631ba807ee0d67fa0e5dbdaf5c6d4c84ca8ce32e2bbe84e9d",
                         "97e0b007bbcdbdb959bd98cf0bd1a4c8f9532912a1ca3b01dbee2527c62d16d4"
                     ],
    "./daily_history_detail.html":  [
                                        "e7fdd9dd42fc8e68e1b30371ba5caccf87661b3c51ff6ffd33999203bed80283",
                                        "b5f2b2656d714b3b9c31b032e8181f8407aff459d236e21f84e3a9db27125ca6",
                                        "f05765cbff699f6c4c507368e8142136411e0a9625847f2edb87faa65ae72bed"
                                    ],
    "./privacy.html":  [
                           "e6024ad94525aec0a5588998ca14ff1150e4c331f3a649d9a95dfa8239661b4b",
                           "28405bc4c9d5ab21fcdb88e71a8d7a517bd98e55f33b3280b2e6c1ed388c6108"
                       ],
    "./rental-fleet.js":  [
                              "950abef4d428ef7117208337f79d0c90038ca18699ed5de68e47a9d0892a2037",
                              "b55a2197117e38bbfbb0d041644b5ccfed60d1ce75e5d301bb7d66a9d59326d7"
                          ],
    "./biz_register.html":  [
                                "6da3f1ef1d98d85e0103c6669499644f1f6e0c77294e40f632fd05250d4628f7",
                                "d8814176b99deb8998383053cabd6020d03df8bdaa4817ddd2bd6bad799e24f8",
                                "42711130c0949cbbf611d8c33eb5cab100acdea66f5c2a8121885b03fb08301f"
                            ],
    "./user_fav_shop_edit.html":  [
                                      "cd3ab05a90e7c3318250c6945253937d8d2da4e5d99f6adf9e29c6044aa303e6",
                                      "7e46be0b07fa091bc0dee7d2c22b5dd424d1b9994c3544f87ecf3f130f9ec676",
                                      "2407783e5784fc5390feeb5ddd7bac422ade6dc7e90818b23191d951224b0cba"
                                  ],
    "./staff_admin.js":  [
                             "050735c31339e28d0e2da85fbc5be1f155785453c1dd04a176c2d960f0c7fcc3",
                             "d2a67581dbdbb291e68e0bc6581941c95b666c84863097c9b449c9324ea4bd80"
                         ],
    "./factory_home.html":  [
                                "f7ca11f9b0e378318d0d72f5b71e016226fe75f266e68dcff4a5de5234f4a1fb",
                                "e8a2e3c6b115d6f6f1dd156be937c31b6f43603929acb67e6c801c523d075365",
                                "222d0e1072e0f38fd0a6d20bbac1afb0b1b1ef0951f17be1a1babe7fd8e416fb"
                            ],
    "./ring-history-list.js":  [
                                   "8b3b02b51dc314cddb9ddee24549a6582e98ef18df14c39094e7f36acc5f2b01",
                                   "166bf4ec2a0ae015fa7dc597c804cdd877cf1f1e82e74721aeb261c19b58d018"
                               ],
    "./rental_fleet.html":  [
                                "d164585e091aab6fe76169eb73f8d01b1569e1dfcb6c4b6e1933378635ca5066",
                                "1edc59713c152fed6fc1cf05ec82e418060a5281bdcc5196f16a77d8c49d8e9e",
                                "6f2c8c462770626e10cd5817b10c7203c51c6680261249c10f7b12c5d89c9a38"
                            ],
    "./faq.html":  [
                       "ce44357a4f7b6b7384744c9852442849babe2ec4256858b66a92dcf7848aca87",
                       "abaa9247e347cdc00fce1f74a2531776150274f58bb442f5b557d70eedb9cd17"
                   ],
    "./ring-sync-engine.js":  [
                                  "27321e158cad0aa7829623b090aaee4ea95521bcb773250a933168dc79ff18fc",
                                  "c1c534bdb93d6389fc2367e3718b6beadb38696eceb952918e6acbcd5b1dea0b"
                              ],
    "./vehicle_detail.html":  [
                                  "61cc7e5387bb70bc35a6186cf3f2327518bc339cef44ad74388e9d525ac3a2cc",
                                  "1789edd0e4e24adb85fab0ab9039b4034dbae26efa24d3303c089b8de44406c8",
                                  "bed473ca5b9f868d8aa068619d923fe81943e6ee5b980c78f3de5577703ecbe8"
                              ],
    "./history_detail.html":  [
                                  "68695a36b9718257b961bbc8b87d55d03b6a253d64a5c914d5bf58d01da41fcc",
                                  "e8b53330e19e1af16df7d5584d46c2e37c319d0feb211d9de1ae898d37618031",
                                  "57a7c0c962788aee59a7980994fb24f512931f30fd84932b593b227b02c8f520"
                              ],
    "./factory_edit_list.html":  [
                                     "e4b08ea508b3304091bb52fb70e3117df32480d78522d21bbe6965b24c5a8b62",
                                     "42cecf1da2fedf7f9fecb3a568cb42e8add3e11ad1e026891d6bccb00c14de59"
                                 ],
    "./inspection_biz.html":  [
                                  "58d21ae8bfee533b27e5b67cebded82f7330cd38784fbe840f828c236060eb3b",
                                  "00f6791a5e12dad3d86a973a41985fb5b3f702493bfc9f2bf55a183f5e90ad89",
                                  "7d20b675ef2edf15122d6dba7600a97550573679a21e6fd2c86aa7f8246ccc54"
                              ],
    "./user_detail.html":  [
                               "70d4dd5a136f920833f463c0c87eb3ff319a586785168229e5a1d78bf8462abd",
                               "57238123f9e63da0c0f620289122a50c6271ea1dc109884d5a2908bea3f20b1a",
                               "661312dcfe99a5e6b88a87290cc0541c459ff8f0922708d3ea629b7ae78d6ef2"
                           ],
    "./user_past_vehicles.html":  [
                                      "bf83e3e46e06c05b2c215beb1261f839ddf57eb99d33b6966ea3cfb1461ac178",
                                      "c46ec4021c2cb6c5a0cc771d75b3a276aa791edf50b3ec25ad2e465242a19cce",
                                      "42227abeb2309d9be18f4c6cc0053b36d26525816ea167ad904dad585408f9cd"
                                  ],
    "./car_add.html":  [
                           "ff2e6fe78789bb7d9fcdeb4a13417c7900bf13d91b9413a1c66c0cb357dac03d",
                           "c1f9e9ef16bfdb36224bd4db8072b99c21e131db468502d933665f0c6dfc11d7",
                           "0305759b12d7c4899d7cd00e9fb737f76932cb3ad74b7b8486f5bda2fa9b4fe6"
                       ],
    "./factory_edit_detail.html":  [
                                       "91c1fa702a19ff44046ae8fba41989ba7de3d7f877fced5fa0a4843983eabb0d",
                                       "444d0dc888b4f5b9d3484904dbda47244e059874376b8301d8626de73f8a0d9a",
                                       "8c1e0a1b5129faa23fe0e90b2ccea5a1c58a19a79dfbc37fe2629286baa0cb48"
                                   ],
    "./user_mypage.html":  [
                               "526df92c4671d3205633bda3c3931ea04104749646daba7aff189dcb79c6c08f",
                               "2e6fca60ed9990198e6a9eca75586a4475f36a20e75c1332b00efee3c7b525ce",
                               "5636ac7c85eb46d9204358da9fdc5319d57b268f493a5c63ffcadf5bed47f915"
                           ],
    "./ring-sync-store.js":  [
                                 "f8e0d9f2f8ae35e7661a9072acfd354a565b6cc7e42981343b625d411c591d67",
                                 "f16c1ab5c32780e2002897e2dc031bcdfc3c47e82935939cf57af3bc5bc75521"
                             ],
    "./vin-search.js":  [
                            "9080f6763a29c15f3dcc102df07b185b074babfbbba180348a6bab14b75c8c05",
                            "2818fc73715585324cca43bda8dec6745a962b4200ce57115a08ecb2a13a1d71"
                        ],
    "./history.html":  [
                           "7ed7507da696ad6c7f7236df1fb4a821a0d8d993851c64236c0e1c5f75440a3f",
                           "7becbed959073807f117d6819d50b07e7750f800604ee306cf287ad72c35f7c0"
                       ],
    "./dealer_input.html":  [
                                "ae9978934fd91bccadf0b5e94bb35fa704c11a9c28b03db34e351d3b25b494c4",
                                "f2642a0f82e313960138aa08003e71ebbf18b47967b9f746a250b3529baf07a4",
                                "d582ee0c9f531dfe14c0617c61664d5268a44468e34653b655f9e460a1b499cd"
                            ],
    "./ring-browse-warmup.js":  [
                                    "6c09d98e26d5be0ebe32d29db92a32ee83311b64958b421c63085c81233dd67b",
                                    "0141bafa056090015c068f3aa076d5c7289039a5a04692669e5fa6a97aa75f31"
                                ],
    "./dealer_admin.html":  [
                                "da0bbbabca54cb7e837a88f8f8c1b3bbed4032612e250c7acebd7e5a44cffb5e",
                                "48164b2a0853d061cf8714a383283f3c7eebbe207033a5f578deb60c216834e4",
                                "37fd9601b33586ada3b0484e46b7be4e66e449eaef159378c165a9170241bd96"
                            ],
    "./user_fav_shops.html":  [
                                  "49cce03accc436b17604b7063a2a3415325e5918350db2fcdeda84a144956d71",
                                  "b583a4b157971f40b8bfd7ba5d660edc3063c9476b6aa9c64b1c0b7994693cea",
                                  "b6d3e42c1e61ffe6a47e4d2cd402bdae2150c03ae9d6b2d96536428a974d8e2c"
                              ],
    "./user_line_callback.html":  [
                                      "d4097d3e9209455477be6ac25501bfdafec82bbb5d08bc777e91f746ed0b41a2",
                                      "85f8e7bb93f9e50c526ea06ed8ecbe7de6ea9877421935ce40ae21746e101f91"
                                  ],
    "./user_inspection.html":  [
                                   "f558c677a8c8347f3f2c3606e7754e7c0154a5523bfa96ebb8c414f2a9f51187",
                                   "089a31ebbd1505ac14dec5655b9c7280ec49f2d1ed3d0b17abe3d1b5c5a93903"
                               ],
    "./vehicles.html":  [
                            "13565097698cde4a84978c7d351db20a6ea8b5f67693669da295f533a2ffdc3d",
                            "0a6408407c49865811dbba887bf9fc06f0912980a88d67f4870db1a0bf23c488"
                        ],
    "./index.html":  [
                         "f4b1b38b65dd6c3c721600a08dab443e0e15ca8c720c6c075bf22473bfa2ddab",
                         "a5b49051b675db5b677831e9edcddd234c29503f29f9d21c2673b23d5ecef18e",
                         "1351f5af75575b4fd6122ddff3a20fa222944085ab22d3485c689c8a02b0d4cd"
                     ],
    "./vendor/qr/qrcode.js":  [
                                  "18ae399f81182bc9de916e9c77b195df20cc58d6f2d55a62b085a299f1bf1780",
                                  "4b6133cbb5a13ecdc26cfa897d0daf7bb9b08232032cdd381e82f2baf3653b5f"
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
