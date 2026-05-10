/**
 * 車のお薬手帳 - 統合コアスクリプト (app.js)
 */

const GAS_URL = 'https://script.google.com/macros/s/AKfycbzzthTmrSZAC6dEpaZHbJIAJ07-O4W8eTPYGpXN772jKP7s88oepUYyHerxDU3y0Mfsnw/exec';
/** ads/ads.js から fetch する際の参照用（別スクリプトでは const が見えないため） */
if (typeof window !== 'undefined') window.__RING_GAS_URL__ = GAS_URL;

const DB_VEHICLES = "nappy_vehicles_v1";
const DB_LOGS = "nappy_logs_v1";
const DB_INSPECTIONS = "inspections_v1"; 
const DB_CURRENT_USER = "nappy_current_user";  
const DB_LEGACY_PROFILE = "nappy_profile_v1";

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
    const current = localStorage.getItem(DB_CURRENT_USER);
    if (current) return JSON.parse(current);
    const legacy = localStorage.getItem(DB_LEGACY_PROFILE);
    return JSON.parse(legacy || "null");
}
function logout() {
    localStorage.removeItem(DB_CURRENT_USER);
    localStorage.removeItem(DB_LEGACY_PROFILE);
    localStorage.removeItem('ring_auth_token');
}

// ★ 全ページ共通のログアウト処理
function logoutApp() {
  if (confirm("ログアウトしてトップ画面に戻りますか？")) {
    logout();
    // ロゴ・タイトルのオープニング画面へ戻る
    location.href = 'splash.html';
  }
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
function loadVehicles() { return JSON.parse(localStorage.getItem(DB_VEHICLES) || "[]"); }

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
 * 車両の追加・更新
 */
async function addVehicle(v) {
    const list = loadVehicles();
    const i = list.findIndex(x => _normalize(x.vin) === _normalize(v.vin));
    const merged = i !== -1 ? { ...list[i], ...v } : { ...v };
    if (i !== -1) list[i] = merged; else list.push(merged);
    localStorage.setItem(DB_VEHICLES, JSON.stringify(list));
    return sendToGAS_Safe('vehicle', merged);
}

/**
 * 整備ログの保存
 */
async function saveLog(d) {
    const list = JSON.parse(localStorage.getItem(DB_LOGS) || "[]");
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

    list.push(newEntry);
    localStorage.setItem(DB_LOGS, JSON.stringify(list));

    try {
        await sendToGAS_Safe('log', newEntry);
        return { logId: newLogId, localSaved: true, serverSaved: true };
    } catch (err) {
        return { logId: newLogId, localSaved: true, serverSaved: false, error: err.message };
    }
}

/**
 * VINに基づいたログの抽出
 * 正規化比較を行い、日付の降順でソートして返す
 */
function getLogsByVin(vin) { 
    const searchTarget = _normalize(vin);
    return JSON.parse(localStorage.getItem(DB_LOGS) || "[]").filter(l => {
        return _normalize(l.vin) === searchTarget;
    }).sort((a,b) => new Date(b.date)-new Date(a.date)); 
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

    const authToken = localStorage.getItem('ring_auth_token');
    if (authToken) payload.authToken = authToken;

    const res = await fetch(GAS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify(payload)
    });
    const json = await res.json();
    if (!json || json.success !== true) {
        throw new Error((json && json.error) || 'GAS保存に失敗しました');
    }
    return json;
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
    const logs = JSON.parse(localStorage.getItem(DB_LOGS) || '[]');
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
 * 整備入力・車両登録など共通：保存前確認オーバーレイ
 * @param {{ title?: string, bodyHtml: string, confirmLabel?: string, onConfirm: () => void, onCancel?: () => void }} opts
 */
function showRingSaveConfirm(opts) {
    var id = 'ring-save-confirm';
    var old = document.getElementById(id);
    if (old) old.remove();
    var title = opts.title || '保存前の確認';
    var confirmLabel = opts.confirmLabel || 'この内容で登録する';
    var html = '<div class="ring-save-confirm" id="' + id + '">' +
        '<div class="ring-save-confirm__backdrop"></div>' +
        '<div class="ring-save-confirm__card">' +
        '<div class="ring-save-confirm__title">' + escapeHtml(title) + '</div>' +
        '<p class="ring-save-confirm__lead">個人情報・金額など誤りがないかご確認ください。問題なければ登録してください。</p>' +
        '<div class="ring-save-confirm__body">' + opts.bodyHtml + '</div>' +
        '<div class="ring-save-confirm__actions">' +
        '<button type="button" class="ring-save-confirm__btn ring-save-confirm__btn--secondary" data-ring-action="cancel">戻って修正</button>' +
        '<button type="button" class="ring-save-confirm__btn ring-save-confirm__btn--primary" data-ring-action="confirm">' + escapeHtml(confirmLabel) + '</button>' +
        '</div></div></div>';
    document.body.insertAdjacentHTML('beforeend', html);
    var el = document.getElementById(id);
    function close() { if (el && el.parentNode) el.remove(); }
    el.querySelector('[data-ring-action="cancel"]').onclick = function () { close(); if (opts.onCancel) opts.onCancel(); };
    el.querySelector('[data-ring-action="confirm"]').onclick = function () { close(); opts.onConfirm(); };
    el.querySelector('.ring-save-confirm__backdrop').onclick = function () { close(); if (opts.onCancel) opts.onCancel(); };
}

/**
 * 書類・車検証画像のAI読取。本番は画像認識APIに差し替え。現状はデモ用ダミー。
 * @param {File[]} files
 * @returns {Promise<null|{vin?: string, shaken?: string, mileage?: string, workTitle?: string, parts?: string, model?: string, engine?: string, class?: string, typeDesignation?: string}>}
 */
async function analyzeDocument(files) {
    if (!files || !files[0]) return null;
    await new Promise(function (r) { setTimeout(r, 900); });
    // デモ用：プリウス（ZVW50）相当の車検証読取イメージ
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
                : '<li><a href="#" onclick="alert(\'スタッフ管理はオーナー権限のみ利用できます\'); return false;">👑 スタッフ管理（オーナー専用）</a></li>');
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
      <div class="loading-text" id="ring-loading-text">少々お待ちください</div>
    </div>
    `;
    document.body.insertAdjacentHTML('beforeend', loadingHtml);
}
window.addEventListener('DOMContentLoaded', injectLoadingOverlay);

/**
 * ローディング表示開始
 */
function showLoading(title = "通信中", text = "少々お待ちください...") {
    injectLoadingOverlay();
    document.getElementById('ring-loading-title').textContent = title;
    document.getElementById('ring-loading-text').textContent = text;
    document.getElementById('ring-loading-overlay').classList.add('show');
}

/**
 * ローディング表示終了
 */
function hideLoading() {
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
    const ms = duration !== undefined ? duration : (type === 'error' ? 3500 : 1500);
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