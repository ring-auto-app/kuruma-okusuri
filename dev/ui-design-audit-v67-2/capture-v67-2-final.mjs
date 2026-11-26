/**
 * v67-2 最終撮影: デモ再適用・プレフライト・最大2回リトライ・screenshots-final のみ出力
 */
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const CDP = require(path.join(path.dirname(fileURLToPath(import.meta.url)), '../ui-design-audit-v67-1/node_modules/chrome-remote-interface'));

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const OUT = path.join(__dirname, 'screenshots-final');
const AFTER = path.join(__dirname, 'screenshots-after');
const PORT = Number(process.env.RING_AUDIT_PORT || 17771);
const BASE = 'http://127.0.0.1:' + PORT;
const VIN = 'ZVW50-5012847';
const LOG_ID = 'LOG-DEMO-F-01';
const CDP_PORT = 19227;
const MAX_TRIES = 2;

const CHROME = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  process.env.LOCALAPPDATA + '\\Google\\Chrome\\Application\\chrome.exe'
].find((p) => p && fs.existsSync(p));

const cap = fs.readFileSync(path.join(ROOT, 'dev/ui-design-audit-v67-1/capture-v67-1-screenshots.mjs'), 'utf8');
const DEMO_FN = cap.match(/const DEMO_FN = `([\s\S]*?)`;\s*\nasync function withClient/)[1];

const REAPPLY_FN = `function(role){
  var mode = role==='factory'?'shop':(role==='dealer'?'business':'user');
  var profiles={
    factory:{userId:'F-DEMO01',userName:'デモ太郎',shopName:'RinG Auto 整備工場',shopType:'factory',role:'master',shopId:'SHOP-DEMO-F',factoryType:'指定工場',factoryNumber:'第11234号',__demoTag:true},
    dealer:{userId:'D-DEMO01',userName:'デモ太郎',shopName:'T.G販売店',shopType:'dealer',role:'master',shopId:'SHOP-DEMO-D',factoryType:'認証',factoryNumber:'第55678号',__demoTag:true},
    user:{userId:'U-DEMO01',userName:'デモユーザー',shopType:'user',role:'user',shopId:'',loginId:'USR-DEMO-0000',__demoTag:true}
  };
  var p = profiles[role];
  if(typeof login==='function') login(p,'RING_DEMO_LOCAL');
  if(typeof ringSetCurrentMode==='function') ringSetCurrentMode(mode);
  if(typeof ringBootAuthForOcrPage==='function') ringBootAuthForOcrPage(mode);
  if(typeof ringApplyActiveSession==='function' && typeof ringReadAuthSlot==='function'){
    var slot = ringReadAuthSlot(mode);
    if(slot) ringApplyActiveSession(slot, mode);
  }
  window.__ringSessionVerified = true;
  window.__ringAuthOptimistic = true;
  try{ sessionStorage.setItem('ring_ocr_demo_session_v1','1'); }catch(e){}
}`;

const REAPPLY_ONLOAD = `(function(){
  var role = '__ROLE__';
  function tick(){
    if (typeof login !== 'function') { requestAnimationFrame(tick); return; }
    (${REAPPLY_FN})(role);
  }
  tick();
})();`;

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

