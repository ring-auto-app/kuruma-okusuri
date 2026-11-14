/**
 * 画像・PDF の選択・検証・PDF→画像変換（OCR 入力専用。GAS は画像 base64 のみ）
 */
(function (global) {
    'use strict';

    var RING_IMPORT_MAX_IMAGE_BYTES = 12 * 1024 * 1024;
    var RING_IMPORT_MAX_PDF_BYTES = 15 * 1024 * 1024;
    var RING_IMPORT_PDF_MAX_PAGES = 30;
    var RING_IMPORT_PDF_RENDER_MAX_SIDE = 2400;
    var RING_IMPORT_PDF_RENDER_SCALE_MAX = 2.0;
    /** Mozilla pdfjs-dist legacy build（CVE-2024-4367 修正版） */
    var RING_PDFJS_VERSION = '4.2.67';
    var RING_PDFJS_MODULE = 'vendor/pdfjs/pdf.min.mjs';
    var RING_PDFJS_WORKER = 'vendor/pdfjs/pdf.worker.min.mjs';

    var ringPdfJsLoading_ = null;
    var ringPdfJsLoadAttempt_ = 0;
    var ringMediaSelectionChain_ = Promise.resolve();
    var ringPdfPickerChain_ = Promise.resolve();

    function ringPdfJsBustQuery_() {
        ringPdfJsLoadAttempt_ += 1;
        return 'v=' + encodeURIComponent(RING_PDFJS_VERSION) + '&ringtry=' + ringPdfJsLoadAttempt_;
    }

    function ringPdfJsImportUrl_() {
        var base = ringPdfJsUrl_(RING_PDFJS_MODULE);
        var q = ringPdfJsBustQuery_();
        return base + (base.indexOf('?') >= 0 ? '&' : '?') + q;
    }

    function ringPdfJsWorkerUrlForAttempt_() {
        var base = ringPdfJsUrl_(RING_PDFJS_WORKER);
        var q = 'v=' + encodeURIComponent(RING_PDFJS_VERSION) + '&ringtry=' + ringPdfJsLoadAttempt_;
        return base + (base.indexOf('?') >= 0 ? '&' : '?') + q;
    }

    /**
     * 動的 import 失敗後の再試行用（モジュールマップ回避のため bust を進める）
     */
    function ringResetPdfJsForRetry_() {
        ringPdfJsLoading_ = null;
        try { delete global.pdfjsLib; } catch (eDel) { global.pdfjsLib = undefined; }
    }

    function ringPdfJsUrl_(rel) {
        try {
            return new URL(rel, document.baseURI || location.href).href;
        } catch (e) {
            return rel;
        }
    }

    function ringEscapeHtml_(s) {
        if (typeof escapeHtml === 'function') return escapeHtml(s);
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function ringIsPdfMime_(file) {
        if (!file) return false;
        var t = String(file.type || '').toLowerCase();
        if (t === 'application/pdf') return true;
        var n = String(file.name || '').toLowerCase();
        return /\.pdf$/i.test(n);
    }

    function ringIsImageMime_(file) {
        if (!file) return false;
        var t = String(file.type || '').toLowerCase();
        if (/^image\/(jpeg|jpg|png|webp|gif|bmp|heic|heif)/i.test(t)) return true;
        var n = String(file.name || '').toLowerCase();
        return /\.(jpe?g|png|webp|gif|bmp|heic|heif)$/i.test(n);
    }

    function ringResolveMaxPdfPages_(opts) {
        if (typeof opts.maxPdfPages === 'function') {
            var n = opts.maxPdfPages();
            return n != null && n > 0 ? n : 1;
        }
        if (opts.maxPdfPages != null) return opts.maxPdfPages;
        return 5;
    }

    function ringValidateMediaFile_(file, opts) {
        opts = opts || {};
        if (!file) return { ok: false, message: 'ファイルが選択されていません。' };
        var allowPdf = opts.allowPdf !== false;
        var isPdf = ringIsPdfMime_(file);
        var isImg = ringIsImageMime_(file);
        if (isPdf && !allowPdf) {
            return { ok: false, message: 'PDFはここでは選べません。画像を選択してください。' };
        }
        if (!isPdf && !isImg) {
            return { ok: false, message: '対応していない形式です。画像またはPDFを選択してください。' };
        }
        var max = isPdf ? RING_IMPORT_MAX_PDF_BYTES : RING_IMPORT_MAX_IMAGE_BYTES;
        if (file.size > max) {
            var mb = Math.round(max / (1024 * 1024));
            return { ok: false, message: 'ファイルが大きすぎます（上限おおよそ' + mb + 'MB）。' };
        }
        return { ok: true, isPdf: isPdf, isImage: isImg };
    }

    async function ringEnsurePdfJs_(opts) {
        opts = opts || {};
        if (!opts.forceRetry && global.pdfjsLib && global.pdfjsLib.getDocument) {
            return global.pdfjsLib;
        }
        if (!opts.forceRetry && ringPdfJsLoading_) return ringPdfJsLoading_;

        var loadTask = (async function () {
            var lastErr = null;
            var maxTry = 3;
            for (var t = 0; t < maxTry; t++) {
                try {
                    if (t > 0) ringResetPdfJsForRetry_();
                    var modUrl = ringPdfJsImportUrl_();
                    var mod = await import(/* webpackIgnore: true */ modUrl);
                    var pdfjs = mod;
                    if (pdfjs && !pdfjs.getDocument && pdfjs.default && pdfjs.default.getDocument) {
                        pdfjs = pdfjs.default;
                    }
                    if (!pdfjs || !pdfjs.getDocument) throw new Error('PDF_JS_LOAD_FAIL');
                    global.pdfjsLib = pdfjs;
                    pdfjs.GlobalWorkerOptions.workerSrc = ringPdfJsWorkerUrlForAttempt_();
                    return pdfjs;
                } catch (eLoad) {
                    lastErr = eLoad;
                    ringResetPdfJsForRetry_();
                }
            }
            throw lastErr || new Error('PDF_JS_LOAD_FAIL');
        })();

        ringPdfJsLoading_ = loadTask;
        try {
            return await loadTask;
        } finally {
            ringPdfJsLoading_ = null;
        }
    }

    async function ringPdfLoadFromFile_(file) {
        var v = ringValidateMediaFile_(file, { allowPdf: true });
        if (!v.ok || !v.isPdf) throw new Error('PDF_INVALID');
        var buf = await file.arrayBuffer();
        for (var attempt = 0; attempt < 3; attempt++) {
            var pdfjs = await ringEnsurePdfJs_();
            var loadingTask;
            try {
                // Worker transfer can detach data: each attempt gets its own buffer.
                loadingTask = pdfjs.getDocument({ data: buf.slice(0), isEvalSupported: false });
                return await loadingTask.promise;
            } catch (err) {
                if (loadingTask && typeof loadingTask.destroy === 'function') {
                    try { await loadingTask.destroy(); } catch (ignored) {}
                }
                ringResetPdfJsForRetry_();
                if (attempt === 2 || !/worker|module|fetch|network|load|import|timeout/i.test(String(err && err.message || err))) throw err;
            }
        }
    }

    async function ringPdfRenderPageToBlob_(pdf, pageNum) {
        var page = await pdf.getPage(pageNum);
        var baseVp = page.getViewport({ scale: 1 });
        var maxSide = Math.max(baseVp.width, baseVp.height);
        var scale = 1;
        if (maxSide > RING_IMPORT_PDF_RENDER_MAX_SIDE) {
            scale = RING_IMPORT_PDF_RENDER_MAX_SIDE / maxSide;
        }
        scale = Math.min(scale, RING_IMPORT_PDF_RENDER_SCALE_MAX);
        var viewport = page.getViewport({ scale: scale });
        var canvas = document.createElement('canvas');
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        var ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('PDF_RENDER_FAIL');
        await page.render({ canvasContext: ctx, viewport: viewport }).promise;
        return new Promise(function (resolve, reject) {
            canvas.toBlob(function (blob) {
                if (!blob) reject(new Error('PDF_RENDER_FAIL'));
                else resolve(blob);
            }, 'image/jpeg', 0.9);
        });
    }

  /**
   * @param {number} pageCount
   * @param {number} maxPick
   * @returns {Promise<number[]|null>} 1-based page indices, null = cancel
   */
    function ringShowPdfPagePicker_(pageCount, maxPick) {
        var run = ringPdfPickerChain_.then(function () { return ringOpenPdfPagePicker_(pageCount, maxPick); });
        ringPdfPickerChain_ = run.catch(function () {});
        return run;
    }

    function ringOpenPdfPagePicker_(pageCount, maxPick) {
        maxPick = Math.max(1, Math.min(maxPick, pageCount));
        return new Promise(function (resolve) {
            var id = 'ring-pdf-page-picker';
            var old = document.getElementById(id);
            if (old) { resolve(null); return; }
            var defaultChecked = [];
            for (var i = 1; i <= Math.min(pageCount, maxPick); i++) defaultChecked.push(i);

            var rows = '';
            for (var p = 1; p <= pageCount; p++) {
                var chk = defaultChecked.indexOf(p) >= 0 ? ' checked' : '';
                rows += '<label class="ring-pdf-page-picker__row">' +
                    '<input type="checkbox" class="ring-pdf-page-picker__cb" data-page="' + p + '"' + chk + '>' +
                    '<span> ' + p + ' ページ目</span></label>';
            }

            var html = '<div class="ring-save-confirm" id="' + id + '">' +
                '<div class="ring-save-confirm__card">' +
                '<div class="ring-save-confirm__title">PDFのページを選ぶ</div>' +
                '<p class="ring-save-confirm__lead">最大 ' + maxPick + ' ページまで（上から順に読み取ります）。' +
                (pageCount > RING_IMPORT_PDF_MAX_PAGES ? '（先頭' + RING_IMPORT_PDF_MAX_PAGES + 'ページのみ表示）' : '') +
                '</p>' +
                '<div class="ring-pdf-page-picker__list">' + rows + '</div>' +
                '<div class="ring-save-confirm__actions">' +
                '<button type="button" class="ring-save-confirm__btn ring-save-confirm__btn--ghost" data-act="cancel">キャンセル</button>' +
                '<button type="button" class="ring-save-confirm__btn ring-save-confirm__btn--primary" data-act="ok">読み取りに使う</button>' +
                '</div></div>' +
                '<div class="ring-save-confirm__backdrop"></div></div>';
            document.body.insertAdjacentHTML('beforeend', html);
            var root = document.getElementById(id);

            function close() {
                if (root && root.parentNode) root.remove();
            }

            function collect() {
                var picked = [];
                root.querySelectorAll('.ring-pdf-page-picker__cb:checked').forEach(function (cb) {
                    var n = parseInt(cb.getAttribute('data-page'), 10);
                    if (!isNaN(n)) picked.push(n);
                });
                picked.sort(function (a, b) { return a - b; });
                return picked;
            }

            root.querySelector('[data-act="cancel"]').onclick = function () { close(); resolve(null); };
            root.querySelector('.ring-save-confirm__backdrop').onclick = function () { close(); resolve(null); };
            root.querySelector('[data-act="ok"]').onclick = function () {
                var picked = collect();
                if (!picked.length) {
                    if (typeof showToast === 'function') showToast('warning', 'ページを1枚以上選んでください。');
                    return;
                }
                if (picked.length > maxPick) {
                    if (typeof showToast === 'function') {
                        showToast('warning', '選べるのは最大' + maxPick + 'ページです（空き枠に合わせてください）。');
                    }
                    return;
                }
                close();
                resolve(picked);
            };

            root.querySelectorAll('.ring-pdf-page-picker__cb').forEach(function (cb) {
                cb.addEventListener('change', function () {
                    var picked = collect();
                    if (picked.length > maxPick) {
                        cb.checked = false;
                        if (typeof showToast === 'function') {
                            showToast('info', '選べるのは最大' + maxPick + 'ページです。');
                        }
                    }
                });
            });
        });
    }

    /**
     * PDF を JPEG の File 配列へ（ページ順維持）
     * @param {File} file
     * @param {{ maxPages?: number }} opts
     */
    async function ringPdfFileToImageFiles_(file, opts) {
        opts = opts || {};
        var maxPages = opts.maxPages != null ? opts.maxPages : 5;
        var pdf;
        try {
            pdf = await ringPdfLoadFromFile_(file);
        } catch (e) {
            var msg = String(e && e.message ? e.message : e);
            if (/PDF_JS_LOAD_FAIL/.test(msg)) {
                throw new Error('PDF_READ_UNAVAILABLE');
            }
            throw new Error('PDF_READ_FAIL');
        }
        try {
        var total = pdf.numPages;
        if (total > RING_IMPORT_PDF_MAX_PAGES) {
            throw new Error('PDF_TOO_MANY_PAGES');
        }
        var pickCount = Math.min(maxPages, total);
        var picked;
        if (total === 1) {
            picked = [1];
        } else {
            picked = await ringShowPdfPagePicker_(total, pickCount);
            if (!picked || !picked.length) return [];
        }
        var out = [];
        var baseName = String(file.name || 'document').replace(/\.pdf$/i, '');
        for (var i = 0; i < picked.length; i++) {
            var pg = picked[i];
            var blob = await ringPdfRenderPageToBlob_(pdf, pg);
            var name = baseName + '_p' + pg + '.jpg';
            try {
                out.push(new File([blob], name, { type: 'image/jpeg' }));
            } catch (eF) {
                out.push(blob);
            }
        }
        return out;
        } finally {
            if (pdf && typeof pdf.destroy === 'function') {
                try { await pdf.destroy(); } catch (ignored) {}
            }
        }
    }

    /**
     * 1ファイル → 画像 File の配列（画像は1件、PDFはページ分解）
     */
    async function ringResolveImportToImageFiles_(file, opts) {
        opts = opts || {};
        var v = ringValidateMediaFile_(file, opts);
        if (!v.ok) {
            if (typeof showToast === 'function') showToast('warning', v.message);
            return [];
        }
        if (v.isImage) return [file];
        if (v.isPdf) {
            try {
                return await ringPdfFileToImageFiles_(file, { maxPages: opts.maxPages || 5 });
            } catch (e) {
                var code = String(e && e.message ? e.message : e);
                var user = 'PDFを読み込めませんでした。もう一度選択してください。';
                if (code === 'PDF_TOO_MANY_PAGES') {
                    user = 'PDFのページ数が多すぎます（上限' + RING_IMPORT_PDF_MAX_PAGES + 'ページ）。';
                } else if (code === 'PDF_READ_UNAVAILABLE') {
                    user = 'PDFを開く機能を読み込めませんでした。通信を確認して、もう一度ファイルを選択してください。';
                    if (typeof ringResetPdfJsForRetry_ === 'function') ringResetPdfJsForRetry_();
                }
                if (typeof showToast === 'function') showToast('warning', user);
                return [];
            }
        }
        return [];
    }

    /**
     * カメラ／ファイルの2ボタンをまとめて初期化
     * @param {{ cameraInput: HTMLInputElement, fileInput: HTMLInputElement, onFiles: (files: File[]) => void|Promise<void>, allowPdf?: boolean, busyGuard?: () => boolean }} opts
     */
    function ringWireDualMediaButtons_(opts) {
        opts = opts || {};
        var cam = opts.cameraInput;
        var fileInp = opts.fileInput;
        var camBtn = opts.cameraBtn;
        var fileBtn = opts.fileBtn;
        if (camBtn && cam) {
            camBtn.addEventListener('click', function () {
                if (opts.busyGuard && opts.busyGuard()) return;
                cam.value = '';
                cam.click();
            });
        }
        if (fileBtn && fileInp) {
            fileBtn.addEventListener('click', function () {
                if (opts.busyGuard && opts.busyGuard()) return;
                fileInp.value = '';
                fileInp.click();
            });
        }
        function enqueueSelection(f, camera) {
            var run = ringMediaSelectionChain_.then(async function () {
                if (opts.busyGuard && opts.busyGuard()) return;
                if (typeof opts.onSourceFile === 'function') return opts.onSourceFile(f);
                var list = camera ? [f] : await ringResolveImportToImageFiles_(f, {
                    allowPdf: opts.allowPdf !== false, maxPages: ringResolveMaxPdfPages_(opts)
                });
                if (list.length) handleList(list);
            });
            ringMediaSelectionChain_ = run.catch(function () {
                if (typeof showToast === 'function') showToast('warning', '画像の取り込みに失敗しました。もう一度選択してください。');
            });
            return ringMediaSelectionChain_;
        }
        function handleList(list) {
            if (!list || !list.length || typeof opts.onFiles !== 'function') return;
            Promise.resolve(opts.onFiles(list)).catch(function () { /* handled inside */ });
        }
        if (cam) {
            cam.addEventListener('change', function (e) {
                var f = e.target.files && e.target.files[0];
                e.target.value = '';
                if (!f) return;
                var v = ringValidateMediaFile_(f, { allowPdf: false });
                if (!v.ok) {
                    if (typeof showToast === 'function') showToast('warning', v.message);
                    return;
                }
                return enqueueSelection(f, true);
            });
        }
        if (fileInp) {
            fileInp.addEventListener('change', async function (e) {
                var f = e.target.files && e.target.files[0];
                e.target.value = '';
                if (!f) return;
                return enqueueSelection(f, false);
            });
        }
    }

    /**
     * 車検証 OCR（画像／PDF）— 自動保存なし
     */
    async function ringRunShakenOcrFromFiles_(files, opts) {
        opts = opts || {};
        if (global.RING_OCR_SESSION_API_VERSION !== 2) {
            if (typeof showToast === 'function') showToast('warning', '画面の更新が必要です。入力内容を保存してから再読み込みし、OCRを再実行してください。');
            return null;
        }
        files = files || [];
        if (!files.length) return null;
        if (global.__ringShakenOcrBusy) {
            var staleBusy = (typeof global.ringOcrShouldConsumeResult_ === 'function' && global.__ringShakenOcrSession
                && !global.ringOcrShouldConsumeResult_(global.__ringShakenOcrSession));
            if (!staleBusy) {
                if (typeof showToast === 'function') showToast('info', '読み取り中です。完了までお待ちください。');
                return null;
            }
        }
        var sessionId = (typeof global.ringOcrBeginSession_ === 'function') ? global.ringOcrBeginSession_() : 0;
        global.__ringShakenOcrBusy = true;
        global.__ringShakenOcrSession = sessionId;
        var previewUrl = '';
        try {
            previewUrl = await new Promise(function (resolve, reject) {
                var r = new FileReader();
                r.onload = function () { resolve(String(r.result || '')); };
                r.onerror = reject;
                r.readAsDataURL(files[0]);
            });
        } catch (e) { /* ignore */ }

        if (sessionId && !global.ringOcrShouldConsumeResult_(sessionId)) {
            if (global.__ringShakenOcrSession === sessionId) {
                global.__ringShakenOcrBusy = false;
                global.__ringShakenOcrSession = 0;
            }
            return null;
        }
        if (opts.previewImg && previewUrl) opts.previewImg.src = previewUrl;
        if (opts.previewArea) opts.previewArea.style.display = 'block';
        if (opts.discardNotice) opts.discardNotice.style.display = 'block';

        if (typeof showOcrAnalyzingOverlay === 'function') {
            showOcrAnalyzingOverlay({ previewDataUrl: previewUrl, title: '書類を読み取っています', sessionId: sessionId });
        } else if (typeof showLoading === 'function') {
            showLoading('書類を読み取っています', 'しばらくお待ちください…');
        }

        var result = null;
        try {
            if (typeof ringGeminiOcrShaken !== 'function') throw new Error('SHAKEN_OCR_UNAVAILABLE');
            result = await ringGeminiOcrShaken(files[0], sessionId);
            var consume = (typeof global.ringOcrShouldConsumeResult_ === 'function')
                ? global.ringOcrShouldConsumeResult_(sessionId)
                : !(typeof wasOcrAnalyzingCancelled === 'function' && wasOcrAnalyzingCancelled());
            if (!consume) {
                result = null;
            } else if (typeof opts.onResult === 'function') {
                await opts.onResult(result, files[0], sessionId);
            }
        } catch (err) {
            var consumeErr = (typeof global.ringOcrShouldConsumeResult_ === 'function')
                ? global.ringOcrShouldConsumeResult_(sessionId)
                : !(typeof wasOcrAnalyzingCancelled === 'function' && wasOcrAnalyzingCancelled());
            if (consumeErr && typeof showToast === 'function') {
                showToast('warning', '読み取れませんでした。もう一度選択してください。');
            }
        } finally {
            if (global.__ringShakenOcrSession === sessionId) {
                global.__ringShakenOcrBusy = false;
                global.__ringShakenOcrSession = 0;
            }
            if (typeof hideOcrAnalyzingOverlay === 'function') hideOcrAnalyzingOverlay(sessionId);
            else if (global.__ringOcrActiveSession === sessionId && typeof hideLoading === 'function') hideLoading();
        }
        return result;
    }

    global.RING_IMPORT_MAX_IMAGE_BYTES = RING_IMPORT_MAX_IMAGE_BYTES;
    global.RING_IMPORT_MAX_PDF_BYTES = RING_IMPORT_MAX_PDF_BYTES;
    global.RING_IMPORT_PDF_MAX_PAGES = RING_IMPORT_PDF_MAX_PAGES;
    global.ringValidateMediaFile_ = ringValidateMediaFile_;
    global.ringIsPdfMime_ = ringIsPdfMime_;
    global.ringIsImageMime_ = ringIsImageMime_;
    global.ringResolveImportToImageFiles_ = ringResolveImportToImageFiles_;
    global.ringPdfFileToImageFiles_ = ringPdfFileToImageFiles_;
    global.ringWireDualMediaButtons_ = ringWireDualMediaButtons_;
    global.ringRunShakenOcrFromFiles_ = ringRunShakenOcrFromFiles_;
    global.ringShowPdfPagePicker_ = ringShowPdfPagePicker_;
    global.RING_PDFJS_VERSION = RING_PDFJS_VERSION;
    global.RING_PDFJS_MODULE = RING_PDFJS_MODULE;
    global.RING_PDFJS_WORKER = RING_PDFJS_WORKER;
    global.ringEnsurePdfJs_ = ringEnsurePdfJs_;
    global.ringResetPdfJsForRetry_ = ringResetPdfJsForRetry_;
    global.ringPdfJsLoadAttempt_ = function () { return ringPdfJsLoadAttempt_; };
}(typeof window !== 'undefined' ? window : globalThis));
