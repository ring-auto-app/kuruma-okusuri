/**
 * 整備履歴検索専用 VIN パイプライン（factory_search.html のみ）
 * 車検証 OCR（analyzeDocument / ocr_vin）・QR 登録とは独立。
 */

var RING_VIN_SEARCH_DB_LOGS = 'nappy_logs_v1';

/**
 * VIN 比較用正規化（OCR候補・DB照合の双方で使用）
 * @param {string} vin
 * @returns {string}
 */
function normalizeVin(vin) {
    if (vin == null || vin === '') return '';
    var s = String(vin)
        .replace(/[Ａ-Ｚａ-ｚ０-９]/g, function (ch) {
            return String.fromCharCode(ch.charCodeAt(0) - 0xFEE0);
        })
        .replace(/[\r\n\t]+/g, ' ')
        .replace(/\s+/g, ' ')
        .replace(/\s*[-ー‐－—]\s*/g, '-')
        .toUpperCase()
        .trim();
    return s.replace(/[-ー‐－—_,\.，、\s]/g, '');
}

function ringVinSearchClamp_(n, lo, hi) {
    return Math.max(lo, Math.min(hi, n));
}

/**
 * Canvas 前処理: 回転・リサイズ・グレースケール・コントラスト・JPEG85%
 * @param {File|Blob} file
 * @param {{ maxSide?: number, contrast?: number }} [opts]
 * @returns {Promise<string>} base64（プレフィックスなし）
 */
function ringVinSearchPreprocessImage_(file, opts) {
    opts = opts || {};
    var maxSide = opts.maxSide || 2400;
    var contrast = opts.contrast != null ? opts.contrast : 1.4;

    function drawProcessed(ctx, source, tw, th) {
        ctx.drawImage(source, 0, 0, tw, th);
        try {
            var imgData = ctx.getImageData(0, 0, tw, th);
            var d = imgData.data;
            var i;
            for (i = 0; i < d.length; i += 4) {
                var gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
                gray = ringVinSearchClamp_((gray - 128) * contrast + 128, 0, 255);
                d[i] = d[i + 1] = d[i + 2] = gray;
            }
            ctx.putImageData(imgData, 0, 0);
        } catch (e) {
            /* getImageData 不可環境はグレースケールのみスキップ */
        }
    }

    function encodeCanvas(c) {
        var dataUrl = c.toDataURL('image/jpeg', 0.85);
        var idx = dataUrl.indexOf('base64,');
        return idx >= 0 ? dataUrl.slice(idx + 7) : '';
    }

    return new Promise(function (resolve, reject) {
        function fromBitmap(bmp) {
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
                drawProcessed(c.getContext('2d'), bmp, tw, th);
                if (typeof bmp.close === 'function') bmp.close();
                resolve(encodeCanvas(c));
            } catch (e) {
                if (typeof bmp.close === 'function') {
                    try { bmp.close(); } catch (x) { /* ignore */ }
                }
                reject(e);
            }
        }

        function fromImageElement() {
            var img = new Image();
            var objUrl = URL.createObjectURL(file);
            img.onload = function () {
                try {
                    var w = img.naturalWidth || img.width;
                    var h = img.naturalHeight || img.height;
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
                    drawProcessed(c.getContext('2d'), img, tw, th);
                    resolve(encodeCanvas(c));
                } catch (e) {
                    reject(e);
                } finally {
                    URL.revokeObjectURL(objUrl);
                }
            };
            img.onerror = function () {
                URL.revokeObjectURL(objUrl);
                reject(new Error('IMAGE_LOAD_FAIL'));
            };
            img.src = objUrl;
        }

        if (typeof createImageBitmap === 'function') {
            var bmpOpts = { imageOrientation: 'from-image' };
            createImageBitmap(file, bmpOpts).then(fromBitmap).catch(function () {
                createImageBitmap(file).then(fromBitmap).catch(fromImageElement);
            });
        } else {
            fromImageElement();
        }
    });
}

/**
 * GAS ocr_vin_search を呼び出し候補リストを取得
 * @param {string} preprocessedBase64
 * @returns {Promise<{ success: boolean, candidates?: string[], error?: string }>}
 */
async function ringVinSearchRequestOcr_(preprocessedBase64) {
    if (!preprocessedBase64) {
        return { success: false, error: 'IMAGE_ENCODE_EMPTY' };
    }
    try {
        if (typeof ringEnsureAuthForOcr === 'function') {
            await ringEnsureAuthForOcr();
        }
        var json = await sendToGAS_Safe('ocr_vin_search', { imageBase64: preprocessedBase64 });
        if (!json) return { success: false, error: 'NO_RESPONSE' };
        if (json.success === true && Array.isArray(json.candidates)) {
            return { success: true, candidates: json.candidates };
        }
        return { success: false, error: String(json.error || 'VIN_NOT_FOUND') };
    } catch (e) {
        return { success: false, error: String(e && e.message ? e.message : e || 'OCR_REQUEST_FAIL') };
    }
}

