/**
 * v64: localStorage マージ（別タブ相当）— Node のみ
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const uiSrc = fs.readFileSync(path.join(root, 'owner-platform-ui.js'), 'utf8').replace('var VIS_DEBOUNCE_MS = 400;', 'var VIS_DEBOUNCE_MS = 0;');
const store = new Map();
const ls = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => { store.set(k, String(v)); },
  removeItem: (k) => store.delete(k)
};

function boot() {
  const g = {
    console, setTimeout: (fn) => { fn(); return 0; }, clearTimeout: () => {},
    localStorage: ls, sessionStorage: { getItem: () => null, setItem: () => {} },
    document: { addEventListener: () => {}, querySelectorAll: () => [] }, addEventListener: () => {},
    ringOwnerPlatform: { active: () => true, setHistoryVisibility: async (id, vis) => ({ success: true, visibility: vis }) },
    ringRetryQueueResolveOwner_: () => ({ queueOwnerAccountKind: 'user', queueOwnerUserId: 'U1', queueOwnerMode: 'user' }),
    ringRetryQueueItemMayFlush_: () => true,
    getCurrentProfile: () => ({ userId: 'U1', shopType: 'user', role: 'user' }),
    getMaintenanceLogsByVin: () => [{ log_id: 'L1', vin: 'V1', visibility: 'public', historyVisibilityEditable: true }],
    ringCaptureRequestContext_: () => ({}), ringRequestContextIsCurrent_: () => true,
    _normalize: (v) => String(v || '').trim().toUpperCase(), escapeHtml: (s) => String(s || ''), navigator: { onLine: true }
  };
  g.window = g; g.globalThis = g;
  vm.runInNewContext(uiSrc, g, { filename: 'owner-platform-ui.js' });
  return g.ringOwnerPlatformUi;
}

const UI = boot();
store.set('ring_visibility_pending_v1', JSON.stringify({
  v: 1,
  byLog: { L1: { logId: 'L1', vin: 'V1', intentSeq: 5, targetVisibility: 'private', confirmedVisibility: 'public', status: 'pending', updatedAt: 200, owner: { queueOwnerUserId: 'U1', queueOwnerMode: 'user', queueOwnerAccountKind: 'user' } } },
  bulk: null
}));
const UI2 = boot();
const log = { log_id: 'L1', vin: 'V1', visibility: 'public', historyVisibilityEditable: true };
const cb = { checked: false, addEventListener: (ev, fn) => { cb._fn = fn; }, _ringVisQWired: false };
UI2.wireVisibilityCheckbox(cb, log, 'V1', () => {});
cb.checked = true;
cb._fn();
const q = JSON.parse(ls.getItem('ring_visibility_pending_v1'));
if (q.byLog.L1.intentSeq !== 6) throw new Error('expected seq 6 got ' + q.byLog.L1.intentSeq);
if (q.byLog.L1.targetVisibility !== 'private') throw new Error('private intent');
console.log('v64-visibility-multitab-selftest: OK');
process.exit(0);