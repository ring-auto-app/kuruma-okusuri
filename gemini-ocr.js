/**
 * 車検証画像 → Gemini Flash OCR（マイカー登録・管理車両登録共通）
 * Phase 3: 元号分離日付UI連動・固定IDマッピング・正規化
 */
(function (global) {
    'use strict';

    var RING_GEMINI_MODEL = 'gemini-3-flash-preview';
    var RING_GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models/';

    /**
     * Gemini OCRキー → car_add.html 固定要素ID（曖昧なDOM探索禁止）
     * type: text | firstRegIso | expiryIso | select
     * 日付は hidden (inFirstReg / inExpiry) へ西暦を保持し、UI分解は car-add-date.js が担当
     */
    var OCR_FIELD_MAPPING = {
        vin:                     { elementId: 'inVin',           type: 'text' },
        firstRegistrationDate:   { elementId: 'inFirstReg',      type: 'firstRegIso' },
        expiryDate:              { elementId: 'inExpiry',        type: 'expiryIso' },
        carName:                 { elementId: 'inVehicleName',   type: 'text', normalize: 'carName' },
        model:                   { elementId: 'inModel',         type: 'text' },
        engineModel:             { elementId: 'inEngine',        type: 'text' },
        typeDesignationNumber:   { elementId: 'inTypeDesig',     type: 'text' },
        classificationNumber:    { elementId: 'inCategory',      type: 'text' },
        vehicleType:             { elementId: 'inClass',         type: 'select', normalize: 'vehicleType' },
        purpose:                 { elementId: 'inUsage',         type: 'select', normalize: 'purpose' },
        useCategory:             { elementId: 'inOwnerType',     type: 'select', normalize: 'useCategory' },
        bodyShape:               { elementId: 'inBodyShape',     type: 'select', normalize: 'bodyShape' }
    };

    var RING_GEMINI_SHAKEN_KEYS = Object.keys(OCR_FIELD_MAPPING);

    var RING_GEMINI_NORM_ALIASES = {
        purpose: {
            '乗用': '乗用', '乗用車': '乗用', '乗用自動車': '乗用',
            '貨物': '貨物', '貨物車': '貨物', '貨物用': '貨物', '貨物自動車': '貨物',
            '乗合': '乗合', '乗合車': '乗合', '乗合自動車': '乗合', 'バス': '乗合',
            '特種': '特種', '特種車': '特種', '特種自動車': '特種'
        },
        useCategory: {
            '自家用': '自家用', '自家用車': '自家用', '自家用自動車': '自家用',
            '事業用': '事業用', '事業用車': '事業用', '事業用自動車': '事業用',
            'レンタカー': 'レンタカー', 'レンタル': 'レンタカー', 'レンタル車': 'レンタカー'
        },
        vehicleType: {
            '軽自動車': '軽自動車', '軽': '軽自動車', '軽四': '軽自動車',
            '小型乗用': '小型乗用', '小型乗用車': '小型乗用',
            '小型貨物': '小型貨物', '小型貨物車': '小型貨物',
            '小型乗合': '小型乗合', '小型乗合車': '小型乗合',
            '小型特種': '小型特種', '小型特種車': '小型特種',
            '普通乗用': '普通乗用', '普通乗用車': '普通乗用',
            '普通貨物': '普通貨物', '普通貨物車': '普通貨物',
            '普通乗合': '普通乗合', '普通乗合車': '普通乗合',
            '普通特種': '普通特種', '普通特種車': '普通特種',
            '大型特殊': '大型特殊', '大型特殊自動車': '大型特殊',
            '小型特殊': '小型特殊', '小型特殊自動車': '小型特殊'
        },
        bodyShape: {
            'オートバイ': 'オートバイ', 'auto bike': 'オートバイ', 'autobike': 'オートバイ',
            '二輪': '二輪', '二輪車': '二輪', '2輪': '二輪', '二輪自動車': '二輪',
            '箱型': '箱型', '幌型': '幌型', 'ステーションワゴン': 'ステーションワゴン',
            'セダン': 'セダン', 'ハッチバック': 'ハッチバック', 'オープン': 'オープン',
            'ピックアップ': 'ピックアップ', 'バン': 'バン', 'その他': 'その他'
        }
    };

    var RING_GEMINI_CAR_NAME_BRANDS = {
        'TOYOTA': 'トヨタ', 'NISSAN': '日産', 'HONDA': 'ホンダ', 'MAZDA': 'マツダ',
        'SUBARU': 'スバル', 'SUZUKI': 'スズキ', 'MITSUBISHI': '三菱', 'DAIHATSU': 'ダイハツ',
        'LEXUS': 'レクサス', 'ISUZU': 'いすゞ', 'HINO': '日野', 'UD TRUCKS': 'UDトラックス',
        'MERCEDES-BENZ': 'メルセデス・ベンツ', 'BMW': 'BMW', 'VOLKSWAGEN': 'フォルクスワーゲン',
        'AUDI': 'アウディ', 'VOLVO': 'ボルボ', 'PEUGEOT': 'プジョー', 'CITROEN': 'シトロエン',
        'FORD': 'フォード', 'CHEVROLET': 'シボレー', 'JEEP': 'ジープ', 'LAND ROVER': 'ランドローバー',
        'MINI': 'ミニ', 'PORSCHE': 'ポルシェ', 'FERRARI': 'フェラーリ', 'LAMBORGHINI': 'ランボルギーニ'
    };

    var RING_GEMINI_SHAKEN_PROMPT =
        'この車両書類の画像から情報を抽出し、JSON形式で返してください。\n' +
        '- vin: 車台番号\n' +
        '- firstRegistrationDate: 初度登録年月（YYYY-MM形式）\n' +
        '- expiryDate: 有効期間の満了する日（YYYY-MM-DD形式。記載がない場合は空文字列）\n' +
        '- carName: 車名\n' +
        '- model: 型式\n' +
        '- engineModel: 原動機型式\n' +
        '- typeDesignationNumber: 型式指定番号\n' +
        '- classificationNumber: 類別区分番号\n' +
        '- vehicleType: 自動車の種別\n' +
        '- purpose: 用途\n' +
        '- useCategory: 自家用・事業用の別\n' +
        '- bodyShape: 車体の形状（『車体の形状』欄に注目し、『オートバイ』『二輪』などの記載があれば、その文字をそのまま抽出）\n' +
        '純粋なJSON文字列のみを出力すること。マークダウンや説明文は一切含めないでください。';

    function ringGeminiGetApiKey_() {
        if (typeof GEMINI_API_KEY === 'string' && GEMINI_API_KEY.trim()) {
            return GEMINI_API_KEY.trim();
        }
        return '';
    }

    function ringGeminiIsEmptyOcrValue_(v) {
        if (v == null) return true;
        var s = String(v).trim();
        return s === '' || s === '-' || s === '不明' || /^N\/A$/i.test(s);
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
            if (!ringGeminiIsEmptyOcrValue_(raw[k])) {
                base[k] = String(raw[k]).trim();
            }
        });
        return base;
    }

    function ringGeminiNormalizeCarName_(raw) {
        var s = String(raw || '').trim();
        if (!s) return '';
        Object.keys(RING_GEMINI_CAR_NAME_BRANDS).forEach(function (en) {
            s = s.replace(new RegExp('\\b' + en.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'gi'), RING_GEMINI_CAR_NAME_BRANDS[en]);
        });
        return s.trim();
    }

    function ringGeminiNormalizeAlias_(kind, raw) {
        var s = String(raw || '').trim();
        if (!s) return '';
        var table = RING_GEMINI_NORM_ALIASES[kind] || {};
        if (table[s]) return table[s];
        var compact = s.replace(/\s+/g, '');
        if (table[compact]) return table[compact];
        return s;
    }

    function ringGeminiNormalizeFieldValue_(kind, raw) {
        if (ringGeminiIsEmptyOcrValue_(raw)) return '';
        if (kind === 'carName') return ringGeminiNormalizeCarName_(raw);
        if (RING_GEMINI_NORM_ALIASES[kind]) return ringGeminiNormalizeAlias_(kind, raw);
        return String(raw).trim();
    }

    function ringGeminiSelectHasOption_(selectEl, value) {
        if (!selectEl || value == null || value === '') return false;
        return Array.prototype.some.call(selectEl.options, function (opt) {
            return opt.value === value;
        });
    }

    function ringGeminiGetElementByMapping_(mapping) {
        return document.getElementById(mapping.elementId);
    }

    function ringGeminiApplyTextField_(mapping, value) {
        var el = ringGeminiGetElementByMapping_(mapping);
        if (!el) return;
        el.value = value;
        el.dispatchEvent(new Event('input', { bubbles: true }));
    }

    function ringGeminiApplyFirstRegIso_(value) {
        if (!/^\d{4}-\d{2}$/.test(value)) return;
        if (typeof ringCarAddSetFirstRegFromIso === 'function') {
            ringCarAddSetFirstRegFromIso(value);
        }
    }

    function ringGeminiApplyExpiryIso_(value) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return;
        if (typeof ringCarAddSetExpiryFromIso === 'function') {
            ringCarAddSetExpiryFromIso(value);
        }
    }

    function ringGeminiApplySelectField_(mapping, value) {
        var el = ringGeminiGetElementByMapping_(mapping);
        if (!el) return;
        if (ringGeminiSelectHasOption_(el, value)) {
            el.value = value;
        } else {
            el.value = '';
        }
        el.dispatchEvent(new Event('change', { bubbles: true }));
    }

    /**
     * Gemini OCR 結果を car_add.html へ反映（空欄はスキップ・自動保存なし）
     * @param {object} rawResult
     * @returns {string[]} 反映した OCR キー一覧
     */
    function ringGeminiApplyToCarAddForm(rawResult) {
        var result = ringGeminiNormalizeShakenResult_(rawResult);
        var applied = [];
        var detailKeys = ['carName', 'model', 'engineModel', 'typeDesignationNumber', 'classificationNumber'];

        RING_GEMINI_SHAKEN_KEYS.forEach(function (key) {
            if (ringGeminiIsEmptyOcrValue_(result[key])) return;

            var mapping = OCR_FIELD_MAPPING[key];
            if (!mapping) return;

            var value = mapping.normalize
                ? ringGeminiNormalizeFieldValue_(mapping.normalize, result[key])
                : String(result[key]).trim();

            if (ringGeminiIsEmptyOcrValue_(value)) return;

            if (mapping.type === 'text') {
                if (key === 'vin') value = value.toUpperCase();
                ringGeminiApplyTextField_(mapping, value);
                applied.push(key);
            } else if (mapping.type === 'expiryIso') {
                ringGeminiApplyExpiryIso_(value);
                applied.push(key);
            } else if (mapping.type === 'firstRegIso') {
                ringGeminiApplyFirstRegIso_(value);
                applied.push(key);
            } else if (mapping.type === 'select') {
                ringGeminiApplySelectField_(mapping, value);
                applied.push(key);
            }
        });

        if (applied.some(function (k) { return detailKeys.indexOf(k) >= 0; })) {
            var det = document.getElementById('carDetailSection');
            if (det) det.open = true;
        }

        if (typeof ringCarAddUpdateSeirekiPreviews === 'function') ringCarAddUpdateSeirekiPreviews();
        if (typeof ringCarAddUpdateJibaisekiAlert === 'function') ringCarAddUpdateJibaisekiAlert();
        return applied;
    }

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

    global.OCR_FIELD_MAPPING = OCR_FIELD_MAPPING;
    global.ringGeminiOcrShaken = ringGeminiOcrShaken;
    global.ringGeminiShowOcrDebug = ringGeminiShowOcrDebug;
    global.ringGeminiEmptyShakenResult = ringGeminiEmptyShakenResult_;
    global.ringGeminiApplyToCarAddForm = ringGeminiApplyToCarAddForm;
}(typeof window !== 'undefined' ? window : globalThis));
