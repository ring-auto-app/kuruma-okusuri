/**
 * v64: 保存順序・古い応答・サーバー最終状態
 * 実行: node scripts/v64-visibility-order-selftest.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const uiSrc = fs.readFileSync(path.join(root, 'owner-platform-ui.js'), 'utf8')
  .replace('var VIS_DEBOUNCE_MS = 400;', 'var VIS_DEBOUNCE_MS = 0;');
const store = new Map();
const ls = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => { store.set(k, String(v)); },
  removeItem: (k) => store.delete(k)
};

function runCtx(gasMock) {
  const g = {
    console,
    setTimeout,
    clearTimeout,
    localStorage: ls,
    sessionStorage: { getItem: () => null, setItem: () => {} },
    document: { addEventListener: () => {}, querySelectorAll: () => [] },
    addEventListener: () => {},
    ringOwnerPlatform: {
      active: () => true,
      setHistoryVisibility: gasMock.set,
      bulkHistoryVisibility: gasMock.bulk || (async () => ({ success: true, updated: 2, visibility: 'private' }))
    },
    ringRetryQueueResolveOwner_: () => ({ queueOwnerAccountKind: 'user', queueOwnerUserId: 'U1', queueOwnerMode: 'user' }),
    ringRetryQueueItemMayFlush_: gasMock.mayFlush === false ? () => false : () => true,
    getCurrentProfile: () => ({ userId: 'U1', shopType: 'user', role: 'user' }),
    getMaintenanceLogsByVin: () => [{ log_id: 'L1', vin: 'VIN1', visibility: gasMock.server, historyVisibilityEditable: true }],
    ringCaptureRequestContext_: () => ({ token: 't', epoch: 1 }),
    ringRequestContextIsCurrent_: () => true,
    _normalize: (v) => String(v || '').trim().toUpperCase(),
    escapeHtml: (s) => String(s || ''),
    navigator: { onLine: true }
  };
  g.window = g;
  g.globalThis = g;
  vm.runInNewContext(uiSrc, g, { filename: 'owner-platform-ui.js' });
  return { g, UI: g.ringOwnerPlatformUi };
}

let n = 0;
function ok(c, m) { if (!c) throw new Error('FAIL: ' + m); n++; }

async function testPublicPrivatePublic() {
  store.clear();
  let server = 'public';
  const calls = [];
  const { UI } = runCtx({
    server,
    set: async (id, vis) => {
      calls.push(vis);
      server = vis;
      return { success: true, visibility: vis };
    }
  });
  const log = { log_id: 'L1', vin: 'VIN1', visibility: 'public', historyVisibilityEditable: true };
  const cb = { checked: false, addEventListener: (ev, fn) => { cb._fn = fn; }, _ringVisQWired: false };
  UI.wireVisibilityCheckbox(cb, log, 'VIN1', () => {});
  for (const want of [true, false, true, false, true]) {
    cb.checked = want;
    cb._fn();
    await UI.flushVisibilityQueue();
  }
  ok(server === 'private', 'server final private after 5 toggles ending checked');
  ok(calls[calls.length - 1] === 'private', 'last gas call private');
  await UI.flushVisibilityQueue();
  const raw = ls.getItem('ring_visibility_pending_v1');
  if (raw) {
    const q = JSON.parse(raw);
    const slot = q.byLog && q.byLog.L1;
    ok(!slot || slot.targetVisibility === slot.confirmedVisibility, 'queue has no pending L1');
  }
}

async function testStaleResponseDoesNotBlockResend() {
  store.clear();
  let server = 'public';
  let releaseFirst;
  let call = 0;
  const { UI } = runCtx({
    server,
    set: async (id, vis) => {
      call++;
      if (call === 1) {
        await new Promise((r) => { releaseFirst = r; });
      }
      server = vis;
      return { success: true, visibility: vis };
    }
  });
  const log = { log_id: 'L1', vin: 'VIN1', visibility: 'public', historyVisibilityEditable: true };
  const cb = { checked: false, addEventListener: (ev, fn) => { cb._fn = fn; }, _ringVisQWired: false };
  UI.wireVisibilityCheckbox(cb, log, 'VIN1', () => {});
  cb.checked = true;
  cb._fn();
  const flush1 = UI.flushVisibilityQueue();
  await new Promise((r) => setImmediate(r));
  ok(typeof releaseFirst === 'function', 'slow request started');
  cb.checked = false;
  cb._fn();
  releaseFirst();
  await flush1;
  await UI.flushVisibilityQueue();
  ok(call >= 2, 'retried after stale ack');
  ok(server === 'public', 'server ends at latest public intent');
  const q = JSON.parse(ls.getItem('ring_visibility_pending_v1') || '{}');
  const slot = q.byLog && q.byLog.L1;
  ok(!slot || slot.targetVisibility === slot.confirmedVisibility, 'no stuck pending');
}

async function testStorageMergeKeepsNewerIntent() {
  store.clear();
  const older = { v: 1, byLog: { L1: { logId: 'L1', vin: 'VIN1', intentSeq: 3, targetVisibility: 'private', confirmedVisibility: 'public', status: 'pending', updatedAt: 100, owner: { queueOwnerUserId: 'U1', queueOwnerMode: 'user' } } }, bulk: null };
  store.set('ring_visibility_pending_v1', JSON.stringify(older));
  let server = 'public';
  const { UI } = runCtx({
    server,
    set: async (id, vis) => {
      server = vis;
      return { success: true, visibility: vis };
    }
  });
  const log = { log_id: 'L1', vin: 'VIN1', visibility: 'public', historyVisibilityEditable: true };
  const cb = { checked: true, addEventListener: (ev, fn) => { cb._fn = fn; }, _ringVisQWired: false };
  UI.wireVisibilityCheckbox(cb, log, 'VIN1', () => {});
  cb.checked = false;
  cb._fn();
  const q = JSON.parse(ls.getItem('ring_visibility_pending_v1'));
  ok(q.byLog.L1.intentSeq === 4, 'hydrated seq 3 then incremented');
  ok(q.byLog.L1.targetVisibility === 'public', 'public overrides stored private');
  await UI.flushVisibilityQueue();
  ok(server === 'public', 'newer public intent wins on server');
}

async function testOwnerMismatchFailsFlush() {
  store.clear();
  const blocked = { v: 1, byLog: { L1: { logId: 'L1', vin: 'VIN1', intentSeq: 1, targetVisibility: 'private', confirmedVisibility: 'public', status: 'pending', owner: { queueOwnerUserId: 'OTHER', queueOwnerMode: 'user' }, updatedAt: 1 } }, bulk: null };
  store.set('ring_visibility_pending_v1', JSON.stringify(blocked));
  let calls = 0;
  const { UI } = runCtx({
    server: 'public',
    mayFlush: false,
    set: async () => { calls++; return { success: true, visibility: 'private' }; }
  });
  await UI.flushVisibilityQueue();
  ok(calls === 0, 'no gas when owner mismatch');
  const q = JSON.parse(ls.getItem('ring_visibility_pending_v1'));
  ok(q.byLog.L1.status === 'failed', 'marked failed not sent');
}

await testPublicPrivatePublic();
await testStaleResponseDoesNotBlockResend();
await testStorageMergeKeepsNewerIntent();
await testOwnerMismatchFailsFlush();

console.log('v64-visibility-order-selftest: OK (' + n + ' assertions)');
process.exit(0);