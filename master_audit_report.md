# 車のお薬手帳 — UI/UX 監査レポート

## UI/UX 監査レポート (Opus)

**監査日:** 2026-06-21  
**対象:** B2B2C PWA「車のお薬手帳」（一般ユーザー / 整備工場 / 事業者・販売店）  
**監査方法:** コードベース静的レビュー（HTML / CSS / JS）  
**監査者:** UI/UX 監査エンジニア（Opus）

---

### 監査前提

- **ロール分離は意図的設計**として尊重する。工場の「5枠OCR」、販売店の「手入力・アコーディオンUI」、一般ユーザーの「車検証スキャン登録」など、機能差の統一提案は行わない。
- 改善案は **CSS 疑似コード** または **具体的な設定値** のみ提示する。本レポートではソースコードの直接書き換えは行わない。
- 評価対象の主要画面: `user_home.html`, `factory_home.html`, `dealer_home.html`, `factory_input.html`, `dealer_input.html`, `car_add.html`, `vehicles.html`, `common.css`, `app.js`, `theme.js`

---

### 優先度の定義

| 優先度 | 意味 |
|--------|------|
| **S** | 主要タスク（保存・登録）の成功率・誤操作に直結。最優先で対応 |
| **A** | 現場での操作ストレス・入力ミスリスクが高い。早期対応推奨 |
| **B** | ブランド統一感・認知負荷の改善。中期的に対応 |
| **C** | 文言・細部の揺れ。余力があれば対応 |

---

### 優先度サマリ（一覧）

| # | 指摘 | 該当ファイル | 優先度 |
|---|------|-------------|--------|
| 1 | 主要保存ボタン（`.save-btn`）のローカル CSS 上書きでデザインシステムと乖離 | `car_add.html`, `vehicle_info.html` | **S** |
| 2 | キーボード表示時、フォーカス中の入力欄が隠れる／保存ボタンが視界外になりうる | `common.css`, 各入力画面 | **A** |
| 3 | 入力欄の padding / border-radius がページ毎に不一致 | `factory_input.html`, `dealer_input.html`, `car_add.html`, `common.css` | **A** |
| 4 | `.ring-sticky-save-wrap` が `sticky` のみ（520px以下）で、親指圏内固定が弱い | `common.css` | **A** |
| 5 | iPhone SE（375px）で2カラム `.row` 内の date 入力が窮屈 | `common.css`, 入力画面 | **A** |
| 6 | トースト表示時間が短く（success 1500ms）、色のみで種別判別 | `app.js`, `common.css` | **B** |
| 7 | トースト位置 `bottom: 90px` が sticky 保存ボタンと近接し視認性低下 | `common.css` | **B** |
| 8 | 角丸（border-radius）の値が画面・コンポーネント毎に乱立 | 複数 HTML | **B** |
| 9 | ホーム画面のタイトルサイズ・body 余白・コンテナ幅がロール間で不統一 | `user_home.html`, `factory_home.html`, `dealer_home.html` | **B** |
| 10 | 保存ボタン文言・戻るリンク字形の揺れ | 入力画面群 | **C** |
| 11 | 一般ユーザーの車両登録導線が home → vehicles → 追加の2タップ | `user_home.html`, `vehicles.html` | **C**（意図確認） |
| 12 | 管理者ダッシュボードが別デザイン体系（意図的分離） | `admin_dashboard.html` | —（対象外） |

---

### 良い点（維持推奨）

1. **デザイントークンが `common.css` に集約**されている（`--tap-min: 44px`, `--tap-primary: 56px`, `--font-primary: 18px` 等）。Apple HIG / WCAG 2.5.5 を意識した設計。
2. **入力 font-size: 16px** により iOS の自動ズームを回避。viewport に `user-scalable=no` を付けていない（アクセシビリティ良好）。
3. **保存前確認モーダル**（`showRingSaveConfirm`）＋ PII 警告で誤登録防止。`visualViewport` 連動でモーダル高さをキーボードに合わせる実装あり（`app.js` 2616–2624）。
4. **保存完了スプラッシュ**（`ring-saved-splash`）、**経過秒付きローディング**、**OCR オーバーレイ**など、重い処理のフィードバックは充実。
5. **工場・販売店ホームから入力画面まで1タップ**の導線は現場向けとして優秀。
6. **safe-area-inset** 対応（`env(safe-area-inset-*)`）がトースト・モーダル・sticky 保存に反映済み。

---

## 1. スマホ操作の最適化

### 1-1. 保存ボタンが親指の範囲内か（フッター固定等）

**現状**

- 主要入力画面（`factory_input.html`, `dealer_input.html`, `car_add.html`, `inspection_user.html`, `inspection_biz.html`）は `.ring-sticky-save-wrap` で保存ボタンをラップしている。
- ただし `common.css` 295–304 行では **`position: sticky`**（`fixed` ではない）かつ **`@media (max-width: 520px)` のみ** 有効。
- 520px 超（例: iPad 縦・一部 Android）や、フォームが短い場合は保存ボタンが通常フローに戻り、スクロール末尾まで到達が必要。
- `car_add.html` の `.save-btn` はローカル CSS で `max-width` 未指定のため、他画面（`common.css` の `max-width: 400px` 中央寄せ）と見た目・タップ位置が異なる。

**該当箇所**