/**
 * ローカル DB 全件照合（候補順・完全一致優先）
 * @param {string[]} candidates
 * @returns {{ foundVin: string, matchedNormalized: string, candidateIndex: number }|null}
 */
function searchByVinCandidates(candidates) {
    if (!candidates || !candidates.length) return null;

    var vehicles = typeof loadVehicles === 'function'
        ? loadVehicles()
        : safeJsonParse(localStorage.getItem(typeof DB_VEHICLES !== 'undefined' ? DB_VEHICLES : 'nappy_vehicles_v1'), []);

    var vehicleNormMap = {};
    vehicles.forEach(function (v) {
        if (!v || !v.vin) return;
        var n = normalizeVin(v.vin);
        if (n && !vehicleNormMap[n]) vehicleNormMap[n] = v.vin;
    });

    var logNormMap = {};
    try {
        var logs = safeJsonParse(localStorage.getItem(RING_VIN_SEARCH_DB_LOGS), []);
        logs.forEach(function (log) {
            if (!log || !log.vin) return;
            var n = normalizeVin(log.vin);
            if (n && !logNormMap[n]) logNormMap[n] = log.vin;
        });
    } catch (e) {
        /* ignore */
    }

    var ci;
    for (ci = 0; ci < candidates.length; ci++) {
        var norm = normalizeVin(candidates[ci]);
        if (!norm || norm.length < 8) continue;
        if (vehicleNormMap[norm]) {
            return { foundVin: vehicleNormMap[norm], matchedNormalized: norm, candidateIndex: ci };
        }
    }
    for (ci = 0; ci < candidates.length; ci++) {
        var normLog = normalizeVin(candidates[ci]);
        if (!normLog || normLog.length < 8) continue;
        if (logNormMap[normLog]) {
            return { foundVin: logNormMap[normLog], matchedNormalized: normLog, candidateIndex: ci };
        }
    }
    return null;
}

/**
 * OCR 失敗・未ヒット時に手入力 UI へ誘導
 * @param {{ message?: string, prefill?: string, toast?: boolean }} [opts]
 */
function ringVinSearchFocusManual_(opts) {
    opts = opts || {};
    var input = document.getElementById('vinInput');
    var errEl = document.getElementById('errorMsg');
    var msg = opts.message || '自動読み取りできませんでした。車台番号を手入力して検索してください。';

    if (opts.prefill && input) input.value = opts.prefill;
    if (errEl) {
        errEl.innerHTML = msg.replace(/\n/g, '<br>');
        errEl.style.display = 'block';
    }
    if (input) {
        input.focus();
        try { input.select(); } catch (e) { /* ignore */ }
    }
    if (opts.toast !== false && typeof showToast === 'function') {
        showToast('info', '手入力で車台番号を検索できます。');
    }
}

/**
 * 検索成功時に履歴画面へ遷移
 * @param {string|{ foundVin: string }} vinOrResult
 * @param {{ cached?: boolean }} [opts]
 */
function ringVinSearchNavigateToHistory_(vinOrResult, opts) {
    opts = opts || {};
    var vin = (vinOrResult && typeof vinOrResult === 'object')
        ? vinOrResult.foundVin
        : vinOrResult;
    if (!vin) return;
    var errEl = document.getElementById('errorMsg');
    if (errEl) errEl.style.display = 'none';
    var params = new URLSearchParams();
    params.set('vin', String(vin).trim());
    if (opts.cached) params.set('from', 'cache');
    location.href = 'factory_history.html?' + params.toString();
}

var ringFactoryVinSearchInFlight_ = false;

/** 工場検索ボタンの busy / 通常状態 */
function ringFactoryVinSearchSetButtonBusy_(busy) {
    var btn = document.getElementById('searchBtn');
    if (!btn) return;
    var defaultLabel = btn.getAttribute('data-default-label') || '🔍 検索する';
    if (!btn.getAttribute('data-default-label')) {
        btn.setAttribute('data-default-label', defaultLabel);
    }
    ringFactoryVinSearchInFlight_ = !!busy;
    btn.disabled = !!busy;
    btn.classList.toggle('search-btn--busy', !!busy);
    btn.style.opacity = busy ? '0.72' : '1';
    btn.style.transform = busy ? 'scale(0.97)' : '';
    btn.textContent = busy ? '🔄 検索中...' : defaultLabel;
}

function ringFactoryVinSearchShowStatus_(message, isError) {
    var el = document.getElementById('searchStatusMsg');
    if (!el) return;
    if (!message) {
        el.style.display = 'none';
        el.textContent = '';
        return;
    }
    el.style.display = 'block';
    el.textContent = message;
    el.style.color = isError ? 'var(--accent)' : 'var(--muted)';
}

