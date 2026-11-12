/**
 * 整備明細書 OCR（factory_input — 5枠スロット + ocr_invoice）
 */
(function (global) {
    'use strict';

    var RING_INVOICE_OCR_ACTION = 'ocr_invoice';
    var RING_INVOICE_OCR_TIMEOUT_MS = 180000;
    var RING_INVOICE_SLOT_COUNT = 5;

    var ringInvoiceSlotState = {
        slots: [],
        activeSlotIndex: null
    };

    var ringInvoiceImportChain_ = Promise.resolve();
    var ringInvoiceImportWaiting_ = 0;
    var ringInvoiceScanSession_ = 0;
    var ringInvoiceImageSeq_ = 0;

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
        btn.disabled = !has || !!(ringInvoiceScanSession_ && ringOcrShouldConsumeResult_(ringInvoiceScanSession_));
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
            slot.imageId = ++ringInvoiceImageSeq_;
            delete slot._importReserved;
            try { ringInvoiceRevokeThumb_(slot); } catch (e0) { /* ignore */ }
            try { slot.base64 = null; } catch (e1) { /* ignore */ }
            try { ringInvoiceRenderAllSlots_(); } catch (e2) { /* ignore */ }
        } catch (e) { /* ignore */ }
    }

    /** OCR 完了後: プレビュー用 Object URL は残し Base64 のみ解放 */
    function ringInvoiceClearBase64Only_(snapshot) {
        (snapshot || []).forEach(function (item) {
            var slot = ringInvoiceSlotState.slots[item.index];
            if (slot === item.slot && slot.imageId === item.imageId && slot.base64 === item.base64) {
                slot.base64 = null;
            }
        });
        ringInvoiceRenderAllSlots_();
    }

    function ringClearInvoiceSlots_() {
        ringInvoiceSlotState.slots.forEach(function (s) {
            try { ringInvoiceRevokeThumb_(s); } catch (e0) { /* ignore */ }
            try { if (s) { s.base64 = null; s.imageId = ++ringInvoiceImageSeq_; delete s._importReserved; } } catch (e1) { /* ignore */ }
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

        // Opening a mobile camera/gallery can hide this page; keep its images.

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
        // OCR must not replace a user-written maintenance memo.
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

    async function ringInvoiceOcrViaGas_(imagesBase64, sessionId) {
        if (global.RING_OCR_SESSION_API_VERSION !== 2) throw new Error('OCR_CLIENT_UPDATE_REQUIRED');
        if (!imagesBase64 || !imagesBase64.length) throw new Error('IMAGE_REQUIRED');
        if (typeof ringEnsureAuthForOcr === 'function') {
            await ringEnsureAuthForOcr(sessionId);
        }
        var json;
        if (typeof sendToGAS_Safe === 'function') {
            json = await sendToGAS_Safe(RING_INVOICE_OCR_ACTION, { images: imagesBase64 }, {
                timeoutMs: RING_INVOICE_OCR_TIMEOUT_MS, ocrSessionId: sessionId
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
        if (global.RING_OCR_SESSION_API_VERSION !== 2) {
            if (typeof showToast === 'function') showToast('warning', '画面の更新が必要です。入力内容を保存してから再読み込みし、OCRを再実行してください。');
            return null;
        }
        if (ringInvoiceScanSession_ && ringOcrShouldConsumeResult_(ringInvoiceScanSession_)) return null;
        var snapshot = ringInvoiceSlotState.slots.map(function (slot, index) {
            return { slot: slot, index: index, imageId: slot.imageId, base64: slot.base64 };
        }).filter(function (item) { return !!item.base64; });
        var images = snapshot.map(function (item) { return item.base64; });
        if (!images.length) {
            if (typeof showToast === 'function') showToast('warning', '画像がセットされていません');
            return null;
        }
        if (typeof navigator !== 'undefined' && navigator.onLine === false) {
            if (typeof showToast === 'function') showToast('warning', 'オフラインのため読み取れません。');
            return null;
        }
        var sessionId = ringOcrBeginSession_();
        ringInvoiceScanSession_ = sessionId;
        var saveBtn = opts.saveBtnId ? document.getElementById(opts.saveBtnId) : null;
        if (saveBtn) saveBtn.disabled = true;
        var scanBtn = document.getElementById('invoiceScanBtn');
        if (scanBtn) scanBtn.disabled = true;

        function releaseUi() {
            if (ringInvoiceScanSession_ !== sessionId) return;
            ringInvoiceScanSession_ = 0;
            if (saveBtn) saveBtn.disabled = false;
            ringInvoiceUpdateScanBtnState_();
            if (typeof hideOcrAnalyzingOverlay === 'function') hideOcrAnalyzingOverlay(sessionId);
            if (global.__ringOcrCancelCleanup && global.__ringOcrCancelCleanup.sessionId === sessionId) global.__ringOcrCancelCleanup = null;
        }
        global.__ringOcrCancelCleanup = { sessionId: sessionId, run: releaseUi };
        var result = null;
        try {
            if (typeof ringHandleInvoiceOcrScan === 'function') {
                result = await ringHandleInvoiceOcrScan({
                    sessionId: sessionId,
                    imagesBase64: images,
                    imageCount: images.length
                });
            } else {
                result = await ringInvoiceOcrViaGas_(images, sessionId);
            }
            if (!result) return null;
            if (!ringOcrShouldConsumeResult_(sessionId)) return null;

            if (typeof ringInvoiceOcrCheckRegistrable_ === 'function') {
                var docCheck = ringInvoiceOcrCheckRegistrable_(result);
                if (!docCheck.registrable) {
                    if (typeof ringShowInvoiceOcrRejectedDocumentModal_ === 'function') {
                        ringShowInvoiceOcrRejectedDocumentModal_(docCheck);
                    } else if (typeof showToast === 'function') {
                        showToast('warning', 'この書類からは整備履歴を登録できません。');
                    }
                    if (typeof ringLogSystemEvent === 'function') {
                        ringLogSystemEvent('OCR_INVOICE_DOC_REJECTED', {
                            documentType: docCheck.documentType
                        });
                    }
                    return result;
                }
            }

            var ocrApplied = false;
            if (typeof showInvoiceOcrReviewModal === 'function') {
                await new Promise(function (resolve) {
                    showInvoiceOcrReviewModal(result, {
                        onApply: function (edited) {
                            if (!ringOcrShouldConsumeResult_(sessionId)) { resolve(); return; }
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
                try { ringInvoiceClearBase64Only_(snapshot); } catch (eClr) { /* ignore */ }
            }
            if (ocrApplied) {
                if (typeof showToast === 'function') {
                    showToast('success', '読み取り内容を入力欄に反映しました。整備区分を選択してから登録してください。');
                }
            }
        } catch (e) {
            var msg = String(e && e.message ? e.message : e || '');
            if (!ringOcrShouldConsumeResult_(sessionId)) return null;
            if (/AUTH_/i.test(msg) && !e.ringAuthHandled && typeof ringHandleAuthExpired_ === 'function') {
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
            releaseUi();
        }
        return result;
    }

    function ringInvoiceFindNextEmptySlot_() {
        for (var i = 0; i < RING_INVOICE_SLOT_COUNT; i++) {
            if (!ringInvoiceSlotState.slots[i].base64) return i;
        }
        return -1;
    }

  function ringInvoiceListEmptySlotIndexes_() {
    var out = [];
    for (var i = 0; i < RING_INVOICE_SLOT_COUNT; i++) {
      var slot = ringInvoiceSlotState.slots[i];
      if (!slot.base64 && !slot._importReserved) out.push(i);
    }
    return out;
  }

  function ringInvoiceWithImportLock_(task, opts) {
    opts = opts || {};
    if (ringInvoiceImportWaiting_ > 0 && opts.notifyQueue !== false && typeof showToast === 'function') {
      showToast('info', '別の取り込みが終わるまでお待ちください。');
    }
    ringInvoiceImportWaiting_ += 1;
    var run = ringInvoiceImportChain_.then(function () {
      return task();
    }).finally(function () {
      ringInvoiceImportWaiting_ = Math.max(0, ringInvoiceImportWaiting_ - 1);
    });
    ringInvoiceImportChain_ = run.catch(function () { /* keep chain */ });
    return run;
  }

  function ringInvoiceReleaseSlotReservations_(indices) {
    if (!indices || !indices.length) return;
    indices.forEach(function (idx) {
      var slot = ringInvoiceSlotState.slots[idx];
      if (slot) delete slot._importReserved;
    });
    try { ringInvoiceRenderAllSlots_(); } catch (eR) { /* ignore */ }
  }

    /**
     * 画像ファイルを空きスロットへ順番に割り当て（使用済みスロットは上書きしない）
     * @returns {Promise<{ok:boolean, assigned:number}>}
     */
    async function ringInvoiceAssignImagesToEmptySlots_(imageFiles, preferredSlot) {
        if (!imageFiles || !imageFiles.length) return { ok: true, assigned: 0 };
        var empty = ringInvoiceListEmptySlotIndexes_();
        if (!empty.length) {
            if (typeof showToast === 'function') {
                showToast('info', 'スロットがいっぱいです。削除してから追加してください。');
            }
            return { ok: false, assigned: 0 };
        }
        if (imageFiles.length > empty.length) {
            if (typeof showToast === 'function') {
                showToast('warning', '空きは' + empty.length + '枠です。' + imageFiles.length + 'ページ分は入れられません。');
            }
            return { ok: false, assigned: 0 };
        }
        if (imageFiles.length === 1 && empty.indexOf(preferredSlot) >= 0) {
            empty = [preferredSlot].concat(empty.filter(function (idx) { return idx !== preferredSlot; }));
        }
        var targetSlots = empty.slice(0, imageFiles.length);
        var reservation = {};
        var targets = targetSlots.map(function (idx) { return ringInvoiceSlotState.slots[idx]; });
        targets.forEach(function (slot) { slot._importReserved = reservation; });
        var prepared = [];
        try {
            for (var i = 0; i < imageFiles.length; i++) {
                var b64 = await ringOcrCompressImageToBase64_(imageFiles[i]);
                if (!b64) throw new Error('IMAGE_ENCODE_EMPTY');
                prepared.push(b64);
            }
            if (!targets.every(function (slot, i) {
                return ringInvoiceSlotState.slots[targetSlots[i]] === slot && slot._importReserved === reservation && !slot.base64;
            })) return { ok: false, assigned: 0 };
            targets.forEach(function (slot, i) {
                ringInvoiceRevokeThumb_(slot);
                slot.base64 = prepared[i];
                slot.imageId = ++ringInvoiceImageSeq_;
                try { slot.thumbUrl = URL.createObjectURL(imageFiles[i]); } catch (e) { slot.thumbUrl = null; }
            });
            return { ok: true, assigned: imageFiles.length };
        } catch (err) {
            if (typeof showToast === 'function') showToast('warning', '画像の読み込みに失敗しました。画像は追加されていません。もう一度お試しください。');
            return { ok: false, assigned: 0 };
        } finally {
            targets.forEach(function (slot) { if (slot._importReserved === reservation) delete slot._importReserved; });
            ringInvoiceRenderAllSlots_();
        }
    }

    async function ringInvoiceAssignImageFile_(file, slotIndex) {
        var result = await ringInvoiceAssignImagesToEmptySlots_([file], slotIndex);
        return result.ok;
    }

    async function ringInvoiceAssignFromUserFile_(file) {
        if (!file) return;
        return ringInvoiceWithImportLock_(async function () {
            if (typeof ringResolveImportToImageFiles_ !== 'function') {
                var singleIdx = ringInvoiceFindNextEmptySlot_();
                if (singleIdx < 0) {
                    if (typeof showToast === 'function') showToast('info', 'スロットがいっぱいです。');
                    return;
                }
                await ringInvoiceAssignImageFile_(file, singleIdx);
                return;
            }
            var remain = ringInvoiceListEmptySlotIndexes_().length;
            if (!remain) {
                if (typeof showToast === 'function') showToast('info', 'スロットがいっぱいです。削除してから追加してください。');
                return;
            }
            var images;
            if (typeof showLoading === 'function' && typeof ringIsPdfMime_ === 'function' && ringIsPdfMime_(file)) {
                showLoading('読込中', '読み込み中…');
            }
            try {
                images = await ringResolveImportToImageFiles_(file, { maxPages: remain, allowPdf: true });
            } finally {
                if (typeof hideLoading === 'function') hideLoading();
            }
            if (!images.length) return;
            if (images.length === 1 && !ringIsPdfMime_(file)) {
                await ringInvoiceAssignImageFile_(images[0], ringInvoiceSlotState.activeSlotIndex);
            } else {
                await ringInvoiceAssignImagesToEmptySlots_(images);
            }
        });
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

        var cameraInput = document.getElementById('invoiceSlotCameraInput');
        var fileInput = document.getElementById('invoiceSlotFileInput');
        var scanBtn = document.getElementById('invoiceScanBtn');
        var cameraBtn = document.getElementById('invoiceSlotCameraBtn');
        var fileBtn = document.getElementById('invoiceSlotFileBtn');

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
                if (isNaN(idx)) return;
                ringInvoiceSlotState.activeSlotIndex = idx;
                row.querySelectorAll('.invoice-slot').forEach(function (el) {
                    el.classList.toggle('invoice-slot--active', parseInt(el.getAttribute('data-slot'), 10) === idx);
                });
            });
        }

        function pickTargetSlot_() {
            var idx = ringInvoiceSlotState.activeSlotIndex;
            if (idx == null || idx < 0 || ringInvoiceSlotState.slots[idx].base64) {
                idx = ringInvoiceFindNextEmptySlot_();
            }
            return idx;
        }

        if (typeof ringWireDualMediaButtons_ === 'function') {
            ringWireDualMediaButtons_({
                cameraInput: cameraInput,
                fileInput: fileInput,
                cameraBtn: cameraBtn,
                fileBtn: fileBtn,
                allowPdf: true,
                onSourceFile: ringInvoiceAssignFromUserFile_,
                maxPdfPages: function () {
                    var n = ringInvoiceListEmptySlotIndexes_().length;
                    return n > 0 ? n : 1;
                },
                onFiles: async function (files) {
                    if (!files || !files.length) return;
                    await ringInvoiceWithImportLock_(async function () {
                        var first = files[0];
                        var isMultiFromPdf = files.length > 1;
                        if (isMultiFromPdf) {
                            await ringInvoiceAssignImagesToEmptySlots_(files);
                            return;
                        }
                        var target = pickTargetSlot_();
                        if (target < 0) {
                            if (typeof showToast === 'function') showToast('info', 'スロットがいっぱいです。');
                            return;
                        }
                        if (typeof ringIsPdfMime_ === 'function' && ringIsPdfMime_(first)) {
                            if (typeof ringResolveImportToImageFiles_ === 'function') {
                                var remainN = ringInvoiceListEmptySlotIndexes_().length;
                                if (!remainN) {
                                    if (typeof showToast === 'function') showToast('info', 'スロットがいっぱいです。');
                                    return;
                                }
                                var pdfImages;
                                if (typeof showLoading === 'function') showLoading('読込中', '読み込み中…');
                                try {
                                    pdfImages = await ringResolveImportToImageFiles_(first, {
                                        maxPages: remainN,
                                        allowPdf: true
                                    });
                                } finally {
                                    if (typeof hideLoading === 'function') hideLoading();
                                }
                                if (pdfImages.length) await ringInvoiceAssignImagesToEmptySlots_(pdfImages);
                            }
                        } else {
                            await ringInvoiceAssignImageFile_(first, target);
                        }
                    });
                }
            });
        } else if (fileInput) {
            fileInput.addEventListener('change', async function (e) {
                var file = e.target.files && e.target.files[0];
                e.target.value = '';
                await ringInvoiceAssignFromUserFile_(file);
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
    global.ringInvoiceListEmptySlotIndexes_ = ringInvoiceListEmptySlotIndexes_;
    global.ringInvoiceAssignImagesToEmptySlots_ = ringInvoiceAssignImagesToEmptySlots_;
    global.ringInvoiceInitSlotState_ = ringInvoiceInitSlotState_;
    global.ringInvoiceSlotState = ringInvoiceSlotState;
    global.ringInvoiceWithImportLock_ = ringInvoiceWithImportLock_;
    global.ringInvoiceReleaseSlotReservations_ = ringInvoiceReleaseSlotReservations_;
}(typeof window !== 'undefined' ? window : globalThis));
