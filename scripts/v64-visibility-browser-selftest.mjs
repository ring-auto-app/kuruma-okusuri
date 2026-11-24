/**
 * v64 公開設定キュー — ローカル HTTP + Headless Chrome
 * Run: node scripts/v64-visibility-browser-selftest.mjs
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const chrome = process.env.RING_TEST_CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
if (!fs.existsSync(chrome)) {
  console.error('SKIP: Chrome unavailable (set RING_TEST_CHROME)');
  process.exit(2);
}

const VIN = 'VIN-V64-VIS';
const LOG1 = 'LOG-V64-1';
const LOG2 = 'LOG-V64-2';
const SEED_PROFILE = { shopId: 'SHOP-A', userId: 'A1', role: 'master', shopType: 'factory', shopName: 'A' };
const SERVER_FEATURES = { ownerPlatform: true, ownerPlatformOperational: true, historyVisibilityEditable: true };

const visState = { [LOG1]: 'public', [LOG2]: 'public', editable: true };
let gasDelayMs = 0;
let blockGas = false;
let gasSlowHold = null;

function historyPayload() {
  return {
    success: true,
    historyAclVersion: 1,
    serverFeatures: SERVER_FEATURES,
    logs: [
      { log_id: LOG1, vin: VIN, date: '2026-06-15', type: 'repair', title: 'オイル交換',
        visibility: visState[LOG1], historyVisibilityEditable: visState.editable, shopId: 'SHOP-A', shopType: 'factory' },
      { log_id: LOG2, vin: VIN, date: '2026-05-10', type: 'repair', title: 'タイヤ',
        visibility: visState[LOG2], historyVisibilityEditable: visState.editable, shopId: 'SHOP-A', shopType: 'factory' }
    ]
  };
}

const traffic = [];
const server = http.createServer((req, res) => {
  const u = new URL(req.url, 'http://localhost');
  if (u.pathname === '/gas' && req.method === 'POST') {
    let body = '';
    req.on('data', (c) => { body += c; });
    req.on('end', () => {
      (async () => {
        const payload = JSON.parse(body || '{}');
        const act = payload.action;
        if (blockGas && (act === 'owner_set_history_visibility' || act === 'owner_bulk_history_visibility')) {
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ success: false, error: 'NETWORK_OFFLINE' }));
          return;
        }
        if (gasDelayMs > 0 && (act === 'owner_set_history_visibility' || act === 'owner_bulk_history_visibility')) {
          await new Promise((r) => setTimeout(r, gasDelayMs));
        }
        if (gasSlowHold && (act === 'owner_set_history_visibility' || act === 'owner_bulk_history_visibility')) {
          await new Promise((r) => { gasSlowHold = r; });
        }
        let out;
        if (act === 'verify_session') {
          out = { success: true, profile: SEED_PROFILE, authToken: payload.authToken, serverFeatures: SERVER_FEATURES };
        } else if (act === 'get_maintenance_history' || act === 'get_shop_maintenance_history') {
          out = historyPayload();
        } else if (act === 'get_vehicles') {
          out = { success: true, vehicles: [{ vin: VIN, shopId: 'SHOP-A' }], serverFeatures: SERVER_FEATURES };
        } else if (act === 'owner_set_history_visibility') {
          const id = payload.log_id || payload.logId;
          visState[id] = payload.visibility;
          out = { success: true, log_id: id, visibility: payload.visibility };
        } else if (act === 'owner_bulk_history_visibility') {
          const ids = payload.log_ids || payload.logIds || [];
          ids.forEach((id) => { visState[id] = payload.visibility; });
          out = { success: true, updated: ids.length, visibility: payload.visibility };
        } else {
          out = { success: true };
        }
        traffic.push({ action: act, payload, out });
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(out));
      })().catch((e) => {
        res.writeHead(500); res.end(String(e));
      });
    });
    return;
  }
  const rel = decodeURIComponent(u.pathname).replace(/^\//, '') || 'index.html';
  const target = path.resolve(root, rel.split('?')[0]);
  if (!target.startsWith(root + path.sep) || !fs.existsSync(target) || !fs.statSync(target).isFile()) {
    res.writeHead(404); res.end(); return;
  }
  const ext = path.extname(target);
  res.setHeader('Content-Type', ({ '.js': 'text/javascript', '.html': 'text/html; charset=utf-8', '.css': 'text/css' })[ext] || 'application/octet-stream');
  res.setHeader('Cache-Control', 'no-store');
  let body = fs.readFileSync(target);
  if (ext === '.html') {
    body = Buffer.from(body.toString('utf8')
      .replace(/\s+integrity="[^"]*"/g, '')
      .replace(/\s+crossorigin="[^"]*"/g, ''), 'utf8');
  }
  res.end(body);
});

await new Promise((r) => server.listen(0, '127.0.0.1', r));
const origin = 'http://127.0.0.1:' + server.address().port;
const cachedLogs = historyPayload().logs.map((l) => Object.assign({}, l));

const INIT = `(() => {
  window.__RING_GAS_URL_OVERRIDE__ = location.origin + '/gas';
  window.confirm = () => true;
  if (location.search.indexOf('_fresh=1') >= 0) {
    localStorage.removeItem('ring_visibility_pending_v1');
    localStorage.removeItem('ring_visibility_flush_lock_v1');
  }
  const p = ${JSON.stringify(SEED_PROFILE)};
  const now = new Date().toISOString();
  const feats = ${JSON.stringify({ scope: 'shop:SHOP-A', features: SERVER_FEATURES, expiresAt: Date.now() + 600000 })};
  localStorage.setItem('ring_current_mode', 'shop');
  localStorage.setItem('ring_shop_token', 'T-A');
  localStorage.setItem('ring_shop_profile', JSON.stringify({ profile: p, updatedAt: now, verifiedAt: now }));
  localStorage.setItem('nappy_current_user', JSON.stringify(p));
  localStorage.setItem('ring_auth_token', 'T-A');
  localStorage.setItem('ring_gas_server_features_v1', JSON.stringify(feats));
  localStorage.setItem('nappy_logs_v1', JSON.stringify(${JSON.stringify(cachedLogs)}));
  localStorage.setItem('nappy_vehicles_v1', JSON.stringify([{ vin: ${JSON.stringify(VIN)}, shopId: 'SHOP-A', vehicleCategory: 'managed', serverRev: 1 }]));
  window.__ringLoadingShown = false;
  window.__ringVisToasts = [];
  const _show = window.showLoading;
  if (typeof _show === 'function') window.showLoading = function () { window.__ringLoadingShown = true; return _show.apply(this, arguments); };
  const _toast = window.showToast;
  if (typeof _toast === 'function') {
    window.showToast = function (kind, msg) { window.__ringVisToasts.push(kind + ':' + msg); return _toast.apply(this, arguments); };
  }
})();`;

const profileDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ring-v64-vis-'));
const proc = spawn(chrome, ['--headless=new', '--remote-debugging-port=0', '--user-data-dir=' + profileDir,
  '--no-first-run', '--disable-extensions', '--no-proxy-server', 'about:blank'], { windowsHide: true, stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function until(fn, label, tries = 150) {
  for (let i = 0; i < tries; i++) { const v = await fn(); if (v) return v; await sleep(100); }
  throw new Error('timeout: ' + label);
}

let ws; let passed = 0; let failed = 0;
try {
  const port = await until(() => {
    try { return fs.readFileSync(path.join(profileDir, 'DevToolsActivePort'), 'utf8').split(/\r?\n/)[0]; } catch { return null; }
  }, 'devtools');
  const target = await (await fetch('http://127.0.0.1:' + port + '/json/new?about:blank', { method: 'PUT' })).json();
  ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
  let seq = 0; const pending = new Map();
  const cdp = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++seq;
    const timer = setTimeout(() => { pending.delete(id); reject(new Error(method + ' timeout')); }, 60000);
    pending.set(id, { resolve: (x) => { clearTimeout(timer); resolve(x); }, reject: (x) => { clearTimeout(timer); reject(x); } });
    ws.send(JSON.stringify({ id, method, params }));
  });
  ws.onmessage = (e) => {
    const m = JSON.parse(e.data);
    if (m.id) { const p = pending.get(m.id); if (!p) return; pending.delete(m.id); m.error ? p.reject(new Error(m.error.message)) : p.resolve(m.result); }
    if (m.method === 'Fetch.requestPaused') {
      const p = m.params;
      const local = p.request.url.startsWith(origin + '/');
      cdp(local ? 'Fetch.continueRequest' : 'Fetch.failRequest', local ? { requestId: p.requestId } : { requestId: p.requestId, errorReason: 'BlockedByClient' }).catch(() => {});
    }
  };
  const js = async (expression) => {
    const r = await cdp('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true, replMode: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
    return r.result.value;
  };
  await cdp('Fetch.enable', { patterns: [{ urlPattern: '*' }] });
  await cdp('Page.enable');
  await cdp('Runtime.enable');
  await cdp('Page.addScriptToEvaluateOnNewDocument', { source: INIT });
  const q = JSON.stringify;

  async function openDetail(sync, fresh) {
    const freshQ = fresh !== false ? '&_fresh=1' : '';
    await cdp('Page.navigate', { url: origin + '/factory_detail.html?vin=' + encodeURIComponent(VIN) + '&log_id=' + encodeURIComponent(LOG1) + freshQ + '&_ts=' + Date.now() });
    await until(() => js('document.readyState === "complete"').catch(() => false), 'load detail');
    if (sync !== false) {
      await js(`(async()=>{ if(typeof syncMaintenanceHistoryForVin==='function') await syncMaintenanceHistoryForVin(${q(VIN)}); return true; })()`);
    }
    await until(() => js('!!document.getElementById("ring-log-vis-toggle")'), 'detail toggle');
    await until(() => js('!!(window.ringOwnerPlatformUi && window.ringOwnerPlatformUi.flushVisibilityQueue)'), 'flush fn');
  }

  async function openHistory(fresh) {
    const freshQ = fresh !== false ? '&_fresh=1' : '';
    await cdp('Page.navigate', { url: origin + '/factory_history.html?vin=' + encodeURIComponent(VIN) + freshQ + '&_ts=' + Date.now() });
    await until(() => js('document.readyState === "complete"').catch(() => false), 'load history');
    await js(`(async()=>{ if(typeof syncMaintenanceHistoryForVin==='function') await syncMaintenanceHistoryForVin(${q(VIN)}); return true; })()`);
    await until(() => js('!!document.getElementById("ring-bulk-private-toggle")'), 'bulk toggle');
    await until(() => js('!!(window.ringOwnerPlatformUi && window.ringOwnerPlatformUi.flushVisibilityQueue)'), 'flush fn');
  }

  const flushVis = () => js(`(async()=>{
    await window.ringOwnerPlatformUi.flushVisibilityQueue();
    return true;
  })()`);

  const waitGas = (action, min = 1) => until(() => traffic.filter((t) => t.action === action).length >= min, 'gas ' + action, 120);

  const test = async (name, fn) => {
    gasDelayMs = 0;
    blockGas = false;
    gasSlowHold = null;
    visState[LOG1] = 'public';
    visState[LOG2] = 'public';
    visState.editable = true;
    traffic.length = 0;
    await cdp('Page.navigate', { url: 'about:blank' });
    await sleep(200);
    try { await fn(); passed++; console.log('PASS ' + name); }
    catch (e) { failed++; console.error('FAIL ' + name + ': ' + e.message); }
  };

  await test('連続10回切替: UI即時・disabledなし・最終publicでGAS一致', async () => {
    await openDetail();
    const disabledDuring = JSON.parse(await js(`JSON.stringify((()=>{
      const el = document.getElementById('ring-log-vis-toggle');
      const out = [];
      for (let i = 0; i < 10; i++) {
        el.checked = !el.checked;
        el.dispatchEvent(new Event('change', { bubbles: true }));
        out.push(!!el.disabled);
      }
      return out;
    })())`));
    assert.equal(disabledDuring.every((d) => !d), true);
    assert.equal(await js('document.getElementById("ring-log-vis-toggle").checked'), false, '10 toggles from public ends public UI');
    await js(`(() => { const el=document.getElementById('ring-log-vis-toggle'); el.checked=true; el.dispatchEvent(new Event('change',{bubbles:true})); return true; })()`);
    assert.equal(await js('document.getElementById("ring-log-vis-toggle").checked'), true, '11th intent private');
    await sleep(500);
    await flushVis();
    await waitGas('owner_set_history_visibility');
    const last = traffic.filter((t) => t.action === 'owner_set_history_visibility').pop();
    assert.equal(last.payload.visibility, 'private');
    assert.equal(visState[LOG1], 'private');
    assert.equal(await js(`(window.__ringVisToasts||[]).some(m=>m.startsWith('success:')&&/保存/.test(m))`), false);
    assert.equal(await js('!!window.__ringLoadingShown'), false);
  });

  await test('保存中の反転: サーバー非公開→公開切替で public 保存', async () => {
    visState[LOG1] = 'private';
    await openDetail();
    assert.equal(await js('document.getElementById("ring-log-vis-toggle").checked'), true, 'starts private');
    await js(`(() => { const el=document.getElementById('ring-log-vis-toggle'); el.checked=false; el.dispatchEvent(new Event('change',{bubbles:true})); return true; })()`);
    await sleep(500);
    await flushVis();
    await waitGas('owner_set_history_visibility');
    const calls = traffic.filter((t) => t.action === 'owner_set_history_visibility');
    assert.equal(calls[calls.length - 1].payload.visibility, 'public');
    assert.equal(visState[LOG1], 'public');
    const settled = await js(`(() => {
      const raw = localStorage.getItem('ring_visibility_pending_v1') || '';
      if (!raw) return true;
      const slot = JSON.parse(raw).byLog?.[${q(LOG1)}];
      return !slot || slot.targetVisibility === slot.confirmedVisibility;
    })()`);
    assert.equal(settled, true);
  });

  await test('一括非公開後の個別公開: サーバー状態が行ごとに一致', async () => {
    await openHistory();
    await js(`(() => { const t=document.getElementById('ring-bulk-private-toggle'); t.checked=true; t.dispatchEvent(new Event('change',{bubbles:true})); return true; })()`);
    await sleep(500);
    await flushVis();
    await waitGas('owner_bulk_history_visibility');
    assert.equal(visState[LOG1], 'private');
    assert.equal(visState[LOG2], 'private');
    await openDetail();
    await js(`(() => { const el=document.getElementById('ring-log-vis-toggle'); if(!el.checked) el.click(); else { el.checked=false; el.dispatchEvent(new Event('change',{bubbles:true})); } return true; })()`);
    await sleep(500);
    await flushVis();
    await waitGas('owner_set_history_visibility', 1);
    const singles = traffic.filter((t) => t.action === 'owner_set_history_visibility');
    assert.equal(singles[singles.length - 1].payload.visibility, 'public');
    assert.equal(visState[LOG1], 'public');
    assert.equal(visState[LOG2], 'private');
  });

  await test('通信切断→オンライン復帰: failed後に再送成功', async () => {
    blockGas = true;
    await openDetail();
    await js(`(() => { const el=document.getElementById('ring-log-vis-toggle'); el.checked=true; el.dispatchEvent(new Event('change',{bubbles:true})); return true; })()`);
    await sleep(500);
    await flushVis();
    await until(() => js(`((JSON.parse(localStorage.getItem('ring_visibility_pending_v1')||'{}').byLog||{})[${q(LOG1)}]||{}).status==='failed'`), 'failed status', 40);
    blockGas = false;
    await js(`window.dispatchEvent(new Event('online')); true`);
    await sleep(800);
    await flushVis();
    await waitGas('owner_set_history_visibility');
    assert.equal(visState[LOG1], 'private');
  });

  await test('ページ移動後: 未保存キューが維持され復旧保存', async () => {
    await openDetail();
    await js(`(() => { const el=document.getElementById('ring-log-vis-toggle'); el.checked=true; el.dispatchEvent(new Event('change',{bubbles:true})); return true; })()`);
    const hasQ = await js(`!!localStorage.getItem('ring_visibility_pending_v1')`);
    assert.equal(hasQ, true);
    await openHistory(false);
    const still = await js(`(() => { try { return !!JSON.parse(localStorage.getItem('ring_visibility_pending_v1')||'{}').byLog[${q(LOG1)}]; } catch(e){return false;} })()`);
    assert.equal(still, true);
    await flushVis();
    await waitGas('owner_set_history_visibility');
    assert.equal(visState[LOG1], 'private');
  });

  await test('アカウント不一致: GAS未送信・failed', async () => {
    await openDetail(true, true);
    await sleep(500);
    const visCallsBefore = traffic.filter((t) => t.action === 'owner_set_history_visibility').length;
    await js(`localStorage.setItem('ring_visibility_pending_v1', JSON.stringify({
      v:1, byLog:{ ${q(LOG1)}: { logId:${q(LOG1)}, vin:${q(VIN)}, intentSeq:1, targetVisibility:'private', confirmedVisibility:'public',
      status:'pending', updatedAt:Date.now(), owner:{ queueOwnerUserId:'OTHER', queueOwnerMode:'user', queueOwnerAccountKind:'user' } } }, bulk:null
    })); true`);
    await flushVis();
    await sleep(500);
    const visCallsAfter = traffic.filter((t) => t.action === 'owner_set_history_visibility').length;
    assert.equal(visCallsAfter, visCallsBefore);
    const st = await js(`((JSON.parse(localStorage.getItem('ring_visibility_pending_v1')||'{}').byLog||{})[${q(LOG1)}]||{}).status`);
    assert.equal(st, 'failed');
    assert.equal(visState[LOG1], 'public');
  });
} finally {
  try { ws?.close(); } catch { /* ignore */ }
  proc.kill('SIGTERM');
  server.close();
  try { fs.rmSync(profileDir, { recursive: true, force: true }); } catch { /* ignore */ }
}

if (failed) {
  console.error('v64-visibility-browser-selftest: FAILED (' + passed + ' pass, ' + failed + ' fail)');
  process.exit(1);
}
console.log('v64-visibility-browser-selftest: OK (' + passed + ' pass)');
process.exit(0);