- `common.css` 282–304（`.save-btn`, `.ring-sticky-save-wrap`）
- `factory_input.html` 282–284
- `dealer_input.html` 212–214
- `car_add.html` 153–158, 379–384

**改善案（CSS 疑似コード）**

```css
/* common.css — sticky を「親指圏内フッター」に強化 */
@media (max-width: 520px) {
  .ring-sticky-save-wrap {
    position: fixed;           /* sticky → fixed */
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 35;
    padding: 10px 16px calc(12px + env(safe-area-inset-bottom, 0px));
    margin-top: 0;
    background: linear-gradient(180deg, rgba(247,243,234,0) 0%, var(--page-bg) 28%);
    box-shadow: 0 -4px 16px rgba(0,0,0,0.06);
  }
  /* 固定フッター分のスクロール余白 */
  body.ring-has-sticky-save {
    padding-bottom: calc(88px + env(safe-area-inset-bottom, 0px));
  }
  .ring-sticky-save-wrap .save-btn {
    max-width: 400px;
    margin: 0 auto;
  }
}
```

**優先度:** **A**

---

### 1-2. キーボードで入力欄が隠れないか

**現状**

- `visualViewport` API は **保存確認モーダル**（`showRingSaveConfirm`）と **OCR モーダル**の高さ調整にのみ使用。通常フォーム入力の `focus` 時に `scrollIntoView` する共通処理は無い。
- iOS Safari ではソフトキーボード表示時、`position: sticky` の保存ボタンがキーボード裏に隠れることがある。
- `input[type="date"]` の2カラム配置（`.row` grid）では、375px 幅でカレンダーアイコン＋日付文字列が窮屈になり、タップミスが起きやすい。

**該当箇所**

- `app.js` 2570–2631（`ringAttachVisualViewportCard`, `showRingSaveConfirm`）
- `common.css` 165–204（`.row` 2カラム grid）
- `factory_input.html`, `dealer_input.html`（作業日・車検満了日の2カラム）

**改善案（CSS + 動作仕様）**

```css
/* iPhone SE 等 — 狭幅では date 行を1カラムに */
@media (max-width: 390px) {
  .card .row,
  .basic-info-card .row,
  .row:has(> .field) {
    grid-template-columns: 1fr;
    gap: 8px;
  }
}
```

```javascript
/* app.js — 共通 focus ハンドラ（疑似コード・設定値のみ） */
document.addEventListener('focusin', (e) => {
  if (!e.target.matches('input, select, textarea')) return;
  setTimeout(() => {
    e.target.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, 300); /* iOS キーボードアニメーション待ち: 280–350ms */
});
```

**優先度:** **A**

---

### 1-3. iPhone SE サイズ（375×667）でも崩れないか

**現状**

- 全 HTML で `viewport-fit=cover` と safe-area 対応あり（良好）。
- `user_home.html` は `.container { max-width: 520px }`、他画面は `600px` と幅基準が異なる。
- `user_home.html` の `body { padding-bottom: 120px }`、`factory_home.html` / `car_add.html` は `100px`、`dealer_home.html` / `common.css` は `68px` と、**下部余白がロール・画面毎にバラバラ**。sticky/fixed 保存導入時にコンテンツが隠れるリスク。
- 和暦セレクト（`.first-reg-wareki-row`）は `common.css` で flex 分割済みだが、`car_add.html` の `.era-date-box` は `font-size: 18px; padding: 10px 6px` と他入力画面（16px / 8px）より大きく、375px で横スクロールや折り返しの余地が少ない。

**該当箇所**

- `user_home.html` 42–46
- `factory_home.html` 31
- `dealer_home.html` 33
- `car_add.html` 20, 54–57
- `common.css` 41–51

**改善案（CSS 疑似コード）**

```css
:root {
  --page-padding-bottom: calc(80px + env(safe-area-inset-bottom, 0px));
  --container-max: 600px;
}

body {
  padding-bottom: var(--page-padding-bottom);
}

.container {
  max-width: var(--container-max);
}

/* car_add — era 入力を common トークンに合わせる */
.era-date-box input,
.era-date-box select {
  font-size: 16px;      /* 18px → 16px */
  padding: 8px 6px;     /* 10px → 8px */
  min-height: var(--tap-min); /* 44px */
}
```

**優先度:** **B**（余白統一）、**A**（era 入力の SE 対応）

---

## 2. 作業ステップの最短化

### 2-1. 各ロールの目的達成までの導線

**現状（タップ数）**

| ロール | 主要ゴール | 導線 | タップ数 | 評価 |
|--------|-----------|------|---------|------|
| 工場 | 整備履歴入力 | home → 整備履歴入力 | **1** | 良好 |
| 販売店 | 販売・点検記録入力 | home → 販売・点検記録入力 | **1** | 良好 |
| 一般ユーザー | 車両新規登録 | home → マイカー → ＋新規登録 | **2** | 許容範囲 |
| 全ロール | 保存完了 | 保存ボタン → 確認モーダル → 確定 | **+1** | PII 保護のため妥当 |

**該当箇所**

- `factory_home.html` 89（整備履歴入力リンク）
- `dealer_home.html` 87（販売・点検記録入力リンク）
- `user_home.html` 216–224（マイカーカード）
- `app.js` 2588–2631（`showRingSaveConfirm`）

