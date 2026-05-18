/**
 * 車のお薬手帳 - 統合コアスクリプト (app.js)
 */

const RING_DEFAULT_GAS_URL = 'https://script.google.com/macros/s/AKfycbyhCvgY5yfduRDPxiIbGGwCpPMrDiwtKg57I28gHnWAcZexUgvd9r2PqnIm2-QSss4C/exec';
/** `app.js` より先に `window.__RING_GAS_URL_OVERRIDE__` をセットすると本番 URL を差し替え可能 */
const GAS_URL = (typeof window !== 'undefined' && window.__RING_GAS_URL_OVERRIDE__)
    ? String(window.__RING_GAS_URL_OVERRIDE__).trim()
    : RING_DEFAULT_GAS_URL;
/** ads/ads.js から fetch する際の参照用（別スクリプトでは const が見えないため） */
if (typeof window !== 'undefined') window.__RING_GAS_URL__ = GAS_URL;

/** GIS renderButton の幅（付箋内・max-width420 のコンテンツ幅に合わせる） */
const RING_GSI_BUTTON_WIDTH = 364;

/** Google Sign-In の OAuth クライアント ID。HTML より前に window.__RING_GOOGLE_WEB_CLIENT_ID__ で上書き可 */
const RING_GOOGLE_WEB_CLIENT_ID = (function () {
  if (typeof window === 'undefined') return '';
  if (window.__RING_GOOGLE_WEB_CLIENT_ID__) return String(window.__RING_GOOGLE_WEB_CLIENT_ID__).trim();
  return '837629231147-n7tuh402iosbtva4tc5l523qjhvdg1uc.apps.googleusercontent.com';
})();

/** 一般ユーザー新規登録・Google 初回登録時の規約／ポリシー同意（sessionStorage） */
const RING_USER_REG_CONSENT_KEY = 'nappy_user_reg_consent';
/** クライアント・GAS で同一値であること（改版時は両方更新） */
const RING_LEGAL_TERMS_VERSION = '1.0';
const RING_LEGAL_PRIVACY_VERSION = '1.0';

function ringReadUserRegConsent() {
    try {
        const raw = sessionStorage.getItem(RING_USER_REG_CONSENT_KEY);
        if (!raw) return null;
        const o = JSON.parse(raw);
        if (!o || typeof o !== 'object') return null;
        if (o.termsVersion !== RING_LEGAL_TERMS_VERSION || o.privacyVersion !== RING_LEGAL_PRIVACY_VERSION) return null;
        if (!o.consentAt || typeof o.consentAt !== 'string') return null;
        return o;
    } catch (e) {
        return null;
    }
}

/** チェック済みであることを確認したうえで同意記録を保存（user_login / index のボタンから呼ぶ） */
function ringSaveUserRegConsent() {
    sessionStorage.setItem(RING_USER_REG_CONSENT_KEY, JSON.stringify({
        consentAt: new Date().toISOString(),
        termsVersion: RING_LEGAL_TERMS_VERSION,
        privacyVersion: RING_LEGAL_PRIVACY_VERSION
    }));
}

/**
 * GIS が返す JWT のペイロードをデコードする（表示・送信補助用。真正な検証は GAS）。
 */
function ringDecodeGoogleCredentialJwt(credential) {
    try {
        const parts = String(credential || '').split('.');
        if (parts.length < 2) return null;
        let b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        while (b64.length % 4 !== 0) b64 += '=';
        const payload = JSON.parse(atob(b64));
        return {
            sub: String(payload.sub || ''),
            email: String(payload.email || ''),
            name: String(payload.name || '')
        };
    } catch (e) {
        return null;
    }
}

/**
 * Google Identity Services の credential コールバック（名前・メール取得後 sendToGAS_Safe）。
 */
async function handleGoogleCredentialResponse(response) {
    if (!response || !response.credential) return;

    const decoded = ringDecodeGoogleCredentialJwt(response.credential);
    if (typeof window !== 'undefined') {
        window.__ringLastGoogleCredentialMeta = decoded || null;
    }

    showLoading('Googleで認証中', 'サーバーと通信しています...');
    try {
        const payload = { credential: response.credential };
        if (decoded) {
            if (decoded.email) payload.googleEmail = decoded.email;
            if (decoded.name) payload.googleName = decoded.name;
        }
        const consent = ringReadUserRegConsent();
        if (consent) {
            payload.consentAt = consent.consentAt;
            payload.termsVersion = consent.termsVersion;
            payload.privacyVersion = consent.privacyVersion;
        }

        const data = await sendToGAS_Safe('user_google_auth', payload);
        hideLoading();

        if (data.profile && (data.profile.role === 'user' || data.profile.shopType === 'user')) {
            try {
                sessionStorage.removeItem(RING_USER_REG_CONSENT_KEY);
            } catch (e1) { /* ignore */ }
            const emailHint = decoded && decoded.email ? decoded.email : (data.profile.googleEmail || '');
            if (emailHint) data.profile.googleEmail = emailHint;
            login(data.profile, data.authToken);
            location.replace('user_home.html');
            return;
        }

        showToast('error', 'ユーザー用のアカウントではありません。');
    } catch (err) {
        hideLoading();
        const msg = String(err && err.message ? err.message : err || '');
        showToast('error', msg || '認証に失敗しました');
        if (/規約|同意|新規登録/.test(msg)) {
            if (typeof switchTab === 'function') {
                try {
                    switchTab('register');
                    if (typeof syncRegisterConsentUI === 'function') syncRegisterConsentUI();
                    ringBootGoogleSignIn(['googleSignInSlotLogin', 'googleSignInSlotRegister']);
                } catch (e2) { /* ignore */ }
            }
        }
    }
}

/**
 * GIS のボタンを指定した要素 ID に描画する。
 * @param {string[]} slotIds
 */
function ringBootGoogleSignIn(slotIds) {
    const ids = Array.isArray(slotIds) ? slotIds : ['googleSignInSlotLogin', 'googleSignInSlotRegister'];
    const cid = typeof RING_GOOGLE_WEB_CLIENT_ID !== 'undefined' ? String(RING_GOOGLE_WEB_CLIENT_ID).trim() : '';
    ids.forEach(function (slotId) {
        const el = document.getElementById(slotId);
        if (!el) return;
        el.classList.toggle('ring-google-visible', !!cid);
        if (!cid) el.innerHTML = '';
    });
    if (!cid) return;
    if (!window.google || !google.accounts || !google.accounts.id) {
        setTimeout(function () { ringBootGoogleSignIn(ids); }, 120);
        return;
    }
    if (!window.__ringGsiInited) {
        google.accounts.id.initialize({
            client_id: cid,
            callback: handleGoogleCredentialResponse,
            ux_mode: 'popup',
            auto_select: false
        });
        window.__ringGsiInited = true;
    }
    ids.forEach(function (slotId) {
        const el = document.getElementById(slotId);
        if (!el || !el.classList.contains('ring-google-visible')) return;
        el.innerHTML = '';
        google.accounts.id.renderButton(el, {
            theme: 'outline',
            size: 'large',
            text: 'signin_with',
            shape: 'rectangular',
            width: RING_GSI_BUTTON_WIDTH,
            locale: 'ja'
        });
    });
}

const DB_VEHICLES = "nappy_vehicles_v1";
const DB_LOGS = "nappy_logs_v1";
const DB_INSPECTIONS = "inspections_v1"; 
const DB_CURRENT_USER = "nappy_current_user";  
const DB_LEGACY_PROFILE = "nappy_profile_v1";
/** GAS 失敗時の再送キュー（C-01） */
const DB_RETRY_QUEUE = "ring_retry_queue_v1";

/**
 * localStorage JSON 破損対策（H-03）。失敗時は退避キーに生文字列を残す。
 */
function safeJsonParse(str, fallback) {
    try {
        if (str == null || str === '') return fallback;
        return JSON.parse(str);
    } catch (e) {
        try {
            localStorage.setItem('ring_corrupt_backup_' + Date.now(), String(str).slice(0, 50000));
        } catch (e2) { /* ignore */ }
        return fallback;
    }
}

function readLogsArray() {
    const v = safeJsonParse(localStorage.getItem(DB_LOGS), []);
    return Array.isArray(v) ? v : [];
}

/** C-01: 再送キュー件数（ホーム表示用） */
function getPendingRetryCount() {
    const q = safeJsonParse(localStorage.getItem(DB_RETRY_QUEUE), []);
    return Array.isArray(q) ? q.length : 0;
}

/**
 * ユーザー認証管理
 */
function login(profile, authToken) {
    const raw = JSON.stringify(profile);
    localStorage.setItem(DB_CURRENT_USER, raw);
    localStorage.setItem(DB_LEGACY_PROFILE, raw);
    if (authToken) localStorage.setItem('ring_auth_token', authToken);
}
function getCurrentProfile() {
    const current = safeJsonParse(localStorage.getItem(DB_CURRENT_USER), null);
    if (current) return current;
    return safeJsonParse(localStorage.getItem(DB_LEGACY_PROFILE), null);
}
function logout() {
    localStorage.removeItem(DB_CURRENT_USER);
    localStorage.removeItem(DB_LEGACY_PROFILE);
    localStorage.removeItem('ring_auth_token');
}

// ★ 全ページ共通のログアウト処理
function logoutApp() {
  showRingConfirm({
    title: 'ログアウト',
    message: 'ログアウトしてトップ画面に戻りますか？',
    okLabel: 'ログアウト',
    cancelLabel: 'キャンセル'
  }).then(function (ok) {
    if (!ok) return;
    logout();
    location.href = 'splash.html';
  });
}

/** デモログイン時に投入するデータの識別子（再ログインで古いデモだけ差し替え） */
var DEMO_DATA_TAG = 'ringAutoDemo';

/**
 * 配列からデモタグ付き要素だけ除去する
 */
function stripDemoTagged(arr) {
  return (arr || []).filter(function (x) { return x && x.__demoTag !== DEMO_DATA_TAG; });
}

/**
 * デモログイン直前に呼ぶ。車両・履歴・日常点検・店舗・お気に入りをローカルに投入する（本番データはデモタグ無しのものは触らない）
 * @param {'factory'|'dealer'|'user'} role
 */