function ringFactoryVinSearchResolveDisplayVin_(rawInput) {
    var s = String(rawInput || '').trim();
    if (!s) return '';
    if (typeof ringFormatVinDisplayValue_ === 'function') {
        return ringFormatVinDisplayValue_(s) || s.toUpperCase();
    }
    return s.toUpperCase();
}

function ringFactoryVinSearchIsValidInput_(rawInput) {
    var norm = typeof _normalize === 'function' ? _normalize(rawInput) : normalizeVin(rawInput);
    return !!(norm && norm.length >= 8);
}

/**
 * 工場・販売店: VIN 履歴検索（キャッシュ優先 / 未キャッシュ時は GAS 同期後に遷移）
 * @returns {Promise<'invalid'|'navigated_cache'|'success'|'empty'|'error'|'busy'>}
 */
async function runFactoryVinHistorySearch(rawInput) {
    if (ringFactoryVinSearchInFlight_) return 'busy';

    var errorMsg = document.getElementById('errorMsg');
    if (errorMsg) errorMsg.style.display = 'none';
    ringFactoryVinSearchShowStatus_('', false);

    var displayVin = ringFactoryVinSearchResolveDisplayVin_(rawInput);
    if (!displayVin) {
        if (errorMsg) {
            errorMsg.innerText = '車台番号を入力してください。';
            errorMsg.style.display = 'block';
        }
        return 'invalid';
    }
    if (!ringFactoryVinSearchIsValidInput_(displayVin)) {
        if (errorMsg) {
            errorMsg.innerHTML = '車台番号を正しく入力してください。<br>（8文字以上）';
            errorMsg.style.display = 'block';
        }
        return 'invalid';
    }

    var classify = typeof ringFactoryVinSearchClassifyFetch_ === 'function'
        ? ringFactoryVinSearchClassifyFetch_(displayVin)
        : { mode: 'cold_fetch', hadMaintenanceCache: false, shouldCountAsBillableFetch: true };

    if (classify.mode === 'cache_hit') {
        ringVinSearchNavigateToHistory_(displayVin, { cached: true });
        return 'navigated_cache';
    }

    ringFactoryVinSearchSetButtonBusy_(true);
    ringFactoryVinSearchShowStatus_('整備履歴を取得しています…', false);

    try {
        if (typeof navigator !== 'undefined' && navigator.onLine === false) {
            if (errorMsg) {
                errorMsg.innerText = '通信できませんでした。ネットワークを確認してください';
                errorMsg.style.display = 'block';
            }
            return 'error';
        }

        var syncFn = typeof syncMaintenanceHistoryForVin === 'function'
            ? syncMaintenanceHistoryForVin
            : null;
        if (!syncFn) {
            if (errorMsg) {
                errorMsg.innerText = '通信できませんでした。ネットワークを確認してください';
                errorMsg.style.display = 'block';
            }
            return 'error';
        }

        var syncResult = await syncFn(displayVin);
        if (!syncResult || syncResult.ok !== true) {
            if (errorMsg) {
                errorMsg.innerText = '通信できませんでした。ネットワークを確認してください';
                errorMsg.style.display = 'block';
            }
            return 'error';
        }

        var cacheKey = typeof ringFactoryVinSearchCacheKey_ === 'function'
            ? ringFactoryVinSearchCacheKey_(displayVin)
            : '';
        if (cacheKey && typeof ringSetPageSyncMeta_ === 'function') {
            ringSetPageSyncMeta_(cacheKey);
        }
        if (typeof ringFactoryVinSearchSetSyncMeta_ === 'function') {
            ringFactoryVinSearchSetSyncMeta_(displayVin, true);
        }

        var maintCount = typeof getMaintenanceLogsByVin === 'function'
            ? getMaintenanceLogsByVin(displayVin).length
            : 0;

        if (maintCount > 0) {
            if (typeof ringFactoryVinSearchSetFlash_ === 'function') {
                ringFactoryVinSearchSetFlash_(displayVin, 'success');
            }
            if (typeof showToast === 'function') {
                showToast('success', '整備履歴を取得しました');
            }
            ringFactoryVinSearchShowStatus_('', false);
            ringVinSearchNavigateToHistory_(displayVin, { synced: true });
            return 'success';
        }

        if (typeof ringFactoryVinSearchSetFlash_ === 'function') {
            ringFactoryVinSearchSetFlash_(displayVin, 'empty');
        }
        ringFactoryVinSearchShowStatus_('', false);
        ringVinSearchNavigateToHistory_(displayVin, { synced: true });
        return 'empty';
    } catch (eSearch) {
        if (errorMsg) {
            errorMsg.innerText = '通信できませんでした。ネットワークを確認してください';
            errorMsg.style.display = 'block';
        }
        return 'error';
    } finally {
        ringFactoryVinSearchSetButtonBusy_(false);
        ringFactoryVinSearchShowStatus_('', false);
    }
}
