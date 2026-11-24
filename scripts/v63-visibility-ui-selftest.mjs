/**
 * v63: 公開設定フィルタ・表示状態のローカル自己テスト（GAS不使用）
 * 実行: node scripts/v63-visibility-ui-selftest.mjs
 */
import vm from 'node:vm';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const uiSrc = fs.readFileSync(path.join(root, 'owner-platform-ui.js'), 'utf8');

function assert(cond, msg) {
  if (!cond) throw new Error('FAIL: ' + msg);
}

var global = {
  ringOwnerPlatform: { active: function () { return true; } },
  document: { addEventListener: function () {} },
  addEventListener: function () {},
  localStorage: { getItem: function () { return null; } },
  showToast: function () {},
  showLoading: function () {},
  hideLoading: function () {}
};
vm.runInNewContext(uiSrc, global, { filename: 'owner-platform-ui.js' });
var UI = global.ringOwnerPlatformUi;
assert(UI, 'ringOwnerPlatformUi export');
assert(typeof UI.filterEditableVisibilityLogs === 'function', 'filterEditableVisibilityLogs');
assert(typeof UI.historyVisibilityUiState === 'function', 'historyVisibilityUiState');

var logs = [
  { log_id: '1', type: 'maintenance', historyVisibilityEditable: true, visibility: 'private' },
  { log_id: '2', type: 'maintenance', historyVisibilityEditable: false, visibility: 'private' },
  { log_id: '3', type: 'inspection_user', historyVisibilityEditable: true, visibility: 'public' },
  { log_id: '4', type: 'maintenance', historyVisibilityEditable: true, visibility: 'PUBLIC' }
];
var editable = UI.filterEditableVisibilityLogs(logs);
assert(editable.length === 2, 'editable count');
assert(editable.every(function (l) { return l.historyVisibilityEditable; }), 'all editable flag');
assert(!editable.some(function (l) { return l.log_id === '2'; }), 'managed non-editable excluded');
assert(!editable.some(function (l) { return l.log_id === '3'; }), 'inspection excluded');

var st1 = UI.historyVisibilityUiState({ visibility: 'private' });
assert(st1.checked === true && st1.label === '非公開', 'private checked');
var st2 = UI.historyVisibilityUiState({ visibility: 'public' });
assert(st2.checked === false && st2.label === '公開', 'public unchecked');
var st3 = UI.historyVisibilityUiState({ visibility: 'PRIVATE' });
assert(st3.checked === true, 'PRIVATE normalized');

console.log('v63 visibility UI selftest: OK (' + editable.length + ' editable of ' + logs.length + ')');