/**
 * GAS getRange 境界テスト（History / Daily / 集計ヘルパー）
 * 実行: node scripts/phase9-gas-getrange-selftest.mjs
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

function loadGasGetRangeHelpers() {
  const gasSrc = fs.readFileSync(GAS_PATH, 'utf8');
  const names = [
    'sheetDataRowCountFromLastRow_',
    'readSheetDataFromRow2_',
    'findHistoryEventRowByLogId_',
    'findHistoryEventRowNumbersByVin_',
    'findHistoryEventRowNumbersByShopWithin7Days_',
    'findDailyInspectionRow_',
    'isVehicleRegisteredForInspection_'
  ];
  let bundle = [
    'var SS_ID = "MOCK";',
    '__mockVehiclesSheet = null;',
    'var SpreadsheetApp = {',
    '  openById: function() {',
    '    return {',
    '      getSheetByName: function(name) {',
    '        if (name === "Vehicles") return __mockVehiclesSheet;',
    '        return null;',
    '      }',
    '    };',
    '  }',
    '};',
    'function normalizeVehicleVinForSheet_(v) {',
    '  return String(v || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");',
    '}'
  ].join('\n');
  names.forEach(function (n) {
    bundle += '\n' + extractFunctionSource(gasSrc, n);
  });
  const sandbox = { __mockVehiclesSheet: null };
  vm.createContext(sandbox);
  vm.runInContext(bundle, sandbox);
  return sandbox;
}

function makeDataSheet(dataRows, numCols) {
  numCols = numCols || (dataRows[0] ? dataRows[0].length : 1);
  var calls = [];
  return {
    calls: calls,
    dataRows: dataRows,
    getLastRow: function () {
      return dataRows.length + 1;
    },
    getLastColumn: function () {
      return numCols;
    },
    getRange: function (row, col, numRows, numColsArg) {
      calls.push({ row: row, col: col, numRows: numRows, numCols: numColsArg });
      var out = [];
      for (var r = 0; r < numRows; r++) {
        var srcRow = dataRows[r];
        if (!srcRow) {
          out.push([]);
          continue;
        }
        var slice = [];
        for (var c = 0; c < numColsArg; c++) {
          slice.push(srcRow[col - 1 + c] != null ? srcRow[col - 1 + c] : '');
        }
        out.push(slice);
      }
      return {
        getValues: function () { return out; }
      };
    }
  };
}

const gas = loadGasGetRangeHelpers();

assert(gas.sheetDataRowCountFromLastRow_(1, 2) === 0, 'empty sheet lastRow=1');
assert(gas.sheetDataRowCountFromLastRow_(2, 2) === 1, 'one data row');
assert(gas.sheetDataRowCountFromLastRow_(1001, 2) === 1000, '1000 data rows');

var oneRowSheet = makeDataSheet([['LOG1', 'VIN001']], 19);
assert(gas.findHistoryEventRowByLogId_(oneRowSheet, 'LOG1') === 2, 'find log id single row');
assert(oneRowSheet.calls[0].numRows === 1, 'single row numRows=1');

var emptySheet = makeDataSheet([]);
emptySheet.getLastRow = function () { return 1; };
assert(gas.findHistoryEventRowByLogId_(emptySheet, 'X') === -1, 'empty sheet log lookup');

var vinSheet = makeDataSheet([
  ['L1', 'AAA111'],
  ['L2', 'BBB222'],
  ['L3', 'AAA111']
], 19);
var vinRows = gas.findHistoryEventRowNumbersByVin_(vinSheet, 'AAA111');
assert(vinRows.length === 2 && vinRows[0] === 2 && vinRows[1] === 4, 'vin rows match');

var big = [];
for (var bi = 0; bi < 1000; bi++) {
  big.push(['L' + bi, bi === 999 ? 'TARGETVIN' : 'OTHER']);
}
var bigSheet = makeDataSheet(big, 19);
var bigHit = gas.findHistoryEventRowNumbersByVin_(bigSheet, 'TARGETVIN');
assert(bigHit.length === 1 && bigHit[0] === 1001, '1000-row vin scan hits row 1001');
var vinCall = bigSheet.calls.find(function (c) { return c.col === 2; });
assert(vinCall && vinCall.numRows === 1000, '1000-row scan uses numRows=1000');

var shopSheet = makeDataSheet([
  ['L1', 'V1', '', '', '', 'SHOP-A', '', '', '', '', '', '', new Date().toISOString()],
  ['L2', 'V2', '', '', '', 'SHOP-B', '', '', '', '', '', '', new Date().toISOString()]
], 19);
var shopRows = gas.findHistoryEventRowNumbersByShopWithin7Days_(shopSheet, 'SHOP-A');
assert(shopRows.length === 1 && shopRows[0] === 2, 'shop 7d filter');
assert(shopSheet.calls.some(function (c) { return c.col === 6 && c.numRows === 2; }), 'shop col numRows');
assert(shopSheet.calls.some(function (c) { return c.col === 13 && c.numRows === 2; }), 'created col numRows');

var dailySheet = makeDataSheet([
  ['INS1', 'VIN9', '2026-03-01', '日常点検']
], 12);
assert(gas.findDailyInspectionRow_(dailySheet, 'INS1', '', '') === 2, 'daily by log id');
assert(gas.findDailyInspectionRow_(dailySheet, '', 'VIN9', '2026-03-01') === 2, 'daily by vin+date');
assert(dailySheet.calls[0].numRows === 1, 'daily single row numRows');

var vehSheet = makeDataSheet([['VIN9', '', '', '', '', '', 'U1', 'SHOP-X']], 8);
gas.__mockVehiclesSheet = vehSheet;
assert(gas.isVehicleRegisteredForInspection_({ shopType: 'user', userId: 'U1' }, 'VIN9') === true, 'user vehicle');
assert(gas.isVehicleRegisteredForInspection_({ shopType: 'factory', shopId: 'SHOP-X' }, 'VIN9') === true, 'shop vehicle');
assert(gas.isVehicleRegisteredForInspection_({ shopType: 'user', userId: 'OTHER' }, 'VIN9') === false, 'other user denied');

console.log('phase9-gas-getrange-selftest: passed.');