function seedDemoEnvironment(role) {
  var shopNameF = 'RinG Auto 整備工場';
  var shopNameD = 'T.G販売店';
  var shopIdF = 'SHOP-DEMO-F';
  var shopIdD = 'SHOP-DEMO-D';
  var nowIso = new Date().toISOString();

  // 1) 店舗マスタ（詳細画面の陸運局・指定番号表示用）
  var shops = stripDemoTagged(JSON.parse(localStorage.getItem('nappy_shops_v1') || '[]'));
  shops.push({
    shopId: shopIdF,
    shopName: shopNameF,
    transportBureau: '兵庫運輸監理部',
    riku_un: '兵庫運輸監理部',
    factoryType: '指定工場',
    factoryNumber: '第11234号',
    certNumber: '第11234号',
    address: '兵庫県西宮市壇上町1-2-3（デモ）',
    tel: '0798-12-3456',
    email: 'demo@ring-auto.example.jp',
    __demoTag: DEMO_DATA_TAG
  });
  shops.push({
    shopId: shopIdD,
    shopName: shopNameD,
    transportBureau: '近畿運輸局',
    riku_un: '近畿運輸局',
    factoryType: '認証',
    factoryNumber: '第55678号',
    certNumber: '第55678号',
    address: '大阪府大阪市北区梅田2-4-9（デモ）',
    tel: '06-1234-5678',
    email: 'info@tg-dealer.example.jp',
    __demoTag: DEMO_DATA_TAG
  });
  localStorage.setItem('nappy_shops_v1', JSON.stringify(shops));

  // 2) 車両
  var vehicles = stripDemoTagged(JSON.parse(localStorage.getItem(DB_VEHICLES) || '[]'));

  function baseV(extra) {
    var o = {
      inspectMonths: 12,
      lastMaint: '2025-10-15',
      createdAt: nowIso,
      __demoTag: DEMO_DATA_TAG
    };
    for (var k in extra) { if (Object.prototype.hasOwnProperty.call(extra, k)) o[k] = extra[k]; }
    return o;
  }

  if (role === 'factory') {
    vehicles.push(baseV({
      vin: 'ZVW50-5012847',
      model: '代車１',
      nickname: '代車１',
      vehicleModel: 'DBA-ZVW50',
      engine: '2ZR-FXE',
      category: '12001',
      classification: '12001',
      typeDesignation: '17456',
      nextShaken: '2026-12-15',
      firstRegistration: '2020-03',
      vClass: '普通乗用',
      usage: '乗用',
      ownerType: '自家用',
      vehicleCategory: 'loaner',
      shopId: shopIdF,
      shopName: shopNameF,
      shopType: 'factory'
    }));
    vehicles.push(baseV({
      vin: 'TRH200-8830192',
      model: '管理車両１',
      nickname: '管理車両１',
      vehicleModel: 'CBF-TRH200V',
      engine: '1TR-FE',
      category: '20001',
      classification: '20001',
      typeDesignation: '20145',
      nextShaken: '2027-03-20',
      firstRegistration: '2019-08',
      vClass: '普通貨物',
      usage: '貨物',
      ownerType: '事業用',
      vehicleCategory: 'managed',
      shopId: shopIdF,
      shopName: shopNameF,
      shopType: 'factory'
    }));
    vehicles.push(baseV({
      vin: 'JF1-7741256',
      model: 'あ１２３４',
      nickname: 'あ１２３４',
      vehicleModel: 'DBA-JF1',
      engine: 'S07B',
      category: '85001',
      classification: '85001',
      typeDesignation: '12308',
      nextShaken: '2025-11-30',
      firstRegistration: '2018-05',
      vClass: '軽自動車',
      usage: '乗用',
      ownerType: '自家用',
      vehicleCategory: 'managed',
      shopId: shopIdF,
      shopName: shopNameF,
      shopType: 'factory'
    }));
  } else if (role === 'dealer') {
    vehicles.push(baseV({
      vin: 'ZVW50-5012847',
      model: '代車１',
      nickname: '代車１',
      vehicleModel: 'DBA-ZVW50',
      engine: '2ZR-FXE',
      category: '12001',
      classification: '12001',
      typeDesignation: '17456',
      nextShaken: '2026-12-15',
      firstRegistration: '2020-03',
      vClass: '普通乗用',
      usage: '乗用',
      ownerType: '自家用',
      vehicleCategory: 'loaner',
      shopId: shopIdD,
      shopName: shopNameD,
      shopType: 'dealer'
    }));
    vehicles.push(baseV({
      vin: 'TRH200-8830192',
      model: '管理車両１',
      nickname: '管理車両１',
      vehicleModel: 'CBF-TRH200V',
      engine: '1TR-FE',
      category: '20001',
      classification: '20001',
      typeDesignation: '20145',
      nextShaken: '2027-03-20',
      firstRegistration: '2019-08',
      vClass: '普通貨物',
      usage: '貨物',
      ownerType: '事業用',
      vehicleCategory: 'managed',
      shopId: shopIdD,
      shopName: shopNameD,
      shopType: 'dealer'
    }));
    vehicles.push(baseV({
      vin: 'JF1-7741256',
      model: 'あ１２３４',
      nickname: 'あ１２３４',
      vehicleModel: 'DBA-JF1',
      engine: 'S07B',
      category: '85001',
      classification: '85001',
      typeDesignation: '12308',
      nextShaken: '2025-11-30',
      firstRegistration: '2018-05',
      vClass: '軽自動車',
      usage: '乗用',
      ownerType: '自家用',
      vehicleCategory: 'managed',
      shopId: shopIdD,
      shopName: shopNameD,
      shopType: 'dealer'
    }));
  } else {
    vehicles.push(baseV({
      vin: 'ZVW50-6021939',
      model: '通勤のプリウス',
      nickname: '通勤のプリウス',
      vehicleModel: 'DBA-ZVW50',
      engine: '2ZR-FXE',
      category: '12001',
      classification: '12001',
      typeDesignation: '17456',
      nextShaken: '2026-08-10',
      firstRegistration: '2021-06',
      vClass: '普通乗用',
      usage: '乗用',
      ownerType: '自家用',
      userId: 'U-DEMO01',
      ownerId: 'U-DEMO01'
    }));
    vehicles.push(baseV({
      vin: 'JF1-8901245',
      model: 'あ１２３４',
      nickname: 'あ１２３４',
      vehicleModel: 'DBA-JF1',
      engine: 'S07B',
      category: '85001',
      classification: '85001',
      typeDesignation: '12308',
      nextShaken: '2025-12-01',
      firstRegistration: '2017-11',
      vClass: '軽自動車',
      usage: '乗用',
      ownerType: '自家用',
      userId: 'U-DEMO01',
      ownerId: 'U-DEMO01'
    }));
    vehicles.push(baseV({
      vin: 'GR3-2201188',
      model: '週末ドライブ',
      nickname: '週末ドライブ',
      vehicleModel: 'DBA-GR3',
      engine: 'L15B',
      category: '13001',
      classification: '13001',
      typeDesignation: '18901',
      nextShaken: '2027-01-20',
      firstRegistration: '2022-04',
      vClass: '小型乗用',
      usage: '乗用',
      ownerType: '自家用',
      userId: 'U-DEMO01',
      ownerId: 'U-DEMO01'
    }));
  }
  localStorage.setItem(DB_VEHICLES, JSON.stringify(vehicles));

  // 3) 整備履歴
  var logs = stripDemoTagged(JSON.parse(localStorage.getItem(DB_LOGS) || '[]'));
  function pushLog(obj) {
    logs.push(Object.assign({ __demoTag: DEMO_DATA_TAG, createdAt: nowIso }, obj));
  }

  if (role === 'factory') {
    pushLog({ log_id: 'LOG-DEMO-F-01', vin: 'ZVW50-5012847', date: '2025-11-08', mileage: 43800, title: '12ヶ月点検', shopId: shopIdF, shopName: shopNameF, shopType: 'factory', factoryType: '指定工場', factoryNumber: '第11234号', parts: 'エンジンオイル・オイルフィルター交換', memo: 'デモ用の履歴です。' });
    pushLog({ log_id: 'LOG-DEMO-F-02', vin: 'ZVW50-5012847', date: '2025-05-12', mileage: 41200, title: 'タイヤローテーション', shopId: shopIdF, shopName: shopNameF, shopType: 'factory', parts: '前後ローテーション実施', memo: '' });
    pushLog({ log_id: 'LOG-DEMO-F-03', vin: 'TRH200-8830192', date: '2025-09-20', mileage: 156000, title: 'エアフィルター交換', shopId: shopIdF, shopName: shopNameF, shopType: 'factory', parts: 'エアエレメント', memo: '' });
    pushLog({ log_id: 'LOG-DEMO-F-04', vin: 'JF1-7741256', date: '2025-08-03', mileage: 62000, title: '車検（法定24ヶ月）', shopId: shopIdF, shopName: shopNameF, shopType: 'factory', parts: 'ブレーキパッド・ワイパーゴム', memo: 'デモ用' });
  } else if (role === 'dealer') {
    pushLog({ log_id: 'LOG-DEMO-D-01', vin: 'ZVW50-5012847', date: '2025-10-01', mileage: 43000, title: '新車点検（無料）', shopId: shopIdD, shopName: shopNameD, shopType: 'dealer', factoryType: '認証', factoryNumber: '第55678号', parts: '点検のみ', memo: 'デモ用' });
    pushLog({ log_id: 'LOG-DEMO-D-02', vin: 'TRH200-8830192', date: '2025-07-15', mileage: 154200, title: 'エンジンオイル交換', shopId: shopIdD, shopName: shopNameD, shopType: 'dealer', parts: '0W-20 4L', memo: '' });
    pushLog({ log_id: 'LOG-DEMO-D-03', vin: 'JF1-7741256', date: '2025-04-22', mileage: 59800, title: 'エアコンガス補充', shopId: shopIdD, shopName: shopNameD, shopType: 'dealer', parts: 'HFC-134a', memo: 'デモ用' });
  } else {
    pushLog({ log_id: 'LOG-DEMO-U-01', vin: 'ZVW50-6021939', date: '2025-09-10', mileage: 28500, title: '一般整備', shopId: shopIdF, shopName: shopNameF, shopType: 'factory', parts: 'エンジンオイル交換', memo: 'かかりつけ工場で実施（デモ）' });
    pushLog({ log_id: 'LOG-DEMO-U-02', vin: 'ZVW50-6021939', date: '2025-03-02', mileage: 26800, title: 'タイヤ交換', shopId: shopIdF, shopName: shopNameF, shopType: 'factory', parts: '夏タイヤ 4本', memo: '' });
    pushLog({ log_id: 'LOG-DEMO-U-03', vin: 'JF1-8901245', date: '2025-08-18', mileage: 71200, title: 'バッテリー交換', shopId: shopIdF, shopName: shopNameF, shopType: 'factory', parts: '60B19L', memo: '' });
    pushLog({ log_id: 'LOG-DEMO-U-04', vin: 'GR3-2201188', date: '2025-06-01', mileage: 12000, title: '6ヶ月点検', shopId: shopIdF, shopName: shopNameF, shopType: 'factory', parts: '点検のみ', memo: 'デモ' });
    pushLog({ log_id: 'LOG-DEMO-U-05', vin: 'ZVW50-6021939', date: '2025-11-01', mileage: 29200, type: 'inspection_user', title: '【日常点検】気になる項目あり', shopType: 'user', parts: 'タイヤ空気圧：NG', memo: 'ユーザー日常点検（デモ）' });
  }
  localStorage.setItem(DB_LOGS, JSON.stringify(logs));

  // 4) 日常点検 inspections_v1
  var insp = stripDemoTagged(JSON.parse(localStorage.getItem('inspections_v1') || '[]'));
  function pushInsp(o) {
    insp.push(Object.assign({ __demoTag: DEMO_DATA_TAG, createdAt: nowIso }, o));
  }

  var checksOk = { e1: '良', e2: '良', t1: '良', b1: '良', l1: '良', w1: '良', o1: '無' };
  var checksNg = { e1: '良', e2: '良', t2: '点', b1: '良', l1: '良', w1: '良', o1: '無' };
  var ucAll = { u1: 'OK', u2: 'OK', u3: 'OK', u4: 'OK', u5: 'OK', u6: 'OK', u7: 'OK', u8: 'OK', u9: 'OK' };
  var ucNg = { u1: 'OK', u2: 'OK', u3: 'NG', u4: 'OK', u5: 'OK', u6: 'OK', u7: 'OK', u8: 'OK', u9: 'OK' };

  if (role === 'factory' || role === 'dealer') {
    var sid = role === 'factory' ? shopIdF : shopIdD;
    var sna = role === 'factory' ? shopNameF : shopNameD;
    var st = role === 'dealer' ? 'dealer' : 'factory';
    pushInsp({ log_id: 'INS-DEMO-B-1', vin: 'ZVW50-5012847', date: '2025-11-20', title: '日常点検', type: 'inspection', memo: '', checks: checksOk, mileage: 43600, shopId: sid, shopName: sna, shopType: st });
    pushInsp({ log_id: 'INS-DEMO-B-2', vin: 'ZVW50-5012847', date: '2025-10-05', title: '日常点検', type: 'inspection', memo: 'タイヤに小石挟まり（デモ）', checks: checksNg, mileage: 43400, shopId: sid, shopName: sna, shopType: st });
    pushInsp({ log_id: 'INS-DEMO-B-3', vin: 'TRH200-8830192', date: '2025-11-18', title: '日常点検', type: 'inspection', memo: '', checks: checksOk, mileage: 155800, shopId: sid, shopName: sna, shopType: st });
  } else {
    pushInsp({ log_id: 'INS-DEMO-U-I1', logId: 'INS-DEMO-U-I1', vin: 'ZVW50-6021939', date: '2025-11-12', title: '日常点検', type: 'inspection_user', memo: '', userChecks: ucAll, mileage: 29100 });
    pushInsp({ log_id: 'INS-DEMO-U-I2', logId: 'INS-DEMO-U-I2', vin: 'ZVW50-6021939', date: '2025-10-08', title: '日常点検', type: 'inspection_user', memo: '空気圧が少し心配（デモ）', userChecks: ucNg, mileage: 28950 });
    pushInsp({ log_id: 'INS-DEMO-U-I3', logId: 'INS-DEMO-U-I3', vin: 'JF1-8901245', date: '2025-11-01', title: '日常点検', type: 'inspection_user', memo: '', userChecks: ucAll, mileage: 71000 });
  }
  localStorage.setItem('inspections_v1', JSON.stringify(insp));

  // 5) ユーザーかかりつけ（お気に入り）
  if (role === 'user') {
    var fav = stripDemoTagged(JSON.parse(localStorage.getItem('nappy_fav_shops_v1') || '[]'));
    fav.push({
      shopId: shopIdF,
      shopName: shopNameF,
      factoryNumber: '指定工場 第11234号',
      address: '兵庫県西宮市壇上町1-2-3（デモ）',
      tel: '0798-12-3456',
      email: 'demo@ring-auto.example.jp',
      lineUrl: '#',
      __demoTag: DEMO_DATA_TAG
    });
    localStorage.setItem('nappy_fav_shops_v1', JSON.stringify(fav));
  }
}

