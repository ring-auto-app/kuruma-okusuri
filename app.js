/**
 * 車のお薬手帳 - 統合コアスクリプト (app.js)
 */

const RING_DEFAULT_GAS_URL = 'https://script.google.com/macros/s/AKfycbxG14jv9GXf4f9lFt5n7lAKqGmnqqnzW_S74H3ixePc3f21HJ8F7C49qFIBISQzAg63/exec';
/** `app.js` より先に `window.__RING_GAS_URL_OVERRIDE__` をセットすると本番 URL を差し替え可能 */
const GAS_URL = (typeof window !== 'undefined' && window.__RING_GAS_URL_OVERRIDE__)
    ? String(window.__RING_GAS_URL_OVERRIDE__).trim()
    : RING_DEFAULT_GAS_URL;
/** ads/ads.js から fetch する際の参照用（別スクリプトでは const が見えないため） */
if (typeof window !== 'undefined') window.__RING_GAS_URL__ = GAS_URL;

/** PWA 用: ブラウザのインストールプロンプトを保留 */
var ringDeferredInstallPrompt = null;
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    ringDeferredInstallPrompt = e;
  });
}

/** 一般ユーザー新規登録・Google 初回登録時の規約／プライバシーポリシー同意（sessionStorage） */
const RING_USER_REG_CONSENT_KEY = 'nappy_user_reg_consent';
/** クライアント・GAS で同一値であること（改版時は両方更新） */
const RING_LEGAL_TERMS_VERSION = '1.0';
const RING_LEGAL_PRIVACY_VERSION = '1.0';

