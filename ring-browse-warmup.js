/**
 * v66-1 ホーム先読み（安全なページ跨ぎ再利用が有効な場合のみ）
 */
(function (global) {
  'use strict';

  var MAX_PREFETCH = 2;
  var MAX_CONCURRENT = 1;
  var queue_ = [];
  var queuedSet_ = new Set();
  var running_ = 0;
  var userPriority_ = false;
  var scheduled_ = false;

  function canRun() {
    if (typeof ringBrowseCrossPageReuseAllowed_ === 'function' && !ringBrowseCrossPageReuseAllowed_()) {
      return false;
    }
    if (global.ringBrowseCoordinator && typeof ringBrowseCoordinator.isUserPriority === 'function' &&
      ringBrowseCoordinator.isUserPriority()) {
      return false;
    }
    return typeof syncMaintenanceHistoryForVin === 'function';
  }

  function vinHasCache(vin) {
    return typeof ringMaintenanceVinHasAuthorizedCache_ === 'function' &&
      ringMaintenanceVinHasAuthorizedCache_(vin);
  }

  function pickVins() {
    var out = [];
    if (typeof ringBrowseRecentVins_ === 'function') {
      ringBrowseRecentVins_().forEach(function (v) {
        if (out.length >= MAX_PREFETCH) return;
        if (v && out.indexOf(v) < 0) out.push(v);
      });
    }
    if (out.length < MAX_PREFETCH && typeof safeJsonParse === 'function') {
      var cars = safeJsonParse(localStorage.getItem('nappy_vehicles_v1'), []);
      if (Array.isArray(cars)) {
        cars.forEach(function (c) {
          if (out.length >= MAX_PREFETCH) return;
          var v = c && c.vin;
          if (v && out.indexOf(v) < 0) out.push(v);
        });
      }
    }
    return out.slice(0, MAX_PREFETCH);
  }

  function drain_() {
    if (!canRun() || userPriority_ || scheduled_ === false) return;
    while (running_ < MAX_CONCURRENT && queue_.length) {
      var vin = queue_.shift();
      queuedSet_.delete(vin);
      if (!vin || vinHasCache(vin)) continue;
      running_++;
      syncMaintenanceHistoryForVin(vin).finally(function () {
        running_--;
        drain_();
      });
    }
  }

  function scheduleHomeWarmup() {
    if (!canRun()) return;
    scheduled_ = true;
    pickVins().forEach(function (vin) {
      if (vinHasCache(vin) || queuedSet_.has(vin)) return;
      queuedSet_.add(vin);
      queue_.push(vin);
    });
    if (typeof ringDeferAfterPaint_ === 'function') {
      ringDeferAfterPaint_(function () { drain_(); });
    } else {
      setTimeout(drain_, 400);
    }
  }

  function setUserActive(active) {
    userPriority_ = !!active;
    if (userPriority_) queue_ = [];
    queuedSet_.clear();
  }

  global.ringBrowseWarmup = {
    scheduleHome: scheduleHomeWarmup,
    setUserActive: setUserActive,
    cancel: function () {
      scheduled_ = false;
      queue_ = [];
      queuedSet_.clear();
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);