/**
 * 車両データ管理
 */
function loadVehicles() {
    const v = safeJsonParse(localStorage.getItem(DB_VEHICLES), []);
    return Array.isArray(v) ? v : [];
}

/**
 * 車台番号の正規化処理
 * 全角を半角へ、小文字を大文字へ変換し、ハイフンや空白を除去する
 */
function _normalize(v) {
    if (!v) return "";
    return v.replace(/[Ａ-Ｚａ-ｚ０-９]/g, s => String.fromCharCode(s.charCodeAt(0) - 0xFEE0))
            .toUpperCase()
            .replace(/[-ー－\s]/g, '');
}

/**
 * C-04: 日常点検の対象となるよう、VIN がマイカー／自店管理車両に登録されているか
 */
function isVinRegisteredForInspection(vin, profile) {
    if (!vin || !profile) return false;
    const vehicles = loadVehicles();
    const norm = _normalize(vin);
    return vehicles.some((veh) => {
        if (_normalize(veh.vin || "") !== norm) return false;
        const st = String(profile.shopType || "");
        if (st === "user") {
            return String(veh.userId || "") === String(profile.userId || "");
        }
        return String(veh.shopId || "") === String(profile.shopId || "");
    });
}

/**
 * C-04: GAS から日常点検履歴を取得（認証失敗時は空配列）
 */
async function fetchDailyHistoryFromGas(vin) {
    if (!vin) return [];
    try {
        const json = await sendToGAS_Safe("get_daily_history", { vin: String(vin).trim() });
        return Array.isArray(json.history) ? json.history : [];
    } catch (e) {
        return [];
    }
}

/**
 * C-04: ローカル inspections とサーバ履歴を log_id で重複排除マージ
 */
function mergeInspectionHistoryLocalAndServer(localList, serverList) {
    const map = new Map();
    function keyOf(item) {
        const k = String(item.log_id || item.logId || "");
        if (k) return "id:" + k;
        return "fallback:" + String(item.createdAt || "") + ":" + String(item.date || "");
    }
    (localList || []).forEach((item) => {
        map.set(keyOf(item), item);
    });
    (serverList || []).forEach((item) => {
        const k = keyOf(item);
        if (k.startsWith("fallback:")) return;
        if (!map.has(k)) {
            const copy = JSON.parse(JSON.stringify(item));
            copy.type = copy.type || "inspection";
            copy._fromServer = true;
            map.set(k, copy);
        }
    });
    return Array.from(map.values());
}

/**
 * get_vehicles 応答1件をローカル車両オブジェクト形へ（kannsa: サーバ取得の配線）
 */
function mapGasVehicleRowToLocal(row) {
    if (!row || !row.vin) return null;
    const vin = String(row.vin).trim().toUpperCase();
    return {
        vin,
        vClass: row.vClass || "",
        usage: row.usage || "",
        ownerType: row.ownerType || "",
        nextShaken: row.nextShaken || "",
        userId: row.userId || "",
        shopId: row.shopId || "",
        vehicleModel: row.vehicleModel || "",
        engine: row.engine || "",
        classification: row.classification || "",
        category: row.classification || row.category || "",
        typeDesignation: row.typeDesignation || "",
        model: row.model || "",
        vehicleCategory: row.vehicleCategory || "managed",
        firstRegistration: row.firstRegistration || "",
        createdAt: row.createdAt || ""
    };
}

/**
 * ローカル nappy_vehicles_v1 とサーバ一覧を VIN 単位でマージ
 */
function mergeVehiclesLocalAndServer(localList, serverList) {
    const map = new Map();
    (localList || []).forEach((car) => {
        const k = _normalize(car.vin);
        if (!k) return;
        map.set(k, { ...car });
    });
    (serverList || []).forEach((row) => {
        const loc = mapGasVehicleRowToLocal(row);
        if (!loc) return;
        const k = _normalize(loc.vin);
        const prev = map.get(k) || {};
        const merged = {
            ...prev,
            ...loc,
            inspectMonths: prev.inspectMonths || 12,
            lastMaint: prev.lastMaint,
            nickname: prev.nickname,
            shopName: prev.shopName,
            shopType: prev.shopType
        };
        if (!merged.createdAt && prev.createdAt) merged.createdAt = prev.createdAt;
        if (!merged.createdAt) merged.createdAt = new Date().toISOString();
        map.set(k, merged);
    });
    return Array.from(map.values());
}

/**
 * 車両一覧画面用: get_vehicles でサーバとローカルをマージして保存
 */
async function syncVehiclesFromServer() {
    const token = localStorage.getItem("ring_auth_token");
    if (!token) return loadVehicles();
    try {
        const json = await sendToGAS_Safe("get_vehicles", {});
        if (!json || json.success === false || !Array.isArray(json.vehicles)) {
            return loadVehicles();
        }
        const merged = mergeVehiclesLocalAndServer(loadVehicles(), json.vehicles);
        localStorage.setItem(DB_VEHICLES, JSON.stringify(merged));
        return merged;
    } catch (e) {
        return loadVehicles();
    }
}

/**
 * 整備履歴（History_Events 系）のみ。日常点検タイプは除外（C-04 / factory_history 用）
 */
function isMaintenanceLogType(log) {
    const t = log && log.type;
    if (t === "inspection" || t === "inspection_user") return false;
    return true;
}

/**
 * 車両の追加・更新
 */
async function addVehicle(v) {
    const list = loadVehicles();
    const i = list.findIndex(x => _normalize(x.vin) === _normalize(v.vin));
    const merged = i !== -1 ? { ...list[i], ...v } : { ...v };
    merged.createdAt = merged.createdAt || new Date().toISOString();
    if (i !== -1) list[i] = merged; else list.push(merged);
    localStorage.setItem(DB_VEHICLES, JSON.stringify(list));
    try {
        return await sendToGAS_Safe('vehicle', merged);
    } catch (err) {
        const msg = String(err.message || '');
        if (/VIN_REQUIRED/i.test(msg)) {
            return { success: false, error: msg, localSaved: true, serverSaved: false, queued: false };
        }
        enqueueRetry('vehicle', merged);
        return { success: false, error: err.message, queued: true, localSaved: true, serverSaved: false };
    }
}

/**
 * 整備ログの保存
 */
async function saveLog(d) {
    const list = readLogsArray();
    const newLogId = d.log_id || `LOG-${Date.now()}`;
    const profile = getCurrentProfile() || {};
    const cleanVin = (d.vin || "").toUpperCase();

    const newEntry = {
        ...d,
        vin: cleanVin,
        log_id: newLogId,
        shopId: d.shopId || profile.shopId || "",
        shopName: d.shopName || profile.shopName || "",
        shopType: d.shopType || profile.shopType || "",
        factoryType: d.factoryType || profile.factoryType || "",
        factoryNumber: d.factoryNumber || profile.factoryNumber || ""
    };
    newEntry.createdAt = newEntry.createdAt || new Date().toISOString();

    list.push(newEntry);
    localStorage.setItem(DB_LOGS, JSON.stringify(list));

    try {
        await sendToGAS_Safe('log', newEntry);
        return { logId: newLogId, localSaved: true, serverSaved: true };
    } catch (err) {
        const msg = String(err && err.message ? err.message : err || '');
        if (/VIN_REQUIRED|LOG_DATE_REQUIRED/i.test(msg)) {
            return { logId: newLogId, localSaved: true, serverSaved: false, error: msg, queued: false };
        }
        enqueueRetry('log', newEntry);
        return { logId: newLogId, localSaved: true, serverSaved: false, error: err.message, queued: true };
    }
}

