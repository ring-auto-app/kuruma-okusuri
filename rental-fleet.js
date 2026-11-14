/* レンタカー・代車管理 Phase2 — カレンダー・予約（app.js の API / 日付ヘルパを利用） */
(function () {
  var profile = typeof getCurrentProfile === 'function' ? getCurrentProfile() : safeJsonParse(localStorage.getItem('nappy_profile_v1'), null);
  var userRole = profile ? (profile.shopType || profile.role) : '';
  var isBizMode = (userRole === 'factory' || userRole === 'dealer');
  var fleetTab = 'fleet_all';
  var fleetCacheKey = '';
  var fleetSearchTimer = null;
  var calYear = 0;
  var calMonth = 0;
  var mobileView = 'calendar';
  var mobCalMode = 'week';
  var mobWeekAnchorYmd = '';
  var mobSelectedYmd = '';
  var selectedVin = '';
  var selectedBookingId = '';
  var showReturnedHistory = false;
  var bookingsCache = [];
  var fleetSyncFromCache = false;
  var fleetBookingsSyncOk = false;
  var fleetVehiclesSyncOk = true;
  var wizardState = null;
  var DESK_LIST_PAGE = 25;
  var deskListRendered = 0;
  var deskListVehiclesCache = [];
  var deskListObs = null;
  var deskListLoadingMore = false;
  var deskAvailRange = { start: '', end: '' };
  var deskCalDrag = { active: false, moved: false, startYmd: '', endYmd: '', pointerId: null };
  var mobRangeAnchorYmd = '';
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
    bookingsCache = []; deskListVehiclesCache = []; wizardState = null;
    selectedVin = ''; selectedBookingId = '';
    closeFleetRentalHistory_();
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
  window.addEventListener('offline', function () { fleetBookingsSyncOk = false; });

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

  function fleetCheckSheetUrl_(vin) {
    return 'fleet_check_sheet.html?vin=' + encodeURIComponent(String(vin || '').trim());
  }

  function fleetEscape_(str) {
    if (!str) return '';
    return String(str).replace(/[&<>"'`=\/]/g, function (s) {
      return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','/':'&#x2F;','`':'&#x60;','=':'&#x3D;'}[s]);
    });
  }

  function fleetMine_() {
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
    var v = fleetFleetOnly_(fleetMine_()).find(function (c) {
      return String(c.vin || '').toUpperCase() === String(vin || '').toUpperCase();
    });
    if (!v) return vin;
    return typeof ringVehicleListDisplayName_ === 'function' ? ringVehicleListDisplayName_(v) : (v.nickname || vin);
  }

  function fleetCalNextMonth_(year, month) {
    if (month >= 12) return { y: year + 1, m: 1 };
    return { y: year, m: month + 1 };
  }

  function fleetBookingsForMonth_(year, month) {
    return fleetBookingsForShop_(bookingsCache).filter(function (b) {
      if (!showReturnedHistory && (b.status === 'returned' || b.status === 'cancelled')) return false;
      if (fleetTab !== 'fleet_all') {
        var v = fleetFleetOnly_(fleetMine_()).find(function (c) { return String(c.vin) === String(b.vin); });
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

  function syncFleetSearchClear_() {
    var input = fleetSearchInputEl_();
    var clearBtn = document.getElementById('fleetSearchClear');
    if (!input || !clearBtn) return;
    clearBtn.classList.toggle('is-visible', String(input.value || '').trim().length > 0);
  }

  function fleetDeskListEmptyMessage_(filteredCount, allFleetCount) {
    if (filteredCount > 0) return '';
    if (!fleetVehiclesSyncOk) {
      return '車両情報を確認できません。上部の同期状態を確認してください。';
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
      '<span class="cat-pill">' + fleetEscape_(catLabel) + '</span></div>' +
      '<div class="ring-fleet-veh-meta">' +
      '<p><span class="ring-fleet-meta-label">ナンバー</span>' + fleetEscape_(plateLine) + '</p>' +
      '<p><span class="ring-fleet-meta-label">車台番号</span>' + fleetEscape_(vinDisp) + '</p>' +
      '<p><span class="ring-fleet-meta-label">車検満了</span>' + fleetEscape_(shaken) + '</p>' +
      '<p><span class="ring-fleet-meta-label">次回点検</span>' + fleetEscape_(inspect) + '</p>' +
      '</div>' +
      '<div class="ring-fleet-veh-actions">' +
      '<a href="vehicle_info.html?vin=' + encodeURIComponent(car.vin) + '" class="ring-fleet-action-btn">車両情報</a>' +
      '<a href="history.html?vin=' + encodeURIComponent(car.vin) + '" class="ring-fleet-action-btn">整備履歴</a>' +
      '<a href="inspection_biz.html?vin=' + encodeURIComponent(car.vin) + '" class="ring-fleet-action-btn">日常点検</a>' +
      '<button type="button" class="ring-fleet-action-btn" data-fleet-rental-history="' + fleetEscape_(car.vin) + '">貸出履歴</button>' +
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
      return '<article class="ring-fleet-history-row">' +
        '<p class="ring-fleet-history-dates">' + fleetEscape_(b.startDate) + ' 〜 ' + fleetEscape_(b.endDate) + '</p>' +
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
    var car = fleetFleetOnly_(fleetMine_()).find(function (c) { return String(c.vin) === String(vin); });
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

  function fleetRenderFromLocalCache_() {
    if (typeof loadFleetBookingsLocal_ === 'function') {
      fleetApplyBookingsCache_(loadFleetBookingsLocal_(profile));
      fleetBookingsSyncOk = false;
      fleetSyncFromCache = true;
    }
    renderFleetSummary_();
    renderFleetList_(false);
    renderCalendars_();
    renderMobDayAgenda_();
    renderDeskTodayPanel_();
    renderDeskOutPanel_();
  }

  function fleetListCardHtml_(vehicles) {
    if (!vehicles.length) return '<div class="empty-msg">該当する車両がありません</div>';
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

  function renderFleetSummary_() {
    var all = fleetFleetOnly_(fleetMine_());
    var syncWarn = !fleetBookingsSyncOk || !fleetVehiclesSyncOk;
    var warnText = '';
    if (syncWarn) {
      var parts = [];
      if (!fleetVehiclesSyncOk) parts.push('車両');
      if (!fleetBookingsSyncOk) parts.push('予約');
      warnText = parts.join('・') + 'の最新情報を取得できません。表示は参考または未確定です。';
    }
    ['fleetSummaryHint', 'fleetMobSummaryHint'].forEach(function (hid) {
      var hintEl = document.getElementById(hid);
      if (!hintEl) return;
      if (syncWarn) {
        hintEl.hidden = false;
        hintEl.textContent = warnText;
      } else {
        hintEl.hidden = true;
        hintEl.textContent = '';
      }
    });
    function setStat(id, val, unknown) {
      var el = document.getElementById(id);
      if (!el) return;
      el.textContent = unknown ? '—' : String(val);
      el.classList.toggle('is-unknown', !!unknown);
    }
    setStat('fleetStatTotal', all.length, !fleetVehiclesSyncOk && !all.length);
    var outs = ringFleetListActiveOutBookings_(profile, bookingsCache);
    setStat('fleetStatOut', outs.length, !fleetBookingsSyncOk);
    var today = ringFormatDateToYmdLocal_(new Date());
    var list = fleetBookingsForShop_(bookingsCache);
    var startToday = list.filter(function (b) {
      return b && b.startDate === today && b.status !== 'cancelled' && b.status !== 'returned';
    }).length;
    var endToday = list.filter(function (b) {
      return b && b.endDate === today && (b.status === 'out' || b.status === 'confirmed');
    }).length;
    setStat('fleetStatStartToday', startToday, !fleetBookingsSyncOk);
    setStat('fleetStatEndToday', endToday, !fleetBookingsSyncOk);
    setStat('fleetMobStatOut', outs.length, !fleetBookingsSyncOk);
    setStat('fleetMobStatEndToday', endToday, !fleetBookingsSyncOk);
    setStat('fleetMobStatStartToday', startToday, !fleetBookingsSyncOk);
  }

  function renderDeskTodayPanel_() {
    var host = document.getElementById('fleetDeskTodayPanel');
    if (!host) return;
    if (!fleetBookingsSyncOk) {
      host.innerHTML = '<p style="margin:0;color:#b91c1c;font-weight:800;">本日の予定を取得できません</p>';
      return;
    }
    var today = ringFormatDateToYmdLocal_(new Date());
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
    if (!fleetVehiclesSyncOk) {
      el.hidden = false;
      el.innerHTML = '<h2>車両情報を確認できません</h2><p>通信または同期の問題で車両一覧を取得できませんでした。「更新」を押すか、接続を確認してください。</p>';
      return;
    }
    if (!count) {
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

  function fleetWeekDaysFromAnchor_(anchorYmd) {
    var d = fleetYmdToDate_(anchorYmd);
    var dow = d.getDay();
    var start = new Date(d);
    start.setDate(start.getDate() - dow);
    var week = [];
    for (var i = 0; i < 7; i++) {
      var cd = new Date(start);
      cd.setDate(start.getDate() + i);
      week.push({
        ymd: ringFormatDateToYmdLocal_(cd),
        d: cd.getDate(),
        y: cd.getFullYear(),
        m: cd.getMonth() + 1
      });
    }
    return week;
  }

  function fleetBookingsForRange_(startYmd, endYmd) {
    return fleetBookingsForShop_(bookingsCache).filter(function (b) {
      if (!b) return false;
      if (!showReturnedHistory && (b.status === 'returned' || b.status === 'cancelled')) return false;
      if (fleetTab !== 'fleet_all') {
        var v = fleetFleetOnly_(fleetMine_()).find(function (c) { return String(c.vin) === String(b.vin); });
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
    var map = { reserved: '予約', confirmed: '予約確定', out: '貸出中', returned: '返却済', cancelled: 'キャンセル' };
    return map[String(st || '').toLowerCase()] || st;
  }

  function fleetPlateSuffixForBooking_(b) {
    var car = fleetFleetOnly_(fleetMine_()).find(function (c) { return String(c.vin) === String(b.vin); });
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
    if (!fleetBookingsSyncOk) {
      host.hidden = false;
      host.innerHTML = '<h3>' + fleetEscape_(mobSelectedYmd) + '</h3><p style="margin:0;color:#b45309;font-weight:800;">この日の予定を取得できません</p>';
      return;
    }
    var bookings = fleetBookingsForRange_(mobSelectedYmd, mobSelectedYmd);
    if (!bookings.length) {
      host.hidden = false;
      host.innerHTML = '<h3>' + fleetEscape_(mobSelectedYmd) + '</h3><p style="margin:0;font-weight:700;color:#64748b;">予定はありません</p>';
      return;
    }
    host.hidden = false;
    host.innerHTML = '<h3>' + fleetEscape_(mobSelectedYmd) + ' の予定</h3>' + bookings.map(function (b) {
      return '<button type="button" class="ring-fleet-mob-agenda-item" data-booking-id="' + fleetEscape_(b.bookingId) + '">' +
        '<strong>' + fleetEscape_(fleetVehicleName_(b.vin)) + '</strong>' +
        '<span>下4桁 ' + fleetEscape_(fleetPlateSuffixForBooking_(b)) + ' · ' +
        fleetEscape_(fleetBookingStatusLabel_(b.status)) + ' · ' +
        fleetEscape_(b.startDate) + '〜' + fleetEscape_(b.endDate) + '</span></button>';
    }).join('');
  }

  function renderDeskEmptyState_() {
    var el = document.getElementById('fleetDeskEmptyState');
    if (!el) return;
    if (!fleetVehiclesSyncOk) {
      el.hidden = false;
      el.innerHTML = '<h2>車両情報を確認できません</h2><p>通信または同期の問題で車両一覧を取得できませんでした。「更新」を押すか、接続を確認してください。未登録と判断しないでください。</p>';
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
    var now = new Date();
    calYear = now.getFullYear();
    calMonth = now.getMonth() + 1;
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
      if (el) el.textContent = pack.allFleet.length;
    });
    ['cntRental', 'cntRentalDesk'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.textContent = rentalN;
    });
    ['cntLoaner', 'cntLoanerDesk'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.textContent = loanerN;
    });
    syncFleetSearchClear_();
    var vehicles = pack.vehicles;
    var listHtml = fleetListCardHtml_(vehicles);
    var listArea = document.getElementById('fleetListArea');
    if (listArea) listArea.innerHTML = listHtml;
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
    var y = year != null ? year : calYear;
    var m = month != null ? month : calMonth;
    var weeks = ringFleetCalendarWeeksJst_(y, m);
    var vehicles = fleetFilteredVehicles_().vehicles;
    var bookings = fleetBookingsForMonth_(y, m);
    var isMobCompact = hostId === 'fleetCalMob' && String(classWeek || '').indexOf('is-month-compact') >= 0;
    var todayYmd = ringFormatDateToYmdLocal_(new Date());
    var title = y + '年' + m + '月';
    var titleEl = document.querySelector('[data-cal-title="' + hostId + '"]');
    if (titleEl) {
      titleEl.textContent = title;
      if (hostId === 'fleetCalMob') titleEl.hidden = mobCalMode === 'week';
    }

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
        var label = fleetVehicleName_(b.vin).slice(0, 8);
        var barLabel = isMobCompact ? '·' : label;
        var tip = fleetVehicleName_(b.vin) + ' ' + b.startDate + '〜' + b.endDate;
        html += '<button type="button" class="ring-fleet-cal-bar st-' + st + '" style="grid-column:' +
          (bar.startCol + 1) + ' / span ' + bar.span + ';" data-booking-id="' + fleetEscape_(b.bookingId) + '"' +
          ' title="' + fleetEscape_(tip) + '" aria-label="' + fleetEscape_(tip) + '">' +
          fleetEscape_(barLabel) + '</button>';
      });
      html += '</div></div>';
    });
    html += '</div>';
    if (hostId === 'fleetCalDesk') return html;
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

  function renderMobWeekCalendar_() {
    var host = document.getElementById('fleetCalMob');
    if (!host) return;
    if (!mobWeekAnchorYmd) mobWeekAnchorYmd = ringFormatDateToYmdLocal_(new Date());
    var week = fleetWeekDaysFromAnchor_(mobWeekAnchorYmd);
    var weekCells = week.map(function (cell) {
      return { y: cell.y, m: cell.m, d: cell.d, ymd: cell.ymd };
    });
    var bookings = fleetBookingsForRange_(week[0].ymd, week[6].ymd);
    var todayYmd = ringFormatDateToYmdLocal_(new Date());
    var titleEl = document.querySelector('[data-cal-title="fleetCalMob"]');
    if (titleEl) {
      titleEl.hidden = false;
      titleEl.textContent = week[0].ymd.replace(/-/g, '/') + ' 〜 ' + week[6].ymd.replace(/-/g, '/');
    }
    var dow = ['日','月','火','水','木','金','土'];
    var head = '<div class="ring-fleet-mob-week-head">';
    week.forEach(function (cell, i) {
      var cls = 'ring-fleet-mob-week-day';
      if (cell.ymd === todayYmd) cls += ' is-today';
      if (cell.ymd === mobSelectedYmd) cls += ' is-selected';
      var n = fleetBookingCountOnDay_(cell.ymd, bookings);
      head += '<button type="button" class="' + cls + '" data-cal-ymd="' + fleetEscape_(cell.ymd) + '">' +
        '<span class="dow">' + dow[i] + '</span><span class="num">' + cell.d + '</span>' +
        (n ? '<span class="has-booking" aria-hidden="true"></span>' : '') + '</button>';
    });
    head += '</div>';
    var html = head + '<div class="ring-fleet-cal-grid"><div class="ring-fleet-cal-dow">' +
      dow.map(function (d) { return '<span>' + d + '</span>'; }).join('') + '</div>';
    html += '<div class="ring-fleet-cal-week ring-fleet-cal-mob">';
    weekCells.forEach(function (cell) {
      var cls = cell.ymd === todayYmd ? 'ring-fleet-cal-day is-today' : 'ring-fleet-cal-day';
      if (cell.ymd === mobSelectedYmd) cls += ' is-selected';
      html += '<button type="button" class="' + cls + '" data-cal-ymd="' + fleetEscape_(cell.ymd) + '"><div>' + cell.d + '</div></button>';
    });
    html += '<div class="ring-fleet-cal-bars">';
    for (var col = 0; col < 7; col++) html += '<div></div>';
    bookings.forEach(function (b) {
      var bar = ringFleetBookingBarInWeek_(b, weekCells);
      if (!bar) return;
      var st = String(b.status || 'reserved').toLowerCase();
      var tip = fleetVehicleName_(b.vin) + ' ' + b.startDate + '〜' + b.endDate;
      var label = fleetVehicleName_(b.vin).slice(0, 8);
      html += '<button type="button" class="ring-fleet-cal-bar st-' + st + '" style="grid-column:' +
        (bar.startCol + 1) + ' / span ' + bar.span + ';" data-booking-id="' + fleetEscape_(b.bookingId) + '"' +
        ' title="' + fleetEscape_(tip) + '">' + fleetEscape_(label) + '</button>';
    });
    html += '</div></div></div>';
    host.innerHTML = html;
  }

  function renderCalendars_() {
    if (fleetIsDesktop_()) {
      renderDeskDualCalendar_();
      renderCalendarInto_('fleetCalMob', 'ring-fleet-cal-mob', calYear, calMonth);
      return;
    }
    if (mobCalMode === 'week') renderMobWeekCalendar_();
    else renderCalendarInto_('fleetCalMob', 'ring-fleet-cal-mob is-month-compact', calYear, calMonth);
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
    if (fleetIsDesktop_() || !selectedBookingId) return;
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
      if (b.status === 'reserved') addBtn('予約を確定', 'confirmed', false);
      addBtn('キャンセル', 'cancelled', false);
    }
    if (b.status === 'out') {
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
    host.innerHTML = head + '<h4 style="margin:0 0 8px;font-size:15px;font-weight:900;">' + fleetEscape_(fleetVehicleName_(b.vin)) + '</h4>' +
      '<p style="margin:0 0 8px;font-size:12px;font-weight:700;color:#475569">下4桁：' + fleetEscape_(plate) + '<br>状態：' + fleetEscape_(stLabel) + '<br>' +
      fleetEscape_(b.startDate) + ' 〜 ' + fleetEscape_(b.endDate) + '</p>' +
      (sheetDue
        ? '<a class="car-info-btn" style="width:100%;margin-bottom:12px;display:inline-flex;justify-content:center;" href="' + fleetEscape_(fleetCheckSheetUrl_(b.vin)) + '">📋 チェックシート（貸出・返却時）</a>'
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
        endDate: patch.endDate || cur.endDate
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
      await refreshBookings_();
      if (!fleetContextCurrent_()) return;
      var okMsg = '予約情報を更新しました';
      if (patch.status === 'out' && cur.status !== 'out') okMsg = '貸出を開始しました';
      else if (patch.status === 'confirmed' && cur.status === 'reserved') okMsg = '予約を確定しました';
      else if (patch.status === 'returned') okMsg = '返却を完了しました';
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
    var btnUpd = document.getElementById('fleetResolveUpdate');
    var btnAdd = document.getElementById('fleetResolveAddNew');
    var btnRe = document.getElementById('fleetResolveRecheck');
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

  async function fleetApplyCreateSubmitResult_(vin, startDate, endDate, extra) {
    if (!fleetRequireOnline_()) return;
    var host = fleetCreateSubmitHost_();
    var saveBtn = document.getElementById('fleetNewSaveBtn');
    if (saveBtn && saveBtn.disabled) return;
    if (saveBtn) saveBtn.disabled = true;
    if (typeof showLoading === 'function') {
      showLoading(extra && extra.recheckOnly ? '確認中' : '登録中', extra && extra.recheckOnly ? '確認中…' : '登録中…');
    }
    var result = null;
    try {
      if (typeof ringFleetHandleCreateBookingSubmit_ !== 'function') throw new Error('API missing');
      var payload = Object.assign({ vin: vin, startDate: startDate, endDate: endDate, status: 'reserved' }, extra || {});
      result = await ringFleetHandleCreateBookingSubmit_(profile, payload);
    } catch (err) {
      if (!fleetContextCurrent_()) return;
      if (typeof showToast === 'function') showToast('error', '通信に失敗しました。');
    } finally {
      if (fleetContextCurrent_() && typeof hideLoading === 'function') hideLoading();
      if (saveBtn) saveBtn.disabled = false;
    }
    if (!fleetContextCurrent_()) return;
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
        if (typeof showToast === 'function') {
          showToast('success', result.outcome === 'resolved_update' ? '予約情報を更新しました' : '予約を登録しました');
        }
        refreshBookings_();
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
      document.getElementById('fleetProceedCreate').onclick = function () {
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
      '<p class="ring-fleet-avail-hint" style="margin-bottom:6px;">表示時点の空き状況です。保存時にサーバーで重複を確認します。</p>' +
      '<p class="ring-fleet-avail-hint" style="margin-bottom:10px;font-size:11px;color:#64748b;">ここでは予約の登録のみ行います。お客様への貸出は、開始日に「貸出開始」を押してください。</p>' +
      '<button type="button" class="primary ring-fleet-confirm-save" id="fleetNewSaveBtn">予約を登録</button>';
  }

  function fleetBindConfirmSave_(host, vin, startDate, endDate) {
    if (!host) return;
    var recheck = document.getElementById('fleetUnresolvedRecheck');
    if (recheck) {
      recheck.onclick = function () {
        var s = document.getElementById('fleetNewStart') ? document.getElementById('fleetNewStart').value : startDate;
        var e = document.getElementById('fleetNewEnd') ? document.getElementById('fleetNewEnd').value : endDate;
        fleetApplyCreateSubmitResult_(vin, s, e, { recheckOnly: true });
      };
    }
    var saveBtn = document.getElementById('fleetNewSaveBtn');
    if (!saveBtn) return;
    saveBtn.onclick = function () { fleetTrySaveNewBooking_(vin, startDate, endDate, host); };
  }

  async function fleetTrySaveNewBooking_(vin, startDate, endDate, host) {
    if (!fleetRequireOnline_()) return;
    if (!fleetBookingsSyncOk && typeof navigator !== 'undefined' && navigator.onLine === false) {
      if (typeof showToast === 'function') showToast('error', '最新の空き状況を確認できません。通信を確認してから再試行してください。');
      return;
    }
    if (typeof ringFleetEnsureBookingsSyncedForRange_ === 'function') {
      if (typeof showLoading === 'function') showLoading('確認中', '読み込み中…');
      var syncRes = await ringFleetEnsureBookingsSyncedForRange_(profile, startDate, endDate);
      if (!fleetContextCurrent_()) return;
      if (typeof hideLoading === 'function') hideLoading();
      if (!fleetRequireOnline_()) return;
      fleetBookingsSyncOk = !!syncRes.ok;
      fleetApplyBookingsCache_(syncRes.bookings || bookingsCache);
      if (!syncRes.ok) {
        if (typeof showToast === 'function') {
          showToast('error', '最新の空き状況を確認できません。接続を確認してから保存してください。');
        }
        return;
      }
    }
  if (!ringFleetVinAvailableForRange_(vin, startDate, endDate, fleetBookingsForShop_(bookingsCache))) {
      if (typeof showToast === 'function') showToast('warning', 'この期間は予約できない可能性があります。空車を再検索してください。');
      return;
    }
    fleetApplyCreateSubmitResult_(vin, startDate, endDate, {});
  }

  function openNewBookingForm_(vin, startDate, endDate) {
    selectedVin = vin;
    selectedBookingId = '';
    var host = document.getElementById('fleetDetailPanel');
    if (!host) return;
    var today = ringFormatDateToYmdLocal_(new Date());
    var s = startDate || today;
    var e = endDate || today;
    host.innerHTML = fleetConfirmPanelHtml_(vin, s, e, '');
    fleetBindConfirmSave_(host, vin, s, e);
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
    wizardState = null;
    var el = document.getElementById('fleetNewBookingWizard');
    if (el) { el.hidden = true; el.setAttribute('aria-hidden', 'true'); el.innerHTML = ''; }
  }

  function fleetOutBookingCardHtml_(b, pickAttr) {
    var car = fleetFleetOnly_(fleetMine_()).find(function (c) { return String(c.vin) === String(b.vin); });
    var name = car ? ringVehicleListDisplayName_(car) : fleetVehicleName_(b.vin);
    var catLabel = car ? ringVehicleCategoryLabelJa_(car.vehicleCategory) : '';
    var plate = fleetPlateLabelForCar_(car);
    plate = plate !== '—' ? 'ナンバー：' + plate : 'ナンバー：未登録';
    var overdue = ringFleetOutReturnIsOverdue_(b)
      ? '<p class="ring-fleet-out-overdue">⚠ 返却予定を過ぎています（返却遅れ）</p>' : '';
    var attr = pickAttr ? ' ' + pickAttr + '="' + fleetEscape_(b.bookingId) + '"' : '';
    return '<div class="ring-fleet-avail-card"' + attr + '><strong>' + fleetEscape_(name) + '</strong>' +
      '<p class="meta-line">' + fleetEscape_(catLabel) + ' · ' + fleetEscape_(plate) + '</p>' +
      '<p class="meta-line">貸出：' + fleetEscape_(b.startDate) + ' 〜 返却予定：' + fleetEscape_(b.endDate) + '</p>' +
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
          '<p style="margin:0 0 6px;font-weight:900;">貸出前チェックシートを確認してください</p>' +
          '<p style="margin:0;">Googleドライブ等に保存したチェックシートPDFをスタッフが手動で開き、車両状態を目視確認してから返却を完了してください。' +
          'RinG-AutoからPDFは自動取得しません。</p></div>';
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
      await refreshBookings_();
      if (!fleetContextCurrent_()) return;
      closeNewBookingWizard_();
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

  function openNewBookingWizard_(preset) {
    var today = ringFormatDateToYmdLocal_(new Date());
    wizardState = Object.assign({
      kind: 'booking',
      step: 'choose',
      mode: '',
      catFilter: fleetTab === 'loaner' || fleetTab === 'rental' ? fleetTab : 'fleet_all',
      startDate: today,
      endDate: today,
      vin: '',
      pickStart: '',
      pickEnd: ''
    }, preset || {});
    renderNewBookingWizard_();
  }

  function wizardGoBack_() {
    if (!wizardState) return;
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
    var start = wizardState.startDate;
    var end = wizardState.endDate;
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
    wizardState.step = 'list';
    renderNewBookingWizard_();
  }

  function renderNewBookingWizard_() {
    var shell = document.getElementById('fleetNewBookingWizard');
    if (!shell || !wizardState || wizardState.kind === 'return') return;
    shell.hidden = false;
    shell.setAttribute('aria-hidden', 'false');
    var title = { choose: '新しい予約', dates: '日付から探す', list: '空いている車両', vehicles: '車両から探す',
      vin_cal: '予約済みの確認', vin_dates: '貸出日を選択', confirm: '内容の確認' }[wizardState.step] || '新しい予約';
    var inner = '<div class="ring-fleet-wizard-inner"><div class="ring-fleet-wizard-head">' +
      '<button type="button" class="ring-fleet-wizard-back"' + (wizardState.step === 'choose' ? ' style="visibility:hidden"' : '') +
      '>戻る</button><h2>' + fleetEscape_(title) + '</h2>' +
      '<button type="button" class="ring-fleet-wizard-close">閉じる</button></div>';
    inner += fleetAvailStaleBanner_();
    if (wizardState.step === 'choose') {
      inner += '<p style="font-size:13px;font-weight:700;color:#475569;margin:0 0 8px;">予約の探し方を選んでください</p>' +
        '<div class="ring-fleet-wizard-step-btns">' +
        '<button type="button" class="primary-mode" data-wiz-mode="by_date">📅 日付から探す</button>' +
        '<button type="button" class="primary-mode" data-wiz-mode="by_vehicle">🚗 車両から探す</button></div>';
    } else if (wizardState.step === 'dates') {
      inner += '<div class="ring-fleet-field"><label>貸出開始日</label><input type="date" id="wizStart" value="' + fleetEscape_(wizardState.startDate) + '"></div>' +
        '<div class="ring-fleet-field"><label>返却予定日</label><input type="date" id="wizEnd" value="' + fleetEscape_(wizardState.endDate) + '"></div>' +
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
        inner += '<div class="ring-fleet-avail-card" data-wiz-pick-vin="' + fleetEscape_(car.vin) + '"><strong>' +
          fleetEscape_(name) + '</strong>' + fleetVehicleAvailMetaHtml_(car) + '</div>';
      });
    } else if (wizardState.step === 'vehicles') {
      var pack = fleetFilteredVehicles_();
      if (!pack.vehicles.length) inner += '<p class="empty-msg">車両がありません</p>';
      pack.vehicles.forEach(function (car) {
        inner += '<div class="ring-fleet-avail-card" data-wiz-pick-vin="' + fleetEscape_(car.vin) + '"><strong>' +
          fleetEscape_(ringVehicleListDisplayName_(car)) + '</strong>' + fleetVehicleAvailMetaHtml_(car) + '</div>';
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
        '<button type="button" class="ring-fleet-confirm-save" id="wizVinCheck">この期間で予約可能か確認</button>';
    } else if (wizardState.step === 'confirm') {
      inner += fleetConfirmPanelHtml_(wizardState.vin, wizardState.startDate, wizardState.endDate, '');
    }
    inner += '</div>';
    shell.innerHTML = inner;
    shell.querySelector('.ring-fleet-wizard-close').onclick = closeNewBookingWizard_;
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
        wizardState.startDate = document.getElementById('wizStart').value;
        wizardState.endDate = document.getElementById('wizEnd').value;
        if (ringYmdCompare_(wizardState.startDate, wizardState.endDate) > 0) {
          if (typeof showToast === 'function') showToast('error', '返却予定日は貸出開始日以降にしてください');
          return;
        }
        if (typeof showLoading === 'function') showLoading('確認中', '読み込み中…');
        var syncRes = await ringFleetEnsureBookingsSyncedForRange_(profile, wizardState.startDate, wizardState.endDate);
        if (!fleetContextCurrent_()) return;
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
      html += '<div class="ring-fleet-avail-card" data-desk-pick="' + fleetEscape_(car.vin) + '"><strong>' +
        fleetEscape_(ringVehicleListDisplayName_(car)) + '</strong>' + fleetVehicleAvailMetaHtml_(car) + '</div>';
    });
    host.innerHTML = html;
    host.querySelectorAll('[data-desk-pick]').forEach(function (card) {
      card.onclick = function () {
        openNewBookingForm_(card.getAttribute('data-desk-pick'), start, end);
      };
    });
  }

  async function refreshBookings_(loadShop, loadGen) {
    if (!fleetContextCurrent_()) return false;
    var readGen = ++fleetBookingsReadGen;
    fleetBookingsSyncOk = false;
    fleetSyncFromCache = false;
    var res1 = await syncFleetBookingsFromServer(calYear, calMonth);
    if (!fleetContextCurrent_() || readGen !== fleetBookingsReadGen) return false;
    var nm = fleetCalNextMonth_(calYear, calMonth);
    var res2 = await syncFleetBookingsFromServer(nm.y, nm.m);
    if (!fleetContextCurrent_() || readGen !== fleetBookingsReadGen) return false;
    if (loadGen != null && (loadGen !== fleetLoadGen || fleetCurrentShopId_() !== loadShop)) {
      return false;
    }
    var mergedList = typeof loadFleetBookingsLocal_ === 'function'
      ? loadFleetBookingsLocal_(profile)
      : (res2.bookings && res2.bookings.length ? res2.bookings : (res1.bookings || []));
    fleetApplyBookingsCache_(mergedList.length ? mergedList : (res1.bookings || []));
    fleetSyncFromCache = !!((res1 && res1.fromCache && !res1.ok) || (res2 && res2.fromCache && !res2.ok));
    fleetBookingsSyncOk = !!(res1 && res1.ok && res2 && res2.ok);
    if (!fleetBookingsSyncOk && typeof showToast === 'function') {
      if (fleetSyncFromCache && (mergedList || []).length) {
        showToast('warning', 'サーバーと同期できませんでした。自店舗の保存済み予約を表示しています。');
      } else if ((res1 && res1.error === 'NETWORK') || (res2 && res2.error === 'NETWORK')) {
        showToast('warning', '予約の取得に失敗しました。' + ((mergedList || []).length ? '保存済みデータを表示しています。' : ''));
      }
    }
    renderFleetList_(true);
    renderCalendars_();
    renderDetailPanel_();
    renderDeskOutPanel_();
    return fleetBookingsSyncOk;
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
    refreshBookings_();
  }

  function shiftMobWeek_(delta) {
    if (!mobWeekAnchorYmd) mobWeekAnchorYmd = ringFormatDateToYmdLocal_(new Date());
    var d = fleetYmdToDate_(mobWeekAnchorYmd);
    d.setDate(d.getDate() + delta * 7);
    mobWeekAnchorYmd = ringFormatDateToYmdLocal_(d);
    renderCalendars_();
    renderMobDayAgenda_();
  }

  function setMobCalMode_(mode) {
    mobCalMode = mode === 'month' ? 'month' : 'week';
    document.querySelectorAll('[data-mob-cal-mode]').forEach(function (btn) {
      btn.classList.toggle('is-active', btn.getAttribute('data-mob-cal-mode') === mobCalMode);
    });
    var navWeek = document.getElementById('fleetMobCalNavWeek');
    var navMonth = document.getElementById('fleetMobCalNavMonth');
    if (navWeek) navWeek.hidden = mobCalMode !== 'week';
    if (navMonth) navMonth.hidden = mobCalMode !== 'month';
    renderCalendars_();
    renderMobDayAgenda_();
  }

  function fleetSelectMobDay_(ymd) {
    if (!ymd) return;
    mobSelectedYmd = ymd;
    if (mobCalMode === 'week') {
      mobWeekAnchorYmd = ymd;
    } else {
      var parts = ymd.split('-');
      if (parts.length >= 2) {
        calYear = +parts[0];
        calMonth = +parts[1];
      }
    }
    renderCalendars_();
    renderMobDayAgenda_();
  }

  async function loadFleetPage_(manual) {
    if (!fleetContextCurrent_()) return;
    var loadShop = fleetCurrentShopId_();
    var loadGen = ++fleetLoadGen;
    if (manual && typeof showLoading === 'function') showLoading('更新中', '読み込み中…');
    fleetVehiclesSyncOk = true;
    if (typeof syncVehiclesFromServer === 'function') {
      try { await syncVehiclesFromServer(); } catch (e) { fleetVehiclesSyncOk = false; }
    }
    if (!fleetContextCurrent_() || loadGen !== fleetLoadGen || fleetCurrentShopId_() !== loadShop) {
      if (manual && fleetContextCurrent_() && typeof hideLoading === 'function') hideLoading();
      return;
    }
    var ok = await refreshBookings_(loadShop, loadGen);
    if (!ok || !fleetContextCurrent_() || loadGen !== fleetLoadGen || fleetCurrentShopId_() !== loadShop) {
      if (manual && fleetContextCurrent_() && typeof hideLoading === 'function') hideLoading();
      return;
    }
    if (typeof ringUpdateLastSyncLabel_ === 'function') ringUpdateLastSyncLabel_('ringFleetLastSync', fleetCacheKey);
    if (manual && fleetContextCurrent_() && typeof hideLoading === 'function') hideLoading();
  }

  window.addEventListener('DOMContentLoaded', function () {
    if (!isBizMode || !profile) { location.replace('login.html'); return; }
    if (typeof ringBootAuthForMode === 'function') {
      var boot = ringBootAuthForMode(userRole === 'dealer' ? 'business' : 'shop');
      if (!boot.ok) { location.replace(boot.redirect || 'login.html'); return; }
    }
    document.getElementById('backBtn').onclick = function () { location.href = fleetHomeUrl_(); };
    initCalMonth_();
    mobWeekAnchorYmd = ringFormatDateToYmdLocal_(new Date());
    mobSelectedYmd = mobWeekAnchorYmd;
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
      var td = ringFormatDateToYmdLocal_(new Date());
      deskStart.value = td;
      deskEnd.value = td;
      bindFleetDateField_(deskStart);
      bindFleetDateField_(deskEnd);
    }
    document.getElementById('fleetCalPrev').onclick = function () { shiftCalMonth_(-1); };
    document.getElementById('fleetCalNext').onclick = function () { shiftCalMonth_(1); };
    document.getElementById('fleetCalToday').onclick = function () { initCalMonth_(); refreshBookings_(); };

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

    document.querySelectorAll('[data-mob-cal-mode]').forEach(function (btn) {
      btn.addEventListener('click', function () { setMobCalMode_(btn.getAttribute('data-mob-cal-mode')); });
    });
    var wPrev = document.getElementById('fleetMobWeekPrev');
    var wNext = document.getElementById('fleetMobWeekNext');
    var wToday = document.getElementById('fleetMobWeekToday');
    if (wPrev) wPrev.onclick = function () { shiftMobWeek_(-1); };
    if (wNext) wNext.onclick = function () { shiftMobWeek_(1); };
    if (wToday) wToday.onclick = function () {
      mobWeekAnchorYmd = ringFormatDateToYmdLocal_(new Date());
      mobSelectedYmd = mobWeekAnchorYmd;
      renderCalendars_();
      renderMobDayAgenda_();
    };
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
      var bar = ev.target.closest('[data-booking-id]');
      if (bar && bar.closest('#fleetCalMob, #fleetMobDayAgenda, #fleetCalDesk')) {
        selectedBookingId = bar.getAttribute('data-booking-id');
        renderDetailPanel_();
        return;
      }
      var calDay = ev.target.closest('[data-cal-ymd]');
      if (calDay && calDay.closest('#fleetCalMob') && !ev.target.closest('.ring-fleet-cal-bar')) {
        var ymdMob = calDay.getAttribute('data-cal-ymd');
        if (!mobRangeAnchorYmd) {
          mobRangeAnchorYmd = ymdMob;
          fleetSelectMobDay_(ymdMob);
        } else {
          var rMob = fleetDeskRangeBetween_(mobRangeAnchorYmd, ymdMob);
          mobRangeAnchorYmd = '';
          openNewBookingWizard_({ mode: 'by_date', step: 'dates', startDate: rMob.start, endDate: rMob.end });
        }
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
    fleetRenderFromLocalCache_();
    loadFleetPage_(false);
  });
})();
