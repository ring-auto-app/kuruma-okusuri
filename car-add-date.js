/**
 * car_add.html 専用：元号分離型日付UI ↔ 西暦 hidden 同期
 * inFirstReg (YYYY-MM) / inExpiry (YYYY-MM-DD) は GAS 送信互換のため維持
 */
(function (global) {
    'use strict';

    var RING_CAR_ADD_FIRST_REG_ERAS = ['昭和', '平成', '令和'];
    var RING_CAR_ADD_EXPIRY_ERAS = ['令和'];

    var RING_CAR_ADD_DATE_FIELD_IDS = {
        firstReg: {
            hidden: 'inFirstReg',
            era: 'firstRegEra',
            year: 'firstRegYear',
            month: 'firstRegMonth',
            preview: 'firstRegSeirekiPreview'
        },
        expiry: {
            hidden: 'inExpiry',
            era: 'expiryEra',
            year: 'expiryYear',
            month: 'expiryMonth',
            day: 'expiryDay',
            preview: 'expirySeirekiPreview',
            jibaisekiAlert: 'expiryJibaisekiAlert'
        }
    };

    var RING_ERA_WESTERN_YEAR_ONE = {
        '昭和': 1926,
        '平成': 1989,
        '令和': 2019
    };

    var RING_JAPANESE_ERA_FMT = new Intl.DateTimeFormat('ja-JP-u-ca-japanese', {
        era: 'long',
        year: 'numeric',
        month: 'numeric',
        day: 'numeric'
    });

    function ringCarAddNormalizeEraName_(era) {
        return String(era || '').replace(/\s+/g, '').replace(/時代/g, '');
    }

    function ringCarAddGetEl_(id) {
        return id ? document.getElementById(id) : null;
    }

    function ringCarAddEraPartsFromDate_(date) {
        if (!date || isNaN(date.getTime())) return null;
        var parts = { era: '', year: '', month: '', day: '' };
        RING_JAPANESE_ERA_FMT.formatToParts(date).forEach(function (p) {
            if (p.type === 'era') parts.era = ringCarAddNormalizeEraName_(p.value);
            if (p.type === 'year') parts.year = p.value;
            if (p.type === 'month') parts.month = p.value;
            if (p.type === 'day') parts.day = p.value;
        });
        return parts;
    }

    function ringCarAddWesternFromEraParts_(era, year, month, day, requireDay) {
        era = ringCarAddNormalizeEraName_(era);
        var ey = parseInt(year, 10);
        var mo = parseInt(month, 10);
        var dy = parseInt(day, 10);
        var base = RING_ERA_WESTERN_YEAR_ONE[era];
        if (!base || isNaN(ey) || ey < 1 || isNaN(mo) || mo < 1 || mo > 12) return null;
        if (requireDay && (isNaN(dy) || dy < 1 || dy > 31)) return null;
        if (!requireDay) dy = 1;

        var wy = base + ey - 1;
        var date = new Date(wy, mo - 1, dy);
        if (isNaN(date.getTime())) return null;

        var back = ringCarAddEraPartsFromDate_(date);
        if (!back || ringCarAddNormalizeEraName_(back.era) !== era) return null;
        if (parseInt(back.year, 10) !== ey) return null;
        if (parseInt(back.month, 10) !== mo) return null;
        if (requireDay && parseInt(back.day, 10) !== dy) return null;
        return date;
    }

    function ringCarAddPad2_(n) {
        return String(n).padStart(2, '0');
    }

    function ringCarAddFormatSeirekiPreview_(date, withDay) {
        if (!date || isNaN(date.getTime())) return '';
        var y = date.getFullYear();
        var m = ringCarAddPad2_(date.getMonth() + 1);
        if (!withDay) return '└ 西暦：' + y + '年' + m + '月';
        var d = ringCarAddPad2_(date.getDate());
        return '└ 西暦：' + y + '年' + m + '月' + d + '日';
    }

    function ringCarAddSetHiddenValue_(hiddenEl, value) {
        if (!hiddenEl) return;
        hiddenEl.value = value || '';
        hiddenEl.dispatchEvent(new Event('change', { bubbles: true }));
    }

    function ringCarAddSyncFirstRegHidden_() {
        var ids = RING_CAR_ADD_DATE_FIELD_IDS.firstReg;
        var hidden = ringCarAddGetEl_(ids.hidden);
        var eraEl = ringCarAddGetEl_(ids.era);
        var yearEl = ringCarAddGetEl_(ids.year);
        var monthEl = ringCarAddGetEl_(ids.month);
        if (!hidden || !eraEl || !yearEl || !monthEl) return;

        var era = eraEl.value;
        var year = yearEl.value;
        var month = monthEl.value;
        if (!era || year === '' || month === '') {
            ringCarAddSetHiddenValue_(hidden, '');
            ringCarAddUpdateFirstRegPreview_();
            return;
        }

        var date = ringCarAddWesternFromEraParts_(era, year, month, 1, false);
        if (!date) {
            ringCarAddSetHiddenValue_(hidden, '');
            ringCarAddUpdateFirstRegPreview_();
            return;
        }

        ringCarAddSetHiddenValue_(hidden, date.getFullYear() + '-' + ringCarAddPad2_(date.getMonth() + 1));
        ringCarAddUpdateFirstRegPreview_();
    }

    function ringCarAddSyncExpiryHidden_() {
        var ids = RING_CAR_ADD_DATE_FIELD_IDS.expiry;
        var hidden = ringCarAddGetEl_(ids.hidden);
        var eraEl = ringCarAddGetEl_(ids.era);
        var yearEl = ringCarAddGetEl_(ids.year);
        var monthEl = ringCarAddGetEl_(ids.month);
        var dayEl = ringCarAddGetEl_(ids.day);
        if (!hidden || !eraEl || !yearEl || !monthEl || !dayEl) return;

        var era = eraEl.value;
        var year = yearEl.value;
        var month = monthEl.value;
        var day = dayEl.value;
        if (!era || year === '' || month === '' || day === '') {
            ringCarAddSetHiddenValue_(hidden, '');
            ringCarAddUpdateExpiryPreview_();
            return;
        }

        var date = ringCarAddWesternFromEraParts_(era, year, month, day, true);
        if (!date) {
            ringCarAddSetHiddenValue_(hidden, '');
            ringCarAddUpdateExpiryPreview_();
            return;
        }

        ringCarAddSetHiddenValue_(
            hidden,
            date.getFullYear() + '-' + ringCarAddPad2_(date.getMonth() + 1) + '-' + ringCarAddPad2_(date.getDate())
        );
        ringCarAddUpdateExpiryPreview_();
    }

    function ringCarAddSyncAllDateHidden_() {
        ringCarAddSyncFirstRegHidden_();
        ringCarAddSyncExpiryHidden_();
    }

    function ringCarAddUpdateFirstRegPreview_() {
        var ids = RING_CAR_ADD_DATE_FIELD_IDS.firstReg;
        var preview = ringCarAddGetEl_(ids.preview);
        var hidden = ringCarAddGetEl_(ids.hidden);
        if (!preview) return;
        var iso = hidden ? String(hidden.value || '').trim() : '';
        var m = iso.match(/^(\d{4})-(\d{2})$/);
        if (!m) {
            preview.textContent = '';
            return;
        }
        var date = new Date(parseInt(m[1], 10), parseInt(m[2], 10) - 1, 1);
        preview.textContent = ringCarAddFormatSeirekiPreview_(date, false);
    }

    function ringCarAddUpdateExpiryPreview_() {
        var ids = RING_CAR_ADD_DATE_FIELD_IDS.expiry;
        var preview = ringCarAddGetEl_(ids.preview);
        var hidden = ringCarAddGetEl_(ids.hidden);
        if (!preview) return;
        var iso = hidden ? String(hidden.value || '').trim() : '';
        var m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (!m) {
            preview.textContent = '';
            return;
        }
        var date = new Date(parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10));
        preview.textContent = ringCarAddFormatSeirekiPreview_(date, true);
    }

    function ringCarAddFillEraParts_(cfg, parts, allowedEras) {
        var eraEl = ringCarAddGetEl_(cfg.era);
        var yearEl = ringCarAddGetEl_(cfg.year);
        var monthEl = ringCarAddGetEl_(cfg.month);
        var dayEl = cfg.day ? ringCarAddGetEl_(cfg.day) : null;
        if (!parts || !eraEl || !yearEl || !monthEl) return false;

        var era = ringCarAddNormalizeEraName_(parts.era);
        eraEl.value = allowedEras.indexOf(era) >= 0 ? era : '';
        yearEl.value = parts.year || '';
        monthEl.value = parts.month || '';
        if (dayEl) dayEl.value = parts.day || '';
        return true;
    }

    /** @param {string} iso YYYY-MM */
    function ringCarAddSetFirstRegFromIso(iso) {
        if (!iso || !/^\d{4}-\d{2}$/.test(String(iso).trim())) return;
        var m = String(iso).trim().match(/^(\d{4})-(\d{2})$/);
        var date = new Date(parseInt(m[1], 10), parseInt(m[2], 10) - 1, 1);
        var parts = ringCarAddEraPartsFromDate_(date);
        if (!parts) return;
        ringCarAddFillEraParts_(RING_CAR_ADD_DATE_FIELD_IDS.firstReg, parts, RING_CAR_ADD_FIRST_REG_ERAS);
        ringCarAddSyncFirstRegHidden_();
    }

    /** @param {string} iso YYYY-MM-DD */
    function ringCarAddSetExpiryFromIso(iso) {
        if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(String(iso).trim())) return;
        var m = String(iso).trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
        var date = new Date(parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10));
        var parts = ringCarAddEraPartsFromDate_(date);
        if (!parts) return;

        var ids = RING_CAR_ADD_DATE_FIELD_IDS.expiry;
        ringCarAddSetHiddenValue_(ringCarAddGetEl_(ids.hidden), String(iso).trim());

        if (RING_CAR_ADD_EXPIRY_ERAS.indexOf(ringCarAddNormalizeEraName_(parts.era)) >= 0) {
            ringCarAddFillEraParts_(ids, parts, RING_CAR_ADD_EXPIRY_ERAS);
        } else {
            var eraEl = ringCarAddGetEl_(ids.era);
            var yearEl = ringCarAddGetEl_(ids.year);
            var monthEl = ringCarAddGetEl_(ids.month);
            var dayEl = ringCarAddGetEl_(ids.day);
            if (eraEl) eraEl.value = '';
            if (yearEl) yearEl.value = '';
            if (monthEl) monthEl.value = '';
            if (dayEl) dayEl.value = '';
        }
        ringCarAddUpdateExpiryPreview_();
    }

    function ringCarAddBindPartInput_(el, syncFn) {
        if (!el || el.dataset.carAddDateBound === '1') return;
        el.addEventListener('input', syncFn);
        el.addEventListener('change', syncFn);
        el.dataset.carAddDateBound = '1';
    }

    function ringCarAddUpdateJibaisekiAlert_() {
        var alertEl = ringCarAddGetEl_(RING_CAR_ADD_DATE_FIELD_IDS.expiry.jibaisekiAlert);
        var bodyShape = ringCarAddGetEl_('inBodyShape');
        if (!alertEl) return;
        var v = bodyShape ? bodyShape.value : '';
        alertEl.style.display = (v === 'オートバイ' || v === '二輪') ? 'block' : 'none';
    }

    function ringCarAddMarkDateFieldsError_(group, on) {
        var cfg = RING_CAR_ADD_DATE_FIELD_IDS[group];
        if (!cfg) return;
        [cfg.era, cfg.year, cfg.month, cfg.day].forEach(function (id) {
            var el = ringCarAddGetEl_(id);
            if (!el) return;
            if (on) el.classList.add('error-field');
            else el.classList.remove('error-field');
        });
    }

    function ringCarAddInitDateFields() {
        var fr = RING_CAR_ADD_DATE_FIELD_IDS.firstReg;
        var ex = RING_CAR_ADD_DATE_FIELD_IDS.expiry;

        ringCarAddBindPartInput_(ringCarAddGetEl_(fr.era), ringCarAddSyncFirstRegHidden_);
        ringCarAddBindPartInput_(ringCarAddGetEl_(fr.year), ringCarAddSyncFirstRegHidden_);
        ringCarAddBindPartInput_(ringCarAddGetEl_(fr.month), ringCarAddSyncFirstRegHidden_);

        ringCarAddBindPartInput_(ringCarAddGetEl_(ex.era), function () {
            ringCarAddSyncExpiryHidden_();
            if (typeof global.updateSchedule === 'function') global.updateSchedule();
        });
        ringCarAddBindPartInput_(ringCarAddGetEl_(ex.year), function () {
            ringCarAddSyncExpiryHidden_();
            if (typeof global.updateSchedule === 'function') global.updateSchedule();
        });
        ringCarAddBindPartInput_(ringCarAddGetEl_(ex.month), function () {
            ringCarAddSyncExpiryHidden_();
            if (typeof global.updateSchedule === 'function') global.updateSchedule();
        });
        ringCarAddBindPartInput_(ringCarAddGetEl_(ex.day), function () {
            ringCarAddSyncExpiryHidden_();
            if (typeof global.updateSchedule === 'function') global.updateSchedule();
        });

        var bodyShape = ringCarAddGetEl_('inBodyShape');
        if (bodyShape && bodyShape.dataset.jibaisekiBound !== '1') {
            bodyShape.addEventListener('change', ringCarAddUpdateJibaisekiAlert_);
            bodyShape.dataset.jibaisekiBound = '1';
        }

        ringCarAddSyncAllDateHidden_();
        ringCarAddUpdateJibaisekiAlert_();
    }

    global.RING_CAR_ADD_DATE_FIELD_IDS = RING_CAR_ADD_DATE_FIELD_IDS;
    global.ringCarAddInitDateFields = ringCarAddInitDateFields;
    global.ringCarAddSetFirstRegFromIso = ringCarAddSetFirstRegFromIso;
    global.ringCarAddSetExpiryFromIso = ringCarAddSetExpiryFromIso;
    global.ringCarAddSyncAllDateHidden = ringCarAddSyncAllDateHidden_;
    global.ringCarAddUpdateJibaisekiAlert = ringCarAddUpdateJibaisekiAlert_;
    global.ringCarAddMarkDateFieldsError = ringCarAddMarkDateFieldsError_;
    global.ringCarAddUpdateSeirekiPreviews = function () {
        ringCarAddUpdateFirstRegPreview_();
        ringCarAddUpdateExpiryPreview_();
    };
}(typeof window !== 'undefined' ? window : globalThis));