/**
 * VINに基づいたログの抽出
 * 正規化比較を行い、日付の降順でソートして返す
 */
function getLogsByVin(vin) { 
    const searchTarget = _normalize(vin);
    return readLogsArray().filter(l => {
        return _normalize(l.vin) === searchTarget;
    }).sort((a,b) => new Date(b.date)-new Date(a.date)); 
}

/** 整備履歴のみ（日常点検 type を除外）。C-04 */
function getMaintenanceLogsByVin(vin) {
    return getLogsByVin(vin).filter(isMaintenanceLogType);
}

/**
 * GAS：fetch タイムアウト（H-01）
 */
async function fetchJsonWithTimeout(url, options, timeoutMs) {
    const ms = timeoutMs != null ? timeoutMs : 20000;
    if (typeof AbortController === 'undefined') {
        const res = await fetch(url, options || {});
        if (!res.ok) throw new Error('HTTP_' + res.status);
        const text = await res.text();
        try {
            return JSON.parse(text);
        } catch (e) {
            throw new Error('INVALID_JSON');
        }
    }
    const controller = new AbortController();
    const timer = setTimeout(function () { controller.abort(); }, ms);
    try {
        const res = await fetch(url, Object.assign({}, options || {}, { signal: controller.signal }));
        if (!res.ok) throw new Error('HTTP_' + res.status);
        const text = await res.text();
        try {
            return JSON.parse(text);
        } catch (e) {
            throw new Error('INVALID_JSON');
        }
    } finally {
        clearTimeout(timer);
    }
}

/**
 * GAS送信処理
 */
async function sendToGAS_Safe(actionType, data) {
    const payload = JSON.parse(JSON.stringify(data || {}));
    payload.action = actionType;

    if (actionType === 'vehicle') {
        delete payload.number;
    }
    if (actionType === 'log' && payload.partsPhoto && !payload.photoUrl) {
        payload.photoUrl = payload.partsPhoto;
    }
    if (actionType === 'correct_log' && payload.partsPhoto && !payload.photoUrl) {
        payload.photoUrl = payload.partsPhoto;
    }

    if (actionType !== 'user_google_auth') {
        const authToken = localStorage.getItem('ring_auth_token');
        if (authToken) payload.authToken = authToken;
    }

    const json = await fetchJsonWithTimeout(GAS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify(payload)
    }, 20000);
    if (!json || json.success !== true) {
        throw new Error((json && json.error) || 'GAS保存に失敗しました');
    }
    return json;
}

/**
 * GAS 失敗分を再送キューへ（C-01）
 */
function enqueueRetry(action, payload) {
    const queue = safeJsonParse(localStorage.getItem(DB_RETRY_QUEUE), []);
    let key = action + ':' + (payload.log_id
        ? payload.log_id
        : (payload.originalLogId
            ? payload.originalLogId
            : (String(payload.vin || '') + ':' + String(payload.createdAt || ''))));
    if (!payload.log_id && !payload.createdAt) {
        key += ':' + Date.now();
    }
    if (queue.some((item) => item.key === key)) return;
    const stored = JSON.parse(JSON.stringify(payload || {}));
    delete stored.action;
    queue.push({
        key,
        action,
        payload: stored,
        retryCount: 0,
        queuedAt: new Date().toISOString()
    });
    localStorage.setItem(DB_RETRY_QUEUE, JSON.stringify(queue));
    try { ringRefreshPendingSyncBanner(); } catch (eR) { /* ignore */ }
}

/**
 * 日常点検を GAS へ送信。VIN/車両エラーはキューに載せず、それ以外は再送キューへ（C-04 続き）
 */
async function saveInspectionToGasWithRetry(payload) {
    const data = payload && typeof payload === 'object'
        ? JSON.parse(JSON.stringify(payload))
        : {};
    try {
        await sendToGAS_Safe('save_inspection', data);
        return { serverSaved: true };
    } catch (err) {
        const msg = String(err && err.message ? err.message : err || '');
        if (/VEHICLE_NOT_REGISTERED|VIN_REQUIRED|INSPECTION_DATE_REQUIRED/i.test(msg)) {
            return { serverSaved: false, hardFail: true, error: msg };
        }
        enqueueRetry('save_inspection', data);
        return { serverSaved: false, queued: true, error: msg };
    }
}

let __ringRetryFlushBusy = false;

/**
 * オンライン復帰などで再送キューを空に近づける（C-01）
 */
async function flushRetryQueue() {
    if (__ringRetryFlushBusy) return;
    __ringRetryFlushBusy = true;
    try {
        const queue = safeJsonParse(localStorage.getItem(DB_RETRY_QUEUE), []);
        if (!queue.length) {
            try { ringRefreshPendingSyncBanner(); } catch (eEmpty) { /* ignore */ }
            return;
        }
        const remaining = [];
        for (const item of queue) {
            try {
                await sendToGAS_Safe(item.action, item.payload);
            } catch (e) {
                item.retryCount = (item.retryCount || 0) + 1;
                if (item.retryCount < 5) remaining.push(item);
            }
        }
        localStorage.setItem(DB_RETRY_QUEUE, JSON.stringify(remaining));
        try { ringRefreshPendingSyncBanner(); } catch (eR2) { /* ignore */ }
    } finally {
        __ringRetryFlushBusy = false;
    }
}

/** 送信待ちバーを出さないページ（ログイン前など） */
function ringShouldAttachPendingSyncBanner() {
    if (typeof window === 'undefined' || typeof document === 'undefined') return false;
    const f = (window.location.pathname || '').split('/').pop() || '';
    return !/^(login|user_login|register|biz_register|splash)\.html$/i.test(f);
}

/**
 * GAS 再送キュー件数があるときトップに注意バーを出し、手動で flushRetryQueue 可能にする。
 */
function ringRefreshPendingSyncBanner() {
    if (!ringShouldAttachPendingSyncBanner()) return;
    var n = getPendingRetryCount();
    var id = 'ring-pending-sync-banner';
    var el = document.getElementById(id);
    if (!n) {
        if (el) el.remove();
        return;
    }
    var label = '<strong class="ring-pending-sync-banner__badge">未送信</strong> ' +
        '<span class="ring-pending-sync-banner__n">' + n + '</span> 件 … ネットワーク回復後に自動送信されます';
    if (!el) {
        var wrap = document.createElement('div');
        wrap.className = 'ring-pending-sync-banner';
        wrap.id = id;
        wrap.setAttribute('role', 'status');
        wrap.innerHTML =
            '<div class="ring-pending-sync-banner__inner">' +
            '<p class="ring-pending-sync-banner__text">' + label + '</p>' +
            '<button type="button" class="ring-pending-sync-banner__btn" id="ring-pending-sync-send">今すぐ再送</button>' +
            '</div>';
        if (document.body) {
            document.body.insertBefore(wrap, document.body.firstChild);
            var btn = document.getElementById('ring-pending-sync-send');
            if (btn) {
                btn.addEventListener('click', function () {
                    btn.disabled = true;
                    flushRetryQueue().finally(function () {
                        btn.disabled = false;
                        ringRefreshPendingSyncBanner();
                        var left = getPendingRetryCount();
                        if (typeof showToast === 'function') {
                            showToast(left ? 'warning' : 'success',
                                left ? '一部がまだ未送信です。通信状況をご確認ください。' : '再送を試みました。');
                        }
                    });
                });
            }
        }
        return;
    }
    var textEl = el.querySelector('.ring-pending-sync-banner__text');
    if (textEl) textEl.innerHTML = label;
}

if (typeof window !== 'undefined') {
    window.addEventListener('online', () => {
        flushRetryQueue().finally(function () {
            try { ringRefreshPendingSyncBanner(); } catch (eOn) { /* ignore */ }
        });
    });
    window.addEventListener('load', () => {
        if (navigator.onLine) flushRetryQueue();
        try { ringRefreshPendingSyncBanner(); } catch (eB) { /* ignore */ }
    });
    if (typeof document !== 'undefined') {
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && navigator.onLine) {
                flushRetryQueue().finally(function () {
                    try { ringRefreshPendingSyncBanner(); } catch (eVis) { /* ignore */ }
                });
            }
        });
        document.addEventListener('DOMContentLoaded', () => {
            try { ringRefreshPendingSyncBanner(); } catch (eC) { /* ignore */ }
        });
    }
}

/**
 * HTMLエスケープ処理
 */
function escapeHtml(s) { return s ? String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#039;"}[c])) : ""; }

/**
 * XSS対策：innerHTML に流す前に必ずエスケープする（escapeHtml より広いセット）
 */
function safeText(value) {
    return String(value == null ? '' : value).replace(/[&<>"'`=/]/g, function (s) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;',
                 "'": '&#39;', '`': '&#x60;', '=': '&#x3D;', '/': '&#x2F;' }[s];
    });
}

/**
 * 整備履歴の論理削除（物理削除しない）
 */
function markLogVoided(logId, reason) {
    const profile = getCurrentProfile() || {};
    const logs = readLogsArray();
    const next = logs.map(function (log) {
        if (log.log_id !== logId) return log;
        if (log.shopId && profile.shopId && log.shopId !== profile.shopId) return log;
        return {
            ...log,
            voidedAt: new Date().toISOString(),
            voidedBy: profile.staffId || profile.loginId || profile.userId || '',
            voidReason: reason || '入力元による取消'
        };
    });
    localStorage.setItem(DB_LOGS, JSON.stringify(next));
}

/**
 * 最低表示時間付きローディングラッパー
 */
function delay(ms) { return new Promise(function (resolve) { setTimeout(resolve, ms); }); }
async function withLoading(title, text, task) {
    showLoading(title, text);
    try {
        const results = await Promise.all([task(), delay(300)]);
        return results[0];
    } finally {
        hideLoading();
    }
}

/**
 * ボタン二重送信防止ガード
 */
async function runOnce(button, task) {
    if (!button || button.dataset.busy === '1') return;
    button.dataset.busy = '1';
    button.disabled = true;
    try {
        return await task();
    } finally {
        button.dataset.busy = '0';
        button.disabled = false;
    }
}

/**
 * かかりつけ店舗の読み込み（旧キーからマイグレーション付き）
 */
function loadFavShops() {
    const current = JSON.parse(localStorage.getItem('nappy_fav_shops_v1') || '[]');
    const legacy  = JSON.parse(localStorage.getItem('nappy_fav_shops')    || '[]');
    if (!legacy.length) return current;
    const byId = {};
    current.concat(legacy).forEach(function (shop) {
        if (shop && shop.shopId) byId[shop.shopId] = Object.assign({}, byId[shop.shopId] || {}, shop);
    });
    const merged = Object.values(byId);
    localStorage.setItem('nappy_fav_shops_v1', JSON.stringify(merged));
    localStorage.removeItem('nappy_fav_shops');
    return merged;
}

