/**
 * v65-5 handoff 無効（hydrate 不可）
 */
let pass = 0;
let fail = 0;
const ok = (c, m) => (c ? (pass++, console.log('PASS:', m)) : (fail++, console.error('FAIL:', m)));

const session = { _d: {}, getItem(k) { return this._d[k] ?? null; }, setItem(k, v) { this._d[k] = v; }, removeItem(k) { delete this._d[k]; } };

function ringHistoryHandoffClear_() { session.removeItem('ring_history_tab_handoff_v1'); }
function ringHistoryHandoffSaveForVin_() {
  session.setItem('ring_history_tab_handoff_v1', '{"rows":[{"title":"leak"}]}');
  ringHistoryHandoffClear_();
}
function ringHistoryHandoffTryHydrateVin_() {
  ringHistoryHandoffClear_();
  return false;
}

ringHistoryHandoffSaveForVin_('VIN1', [{ title: 'secret' }]);
ok(!session.getItem('ring_history_tab_handoff_v1'), 'legacy blob purged on save');
ok(ringHistoryHandoffTryHydrateVin_('VIN1') === false, 'hydrate disabled');

console.log('\nTotal PASS:', pass, 'FAIL:', fail);
if (fail) process.exit(1);