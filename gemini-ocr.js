/**
 * 車検証画像 OCR（マイカー登録・管理車両登録共通）
 * PWA ➔ GAS プロキシ ➔ Gemini（APIキーは GAS スクリプトプロパティのみ）
 */
(function (global) {
    'use strict';

    /** GAS ルータ action（app.js の GAS_URL へ POST） */
    var RING_GEMINI_OCR_GAS_ACTION = 'ocr_gemini_shaken';
    /** Gemini OCR は応答が遅いため長め */
    var RING_GEMINI_OCR_TIMEOUT_MS = 90000;
    /** Gemini OCR 専用：長辺上限（超える場合のみ縮小、未満は拡大しない） */
    var MAX_IMAGE_SIZE = 1600;
    var RING_OCR_JPEG_QUALITY = 0.8;

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

    var RING_VEHICLE_TYPE_CANONICAL = ['普通', '小型', '軽自動車', '大型特殊', '小型特殊'];

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

    var RING_GEMINI_SHAKEN_PROMPT = `
日本の自動車検査証（車検証）の画像を解析し、指定されたJSONのみを返してください。

【取得ルール】
画像に印字されたラベル（項目名）を基準に、そのラベルに対応する値のみを取得してください。
各JSONキーには、そのラベルに対応する値のみを設定してください。
他のラベルの値を使用してはいけません。
判読できない場合のみ空文字列("")を返してください。

【ラベルとJSONキーの対応】
・車台番号 → vin（例: KE2FW-105890）
・型式 → model（例: LDA-KE2FW）
・原動機の型式 → engineModel
・初度登録年月 → firstRegistrationDate（YYYY-MM形式）
・有効期間の満了する日 → expiryDate（YYYY-MM-DD形式。記載なしは""）
・車名 → carName
・型式指定番号 → typeDesignationNumber
・類別区分番号 → classificationNumber
・自動車の種別 → vehicleType
・用途 → purpose
・自家用・事業用の別 → useCategory
・車体の形状 → bodyShape

【厳守：混同禁止】
「車台番号」「型式」「原動機の型式」は完全に独立した別項目です。
・車台番号の値を model に設定してはいけません。
・型式の値を vin に設定してはいけません。
・原動機の型式を他の項目へ設定してはいけません。
同一の値を複数のキーに設定することは絶対に禁止します。

【車台番号の文字認識ルール】
・車台番号は「車台番号」欄に印字されている文字を抽出してください。
・【重要】車台番号にはアルファベットの「I（アイ）」「O（オー）」「Q（キュー）」は絶対に使用されません。そのため以下の変換ルールを厳守してください。
 - 「I（アイ）」と読める場合は、必ず数字の「1」として出力してください。
 - 「O（オー）」または「Q（キュー）」と読める場合は、必ず数字の「0」として出力してください。
・また、以下の組み合わせも混同しやすいため特に注意して再確認してください。
 [ 5 と S ]、[ 2 と Z ]、[ 8 と B ]
・当てずっぽうな推測による置き換えは禁止ですが、上記の「I, O, Q」のルールのみ最優先で適用してください。
・判読できない文字がある場合は空文字列("")を返してください。

【出力形式】
以下のキーのみを持つ純粋なJSON文字列を出力してください。マークダウンや説明文は一切禁止します。
{
  "vin":"",
  "firstRegistrationDate":"",
  "expiryDate":"",
  "carName":"",
  "model":"",
  "engineModel":"",
  "typeDesignationNumber":"",
  "classificationNumber":"",
  "vehicleType":"",
  "purpose":"",
  "useCategory":"",
  "bodyShape":""
}
`;

    /**
     * Canvas API で JPEG 圧縮（Exif なし Base64）。Gemini OCR 送信専用。
     * @param {File|Blob} file
     * @returns {Promise<string>} raw base64（data: プレフィックスなし）
     */
    function ringOcrCompressImageToBase64_(file) {
        return new Promise(function (resolve, reject) {
            function encodeFromBitmap(bmp) {
                try {
                    var w = bmp.width;
                    var h = bmp.height;
                    var tw = w;
                    var th = h;
                    if (Math.max(w, h) > MAX_IMAGE_SIZE) {
                        var sc = MAX_IMAGE_SIZE / Math.max(w, h);
                        tw = Math.round(w * sc);
                        th = Math.round(h * sc);
                    }
                    var c = document.createElement('canvas');
                    c.width = tw;
                    c.height = th;
                    var ctx = c.getContext('2d');
                    if (!ctx) {
                        reject(new Error('CANVAS_CTX_FAIL'));
                        return;
                    }
                    ctx.drawImage(bmp, 0, 0, tw, th);
                    if (typeof bmp.close === 'function') bmp.close();
                    var dataUrl = c.toDataURL('image/jpeg', RING_OCR_JPEG_QUALITY);
                    var i = dataUrl.indexOf('base64,');
                    resolve(i >= 0 ? dataUrl.slice(i + 7) : '');
                } catch (e) {
                    reject(e);
                }
            }

            function fallbackImage() {
                var url = URL.createObjectURL(file);
                var img = new Image();
                img.onload = function () {
                    URL.revokeObjectURL(url);
                    encodeFromBitmap(img);
                };
                img.onerror = function () {
                    URL.revokeObjectURL(url);
                    reject(new Error('IMAGE_DECODE_FAIL'));
                };
                img.src = url;
            }

            if (typeof createImageBitmap === 'function') {
                createImageBitmap(file).then(encodeFromBitmap).catch(function () {
                    fallbackImage();
                });
            } else if (typeof document !== 'undefined') {
                fallbackImage();
            } else {
                reject(new Error('IMAGE_COMPRESS_UNAVAILABLE'));
            }
        });
    }

    function ringGeminiGetGasUrl_() {
        if (typeof GAS_URL !== 'undefined' && GAS_URL) return String(GAS_URL).trim();
        if (typeof global !== 'undefined' && global.__RING_GAS_URL__) {
            return String(global.__RING_GAS_URL__).trim();
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

    function ringGeminiNormalizeVehicleType_(raw) {
        var s = String(raw || '').trim();
        if (!s) return '';
        var compact = s.replace(/\s+/g, '');

        var exact = {
            '普通': '普通', '普通自動車': '普通',
            '普通乗用': '普通', '普通貨物': '普通', '普通乗合': '普通', '普通特種': '普通',
            '小型': '小型', '小型自動車': '小型',
            '小型乗用': '小型', '小型貨物': '小型', '小型乗合': '小型', '小型特種': '小型',
            '軽': '軽自動車', '軽四': '軽自動車', '軽自動車': '軽自動車',
            '大型特殊': '大型特殊', '大型特殊自動車': '大型特殊',
            '小型特殊': '小型特殊', '小型特殊自動車': '小型特殊'
        };
        if (exact[s]) return exact[s];
        if (exact[compact]) return exact[compact];
        if (RING_VEHICLE_TYPE_CANONICAL.indexOf(compact) >= 0) return compact;

        if (compact.indexOf('軽自動車') >= 0 || /^軽/.test(compact)) return '軽自動車';
        if (compact.indexOf('大型特殊') >= 0) return '大型特殊';
        if (compact.indexOf('小型特殊') >= 0) return '小型特殊';
        if (compact.indexOf('小型') >= 0) return '小型';
        if (compact.indexOf('普通') >= 0) return '普通';

        return '';
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
        if (kind === 'vehicleType') return ringGeminiNormalizeVehicleType_(raw);
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
        var s = (typeof sanitizeJsonResponse === 'function')
            ? sanitizeJsonResponse(text)
            : String(text || '').trim();
        if (!s) throw new Error('OCR_EMPTY_RESPONSE');

        if (typeof safeJsonParse === 'function') {
            var parsed = safeJsonParse(s, null);
            if (parsed === null) throw new Error('OCR_INVALID_JSON');
            return parsed;
        }

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

    /**
     * GAS プロキシへ OCR リクエスト（{ prompt, image } + action）
     * @param {string} prompt
     * @param {string} imageBase64
     * @returns {Promise<object>}
     */
    async function ringGeminiOcrShakenViaGas_(prompt, imageBase64) {
        var gasUrl = ringGeminiGetGasUrl_();
        if (!gasUrl) throw new Error('GAS_URL_MISSING');

        if (typeof ringEnsureAuthForOcr === 'function') {
            await ringEnsureAuthForOcr();
        }

        var payload = {
            action: RING_GEMINI_OCR_GAS_ACTION,
            prompt: prompt,
            image: imageBase64
        };

        var json;
        if (typeof sendToGAS_Safe === 'function') {
            json = await sendToGAS_Safe(RING_GEMINI_OCR_GAS_ACTION, {
                prompt: prompt,
                image: imageBase64
            }, { timeoutMs: RING_GEMINI_OCR_TIMEOUT_MS });
        } else if (typeof fetchJsonWithTimeout === 'function') {
            var authToken = typeof ringResolveActiveAuthToken === 'function'
                ? ringResolveActiveAuthToken() : '';
            if (authToken) payload.authToken = authToken;
            json = await fetchJsonWithTimeout(gasUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain' },
                body: JSON.stringify(payload)
            }, RING_GEMINI_OCR_TIMEOUT_MS);
            if (!json || json.success !== true) {
                throw new Error((json && json.error) || 'GAS_OCR_FAIL');
            }
        } else {
            throw new Error('GAS_CLIENT_UNAVAILABLE');
        }

        var raw = json.ocrResult != null ? json.ocrResult : json.data;
        if (typeof raw === 'string') raw = ringGeminiParseJsonText_(raw);
        if (!raw || typeof raw !== 'object') throw new Error('OCR_RESULT_INVALID');
        return raw;
    }

    async function ringGeminiOcrShaken(file) {
        var b64 = await ringOcrCompressImageToBase64_(file);
        if (!b64) throw new Error('IMAGE_ENCODE_EMPTY');

        try {
            var parsed = await ringGeminiOcrShakenViaGas_(RING_GEMINI_SHAKEN_PROMPT, b64);
            return ringGeminiNormalizeShakenResult_(parsed);
        } finally {
            b64 = null;
        }
    }

    global.OCR_FIELD_MAPPING = OCR_FIELD_MAPPING;
    global.RING_GEMINI_OCR_GAS_ACTION = RING_GEMINI_OCR_GAS_ACTION;
    global.ringGeminiOcrShaken = ringGeminiOcrShaken;
    global.ringGeminiEmptyShakenResult = ringGeminiEmptyShakenResult_;
    global.ringGeminiApplyToCarAddForm = ringGeminiApplyToCarAddForm;
    global.ringOcrCompressImageToBase64_ = ringOcrCompressImageToBase64_;
}(typeof window !== 'undefined' ? window : globalThis));