/**
 * 日常点検の読み込み（旧キーからマイグレーション付き）
 */
function loadInspections() {
    const primary = JSON.parse(localStorage.getItem(DB_INSPECTIONS) || '[]');
    const legacy  = JSON.parse(localStorage.getItem('nappy_inspections_v1') || '[]');
    if (legacy.length) {
        const seen = new Set(primary.map(function (x) { return x.log_id || x.logId; }));
        legacy.forEach(function (x) {
            const id = x.log_id || x.logId;
            if (!seen.has(id)) primary.push(x);
        });
        localStorage.setItem(DB_INSPECTIONS, JSON.stringify(primary));
        localStorage.removeItem('nappy_inspections_v1');
    }
    return primary;
}

/** 保存前確認用：長文を省略 */
function truncateRingConfirm(s, max) {
    if (s == null || s === '') return '';
    var t = String(s);
    if (t.length <= (max || 200)) return t;
    return t.slice(0, max || 200) + '…';
}

/** 確認モーダル1行 */
function ringConfirmRow(label, value) {
    var v = (value === undefined || value === null || String(value).trim() === '') ? '—' : String(value);
    return '<div class="ring-save-confirm__row"><span class="ring-save-confirm__k">' + escapeHtml(label) + '</span><span class="ring-save-confirm__v">' + escapeHtml(v) + '</span></div>';
}

/**
 * 保存完了のフルスクリーン演出（成功／オフラインキュー）
 * @param {{ variant?: 'success'|'queued', message?: string, durationMs?: number, onDone?: () => void }} opts
 */
function showRingSavedSplash(opts) {
    opts = opts || {};
    var variant = opts.variant === 'queued' ? 'queued' : 'success';
    var msg = opts.message || (variant === 'queued'
        ? '端末に保存しました。オンライン復帰時に自動送信します。'
        : '保存しました');
    var durationMs = opts.durationMs != null ? opts.durationMs : 1400;
    var old = document.getElementById('ring-saved-splash');
    if (old) old.remove();
    var orbMark = variant === 'queued' ? '✓' : '✓';
    var html = '<div class="ring-saved-splash ring-saved-splash--' + variant + '" id="ring-saved-splash">' +
        '<div class="ring-saved-splash__orb" aria-hidden="true">' + orbMark + '</div>' +
        '<div class="ring-saved-splash__msg">' + escapeHtml(msg) + '</div></div>';
    document.body.insertAdjacentHTML('beforeend', html);
    try {
        if (navigator.vibrate) navigator.vibrate(80);
    } catch (e) { /* ignore */ }
    var el = document.getElementById('ring-saved-splash');
    setTimeout(function () {
        if (el && el.parentNode) el.remove();
        if (typeof opts.onDone === 'function') opts.onDone();
    }, durationMs);
}

function ringAttachVisualViewportCard(cardEl, syncFn) {
    if (!cardEl || typeof syncFn !== 'function') return function () {};
    var vv = window.visualViewport;
    syncFn();
    if (!vv) return function () {};
    vv.addEventListener('resize', syncFn);
    vv.addEventListener('scroll', syncFn);
    return function () {
        vv.removeEventListener('resize', syncFn);
        vv.removeEventListener('scroll', syncFn);
    };
}

/**
 * 整備入力・車両登録など共通：保存前確認オーバーレイ
 * @param {{ title?: string, lead?: string|null, bodyHtml: string, confirmLabel?: string, onConfirm: () => void, onCancel?: () => void }} opts
 *        lead: 空文字ならリード文を出さない。未指定時は保存前確認のデフォルト文。
 */
function showRingSaveConfirm(opts) {
    var id = 'ring-save-confirm';
    var old = document.getElementById(id);
    if (old) old.remove();
    var title = opts.title || '保存前の確認';
    var confirmLabel = opts.confirmLabel || 'この内容で登録する';
    var leadBlock = '';
    if (opts.lead !== '') {
        var leadText = (opts.lead !== undefined && opts.lead !== null)
            ? opts.lead
            : '個人情報・金額など誤りがないかご確認ください。問題なければ登録してください。';
        leadBlock = '<p class="ring-save-confirm__lead">' + escapeHtml(leadText) + '</p>';
    }
    var html = '<div class="ring-save-confirm" id="' + id + '">' +
        '<div class="ring-save-confirm__backdrop"></div>' +
        '<div class="ring-save-confirm__card">' +
        '<div class="ring-save-confirm__title">' + escapeHtml(title) + '</div>' +
        leadBlock +
        '<div class="ring-save-confirm__body">' + opts.bodyHtml + '</div>' +
        '<div class="ring-save-confirm__actions">' +
        '<button type="button" class="ring-save-confirm__btn ring-save-confirm__btn--secondary" data-ring-action="cancel">戻って修正</button>' +
        '<button type="button" class="ring-save-confirm__btn ring-save-confirm__btn--primary" data-ring-action="confirm">' + escapeHtml(confirmLabel) + '</button>' +
        '</div></div></div>';
    document.body.insertAdjacentHTML('beforeend', html);
    var el = document.getElementById(id);
    var card = el.querySelector('.ring-save-confirm__card');
    function syncCardMaxHeight() {
        if (!card) return;
        var vv = window.visualViewport;
        var h = vv ? vv.height : window.innerHeight;
        var reserve = 48;
        var mx = Math.max(160, Math.min(h * 0.8, h - reserve));
        card.style.maxHeight = mx + 'px';
    }
    var detachVv = ringAttachVisualViewportCard(card, syncCardMaxHeight);
    function close() {
        detachVv();
        if (el && el.parentNode) el.remove();
    }
    el.querySelector('[data-ring-action="cancel"]').onclick = function () { close(); if (opts.onCancel) opts.onCancel(); };
    el.querySelector('[data-ring-action="confirm"]').onclick = function () { close(); opts.onConfirm(); };
    el.querySelector('.ring-save-confirm__backdrop').onclick = function () { close(); if (opts.onCancel) opts.onCancel(); };
}

/**
 * 汎用確認（confirm 代替）。Promise で true / false を返す。
 * @param {{ title?: string, message: string, okLabel?: string, cancelLabel?: string, danger?: boolean }} opts
 */
function showRingConfirm(opts) {
    return new Promise(function (resolve) {
        var id = 'ring-generic-confirm';
        var prev = document.getElementById(id);
        if (prev) prev.remove();
        var title = opts.title || '確認';
        var okLabel = opts.okLabel || 'OK';
        var cancelLabel = opts.cancelLabel || 'キャンセル';
        var okClass = opts.danger
            ? 'ring-save-confirm__btn ring-save-confirm__btn--danger'
            : 'ring-save-confirm__btn ring-save-confirm__btn--primary';
        var html = '<div class="ring-save-confirm" id="' + id + '">' +
            '<div class="ring-save-confirm__backdrop"></div>' +
            '<div class="ring-save-confirm__card">' +
            '<div class="ring-save-confirm__title">' + escapeHtml(title) + '</div>' +
            '<p class="ring-save-confirm__lead" style="margin-top:0;white-space:pre-line">' + escapeHtml(opts.message || '') + '</p>' +
            '<div class="ring-save-confirm__actions">' +
            '<button type="button" class="ring-save-confirm__btn ring-save-confirm__btn--secondary" data-rc="cancel">' + escapeHtml(cancelLabel) + '</button>' +
            '<button type="button" class="' + okClass + '" data-rc="ok">' + escapeHtml(okLabel) + '</button>' +
            '</div></div></div>';
        document.body.insertAdjacentHTML('beforeend', html);
        var el = document.getElementById(id);
        var card = el.querySelector('.ring-save-confirm__card');
        function syncCardMaxHeight() {
            if (!card) return;
            var vv = window.visualViewport;
            var h = vv ? vv.height : window.innerHeight;
            var reserve = 48;
            card.style.maxHeight = Math.max(160, Math.min(h * 0.8, h - reserve)) + 'px';
        }
        var detachVv = ringAttachVisualViewportCard(card, syncCardMaxHeight);
        function finish(val) {
            detachVv();
            if (el && el.parentNode) el.remove();
            resolve(val);
        }
        el.querySelector('[data-rc="cancel"]').onclick = function () { finish(false); };
        el.querySelector('[data-rc="ok"]').onclick = function () { finish(true); };
        el.querySelector('.ring-save-confirm__backdrop').onclick = function () { finish(false); };
    });
}

/**
 * OCR 用：画像を JPEG 化して長辺 maxSide 以下にし、base64（プレフィックスなし）を返す
 */
function fileToVisionBase64(file, maxSide) {
    maxSide = maxSide || 2000;
    return new Promise(function (resolve, reject) {
        function fallbackRead() {
            var r = new FileReader();
            r.onload = function () {
                var s = String(r.result || '');
                var i = s.indexOf('base64,');
                resolve(i >= 0 ? s.slice(i + 7) : '');
            };
            r.onerror = function () { reject(new Error('read_fail')); };
            r.readAsDataURL(file);
        }
        if (typeof createImageBitmap === 'function' && typeof document !== 'undefined') {
            createImageBitmap(file).then(function (bmp) {
                try {
                    var w = bmp.width;
                    var h = bmp.height;
                    var tw = w;
                    var th = h;
                    if (Math.max(w, h) > maxSide) {
                        var sc = maxSide / Math.max(w, h);
                        tw = Math.round(w * sc);
                        th = Math.round(h * sc);
                    }
                    var c = document.createElement('canvas');
                    c.width = tw;
                    c.height = th;
                    c.getContext('2d').drawImage(bmp, 0, 0, tw, th);
                    bmp.close();
                    var dataUrl = c.toDataURL('image/jpeg', 0.88);
                    resolve((dataUrl.split(',')[1] || ''));
                } catch (e) {
                    try { bmp.close(); } catch (x) { /* ignore */ }
                    fallbackRead();
                }
            }).catch(function () { fallbackRead(); });
        } else {
            fallbackRead();
        }
    });
}

var RING_OCR_FAIL_KEY = 'ring_ocr_consecutive_failures';

function resetOcrFailureCount() {
    try { sessionStorage.removeItem(RING_OCR_FAIL_KEY); } catch (e) { /* ignore */ }
}

function incrementOcrFailureCount() {
    try {
        var n = parseInt(sessionStorage.getItem(RING_OCR_FAIL_KEY) || '0', 10) + 1;
        sessionStorage.setItem(RING_OCR_FAIL_KEY, String(n));
        return n;
    } catch (e) {
        return 1;
    }
}

var __ringOcrOverlayInterval = null;

function hideOcrAnalyzingOverlay() {
    if (__ringOcrOverlayInterval) {
        clearInterval(__ringOcrOverlayInterval);
        __ringOcrOverlayInterval = null;
    }
    var el = document.getElementById('ring-ocr-overlay');
    if (el) {
        el.classList.remove('show');
        el.remove();
    }
}

