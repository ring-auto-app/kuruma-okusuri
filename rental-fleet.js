/* レンタカー・代車管理 Phase2 — カレンダー・予約（app.js の API / 日付ヘルパを利用） */
(function () {
  if (window.__ringAppLoadFailed) return;
  var profile = typeof getCurrentProfile === 'function' ? getCurrentProfile() : safeJsonParse(localStorage.getItem('nappy_profile_v1'), null);
  var userRole = profile ? (profile.shopType || profile.role) : '';
  var isBizMode = (userRole === 'factory' || userRole === 'dealer');
  var fleetTab = 'fleet_all';
  var fleetCacheKey = '';
  var fleetSearchTimer = null;
  var calYear = 0;
  var calMonth = 0;
  var mobileView = 'calendar';
  var mobSelectedYmd = '';
  var selectedVin = '';
  var selectedBookingId = '';
  var showReturnedHistory = false;
  var bookingsCache = [];
  var fleetSyncFromCache = false;
  var fleetBookingsSyncOk = false;
  /** 前回サーバーから取得して端末に保存した予約がある（表示専用。操作の判定には fleetBookingsSyncOk を使う） */
  var fleetBookingsHaveCache = false;
  var fleetBookingsRefreshing = false;
  /** このページ表示中にサーバーから取得できた月（'YYYY-M'） */
  var fleetFreshMonths = {};
  var fleetMonthRefreshTimer = null;
  var fleetVehiclesSyncOk = false;
  var fleetVehiclesLoading = true;
  /** 初回の loadFleetPage_ 完了まで（キャッシュ表示直後の誤った「前回取得分」表示を抑止） */
  var fleetBootSyncPending_ = false;
  var wizardState = null;
  var DESK_LIST_PAGE = 25;
  var MOB_LIST_PAGE = 10;
  var mobListVehiclesCache = [];
  var mobListRendered = 0;
  var mobListObs = null;
  var deskListRendered = 0;
  var deskListVehiclesCache = [];
  var deskListObs = null;
  var deskListLoadingMore = false;
  var deskAvailRange = { start: '', end: '' };
  var deskCalDrag = { active: false, moved: false, startYmd: '', endYmd: '', pointerId: null };
  var fleetLoadGen = 0;
  var fleetBookingsReadGen = 0;
  var fleetHistoryReadGen = 0;
  var fleetPageContext = ringCaptureRequestContext_();

  function fleetContextCurrent_() {
    return ringRequestContextIsCurrent_(fleetPageContext);
  }

  function fleetUserBookingErr_(code, fallback) {
    if (typeof ringFleetBookingUserMessage_ === 'function') {
      return ringFleetBookingUserMessage_(code, fallback);
    }
    return fallback || '処理できませんでした。しばらくしてから再試行してください。';
  }

  function fleetRequireOnline_() {
    if (!fleetContextCurrent_()) return false;
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      fleetBookingsSyncOk = false;
      if (typeof showToast === 'function') showToast('warning', 'オフラインのため予約・貸出・返却はできません。接続後に再試行してください。');
      return false;
    }
    return true;
  }

  function fleetInvalidateSessionView_() {
    if (fleetContextCurrent_()) return;
    fleetLoadGen++; fleetBookingsReadGen++; fleetHistoryReadGen++;
    fleetBookingsSyncOk = false; fleetVehiclesSyncOk = false;
    fleetBookingsHaveCache = false; fleetFreshMonths = {};
    if (fleetMonthRefreshTimer) { clearTimeout(fleetMonthRefreshTimer); fleetMonthRefreshTimer = null; }
    bookingsCache = []; deskListVehiclesCache = []; wizardState = null;
    selectedVin = ''; selectedBookingId = '';
    closeFleetRentalHistory_();
    closeMobDetailSheet_();
    ['fleetMobDetailHost','fleetDetailHost','fleetRentalHistoryBody','fleetRentalHistoryTitle'].forEach(function(id) {
      var node = document.getElementById(id); if (node) node.textContent = '';
    });
    closeNewBookingWizard_();
    fleetDisconnectDeskListObserver_();
    if (typeof hideLoading === 'function') hideLoading();
    var page = document.querySelector('.page-wrap');
    if (page) {
      page.textContent = 'アカウントが変更されました。新しいアカウントで画面を開き直してください。';
    }
    var modal = document.getElementById('fleetNewBookingWizard');
    if (modal) modal.hidden = true;
  }
  window.addEventListener('ring-auth-context-changed', fleetInvalidateSessionView_);
  window.addEventListener('storage', fleetInvalidateSessionView_);
  window.addEventListener('pageshow', fleetInvalidateSessionView_);
  window.addEventListener('offline', function () {
    fleetBookingsSyncOk = false;
    fleetFreshMonths = {};
    renderFleetSummary_();
  });

  function fleetIsDesktop_() {
    return !!(window.matchMedia && window.matchMedia('(min-width: 960px)').matches);
  }

  function fleetSearchInputEl_() {
    var desk = document.getElementById('fleetSearchInputDesk');
    var mob = document.getElementById('fleetSearchInput');
    if (fleetIsDesktop_() && desk) return desk;
    return mob;
  }

  function fleetSortSelectEl_() {
    var desk = document.getElementById('fleetSortSelectDesk');
    var mob = document.getElementById('fleetSortSelect');
    if (fleetIsDesktop_() && desk) return desk;
    return mob;
  }

  function bindFleetDateField_(el) {
    if (!el) return;
    el.addEventListener('click', function () {
      if (typeof el.showPicker === 'function') {
        try { el.showPicker(); } catch (e) { /* fallback: native focus */ }
      }
    });
  }

  function fleetCurrentShopId_() {
    return profile ? String(profile.shopId || '').trim() : '';
  }

  function baseServerRevMissing_(booking) {
    if (!booking) return true;
    var rev = booking.serverRev;
    return rev == null || rev === '' || (typeof rev === 'number' && isNaN(rev));
  }

  function fleetBookingsForShop_(list) {
    var sid = fleetCurrentShopId_();
    if (!sid) return [];
    return (list || []).filter(function (b) {
      return b && String(b.shopId || '').trim() === sid;
    });
  }

  function fleetApplyBookingsCache_(list) {
    if (!fleetContextCurrent_()) return;
    bookingsCache = fleetBookingsForShop_(list);
    selectedBookingId = bookingsCache.some(function (b) { return b.bookingId === selectedBookingId; })
      ? selectedBookingId : '';
  }

  function fleetHomeUrl_() {
    if (userRole === 'dealer') return 'dealer_home.html';
    if (userRole === 'factory') return 'factory_home.html';
    return 'login.html';
  }

  function fleetFindVehicle_(vin) {
    return ringFindFleetVehicleByVin_(fleetFleetOnly_(fleetMine_()), vin, profile).vehicle;
  }

  function fleetCheckSheetUrl_(vin) {
    var car = fleetFindVehicle_(vin);
    return 'fleet_check_sheet.html?vin=' + encodeURIComponent(String(car ? car.vin : vin || '').trim());
  }

  function fleetEscape_(str) {
    if (!str) return '';
    return String(str).replace(/[&<>"'`=\/]/g, function (s) {
      return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','/':'&#x2F;','`':'&#x60;','=':'&#x3D;'}[s]);
    });
  }

  function fleetMine_() {
    if (!fleetContextCurrent_()) return [];
    if (!fleetVehiclesDisplayable_()) return [];
    return typeof ringLoadMyVehicles_ === 'function' ? ringLoadMyVehicles_(profile) : [];
  }

  function fleetFleetOnly_(list) {
    return (list || []).filter(function (c) {
      return typeof ringIsFleetVehicleCategory_ === 'function' && ringIsFleetVehicleCategory_(c.vehicleCategory);
    });
  }

  function fleetFilteredVehicles_() {
    var allFleet = fleetFleetOnly_(fleetMine_()).map(function (c) {
      return typeof ringEnrichVehicleListRow_ === 'function' ? ringEnrichVehicleListRow_(c) : c;
    });
    var vehicles = typeof ringFilterVehiclesByCategoryTab_ === 'function'
      ? ringFilterVehiclesByCategoryTab_(allFleet, fleetTab)
      : allFleet;
    var input = fleetSearchInputEl_();
    var nq = typeof ringNormalizeVehicleSearchText_ === 'function'
      ? ringNormalizeVehicleSearchText_(input ? input.value : '')
      : '';
    if (nq && typeof ringVehicleMatchesListSearch_ === 'function') {
      vehicles = vehicles.filter(function (car) { return ringVehicleMatchesListSearch_(car, nq); });
    }
    var sortEl = fleetSortSelectEl_();
    var sortType = sortEl ? sortEl.value : 'inspect_near';
    if (typeof ringSortVehicleList_ === 'function') vehicles = ringSortVehicleList_(vehicles, sortType);
    return { allFleet: allFleet, vehicles: vehicles };
  }

  function fleetVehicleName_(vin) {
    var v = fleetFindVehicle_(vin);
    if (!v) return vin;
    return typeof ringVehicleListDisplayName_ === 'function' ? ringVehicleListDisplayName_(v) : (v.nickname || vin);
  }

  function fleetCalNextMonth_(year, month) {
    if (month >= 12) return { y: year + 1, m: 1 };
    return { y: year, m: month + 1 };
  }

  function fleetBookingsForMonth_(year, month) {
    return fleetBookingsForShop_(bookingsCache).filter(function (b) {
      if (b.status === 'cancelled') return false;
      if (!showReturnedHistory && b.status === 'returned') return false;
      if (fleetTab !== 'fleet_all') {
        var v = fleetFindVehicle_(b.vin);
        if (!v) return false;
        var cat = typeof ringNormalizeVehicleCategory_ === 'function'
          ? ringNormalizeVehicleCategory_(v.vehicleCategory) : v.vehicleCategory;
        if (cat !== fleetTab) return false;
      }
      return typeof ringFleetBookingOverlapsMonth_ === 'function'
        ? ringFleetBookingOverlapsMonth_(b, year, month)
        : true;
    });
  }

  function fleetBookingsVisible_() {
    return fleetBookingsForMonth_(calYear, calMonth);
  }

  function fleetPlateLabelForCar_(car) {
    if (!car) return '—';
    if (typeof ringFormatFleetPlateDisplay_ === 'function') {
      var fmt = ringFormatFleetPlateDisplay_(car);
      if (fmt) return fmt;
    }
    return car.plateSuffix || '—';
  }

  function fleetNormalizeLendeeInput_(raw) {
    if (typeof ringFleetNormalizeLendeeName_ === 'function') return ringFleetNormalizeLendeeName_(raw);
    if (raw == null) return '';
    return String(raw).replace(/[\r\n]+/g, ' ').trim().slice(0, 60);
  }

  function fleetBookingLendee_(b) {
    return fleetNormalizeLendeeInput_(b && b.lendeeName);
  }

  function fleetCalBarLabel_(b) {
    var car = fleetFindVehicle_(b.vin);
    var name = fleetVehicleName_(b.vin);
    var platePart = '';
    if (car) {
      var plate = fleetPlateLabelForCar_(car);
      if (plate && plate !== '—') platePart = plate;
      else if (car.plateSuffix) platePart = String(car.plateSuffix);
    }
    var base = platePart ? (name + platePart) : name;
    var lendee = fleetBookingLendee_(b);
    return lendee ? (base + ' ' + lendee) : base;
  }

  function fleetLendeeFieldHtml_(value) {
    return '<div class="ring-fleet-field"><label for="fleetWizLendee">貸出先</label>' +
      '<input type="text" id="fleetWizLendee" class="ring-fleet-lendee-input" maxlength="60" autocomplete="off" ' +
      'placeholder="任意（例：タナカ様）" value="' + fleetEscape_(value || '') + '"></div>';
  }

  function fleetReadWizardLendee_() {
    var el = document.getElementById('fleetWizLendee');
  if (wizardState) wizardState.lendeeName = fleetNormalizeLendeeInput_(el ? el.value : (wizardState.lendeeName || ''));
    return wizardState ? wizardState.lendeeName : fleetNormalizeLendeeInput_(el ? el.value : '');
  }

  function syncFleetSearchClear_() {
    var input = fleetSearchInputEl_();
    var clearBtn = document.getElementById('fleetSearchClear');
    if (!input || !clearBtn) return;
    clearBtn.classList.toggle('is-visible', String(input.value || '').trim().length > 0);
  }

  function fleetDeskListEmptyMessage_(filteredCount, allFleetCount) {
    if (filteredCount > 0) return '';
    if (fleetVehiclesLoading) return '車両情報を取得中です…';
    if (!fleetVehiclesSyncOk) {
      return '車両情報を取得できません。接続を確認し再試行してください。';
    }
    if (allFleetCount === 0) return '登録車両がありません';
    return '該当する車両がありません';
  }

  function fleetFmtVehicleDate_(ymd) {
    if (!ymd) return '未設定';
    if (typeof ringFormatVehicleDateJst_ === 'function') return ringFormatVehicleDateJst_(ymd) || '未設定';
    return fmtInspect_(ymd);
  }

  function fleetSingleVehicleCardHtml_(car) {
    var enriched = typeof ringEnrichVehicleListRow_ === 'function' ? ringEnrichVehicleListRow_(car) : car;
    var name = ringVehicleListDisplayName_(car);
    var catLabel = ringVehicleCategoryLabelJa_(car.vehicleCategory);
    var plateFmt = fleetPlateLabelForCar_(car);
    var plateLine = plateFmt && plateFmt !== '—' ? plateFmt : '未設定';
    var shaken = fleetFmtVehicleDate_(car.nextShaken);
    var inspect = enriched._nextInspect ? fmtInspect_(enriched._nextInspect) : '未設定';
    var vinDisp = car.vin || '—';
    return '<article class="car-card ring-fleet-veh-card" data-vin="' + fleetEscape_(car.vin) + '">' +
      '<div class="car-header"><h2 class="car-model">' + fleetEscape_(name) + '</h2>' +
      '<span class="cat-pill ring-fleet-cat-header">' + fleetEscape_(catLabel) + '</span></div>' +
      '<div class="ring-fleet-veh-meta">' +
      '<div class="ring-fleet-veh-meta-row ring-fleet-veh-meta-row--primary">' +
      '<span class="ring-fleet-meta-chip ring-fleet-meta-chip--cat"><span class="cat-pill ring-fleet-cat-meta">' + fleetEscape_(catLabel) + '</span></span>' +
      '<div class="ring-fleet-meta-chip ring-fleet-meta-chip--plate">' +
      '<span class="ring-fleet-meta-label">ナンバー</span><span class="ring-fleet-meta-value">' + fleetEscape_(plateLine) + '</span></div>' +
      '<div class="ring-fleet-meta-chip ring-fleet-meta-chip--vin">' +
      '<span class="ring-fleet-meta-label">車台番号</span><span class="ring-fleet-meta-value ring-fleet-meta-value--vin">' + fleetEscape_(vinDisp) + '</span></div>' +
      '</div>' +
      '<div class="ring-fleet-veh-meta-row ring-fleet-veh-meta-row--dates">' +
      '<div class="ring-fleet-meta-chip ring-fleet-meta-chip--shaken">' +
      '<span class="ring-fleet-meta-label">車検満了</span><span class="ring-fleet-meta-value">' + fleetEscape_(shaken) + '</span></div>' +
      '<div class="ring-fleet-meta-chip ring-fleet-meta-chip--inspect">' +
      '<span class="ring-fleet-meta-label">次回点検</span><span class="ring-fleet-meta-value">' + fleetEscape_(inspect) + '</span></div>' +
      '</div></div>' +
      '<div class="ring-fleet-veh-actions">' +
      '<a href="history.html?vin=' + encodeURIComponent(car.vin) + '&amp;from=rental_fleet" class="ring-fleet-action-btn" data-fleet-nav>整備履歴</a>' +
      '<a href="inspection_biz.html?vin=' + encodeURIComponent(car.vin) + '&amp;from=rental_fleet" class="ring-fleet-action-btn" data-fleet-nav>日常点検</a>' +
      '<button type="button" class="ring-fleet-action-btn" data-fleet-rental-history="' + fleetEscape_(car.vin) + '">貸出履歴</button>' +
      '<a href="vehicle_info.html?vin=' + encodeURIComponent(car.vin) + '&amp;from=rental_fleet" class="ring-fleet-action-btn" data-fleet-nav>車両情報</a>' +
      '</div></article>';
  }

  function fleetBookingsForVinAll_(vin) {
    var v = String(vin || '').trim();
    return fleetBookingsForShop_(bookingsCache).filter(function (b) {
      return b && String(b.vin) === v;
    }).sort(function (a, b) {
      return ringYmdCompare_(b.startDate, a.startDate);
    });
  }

  function renderFleetRentalHistoryBody_(host, list, statusText) {
    if (!host) return;
    if (statusText) {
      host.innerHTML = '<p class="ring-fleet-history-status">' + fleetEscape_(statusText) + '</p>';
      return;
    }
    if (!list.length) {
      host.innerHTML = '<p class="empty-msg">この車両の予約・貸出履歴はありません。</p>';
      return;
    }
    host.innerHTML = list.map(function (b) {
      var lendee = fleetBookingLendee_(b);
      return '<article class="ring-fleet-history-row">' +
        '<p class="ring-fleet-history-dates">' + fleetEscape_(b.startDate) + ' 〜 ' + fleetEscape_(b.endDate) + '</p>' +
        (lendee ? '<p class="ring-fleet-history-lendee">貸出先：' + fleetEscape_(lendee) + '</p>' : '') +
        '<p class="ring-fleet-history-st">' + fleetEscape_(fleetBookingStatusLabel_(b.status)) + '</p></article>';
    }).join('');
  }

  async function openFleetRentalHistory_(vin) {
    if (!fleetContextCurrent_()) return;
    var historyGen = ++fleetHistoryReadGen;
    var modal = document.getElementById('fleetRentalHistoryModal');
    var body = document.getElementById('fleetRentalHistoryBody');
    var title = document.getElementById('fleetRentalHistoryTitle');
    if (!modal || !body) return;
    var car = fleetFindVehicle_(vin);
    var name = car ? ringVehicleListDisplayName_(car) : fleetVehicleName_(vin);
    if (title) title.textContent = '貸出履歴 — ' + name;
    modal.hidden = false;
    modal.setAttribute('aria-hidden', 'false');
    var cached = fleetBookingsForVinAll_(vin);
    renderFleetRentalHistoryBody_(body, cached, cached.length ? '' : '読み込み中…');
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      renderFleetRentalHistoryBody_(body, cached, cached.length ? '' : 'オフラインのため端末に保存済みの履歴のみ表示します。');
      return;
    }
    if (typeof syncFleetBookingsForVinHistory_ !== 'function') {
      renderFleetRentalHistoryBody_(body, cached, '');
      return;
    }
    var res = await syncFleetBookingsForVinHistory_(vin);
    if (!fleetContextCurrent_() || historyGen !== fleetHistoryReadGen) {
      return;
    }
    if (!res.ok) {
      var errMsg = /AUTH_|SESSION_|STALE_SESSION/.test(String(res.error || ''))
        ? '認証の確認が必要です。再ログイン後にお試しください。'
        : (cached.length ? '最新の履歴を取得できませんでした。表示は端末保存分です。' : '履歴を取得できませんでした。');
      renderFleetRentalHistoryBody_(body, cached, cached.length ? errMsg : errMsg);
      return;
    }
    var list = (res.bookings || []).slice().sort(function (a, b) {
      return ringYmdCompare_(b.startDate, a.startDate);
    });
    renderFleetRentalHistoryBody_(body, list, '');
  }

  function closeFleetRentalHistory_() {
    fleetHistoryReadGen++;
    var modal = document.getElementById('fleetRentalHistoryModal');
    if (!modal) return;
    modal.hidden = true;
    modal.setAttribute('aria-hidden', 'true');
  }

  function fleetBookingsDisplayable_() {
    return fleetBookingsSyncOk || fleetBookingsHaveCache;
  }

  function fleetVehicleSnapshotKey_(scope) {
    scope = scope || ringFleetBookingsCacheKey_(profile);
    return scope ? 'ring_fleet_vehicle_snapshot:' + scope : '';
  }

  /** 車両一覧を画面に出せるか（今回の同期成功 or 過去に端末へ保存済み） */
  function fleetVehiclesDisplayable_() {
    if (fleetVehiclesSyncOk) return true;
    var sk = fleetVehicleSnapshotKey_();
    return !!(sk && typeof localStorage !== 'undefined' && localStorage.getItem(sk));
  }

  function fleetInitVehicleLoadingFlag_() {
    fleetVehiclesLoading = !fleetVehiclesDisplayable_();
  }

  /**
   * 同期案内（コンパクト1行）。取得中・キャッシュ表示中は案内を出さず、大きなパネルも使わない。
   */
  function fleetSummaryHintMessage_() {
    var vehiclesOk = fleetVehiclesDisplayable_();
    var bookingsOk = fleetBookingsDisplayable_();
    if (fleetBootSyncPending_) return '';
    if (vehiclesOk && bookingsOk && fleetVehiclesSyncOk && fleetBookingsSyncOk) return '';
    if (fleetVehiclesLoading && vehiclesOk) return '';
    if (fleetBookingsRefreshing && bookingsOk) return '';
    if (!vehiclesOk) {
      if (fleetVehiclesLoading) return '';
      return '車両情報を取得できません。接続を確認して「更新」を押してください。';
    }
    if (!fleetVehiclesSyncOk) {
      return '車両情報の最新確認ができません。前回取得分を表示しています。';
    }
    if (!fleetBookingsSyncOk && fleetBookingsHaveCache) {
      return '予約情報の最新確認ができません。前回取得分を表示しています。';
    }
    if (!bookingsOk && !fleetBookingsRefreshing) {
      return '予約情報を取得できません。接続を確認して「更新」を押してください。';
    }
    return '';
  }

  function fleetMonthKey_(year, month) {
    return year + '-' + month;
  }

  function fleetVisibleMonthsFresh_() {
    var nx = fleetCalNextMonth_(calYear, calMonth);
    return !!(fleetFreshMonths[fleetMonthKey_(calYear, calMonth)] && fleetFreshMonths[fleetMonthKey_(nx.y, nx.m)]);
  }

  function fleetRenderFromLocalCache_() {
    if (typeof loadFleetBookingsLocal_ === 'function') {
      fleetApplyBookingsCache_(loadFleetBookingsLocal_(profile));
      fleetBookingsSyncOk = false;
      fleetSyncFromCache = true;
      fleetBookingsHaveCache = typeof ringFleetBookingsHasLocalSnapshot_ === 'function'
        ? ringFleetBookingsHasLocalSnapshot_(profile) : bookingsCache.length > 0;
    }
    renderFleetSummary_();
    renderFleetList_(false);
    renderCalendars_();
    renderMobDayAgenda_();
    renderDeskTodayPanel_();
    renderDeskOutPanel_();
  }

  function fleetDisconnectMobListObserver_() {
    if (mobListObs) {
      mobListObs.disconnect();
      mobListObs = null;
    }
    var sentinel = document.getElementById('fleetMobListSentinel');
    if (sentinel) sentinel.hidden = true;
  }

  function fleetLoadMoreMobList_() {
    if (mobListRendered >= mobListVehiclesCache.length) return;
    var listArea = document.getElementById('fleetListArea');
    if (!listArea) return;
    var slice = mobListVehiclesCache.slice(mobListRendered, mobListRendered + MOB_LIST_PAGE);
    var html = slice.map(fleetSingleVehicleCardHtml_).join('');
    if (mobListRendered === 0) listArea.innerHTML = html;
    else listArea.insertAdjacentHTML('beforeend', html);
    mobListRendered += slice.length;
    if (mobListRendered >= mobListVehiclesCache.length) fleetDisconnectMobListObserver_();
    else fleetSetupMobListObserver_();
  }

  function fleetSetupMobListObserver_() {
    if (fleetIsDesktop_()) return;
    fleetDisconnectMobListObserver_();
    var listArea = document.getElementById('fleetListArea');
    if (!listArea || mobListRendered >= mobListVehiclesCache.length) return;
    var sentinel = document.getElementById('fleetMobListSentinel');
    if (!sentinel) {
      sentinel = document.createElement('div');
      sentinel.id = 'fleetMobListSentinel';
      sentinel.className = 'ring-fleet-mob-list-sentinel';
      sentinel.style.cssText = 'height:1px;width:100%;';
      listArea.appendChild(sentinel);
    }
    sentinel.hidden = false;
    if (typeof IntersectionObserver !== 'function') {
      fleetLoadMoreMobList_();
      return;
    }
    mobListObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) fleetLoadMoreMobList_();
      });
    }, { root: null, rootMargin: '120px 0px', threshold: 0 });
    mobListObs.observe(sentinel);
  }

  function renderMobVehicleList_(vehicles) {
    mobListVehiclesCache = vehicles || [];
    mobListRendered = 0;
    fleetDisconnectMobListObserver_();
    var listArea = document.getElementById('fleetListArea');
    if (!listArea) return;
    var emptyMsg = fleetDeskListEmptyMessage_(mobListVehiclesCache.length, fleetFleetOnly_(fleetMine_()).length);
    if (emptyMsg) {
      listArea.innerHTML = '<div class="empty-msg">' + fleetEscape_(emptyMsg) + '</div>';
      return;
    }
    var first = mobListVehiclesCache.slice(0, MOB_LIST_PAGE);
    listArea.innerHTML = first.map(fleetSingleVehicleCardHtml_).join('');
    mobListRendered = first.length;
    if (mobListRendered < mobListVehiclesCache.length) fleetSetupMobListObserver_();
  }

  function fleetListCardHtml_(vehicles) {
    if (!vehicles.length) return '<div class="empty-msg">' + fleetDeskListEmptyMessage_(0, fleetFleetOnly_(fleetMine_()).length) + '</div>';
    return vehicles.map(fleetSingleVehicleCardHtml_).join('');
  }

  function fleetDisconnectDeskListObserver_() {
    if (deskListObs) {
      deskListObs.disconnect();
      deskListObs = null;
    }
    var sentinel = document.getElementById('fleetDeskListSentinel');
    if (sentinel) sentinel.hidden = true;
    var moreBtn = document.getElementById('fleetDeskListMoreBtn');
    if (moreBtn) moreBtn.hidden = true;
  }

  function fleetUpdateDeskListCount_() {
    var countEl = document.getElementById('fleetDeskListCount');
    if (!countEl) return;
    if (!deskListVehiclesCache.length) {
      countEl.textContent = '';
      return;
    }
    countEl.textContent = '表示中' + deskListRendered + '台／全' + deskListVehiclesCache.length + '台';
  }

  function fleetLoadMoreDeskList_() {
    if (deskListLoadingMore) return;
    if (deskListRendered >= deskListVehiclesCache.length) {
      fleetDisconnectDeskListObserver_();
      return;
    }
    deskListLoadingMore = true;
    var deskList = document.getElementById('fleetDeskListArea');
    var slice = deskListVehiclesCache.slice(deskListRendered, deskListRendered + DESK_LIST_PAGE);
    if (deskList && slice.length) {
      deskList.insertAdjacentHTML('beforeend', slice.map(fleetSingleVehicleCardHtml_).join(''));
      deskListRendered += slice.length;
    }
    deskListLoadingMore = false;
    fleetUpdateDeskListCount_();
    if (deskListRendered >= deskListVehiclesCache.length) {
      fleetDisconnectDeskListObserver_();
    } else {
      fleetMaybeAutoFillDeskList_();
    }
  }

  function fleetMaybeAutoFillDeskList_() {
    if (!fleetIsDesktop_()) return;
    if (deskListRendered >= deskListVehiclesCache.length) return;
    var sentinel = document.getElementById('fleetDeskListSentinel');
    if (!sentinel || sentinel.hidden) return;
    var rect = sentinel.getBoundingClientRect();
    if (rect.top <= window.innerHeight + 160) fleetLoadMoreDeskList_();
  }

  function fleetSetupDeskListObserver_() {
    if (!fleetIsDesktop_()) return;
    if (deskListRendered >= deskListVehiclesCache.length) {
      fleetDisconnectDeskListObserver_();
      return;
    }
    var sentinel = document.getElementById('fleetDeskListSentinel');
    var moreBtn = document.getElementById('fleetDeskListMoreBtn');
    if (!sentinel) return;
    sentinel.hidden = false;
    if (typeof IntersectionObserver !== 'function') {
      if (moreBtn) moreBtn.hidden = false;
      return;
    }
    if (moreBtn) moreBtn.hidden = true;
    if (deskListObs) deskListObs.disconnect();
    deskListObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) fleetLoadMoreDeskList_();
      });
    }, { root: null, rootMargin: '160px 0px', threshold: 0 });
    deskListObs.observe(sentinel);
    fleetMaybeAutoFillDeskList_();
  }

  function renderDeskVehicleList_(vehicles) {
    var deskList = document.getElementById('fleetDeskListArea');
    if (!deskList) return;
    deskListVehiclesCache = vehicles || [];
    deskListRendered = 0;
    fleetDisconnectDeskListObserver_();
    var allFleetCount = fleetFleetOnly_(fleetMine_()).length;
    var emptyMsg = fleetDeskListEmptyMessage_(deskListVehiclesCache.length, allFleetCount);
    if (emptyMsg) {
      deskList.innerHTML = '<div class="empty-msg">' + fleetEscape_(emptyMsg) + '</div>';
      fleetUpdateDeskListCount_();
      return;
    }
    var first = deskListVehiclesCache.slice(0, DESK_LIST_PAGE);
    deskList.innerHTML = first.map(fleetSingleVehicleCardHtml_).join('');
    deskListRendered = first.length;
    fleetUpdateDeskListCount_();
    if (deskListRendered < deskListVehiclesCache.length) fleetSetupDeskListObserver_();
  }

  function fleetBindSummaryHint_(hintId, slotId, warnText) {
    var hintEl = document.getElementById(hintId);
    var slotEl = slotId ? document.getElementById(slotId) : hintEl && hintEl.parentElement;
    if (!hintEl) return;
    var loading = fleetBootSyncPending_ && !warnText;
    var show = !!(warnText || loading);
    var text = warnText || (loading ? '読み込み中…' : '');
    hintEl.textContent = text;
    hintEl.classList.toggle('is-inert', !show);
    hintEl.classList.toggle('is-loading', !!loading);
    hintEl.classList.toggle('is-stale', !!warnText && (warnText.indexOf('前回取得') >= 0 || warnText.indexOf('最新確認') >= 0));
    hintEl.classList.toggle('is-error', !!warnText && warnText.indexOf('取得できません') >= 0);
    if (slotEl && slotEl.classList) {
      slotEl.classList.toggle('is-active', show);
      slotEl.classList.toggle('is-loading', !!loading);
    }
  }

  function renderFleetSummary_() {
    var all = fleetFleetOnly_(fleetMine_());
    var warnText = fleetSummaryHintMessage_();
    var bookingsUnknown = !fleetBookingsDisplayable_();
    fleetBindSummaryHint_('fleetSummaryHint', 'fleetSummaryHintSlot', warnText);
    fleetBindSummaryHint_('fleetMobSummaryHint', 'fleetMobSummaryHintSlot', warnText);
    function setStat(id, val, unknown) {
      var el = document.getElementById(id);
      if (!el) return;
      el.textContent = unknown ? '—' : String(val);
      el.classList.toggle('is-unknown', !!unknown);
    }
    setStat('fleetStatTotal', all.length, !fleetVehiclesSyncOk && !all.length);
    var outs = ringFleetListActiveOutBookings_(profile, bookingsCache);
    setStat('fleetStatOut', outs.length, bookingsUnknown);
    var today = ringFormatDateToYmdJst_(new Date());
    var list = fleetBookingsForShop_(bookingsCache);
    var startToday = list.filter(function (b) {
      return b && b.startDate === today && b.status !== 'cancelled' && b.status !== 'returned';
    }).length;
    var endToday = list.filter(function (b) {
      return b && b.endDate === today && (b.status === 'out' || b.status === 'confirmed');
    }).length;
    setStat('fleetStatStartToday', startToday, bookingsUnknown);
    setStat('fleetStatEndToday', endToday, bookingsUnknown);
    setStat('fleetMobStatOut', outs.length, bookingsUnknown);
    setStat('fleetMobStatEndToday', endToday, bookingsUnknown);
    setStat('fleetMobStatStartToday', startToday, bookingsUnknown);
  }

  function renderDeskTodayPanel_() {
    var host = document.getElementById('fleetDeskTodayPanel');
    if (!host) return;
    if (!fleetBookingsDisplayable_()) {
      host.innerHTML = fleetBookingsRefreshing
        ? '<p style="margin:0;color:#64748b;font-weight:700;">本日の予定を読み込んでいます…</p>'
        : '<p style="margin:0;color:#b91c1c;font-weight:800;">本日の予定を取得できません</p>';
      return;
    }
    var today = ringFormatDateToYmdJst_(new Date());
    var list = fleetBookingsForShop_(bookingsCache);
    var lines = [];
    list.forEach(function (b) {
      if (!b) return;
      if (b.startDate === today && b.status !== 'cancelled' && b.status !== 'returned') {
        lines.push({ kind: '貸出', b: b });
      }
      if (b.endDate === today && (b.status === 'out' || b.status === 'confirmed' || b.status === 'reserved')) {
        lines.push({ kind: '返却予定', b: b });
      }
    });
    if (!lines.length) {
      host.innerHTML = '<p style="margin:0;">本日の貸出・返却予定はありません</p>';
      return;
    }
    host.innerHTML = lines.slice(0, 12).map(function (row) {
      return '<div class="ring-fleet-today-line"><strong>' + fleetEscape_(row.kind) + '</strong> · ' +
        fleetEscape_(fleetVehicleName_(row.b.vin)) + '（' + fleetEscape_(row.b.startDate) + '〜' + fleetEscape_(row.b.endDate) + '）</div>';
    }).join('');
  }

  function renderMobListOnboard_() {
    var el = document.getElementById('fleetMobEmptyOnboard');
    if (!el) return;
    var count = fleetFleetOnly_(fleetMine_()).length;
    if (!fleetVehiclesDisplayable_() && !fleetVehiclesLoading) {
      el.hidden = false;
      el.className = 'ring-fleet-empty-onboard ring-fleet-empty-onboard--sync';
      el.innerHTML = '<p class="ring-fleet-sync-fail-compact">車両情報を確認できません。通信または同期の問題で一覧を取得できませんでした。「更新」または接続をご確認ください。</p>';
      return;
    }
    if (!count && fleetVehiclesSyncOk) {
      el.hidden = false;
      var add = document.getElementById('fleetAddActions');
      el.innerHTML = '<h2>レンタカー・代車がまだ登録されていません</h2>' +
        '<p>下のボタンから車両を登録すると、予約カレンダーや貸出管理を利用できます。</p>' +
        (add ? add.outerHTML : '');
      return;
    }
    el.hidden = true;
    el.innerHTML = '';
  }

  function fleetYmdToDate_(ymd) {
    var p = String(ymd || '').split('-');
    if (p.length < 3) return new Date();
    return new Date(+p[0], +p[1] - 1, +p[2]);
  }

  function fleetBookingsForRange_(startYmd, endYmd) {
    return fleetBookingsForShop_(bookingsCache).filter(function (b) {
      if (!b || b.status === 'cancelled') return false;
      if (!showReturnedHistory && b.status === 'returned') return false;
      if (fleetTab !== 'fleet_all') {
        var v = fleetFindVehicle_(b.vin);
        if (!v) return false;
        var cat = typeof ringNormalizeVehicleCategory_ === 'function'
          ? ringNormalizeVehicleCategory_(v.vehicleCategory) : v.vehicleCategory;
        if (cat !== fleetTab) return false;
      }
      return typeof ringFleetDateRangesOverlap_ === 'function'
        ? ringFleetDateRangesOverlap_(b.startDate, b.endDate, startYmd, endYmd)
        : true;
    });
  }

  function fleetBookingCountOnDay_(ymd, bookings) {
    return (bookings || []).filter(function (b) {
      return ringFleetDateRangesOverlap_(b.startDate, b.endDate, ymd, ymd);
    }).length;
  }

  function fleetBookingStatusLabel_(st) {
    var map = { reserved: '予約中', confirmed: '予約中', out: '貸出中', returned: '返却済', cancelled: 'キャンセル' };
    return map[String(st || '').toLowerCase()] || st;
  }

  function fleetPlateSuffixForBooking_(b) {
    var car = fleetFindVehicle_(b.vin);
    return fleetPlateLabelForCar_(car);
  }

  function renderMobDayAgenda_() {
    var host = document.getElementById('fleetMobDayAgenda');
    if (!host) return;
    if (!mobSelectedYmd) {
      host.hidden = true;
      host.innerHTML = '';
      return;
    }
    var newBtn = '<button type="button" class="ring-fleet-mob-agenda-new" data-agenda-new="' + fleetEscape_(mobSelectedYmd) + '">＋ この日から予約</button>';
    if (!fleetBookingsDisplayable_()) {
      host.hidden = false;
      host.innerHTML = '<h3>' + fleetEscape_(mobSelectedYmd) + '</h3>' + (fleetBookingsRefreshing
        ? '<p style="margin:0;color:#64748b;font-weight:700;">予定を読み込んでいます…</p>'
        : '<p style="margin:0;color:#b45309;font-weight:800;">この日の予定を取得できません</p>');
      return;
    }
    var staleNote = '';
    var staleActive = !fleetBootSyncPending_ && !fleetBookingsSyncOk && fleetBookingsHaveCache && !fleetBookingsRefreshing;
    if (staleActive) {
      staleNote = '<p class="ring-fleet-mob-agenda-stale">予約は前回取得分です（最新の確認ができません）</p>';
    }
    var staleSlot = '<div class="ring-fleet-mob-agenda-stale-slot' + (staleActive ? ' is-active' : '') + '">' + staleNote + '</div>';
    var bookings = fleetBookingsForRange_(mobSelectedYmd, mobSelectedYmd);
    if (!bookings.length) {
      host.hidden = false;
      host.innerHTML = '<h3>' + fleetEscape_(mobSelectedYmd) + '</h3>' + staleSlot +
        '<p style="margin:0;font-weight:700;color:#64748b;">予定はありません</p>' + newBtn;
      return;
    }
    host.hidden = false;
    host.innerHTML = '<h3>' + fleetEscape_(mobSelectedYmd) + ' の予定</h3>' + staleSlot + bookings.map(function (b) {
      var st = String(b.status || 'reserved').toLowerCase();
      return '<button type="button" class="ring-fleet-mob-agenda-item st-' + fleetEscape_(st) + '" data-booking-id="' + fleetEscape_(b.bookingId) + '">' +
        '<strong>' + fleetEscape_(fleetVehicleName_(b.vin)) + '</strong>' +
        '<span>下4桁 ' + fleetEscape_(fleetPlateSuffixForBooking_(b)) + ' · ' +
        fleetEscape_(fleetBookingStatusLabel_(b.status)) + ' · ' +
        fleetEscape_(b.startDate) + '〜' + fleetEscape_(b.endDate) + '</span></button>';
    }).join('') + newBtn;
  }

  function renderDeskEmptyState_() {
    var el = document.getElementById('fleetDeskEmptyState');
    if (!el) return;
    if (!fleetVehiclesDisplayable_() && !fleetVehiclesLoading) {
      el.hidden = false;
      el.className = 'ring-fleet-empty-onboard ring-fleet-empty-onboard--sync';
      el.innerHTML = '<p class="ring-fleet-sync-fail-compact">車両情報を確認できません。通信または同期の問題で一覧を取得できませんでした。「更新」を押してください（未登録とは限りません）。</p>';
      return;
    }
    el.hidden = true;
    el.innerHTML = '';
  }

  function fmtInspect_(d) {
    if (!d) return '---';
    if (typeof ringFormatDateLocal_ === 'function') return ringFormatDateLocal_(d, false);
    var dd = d instanceof Date ? d : new Date(d);
    if (isNaN(dd)) return '---';
    return dd.getFullYear() + '/' + String(dd.getMonth() + 1).padStart(2, '0') + '/' + String(dd.getDate()).padStart(2, '0');
  }

  function initCalMonth_() {
    var now = ringFormatDateToYmdJst_(new Date()).split('-');
    calYear = Number(now[0]);
    calMonth = Number(now[1]);
  }

  function renderFleetList_(preserveScroll) {
    var scrollY = preserveScroll ? window.scrollY : null;
    var pack = fleetFilteredVehicles_();
    var rentalN = pack.allFleet.filter(function (c) {
      return ringNormalizeVehicleCategory_(c.vehicleCategory) === 'rental';
    }).length;
    var loanerN = pack.allFleet.filter(function (c) {
      return ringNormalizeVehicleCategory_(c.vehicleCategory) === 'loaner';
    }).length;
    ['cntAll', 'cntAllDesk'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.textContent = !fleetVehiclesSyncOk && !pack.allFleet.length ? '—' : pack.allFleet.length;
    });
    ['cntRental', 'cntRentalDesk'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.textContent = !fleetVehiclesSyncOk && !pack.allFleet.length ? '—' : rentalN;
    });
    ['cntLoaner', 'cntLoanerDesk'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.textContent = !fleetVehiclesSyncOk && !pack.allFleet.length ? '—' : loanerN;
    });
    syncFleetSearchClear_();
    var vehicles = pack.vehicles;
    if (fleetIsDesktop_()) {
      var listArea = document.getElementById('fleetListArea');
      if (listArea) listArea.innerHTML = fleetListCardHtml_(vehicles);
    } else {
      renderMobVehicleList_(vehicles);
    }
    renderDeskVehicleList_(vehicles);
    renderDesktopVehicleTable_(pack.vehicles);
    renderCalendars_();
    renderFleetSummary_();
    renderDeskTodayPanel_();
    renderDeskEmptyState_();
    renderMobListOnboard_();
    renderMobDayAgenda_();
    if (scrollY != null && typeof ringRestoreScrollY_ === 'function') ringRestoreScrollY_(scrollY);
  }

  function renderDesktopVehicleTable_(vehicles) {
    var host = document.getElementById('fleetDeskVehTable');
    if (!host) return;
  var rows = vehicles || [];
    var html = '<table class="ring-fleet-veh-table"><thead><tr><th>車両</th><th>状態</th><th>点検</th></tr></thead><tbody>';
    if (!rows.length) html += '<tr><td colspan="3">該当なし</td></tr>';
    rows.forEach(function (car) {
      var sel = selectedVin && String(selectedVin).toUpperCase() === String(car.vin).toUpperCase() ? ' class="is-selected"' : '';
      var active = bookingsCache.find(function (b) {
        return b.vin === car.vin && b.status === 'out';
      });
      var st = active ? '貸出中' : '—';
      html += '<tr' + sel + ' data-vin="' + fleetEscape_(car.vin) + '"><td>' + fleetEscape_(ringVehicleListDisplayName_(car)) +
        '<div style="font-size:10px;color:#64748b">' + fleetEscape_(car.vin) + '</div></td><td>' + st +
        '</td><td>' + fleetEscape_(fmtInspect_(car._nextInspect)) + '</td></tr>';
    });
    html += '</tbody></table>';
    host.innerHTML = html;
  }

  function markersForDay_(ymd, vehicles) {
    var marks = [];
    (vehicles || []).forEach(function (v) {
      var insp = ringFleetInspectYmdForVehicle_(v);
      if (insp === ymd) marks.push({ t: 'inspect', label: '点検' });
      var shakenWarn = ringShakenTwoMonthsBeforeYmd_(v.nextShaken);
      if (shakenWarn === ymd) marks.push({ t: 'shaken', label: '車検2M' });
    });
    return marks;
  }

  function renderCalendarInto_(hostId, classWeek, year, month) {
    var host = document.getElementById(hostId);
    if (!host) return;
    var renderGen = fleetLoadGen;
    var y = year != null ? year : calYear;
    var m = month != null ? month : calMonth;
    var weeks = ringFleetCalendarWeeksJst_(y, m);
    var vehicles = fleetFilteredVehicles_().vehicles;
    var bookings = fleetBookingsForMonth_(y, m);
    var isMobCompact = hostId === 'fleetCalMob' && String(classWeek || '').indexOf('is-month-compact') >= 0;
    var todayYmd = ringFormatDateToYmdJst_(new Date());
    var title = y + '年' + m + '月';
    var titleEl = document.querySelector('[data-cal-title="' + hostId + '"]');
    if (titleEl) titleEl.textContent = title;

    var html = '<div class="ring-fleet-cal-grid"><div class="ring-fleet-cal-dow">' +
      ['日','月','火','水','木','金','土'].map(function (d) { return '<span>' + d + '</span>'; }).join('') + '</div>';
    weeks.forEach(function (week) {
      html += '<div class="ring-fleet-cal-week ' + (classWeek || '') + '">';
      week.forEach(function (cell) {
        if (!cell) {
          html += '<div class="ring-fleet-cal-day is-out"></div>';
          return;
        }
        var cls = cell.ymd === todayYmd ? 'ring-fleet-cal-day is-today' : 'ring-fleet-cal-day';
        if (cell.ymd === mobSelectedYmd && hostId === 'fleetCalMob') cls += ' is-selected';
        if (hostId === 'fleetCalDesk') cls += ' is-avail-pick';
        var mk = isMobCompact ? [] : markersForDay_(cell.ymd, vehicles);
        var mkHtml = mk.map(function (m) {
          return '<div class="ring-fleet-cal-marker mk-' + m.t + '">' + m.label + '</div>';
        }).join('');
        if (isMobCompact && fleetBookingCountOnDay_(cell.ymd, bookings)) {
          mkHtml += '<span class="ring-fleet-cal-day-mark" aria-hidden="true"></span>';
        }
        var dayTag = hostId === 'fleetCalMob' ? 'button' : 'div';
        var dayExtra = hostId === 'fleetCalMob' ? ' type="button"' : '';
        html += '<' + dayTag + dayExtra + ' class="' + cls + '" data-cal-ymd="' + fleetEscape_(cell.ymd) + '"><div>' + cell.d + '</div>' + mkHtml + '</' + dayTag + '>';
      });
      html += '<div class="ring-fleet-cal-bars">';
      for (var col = 0; col < 7; col++) html += '<div></div>';
      bookings.forEach(function (b) {
        var bar = ringFleetBookingBarInWeek_(b, week);
        if (!bar) return;
        var st = String(b.status || 'reserved').toLowerCase();
        var barText = fleetCalBarLabel_(b);
        var barLabel = isMobCompact ? (bar.span >= 2 ? barText : '') : barText;
        var tip = barText + ' · ' + fleetBookingStatusLabel_(st) + ' ' + b.startDate + '〜' + b.endDate;
        html += '<button type="button" class="ring-fleet-cal-bar st-' + st + '" style="grid-column:' +
          (bar.startCol + 1) + ' / span ' + bar.span + ';" data-booking-id="' + fleetEscape_(b.bookingId) + '"' +
          ' title="' + fleetEscape_(tip) + '" aria-label="' + fleetEscape_(tip) + '">' +
          fleetEscape_(barLabel) + '</button>';
      });
      html += '</div></div>';
    });
    html += '</div>';
    if (hostId === 'fleetCalDesk') return html;
    if (renderGen !== fleetLoadGen) return html;
    host.innerHTML = html;
    return html;
  }

  function fleetDeskRangeBetween_(a, b) {
    if (!a || !b) return { start: a || b || '', end: a || b || '' };
    if (ringYmdCompare_(a, b) > 0) return { start: b, end: a };
    return { start: a, end: b };
  }

  function fleetCommitDeskAvailRange_(startYmd, endYmd) {
    var r = fleetDeskRangeBetween_(startYmd, endYmd);
    deskAvailRange.start = r.start;
    deskAvailRange.end = r.end;
    var ds = document.getElementById('fleetDeskAvailStart');
    var de = document.getElementById('fleetDeskAvailEnd');
    if (ds) ds.value = r.start;
    if (de) de.value = r.end;
    fleetApplyDeskRangeHighlight_();
  }

  function fleetApplyDeskRangeHighlight_() {
    var host = document.getElementById('fleetCalDesk');
    if (!host || !deskAvailRange.start || !deskAvailRange.end) return;
    host.querySelectorAll('[data-cal-ymd]').forEach(function (el) {
      el.classList.remove('is-avail-selected', 'is-range-pick', 'is-range-edge');
      var ymd = el.getAttribute('data-cal-ymd');
      if (!ymd) return;
      if (ringYmdCompare_(ymd, deskAvailRange.start) >= 0 && ringYmdCompare_(ymd, deskAvailRange.end) <= 0) {
        el.classList.add('is-range-pick');
      }
      if (ymd === deskAvailRange.start || ymd === deskAvailRange.end) el.classList.add('is-range-edge');
    });
  }

  function fleetPaintDeskDragPreview_(startYmd, endYmd) {
    var host = document.getElementById('fleetCalDesk');
    if (!host) return;
    var r = fleetDeskRangeBetween_(startYmd, endYmd);
    host.querySelectorAll('[data-cal-ymd]').forEach(function (el) {
      el.classList.remove('is-drag-preview', 'is-drag-edge');
      var ymd = el.getAttribute('data-cal-ymd');
      if (!ymd) return;
      if (ringYmdCompare_(ymd, r.start) >= 0 && ringYmdCompare_(ymd, r.end) <= 0) el.classList.add('is-drag-preview');
      if (ymd === r.start || ymd === r.end) el.classList.add('is-drag-edge');
    });
  }

  function fleetClearDeskDragPreview_() {
    var host = document.getElementById('fleetCalDesk');
    if (!host) return;
    host.querySelectorAll('.is-drag-preview, .is-drag-edge').forEach(function (el) {
      el.classList.remove('is-drag-preview', 'is-drag-edge');
    });
  }

  function renderDeskDualCalendar_() {
    var host = document.getElementById('fleetCalDesk');
    if (!host) return;
    var nm = fleetCalNextMonth_(calYear, calMonth);
    var titleEl = document.querySelector('[data-cal-title="fleetCalDesk"]');
    if (titleEl) {
      titleEl.textContent = calYear + '年' + calMonth + '月〜' + nm.y + '年' + nm.m + '月';
    }
    var a = renderCalendarInto_('fleetCalDesk', '', calYear, calMonth) || '';
    var b = renderCalendarInto_('fleetCalDesk', '', nm.y, nm.m) || '';
    host.innerHTML = '<div class="ring-fleet-desk-cal-pair">' +
      '<section class="ring-fleet-cal-month-block" aria-label="' + fleetEscape_(calYear + '年' + calMonth + '月') + '">' +
      '<h3 class="ring-fleet-cal-month-label">' + calYear + '年' + calMonth + '月</h3>' + a + '</section>' +
      '<section class="ring-fleet-cal-month-block" aria-label="' + fleetEscape_(nm.y + '年' + nm.m + '月') + '">' +
      '<h3 class="ring-fleet-cal-month-label">' + nm.y + '年' + nm.m + '月</h3>' + b + '</section></div>';
    fleetApplyDeskRangeHighlight_();
  }

  function fleetBindDeskCalPointer_() {
    var host = document.getElementById('fleetCalDesk');
    if (!host || host.dataset.calPointerBound === '1') return;
    host.dataset.calPointerBound = '1';
    host.addEventListener('pointerdown', function (ev) {
      if (!fleetIsDesktop_()) return;
      if (ev.button !== 0) return;
      if (ev.target.closest('.ring-fleet-cal-bar')) return;
      var day = ev.target.closest('[data-cal-ymd]');
      if (!day || !day.closest('#fleetCalDesk')) return;
      deskCalDrag.active = true;
      deskCalDrag.moved = false;
      deskCalDrag.startYmd = day.getAttribute('data-cal-ymd');
      deskCalDrag.endYmd = deskCalDrag.startYmd;
      deskCalDrag.pointerId = ev.pointerId;
      try { day.setPointerCapture(ev.pointerId); } catch (e) { /* ignore */ }
      fleetPaintDeskDragPreview_(deskCalDrag.startYmd, deskCalDrag.endYmd);
    });
    host.addEventListener('pointermove', function (ev) {
      if (!deskCalDrag.active || ev.pointerId !== deskCalDrag.pointerId) return;
      var day = document.elementFromPoint(ev.clientX, ev.clientY);
      if (day) day = day.closest('[data-cal-ymd]');
      if (!day) return;
      var ymd = day.getAttribute('data-cal-ymd');
      if (!ymd || ymd === deskCalDrag.endYmd) return;
      deskCalDrag.moved = true;
      deskCalDrag.endYmd = ymd;
      fleetPaintDeskDragPreview_(deskCalDrag.startYmd, deskCalDrag.endYmd);
    });
    function endDrag(ev) {
      if (!deskCalDrag.active || (ev.pointerId != null && deskCalDrag.pointerId !== ev.pointerId)) return;
      deskCalDrag.active = false;
      fleetClearDeskDragPreview_();
      fleetCommitDeskAvailRange_(deskCalDrag.startYmd, deskCalDrag.endYmd);
      deskCalDrag.pointerId = null;
    }
    host.addEventListener('pointerup', endDrag);
    host.addEventListener('pointercancel', endDrag);
  }

  function renderCalendars_() {
    if (fleetIsDesktop_()) {
      renderDeskDualCalendar_();
      renderCalendarInto_('fleetCalMob', 'ring-fleet-cal-mob', calYear, calMonth);
      return;
    }
    renderCalendarInto_('fleetCalMob', 'ring-fleet-cal-mob is-month-compact', calYear, calMonth);
  }

  function closeMobDetailSheet_(opts) {
    var clearSelection = !opts || opts.clearSelection !== false;
    var sheet = document.getElementById('fleetMobDetailSheet');
    var back = document.getElementById('fleetMobDetailBackdrop');
    if (sheet) {
      sheet.hidden = true;
      sheet.setAttribute('aria-hidden', 'true');
    }
    if (back) {
      back.hidden = true;
      back.setAttribute('aria-hidden', 'true');
    }
    document.body.classList.remove('ring-fleet-sheet-open');
    if (clearSelection) selectedBookingId = '';
  }

  function openMobDetailSheet_() {
    if (!fleetContextCurrent_() || fleetIsDesktop_() || !selectedBookingId) return;
    var sheet = document.getElementById('fleetMobDetailSheet');
    var back = document.getElementById('fleetMobDetailBackdrop');
    var host = document.getElementById('fleetMobDetailHost');
    if (!sheet || !host) return;
    renderBookingDetailInto_(host);
    sheet.hidden = false;
    sheet.setAttribute('aria-hidden', 'false');
    if (back) {
      back.hidden = false;
      back.setAttribute('aria-hidden', 'false');
    }
    document.body.classList.add('ring-fleet-sheet-open');
  }

  function fleetCheckoutGate_(b) {
    return typeof ringFleetCheckoutStartAllowed_ === 'function'
      ? ringFleetCheckoutStartAllowed_(b)
      : { ok: false, error: 'BOOKING_STATUS_INVALID' };
  }

  function fleetCheckoutGateOrToast_(b) {
    var gate = fleetCheckoutGate_(b);
    if (gate.ok) return true;
    var msg = gate.error === 'BOOKING_CHECKOUT_TOO_EARLY'
      ? '予約開始日（' + (gate.minStartDate || b.startDate) + '）以降に貸出開始できます。'
      : 'この予約の状態では貸出開始できません。';
    if (typeof showToast === 'function') showToast('warning', msg);
    return false;
  }

  function fleetRescheduleFmtRange_(startYmd, endYmd) {
    var fmt = typeof ringFormatVehicleDateJst_ === 'function' ? ringFormatVehicleDateJst_ : function (s) { return s; };
    return fmt(startYmd) + '〜' + fmt(endYmd);
  }

  function fleetBookingsExcludingId_(list, excludeBookingId) {
    var ex = String(excludeBookingId || '').trim();
    return (list || []).filter(function (b) {
      return b && String(b.bookingId || '').trim() !== ex;
    });
  }

  function fleetVinRangeAvailableExcluding_(vin, startYmd, endYmd, excludeBookingId) {
    if (!vin || !startYmd || !endYmd) return false;
    if (ringYmdCompare_(startYmd, endYmd) > 0) return false;
    var others = fleetBookingsExcludingId_(fleetBookingsForShop_(bookingsCache), excludeBookingId);
    return ringFleetVinAvailableForRange_(vin, startYmd, endYmd, others);
  }

  function fleetFindVinRangeBlocker_(vin, startYmd, endYmd, excludeBookingId) {
    var others = fleetBookingsExcludingId_(fleetBookingsForShop_(bookingsCache), excludeBookingId);
    for (var i = 0; i < others.length; i++) {
      if (ringFleetBookingBlocksVinForRange_(others[i], vin, startYmd, endYmd)) return others[i];
    }
    return null;
  }

  function fleetRescheduleBlockedMsg_(blocker) {
    if (!blocker) return '';
    if (String(blocker.status || '').toLowerCase() === 'out') {
      return 'この車両は未返却の貸出があります。別の日付を選んでください。';
    }
    return '予約済み期間：' + fleetRescheduleFmtRange_(blocker.startDate, blocker.endDate);
  }

  function bindBookingDetailActions_(host, b) {
    var actions = host.querySelector('.ring-fleet-detail-actions');
    if (!actions) return;
    actions.innerHTML = '';
    var canEdit = ringCanEditManagedVehicles_(profile);
    if (!canEdit) return;
    function addBtn(label, status, primary) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = label;
      if (primary) btn.className = 'primary';
      btn.onclick = function () { fleetUpdateBooking_(b.bookingId, { status: status }); };
      actions.appendChild(btn);
    }
    if (b.status === 'reserved' || b.status === 'confirmed') {
      var canOut = fleetCheckoutGate_(b);
      if (canOut.ok) {
        addBtn('貸出開始', 'out', true);
      } else if (canOut.error === 'BOOKING_CHECKOUT_TOO_EARLY') {
        var note = document.createElement('p');
        note.className = 'ring-fleet-checkout-early-hint';
        note.textContent = '予約は完了しています。貸出開始は ' + (canOut.minStartDate || b.startDate) + ' から行えます。';
        actions.appendChild(note);
      }
      var resBtn = document.createElement('button');
      resBtn.type = 'button';
      resBtn.textContent = '日程変更';
      resBtn.onclick = function () { openFleetReschedule_(b.bookingId); };
      actions.appendChild(resBtn);
      addBtn('キャンセル', 'cancelled', false);
    }
    if (b.status === 'out') {
      var resOutBtn = document.createElement('button');
      resOutBtn.type = 'button';
      resOutBtn.textContent = '日程変更';
      resOutBtn.onclick = function () { openFleetReschedule_(b.bookingId); };
      actions.appendChild(resOutBtn);
      var retBtn = document.createElement('button');
      retBtn.type = 'button';
      retBtn.className = 'primary';
      retBtn.textContent = '返却受付へ';
      retBtn.onclick = function () {
        closeMobDetailSheet_({ clearSelection: false });
        openReturnReception_({ returnBookingId: b.bookingId, step: 'return_confirm' });
      };
      actions.appendChild(retBtn);
    }
    var saveEnd = document.createElement('button');
    saveEnd.type = 'button';
    saveEnd.textContent = '返却予定日を更新';
    saveEnd.onclick = function () {
      var el = host.querySelector('.fleet-detail-end');
      fleetUpdateBooking_(b.bookingId, { endDate: el ? el.value : b.endDate });
    };
    actions.appendChild(saveEnd);
    var saveLendee = document.createElement('button');
    saveLendee.type = 'button';
    saveLendee.textContent = '貸出先を保存';
    saveLendee.onclick = function () {
      var le = host.querySelector('.fleet-detail-lendee');
      fleetUpdateBooking_(b.bookingId, { lendeeName: le ? le.value : lendeeVal });
    };
    actions.appendChild(saveLendee);
    var endInput = host.querySelector('.fleet-detail-end');
    bindFleetDateField_(endInput);
  }

  function renderBookingDetailInto_(host) {
    if (!host) return;
    var b = bookingsCache.find(function (x) { return x.bookingId === selectedBookingId; });
    var isDeskPanel = host.id === 'fleetDetailPanel';
    if (!b) {
      if (isDeskPanel) {
        host.innerHTML = '<h3>予約の詳細</h3><p class="ring-fleet-detail-placeholder">カレンダーで予定を選ぶか「＋ 新しい予約」から登録してください。<br>予約の保存だけでは貸出は始まりません。開始日に「貸出開始」を押してください。</p>';
      } else {
        host.innerHTML = '<p class="ring-fleet-detail-placeholder">予定が見つかりません</p>';
      }
      return;
    }
    var stLabel = fleetBookingStatusLabel_(b.status);
    var plate = fleetPlateSuffixForBooking_(b);
    var head = isDeskPanel ? '<h3>予約の詳細</h3>' : '';
    var sheetDue = b.status === 'out' ||
      ((b.status === 'reserved' || b.status === 'confirmed') && fleetCheckoutGate_(b).ok);
    var lendeeVal = fleetBookingLendee_(b);
    host.innerHTML = head + '<h4 style="margin:0 0 8px;font-size:15px;font-weight:900;">' + fleetEscape_(fleetVehicleName_(b.vin)) + '</h4>' +
      '<p style="margin:0 0 8px;font-size:12px;font-weight:700;color:#475569">下4桁：' + fleetEscape_(plate) + '<br>状態：' + fleetEscape_(stLabel) + '<br>' +
      fleetEscape_(b.startDate) + ' 〜 ' + fleetEscape_(b.endDate) + '</p>' +
      '<div class="ring-fleet-field"><label for="fleetDetailLendee">貸出先</label>' +
      '<input type="text" id="fleetDetailLendee" class="fleet-detail-lendee" maxlength="60" autocomplete="off" ' +
      'placeholder="任意（例：タナカ様）" value="' + fleetEscape_(lendeeVal) + '"></div>' +
      (sheetDue
        ? '<a class="car-info-btn ring-fleet-checksheet-link" href="' + fleetEscape_(fleetCheckSheetUrl_(b.vin)) + '">📋 チェックシート（貸出・返却時）</a>'
        : '') +
      '<div class="ring-fleet-field"><label>返却予定日</label><input type="date" class="fleet-detail-end" value="' + fleetEscape_(b.endDate) + '"></div>' +
      '<div class="ring-fleet-detail-actions"></div>';
    bindBookingDetailActions_(host, b);
  }

  function renderDetailPanel_() {
    var desk = document.getElementById('fleetDetailPanel');
    if (desk) renderBookingDetailInto_(desk);
    if (!fleetIsDesktop_() && selectedBookingId) openMobDetailSheet_();
    else if (!selectedBookingId) closeMobDetailSheet_();
  }

  async function fleetUpdateBooking_(bookingId, patch) {
    if (!fleetRequireOnline_()) return;
    var cur = bookingsCache.find(function (b) { return b.bookingId === bookingId; });
    if (!cur) return;
    if (patch.status === 'out' && cur.status !== 'out') {
      if (patch.startDate && patch.startDate !== cur.startDate) {
        if (typeof showToast === 'function') {
          showToast('warning', '開始日の変更と貸出開始は同時にできません。先に開始日を保存してください。');
        }
        return;
      }
      if (baseServerRevMissing_(cur)) {
        if (typeof showToast === 'function') {
          showToast('warning', '予約の最新状態を取得してから貸出開始してください。');
        }
        return;
      }
      if (!fleetCheckoutGateOrToast_(cur)) return;
      var freshOut = await fleetSyncBookingsFresh_();
      if (!fleetRequireOnline_()) return;
      if (!freshOut || !freshOut.ok) {
        if (typeof showToast === 'function') {
          showToast('error', '最新の予約状況を確認できないため貸出開始していません。接続を確認して再試行してください。');
        }
        return;
      }
      cur = bookingsCache.find(function (b) { return b.bookingId === bookingId; });
      if (!cur) {
        if (typeof showToast === 'function') showToast('warning', 'この予約は見つかりませんでした。画面を更新してください。');
        return;
      }
      if (baseServerRevMissing_(cur)) {
        if (typeof showToast === 'function') showToast('warning', '予約の最新状態を取得してから貸出開始してください。');
        return;
      }
      if (!fleetCheckoutGateOrToast_(cur)) return;
    }
    if (!fleetBookingsSyncOk) {
      var offline = typeof navigator !== 'undefined' && navigator.onLine === false;
      if (offline) {
        if (typeof showToast === 'function') {
          showToast('error', 'オフラインのため予約の変更はできません。接続後に再試行してください。');
        }
        return;
      }
      if (typeof showToast === 'function') {
        showToast('info', '最新の予約を確認しています…');
      }
      await refreshBookings_();
      if (!fleetRequireOnline_()) return;
      cur = bookingsCache.find(function (b) { return b.bookingId === bookingId; });
      if (!cur) return;
      if (!fleetBookingsSyncOk) {
        if (typeof showToast === 'function') {
          showToast('error', '最新の予約を取得できません。しばらくしてから再試行してください。');
        }
        return;
      }
    }
    if (!fleetRequireOnline_()) return;
    if (typeof showLoading === 'function') showLoading('保存中', '保存しています…');
    var json = null;
    try {
      var payload = {
        bookingId: bookingId,
        baseServerRev: cur.serverRev,
        status: patch.status || cur.status,
        startDate: patch.startDate || cur.startDate,
        endDate: patch.endDate || cur.endDate,
        lendeeName: patch.lendeeName != null ? fleetNormalizeLendeeInput_(patch.lendeeName) : fleetBookingLendee_(cur)
      };
      json = await updateFleetBookingOnServer_(payload);
    } catch (err) {
      if (!fleetContextCurrent_()) return;
      if (typeof showToast === 'function') {
        showToast('error', '通信に失敗しました。接続を確認して再試行してください。');
      }
    } finally {
      if (fleetContextCurrent_() && typeof hideLoading === 'function') hideLoading();
    }
    if (!fleetContextCurrent_()) return;
    if (json && json.success) {
      var okMsg = '予約情報を更新しました';
      if (patch.status === 'out' && cur.status !== 'out') okMsg = '貸出を開始しました';
      else if (patch.status === 'cancelled') okMsg = '予約をキャンセルしました';
      else if (patch.status === 'returned') okMsg = '返却を完了しました';
      else if (!patch.status && (patch.startDate || patch.endDate)) okMsg = '予約の日程を変更しました';
      if (patch.status === 'cancelled') selectedBookingId = '';
      fleetRenderAfterServerWrite_();
      if (wizardState && wizardState.kind === 'reschedule' && wizardState.step === 'ok' &&
          !patch.status && (patch.startDate || patch.endDate)) {
        fleetRescheduleCloseToDetail_();
      }
      if (typeof showToast === 'function') showToast('success', okMsg);
    } else if (json && typeof showToast === 'function') {
      var err = String(json.error || '');
      if (err === 'BOOKING_CHECKOUT_TOO_EARLY') {
        showToast('warning', '予約開始日（' + (json.minStartDate || cur.startDate) + '）以降に貸出開始できます。');
      } else if (err === 'BOOKING_BASE_REV_REQUIRED' || err === 'BOOKING_CONFLICT') {
        showToast('warning', '他の端末で更新されています。画面を更新してから再試行してください。');
        await refreshBookings_();
        if (!fleetContextCurrent_()) return;
      } else if (err === 'BOOKING_PATCH_INVALID') {
        showToast('warning', '開始日の変更と貸出開始は同時にできません。');
      } else if (err === 'BOOKING_OVERLAP' || err === 'FLEET_VEHICLE_OUTSTANDING') {
        showToast('warning', 'ご希望の期間は他の予約と重複しています。画面を更新してから再試行してください。');
        await refreshBookings_();
        if (!fleetContextCurrent_()) return;
      } else {
        showToast('error', fleetUserBookingErr_(err, '予約情報を更新できませんでした。'));
      }
    }
  }

  function fleetUnresolvedBannerHtml_() {
    if (typeof ringListFleetUnresolved_ !== 'function') return '';
    var list = ringListFleetUnresolved_(profile);
    if (!list.length) return '';
    var u = list[0];
    var snap = u.snapshot || {};
    return '<div class="ring-fleet-unresolved-banner" id="fleetUnresolvedBanner">' +
      '<p style="margin:0 0 8px;font-size:12px;font-weight:800;color:#b45309;">未解決の予約送信があります（' +
      fleetEscape_(fleetVehicleName_(snap.vin)) + ' ' + fleetEscape_(snap.startDate) + '〜' + fleetEscape_(snap.endDate) + '）。' +
      '保存結果を確認してください。</p>' +
      '<button type="button" class="ring-fleet-unresolved-recheck" id="fleetUnresolvedRecheck">保存結果を再確認</button></div>';
  }

  function fleetRenderUnresolvedChoice_(host, res, vin, startDate, endDate) {
    if (!host || !res) return;
    var ex = res.existingBooking;
    var snap = res.unresolved && res.unresolved.snapshot ? res.unresolved.snapshot : null;
    var html = '<div class="ring-fleet-unresolved-choice">' +
      '<p style="margin:0 0 10px;font-size:12px;font-weight:800;color:#b45309;">' + fleetEscape_(res.message || '保存結果の確認が必要です') + '</p>';
    if (ex) {
      html += '<p style="margin:0 0 12px;font-size:12px;font-weight:700;color:#475569">サーバー上の予約：' +
        fleetEscape_(fleetVehicleName_(ex.vin)) + ' ' + fleetEscape_(ex.startDate) + '〜' + fleetEscape_(ex.endDate) + '</p>';
    }
    if (snap) {
      html += '<p style="margin:0 0 12px;font-size:12px;font-weight:700;color:#64748b">前回の送信内容：' +
        fleetEscape_(fleetVehicleName_(snap.vin)) + ' ' + fleetEscape_(snap.startDate) + '〜' + fleetEscape_(snap.endDate) + '</p>';
    }
    html += '<div class="ring-fleet-unresolved-actions">' +
      '<button type="button" class="primary" id="fleetResolveUpdate">元の予約を変更する</button>' +
      '<button type="button" id="fleetResolveAddNew">別の新しい予約として追加</button>' +
      '<button type="button" id="fleetResolveRecheck">保存結果を再確認</button>' +
      '</div></div>';
    host.insertAdjacentHTML('beforeend', html);
    var btnUpd = host.querySelector('#fleetResolveUpdate');
    var btnAdd = host.querySelector('#fleetResolveAddNew');
    var btnRe = host.querySelector('#fleetResolveRecheck');
    if (btnUpd && ex) {
      btnUpd.onclick = function () {
        fleetApplyCreateSubmitResult_(vin, startDate, endDate, {
          resolveAction: 'update_existing',
          bookingId: ex.bookingId,
          baseServerRev: ex.serverRev
        });
      };
    } else if (btnUpd) btnUpd.disabled = true;
    if (btnAdd) {
      btnAdd.onclick = function () {
        var ok = typeof confirm === 'function' ? confirm('2件目の予約を追加します。よろしいですか？') : true;
        if (!ok) return;
        fleetApplyCreateSubmitResult_(vin, startDate, endDate, { resolveAction: 'add_new', confirmAddNew: true });
      };
    }
    if (btnRe) {
      btnRe.onclick = function () {
        fleetApplyCreateSubmitResult_(vin, startDate, endDate, { recheckOnly: true });
      };
    }
  }

  function fleetCreateSubmitHost_() {
    var wiz = document.getElementById('fleetNewBookingWizard');
    if (wiz && !wiz.hidden && wiz.querySelector('.ring-fleet-wizard-inner')) {
      return wiz.querySelector('.ring-fleet-wizard-inner');
    }
    return document.getElementById('fleetDetailPanel');
  }

  async function fleetApplyCreateSubmitResult_(vin, startDate, endDate, extra, checkAvailability) {
    if (!fleetRequireOnline_()) return;
    var state = wizardState;
    var host = fleetCreateSubmitHost_();
    if (!state || state.kind !== 'booking' || state.busy || !host) return;
    var saveBtn = host.querySelector('#fleetNewSaveBtn');
    state.busy = true;
    host.setAttribute('aria-busy', 'true');
    var controls = Array.prototype.map.call(host.querySelectorAll('button'), function (el) {
      var wasDisabled = el.disabled;
      el.disabled = true;
      return { el: el, disabled: wasDisabled };
    });
    var oldLabel = saveBtn && saveBtn.textContent;
    if (saveBtn) saveBtn.textContent = checkAvailability ? '空き状況を確認中…' : '保存結果を確認中…';
    function current() { return fleetContextCurrent_() && wizardState === state && host.isConnected; }
    if (typeof showLoading === 'function') showLoading('確認中', '最新の予約状況を確認しています…');
    var result = null;
    try {
      if (checkAvailability) {
        if (typeof ringFleetEnsureBookingsSyncedForRange_ !== 'function') throw new Error('API missing');
        var syncRes = await ringFleetEnsureBookingsSyncedForRange_(profile, startDate, endDate);
        if (!current()) return;
        fleetBookingsSyncOk = !!syncRes.ok;
        fleetApplyBookingsCache_(syncRes.bookings || bookingsCache);
        if (!syncRes.ok || !fleetRequireOnline_()) {
          if (typeof showToast === 'function') showToast('error', '最新の空き状況を確認できません。接続を確認してから保存してください。');
          return;
        }
        if (!(typeof ringListFleetUnresolved_ === 'function' && ringListFleetUnresolved_(profile).length) &&
            !ringFleetVinAvailableForRange_(vin, startDate, endDate, fleetBookingsForShop_(bookingsCache))) {
          if (typeof showToast === 'function') showToast('warning', 'この期間には既に予約が入っているか、未返却の車両です。日付を変更して再検索してください。');
          return;
        }
      }
      if (!current() || !fleetRequireOnline_()) return;
      if (typeof ringFleetHandleCreateBookingSubmit_ !== 'function') throw new Error('API missing');
      if (saveBtn) saveBtn.textContent = '登録中…';
      var payload = Object.assign({
        vin: vin,
        startDate: startDate,
        endDate: endDate,
        status: 'reserved',
        lendeeName: fleetReadWizardLendee_()
      }, extra || {});
      result = await ringFleetHandleCreateBookingSubmit_(profile, payload);
    } catch (err) {
      if (current() && typeof showToast === 'function') showToast('error', '通信に失敗しました。入力内容を保持しています。接続を確認して再試行してください。');
    } finally {
      state.busy = false;
      if (current()) {
        if (typeof hideLoading === 'function') hideLoading();
        host.removeAttribute('aria-busy');
        controls.forEach(function (x) { x.el.disabled = x.disabled; });
        if (saveBtn) saveBtn.textContent = oldLabel;
      }
    }
    if (!current()) return;
    fleetHandleCreateOutcome_(result, vin, startDate, endDate, host);
  }

  function fleetHandleCreateOutcome_(result, vin, startDate, endDate, host) {
    if (!result) return;
    var choice = host && host.querySelector('.ring-fleet-unresolved-choice');
    if (choice) choice.remove();
    if (result.outcome === 'definite_reject' || (result.outcome === 'error' && result.json &&
        (result.json.error === 'BOOKING_OVERLAP' || result.json.error === 'FLEET_VEHICLE_OUTSTANDING'))) {
      var msg = result.message || (typeof ringFleetBookingCreateRejectMessage_ === 'function'
        ? ringFleetBookingCreateRejectMessage_(result.json) : '予約を保存できませんでした');
      if (typeof showToast === 'function') showToast('error', msg);
      refreshBookings_();
      if (wizardState && wizardState.kind === 'booking') {
        wizardState.step = wizardState.mode === 'by_date' ? 'list' : 'vin_dates';
        renderNewBookingWizard_();
      }
      return;
    }
    if (result.outcome === 'success' || result.outcome === 'resolved_update' || result.outcome === 'resolved_new') {
      var bk = result.json && result.json.booking;
      if (bk) {
        // Saving a reservation completes registration; checkout is a separate action opened from the calendar.
        closeNewBookingWizard_();
        closeMobDetailSheet_({ clearSelection: true });
        selectedBookingId = '';
        renderDetailPanel_();
        if (typeof loadFleetBookingsLocal_ === 'function' && typeof ringFleetPersistBookingLocally_ === 'function' &&
            !loadFleetBookingsLocal_(profile).some(function (x) { return x && String(x.bookingId) === String(bk.bookingId); })) {
          ringFleetPersistBookingLocally_(profile, bk);
        }
        fleetRenderAfterServerWrite_();
        if (typeof showToast === 'function') {
          showToast('success', result.outcome === 'resolved_update' ? '予約情報を更新しました' : '予約を登録しました');
        }
      }
      return;
    }
    if (result.outcome === 'ambiguous') {
      if (typeof showToast === 'function') {
        showToast('warning', result.message || '予約の保存結果を確認できませんでした');
      }
      if (host) fleetRenderUnresolvedChoice_(host, { message: result.message, unresolved: result.unresolved }, vin, startDate, endDate);
      return;
    }
    if (result.outcome === 'needs_user_choice') {
      if (typeof showToast === 'function') showToast('warning', result.message || '操作を選んでください');
      if (host) fleetRenderUnresolvedChoice_(host, result, vin, startDate, endDate);
      return;
    }
    if (result.outcome === 'not_found_confirm') {
      if (typeof showToast === 'function') showToast('warning', result.message || '');
      if (!host) return;
      var wrap = document.createElement('div');
      wrap.className = 'ring-fleet-unresolved-choice';
      wrap.innerHTML = '<p style="font-size:12px;font-weight:700;color:#475569;margin:0 0 8px;">' + fleetEscape_(result.message) + '</p>' +
        '<button type="button" class="primary" id="fleetProceedCreate">元の送信を無効化して新規登録</button>';
      host.appendChild(wrap);
      host.querySelector('#fleetProceedCreate').onclick = function () {
        var okVoid = typeof confirm === 'function'
          ? confirm('元の送信要求をサーバーで無効化し、現在の内容で新規登録します。よろしいですか？')
          : true;
        if (!okVoid) return;
        fleetApplyCreateSubmitResult_(vin, startDate, endDate, { voidOriginalAndCreate: true, confirmProceed: true });
      };
      return;
    }
    if (result.outcome === 'error' && typeof showToast === 'function') {
      showToast('error', fleetUserBookingErr_(result.json && result.json.error, '予約を登録できませんでした。'));
    }
  }

  function fleetConfirmPanelHtml_(vin, startDate, endDate, extraWarn) {
    return (extraWarn || '') +
      fleetUnresolvedBannerHtml_() +
      '<h3 style="margin:0 0 8px;font-size:15px;font-weight:900;">予約内容の確認</h3>' +
      '<p style="font-size:12px;font-weight:700;color:#475569">' + fleetEscape_(fleetVehicleName_(vin)) + '</p>' +
      '<p style="font-size:13px;font-weight:800;margin:8px 0;">' + fleetEscape_(startDate) + ' 〜 ' + fleetEscape_(endDate) + '</p>' +
      fleetLendeeFieldHtml_(wizardState && wizardState.lendeeName) +
      '<p class="ring-fleet-avail-hint" style="margin-bottom:6px;">表示時点の空き状況です。保存時にサーバーで重複を確認します。</p>' +
      '<p class="ring-fleet-avail-hint" style="margin-bottom:10px;font-size:11px;color:#64748b;">ここでは予約の登録のみ行います。お客様への貸出は、開始日に「貸出開始」を押してください。</p>' +
      '<button type="button" class="primary ring-fleet-confirm-save" id="fleetNewSaveBtn">予約を登録</button>';
  }

  function fleetBindConfirmSave_(host, vin, startDate, endDate) {
    if (!host) return;
    var recheck = host.querySelector('#fleetUnresolvedRecheck');
    if (recheck) {
      recheck.onclick = function () {
        var s = document.getElementById('fleetNewStart') ? document.getElementById('fleetNewStart').value : startDate;
        var e = document.getElementById('fleetNewEnd') ? document.getElementById('fleetNewEnd').value : endDate;
        fleetApplyCreateSubmitResult_(vin, s, e, { recheckOnly: true });
      };
    }
    var saveBtn = host.querySelector('#fleetNewSaveBtn');
    if (!saveBtn) return;
    saveBtn.onclick = function () {
      fleetReadWizardLendee_();
      fleetTrySaveNewBooking_(vin, startDate, endDate, host);
    };
  }

  async function fleetTrySaveNewBooking_(vin, startDate, endDate, host) {
    if (!host || host !== fleetCreateSubmitHost_()) return;
    await fleetApplyCreateSubmitResult_(vin, startDate, endDate, {}, true);
  }

  // One modal owns both entry points; background detail/calendar refresh cannot replace it.
  function openNewBookingForm_(vin, startDate, endDate) {
    var today = ringFormatDateToYmdJst_(new Date());
    openNewBookingWizard_({ mode: 'by_date', step: 'confirm', vin: vin,
      startDate: startDate || today, endDate: endDate || today });
  }

  function fleetAvailStaleBanner_() {
    if (fleetBookingsSyncOk) return '';
    var offline = typeof navigator !== 'undefined' && navigator.onLine === false;
    var cls = offline ? 'ring-fleet-avail-warn ring-fleet-avail-offline' : 'ring-fleet-avail-warn';
    var msg = offline || fleetSyncFromCache
      ? '最新の空き状況を確認できません。オフラインまたは同期失敗のため、新規予約の保存はできません。'
      : '空き表示は参考情報です。保存前に最新の予約状況を再取得します。';
    return '<div class="' + cls + '">' + fleetEscape_(msg) + '</div>';
  }

  function fleetVehicleAvailMetaHtml_(car) {
    var enriched = typeof ringEnrichVehicleListRow_ === 'function' ? ringEnrichVehicleListRow_(car) : car;
    var catLabel = ringVehicleCategoryLabelJa_(car.vehicleCategory);
    var plate = fleetPlateLabelForCar_(car);
    plate = plate !== '—' ? 'ナンバー：' + plate : 'ナンバー：未登録';
    var insp = fmtInspect_(enriched._nextInspect);
    var shaken = car.nextShaken ? fmtInspect_(car.nextShaken) : '---';
    var shakenWarn = ringShakenTwoMonthsBeforeYmd_(car.nextShaken);
    var notes = '';
    if (shakenWarn) notes += ' ※車検2か月前（' + shakenWarn + '）';
    return '<p class="meta-line">' + fleetEscape_(catLabel) + ' · ' + fleetEscape_(plate) + '</p>' +
      '<p class="meta-line">次回点検：' + fleetEscape_(insp) + ' · 車検満了：' + fleetEscape_(shaken) + fleetEscape_(notes) + '</p>';
  }

  function closeNewBookingWizard_() {
    if (wizardState && (wizardState.busy || wizardState.readPending) && typeof hideLoading === 'function') hideLoading();
    wizardState = null;
    var el = document.getElementById('fleetNewBookingWizard');
    if (el) { el.hidden = true; el.setAttribute('aria-hidden', 'true'); el.innerHTML = ''; }
  }

  function fleetOutBookingCardHtml_(b, pickAttr) {
    var car = fleetFindVehicle_(b.vin);
    var name = car ? ringVehicleListDisplayName_(car) : fleetVehicleName_(b.vin);
    var catLabel = car ? ringVehicleCategoryLabelJa_(car.vehicleCategory) : '';
    var plate = fleetPlateLabelForCar_(car);
    plate = plate !== '—' ? 'ナンバー：' + plate : 'ナンバー：未登録';
    var overdue = ringFleetOutReturnIsOverdue_(b)
      ? '<p class="ring-fleet-out-overdue">⚠ 返却予定を過ぎています（返却遅れ）</p>' : '';
    var attr = pickAttr ? ' ' + pickAttr + '="' + fleetEscape_(b.bookingId) + '"' : '';
    var lendee = fleetBookingLendee_(b);
    return '<div class="ring-fleet-avail-card"' + attr + '><strong>' + fleetEscape_(name) + '</strong>' +
      '<p class="meta-line">' + fleetEscape_(catLabel) + ' · ' + fleetEscape_(plate) + '</p>' +
      '<p class="meta-line">貸出：' + fleetEscape_(b.startDate) + ' 〜 返却予定：' + fleetEscape_(b.endDate) + '</p>' +
      (lendee ? '<p class="meta-line">貸出先：' + fleetEscape_(lendee) + '</p>' : '') +
      overdue + '</div>';
  }

  function renderDeskOutPanel_() {
    var host = document.getElementById('fleetDeskOutPanel');
    if (!host) return;
    var outs = ringFleetListActiveOutBookings_(profile, bookingsCache);
    if (!outs.length) {
      host.innerHTML = '<p style="font-size:12px;font-weight:700;color:#64748b;margin:0;">貸出中の車両はありません</p>';
      return;
    }
    host.innerHTML = outs.map(function (b) { return fleetOutBookingCardHtml_(b, 'data-desk-return'); }).join('');
    host.querySelectorAll('[data-desk-return]').forEach(function (card) {
      card.onclick = function () {
        openReturnReception_({ returnBookingId: card.getAttribute('data-desk-return'), step: 'return_confirm' });
      };
    });
  }

  async function fleetSyncBookingsFresh_() {
    if (!fleetRequireOnline_()) return { ok: false, bookings: [], error: 'OFFLINE_OR_SESSION_CHANGED' };
    var today = ringFormatDateToYmdJst_(new Date());
    var syncRes = await ringFleetEnsureBookingsSyncedForRange_(profile, today, today);
    if (!fleetContextCurrent_()) return { ok: false, bookings: [], error: 'STALE_SESSION' };
    fleetBookingsSyncOk = !!syncRes.ok;
    fleetSyncFromCache = !syncRes.ok;
    fleetApplyBookingsCache_(syncRes.bookings || []);
    return syncRes;
  }

  function openReturnReception_(preset) {
    var pre = Object.assign({}, preset || {});
    if (pre.bookingId && !pre.returnBookingId) pre.returnBookingId = pre.bookingId;
    wizardState = Object.assign({
      kind: 'return',
      step: 'return_list',
      returnBookingId: '',
      sheetChecked: false
    }, pre);
    if (typeof showLoading === 'function') showLoading('読込中', '読み込み中…');
    fleetSyncBookingsFresh_().finally(function () {
      if (!fleetContextCurrent_()) return;
      if (typeof hideLoading === 'function') hideLoading();
      renderReturnReception_();
      renderDeskOutPanel_();
    });
  }

  function renderReturnReception_() {
    var shell = document.getElementById('fleetNewBookingWizard');
    if (!shell || !wizardState || wizardState.kind !== 'return') return;
    shell.hidden = false;
    shell.setAttribute('aria-hidden', 'false');
    var title = wizardState.step === 'return_confirm' ? '返却の確認' : '返却受付';
    var inner = '<div class="ring-fleet-wizard-inner"><div class="ring-fleet-wizard-head">' +
      '<button type="button" class="ring-fleet-wizard-back"' + (wizardState.step === 'return_list' ? ' style="visibility:hidden"' : '') +
      '>戻る</button><h2>' + fleetEscape_(title) + '</h2>' +
      '<button type="button" class="ring-fleet-wizard-close">閉じる</button></div>';
    if (!fleetBookingsSyncOk) {
      inner += '<div class="ring-fleet-avail-warn ring-fleet-avail-offline">最新の貸出状況を確認できません。「更新」してから操作してください。</div>';
    }
    if (wizardState.step === 'return_list') {
      var outs = ringFleetListActiveOutBookings_(profile, bookingsCache);
      if (!outs.length) inner += '<p class="empty-msg">現在、貸出中の車両はありません</p>';
      outs.forEach(function (b) { inner += fleetOutBookingCardHtml_(b, 'data-ret-pick'); });
    } else if (wizardState.step === 'return_confirm') {
      var bk = bookingsCache.find(function (x) { return x.bookingId === wizardState.returnBookingId; });
      if (!bk || String(bk.status).toLowerCase() !== 'out') {
        inner += '<p class="empty-msg">この車両は既に返却済みか、情報が古いです。一覧を更新してください。</p>';
      } else {
        inner += fleetOutBookingCardHtml_(bk, '');
        inner += '<div class="ring-fleet-return-sheet-note">' +
          '<p style="margin:0;">貸出前チェックシートを確認し、車両状態を確認したうえで返却を完了してください。</p></div>';
        inner += '<label class="ring-fleet-return-check"><input type="checkbox" id="fleetReturnSheetOk"' +
          (wizardState.sheetChecked ? ' checked' : '') + '>' +
          '<span>チェックシートPDFを開き、車両状態の確認が完了した</span></label>';
        inner += '<button type="button" class="ring-fleet-confirm-save" id="fleetReturnCompleteBtn"' +
          (wizardState.sheetChecked && fleetBookingsSyncOk ? '' : ' disabled') + '>返却完了</button>';
      }
    }
    inner += '</div>';
    shell.innerHTML = inner;
    shell.querySelector('.ring-fleet-wizard-close').onclick = closeNewBookingWizard_;
    var back = shell.querySelector('.ring-fleet-wizard-back');
    if (back) back.onclick = function () {
      if (wizardState.step === 'return_confirm') {
        wizardState.step = 'return_list';
        wizardState.sheetChecked = false;
        renderReturnReception_();
      }
    };
    shell.querySelectorAll('[data-ret-pick]').forEach(function (card) {
      card.onclick = function () {
        wizardState.returnBookingId = card.getAttribute('data-ret-pick');
        wizardState.step = 'return_confirm';
        wizardState.sheetChecked = false;
        renderReturnReception_();
      };
    });
    var chk = document.getElementById('fleetReturnSheetOk');
    if (chk) {
      chk.onchange = function () {
        wizardState.sheetChecked = !!chk.checked;
        var btn = document.getElementById('fleetReturnCompleteBtn');
        if (btn) btn.disabled = !wizardState.sheetChecked || !fleetBookingsSyncOk;
      };
    }
    var completeBtn = document.getElementById('fleetReturnCompleteBtn');
    if (completeBtn) completeBtn.onclick = function () { fleetSubmitReturn_(wizardState.returnBookingId); };
  }

  async function fleetSubmitReturn_(bookingId) {
    if (!fleetRequireOnline_()) return;
    var bk = bookingsCache.find(function (x) { return x.bookingId === bookingId; });
    if (!bk || !wizardState || !wizardState.sheetChecked) return;
    if (!fleetBookingsSyncOk) {
      if (typeof showToast === 'function') showToast('error', '最新の貸出状況を確認できません。');
      return;
    }
    var btn = document.getElementById('fleetReturnCompleteBtn');
    if (btn && btn.disabled) return;
    if (btn) btn.disabled = true;
    if (typeof showLoading === 'function') showLoading('返却の記録', '保存しています…');
    var json = null;
    try {
      var fresh = await fleetSyncBookingsFresh_();
      if (!fleetRequireOnline_()) return;
      if (!fresh || !fresh.ok) {
        fleetBookingsSyncOk = false;
        if (typeof showToast === 'function') showToast('error', '最新の貸出状況を確認できないため返却していません。再接続・再ログイン後に確認してください。');
        return;
      }
      bk = bookingsCache.find(function (x) { return x.bookingId === bookingId; });
      if (!bk || String(bk.status).toLowerCase() !== 'out') {
        if (typeof showToast === 'function') showToast('warning', 'この車両は既に返却済みです。');
        closeNewBookingWizard_();
        renderDeskOutPanel_();
        renderFleetList_(true);
        return;
      }
      json = await updateFleetBookingOnServer_({
        bookingId: bookingId,
        baseServerRev: bk.serverRev,
        status: 'returned'
      });
    } catch (e) {
      if (!fleetContextCurrent_()) return;
      if (typeof showToast === 'function') showToast('error', '通信に失敗しました。');
    } finally {
      if (fleetContextCurrent_() && typeof hideLoading === 'function') hideLoading();
      if (btn) btn.disabled = false;
    }
    if (!fleetContextCurrent_()) return;
    if (json && json.success) {
      closeNewBookingWizard_();
      fleetRenderAfterServerWrite_();
      if (typeof showToast === 'function') showToast('success', '返却を完了しました');
      return;
    }
    if (json && json.error === 'BOOKING_CONFLICT') {
      await refreshBookings_();
      if (!fleetContextCurrent_()) return;
      if (typeof showToast === 'function') showToast('warning', '他のスタッフが先に更新しました。一覧を確認してください。');
      wizardState.step = 'return_list';
      renderReturnReception_();
      return;
    }
    if (typeof showToast === 'function') {
      showToast('error', fleetUserBookingErr_(json && json.error, '返却を完了できませんでした。'));
    }
  }

  function openFleetReschedule_(bookingId) {
    if (!fleetRequireOnline_()) return;
    var b = bookingsCache.find(function (x) { return x.bookingId === bookingId; });
    if (!b) return;
    var st = String(b.status || '').toLowerCase();
    if (st === 'returned' || st === 'cancelled') {
      if (typeof showToast === 'function') showToast('warning', 'この予約は日程変更できません。');
      return;
    }
    if (wizardState && (wizardState.busy || wizardState.readPending)) return;
    var ps = typeof ringParseYmdParts_ === 'function' ? ringParseYmdParts_(b.startDate) : null;
    if (ps) { calYear = ps.y; calMonth = ps.m; }
    closeMobDetailSheet_({ clearSelection: false });
    wizardState = {
      kind: 'reschedule',
      step: 'form',
      bookingId: bookingId,
      origStart: b.startDate,
      origEnd: b.endDate,
      startDate: b.startDate,
      endDate: b.endDate,
      lockStart: st === 'out',
      busy: false,
      readPending: false,
      blocker: null
    };
    renderFleetReschedule_();
  }

  function fleetRescheduleBooking_() {
    if (!wizardState || wizardState.kind !== 'reschedule') return null;
    return bookingsCache.find(function (x) { return x.bookingId === wizardState.bookingId; });
  }

  function renderRescheduleVinCal_(vin, excludeBookingId) {
    var weeks = ringFleetCalendarWeeksJst_(calYear, calMonth);
    var vinBookings = fleetBookingsExcludingId_(fleetBookingsForShop_(bookingsCache), excludeBookingId).filter(function (b) {
      return String(b.vin).toUpperCase() === String(vin).toUpperCase();
    });
    var html = '<div class="ring-fleet-vin-cal ring-fleet-cal-grid"><p class="ring-fleet-cal-month-title">' +
      calYear + '年' + calMonth + '月</p><div class="ring-fleet-cal-dow">' +
      ['日','月','火','水','木','金','土'].map(function (d) { return '<span>' + d + '</span>'; }).join('') + '</div>';
    weeks.forEach(function (week) {
      html += '<div class="ring-fleet-cal-week">';
      week.forEach(function (cell) {
        if (!cell) { html += '<div class="ring-fleet-cal-day is-out"></div>'; return; }
        var blocked = vinBookings.some(function (b) {
          return ringFleetBookingBlocksVinForRange_(b, vin, cell.ymd, cell.ymd);
        });
        html += '<span class="ring-fleet-cal-day' + (blocked ? ' is-booked' : '') + '">' + cell.d + '</span>';
      });
      html += '</div>';
    });
    html += '</div>';
    return html;
  }

  function fleetRescheduleValidateDates_(state) {
    if (!state) return '入力を確認してください。';
    if (ringYmdCompare_(state.startDate, state.endDate) > 0) {
      return '返却予定日は貸出開始日以降にしてください。';
    }
    if (state.lockStart && state.startDate !== state.origStart) {
      return '貸出中の予約は貸出開始日を変更できません。';
    }
    if (!state.lockStart && state.startDate === state.origStart && state.endDate === state.origEnd) {
      return '日程に変更がありません。';
    }
    return '';
  }

  function fleetRescheduleCloseToDetail_() {
    if (!wizardState || wizardState.kind !== 'reschedule') {
      closeNewBookingWizard_();
      return;
    }
    var bid = wizardState.bookingId;
    closeNewBookingWizard_();
    selectedBookingId = bid;
    renderDetailPanel_();
  }

  function fleetRescheduleOpenAltVehicles_() {
    if (!wizardState || wizardState.kind !== 'reschedule') return;
    var sd = wizardState.startDate;
    var ed = wizardState.endDate;
    var bid = wizardState.bookingId;
    closeNewBookingWizard_();
    selectedBookingId = bid;
    renderDetailPanel_();
    if (fleetIsDesktop_()) {
      var s = document.getElementById('fleetDeskAvailStart');
      var e = document.getElementById('fleetDeskAvailEnd');
      if (s) s.value = sd;
      if (e) e.value = ed;
      runDeskAvailSearch_();
      return;
    }
    openNewBookingWizard_({ mode: 'by_date', step: 'dates', startDate: sd, endDate: ed, keepSelection: true, restoreBookingId: bid });
  }

  async function fleetRescheduleCheck_() {
    if (!fleetRequireOnline_() || !wizardState || wizardState.kind !== 'reschedule' || wizardState.busy) return;
    var state = wizardState;
    var b = fleetRescheduleBooking_();
    if (!b) {
      if (typeof showToast === 'function') showToast('warning', '予約が見つかりません。画面を更新してください。');
      return;
    }
    var startEl = document.getElementById('fleetRescheduleStart');
    var endEl = document.getElementById('fleetRescheduleEnd');
    state.startDate = startEl ? startEl.value : state.startDate;
    state.endDate = endEl ? endEl.value : state.endDate;
    var vMsg = fleetRescheduleValidateDates_(state);
    if (vMsg) {
      if (typeof showToast === 'function') showToast('warning', vMsg);
      return;
    }
    state.busy = true;
    state.readPending = true;
    if (typeof showLoading === 'function') showLoading('確認中', '最新の予約状況を確認しています…');
    var syncRes;
    try {
      syncRes = await ringFleetEnsureBookingsSyncedForRange_(profile, state.startDate, state.endDate);
    } catch (eSync) {
      syncRes = { ok: false, bookings: bookingsCache };
    }
    state.readPending = false;
    state.busy = false;
    if (!fleetContextCurrent_() || wizardState !== state) return;
    if (typeof hideLoading === 'function') hideLoading();
    if (!syncRes.ok) {
      if (typeof showToast === 'function') showToast('error', '最新の空き状況を確認できません。接続を確認してから再試行してください。');
      return;
    }
    fleetBookingsSyncOk = true;
    fleetApplyBookingsCache_(syncRes.bookings || []);
    b = fleetRescheduleBooking_();
    if (!b) return;
    if (fleetVinRangeAvailableExcluding_(b.vin, state.startDate, state.endDate, state.bookingId)) {
      state.blocker = null;
      state.step = 'ok';
    } else {
      state.blocker = fleetFindVinRangeBlocker_(b.vin, state.startDate, state.endDate, state.bookingId);
      state.step = 'conflict';
    }
    renderFleetReschedule_();
  }

  async function fleetRescheduleConfirm_() {
    if (!fleetRequireOnline_() || !wizardState || wizardState.kind !== 'reschedule' || wizardState.step !== 'ok') return;
    var state = wizardState;
    if (!fleetRescheduleBooking_()) return;
    var patch = { endDate: state.endDate };
    if (!state.lockStart) patch.startDate = state.startDate;
    await fleetUpdateBooking_(state.bookingId, patch);
  }

  function renderFleetReschedule_() {
    var shell = document.getElementById('fleetNewBookingWizard');
    if (!shell || !wizardState || wizardState.kind !== 'reschedule') return;
    shell.hidden = false;
    shell.setAttribute('aria-hidden', 'false');
    shell.setAttribute('role', 'dialog');
    shell.setAttribute('aria-modal', 'true');
    shell.setAttribute('aria-label', '予約の日程変更');
    var b = fleetRescheduleBooking_();
    if (!b) {
      shell.innerHTML = '<div class="ring-fleet-wizard-inner"><p>予約が見つかりません。</p></div>';
      return;
    }
    var lendee = fleetBookingLendee_(b);
    var plate = fleetPlateSuffixForBooking_(b);
    var title = { form: '予約の日程変更', ok: '日程変更の確認', conflict: '空き状況' }[wizardState.step] || '予約の日程変更';
    var inner = '<div class="ring-fleet-wizard-inner"><div class="ring-fleet-wizard-head">' +
      '<button type="button" class="ring-fleet-wizard-back" id="fleetRescheduleBack">戻る</button>' +
      '<h2>' + fleetEscape_(title) + '</h2>' +
      '<button type="button" class="ring-fleet-wizard-close">閉じる</button></div>';
    if (!fleetBookingsSyncOk && wizardState.step === 'form') {
      inner += '<div class="ring-fleet-avail-warn ring-fleet-avail-offline">最新の予約情報を取得できていません。接続を確認してください。</div>';
    }
    if (wizardState.step === 'form') {
      inner += '<p style="font-size:14px;font-weight:900;margin:0 0 4px;">' + fleetEscape_(fleetVehicleName_(b.vin)) + '</p>' +
        '<p style="font-size:12px;font-weight:700;color:#64748b;margin:0 0 8px;">ナンバー下4桁：' + fleetEscape_(plate) +
        (lendee ? '<br>貸出先：' + fleetEscape_(lendee) : '') + '</p>' +
        '<p style="font-size:12px;font-weight:700;margin:0 0 12px;">現在の予約期間：<strong>' +
        fleetEscape_(fleetRescheduleFmtRange_(b.startDate, b.endDate)) + '</strong></p>';
      inner += renderRescheduleVinCal_(b.vin, wizardState.bookingId);
      inner += '<p style="font-size:11px;font-weight:700;color:#64748b;margin:8px 0;">赤い日は他の予約・貸出があります</p>';
      inner += '<div class="ring-fleet-field"><label for="fleetRescheduleStart">新しい貸出開始日</label>' +
        '<input type="date" id="fleetRescheduleStart" value="' + fleetEscape_(wizardState.startDate) + '"' +
        (wizardState.lockStart ? ' disabled' : '') + '></div>';
      inner += '<div class="ring-fleet-field"><label for="fleetRescheduleEnd">新しい返却予定日</label>' +
        '<input type="date" id="fleetRescheduleEnd" value="' + fleetEscape_(wizardState.endDate) + '"></div>';
      if (wizardState.lockStart) {
        inner += '<p class="ring-fleet-checkout-early-hint">貸出中は返却予定日のみ変更できます。</p>';
      }
      inner += '<button type="button" class="ring-fleet-confirm-save" id="fleetRescheduleCheck">空き状況を確認</button>';
    } else if (wizardState.step === 'ok') {
      inner += '<p class="ring-fleet-reschedule-ok" style="font-weight:800;color:#15803d;margin:0 0 12px;">ご希望の期間は貸出可能です。</p>' +
        '<p style="font-size:12px;font-weight:700;margin:0 0 6px;">現在の予約：<br><strong>' +
        fleetEscape_(fleetRescheduleFmtRange_(wizardState.origStart, wizardState.origEnd)) + '</strong></p>' +
        '<p style="font-size:12px;font-weight:700;margin:0 0 16px;">変更後の予約：<br><strong>' +
        fleetEscape_(fleetRescheduleFmtRange_(wizardState.startDate, wizardState.endDate)) + '</strong></p>' +
        '<button type="button" class="ring-fleet-confirm-save primary" id="fleetRescheduleConfirm">日程変更を確定</button>' +
        '<button type="button" class="ring-fleet-wizard-back" id="fleetRescheduleRepick" style="margin-top:10px;">日付を選び直す</button>';
    } else if (wizardState.step === 'conflict') {
      inner += '<p class="ring-fleet-reschedule-ng" style="font-weight:800;color:#b91c1c;margin:0 0 10px;">ご希望の期間は、すでに別のお客様の予約が入っています。</p>';
      if (wizardState.blocker && String(wizardState.blocker.status || '').toLowerCase() !== 'out') {
        inner += '<p style="font-size:12px;font-weight:700;margin:0 0 12px;">' + fleetEscape_(fleetRescheduleBlockedMsg_(wizardState.blocker)) + '</p>';
      } else if (wizardState.blocker) {
        inner += '<p style="font-size:12px;font-weight:700;margin:0 0 12px;">この車両は未返却のため、この期間は選べません。</p>';
      }
      inner += '<button type="button" class="ring-fleet-confirm-save" id="fleetRescheduleRepick">別の日付を選ぶ</button>' +
        '<button type="button" id="fleetRescheduleAltVeh" style="margin-top:10px;">同じ期間で空いている車両を探す</button>';
    }
    inner += '</div>';
    shell.innerHTML = inner;
    shell.querySelector('.ring-fleet-wizard-close').onclick = fleetRescheduleCloseToDetail_;
    var backBtn = shell.querySelector('#fleetRescheduleBack');
    if (backBtn) {
      backBtn.onclick = function () {
        if (wizardState.step === 'form') fleetRescheduleCloseToDetail_();
        else { wizardState.step = 'form'; renderFleetReschedule_(); }
      };
    }
    var checkBtn = shell.querySelector('#fleetRescheduleCheck');
    if (checkBtn) checkBtn.onclick = function () { fleetRescheduleCheck_(); };
    var confirmBtn = shell.querySelector('#fleetRescheduleConfirm');
    if (confirmBtn) confirmBtn.onclick = function () { fleetRescheduleConfirm_(); };
    var repick = shell.querySelector('#fleetRescheduleRepick');
    if (repick) repick.onclick = function () { wizardState.step = 'form'; renderFleetReschedule_(); };
    var altVeh = shell.querySelector('#fleetRescheduleAltVeh');
    if (altVeh) altVeh.onclick = function () { fleetRescheduleOpenAltVehicles_(); };
    var startInput = document.getElementById('fleetRescheduleStart');
    var endInput = document.getElementById('fleetRescheduleEnd');
    bindFleetDateField_(startInput);
    bindFleetDateField_(endInput);
  }

  function openNewBookingWizard_(preset) {
    if (!fleetContextCurrent_() || (wizardState && wizardState.busy)) return;
    closeNewBookingWizard_();
    var pre = preset || {};
    var restoreId = pre.restoreBookingId || '';
    if (!pre.keepSelection) {
      closeMobDetailSheet_({ clearSelection: true });
      selectedBookingId = '';
      renderDetailPanel_();
    }
    var today = ringFormatDateToYmdJst_(new Date());
    wizardState = Object.assign({
      kind: 'booking',
      step: 'choose',
      mode: '',
      catFilter: fleetTab === 'loaner' || fleetTab === 'rental' ? fleetTab : 'fleet_all',
      startDate: today,
      endDate: today,
      vin: '',
      pickStart: '',
      pickEnd: '',
      lendeeName: ''
    }, pre);
    renderNewBookingWizard_();
    if (pre.keepSelection && restoreId) {
      selectedBookingId = restoreId;
    }
  }

  function wizardGoBack_() {
    if (!wizardState || wizardState.busy) return;
    var flowDate = ['dates', 'list', 'confirm'];
    var flowVeh = ['vehicles', 'vin_cal', 'vin_dates', 'confirm'];
    var flow = wizardState.mode === 'by_date' ? flowDate : flowVeh;
    var i = flow.indexOf(wizardState.step);
    if (i <= 0) {
      wizardState.step = 'choose';
      wizardState.mode = '';
    } else {
      wizardState.step = flow[i - 1];
    }
    renderNewBookingWizard_();
  }

  function renderVinPickCalendar_(vin) {
    var weeks = ringFleetCalendarWeeksJst_(calYear, calMonth);
    var vinBookings = fleetBookingsForShop_(bookingsCache).filter(function (b) {
      return String(b.vin).toUpperCase() === String(vin).toUpperCase();
    });
    var html = '<div class="ring-fleet-vin-cal ring-fleet-cal-grid"><div class="ring-fleet-cal-dow">' +
      ['日','月','火','水','木','金','土'].map(function (d) { return '<span>' + d + '</span>'; }).join('') + '</div>';
    weeks.forEach(function (week) {
      html += '<div class="ring-fleet-cal-week">';
      week.forEach(function (cell) {
        if (!cell) { html += '<div class="ring-fleet-cal-day is-out"></div>'; return; }
        var blocked = vinBookings.some(function (b) {
          return ringFleetBookingBlocksVinForRange_(b, vin, cell.ymd, cell.ymd);
        });
        var cls = 'ring-fleet-cal-day';
        if (blocked) cls += ' is-booked';
        if (wizardState.pickStart && cell.ymd === wizardState.pickStart) cls += ' is-pick-start';
        if (wizardState.pickStart && wizardState.pickEnd && ringYmdCompare_(cell.ymd, wizardState.pickStart) >= 0 &&
            ringYmdCompare_(cell.ymd, wizardState.pickEnd) <= 0) cls += ' is-pick-range';
        html += '<button type="button" class="' + cls + '" data-pick-ymd="' + fleetEscape_(cell.ymd) + '"' +
          (blocked ? ' disabled' : '') + '>' + cell.d + '</button>';
      });
      html += '</div>';
    });
    html += '</div>';
    return html;
  }

  async function wizardSearchByDate_() {
    var state = wizardState;
    if (!state || state.readPending) return;
    var start = state.startDate;
    var end = state.endDate;
    if (ringYmdCompare_(start, end) > 0) {
      if (typeof showToast === 'function') showToast('error', '返却予定日は貸出開始日以降にしてください');
      return;
    }
    if (typeof showLoading === 'function') showLoading('検索中', '読み込み中…');
    state.readPending = true;
    var syncRes;
    try { syncRes = await ringFleetEnsureBookingsSyncedForRange_(profile, start, end); }
    catch (e) { syncRes = { ok: false, bookings: bookingsCache }; }
    finally { state.readPending = false; }
    if (!fleetContextCurrent_() || wizardState !== state) return;
    if (typeof hideLoading === 'function') hideLoading();
    fleetBookingsSyncOk = !!syncRes.ok;
    fleetSyncFromCache = !syncRes.ok;
    fleetApplyBookingsCache_(syncRes.bookings || []);
    wizardState.step = 'list';
    renderNewBookingWizard_();
  }

  function renderNewBookingWizard_() {
    var shell = document.getElementById('fleetNewBookingWizard');
    if (!shell || !wizardState || wizardState.kind === 'return' || wizardState.kind === 'reschedule') return;
    shell.hidden = false;
    shell.setAttribute('aria-hidden', 'false');
    shell.setAttribute('role', 'dialog');
    shell.setAttribute('aria-modal', 'true');
    shell.setAttribute('aria-label', '新しい予約');
    var title = { choose: '新しい予約', dates: '日付から探す', list: '空いている車両', vehicles: '車両から探す',
      vin_cal: '予約済みの確認', vin_dates: '貸出日を選択', confirm: '内容の確認' }[wizardState.step] || '新しい予約';
    var inner = '<div class="ring-fleet-wizard-inner"><div class="ring-fleet-wizard-head">' +
      '<button type="button" class="ring-fleet-wizard-back"' + (wizardState.step === 'choose' ? ' style="visibility:hidden"' : '') +
      '>戻る</button><h2>' + fleetEscape_(title) + '</h2>' +
      '<button type="button" class="ring-fleet-wizard-close">閉じる</button></div>';
    if (wizardState.step === 'confirm') inner += '<button type="button" id="fleetWizardRestart" class="ring-fleet-wizard-restart">＋ 新しい予約から選び直す</button>';
    inner += fleetAvailStaleBanner_();
    if (wizardState.step === 'choose') {
      inner += '<p style="font-size:13px;font-weight:700;color:#475569;margin:0 0 8px;">予約の探し方を選んでください</p>' +
        '<div class="ring-fleet-wizard-step-btns">' +
        '<button type="button" class="primary-mode" data-wiz-mode="by_date">📅 日付から探す</button>' +
        '<button type="button" class="primary-mode" data-wiz-mode="by_vehicle">🚗 車両から探す</button></div>';
    } else if (wizardState.step === 'dates') {
      inner += '<div class="ring-fleet-field"><label>貸出開始日</label><input type="date" id="wizStart" value="' + fleetEscape_(wizardState.startDate) + '"></div>' +
        '<div class="ring-fleet-field"><label>返却予定日</label><input type="date" id="wizEnd" value="' + fleetEscape_(wizardState.endDate) + '"></div>' +
        fleetLendeeFieldHtml_(wizardState.lendeeName) +
        '<div class="ring-fleet-field"><label>車両区分</label><select id="wizCat"><option value="fleet_all">すべて</option>' +
        '<option value="rental">レンタカー</option><option value="loaner">代車</option></select></div>' +
        '<button type="button" class="ring-fleet-confirm-save" id="wizSearchDate">この期間で空車を検索</button>';
    } else if (wizardState.step === 'list') {
      var mine = fleetFleetOnly_(fleetMine_()).map(function (c) {
        return typeof ringEnrichVehicleListRow_ === 'function' ? ringEnrichVehicleListRow_(c) : c;
      });
      var avail = ringFleetSearchAvailableVehicles_(profile, mine, wizardState.startDate, wizardState.endDate,
        fleetBookingsForShop_(bookingsCache), wizardState.catFilter);
      if (!fleetBookingsSyncOk) {
        inner += '<p class="ring-fleet-avail-warn ring-fleet-avail-offline">最新情報を取得できませんでした。結果は参考表示です。保存はできません。</p>';
      }
      if (!avail.length) inner += '<p class="empty-msg">この期間に空いている車両はありません</p>';
      avail.forEach(function (car) {
        var name = ringVehicleListDisplayName_(car);
        inner += '<button type="button" class="ring-fleet-avail-card" data-wiz-pick-vin="' + fleetEscape_(car.vin) + '"><strong>' +
          fleetEscape_(name) + '</strong>' + fleetVehicleAvailMetaHtml_(car) + '<span class="ring-fleet-card-action">この車両で予約 →</span></button>';
      });
    } else if (wizardState.step === 'vehicles') {
      var pack = fleetFilteredVehicles_();
      if (!pack.vehicles.length) inner += '<p class="empty-msg">車両がありません</p>';
      pack.vehicles.forEach(function (car) {
        inner += '<button type="button" class="ring-fleet-avail-card" data-wiz-pick-vin="' + fleetEscape_(car.vin) + '"><strong>' +
          fleetEscape_(ringVehicleListDisplayName_(car)) + '</strong>' + fleetVehicleAvailMetaHtml_(car) + '<span class="ring-fleet-card-action">この車両で予約 →</span></button>';
      });
    } else if (wizardState.step === 'vin_cal') {
      inner += '<p style="font-size:13px;font-weight:800;margin:0 0 8px;">' + fleetEscape_(fleetVehicleName_(wizardState.vin)) + '</p>' +
        '<p style="font-size:11px;font-weight:700;color:#64748b;margin:0 0 8px;">赤い日は予約済み・貸出中です</p>' +
        renderVinPickCalendar_(wizardState.vin) +
        '<button type="button" class="ring-fleet-confirm-save" id="wizVinNext"' +
        (wizardState.pickStart && wizardState.pickEnd ? '' : ' disabled') + '>次へ（日付を確認）</button>';
    } else if (wizardState.step === 'vin_dates') {
      inner += '<div class="ring-fleet-field"><label>貸出開始日</label><input type="date" id="wizStart" value="' +
        fleetEscape_(wizardState.pickStart || wizardState.startDate) + '"></div>' +
        '<div class="ring-fleet-field"><label>返却予定日</label><input type="date" id="wizEnd" value="' +
        fleetEscape_(wizardState.pickEnd || wizardState.endDate) + '"></div>' +
        fleetLendeeFieldHtml_(wizardState.lendeeName) +
        '<button type="button" class="ring-fleet-confirm-save" id="wizVinCheck">この期間で予約可能か確認</button>';
    } else if (wizardState.step === 'confirm') {
      inner += fleetConfirmPanelHtml_(wizardState.vin, wizardState.startDate, wizardState.endDate, '');
    }
    inner += '</div>';
    shell.innerHTML = inner;
    var heading = shell.querySelector('h2');
    if (heading) { heading.tabIndex = -1; heading.focus({ preventScroll: true }); }
    shell.querySelector('.ring-fleet-wizard-inner').scrollTop = 0;
    shell.querySelector('.ring-fleet-wizard-close').onclick = closeNewBookingWizard_;
    var restart = shell.querySelector('#fleetWizardRestart');
    if (restart) restart.onclick = function () { openNewBookingWizard_(); };
    var back = shell.querySelector('.ring-fleet-wizard-back');
    if (back) back.onclick = wizardGoBack_;
    shell.querySelectorAll('[data-wiz-mode]').forEach(function (btn) {
      btn.onclick = function () {
        wizardState.mode = btn.getAttribute('data-wiz-mode');
        wizardState.step = wizardState.mode === 'by_date' ? 'dates' : 'vehicles';
        renderNewBookingWizard_();
      };
    });
    var wizCat = document.getElementById('wizCat');
    if (wizCat) wizCat.value = wizardState.catFilter || 'fleet_all';
    var wizSearch = document.getElementById('wizSearchDate');
    if (wizSearch) {
      wizSearch.onclick = function () {
        wizardState.startDate = document.getElementById('wizStart').value;
        wizardState.endDate = document.getElementById('wizEnd').value;
        fleetReadWizardLendee_();
        wizardState.catFilter = wizCat ? wizCat.value : 'fleet_all';
        wizardSearchByDate_();
      };
    }
    shell.querySelectorAll('[data-wiz-pick-vin]').forEach(function (card) {
      card.onclick = function () {
        var v = card.getAttribute('data-wiz-pick-vin');
        if (wizardState.step === 'list') {
          wizardState.vin = v;
          wizardState.step = 'confirm';
          renderNewBookingWizard_();
        } else if (wizardState.step === 'vehicles') {
          wizardState.vin = v;
          wizardState.step = 'vin_cal';
          wizardState.pickStart = '';
          wizardState.pickEnd = '';
          renderNewBookingWizard_();
        }
      };
    });
    shell.querySelectorAll('[data-pick-ymd]').forEach(function (btn) {
      btn.onclick = function () {
        var ymd = btn.getAttribute('data-pick-ymd');
        if (!wizardState.pickStart || (wizardState.pickStart && wizardState.pickEnd)) {
          wizardState.pickStart = ymd;
          wizardState.pickEnd = '';
        } else if (ringYmdCompare_(ymd, wizardState.pickStart) < 0) {
          wizardState.pickEnd = wizardState.pickStart;
          wizardState.pickStart = ymd;
        } else {
          wizardState.pickEnd = ymd;
        }
        renderNewBookingWizard_();
      };
    });
    var wizVinNext = document.getElementById('wizVinNext');
    if (wizVinNext) {
      wizVinNext.onclick = function () {
        wizardState.startDate = wizardState.pickStart;
        wizardState.endDate = wizardState.pickEnd;
        wizardState.step = 'vin_dates';
        renderNewBookingWizard_();
      };
    }
    var wizVinCheck = document.getElementById('wizVinCheck');
    if (wizVinCheck) {
      wizVinCheck.onclick = async function () {
        var state = wizardState;
        if (!state || state.readPending) return;
        wizardState.startDate = document.getElementById('wizStart').value;
        wizardState.endDate = document.getElementById('wizEnd').value;
        fleetReadWizardLendee_();
        if (ringYmdCompare_(wizardState.startDate, wizardState.endDate) > 0) {
          if (typeof showToast === 'function') showToast('error', '返却予定日は貸出開始日以降にしてください');
          return;
        }
        if (typeof showLoading === 'function') showLoading('確認中', '読み込み中…');
        state.readPending = true;
        var syncRes;
        try { syncRes = await ringFleetEnsureBookingsSyncedForRange_(profile, state.startDate, state.endDate); }
        catch (e) { syncRes = { ok: false, bookings: bookingsCache }; }
        finally { state.readPending = false; }
        if (!fleetContextCurrent_() || wizardState !== state) return;
        if (typeof hideLoading === 'function') hideLoading();
        fleetBookingsSyncOk = !!syncRes.ok;
        fleetApplyBookingsCache_(syncRes.bookings || []);
        if (!syncRes.ok) {
          if (typeof showToast === 'function') showToast('error', '最新の空き状況を確認できません');
          renderNewBookingWizard_();
          return;
        }
        if (!ringFleetVinAvailableForRange_(wizardState.vin, wizardState.startDate, wizardState.endDate, fleetBookingsForShop_(bookingsCache))) {
          if (typeof showToast === 'function') showToast('warning', 'この期間は予約できません。日付を変更してください。');
          return;
        }
        wizardState.step = 'confirm';
        renderNewBookingWizard_();
      };
    }
    if (wizardState.step === 'confirm') {
      fleetBindConfirmSave_(shell.querySelector('.ring-fleet-wizard-inner'), wizardState.vin, wizardState.startDate, wizardState.endDate);
    }
  }

  async function runDeskAvailSearch_() {
    var startEl = document.getElementById('fleetDeskAvailStart');
    var endEl = document.getElementById('fleetDeskAvailEnd');
    var catEl = document.getElementById('fleetDeskAvailCat');
    var host = document.getElementById('fleetDeskAvailResults');
    var hint = document.getElementById('fleetDeskAvailHint');
    if (!startEl || !endEl || !host) return;
    var start = startEl.value;
    var end = endEl.value;
    if (ringYmdCompare_(start, end) > 0) {
      if (typeof showToast === 'function') showToast('error', '返却予定日は貸出開始日以降にしてください');
      return;
    }
    if (typeof showLoading === 'function') showLoading('検索中', '読み込み中…');
    var syncRes = await ringFleetEnsureBookingsSyncedForRange_(profile, start, end);
    if (!fleetContextCurrent_()) return;
    if (typeof hideLoading === 'function') hideLoading();
    fleetBookingsSyncOk = !!syncRes.ok;
    fleetSyncFromCache = !syncRes.ok;
    fleetApplyBookingsCache_(syncRes.bookings || []);
    renderFleetList_(true);
    if (hint) {
      hint.textContent = fleetBookingsSyncOk
        ? 'サーバーと同期済み（' + start + '〜' + end + '）'
        : '最新の空き状況を確認できませんでした';
    }
    var mine = fleetFleetOnly_(fleetMine_()).map(function (c) {
      return typeof ringEnrichVehicleListRow_ === 'function' ? ringEnrichVehicleListRow_(c) : c;
    });
    var cat = catEl ? catEl.value : 'fleet_all';
    var avail = ringFleetSearchAvailableVehicles_(profile, mine, start, end, fleetBookingsForShop_(bookingsCache), cat);
    if (!avail.length) {
      host.innerHTML = '<p class="empty-msg" style="margin:8px 0">空いている車両はありません</p>';
      return;
    }
    var html = '';
    avail.forEach(function (car) {
      html += '<button type="button" class="ring-fleet-avail-card" data-desk-pick="' + fleetEscape_(car.vin) + '"><strong>' +
        fleetEscape_(ringVehicleListDisplayName_(car)) + '</strong>' + fleetVehicleAvailMetaHtml_(car) + '<span class="ring-fleet-card-action">この車両で予約 →</span></button>';
    });
    host.innerHTML = html;
    host.querySelectorAll('[data-desk-pick]').forEach(function (card) {
      card.onclick = function () {
        openNewBookingForm_(card.getAttribute('data-desk-pick'), start, end);
      };
    });
  }

  /**
   * 表示中の月と翌月をサーバーから取得し直す。取得中も手元の表示（前回取得分）は消さない。
   * 新しい呼び出しが始まった後に古い応答が返っても画面へは反映しない（fleetBookingsReadGen）。
   * opts.quiet: 月移動・保存後の裏更新ではトーストを出さない（画面上部の案内で知らせる）。
   */
  async function refreshBookings_(loadShop, loadGen, opts) {
    if (!fleetContextCurrent_()) return false;
    var quiet = !!(opts && opts.quiet);
    var readGen = ++fleetBookingsReadGen;
    var y1 = calYear, m1 = calMonth;
    var nm = fleetCalNextMonth_(y1, m1);
    fleetBookingsRefreshing = true;
    var results;
    try {
      results = await Promise.all([
        syncFleetBookingsFromServer(y1, m1, true),
        syncFleetBookingsFromServer(nm.y, nm.m, true)
      ]);
    } catch (e) {
      results = [{ ok: false, bookings: [], error: 'NETWORK' }, { ok: false, bookings: [], error: 'NETWORK' }];
    } finally {
      if (readGen === fleetBookingsReadGen) fleetBookingsRefreshing = false;
    }
    var res1 = results[0], res2 = results[1];
    if (res1 && res1.ok) fleetFreshMonths[fleetMonthKey_(y1, m1)] = true;
    if (res2 && res2.ok) fleetFreshMonths[fleetMonthKey_(nm.y, nm.m)] = true;
    if (!fleetContextCurrent_() || readGen !== fleetBookingsReadGen) return false;
    if (loadGen != null && (loadGen !== fleetLoadGen || fleetCurrentShopId_() !== loadShop)) {
      return false;
    }
    var mergedList = typeof loadFleetBookingsLocal_ === 'function'
      ? loadFleetBookingsLocal_(profile)
      : (res2.bookings && res2.bookings.length ? res2.bookings : (res1.bookings || []));
    fleetApplyBookingsCache_(mergedList.length ? mergedList : (res1.bookings || []));
    fleetSyncFromCache = !!((res1 && res1.fromCache && !res1.ok) || (res2 && res2.fromCache && !res2.ok));
    var bothOk = !!(res1 && res1.ok && res2 && res2.ok);
    if (bothOk) fleetBookingsHaveCache = true;
    fleetBookingsSyncOk = bothOk && y1 === calYear && m1 === calMonth;
    if (!bothOk && !quiet && typeof showToast === 'function') {
      if (fleetSyncFromCache && (mergedList || []).length) {
        showToast('warning', 'サーバーと同期できませんでした。自店舗の保存済み予約を表示しています。');
      } else if ((res1 && res1.error === 'NETWORK') || (res2 && res2.error === 'NETWORK')) {
        showToast('warning', '予約の取得に失敗しました。' + ((mergedList || []).length ? '保存済みデータを表示しています。' : ''));
      }
    }
    renderFleetList_(true);
    renderDetailPanel_();
    renderDeskOutPanel_();
    return fleetBookingsSyncOk;
  }

  /** 月移動の直後は手元の予約で即描画し、サーバー確認は少し待ってからまとめて 1 回行う */
  function fleetScheduleMonthRefresh_() {
    if (fleetMonthRefreshTimer) clearTimeout(fleetMonthRefreshTimer);
    fleetMonthRefreshTimer = setTimeout(function () {
      fleetMonthRefreshTimer = null;
      if (!fleetContextCurrent_()) return;
      refreshBookings_(null, null, { quiet: true });
    }, 250);
  }

  function fleetRenderCalendarMonth_() {
    if (!fleetVisibleMonthsFresh_()) fleetBookingsSyncOk = false;
    renderCalendars_();
    renderMobDayAgenda_();
    renderFleetSummary_();
    fleetScheduleMonthRefresh_();
  }

  /**
   * サーバー保存が成功した直後の反映。app.js 側でサーバー応答の予約を端末保存済みなので、
   * それを読み直して描画し、他スタッフの変更との突き合わせは裏で行う（月・選択・スクロールは維持）。
   */
  function fleetRenderAfterServerWrite_() {
    if (!fleetContextCurrent_()) return;
    if (typeof loadFleetBookingsLocal_ === 'function') {
      fleetApplyBookingsCache_(loadFleetBookingsLocal_(profile));
      fleetBookingsHaveCache = true;
    }
    renderFleetList_(true);
    renderDetailPanel_();
    renderDeskOutPanel_();
    refreshBookings_(null, null, { quiet: true });
  }

  function setFleetTab_(tab) {
    fleetTab = tab;
    document.querySelectorAll('[data-tab]').forEach(function (el) {
      el.classList.toggle('active', el.getAttribute('data-tab') === tab);
    });
    renderFleetList_(true);
  }

  function shiftCalMonth_(delta) {
    calMonth += delta;
    if (calMonth > 12) { calMonth = 1; calYear++; }
    if (calMonth < 1) { calMonth = 12; calYear--; }
    var sel = String(mobSelectedYmd || '').split('-');
    if (sel.length < 2 || +sel[0] !== calYear || +sel[1] !== calMonth) mobSelectedYmd = '';
    fleetRenderCalendarMonth_();
  }

  function fleetCalGoToday_() {
    initCalMonth_();
    mobSelectedYmd = ringFormatDateToYmdJst_(new Date());
    fleetRenderCalendarMonth_();
  }

  function fleetSelectMobDay_(ymd) {
    if (!ymd) return;
    mobSelectedYmd = ymd;
    var parts = ymd.split('-');
    if (parts.length >= 2 && (+parts[0] !== calYear || +parts[1] !== calMonth)) {
      calYear = +parts[0];
      calMonth = +parts[1];
      fleetRenderCalendarMonth_();
      return;
    }
    renderCalendars_();
    renderMobDayAgenda_();
  }

  var FLEET_VIEW_STATE_KEY = 'ring_fleet_view_state_v1';

  /** 車両情報・整備履歴・日常点検へ移る前に、一覧の開閉・タブ・スクロール位置を覚えておく */
  function fleetSaveViewState_() {
    try {
      var panel = document.getElementById('fleetMobListPanel');
      sessionStorage.setItem(FLEET_VIEW_STATE_KEY, JSON.stringify({
        shop: fleetCurrentShopId_(),
        scope: ringFleetBackScope_(),
        listOpen: !!(panel && !panel.hidden),
        tab: fleetTab,
        scrollY: window.scrollY || 0,
        listScroll: panel ? panel.scrollTop : 0,
        year: calYear,
        month: calMonth,
        at: Date.now()
      }));
    } catch (e) { /* ignore */ }
  }

  function fleetTakeViewState_() {
    try {
      var raw = safeJsonParse(sessionStorage.getItem(FLEET_VIEW_STATE_KEY), null);
      sessionStorage.removeItem(FLEET_VIEW_STATE_KEY);
      if (!raw || !raw.scope || raw.scope !== ringFleetBackScope_() || raw.shop !== fleetCurrentShopId_() || Date.now() - (raw.at || 0) > 2 * 60 * 60 * 1000) return null;
      return raw;
    } catch (e) {
      return null;
    }
  }

  function fleetRerenderAfterLoad_(scrollY) {
    renderFleetSummary_();
    renderFleetList_(false);
    renderCalendars_();
    renderMobDayAgenda_();
    renderDeskTodayPanel_();
    renderDeskEmptyState_();
    renderDeskOutPanel_();
    renderDetailPanel_();
    if (scrollY != null && typeof ringRestoreScrollY_ === 'function') ringRestoreScrollY_(scrollY);
  }

  async function loadFleetPage_(manual) {
    if (!fleetContextCurrent_()) return;
    var loadShop = fleetCurrentShopId_();
    var loadGen = ++fleetLoadGen;
    if (manual) fleetBootSyncPending_ = false;
    if (manual && typeof showLoading === 'function') showLoading('更新中', '読み込み中…');
    if (!fleetVehiclesDisplayable_() || manual) {
      fleetVehiclesLoading = true;
      if (!manual) renderFleetSummary_();
    }
    var vehiclesP = typeof syncVehiclesFromServer === 'function'
      ? syncVehiclesFromServer({ returnStatus: true }).catch(function () { return { ok: false }; })
      : Promise.resolve({ ok: false });
    var bookingsP = refreshBookings_(loadShop, loadGen);
    try {
      var vehiclesResult = await vehiclesP;
      if (fleetContextCurrent_() && loadGen === fleetLoadGen && fleetCurrentShopId_() === loadShop) {
        fleetVehiclesLoading = false;
        fleetVehiclesSyncOk = !!(vehiclesResult && vehiclesResult.ok);
        if (fleetVehiclesSyncOk) {
          var snapKey = fleetVehicleSnapshotKey_();
          if (snapKey) localStorage.setItem(snapKey, '1');
        }
        renderFleetList_(true);
      }
      await bookingsP;
    } finally {
      if (!manual && fleetBootSyncPending_ && fleetContextCurrent_() && loadGen === fleetLoadGen) {
        fleetBootSyncPending_ = false;
      }
      if (fleetContextCurrent_() && loadGen === fleetLoadGen && fleetCurrentShopId_() === loadShop) {
        fleetRerenderAfterLoad_();
        if (typeof ringUpdateLastSyncLabel_ === 'function') {
          ringUpdateLastSyncLabel_('ringFleetLastSync', fleetCacheKey);
        }
      }
      if (manual && fleetContextCurrent_() && typeof hideLoading === 'function') hideLoading();
    }
  }

  window.addEventListener('DOMContentLoaded', function () {
    if (!isBizMode || !profile) { location.replace('login.html'); return; }
    if (typeof ringBootAuthForMode === 'function') {
      var boot = ringBootAuthForMode(userRole === 'dealer' ? 'business' : 'shop');
      if (!boot.ok) { location.replace(boot.redirect || 'login.html'); return; }
    }
    document.getElementById('backBtn').onclick = function () { location.href = fleetHomeUrl_(); };
    initCalMonth_();
    mobSelectedYmd = ringFormatDateToYmdJst_(new Date());
    fleetCacheKey = 'rental_fleet:' + (profile.shopId || profile.userId || 'unknown');

    var canEdit = ringCanEditManagedVehicles_(profile);
    if (!canEdit) {
      var addMob = document.getElementById('fleetAddActions');
      var addDesk = document.getElementById('fleetDeskAddActions');
      if (addMob) addMob.style.display = 'none';
      if (addDesk) addDesk.style.display = 'none';
    }

    document.querySelectorAll('[data-tab]').forEach(function (btn) {
      btn.addEventListener('click', function () { setFleetTab_(btn.getAttribute('data-tab')); });
    });
    function bindSearchSort_(input, sort) {
      if (input) {
        input.addEventListener('input', function () {
          var other = input.id === 'fleetSearchInputDesk' ? document.getElementById('fleetSearchInput') : document.getElementById('fleetSearchInputDesk');
          if (other) other.value = input.value;
          syncFleetSearchClear_();
          if (fleetSearchTimer) clearTimeout(fleetSearchTimer);
          fleetSearchTimer = setTimeout(function () { renderFleetList_(true); }, 250);
        });
      }
      if (sort) sort.addEventListener('change', function () {
        var other = sort.id === 'fleetSortSelectDesk' ? document.getElementById('fleetSortSelect') : document.getElementById('fleetSortSelectDesk');
        if (other) other.value = sort.value;
        renderFleetList_(true);
      });
    }
    bindSearchSort_(document.getElementById('fleetSearchInput'), document.getElementById('fleetSortSelect'));
    bindSearchSort_(document.getElementById('fleetSearchInputDesk'), document.getElementById('fleetSortSelectDesk'));
    document.getElementById('fleetSearchClear').onclick = function () {
      var mob = document.getElementById('fleetSearchInput');
      var desk = document.getElementById('fleetSearchInputDesk');
      if (mob) mob.value = '';
      if (desk) desk.value = '';
      renderFleetList_(true);
    };
    var deskMoreBtn = document.getElementById('fleetDeskListMoreBtn');
    if (deskMoreBtn) deskMoreBtn.onclick = function () { fleetLoadMoreDeskList_(); };
    document.getElementById('ringFleetRefreshBtn').onclick = function () { loadFleetPage_(true); };
    var newBookBtn = document.getElementById('fleetNewBookingBtn');
    if (newBookBtn) newBookBtn.onclick = function () { openNewBookingWizard_(); };
    var retBtn = document.getElementById('fleetReturnBtn');
    if (retBtn) retBtn.onclick = function () { openReturnReception_(); };
    var deskSearch = document.getElementById('fleetDeskAvailSearch');
    if (deskSearch) deskSearch.onclick = function () { runDeskAvailSearch_(); };
    var deskStart = document.getElementById('fleetDeskAvailStart');
    var deskEnd = document.getElementById('fleetDeskAvailEnd');
    if (deskStart && deskEnd) {
      var td = ringFormatDateToYmdJst_(new Date());
      deskStart.value = td;
      deskEnd.value = td;
      bindFleetDateField_(deskStart);
      bindFleetDateField_(deskEnd);
    }
    document.getElementById('fleetCalPrev').onclick = function () { shiftCalMonth_(-1); };
    document.getElementById('fleetCalNext').onclick = function () { shiftCalMonth_(1); };
    document.getElementById('fleetCalToday').onclick = function () { fleetCalGoToday_(); };

    function onShowReturnedChange(checked) {
      showReturnedHistory = !!checked;
      var desk = document.getElementById('fleetShowReturned');
      var mob = document.getElementById('fleetShowReturnedMob');
      if (desk) desk.checked = showReturnedHistory;
      if (mob) mob.checked = showReturnedHistory;
      renderCalendars_();
      renderMobDayAgenda_();
    }
    var showRetDesk = document.getElementById('fleetShowReturned');
    var showRetMob = document.getElementById('fleetShowReturnedMob');
    if (showRetDesk) showRetDesk.onchange = function (ev) { onShowReturnedChange(ev.target.checked); };
    if (showRetMob) showRetMob.onchange = function (ev) { onShowReturnedChange(ev.target.checked); };

    var listOpen = document.getElementById('fleetMobListOpen');
    var listClose = document.getElementById('fleetMobListClose');
    var listPanel = document.getElementById('fleetMobListPanel');
    if (listOpen && listPanel) {
      listOpen.onclick = function () {
        listPanel.hidden = false;
        listOpen.setAttribute('aria-expanded', 'true');
        renderMobListOnboard_();
      };
    }
    if (listClose && listPanel) {
      listClose.onclick = function () {
        listPanel.hidden = true;
        if (listOpen) listOpen.setAttribute('aria-expanded', 'false');
      };
    }
    var detClose = document.getElementById('fleetMobDetailClose');
    var detBack = document.getElementById('fleetMobDetailBackdrop');
    function onMobDetailDismiss_(ev) {
      if (ev) ev.preventDefault();
      closeMobDetailSheet_();
    }
    if (detClose) {
      detClose.addEventListener('click', onMobDetailDismiss_);
    }
    if (detBack) {
      detBack.addEventListener('click', onMobDetailDismiss_);
    }
    closeMobDetailSheet_({ clearSelection: false });

    document.body.addEventListener('click', function (ev) {
      if (!fleetContextCurrent_()) { ev.preventDefault(); fleetInvalidateSessionView_(); return; }
      var bar = ev.target.closest('[data-booking-id]');
      if (bar && bar.closest('#fleetCalMob, #fleetMobDayAgenda, #fleetCalDesk')) {
        selectedBookingId = bar.getAttribute('data-booking-id');
        renderDetailPanel_();
        return;
      }
      var calDay = ev.target.closest('[data-cal-ymd]');
      if (calDay && calDay.closest('#fleetCalMob') && !ev.target.closest('.ring-fleet-cal-bar')) {
        fleetSelectMobDay_(calDay.getAttribute('data-cal-ymd'));
        return;
      }
      var agendaNew = ev.target.closest('[data-agenda-new]');
      if (agendaNew) {
        var ymdNew = agendaNew.getAttribute('data-agenda-new');
        openNewBookingWizard_({ mode: 'by_date', step: 'dates', startDate: ymdNew, endDate: ymdNew });
        return;
      }
      if (ev.target.closest('[data-fleet-nav]')) {
        fleetSaveViewState_();
        // 遷移先の DOMContentLoaded を待たず、クリック時点で戻り先を確定する
        try {
          var navA = ev.target.closest('a[data-fleet-nav]');
          var navHref = navA && navA.getAttribute('href');
          if (navHref && typeof ringNoteFleetBackOriginForVin_ === 'function') {
            var navVin = new URL(navHref, location.href).searchParams.get('vin');
            ringNoteFleetBackOriginForVin_(navVin);
          }
        } catch (eNavOrigin) { /* ignore */ }
        return;
      }
      var vinRow = ev.target.closest('[data-vin]');
      if (vinRow && vinRow.closest('#fleetDeskVehTable')) {
        selectedVin = vinRow.getAttribute('data-vin');
        renderDesktopVehicleTable_(fleetFilteredVehicles_().vehicles);
        return;
      }
      var histBtn = ev.target.closest('[data-fleet-rental-history]');
      if (histBtn) {
        openFleetRentalHistory_(histBtn.getAttribute('data-fleet-rental-history'));
        return;
      }
      var newB = ev.target.closest('[data-fleet-new-booking]');
      if (newB) {
        var v = newB.getAttribute('data-fleet-new-booking');
        if (window.matchMedia && window.matchMedia('(max-width: 959px)').matches) {
          openNewBookingWizard_({ mode: 'by_vehicle', step: 'vin_cal', vin: v });
        } else {
          openNewBookingForm_(v);
        }
      }
    });

    if (typeof ringSetupBackgroundResync_ === 'function') {
      ringSetupBackgroundResync_({ onResume: function () { loadFleetPage_(false); } });
    }
    fleetBindDeskCalPointer_();
    var histClose = document.getElementById('fleetRentalHistoryClose');
    var histModal = document.getElementById('fleetRentalHistoryModal');
    if (histClose) histClose.onclick = closeFleetRentalHistory_;
    if (histModal) {
      histModal.onclick = function (ev) {
        if (ev.target === histModal) closeFleetRentalHistory_();
      };
    }
    var viewState = fleetTakeViewState_();
    if (viewState) {
      if (viewState.tab && viewState.tab !== fleetTab) setFleetTab_(viewState.tab);
      if (viewState.year && viewState.month) { calYear = viewState.year; calMonth = viewState.month; }
    }
    fleetInitVehicleLoadingFlag_();
    fleetBootSyncPending_ = true;
    fleetRenderFromLocalCache_();
    if (viewState) {
      if (viewState.listOpen && listOpen) listOpen.click();
      var panelRestore = document.getElementById('fleetMobListPanel');
      if (panelRestore && viewState.listScroll) panelRestore.scrollTop = viewState.listScroll;
      if (viewState.scrollY && typeof ringRestoreScrollY_ === 'function') ringRestoreScrollY_(viewState.scrollY);
    }
    loadFleetPage_(false);
  });
})();
