/**
 * Phase9.0 自己テスト — ads/gas-complete-Code.gs から所有者・ゴミ箱ロジックを読み込んで検証
 * 実行: node scripts/phase9-trash-selftest.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import vm from 'vm';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GAS_PATH = path.join(__dirname, '..', 'ads', 'gas-complete-Code.gs');

function assert(cond, msg) {
  if (!cond) throw new Error('FAIL: ' + msg);
}

function extractFunctionSource(src, fnName) {
  const needle = 'function ' + fnName + '(';
  const start = src.indexOf(needle);
  if (start < 0) throw new Error('Missing function in GAS: ' + fnName);
  let depth = 0;
  let i = src.indexOf('{', start);
  if (i < 0) throw new Error('Malformed function: ' + fnName);
  const begin = start;
  for (; i < src.length; i++) {
    const ch = src[i];
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) return src.slice(begin, i + 1);
    }
  }
  throw new Error('Unclosed function: ' + fnName);
}

function loadGasLogic() {
  const gas = fs.readFileSync(GAS_PATH, 'utf8');
  const names = [
    'ringJstDateString_',
    'ringJstDateAddDays_',
    'vehicleRowOwnerMatchesSession_',
    'pseudoSessionFromOwnerKeys_',
    'vehicleTrashRowOwnerMatchesSession_',
    'vehicleExistsForOwnerVin_',
    'hasActiveVehicleTrashForOwnerVin_',
    'hasVehicleDeleteGuardForOwnerVin_',
    'sessionMayCallQrVehicleList_'
  ];
  let bundle = [
    'function normalizeVehicleVinForSheet_(v) {',
    '  return String(v || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");',
    '}',
    'var VEHICLE_TRASH_SHEET_NAME_ = "Vehicle_Trash";',
    'var VEHICLE_TRASH_STATUS_ACTIVE_ = "active";',
    'var VEHICLE_TRASH_COLS_ = 12;',
    'var VEHICLE_DELETE_GUARD_COLS_ = 7;',
    'function sheetDataRowCountFromLastRow_(lastRow, startRow) {',
    '  startRow = startRow || 2;',
    '  if (lastRow < startRow) return 0;',
    '  return lastRow - startRow + 1;',
    '}',
    'function readSheetDataFromRow2_(sheet, numCols, lastRowOpt) {',
    '  var lastRow = lastRowOpt != null ? lastRowOpt : sheet.getLastRow();',
    '  var n = sheetDataRowCountFromLastRow_(lastRow, 2);',
    '  if (n < 1) return [];',
    '  numCols = numCols || 1;',
    '  return sheet.getRange(2, 1, n, numCols).getValues();',
    '}',
    'var Utilities = { formatDate: function(d, tz, fmt) {',
    '  d = d || new Date();',
    '  var y = d.getFullYear();',
    '  var m = String(d.getMonth() + 1).padStart(2, "0");',
    '  var day = String(d.getDate()).padStart(2, "0");',
    '  if (fmt === "yyyy-MM-dd") return y + "-" + m + "-" + day;',
    '  return y + "-" + m + "-" + day;',
    '}};'
  ].join('\n');
  names.forEach(function (n) {
    bundle += '\n' + extractFunctionSource(gas, n);
  });
  const sandbox = {};
  vm.createContext(sandbox);
  vm.runInContext(bundle, sandbox);
  return sandbox;
}

function loadAppQueueLogic() {
  const appPath = path.join(__dirname, '..', 'app.js');
  const app = fs.readFileSync(appPath, 'utf8');
  const names = ['ringCountVehicleOwnerPendingQueue_'];
  const localStorageMock = {
    _d: {},
    getItem: function (k) { return this._d[k] || null; },
    setItem: function (k, v) { this._d[k] = v; }
  };
  let bundle = [
    'function safeJsonParse(s, fb) { try { return JSON.parse(s); } catch (e) { return fb; } }',
    'function _normalize(v) { return String(v||"").trim().toUpperCase().replace(/[^A-Z0-9]/g,""); }',
    'var DB_RETRY_QUEUE = "ring_retry_queue_v1";',
    'function ringRetryQueueItemMayFlush_(item, profile) {',
    '  var shop = String(item.queueOwnerShopId||"");',
    '  if (shop) return String(profile.shopId||"") === shop;',
    '  var uid = String(item.queueOwnerUserId||"");',
    '  return uid && String(profile.userId||"") === uid;',
    '}'
  ].join('\n');
  names.forEach(function (n) {
    bundle += '\n' + extractFunctionSource(app, n);
  });
  const sandbox = {
    localStorage: localStorageMock,
    safeJsonParse: function (s, fb) { try { return JSON.parse(s); } catch (e) { return fb; } },
    _normalize: function (v) { return String(v || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, ''); },
    DB_RETRY_QUEUE: 'ring_retry_queue_v1',
    ringRetryQueueItemMayFlush_: function (item, profile) {
      var shop = String(item.queueOwnerShopId || '');
      if (shop) return String(profile.shopId || '') === shop;
      var uid = String(item.queueOwnerUserId || '');
      return uid && String(profile.userId || '') === uid;
    }
  };
  vm.createContext(sandbox);
  vm.runInContext(bundle, sandbox);
  sandbox.localStorage = localStorageMock;
  return sandbox;
}

const gas = loadGasLogic();
const appQ = loadAppQueueLogic();

const userA = { userId: 'U-A', shopId: '', shopType: 'user', role: 'user' };
const userB = { userId: 'U-B', shopId: '', shopType: 'user', role: 'user' };
const shopA = { userId: 'ST-A', shopId: 'SHOP-A', shopType: 'factory', role: 'staff' };

assert(!gas.vehicleRowOwnerMatchesSession_('', '', userA), '1 leak: empty row not mine');
assert(gas.vehicleRowOwnerMatchesSession_('U-A', '', userA), '1 user A row');
assert(!gas.vehicleRowOwnerMatchesSession_('U-B', '', userA), '2 other user');
assert(gas.vehicleRowOwnerMatchesSession_('', 'SHOP-A', shopA), '4 shop row');
assert(!gas.vehicleRowOwnerMatchesSession_('', 'SHOP-B', shopA), '4b other shop');
assert(!gas.vehicleRowOwnerMatchesSession_('U-A', '', userB), '5 user B isolation');

var mockSheet = {
  getLastRow: function () { return 3; },
  getRange: function () {
    return {
      getValues: function () {
        return [
          ['V1', '', '', '', '', '', 'U-A', ''],
          ['V2', '', '', '', '', '', 'U-B', '']
        ];
      }
    };
  }
};
assert(gas.vehicleExistsForOwnerVin_(mockSheet, 'V1', 'U-A', ''), '1 exists own');
assert(!gas.vehicleExistsForOwnerVin_(mockSheet, 'V2', 'U-A', ''), '2 not other vin owner');

var trashSheet = {
  getLastRow: function () { return 3; },
  getRange: function () {
    return {
      getValues: function () {
        return [[
          't1', 'VIN1', 'U-A', '', '2026-01-01', '2026-12-31', '', '', '', 'active', '', '[]'
        ]];
      }
    };
  }
};
assert(gas.hasActiveVehicleTrashForOwnerVin_(trashSheet, 'VIN1', userA), '3 trash blocks recreate');
assert(!gas.hasActiveVehicleTrashForOwnerVin_(trashSheet, 'VIN1', userB), '3b trash hidden');

var guardSheet = {
  getLastRow: function () { return 3; },
  getRange: function () {
    return {
      getValues: function () {
        return [[
          'g1', 'VIN2', 'U-A', '', '2026-01-01', '2027-01-01', 't-old'
        ]];
      }
    };
  }
};
assert(gas.hasVehicleDeleteGuardForOwnerVin_(guardSheet, 'VIN2', userA), '3c guard blocks stale recreate');
assert(!gas.hasVehicleDeleteGuardForOwnerVin_(guardSheet, 'VIN2', userB), '3d guard owner scope');

assert(gas.sessionMayCallQrVehicleList_(shopA), 'QR caller factory');
assert(!gas.sessionMayCallQrVehicleList_(userA), 'QR deny end user');

var today = gas.ringJstDateString_(new Date('2026-06-01'));
var exp = gas.ringJstDateAddDays_(today, 30);
assert(exp === '2026-07-01', '10 30-day expiry');

appQ.localStorage.setItem(DB_RETRY_QUEUE, JSON.stringify([
  { action: 'update_vehicle', payload: { vin: 'VIN001' }, queueOwnerShopId: 'SHOP-A' },
  { action: 'save_inspection', payload: { vin: 'VIN001' } },
  { action: 'vehicle', payload: { vin: 'VIN002' }, queueOwnerUserId: 'U-A' }
]));
assert(appQ.ringCountVehicleOwnerPendingQueue_('VIN001', shopA) === 1, '18 shop queue only vehicle');
assert(appQ.ringCountVehicleOwnerPendingQueue_('VIN002', userA) === 1, '18b user vehicle queue counted');

console.log('phase9-trash-selftest: passed (GAS logic loaded from ' + GAS_PATH + ').');