/**
 * OCR 待機：プレビュー・段階メッセージ・キャンセル（解析 fetch は打ち切れないため結果だけ無視）
 * @param {{ previewDataUrl?: string, messages?: string[], title?: string }} opts
 */
function showOcrAnalyzingOverlay(opts) {
    opts = opts || {};
    hideOcrAnalyzingOverlay();
    if (typeof window !== 'undefined') window.__ringOcrCancelled = false;
    var messages = opts.messages || ['画像を読み込み中…', 'AIが認識中…', '内容を整形しています…'];
    var title = opts.title || '解析中';
    var html = '<div class="ring-ocr-overlay show" id="ring-ocr-overlay">' +
        '<div class="loading-arrows" aria-hidden="true">' +
        '<div class="loading-arrow arrow-blue"></div>' +
        '<div class="loading-arrow arrow-red"></div>' +
        '<div class="loading-arrow arrow-yellow"></div>' +
        '</div>' +
        '<div class="ring-ocr-overlay__title">' + escapeHtml(title) + '</div>' +
        '<div class="ring-ocr-overlay__sub" id="ring-ocr-overlay-sub">' + escapeHtml(messages[0]) + '</div>' +
        '<button type="button" class="ring-ocr-overlay__cancel" id="ring-ocr-overlay-cancel">キャンセル（手入力へ）</button>' +
        '</div>';
    document.body.insertAdjacentHTML('beforeend', html);
    var rootEl = document.getElementById('ring-ocr-overlay');
    if (opts.previewDataUrl && rootEl) {
        var pv = document.createElement('img');
        pv.className = 'ring-ocr-overlay__preview';
        pv.alt = '';
        pv.src = opts.previewDataUrl;
        rootEl.insertBefore(pv, rootEl.firstChild);
    }
    var subEl = document.getElementById('ring-ocr-overlay-sub');
    var i = 0;
    __ringOcrOverlayInterval = setInterval(function () {
        i += 1;
        if (subEl) subEl.textContent = messages[i % messages.length];
    }, 850);
    var cancelBtn = document.getElementById('ring-ocr-overlay-cancel');
    if (cancelBtn) {
        cancelBtn.onclick = function () {
            if (typeof window !== 'undefined') window.__ringOcrCancelled = true;
            hideOcrAnalyzingOverlay();
        };
    }
}

function wasOcrAnalyzingCancelled() {
    return !!(typeof window !== 'undefined' && window.__ringOcrCancelled);
}

/**
 * OCR 複数項目：チェックされたキーだけ applyFn に渡す（デモ全項目向け）
 * @param {Record<string, *>} res
 * @param {{ key: string, label: string, getCurrent?: () => string }[]} descriptors
 * @param {(picked: Record<string, *>) => void} onApply
 */
function showOcrApplyConfirm(res, descriptors, onApply) {
    if (!res || !res.vin) return;
    var descByKey = {};
    (descriptors || []).forEach(function (d) {
        if (d && d.key) descByKey[d.key] = d;
    });
    var order = ['vin', 'shaken', 'firstRegistration', 'mileage', 'workTitle', 'parts', 'model', 'engine', 'class', 'typeDesignation'];
    var keysToShow = [];
    order.forEach(function (k) {
        if (!descByKey[k]) return;
        if (k === 'vin') {
            keysToShow.push(k);
            return;
        }
        var v = res[k];
        if (v != null && String(v).trim() !== '') keysToShow.push(k);
    });
    if (keysToShow.length === 0) {
        if (typeof onApply === 'function') onApply({});
        return;
    }
    var rowsHtml = keysToShow.map(function (k) {
        var d = descByKey[k];
        var ocrVal = String(res[k] == null ? '' : res[k]);
        var cur = typeof d.getCurrent === 'function' ? String(d.getCurrent() || '').trim() : '';
        var overwrite = cur !== '' && cur !== String(ocrVal).trim();
        var chkId = 'ring-ocr-chk-' + k;
        return '<div class="ring-ocr-apply__row' + (overwrite ? ' ring-ocr-apply__row--warn' : '') + '">' +
            '<label class="ring-ocr-apply__chkwrap" for="' + chkId + '">' +
            '<input type="checkbox" id="' + chkId + '" class="ring-ocr-apply__chk" checked data-key="' + escapeHtml(k) + '">' +
            '<span>' + escapeHtml(d.label || k) + '</span></label>' +
            '<div class="ring-ocr-apply__vals">' +
            '<div><span class="ring-ocr-apply__sub">読み取り</span> <span class="ring-ocr-apply__ocr">' + escapeHtml(ocrVal) + '</span></div>' +
            '<div><span class="ring-ocr-apply__sub">現在の入力</span> <span class="ring-ocr-apply__cur">' + escapeHtml(cur || '—') + '</span></div>' +
            (overwrite ? '<div class="ring-ocr-apply__warn">上書きします</div>' : '') +
            '</div></div>';
    }).join('');

    var id = 'ring-ocr-apply';
    var old = document.getElementById(id);
    if (old) old.remove();
    var html = '<div class="ring-save-confirm" id="' + id + '">' +
        '<div class="ring-save-confirm__backdrop"></div>' +
        '<div class="ring-save-confirm__card">' +
        '<div class="ring-save-confirm__title">読み取り結果の確認</div>' +
        '<p class="ring-save-confirm__lead">反映する項目だけチェックを付けたままにしてください。チェックを外した項目は入力欄を変更しません。</p>' +
        '<div class="ring-save-confirm__body ring-ocr-apply__body">' + rowsHtml + '</div>' +
        '<div class="ring-save-confirm__actions">' +
        '<button type="button" class="ring-save-confirm__btn ring-save-confirm__btn--secondary" data-act="cancel">キャンセル</button>' +
        '<button type="button" class="ring-save-confirm__btn ring-save-confirm__btn--primary" data-act="apply">選択した項目を反映</button>' +
        '</div></div></div>';
    document.body.insertAdjacentHTML('beforeend', html);
    var el = document.getElementById(id);
    var card = el.querySelector('.ring-save-confirm__card');
    function syncCardMaxHeight() {
        if (!card) return;
        var vv = window.visualViewport;
        var h = vv ? vv.height : window.innerHeight;
        var reserve = 48;
        card.style.maxHeight = Math.max(160, Math.min(h * 0.8, h - reserve)) + 'px';
    }
    var detachVv = ringAttachVisualViewportCard(card, syncCardMaxHeight);
    function close() {
        detachVv();
        if (el && el.parentNode) el.remove();
    }
    el.querySelector('[data-act="cancel"]').onclick = function () { close(); };
    el.querySelector('.ring-save-confirm__backdrop').onclick = function () { close(); };
    el.querySelector('[data-act="apply"]').onclick = function () {
        var out = {};
        el.querySelectorAll('.ring-ocr-apply__chk:checked').forEach(function (c) {
            var key = c.getAttribute('data-key');
            if (key && Object.prototype.hasOwnProperty.call(res, key)) out[key] = res[key];
        });
        close();
        if (typeof onApply === 'function') onApply(out);
    };
}

/**
 * C-05: OCR で得た結果を確認モーダル経由でだけ反映。デモ時は項目別チェック（showOcrApplyConfirm）。
 * @param {Record<string, *>} res
 * @param {(picked: Record<string, *>) => void} applyFn
 * @param {{ key: string, label: string, getCurrent?: () => string }[]=} ocrFieldDescriptors
 */
function handleOcrVinResultForForm(res, applyFn, ocrFieldDescriptors) {
    if (res && res.vin) {
        var demo = typeof window !== 'undefined' && window.__RING_OCR_DEMO__ === true;
        var extraKeys = ['shaken', 'firstRegistration', 'mileage', 'workTitle', 'parts', 'model', 'engine', 'class', 'typeDesignation'].filter(function (k) {
            var v = res[k];
            return v != null && String(v).trim() !== '';
        });
        var useGrid = demo && ocrFieldDescriptors && ocrFieldDescriptors.length && extraKeys.length > 0;
        if (useGrid) {
            showOcrApplyConfirm(res, ocrFieldDescriptors, function (picked) {
                resetOcrFailureCount();
                if (typeof applyFn === 'function') applyFn(picked);
            });
            return;
        }
        showRingSaveConfirm({
            title: '読み取り結果の確認',
            lead: 'OCRで読み取った車体番号です。お車の表示と一致するかご確認のうえ反映してください。',
            bodyHtml: ringConfirmRow('車体番号', res.vin),
            confirmLabel: '入力欄に反映する',
            onConfirm: function () {
                resetOcrFailureCount();
                if (typeof applyFn === 'function') applyFn(res);
            },
            onCancel: function () {}
        });
        return;
    }
    var n = incrementOcrFailureCount();
    if (typeof showToast === 'function') {
        showToast('warning', '読み取れませんでした。再撮影してください。');
        if (n >= 2) {
            showToast('info', '手入力でも続行できます。車台番号欄に直接入力してください。');
        }
    }
}

/**
 * 書類・車検証画像の OCR（C-05）。本番は GAS ocr_vin + Vision API。車体番号のみ返却。
 * デモ用全項目は window.__RING_OCR_DEMO__ === true のときのみ（固定値）。
 * @param {File[]} files
 * @returns {Promise<null|{vin?: string, shaken?: string, mileage?: string, workTitle?: string, parts?: string, model?: string, engine?: string, class?: string, typeDesignation?: string}>}
 */
async function analyzeDocument(files) {
    if (!files || !files[0]) return null;
    if (typeof window !== 'undefined' && window.__RING_OCR_DEMO__ === true) {
        await delay(900);
        return {
            vin: 'ZVW50-5012847',
            shaken: '2026-12-15',
            firstRegistration: '2020-03',
            mileage: '',
            workTitle: '一般整備',
            parts: '',
            model: 'DBA-ZVW50',
            engine: '2ZR-FXE',
            class: '12001',
            typeDesignation: '17456'
        };
    }
    var b64;
    try {
        b64 = await fileToVisionBase64(files[0], 2000);
    } catch (e) {
        return null;
    }
    if (!b64) return null;
    try {
        var json = await sendToGAS_Safe('ocr_vin', { imageBase64: b64 });
        if (json && json.vin) {
            return { vin: String(json.vin).toUpperCase() };
        }
        return null;
    } catch (e) {
        var msg = String(e && e.message ? e.message : e || '');
        if (/OCR_NOT_CONFIGURED|VIN_NOT_FOUND|VISION_API_ERROR|IMAGE_REQUIRED|AUTH_/.test(msg)) {
            /* 読取失敗系：メッセージは handleOcrVinResultForForm 側 */
        } else if (typeof showToast === 'function') {
            showToast('error', '読み取り処理でエラーが発生しました。再撮影か手入力をお試しください。');
        }
        return null;
    }
}

/**
 * グローバルUI生成（設定・QR・かかりつけボタン）
 */
