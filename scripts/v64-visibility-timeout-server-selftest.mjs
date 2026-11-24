/**
 * v64: クライアントが古い応答を捨てた後も、サーバー相当状態と再送で最終一致（Node）
 * タイムアウト後にサーバーだけ完了する系は GAS 実機依存のため、モックで「遅延完了」を区別
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const uiSrc = fs.readFileSync(path.join(root, 'owner-platform-ui.js'), 'utf8').replace('var VIS_DEBOUNCE_MS = 400;', 'var VIS_DEBOUNCE_MS = 0;');
const store = new Map();
const ls = { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) };

let server = 'public';
let call = 0;
let delayFirst = true;

const g = {
  console, setTimeout, clearTimeout,
  localStorage: ls, sessionStorage: { getItem: () => null, setItem: () => {} },
  document: { addEventListener: () => {}, querySelectorAll: () => [] }, addEventListener: () => {},
  ringOwnerPlatform: {
    active: () => true,
    setHistoryVisibility: async (id, vis) => {
      call++;
      if (delayFirst && call === 1) await new Promise((r) => setTimeout(r, 30));
      server = vis;
      return { success: true, visibility: vis };
    }
  },
  ringRetryQueueResolveOwner_: () => ({ queueOwnerAccountKind: 'user', queueOwnerUserId: 'U1', queueOwnerMode: 'user' }),
  ringRetryQueueItemMayFlush_: () => true,
  getCurrentProfile: () => ({ userId: 'U1', shopType: 'user', role: 'user' }),
  getMaintenanceLogsByVin: () => [{ log_id: 'L1', vin: 'V1', visibility: server, historyVisibilityEditable: true }],
  ringCaptureRequestContext_: () => ({}), ringRequestContextIsCurrent_: () => true,
  _normalize: (v) => String(v || '').trim().toUpperCase(), escapeHtml: (s) => String(s || ''), navigator: { onLine: true }
};
g.window = g; g.globalThis = g;
vm.runInNewContext(uiSrc, g, { filename: 'owner-platform-ui.js' });
const UI = g.ringOwnerPlatformUi;
const log = { log_id: 'L1', vin: 'V1', visibility: 'public', historyVisibilityEditable: true };
const cb = { checked: false, addEventListener: (ev, fn) => { cb._fn = fn; }, _ringVisQWired: false };
UI.wireVisibilityCheckbox(cb, log, 'V1', () => {});
cb.checked = true; cb._fn();
const p1 = UI.flushVisibilityQueue();
cb.checked = false; cb._fn();
await p1;
await UI.flushVisibilityQueue();
if (server !== 'public') throw new Error('server should be public, got ' + server);
if (call < 2) throw new Error('expected >=2 gas calls, got ' + call);
const raw = ls.getItem('ring_visibility_pending_v1');
if (raw) {
  const slot = JSON.parse(raw).byLog?.L1;
  if (slot && slot.targetVisibility !== slot.confirmedVisibility) throw new Error('queue should settle');
}
console.log('v64-visibility-timeout-server-selftest: OK');
process.exit(0);