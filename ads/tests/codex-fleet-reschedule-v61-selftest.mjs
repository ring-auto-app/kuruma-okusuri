/**
 * v61 日程変更 — ローカル GAS + 実 HTML（rental_fleet.html / rental-fleet.v61.js）。
 * 本番データ・ネットワークなし。
 * Run: node ads/tests/codex-fleet-reschedule-v61-selftest.mjs
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import vm from 'node:vm';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const chrome = process.env.RING_TEST_CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
if (!fs.existsSync(chrome)) {
  console.error('UNVERIFIED: Chrome unavailable; set RING_TEST_CHROME');
  process.exit(2);
}

const GAS_SRC = fs.readFileSync(path.join(root, 'ads/gas-complete-Code.gs'), 'utf8');
const fixtureSrc = fs.readFileSync(path.join(root, 'ads/tests/gas-fleet-bookings-selftest.mjs'), 'utf8').replace(/\r\n/g, '\n');
const fStart = fixtureSrc.indexOf('const VIN_F ='), fEnd = fixtureSrc.indexOf('(function () {', fStart);
const scope = { vm, GAS_SRC, console, Date, assert };
vm.createContext(scope);
vm.runInContext(fixtureSrc.slice(fStart, fEnd) + '\nglobalThis.__api = { buildWorld, loadGas, call, VIN_F };', scope);
const { buildWorld, loadGas, call, VIN_F } = scope.__api;

function tzParts(d, tz) {
  const o = {};
  new Intl.DateTimeFormat('en-CA', { timeZone: tz || 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).formatToParts(d).forEach((p) => { o[p.type] = p.value; });
  return o;
}
const sheets = buildWorld();
sheets.Vehicles.rows[1][16] = 'テスト代車';
const gas = loadGas(sheets);
gas.Utilities.formatDate = (d, tz, fmt) => {
  const p = tzParts(d instanceof Date ? d : new Date(d), tz);
  return String(fmt).replace('yyyy', p.year).replace('MM', p.month).replace('dd', p.day)
    .replace('HH', p.hour).replace('mm', p.minute).replace('ss', p.second);
};
const jstYmd = (offsetDays) => {
  const p = tzParts(new Date(Date.now() + (offsetDays || 0) * 86400000), 'Asia/Tokyo');
  return p.year + '-' + p.month + '-' + p.day;
};
const TODAY = jstYmd(0);
const SEED_PROFILE = { shopId: 'SHOP-A', userId: 'A1', role: 'master', shopType: 'factory', shopName: 'A' };

const traffic = [];
const server = http.createServer((req, res) => {
  const u = new URL(req.url, 'http://localhost');
  if (u.pathname === '/gas' && req.method === 'POST') {
    let body = '';
    req.on('data', (c) => { body += c; });
    req.on('end', () => {
      const payload = JSON.parse(body || '{}');
      let out;
      if (payload.action === 'verify_session') out = { success: true, profile: SEED_PROFILE, authToken: payload.authToken };
      else {
        const b = Object.assign({}, payload);
        delete b.action;
        delete b.authToken;
        try { out = call(gas, payload.action, payload.authToken, b); }
        catch (e) { out = { success: false, error: String(e && e.message || e) }; }
      }
      traffic.push({ action: payload.action, payload, out });
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(out));
    });
    return;
  }
  const rel = decodeURIComponent(u.pathname).replace(/^\//, '') || 'index.html';
  const target = path.resolve(root, rel);
  if (!target.startsWith(root + path.sep) || !fs.existsSync(target) || !fs.statSync(target).isFile()) { res.writeHead(404); res.end(); return; }
  const ext = path.extname(target);
  res.setHeader('Content-Type', ({ '.js': 'text/javascript', '.html': 'text/html; charset=utf-8', '.css': 'text/css' })[ext] || 'application/octet-stream');
  res.setHeader('Cache-Control', 'no-store');
  res.end(fs.readFileSync(target));
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const origin = 'http://127.0.0.1:' + server.address().port;

const INIT = `(() => {
  window.__RING_GAS_URL_OVERRIDE__ = location.origin + '/gas';
  const p = ${JSON.stringify(SEED_PROFILE)};
  const now = new Date().toISOString();
  localStorage.setItem('ring_current_mode', 'shop');
  localStorage.setItem('ring_shop_token', 'T-A');
  localStorage.setItem('ring_shop_profile', JSON.stringify({ profile: p, updatedAt: now, verifiedAt: now }));
  localStorage.setItem('nappy_current_user', JSON.stringify(p));
  localStorage.setItem('ring_auth_token', 'T-A');
  window.__toasts = [];
  new MutationObserver(() => {
    const el = document.getElementById('ring-toast');
    const t = el && el.textContent;
    if (t && t !== window.__lastToast) { window.__lastToast = t; window.__toasts.push(t); }
  }).observe(document, { subtree: true, childList: true, characterData: true, attributes: true });
})();`;

const gasBookings = () => call(gas, 'get_fleet_bookings', 'T-A', { vin: VIN_F, historyAll: true }).bookings || [];
const booking = (id) => gasBookings().find((b) => b.bookingId === id);
const updCalls = () => traffic.filter((x) => x.action === 'update_fleet_booking');

const profileDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ring-reschedule-v61-'));
const proc = spawn(chrome, ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + profileDir, '--no-first-run',
  '--disable-extensions', '--no-proxy-server', 'about:blank'], { windowsHide: true, stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function until(fn, label, tries = 200) {
  for (let i = 0; i < tries; i++) { const v = await fn(); if (v) return v; await sleep(50); }
  throw Error('timeout: ' + label);
}

let ws, passed = 0, failed = 0;
const errors = [];
try {
  const port = await until(() => { try { return fs.readFileSync(path.join(profileDir, 'DevToolsActivePort'), 'utf8').split(/\r?\n/)[0]; } catch { return null; } }, 'devtools');
  const target = await (await fetch('http://127.0.0.1:' + port + '/json/new?about:blank', { method: 'PUT' })).json();
  ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
  let seq = 0; const pending = new Map();
  const cdp = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++seq;
    const timer = setTimeout(() => { pending.delete(id); reject(Error(method + ' timeout')); }, 45000);
    pending.set(id, { resolve: (x) => { clearTimeout(timer); resolve(x); }, reject: (x) => { clearTimeout(timer); reject(x); } });
    ws.send(JSON.stringify({ id, method, params }));
  });
  ws.onmessage = (e) => {
    const m = JSON.parse(e.data);
    if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);
    if (m.id) { const p = pending.get(m.id); if (!p) return; pending.delete(m.id); m.error ? p.reject(Error(m.error.message)) : p.resolve(m.result); }
    if (m.method === 'Fetch.requestPaused') {
      const p = m.params;
      const local = p.request.url.startsWith(origin + '/');
      cdp(local ? 'Fetch.continueRequest' : 'Fetch.failRequest', local ? { requestId: p.requestId } : { requestId: p.requestId, errorReason: 'BlockedByClient' }).catch(() => {});
    }
  };
  const js = async (expression) => {
    const r = await cdp('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true, replMode: true });
    if (r.exceptionDetails) throw Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
    return r.result.value;
  };
  await cdp('Fetch.enable', { patterns: [{ urlPattern: '*' }] });
  await cdp('Page.enable');
  await cdp('Runtime.enable');
  await cdp('Log.enable');
  await cdp('Page.addScriptToEvaluateOnNewDocument', { source: INIT });
  await cdp('Emulation.setTimezoneOverride', { timezoneId: 'Asia/Tokyo' });
  const iphone = async () => {
    await cdp('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 3, mobile: true });
    await cdp('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  };
  const desktop = async () => {
    await cdp('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
    await cdp('Emulation.setTouchEmulationEnabled', { enabled: false });
  };
  const open = async (pagePath, ready) => {
    await cdp('Page.navigate', { url: origin + '/' + pagePath });
    await until(() => js('document.readyState === "complete"').catch(() => false), 'load ' + pagePath);
    if (ready) await until(() => js(ready).catch(() => false), 'ready ' + pagePath);
  };
  const test = async (name, fn) => {
    try { await fn(); passed++; console.log('PASS ' + name); }
    catch (e) { failed++; console.error('FAIL ' + name + ': ' + e.message); }
  };
  const FLEET_READY = `!!document.querySelector('#fleetCalMob button, #fleetCalDesk button') && (localStorage.getItem('nappy_vehicles_v1') || '').includes(${JSON.stringify(VIN_F)})`;
  const q = JSON.stringify;
  const click = async (sel) => js('(()=>{const el=document.querySelector('+q(sel)+');if(!el)throw Error("missing "+'+q(sel)+');el.scrollIntoView({block:"center"});el.click();return true;})()');
  const set = async (sel, val) => js('(()=>{const el=document.querySelector('+q(sel)+');el.value='+q(val)+';el.dispatchEvent(new Event("input",{bubbles:true}));el.dispatchEvent(new Event("change",{bubbles:true}));})()');
  const exists = (sel) => js('!!document.querySelector('+q(sel)+')');
  const createBooking = (start, end) => {
    const out = call(gas, 'create_fleet_booking', 'T-A', { vin: VIN_F, startDate: start, endDate: end, status: 'reserved', clientRequestId: 'R-' + start + '-' + end });
    assert.equal(out.success, true);
    return out.booking;
  };
  const openRescheduleDesktop = async (bookingId) => {
    await desktop();
    await open('rental_fleet.html', FLEET_READY);
    await sleep(400);
    const cal = '#fleetCalDesk [data-booking-id="' + bookingId + '"]';
    await until(() => exists(cal), 'calendar bar');
    await click(cal);
    await until(() => exists('#fleetDetailPanel button'), 'detail');
    await js('[...document.querySelectorAll("#fleetDetailPanel button")].find(b=>b.textContent.includes("日程変更")).click();true');
    await until(() => js('!document.getElementById("fleetNewBookingWizard").hidden'), 'reschedule wizard');
  };
  const openRescheduleMobile = async (bookingId) => {
    await iphone();
    await open('rental_fleet.html', FLEET_READY);
    await sleep(400);
    const cal = '#fleetCalMob [data-booking-id="' + bookingId + '"]';
    await until(() => exists(cal), 'mob bar');
    await click(cal);
    await until(() => js('!document.getElementById("fleetMobDetailSheet").hidden'), 'sheet');
    await js('[...document.querySelectorAll("#fleetMobDetailHost button")].find(b=>b.textContent.includes("日程変更")).click();true');
    await until(() => js('!document.getElementById("fleetNewBookingWizard").hidden'), 'reschedule wizard mob');
  };

  const s1 = jstYmd(12), e1 = jstYmd(13);
  const s2 = jstYmd(14), e2 = jstYmd(15);
  const b1 = createBooking(s1, e1);
  const b2 = createBooking(s2, e2);

  await test('6. GAS排他: baseServerRev と重複（ローカルGAS・ブラウザ前）', async () => {
    const iso = createBooking('2099-08-01', '2099-08-02');
    const rev0 = booking(iso.bookingId).serverRev;
    const bumped = call(gas, 'update_fleet_booking', 'T-A', {
      bookingId: iso.bookingId, startDate: '2099-08-01', endDate: '2099-08-03', status: 'reserved',
      baseServerRev: rev0
    });
    assert.equal(bumped.success, true, bumped.error || 'bump');
    const stale = call(gas, 'update_fleet_booking', 'T-A', {
      bookingId: iso.bookingId, startDate: '2099-08-01', endDate: '2099-08-05', status: 'reserved',
      baseServerRev: rev0
    });
    assert.equal(stale.success, false);
    assert.equal(stale.error, 'BOOKING_CONFLICT');
    createBooking('2099-08-10', '2099-08-12');
    const overlap = call(gas, 'update_fleet_booking', 'T-A', {
      bookingId: iso.bookingId, startDate: '2099-08-01', endDate: '2099-08-11', status: 'reserved',
      baseServerRev: booking(iso.bookingId).serverRev
    });
    assert.equal(overlap.success, false);
    assert.equal(overlap.error, 'BOOKING_OVERLAP');
  });

  await test('1. 日程変更画面が開く（PC）', async () => {
    await openRescheduleDesktop(b1.bookingId);
    assert.equal(await js('document.querySelector("#fleetRescheduleStart")?.value'), s1);
    assert.equal(await js('document.querySelector("#fleetRescheduleEnd")?.value'), e1);
    assert(await js('document.getElementById("fleetNewBookingWizard").innerText.includes("予約の日程変更")'));
  });

  await test('2. 空き期間への変更が成功しカレンダー反映', async () => {
    const ns = jstYmd(16), ne = jstYmd(17);
    await openRescheduleDesktop(b1.bookingId);
    const nUpd = updCalls().length;
    await set('#fleetRescheduleStart', ns);
    await set('#fleetRescheduleEnd', ne);
    await click('#fleetRescheduleCheck');
    await until(() => js('document.getElementById("fleetRescheduleConfirm")'), 'ok step');
    await click('#fleetRescheduleConfirm');
    await until(() => js('window.__toasts.some(t=>t.includes("日程を変更"))'), 'toast');
    assert.equal(updCalls().length, nUpd + 1);
    const last = updCalls().at(-1);
    assert.equal(last.payload.bookingId, b1.bookingId);
    assert.equal(last.payload.startDate, ns);
    assert.equal(last.payload.endDate, ne);
    assert.ok(last.payload.baseServerRev, 'update includes baseServerRev');
    assert.equal(last.out.success, true);
    assert.equal(booking(b1.bookingId).startDate, ns);
    assert.equal(booking(b1.bookingId).endDate, ne);
    await open('rental_fleet.html', FLEET_READY);
    const cal = '#fleetCalDesk [data-booking-id="' + b1.bookingId + '"]';
    await until(() => exists(cal), 'cal after');
    const tip = await js('document.querySelector('+q(cal)+')?.getAttribute("title")||""');
    assert.ok(tip.includes(ns) && tip.includes(ne), tip);
  });

  await test('3. 他予約と重複時は変更されない', async () => {
    const before = { ...booking(b1.bookingId) };
    await openRescheduleDesktop(b1.bookingId);
    await set('#fleetRescheduleStart', s2);
    await set('#fleetRescheduleEnd', e2);
    await click('#fleetRescheduleCheck');
    await until(() => js('document.getElementById("fleetRescheduleRepick")'), 'conflict');
    assert(await js('document.getElementById("fleetNewBookingWizard").innerText.includes("別のお客様")'));
    assert.equal(booking(b1.bookingId).startDate, before.startDate);
    assert.equal(booking(b1.bookingId).endDate, before.endDate);
  });

  await test('4. 変更対象自身は重複判定から除外（期間延長）', async () => {
    const cur = booking(b1.bookingId);
    const ns = cur.startDate;
    const ne = jstYmd(18);
    await openRescheduleDesktop(b1.bookingId);
    await set('#fleetRescheduleStart', ns);
    await set('#fleetRescheduleEnd', ne);
    await click('#fleetRescheduleCheck');
    await until(() => js('document.getElementById("fleetRescheduleConfirm")'), 'self-ok');
    await click('#fleetRescheduleConfirm');
    await until(() => booking(b1.bookingId).endDate === ne, 'stored extend');
  });

  await test('5. 貸出中は開始日不可・返却日のみ変更', async () => {
    const bout = createBooking(TODAY, TODAY);
    call(gas, 'update_fleet_booking', 'T-A', { bookingId: bout.bookingId, status: 'out', startDate: TODAY, endDate: TODAY, baseServerRev: bout.serverRev });
    await openRescheduleDesktop(bout.bookingId);
    assert.equal(await js('document.getElementById("fleetRescheduleStart")?.disabled'), true);
    const ne = jstYmd(2);
    await set('#fleetRescheduleEnd', ne);
    await click('#fleetRescheduleCheck');
    await until(() => js('document.getElementById("fleetRescheduleConfirm")'), 'out ok');
    await click('#fleetRescheduleConfirm');
    await until(() => booking(bout.bookingId).endDate === ne, 'out end');
    assert.equal(booking(bout.bookingId).startDate, TODAY);
    assert.equal(booking(bout.bookingId).status, 'out');
  });

  await test('8. スマホ幅で日程変更操作', async () => {
    await iphone();
    await open('rental_fleet.html', FLEET_READY);
    await sleep(300);
    await js('document.getElementById("fleetCalToday").click();true');
    if (s2.slice(0, 7) !== TODAY.slice(0, 7)) await js('document.getElementById("fleetCalNext").click();true');
    await until(() => exists('#fleetCalMob [data-booking-id="' + b2.bookingId + '"]'), 'mob bar');
    await click('#fleetCalMob [data-booking-id="' + b2.bookingId + '"]');
    await until(() => js('!document.getElementById("fleetMobDetailSheet").hidden'), 'sheet');
    await js('[...document.querySelectorAll("#fleetMobDetailHost button")].find(b=>b.textContent.includes("日程変更")).click();true');
    await until(() => js('!document.getElementById("fleetNewBookingWizard").hidden'), 'reschedule wizard mob');
    assert.equal(await js('!!document.getElementById("fleetRescheduleCheck")'), true);
    const rect = await js('(()=>{const el=document.querySelector(".ring-fleet-wizard-inner");const r=el.getBoundingClientRect();return {w:innerWidth,left:r.left,right:r.right,top:r.top,bottom:r.bottom};})()');
    assert(rect.left >= 0 && rect.right <= rect.w + 2);
    await click('.ring-fleet-wizard-close');
    await until(() => js('document.getElementById("fleetNewBookingWizard").hidden'), 'closed');
  });

  assert.equal(errors.length, 0, errors.join('\n'));
  console.log('SUMMARY passed=' + passed + ' failed=' + failed);
} finally {
  try { ws && ws.close(); } catch { /* ignore */ }
  try { proc.kill('SIGTERM'); } catch { /* ignore */ }
  server.close();
  try { fs.rmSync(profileDir, { recursive: true, force: true }); } catch { /* ignore */ }
}
process.exitCode = failed ? 1 : 0;