**改善案（UX 仕様・ロール分離を維持）**

- **一般ユーザー home に「＋ 車両を登録」ショートカットを追加**（`vehicles.html` 経由を省略）。工場・販売店 home には追加しない。
- 保存確認モーダルは維持。代わりに **必須4項目（VIN・作業日・車検満了日・整備区分）が未入力の場合のみ** 保存ボタンを `disabled` + 視覚的ヒント（`:disabled { opacity: 0.5 }` は既存）で事前ブロックし、無意味なモーダル表示を減らす。

```css
/* 必須未入力時 — 保存ボタン上にインライン警告 */
.ring-sticky-save-wrap[data-invalid="true"]::before {
  content: "必須項目（VIN・作業日・車検満了日・整備区分）を入力してください";
  display: block;
  font-size: 12px;
  font-weight: 800;
  color: #b45309;
  text-align: center;
  margin-bottom: 8px;
}
```

**優先度:** **C**（home ショートカット）、**B**（必須未入力の事前ブロック）

---

### 2-2. 工場 OCR フロー（5枠）のステップ数

**現状**

- `factory_input.html` では請求書・見積書 OCR が5スロット UI（`gemini-invoice-ocr.js`）で、撮影 → 読み込み → レビュー → フォーム反映 → 保存確認と段階が多い。
- これは **意図的な安全設計**（複数枚・PII・誤読修正）であり、統一・短縮の提案対象外。

**優先度:** —（対象外）

---

### 2-3. 販売店アコーディオン UI のステップ数

**現状**

- `dealer_input.html` は `.parent-btn` / `.toggle-btn` による6セクションのアコーディオン。手入力前提の情報量を整理する意図的設計。
- 保存確認は工場より簡略（VIN 最終確認のみ）で、販売店向けに **1ステップ少ない**（妥当）。

**優先度:** —（対象外）

---

## 3. 視覚的統一感

### 3-1. 主要保存ボタン（`.save-btn`）のローカル上書き — **S**

**現状**

| ファイル | border-radius | font-size | min-height | max-width |
|----------|---------------|-----------|------------|-----------|
| `common.css`（基準） | **999px** | **18px** | **56px** | **400px** |
| `car_add.html` 153–158 | **14px** | **17px** | なし | なし |
| `vehicle_info.html` 134–138 | **14px** | **17px** | なし | なし |
| `inspection_user.html` 89–92 | 999px | 18px | なし | 400px |

同一クラス名 `.save-btn` なのに **見た目が画面毎に異なる**。ユーザーが「登録」「保存」という最重要操作で一貫した muscle memory を築けない。

**改善案（CSS 疑似コード）**

```css
/* car_add.html / vehicle_info.html — ローカル .save-btn ブロックを削除し common.css に委譲 */

/* もしページ固有の調整が必要なら、上書きではなく修飾クラスを使う */
.save-btn.save-btn--full-width {
  max-width: 100%; /* 例: 車両詳細のみ全幅 */
}

/* 禁止: border-radius: 14px; font-size: 17px; padding: 18px; のローカル定義 */
```

**優先度:** **S**

---

### 3-2. 入力欄の padding / border-radius / 高さ

**現状**

| ソース | padding | border-radius | min-height |
|--------|---------|---------------|------------|
| `common.css` 118–125 | **12px 14px** | **10px** | **44px** |
| `factory_input.html` 118 | **8px 10px** | 10px | 44px |
| `car_add.html` 40–47 | **8px 10px** | **12px** | 44px |
| `dealer_input.html` | common 準拠（ページ `<style>` なし） | — | — |

工場・ユーザー登録画面だけ入力欄が **視覚的に「小さく」** 見え、タップ領域の体感が販売店画面と異なる。

**改善案（CSS 疑似コード）**

```css
/* factory_input.html / car_add.html のページ内 input 上書きを削除 */

/* 全画面 common.css に統一 */
input[type="text"],
input[type="number"],
input[type="date"],
select,
textarea {
  padding: 12px 14px;       /* 8px 10px → 12px 14px */
  border-radius: 10px;      /* 12px → 10px（car_add） */
  min-height: var(--tap-min); /* 44px 維持 */
  font-size: 16px;
}
```

**優先度:** **A**

---

### 3-3. 角丸（border-radius）の乱立

**現状（値の例）**

| コンポーネント | border-radius | ファイル |
|---------------|---------------|----------|
| 主要保存ボタン（common） | 999px | `common.css` |
| 主要保存ボタン（car_add 上書き） | 14px | `car_add.html` |
| OCR / スキャンボタン | 14px / 16px | `factory_input.html`, `car_add.html` |
| 写真追加ボタン | 12px | 入力画面群 |
| ホーム menu カード | 16px | `factory_home.html`, `dealer_home.html` |
| note-card（ユーザー home） | 18px 18px 0 18px | `user_home.html` |
| 確認モーダル | 16px | `common.css` `.ring-save-confirm__card` |

**改善案（CSS トークン拡張）**

```css
:root {
  --radius-sm: 10px;   /* 入力欄・小ボタン */
  --radius-md: 12px;   /* カード・photo-btn */
  --radius-lg: 16px;   /* menu-card・モーダル */
  --radius-pill: 999px; /* 主要 CTA（= --btn-radius） */
  --radius-note: 18px 18px 0 18px; /* 付箋カード専用（ユーザー home のみ） */
}

/* 例: .photo-btn { border-radius: var(--radius-md); } */
/* 例: .menu-item { border-radius: var(--radius-lg); } */
```

