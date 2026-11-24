/**
 * v64: 公開設定キュー（intentSeq・最新意図優先）スモーク
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const uiSrc = fs.readFileSync(path.join(root, 'owner-platform-ui.js'), 'utf8');
const store = new Map();
const ls = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => { store.set(k, String(v)); },
  removeItem: (k) => store.delete(k)
};
const g = {
  console,
  setTimeout: (fn) => { fn(); return 0; },
  clearTimeout: () => {},
  localStorage: ls,
  sessionStorage: { getItem: () => null, setItem: () => {} },
  document: { addEventListener: () => {}, querySelectorAll: () => [] },
  addEventListener: () => {},
  ringOwnerPlatform: {
    active: () => true,
    setHistoryVisibility: async () => ({ success: true, visibility: 'private' }),
    bulkHistoryVisibility: async () => ({ success: true, updated: 2 })
  },
  ringRetryQueueResolveOwner_: () => ({ queueOwnerAccountKind: 'user', queueOwnerUserId: 'U1', queueOwnerMode: 'user' }),
  ringRetryQueueItemMayFlush_: () => true,
  getCurrentProfile: () => ({ userId: 'U1', shopType: 'user', role: 'user' }),
  getMaintenanceLogsByVin: () => [{ log_id: 'L1', vin: 'VIN1', visibility: 'public', historyVisibilityEditable: true }],
  ringCaptureRequestContext_: () => ({ token: 't', epoch: 1 }),
  ringRequestContextIsCurrent_: () => true,
  _normalize: (v) => String(v || '').trim().toUpperCase(),
  escapeHtml: (s) => String(s || '')
};
g.window = g;
g.globalThis = g;
vm.runInNewContext(uiSrc, g, { filename: 'owner-platform-ui.js' });
const UI = g.ringOwnerPlatformUi;
if (!UI || !UI.wireVisibilityCheckbox) throw new Error('missing UI');

let n = 0;
function ok(c, m) { if (!c) throw new Error('FAIL: ' + m); n++; }

const log = { log_id: 'L1', vin: 'VIN1', visibility: 'public', historyVisibilityEditable: true };
const cb = { checked: false, addEventListener: (ev, fn) => { cb._fn = fn; }, _ringVisQWired: false };
UI.wireVisibilityCheckbox(cb, log, 'VIN1', () => {});
cb.checked = true;
cb._fn();
ok(ls.getItem('ring_visibility_pending_v1'), 'persisted queue');
const q = JSON.parse(ls.getItem('ring_visibility_pending_v1'));
ok(q.byLog.L1 && q.byLog.L1.targetVisibility === 'private', 'intent private');
ok(q.byLog.L1.intentSeq === 1, 'seq 1');
cb.checked = false;
cb._fn();
const q2 = JSON.parse(ls.getItem('ring_visibility_pending_v1'));
ok(q2.byLog.L1.targetVisibility === 'public', 'intent public after toggle');
ok(q2.byLog.L1.intentSeq === 2, 'seq 2');

console.log('v64-visibility-queue-selftest: OK (' + n + ' assertions)');