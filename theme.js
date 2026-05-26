/**
 * RinG Auto テーマエンジン (theme.js)
 * ユーザーの役割（role）に応じてCSS変数を動的に上書きし、UIの色を切り替えます。
 */

/** 役職ごとのテーマパレット（ログイン画面・ログイン後画面で共通） */
const RING_PALETTES = {
    factory: {
        '--page-bg': '#f7f3ea',
        '--page-line': 'rgba(37, 99, 235, 0.09)',
        '--bg': '#f7f3ea',
        '--line': '#bfdbfe',
        '--accent': '#2563eb',
        '--muted': '#6b8ab8',
        '--highlighter': 'rgba(37, 99, 235, 0.25)'
    },
    dealer: {
        '--page-bg': '#f7f3ea',
        '--page-line': 'rgba(220, 38, 38, 0.09)',
        '--bg': '#f7f3ea',
        '--line': '#fecaca',
        '--accent': '#dc2626',
        '--muted': '#b87070',
        '--highlighter': 'rgba(220, 38, 38, 0.22)'
    },
    user: {
        '--page-bg': '#f7f3ea',
        '--page-line': 'rgba(180, 145, 10, 0.13)',
        '--bg': '#f7f3ea',
        '--line': '#fde047',
        '--accent': '#eab308',
        '--muted': '#a16207',
        '--highlighter': 'rgba(234, 179, 8, 0.35)'
    }
};

/** <meta name="theme-color"> を CSS --accent と揃える（ui.ux L-008） */
function syncThemeColorMeta() {
    const meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) return;
    try {
        const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
        if (accent) meta.setAttribute('content', accent);
    } catch (e) { /* ignore */ }
}

/** セッション不要 — login.html 等で persona テーマを適用 */
function applyRingPalette(role) {
    const theme = RING_PALETTES[role] || RING_PALETTES.user;
    const root = document.documentElement;
    Object.keys(theme).forEach(function (key) {
        root.style.setProperty(key, theme[key]);
    });
    syncThemeColorMeta();
}

function applyRinGTheme() {
    const sessionRaw = localStorage.getItem("nappy_current_user") || localStorage.getItem("nappy_profile_v1");

    if (!sessionRaw) return;

    let session;
    try {
        session = JSON.parse(sessionRaw);
    } catch (e) {
        console.error("セッション解析エラー");
        return;
    }

    const role = session.shopType || session.role;
    applyRingPalette(role);

    const subTitle = document.getElementById('profileSubTitle');
    if (subTitle) {
        if (role === 'factory') subTitle.textContent = "整備工場・事業者用 (標準版)";
        if (role === 'dealer') subTitle.textContent = "販売店・業者用 (標準版)";
    }
}

document.addEventListener('DOMContentLoaded', applyRinGTheme);
