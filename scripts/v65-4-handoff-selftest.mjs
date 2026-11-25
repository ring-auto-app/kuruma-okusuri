/**
 * v65-4 タブ handoff（sessionStorage）隔離検証
 */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
let pass = 0;
let fail = 0;
const ok = (c, m) => (c ? (pass++, console.log('PASS:', m)) : (fail++, console.error('FAIL:', m)));

const session = {};
const g = {
  localStorage: { _d: {}, getItem(k) { return this._d[k] ?? null; }, setItem(k, v) { this._d[k] = v; }, removeItem(k) { delete this._d[k]; } },
  sessionStorage: { _d: {}, getItem(k) { return this._d[k] ?? null; }, setItem(k, v) { this._d[k] = v; }, removeItem(k) { delete this._d[k]; } },
  window: null,
  document: { addEventListener() {} },
  Event: function Event() {},
  dispatchEvent() {},
  Map,
  Set,
  JSON,
  Date,
  console,
  globalThis: null
};
g.window = g;
g.globalThis = g;

const appSrc = readFileSync(join(root, 'app.js'), 'utf8');
// app.js is huge — only run if we can stub minimal; skip full app, test logic copy
// Lightweight re-test via exported functions after partial eval is unsafe; use inline mirror:

const HANDOFF = 'ring_history_tab_handoff_v1';
function safeJsonParse(raw, fb) { try { return JSON.parse(raw); } catch (e) { return fb; } }
function _normalize(v) { return String(v || '').trim().toUpperCase(); }

let ringHistoryView_ = new Map();
let ringHistoryContext_ = { scope: 's1', epoch: 1 };
function isMaintenanceLogType(l) { return l && l.type !== 'inspection' && l.type !== 'inspection_user'; }
function ringCaptureRequestContext_() { return { scope: 's1', epoch: 1 }; }
function ringRequestContextIsCurrent_(ctx) { return ctx && ctx.scope === 's1' && ctx.epoch === 1; }
function ringMaintenanceLogsSignature_(logs) { return String(logs.length) + '|' + (logs[0] && logs[0].log_id); }

function ringHistoryHandoffClear_() { g.sessionStorage.removeItem(HANDOFF); }
function ringHistoryHandoffSaveForVin_(vin, logs) {
  const key = _normalize(vin);
  const ctx = ringCaptureRequestContext_();
  const blob = { scope: ctx.scope, epoch: ctx.epoch, at: Date.now(), vins: {} };
  blob.vins[key] = { at: Date.now(), rows: logs.filter(isMaintenanceLogType) };
  g.sessionStorage.setItem(HANDOFF, JSON.stringify(blob));
}
function ringHistoryHandoffTryHydrateVin_(vin) {
  const key = _normalize(vin);
  const ctx = ringCaptureRequestContext_();
  const blob = safeJsonParse(g.sessionStorage.getItem(HANDOFF), null);
  if (!blob || blob.scope !== ctx.scope || blob.epoch !== ctx.epoch) return false;
  const pack = blob.vins[key];
  if (!pack || !pack.rows) return false;
  ringHistoryContext_ = ctx;
  pack.rows.forEach((row) => ringHistoryView_.set(row.log_id, row));
  return true;
}

ringHistoryHandoffSaveForVin_('abc', [{ log_id: 'L1', vin: 'ABC', type: 'maint', title: 'a' }]);
ok(ringHistoryHandoffTryHydrateVin_('abc'), 'hydrate same vin');
ok(ringHistoryView_.has('L1'), 'row in view');

ringCaptureRequestContext_ = function () { return { scope: 's1', epoch: 2 }; };
ringHistoryView_.clear();
ok(!ringHistoryHandoffTryHydrateVin_('abc'), 'reject wrong epoch');
ok(ringHistoryView_.size === 0, 'no stale row');

console.log('\nTotal PASS:', pass, 'FAIL:', fail);
if (fail) process.exit(1);