**優先度:** **B**

---

### 3-4. タイトル・余白・コンテナ幅のロール間揺れ

**現状**

| 画面 | タイトル font-size | body padding-bottom | container max-width |
|------|-------------------|---------------------|---------------------|
| `user_home.html` | **26px** | **120px** | **520px** |
| `factory_home.html` | 24px | **100px** | 600px |
| `dealer_home.html` | **28px**（`.page-title`） | 68px | 600px |
| `common.css` 基準 | 24px（`.title`） | **68px** | **600px** |

**改善案（CSS 疑似コード）**

```css
:root {
  --title-size: 24px;
  --title-size-home: 26px; /* home のみ許容する差分 */
}

.title, .page-title {
  font-size: var(--title-size);
}

/* user_home / dealer_home の page-title のみ */
.page-title--home {
  font-size: var(--title-size-home);
}
```

**優先度:** **B**

---

### 3-5. 戻るリンク・保存ラベルの文言揺れ

**現状**

- 戻る: `≪戻る`（factory / car_add） vs `◁ 戻る`（dealer_input） vs `◁ 履歴へ戻る`（inspection_user）
- 保存: `内容を確認して登録`（factory / car_add） vs `確定して保存`（dealer） vs `点検結果を保存する`（inspection_biz）

ロール差は許容するが、**同一ロール内・同一操作種別**では統一が望ましい。

**改善案（文言ガイド・コード変更なし）**

| 操作 | 推奨ラベル |
|------|-----------|
| 戻る（入力画面） | `◁ 戻る`（統一字形） |
| 整備・車両の保存（確認前） | `内容を確認して登録` |
| 販売店の保存（確認前） | `内容を確認して保存`（「確定」と「確認」の混在を解消） |
| 点検保存 | `点検結果を保存する`（現状維持） |

**優先度:** **C**

---

## 4. フィードバック視認性

### 4-1. トースト通知の視認性

**現状**

- `showToast(type, message, duration)` は **単一 DOM 要素 `#ring-toast` を使い回し**。連続エラー時に前のメッセージが上書きされる。
- 表示時間: error **3500ms**, warning **2800ms**, success/info **1500ms**（`app.js` 4471–4472）。success 1500ms は現場（手袋・屋外）では **読み切れない** 可能性。
- 種別は **背景色のみ**（緑/赤/青/黄）。アイコン・プレフィックス文字なし。色覚多様性への配慮が弱い。
- 位置: `bottom: calc(90px + safe-area)`（`common.css` 592）。sticky 保存ボタン直上と重なり、**保存成功トーストが保存ボタンに隠れる**。

**該当箇所**

- `app.js` 4471–4486
- `common.css` 590–616

**改善案（CSS 疑似コード + 設定値）**

```css
.ring-toast {
  bottom: calc(120px + env(safe-area-inset-bottom, 0px)); /* 90px → 120px */
  padding: 14px 20px;
  font-size: 15px;           /* 14px → 15px */
  line-height: 1.4;
  max-width: min(92vw, 380px);
}

/* 種別を色 + アイコンで二重化 */
.ring-toast--success::before { content: "✓ "; }
.ring-toast--error::before   { content: "✕ "; }
.ring-toast--warning::before { content: "⚠ "; }
.ring-toast--info::before    { content: "ℹ "; }

/* 色覚対応: 左ボーダー accent */
.ring-toast--error {
  border-left: 4px solid #fef2f2;
  padding-left: 16px;
}
```

```javascript
/* app.js — 表示時間の推奨値 */
const TOAST_DURATION = {
  error:   4000,  /* 3500 → 4000 */
  warning: 3200,  /* 2800 → 3200 */
  success: 2500,  /* 1500 → 2500 */
  info:    2200,  /* 1500 → 2200 */
};
```

**優先度:** **B**

---

### 4-2. 保存完了フィードバック

**現状**

- `ring-saved-splash` フルスクリーン演出（z-index: 12000）＋ 短いバイブレーション。視認性は **高い**。
- オフライン保存時は queued 表示（黄色 orb）で状態区別あり（良好）。

**改善案**

- 現状維持。追加するなら **queued 時のみ** トーストでも「通信復帰後に自動送信」と二重通知（duration: 3000ms）。

**優先度:** **C**

---

### 4-3. エラー時のモーダル・インライン表示

**現状**

- VIN エラー、必須項目エラーは `#vinError` 等の **インライン赤文字**（`font-size: 12px`）で表示。フォーム上部の VIN 欄付近に限定され、**スクロール位置によって見落とし**やすい。
- OCR 失敗は toast + `ringReportOcrAbort_` で console / 監視ログ連携（良好）。
- 保存確認モーダルの PII 警告（`.ring-save-confirm__pii-warn`）は赤枠＋太字で視認性高い（良好）。

**改善案（CSS 疑似コード）**

