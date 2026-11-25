/**
 * v66-1 閲覧通信の優先制御（ユーザー操作 > バックグラウンド先読み）
 */
(function (global) {
  'use strict';

  var userHoldUntil_ = 0;
  var wireInstalled_ = false;

  function setUserActive(ms) {
    var dur = typeof ms === 'number' && ms > 0 ? ms : 3500;
    userHoldUntil_ = Date.now() + dur;
    if (global.ringBrowseWarmup && typeof ringBrowseWarmup.setUserActive === 'function') {
      ringBrowseWarmup.setUserActive(true);
    }
    setTimeout(function () {
      if (Date.now() >= userHoldUntil_) {
        if (global.ringBrowseWarmup && typeof ringBrowseWarmup.setUserActive === 'function') {
          ringBrowseWarmup.setUserActive(false);
        }
      }
    }, dur);
  }

  var BROWSE_HOLD_HTML =
    '<p class="ring-browse-reauth" role="status" data-ring-browse-placeholder="1" ' +
    'style="padding:12px;margin:0;font-size:13px;font-weight:700;color:var(--muted,#64748b)">' +
    '表示内容を確認しています…</p>';

  function clearSensitiveBrowseContainer_(el) {
    if (!el) return;
    el.innerHTML = BROWSE_HOLD_HTML;
    el.setAttribute('aria-busy', 'true');
    if (el.dataset) {
      el.dataset.ringBrowseStale = '1';
      if (typeof ringCaptureRequestContext_ === 'function') {
        var ctx = ringCaptureRequestContext_();
        el.dataset.ringBrowseEpoch = String(ctx.epoch);
      }
    }
  }

  function invalidateSensitiveBrowseViews_() {
    if (typeof ringHistoryHandoffClear_ === 'function') ringHistoryHandoffClear_();
    if (typeof ringHistoryView_ !== 'undefined' && ringHistoryView_ && ringHistoryView_.clear) {
      try { ringHistoryView_.clear(); } catch (e) { /* ignore */ }
    }
    var marks = ['historyList', 'historyArea', 'editListArea', 'carListArea', 'fleetListArea'];
    marks.forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;
      clearSensitiveBrowseContainer_(el);
    });
  }

  function installBrowsePriorityWire_() {
    if (wireInstalled_ || typeof document === 'undefined') return;
    wireInstalled_ = true;
    var onIntent = function (ev) {
      var t = ev.target;
      if (!t || !t.closest) return;
      if (t.closest('a[href], button, input, select, textarea, [role="button"]')) setUserActive();
    };
    document.addEventListener('click', onIntent, true);
    document.addEventListener('touchstart', onIntent, { passive: true, capture: true });
    window.addEventListener('pageshow', function (ev) {
      invalidateSensitiveBrowseViews_();
      if (ev.persisted && typeof ringCaptureRequestContext_ === 'function') {
        invalidateSensitiveBrowseViews_();
      }
      if (global.ringBrowseWarmup && typeof ringBrowseWarmup.cancel === 'function') {
        ringBrowseWarmup.cancel();
      }
    });
    window.addEventListener('ring-auth-context-changed', function () {
      invalidateSensitiveBrowseViews_();
      if (global.ringBrowseWarmup && typeof ringBrowseWarmup.cancel === 'function') {
        ringBrowseWarmup.cancel();
      }
    });
  }

  global.ringBrowseCoordinator = {
    install: installBrowsePriorityWire_,
    setUserActive: setUserActive,
    isUserPriority: function () { return Date.now() < userHoldUntil_; }
  };

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', installBrowsePriorityWire_);
    } else {
      installBrowsePriorityWire_();
    }
  }
})(typeof window !== 'undefined' ? window : globalThis);