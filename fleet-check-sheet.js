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
  var STATUS_LABELS = { good: '良好', check: '要確認', unconfirmed: '未確認', na: '対象外' };
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

  // Keep the original sixteen items and twenty tire results; this is only a UI grouping.
  var PRACTICAL_GROUPS = [
    {title:'安全・走行',items:[
      {id:'brake',label:'ブレーキ',refs:['cabin.brake_pedal']},
      {id:'parking',label:'駐車ブレーキ',refs:['cabin.parking_brake']},
      {id:'seatbelt',label:'シートベルト',refs:['rental.seatbelt']},
      {id:'warning',label:'警告灯',refs:['cabin.warning_lamps']},
      {id:'engine_start',label:'エンジン始動・異音',refs:['rental.engine_start']}]},
    {title:'灯火類',items:[{id:'lights',label:'灯火類',refs:['exterior.headlight','exterior.turn_signal','exterior.brake_lamp','exterior.tail_lamp']}]},
    {title:'視界・操作',items:[
      {id:'wiper',label:'ワイパーの作動',refs:['rental.wiper']},
      {id:'washer',label:'ウォッシャーの作動',refs:['rental.washer']},
      {id:'mirrors',label:'ミラー',refs:['cabin.mirrors']},
      {id:'horn',label:'ホーン',refs:['cabin.horn']}]},
    {title:'エンジンルーム',items:INSPECTION_SECTIONS[0].items.map(function(it){return {id:it.key,label:it.label,refs:['engine.'+it.key]};})},
    {title:'車内・装備',items:[
      {id:'aircon',label:'エアコンの効き',refs:['rental.aircon'],optional:true},
      {id:'etc',label:'ETC車載器の作動確認',refs:['rental.etc'],optional:true},
      {id:'navigation',label:'カーナビの作動',refs:['rental.navigation'],optional:true},
      {id:'recorder',label:'ドライブレコーダーの作動',refs:['rental.recorder'],optional:true},
      {id:'cabin_light',label:'室内灯',refs:['rental.cabin_light'],optional:true}]},
    {title:'室内状態',items:[
      {id:'cleaning',label:'清掃状態',refs:['rental.cleaning']},
      {id:'smell',label:'におい',refs:['rental.smell']},
      {id:'interior_damage',label:'汚れ・破れ・傷の有無',refs:['rental.interior_damage']}]}
  ];
  var OPTION_FIELDS = [
    {id:'child_seat',label:'チャイルドシート'},{id:'junior_seat',label:'ジュニアシート'},
    {id:'etc_card',label:'ETCカード'},{id:'winter_tires',label:'スタッドレスタイヤ'},
    {id:'chains',label:'タイヤチェーン'},{id:'other',label:'その他貸出備品'}
  ];
  var GUIDANCE_FIELDS = [
    {id:'fuel',label:'燃料の返却条件'},{id:'contact',label:'事故・故障時の連絡方法'},
    {id:'insurance',label:'保険・免責・NOCなどの確認'},{id:'conditions',label:'禁煙・ペット等の利用条件'},
    {id:'return_time',label:'返却時間・延長手続き'},{id:'condition',label:'車両状態と貸出備品の確認'}
  ];
  var INTERIOR_REGIONS = ['dashboard','driver_seat','passenger_seat','rear_seat','cargo'];
  var INTERIOR_TYPES = {stain:'△',tear:'#',scuff:'○'};
  var PRESSURE_UNITS = ['kPa','bar','kgf/cm²','psi'];
  function normalizePractical_(r) {
    var sections=r.inspection.sections;
    if(!sections.rental)sections.rental={sectionMemo:'',items:{}};
    var items=sections.rental.items;
    PRACTICAL_GROUPS.forEach(function(g){g.items.forEach(function(it){it.refs.forEach(function(ref){
      var bits=ref.split('.');
      if(bits[0]==='rental'&&!items[bits[1]]) {
        var old=(bits[1]==='wiper'||bits[1]==='washer')&&sections.exterior.items.wiper_washer;
        items[bits[1]]=old?JSON.parse(JSON.stringify(old)):defaultItemState_();
      }
    });});});
    if(!Array.isArray(r.interiorMarks))r.interiorMarks=[];
    if(!r.rentalOptions)r.rentalOptions={};
    OPTION_FIELDS.forEach(function(o){if(!r.rentalOptions[o.id])r.rentalOptions[o.id]={issued:false,returned:false,note:''};});
    if(!r.customerGuidance)r.customerGuidance={};
    GUIDANCE_FIELDS.forEach(function(g){if(r.customerGuidance[g.id]==null)r.customerGuidance[g.id]='';});
    if(r.customerExplained==null)r.customerExplained=false;
    return r;
  }
  function practicalItems_(){return PRACTICAL_GROUPS.reduce(function(out,g){return out.concat(g.items);},[]);}
  function tireRefs_(){var refs=[];TIRE_WHEELS.forEach(function(w){TIRE_CHECKS.forEach(function(t){refs.push('tire.'+w+'.'+t.key);});});return refs;}
  function itemAt_(r,ref){var a=ref.split('.');return a[0]==='tire'?r.inspection.tires[a[1]].items[a[2]]:r.inspection.sections[a[0]].items[a[1]];}
  function groupedStatus_(r,refs){
    var st=refs.map(function(ref){return itemAt_(r,ref).status;});
    if(st.indexOf('check')>=0)return 'check';
    if(st.every(function(x){return x==='na';}))return 'na';
    return st.every(function(x){return x==='good'||x==='na';})?'good':'unconfirmed';
  }
  function toggleGood_(r,refs,good) {
    if(groupedStatus_(r,refs)==='check')return false;
    refs.forEach(function(ref){var it=itemAt_(r,ref);if(it.status!=='na')it.status=good?'good':'unconfirmed';});
    return true;
  }
  function practicalWarnings_(r) {
    var result={check:0,unconfirmed:0};
    practicalItems_().concat([{refs:tireRefs_()}]).forEach(function(it){var st=groupedStatus_(r,it.refs);if(st==='check'||st==='unconfirmed')result[st]++;});
    if(r.inspection.sections.exterior.items.body_look.status==='check')result.check++;
    result.interiorMarks=(r.interiorMarks||[]).length;
    return result;
  }
  function newInteriorMark_(region,nx,ny,type,memo){
    return {id:newMarkId_(),region:region,nx:clamp01_(nx),ny:clamp01_(ny),type:INTERIOR_TYPES[type]?type:'stain',memo:String(memo||'')};
  }
  function interiorSvgMarkup_(){
    return '<svg class="ring-check-diagram" viewBox="0 0 420 560" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="室内配置図。上が前。一般的な乗用車の配置です。">' +
      '<defs><style>.ir{fill:#f3f7fb;stroke:#53677d;stroke-width:2.2;stroke-linejoin:round}.il{font:700 15px sans-serif;fill:#304c67;pointer-events:none}.ig{fill:#ddeaf2;stroke:#829aae;stroke-width:1.5}</style></defs>' +
      '<path d="M210 12l-8 12h16z" fill="#18344e"/><text class="il" x="210" y="46" text-anchor="middle">前</text>' +
      '<path d="M112 66Q210 40 308 66Q342 96 342 158V458Q338 511 300 526H120Q82 511 78 458V158Q78 96 112 66Z" fill="none" stroke="#bcc9d5" stroke-width="2"/>' +
      '<g data-region="dashboard"><path class="ir" d="M111 82Q210 58 309 82L322 137Q210 121 98 137Z"/><circle class="ig" cx="276" cy="113" r="22"/></g>' +
      '<text class="il" x="192" y="106" text-anchor="middle">ダッシュボード</text>' +
      '<g data-region="passenger_seat"><path class="ir" d="M106 165Q148 152 190 165L198 252Q148 268 98 252Z"/><path class="ig" d="M118 172H178L172 212H124Z"/><path class="ig" d="M124 220H172L168 252H128Z"/><rect class="ig" x="132" y="242" width="40" height="20" rx="8"/></g>' +
      '<text class="il" x="148" y="272" text-anchor="middle">助手席</text>' +
      '<g data-region="driver_seat"><path class="ir" d="M230 165Q272 152 314 165L322 252Q272 268 222 252Z"/><path class="ig" d="M242 172H302L296 212H248Z"/><path class="ig" d="M248 220H296L292 252H252Z"/><rect class="ig" x="256" y="242" width="40" height="20" rx="8"/></g>' +
      '<text class="il" x="274" y="272" text-anchor="middle">運転席</text>' +
      '<g data-region="rear_seat"><rect class="ir" x="108" y="322" width="204" height="90" rx="17"/><path class="ig" d="M119 334H301V356H119Z"/></g>' +
      '<text class="il" x="210" y="387" text-anchor="middle">後部座席</text>' +
      '<g data-region="cargo"><path class="ir" d="M107 436H313L306 494Q210 519 114 494Z"/></g>' +
      '<text class="il" x="210" y="475" text-anchor="middle">荷室</text>' +
      '<text x="210" y="551" text-anchor="middle" font-size="11" fill="#526272">一般的な配置（座席数・左右配置は実車を確認）</text>' +
      '<g id="ringCheckMarksLayerPdf"></g></svg>';
  }

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
    normalizePractical_(record);
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
            if (pu.status && (CHECK_STATUS.indexOf(pu.status) >= 0 || (sid === 'rental' && pu.status === 'na'))) cur.status = pu.status;
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
      interiorMarks: cloneMarks_(source && source.interiorMarks),
      rentalOptions: source && source.rentalOptions ? JSON.parse(JSON.stringify(source.rentalOptions)) : {},
      customerGuidance: source && source.customerGuidance ? JSON.parse(JSON.stringify(source.customerGuidance)) : {},
      customerExplained: !!(source && source.customerExplained),
      draftOwnerUserId: source && source.draftOwnerUserId || '',
      localOnly: true
    };
    return normalizeRecord_(copy);
  }

  function latestMarkSource_(snapshots, shopId, vin, userId) {
    var key = shopVinKey_(shopId, vin);
    vin = String(vin || '').trim().toUpperCase();
    userId = String(userId || '');
    return (Array.isArray(snapshots) ? snapshots : []).find(function (s) {
      if (!s || s.kind !== 'snapshot') return false;
      if (s.shopVin && s.shopVin !== key) return false;
      if (s.vin && String(s.vin).trim().toUpperCase() !== vin) return false;
      if (s.shopId && String(s.shopId).trim() !== String(shopId || '').trim()) return false;
      if (s.draftOwnerUserId && s.draftOwnerUserId !== userId) return false;
      return true;
    }) || null;
  }

  function freshActiveRecord_(shopId, vin, userId, markBundle) {
    markBundle = markBundle || {};
    var rec = {
      id: storageId_(shopId, vin, 'active'),
      shopVin: shopVinKey_(shopId, vin),
      shopId: shopId,
      vin: String(vin || '').trim().toUpperCase(),
      kind: 'active',
      schemaVersion: SCHEMA,
      recordId: newRecordId_(),
      parentId: null,
      savedAt: new Date().toISOString(),
      marks: cloneMarks_(markBundle.marks),
      interiorMarks: cloneMarks_(markBundle.interiorMarks),
      meta: defaultMeta_(),
      inspection: defaultInspectionForm_(),
      rentalOptions: {},
      customerGuidance: {},
      customerExplained: false,
      draftOwnerUserId: String(userId || ''),
      localOnly: true
    };
    return normalizeRecord_(rec);
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

  function idbPutRecords_(records) {
    return openDb_().then(function (db) {
      try {
        return new Promise(function (resolve, reject) {
          var tx = db.transaction(STORE, 'readwrite');
          var error;
          tx.oncomplete = function () { resolve(); };
          tx.onabort = function () { reject(error || tx.error || new Error('IndexedDB write aborted')); };
          try {
            var store = tx.objectStore(STORE);
            records.forEach(function (record) { store.put(record); });
          } catch (e) {
            error = e;
            tx.abort();
          }
        });
      } finally {
        db.close();
      }
    });
  }

  function idbPut_(record) {
    return idbPutRecords_([record]).then(function () { return record; });
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

  function makeSnapshot_(record) {
    normalizeRecord_(record);
    var rid = record.recordId || newRecordId_();
    return Object.assign({}, record, {
      id: storageId_(record.shopId, record.vin, 'snapshot::' + rid + '::' + Date.now()),
      kind: 'snapshot',
      recordId: rid,
      parentId: record.parentId || null,
      savedAt: new Date().toISOString()
    });
  }

  function snapshotDraft_(record) {
    return idbPut_(makeSnapshot_(record));
  }

  function saveSnapshotAndNextDraft_(record, nextDraft) {
    var snap = makeSnapshot_(record);
    return idbPutRecords_([snap, nextDraft]).then(function () { return snap; });
  }

  /**
   * 9 個の既存 region / nx / ny を維持した上面展開図。保存キーや記録は変換しない。
   * ラベルはヒット領域の外に置き、画面と PDF で同じ getBBox による相対座標を使う。
   */
  function diagramSvgMarkup_() {
    var svg = '<svg class="ring-check-diagram" viewBox="0 0 420 560" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="車両展開図。上が前、下が後。車体の外周に左前・右前・左後・右後タイヤ。">' +
      '<defs><style>' +
      '.rg{fill:#f4f7fb;stroke:#53677d;stroke-width:2.2;stroke-linejoin:round}' +
      '.glass{fill:#dceaf3;stroke:#829aae;stroke-width:1.5}' +
      '.seam{fill:none;stroke:#95a5b6;stroke-width:1.4;stroke-linecap:round}' +
      '.rl{font:700 12px sans-serif;fill:#415970;pointer-events:none}' +
      '.direction{font:700 13px sans-serif;fill:#18344e;pointer-events:none}' +
      '.tw{fill:#dde4ec;stroke:#425469;stroke-width:2.6}' +
      '.wh{fill:#edf2f7;stroke:#7d94a8;stroke-width:1.6}' +
      '</style></defs>' +
      '<path d="M210 18l-7 10h14z" fill="#18344e" pointer-events="none"/><text class="direction" x="210" y="44" text-anchor="middle">前</text>' +
      '<g data-region="bumper_front"><path class="rg" d="M142 61Q210 47 278 61L289 82Q210 96 131 82Z"/>' +
      '<path class="seam" d="M153 77Q210 84 267 77"/></g>' +
      '<text class="rl" x="210" y="72" text-anchor="middle">前バンパー</text>' +
      '<g data-region="body_top">' +
      '<path class="rg" d="M161 105Q210 94 259 105Q278 121 282 160L288 235V375Q286 423 269 446Q210 462 151 446Q134 423 132 375V235L138 160Q142 121 161 105Z"/>' +
      '<path class="seam" d="M151 126Q210 110 269 126M143 192Q210 178 277 192"/>' +
      '<path class="glass" d="M146 203Q210 188 274 203L261 244Q210 234 159 244Z"/>' +
      '<path class="rg" d="M159 252Q210 242 261 252V344Q210 353 159 344Z"/>' +
      '<path class="glass" d="M159 355Q210 365 261 355L273 385Q210 400 147 385Z"/>' +
      '<path class="seam" d="M148 411Q210 423 272 411M139 229L146 350M281 229L274 350"/>' +
      '<path d="M147 116l22-5-3 12-24 8zM273 116l-22-5 3 12 24 8z" fill="#deebf2" stroke="#829aae"/>' +
      '</g>' +
      '<text class="rl" x="210" y="161" text-anchor="middle">ボンネット</text>' +
      '<text class="rl" x="210" y="302" text-anchor="middle">ルーフ</text>' +
      '<text class="rl" x="210" y="438" text-anchor="middle">後部上面</text>' +
      '<g data-region="side_left"><path class="rg" d="M74 148Q47 157 36 186L22 242V345Q28 390 65 414L84 402V168Z"/>' +
      '<path class="glass" d="M69 193L49 226 39 265H69ZM39 280H69V351L46 340Z"/>' +
      '<path class="seam" d="M25 273H83M75 240v16M75 299v16"/></g>' +
      '<text class="rl" transform="rotate(-90 14 286)" x="14" y="286" text-anchor="middle">左側面</text>' +
      '<g data-region="side_right"><path class="rg" d="M346 148Q373 157 384 186L398 242V345Q392 390 355 414L336 402V168Z"/>' +
      '<path class="glass" d="M351 193L371 226 381 265H351ZM381 280H351V351L374 340Z"/>' +
      '<path class="seam" d="M395 273H337M345 240v16M345 299v16"/></g>' +
      '<text class="rl" transform="rotate(90 406 286)" x="406" y="286" text-anchor="middle">右側面</text>' +
      '<g data-region="bumper_rear"><path class="rg" d="M139 470Q210 485 281 470L285 493Q210 512 135 493Z"/>' +
      '<path class="seam" d="M154 494Q210 505 266 494"/></g>' +
      '<text class="rl" x="210" y="493" text-anchor="middle">後バンパー</text>' +
      '<text class="direction" x="210" y="540" text-anchor="middle">後</text>';
    // Four independent targets around the body; unchanged region names preserve legacy records.
    [{id:'FL',cx:100,cy:176,label:'左前'}, {id:'FR',cx:320,cy:176,label:'右前'},
     {id:'RL',cx:100,cy:360,label:'左後'}, {id:'RR',cx:320,cy:360,label:'右後'}].forEach(function (t) {
      var or = 26, ir = 13;
      svg += '<g data-region="tire_' + t.id + '">' +
        '<circle class="tw" cx="' + t.cx + '" cy="' + t.cy + '" r="' + or + '"/>' +
        '<circle class="wh" cx="' + t.cx + '" cy="' + t.cy + '" r="' + ir + '"/></g>' +
        '<text class="rl" x="' + t.cx + '" y="' + (t.cy - or - 8) + '" text-anchor="middle">' + t.label + '</text>';
    });
    return svg + '<g id="ringCheckMarksLayerPdf"></g></svg>';
  }

  function markPointOnSvg_(svg, mark) {
    if (!svg || !mark || REGIONS.concat(INTERIOR_REGIONS).indexOf(mark.region) < 0) return null;
    var g = svg.querySelector('[data-region="' + mark.region + '"]');
    if (!g) return null;
    var box = g.getBBox();
    return {x:box.x + box.width * mark.nx, y:box.y + box.height * mark.ny};
  }

  return {
    PRACTICAL_GROUPS: PRACTICAL_GROUPS, practicalItems_: practicalItems_, tireRefs_: tireRefs_, itemAt_: itemAt_, groupedStatus_: groupedStatus_, toggleGood_: toggleGood_, practicalWarnings_: practicalWarnings_,
    OPTION_FIELDS: OPTION_FIELDS, GUIDANCE_FIELDS: GUIDANCE_FIELDS, PRESSURE_UNITS: PRESSURE_UNITS,
    INTERIOR_REGIONS: INTERIOR_REGIONS, INTERIOR_TYPES: INTERIOR_TYPES, newInteriorMark_: newInteriorMark_, interiorSvgMarkup_: interiorSvgMarkup_,
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
    latestMarkSource_: latestMarkSource_,
    freshActiveRecord_: freshActiveRecord_,
    loadActiveDraft_: loadActiveDraft_,
    saveActiveDraft_: saveActiveDraft_,
    snapshotDraft_: snapshotDraft_,
    saveSnapshotAndNextDraft_: saveSnapshotAndNextDraft_,
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
    markPointOnSvg_: markPointOnSvg_,
    diagramSvgMarkup_: diagramSvgMarkup_
  };
});