```css
/* インラインエラーをフィールド直下で強調 */
.field-error {
  font-size: 13px;           /* 12px → 13px */
  font-weight: 800;
  color: #dc2626;
  background: #fef2f2;
  border-radius: 8px;
  padding: 6px 10px;
  margin-top: 6px;
  border-left: 3px solid #dc2626;
}

/* 最初のエラー項目へ scrollIntoView（JS 疑似コード） */
/* validate 失敗時: document.querySelector('.field-error')?.scrollIntoView({ block: 'center' }); */
```

**優先度:** **B**

---

### 4-4. ローディングオーバーレイ

**現状**

- 6秒経過で「通信確認中…」、15秒で「時間がかかっています…」と **段階的メッセージ**（`app.js` 4430–4436）。現場向けとして優秀。
- キャンセルボタンあり（OCR 等長時間処理向け）。

**優先度:** —（良好・維持）

---

## 推奨対応ロードマップ

### Phase 1（S — 即時）

1. `car_add.html` / `vehicle_info.html` の `.save-btn` ローカル CSS 上書きを撤廃し、`common.css` トークンに統一。

### Phase 2（A — 1スプリント）

2. 入力欄 padding / border-radius を `common.css` 基準にページ上書き削除。  
3. `.ring-sticky-save-wrap` を narrow viewport で `fixed` 化 + body 下部余白トークン化。  
4. キーボード表示時の `focusin` → `scrollIntoView` 共通処理追加。  
5. 375px 以下で date 2カラム → 1カラム化。

### Phase 3（B — 2スプリント）

6. トースト表示時間・位置・アイコン prefix の改善。  
7. `--radius-*` トークン導入とコンポーネント角丸の整理。  
8. タイトルサイズ・body padding-bottom のトークン統一。  
9. インラインエラーの視認性強化。

### Phase 4（C — 余力）

10. 戻るリンク字形・保存ラベル文言のスタイルガイド化。  
11. 一般ユーザー home への車両登録ショートカット（任意）。

---

## 付録: 参照ファイル一覧

| 種別 | パス |
|------|------|
| 共通スタイル | `common.css` |
| 共通 JS | `app.js`, `theme.js` |
| 一般ユーザー | `user_home.html`, `car_add.html`, `vehicles.html`, `inspection_user.html` |
| 工場 | `factory_home.html`, `factory_input.html`, `inspection_biz.html` |
| 販売店 | `dealer_home.html`, `dealer_input.html` |
| 車両詳細 | `vehicle_info.html` |
| 管理者（別体系・本監査対象外） | `admin_dashboard.html` |

---

*本レポートはコードベース静的監査に基づく。実機（iPhone SE / 14 Pro Max、Android 中端末）でのタップテスト・キーボード挙動確認を Phase 2 前に実施することを推奨する。*

---

## システム破壊検査レポート (GPT)

**監査日:** 2026-06-21  
**監査種別:** 静的解析（フロントエンド + GAS）— 破壊検査（クラッシュ・タイムアウト・データ破損）  
**監査者:** QA エンジニア（GPT）  
**方針:** 修正コードは記載しない。危険箇所は **優先度（S/A/B）・ファイル・関数名・行番号** で特定する。

---

### ランク定義

| 優先度 | 意味 |
|--------|------|
| **S** | システム全体または主要機能が停止・データ破損・重複送信など、即時対応必須 |
| **A** | 特定機能の不全、タイムアウト、リソース枯渇、同時実行競合の高リスク |
| **B** | 影響は限定的、または既存防御あり。改善推奨 |

---

### 優先度サマリ（一覧）

| # | 指摘 | ファイル / 関数 | 行目（目安） | 優先度 |
|---|------|----------------|-------------|--------|
| 1 | フロント多数画面で `JSON.parse(localStorage...)` が try-catch 未保護 | 各 HTML / `vin-search.js` 等 | 下表参照 | **S** |
| 2 | GAS 全読取処理が列番号直指定（`row[n]`）— 列挿入で全機能不整合 | `ads/gas-complete-Code.gs` 全体 | 多数 | **S** |
| 3 | 車検リマインドの送信済みフラグが固定16列 — 列ズレで重複送信 | `checkAndSendCarInspectionReminders` | 1563–1616 | **S** |
| 4 | `Staff` シート不存在時に null 参照で GAS 500 | `processGetStaff` 他 | 3227–3284 | **S** |
| 5 | `doPost` 入口の `e.postData` 未定義時の TypeError | `doPost` | 1880–1882 | **A** |
| 6 | 登録・スタッフ系書き込みに LockService なし — 同時実行で重複行 | `processUserRegister` 等 | 2061–3350 | **A** |
| 7 | 管理者ダッシュボード等の `getDataRange()` 全件読み — 6分/GAS タイムアウト | `loadAdminFilterData_` 等 | 943–1022, 1400+ | **A** |
| 8 | GAS 側 Gemini/Vision `UrlFetchApp.fetch` にクライアント側以上の時間上限なし | `processGeminiOcrShaken` / `processOcrInvoice` / `callVisionDocumentText_` | 2647–3010 | **A** |
| 9 | 5枠 OCR の Base64 最大5枚常時保持 — ページ長時間滞在でメモリ肥大 | `gemini-invoice-ocr.js` | 11–44, 328–333 | **A** |
| 10 | `processCorrectLog` の `setRange` 第3引数が行数 `1`（仕様上は正しいが可読性・誤修正リスク） | `processCorrectLog` | 2541–2557 | **B** |
| 11 | `safeJsonParse` 存在するが主要画面未使用 | `app.js` | 166–176 vs 各 HTML | **B** |
| 12 | 主要保存系は LockService 実装済み | `processVehicleData` 等 | 2196, 2428, 3051 | **B（良好）** |
| 13 | 5枠 UI の object URL は削除時 revoke 済み | `gemini-invoice-ocr.js` | 23–27, 331 | **B（良好）** |
| 14 | `fetchJsonWithTimeout` / OCR 120秒タイムアウト | `app.js` / `gemini-invoice-ocr.js` | 1981–2046, 190–191 | **B（良好）** |

