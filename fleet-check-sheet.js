/**
 * Phase3 車両チェックシート — 展開図・傷マーク（ローカルIndexedDBのみ）
 */
(function (root, factory) {
  var api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) {
    root.ringFleetCheckSheetCore_ = api;
  }
})(typeof window !== 'undefined' ? window : globalThis, function () {
  var DB_NAME = 'ring_fleet_check_sheet_v1';
  var STORE = 'records';
  var SCHEMA = 2;
  var PHOTO_MAX = 5;
  var PURPOSES = [
    { id: 'pre_rental', label: '貸出前チェック' },
    { id: 'return', label: '返却時チェック' },
    { id: 'daily', label: '日常点検' }
  ];
  var FUEL_OPTIONS = [
    { id: 'full', label: '満タン' },
    { id: 'three_quarter', label: '3/4' },
    { id: 'half', label: '1/2' },
    { id: 'quarter', label: '1/4' },
    { id: 'near_empty', label: '空に近い' },
    { id: 'unknown', label: '未選択' }
  ];
  var CHECK_STATUS = ['good', 'check', 'unconfirmed'];
  var STATUS_LABELS = { good: '良好', check: '要確認', unconfirmed: '未確認' };
  var INSPECTION_SECTIONS = [
    {
      id: 'engine',
      title: 'エンジンルーム',
      items: [
        { key: 'engine_oil', label: 'エンジンオイル' },
        { key: 'coolant', label: '冷却水' },
        { key: 'brake_fluid', label: 'ブレーキ液' },
        { key: 'washer_fluid', label: 'ウォッシャー液' },
        { key: 'battery', label: 'バッテリーの外観・状態' }
      ]
    },
    {
      id: 'exterior',
      title: '車外',
      items: [
        { key: 'headlight', label: 'ヘッドライト' },
        { key: 'turn_signal', label: 'ウインカー' },
        { key: 'brake_lamp', label: 'ブレーキランプ' },
        { key: 'tail_lamp', label: '尾灯・番号灯' },
        { key: 'wiper_washer', label: 'ワイパー・ウォッシャーの作動' },
        { key: 'body_look', label: '車体外観の異常' }
      ]
    },
    {
      id: 'cabin',
      title: '運転席・走行前',
      items: [
        { key: 'brake_pedal', label: 'ブレーキの踏み応え' },
        { key: 'parking_brake', label: '駐車ブレーキ' },
        { key: 'warning_lamps', label: '警告灯' },
        { key: 'horn', label: 'ホーン' },
        { key: 'mirrors', label: 'ミラー・視界' }
      ]
    }
  ];
  var TIRE_WHEELS = ['FL', 'FR', 'RL', 'RR'];
  var TIRE_CHECKS = [
    { key: 'pressure', label: '空気圧' },
    { key: 'tread', label: '残り溝・摩耗' },
    { key: 'crack', label: 'ひび割れ・外傷' },
    { key: 'foreign', label: '異物の刺さり' },
    { key: 'other', label: 'その他異常' }
  ];
  var REGIONS = [
    'body_top', 'bumper_front', 'bumper_rear', 'side_left', 'side_right',
    'tire_FL', 'tire_FR', 'tire_RL', 'tire_RR'
  ];
  var TYPE_MAP = { scratch: '●', dent: '×', other: '□' };
  var TAP_MOVE_PX = 12;

  function storageId_(shopId, vin, kind) {
    shopId = String(shopId || '').trim();
    vin = String(vin || '').trim().toUpperCase();
    kind = kind || 'active';
    return shopId + '::' + vin + '::' + kind;
  }

  function shopVinKey_(shopId, vin) {
    return String(shopId || '').trim() + '::' + String(vin || '').trim().toUpperCase();
  }

  function clamp01_(n) {
    n = Number(n);
    if (isNaN(n)) return 0;
    if (n < 0) return 0;
    if (n > 1) return 1;
    return n;
  }

  function relPointFromClient_(clientX, clientY, rect) {
    if (!rect || !rect.width || !rect.height) return { nx: 0.5, ny: 0.5 };
    return {
      nx: clamp01_((clientX - rect.left) / rect.width),
      ny: clamp01_((clientY - rect.top) / rect.height)
    };
  }

  function newMarkId_() {
    return 'mk-' + Date.now() + '-' + Math.random().toString(36).slice(2, 9);
  }

  function newMark_(region, nx, ny, type, memo) {
    return {
      id: newMarkId_(),
      region: String(region || 'body_top'),
      nx: clamp01_(nx),
      ny: clamp01_(ny),
      type: type === 'dent' || type === 'other' ? type : 'scratch',
      memo: String(memo || '')
    };
  }

  function cloneMarks_(marks) {
    return (Array.isArray(marks) ? marks : []).map(function (m) {
      return {
        id: m.id,
        region: m.region,
        nx: m.nx,
        ny: m.ny,
        type: m.type,
        memo: m.memo
      };
    });
  }

  function markSymbol_(type) {
    return TYPE_MAP[type] || '●';
  }

  function pointerTravelPx_(x0, y0, x1, y1) {
    var dx = x1 - x0;
    var dy = y1 - y0;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function shouldPlaceMarkFromGesture_(opts) {
    opts = opts || {};
    if (opts.cancelled || opts.scrolled || opts.isMarkTarget) return false;
    if (!opts.modeIsPlace) return false;
    return true;
  }

  function setMarkType_(mark, newType) {
    if (!mark) return mark;
    var t = newType === 'dent' || newType === 'other' ? newType : 'scratch';
    mark.type = t;
    return mark;
  }

  function applyMarkTypeInList_(marks, markId, newType) {
    return (Array.isArray(marks) ? marks : []).map(function (m) {
      if (m.id !== markId) return m;
      return Object.assign({}, m, { type: newType === 'dent' || newType === 'other' ? newType : 'scratch' });
    });
  }

  function findMarkInList_(marks, markId) {
    markId = String(markId || '').trim();
    if (!markId) return null;
    return (Array.isArray(marks) ? marks : []).find(function (m) {
      return m && String(m.id) === markId;
    }) || null;
  }

  /** 詳細画面と同じ：ID経由で現在リスト上のマークへ反映 */
  function applyMarkEditsById_(marks, markId, patch) {
    marks = Array.isArray(marks) ? marks : [];
    var cur = findMarkInList_(marks, markId);
    if (!cur) return { marks: marks, applied: false };
    patch = patch || {};
    if (patch.type != null) {
      setMarkType_(cur, patch.type);
    }
    if (patch.memo != null) {
      cur.memo = String(patch.memo);
    }
    return { marks: marks, applied: true, mark: cur };
  }

  function applyUndo_(marks, undoEntry) {
    marks = Array.isArray(marks) ? marks.slice() : [];
    if (!undoEntry) return marks;
    if (undoEntry.action === 'add') {
      return marks.filter(function (m) { return m.id !== undoEntry.mark.id; });
    }
    if (undoEntry.action === 'remove') {
      return marks.concat([Object.assign({}, undoEntry.mark)]);
    }
    if (undoEntry.action === 'change_type') {
      return marks.map(function (m) {
        if (m.id !== undoEntry.markId) return m;
        return Object.assign({}, m, { type: undoEntry.prevType });
      });
    }
    return marks;
  }

  function newRecordId_() {
    return 'rec-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
  }

  function defaultItemState_() {
    return { status: 'unconfirmed', memo: '' };
  }

  function defaultSectionForm_() {
    var out = {};
    INSPECTION_SECTIONS.forEach(function (sec) {
      out[sec.id] = { sectionMemo: '', items: {} };
      sec.items.forEach(function (it) {
        out[sec.id].items[it.key] = defaultItemState_();
      });
    });
    return out;
  }

  function defaultTireForm_() {
    var tires = {};
    TIRE_WHEELS.forEach(function (w) {
      var items = {};
      TIRE_CHECKS.forEach(function (tc) {
        items[tc.key] = defaultItemState_();
      });
      tires[w] = { wheelMemo: '', items: items, pressureValue: '', pressureUnit: 'kPa' };
    });
    return tires;
  }

  function defaultMeta_() {
    var d = new Date();
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    return {
      inspectionDate: y + '-' + m + '-' + day,
      purpose: 'daily',
      odometerKm: '',
      fuelLevel: 'unknown',
      overallMemo: ''
    };
  }

  function defaultInspectionForm_() {
    return {
      sections: defaultSectionForm_(),
      tires: defaultTireForm_()
    };
  }

  function normalizeRecord_(record) {
    record = record || {};
    if (!record.recordId) record.recordId = newRecordId_();
    if (!record.meta || typeof record.meta !== 'object') record.meta = defaultMeta_();
    if (!record.inspection || typeof record.inspection !== 'object') {
      record.inspection = defaultInspectionForm_();
    } else {
      record.inspection = mergeInspectionForm_(defaultInspectionForm_(), record.inspection);
    }
    record.schemaVersion = SCHEMA;
    return record;
  }

  function mergeInspectionForm_(base, patch) {
    base = JSON.parse(JSON.stringify(base));
    if (!patch) return base;
    if (patch.sections) {
      Object.keys(patch.sections).forEach(function (sid) {
        if (!base.sections[sid]) base.sections[sid] = { sectionMemo: '', items: {} };
        var ps = patch.sections[sid];
        if (ps.sectionMemo != null) base.sections[sid].sectionMemo = String(ps.sectionMemo);
        if (ps.items) {
          Object.keys(ps.items).forEach(function (ik) {
            var cur = base.sections[sid].items[ik] || defaultItemState_();
            var pu = ps.items[ik] || {};
            if (pu.status && CHECK_STATUS.indexOf(pu.status) >= 0) cur.status = pu.status;
            if (pu.memo != null) cur.memo = String(pu.memo);
            base.sections[sid].items[ik] = cur;
          });
        }
      });
    }
    if (patch.tires) {
      TIRE_WHEELS.forEach(function (w) {
        var pt = patch.tires[w];
        if (!pt) return;
        if (pt.wheelMemo != null) base.tires[w].wheelMemo = String(pt.wheelMemo);
        if (pt.pressureValue != null) base.tires[w].pressureValue = String(pt.pressureValue);
        if (pt.pressureUnit != null) base.tires[w].pressureUnit = String(pt.pressureUnit);
        if (pt.items) {
          TIRE_CHECKS.forEach(function (tc) {
            var pu = pt.items[tc.key];
            if (!pu) return;
            var cur = base.tires[w].items[tc.key] || defaultItemState_();
            if (pu.status && CHECK_STATUS.indexOf(pu.status) >= 0) cur.status = pu.status;
            if (pu.memo != null) cur.memo = String(pu.memo);
            base.tires[w].items[tc.key] = cur;
          });
        }
      });
    }
    return base;
  }

  function purposeLabel_(purposeId) {
    var p = PURPOSES.find(function (x) { return x.id === purposeId; });
    return p ? p.label : String(purposeId || '');
  }

  function fuelLabel_(fuelId) {
    var f = FUEL_OPTIONS.find(function (x) { return x.id === fuelId; });
    return f ? f.label : String(fuelId || '');
  }

  function countAttention_(record) {
    var n = 0;
    var insp = record && record.inspection ? record.inspection : null;
    if (!insp) return 0;
    INSPECTION_SECTIONS.forEach(function (sec) {
      var block = insp.sections && insp.sections[sec.id];
      if (!block || !block.items) return;
      sec.items.forEach(function (it) {
        var st = block.items[it.key] && block.items[it.key].status;
        if (st === 'check') n++;
      });
    });
    TIRE_WHEELS.forEach(function (w) {
      var tw = insp.tires && insp.tires[w];
      if (!tw || !tw.items) return;
      TIRE_CHECKS.forEach(function (tc) {
        var st = tw.items[tc.key] && tw.items[tc.key].status;
        if (st === 'check') n++;
      });
    });
    return n;
  }

  function pdfFileName_(date) {
    var d = date instanceof Date ? date : new Date();
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    var h = String(d.getHours()).padStart(2, '0');
    var min = String(d.getMinutes()).padStart(2, '0');
    return 'RinGAuto_車両チェック_' + y + m + day + '_' + h + min + '.pdf';
  }

  function copyRecordForEdit_(source, shopId, vin) {
    var copy = {
      id: storageId_(shopId, vin, 'active'),
      shopVin: shopVinKey_(shopId, vin),
      shopId: shopId,
      vin: String(vin || '').trim().toUpperCase(),
      kind: 'active',
      schemaVersion: SCHEMA,
      recordId: source && source.recordId ? source.recordId : newRecordId_(),
      parentId: source && source.id ? source.id : null,
      savedAt: new Date().toISOString(),
      marks: cloneMarks_(source && source.marks),
      meta: source && source.meta ? JSON.parse(JSON.stringify(source.meta)) : defaultMeta_(),
      inspection: source && source.inspection
        ? mergeInspectionForm_(defaultInspectionForm_(), source.inspection)
        : defaultInspectionForm_(),
      localOnly: true
    };
    return normalizeRecord_(copy);
  }

  function openDb_() {
    return new Promise(function (resolve, reject) {
      if (typeof indexedDB === 'undefined') {
        reject(new Error('INDEXEDDB_UNAVAILABLE'));
        return;
      }
      var req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = function (ev) {
        var db = ev.target.result;
        if (!db.objectStoreNames.contains(STORE)) {
          var os = db.createObjectStore(STORE, { keyPath: 'id' });
          os.createIndex('shopVin', 'shopVin', { unique: false });
          os.createIndex('kind', 'kind', { unique: false });
        }
      };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error || new Error('IDB_OPEN_FAILED')); };
    });
  }

  function idbGet_(id) {
    return openDb_().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(STORE, 'readonly');
        var req = tx.objectStore(STORE).get(id);
        req.onsuccess = function () { resolve(req.result || null); };
        req.onerror = function () { reject(req.error); };
      });
    });
  }

  function idbPut_(record) {
    return openDb_().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).put(record);
        tx.oncomplete = function () { resolve(record); };
        tx.onerror = function () { reject(tx.error); };
      });
    });
  }

  function idbListSnapshots_(shopVin) {
    return openDb_().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(STORE, 'readonly');
        var req = tx.objectStore(STORE).getAll();
        req.onsuccess = function () {
          var all = req.result || [];
          resolve(all.filter(function (r) {
            return r && r.shopVin === shopVin && r.kind === 'snapshot';
          }).sort(function (a, b) {
            return String(b.savedAt || '').localeCompare(String(a.savedAt || ''));
          }));
        };
        req.onerror = function () { reject(req.error); };
      });
    });
  }

  function loadActiveDraft_(shopId, vin) {
    return idbGet_(storageId_(shopId, vin, 'active'));
  }

  function saveActiveDraft_(record) {
    record.kind = 'active';
    normalizeRecord_(record);
    record.savedAt = new Date().toISOString();
    record.localOnly = true;
    return idbPut_(record);
  }

  function snapshotDraft_(record) {
    normalizeRecord_(record);
    var rid = record.recordId || newRecordId_();
    var snap = Object.assign({}, record, {
      id: storageId_(record.shopId, record.vin, 'snapshot::' + rid + '::' + Date.now()),
      kind: 'snapshot',
      recordId: rid,
      parentId: record.parentId || null,
      savedAt: new Date().toISOString()
    });
    return idbPut_(snap).then(function () { return snap; });
  }

  function diagramSvgMarkup_() {
    return '<svg class="ring-check-diagram" viewBox="0 0 420 560" xmlns="http://www.w3.org/2000/svg">' +
      '<defs><style>.rg{fill:#f8fafc;stroke:#64748b;stroke-width:2}.rl{font-size:11px;font-weight:700;fill:#475569}.rt{fill:#e2e8f0;stroke:#475569;stroke-width:2}</style></defs>' +
      '<g data-region="bumper_front"><rect class="rg" x="130" y="20" width="160" height="44" rx="8"/><text class="rl" x="210" y="48" text-anchor="middle">前バンパー</text></g>' +
      '<g data-region="body_top"><rect class="rg" x="80" y="80" width="260" height="200" rx="12"/><text class="rl" x="210" y="110" text-anchor="middle">車両上面</text></g>' +
      '<g data-region="side_left"><rect class="rg" x="20" y="80" width="50" height="200" rx="6"/><text class="rl" transform="rotate(-90 45 180)" x="45" y="180" text-anchor="middle">左側面</text></g>' +
      '<g data-region="side_right"><rect class="rg" x="350" y="80" width="50" height="200" rx="6"/><text class="rl" transform="rotate(90 375 180)" x="375" y="180" text-anchor="middle">右側面</text></g>' +
      '<g data-region="bumper_rear"><rect class="rg" x="130" y="296" width="160" height="44" rx="8"/><text class="rl" x="210" y="324" text-anchor="middle">後バンパー</text></g>' +
      '<g data-region="tire_FL"><circle class="rt" cx="55" cy="400" r="34"/><text class="rl" x="55" y="405" text-anchor="middle">FL</text></g>' +
      '<g data-region="tire_FR"><circle class="rt" cx="365" cy="400" r="34"/><text class="rl" x="365" y="405" text-anchor="middle">FR</text></g>' +
      '<g data-region="tire_RL"><circle class="rt" cx="55" cy="500" r="34"/><text class="rl" x="55" y="505" text-anchor="middle">RL</text></g>' +
      '<g data-region="tire_RR"><circle class="rt" cx="365" cy="500" r="34"/><text class="rl" x="365" y="505" text-anchor="middle">RR</text></g>' +
      '<g id="ringCheckMarksLayerPdf"></g></svg>';
  }

  return {
    DB_NAME: DB_NAME,
    SCHEMA: SCHEMA,
    PHOTO_MAX: PHOTO_MAX,
    PURPOSES: PURPOSES,
    FUEL_OPTIONS: FUEL_OPTIONS,
  INSPECTION_SECTIONS: INSPECTION_SECTIONS,
    TIRE_WHEELS: TIRE_WHEELS,
    TIRE_CHECKS: TIRE_CHECKS,
    STATUS_LABELS: STATUS_LABELS,
    CHECK_STATUS: CHECK_STATUS,
    REGIONS: REGIONS,
    storageId_: storageId_,
    shopVinKey_: shopVinKey_,
    relPointFromClient_: relPointFromClient_,
    newMark_: newMark_,
    cloneMarks_: cloneMarks_,
    markSymbol_: markSymbol_,
    applyUndo_: applyUndo_,
    copyRecordForEdit_: copyRecordForEdit_,
    loadActiveDraft_: loadActiveDraft_,
    saveActiveDraft_: saveActiveDraft_,
    snapshotDraft_: snapshotDraft_,
    idbListSnapshots_: idbListSnapshots_,
    idbGet_: idbGet_,
    TAP_MOVE_PX: TAP_MOVE_PX,
    pointerTravelPx_: pointerTravelPx_,
    shouldPlaceMarkFromGesture_: shouldPlaceMarkFromGesture_,
    setMarkType_: setMarkType_,
    applyMarkTypeInList_: applyMarkTypeInList_,
    findMarkInList_: findMarkInList_,
    applyMarkEditsById_: applyMarkEditsById_,
    newRecordId_: newRecordId_,
    defaultInspectionForm_: defaultInspectionForm_,
    defaultMeta_: defaultMeta_,
    normalizeRecord_: normalizeRecord_,
    mergeInspectionForm_: mergeInspectionForm_,
    purposeLabel_: purposeLabel_,
    fuelLabel_: fuelLabel_,
    countAttention_: countAttention_,
    pdfFileName_: pdfFileName_,
    diagramSvgMarkup_: diagramSvgMarkup_
  };
});