function auditServerAlive() {
  return new Promise((resolve) => {
    const req = http.get(`http://127.0.0.1:${PORT}/index.html`, (res) => {
      res.resume();
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(4000, () => { req.destroy(); resolve(false); });
  });
}

async function withClient(fn, timeoutMs = 150000) {
  const port = CDP_PORT + Math.floor(Math.random() * 400);
  const chrome = spawn(CHROME, [
    `--remote-debugging-port=${port}`, '--headless=new', '--no-sandbox',
    '--disable-dev-shm-usage', '--hide-scrollbars', '--disable-gpu'
  ], { stdio: 'ignore' });
  await sleep(800);
  let client;
  try {
    await Promise.race([
      (async () => {
        client = await CDP({ port });
        const { Network, Page, Runtime, Emulation } = client;
        await Promise.all([Network.enable(), Page.enable(), Runtime.enable()]);
        await Network.setBypassServiceWorker({ bypass: true });
        await fn({ Page, Runtime, Emulation });
      })(),
      sleep(timeoutMs).then(() => { throw new Error('timeout'); })
    ]);
  } finally {
    if (client) await client.close();
    chrome.kill('SIGTERM');
    await sleep(300);
  }
}

async function ensureAssets(Runtime) {
  for (let i = 0; i < 40; i++) {
    const { result } = await Runtime.evaluate({
      expression: `({
        appFail: !!window.__ringAppLoadFailed,
        ready: typeof login==='function' && typeof getCurrentProfile==='function',
        css: !!document.querySelector('link[href*="common.css"]')
      })`,
      returnByValue: true
    });
    const v = result.value;
    if (v.ready && v.css && !v.appFail) return;
    await sleep(150);
  }
  throw new Error('assets-load');
}

async function assertPageReady(Runtime, expect) {
  for (let attempt = 0; attempt < 56; attempt++) {
    const { result } = await Runtime.evaluate({
      expression: `(() => {
        const path = (location.pathname.split('/').pop() || '').toLowerCase();
        const isLogin = path === 'login.html' || !!document.querySelector('body.ring-login-themed form#loginForm');
        const pageTitle = document.getElementById('pageTitle')?.innerText?.trim() || '';
        const h1 = Array.from(document.querySelectorAll('h1')).map((e) => e.innerText.trim()).join('|');
        const carCards = document.querySelectorAll('.car-card').length;
        const quickPanel = document.getElementById('panel-quick');
        const quickReady = quickPanel && !quickPanel.hidden;
        return { isLogin, pageTitle, h1, carCards, quickReady, path };
      })()`,
      returnByValue: true
    });
    const v = result.value;
    if (expect.rejectLogin !== false && v.isLogin) {
      await sleep(200);
      continue;
    }
    let ok = true;
    if (expect.pageTitle && !v.pageTitle.includes(expect.pageTitle)) ok = false;
    if (expect.pageTitlePattern && !new RegExp(expect.pageTitlePattern).test(v.pageTitle)) ok = false;
    if (expect.h1 && !v.h1.includes(expect.h1)) ok = false;
    if (expect.minCarCards != null && v.carCards < expect.minCarCards) ok = false;
    if (expect.quickTab && !v.quickReady) ok = false;
    if (expect.domSelectors?.length) {
      for (const sel of expect.domSelectors) {
        const chk = await Runtime.evaluate({
          expression: `!!document.querySelector(${JSON.stringify(sel)})`,
          returnByValue: true
        });
        if (!chk.result.value) ok = false;
      }
    }
    if (ok) return v;
    await sleep(250);
  }
  throw new Error('preflight: ' + JSON.stringify(expect));
}

async function goto(Page, Runtime, role, url, waitMs, prepExpr, viewportOnly, preflight, skipReapply) {
  if (!skipReapply) await Runtime.evaluate({ expression: `(${REAPPLY_FN})('${role}')`, awaitPromise: false });
  await Page.navigate({ url: BASE + url, transitionType: 'typed' });
  await sleep(Math.min(waitMs, 1400));
  await ensureAssets(Runtime);
  if (!skipReapply) await Runtime.evaluate({ expression: `(${REAPPLY_FN})('${role}')`, awaitPromise: false });
  if (prepExpr) {
    await Runtime.evaluate({ expression: prepExpr, awaitPromise: false });
    await sleep(400);
  }
  await sleep(Math.max(400, waitMs - 1200));
  if (preflight) await assertPageReady(Runtime, preflight);
  const metrics = await Page.getLayoutMetrics();
  const vw = metrics.layoutViewport.clientWidth;
  const vh = metrics.layoutViewport.clientHeight;
  if (viewportOnly) {
    return Buffer.from((await Page.captureScreenshot({ format: 'png', fromSurface: true, clip: { x: 0, y: 0, width: vw, height: vh, scale: 1 } })).data, 'base64');
  }
  const height = Math.min(Math.ceil(metrics.contentSize.height + 20), 4500);
  return Buffer.from((await Page.captureScreenshot({ format: 'png', fromSurface: true, captureBeyondViewport: true, clip: { x: 0, y: 0, width: vw, height, scale: 1 } })).data, 'base64');
}

async function demoBootstrap(Page, Runtime, role) {
  await Page.addScriptToEvaluateOnNewDocument({ source: REAPPLY_ONLOAD.replace(/__ROLE__/g, role) });
  await Page.navigate({ url: BASE + '/index.html', transitionType: 'typed' });
  let ready = false;
  for (let i = 0; i < 60 && !ready; i++) {
    const chk = await Runtime.evaluate({ expression: "typeof seedDemoEnvironment==='function'", returnByValue: true });
    ready = !!chk?.result?.value;
    if (!ready) await sleep(150);
  }
  if (!ready) throw new Error('app.js not ready');
  await Runtime.evaluate({ expression: `(${DEMO_FN})('${role}')`, awaitPromise: false });
  await Runtime.evaluate({ expression: `(${REAPPLY_FN})('${role}')`, awaitPromise: false });
  await sleep(600);
}

async function captureViewport(Emulation, w, h, mobile) {
  await Emulation.setDeviceMetricsOverride({
    width: w, height: h, deviceScaleFactor: mobile ? 2 : 1, mobile,
    screenWidth: w, screenHeight: h, positionX: 0, positionY: 0
  });
}

/** 失敗分＋今回UI修正ページ（再撮影） */
const PRIORITY_TASKS = [
  { role: 'user', viewport: '390x844', mobile: true, items: [
    { file: '01-user_home-390.png', url: '/user_home.html', wait: 4000, preflight: { domSelectors: ['.menu-list'] } },
    { file: '04-user_vehicles_list-390.png', url: '/vehicles.html', wait: 10000, viewportOnly: true, preflight: { pageTitlePattern: 'マイカー', minCarCards: 1 } },
    { file: '16-user_mypage-390.png', url: '/user_mypage.html', wait: 4000, preflight: { h1: 'マイページ' } }
  ]},
  { role: 'factory', viewport: '390x844', mobile: true, items: [
    { file: '02-factory_home-390.png', url: '/factory_home.html', wait: 4000, preflight: { domSelectors: ['.menu-item'] } },
    { file: '04-vehicles_list-390.png', url: '/vehicles.html', wait: 10000, preflight: { pageTitlePattern: '管理車両', minCarCards: 1 } },
    { file: '04-vehicles_list-375.png', url: '/vehicles.html', wait: 10000, viewportOnly: true, preflight: { pageTitlePattern: '管理車両', minCarCards: 1 } },
    { file: '04-vehicles_list-430.png', url: '/vehicles.html', wait: 10000, viewportOnly: true, preflight: { pageTitlePattern: '管理車両', minCarCards: 1 } },
    { file: '05-car_add-390-top.png', url: '/car_add.html?category=managed&returnTo=vehicles', wait: 3500, viewportOnly: true, preflight: { h1: '車両の登録' } },
    { file: '05-car_add-390-scroll-end.png', url: '/car_add.html?category=managed&returnTo=vehicles', wait: 3500, viewportOnly: true,
      prep: "window.scrollTo(0, Math.max(0, document.body.scrollHeight - window.innerHeight))",
      preflight: { h1: '車両の登録', domSelectors: ['#saveBtn'] } },
    { file: '06-vehicle_info-390.png', url: '/vehicle_info.html?vin=' + encodeURIComponent(VIN), wait: 6000, preflight: { h1: '車両情報' } },
    { file: '10-maintenance_input_quick-390.png', url: '/maintenance_input.html', wait: 4000,
      prep: "typeof ringMaintSetTab_==='function'&&ringMaintSetTab_('quick')",
      preflight: { h1: '整備記録', quickTab: true, domSelectors: ['#panel-quick'] } },
    { file: '10-maintenance_input_detail-390.png', url: '/maintenance_input.html', wait: 4000, viewportOnly: true,
      prep: "typeof ringMaintSetTab_==='function'&&ringMaintSetTab_('detail')",
      preflight: { h1: '整備記録', domSelectors: ['#invoiceSlotRow'] } },
    { file: '13-rental_fleet-390.png', url: '/rental_fleet.html', wait: 5500, preflight: { h1: 'レンタカー' } },
    { file: '14-fleet_check_sheet-390.png', url: '/fleet_check_sheet.html?vin=' + encodeURIComponent(VIN), wait: 5500, preflight: { h1: 'チェックシート' } }
  ]},
  { role: 'dealer', viewport: '390x844', mobile: true, items: [
    { file: '03-dealer_home-390.png', url: '/dealer_home.html', wait: 4000, preflight: { domSelectors: ['.menu-card'] } }
  ]},
  { role: 'user', viewport: '390x844', mobile: true, skipDemo: true, items: [
    { file: '17-login-user-390.png', url: '/login.html?tab=user', wait: 3000, preflight: { rejectLogin: false, domSelectors: ['#tabUser', '.btn-submit'] } },
    { file: '17-login-factory-390.png', url: '/login.html?tab=shop', wait: 3000, preflight: { rejectLogin: false, domSelectors: ['#tabShop', '.btn-submit'] } },
    { file: '17-login-dealer-390.png', url: '/login.html?tab=business', wait: 3000,
      prep: "typeof switchAccountTab==='function'&&switchAccountTab('business')",
      preflight: { rejectLogin: false, domSelectors: ['.btn-submit', '#loginEmail'] } }
  ]}
];

/** 前回プレフライト合格・UI未変更分（コピーのみ） */
const COPY_FROM_AFTER = [
  '07-user_history_list-390.png', '08-user_history_detail-390.png', '12-user_inspection-390.png',
  '07-factory_history_list-390.png', '08-factory_history_detail-390.png', '09-history_visibility_settings-390.png',
  '11-inspection_biz-390.png', '13-rental_fleet-1280.png', '03-dealer_home-390-settings-open.png'
];

const MIN_OK_BYTES = 45000;

async function main() {
  if (!CHROME) throw new Error('Chrome not found');
  const alive = await auditServerAlive();
  if (!alive) throw new Error(`Audit server not reachable on ${PORT} (start serve-audit.mjs; do not duplicate)`);

  fs.mkdirSync(OUT, { recursive: true });
  const manifest = { phase: 'v67-2-final', generatedAt: new Date().toISOString(), copied: [], captured: [], failures: [] };

  for (const name of COPY_FROM_AFTER) {
    const src = path.join(AFTER, name);
    if (!fs.existsSync(src)) continue;
    const buf = fs.readFileSync(src);
    if (buf.length < MIN_OK_BYTES) continue;
    const dest = path.join(OUT, name);
    if (!fs.existsSync(dest)) {
      fs.copyFileSync(src, dest);
      manifest.copied.push({ file: name, bytes: buf.length, from: 'screenshots-after' });
    }
  }

  const only = (process.env.RING_AUDIT_ONLY || '').split(',').map((s) => s.trim()).filter(Boolean);

  for (const group of PRIORITY_TASKS) {
    const [w, h] = group.viewport.split('x').map(Number);
    for (const item of group.items) {
      if (only.length && !only.includes(item.file)) continue;
      const dest = path.join(OUT, item.file);
      if (fs.existsSync(dest)) continue;
      let lastErr = null;
      for (let tryNo = 1; tryNo <= MAX_TRIES; tryNo++) {
        try {
          console.log('CAPTURE', item.file, 'try', tryNo);
          await withClient(async ({ Page, Runtime, Emulation }) => {
            await captureViewport(Emulation, w, h, group.mobile);
            if (!group.skipDemo) await demoBootstrap(Page, Runtime, group.role);
            const pre = item.preflight ? { ...item.preflight } : null;
            const png = await goto(Page, Runtime, group.role, item.url, item.wait, item.prep, !!item.viewportOnly, pre, !!group.skipDemo);
            if (png.length < MIN_OK_BYTES) throw new Error('png too small');
            fs.writeFileSync(dest, png);
            manifest.captured.push({ file: item.file, bytes: png.length, try: tryNo });
          });
          lastErr = null;
          break;
        } catch (e) {
          lastErr = String(e.message || e);
          console.warn('FAIL', item.file, tryNo, lastErr);
          if (tryNo < MAX_TRIES) await sleep(800);
        }
      }
      if (lastErr) manifest.failures.push({ file: item.file, reason: lastErr, tries: MAX_TRIES });
    }
  }

  fs.writeFileSync(path.join(__dirname, 'capture-final-manifest.json'), JSON.stringify(manifest, null, 2));
  console.log('FINAL copied', manifest.copied.length, 'captured', manifest.captured.length, 'fail', manifest.failures.length);
}

main().catch((e) => { console.error(e); process.exit(1); });