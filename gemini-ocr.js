/**
 * 車検証画像 → Gemini Flash OCR（マイカー登録・管理車両登録共通）
 * フォーム自動入力は行わず JSON 取得・デバッグ表示のみ。
 */
(function (global) {
    'use strict';

    var RING_GEMINI_MODEL = 'gemini-3-flash-preview';
    var RING_GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models/';

    var RING_GEMINI_SHAKEN_KEYS = [
        'vin',
        'firstRegistrationDate',
        'expiryDate',
        'carName',
        'model',
        'engineModel',
        'typeDesignationNumber',
        'classificationNumber',
        'vehicleType',
        'purpose',
        'useCategory'
    ];

    var RING_GEMINI_SHAKEN_PROMPT =
        'この車検証（自動車検査証）の画像から以下の情報を抽出してください。\n' +
        '返却形式は JSON のみ。\n' +
        'マークダウン、説明文、コードブロック、補足文章は一切出力しないこと。\n\n' +
        '出力形式：\n' +
        '{\n' +
        '"vin": "",\n' +
        '"firstRegistrationDate": "",\n' +
        '"expiryDate": "",\n' +
        '"carName": "",\n' +
        '"model": "",\n' +
        '"engineModel": "",\n' +
        '"typeDesignationNumber": "",\n' +
        '"classificationNumber": "",\n' +
        '"vehicleType": "",\n' +
        '"purpose": "",\n' +
        '"useCategory": ""\n' +
        '}\n\n' +
        '抽出ルール：\n' +
        '* vin = 車台番号\n' +
        '* firstRegistrationDate = 初度検査年月または初度登録年月（YYYY-MM形式へ変換）\n' +
        '* expiryDate = 有効期間の満了する日（YYYY-MM-DD形式へ変換）\n' +
        '* carName = 車名\n' +
        '* model = 型式\n' +
        '* engineModel = 原動機型式\n' +
        '* typeDesignationNumber = 型式指定番号\n' +
        '* classificationNumber = 類別区分番号\n' +
        '* vehicleType = 自動車の種別\n' +
        '* purpose = 用途\n' +
        '* useCategory = 自家用・事業用\n' +
        '※読み取れない場合は空文字列とする。';

    function ringGeminiGetApiKey_() {
        if (typeof GEMINI_API_KEY === 'string' && GEMINI_API_KEY.trim()) {
            return GEMINI_API_KEY.trim();
        }
        return '';
    }

    function ringGeminiEmptyShakenResult_() {
        var out = {};
        RING_GEMINI_SHAKEN_KEYS.forEach(function (k) { out[k] = ''; });
        return out;
    }

    function ringGeminiNormalizeShakenResult_(raw) {
        var base = ringGeminiEmptyShakenResult_();
        if (!raw || typeof raw !== 'object') return base;
        RING_GEMINI_SHAKEN_KEYS.forEach(function (k) {
            if (raw[k] != null && raw[k] !== '') {
                base[k] = String(raw[k]).trim();
            }
        });
        return base;
    }

    /** Gemini が稀に返す markdown / 前後テキストを除去して JSON をパース */
    function ringGeminiParseJsonText_(text) {
        var s = String(text || '').trim();
        if (!s) throw new Error('GEMINI_EMPTY_RESPONSE');

        var fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
        if (fence) s = fence[1].trim();

        try {
            return JSON.parse(s);
        } catch (e1) {
            var start = s.indexOf('{');
            var end = s.lastIndexOf('}');
            if (start >= 0 && end > start) {
                return JSON.parse(s.slice(start, end + 1));
            }
            throw e1;
        }
    }

    function ringGeminiExtractResponseText_(json) {
        var parts = json &&
            json.candidates &&
            json.candidates[0] &&
            json.candidates[0].content &&
            json.candidates[0].content.parts;
        if (!parts || !parts.length) {
            var block = json && json.promptFeedback && json.promptFeedback.blockReason;
            if (block) throw new Error('GEMINI_BLOCKED:' + block);
            throw new Error('GEMINI_NO_CANDIDATES');
        }
        return parts.map(function (p) { return p.text || ''; }).join('').trim();
    }

    /**
     * 車検証画像を Gemini Flash へ送信し、正規化済み JSON を返す
     * @param {File|Blob} file
     * @returns {Promise<object>}
     */
    async function ringGeminiOcrShaken(file) {
        var apiKey = ringGeminiGetApiKey_();
        if (!apiKey) throw new Error('GEMINI_API_KEY_MISSING');

        var b64;
        if (typeof fileToVisionBase64 === 'function') {
            b64 = await fileToVisionBase64(file, 2400);
        } else {
            b64 = await new Promise(function (resolve, reject) {
                var r = new FileReader();
                r.onload = function () {
                    var s = String(r.result || '');
                    var i = s.indexOf('base64,');
                    resolve(i >= 0 ? s.slice(i + 7) : '');
                };
                r.onerror = function () { reject(new Error('IMAGE_READ_FAIL')); };
                r.readAsDataURL(file);
            });
        }
        if (!b64) throw new Error('IMAGE_ENCODE_EMPTY');

        var url = RING_GEMINI_API_BASE + encodeURIComponent(RING_GEMINI_MODEL) +
            ':generateContent?key=' + encodeURIComponent(apiKey);

        var body = {
            contents: [{
                parts: [
                    { text: RING_GEMINI_SHAKEN_PROMPT },
                    { inline_data: { mime_type: 'image/jpeg', data: b64 } }
                ]
            }],
            generationConfig: {
                responseMimeType: 'application/json',
                temperature: 0.1
            }
        };

        var resp;
        try {
            resp = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
        } finally {
            b64 = null;
        }

        var json = await resp.json().catch(function () { return null; });
        if (!resp.ok) {
            var errMsg = (json && json.error && json.error.message) || ('HTTP_' + resp.status);
            throw new Error('GEMINI_API_ERROR:' + errMsg);
        }

        var text = ringGeminiExtractResponseText_(json);
        var parsed = ringGeminiParseJsonText_(text);
        return ringGeminiNormalizeShakenResult_(parsed);
    }

    /**
     * デバッグ領域へ JSON 表示（console.log も実行）
     * @param {object|null} result
     * @param {{ container?: HTMLElement, body?: HTMLElement, error?: string }} opts
     */
    function ringGeminiShowOcrDebug(result, opts) {
        opts = opts || {};
        var container = opts.container || document.getElementById('geminiOcrDebug');
        var bodyEl = opts.body || document.getElementById('geminiOcrDebugBody');
        if (!container || !bodyEl) return;

        if (opts.error) {
            console.error('[Gemini OCR]', opts.error, result || '');
            bodyEl.textContent = opts.error + (result ? '\n\n' + JSON.stringify(result, null, 2) : '');
            container.style.display = 'block';
            container.classList.add('gemini-ocr-debug--error');
            return;
        }

        console.log(result);
        bodyEl.textContent = JSON.stringify(result, null, 2);
        container.style.display = 'block';
        container.classList.remove('gemini-ocr-debug--error');
    }

    global.ringGeminiOcrShaken = ringGeminiOcrShaken;
    global.ringGeminiShowOcrDebug = ringGeminiShowOcrDebug;
    global.ringGeminiEmptyShakenResult = ringGeminiEmptyShakenResult_;
}(typeof window !== 'undefined' ? window : globalThis));