function ringReadUserRegConsent() {
    try {
        const raw = sessionStorage.getItem(RING_USER_REG_CONSENT_KEY);
        if (!raw) return null;
        const o = safeJsonParse(raw, null);
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

const DB_VEHICLES = "nappy_vehicles_v1";
const DB_LOGS = "nappy_logs_v1";
const DB_INSPECTIONS = "inspections_v1"; 
const DB_CURRENT_USER = "nappy_current_user";  
const DB_LEGACY_PROFILE = "nappy_profile_v1";
const RING_TOKEN_USER = 'ring_user_token';
const RING_TOKEN_SHOP = 'ring_shop_token';
const RING_TOKEN_BIZ = 'ring_biz_token';
const RING_META_USER = 'ring_user_profile';
const RING_META_SHOP = 'ring_shop_profile';
const RING_META_BIZ = 'ring_biz_profile';
const RING_CURRENT_MODE = 'ring_current_mode';
/** @deprecated 移行用 */
const RING_PROFILE_USER = 'ring_profile_user';
/** @deprecated 移行用 */
const RING_PROFILE_SHOP = 'ring_profile_shop';
/** @deprecated 移行用 */
const RING_ACTIVE_ACCOUNT = 'ring_active_account';
const RING_AUTH_OFFLINE_GRACE_MS = 1000 * 60 * 60 * 24;
/** GAS 失敗時の再送キュー（C-01） */
const DB_RETRY_QUEUE = "ring_retry_queue_v1";

/** RinG Auto 公式LINE 友だち追加URL */
const RING_LINE_OFFICIAL_URL = (typeof window !== 'undefined' && window.__RING_LINE_OFFICIAL_URL__)
    ? String(window.__RING_LINE_OFFICIAL_URL__).trim()
    : 'https://lin.ee/pd390p5';
const RING_LINE_BTN_IMG = 'https://scdn.line-apps.com/n/line_add_friends/btn/ja.png';
const RING_LINE_PROMO_HIDDEN_KEY = 'ring_line_promo_hidden';

function ringIsLinePromoHiddenLocally() {
    try {
        return localStorage.getItem(RING_LINE_PROMO_HIDDEN_KEY) === '1';
    } catch (e) {
        return false;
    }
}

/** LINE連携済み（users_v1 L列）または端末で非表示指定済み */
function ringHasLineFriendStatus() {
    if (ringIsLinePromoHiddenLocally()) return true;
    var profile = typeof getCurrentProfile === 'function' ? getCurrentProfile() : null;
    if (profile && profile.lineUserId && String(profile.lineUserId).trim()) return true;
    return false;
}

function ringShouldShowLinePromo() {
    if (!RING_LINE_OFFICIAL_URL) return false;
    return !ringHasLineFriendStatus();
}

function ringHideLinePromo() {
    try {
        localStorage.setItem(RING_LINE_PROMO_HIDDEN_KEY, '1');
    } catch (e) { /* ignore */ }
}

function ringRemoveLinePromoElements() {
    document.querySelectorAll('.ring-line-promo').forEach(function (el) {
        var slot = el.parentElement;
        el.remove();
        if (slot && (slot.id === 'ringLineLinkSlot' || slot.classList.contains('ring-line-promo-slot'))) {
            slot.style.display = 'none';
        }
    });
}

function ringHideLinePromoAndRefresh() {
    ringHideLinePromo();
    ringRemoveLinePromoElements();
}

function ringOnLinePromoFollowClick(e) {
    ringHideLinePromo();
    setTimeout(ringRemoveLinePromoElements, 80);
}

function ringGetLineOfficialButtonHtml() {
    var url = RING_LINE_OFFICIAL_URL.replace(/"/g, '&quot;');
    return '<a class="ring-line-official-btn" href="' + url + '" target="_blank" rel="noopener noreferrer" ' +
        'onclick="ringOnLinePromoFollowClick(event)">' +
        '<img src="' + RING_LINE_BTN_IMG + '" alt="友だち追加" height="36" border="0">' +
        '</a>';
}

function ringMountLinePromo(container, opts) {
    opts = opts || {};
    if (!container || container.getAttribute('data-ring-line-mounted') === '1') return;
    container.setAttribute('data-ring-line-mounted', '1');
    if (!ringShouldShowLinePromo()) {
        container.style.display = 'none';
        return;
    }
    var dismissHtml = opts.dismiss === false ? '' :
        '<button type="button" class="ring-line-promo-dismiss" onclick="ringHideLinePromoAndRefresh()">友だち追加済み</button>';
    var copyHtml = opts.copy ? '<p class="ring-line-promo-copy">' + opts.copy + '</p>' : '';
    container.innerHTML =
        '<div class="ring-line-promo">' +
        copyHtml +
        ringGetLineOfficialButtonHtml() +
        dismissHtml +
        '</div>';
    container.style.display = '';
}

function ringInitLinePromoSlots() {
    document.querySelectorAll('[data-ring-line-promo], #ringLineLinkSlot').forEach(function (el) {
        var opts = {};
        if (el.getAttribute('data-ring-line-dismiss') === '0') opts.dismiss = false;
        ringMountLinePromo(el, opts);
    });
}

/**
 * Gemini 等の ```json フェンス・前後テキストを除去
 */
function sanitizeJsonResponse(text) {
    var s = String(text || '').trim().replace(/^\uFEFF/, '');
    if (!s) return '';
    var fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fence) s = fence[1].trim();
    var startObj = s.indexOf('{');
    var startArr = s.indexOf('[');
    var start = -1;
    if (startObj >= 0 && startArr >= 0) start = Math.min(startObj, startArr);
    else if (startObj >= 0) start = startObj;
    else if (startArr >= 0) start = startArr;
    if (start > 0) s = s.slice(start);
    var end = Math.max(s.lastIndexOf('}'), s.lastIndexOf(']'));
    if (end >= 0 && end < s.length - 1) s = s.slice(0, end + 1);
    return s.trim();
}

/**
 * localStorage JSON 破損対策（H-03）。失敗時は退避キーに生文字列を残す。
 */
function safeJsonParse(str, fallback) {
    try {
        if (str == null || str === '') return fallback;
        return JSON.parse(sanitizeJsonResponse(str) || str);
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
 * ストロングスタイル認証（3スロット: user / shop / business）
 */
function ringNormalizeMode(mode) {
    var m = String(mode || '').trim().toLowerCase();
    if (m === 'shop' || m === 'factory') return 'shop';
    if (m === 'business' || m === 'biz' || m === 'dealer') return 'business';
    return 'user';
}

function ringClassifyProfile(profile) {
    var st = String(profile && profile.shopType || '');
    if (st === 'factory') return 'shop';
    if (st === 'dealer') return 'business';
    return 'user';
}

function ringModeTokenKey(mode) {
    mode = ringNormalizeMode(mode);
    if (mode === 'shop') return RING_TOKEN_SHOP;
    if (mode === 'business') return RING_TOKEN_BIZ;
    return RING_TOKEN_USER;
}

function ringModeMetaKey(mode) {
    mode = ringNormalizeMode(mode);
    if (mode === 'shop') return RING_META_SHOP;
    if (mode === 'business') return RING_META_BIZ;
    return RING_META_USER;
}

function ringWriteAuthSlot(mode, slot) {
    mode = ringNormalizeMode(mode);
    if (!slot || !slot.profile) return;
    localStorage.setItem(ringModeTokenKey(mode), slot.token || '');
    localStorage.setItem(ringModeMetaKey(mode), JSON.stringify({
        profile: slot.profile,
        updatedAt: slot.updatedAt || new Date().toISOString(),
        verifiedAt: slot.verifiedAt || ''
    }));
}

function ringReadAuthSlot(mode) {
    mode = ringNormalizeMode(mode);
    var token = localStorage.getItem(ringModeTokenKey(mode)) || '';
    var meta = safeJsonParse(localStorage.getItem(ringModeMetaKey(mode)), null);
    if (!meta || !meta.profile) {
        if (!token) return null;
        return { token: token, profile: null, updatedAt: '', verifiedAt: '' };
    }
    return {
        token: token,
        profile: meta.profile,
        updatedAt: meta.updatedAt || '',
        verifiedAt: meta.verifiedAt || ''
    };
}

function ringSetCurrentMode(mode) {
    mode = ringNormalizeMode(mode);
    localStorage.setItem(RING_CURRENT_MODE, mode);
    localStorage.setItem(RING_ACTIVE_ACCOUNT, mode === 'business' ? 'shop' : mode);
}

function ringGetActiveMode() {
    var mode = localStorage.getItem(RING_CURRENT_MODE);
    if (mode === 'user' || mode === 'shop' || mode === 'business') return mode;
    var legacy = localStorage.getItem(RING_ACTIVE_ACCOUNT);
    if (legacy === 'user') return 'user';
    if (legacy === 'shop') {
        var profile = safeJsonParse(localStorage.getItem(DB_CURRENT_USER), null);
        if (profile && profile.shopType === 'dealer') return 'business';
        return 'shop';
    }
    var p = safeJsonParse(localStorage.getItem(DB_CURRENT_USER), null);
    if (!p) return 'user';
    return ringClassifyProfile(p);
}

/** @deprecated ringGetActiveMode を使用 */
function ringGetActiveAccountType() {
    return ringGetActiveMode();
}

/**
 * アクティブモードのスロット token を ring_auth_token へミラーして返す。
 * 三重アカウント導入後、OCR/GAS 送信はこの関数経由で token を解決する。
 * @returns {string}
 */
function ringResolveActiveAuthToken() {
    ringMigrateLegacyAuth();
    var mode = ringGetActiveMode();
    var slot = ringReadAuthSlot(mode);
    var cached = localStorage.getItem('ring_auth_token') || '';
    if (slot && slot.token) {
        if (slot.token !== cached) {
            localStorage.setItem('ring_auth_token', slot.token);
        }
        return slot.token;
    }
    if (cached) return cached;
    var modes = ['user', 'shop', 'business'];
    var i;
    for (i = 0; i < modes.length; i++) {
        var s = ringReadAuthSlot(modes[i]);
        if (s && s.token && s.profile) {
            ringApplyActiveSession(s, modes[i]);
            return s.token;
        }
    }
    return '';
}

/**
 * OCR 入力画面用: モード別スロット → ring_auth_token 同期（verify は OCR 実行時）
 * @param {'user'|'shop'|'business'=} expectedMode
 */
function ringBootAuthForOcrPage(expectedMode) {
    ringMigrateLegacyAuth();
    if (expectedMode) {
        expectedMode = ringNormalizeMode(expectedMode);
        var slot = ringReadAuthSlot(expectedMode);
        if (slot && slot.token && slot.profile) {
            ringSetCurrentMode(expectedMode);
            ringApplyActiveSession(slot, expectedMode);
            if (typeof window !== 'undefined') window.__ringSessionVerified = true;
            return;
        }
    }
    ringResolveActiveAuthToken();
    if (typeof window !== 'undefined') window.__ringSessionVerified = true;
}

function ringApplyActiveSession(slot, mode) {
    if (!slot || !slot.profile) return;
    if (mode) ringSetCurrentMode(mode);
    var raw = JSON.stringify(slot.profile);
    localStorage.setItem(DB_CURRENT_USER, raw);
    localStorage.setItem(DB_LEGACY_PROFILE, raw);
    if (slot.token) localStorage.setItem('ring_auth_token', slot.token);
    if (typeof window !== 'undefined') window.__ringSessionVerified = true;
}

function ringSaveAuthSlot(profile, authToken, opts) {
    opts = opts || {};
    if (!profile) return;
    if (!isRingDemoProfile(profile)) {
        purgeRingDemoLocalData();
    }
    var mode = ringClassifyProfile(profile);
    var now = new Date().toISOString();
    var existing = ringReadAuthSlot(mode);
    var token = authToken;
    if (token == null || String(token).trim() === '') {
        token = (existing && existing.token) || localStorage.getItem('ring_auth_token') || '';
    }
    var slot = {
        token: token || '',
        profile: profile,
        updatedAt: now,
        verifiedAt: opts.verifiedAt || now
    };
    ringWriteAuthSlot(mode, slot);
    ringSetCurrentMode(mode);
    ringApplyActiveSession(slot, mode);
}

function ringMigrateLegacySlotObject(key, defaultMode) {
    var legacy = safeJsonParse(localStorage.getItem(key), null);
    if (!legacy || !legacy.profile) return;
    var mode = defaultMode || ringClassifyProfile(legacy.profile);
    if (ringReadAuthSlot(mode) && ringReadAuthSlot(mode).profile) return;
    ringWriteAuthSlot(mode, {
        token: legacy.token || '',
        profile: legacy.profile,
        updatedAt: legacy.updatedAt || new Date().toISOString(),
        verifiedAt: legacy.verifiedAt || ''
    });
}

function ringMigrateLegacyAuth() {
    try {
        var hasNew = localStorage.getItem(RING_TOKEN_USER) ||
            localStorage.getItem(RING_TOKEN_SHOP) ||
            localStorage.getItem(RING_TOKEN_BIZ);
        if (!hasNew) {
            ringMigrateLegacySlotObject(RING_PROFILE_USER, 'user');
            var shopLegacy = safeJsonParse(localStorage.getItem(RING_PROFILE_SHOP), null);
            if (shopLegacy && shopLegacy.profile) {
                var shopMode = ringClassifyProfile(shopLegacy.profile);
                ringWriteAuthSlot(shopMode, {
                    token: shopLegacy.token || '',
                    profile: shopLegacy.profile,
                    updatedAt: shopLegacy.updatedAt || new Date().toISOString(),
                    verifiedAt: shopLegacy.verifiedAt || ''
                });
            }
            if (!localStorage.getItem(RING_CURRENT_MODE)) {
                var active = localStorage.getItem(RING_ACTIVE_ACCOUNT);
                if (active === 'user') ringSetCurrentMode('user');
                else if (active === 'shop') {
                    var cur = safeJsonParse(localStorage.getItem(DB_CURRENT_USER), null);
                    ringSetCurrentMode(cur && cur.shopType === 'dealer' ? 'business' : 'shop');
                }
            }
            var profile = safeJsonParse(localStorage.getItem(DB_CURRENT_USER), null);
            if (!profile) profile = safeJsonParse(localStorage.getItem(DB_LEGACY_PROFILE), null);
            var tok = localStorage.getItem('ring_auth_token');
            if (profile && tok) {
                var migMode = ringClassifyProfile(profile);
                var existing = ringReadAuthSlot(migMode);
                if (!existing || !existing.profile) {
                    ringSaveAuthSlot(profile, tok, { verifiedAt: '' });
                }
            }
        }
    } catch (e) { /* ignore */ }
}

function ringClearAuthSlot(mode) {
    mode = ringNormalizeMode(mode);
    localStorage.removeItem(ringModeTokenKey(mode));
    localStorage.removeItem(ringModeMetaKey(mode));
    if (ringGetActiveMode() === mode) {
        localStorage.removeItem(RING_CURRENT_MODE);
        localStorage.removeItem(RING_ACTIVE_ACCOUNT);
        localStorage.removeItem(DB_CURRENT_USER);
        localStorage.removeItem(DB_LEGACY_PROFILE);
        localStorage.removeItem('ring_auth_token');
        if (typeof window !== 'undefined') window.__ringSessionVerified = false;
    }
}

function ringGetHomeForProfile(profile) {
    if (!profile) return 'login.html';
    if (profile.shopType === 'factory') return 'factory_home.html';
    if (profile.shopType === 'dealer') return 'dealer_home.html';
    return 'user_home.html';
}

function ringIsAdminProfile(profile) {
    return String(profile && profile.role || '').trim().toLowerCase() === 'admin';
}

function ringIsUserAccountProfile(profile) {
    if (!profile) return false;
    if (ringIsAdminProfile(profile)) return true;
    if (profile.shopType === 'user') return true;
    return String(profile.role || '').trim().toLowerCase() === 'user';
}

function ringGetHomeForMode(mode) {
    mode = ringNormalizeMode(mode);
    if (mode === 'shop') return 'factory_home.html';
    if (mode === 'business') return 'dealer_home.html';
    return 'user_home.html';
}

function ringGetLoginUrlForMode(mode) {
    mode = ringNormalizeMode(mode);
    if (mode === 'shop') return 'login.html?tab=shop';
    if (mode === 'business') return 'login.html?tab=business';
    return 'login.html?tab=user';
}

async function ringVerifySession(token, mode) {
    if (!token) return { success: false, error: 'AUTH_REQUIRED' };
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        var activeMode = mode || ringGetActiveMode();
        var slot = ringReadAuthSlot(activeMode);
        if (slot && slot.profile) {
            if (slot.verifiedAt) {
                var age = Date.now() - new Date(slot.verifiedAt).getTime();
                if (!isNaN(age) && age < RING_AUTH_OFFLINE_GRACE_MS) {
                    return { success: true, offline: true, profile: slot.profile };
                }
            }
            return { success: true, offline: true, profile: slot.profile };
        }
        return { success: false, error: 'AUTH_REQUIRED', offline: true };
    }
    try {
        var json = await fetchJsonWithTimeout(GAS_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify({ action: 'verify_session', authToken: token })
        }, 15000);
        if (json && json.success === true && json.profile) {
            return json;
        }
        return { success: false, error: (json && json.error) || 'AUTH_EXPIRED' };
    } catch (e) {
        return { success: false, error: String(e && e.message ? e.message : e || 'NETWORK_ERROR') };
    }
}

/**
 * AUTH_EXPIRED 時の一元処理（sendToGAS / background verify 共用）
 * @param {'user'|'shop'|'business'} mode
 * @param {string=} source
 */
function ringHandleAuthExpired_(mode, source) {
    if (ringIsDemoGasOffline_()) return;
    if (typeof window !== 'undefined' && window.__ringAuthExpiredRedirecting) return;
    if (typeof window !== 'undefined') window.__ringAuthExpiredRedirecting = true;
    mode = ringNormalizeMode(mode || ringGetActiveMode());
    console.error('[auth] session expired', mode, source || '');
    if (typeof showToast === 'function') {
        showToast('error', 'ログイン期限が切れました。再ログインしてください。');
    }
    ringClearAuthSlot(mode);
    if (typeof window !== 'undefined') {
        window.__ringSessionVerified = false;
        window.__ringAuthOptimistic = false;
    }
    var loginUrl = ringGetLoginUrlForMode(mode);
    if (typeof location !== 'undefined' && String(location.pathname || '').indexOf('login.html') >= 0) {
        window.__ringAuthExpiredRedirecting = false;
        return;
    }
    setTimeout(function () {
        location.replace(loginUrl);
    }, 400);
}

/**
 * 初回描画後に非クリティカル処理を遅延実行
 * @param {function(): void} fn
 */
function ringDeferAfterPaint_(fn) {
    if (typeof fn !== 'function') return;
    var run = function () {
        try { fn(); } catch (e) { console.warn('[ringDeferAfterPaint_]', e); }
    };
    if (typeof requestIdleCallback === 'function') {
        requestIdleCallback(run, { timeout: 2000 });
    } else if (typeof requestAnimationFrame === 'function') {
        requestAnimationFrame(function () { setTimeout(run, 0); });
    } else {
        setTimeout(run, 0);
    }
}

function ringHasOptimisticSession_(mode) {
    mode = ringNormalizeMode(mode);
    var slot = ringReadAuthSlot(mode);
    return ringHasValidSession_(slot);
}

function ringProfileMatchesExpectedMode_(profile, expectedMode) {
    expectedMode = ringNormalizeMode(expectedMode);
    if (!profile) return false;
    if (expectedMode === 'shop') return profile.shopType === 'factory';
    if (expectedMode === 'business') return profile.shopType === 'dealer';
    return typeof ringIsUserAccountProfile === 'function'
        ? ringIsUserAccountProfile(profile)
        : (profile.shopType === 'user' || profile.role === 'user' || profile.role === 'admin');
}

/**
 * ring_current_mode 優先でホーム URL を解決（splash/index 用）
 * @returns {string|null}
 */
function ringTryOptimisticEntryRedirect_() {
    ringMigrateLegacyAuth();
    var mode = ringGetActiveMode();
    if (ringHasOptimisticSession_(mode)) {
        var slot = ringReadAuthSlot(mode);
        if (!ringProfileMatchesExpectedMode_(slot.profile, mode)) {
            return null;
        }
        ringApplyActiveSession(slot, mode);
        if (typeof window !== 'undefined') {
            window.__ringSessionVerified = true;
            window.__ringAuthOptimistic = true;
        }
        if (!ringIsDemoSession_(slot)) {
            ringVerifySessionBackground_(mode);
        }
        return ringGetHomeForMode(mode);
    }
    var modes = ['user', 'shop', 'business'];
    var i;
    for (i = 0; i < modes.length; i++) {
        if (!ringHasOptimisticSession_(modes[i])) continue;
        var s = ringReadAuthSlot(modes[i]);
        if (!ringProfileMatchesExpectedMode_(s.profile, modes[i])) continue;
        ringSetCurrentMode(modes[i]);
        ringApplyActiveSession(s, modes[i]);
        if (typeof window !== 'undefined') {
            window.__ringSessionVerified = true;
            window.__ringAuthOptimistic = true;
        }
        if (!ringIsDemoSession_(s)) {
            ringVerifySessionBackground_(modes[i]);
        }
        return ringGetHomeForMode(modes[i]);
    }
    return null;
}

/**
 * バックグラウンド verify（描画ブロックなし）。AUTH_EXPIRED のみ事後 logout。
 * @param {'user'|'shop'|'business'} mode
 */
function ringVerifySessionBackground_(mode) {
    mode = ringNormalizeMode(mode);
    if (typeof window === 'undefined') return;
    if (!window.__ringBgVerifyRunning) window.__ringBgVerifyRunning = {};
    if (window.__ringBgVerifyRunning[mode]) return;
    window.__ringBgVerifyRunning[mode] = true;

    var slot = ringReadAuthSlot(mode);
    if (!slot || !slot.token) {
        window.__ringBgVerifyRunning[mode] = false;
        return;
    }
    if (ringIsDemoSession_(slot)) {
        window.__ringBgVerifyRunning[mode] = false;
        return;
    }

    ringVerifySession(slot.token, mode).then(function (verified) {
        if (verified && verified.success === true) {
            var fresh = ringReadAuthSlot(mode) || slot;
            if (verified.profile) fresh.profile = verified.profile;
            fresh.verifiedAt = new Date().toISOString();
            if (verified.authToken) fresh.token = verified.authToken;
            ringWriteAuthSlot(mode, fresh);
            ringApplyActiveSession(fresh, mode);
            window.__ringAuthOptimistic = false;
            return;
        }
        var err = String(verified && verified.error || '');
        if (/AUTH_EXPIRED/i.test(err)) {
            ringHandleAuthExpired_(mode, 'background_verify');
            return;
        }
        console.warn('[auth] background verify soft-fail', mode, err);
    }).catch(function (e) {
        console.warn('[auth] background verify error', mode, e);
    }).finally(function () {
        window.__ringBgVerifyRunning[mode] = false;
    });
}

/**
 * Optimistic 起動: localStorage スロットを即信用し verify は background
 * @param {'user'|'shop'|'business'} expectedMode
 */
function ringBootAuthOptimistic(expectedMode) {
    ringMigrateLegacyAuth();
    expectedMode = ringNormalizeMode(expectedMode);
    ringSetCurrentMode(expectedMode);
    var slot = ringReadAuthSlot(expectedMode);
    if (!ringHasValidSession_(slot)) {
        return { ok: false, reason: 'no_session', mode: expectedMode };
    }
    if (!ringProfileMatchesExpectedMode_(slot.profile, expectedMode)) {
        return { ok: false, reason: 'persona_mismatch', mode: expectedMode };
    }
    ringApplyActiveSession(slot, expectedMode);
    if (typeof window !== 'undefined') {
        window.__ringSessionVerified = true;
        window.__ringAuthOptimistic = true;
    }
    if (!ringIsDemoSession_(slot)) {
        ringVerifySessionBackground_(expectedMode);
    }
    return { ok: true, optimistic: true, profile: slot.profile, mode: expectedMode };
}

async function ringVerifyAndRefreshSlot(mode) {
    mode = ringNormalizeMode(mode);
    var slot = ringReadAuthSlot(mode);
    if (!slot || !slot.token || !slot.profile) {
        return { ok: false, reason: 'no_session', mode: mode };
    }
    if (!ringProfileMatchesExpectedMode_(slot.profile, mode)) {
        return { ok: false, reason: 'persona_mismatch', mode: mode };
    }
    var verified = await ringVerifySession(slot.token, mode);
    if (verified.success === true) {
        if (verified.profile) slot.profile = verified.profile;
        slot.verifiedAt = new Date().toISOString();
        if (verified.authToken) slot.token = verified.authToken;
        ringWriteAuthSlot(mode, slot);
        ringApplyActiveSession(slot, mode);
        if (typeof window !== 'undefined') window.__ringAuthOptimistic = false;
        return {
            ok: true,
            verified: !verified.offline,
            offline: !!verified.offline,
            profile: slot.profile,
            mode: mode
        };
    }
    if (/AUTH_EXPIRED/i.test(String(verified.error || ''))) {
        ringClearAuthSlot(mode);
        return { ok: false, reason: verified.error || 'AUTH_EXPIRED', mode: mode };
    }
    if (/AUTH_REQUIRED/i.test(String(verified.error || ''))) {
        ringClearAuthSlot(mode);
        return { ok: false, reason: verified.error || 'AUTH_REQUIRED', mode: mode };
    }
    return { ok: false, reason: verified.error || 'NETWORK_ERROR', mode: mode, offline: true };
}

function ringBootAuth() {
    ringMigrateLegacyAuth();
    var mode = ringGetActiveMode();
    return ringBootAuthOptimistic(mode);
}

/**
 * 各ホーム画面用: Optimistic 即時 + background verify（await 不要）
 * @param {'user'|'shop'|'business'} expectedMode
 */
function ringBootAuthForMode(expectedMode) {
    ringMigrateLegacyAuth();
    expectedMode = ringNormalizeMode(expectedMode);
    var result = ringBootAuthOptimistic(expectedMode);
    if (!result.ok) {
        result.redirect = ringGetLoginUrlForMode(expectedMode);
    }
    return result;
}

/**
 * login.html 用: persona に合うモードのスロットだけ verify
 * @param {'user'|'factory'|'dealer'|null} persona
 */
async function ringBootAuthForLoginPage(persona) {
    ringMigrateLegacyAuth();
    if (persona === 'factory') {
        var shopResult = await ringVerifyAndRefreshSlot('shop');
        if (!shopResult.ok) return shopResult;
        var stF = String(shopResult.profile && shopResult.profile.shopType || '');
        if (stF !== 'factory') return { ok: false, reason: 'persona_mismatch' };
        return shopResult;
    }
    if (persona === 'dealer') {
        var bizResult = await ringVerifyAndRefreshSlot('business');
        if (!bizResult.ok) return bizResult;
        var stD = String(bizResult.profile && bizResult.profile.shopType || '');
        if (stD !== 'dealer') return { ok: false, reason: 'persona_mismatch' };
        return bizResult;
    }
    return ringVerifyAndRefreshSlot('user');
}

function ringClearUserAuthForShopLogin() {
    ringClearAuthSlot('user');
    try {
        var p = safeJsonParse(localStorage.getItem(DB_CURRENT_USER), null);
        if (!p) p = safeJsonParse(localStorage.getItem(DB_LEGACY_PROFILE), null);
        if (p && ringClassifyProfile(p) === 'user') {
            localStorage.removeItem(DB_CURRENT_USER);
            localStorage.removeItem(DB_LEGACY_PROFILE);
            localStorage.removeItem('ring_auth_token');
            if (typeof window !== 'undefined') window.__ringSessionVerified = false;
        }
    } catch (e) { /* ignore */ }
}

function ringSwitchAccount(mode) {
    mode = ringNormalizeMode(mode);
    var slot = ringReadAuthSlot(mode);
    if (!slot || !slot.token || !slot.profile) {
        return { ok: false, reason: 'not_registered', mode: mode };
    }
    ringSetCurrentMode(mode);
    ringApplyActiveSession(slot, mode);
    if (typeof window !== 'undefined') window.__ringSessionVerified = false;
    return { ok: true, profile: slot.profile, mode: mode };
}

function ringSwitchAccountAndNavigate(mode) {
    mode = ringNormalizeMode(mode);
    var r = ringSwitchAccount(mode);
    if (r.ok) {
        location.href = ringGetHomeForMode(mode);
        return;
    }
    if (typeof showToast === 'function') {
        showToast('info', 'この種類のアカウントがありません。ログインまたは新規登録してください。');
    }
    setTimeout(function () {
        location.href = ringGetLoginUrlForMode(mode);
    }, 600);
}

function ringSwitchToAdminDashboard() {
    var userSlot = ringReadAuthSlot('user');
    if (!userSlot || !userSlot.token || !ringIsAdminProfile(userSlot.profile)) {
        if (typeof showToast === 'function') {
            showToast('info', '管理者アカウントがありません。一般ユーザーとしてログインしてください。');
        }
        setTimeout(function () { location.href = 'login.html?tab=user'; }, 600);
        return;
    }
    ringSwitchAccount('user');
    location.href = 'admin_dashboard.html';
}

/** OCR 直前のみ GAS verify（Optimistic 起動とは独立） */
async function ringEnsureAuthForOcr() {
    if (ringIsOcrDemoMode_()) return;
    var mode = ringGetActiveMode();
    var tok = ringResolveActiveAuthToken();
    if (!tok) {
        if (typeof showToast === 'function') {
            showToast('error', 'ログイン期限が切れました。再ログインしてください。');
        }
        ringLogSystemEvent('AUTH_ERROR', {
            error_message: 'AUTH_REQUIRED',
            payload: { stage: 'ocr_preflight' }
        });
        setTimeout(function () {
            location.replace(ringGetLoginUrlForMode(mode));
        }, 400);
        throw new Error('AUTH_REQUIRED');
    }
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        if (typeof showToast === 'function') {
            showToast('warning', '通信を確認しています。オンライン時にもう一度お試しください。');
        }
        throw new Error('OFFLINE');
    }
    if (typeof showToast === 'function') {
        showToast('info', '通信確認中…');
    }
    var verified = await ringVerifySession(tok, mode);
    if (verified.success === true) {
        var slot = ringReadAuthSlot(mode);
        if (slot) {
            if (verified.authToken) slot.token = verified.authToken;
            if (verified.profile) slot.profile = verified.profile;
            slot.verifiedAt = new Date().toISOString();
            ringWriteAuthSlot(mode, slot);
            ringApplyActiveSession(slot, mode);
        }
        if (typeof window !== 'undefined') {
            window.__ringSessionVerified = true;
            window.__ringAuthOptimistic = false;
        }
        return;
    }
    if (/AUTH_REQUIRED|AUTH_EXPIRED/i.test(String(verified.error || ''))) {
        ringClearAuthSlot(mode);
        if (typeof showToast === 'function') {
            showToast('error', 'ログイン期限が切れました。再ログインしてください。');
        }
        ringLogSystemEvent('AUTH_ERROR', {
            error_message: verified.error || 'AUTH_EXPIRED',
            payload: { stage: 'ocr_preflight' }
        });
        setTimeout(function () {
            location.replace(ringGetLoginUrlForMode(mode));
        }, 400);
        throw new Error(verified.error || 'AUTH_EXPIRED');
    }
    if (typeof showToast === 'function') {
        showToast('warning', '通信を確認しています。しばらくしてから再度お試しください。');
    }
    throw new Error(verified.error || 'NETWORK_ERROR');
}

function login(profile, authToken) {
    ringSaveAuthSlot(profile, authToken);
}

function getCurrentProfile() {
    const current = safeJsonParse(localStorage.getItem(DB_CURRENT_USER), null);
    if (current) return current;
    return safeJsonParse(localStorage.getItem(DB_LEGACY_PROFILE), null);
}

function logout() {
    purgeRingDemoLocalData();
    localStorage.removeItem(RING_TOKEN_USER);
    localStorage.removeItem(RING_TOKEN_SHOP);
    localStorage.removeItem(RING_TOKEN_BIZ);
    localStorage.removeItem(RING_META_USER);
    localStorage.removeItem(RING_META_SHOP);
    localStorage.removeItem(RING_META_BIZ);
    localStorage.removeItem(RING_CURRENT_MODE);
    localStorage.removeItem(RING_PROFILE_USER);
    localStorage.removeItem(RING_PROFILE_SHOP);
    localStorage.removeItem(RING_ACTIVE_ACCOUNT);
    localStorage.removeItem(DB_CURRENT_USER);
    localStorage.removeItem(DB_LEGACY_PROFILE);
    localStorage.removeItem('ring_auth_token');
    if (typeof window !== 'undefined') {
        window.__ringSessionVerified = false;
        window.__RING_OCR_DEMO__ = false;
    }
    try {
        sessionStorage.removeItem(RING_OCR_DEMO_SESSION_KEY);
    } catch (e) { /* ignore */ }
}

// ★ 全ページ共通のログアウト処理
/** 利用タイプ選択（index.html #mainMenu）へ明示的に戻る */
function ringGoToTopMenu() {
    try {
        sessionStorage.setItem('splashShown', '1');
    } catch (e) { /* ignore */ }
    location.href = 'index.html?menu=1';
}

/** index.html でタイプ選択メニューを強制表示するか（?menu=1 / ?top=1） */
function ringIsTopMenuForced_() {
    try {
        var p = new URLSearchParams(window.location.search);
        return p.get('menu') === '1' || p.get('top') === '1';
    } catch (e) {
        return false;
    }
}

function ringIsIndexTopUrl_(url) {
    if (url == null || url === '') return false;
    var path = String(url).split('?')[0].split('#')[0];
    if (path === 'index.html' || path === './index.html') return true;
    if (path.endsWith('/index.html')) return true;
    return path === '/' || path === './';
}

function logoutApp() {
  showRingConfirm({
    title: 'ログアウト',
    message: 'ログアウトしてトップ画面に戻りますか？',
    okLabel: 'ログアウト',
    cancelLabel: 'キャンセル'
  }).then(function (ok) {
    if (!ok) return;
    logout();
    ringGoToTopMenu();
  });
}

/** デモログイン時に投入するデータの識別子（再ログインで古いデモだけ差し替え） */
var DEMO_DATA_TAG = 'ringAutoDemo';
/** デモ専用ローカルトークン（GAS verify 対象外） */
var RING_DEMO_LOCAL_TOKEN = 'RING_DEMO_LOCAL';
var RING_OCR_DEMO_SESSION_KEY = 'ring_ocr_demo';

/**
 * 配列からデモタグ付き要素だけ除去する
 */
function stripDemoTagged(arr) {
  return (arr || []).filter(function (x) { return x && x.__demoTag !== DEMO_DATA_TAG; });
}

/**
 * デモ用プロフィールか（seedDemoEnvironment + デモログインで投入したセッション）
 */
function isRingDemoProfile(profile) {
  if (!profile) return false;
  var uid = String(profile.userId || '');
  var lid = String(profile.loginId || '');
  var sid = String(profile.shopId || '');
  if (/DEMO/i.test(uid) || /DEMO/i.test(lid)) return true;
  if (lid === 'USR-DEMO-0000') return true;
  if (sid === 'SHOP-DEMO-F' || sid === 'SHOP-DEMO-D') return true;
  return false;
}

/** auth スロットがデモセッションか */
function ringIsDemoSession_(slot) {
  return !!(slot && slot.profile && isRingDemoProfile(slot.profile));
}

/** プロフィールあり +（本番 token またはデモセッション） */
function ringHasValidSession_(slot) {
  return !!(slot && slot.profile && (slot.token || ringIsDemoSession_(slot)));
}

/** 本番 OCR は GAS 必須。デモ stub はデモプロフィールまたは sessionStorage フラグ */
function ringIsOcrDemoMode_() {
    var p = typeof getCurrentProfile === 'function' ? getCurrentProfile() : null;
    if (isRingDemoProfile(p)) return true;
    try {
        return sessionStorage.getItem(RING_OCR_DEMO_SESSION_KEY) === '1';
    } catch (e) {
        return false;
    }
}

/** デモ中は GAS へ送らずローカル完結（RING_DEMO_LOCAL / OCR デモ） */
function ringIsDemoGasOffline_() {
    if (ringIsOcrDemoMode_()) return true;
    try {
        var tok = typeof ringResolveActiveAuthToken === 'function'
            ? ringResolveActiveAuthToken()
            : (localStorage.getItem('ring_auth_token') || '');
        return tok === RING_DEMO_LOCAL_TOKEN;
    } catch (e) {
        return false;
    }
}

/** sendToGAS_Safe デモ短路用の最小レスポンス */
function ringDemoGasStubResponse_(actionType) {
    if (actionType === 'get_vehicles') return { success: true, vehicles: [] };
    if (actionType === 'get_vehicle_info') return { success: true, found: false };
    if (actionType === 'verify_session') return { success: true };
    if (actionType === 'get_daily_history') return { success: true, history: [] };
    if (actionType === 'get_maintenance_history') return { success: true, logs: [] };
    if (actionType === 'get_shop_maintenance_history') return { success: true, logs: [] };
    if (actionType === 'delete_log') return { success: true, log_id: '' };
    if (actionType === 'delete_vehicle') return { success: true, ok: true };
    if (actionType === 'update_log') return { success: true, log_id: '', updatedAt: new Date().toISOString() };
    if (actionType === 'ocr_vin') return { success: true, partial: true, demo: true };
    if (actionType === 'ocr_vin_search') {
        return {
            success: true,
            demo: true,
            candidates: ['ZVW505012847', 'ZVW5O5012847']
        };
    }
    if (actionType === 'ocr_gemini_shaken') {
        return {
            success: true,
            demo: true,
            ocrResult: {
                vin: 'ZVW50-5012847',
                firstRegistrationDate: '2020-03',
                expiryDate: '2026-12-15',
                carName: 'トヨタ プリウス',
                model: 'DBA-ZVW50',
                engineModel: '2ZR-FXE',
                typeDesignationNumber: '17456',
                classificationNumber: '12001',
                vehicleType: '普通',
                purpose: '乗用',
                useCategory: '自家用',
                bodyShape: ''
            }
        };
    }
    if (actionType === 'ocr_invoice') {
        return {
            success: true,
            demo: true,
            ocrResult: {
                vin: 'ZVW50-5012847',
                documentType: 'invoice',
                mileage: '124000',
                works: ['エンジンオイル交換', 'オイルフィルター交換'],
                parts: [
                    { n: 'エンジンオイル', s: '5W-30', q: '4.5L' },
                    { n: 'オイルフィルター', s: '', q: '1個' }
                ]
            }
        };
    }
    if (actionType === 'update_vehicle') return { success: true, demo: true, vin: '' };
    if (actionType === 'update_daily_inspection') return { success: true, demo: true, log_id: '' };
    if (actionType === 'get_admin_dashboard') {
        return {
            success: true,
            demo: true,
            summary: { userCount: 0, vehicleCount: 0, uniqueVinCount: 0, shopFactoryCount: 0, shopDealerCount: 0, adImpressions: 0, mailRemainingQuota: 0, lineMessagesSent: 0, configKeys: 0 },
            filters: { vehicles: [], factories: [], dealers: [] },
            filterOptions: { vehicleNames: [], regions: [], transportBureaus: [], factoryTypes: ['指定', '認証'], dealerRegions: [], industries: [] },
            monitoring: { ocrFailToday: 0, saveFailToday: 0, retryPendingToday: 0, gasErrorToday: 0, topDevices: [], topBrowsers: [], recentErrors: [], errorActionRanking: [], errorDetails: [] }
        };
    }
    if (actionType === 'get_admin_stats_filtered') {
        return {
            success: true,
            demo: true,
            counts: { uniqueVinCountFiltered: 0, vehicleRowsFiltered: 0, factoryCountFiltered: 0, dealerCountFiltered: 0 },
            filterOptions: { vehicleNames: [], regions: [], transportBureaus: [], factoryTypes: ['指定', '認証'], dealerRegions: [], industries: [] }
        };
    }
    if (actionType === 'get_action_dashboard_data') {
        return {
            success: true,
            demo: true,
            serverNow: new Date().toISOString(),
            todayJst: new Date().toISOString().slice(0, 10),
            actionRequired: { tasks: [], allClear: true },
            todayStatus: {
                registrationsToday: 0,
                ocrRunsToday: 0,
                newUsersToday: 0,
                factoryLoginsToday: 0,
                geminiRunsToday: 0
            },
            systemHealth: {
                status: 'normal',
                statusLabel: '正常',
                historyEventsRows: 0,
                usersRows: 0,
                ocrSuccessRanking: [
                    { type: 'shaken', label: '車検証', success: 0, total: 0, pct: null },
                    { type: 'invoice', label: '請求書', success: 0, total: 0, pct: null },
                    { type: 'estimate', label: '見積書', success: 0, total: 0, pct: null }
                ]
            },
            activityStream: []
        };
    }
    if (actionType === 'get_admin_config') return { success: true, demo: true, config: [] };
    if (actionType === 'search_history_events') return { success: true, demo: true, results: [], count: 0 };
    if (actionType === 'get_admin_memo') return { success: true, demo: true, memo: '', updatedAt: '' };
    if (actionType === 'set_admin_memo') return { success: true, demo: true, updatedAt: new Date().toISOString() };
    return { success: true, demo: true };
}

/**
 * OCR 中断時の明示報告（console + toast + 監視ログ）。サイレント abort 禁止。
 * @param {string} stage
 * @param {*} err
 * @param {{ userMessage?: string, toast?: boolean, payload?: object }} [opts]
 */
function ringReportOcrAbort_(stage, err, opts) {
    opts = opts || {};
    var msg = String(err && err.message ? err.message : err || 'OCR_ABORT');
    console.error('[OCR abort]', stage, msg, opts.payload || '');
    var userMsg = opts.userMessage;
    if (userMsg == null) {
        if (/AUTH_REQUIRED|AUTH_EXPIRED/i.test(msg)) {
            userMsg = 'ログイン期限が切れました。再ログインしてください。';
        } else if (/IMAGE_ENCODE|read_fail|IMAGE_REQUIRED|NO_IMAGES/i.test(msg)) {
            userMsg = '画像の読み込みに失敗しました。別の写真をお試しください。';
        } else if (typeof ringGasErrorToUserMessage_ === 'function') {
            userMsg = ringGasErrorToUserMessage_(msg, opts.gasAction || '') ||
                '読み取れませんでした。再撮影するか手入力で続行してください。';
        } else {
            userMsg = '読み取れませんでした。再撮影するか手入力で続行してください。';
        }
    }
    if (opts.toast !== false && userMsg && typeof showToast === 'function') {
        showToast('error', userMsg);
    }
    var logAction = /AUTH_/i.test(msg) ? 'AUTH_ERROR' : 'OCR_FAIL';
    ringLogSystemEvent(logAction, {
        error_message: msg,
        payload: Object.assign({ stage: stage }, opts.payload || {})
    });
    if (typeof hideOcrAnalyzingOverlay === 'function') {
        try { hideOcrAnalyzingOverlay(); } catch (eOv) { /* ignore */ }
    }
}

/**
 * localStorage からデモシードデータ（__demoTag）だけ削除。本番ログイン・ログアウト後に実データへ混ざらないようにする。
 */
function purgeRingDemoLocalData() {
  function writeIfChanged(key) {
    var arr = safeJsonParse(localStorage.getItem(key), []);
    if (!Array.isArray(arr)) return;
    var next = stripDemoTagged(arr);
    if (next.length !== arr.length) {
      localStorage.setItem(key, JSON.stringify(next));
    }
  }
  writeIfChanged('nappy_shops_v1');
  writeIfChanged(DB_VEHICLES);
  writeIfChanged(DB_LOGS);
  writeIfChanged(DB_INSPECTIONS);
  writeIfChanged('nappy_fav_shops_v1');
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
  var shops = stripDemoTagged(safeJsonParse(localStorage.getItem('nappy_shops_v1'), []));
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
  var vehicles = stripDemoTagged(safeJsonParse(localStorage.getItem(DB_VEHICLES), []));

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
      model: '１号車',
      nickname: '１号車',
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
      model: 'フィット',
      nickname: 'フィット',
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
  var logs = stripDemoTagged(safeJsonParse(localStorage.getItem(DB_LOGS), []));
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
  var insp = stripDemoTagged(safeJsonParse(localStorage.getItem('inspections_v1'), []));
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
    var fav = stripDemoTagged(safeJsonParse(localStorage.getItem('nappy_fav_shops_v1'), []));
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
 * トップ（index.html）から公開デモへ入る。本番 authToken は使わない。
 * @param {'factory'|'dealer'|'user'} role
 */
function ringStartIndexDemo(role) {
  if (typeof showLoading === 'function') {
    showLoading('デモ準備中', 'サンプルデータを読み込んでいます...');
  }
  setTimeout(function () {
    try {
      if (typeof window !== 'undefined') {
        window.__ringSessionVerified = false;
        window.__RING_OCR_DEMO__ = true;
      }
      sessionStorage.setItem(RING_OCR_DEMO_SESSION_KEY, '1');
    } catch (e) { /* ignore */ }

    var demoShopId = role === 'factory' ? 'SHOP-DEMO-F' : (role === 'dealer' ? 'SHOP-DEMO-D' : '');
    var demoRole = (role === 'factory' || role === 'dealer') ? 'master' : role;
    var dummyProfile = {
      userId: role === 'factory' ? 'F-DEMO01' : (role === 'dealer' ? 'D-DEMO01' : 'U-DEMO01'),
      userName: role === 'user' ? 'デモユーザー' : 'デモ太郎',
      shopName: role === 'factory' ? 'RinG Auto 整備工場' : (role === 'dealer' ? 'T.G販売店' : ''),
      shopType: role,
      role: demoRole,
      shopId: demoShopId
    };
    if (role === 'user') dummyProfile.loginId = 'USR-DEMO-0000';
    if (role === 'factory') {
      dummyProfile.factoryType = '指定工場';
      dummyProfile.factoryNumber = '第11234号';
    } else if (role === 'dealer') {
      dummyProfile.factoryType = '認証';
      dummyProfile.factoryNumber = '第55678号';
    }

    seedDemoEnvironment(role);
    login(dummyProfile, RING_DEMO_LOCAL_TOKEN);
    if (typeof hideLoading === 'function') hideLoading();
    location.replace(typeof ringGetHomeForProfile === 'function' ? ringGetHomeForProfile(dummyProfile) : 'user_home.html');
  }, 450);
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
 * 整備ログの登録日時 ms（createdAt / created_at 優先、作業日は使わない）
 */
function ringLogCreatedAtMs_(log) {
    if (!log) return 0;
    var raw = log.createdAt || log.created_at || "";
    var t = new Date(raw).getTime();
    return isNaN(t) ? 0 : t;
}

/** 登録から7日以内か */
function ringIsLogEditableWithin7Days_(log) {
    var ms = ringLogCreatedAtMs_(log);
    if (!ms) return false;
    return (Date.now() - ms) < 7 * 24 * 60 * 60 * 1000;
}

/**
 * 描画差分判定用シグネチャ（件数・最新 logId・最新 updatedAt/createdAt）
 */
function ringMaintenanceLogsSignature_(logs) {
    var arr = Array.isArray(logs) ? logs : [];
    if (!arr.length) return "0::0";
    var latestLogId = "";
    var maxTs = 0;
    arr.forEach(function (l) {
        var ts = new Date(l.updatedAt || l.createdAt || l.created_at || l.date || 0).getTime();
        if (isNaN(ts)) ts = 0;
        if (ts >= maxTs) {
            maxTs = ts;
            latestLogId = String(l.log_id || l.logId || "");
        }
    });
    return arr.length + ":" + latestLogId + ":" + maxTs;
}

/** 画面別 TTL（未設定時は 10 分） */
var RING_PAGE_TTL_MS = {
    factory_edit_list: 60 * 1000,
    user_history: 10 * 60 * 1000,
    vehicles: 5 * 60 * 1000,
    user_home: 5 * 60 * 1000
};
var RING_SYNC_META_KEY = "ring_page_sync_meta_v1";
var ringPageSyncInFlight_ = {};

function ringPageTtlMs_(pageId) {
    var id = String(pageId || "");
    if (RING_PAGE_TTL_MS[id] != null) return RING_PAGE_TTL_MS[id];
    return 10 * 60 * 1000;
}

function ringGetPageSyncMeta_(cacheKey) {
    var all = safeJsonParse(localStorage.getItem(RING_SYNC_META_KEY), {});
    return all[String(cacheKey || "")] || null;
}

function ringSetPageSyncMeta_(cacheKey) {
    if (!cacheKey) return;
    var all = safeJsonParse(localStorage.getItem(RING_SYNC_META_KEY), {});
    all[String(cacheKey)] = { syncedAt: Date.now() };
    try {
        localStorage.setItem(RING_SYNC_META_KEY, JSON.stringify(all));
    } catch (e) { /* ignore */ }
}

function ringIsPageCacheFresh_(cacheKey, pageId) {
    var meta = ringGetPageSyncMeta_(cacheKey);
    if (!meta || !meta.syncedAt) return false;
    return (Date.now() - meta.syncedAt) < ringPageTtlMs_(pageId);
}

/**
 * ISO（Z 付き）をローカルタイムで表示。一覧=日付のみ / 詳細=日付+時刻
 */
function ringFormatDateLocal_(value, withTime) {
    if (value == null || value === "") return "---";
    var d = null;
    if (typeof value === "number" && isFinite(value)) {
        d = new Date(value);
    } else {
        var s = String(value).trim();
        if (!s) return "---";
        if (/^\d{12,}$/.test(s)) {
            d = new Date(Number(s));
        } else {
            var mDate = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
            if (mDate && !withTime) {
                return mDate[1] + "/" + mDate[2] + "/" + mDate[3];
            }
            if (/^\d{4}\/\d{2}\/\d{2}( \d{2}:\d{2})?$/.test(s)) return s;
            d = new Date(s);
        }
    }
    if (!d || isNaN(d.getTime())) {
        var sFallback = String(value).trim();
        var head = sFallback.split("T")[0].replace(/-/g, "/");
        return head || sFallback || "---";
    }
    var y = d.getFullYear();
    var mo = ("0" + (d.getMonth() + 1)).slice(-2);
    var da = ("0" + d.getDate()).slice(-2);
    if (!withTime) return y + "/" + mo + "/" + da;
    var hh = ("0" + d.getHours()).slice(-2);
    var mm = ("0" + d.getMinutes()).slice(-2);
    return y + "/" + mo + "/" + da + " " + hh + ":" + mm;
}

function ringFormatDateTimeLocal_(value) {
    return ringFormatDateLocal_(value, true);
}

function ringMaintenanceLogsFullSignature_(logs) {
    var base = ringMaintenanceLogsSignature_(logs);
    try {
        return base + "|" + JSON.stringify(logs);
    } catch (e) {
        return base;
    }
}

function ringVehiclesFullSignature_(vehicles) {
    var arr = Array.isArray(vehicles) ? vehicles : [];
    var maxTs = 0;
    arr.forEach(function (v) {
        var ts = new Date(v.updatedAt || v.createdAt || 0).getTime();
        if (!isNaN(ts) && ts > maxTs) maxTs = ts;
    });
    try {
        return arr.length + ":" + maxTs + "|" + JSON.stringify(arr);
    } catch (e) {
        return arr.length + ":" + maxTs;
    }
}

function ringRestoreScrollY_(scrollY) {
    var y = typeof scrollY === "number" ? scrollY : window.scrollY;
    requestAnimationFrame(function () {
        window.scrollTo(0, y);
        setTimeout(function () { window.scrollTo(0, y); }, 0);
    });
}

function ringShowSyncStatus_(elementId, message, isError) {
    var el = document.getElementById(elementId);
    if (!el) return;
    if (!message) {
        el.style.display = "none";
        el.textContent = "";
        return;
    }
    el.style.display = "block";
    el.textContent = message;
    el.style.color = isError ? "#b45309" : "var(--muted)";
    el.style.fontSize = "11px";
    el.style.fontWeight = "700";
    el.style.marginTop = "4px";
    el.style.lineHeight = "1.4";
}

function ringUpdateLastSyncLabel_(labelId, cacheKey) {
    var el = document.getElementById(labelId);
    var meta = ringGetPageSyncMeta_(cacheKey);
    if (!el) return;
    if (!meta || !meta.syncedAt) {
        el.textContent = "";
        return;
    }
    el.textContent = "最終同期：" + ringFormatDateLocal_(meta.syncedAt, true);
}

function ringSetRefreshButtonBusy_(btn, busy, defaultLabel) {
    if (!btn) return;
    btn.disabled = !!busy;
    btn.style.opacity = busy ? "0.5" : "1";
    btn.style.pointerEvents = busy ? "none" : "";
    if (defaultLabel) btn.textContent = busy ? "同期中…" : defaultLabel;
}

/** 整備ログキャッシュ破損検知（破損時はキー削除） */
function ringTryReadLogsArray_() {
    try {
        var raw = localStorage.getItem(DB_LOGS);
        if (raw == null || raw === "") return { ok: true, logs: [], corrupt: false };
        var v = JSON.parse(sanitizeJsonResponse(raw) || raw);
        if (!Array.isArray(v)) throw new Error("NOT_ARRAY");
        return { ok: true, logs: v, corrupt: false };
    } catch (e) {
        try { localStorage.removeItem(DB_LOGS); } catch (e2) { /* ignore */ }
        return { ok: false, logs: [], corrupt: true };
    }
}

/**
 * ページ同期（二重通信防止・差分時のみ renderFn）
 * @returns {Promise<{ ok: boolean }>}
 */
async function ringRunPageSync_(opts) {
    opts = opts || {};
    var cacheKey = String(opts.cacheKey || "");
    if (!cacheKey || typeof opts.syncFn !== "function") return { ok: false, rendered: false };
    if (ringPageSyncInFlight_[cacheKey]) return ringPageSyncInFlight_[cacheKey];

    var task = (async function () {
        var prevSig = typeof opts.getSignatureFn === "function" ? opts.getSignatureFn() : "";
        var scrollY = opts.preserveScroll ? window.scrollY : null;
        ringSetRefreshButtonBusy_(opts.refreshBtn, true, opts.refreshLabel || "🔄 更新");
        if (opts.statusElId) {
            ringShowSyncStatus_(opts.statusElId, opts.statusMessage || "同期中…", false);
        }
        var ok = false;
        var rendered = false;
        try {
            var r = await opts.syncFn();
            ok = !!(r && r.ok !== false);
            if (ok) {
                ringSetPageSyncMeta_(cacheKey);
                if (opts.lastSyncElId) ringUpdateLastSyncLabel_(opts.lastSyncElId, cacheKey);
                if (opts.statusElId) ringShowSyncStatus_(opts.statusElId, "", false);
                var newSig = typeof opts.getSignatureFn === "function" ? opts.getSignatureFn() : "";
                if (typeof opts.renderFn === "function" && newSig !== prevSig) {
                    opts.renderFn(false, scrollY);
                    rendered = true;
                }
            } else if (opts.statusElId) {
                ringShowSyncStatus_(opts.statusElId, "最新データを取得できませんでした", true);
            }
        } catch (eSync) {
            if (opts.statusElId) {
                ringShowSyncStatus_(opts.statusElId, "最新データを取得できませんでした", true);
            }
        } finally {
            ringSetRefreshButtonBusy_(opts.refreshBtn, false, opts.refreshLabel || "🔄 更新");
            delete ringPageSyncInFlight_[cacheKey];
        }
        return { ok: ok, rendered: rendered };
    })();

    ringPageSyncInFlight_[cacheKey] = task;
    return task;
}

/** 30 秒以上非表示後の復帰同期 */
function ringSetupBackgroundResync_(opts) {
    opts = opts || {};
    var hiddenAt = 0;
    function tryResume() {
        if (!hiddenAt || (Date.now() - hiddenAt) < 30000) return;
        hiddenAt = 0;
        if (typeof opts.onResume === "function") opts.onResume();
    }
    document.addEventListener("visibilitychange", function () {
        if (document.visibilityState === "hidden") {
            hiddenAt = Date.now();
        } else if (document.visibilityState === "visible") {
            tryResume();
        }
    });
    window.addEventListener("pageshow", function (e) {
        if (e.persisted) tryResume();
    });
}

/**
 * GAS get_maintenance_history 応答1件をローカル整備ログ形へ
 * @param {object} row
 * @returns {object|null}
 */
function mapGasMaintenanceLogToLocal(row) {
    if (!row) return null;
    const logId = String(row.log_id || row.logId || "").trim();
    if (!logId) return null;
    const vin = String(row.vin || "").trim().toUpperCase();
    if (!vin) return null;
    const photoUrl = String(row.photoUrl || row.partsPhoto || "").trim();
    return {
        log_id: logId,
        vin: vin,
        date: String(row.date || ""),
        mileage: row.mileage != null && row.mileage !== "" ? row.mileage : "",
        title: String(row.title || ""),
        shopId: String(row.shopId || ""),
        shopName: String(row.shopName || ""),
        shopType: String(row.shopType || ""),
        factoryType: String(row.factoryType || ""),
        transportBureau: String(row.transportBureau || ""),
        factoryNumber: String(row.factoryNumber || ""),
        parts: String(row.parts || ""),
        memo: String(row.memo || ""),
        photoUrl: photoUrl,
        partsPhoto: photoUrl,
        createdAt: String(row.createdAt || row.created_at || ""),
        updatedAt: String(row.updatedAt || row.createdAt || row.created_at || ""),
        staffId: String(row.staffId || ""),
        staffName: String(row.staffName || ""),
        documentType: String(row.documentType || row.document_type || ""),
        works: Array.isArray(row.works) ? row.works : [],
        partsItems: Array.isArray(row.partsItems) ? row.partsItems : []
    };
}

/**
 * GAS から整備履歴（History_Events）を取得
 * @returns {Promise<{ logs: object[], ok: boolean }>}
 */
async function fetchMaintenanceHistoryFromGas(vin) {
    if (!vin) return { logs: [], ok: false };
    if (ringIsDemoGasOffline_()) return { logs: [], ok: false };
    try {
        const json = await sendToGAS_Safe("get_maintenance_history", { vin: String(vin).trim() });
        return { logs: Array.isArray(json.logs) ? json.logs : [], ok: true };
    } catch (e) {
        return { logs: [], ok: false };
    }
}

/**
 * GAS から自店7日以内の整備履歴を取得（工場編集一覧用）
 * @returns {Promise<{ logs: object[], ok: boolean }>}
 */
async function fetchShopMaintenanceHistoryFromGas() {
    if (ringIsDemoGasOffline_()) return { logs: [], ok: false };
    try {
        const json = await sendToGAS_Safe("get_shop_maintenance_history", {});
        return { logs: Array.isArray(json.logs) ? json.logs : [], ok: true };
    } catch (e) {
        return { logs: [], ok: false };
    }
}

/** サーバー行配列をローカル整備ログ配列へ */
function mapGasMaintenanceLogsToLocal_(serverList) {
    return (serverList || []).map(function (row) {
        var loc = mapGasMaintenanceLogToLocal(row);
        if (loc) loc._fromServer = true;
        return loc;
    }).filter(Boolean);
}

/**
 * VIN 単位: History_Events を SSOT として localStorage キャッシュを置換
 * @returns {Promise<{ ok: boolean, logs: object[], signature: string }>}
 */
async function syncMaintenanceHistoryForVin(vin) {
    if (!vin) return { ok: false, logs: [], signature: "0::0" };
    const vinNorm = _normalize(vin);
    const allLogs = readLogsArray();
    const otherLogs = allLogs.filter(function (l) { return _normalize(l.vin) !== vinNorm; });
    const inspectionLocal = allLogs.filter(function (l) {
        return _normalize(l.vin) === vinNorm &&
            (l.type === "inspection" || l.type === "inspection_user");
    });

    const fetched = await fetchMaintenanceHistoryFromGas(vin);
    if (!fetched.ok) {
        const cached = allLogs.filter(function (l) { return _normalize(l.vin) === vinNorm; });
        return { ok: false, logs: cached, signature: ringMaintenanceLogsSignature_(cached) };
    }

    const maintenance = mapGasMaintenanceLogsToLocal_(fetched.logs);
    const mergedVin = inspectionLocal.concat(maintenance);
    localStorage.setItem(DB_LOGS, JSON.stringify(otherLogs.concat(mergedVin)));
    return {
        ok: true,
        logs: mergedVin,
        signature: ringMaintenanceLogsSignature_(maintenance.concat(inspectionLocal))
    };
}

/**
 * 工場・事業者: 自店7日以内ログを SSOT 同期
 * @returns {Promise<{ ok: boolean, signature: string }>}
 */
async function syncShopMaintenanceLogsForEdit(shopId) {
    var sid = String(shopId || "").trim();
    if (!sid) return { ok: false, signature: "0::0" };

    var fetched = await fetchShopMaintenanceHistoryFromGas();
    var allLogs = readLogsArray();
    if (!fetched.ok) {
        var cached = allLogs.filter(function (l) {
            return String(l.shopId || "").trim() === sid && ringIsLogEditableWithin7Days_(l);
        });
        return { ok: false, signature: ringMaintenanceLogsSignature_(cached) };
    }

    var serverLogs = mapGasMaintenanceLogsToLocal_(fetched.logs);

    var cutoffMs = Date.now() - 7 * 24 * 60 * 60 * 1000;
    var kept = allLogs.filter(function (l) {
        if (String(l.shopId || "").trim() !== sid) return true;
        var ms = ringLogCreatedAtMs_(l);
        if (ms && ms < cutoffMs) return true;
        return false;
    });

    var merged = kept.concat(serverLogs);
    localStorage.setItem(DB_LOGS, JSON.stringify(merged));
    return { ok: true, signature: ringMaintenanceLogsSignature_(serverLogs) };
}

/**
 * History_Events 上で整備ログを物理削除
 */
async function deleteMaintenanceLogOnServer(logId) {
    return await sendToGAS_Safe("delete_log", { logId: String(logId || "").trim() });
}

/**
 * History_Events 上で整備ログを更新（VIN / 部品 / メモ / 数量）
 */
async function updateMaintenanceLogOnServer(payload) {
    return await sendToGAS_Safe("update_log", payload || {});
}

/** 整備履歴マージ用ユニークキー（log_id 優先、なければ日付+区分+店舗） */
function maintenanceLogMergeKeyOf_(item) {
    const k = String(item.log_id || item.logId || "").trim();
    if (k) return "id:" + k;
    return "fallback:" + _normalize(item.vin) + ":" + String(item.date || "") + ":" +
        String(item.title || "") + ":" + String(item.shopId || "");
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
        vehicleName: row.vehicleName || "",
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
    if (ringIsDemoGasOffline_()) return loadVehicles();
    const token = typeof ringResolveActiveAuthToken === 'function'
        ? ringResolveActiveAuthToken()
        : localStorage.getItem("ring_auth_token");
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
 * PWA インストール案内（1回スキップ可能）
 */
function ringTryShowPwaInstallBanner() {
    try {
        if (localStorage.getItem('ring_pwa_install_dismissed') === '1') return;
        var el = document.getElementById('ringPwaInstallBanner');
        if (!el) return;
        if (!ringDeferredInstallPrompt) return;
        el.style.display = 'block';
    } catch (e) { /* ignore */ }
}

function ringDismissPwaInstallBanner() {
    try {
        localStorage.setItem('ring_pwa_install_dismissed', '1');
        var el = document.getElementById('ringPwaInstallBanner');
        if (el) el.style.display = 'none';
    } catch (e) { /* ignore */ }
}

function ringRunPwaInstallPrompt() {
    if (!ringDeferredInstallPrompt) {
        if (typeof showToast === 'function') showToast('info', 'このブラウザではホーム画面追加が利用できないか、既にインストール済みです。');
        return;
    }
    ringDeferredInstallPrompt.prompt();
    ringDeferredInstallPrompt.userChoice.finally(function () {
        ringDeferredInstallPrompt = null;
        ringDismissPwaInstallBanner();
    });
}

/** 運用監視ログ（System_Logs / GAS system_log） */
function ringParseBrowserName_(ua) {
    ua = String(ua || '');
    if (/Line\//i.test(ua)) return 'LINE';
    if (/Edg\//i.test(ua)) return 'Edge';
    if (/Chrome\//i.test(ua) && !/Edg\//i.test(ua)) return 'Chrome';
    if (/CriOS\//i.test(ua)) return 'Chrome(iOS)';
    if (/Safari\//i.test(ua) && !/Chrome\//i.test(ua)) return 'Safari';
    if (/Firefox\//i.test(ua)) return 'Firefox';
    return 'Other';
}

function ringGetSystemLogContext() {
    var page = '';
    var device = 'desktop';
    try {
        page = String(window.location.pathname || '');
        var w = window.innerWidth || 0;
        if (w > 0 && w < 768) device = 'mobile';
        else if (w > 0 && w < 1024) device = 'tablet';
    } catch (eP) { /* ignore */ }
    var network = 'unknown';
    try {
        var conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        if (conn && conn.effectiveType) network = String(conn.effectiveType);
    } catch (eN) { /* ignore */ }
    var user_id = '';
    var shop_id = '';
    try {
        var p = typeof getCurrentProfile === 'function' ? getCurrentProfile() : null;
        if (p) {
            user_id = String(p.userId || p.staffId || '');
            shop_id = String(p.shopId || '');
        }
    } catch (eU) { /* ignore */ }
    return {
        page: page,
        device: device,
        browser: ringParseBrowserName_(typeof navigator !== 'undefined' ? navigator.userAgent : ''),
        network: network,
        user_id: user_id,
        shop_id: shop_id
    };
}

function ringBuildSystemLogPayload(logAction, opts) {
    opts = opts || {};
    var ctx = ringGetSystemLogContext();
    var body = {
        action: 'system_log',
        logAction: logAction,
        page: opts.page != null ? String(opts.page) : ctx.page,
        device: ctx.device,
        browser: ctx.browser,
        network: ctx.network,
        user_id: ctx.user_id,
        shop_id: ctx.shop_id,
        error_message: String(opts.error_message || opts.errorMessage || '').slice(0, 2000),
        payload: opts.payload || {}
    };
    try {
        var tok = ringResolveActiveAuthToken();
        if (tok) body.authToken = tok;
    } catch (eT) { /* ignore */ }
    return body;
}

function ringLogSystemEvent(logAction, opts, useBeacon) {
    try {
        if (!logAction || typeof GAS_URL === 'undefined') return;
        var body = ringBuildSystemLogPayload(logAction, opts || {});
        var json = JSON.stringify(body);
        if (useBeacon && typeof navigator !== 'undefined' && navigator.sendBeacon) {
            navigator.sendBeacon(GAS_URL, new Blob([json], { type: 'text/plain' }));
            return;
        }
        fetch(GAS_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            body: json,
            keepalive: !!useBeacon
        }).catch(function () { /* ignore */ });
    } catch (e) { /* ignore */ }
}

var __ringUiExitState = { startedAt: 0, saved: false, sent: false, hadInteraction: false, page: '' };

function ringInitUiExitWatch(pageId) {
    __ringUiExitState = {
        startedAt: Date.now(),
        saved: false,
        sent: false,
        hadInteraction: false,
        page: pageId || ringGetSystemLogContext().page
    };
    function onInteract() { __ringUiExitState.hadInteraction = true; }
    document.addEventListener('click', onInteract, { passive: true });
    document.addEventListener('input', onInteract, { passive: true });
    function tryExit(trigger) {
        if (__ringUiExitState.saved || __ringUiExitState.sent) return;
        var dwellMs = Date.now() - __ringUiExitState.startedAt;
        if (dwellMs < 3000) return;
        __ringUiExitState.sent = true;
        ringLogSystemEvent('UI_EXIT', {
            payload: {
                dwellMs: dwellMs,
                exitTrigger: trigger,
                hadInteraction: __ringUiExitState.hadInteraction,
                page: __ringUiExitState.page
            }
        }, true);
    }
    window.addEventListener('pagehide', function () { tryExit('pagehide'); });
    document.addEventListener('visibilitychange', function () {
        if (document.visibilityState === 'hidden') tryExit('visibility');
    });
}

function ringMarkPageSaved() {
    __ringUiExitState.saved = true;
}

function ringInitSystemMonitoring() {
    var fn = '';
    try {
        fn = String(window.location.pathname || '').split('/').pop() || '';
    } catch (e) { return; }
    var watchPages = ['factory_input.html', 'dealer_input.html', 'car_add.html'];
    if (watchPages.indexOf(fn) !== -1) {
        ringInitUiExitWatch(fn.replace('.html', ''));
    }
}

/** 簡易アクセスログ（管理者ダッシュボード用） */
function ringLogClientAccess(surface) {
    try {
        var p = typeof getCurrentProfile === 'function' ? getCurrentProfile() : null;
        if (Math.random() > 0.06) return;
        var payload = {
            action: 'log_client_access',
            surface: String(surface || ''),
            userId: p && p.userId ? String(p.userId) : '',
            role: p && p.role ? String(p.role) : '',
            shopType: p && p.shopType ? String(p.shopType) : ''
        };
        fetch(GAS_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify(payload)
        }).catch(function () { /* ignore */ });
    } catch (e) { /* ignore */ }
}

var RING_USER_VEHICLE_MAX = 5;

/** role === "user" の一般ユーザー（shop / business / admin は除外） */
function ringIsFreePlanUserRole_(profile) {
    if (!profile) return false;
    var role = String(profile.role || '').trim().toLowerCase();
    if (role !== 'user') return false;
    var shopType = String(profile.shopType || 'user').trim().toLowerCase();
    return shopType === 'user' || shopType === '';
}

function ringCountLocalUserVehicles_(profile) {
    if (!profile) return 0;
    var uid = String(profile.userId || '').trim();
    if (!uid) return 0;
    return loadVehicles().filter(function (v) {
        return String(v.userId || v.ownerId || '').trim() === uid;
    }).length;
}

function ringUserOwnsVinLocal_(profile, vin) {
    if (!profile || !vin) return false;
    var uid = String(profile.userId || '').trim();
    var norm = _normalize(vin);
    return loadVehicles().some(function (v) {
        return _normalize(v.vin) === norm && String(v.userId || v.ownerId || '').trim() === uid;
    });
}

/** 新規登録のみブロック（同一 VIN の更新は通す） */
function ringUserVehicleLimitBlocksNew_(profile, vin) {
    if (!ringIsFreePlanUserRole_(profile)) return false;
    if (vin && ringUserOwnsVinLocal_(profile, vin)) return false;
    return ringCountLocalUserVehicles_(profile) >= RING_USER_VEHICLE_MAX;
}

function ringShowVehicleLimitReachedModal_() {
    var id = 'ring-vehicle-limit';
    var old = document.getElementById(id);
    if (old) old.remove();
    var html = '<div class="ring-save-confirm" id="' + id + '">' +
        '<div class="ring-save-confirm__backdrop"></div>' +
        '<div class="ring-save-confirm__card">' +
        '<div class="ring-save-confirm__title">登録上限に達しました</div>' +
        '<p class="ring-save-confirm__lead" style="margin-top:0">無料プランでは最大5台まで登録できます。不要な車両を削除すると新しい車両を登録できます。</p>' +
        '<div class="ring-save-confirm__actions">' +
        '<button type="button" class="ring-save-confirm__btn ring-save-confirm__btn--primary" data-ring-action="close">閉じる</button>' +
        '</div></div></div>';
    document.body.insertAdjacentHTML('beforeend', html);
    var el = document.getElementById(id);
    function close() { if (el && el.parentNode) el.remove(); }
    el.querySelector('[data-ring-action="close"]').onclick = close;
    el.querySelector('.ring-save-confirm__backdrop').onclick = close;
}

/** UI 用：上限時はモーダル表示して false を返す */
function ringGuardUserVehicleLimitBeforeAdd_(vin) {
    var profile = typeof getCurrentProfile === 'function' ? getCurrentProfile() : null;
    if (!ringUserVehicleLimitBlocksNew_(profile, vin)) return true;
    ringShowVehicleLimitReachedModal_();
    return false;
}

/**
 * 車両の追加・更新
 * @param {object} v
 */
async function addVehicle(v) {
    const list = loadVehicles();
    const i = list.findIndex(x => _normalize(x.vin) === _normalize(v.vin));
    if (i === -1) {
        var profile = typeof getCurrentProfile === 'function' ? getCurrentProfile() : null;
        if (ringUserVehicleLimitBlocksNew_(profile, v.vin)) {
            return { success: false, error: 'LIMIT_REACHED', localSaved: false, serverSaved: false, queued: false };
        }
    }
    const merged = i !== -1 ? { ...list[i], ...v } : { ...v };
    merged.createdAt = merged.createdAt || new Date().toISOString();
    if (merged.vehicleName != null) merged.vehicleName = ringNormalizeVehicleSaveValue_(merged.vehicleName);
    if (merged.firstRegistration != null) merged.firstRegistration = ringNormalizeVehicleSaveValue_(merged.firstRegistration);
    if (i !== -1) list[i] = merged; else list.push(merged);
    localStorage.setItem(DB_VEHICLES, JSON.stringify(list));
    try {
        return await sendToGAS_Safe('vehicle', Object.assign({}, merged));
    } catch (err) {
        const msg = String(err.message || '');
        if (/LIMIT_REACHED/i.test(msg)) {
            if (i === -1) {
                const revertList = loadVehicles();
                const ri = revertList.findIndex(x => _normalize(x.vin) === _normalize(v.vin));
                if (ri !== -1) {
                    revertList.splice(ri, 1);
                    localStorage.setItem(DB_VEHICLES, JSON.stringify(revertList));
                }
            }
            return { success: false, error: 'LIMIT_REACHED', localSaved: false, serverSaved: false, queued: false };
        }
        if (/VIN_REQUIRED/i.test(msg)) {
            ringLogSystemEvent('SAVE_FAIL', {
                error_message: msg,
                payload: { gasAction: 'vehicle', queued: false }
            });
            return { success: false, error: msg, localSaved: true, serverSaved: false, queued: false };
        }
        enqueueRetry('vehicle', merged);
        return { success: false, error: err.message, queued: true, localSaved: true, serverSaved: false };
    }
}

/**
 * 既存車両の編集更新（GAS update_vehicle — シート行上書き専用、画像なし）
 * @param {object} v
 */
async function updateVehicle(v) {
    if (!v || !v.vin) {
        return { success: false, error: 'VIN_REQUIRED', localSaved: false, serverSaved: false };
    }
    const list = loadVehicles();
    const i = list.findIndex(x => _normalize(x.vin) === _normalize(v.vin));
    if (i < 0) {
        return { success: false, error: 'VEHICLE_NOT_FOUND_LOCAL', localSaved: false, serverSaved: false };
    }
    const merged = { ...list[i], ...v };
    merged.vin = _normalize(merged.vin) || String(merged.vin || '').trim().toUpperCase();
    if (merged.vehicleName != null) merged.vehicleName = ringNormalizeVehicleSaveValue_(merged.vehicleName);
    if (merged.firstRegistration != null) merged.firstRegistration = ringNormalizeVehicleSaveValue_(merged.firstRegistration);
    if (merged.nextShaken != null) merged.nextShaken = ringNormalizeVehicleSaveValue_(merged.nextShaken);
    merged.updatedAt = new Date().toISOString();
    list[i] = merged;
    localStorage.setItem(DB_VEHICLES, JSON.stringify(list));

    var gasPayload = {
        vin: merged.vin,
        model: merged.model,
        nickname: merged.nickname,
        vehicleName: merged.vehicleName,
        vehicleModel: merged.vehicleModel,
        engine: merged.engine,
        classification: merged.classification || merged.category,
        category: merged.category || merged.classification,
        typeDesignation: merged.typeDesignation,
        nextShaken: merged.nextShaken,
        firstRegistration: merged.firstRegistration,
        vClass: merged.vClass,
        usage: merged.usage,
        ownerType: merged.ownerType,
        vehicleCategory: merged.vehicleCategory,
        createdAt: merged.createdAt,
        userId: merged.userId,
        shopId: merged.shopId
    };

    try {
        return await sendToGAS_Safe('update_vehicle', gasPayload);
    } catch (err) {
        const msg = String(err.message || '');
        if (/VIN_REQUIRED|VEHICLE_NOT_FOUND|VEHICLE_ACCESS_DENIED/i.test(msg)) {
            ringLogSystemEvent('SAVE_FAIL', {
                error_message: msg,
                payload: { gasAction: 'update_vehicle', queued: false }
            });
            return { success: false, error: msg, localSaved: true, serverSaved: false, queued: false };
        }
        enqueueRetry('update_vehicle', gasPayload);
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
            ringLogSystemEvent('SAVE_FAIL', {
                error_message: msg,
                payload: { gasAction: 'log', queued: false }
            });
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
 * GAS / ネットワークエラーをユーザー向け日本語メッセージへ変換
 * @param {string} errMsg
 * @param {string} [actionType]
 * @returns {string|null} トースト表示すべきメッセージ（null=呼び出し元に委譲）
 */
function ringGasErrorToUserMessage_(errMsg, actionType) {
    var msg = String(errMsg || '').trim();
    if (/LIMIT_REACHED/i.test(msg)) return null;
    if (/API_RATE_LIMIT|GEMINI_HTTP_429|HTTP_429|\b429\b|RATE_LIMIT/i.test(msg)) {
        return 'サーバーが混み合っています。少し待ってから再度お試しください';
    }
    if (/REQUEST_TIMEOUT|タイムアウト|AbortError|TIMED_OUT/i.test(msg)) {
        return 'サーバー応答がタイムアウトしました。電波の良い場所で再試行してください';
    }
    if (/NETWORK_ERROR|Failed to fetch|NetworkError|Network request failed|Load failed|net::ERR/i.test(msg)) {
        return '通信に失敗しました。電波の良い場所で再試行してください';
    }
    if (/HTTP_5\d{2}|GEMINI_HTTP_5|502|503|504|500/i.test(msg)) {
        return 'サーバーが混み合っています。少し待ってから再度お試しください';
    }
    if (/INVALID_JSON|HTTP_4\d{2}/i.test(msg) && actionType !== 'verify_session') {
        return 'サーバーからの応答を処理できませんでした。しばらくしてから再度お試しください';
    }
    return null;
}

/**
 * GAS：fetch タイムアウト（H-01）
 */
async function fetchJsonWithTimeout(url, options, timeoutMs) {
    const ms = timeoutMs != null ? timeoutMs : 20000;
    if (typeof AbortController === 'undefined') {
        try {
            const res = await fetch(url, options || {});
            if (!res.ok) throw new Error('HTTP_' + res.status);
            const text = await res.text();
            return safeJsonParse(text, {});
        } catch (e) {
            var m0 = String(e && e.message ? e.message : e || '');
            if (/Failed to fetch|NetworkError|network/i.test(m0)) throw new Error('NETWORK_ERROR');
            throw e;
        }
    }
    const controller = new AbortController();
    const timer = setTimeout(function () { controller.abort(); }, ms);
    try {
        const res = await fetch(url, Object.assign({}, options || {}, { signal: controller.signal }));
        if (!res.ok) throw new Error('HTTP_' + res.status);
        const text = await res.text();
        return safeJsonParse(text, {});
    } catch (e) {
        if (e && e.name === 'AbortError') {
            throw new Error('REQUEST_TIMEOUT');
        }
        var m = String(e && e.message ? e.message : e || '');
        if (/Failed to fetch|NetworkError|network/i.test(m)) {
            throw new Error('NETWORK_ERROR');
        }
        throw e;
    } finally {
        clearTimeout(timer);
    }
}

/**
 * GAS送信処理
 * @param {string} actionType
 * @param {object} [data]
 * @param {{ timeoutMs?: number }} [opts]
 */
async function sendToGAS_Safe(actionType, data, opts) {
    if (ringIsDemoGasOffline_()) {
        return ringDemoGasStubResponse_(actionType);
    }
    try {
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

    const authToken = ringResolveActiveAuthToken();
    if (authToken) payload.authToken = authToken;

    const timeoutMs = opts && opts.timeoutMs != null ? opts.timeoutMs : 20000;
    const json = await fetchJsonWithTimeout(GAS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify(payload)
    }, timeoutMs);
    if (!json || json.success !== true) {
        if (actionType === 'ocr_vin' && json && (json.fields || json.ocrText || json.registration || json.error === 'OCR_DISABLED')) {
            return json;
        }
        if (actionType === 'ocr_vin_search' && json && (Array.isArray(json.candidates) || /VIN_NOT_FOUND|OCR_NOT_CONFIGURED|IMAGE_REQUIRED/i.test(String(json.error || '')))) {
            return json;
        }
        var gasErr = (json && json.error) ? String(json.error) : 'GAS保存に失敗しました';
        throw new Error(gasErr);
    }
    return json;
    } catch (err) {
        var errMsg = String(err && err.message ? err.message : err || '');
        if (/AUTH_EXPIRED/i.test(errMsg) && actionType !== 'verify_session') {
            ringHandleAuthExpired_(ringGetActiveMode(), actionType);
        }
        if (actionType !== 'system_log') {
            if ((actionType === 'ocr_vin' || actionType === 'ocr_vin_search' || actionType === 'ocr_gemini_shaken' || actionType === 'ocr_invoice') && /AUTH_/i.test(errMsg)) {
                ringLogSystemEvent('AUTH_ERROR', {
                    error_message: errMsg,
                    payload: { gasAction: actionType }
                });
            } else if (!(actionType === 'ocr_vin' && /VIN_NOT_FOUND|NO_FIELDS|OCR_DISABLED/i.test(errMsg))
                && !(actionType === 'ocr_vin_search' && /VIN_NOT_FOUND|OCR_NOT_CONFIGURED|IMAGE_REQUIRED/i.test(errMsg))
                && !(actionType === 'ocr_gemini_shaken' && /GEMINI_|IMAGE_REQUIRED|PROMPT_REQUIRED|NO_IMAGES/i.test(errMsg))
                && !(actionType === 'ocr_invoice' && /GEMINI_|IMAGE_REQUIRED|NO_IMAGES|GAS_OCR_FAIL/i.test(errMsg))) {
                ringLogSystemEvent('GAS_ERROR', {
                    error_message: errMsg,
                    payload: { gasAction: actionType }
                });
            }
        }
        var userMsg = ringGasErrorToUserMessage_(errMsg, actionType);
        if (userMsg && !(opts && opts.silentToast) && typeof showToast === 'function') {
            var toastType = /API_RATE_LIMIT|429|混み合|HTTP_5/i.test(errMsg) ? 'warning' : 'warning';
            showToast(toastType, userMsg);
        }
        throw err;
    } finally {
        if (typeof hideOcrAnalyzingOverlay === 'function') {
            try { hideOcrAnalyzingOverlay(); } catch (eOv) { /* ignore */ }
        }
    }
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
    ringLogSystemEvent('SAVE_FAIL', {
        error_message: 'retry_queued',
        payload: { gasAction: action, queued: true, key: key }
    });
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
            ringLogSystemEvent('SAVE_FAIL', {
                error_message: msg,
                payload: { gasAction: 'save_inspection', queued: false }
            });
            return { serverSaved: false, hardFail: true, error: msg };
        }
        enqueueRetry('save_inspection', data);
        return { serverSaved: false, queued: true, error: msg };
    }
}

/**
 * 当日限定：日常点検の既存行を GAS で上書き
 * @param {object} payload
 */
async function updateDailyInspectionToGasWithRetry(payload) {
    const data = payload && typeof payload === 'object'
        ? JSON.parse(JSON.stringify(payload))
        : {};
    try {
        await sendToGAS_Safe('update_daily_inspection', data);
        return { serverSaved: true };
    } catch (err) {
        const msg = String(err && err.message ? err.message : err || '');
        if (/VEHICLE_NOT_REGISTERED|VIN_REQUIRED|INSPECTION_DATE_REQUIRED|DAILY_INSPECTION_NOT_FOUND|INSPECTION_EDIT_TODAY_ONLY/i.test(msg)) {
            ringLogSystemEvent('SAVE_FAIL', {
                error_message: msg,
                payload: { gasAction: 'update_daily_inspection', queued: false }
            });
            return { serverSaved: false, hardFail: true, error: msg };
        }
        enqueueRetry('update_daily_inspection', data);
        return { serverSaved: false, queued: true, error: msg };
    }
}

let __ringRetryFlushBusy = false;

/**
 * オンライン復帰などで再送キューを空に近づける（C-01）
 */
async function flushRetryQueue() {
    if (ringIsDemoGasOffline_()) return;
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
    return !/^(login|user_login|user_line_callback|register|biz_register|splash)\.html$/i.test(f);
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
    const current = safeJsonParse(localStorage.getItem('nappy_fav_shops_v1'), []);
    const legacy  = safeJsonParse(localStorage.getItem('nappy_fav_shops'), []);
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
    const primary = safeJsonParse(localStorage.getItem(DB_INSPECTIONS), []);
    const legacy  = safeJsonParse(localStorage.getItem('nappy_inspections_v1'), []);
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
function ringConfirmRow(label, value, confidence) {
    var v = (value === undefined || value === null || String(value).trim() === '') ? '—' : String(value);
    var low = confidence === 'low';
    return '<div class="ring-save-confirm__row' + (low ? ' ring-save-confirm__row--low-conf' : '') + '">' +
        '<span class="ring-save-confirm__k">' + escapeHtml(label) +
        (low ? ' <span class="ring-ocr-review__conf">要確認</span>' : '') +
        '</span><span class="ring-save-confirm__v">' + escapeHtml(v) + '</span></div>';
}

function ringNormalizeVehicleSaveValue_(v) {
    var s = String(v == null ? '' : v).trim();
    if (!s || s === '-' || s === '不明' || /^N\/A$/i.test(s)) return '';
    return s;
}

/**
 * 車検満了日等の ISO / 日付文字列を JST 表示用に整形（YYYY年MM月DD日）
 * @param {string} iso
 * @returns {string}
 */
function ringFormatVehicleDateJst_(iso) {
    var s = String(iso || '').trim();
    if (!s) return '---';
    var m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) {
        return m[1] + '年' + m[2] + '月' + m[3] + '日';
    }
    var d = new Date(s);
    if (isNaN(d.getTime())) return s;
    try {
        var parts = new Intl.DateTimeFormat('ja-JP', {
            timeZone: 'Asia/Tokyo',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        }).formatToParts(d);
        var y = '', mo = '', dy = '';
        parts.forEach(function (p) {
            if (p.type === 'year') y = p.value;
            if (p.type === 'month') mo = p.value;
            if (p.type === 'day') dy = p.value;
        });
        if (y && mo && dy) return y + '年' + mo + '月' + dy + '日';
    } catch (e1) { /* fall through */ }
    return d.getFullYear() + '年' +
        String(d.getMonth() + 1).padStart(2, '0') + '月' +
        String(d.getDate()).padStart(2, '0') + '日';
}

/** ソート用: 日付 ISO プレフィックス（TZ ずれ回避） */
function ringVehicleDateSortKey_(iso) {
    var s = String(iso || '').trim();
    var m = s.match(/^(\d{4}-\d{2}-\d{2})/);
    return m ? m[1] : s;
}

/** 西暦年 → 和暦表示（例: 2021 → 令和3年） */
function ringFormatWarekiYearLabel_(westernYear) {
    var y = parseInt(westernYear, 10);
    if (isNaN(y)) return String(westernYear || '');
    if (y >= 2019) return '令和' + (y - 2018) + '年';
    if (y >= 1989) return '平成' + (y - 1988) + '年';
    if (y >= 1926) return '昭和' + (y - 1925) + '年';
    return y + '年';
}

/** #firstRegMonth の 1〜12 月 option を生成 */
function ringBuildFirstRegMonthOptions_(monthSel) {
    if (!monthSel) return;
    monthSel.innerHTML = '<option value="">月</option>';
    for (var m = 1; m <= 12; m++) {
        var mm = m < 10 ? '0' + m : String(m);
        var opt = document.createElement('option');
        opt.value = mm;
        opt.textContent = m + '月';
        monthSel.appendChild(opt);
    }
}

/** #firstRegEraYear の昭和〜令和 option（value=西暦年）を生成 */
function ringBuildFirstRegEraYearOptions_(eraYearSel) {
    if (!eraYearSel) return;
    var nowYear = new Date().getFullYear();
    var startYear = 1926;
    eraYearSel.innerHTML = '<option value="">年</option>';
    for (var y = nowYear; y >= startYear; y--) {
        var opt = document.createElement('option');
        opt.value = String(y);
        opt.textContent = ringFormatWarekiYearLabel_(y);
        eraYearSel.appendChild(opt);
    }
}

/** YYYY-MM を年・月セレクトへ反映（change イベントは発火しない） */
function ringSyncFirstRegHiddenToSelects_(hidden, eraYearSel, monthSel) {
    if (!hidden || !eraYearSel || !monthSel) return;
    var raw = String(hidden.value || '').trim().replace(/\//g, '-');
    var m = raw.match(/^(\d{4})-(\d{1,2})$/);
    if (m) {
        eraYearSel.value = m[1];
        var mo = parseInt(m[2], 10);
        monthSel.value = mo >= 1 && mo <= 12 ? (mo < 10 ? '0' + mo : String(mo)) : '';
    } else {
        eraYearSel.value = '';
        monthSel.value = '';
    }
}

/** 年・月セレクト → #inFirstReg(hidden) へ YYYY-MM 同期 */
function ringSyncFirstRegSelectsToHidden_(hidden, eraYearSel, monthSel) {
    if (!hidden || !eraYearSel || !monthSel) return;
    var protoVal = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
    var y = eraYearSel.value;
    var mo = monthSel.value;
    var next = (y && mo) ? (y + '-' + mo) : '';
    if (protoVal.get.call(hidden) === next) return;
    protoVal.set.call(hidden, next);
    hidden.dispatchEvent(new Event('change', { bubbles: true }));
}

/**
 * 初度登録年月: 和暦セレクト + hidden(#inFirstReg) プロキシ初期化
 * @param {string=} hiddenId
 */
function ringInitFirstRegWareki_(hiddenId) {
    hiddenId = hiddenId || 'inFirstReg';
    var hidden = document.getElementById(hiddenId);
    var eraYearSel = document.getElementById('firstRegEraYear');
    var monthSel = document.getElementById('firstRegMonth');
    if (!hidden || !eraYearSel || !monthSel || hidden.dataset.warekiInit === '1') return;

    ringBuildFirstRegEraYearOptions_(eraYearSel);
    ringBuildFirstRegMonthOptions_(monthSel);

    eraYearSel.addEventListener('change', function () {
        ringSyncFirstRegSelectsToHidden_(hidden, eraYearSel, monthSel);
    });
    monthSel.addEventListener('change', function () {
        ringSyncFirstRegSelectsToHidden_(hidden, eraYearSel, monthSel);
    });

    var protoVal = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
    Object.defineProperty(hidden, 'value', {
        get: function () { return protoVal.get.call(this); },
        set: function (v) {
            protoVal.set.call(this, v);
            ringSyncFirstRegHiddenToSelects_(hidden, eraYearSel, monthSel);
        },
        configurable: true
    });

    ringSyncFirstRegHiddenToSelects_(hidden, eraYearSel, monthSel);
    hidden.dataset.warekiInit = '1';
}

/** OCR 等から #inFirstReg へプログラム反映する際の公開 API */
function ringSetFirstRegValue_(value) {
    var hidden = document.getElementById('inFirstReg');
    if (!hidden) return;
    if (hidden.dataset.warekiInit !== '1') ringInitFirstRegWareki_('inFirstReg');
    hidden.value = value == null ? '' : String(value);
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
            : (typeof ringGetPreSaveLeadText === 'function' ? ringGetPreSaveLeadText() : '個人情報・金額など誤りがないかご確認ください。問題なければ登録してください。');
        leadBlock = '<p class="ring-save-confirm__lead">' + escapeHtml(leadText) + '</p>';
    }
    var piiBlock = opts.piiWarningHtml ? ('<div class="ring-save-confirm__pii-warn">' + opts.piiWarningHtml + '</div>') : '';
    var html = '<div class="ring-save-confirm" id="' + id + '">' +
        '<div class="ring-save-confirm__backdrop"></div>' +
        '<div class="ring-save-confirm__card">' +
        '<div class="ring-save-confirm__title">' + escapeHtml(title) + '</div>' +
        piiBlock +
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
    maxSide = maxSide || 2400;
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
                    var dataUrl = c.toDataURL('image/jpeg', 0.85);
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

/**
 * 単枚 OCR の GAS 送信コア（リサイズ → 認証 → ocr_vin）
 * @param {File|Blob} file
 * @param {string=} fileName
 */
async function ringOcrVinRequest_(file, fileName, opts) {
    opts = opts || {};
    fileName = fileName || (file && file.name) || 'image';
    var b64;
    try {
        b64 = await fileToVisionBase64(file, 2400);
    } catch (e) {
        ringReportOcrAbort_('image_encode', e, { payload: { fileName: fileName }, toast: false });
        throw e;
    }
    if (!b64) {
        var emptyErr = new Error('IMAGE_ENCODE_EMPTY');
        ringReportOcrAbort_('image_encode', emptyErr, { payload: { fileName: fileName }, toast: false });
        throw emptyErr;
    }
    try {
        await ringEnsureAuthForOcr();
        var payload = { imageBase64: b64 };
        if (opts.documentType) payload.documentType = opts.documentType;
        return await sendToGAS_Safe('ocr_vin', payload);
    } finally {
        b64 = null;
    }
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
    var order = ['vin', 'vehicleName', 'shaken', 'firstRegistration', 'mileage', 'parts', 'model', 'engine', 'class', 'typeDesignation'];
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

function ringCorrectVinOcrMisread_(vin) {
    if (!vin) return '';
    return String(vin).toUpperCase().replace(/I/g, '1').replace(/O/g, '0').replace(/Q/g, '0');
}

/** 整備区分プルダウン選択肢（入力画面共通） */
var RING_WORK_TITLE_OPTIONS = [
    { value: '', label: '選択してください', placeholder: true },
    { value: '車検', label: '車検' },
    { value: '法定点検', label: '法定点検' },
    { value: '一般整備・故障修理', label: '一般整備・故障修理' },
    { value: '鈑金・塗装', label: '鈑金・塗装' },
    { value: 'その他', label: 'その他' }
];

function ringAutoGrowTextarea_(el) {
    if (!el || el.tagName !== 'TEXTAREA') return;
    el.style.overflowY = 'hidden';
    el.style.resize = 'none';
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px';
}

/** 値をプログラムからセットした直後など、レイアウト確定後に高さを再計算 */
function ringAutoGrowTextareaSoon_(el) {
    if (!el || el.tagName !== 'TEXTAREA') return;
    ringAutoGrowTextarea_(el);
    requestAnimationFrame(function () {
        ringAutoGrowTextarea_(el);
        requestAnimationFrame(function () { ringAutoGrowTextarea_(el); });
    });
}

function ringInitAutoGrowTextareas(root) {
    var scope = root && root.querySelectorAll ? root : document;
    var list = scope.querySelectorAll
        ? scope.querySelectorAll('textarea.ring-auto-grow, textarea.ring-ocr-review__input')
        : [];
    list.forEach(function (ta) {
        ringAutoGrowTextareaSoon_(ta);
        if (ta.__ringAutoGrowBound) return;
        ta.__ringAutoGrowBound = true;
        ta.addEventListener('input', function () { ringAutoGrowTextarea_(ta); });
    });
}

/** iOS Safari: テキストエリア focus 時の画面ジャンプ軽減（visualViewport 非依存） */
function ringInitIosTextareaKeyboardFix_(root) {
    var scope = root && root.querySelectorAll ? root : document;
    var list = scope.querySelectorAll ? scope.querySelectorAll('textarea') : [];
    list.forEach(function (ta) {
        if (ta.__ringIosKbdFixBound) return;
        ta.__ringIosKbdFixBound = true;
        ta.addEventListener('focus', function () {
            document.body.classList.add('ring-ios-kbd-open');
            setTimeout(function () {
                try {
                    ta.scrollIntoView({ block: 'center', behavior: 'smooth' });
                } catch (e) {
                    try { ta.scrollIntoView(true); } catch (e2) { /* ignore */ }
                }
            }, 320);
        });
        ta.addEventListener('blur', function () {
            document.body.classList.remove('ring-ios-kbd-open');
        });
    });
}

function ringInitWorkTitleSelect(selectEl) {
    if (!selectEl) return;
    selectEl.innerHTML = '';
    RING_WORK_TITLE_OPTIONS.forEach(function (opt) {
        var o = document.createElement('option');
        o.value = opt.value;
        o.textContent = opt.label;
        if (opt.placeholder) {
            o.disabled = true;
            o.selected = true;
        }
        selectEl.appendChild(o);
    });
    selectEl.required = true;
}

function ringSetWorkTitleSelectValue(selectEl, savedTitle) {
    if (!selectEl) return;
    ringInitWorkTitleSelect(selectEl);
    var val = String(savedTitle || '').trim();
    if (!val) return;
    var found = false;
    var i;
    for (i = 0; i < selectEl.options.length; i++) {
        if (selectEl.options[i].value === val) {
            found = true;
            break;
        }
    }
    if (found) {
        selectEl.value = val;
        return;
    }
    var orphan = document.createElement('option');
    orphan.value = val;
    orphan.textContent = val + '（旧データ）';
    selectEl.appendChild(orphan);
    selectEl.value = val;
}

function ringValidateWorkTitleSelect(selectEl, errElId) {
    var el = selectEl || document.getElementById('inTitle');
    if (!el) return true;
    var ok = String(el.value || '').trim() !== '';
    var err = document.getElementById(errElId || 'errTitle');
    if (err) err.style.display = ok ? 'none' : 'block';
    return ok;
}

/** 整備区分が「車検」かどうか */
function ringIsShakenWorkTitle_(titleVal) {
    return String(titleVal || '').trim() === '車検';
}

/** 整備区分に応じて車検満了日ブロックの表示・必須を切り替え */
function ringSyncShakenExpiryBlock_() {
    var block = document.getElementById('shakenExpiryBlock');
    if (!block) return;
    var titleEl = document.getElementById('inTitle');
    var isShaken = ringIsShakenWorkTitle_(titleEl ? titleEl.value : '');
    block.style.display = isShaken ? '' : 'none';
    var labelEl = block.querySelector('.shaken-expiry-label');
    if (labelEl) labelEl.textContent = isShaken ? '車検満了日 ※必須' : '車検満了日';
    ['expiryYear', 'expiryMonth', 'expiryDay'].forEach(function (id) {
        var sel = document.getElementById(id);
        if (!sel) return;
        if (isShaken) sel.setAttribute('required', 'required');
        else sel.removeAttribute('required');
    });
    if (!isShaken) {
        var errSh = document.getElementById('errShaken');
        if (errSh) errSh.style.display = 'none';
        if (typeof ringCarAddMarkDateFieldsError === 'function') ringCarAddMarkDateFieldsError('expiry', false);
    }
}

/** 整備区分が車検のときのみ車検満了日を必須チェック */
function ringValidateShakenExpiryIfRequired_() {
    var titleEl = document.getElementById('inTitle');
    if (!ringIsShakenWorkTitle_(titleEl ? titleEl.value : '')) return true;
    if (typeof ringCarAddSyncAllDateHidden === 'function') ringCarAddSyncAllDateHidden();
    var shaken = String((document.getElementById('inExpiry') || {}).value || '').trim();
    var ok = !!shaken;
    var errSh = document.getElementById('errShaken');
    if (errSh) errSh.style.display = ok ? 'none' : 'block';
    if (typeof ringCarAddMarkDateFieldsError === 'function') ringCarAddMarkDateFieldsError('expiry', !ok);
    return ok;
}

/**
 * VIN からサーバー上の車両基本情報を取得してフォームへ反映（読み取り専用 API）
 * @returns {Promise<{found: boolean, vehicle?: object, applied?: boolean}>}
 */
async function ringFetchAndApplyVehicleInfoByVin_(rawVin, opts) {
    opts = opts || {};
    var vin = typeof ringFormatVinDisplayValue_ === 'function'
        ? ringFormatVinDisplayValue_(rawVin)
        : String(rawVin || '').trim().toUpperCase();
    if (!vin) return { found: false };

    try {
        var json = await sendToGAS_Safe('get_vehicle_info', { vin: vin });
        if (!json || json.found !== true) return { found: false };

        var v = json.vehicle || {};
        var applied = false;

        function setField(id, val) {
            if (val == null || String(val).trim() === '') return;
            var el = document.getElementById(id);
            if (!el || el.readOnly) return;
            el.value = String(val).trim();
            applied = true;
        }

        setField('inModel', v.vehicleModel || v.model);
        setField('inEngine', v.engine);
        setField('inClass', v.classification);
        setField('inTypeDesig', v.typeDesignation);

        if (v.nextShaken) {
            var expiryEl = document.getElementById('inExpiry');
            if (expiryEl && !String(expiryEl.value || '').trim() && typeof ringCarAddSetExpiryFromIso === 'function') {
                ringCarAddSetExpiryFromIso(v.nextShaken);
                applied = true;
            }
        }

        if (applied && opts.toast !== false && typeof showToast === 'function') {
            showToast('success', '過去の登録データを反映しました');
        }
        if (typeof opts.onApplied === 'function') opts.onApplied(v, applied);
        return { found: true, vehicle: v, applied: applied };
    } catch (e) {
        return { found: false };
    }
}

window.ringIsShakenWorkTitle_ = ringIsShakenWorkTitle_;
window.ringSyncShakenExpiryBlock_ = ringSyncShakenExpiryBlock_;
window.ringValidateShakenExpiryIfRequired_ = ringValidateShakenExpiryIfRequired_;
window.ringFetchAndApplyVehicleInfoByVin_ = ringFetchAndApplyVehicleInfoByVin_;

function ringHasOcrResult_(res) {
    if (!res || typeof res !== 'object') return false;
    if (res.partial === true) return true;
    var keys = ['vin', 'vehicleName', 'mileage', 'shaken', 'firstRegistration', 'model', 'engine', 'class', 'typeDesignation', 'parts', 'memo'];
    var i;
    for (i = 0; i < keys.length; i++) {
        var v = res[keys[i]];
        if (v != null && String(v).trim() !== '') return true;
    }
    if (res.fields && typeof res.fields === 'object') {
        var f = res.fields;
        if (f.mileage != null && !isNaN(f.mileage)) return true;
        if (f.shaken) return true;
        if (f.model || f.engine || f.class || f.typeDesignation) return true;
        if (f.vehicleName || f.firstRegistration) return true;
        if (f.parts && f.parts.length) return true;
    }
    return false;
}

function ringNormalizeOcrResultPayload_(res) {
    if (!res) return {};
    if (res.fields && typeof res.fields === 'object' && !res.vin && !res.mileage) {
        var flat = {};
        if (res.fields.mileage != null) flat.mileage = res.fields.mileage;
        if (res.fields.shaken) flat.shaken = res.fields.shaken;
        if (res.fields.model) flat.model = res.fields.model;
        if (res.fields.engine) flat.engine = res.fields.engine;
        if (res.fields.class) flat.class = res.fields.class;
        if (res.fields.typeDesignation) flat.typeDesignation = res.fields.typeDesignation;
        if (res.fields.vehicleName) flat.vehicleName = res.fields.vehicleName;
        if (res.fields.firstRegistration) flat.firstRegistration = res.fields.firstRegistration;
        if (res.fields.parts && res.fields.parts.length) flat.parts = res.fields.parts.join('\n');
        if (res.partial) flat.partial = true;
        return flat;
    }
    var out = {};
    Object.keys(res).forEach(function (k) {
        if (k === 'fields') return;
        out[k] = res[k];
    });
    if (out.vin) out.vin = ringCorrectVinOcrMisread_(String(out.vin).replace(/\s+/g, ''));
    if (res.partial === true) out.partial = true;
    if (res.ocrStatus) out.ocrStatus = res.ocrStatus;
    return out;
}

function ringBuildOcrConfirmBodyHtml_(payload) {
    var html = '';
    var conf = payload._confidence || {};
    function row(label, key) {
        if (payload[key] == null || String(payload[key]).trim() === '') return;
        html += ringConfirmRow(label, payload[key], conf[key]);
    }
    row('車名', 'vehicleName');
    row('車体番号', 'vin');
    row('車検満了日', 'shaken');
    row('初度登録年月', 'firstRegistration');
    row('走行距離(km)', 'mileage');
    row('型式', 'model');
    row('原動機型式', 'engine');
    row('類別区分', 'class');
    row('型式指定', 'typeDesignation');
    if (payload.parts) html += ringConfirmRow('部品', payload.parts, conf.parts);
    return html || ringConfirmRow('読取項目', '（内容をご確認ください）');
}

/**
 * 画面別 OCR オートフィル
 * @param {'factory'|'dealer'|'car'} scope
 */
function ringApplyOcrToForm(scope, payload, opts) {
    opts = opts || {};
    if (!payload) return;
    payload = ringNormalizeOcrResultPayload_(payload);
    var vinEl, ro;
    if (payload.vin) {
        vinEl = document.getElementById('inVin');
        if (vinEl) {
            ro = vinEl.readOnly;
            if (!ro) vinEl.value = String(payload.vin).toUpperCase();
        }
    }
    if (scope === 'car') {
        if (payload.vehicleName) { var vn = document.getElementById('inVehicleName'); if (vn) vn.value = payload.vehicleName; }
        if (payload.shaken) {
            if (typeof ringCarAddSetExpiryFromIso === 'function') ringCarAddSetExpiryFromIso(payload.shaken);
            else { var ex = document.getElementById('inExpiry'); if (ex) ex.value = payload.shaken; }
        }
        if (payload.firstRegistration) {
            if (typeof ringCarAddSetFirstRegFromIso === 'function') ringCarAddSetFirstRegFromIso(payload.firstRegistration);
            else if (typeof ringSetFirstRegValue_ === 'function') ringSetFirstRegValue_(payload.firstRegistration);
            else { var fr = document.getElementById('inFirstReg'); if (fr) fr.value = payload.firstRegistration; }
        }
        if (payload.model) { var mo = document.getElementById('inModel'); if (mo) mo.value = payload.model; }
        if (payload.engine) { var en = document.getElementById('inEngine'); if (en) en.value = payload.engine; }
        if (payload.class) { var ca = document.getElementById('inCategory'); if (ca) ca.value = payload.class; }
        if (payload.typeDesignation) { var td = document.getElementById('inTypeDesig'); if (td) td.value = payload.typeDesignation; }
        var det = document.querySelector('.card details');
        if (det && (payload.model || payload.engine || payload.class || payload.typeDesignation || payload.vehicleName)) det.open = true;
        if (typeof opts.onAfter === 'function') opts.onAfter(payload);
    } else {
        if (payload.mileage != null) { var mi = document.getElementById('inMileage'); if (mi) mi.value = payload.mileage; }
        if (payload.shaken) {
            if (typeof ringCarAddSetExpiryFromIso === 'function' && document.getElementById('inExpiry')) {
                ringCarAddSetExpiryFromIso(payload.shaken);
            } else {
                var sh = document.getElementById('inShaken'); if (sh) sh.value = payload.shaken;
            }
        }
        if (payload.model) { var mo2 = document.getElementById('inModel'); if (mo2) mo2.value = payload.model; }
        if (payload.engine) { var en2 = document.getElementById('inEngine'); if (en2) en2.value = payload.engine; }
        if (payload.class) { var cl = document.getElementById('inClass'); if (cl) cl.value = payload.class; }
        if (payload.typeDesignation) { var td2 = document.getElementById('inTypeDesig'); if (td2) td2.value = payload.typeDesignation; }
        if (scope === 'factory') {
            if (payload.parts) { var pa = document.getElementById('inParts'); if (pa) pa.value = payload.parts; }
            if (payload.memo) { var me = document.getElementById('inMemo'); if (me) me.value = payload.memo; }
            if (payload.vin && typeof lookupVehicle === 'function') lookupVehicle(payload.vin);
            var det2 = document.querySelector('.note-card details');
            if (det2 && (payload.model || payload.engine || payload.class || payload.typeDesignation)) det2.open = true;
            ringInitAutoGrowTextareas();
        }
        if (typeof opts.onAfter === 'function') opts.onAfter(payload);
    }
    if (typeof window !== 'undefined') window.__ringOcrAppliedThisSession = true;
    if (typeof ringClearOcrImageMemory === 'function') ringClearOcrImageMemory(opts.clearMemoryOpts || opts);
}

/**
 * C-05: OCR で得た結果を確認モーダル経由でだけ反映。デモ時は項目別チェック（showOcrApplyConfirm）。
 * @param {Record<string, *>} res
 * @param {(picked: Record<string, *>) => void} applyFn
 * @param {{ key: string, label: string, getCurrent?: () => string }[]=} ocrFieldDescriptors
 */
function handleOcrVinResultForForm(res, applyFn, ocrFieldDescriptors) {
    if (!ringHasOcrResult_(res)) {
        var n = incrementOcrFailureCount();
        ringLogSystemEvent('OCR_FAIL', {
            error_message: res ? 'no_fields' : 'ocr_no_result',
            payload: { consecutiveFailures: n }
        });
        if (typeof showToast === 'function') {
            showToast('warning', '読み取れませんでした。再撮影してください。');
            if (n >= 2) {
                showToast('info', '手入力でも続行できます。車台番号欄に直接入力してください。');
            }
        }
        return;
    }

    var payload = ringNormalizeOcrResultPayload_(res);
    var ocrStatus = res && res.ocrStatus ? res.ocrStatus : null;
    var demo = ringIsOcrDemoMode_();
    var extraKeys = ['vehicleName', 'shaken', 'firstRegistration', 'mileage', 'parts', 'model', 'engine', 'class', 'typeDesignation'].filter(function (k) {
        var v = payload[k];
        return v != null && String(v).trim() !== '';
    });
    var useGrid = demo && ocrFieldDescriptors && ocrFieldDescriptors.length && (payload.vin || extraKeys.length > 0);
    if (useGrid) {
        showOcrApplyConfirm(payload, ocrFieldDescriptors, function (picked) {
            resetOcrFailureCount();
            if (typeof applyFn === 'function') applyFn(picked);
        });
        return;
    }

    showRingSaveConfirm({
        title: payload.partial ? '読み取り結果の確認（一部）' : '読み取り結果の確認',
        lead: payload.vin
            ? 'OCRで読み取った内容です。お車の表示と一致するかご確認のうえ反映してください。'
            : '車体番号は読み取れませんでしたが、他の項目を検出しました。内容をご確認のうえ反映してください。',
        bodyHtml: ringBuildOcrConfirmBodyHtml_(payload),
        confirmLabel: '入力欄に反映する',
        onConfirm: function () {
            resetOcrFailureCount();
            if (ocrStatus && typeof ringLogSystemEvent === 'function') {
                ringLogSystemEvent('OCR_SUCCESS', { payload: ocrStatus });
            }
            if (typeof applyFn === 'function') applyFn(payload);
        },
        onCancel: function () {}
    });
}

var RING_OCR_BATCH_MAX = 5;

/** OCR 書類選択キュー（サムネイル表示用・Drive 保存なし） */
var ringOcrQueueState = { files: [], objectUrls: [] };

function ringOcrClearQueue() {
    ringOcrQueueState.objectUrls.forEach(function (u) {
        try { URL.revokeObjectURL(u); } catch (e) { /* ignore */ }
    });
    ringOcrQueueState.files = [];
    ringOcrQueueState.objectUrls = [];
}

function ringClearOcrImageMemory(opts) {
    opts = opts || {};
    ringOcrClearQueue();
    if (opts.previewImg) {
        opts.previewImg.removeAttribute('src');
        opts.previewImg.src = '';
    }
    if (opts.previewArea) opts.previewArea.style.display = 'none';
    if (opts.moreBadge) {
        opts.moreBadge.textContent = '';
        opts.moreBadge.style.display = 'none';
    }
    if (opts.discardNotice) opts.discardNotice.style.display = 'none';
    var strip = document.getElementById('ocrThumbStrip');
    if (strip) strip.innerHTML = '';
    var loadBtn = document.getElementById('ocrLoadBtn');
    if (loadBtn) loadBtn.disabled = true;
}

function ringRenderOcrThumbnails(container, files) {
    if (!container) return;
    container.innerHTML = '';
    ringOcrClearQueue();
    var list = Array.from(files || []).slice(0, RING_OCR_BATCH_MAX);
    ringOcrQueueState.files = list;
    list.forEach(function (file, idx) {
        var url = URL.createObjectURL(file);
        ringOcrQueueState.objectUrls.push(url);
        var wrap = document.createElement('div');
        wrap.className = 'ring-ocr-thumb';
        wrap.innerHTML = '<img src="' + url + '" alt=""><span class="ring-ocr-thumb__label">' + escapeHtml(ringShortFileName(file.name)) + '</span>' +
            '<button type="button" class="ring-ocr-thumb__remove" data-idx="' + idx + '" aria-label="削除">×</button>';
        container.appendChild(wrap);
    });
    container.style.display = list.length ? 'flex' : 'none';
}

function ringOcrEnqueueFiles(fileList, opts) {
    opts = opts || {};
    var incoming = Array.from(fileList || []);
    if (!incoming.length) return;
    var merged = ringOcrQueueState.files.concat(incoming).slice(0, RING_OCR_BATCH_MAX);
    if (incoming.length + ringOcrQueueState.files.length > RING_OCR_BATCH_MAX && typeof showToast === 'function') {
        showToast('info', '一度に読み取れるのは最大' + RING_OCR_BATCH_MAX + '枚です。');
    }
    var strip = opts.thumbStrip || document.getElementById('ocrThumbStrip');
    ringRenderOcrThumbnails(strip, merged);
    var loadBtn = opts.loadBtn || document.getElementById('ocrLoadBtn');
    if (loadBtn) loadBtn.disabled = merged.length === 0;
    if (opts.discardNotice) opts.discardNotice.style.display = merged.length ? 'block' : 'none';
}

function ringInitOcrDocPicker(opts) {
    opts = opts || {};
    var docInput = opts.docInputId ? document.getElementById(opts.docInputId) : null;
    var loadBtn = opts.loadBtnId ? document.getElementById(opts.loadBtnId) : document.getElementById('ocrLoadBtn');
    var strip = opts.stripId ? document.getElementById(opts.stripId) : document.getElementById('ocrThumbStrip');
    if (!docInput) return;
    docInput.addEventListener('change', function (e) {
        var files = e.target.files;
        if (!files || !files.length) return;
        ringOcrEnqueueFiles(files, {
            thumbStrip: strip,
            loadBtn: loadBtn,
            discardNotice: opts.discardNotice ? document.getElementById(opts.discardNotice) : null
        });
        e.target.value = '';
    });
    if (strip) {
        strip.addEventListener('click', function (e) {
            var btn = e.target.closest('.ring-ocr-thumb__remove');
            if (!btn) return;
            var idx = parseInt(btn.getAttribute('data-idx'), 10);
            if (isNaN(idx)) return;
            var next = ringOcrQueueState.files.filter(function (_, i) { return i !== idx; });
            ringRenderOcrThumbnails(strip, next);
            if (loadBtn) loadBtn.disabled = next.length === 0;
        });
    }
    if (loadBtn) {
        loadBtn.addEventListener('click', async function () {
            if (!ringOcrQueueState.files.length) return;
            if (typeof ringHandleBatchDocumentScan !== 'function') return;
            await ringHandleBatchDocumentScan(Object.assign({}, opts.scanOpts || {}, {
                files: ringOcrQueueState.files.slice(),
                clearMemoryOpts: {
                    previewImg: opts.previewImg ? document.getElementById(opts.previewImg) : null,
                    previewArea: opts.previewArea ? document.getElementById(opts.previewArea) : null,
                    moreBadge: opts.moreBadge ? document.getElementById(opts.moreBadge) : null,
                    discardNotice: opts.discardNotice ? document.getElementById(opts.discardNotice) : null
                }
            }));
        });
    }
}

function ringOcrConfIsLow_(conf) {
    return conf === 'low' || conf === 'medium';
}

/** GAS が OCR 無効スタブを返したか */
function ringIsOcrDisabledResponse_(json) {
    return !!(json && String(json.error || '') === 'OCR_DISABLED');
}

function ringNotifyOcrDisabled_() {
    if (typeof showToast === 'function') {
        showToast('info', 'OCRは現在準備中です。手入力で続行してください。');
    }
}

function ringShowAuthErrorForOcr_(alreadyShown) {
    if (alreadyShown) return true;
    if (ringIsDemoGasOffline_()) return true;
    ringHandleAuthExpired_(ringGetActiveMode(), 'ocr_batch');
    return true;
}

function ringShortFileName(name) {
    var s = String(name || 'image');
    return s.length > 22 ? s.slice(0, 10) + '…' + s.slice(-8) : s;
}

function isPiiOrBillingMetaLine_(line) {
    var t = String(line || '').trim();
    if (!t) return true;
    if (/¥|円\s*$|合計|小計|税込|請求額|御請求|(?:\d{1,3}(?:,\d{3})+|\d{4,})\s*円/.test(t)) return true;
    if (/TEL|FAX|Tel|℡|電話/i.test(t)) return true;
    if (/\(?0\d{1,4}\)?[-‐－]?\d{1,4}[-‐－]?\d{3,4}/.test(t)) return true;
    if (/〒|都道府県|[都道府県]$|市区町村|丁目|番地|号室|住所|所在地|ビル|マンション/.test(t)) return true;
    if (/請求先|御中|連絡先|メール|@|E-mail|e-mail/i.test(t)) return true;
    if (/口座|振込|銀行|支店|普通預金|当座/.test(t)) return true;
    if (/お客様|顧客名|氏名|ご住所|様\s*$/.test(t) && t.length < 40) return true;
    return false;
}

function normalizePartName_(s) {
    var t = String(s || '').trim();
    if (!t) return '';
    t = t.replace(/^[\d\s.]+/, '').trim();
    if (/^E\/G\s*オイル|^EGオイル/i.test(t)) return 'エンジンオイル';
    if (/^LLC$/i.test(t)) return 'ロングライフクーラント';
    return t;
}

function mergeOCRResults(pageResults) {
    var merged = {
        vin: null, vinCandidates: [],
        mileage: null, shaken: null, model: null, engine: null, class: null, typeDesignation: null,
        parts: [],
        stats: { total: pageResults.length, successCount: 0, failCount: 0, failedFiles: [] }
    };
    var partKeys = {};
    var mileMax = -1;
    pageResults.forEach(function (pr) {
        var p = pr.parsed || {};
        var hasData = !!(p.vin || p.mileage || p.shaken || p.model || p.engine || p.class || p.typeDesignation ||
            (p.parts && p.parts.length));
        if (pr.ok || hasData) merged.stats.successCount++;
        else {
            merged.stats.failCount++;
            merged.stats.failedFiles.push(pr.fileName);
        }
        if (p.vin) {
            merged.vinCandidates.push(p.vin);
            if (!merged.vin) merged.vin = p.vin;
        }
        if (p.mileage && p.mileage.value != null) {
            var mv = Number(p.mileage.value);
            if (!isNaN(mv) && mv > mileMax) { mileMax = mv; merged.mileage = p.mileage; }
        }
        ['shaken', 'model', 'engine', 'class', 'typeDesignation'].forEach(function (k) {
            if (p[k] && !merged[k]) merged[k] = p[k];
        });
        (p.parts || []).forEach(function (pt) {
            var pk = normalizePartName_(pt.value).toLowerCase();
            if (!partKeys[pk]) { partKeys[pk] = true; merged.parts.push(pt); }
        });
    });
    if (merged.vinCandidates.length > 1) {
        var uniq = {};
        merged.vinCandidates = merged.vinCandidates.filter(function (v) {
            var k = v.value;
            if (uniq[k]) return false;
            uniq[k] = true;
            return true;
        });
    }
    return merged;
}

function ringMergedToFlatApply_(merged) {
    var flat = {};
    if (merged.vin) flat.vin = ringCorrectVinOcrMisread_(String(merged.vin.value).replace(/\s+/g, ''));
    if (merged.mileage) flat.mileage = String(merged.mileage.value);
    if (merged.shaken) flat.shaken = merged.shaken.value;
    if (merged.model) flat.model = merged.model.value;
    if (merged.engine) flat.engine = merged.engine.value;
    if (merged.class) flat.class = merged.class.value;
    if (merged.typeDesignation) flat.typeDesignation = merged.typeDesignation.value;
    if (merged.parts.length) flat.parts = merged.parts.map(function (p) { return p.value; }).join('\n');
    return flat;
}

async function analyzeDocumentSingle(file, fileIndex) {
    var fileName = file.name || ('image_' + (fileIndex + 1));
    if (ringIsOcrDemoMode_()) {
        await delay(700);
        var stubs = [
            { vin: 'ZVW50-5012847', shaken: '2026-12-15', mileage: '124000', parts: 'オイルエレメント', model: 'DBA-ZVW50', engine: '2ZR-FXE', class: '12001', typeDesignation: '17456' },
            { mileage: '124000', parts: 'ワイパーゴム\nエアフィルター' },
            { shaken: '2026-12-15', model: 'DBA-ZVW50' }
        ];
        var stub = stubs[fileIndex % stubs.length] || stubs[0];
        var parsed = { parts: [] };
        if (stub.vin) parsed.vin = { value: String(stub.vin).toUpperCase(), source: fileName };
        if (stub.mileage) parsed.mileage = { value: parseInt(stub.mileage, 10), source: fileName };
        if (stub.shaken) parsed.shaken = { value: stub.shaken, source: fileName };
        if (stub.model) parsed.model = { value: stub.model, source: fileName };
        if (stub.engine) parsed.engine = { value: stub.engine, source: fileName };
        if (stub.class) parsed.class = { value: stub.class, source: fileName };
        if (stub.typeDesignation) parsed.typeDesignation = { value: stub.typeDesignation, source: fileName };
        if (stub.parts) {
            stub.parts.split(/[\n,]/).forEach(function (p) {
                if (p.trim()) parsed.parts.push({ value: p.trim(), source: fileName });
            });
        }
        return { fileName: fileName, ok: true, partial: false, parsed: parsed };
    }
    try {
        var json = await ringOcrVinRequest_(file, fileName);
        if (ringIsOcrDisabledResponse_(json)) {
            if (fileIndex === 0) ringNotifyOcrDisabled_();
            return { fileName: fileName, ok: false, partial: false, parsed: { parts: [] }, ocrDisabled: true };
        }
        ringLogSystemEvent('OCR_FAIL', {
            error_message: (json && json.error) || 'NO_FIELDS',
            payload: { stage: 'batch_page', fileName: fileName }
        });
        return { fileName: fileName, ok: false, partial: false, parsed: { parts: [] } };
    } catch (e) {
        ringReportOcrAbort_('batch_page', e, {
            payload: { fileName: fileName },
            toast: /AUTH_/i.test(String(e && e.message ? e.message : e || '')) || fileIndex === 0
        });
        var msg = String(e && e.message ? e.message : e || '');
        return { fileName: fileName, ok: false, partial: false, parsed: { parts: [] }, authError: /AUTH_/i.test(msg) };
    }
}

function hideOcrBatchProgressOverlay() {
    hideOcrAnalyzingOverlay();
    var el = document.getElementById('ring-ocr-batch-overlay');
    if (el) el.remove();
    if (typeof window !== 'undefined') {
        window.__ringOcrRunning = false;
        window.removeEventListener('beforeunload', ringOcrBeforeUnload_);
    }
}

function ringOcrBeforeUnload_(e) {
    e.preventDefault();
    e.returnValue = '';
}

function updateOcrBatchProgressOverlay(state) {
    var sub = document.getElementById('ring-ocr-batch-sub');
    var bar = document.getElementById('ring-ocr-batch-bar');
    var queue = document.getElementById('ring-ocr-batch-queue');
    var failEl = document.getElementById('ring-ocr-batch-fail');
    if (sub) sub.textContent = (state.current || 0) + ' / ' + (state.total || 0) + ' 枚';
    if (bar && state.total) bar.style.width = Math.round(((state.current || 0) / state.total) * 100) + '%';
    if (failEl) failEl.textContent = '読み取りできなかった枚数: ' + (state.failCount || 0);
    if (queue && state.items) {
        queue.innerHTML = state.items.map(function (it) {
            var icon = it.status === 'done' ? '☑' : (it.status === 'processing' ? '🔄' : (it.status === 'fail' ? '✕' : '⏳'));
            var cls = 'ring-ocr-batch__qi ring-ocr-batch__qi--' + it.status;
            return '<div class="' + cls + '">' + icon + ' ' + escapeHtml(ringShortFileName(it.name)) + '</div>';
        }).join('');
    }
}

function showOcrBatchProgressOverlay(opts) {
    opts = opts || {};
    hideOcrBatchProgressOverlay();
    if (typeof window !== 'undefined') {
        window.__ringOcrCancelled = false;
        window.__ringOcrRunning = true;
        window.addEventListener('beforeunload', ringOcrBeforeUnload_);
    }
    var html = '<div class="ring-ocr-overlay show" id="ring-ocr-batch-overlay">' +
        '<div class="ring-ocr-overlay__title">OCR解析中</div>' +
        '<div class="ring-ocr-batch__count" id="ring-ocr-batch-sub">0 / 0 枚</div>' +
        '<div class="ring-ocr-batch__barwrap"><div class="ring-ocr-batch__bar" id="ring-ocr-batch-bar"></div></div>' +
        '<div class="ring-ocr-batch__fail" id="ring-ocr-batch-fail"></div>' +
        '<div class="ring-ocr-batch__queue" id="ring-ocr-batch-queue"></div>' +
        '<button type="button" class="ring-ocr-overlay__cancel" id="ring-ocr-batch-cancel">キャンセル（手入力へ）</button>' +
        '</div>';
    document.body.insertAdjacentHTML('beforeend', html);
    var cancelBtn = document.getElementById('ring-ocr-batch-cancel');
    if (cancelBtn) {
        cancelBtn.onclick = function () {
            if (typeof window !== 'undefined') window.__ringOcrCancelled = true;
            hideOcrBatchProgressOverlay();
        };
    }
    updateOcrBatchProgressOverlay(opts.state || { current: 0, total: opts.total || 0, failCount: 0, items: [] });
}

async function runBatchOcrPipeline(files, onProgress) {
    var failCount = 0;
    var authToastShown = false;
    var items = files.map(function (f) {
        return { name: f.name, status: 'processing' };
    });
    if (onProgress) onProgress({ current: 0, total: files.length, failCount: 0, items: items.slice() });
    var settled = 0;
    var promises = files.map(function (file, i) {
        return analyzeDocumentSingle(file, i).then(function (pr) {
            settled++;
            if (!pr.ok) failCount++;
            if (pr.authError) authToastShown = ringShowAuthErrorForOcr_(authToastShown);
            items[i].status = pr.ok ? 'done' : 'fail';
            if (onProgress) {
                onProgress({
                    current: settled,
                    total: files.length,
                    failCount: failCount,
                    items: items.slice(),
                    fileName: file.name
                });
            }
            return pr;
        });
    });
    var results = await Promise.all(promises);
    return { pageResults: results, failCount: failCount };
}

function showOcrBatchReviewModal(merged, opts) {
    opts = opts || {};
    var mode = opts.mode || 'factory';
    var id = 'ring-ocr-batch-review';
    var old = document.getElementById(id);
    if (old) old.remove();
    var flat = ringMergedToFlatApply_(merged);
    var vinCands = merged.vinCandidates || [];
    var vinRadio = '';
    if (vinCands.length > 1) {
        vinRadio = '<div class="ring-ocr-review__cands">' + vinCands.map(function (v, idx) {
            return '<label class="ring-ocr-review__rad"><input type="radio" name="ringVinPick" value="' + escapeHtml(v.value) + '"' +
                (idx === 0 ? ' checked' : '') + '> ' + escapeHtml(v.value) + ' <span class="ring-ocr-review__src">(' + escapeHtml(ringShortFileName(v.source)) + ')</span></label>';
        }).join('') + '</div>';
    }
    function confClass(conf) {
        return ringOcrConfIsLow_(conf) ? ' ring-ocr-review__input--low-conf' : '';
    }
    function fieldRow(key, label, type, val, source, conf) {
        var srcHint = source ? ('<span class="ring-ocr-review__src">' + escapeHtml(ringShortFileName(source)) + ' より</span>') : '<span class="ring-ocr-review__src ring-ocr-review__src--none">未検出</span>';
        var confHint = ringOcrConfIsLow_(conf) ? ' <span class="ring-ocr-review__conf">要確認</span>' : '';
        var inpType = type === 'date' ? 'date' : (type === 'number' ? 'number' : 'text');
        var tag = type === 'textarea' ? ('<textarea class="ring-ocr-review__input' + confClass(conf) + '" data-key="' + key + '" rows="3">' + escapeHtml(val || '') + '</textarea>') :
            ('<input class="ring-ocr-review__input' + confClass(conf) + '" data-key="' + key + '" type="' + inpType + '"' + ringVinInputExtraAttrs_(key) + ' value="' + escapeHtml(val || '') + '">');
        return '<div class="ring-ocr-review__row"><label class="ring-ocr-review__lbl">' + escapeHtml(label) + ' ' + srcHint + confHint + '</label>' + tag + '</div>';
    }
    function partsBlock() {
        var parts = merged.parts || [];
        if (!parts.length) {
            return fieldRow('parts', '交換部品', 'textarea', flat.parts, null, null);
        }
        var rows = parts.map(function (p, idx) {
            var qty = p.quantity ? (' ×' + escapeHtml(p.quantity)) : '';
            var cls = ringOcrConfIsLow_(p.confidence) ? ' ring-ocr-review__part--low-conf' : '';
            return '<div class="ring-ocr-review__part' + cls + '">' +
                '<input class="ring-ocr-review__part-input" data-part-idx="' + idx + '" value="' + escapeHtml(p.value || '') + '">' +
                qty +
                (ringOcrConfIsLow_(p.confidence) ? ' <span class="ring-ocr-review__conf">要確認</span>' : '') +
                '</div>';
        }).join('');
        return '<div class="ring-ocr-review__row"><label class="ring-ocr-review__lbl">交換部品 ' +
            (parts[0].source ? ('<span class="ring-ocr-review__src">' + escapeHtml(ringShortFileName(parts[0].source)) + ' より</span>') : '') +
            '</label><div class="ring-ocr-review__parts">' + rows + '</div>' +
            '<textarea class="ring-ocr-review__input" data-key="parts" rows="3" style="display:none">' + escapeHtml(flat.parts || '') + '</textarea></div>';
    }
    var body = '';
    var vinConf = merged.vin && merged.vin.confidence;
    body += '<div class="ring-ocr-review__row"><label class="ring-ocr-review__lbl">車台番号 (VIN)' +
        (ringOcrConfIsLow_(vinConf) ? ' <span class="ring-ocr-review__conf">要確認</span>' : '') + '</label>' + vinRadio +
        '<input class="ring-ocr-review__input' + confClass(vinConf) + '" data-key="vin" type="text"' + ringVinInputExtraAttrs_('vin') + ' value="' + escapeHtml(flat.vin || '') + '"></div>';
    if (mode === 'factory') {
        body += fieldRow('shaken', '車検満了日', 'date', flat.shaken, merged.shaken && merged.shaken.source, merged.shaken && merged.shaken.confidence);
        body += fieldRow('mileage', '走行距離 (km)', 'number', flat.mileage, merged.mileage && merged.mileage.source, merged.mileage && merged.mileage.confidence);
        body += partsBlock();
        body += '<div class="ring-ocr-review__section">車両詳細（任意）</div>';
        body += fieldRow('model', '型式', 'text', flat.model, merged.model && merged.model.source, merged.model && merged.model.confidence);
        body += fieldRow('engine', '原動機型式', 'text', flat.engine, merged.engine && merged.engine.source, merged.engine && merged.engine.confidence);
        body += fieldRow('class', '類別区分番号', 'text', flat.class, merged.class && merged.class.source, merged.class && merged.class.confidence);
        body += fieldRow('typeDesignation', '型式指定番号', 'text', flat.typeDesignation, merged.typeDesignation && merged.typeDesignation.source, merged.typeDesignation && merged.typeDesignation.confidence);
        body += fieldRow('memo', '整備メモ', 'textarea', '', null, null);
    } else {
        body += fieldRow('shaken', '車検満了日', 'date', flat.shaken, merged.shaken && merged.shaken.source, merged.shaken && merged.shaken.confidence);
        body += fieldRow('mileage', '走行距離 (km)', 'number', flat.mileage, merged.mileage && merged.mileage.source, merged.mileage && merged.mileage.confidence);
        body += fieldRow('memo', '作業メモ（部品候補）', 'textarea', flat.parts || '', merged.parts[0] && merged.parts[0].source, merged.parts.some(function (p) { return ringOcrConfIsLow_(p.confidence); }) ? 'low' : null);
    }
    var stats = merged.stats || {};
    var lead = '';
    if (stats.failCount > 0 && stats.successCount > 0) {
        lead = stats.total + '枚中' + stats.failCount + '枚を読み取れませんでした。読み取れた内容を確認のうえ、足りない項目は手入力してください。';
    } else if (stats.successCount === 0) {
        lead = '読み取りできなかったため手動入力へ切り替えました。';
    } else {
        lead = '読み取り結果を確認・修正してから反映してください。整備区分は保存前に手動で選択してください。保存はこの画面では行いません。';
    }
    var html = '<div class="ring-save-confirm" id="' + id + '">' +
        '<div class="ring-save-confirm__backdrop"></div>' +
        '<div class="ring-save-confirm__card ring-ocr-review__card">' +
        '<div class="ring-save-confirm__title">OCR確認</div>' +
        '<p class="ring-save-confirm__lead">' + escapeHtml(lead) + '</p>' +
        '<div class="ring-save-confirm__body ring-ocr-review__body">' + body + '</div>' +
        '<div class="ring-save-confirm__actions">' +
        '<button type="button" class="ring-save-confirm__btn ring-save-confirm__btn--secondary" data-act="cancel">キャンセル</button>' +
        '<button type="button" class="ring-save-confirm__btn ring-save-confirm__btn--primary" data-act="apply">内容を確認して反映</button>' +
        '</div></div></div>';
    document.body.insertAdjacentHTML('beforeend', html);
    var el = document.getElementById(id);
    var card = el.querySelector('.ring-save-confirm__card');
    function syncCardMaxHeight() {
        if (!card) return;
        var vv = window.visualViewport;
        var h = vv ? vv.height : window.innerHeight;
        card.style.maxHeight = Math.max(160, Math.min(h * 0.85, h - 48)) + 'px';
    }
    var detachVv = ringAttachVisualViewportCard(card, syncCardMaxHeight);
    function close() { detachVv(); if (el && el.parentNode) el.remove(); }
    function collectPayload() {
        var out = {};
        var partInputs = el.querySelectorAll('.ring-ocr-review__part-input');
        if (partInputs.length) {
            var partLines = [];
            partInputs.forEach(function (inp) {
                var v = inp.value.trim();
                if (v) partLines.push(v);
            });
            out.parts = partLines.join('\n');
        }
        el.querySelectorAll('.ring-ocr-review__input').forEach(function (inp) {
            var k = inp.getAttribute('data-key');
            if (k === 'parts' && partInputs.length) return;
            if (k) out[k] = inp.value.trim();
        });
        var vinPick = el.querySelector('input[name="ringVinPick"]:checked');
        if (vinPick) out.vin = vinPick.value.trim();
        else if (out.vin) out.vin = out.vin.toUpperCase();
        return out;
    }
    el.querySelector('[data-act="cancel"]').onclick = close;
    el.querySelector('.ring-save-confirm__backdrop').onclick = close;
    el.querySelector('[data-act="apply"]').onclick = function () {
        var payload = collectPayload();
        close();
        if (typeof window !== 'undefined') window.__ringOcrAppliedThisSession = true;
        resetOcrFailureCount();
        if (typeof opts.onApply === 'function') opts.onApply(payload);
    };
    if (stats.successCount === 0 && typeof opts.onApply === 'function') {
        /* 全失敗でも手入力へ — モーダルは閉じず lead のみ。ユーザーがキャンセル可 */
    }
}

function ringApplyOcrPayloadNonEmpty_(payload, applyFn) {
    var picked = {};
    Object.keys(payload || {}).forEach(function (k) {
        var v = payload[k];
        if (v != null && String(v).trim() !== '') picked[k] = v;
    });
    if (typeof applyFn === 'function') applyFn(picked);
}

/**
 * 整備明細 OCR 実行（スロット UI から base64 配列を受け取る）
 * @param {{ imagesBase64: string[], imageCount?: number }} opts
 * @returns {Promise<object|null>}
 */
async function ringHandleInvoiceOcrScan(opts) {
    opts = opts || {};
    var images = opts.imagesBase64 || [];
    if (!images.length) return null;

    if (ringIsOcrDemoMode_()) {
        await delay(900);
        if (typeof ringInvoiceNormalizeResult_ === 'function') {
            return ringInvoiceNormalizeResult_({
                vin: 'ZVW50-5012847',
                documentType: 'invoice',
                mileage: '124000',
                contentText: 'エンジンオイル交換\nエンジンオイル（5W-30） 4.5L\nオイルフィルター交換\nオイルフィルター 1個',
                works: ['エンジンオイル交換', 'オイルフィルター交換'],
                parts: [
                    { n: 'エンジンオイル', s: '5W-30', q: '4.5L' },
                    { n: 'オイルフィルター', s: '', q: '1個' }
                ]
            });
        }
        return {
            vin: 'ZVW50-5012847',
            documentType: 'invoice',
            mileage: '124000',
            contentText: 'エンジンオイル交換\nエンジンオイル（5W-30） 4.5L\nオイルフィルター交換\nオイルフィルター 1個',
            works: ['エンジンオイル交換', 'オイルフィルター交換'],
            parts: [
                { n: 'エンジンオイル', s: '5W-30', q: '4.5L' },
                { n: 'オイルフィルター', s: '', q: '1個' }
            ]
        };
    }

    showOcrAnalyzingOverlay({
        title: '明細書を解析中',
        messages: ['AIが作業内容・部品を読み取っています…']
    });
    try {
        if (typeof ringInvoiceOcrViaGas_ !== 'function') throw new Error('INVOICE_OCR_UNAVAILABLE');
        return await ringInvoiceOcrViaGas_(images);
    } finally {
        hideOcrAnalyzingOverlay();
    }
}

function ringInvoiceDocTypeLabel_(t) {
    var map = { estimate: '見積書', invoice: '請求書', delivery: '納品書', unknown: '不明' };
    return map[String(t || '').toLowerCase()] || String(t || '不明');
}

/** 整備明細 OCR: contentText 優先。なければ works/parts をブロック分けせず連結 */
function ringFormatInvoiceOcrUnifiedText_(raw) {
    if (!raw || typeof raw !== 'object') return '';
    var ct = String(raw.contentText != null ? raw.contentText : '').trim();
    if (ct) return ct.replace(/\n{3,}/g, '\n\n');
    var lines = [];
    var works = Array.isArray(raw.works) ? raw.works : [];
    var parts = Array.isArray(raw.parts) ? raw.parts : [];
    works.forEach(function (w) {
        var s = String(w || '').trim();
        if (s) lines.push(s);
    });
    parts.forEach(function (p) {
        if (!p || typeof p !== 'object') return;
        var n = String(p.n != null ? p.n : '').trim();
        if (!n) return;
        var spec = String(p.s != null ? p.s : '').trim();
        var qty = String(p.q != null ? p.q : '').trim();
        var line = n + (spec ? '（' + spec + '）' : '') + (qty ? ' ' + qty : '');
        lines.push(line);
    });
    return lines.join('\n');
}

/**
 * 整備明細 OCR 結果を factory_input へ反映（parts のみ。memo は干渉しない）
 */
function ringApplyInvoiceOcrToFormForFactory_(ocrResult) {
    var r = typeof ringInvoiceNormalizeResult_ === 'function'
        ? ringInvoiceNormalizeResult_(ocrResult)
        : (ocrResult || {});
    if (ocrResult && ocrResult.contentText != null && String(ocrResult.contentText).trim()) {
        r.contentText = String(ocrResult.contentText).trim();
    }
    var partsEl = document.getElementById('inParts');
    var contentText = ringFormatInvoiceOcrUnifiedText_(r);
    if (r.vin) {
        var vinEl = document.getElementById('inVin');
        if (vinEl && !vinEl.readOnly) vinEl.value = r.vin;
    }
    if (r.mileage) {
        var mi = document.getElementById('inMileage');
        if (mi) mi.value = r.mileage;
    }
    if (contentText && partsEl) {
        partsEl.value = contentText;
        ringAutoGrowTextareaSoon_(partsEl);
    }
    if (typeof lookupVehicle === 'function' && r.vin) lookupVehicle(r.vin);
    if (typeof window !== 'undefined') {
        window.__ringInvoiceOcrMeta = {
            documentType: r.documentType,
            works: Array.isArray(r.works) ? r.works.slice() : [],
            partsItems: Array.isArray(r.parts) ? r.parts.map(function (p) {
                return { n: p.n, s: p.s, q: p.q };
            }) : []
        };
        window.__ringOcrAppliedThisSession = true;
    }
    if (typeof ringInitAutoGrowTextareas === 'function') ringInitAutoGrowTextareas();
}

/**
 * 整備明細 OCR 結果の確認モーダル
 * @param {object} ocrResult
 * @param {{ onApply?: function, onCancel?: function }} opts
 */
function showInvoiceOcrReviewModal(ocrResult, opts) {
    opts = opts || {};
    var r = typeof ringInvoiceNormalizeResult_ === 'function'
        ? ringInvoiceNormalizeResult_(ocrResult)
        : (ocrResult || {});
    var id = 'ring-invoice-ocr-review';
    var old = document.getElementById(id);
    if (old) old.remove();

    var worksText = typeof ringFormatInvoiceOcrWorksText_ === 'function'
        ? ringFormatInvoiceOcrWorksText_(r.works)
        : (r.works || []).join('\n');
    var partsText = typeof ringFormatInvoiceOcrPartsText_ === 'function'
        ? ringFormatInvoiceOcrPartsText_(r.parts)
        : '';
    var unifiedText = typeof ringFormatInvoiceOcrUnifiedText_ === 'function'
        ? ringFormatInvoiceOcrUnifiedText_(Object.assign({}, r, { contentText: ocrResult && ocrResult.contentText }))
        : (worksText + (partsText ? '\n' + partsText : ''));

    function fieldRow(key, label, type, val) {
        var inpType = type === 'number' ? 'number' : 'text';
        var tag = type === 'textarea'
            ? ('<textarea class="ring-ocr-review__input ring-auto-grow" data-key="' + key + '" rows="4">' + escapeHtml(val || '') + '</textarea>')
            : ('<input class="ring-ocr-review__input" data-key="' + key + '" type="' + inpType + '"' + ringVinInputExtraAttrs_(key) + ' value="' + escapeHtml(val || '') + '">');
        return '<div class="ring-ocr-review__row"><label class="ring-ocr-review__lbl">' + escapeHtml(label) + '</label>' + tag + '</div>';
    }

    var body = '';
    body += fieldRow('vin', '車台番号 (VIN)', 'text', r.vin || '');
    body += fieldRow('mileage', '走行距離 (km)', 'number', r.mileage || '');
    body += '<div class="ring-ocr-review__row"><label class="ring-ocr-review__lbl">書類種別</label>' +
        '<div class="ring-ocr-review__input" style="background:#f8fafc;border:none;padding:8px 0;">' +
        escapeHtml(ringInvoiceDocTypeLabel_(r.documentType)) + ' (' + escapeHtml(r.documentType || 'unknown') + ')' +
        '</div></div>';
    body += fieldRow('partsContent', '作業内容・交換部品', 'textarea', unifiedText);

    var html = '<div class="ring-save-confirm" id="' + id + '">' +
        '<div class="ring-save-confirm__backdrop"></div>' +
        '<div class="ring-save-confirm__card ring-ocr-review__card">' +
        '<div class="ring-save-confirm__title">OCR確認</div>' +
        '<p class="ring-save-confirm__lead">読み取り結果を確認・修正してから反映してください。整備区分は保存前に手動で選択してください。</p>' +
        '<div class="ring-save-confirm__body ring-ocr-review__body">' + body + '</div>' +
        '<div class="ring-save-confirm__actions">' +
        '<button type="button" class="ring-save-confirm__btn ring-save-confirm__btn--secondary" data-act="cancel">キャンセル</button>' +
        '<button type="button" class="ring-save-confirm__btn ring-save-confirm__btn--primary" data-act="apply">内容を確認して反映</button>' +
        '</div></div></div>';
    document.body.insertAdjacentHTML('beforeend', html);

    var el = document.getElementById(id);
    var card = el.querySelector('.ring-save-confirm__card');
    function syncCardMaxHeight() {
        if (!card) return;
        card.style.maxHeight = 'min(85dvh, calc(100dvh - 48px))';
    }
    var detachVv = ringAttachVisualViewportCard(card, syncCardMaxHeight);

    function close() {
        detachVv();
        if (el && el.parentNode) el.remove();
    }

    function collectPayload() {
        var out = {
            documentType: r.documentType,
            contentText: '',
            works: r.works.slice(),
            parts: r.parts.map(function (p) { return { n: p.n, s: p.s, q: p.q }; })
        };
        el.querySelectorAll('.ring-ocr-review__input').forEach(function (inp) {
            var k = inp.getAttribute('data-key');
            if (!k) return;
            if (k === 'vin') out.vin = inp.value.trim().toUpperCase();
            else if (k === 'mileage') out.mileage = inp.value.trim().replace(/[^\d]/g, '');
            else if (k === 'partsContent') {
                out.contentText = inp.value.trim();
            }
        });
        return out;
    }

    el.querySelector('[data-act="cancel"]').onclick = function () {
        close();
        if (typeof opts.onCancel === 'function') opts.onCancel();
    };
    el.querySelector('.ring-save-confirm__backdrop').onclick = function () {
        close();
        if (typeof opts.onCancel === 'function') opts.onCancel();
    };
    el.querySelector('[data-act="apply"]').onclick = function () {
        var payload = collectPayload();
        close();
        if (typeof resetOcrFailureCount === 'function') resetOcrFailureCount();
        if (typeof ringApplyInvoiceOcrToFormForFactory_ === 'function') {
            ringApplyInvoiceOcrToFormForFactory_(payload);
        }
        if (typeof opts.onApply === 'function') opts.onApply(payload);
    };

    if (typeof ringInitAutoGrowTextareas === 'function') ringInitAutoGrowTextareas(el);
    if (typeof ringInitIosTextareaKeyboardFix_ === 'function') ringInitIosTextareaKeyboardFix_(el);
}

function ringGetPreSaveLeadText() {
    if (typeof window !== 'undefined' && window.__ringOcrAppliedThisSession) {
        return 'OCRで読み取った内容を含みます。氏名・住所・電話番号・金額など個人情報や請求書情報が混ざっていないか、登録前にもう一度ご確認ください。';
    }
    return '個人情報・金額など誤りがないかご確認ください。問題なければ登録してください。';
}

function ringScanFormFieldsForPii_(fieldIds) {
    var hits = [];
    (fieldIds || []).forEach(function (fid) {
        var el = document.getElementById(fid);
        if (!el) return;
        String(el.value || '').split(/[\n\r]+/).forEach(function (line) {
            if (isPiiOrBillingMetaLine_(line)) hits.push({ field: fid, line: line.slice(0, 60) });
        });
    });
    return hits;
}

function ringBuildPiiWarningHtml_(fieldIds) {
    var hits = ringScanFormFieldsForPii_(fieldIds);
    if (!hits.length) return '';
    return '⚠ 個人情報の可能性がある文字列が含まれています。削除または修正してください。';
}

async function ringHandleBatchDocumentScan(opts) {
    opts = opts || {};
    var files = Array.from(opts.files || []).slice(0, RING_OCR_BATCH_MAX);
    if (!files.length) return;
    if (files.length < (opts.files || []).length && typeof showToast === 'function') {
        showToast('info', '一度に読み取れるのは最大' + RING_OCR_BATCH_MAX + '枚です。');
    }
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        if (typeof showToast === 'function') showToast('warning', 'オフラインのため読み取れません。手入力で続行してください。');
        return;
    }
    if (!ringIsOcrDemoMode_()) {
        try {
            await ringEnsureAuthForOcr();
        } catch (e) {
            ringReportOcrAbort_('batch_auth_preflight', e, { payload: { mode: opts.mode || 'factory' } });
            return;
        }
    }
    var saveBtn = opts.saveBtnId ? document.getElementById(opts.saveBtnId) : null;
    if (saveBtn) saveBtn.disabled = true;
    var previewUrl = '';
    try {
        previewUrl = await new Promise(function (resolve, reject) {
            var r = new FileReader();
            r.onload = function () { resolve(String(r.result || '')); };
            r.onerror = reject;
            r.readAsDataURL(files[0]);
        });
    } catch (e) { /* ignore */ }
    if (opts.previewImg && previewUrl) {
        opts.previewImg.src = previewUrl;
        if (opts.previewArea) opts.previewArea.style.display = 'block';
    }
    if (opts.discardNotice) opts.discardNotice.style.display = 'block';
    if (opts.moreBadge) {
        opts.moreBadge.textContent = files.length > 1 ? ('他 ' + (files.length - 1) + ' 枚') : '';
        opts.moreBadge.style.display = files.length > 1 ? 'inline-block' : 'none';
    }
    var queueItems = files.map(function (f, i) {
        return { name: f.name, status: i === 0 ? 'processing' : 'waiting' };
    });
    showOcrBatchProgressOverlay({ total: files.length, state: { current: 0, total: files.length, failCount: 0, items: queueItems } });
    var batchResult;
    try {
        batchResult = await runBatchOcrPipeline(files, function (st) {
            updateOcrBatchProgressOverlay(st);
        });
    } catch (e) {
        ringReportOcrAbort_('batch_pipeline', e, { payload: { fileCount: files.length } });
        hideOcrBatchProgressOverlay();
        if (saveBtn) saveBtn.disabled = false;
        return;
    } finally {
        hideOcrBatchProgressOverlay();
        if (saveBtn) saveBtn.disabled = false;
    }
    if (!batchResult || !batchResult.pageResults) return;
    if (wasOcrAnalyzingCancelled()) return;
    var merged = mergeOCRResults(batchResult.pageResults);
    if (!merged.stats.successCount) return;
    showOcrBatchReviewModal(merged, {
        mode: opts.mode || 'factory',
        onApply: function (payload) {
            ringApplyOcrPayloadNonEmpty_(payload, opts.onApply);
            ringClearOcrImageMemory(opts.clearMemoryOpts || {});
            if (typeof showToast === 'function' && merged.stats.successCount > 0) {
                showToast('success', '読み取り内容を入力欄に反映しました。整備区分を選択してから登録してください。');
            }
            ringInitAutoGrowTextareas();
        }
    });
}

/**
 * 書類・車検証画像の OCR（C-05）。本番は GAS ocr_vin + Vision API。
 * デモ stub は ringIsOcrDemoMode_() のときのみ。
 * @param {File[]} files
 * @returns {Promise<null|{vin?: string, shaken?: string, mileage?: string, workTitle?: string, parts?: string, model?: string, engine?: string, class?: string, typeDesignation?: string}>}
 */
async function analyzeDocument(files, opts) {
    opts = opts || {};
    if (!files || !files[0]) return null;
    if (ringIsOcrDemoMode_()) {
        await delay(900);
        return {
            vin: 'ZVW50-5012847',
            vehicleName: 'トヨタ プリウス',
            shaken: '2026-12-15',
            firstRegistration: '2020-03',
            mileage: '',
            parts: '',
            model: 'DBA-ZVW50',
            engine: '2ZR-FXE',
            class: '12001',
            typeDesignation: '17456'
        };
    }
    try {
        var json = await ringOcrVinRequest_(files[0], files[0].name || 'image', opts);
        if (ringIsOcrDisabledResponse_(json)) {
            ringNotifyOcrDisabled_();
            return null;
        }
        ringLogSystemEvent('OCR_FAIL', {
            error_message: (json && json.error) || 'NO_FIELDS',
            payload: { stage: 'ocr_vin_response' }
        });
        return null;
    } catch (e) {
        ringReportOcrAbort_('ocr_vin_request', e, {
            payload: { fileName: files[0].name || 'image' },
            toast: true
        });
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

    if (path.includes('login.html') || path.includes('user_login.html') || path.includes('user_line_callback.html') || path.includes('register.html') || path.includes('biz_register.html') || path.includes('forgot_password.html') || path.includes('reset_password.html') || path.endsWith('/') || path.endsWith('index.html')) {
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

    var userSlotForAdmin = ringReadAuthSlot('user');
    var adminSwitchItem = ringIsAdminProfile(userSlotForAdmin && userSlotForAdmin.profile)
        ? '<li><a href="#" onclick="ringSwitchToAdminDashboard(); return false;">🛡 管理者ダッシュボード</a></li>'
        : '';

    const accountSwitchHtml = `
        <div class="settings-group">
          <div class="settings-group-title">アカウント切替</div>
          <ul class="settings-list">
            <li><a href="#" onclick="ringSwitchAccountAndNavigate('user'); return false;">👤 一般ユーザー</a></li>
            <li><a href="#" onclick="ringSwitchAccountAndNavigate('shop'); return false;">🏭 工場 / 販売店</a></li>
            <li><a href="#" onclick="ringSwitchAccountAndNavigate('business'); return false;">🏢 その他事業者</a></li>
            ${adminSwitchItem}
          </ul>
        </div>`;

    let menuBodyHtml = "";
    let tabsHtml = "";
    let panelsHtml = "";

    if (isUserMode) {
        menuBodyHtml = `<div class="ring-line-promo-slot ring-line-promo-slot--top" data-ring-line-promo></div>` + accountSwitchHtml + `
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
        menuBodyHtml = `<div class="ring-line-promo-slot ring-line-promo-slot--top" data-ring-line-promo></div>` + accountSwitchHtml + `
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

    ringInitLinePromoSlots();
}
window.addEventListener('DOMContentLoaded', createGlobalUI);
window.addEventListener('DOMContentLoaded', function () {
    ringDeferAfterPaint_(ringInitLinePromoSlots);
});
window.addEventListener('DOMContentLoaded', function () {
    if (document.getElementById('inFirstReg') && document.getElementById('firstRegEraYear')) {
        ringInitFirstRegWareki_('inFirstReg');
    }
});

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
 * VIN入力欄の表示用フォーマット（半角化・大文字化。ハイフンは保持）
 * IME入力中は呼ばず、blur / 送信時のみ使用すること。
 */
function ringFormatVinDisplayValue_(raw) {
    if (raw == null) return '';
    return String(raw)
        .replace(/[Ａ-Ｚａ-ｚ０-９]/g, s => String.fromCharCode(s.charCodeAt(0) - 0xFEE0))
        .toUpperCase();
}

/** VIN入力欄の value を安全にフォーマット（readOnly/disabled は触らない） */
function ringApplyVinInputFormat_(input) {
    if (!input || input.readOnly || input.disabled) return;
    const formatted = ringFormatVinDisplayValue_(input.value);
    if (input.value !== formatted) input.value = formatted;
}

function ringIsVinInputEl_(el) {
    if (!el || el.tagName !== 'INPUT' || el.type === 'hidden') return false;
    if (el.readOnly || el.disabled) return false;
    const id = String(el.id || '');
    if (id === 'inVin' || id === 'vinInput') return true;
    if (el.getAttribute('data-vin-input') === 'true') return true;
    if (el.getAttribute('data-key') === 'vin') return true;
    return false;
}

/** スマホ向け属性・見た目のみの大文字CSSを付与 */
function ringInitVinInputAttrs_(input) {
    if (!input || input.tagName !== 'INPUT') return;
    input.type = 'text';
    input.setAttribute('inputmode', 'text');
    input.setAttribute('autocapitalize', 'characters');
    if (!input.getAttribute('autocomplete')) input.setAttribute('autocomplete', 'off');
    input.style.fontFamily = '"Helvetica Neue", "SF Mono", monospace';
    input.style.letterSpacing = '0.06em';
    input.style.textTransform = 'uppercase';
}

function ringVinInputExtraAttrs_(key) {
    return key === 'vin'
        ? ' inputmode="text" autocapitalize="characters" style="text-transform:uppercase;"'
        : '';
}

window.ringFormatVinDisplayValue_ = ringFormatVinDisplayValue_;
window.ringApplyVinInputFormat_ = ringApplyVinInputFormat_;
window.ringInitVinInputAttrs_ = ringInitVinInputAttrs_;

document.addEventListener('blur', function (e) {
    if (ringIsVinInputEl_(e.target)) ringApplyVinInputFormat_(e.target);
}, true);

window.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('#inVin, #vinInput, input[data-vin-input="true"], input[data-key="vin"]').forEach(ringInitVinInputAttrs_);
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
 * 設定メニュー配下のサポート・法務ページから戻る（履歴優先・セッション維持）
 */
function ringBackFromSupportPage() {
    if (typeof history !== 'undefined' && history.length > 1) {
        history.back();
        return;
    }
    var profile = typeof getCurrentProfile === 'function' ? getCurrentProfile() : null;
    if (profile && typeof ringGetHomeForProfile === 'function') {
        location.href = ringGetHomeForProfile(profile);
        return;
    }
    if (typeof ringGoToTopMenu === 'function') ringGoToTopMenu();
}

/**
 * 戻る処理。第1引数に URL を渡した場合は replace で遷移（履歴への push を避ける）。
 * 未指定のときだけ history.back() を試す。
 */
function goBackSmart(fallbackUrl) {
    if (fallbackUrl) {
        if (typeof ringIsIndexTopUrl_ === 'function' && ringIsIndexTopUrl_(fallbackUrl)) {
            ringGoToTopMenu();
            return;
        }
        window.location.replace(fallbackUrl);
        return;
    }
    if (history.length > 1) {
        history.back();
    } else {
        ringGoToTopMenu();
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
window.addEventListener('DOMContentLoaded', function () {
    if (typeof ringInitSystemMonitoring === 'function') ringInitSystemMonitoring();
});

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

/**
 * 作業日（#inDate type="date"）の選択可能範囲: 過去14日〜本日（JST ローカル日付）
 * @returns {{ min: string, max: string, today: string }}
 */
function ringGetWorkDateBounds_() {
    var today = new Date();
    var offset = today.getTimezoneOffset() * 60000;
    var localToday = new Date(today.getTime() - offset);
    var todayStr = localToday.toISOString().split('T')[0];
    var limitDate = new Date(localToday.getTime());
    limitDate.setDate(limitDate.getDate() - 14);
    var minStr = limitDate.toISOString().split('T')[0];
    return { min: minStr, max: todayStr, today: todayStr };
}

/** 作業日入力のみ対象（#inShaken / #inExpiry / hidden #inDate は除外） */
function ringIsWorkDateInput_(el) {
    return !!(
        el &&
        el instanceof HTMLInputElement &&
        el.id === 'inDate' &&
        el.type === 'date'
    );
}

/** 第1防衛: ピッカー表示直前に min/max を動的付与 */
function ringApplyWorkDateBounds_(el) {
    if (!ringIsWorkDateInput_(el)) return;
    var bounds = ringGetWorkDateBounds_();
    el.setAttribute('min', bounds.min);
    el.setAttribute('max', bounds.max);
}

/** 第2防衛: 範囲外の選択を本日にクランプ */
function ringClampWorkDateInput_(el) {
    if (!ringIsWorkDateInput_(el)) return;
    var val = el.value;
    if (!val) return;
    var bounds = ringGetWorkDateBounds_();
    if (val >= bounds.min && val <= bounds.max) return;
    alert('作業日は本日か、過去14日以内のみ選択可能です。');
    el.value = bounds.today;
}

/** document 委譲による作業日カレンダーロック（iOS ネイティブ date 対策） */
function ringInitWorkDateCalendarLock_() {
    if (typeof document === 'undefined' || typeof window === 'undefined') return;
    if (window.__ringWorkDateLockInit) return;
    window.__ringWorkDateLockInit = true;

    document.addEventListener('focusin', function (e) {
        try {
            if (ringIsWorkDateInput_(e.target)) ringApplyWorkDateBounds_(e.target);
        } catch (_) {}
    });

    document.addEventListener('click', function (e) {
        try {
            if (ringIsWorkDateInput_(e.target)) ringApplyWorkDateBounds_(e.target);
        } catch (_) {}
    });

    document.addEventListener('change', function (e) {
        try {
            if (ringIsWorkDateInput_(e.target)) ringClampWorkDateInput_(e.target);
        } catch (_) {}
    });
}

ringInitWorkDateCalendarLock_();

if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', function () {
        ringInitAutoGrowTextareas();
        var titleSel = document.getElementById('inTitle');
        if (titleSel && titleSel.tagName === 'SELECT' && !titleSel.options.length) {
            ringInitWorkTitleSelect(titleSel);
        }
        if (titleSel && titleSel.tagName === 'SELECT') {
            titleSel.addEventListener('change', function () {
                ringValidateWorkTitleSelect(titleSel);
                ringSyncShakenExpiryBlock_();
            });
        }
        if (document.getElementById('shakenExpiryBlock')) {
            ringSyncShakenExpiryBlock_();
        }
    });
}