---

## Sランク監査：システム全体が停止するバグ

### S-1. JSON 破損・欠損耐性（フロント）

**現状**

- `app.js` に `safeJsonParse(str, fallback)`（166–176行）があり、破損 JSON を退避キーに保存する設計は存在する。
- しかし **主要画面の大半が `safeJsonParse` を使わず、生の `JSON.parse(localStorage.getItem(...))` を DOMContentLoaded や保存処理内で直接実行**している。localStorage が手動編集・同期破損・古いバージョン混在で invalid になると **SyntaxError で当該ページの JS が以降一切実行されない（白画面）**。

**危険箇所（try-catch 未保護の代表例）**

| ファイル | 行番号（目安） | 文脈 |
|----------|---------------|------|
| `factory_input.html` | 319, 322, 348, 471, 550 | ログ・車両・保存前読込 |
| `dealer_input.html` | 247, 250, 275, 291 | 同上 |
| `vehicle_info.html` | 338, 367, 375, 523, 616 | プロファイル・車両一覧 |
| `car_add.html` | 391, 589 | プロファイル・車両リスト |
| `daily_history_detail.html` | 225 | `loadLocalDetail()` 内 `JSON.parse(rawData)` |
| `vehicles.html` | 124, 216 | プロファイル・全車両 |
| `inspection_user.html` | 136, 313, 319 | 点検データ |
| `inspection_biz.html` | 147, 310, 429 | 点検データ |
| `history_detail.html` | 49–50 | ログ2キー連続 parse |
| `theme.js` | 64 | **try-catch あり（良好）** — 対照例 |
| `vin-search.js` | 168 | `loadVehicles` 未使用時の fallback parse（179行は try-catch あり） |
| `admin_dashboard.html` | 823 | `safeParseJsonArray_` 内のみ保護（専用ヘルパ） |

**GAS 側**

| ファイル | 関数 | 行番号 | 評価 |
|----------|------|--------|------|
| `ads/gas-complete-Code.gs` | `doPost` | 1882 | 外側 try-catch で `{ success: false }` 返却 — **API 全体停止は回避** |
| 同上 | `callVisionDocumentText_` | 2654 | `JSON.parse(resp.getContentText())` — **try-catch なし**。呼び出し元 `processOcrVinSearch` 1881–1845 は try-catch で包む |
| 同上 | `processGeminiOcrShaken` | 2852 | `JSON.parse(respText)` — 関数内 try-catch（2827–2876）で `{ success: false }` |
| 同上 | `processOcrInvoice` | 3006 | 同上 |
| 同上 | `parseGeminiOcrJsonText_` | 2778–2783 | 内側 try-catch あり |
| 同上 | `classifyOcrLogDocType_` / `buildHistoryActivityLabel_` | 1132, 1163 | try-catch あり |

**影響:** フロントの localStorage 1件破損で **入力画面・履歴画面が白画面化（S）**。GAS OCR は機能失敗止まり（A 未満）。

---

### S-2. GAS 列ズレ耐性（ハードコード列 index）

**現状**

- `ensureHistoryEventsHeaders_` / `ensureVehicleHeaders_` 等で **ヘッダ行の補完**はあるが、**データ読取はほぼ全て `rows[i][n]` 固定添字**。スプレッドシートに列挿入・列順変更・手動編集があると、**サイレントに誤データ参照**（クラッシュしないがデータ破壊級）。

**危険箇所（代表）**

| 関数 | 行番号 | 固定参照の意味 |
|------|--------|----------------|
| `checkAndSendCarInspectionReminders` | 1555–1564, 1616 | VIN=0, 車検=4, userId=6, shopId=7, **送信済み=15（P列）** |
| `processSearchHistoryEvents` | 1043–1056 | VIN=1, works=16, parts=17, document=15 |
| `loadAdminFilterData_` | 822–832, 844–872 | 車名=16/14, 初度登録=14, shop種別=6, 住所=9 |
| `processLoginBusinessByEmail_` | 1796–1805 | loginEmail=11, password=2, shopType=6 |
| `processLoginUserByEmail_` | 1772–1782 | password=4, email=13/10 |
| `processLogData` / `processCorrectLog` | 2464–2482, 2520–2557 | History_Events 全列固定 |
| `processVehicleData` | 2240–2257, 2223–2230 | Vehicles 17列固定 |
| `processGetDailyHistory` | 3204–3212 | Daily_Inspections 列固定 |
| `processGetStaff` | 3234–3240 | Staff: loginId=0, shopId=1, role=4 |
| `emailForUserId`（リマインド内） | 1533–1536 | users email=13/10, LINE=11 |