function createGlobalUI() {
    const path = window.location.pathname;
    const filename = path.split('/').pop();
    const profile = getCurrentProfile();
    
    const isUserMode = path.includes('user_') || !profile; 

    if (path.includes('login.html') || path.includes('user_login.html') || path.includes('register.html') || path.includes('biz_register.html') || path.endsWith('/') || path.endsWith('index.html')) {
        return;
    }

    // 右上タブは home 画面のみ表示（従来仕様）
    const homeFiles = ['user_home.html', 'factory_home.html', 'dealer_home.html'];
    if (!homeFiles.includes(filename)) {
        return;
    }

    let appBaseUrl = window.location.href.split('?')[0]; 
    if (appBaseUrl.endsWith('.html')) appBaseUrl = appBaseUrl.substring(0, appBaseUrl.lastIndexOf('/')) + '/index.html';

    if (!isUserMode && profile && profile.shopId) {
        appBaseUrl += `?shop=${profile.shopId}`;
    }
    const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(appBaseUrl)}`;

    let menuBodyHtml = "";
    let tabsHtml = "";
    let panelsHtml = "";

    if (isUserMode) {
        menuBodyHtml = `
        <div class="settings-group">
          <div class="settings-group-title">ユーザーメニュー</div>
          <ul class="settings-list">
            <li><a href="user_mypage.html">👤 プロフィール / マイページ</a></li>
            <li><a href="change_password.html">🔑 パスワード変更</a></li>
          </ul>
        </div>
        <div class="settings-group">
          <div class="settings-group-title">サポート</div>
          <ul class="settings-list">
            <li><a href="manual.html">📖 操作マニュアル</a></li>
            <li><a href="faq.html">❓ よくある質問</a></li>
            <li><a href="contact.html">📧 お問い合わせ</a></li>
            <li><a href="ads/ad_recruit.html">📢 広告掲載について（事業者向け）</a></li>
          </ul>
        </div>
        <div class="settings-group">
          <div class="settings-group-title">法的情報</div>
          <ul class="settings-list">
            <li><a href="terms.html">📋 利用規約</a></li>
            <li><a href="privacy.html">🔒 プライバシーポリシー</a></li>
            <li><a href="tokushoho.html">📜 特定商取引法に基づく表示</a></li>
          </ul>
        </div>
        <div class="settings-group">
          <ul class="settings-list">
            <li><a href="#" onclick="logoutApp(); return false;" style="color: #ef4444;">🚪 ログアウト</a></li>
          </ul>
        </div>
        `;
        tabsHtml = `
          <div class="nappy-tab" id="nappy-fav-tab" title="かかりつけ" style="background: #10b981;" onclick="location.href='user_fav_shops.html'">🏥</div>
          <div class="nappy-tab" id="nappy-qr-tab" title="紹介QR" style="background: #3b82f6;">🔖</div>
          <div class="nappy-tab" id="nappy-settings-tab" title="設定" style="background: #7a7167;">⚙️</div>
        `;
        panelsHtml = `
          <div id="nappy-qr-panel"><div class="qr-panel-title">お店に紹介する</div><div class="qr-panel-desc">このQRを読み取ってもらうことで<br>お薬手帳の導入を推奨できます。</div><div class="qr-img-wrap"><img class="qr-img" src="${qrImageUrl}" alt="紹介QR"></div><button class="qr-close-btn" id="nappy-qr-close">閉じる</button></div>
          <div id="nappy-settings-panel"><div class="settings-header"><h2>設定</h2><button class="settings-close" id="nappy-settings-close">✖</button></div><div class="settings-body">${menuBodyHtml}</div></div>
        `;
    } else {
        const canManageStaff = profile && profile.role === 'master';
        const isBizUser = profile && (profile.shopType === 'factory' || profile.shopType === 'dealer');
        const staffMenuItem = !isBizUser
            ? ''
            : (canManageStaff
                ? '<li><a href="factory_admin.html">👑 スタッフ管理</a></li>'
                : '<li><a href="#" onclick="event.preventDefault(); showToast(\'info\',\'スタッフ管理はオーナー権限のみ利用できます\'); return false;">👑 スタッフ管理（オーナー専用）</a></li>');
        const pwMenuItem = canManageStaff
            ? '<li><a href="change_password.html">🔑 パスワード変更</a></li>' : '';
        const bizMenuLabel = profile && profile.shopType === 'dealer' ? '事業者専用メニュー' : '店舗・工場専用メニュー';
        menuBodyHtml = `
        <div class="settings-group">
          <div class="settings-group-title">${bizMenuLabel}</div>
          <ul class="settings-list">
            <li><a href="factory_info.html">🏢 会社・工場情報</a></li>
            <li><a href="ads/ad_recruit.html">📢 広告掲載のお申し込み</a></li>
            ${staffMenuItem}
            ${pwMenuItem}
          </ul>
        </div>
        <div class="settings-group">
          <div class="settings-group-title">サポート</div>
          <ul class="settings-list">
            <li><a href="manual.html">📖 操作マニュアル</a></li>
            <li><a href="faq.html">❓ よくある質問</a></li>
            <li><a href="contact.html">📧 お問い合わせ</a></li>
          </ul>
        </div>
        <div class="settings-group">
          <div class="settings-group-title">法的情報</div>
          <ul class="settings-list">
            <li><a href="terms.html">📋 利用規約</a></li>
            <li><a href="privacy.html">🔒 プライバシーポリシー</a></li>
            <li><a href="tokushoho.html">📜 特定商取引法に基づく表示</a></li>
          </ul>
        </div>
        <div class="settings-group">
          <ul class="settings-list">
            <li><a href="#" onclick="logoutApp(); return false;" class="danger-link" style="color: #ef4444;">🚪 ログアウト</a></li>
          </ul>
        </div>
        `;
        tabsHtml = `
          <div class="nappy-tab" id="nappy-settings-tab" title="設定" style="background: #7a7167;">⚙️</div>
          <div class="nappy-tab" id="nappy-qr-tab" title="紹介QR" style="background: #d94f4f;">🔖</div>
        `;
        panelsHtml = `
          <div id="nappy-qr-panel"><div class="qr-panel-title">車のお薬手帳</div><div class="qr-panel-desc">お客様にこのQRを読み取ってもらうことで<br>店舗をお気に入り登録できます。</div><div class="qr-img-wrap"><img class="qr-img" src="${qrImageUrl}" alt="紹介QR"></div><button class="qr-close-btn" id="nappy-qr-close">閉じる</button></div>
          <div id="nappy-settings-panel"><div class="settings-header"><h2>設定・管理</h2><button class="settings-close" id="nappy-settings-close">✖</button></div><div class="settings-body">${menuBodyHtml}</div></div>
        `;
    }

    const html = `
    <style>
      #nappy-qr-panel { position: fixed; top: -100vh; left: 0; width: 100%; height: 100vh; background: rgba(247, 245, 239, 0.92); backdrop-filter: blur(8px); z-index: 9998; transition: top 0.4s cubic-bezier(0.2, 0.8, 0.2, 1); display: flex; flex-direction: column; align-items: center; justify-content: center; }
      #nappy-qr-panel.open { top: 0; }
      .qr-panel-title { font-size: 22px; font-weight: 900; color: #2f2a24; margin: 0 0 12px; }
      .qr-panel-desc { font-size: 14px; color: #7a7167; margin: 0 0 32px; font-weight: 700; line-height: 1.6; text-align: center; }
      .qr-img-wrap { background: #fff; padding: 16px; border-radius: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.08); }
      .qr-img { width: 180px; height: 180px; display: block; }
      .qr-close-btn { margin-top: 40px; padding: 14px 32px; background: #fff; border: 2px solid #e0d8c8; border-radius: 999px; font-weight: 800; color: #7a7167; cursor: pointer; }
      
      #nappy-settings-panel { position: fixed; top: -100vh; left: 0; width: 100%; height: 100vh; background: rgba(253, 250, 244, 0.97); backdrop-filter: blur(8px); z-index: 9998; transition: top 0.4s cubic-bezier(0.2, 0.8, 0.2, 1); display: flex; flex-direction: column; box-shadow: 0 10px 30px rgba(0,0,0,0.1); }
      #nappy-settings-panel.open { top: 0; }
      .settings-header { padding: 20px 24px; border-bottom: 1px solid #e0d8c8; background: #fdfaf4; display: flex; justify-content: space-between; align-items: center; flex-shrink: 0; }
      .settings-header h2 { margin: 0; font-size: 18px; color: #2f2a24; font-weight: 900; }
      .settings-close { background: none; border: none; font-size: 24px; cursor: pointer; color: #7a7167; padding: 4px 8px; }
      .settings-body { flex: 1; overflow-y: auto; padding: 0 24px 60px; max-width: 600px; width: 100%; margin: 0 auto; box-sizing: border-box; }
      .settings-group { margin-top: 24px; }
      .settings-group-title { font-size: 12px; font-weight: 800; color: #b0a696; margin-bottom: 12px; letter-spacing: 0.05em; }
      .settings-list { list-style: none; padding: 0; margin: 0; }
      .settings-list li { border-bottom: 1px dashed #e0d8c8; }
      .settings-list a { display: block; padding: 16px 0; color: #2f2a24; text-decoration: none; font-size: 15px; font-weight: 700; }
      
      #nappy-top-nav { position: fixed; top: 0; right: 20px; z-index: 9999; display: flex; gap: 6px; }
      .nappy-tab { width: 38px; height: 50px; border-radius: 0 0 6px 6px; display: flex; align-items: center; justify-content: center; font-size: 20px; cursor: pointer; box-shadow: 0 4px 10px rgba(0,0,0,0.15); transition: height 0.2s, background 0.3s; color: white; }
      .nappy-tab:hover { height: 58px; }
    </style>
    
    ${panelsHtml}
    <div id="nappy-top-nav">${tabsHtml}</div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', html);

    const setTab = document.getElementById('nappy-settings-tab');
    const setPanel = document.getElementById('nappy-settings-panel');
    const setClose = document.getElementById('nappy-settings-close');
    if (setTab) setTab.addEventListener('click', () => {
        setPanel.classList.toggle('open');
        if (qrPanel) qrPanel.classList.remove('open');
    });
    if (setClose) setClose.addEventListener('click', () => { setPanel.classList.remove('open'); });

    const qrTab = document.getElementById('nappy-qr-tab');
    const qrPanel = document.getElementById('nappy-qr-panel');
    const qrClose = document.getElementById('nappy-qr-close');
    if (qrTab) {
        qrTab.addEventListener('click', () => { 
            qrPanel.classList.toggle('open'); 
            if(setPanel) setPanel.classList.remove('open'); 
        });
    }
    if (qrClose) qrClose.addEventListener('click', () => { qrPanel.classList.remove('open'); });
}
window.addEventListener('DOMContentLoaded', createGlobalUI);

// 戻るリンク文言を全ページで統一
window.addEventListener('DOMContentLoaded', () => {
    const file = window.location.pathname.split('/').pop();
    const homeFiles = ['user_home.html', 'factory_home.html', 'dealer_home.html', 'index.html', 'login.html', 'splash.html'];
    if (homeFiles.includes(file)) return;

    document.querySelectorAll('.back-link').forEach(el => {
        el.textContent = '≪戻る';
    });

    // 余白を増やさず、見出し直前の改行だけ取り除いて縦並びを安定化
    document.querySelectorAll('.header br').forEach(br => br.remove());
});

// 各ページの個別スクリプトで戻る文言が再上書きされるケースを最終補正
window.addEventListener('load', () => {
    const file = window.location.pathname.split('/').pop();
    const homeFiles = ['user_home.html', 'factory_home.html', 'dealer_home.html', 'index.html', 'login.html', 'splash.html'];
    if (homeFiles.includes(file)) return;
    document.querySelectorAll('.back-link').forEach(el => {
        el.textContent = '≪戻る';
    });
});

/**
 * VIN入力欄の自動フォーマット（全ページ共通）
 * - 全角アルファベット・数字 → 半角変換
 * - 小文字 → 大文字固定
 * - モノスペースフォント適用（視認性向上）
 */
window.addEventListener('DOMContentLoaded', () => {
    const vinSelectors = [
        'input[id*="Vin"]',
        'input[id*="vin"]',
        'input[id*="VIN"]',
        'input[placeholder*="VIN"]',
        'input[placeholder*="車台番号"]'
    ];
    const vinInputs = document.querySelectorAll(vinSelectors.join(','));

    vinInputs.forEach(input => {
        if (input.readOnly || input.disabled) return;

        // VIN専用スタイル
        input.style.fontFamily = '"Helvetica Neue", "SF Mono", monospace';
        input.style.letterSpacing = '0.06em';
        input.style.textTransform = 'uppercase';

        input.addEventListener('input', (e) => {
            const cur = e.target.selectionStart;
            let val = e.target.value;
            // 全角英数字 → 半角
            val = val.replace(/[Ａ-Ｚａ-ｚ０-９]/g, s =>
                String.fromCharCode(s.charCodeAt(0) - 0xFEE0)
            );
            // 大文字固定
            val = val.toUpperCase();
            e.target.value = val;
            // カーソル位置を維持
            try { e.target.setSelectionRange(cur, cur); } catch(_) {}
        });

        // ペースト時にも正規化
        input.addEventListener('paste', (e) => {
            setTimeout(() => {
                let val = e.target.value;
                val = val.replace(/[Ａ-Ｚａ-ｚ０-９]/g, s =>
                    String.fromCharCode(s.charCodeAt(0) - 0xFEE0)
                );
                e.target.value = val.toUpperCase();
            }, 0);
        });
    });
});

/**
 * かかりつけ店舗の自動登録処理
 */
window.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const shopId = urlParams.get('shop');
    
    if (!shopId || (getCurrentProfile() && !window.location.pathname.includes('user_'))) return;

    let favShops = loadFavShops();
    let isAlreadyRegistered = favShops.some(s => s.shopId === shopId);

    if (!isAlreadyRegistered) {
        const dummyShopData = {
            shopId: shopId,
            shopName: "登録されたお店",
            factoryNumber: "---",
            address: "---",
            tel: "---",
            email: "---",
            lineUrl: ""
        };
        favShops.push(dummyShopData);
        localStorage.setItem('nappy_fav_shops_v1', JSON.stringify(favShops));
    }

    window.history.replaceState(null, null, window.location.pathname);
    showWelcomePopup(isAlreadyRegistered);
});

function showWelcomePopup(isAlreadyRegistered) {
    const title = isAlreadyRegistered ? "いつもご利用ありがとうございます" : "お店の登録が完了しました";
    const msg = isAlreadyRegistered 
        ? "かかりつけの店舗として登録済みです。" 
        : "右上のアイコンから、いつでもお店の情報確認や予約ができます。";

    const popupHtml = `
    <style>
      #nappy-welcome-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100vh; background: rgba(0,0,0,0.6); z-index: 10000; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(4px); animation: fadeIn 0.3s; padding: 20px; box-sizing: border-box;}
      @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      .welcome-card { background: #fff; border-radius: 24px; padding: 32px 24px; max-width: 400px; width: 100%; text-align: center; box-shadow: 0 20px 40px rgba(0,0,0,0.2); position: relative;}
      .welcome-icon { font-size: 48px; margin-bottom: 16px; }
      .welcome-title { font-size: 20px; font-weight: 900; color: #166534; margin: 0 0 12px; }
      .welcome-desc { font-size: 14px; font-weight: 700; color: #4b5563; line-height: 1.6; margin: 0 0 24px; }
      
      .install-guide { background: #f0fdf4; border: 2px dashed #bbf7d0; border-radius: 12px; padding: 16px; margin-bottom: 24px; text-align: left;}
      .install-guide p { margin: 0 0 8px; font-size: 13px; font-weight: 800; color: #15803d; }
      .install-guide ul { margin: 0; padding-left: 20px; font-size: 12px; color: #166534; font-weight: 700; line-height: 1.5; }
      
      .btn-next { display: block; width: 100%; padding: 16px; background: #22c55e; color: white; border: none; border-radius: 999px; font-size: 16px; font-weight: 900; text-decoration: none; cursor: pointer; box-shadow: 0 4px 12px rgba(34,197,94,0.3); transition: transform 0.1s;}
      .btn-next:active { transform: scale(0.98); }
      .btn-close { background: none; border: none; color: #9ca3af; font-size: 13px; font-weight: 800; margin-top: 16px; text-decoration: underline; cursor: pointer; }
    </style>
    <div id="nappy-welcome-overlay">
      <div class="welcome-card">
        <div class="welcome-icon">🎉</div>
        <h2 class="welcome-title">${title}</h2>
        <p class="welcome-desc">${msg}</p>
        <div class="install-guide">
          <p>💡 アプリとして使うには</p>
          <ul>
            <li>iPhone: 下の「共有[↑]」から「ホーム画面に追加」</li>
            <li>Android: 右上の「︙」から「ホーム画面に追加」</li>
          </ul>
        </div>
        <a href="car_add.html" class="btn-next">🚗 さっそくマイカーを登録する</a>
        <button class="btn-close" onclick="document.getElementById('nappy-welcome-overlay').remove()">あとで</button>
      </div>
    </div>
    `;
    document.body.insertAdjacentHTML('beforeend', popupHtml);
}

/**
 * 戻る処理。第1引数に URL を渡した場合は常にそのURLへ遷移（履歴ループ防止）。
 * 未指定のときだけ history.back() を試す。
 */
function goBackSmart(fallbackUrl) {
    if (fallbackUrl) {
        window.location.href = fallbackUrl;
        return;
    }
    if (history.length > 1) {
        history.back();
    } else {
        window.location.href = 'index.html';
    }
}

/**
 * 共通ローディング表示の生成
 */
function injectLoadingOverlay() {
    if (document.getElementById('ring-loading-overlay')) return;
    const loadingHtml = `
    <div class="loading-overlay" id="ring-loading-overlay">
      <div class="loading-arrows">
        <div class="loading-arrow arrow-blue"></div>
        <div class="loading-arrow arrow-red"></div>
        <div class="loading-arrow arrow-yellow"></div>
      </div>
      <div class="loading-title" id="ring-loading-title">処理中</div>
      <div class="loading-elapsed" id="ring-loading-elapsed" aria-live="polite"></div>
      <div class="loading-text" id="ring-loading-text">少々お待ちください</div>
      <button type="button" class="loading-cancel-btn" id="ring-loading-cancel" style="display:none">キャンセル</button>
    </div>
    `;
    document.body.insertAdjacentHTML('beforeend', loadingHtml);
}
window.addEventListener('DOMContentLoaded', injectLoadingOverlay);

var __ringLoadingTick = null;
var __ringLoadingBaseText = '';

/**
 * 共通ローディング表示
 * @param {string} [title]
 * @param {string} [text]
 * @param {{ cancelable?: boolean, onCancel?: () => void }} [opts]
 */
function showLoading(title = "通信中", text = "少々お待ちください...", opts) {
    opts = opts || {};
    injectLoadingOverlay();
    hideLoading(true);
    const overlay = document.getElementById('ring-loading-overlay');
    const titleEl = document.getElementById('ring-loading-title');
    const textEl = document.getElementById('ring-loading-text');
    const elapsedEl = document.getElementById('ring-loading-elapsed');
    const cancelBtn = document.getElementById('ring-loading-cancel');
    if (titleEl) titleEl.textContent = title;
    __ringLoadingBaseText = text || '';
    if (textEl) textEl.textContent = __ringLoadingBaseText;
    if (elapsedEl) elapsedEl.textContent = '';
    if (overlay) overlay.classList.add('show');
    var start = Date.now();
    if (__ringLoadingTick) clearInterval(__ringLoadingTick);
    __ringLoadingTick = setInterval(function () {
        var sec = Math.floor((Date.now() - start) / 1000);
        if (elapsedEl) elapsedEl.textContent = sec > 0 ? '経過 ' + sec + ' 秒' : '';
        if (textEl) {
            if (sec >= 15) {
                textEl.textContent = '時間がかかっています。通信環境をご確認ください…';
            } else if (sec >= 6) {
                textEl.textContent = 'まだできない場合は、処理が重い可能性があります…';
            } else {
                textEl.textContent = __ringLoadingBaseText;
            }
        }
    }, 400);
    if (cancelBtn) {
        cancelBtn.style.display = opts.cancelable ? 'inline-block' : 'none';
        cancelBtn.onclick = opts.cancelable ? function () {
            hideLoading();
            if (typeof opts.onCancel === 'function') opts.onCancel();
        } : null;
    }
}

/**
 * @param {boolean} [silent] タイマーのみ解除（連続の showLoading 用。オーバーレイは閉じない）
 */
function hideLoading(silent) {
    if (__ringLoadingTick) {
        clearInterval(__ringLoadingTick);
        __ringLoadingTick = null;
    }
    if (silent) return;
    const el = document.getElementById('ring-loading-overlay');
    if (el) el.classList.remove('show');
}

/**
 * トースト通知
 * @param {'success'|'error'|'info'} type
 * @param {string} message
 * @param {number} duration ミリ秒（省略時: success=1500, error=3500）
 */
function showToast(type, message, duration) {
    const ms = duration !== undefined ? duration : (type === 'error' ? 3500 : (type === 'warning' ? 2800 : 1500));
    let el = document.getElementById('ring-toast');
    if (!el) {
        el = document.createElement('div');
        el.id = 'ring-toast';
        document.body.appendChild(el);
    }
    el.className = 'ring-toast ring-toast--' + type;
    el.textContent = message;
    el.classList.add('ring-toast--show');
    clearTimeout(el._toastTimer);
    el._toastTimer = setTimeout(() => {
        el.classList.remove('ring-toast--show');
    }, ms);
}