/* === 画面（ブラウザのみ） === */
(function () {
  if (typeof document === 'undefined' || window.__ringAppLoadFailed) return;
  var C = typeof ringFleetCheckSheetCore_ !== 'undefined' ? ringFleetCheckSheetCore_ : null;
  if (!C) return;

  var profile = typeof getCurrentProfile === 'function' ? getCurrentProfile() : null;
  var params = new URLSearchParams(location.search);
  var vin = String(params.get('vin') || '').trim().toUpperCase();
  var state = {
    mode: 'scratch',
    marks: [],
    undo: [],
    interiorMarks: [], interiorUndo: [], diagramKind: 'exterior', openChecks: {},
    record: null,
    vehicle: null,
    selectedMarkId: '',
    idbAvailable: true,
    pendingPlace: null,
    pendingMarkTap: null,
    windowPointerBound: false,
    detailMarkId: '',
    step: 'inspect',
    photos: [],
    photosSessionOnly: true,
    pdfBusy: false,
    saveBackBusy: false,
    snapshotBusy: false,
    draftWrites: new Set(),
    uiLock: null,
    shellBound: false,
    editorBound: false
  };

  function esc_(s) {
    if (!s) return '';
    return String(s).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]);
    });
  }

  function findVehicle_() {
    var list = typeof ringLoadMyVehicles_ === 'function' ? ringLoadMyVehicles_(profile) : [];
    var result = ringFindFleetVehicleByVin_(list, vin, profile);
    state.vehicleError = result.error;
    return result.vehicle;
  }


  function activeMarks_(){return state.diagramKind==='interior'?state.interiorMarks:state.marks;}
  function setActiveMarks_(marks){if(state.diagramKind==='interior')state.interiorMarks=marks;else state.marks=marks;}
  function activeUndo_(){return state.diagramKind==='interior'?state.interiorUndo:state.undo;}
  function currentSymbol_(type){return state.diagramKind==='interior'?C.INTERIOR_TYPES[type]:C.markSymbol_(type);}
  function setDiagramKind_(kind){
    if(!checkContext_())return;
    state.diagramKind=kind==='interior'?'interior':'exterior';state.selectedMarkId='';state.detailMarkId='';state.pendingPlace=null;state.pendingMarkTap=null;
    var interior=state.diagramKind==='interior',labels=interior?[['stain','△','汚れ'],['tear','#','破れ'],['scuff','○','傷']]:[['scratch','●','傷'],['dent','×','へこみ'],['other','□','その他']];
    var buttons=document.querySelectorAll('#ringCheckMarkToolbar [data-check-mode]');
    labels.forEach(function(x,i){buttons[i].setAttribute('data-check-mode',x[0]);buttons[i].innerHTML='<span aria-hidden="true">'+x[1]+'</span> '+x[2];});
    document.querySelectorAll('[data-diagram-kind]').forEach(function(b){b.classList.toggle('is-active',b.dataset.diagramKind===state.diagramKind);b.setAttribute('aria-pressed',String(b.dataset.diagramKind===state.diagramKind));});
    bindDiagram_();setMode_(interior?'stain':'scratch');
  }
  var pageContext = null;
  function checkContext_(){
    if(!pageContext||ringRequestContextIsCurrent_(pageContext))return true;
    closePhotoModal_();revokePhotoUrls_(state.photos);state.photos=[];state.marks=[];state.interiorMarks=[];state.record=null;
    var layout=document.querySelector('.ring-check-layout');if(layout)layout.innerHTML='<p role="alert">利用者が変更されました。現在のアカウントで開き直してください。</p><a href="rental_fleet.html">レンタカー管理へ</a>';
    return false;
  }
  function checkContextOrWarn_(actionLabel){
    if(checkContext_())return true;
    if(typeof showToast==='function')showToast('warning','アカウントまたは店舗が変わったため、'+(actionLabel||'操作')+'できません。ページを開き直してください。');
    return false;
  }
  function uiLockHint_(){
    if(state.uiLock==='legacy')return '旧下書きを引き継ぐまで、外装・点検の編集はできません。「戻る」は利用できます。';
    if(state.uiLock==='other_user')return '別の利用者の下書きのため編集できません。「戻る」でレンタカー管理へ戻れます。';
    return '現在は編集できません。';
  }
  function goBackToFleet_(){
    if(document.referrer&&document.referrer.indexOf('rental_fleet')>=0)history.back();
    else location.href='rental_fleet.html';
  }
  function applyUiLock_(lock){
    state.uiLock=lock||null;
    var locked=!!lock;
    document.querySelectorAll('#ringCheckSteps [data-step], .ring-check-diagram-tabs [data-diagram-kind]').forEach(function(el){
      el.disabled=locked;
      el.setAttribute('aria-disabled',locked?'true':'false');
      el.classList.toggle('is-locked',locked);
    });
    var tb=document.getElementById('ringCheckMarkToolbar');
    if(tb){tb.hidden=locked||state.step!=='exterior';tb.classList.toggle('is-visible',!locked&&state.step==='exterior');}
    document.body.classList.toggle('ring-check-ui-locked',locked);
    if (locked) {
      document.querySelectorAll('[data-pane]').forEach(function (pane) { pane.classList.remove('is-active'); });
      document.querySelectorAll('#ringCheckSteps [data-step]').forEach(function (btn) { btn.classList.remove('is-active'); });
    }
  }
  function hideGuardHost_(){
    var host=document.getElementById('ringCheckGuardHost');
    if(host){host.hidden=true;host.innerHTML='';}
  }
  function bindShellNavigationOnce_(){
    if(state.shellBound)return;
    state.shellBound=true;
    var back=document.getElementById('ringCheckBack');
    if(back)back.addEventListener('click',goBackToFleet_);
    document.querySelectorAll('#ringCheckSteps [data-step]').forEach(function(btn){
      btn.addEventListener('click',function(){
        if(state.uiLock){
          if(typeof showToast==='function')showToast('info',uiLockHint_());
          return;
        }
        if(state.step==='inspect')syncFormFromDom_();
        setStep_(btn.getAttribute('data-step'));
        if(normalizeStep_(btn.getAttribute('data-step'))==='exterior')renderPdfPane_();
      });
    });
    document.querySelectorAll('[data-diagram-kind]').forEach(function(b){
      b.addEventListener('click',function(){
        if(state.uiLock){
          if(typeof showToast==='function')showToast('info',uiLockHint_());
          return;
        }
        setDiagramKind_(b.dataset.diagramKind);
      });
    });
    setStep_('inspect');
  }
  function showEditorLockPlaceholder_(){
    var dh=document.getElementById('ringCheckDiagramHost');
    if(dh)dh.innerHTML='<p class="ring-check-guard-placeholder">編集を開始する前に、画面の案内に従ってください。</p>';
    ['ringCheckPaneBasic','ringCheckPaneInspection','ringCheckPaneTires','ringCheckPaneExtras','ringCheckPanePhotos','ringCheckPanePdf'].forEach(function(id){
      var el=document.getElementById(id);if(el)el.innerHTML='';
    });
  }
  function showLegacyDraftGate_(currentUser){
    applyUiLock_('legacy');
    showEditorLockPlaceholder_();
    var host=document.getElementById('ringCheckGuardHost');
    if(!host)return;
    host.hidden=false;
    host.innerHTML='<p role="alert">この店舗・車両の旧下書きには作成者情報がありません。内容を引き継ぐ権限がある場合だけ開いてください。旧記録は保持されています。</p>'+
      '<button type="button" class="ring-check-secondary-btn" id="ringCheckAdoptLegacy">旧下書きを引き継いで開く</button>'+
      '<p class="ring-check-guard-hint">'+esc_(uiLockHint_())+'</p>';
    var adopt=host.querySelector('#ringCheckAdoptLegacy');
    if(!adopt)return;
    adopt.onclick=async function(){
      if(!checkContextOrWarn_('旧下書きの引き継ぎ'))return;
      if(typeof confirm!=='function'||!confirm('この店舗・車両の旧下書きを引き継いで編集しますか？過去の保存記録は変更しません。'))return;
      adopt.disabled=true;
      try{
        var latest=await C.loadActiveDraft_(profile.shopId,vin);
        if(!checkContextOrWarn_('旧下書きの引き継ぎ')){adopt.disabled=false;return;}
        if(latest&&latest.draftOwnerUserId&&latest.draftOwnerUserId!==currentUser){
          if(typeof showToast==='function')showToast('warning','別の利用者が先に引き継いだ下書きがあります。画面を開き直してください。');
          adopt.disabled=false;return;
        }
        if(latest){latest.draftOwnerUserId=currentUser;await C.saveActiveDraft_(latest);}
        if(checkContext_())location.reload();
      }catch(e){
        adopt.disabled=false;
        if(typeof showToast==='function')showToast('error','端末へ保存できません。旧記録は変更せず保持しました。');
      }
    };
  }
  function showOtherUserDraftGate_(){
    applyUiLock_('other_user');
    showEditorLockPlaceholder_();
    var host=document.getElementById('ringCheckGuardHost');
    if(!host)return;
    host.hidden=false;
    host.innerHTML='<p role="alert">この車両には別の利用者が保存した下書きがあります。保存した利用者で開き直してください。記録は保持されています。</p>'+
      '<p class="ring-check-guard-hint">'+esc_(uiLockHint_())+'</p>';
  }
  function bootEditorUi_(snaps){
    if(state.editorBound)return;
    state.editorBound=true;
    applyUiLock_(null);
    setStep_('inspect');
    hideGuardHost_();
    renderLocalBanner_(snaps);
    renderPhotoWarn_();
    renderBasicPane_();
    renderInspectionPane_();
    renderTiresPane_();renderRentalExtras_();
    renderPhotosPane_();
    renderPdfPane_();
    renderAttention_();
    bindPhotoInput_();
    closePhotoModal_();
    bindDiagram_();
    renderMarks_();
    renderMarkList_();
    setMode_('scratch');
    document.querySelectorAll('[data-check-mode]').forEach(function(btn){
      btn.addEventListener('click',function(){setMode_(btn.getAttribute('data-check-mode'));});
    });
    document.getElementById('ringCheckUndo').onclick=function(){
      if(!checkContextOrWarn_('マークの取り消し'))return;
      var entry=activeUndo_().pop();
      if(!entry)return;
      var selId=state.selectedMarkId;
      setActiveMarks_(C.applyUndo_(activeMarks_(),entry));
      if(selId&&!markById_(selId)){state.selectedMarkId='';state.detailMarkId='';}
      renderMarks_();
      renderMarkList_();
      persistDraft_();
    };
    var saveSnapBtn=document.getElementById('ringCheckSaveSnap');
    if(saveSnapBtn)saveSnapBtn.onclick=function(){return saveSnapshotFlow_();};
    if(!state.beforeUnloadBound){
      state.beforeUnloadBound=true;
      window.addEventListener('beforeunload',function(ev){
        if(!state.photos.length)return;
        ev.preventDefault();
        ev.returnValue='写真はセッション内のみです。離脱すると失われます。';
      });
    }
  }
  window.addEventListener('ring-auth-context-changed',checkContext_);
  window.addEventListener('storage',checkContext_);
  window.addEventListener('pageshow',checkContext_);

  function diagramSvgHtml_() {
    return (state.diagramKind==='interior'?C.interiorSvgMarkup_():C.diagramSvgMarkup_())
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
    activeMarks_().forEach(function (m) {
      var point = C.markPointOnSvg_(svg, m);
      if (!point) return;
      var cx = point.x, cy = point.y;
      var sym = currentSymbol_(m.type);
      var sel = m.id === state.selectedMarkId ? ' is-selected' : '';
      html += '<g class="ring-check-mark' + sel + '" data-mark-id="' + esc_(m.id) + '" data-type="' + esc_(m.type) + '" data-region="' + esc_(m.region) + '" transform="translate(' + cx + ',' + cy + ')">' +
        '<circle r="14" class="ring-check-mark-hit"/><text class="ring-check-mark-glyph" text-anchor="middle" dominant-baseline="central">' + sym + '</text></g>';
    });
    layer.innerHTML = html;
  }

  function persistDraft_() {
    if (!checkContext_() || state.snapshotBusy || !state.idbAvailable || !state.record || !profile) return Promise.resolve();
    state.record.marks = C.cloneMarks_(state.marks);
    state.record.interiorMarks = C.cloneMarks_(state.interiorMarks);
    state.record.draftOwnerUserId = String(profile.userId || profile.id || '');
    C.normalizeRecord_(state.record);renderAttention_();
    var write = C.saveActiveDraft_(state.record).catch(function () {
      if (!checkContext_()) return;
      state.idbAvailable = false;
      renderLocalBanner_([]);
    }).finally(function () { state.draftWrites.delete(write); });
    state.draftWrites.add(write);
    return write;
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
    document.querySelectorAll('[data-insp-key][data-insp-field="status"]').forEach(function (el) {
      if (el.type === 'radio' && !el.checked) return;
      var sec = el.getAttribute('data-insp-sec');
      var key = el.getAttribute('data-insp-key');
      if (!sec || !key || !state.record.inspection.sections[sec]) return;
      state.record.inspection.sections[sec].items[key].status = el.value;
    });
    // 項目別メモ UI は廃止。DOMに無い場合は既存メモを消さない
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
      if (pv) tw.pressureValue = String(pv.value || '');
      var pu = document.getElementById('ringCheckTirePressUnit_' + w);
      if (pu) tw.pressureUnit = pu.value || 'kPa';
    });
    document.querySelectorAll('[data-tire-key]').forEach(function (el) {
      if (el.type === 'radio' && !el.checked) return;
      var w = el.getAttribute('data-tire-wheel');
      var key = el.getAttribute('data-tire-key');
      if (!w || !key) return;
      state.record.inspection.tires[w].items[key].status = el.value;
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
    state.record.interiorMarks=C.cloneMarks_(state.interiorMarks);
    var w=C.practicalWarnings_(state.record),parts=[];
    if(w.check)parts.push('要確認 '+w.check+'項目');
    if(w.unconfirmed)parts.push('未確認 '+w.unconfirmed+'項目');
    if(w.interiorMarks)parts.push('室内の汚れ・破れ・傷 '+w.interiorMarks+'か所');
    host.hidden=!parts.length;
    host.textContent=parts.length?parts.join(' ／ ')+'。貸出前に実車の安全と状態を確認してください。':'';
  }

  function normalizeStep_(step) {
    if (step === 'diagram' || step === 'photos' || step === 'pdf' || step === 'exterior') return 'exterior';
    if (step === 'basic' || step === 'inspection' || step === 'tires' || step === 'inspect') return 'inspect';
    return 'exterior';
  }

  function setStep_(step) {
    step = normalizeStep_(step);
    state.step = step;
    document.querySelectorAll('[data-step]').forEach(function (btn) {
      btn.classList.toggle('is-active', normalizeStep_(btn.getAttribute('data-step')) === step);
    });
    document.querySelectorAll('[data-pane]').forEach(function (pane) {
      pane.classList.toggle('is-active', pane.getAttribute('data-pane') === step);
    });
    var tb = document.getElementById('ringCheckMarkToolbar');
    if (tb) {
      tb.hidden = step !== 'exterior';
      tb.classList.toggle('is-visible', step === 'exterior');
    }
    document.body.classList.toggle('ring-check-on-diagram', step === 'exterior');
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
      '<p class="ring-check-hint">走行距離はチェックシート記録用です。車両マスタや整備履歴は更新しません。</p>' +
      '<button type="button" id="ringCheckDraftSave" hidden aria-hidden="true" tabindex="-1">下書きを端末に保存</button></div>';
    ['ringCheckDate', 'ringCheckPurpose', 'ringCheckKm', 'ringCheckFuel'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.addEventListener('change', function () { syncFormFromDom_(); renderAttention_(); persistDraft_(); });
    });
    document.getElementById('ringCheckDraftSave').onclick = function () { return saveSnapshotFlow_(); };
  }

  function statusSelectHtml_(name, cur) {
    return C.CHECK_STATUS.map(function (st) {
      var sel = cur === st ? ' selected' : '';
      return '<option value="' + st + '"' + sel + '>' + esc_(C.STATUS_LABELS[st]) + '</option>';
    }).join('');
  }

  function collectLegacyItemMemos_() {
    var lines = [];
    if (!state.record) return lines;
    C.INSPECTION_SECTIONS.forEach(function (sec) {
      var block = state.record.inspection.sections[sec.id];
      if (!block) return;
      sec.items.forEach(function (it) {
        var memo = block.items[it.key] && block.items[it.key].memo;
        if (memo) lines.push(sec.title + ' / ' + it.label + '：' + memo);
      });
      if (block.sectionMemo) lines.push(sec.title + '（区分）：' + block.sectionMemo);
    });
    C.TIRE_WHEELS.forEach(function (w) {
      var tw = state.record.inspection.tires[w];
      if (!tw) return;
      C.TIRE_CHECKS.forEach(function (tc) {
        var memo = tw.items[tc.key] && tw.items[tc.key].memo;
        if (memo) lines.push('タイヤ' + w + ' / ' + tc.label + '：' + memo);
      });
      if (tw.wheelMemo) lines.push('タイヤ' + w + '（区分）：' + tw.wheelMemo);
    });
    return lines;
  }


  function leafLabel_(ref) {
    var a=ref.split('.');
    if(a[0]==='tire'){var t=C.TIRE_CHECKS.find(function(x){return x.key===a[2];});return t?t.label:a[2];}
    var sec=C.INSPECTION_SECTIONS.find(function(x){return x.id===a[0];});
    var it=sec&&sec.items.find(function(x){return x.key===a[1];});
    if(it)return it.label;
    var item=C.practicalItems_().find(function(x){return x.refs[0]===ref;});return item?item.label:a[1];
  }
  function tickRow_(id,label,refs,optional,groupContent) {
    var status=C.groupedStatus_(state.record,refs),open=!!state.openChecks[id],singular=refs.length===1,it=singular?C.itemAt_(state.record,refs[0]):null;
    var showToggle=status==='check'||refs.length>1||!!optional;
    var toggleLabel=status==='check'?'内容・解消':refs.length>1?'各項目':optional?'対象外の指定':'';
    var html='<div class="ring-check-tick-item"><div class="ring-check-tick-row'+(status==='check'?' has-issue':'')+'">' +
      '<label class="ring-check-tick-label"><input type="checkbox" data-tick-refs="'+esc_(refs.join('|'))+'"'+(status==='good'?' checked':'')+(status==='check'||status==='na'?' disabled':'')+'><span class="ring-check-insp-label">'+esc_(label)+'</span></label>' +
      (status==='check'?'<strong class="ring-check-issue-tag">要確認</strong>':status==='na'?'<span>対象外</span>':'') +
      (showToggle?'<button type="button" class="ring-check-detail-toggle" data-check-open="'+esc_(id)+'" aria-expanded="'+open+'">'+esc_(toggleLabel)+'</button>':'')+'</div>' +
      '<div class="ring-check-issue"'+(open?'':' hidden')+'>';
    if(groupContent)html+=groupContent;
    else if(!singular)refs.forEach(function(ref){html+=tickRow_('ref-'+ref,leafLabel_(ref),[ref],false);});
    else {
      if(status==='check'||it.memo)html+='<label class="ring-check-field">確認内容・メモ<textarea data-item-note="'+esc_(refs[0])+'" rows="2">'+esc_(it.memo)+'</textarea></label>';
      if(status==='check')html+='<button type="button" data-resolve="'+esc_(refs[0])+'">確認して解消</button>';
      if(optional)html+='<label class="ring-check-tick-label"><input type="checkbox" data-na="'+esc_(refs[0])+'"'+(status==='na'?' checked':'')+(status==='check'?' disabled':'')+'>非装備・対象外</label>';
    }
    return html+'</div></div>';
  }
  function refreshInspection_() {
    if(!checkContext_())return;
    syncFormFromDom_();renderInspectionPane_();renderTiresPane_();renderAttention_();persistDraft_();
  }
  function bindTicks_(host) {
    host.querySelectorAll('[data-tick-refs]').forEach(function(el){el.onchange=function(){
      if(!checkContext_())return;
      var refs=el.dataset.tickRefs.split('|');
      if(!C.toggleGood_(state.record,refs,el.checked))el.checked=false;
      refreshInspection_();
    };});
    host.querySelectorAll('[data-check-open]').forEach(function(btn){btn.onclick=function(){
      syncFormFromDom_();state.openChecks[btn.dataset.checkOpen]=!state.openChecks[btn.dataset.checkOpen];
      renderInspectionPane_();renderTiresPane_();
    };});
    host.querySelectorAll('[data-resolve]').forEach(function(btn){btn.onclick=function(){
      if(!checkContext_()||!confirm('実車の不具合が解消したことを確認しましたか？メモは残して、未確認へ戻します。'))return;
      C.itemAt_(state.record,btn.dataset.resolve).status='unconfirmed';refreshInspection_();
    };});
    host.querySelectorAll('[data-na]').forEach(function(el){el.onchange=function(){
      if(!checkContext_())return;var it=C.itemAt_(state.record,el.dataset.na);if(it.status!=='check')it.status=el.checked?'na':'unconfirmed';refreshInspection_();
    };});
    host.querySelectorAll('[data-item-note]').forEach(function(el){el.oninput=function(){if(!checkContext_())return;C.itemAt_(state.record,el.dataset.itemNote).memo=el.value;persistDraft_();};});
  }
  function renderInspectionPane_() {
    var host=document.getElementById('ringCheckPaneInspection');if(!host||!state.record)return;
    var html='<h2 class="ring-check-section-title">点検確認</h2>';
    C.PRACTICAL_GROUPS.forEach(function(g){html+='<section class="ring-check-insp-group"><h3 class="ring-check-insp-cat">'+esc_(g.title)+'</h3>';
      g.items.forEach(function(it){html+=tickRow_(it.id,it.label,it.refs,it.optional);});
      if(g.title==='室内状態')html+='<button type="button" class="ring-check-secondary-btn" id="ringCheckOpenInterior">汚れ・破れ・傷を記録</button>';
      html+='</section>';
      if(g.title==='エンジンルーム')html+='<section id="ringCheckTireChecks"></section>';
    });
    var legacy=collectLegacyItemMemos_();
    var oldBody=state.record.inspection.sections.exterior.items.body_look;
    html+='<details class="ring-check-legacy-memo"><summary>旧記録の判定・個別メモ</summary>';
    html+=tickRow_('legacy-body','旧：車体外観の異常',['exterior.body_look'],false);
    var oldW=state.record.inspection.sections.exterior.items.wiper_washer;
    html+='<p>旧ワイパー・ウォッシャーの作動：'+esc_(C.STATUS_LABELS[oldW.status])+'（新しい2項目へ引継ぎ）</p>';
    if(legacy.length)html+='<ul class="ring-check-legacy-list">'+legacy.map(function(l){return '<li>'+esc_(l)+'</li>';}).join('')+'</ul>';
    html+='</details>';host.innerHTML=html;bindTicks_(host);
    document.getElementById('ringCheckOpenInterior').onclick=function(){setStep_('exterior');setDiagramKind_('interior');document.getElementById('ringCheckDiagramHost').scrollIntoView({block:'start'});};
  }
  function renderTiresPane_() {
    var host=document.getElementById('ringCheckPaneTires');if(!host||!state.record)return;
    var detail='<p class="ring-check-hint">4輪×5項目をまとめて確認します。実測値とメモは一括チェックで変更されません。</p>';
    C.TIRE_WHEELS.forEach(function(w){
      var t=state.record.inspection.tires[w];detail+='<section><h3>'+({FL:'左前',FR:'右前',RL:'左後',RR:'右後'}[w])+' '+w+'</h3>';
      C.TIRE_CHECKS.forEach(function(tc){detail+=tickRow_('tire-'+w+'-'+tc.key,tc.label,['tire.'+w+'.'+tc.key],false);});
      var units=C.PRESSURE_UNITS.slice();if(units.indexOf(t.pressureUnit)<0)units.push(t.pressureUnit);
      detail+='<div class="ring-check-pressure-row"><label>実測空気圧<input type="number" min="0" step="any" inputmode="decimal" id="ringCheckTirePressVal_'+w+'" value="'+esc_(t.pressureValue)+'"></label><label>単位<select id="ringCheckTirePressUnit_'+w+'">'+units.map(function(u){return '<option'+(u===t.pressureUnit?' selected':'')+'>'+esc_(u)+'</option>';}).join('')+'</select></label></div>';
      detail+='<label class="ring-check-field">タイヤのメモ<textarea id="ringCheckTireMemo_'+w+'" rows="2">'+esc_(t.wheelMemo)+'</textarea></label></section>';
    });
    var tireHost=document.getElementById('ringCheckTireChecks');
    tireHost.innerHTML='<h2 class="ring-check-section-title">タイヤ</h2>'+tickRow_('tires','タイヤ4輪（空気圧・摩耗・傷・異物）',C.tireRefs_(),false,detail);
    host.innerHTML='<h2 class="ring-check-section-title">共通メモ</h2><label class="ring-check-field">点検全体のメモ<textarea id="ringCheckOverallMemo" rows="3">'+esc_(state.record.meta.overallMemo)+'</textarea></label>';
    bindTicks_(tireHost);
    [tireHost,host].forEach(function(fields){fields.querySelectorAll('.ring-check-pressure-row input, textarea:not([data-item-note])').forEach(function(el){el.onchange=el.oninput=function(){if(!checkContext_())return;syncFormFromDom_();persistDraft_();};});});
    tireHost.querySelectorAll('.ring-check-pressure-row select').forEach(function(el){
      el.dataset.previous=el.value;el.onchange=function(){
        var w=el.id.replace('ringCheckTirePressUnit_',''),t=state.record.inspection.tires[w];
        if(t.pressureValue&&!confirm('数値は自動換算しません。選択した単位で実測値を確認しましたか？')){el.value=el.dataset.previous;return;}
        syncFormFromDom_();el.dataset.previous=el.value;persistDraft_();
      };
    });
  }
  function renderRentalExtras_() {
    var host=document.getElementById('ringCheckPaneExtras');if(!host)return;
    var r=state.record,html='<h2 class="ring-check-section-title">貸出備品</h2><p class="ring-check-hint">貸出した備品だけ選択してください。ETCカードと車載器の点検は別です。</p>';
    C.OPTION_FIELDS.forEach(function(o){var v=r.rentalOptions[o.id];
      html+='<div class="ring-check-option-row"><label class="ring-check-tick-label"><input type="checkbox" data-option-issued="'+o.id+'"'+(v.issued?' checked':'')+'>'+esc_(o.label)+'・貸出あり</label>';
      if(v.issued)html+='<label class="ring-check-tick-label"><input type="checkbox" data-option-returned="'+o.id+'"'+(v.returned?' checked':'')+'>返却確認済み</label><label class="ring-check-field">数量・備品メモ<input data-option-note="'+o.id+'" value="'+esc_(v.note)+'"></label>';
      html+='</div>';
    });
    html+='<h2 class="ring-check-section-title">お客様への注意事項</h2><p class="ring-check-hint">店舗の条件を記入してください。未記入の条件はPDFへ記載しません。</p><details class="ring-check-guidance"><summary>説明する内容を記入・確認</summary>';
    C.GUIDANCE_FIELDS.forEach(function(g){html+='<label class="ring-check-field">'+esc_(g.label)+'<textarea rows="2" data-guidance="'+g.id+'">'+esc_(r.customerGuidance[g.id])+'</textarea></label>';});
    html+='</details><label class="ring-check-tick-label"><input type="checkbox" id="ringCheckExplained"'+(r.customerExplained?' checked':'')+'>お客様への説明・確認済み</label>';
    host.innerHTML=html;
    host.querySelectorAll('[data-option-issued]').forEach(function(el){el.onchange=function(){if(!checkContext_())return;var v=r.rentalOptions[el.dataset.optionIssued];v.issued=el.checked;if(!v.issued)v.returned=false;persistDraft_();renderRentalExtras_();};});
    host.querySelectorAll('[data-option-returned]').forEach(function(el){el.onchange=function(){if(!checkContext_())return;r.rentalOptions[el.dataset.optionReturned].returned=el.checked;persistDraft_();};});
    host.querySelectorAll('[data-option-note]').forEach(function(el){el.oninput=function(){if(!checkContext_())return;r.rentalOptions[el.dataset.optionNote].note=el.value;persistDraft_();};});
    host.querySelectorAll('[data-guidance]').forEach(function(el){el.oninput=function(){if(!checkContext_())return;r.customerGuidance[el.dataset.guidance]=el.value;persistDraft_();};});
    document.getElementById('ringCheckExplained').onchange=function(ev){if(!checkContext_())return;r.customerExplained=ev.target.checked;persistDraft_();};
  }

  function renderPhotoWarn_() {
    var host = document.getElementById('ringCheckPhotoWarn');
    if (!host) return;
    host.textContent = '写真はPDFに保存してください。再読み込み・画面を閉じると写真は消えます。';
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
    if(!checkContext_())return;
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
      if(!checkContext_())return;
      var files = Array.from(inp.files || []);
      if (!files.length) return;
      try {
        for (var fi = 0; fi < files.length; fi++) {
          if (photoReplaceIndex_ != null) {
            var rep = await compressImageFile_(files[0]);
            if(!checkContext_())return;
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
          if(!checkContext_())return;
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
    var photoN = state.photos.length;
    var photoLine = photoN
      ? '<li>写真：' + photoN + ' 枚（この画面を閉じると消えます）</li>'
      : '<li>写真：なし</li>';
    var photoWarn = photoN
      ? '<p class="ring-check-photo-pdf-warn" role="status">写真は端末内の一時データです。戻る前に「PDFを作成」で手元に残してください（写真単体は保存されません）。</p>'
      : '';
    host.innerHTML = '<h2 class="ring-check-section-title">PDF確認</h2>' +
      '<div class="ring-check-form-card ring-check-pdf-summary-card">' +
      '<ul class="ring-check-pdf-summary"><li>用途：' + esc_(C.purposeLabel_(state.record.meta.purpose)) + '</li>' +
      '<li>要確認：' + C.practicalWarnings_(state.record).check + ' 件</li>' +
      '<li>外装：' + state.marks.length + ' 件 ／ 室内：' + state.interiorMarks.length + ' 件</li>' +
      photoLine + '</ul></div>' +
      photoWarn +
      '<div class="ring-check-pdf-actions">' +
      '<button type="button" class="ring-check-btn-save-back" id="ringCheckSaveAndBack">保存して戻る</button>' +
      '<button type="button" class="ring-check-btn-make-pdf" id="ringCheckMakePdf">PDFを作成</button></div>' +
      '<p id="ringCheckPdfStatus" class="ring-check-muted ring-check-pdf-status"></p>';
    document.getElementById('ringCheckMakePdf').onclick = function () { runPdfCreate_(); };
    document.getElementById('ringCheckSaveAndBack').onclick = function () { runSaveAndBack_(); };
  }

  async function runPdfCreate_() {
    if (!checkContext_() || state.pdfBusy) return;
    var status = document.getElementById('ringCheckPdfStatus');
    var PdfApi = typeof ringFleetCheckSheetPdf_ !== 'undefined' ? ringFleetCheckSheetPdf_ : null;
    if (!PdfApi || typeof PDFLib === 'undefined') {
      if (status) status.textContent = 'PDFライブラリを読み込めませんでした。';
      if (typeof showToast === 'function') showToast('error', 'PDFを作成できません');
      return;
    }
    syncFormFromDom_();
    var badPressure=Array.prototype.some.call(document.querySelectorAll('.ring-check-pressure-row input'),function(el){return !el.checkValidity();});
    if(badPressure){if(status)status.textContent='空気圧には0以上の実測値を入力し、単位を確認してください。';return;}
    state.pdfBusy = true;
    if (status) status.textContent = '作成中…';
    try {
      state.record.interiorMarks=C.cloneMarks_(state.interiorMarks);
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
      if(!checkContext_())return;
      await persistDraft_();
      renderPdfPane_();
      renderAttention_();
      status = document.getElementById('ringCheckPdfStatus');
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

  async function saveSnapshotFlow_(silent) {
    if (!checkContext_() || !state.record || state.snapshotBusy) return false;
    var layout = document.querySelector('.ring-check-layout');
    var wasInert = layout.inert;
    state.snapshotBusy = true;
    layout.inert = true;
    try {
      syncFormFromDom_();
      var record = state.record;
      record.marks = C.cloneMarks_(state.marks);
      record.interiorMarks = C.cloneMarks_(state.interiorMarks);
      record.draftOwnerUserId = String(profile.userId || profile.id || '');
      var next = C.freshActiveRecord_(profile.shopId, vin, record.draftOwnerUserId, record);
      var snap;
      try {
        // Finish earlier autosaves so none can replace the next draft after it commits.
        await Promise.all(state.draftWrites);
        if (!checkContext_()) return false;
        snap = await C.saveSnapshotAndNextDraft_(record, next);
      } catch (e) {
        if (checkContext_()) {
          state.idbAvailable = false;
          renderLocalBanner_([]);
          if (!silent && typeof showToast === 'function') showToast('error', '保存できませんでした。再試行してください。');
        }
        return false;
      }
      if (!checkContext_()) return false;
      state.idbAvailable = true;
      state.record = next;
      revokePhotoUrls_(state.photos);
      state.photos = [];
      state.openChecks = {};
      if (!silent) refreshAfterInspectionReset_();
      renderLocalBanner_([snap]);
      return true;
    } finally {
      state.snapshotBusy = false;
      layout.inert = wasInert;
    }
  }

  async function runSaveAndBack_() {
    if (!checkContext_() || state.saveBackBusy || state.pdfBusy) return;
    var status = document.getElementById('ringCheckPdfStatus');
    var backBtn = document.getElementById('ringCheckSaveAndBack');
    var pdfBtn = document.getElementById('ringCheckMakePdf');
    state.saveBackBusy = true;
    backBtn.disabled = true;
    pdfBtn.disabled = true;
    status.textContent = '保存しています…';
    try {
      var saved = await saveSnapshotFlow_(true);
      if (!checkContext_()) return;
      if (!saved) {
        status.textContent = '保存できませんでした。空き容量やブラウザの設定を確認して再試行してください。';
        return;
      }
      status.textContent = '保存しました。レンタカー管理へ戻ります。';
      if (typeof showToast === 'function') showToast('success', 'チェックシートを端末に保存しました');
      goBackToFleet_();
    } finally {
      state.saveBackBusy = false;
      backBtn.disabled = false;
      pdfBtn.disabled = false;
    }
  }

  function pushUndo_(entry) {
    activeUndo_().push(entry);
    if (activeUndo_().length > 50) activeUndo_().shift();
  }

  function placeMarkAtClient_(region, regionG, clientX, clientY) {
    if (!checkContext_() || !modeIsPlace_()) return;
    var rect = regionG.getBoundingClientRect();
    var pt = C.relPointFromClient_(clientX, clientY, rect);
    var mark = (state.diagramKind==='interior'?C.newInteriorMark_:C.newMark_)(region, pt.nx, pt.ny, state.mode, '');
    activeMarks_().push(mark);
    pushUndo_({ action: 'add', mark: Object.assign({}, mark) });
    renderMarks_();
    renderMarkList_();
    persistDraft_();
  }

  function modeIsPlace_() {
    return state.diagramKind==='interior'?!!C.INTERIOR_TYPES[state.mode]:(state.mode === 'scratch' || state.mode === 'dent' || state.mode === 'other');
  }

  function onMarkActivate_(id) {
    if(!checkContext_())return;
    if (state.mode === 'delete') {
      var idx = activeMarks_().findIndex(function (m) { return m.id === id; });
      if (idx >= 0) {
        var removed = activeMarks_().splice(idx, 1)[0];
        pushUndo_({ action: 'remove', mark: Object.assign({}, removed) });
        renderMarks_();
        renderMarkList_();
        persistDraft_();
      }
      return;
    }
    state.selectedMarkId = id;
    state.detailMarkId = id;
    renderMarks_();
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
    if(!host.__ringMarkBound) { host.__ringMarkBound=true; host.addEventListener('pointerdown', function (ev) {
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
    }, true); }
    renderMarks_();
  }

  function renderMarkList_() {
    var host = document.getElementById('ringCheckMarkList');
    if (!host || host.hidden) return;
  }

  function markById_(markId) {
    return C.findMarkInList_(activeMarks_(), markId);
  }

  function syncTypePickActive_(wrap, mark) {
    if (!wrap || !mark) return;
    wrap.querySelectorAll('[data-type-pick]').forEach(function (b) {
      b.classList.toggle('is-active', b.getAttribute('data-type-pick') === mark.type);
    });
  }

  function closeMarkDetail_() {
    state.detailMarkId = '';
  }

  /** 画面上のマーク詳細パネルは廃止。選択状態の更新と既存メモの保持のみ。 */
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
    state.selectedMarkId = id;
    if (opts.preserveMemo !== undefined) {
      C.applyMarkEditsById_(activeMarks_(), id, { memo: opts.preserveMemo });
    } else if (opts.initialMemo !== undefined) {
      C.applyMarkEditsById_(activeMarks_(), id, { memo: opts.initialMemo });
    }
    renderMarks_();
  }

  function setMode_(mode) {
    state.mode = mode;
    document.querySelectorAll('[data-check-mode]').forEach(function (btn) {
      btn.classList.toggle('is-active', btn.getAttribute('data-check-mode') === mode);
    });
    if (modeIsPlace_() && state.selectedMarkId) {
      var cur = markById_(state.selectedMarkId);
      if (cur && cur.type !== mode) {
        pushUndo_({
          action: 'change_type',
          markId: cur.id,
          prevType: cur.type,
          nextType: mode
        });
        if(state.diagramKind==='interior')cur.type=mode;else C.setMarkType_(cur, mode);
        renderMarks_();
        renderMarkList_();
        persistDraft_();
      }
    }
  }

  function renderHeader_() {
    var v = state.vehicle;
    var host = document.getElementById('ringCheckHeader');
    if (!host || !v) return;
    var name = typeof ringVehicleListDisplayName_ === 'function' ? ringVehicleListDisplayName_(v) : (v.nickname || v.vin);
    var plate = typeof ringFormatFleetPlateDisplay_ === 'function'
      ? (ringFormatFleetPlateDisplay_(v) || '未登録') : (v.plateSuffix || '未登録');
    host.innerHTML = '<p class="ring-check-veh-name">' + esc_(name) + '</p>' +
      '<p class="ring-check-meta">' + esc_(plate) + '</p>';
  }

  function idbWarnHtml_() {
    if (state.idbAvailable) return '';
    return '<div class="ring-check-warn ring-check-idb-warn" id="ringCheckIdbWarn" role="alert">' +
      'この端末に記録を保存できません。ブラウザの設定やプライベートモードをご確認ください。</div>';
  }

  function renderLocalBanner_(snapshots) {
    var host = document.getElementById('ringCheckLocalBanner');
    if (!host) return;
    var uid=String(profile.userId||profile.id||'');
    snapshots=(snapshots||[]).filter(function(r){return !r.draftOwnerUserId||r.draftOwnerUserId===uid;});
    var latest = snapshots.length ? snapshots[0] : null;
    var txt = 'この端末にのみ保存されます。他端末とは共有されません。';
    if (state.idbAvailable && latest) {
      txt += ' 保存記録：' + String(latest.savedAt || '').slice(0, 19).replace('T', ' ') + '（' + (latest.marks || []).length + '件）';
    }
    host.innerHTML = idbWarnHtml_() +
      '<div class="ring-check-banner-normal"><p>' + esc_(txt) + '</p></div>';
  }

  function refreshAfterInspectionReset_() {
    renderBasicPane_();
    renderInspectionPane_();
    renderTiresPane_();
    renderRentalExtras_();
    renderPdfPane_();
    renderAttention_();
    renderPhotosPane_();
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
    bindShellNavigationOnce_();
    var context = ringCaptureRequestContext_();pageContext=context;
    state.vehicle = findVehicle_();
    var sync = null;
    if (!state.vehicle && state.vehicleError !== 'AMBIGUOUS_VIN') {
      var note = document.createElement('p'); note.className = 'empty-msg'; note.textContent = '車両情報を取得中です…';
      var guard = document.getElementById('ringCheckGuardHost');
      if (guard) { guard.hidden = false; guard.insertBefore(note, guard.firstChild); }
      else document.getElementById('ringCheckMain').prepend(note);
      try { sync = await syncVehiclesFromServer({returnStatus:true}); } catch (_) { sync = {ok:false}; }
      note.remove();
      if (!ringRequestContextIsCurrent_(context)) return;
      state.vehicle = findVehicle_();
    }
    if (!state.vehicle) {
      var message = state.vehicleError === 'AMBIGUOUS_VIN' ? '同じ車台番号の候補が複数あります。車両情報を確認してください。'
        : (sync && !sync.ok ? '車両情報を取得できません。接続・認証を確認して再読み込みしてください。' : 'この店舗の車両が見つかりません。');
      showEditorLockPlaceholder_();
      var errHost = document.getElementById('ringCheckGuardHost');
      if (errHost) {
        errHost.hidden = false;
        errHost.innerHTML = '<p class="empty-msg">' + message + '</p><button type="button" class="ring-check-secondary-btn" onclick="location.reload()">再読み込み</button>';
      }
      return;
    }
    vin = String(state.vehicle.vin || vin).trim().toUpperCase();
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
    if (!checkContext_()) return;
    var currentUser = String(profile.userId || profile.id || '');
    if (active && !active.draftOwnerUserId) {
      showLegacyDraftGate_(currentUser);
      return;
    }
    if (active && active.draftOwnerUserId && active.draftOwnerUserId !== currentUser) {
      showOtherUserDraftGate_();
      return;
    }
    snaps = snaps.filter(function (r) { return !r.draftOwnerUserId || r.draftOwnerUserId === currentUser; });
    if (active) {
      state.record = C.normalizeRecord_(active);
      state.marks = C.cloneMarks_(active.marks || []);
      state.interiorMarks = C.cloneMarks_(active.interiorMarks || []);
    } else {
      var markSrc = C.latestMarkSource_(snaps, profile.shopId, vin, currentUser);
      var bundle = markSrc ? { marks: markSrc.marks, interiorMarks: markSrc.interiorMarks } : null;
      state.record = C.freshActiveRecord_(profile.shopId, vin, currentUser, bundle);
      state.marks = C.cloneMarks_(bundle && bundle.marks || []);
      state.interiorMarks = C.cloneMarks_(bundle && bundle.interiorMarks || []);
    }
    bootEditorUi_(snaps);
  }

  window.addEventListener('DOMContentLoaded', initPage_);
})();