**影響:** 列1つズレで **車検リマインド重複送信・誤メール・管理統計の全滅（S）**。`indexOf` / ヘッダ名マップによる動的解決が未実装。

---

### S-3. 車検通知バッチ — 重複送信（列固定 + フラグ语义）

**関数:** `checkAndSendCarInspectionReminders`（`ads/gas-complete-Code.gs` 1514–1621）

| 行 | 内容 | リスク |
|----|------|--------|
| 1551–1552 | `LockService.getScriptLock()` + `waitLock(30000)` | 同時トリガー競合は **緩和済み** |
| 1563–1564 | `values[i][15]` が空でなければ skip | **16列目（0-index 15）= リマインド送信済み** 固定 |
| 1612–1616 | LINE/メール成功後のみ `vsh.getRange(i + 1, 16).setValue(...)` | 送信成功とフラグ書込の間にプロセス落ちると **再送の余地**（稀） |
| 1524–1526 | `Vehicles` / `users_v1` 不存在時は `return` | シート欠落は **静かにスキップ**（通知ゼロ） |

**S 判定理由:** Vehicles シートの列構成が `ensureVehicleHeaders_` と実運用でズレると、**フラグ列が別用途のデータを読む → 全車両に再送 or 永続未送信**。

---

### S-4. シート不存在 — Staff 系の null 参照

**現状:** `processRegisterShop`（2099–2106）は `if (staffSheet)` でガード。**読取・更新系4関数はガードなし。**

| 関数 | 行番号 | 問題 |
|------|--------|------|
| `processGetStaff` | 3230–3231 | `getSheetByName('Staff')` 後 **null チェックなし** → `sheet.getDataRange()` で TypeError |
| `processAddStaff` | 3250–3253 | 同上 → `sheet.appendRow()` |
| `processUpdateStaffStatus` | 3260–3265 | 同上 |
| `processDeleteStaff` | 3275–3280 | 同上 |

**影響:** 新規デプロイ・シート名 typo・手動削除で **工場スタッフ管理 API が全滅（GAS 500 → フロント保存/表示連鎖失敗）（S）**。

---

## Aランク監査：機能不全・タイムアウト・リソース枯渇

### A-1. GAS 排他制御 — 保存系は OK、登録系は不足

**LockService あり（良好）**

| 関数 | 行 |
|------|-----|
| `checkAndSendCarInspectionReminders` | 1551 |
| `processVehicleData` | 2196 |
| `processUpdateVehicle` | 2293 |
| `processLogData` | 2428 |
| `processCorrectLog` | 2499 |
| `processSaveInspection` | 3051 |
| `processUpdateDailyInspection` | 3149 |

**LockService なし — 同時 POST で重複行・ID 衝突リスク**

| 関数 | 行 | 操作 |
|------|-----|------|
| `processRegisterShop` | 2061–2107 | shops + Staff appendRow |
| `processUserRegister` | 3290–3350 | users_v1 appendRow（loginId 衝突時は再帰 3319–3320） |
| `processAddStaff` | 3247–3254 | Staff appendRow（PIN 衝突理論あり） |
| `processUpdateStaffStatus` | 3257–3269 | 行更新 |
| `processDeleteStaff` | 3272–3284 | deleteRow |
| `issueSession_` | 1626–1630 | Sessions appendRow |
| `processSystemLog` | 617–631 | System_Logs appendRow（高頻度） |

---

### A-2. API / GAS タイムアウト

**フロント（フェイルセーフあり）**

| 箇所 | 行 | 設定 |
|------|-----|------|
| `fetchJsonWithTimeout` | `app.js` 1981–2011 | デフォルト **20秒**、AbortController |
| `sendToGAS_Safe` | `app.js` 2041–2046 | 同上 |
| `ringInvoiceOcrViaGas_` | `gemini-invoice-ocr.js` 190–191 | **120000ms** |
| `gemini-ocr.js` | 370付近 | `RING_GEMINI_OCR_TIMEOUT_MS` |

**GAS（外部 API — フェイルセーフ弱）**

| 関数 | 行 | 問題 |
|------|-----|------|
| `processGeminiOcrShaken` | 2828–2833 | `UrlFetchApp.fetch` — **muteHttpExceptions のみ**。GAS 全体 **最大6分** を Gemini 待ちで消費 |
| `processOcrInvoice` | 2982–2987 | 最大5画像 + maxOutputTokens 8192 — **重い** |
| `callVisionDocumentText_` | 2647–2652 | Vision API — try-catch なし（2654 parse） |
| `loadAdminFilterData_` | 943–944 | `vsh.getDataRange().getValues()` — **Vehicles 全行** |
| `buildAdminMonitoringFromSystemLogs_` | 708–712 | System_Logs **全行** getDataRange |
| `processGetAdminDashboardData` | 1400+ | 上記 + shops 全行 loop |

**影響:** 車両数千台・ログ数万行で **管理者ダッシュボード・初回 load が GAS タイムアウト（A）**。OCR はクライアント 120秒で切れるが、**GAS 側は orphan 実行継続の可能性**。

---

### A-3. メモリ — 5枠カメラ UI（Base64 / Object URL）

**ファイル:** `gemini-invoice-ocr.js`

