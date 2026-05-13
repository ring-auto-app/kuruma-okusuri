/**
 * RinG Auto テーマエンジン (theme.js)
 * ユーザーの役割（role）に応じてCSS変数を動的に上書きし、UIの色を切り替えます。
 */

/** <meta name="theme-color"> を CSS --accent と揃える（ui.ux L-008） */
function syncThemeColorMeta() {
    const meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) return;
    try {
        const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
        if (accent) meta.setAttribute('content', accent);
    } catch (e) { /* ignore */ }
}

function applyRinGTheme() {
    // セッション情報の取得（app.jsの共通関数またはストレージから直接取得）
    const sessionRaw = localStorage.getItem("nappy_current_user") || localStorage.getItem("nappy_profile_v1");
    
    // 未ログイン時はデフォルトのノートデザイン（イエロー系）を維持するため終了
    if (!sessionRaw) return;

    let session;
    try {
        session = JSON.parse(sessionRaw);
    } catch (e) {
        console.error("セッション解析エラー");
        return;
    }
    
    // 役割（factory / dealer / user）の取得
    const role = session.shopType || session.role; 
    const root = document.documentElement;

    // 役職ごとのテーマパレット定義
    // ノート紙（--page-bg / --bg）は全ロール共通のベージュに統一
    // 罫線（--page-line）はテーマカラーを薄く使用して目立ちすぎないように調整
    const palettes = {
        factory: { // 🟦 整備工場（ブルー）
            '--page-bg': '#f7f3ea',              // 全ロール共通ベージュ
            '--page-line': 'rgba(37, 99, 235, 0.09)', // 青・薄め
            '--bg': '#f7f3ea',                   // 全ロール共通ベージュ
            '--line': '#bfdbfe',
            '--accent': '#2563eb',
            '--muted': '#6b8ab8',
            '--highlighter': 'rgba(37, 99, 235, 0.25)'
        },
        dealer: { // 🟥 事業者（レッド）
            '--page-bg': '#f7f3ea',              // 全ロール共通ベージュ
            '--page-line': 'rgba(220, 38, 38, 0.09)', // 赤・薄め
            '--bg': '#f7f3ea',                   // 全ロール共通ベージュ
            '--line': '#fecaca',
            '--accent': '#dc2626',
            '--muted': '#b87070',
            '--highlighter': 'rgba(220, 38, 38, 0.22)'
        },
        user: { // 🟨 一般ユーザー（イエロー）
            '--page-bg': '#f7f3ea',              // 全ロール共通ベージュ
            '--page-line': 'rgba(180, 145, 10, 0.13)', // 黄・薄め
            '--bg': '#f7f3ea',                   // 全ロール共通ベージュ
            '--line': '#fde047',
            '--accent': '#eab308',
            '--muted': '#a16207',
            '--highlighter': 'rgba(234, 179, 8, 0.35)'
        }
    };

    // 該当するテーマを選択（存在しない場合はユーザー用をフォールバック）
    const theme = palettes[role] || palettes.user;

    // CSS変数をドキュメントルートに適用
    Object.keys(theme).forEach(key => {
        root.style.setProperty(key, theme[key]);
    });
    syncThemeColorMeta();

    // 特定のIDを持つ要素（サブタイトル等）のテキストを役割に合わせて自動更新
    const subTitle = document.getElementById('profileSubTitle');
    if (subTitle) {
        if (role === 'factory') subTitle.textContent = "整備工場・事業者用 (標準版)";
        if (role === 'dealer') subTitle.textContent = "販売店・業者用 (標準版)";
    }
}

// ページ読み込み完了時に実行
document.addEventListener('DOMContentLoaded', applyRinGTheme);