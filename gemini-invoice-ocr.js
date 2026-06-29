/**
 * 整備明細書 OCR（factory_input — 5枠スロット + ocr_invoice）
 */
(function (global) {
    'use strict';

    var RING_INVOICE_OCR_ACTION = 'ocr_invoice';
    var RING_INVOICE_OCR_TIMEOUT_MS = 120000;
    var RING_INVOICE_SLOT_COUNT = 5;

    var ringInvoiceSlotState = {
        slots: [],
        activeSlotIndex: null
    };

    function ringInvoiceInitSlotState_() {
        ringInvoiceSlotState.slots = [];
        for (var i = 0; i < RING_INVOICE_SLOT_COUNT; i++) {
            ringInvoiceSlotState.slots.push({ base64: null, thumbUrl: null });
        }
    }

    function ringInvoiceRevokeThumb_(slot) {
        if (slot && slot.thumbUrl) {
            try { URL.revokeObjectURL(slot.thumbUrl); } catch (e) { /* ignore */ }
            slot.thumbUrl = null;
        }
    }

    function ringInvoiceFilledCount_() {
        var n = 0;
        ringInvoiceSlotState.slots.forEach(function (s) {
            if (s.base64) n++;
        });
        return n;
    }

    function ringInvoiceCollectBase64_() {
        var out = [];
        ringInvoiceSlotState.slots.forEach(function (s) {
            if (s.base64) out.push(s.base64);
        });
        return out;
    }

    function ringInvoiceUpdateScanBtnState_() {
        var btn = document.getElementById('invoiceScanBtn');
        if (!btn) return;
        var has = ringInvoiceFilledCount_() > 0;
        btn.disabled = !has;
    }

    function ringInvoiceRenderSlot_(slotEl, index) {
        if (!slotEl) return;
        var slot = ringInvoiceSlotState.slots[index];
        slotEl.classList.remove('invoice-slot--filled');
        slotEl.innerHTML = '';
        if (slot.base64 && slot.thumbUrl) {
            slotEl.classList.add('invoice-slot--filled');
            slotEl.innerHTML =
                '<img class="invoice-slot__thumb" src="' + slot.thumbUrl + '" alt="スロット' + (index + 1) + '">' +
                '<button type="button" class="invoice-slot__remove" data-slot="' + index + '" aria-label="削除">✖</button>';
        } else {
            slotEl.innerHTML =
                '<span class="invoice-slot__num">' + (index + 1) + '</span>' +
                '<span class="invoice-slot__cam" aria-hidden="true">📷</span>';
        }
    }

    function ringInvoiceRenderAllSlots_() {
        var row = document.getElementById('invoiceSlotRow');
        if (!row) return;
        var slots = row.querySelectorAll('.invoice-slot');
        for (var i = 0; i < slots.length; i++) {
            ringInvoiceRenderSlot_(slots[i], i);
        }
        ringInvoiceUpdateScanBtnState_();
    }

    function ringInvoiceClearSlot_(index) {
        try {
            var slot = ringInvoiceSlotState.slots[index];
            if (!slot) return;
            try { ringInvoiceRevokeThumb_(slot); } catch (e0) { /* ignore */ }
            try { slot.base64 = null; } catch (e1) { /* ignore */ }
            try { ringInvoiceRenderAllSlots_(); } catch (e2) { /* ignore */ }
        } catch (e) { /* ignore */ }
    }

    /** OCR 完了後: プレビュー用 Object URL は残し Base64 のみ解放 */
    function ringInvoiceClearBase64Only_() {
        ringInvoiceSlotState.slots.forEach(function (s) {
            try { if (s) s.base64 = null; } catch (e0) { /* ignore */ }
        });
        try { ringInvoiceUpdateScanBtnState_(); } catch (e1) { /* ignore */ }
    }

    function ringClearInvoiceSlots_() {
        ringInvoiceSlotState.slots.forEach(function (s) {
            try { ringInvoiceRevokeThumb_(s); } catch (e0) { /* ignore */ }
            try { if (s) s.base64 = null; } catch (e1) { /* ignore */ }
        });
        try { ringInvoiceRenderAllSlots_(); } catch (e2) { /* ignore */ }
    }

    var ringInvoiceMemoryListenersInstalled_ = false;

    function ringInvoiceInstallMemoryReleaseListeners_() {
        if (ringInvoiceMemoryListenersInstalled_) return;
        ringInvoiceMemoryListenersInstalled_ = true;

        function releaseAllInvoiceMemory_() {
            try { ringClearInvoiceSlots_(); } catch (e) { /* ignore */ }
        }

        window.addEventListener('pagehide', function () {
            try { releaseAllInvoiceMemory_(); } catch (e) { /* ignore */ }
        });

        document.addEventListener('visibilitychange', function () {
            if (document.visibilityState !== 'hidden') return;
            try { releaseAllInvoiceMemory_(); } catch (e) { /* ignore */ }
        });
    }

    function ringInvoiceNormalizeResult_(raw) {
        var out = {
            vin: '',
            documentType: 'unknown',
            mileage: '',
            contentText: '',
            lines: [],
            works: [],
            parts: []
        };
        if (!raw || typeof raw !== 'object') return out;
        if (raw.vin != null && String(raw.vin).trim() !== '') {
            out.vin = String(raw.vin).trim().toUpperCase();
        }
        if (raw.documentType != null && String(raw.documentType).trim() !== '') {
            out.documentType = String(raw.documentType).trim();
        }
        if (raw.mileage != null && String(raw.mileage).trim() !== '') {
            out.mileage = String(raw.mileage).replace(/[^\d]/g, '');
        }
        if (raw.contentText != null && String(raw.contentText).trim() !== '') {
            out.contentText = String(raw.contentText).trim();
        }
        if (Array.isArray(raw.lines)) {
            out.lines = raw.lines.map(function (x) { return String(x || '').trim(); }).filter(Boolean);
            if (!out.contentText && out.lines.length) {
                out.contentText = out.lines.join('\n');
            }
        }
        if (Array.isArray(raw.works)) {
            out.works = raw.works.map(function (w) { return String(w || '').trim(); }).filter(Boolean);
        }
        if (Array.isArray(raw.parts)) {
            out.parts = raw.parts.map(function (p) {
                if (!p || typeof p !== 'object') return null;
                return {
                    n: String(p.n != null ? p.n : '').trim(),
                    s: String(p.s != null ? p.s : '').trim(),
                    q: String(p.q != null ? p.q : '').trim()
                };
            }).filter(function (p) { return p && p.n; });
        }
        return out;
    }

    function ringFormatInvoiceOcrWorksText_(works) {
        var list = Array.isArray(works) ? works : [];
        if (!list.length) return '';
        return '【作業】\n' + list.map(function (w) { return '・' + w; }).join('\n');
    }

    function ringFormatInvoiceOcrPartsText_(parts) {
        var list = Array.isArray(parts) ? parts : [];
        if (!list.length) return '';
        var lines = list.map(function (p) {
            var spec = p.s ? '（' + p.s + '）' : '';
            var qty = p.q ? ' ' + p.q : '';
            return '・' + p.n + spec + qty;
        });
        return '【部品】\n' + lines.join('\n');
    }

    function ringApplyInvoiceOcrToForm(scope, ocrResult, opts) {
        opts = opts || {};
        var r = ringInvoiceNormalizeResult_(ocrResult);
        if (r.vin) {
            var vinEl = document.getElementById('inVin');
            if (vinEl && !vinEl.readOnly) vinEl.value = r.vin;
        }
        if (r.mileage) {
            var mi = document.getElementById('inMileage');
            if (mi) mi.value = r.mileage;
        }
        var worksText = ringFormatInvoiceOcrWorksText_(r.works);
        var partsText = ringFormatInvoiceOcrPartsText_(r.parts);
        if (worksText) {
            var memo = document.getElementById('inMemo');
            if (memo) memo.value = worksText;
        }
        if (partsText) {
            var pa = document.getElementById('inParts');
            if (pa) pa.value = partsText;
        }
        if (scope === 'factory' && r.vin && typeof lookupVehicle === 'function') {
            lookupVehicle(r.vin);
        }
        if (typeof global !== 'undefined') {
            global.__ringInvoiceOcrMeta = {
                documentType: r.documentType,
                works: r.works.slice(),
                partsItems: r.parts.map(function (p) { return { n: p.n, s: p.s, q: p.q }; })
            };
            global.__ringOcrAppliedThisSession = true;
        }
        if (typeof ringInitAutoGrowTextareas === 'function') ringInitAutoGrowTextareas();
        if (typeof opts.onAfter === 'function') opts.onAfter(r);
    }

    async function ringInvoiceOcrViaGas_(imagesBase64) {
        if (!imagesBase64 || !imagesBase64.length) throw new Error('IMAGE_REQUIRED');
        if (typeof ringEnsureAuthForOcr === 'function') {
            await ringEnsureAuthForOcr();
        }
        var json;
        if (typeof sendToGAS_Safe === 'function') {
            json = await sendToGAS_Safe(RING_INVOICE_OCR_ACTION, { images: imagesBase64 }, {
                timeoutMs: RING_INVOICE_OCR_TIMEOUT_MS
            });
        } else {
            throw new Error('GAS_CLIENT_UNAVAILABLE');
        }
        if (!json || json.success !== true) {
            throw new Error((json && json.error) || 'GAS_OCR_FAIL');
        }
        var raw = json.ocrResult != null ? json.ocrResult : json.data;
        if (typeof raw === 'string') {
            if (typeof ringGeminiParseJsonText_ === 'function') {
                raw = ringGeminiParseJsonText_(raw);
            } else if (typeof safeJsonParse === 'function') {
                raw = safeJsonParse(raw, {});
            } else {
                raw = JSON.parse(raw);
            }
        }
        return ringInvoiceNormalizeResult_(raw);
    }

    async function ringRunInvoiceOcrFromSlots(opts) {
        opts = opts || {};
        var images = ringInvoiceCollectBase64_();
        if (!images.length) {
            if (typeof showToast === 'function') showToast('warning', '画像がセットされていません');
            return null;
        }
        if (typeof navigator !== 'undefined' && navigator.onLine === false) {
            if (typeof showToast === 'function') showToast('warning', 'オフラインのため読み取れません。');
            return null;
        }
        var saveBtn = opts.saveBtnId ? document.getElementById(opts.saveBtnId) : null;
        if (saveBtn) saveBtn.disabled = true;
        var scanBtn = document.getElementById('invoiceScanBtn');
        if (scanBtn) scanBtn.disabled = true;

        var result = null;
        try {
            if (typeof ringHandleInvoiceOcrScan === 'function') {
                result = await ringHandleInvoiceOcrScan({
                    imagesBase64: images,
                    imageCount: images.length
                });
            } else {
                result = await ringInvoiceOcrViaGas_(images);
            }
            if (!result) return null;

            var ocrApplied = false;
            if (typeof showInvoiceOcrReviewModal === 'function') {
                await new Promise(function (resolve) {
                    showInvoiceOcrReviewModal(result, {
                        onApply: function (edited) {
                            ocrApplied = true;
                            if (typeof opts.onApply === 'function') opts.onApply(edited);
                            resolve();
                        },
                        onCancel: resolve
                    });
                });
            } else if (typeof opts.onApply === 'function') {
                opts.onApply(result);
                ocrApplied = true;
            }
            if (ocrApplied) {
                try { ringInvoiceClearBase64Only_(); } catch (eClr) { /* ignore */ }
            }
            if (ocrApplied) {
                if (typeof showToast === 'function') {
                    showToast('success', '読み取り内容を入力欄に反映しました。整備区分を選択してから登録してください。');
                }
            }
        } catch (e) {
            var msg = String(e && e.message ? e.message : e || '');
            if (/AUTH_/i.test(msg) && typeof ringHandleAuthExpired_ === 'function') {
                ringHandleAuthExpired_(typeof ringGetActiveMode === 'function' ? ringGetActiveMode() : '', 'ocr_invoice');
            } else if (typeof showToast === 'function') {
                var userMsg = (typeof ringGasErrorToUserMessage_ === 'function')
                    ? ringGasErrorToUserMessage_(msg, 'ocr_invoice')
                    : null;
                showToast('warning', userMsg || '読み取れませんでした。再撮影するか手入力で続行してください。');
            }
            if (typeof ringLogSystemEvent === 'function') {
                ringLogSystemEvent('OCR_FAIL', { error_message: msg, payload: { stage: 'ocr_invoice' } });
            }
        } finally {
            if (saveBtn) saveBtn.disabled = false;
            try { ringInvoiceUpdateScanBtnState_(); } catch (eBtn) { /* ignore */ }
            if (typeof hideOcrAnalyzingOverlay === 'function') {
                try { hideOcrAnalyzingOverlay(); } catch (eOv) { /* ignore */ }
            }
        }
        return result;
    }

    function ringInitInvoiceSlotPicker(opts) {
        opts = opts || {};
        ringInvoiceInitSlotState_();

        var row = document.getElementById('invoiceSlotRow');
        if (row && !row.querySelector('.invoice-slot')) {
            row.innerHTML = '';
            for (var i = 0; i < RING_INVOICE_SLOT_COUNT; i++) {
                var el = document.createElement('button');
                el.type = 'button';
                el.className = 'invoice-slot';
                el.setAttribute('data-slot', String(i));
                el.setAttribute('aria-label', '書類スロット' + (i + 1));
                row.appendChild(el);
            }
        }

        var fileInput = document.getElementById('invoiceSlotFileInput');
        var scanBtn = document.getElementById('invoiceScanBtn');

        ringInvoiceRenderAllSlots_();

        if (row) {
            row.addEventListener('click', function (e) {
                var removeBtn = e.target.closest('.invoice-slot__remove');
                if (removeBtn) {
                    e.stopPropagation();
                    var ri = parseInt(removeBtn.getAttribute('data-slot'), 10);
                    if (!isNaN(ri)) ringInvoiceClearSlot_(ri);
                    return;
                }
                var slotBtn = e.target.closest('.invoice-slot');
                if (!slotBtn || slotBtn.classList.contains('invoice-slot--filled')) return;
                var idx = parseInt(slotBtn.getAttribute('data-slot'), 10);
                if (isNaN(idx) || !fileInput) return;
                ringInvoiceSlotState.activeSlotIndex = idx;
                fileInput.value = '';
                fileInput.click();
            });
        }

        if (fileInput) {
            fileInput.addEventListener('change', async function (e) {
                var file = e.target.files && e.target.files[0];
                var idx = ringInvoiceSlotState.activeSlotIndex;
                e.target.value = '';
                if (!file || idx == null || idx < 0 || idx >= RING_INVOICE_SLOT_COUNT) return;

                var compressFn = typeof ringOcrCompressImageToBase64_ === 'function'
                    ? ringOcrCompressImageToBase64_
                    : null;
                if (!compressFn) {
                    if (typeof showToast === 'function') showToast('error', '画像圧縮機能が利用できません。');
                    return;
                }
                try {
                    var b64 = await compressFn(file);
                    if (!b64) throw new Error('IMAGE_ENCODE_EMPTY');
                    var slot = ringInvoiceSlotState.slots[idx];
                    try { ringInvoiceRevokeThumb_(slot); } catch (e0) { /* ignore */ }
                    try { slot.base64 = b64; } catch (e1) { /* ignore */ }
                    try { slot.thumbUrl = URL.createObjectURL(file); } catch (e2) { slot.thumbUrl = null; }
                    try { ringInvoiceRenderAllSlots_(); } catch (e3) { /* ignore */ }
                } catch (err) {
                    ringInvoiceClearSlot_(idx);
                    if (typeof showToast === 'function') {
                        showToast('warning', '画像の読み込みに失敗しました。もう一度お試しください。');
                    }
                }
            });
        }

        if (scanBtn) {
            scanBtn.addEventListener('click', async function () {
                if (ringInvoiceFilledCount_() === 0) {
                    if (typeof showToast === 'function') showToast('warning', '画像がセットされていません');
                    return;
                }
                await ringRunInvoiceOcrFromSlots(opts);
            });
        }

        try { ringInvoiceInstallMemoryReleaseListeners_(); } catch (e) { /* ignore */ }
    }

    global.RING_INVOICE_OCR_ACTION = RING_INVOICE_OCR_ACTION;
    global.ringInitInvoiceSlotPicker = ringInitInvoiceSlotPicker;
    global.ringInvoiceOcrViaGas_ = ringInvoiceOcrViaGas_;
    global.ringRunInvoiceOcrFromSlots = ringRunInvoiceOcrFromSlots;
    global.ringFormatInvoiceOcrWorksText_ = ringFormatInvoiceOcrWorksText_;
    global.ringFormatInvoiceOcrPartsText_ = ringFormatInvoiceOcrPartsText_;
    global.ringApplyInvoiceOcrToForm = ringApplyInvoiceOcrToForm;
    global.ringClearInvoiceSlots_ = ringClearInvoiceSlots_;
    global.ringInvoiceNormalizeResult_ = ringInvoiceNormalizeResult_;
}(typeof window !== 'undefined' ? window : globalThis));