| 項目 | 行 | 評価 |
|------|-----|------|
| `ringInvoiceRevokeThumb_` | 23–27 | object URL **revoke あり（良好）** |
| `ringInvoiceClearSlot_` / `ringClearInvoiceSlots_` | 80–93 | スロット削除時 revoke + base64 null |
| スロット状態 `slot.base64` | 19, 332 | 圧縮後も **最大5枚分の Base64 文字列を JS ヒープに保持** |
| ページ離脱時 | — | **`beforeunload` / `pagehide` での `ringClearInvoiceSlots_` 呼び出しなし** |
| OCR 成功後 | 251 | `ringClearInvoiceSlots_()` — 成功パスのみ解放 |

**影響:** 5枠撮影 → 読込せず長時間編集 → **低メモリ端末（iPhone SE）でタブクラッシュ or キーボード遅延（A）**。Object URL リーク自体は削除路径で抑止済み。

**関連:** `app.js` `ringOcrQueueState`（3188–3194）— バッチ OCR 用 object URL revoke あり。

---

### A-4. 車検通知バッチ — 堅牢性詳細（A 補足）

| 観点 | 実装 | 残リスク |
|------|------|----------|
| 重複防止 | 16列 ISO タイムスタンプ | 列ズレ（S-2/S-3） |
| 対象絞込 | shopId あり車両除外 1560–1561 | 意図通り |
| 日付一致 | `exp.getTime() !== target.getTime()` 1569 | タイムゾーンは setHours(0,0,0,0) — JST トリガー前提 |
| LINE 失敗時 | メールフォールバック 1602–1609 | 両方失敗時はフラグ未設定 → **翌日再試行（意図的か要確認）** |
| users 不存在 | 1526 return | **全通知停止**（サイレント） |

---

### A-5. doPost 入口 — postData 欠損

**関数:** `doPost(e)` — 行 1880–1882

```javascript
const payload = JSON.parse(e.postData.contents);
```

- 外側 try-catch（1943–1946）で `{ success: false, error: error.message }` を返すため **GAS プロセス自体は生存**。
- ただし `e` または `e.postData` が undefined のリクエスト（プローブ・CDN・誤 POST）では **`Cannot read properties of undefined`** → 汎用エラーメッセージのみ。**監視上のノイズ（A）**。

---

## Bランク — 既存防御・限定的リスク

| 項目 | 箇所 | 内容 |
|------|------|------|
| JSON（GAS 入口） | `doPost` 1880–1946 | 全体 try-catch |
| JSON（共通 util） | `app.js` `safeJsonParse` 166–176 | 未普及 |
| JSON（管理画面） | `admin_dashboard.html` `safeParseJsonArray_` 823 | 配列専用 |
| シート不存在（shops/users） | `processRegisterShop` 2063–2064, `processUserRegister` 3292–3293 | throw で明示エラー |
| シート不存在（Daily） | `processGetDailyHistory` 3198–3199 | 空配列 return |
| Lock（コア保存） | 上表 A-1「あり」 | 車両・履歴・点検 |
| OCR クライアント timeout | `app.js`, `gemini-invoice-ocr.js` | 20s / 120s |
| object URL 解放 | `gemini-invoice-ocr.js` 23–27 | 削除・全クリア時 |

---

## 推奨対応順（破壊検査観点）

### 即時（S）

1. **フロント全画面** — localStorage 読取を `safeJsonParse(..., [])` / `null` に統一（特に `factory_input.html`, `vehicle_info.html`, `daily_history_detail.html`）。
2. **GAS** — 列参照をヘッダ名 → index マップ化（最優先: `Vehicles` リマインド列、`History_Events` VIN/JSON 列、`Staff` 全列）。
3. **`processGetStaff` / `processAddStaff` / `processUpdateStaffStatus` / `processDeleteStaff`** — `Staff` null ガード + 自動 insertSheet または明示 `{ success: false, error: 'SHEET_NOT_FOUND' }`。

### 早期（A）

4. **登録系** — `processUserRegister`, `processRegisterShop`, `processAddStaff` に `LockService`。
5. **管理者・集計** — `loadAdminFilterData_` を `getLastRow` + 末尾スキャン or キャッシュ Properties へ。
6. **5枠 OCR** — `pagehide` で `ringClearInvoiceSlots_()`、Base64 保持時間の上限。
7. **GAS OCR** — 実行時間ログ + 画像枚数/サイズ上限のサーバ側バリデーション強化。

### 継続（B）

8. `safeJsonParse` の全画面展開状況を lint ルール化。
9. `doPost` で `e.postData` 存在チェックを入口直後に追加（計画のみ、本レポートでは未実装）。

---

## 付録: 破壊検査で参照した主要ファイル

| 種別 | パス |
|------|------|
| GAS 本体 | `ads/gas-complete-Code.gs` |
| GAS 通信 | `app.js`（`sendToGAS_Safe`, `fetchJsonWithTimeout`） |
| 5枠 OCR | `gemini-invoice-ocr.js`, `gemini-ocr.js` |
| 入力画面 | `factory_input.html`, `dealer_input.html`, `vehicle_info.html` |
| 履歴 | `daily_history_detail.html`, `history_detail.html` |
| VIN 検索 | `vin-search.js` |

---

*本破壊検査は静的コードレビューに基づく。実際の再現には、localStorage 意図破損・Staff シート削除・並行 POST 負荷・Gemini 遅延環境での結合試験を推奨する。*