/* === 画面（ブラウザのみ） === */
(function () {
  if (typeof document === 'undefined') return;
  var C = typeof ringFleetCheckSheetCore_ !== 'undefined' ? ringFleetCheckSheetCore_ : null;
  if (!C) return;

  var profile = typeof getCurrentProfile === 'function' ? getCurrentProfile() : null;
  var params = new URLSearchParams(location.search);
  var vin = String(params.get('vin') || '').trim().toUpperCase();
  var state = {
    mode: 'scratch',
    marks: [],
    undo: [],
    record: null,
    vehicle: null,
    selectedMarkId: '',
    idbAvailable: true,
    pendingPlace: null,
    pendingMarkTap: null,
    windowPointerBound: false,
    detailMarkId: '',
    step: 'basic',
    photos: [],
    photosSessionOnly: true,
    pdfBusy: false
  };

  function esc_(s) {
    if (!s) return '';
    return String(s).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]);
    });
  }

  function findVehicle_() {
    if (!profile || !vin) return null;
    var list = typeof ringLoadMyVehicles_ === 'function' ? ringLoadMyVehicles_(profile) : [];
    return list.find(function (v) {
      return v && String(v.vin || '').trim().toUpperCase() === vin
        && String(v.shopId || '').trim() === String(profile.shopId || '').trim();
    }) || null;
  }

  function diagramSvgHtml_() {
    return C.diagramSvgMarkup_()
      .replace('id="ringCheckMarksLayerPdf"', 'id="ringCheckMarksLayer"')
      .replace(/<g data-region="/g, '<g class="ring-check-region" data-region="')
      .replace('<svg class="ring-check-diagram"', '<svg class="ring-check-diagram" role="img" aria-label="車両展開図"');
  }

  function renderMarks_() {
    var layer = document.getElementById('ringCheckMarksLayer');
    if (!layer) return;
    var svg = layer.ownerSVGElement;
    if (!svg) return;
    var html = '';
    state.marks.forEach(function (m) {
      var g = svg.querySelector('[data-region="' + m.region + '"]');
      if (!g) return;
      var box = g.getBBox();
      var cx = box.x + box.width * m.nx;
      var cy = box.y + box.height * m.ny;
      var sym = C.markSymbol_(m.type);
      var sel = m.id === state.selectedMarkId ? ' is-selected' : '';
      html += '<g class="ring-check-mark' + sel + '" data-mark-id="' + esc_(m.id) + '" data-type="' + esc_(m.type) + '" data-region="' + esc_(m.region) + '" transform="translate(' + cx + ',' + cy + ')">' +
        '<circle r="14" class="ring-check-mark-hit"/><text class="ring-check-mark-glyph" text-anchor="middle" dominant-baseline="central">' + sym + '</text></g>';
    });
    layer.innerHTML = html;
  }

  function persistDraft_() {
    if (!state.idbAvailable || !state.record || !profile) return Promise.resolve();
    state.record.marks = C.cloneMarks_(state.marks);
    C.normalizeRecord_(state.record);
    return C.saveActiveDraft_(state.record);
  }

  function syncFormFromDom_() {
    if (!state.record) return;
    var m = state.record.meta;
    var elDate = document.getElementById('ringCheckDate');
    if (elDate) m.inspectionDate = String(elDate.value || m.inspectionDate);
    var elPurpose = document.getElementById('ringCheckPurpose');
    if (elPurpose) m.purpose = String(elPurpose.value || m.purpose);
    var elKm = document.getElementById('ringCheckKm');
    if (elKm) m.odometerKm = String(elKm.value || '').replace(/[^\d.]/g, '');
    var elFuel = document.getElementById('ringCheckFuel');
    if (elFuel) m.fuelLevel = String(elFuel.value || m.fuelLevel);
    var elMemo = document.getElementById('ringCheckOverallMemo');
    if (elMemo) m.overallMemo = String(elMemo.value || '');
    document.querySelectorAll('[data-insp-key]').forEach(function (sel) {
      var sec = sel.getAttribute('data-insp-sec');
      var key = sel.getAttribute('data-insp-key');
      if (!sec || !key || !state.record.inspection.sections[sec]) return;
      if (sel.getAttribute('data-insp-field') === 'status') {
        state.record.inspection.sections[sec].items[key].status = sel.value;
      }
    });
    document.querySelectorAll('[data-insp-memo]').forEach(function (ta) {
      var sec = ta.getAttribute('data-insp-sec');
      var key = ta.getAttribute('data-insp-memo');
      if (sec && key && state.record.inspection.sections[sec]) {
        state.record.inspection.sections[sec].items[key].memo = ta.value;
      }
    });
    document.querySelectorAll('[data-sec-memo="1"]').forEach(function (ta) {
      var sec = ta.getAttribute('data-insp-sec');
      if (sec && state.record.inspection.sections[sec]) {
        state.record.inspection.sections[sec].sectionMemo = String(ta.value || '');
      }
    });
    C.TIRE_WHEELS.forEach(function (w) {
      var tw = state.record.inspection.tires[w];
      var wmemo = document.getElementById('ringCheckTireMemo_' + w);
      if (wmemo) tw.wheelMemo = wmemo.value;
      var pv = document.getElementById('ringCheckTirePressVal_' + w);
      if (pv) tw.pressureValue = String(pv.value || '').replace(/[^\d.]/g, '');
      var pu = document.getElementById('ringCheckTirePressUnit_' + w);
      if (pu) tw.pressureUnit = pu.value || 'kPa';
    });
    document.querySelectorAll('[data-tire-key]').forEach(function (sel) {
      var w = sel.getAttribute('data-tire-wheel');
      var key = sel.getAttribute('data-tire-key');
      if (!w || !key) return;
      state.record.inspection.tires[w].items[key].status = sel.value;
    });
    document.querySelectorAll('[data-tire-item-memo]').forEach(function (ta) {
      var w = ta.getAttribute('data-tire-wheel');
      var key = ta.getAttribute('data-tire-item-memo');
      if (w && key) state.record.inspection.tires[w].items[key].memo = ta.value;
    });
  }

  function renderAttention_() {
    var host = document.getElementById('ringCheckAttention');
    if (!host || !state.record) return;
    var n = C.countAttention_(state.record);
    if (n > 0) {
      host.hidden = false;
      host.textContent = '要確認の項目が ' + n + ' 件あります。PDFにも表示されます。';
    } else host.hidden = true;
  }

  function setStep_(step) {
    state.step = step;
    document.querySelectorAll('[data-step]').forEach(function (btn) {
      btn.classList.toggle('is-active', btn.getAttribute('data-step') === step);
    });
    document.querySelectorAll('[data-pane]').forEach(function (pane) {
      pane.classList.toggle('is-active', pane.getAttribute('data-pane') === step);
    });
    var tb = document.getElementById('ringCheckMarkToolbar');
    if (tb) {
      tb.hidden = step !== 'diagram';
      tb.classList.toggle('is-visible', step === 'diagram');
    }
    document.body.classList.toggle('ring-check-on-diagram', step === 'diagram');
  }

  function renderBasicPane_() {
    var host = document.getElementById('ringCheckPaneBasic');
    if (!host || !state.record) return;
    var m = state.record.meta;
    var purposeOpts = C.PURPOSES.map(function (p) {
      var sel = m.purpose === p.id ? ' selected' : '';
      return '<option value="' + esc_(p.id) + '"' + sel + '>' + esc_(p.label) + '</option>';
    }).join('');
    var fuelOpts = C.FUEL_OPTIONS.map(function (f) {
      var sel = m.fuelLevel === f.id ? ' selected' : '';
      return '<option value="' + esc_(f.id) + '"' + sel + '>' + esc_(f.label) + '</option>';
    }).join('');
    host.innerHTML =
      '<h2 class="ring-check-section-title">車両・点検基本情報</h2>' +
      '<div class="ring-check-form-card">' +
      '<label class="ring-check-field">点検日<input type="date" id="ringCheckDate" value="' + esc_(m.inspectionDate) + '"></label>' +
      '<label class="ring-check-field">点検用途<select id="ringCheckPurpose">' + purposeOpts + '</select></label>' +
      '<label class="ring-check-field">走行距離（km）<input type="number" inputmode="decimal" id="ringCheckKm" placeholder="チェックシート用" value="' + esc_(m.odometerKm) + '"></label>' +
      '<label class="ring-check-field">燃料残量<select id="ringCheckFuel">' + fuelOpts + '</select></label>' +
      '<label class="ring-check-field">点検メモ<textarea id="ringCheckOverallMemo" rows="3" placeholder="総合メモ">' + esc_(m.overallMemo) + '</textarea></label>' +
      '<p class="ring-check-hint">走行距離はチェックシート記録用です。車両マスタや整備履歴は更新しません。</p>' +
      '<p class="ring-check-hint">記録ID：' + esc_(state.record.recordId) + '</p>' +
      '<div class="ring-check-form-actions">' +
      '<button type="button" class="ring-check-save-btn" id="ringCheckDraftSave">下書きを端末に保存</button>' +
      '<button type="button" class="ring-check-secondary-btn" id="ringCheckNewRecord">新しい点検（新記録ID）</button>' +
      '</div></div>';
    ['ringCheckDate', 'ringCheckPurpose', 'ringCheckKm', 'ringCheckFuel', 'ringCheckOverallMemo'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.addEventListener('change', function () { syncFormFromDom_(); renderAttention_(); persistDraft_(); });
    });
    document.getElementById('ringCheckDraftSave').onclick = function () { return saveSnapshotFlow_(); };
    document.getElementById('ringCheckNewRecord').onclick = function () {
      if (!confirm('新しい点検として記録IDを発行します。現在の下書きはスナップショット保存後に切り替えてください。続行しますか？')) return;
      syncFormFromDom_();
      state.record.recordId = C.newRecordId_();
      state.record.parentId = state.record.id;
      renderBasicPane_();
      persistDraft_();
    };
  }

  function statusSelectHtml_(name, cur) {
    return C.CHECK_STATUS.map(function (st) {
      var sel = cur === st ? ' selected' : '';
      return '<option value="' + st + '"' + sel + '>' + esc_(C.STATUS_LABELS[st]) + '</option>';
    }).join('');
  }

  function renderInspectionPane_() {
    var host = document.getElementById('ringCheckPaneInspection');
    if (!host || !state.record) return;
    var html = '<h2 class="ring-check-section-title">日常点検</h2>';
    C.INSPECTION_SECTIONS.forEach(function (sec) {
      var block = state.record.inspection.sections[sec.id];
      html += '<details class="ring-check-collapse" open><summary>' + esc_(sec.title) + '</summary><div class="ring-check-form-card">';
      sec.items.forEach(function (it) {
        var item = block.items[it.key];
        html += '<div class="ring-check-insp-row">' +
          '<span class="ring-check-insp-label">' + esc_(it.label) + '</span>' +
          '<select data-insp-sec="' + esc_(sec.id) + '" data-insp-key="' + esc_(it.key) + '" data-insp-field="status">' +
          statusSelectHtml_(it.key, item.status) + '</select></div>' +
          '<label class="ring-check-field ring-check-insp-memo">メモ<textarea data-insp-sec="' + esc_(sec.id) + '" data-insp-memo="' + esc_(it.key) + '" rows="2">' + esc_(item.memo) + '</textarea></label>';
      });
      html += '<label class="ring-check-field">区分メモ<textarea data-insp-sec="' + esc_(sec.id) + '" data-sec-memo="1" rows="2">' + esc_(block.sectionMemo) + '</textarea></label>';
      html += '</div></details>';
    });
    host.innerHTML = html;
    host.querySelectorAll('select, textarea').forEach(function (el) {
      el.addEventListener('change', function () {
        syncFormFromDom_();
        renderAttention_();
        persistDraft_();
      });
    });
  }

  function renderTiresPane_() {
    var host = document.getElementById('ringCheckPaneTires');
    if (!host || !state.record) return;
    var html = '<h2 class="ring-check-section-title">タイヤ4輪</h2>';
    C.TIRE_WHEELS.forEach(function (w) {
      var tw = state.record.inspection.tires[w];
      html += '<details class="ring-check-collapse" open><summary>' + esc_(w) + '</summary><div class="ring-check-form-card">';
      C.TIRE_CHECKS.forEach(function (tc) {
        var item = tw.items[tc.key];
        html += '<div class="ring-check-insp-row"><span class="ring-check-insp-label">' + esc_(tc.label) + '</span>' +
          '<select data-tire-wheel="' + w + '" data-tire-key="' + tc.key + '">' + statusSelectHtml_(tc.key, item.status) + '</select></div>';
        if (tc.key === 'pressure') {
          html += '<div class="ring-check-insp-row ring-check-pressure-extra">' +
            '<span class="ring-check-insp-label">実測（任意）</span>' +
            '<input type="number" inputmode="decimal" id="ringCheckTirePressVal_' + w + '" value="' + esc_(tw.pressureValue) + '" placeholder="数値">' +
            '<select id="ringCheckTirePressUnit_' + w + '"><option value="kPa"' + (tw.pressureUnit === 'kPa' ? ' selected' : '') + '>kPa</option><option value="psi"' + (tw.pressureUnit === 'psi' ? ' selected' : '') + '>psi</option></select></div>';
        }
        html += '<label class="ring-check-field ring-check-insp-memo">メモ<textarea data-tire-wheel="' + w + '" data-tire-item-memo="' + tc.key + '" rows="2">' + esc_(item.memo) + '</textarea></label>';
      });
      html += '<label class="ring-check-field">区分メモ<textarea id="ringCheckTireMemo_' + w + '" rows="2">' + esc_(tw.wheelMemo) + '</textarea></label>';
      html += '</div></details>';
    });
    host.innerHTML = html;
    host.querySelectorAll('select, textarea, input').forEach(function (el) {
      el.addEventListener('change', function () { syncFormFromDom_(); renderAttention_(); persistDraft_(); });
    });
  }

  function renderPhotoWarn_() {
    var host = document.getElementById('ringCheckPhotoWarn');
    if (!host) return;
    host.innerHTML = '<p class="ring-check-photo-note">写真はこの作業セッション内のみ保持し、PDFに埋め込みます。再読み込み・画面を閉じると写真は消えます（展開図・点検下書きはIndexedDB）。</p>';
  }

  function revokePhotoUrls_(photos) {
    (photos || []).forEach(function (p) {
      if (p && p.objectUrl) {
        try { URL.revokeObjectURL(p.objectUrl); } catch (e) { /* ignore */ }
      }
    });
  }

  /** The modal exists in the DOM only while a real photo is shown, so no stylesheet can surface an empty one. */
  function closePhotoModal_() {
    document.querySelectorAll('#ringCheckPhotoModal, .ring-check-photo-modal').forEach(function (modal) {
      if (modal.parentNode) modal.parentNode.removeChild(modal);
    });
    document.body.classList.remove('ring-check-photo-modal-open');
  }

  function openPhotoModal_(objectUrl) {
    if (!objectUrl) return;
    closePhotoModal_();
    var modal = document.createElement('div');
    modal.id = 'ringCheckPhotoModal';
    modal.className = 'ring-check-photo-modal is-open';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-label', '写真の拡大表示');
    var inner = document.createElement('div');
    inner.className = 'ring-check-photo-modal-inner';
    var closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.id = 'ringCheckPhotoModalClose';
    closeBtn.className = 'ring-check-photo-modal-close';
    closeBtn.textContent = '閉じる';
    var img = document.createElement('img');
    img.id = 'ringCheckPhotoModalImg';
    img.alt = '';
    img.src = objectUrl;
    inner.appendChild(closeBtn);
    inner.appendChild(img);
    modal.appendChild(inner);
    closeBtn.addEventListener('click', function (ev) { ev.preventDefault(); closePhotoModal_(); });
    modal.addEventListener('click', function (ev) {
      if (ev.target === modal) closePhotoModal_();
    });
    document.body.appendChild(modal);
    document.body.classList.add('ring-check-photo-modal-open');
  }

  function renderPhotosPane_() {
    var host = document.getElementById('ringCheckPanePhotos');
    if (!host) return;
    var max = C.PHOTO_MAX;
    var items = state.photos.map(function (p, idx) {
      return '<div class="ring-check-photo-card">' +
        '<img src="' + esc_(p.objectUrl) + '" alt="写真' + (idx + 1) + '" class="ring-check-photo-thumb" data-photo-idx="' + idx + '" role="presentation">' +
        '<div class="ring-check-photo-actions">' +
        '<button type="button" data-photo-view="' + idx + '">拡大</button>' +
        '<button type="button" data-photo-replace="' + idx + '">差し替え</button>' +
        '<button type="button" data-photo-del="' + idx + '">削除</button></div></div>';
    }).join('');
    host.innerHTML = '<h2 class="ring-check-section-title">写真（最大' + max + '枚）</h2>' +
      '<p class="ring-check-muted">' + state.photos.length + ' / ' + max + ' 枚</p>' +
      '<div class="ring-check-photo-grid">' + (items || '<p class="ring-check-muted">写真がありません</p>') + '</div>' +
      '<div class="ring-check-form-actions">' +
      '<button type="button" class="ring-check-save-btn" id="ringCheckPhotoAdd" ' + (state.photos.length >= max ? 'disabled' : '') + '>写真を追加</button></div>';
    document.getElementById('ringCheckPhotoAdd').onclick = function () { openPhotoPicker_(null); };
    host.querySelectorAll('[data-photo-view]').forEach(function (btn) {
      btn.onclick = function () {
        var i = Number(btn.getAttribute('data-photo-view'));
        var ph = state.photos[i];
        if (!ph || !ph.objectUrl) return;
        openPhotoModal_(ph.objectUrl);
      };
    });
    host.querySelectorAll('[data-photo-del]').forEach(function (btn) {
      btn.onclick = function () {
        var i = Number(btn.getAttribute('data-photo-del'));
        var removed = state.photos.splice(i, 1)[0];
        revokePhotoUrls_([removed]);
        renderPhotosPane_();
      };
    });
    host.querySelectorAll('[data-photo-replace]').forEach(function (btn) {
      btn.onclick = function () { openPhotoPicker_(Number(btn.getAttribute('data-photo-replace'))); };
    });
  }

  var photoReplaceIndex_ = null;

  function openPhotoPicker_(replaceIndex) {
    photoReplaceIndex_ = replaceIndex;
    var inp = document.getElementById('ringCheckPhotoInput');
    inp.value = '';
    inp.click();
  }

  function compressImageFile_(file) {
    return new Promise(function (resolve, reject) {
      if (!file || !file.type || file.type.indexOf('image/') !== 0) {
        reject(new Error('UNSUPPORTED_IMAGE'));
        return;
      }
      var reader = new FileReader();
      reader.onload = function () {
        var img = new Image();
        img.onload = function () {
          var maxEdge = 1600;
          var w = img.width;
          var h = img.height;
          var scale = Math.min(1, maxEdge / Math.max(w, h));
          var cw = Math.round(w * scale);
          var ch = Math.round(h * scale);
          var canvas = document.createElement('canvas');
          canvas.width = cw;
          canvas.height = ch;
          var ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, cw, ch);
          var dataUrl = canvas.toDataURL('image/jpeg', 0.82);
          resolve({ dataUrl: dataUrl, width: cw, height: ch });
        };
        img.onerror = function () { reject(new Error('IMAGE_DECODE_FAILED')); };
        img.src = reader.result;
      };
      reader.onerror = function () { reject(new Error('READ_FAILED')); };
      reader.readAsDataURL(file);
    });
  }

  function bindPhotoInput_() {
    var inp = document.getElementById('ringCheckPhotoInput');
    if (!inp) return;
    inp.addEventListener('change', async function () {
      var files = Array.from(inp.files || []);
      if (!files.length) return;
      try {
        for (var fi = 0; fi < files.length; fi++) {
          if (photoReplaceIndex_ != null) {
            var rep = await compressImageFile_(files[0]);
            revokePhotoUrls_([state.photos[photoReplaceIndex_]]);
            state.photos[photoReplaceIndex_] = {
              dataUrl: rep.dataUrl,
              objectUrl: rep.dataUrl,
              width: rep.width,
              height: rep.height
            };
            photoReplaceIndex_ = null;
            break;
          }
          if (state.photos.length >= C.PHOTO_MAX) {
            if (typeof showToast === 'function') showToast('error', '写真は最大' + C.PHOTO_MAX + '枚です');
            break;
          }
          var pack = await compressImageFile_(files[fi]);
          state.photos.push({
            dataUrl: pack.dataUrl,
            objectUrl: pack.dataUrl,
            width: pack.width,
            height: pack.height
          });
        }
        renderPhotosPane_();
      } catch (e) {
        if (typeof showToast === 'function') showToast('error', '画像を読み込めませんでした');
      }
    });
    closePhotoModal_();
  }

  function renderPdfPane_() {
    var host = document.getElementById('ringCheckPanePdf');
    if (!host) return;
    host.innerHTML = '<h2 class="ring-check-section-title">PDF確認・作成</h2>' +
      '<div class="ring-check-form-card">' +
      '<p class="ring-check-hint">端末内でPDFを生成しダウンロードします。Googleドライブへの自動保存は行いません。</p>' +
      '<ul class="ring-check-pdf-summary"><li>用途：' + esc_(C.purposeLabel_(state.record.meta.purpose)) + '</li>' +
      '<li>要確認：' + C.countAttention_(state.record) + ' 件</li>' +
      '<li>マーク：' + state.marks.length + ' 件</li>' +
      '<li>写真：' + state.photos.length + ' 枚（セッション内）</li></ul>' +
      '<button type="button" class="ring-check-save-btn" id="ringCheckMakePdf">PDFを作成</button>' +
      '<p id="ringCheckPdfStatus" class="ring-check-muted"></p></div>';
    document.getElementById('ringCheckMakePdf').onclick = function () { runPdfCreate_(); };
  }

  async function runPdfCreate_() {
    if (state.pdfBusy) return;
    var status = document.getElementById('ringCheckPdfStatus');
    var PdfApi = typeof ringFleetCheckSheetPdf_ !== 'undefined' ? ringFleetCheckSheetPdf_ : null;
    if (!PdfApi || typeof PDFLib === 'undefined') {
      if (status) status.textContent = 'PDFライブラリを読み込めませんでした。';
      if (typeof showToast === 'function') showToast('error', 'PDFを作成できません');
      return;
    }
    syncFormFromDom_();
    state.pdfBusy = true;
    if (status) status.textContent = '作成中…';
    try {
      var v = state.vehicle;
      var result = await PdfApi.generateCheckSheetPdf_({
        core: C,
        PDFLib: PDFLib,
        record: state.record,
        marks: state.marks,
        photos: state.photos,
        vehicle: {
          displayName: typeof ringVehicleListDisplayName_ === 'function' ? ringVehicleListDisplayName_(v) : (v.nickname || v.vin),
          categoryLabel: typeof ringVehicleCategoryLabelJa_ === 'function' ? ringVehicleCategoryLabelJa_(v.vehicleCategory) : '',
          plateSuffix: v.plateSuffix,
          vin: v.vin
        }
      });
      var blob = new Blob([result.bytes], { type: 'application/pdf' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = result.fileName;
      a.click();
      URL.revokeObjectURL(a.href);
      if (status) status.textContent = 'PDFを作成しました：' + result.fileName;
      if (typeof showToast === 'function') showToast('success', 'PDFをダウンロードしました');
    } catch (e) {
      if (status) status.textContent = 'PDFの作成に失敗しました。';
      if (typeof showToast === 'function') showToast('error', 'PDFの作成に失敗しました');
    } finally {
      state.pdfBusy = false;
    }
  }

  async function saveSnapshotFlow_() {
    syncFormFromDom_();
    if (!state.record) return;
    if (!state.idbAvailable) {
      renderLocalBanner_([]);
      if (typeof showToast === 'function') showToast('error', 'この端末に保存できません。ブラウザの設定をご確認ください。');
      return;
    }
    state.record.marks = C.cloneMarks_(state.marks);
    try {
      await C.snapshotDraft_(state.record);
      await persistDraft_();
      var snaps2 = await C.idbListSnapshots_(C.shopVinKey_(profile.shopId, vin));
      renderLocalBanner_(snaps2);
      if (typeof showToast === 'function') showToast('success', '下書きを保存しました');
    } catch (e) {
      state.idbAvailable = false;
      if (typeof showToast === 'function') showToast('error', '保存に失敗しました。この端末に記録は残りません。');
      renderLocalBanner_([]);
    }
  }

  function pushUndo_(entry) {
    state.undo.push(entry);
    if (state.undo.length > 50) state.undo.shift();
  }

  function placeMarkAtClient_(region, regionG, clientX, clientY) {
    if (state.mode !== 'scratch' && state.mode !== 'dent' && state.mode !== 'other') return;
    var rect = regionG.getBoundingClientRect();
    var pt = C.relPointFromClient_(clientX, clientY, rect);
    var mark = C.newMark_(region, pt.nx, pt.ny, state.mode, '');
    state.marks.push(mark);
    pushUndo_({ action: 'add', mark: Object.assign({}, mark) });
    renderMarks_();
    renderMarkList_();
    persistDraft_();
  }

  function modeIsPlace_() {
    return state.mode === 'scratch' || state.mode === 'dent' || state.mode === 'other';
  }

  function onMarkActivate_(id) {
    if (state.mode === 'delete') {
      var idx = state.marks.findIndex(function (m) { return m.id === id; });
      if (idx >= 0) {
        var removed = state.marks.splice(idx, 1)[0];
        pushUndo_({ action: 'remove', mark: Object.assign({}, removed) });
        renderMarks_();
        renderMarkList_();
        persistDraft_();
      }
      return;
    }
    state.selectedMarkId = id;
    renderMarks_();
    openMarkDetail_(id);
  }

  function ensureWindowPointerHandlers_() {
    if (state.windowPointerBound) return;
    state.windowPointerBound = true;
    window.addEventListener('pointermove', function (ev) {
      if (state.pendingPlace && state.pendingPlace.pointerId === ev.pointerId) {
        if (C.pointerTravelPx_(state.pendingPlace.x0, state.pendingPlace.y0, ev.clientX, ev.clientY) > C.TAP_MOVE_PX) {
          state.pendingPlace.scrolled = true;
        }
      }
      if (state.pendingMarkTap && state.pendingMarkTap.pointerId === ev.pointerId) {
        if (C.pointerTravelPx_(state.pendingMarkTap.x0, state.pendingMarkTap.y0, ev.clientX, ev.clientY) > C.TAP_MOVE_PX) {
          state.pendingMarkTap.scrolled = true;
        }
      }
    }, { passive: true });
    window.addEventListener('pointerup', function (ev) {
      if (state.pendingPlace && state.pendingPlace.pointerId === ev.pointerId) {
        var p = state.pendingPlace;
        state.pendingPlace = null;
        var place = C.shouldPlaceMarkFromGesture_({
          cancelled: p.cancelled,
          scrolled: p.scrolled,
          isMarkTarget: false,
          modeIsPlace: modeIsPlace_()
        });
        if (place && p.regionG && document.body.contains(p.regionG)) {
          placeMarkAtClient_(p.region, p.regionG, ev.clientX, ev.clientY);
        }
      }
      if (state.pendingMarkTap && state.pendingMarkTap.pointerId === ev.pointerId) {
        var mt = state.pendingMarkTap;
        state.pendingMarkTap = null;
        if (!mt.cancelled && !mt.scrolled && mt.markId) onMarkActivate_(mt.markId);
      }
    });
    window.addEventListener('pointercancel', function (ev) {
      if (state.pendingPlace && state.pendingPlace.pointerId === ev.pointerId) {
        state.pendingPlace.cancelled = true;
        state.pendingPlace = null;
      }
      if (state.pendingMarkTap && state.pendingMarkTap.pointerId === ev.pointerId) {
        state.pendingMarkTap.cancelled = true;
        state.pendingMarkTap = null;
      }
    });
  }

  function bindDiagram_() {
    var host = document.getElementById('ringCheckDiagramHost');
    if (!host) return;
    ensureWindowPointerHandlers_();
    host.innerHTML = diagramSvgHtml_();
    host.querySelectorAll('.ring-check-region').forEach(function (g) {
      var region = g.getAttribute('data-region');
      g.addEventListener('pointerdown', function (ev) {
        if (ev.target.closest && ev.target.closest('.ring-check-mark')) return;
        if (state.mode === 'delete') return;
        if (!modeIsPlace_()) return;
        state.pendingPlace = {
          pointerId: ev.pointerId,
          region: region,
          regionG: g,
          x0: ev.clientX,
          y0: ev.clientY,
          cancelled: false,
          scrolled: false
        };
      });
    });
    host.addEventListener('pointerdown', function (ev) {
      var mk = ev.target.closest && ev.target.closest('.ring-check-mark');
      if (!mk) return;
      var id = mk.getAttribute('data-mark-id');
      if (!id) return;
      state.pendingMarkTap = {
        pointerId: ev.pointerId,
        markId: id,
        x0: ev.clientX,
        y0: ev.clientY,
        cancelled: false,
        scrolled: false
      };
      ev.stopPropagation();
    }, true);
    renderMarks_();
  }

  function renderMarkList_() {
    var host = document.getElementById('ringCheckMarkList');
    if (!host) return;
    if (!state.marks.length) {
      host.innerHTML = '<p class="ring-check-muted">マークはまだありません</p>';
      return;
    }
    var labels = { scratch: '傷', dent: 'へこみ', other: 'その他' };
    host.innerHTML = state.marks.map(function (m) {
      return '<button type="button" class="ring-check-mark-row" data-mark-row="' + esc_(m.id) + '">' +
        '<span class="ring-check-mark-sym">' + esc_(C.markSymbol_(m.type)) + '</span>' +
        '<span>' + esc_(labels[m.type] || m.type) + ' · ' + esc_(m.region) +
        (m.memo ? ' — ' + esc_(m.memo) : '') + '</span></button>';
    }).join('');
    host.querySelectorAll('[data-mark-row]').forEach(function (btn) {
      btn.onclick = function () {
        openMarkDetail_(btn.getAttribute('data-mark-row'));
      };
    });
  }

  function markById_(markId) {
    return C.findMarkInList_(state.marks, markId);
  }

  function syncTypePickActive_(wrap, mark) {
    if (!wrap || !mark) return;
    wrap.querySelectorAll('[data-type-pick]').forEach(function (b) {
      b.classList.toggle('is-active', b.getAttribute('data-type-pick') === mark.type);
    });
  }

  function closeMarkDetail_() {
    state.detailMarkId = '';
    var wrap = document.getElementById('ringCheckDetail');
    if (wrap) wrap.hidden = true;
  }

  function openMarkDetail_(id, opts) {
    opts = opts || {};
    id = String(id || '').trim();
    if (!id) return;
    var m = markById_(id);
    if (!m) {
      closeMarkDetail_();
      return;
    }
    state.detailMarkId = id;
    var wrap = document.getElementById('ringCheckDetail');
    if (!wrap) return;
    wrap.hidden = false;
    var labels = { scratch: '傷', dent: 'へこみ', other: 'その他' };
    var memoVal = m.memo;
    if (opts.preserveMemo !== undefined) memoVal = opts.preserveMemo;
    else if (opts.initialMemo !== undefined) memoVal = opts.initialMemo;
    wrap.innerHTML = '<h3>マーク詳細</h3>' +
      '<p><strong>部位：</strong>' + esc_(m.region) + '</p>' +
      '<p class="ring-check-field-label">種別</p>' +
      '<div class="ring-check-type-pick" id="ringCheckTypePick">' +
      ['scratch', 'dent', 'other'].map(function (t) {
        var active = m.type === t ? ' is-active' : '';
        return '<button type="button" class="ring-check-type-btn' + active + '" data-type-pick="' + t + '">' +
          esc_(C.markSymbol_(t)) + ' ' + esc_(labels[t]) + '</button>';
      }).join('') +
      '</div>' +
      '<label class="ring-check-field">メモ<textarea id="ringCheckMemo" rows="3">' + esc_(memoVal) + '</textarea></label>' +
      '<div class="ring-check-detail-actions">' +
      '<button type="button" class="primary" id="ringCheckMemoSave">反映して閉じる</button>' +
      '<button type="button" id="ringCheckMarkDel">このマークを削除</button>' +
      '<button type="button" id="ringCheckDetailClose">閉じる</button></div>';
    wrap.setAttribute('data-detail-mark-id', id);
    wrap.querySelectorAll('[data-type-pick]').forEach(function (btn) {
      btn.onclick = function () {
        var newType = btn.getAttribute('data-type-pick');
        var cur = markById_(id);
        if (!cur || !newType || cur.type === newType) return;
        pushUndo_({
          action: 'change_type',
          markId: id,
          prevType: cur.type,
          nextType: newType
        });
        C.setMarkType_(cur, newType);
        syncTypePickActive_(wrap, cur);
        renderMarks_();
        renderMarkList_();
        persistDraft_();
      };
    });
    document.getElementById('ringCheckMemoSave').onclick = function () {
      var cur = markById_(id);
      if (!cur) {
        closeMarkDetail_();
        return;
      }
      var memo = String(document.getElementById('ringCheckMemo').value || '');
      C.applyMarkEditsById_(state.marks, id, { memo: memo });
      renderMarkList_();
      persistDraft_();
      closeMarkDetail_();
    };
    document.getElementById('ringCheckMarkDel').onclick = function () {
      var cur = markById_(id);
      if (!cur) {
        closeMarkDetail_();
        return;
      }
      state.marks = state.marks.filter(function (x) { return x.id !== id; });
      pushUndo_({ action: 'remove', mark: Object.assign({}, cur) });
      renderMarks_();
      renderMarkList_();
      persistDraft_();
      closeMarkDetail_();
    };
    document.getElementById('ringCheckDetailClose').onclick = function () { closeMarkDetail_(); };
  }

  function setMode_(mode) {
    state.mode = mode;
    document.querySelectorAll('[data-check-mode]').forEach(function (btn) {
      btn.classList.toggle('is-active', btn.getAttribute('data-check-mode') === mode);
    });
  }

  function renderHeader_() {
    var v = state.vehicle;
    var host = document.getElementById('ringCheckHeader');
    if (!host || !v) return;
    var name = typeof ringVehicleListDisplayName_ === 'function' ? ringVehicleListDisplayName_(v) : (v.nickname || v.vin);
    var cat = typeof ringVehicleCategoryLabelJa_ === 'function' ? ringVehicleCategoryLabelJa_(v.vehicleCategory) : '';
    host.innerHTML = '<h1 class="ring-check-title">車両チェックシート</h1>' +
      '<div class="ring-check-vehicle-card">' +
      '<p class="ring-check-veh-name">' + esc_(name) + ' <span class="cat-pill">' + esc_(cat) + '</span></p>' +
      '<p class="ring-check-meta">ナンバー：' + esc_(typeof ringFormatFleetPlateDisplay_ === 'function'
        ? (ringFormatFleetPlateDisplay_(v) || '未登録') : (v.plateSuffix || '未登録')) + '</p>' +
      '<p class="ring-check-meta">VIN：' + esc_(v.vin) + '</p></div>';
  }

  function idbWarnHtml_() {
    if (state.idbAvailable) return '';
    return '<div class="ring-check-warn ring-check-idb-warn" id="ringCheckIdbWarn" role="alert">' +
      'この端末に記録を保存できません。ブラウザの設定やプライベートモードをご確認ください。</div>';
  }

  function renderLocalBanner_(snapshots) {
    var host = document.getElementById('ringCheckLocalBanner');
    if (!host) return;
    var latest = snapshots && snapshots.length ? snapshots[0] : null;
    var txt = 'この端末にのみ保存されます。他端末とは共有されません。';
    if (state.idbAvailable && latest) {
      txt += ' 保存記録：' + String(latest.savedAt || '').slice(0, 19).replace('T', ' ') + '（' + (latest.marks || []).length + '件）';
    }
    host.innerHTML = idbWarnHtml_() +
      '<div class="ring-check-banner-normal"><p>' + esc_(txt) + '</p>' +
      (state.idbAvailable && latest
        ? '<button type="button" class="ring-check-link-btn" id="ringCheckResumeBtn">前回記録を引き継いで編集（コピー）</button>'
        : '') +
      '</div>';
    var btn = document.getElementById('ringCheckResumeBtn');
    if (btn) {
      btn.onclick = function () {
        if (!latest || !state.idbAvailable) return;
        var ok = confirm('前回の保存記録をコピーして編集します。元の保存記録は変更されません。よろしいですか？');
        if (!ok) return;
        state.record = C.copyRecordForEdit_(latest, profile.shopId, vin);
        state.marks = C.cloneMarks_(latest.marks);
        state.undo = [];
        renderBasicPane_();
        renderInspectionPane_();
        renderTiresPane_();
        renderPdfPane_();
        renderAttention_();
        renderMarks_();
        renderMarkList_();
        persistDraft_().then(function () {
          return C.idbListSnapshots_(C.shopVinKey_(profile.shopId, vin));
        }).then(function (fresh) {
          renderLocalBanner_(fresh || snapshots);
        });
      };
    }
  }

  async function initPage_() {
    if (!profile || !vin) {
      location.replace('login.html');
      return;
    }
    if (typeof ringBootAuthForMode === 'function') {
      var userRole = profile.shopType || profile.role;
      var boot = ringBootAuthForMode(userRole === 'dealer' ? 'business' : 'shop');
      if (!boot.ok) { location.replace(boot.redirect || 'login.html'); return; }
    }
    state.vehicle = findVehicle_();
    if (!state.vehicle) {
      document.getElementById('ringCheckMain').innerHTML = '<p class="empty-msg">この店舗の車両が見つかりません。</p>';
      return;
    }
    renderHeader_();
    var active = null;
    var snaps = [];
    try {
      active = await C.loadActiveDraft_(profile.shopId, vin);
      snaps = await C.idbListSnapshots_(C.shopVinKey_(profile.shopId, vin));
      state.idbAvailable = true;
    } catch (e) {
      state.idbAvailable = false;
    }
    if (active) {
      state.record = C.normalizeRecord_(active);
      state.marks = C.cloneMarks_(active.marks || []);
    } else {
      state.record = C.copyRecordForEdit_(null, profile.shopId, vin);
      state.marks = [];
    }
    renderLocalBanner_(snaps);
    renderPhotoWarn_();
    renderBasicPane_();
    renderInspectionPane_();
    renderTiresPane_();
    renderPhotosPane_();
    renderPdfPane_();
    renderAttention_();
    bindPhotoInput_();
    closePhotoModal_();
    setStep_('basic');
    bindDiagram_();
    renderMarks_();
    renderMarkList_();
    setMode_('scratch');

    document.querySelectorAll('#ringCheckSteps [data-step]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (state.step !== 'diagram') syncFormFromDom_();
        setStep_(btn.getAttribute('data-step'));
        if (btn.getAttribute('data-step') === 'pdf') renderPdfPane_();
      });
    });

    window.addEventListener('beforeunload', function (ev) {
      if (!state.photos.length) return;
      ev.preventDefault();
      ev.returnValue = '写真はセッション内のみです。離脱すると失われます。';
    });

    document.getElementById('ringCheckBack').onclick = function () {
      if (document.referrer && document.referrer.indexOf('rental_fleet') >= 0) {
        history.back();
      } else {
        location.href = 'rental_fleet.html';
      }
    };

    document.querySelectorAll('[data-check-mode]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        setMode_(btn.getAttribute('data-check-mode'));
      });
    });

    document.getElementById('ringCheckUndo').onclick = function () {
      var entry = state.undo.pop();
      if (!entry) return;
      var detailId = state.detailMarkId;
      var wrap = document.getElementById('ringCheckDetail');
      var detailOpen = !!(detailId && wrap && !wrap.hidden);
      var preserveMemo;
      if (detailOpen) {
        var ta = document.getElementById('ringCheckMemo');
        if (ta) preserveMemo = ta.value;
      }
      state.marks = C.applyUndo_(state.marks, entry);
      renderMarks_();
      renderMarkList_();
      persistDraft_();
      if (detailOpen && detailId && markById_(detailId)) {
        openMarkDetail_(detailId, { preserveMemo: preserveMemo });
      } else if (detailOpen) {
        closeMarkDetail_();
      }
    };

    var saveSnapBtn = document.getElementById('ringCheckSaveSnap');
    if (saveSnapBtn) saveSnapBtn.onclick = function () { return saveSnapshotFlow_(); };
  }

  window.addEventListener('DOMContentLoaded', initPage_);
})();
