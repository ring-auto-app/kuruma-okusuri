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
        : JSON.parse(localStorage.getItem(typeof DB_VEHICLES !== 'undefined' ? DB_VEHICLES : 'nappy_vehicles_v1') || '[]');

    var vehicleNormMap = {};
    vehicles.forEach(function (v) {
        if (!v || !v.vin) return;
        var n = normalizeVin(v.vin);
        if (n && !vehicleNormMap[n]) vehicleNormMap[n] = v.vin;
    });

    var logNormMap = {};
    try {
        var logs = JSON.parse(localStorage.getItem(RING_VIN_SEARCH_DB_LOGS) || '[]');
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
 * @param {{ foundVin: string }} result
 */
function ringVinSearchNavigateToHistory_(result) {
    if (!result || !result.foundVin) return;
    var errEl = document.getElementById('errorMsg');
    if (errEl) errEl.style.display = 'none';
    location.href = 'factory_history.html?vin=' + encodeURIComponent(result.foundVin);
}
