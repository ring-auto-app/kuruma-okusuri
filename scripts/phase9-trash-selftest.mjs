/**
 * Phase9.0 ゴミ箱・復元ロジック自己テスト（モックのみ・本番非接触）
 * 実行: node scripts/phase9-trash-selftest.mjs
 */

function assert(cond, msg) {
  if (!cond) throw new Error('FAIL: ' + msg);
}

function normalizeVin(v) {
  return String(v || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function jstDateString(d) {
  d = d || new Date();
  var y = d.getFullYear();
  var m = String(d.getMonth() + 1).padStart(2, '0');
  var day = String(d.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + day;
}

function jstDateAddDays(dateStr, days) {
  var p = String(dateStr).split('-');
  var dt = new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
  dt.setDate(dt.getDate() + days);
  return jstDateString(dt);
}

function parseStaffCanEdit(role, cell) {
  var r = String(role || '').toLowerCase();
  if (r === 'master') return true;
  if (r === 'inspector' || r === 'viewer') return false;
  if (cell == null || String(cell).trim() === '') return r === 'staff';
  var s = String(cell).trim().toLowerCase();
  if (s === '0' || s === 'false') return false;
  return s === '1' || s === 'true';
}

function trashOwnerMatches(row, session) {
  var rowUid = String(row.userId || '').trim();
  var rowShop = String(row.shopId || '').trim();
  var myUid = String(session.userId || '').trim();
  var myShop = String(session.shopId || '').trim();
  if (myShop && rowShop === myShop) return true;
  if (myUid && rowUid === myUid && String(session.shopType || '') === 'user') return true;
  return false;
}

function vehicleExists(vehicles, vin, userId, shopId) {
  var n = normalizeVin(vin);
  return vehicles.some(function (v) {
    if (normalizeVin(v.vin) !== n) return false;
    if (shopId && String(v.shopId) === String(shopId)) return true;
    if (userId && String(v.userId) === String(userId) && !shopId) return true;
    return false;
  });
}

function listTrash(trashRows, session, todayJst) {
  return trashRows.filter(function (r) {
    if (r.status !== 'active') return false;
    if (!trashOwnerMatches(r, session)) return false;
    if (String(r.expiresAt) < todayJst) return false;
    return true;
  });
}

function canRestoreTrash(row, session, vehicles, todayJst, userVehicleCount) {
  if (!trashOwnerMatches(row, session)) return { ok: false, error: 'TRASH_ACCESS_DENIED' };
  if (row.status !== 'active') return { ok: false, error: 'TRASH_NOT_ACTIVE' };
  if (String(row.expiresAt) < todayJst) return { ok: false, error: 'TRASH_EXPIRED' };
  if (vehicleExists(vehicles, row.vin, row.userId, row.shopId)) {
    return { ok: false, error: 'RESTORE_CONFLICT_REREGISTERED' };
  }
  if (String(session.shopType) === 'user' && String(session.role) === 'user' && !session.shopId) {
    if (userVehicleCount >= 5) return { ok: false, error: 'LIMIT_REACHED' };
  }
  return { ok: true };
}

function purgeTrash(trashRows, todayJst, dryRun) {
  var purged = 0;
  var skipped = 0;
  var remain = trashRows.filter(function (r) {
    if (r.status !== 'active') { skipped++; return true; }
    if (String(r.expiresAt) >= todayJst) { skipped++; return true; }
    purged++;
    return dryRun;
  });
  return { purged: purged, skipped: skipped, remain: remain };
}

function dropRetryQueue(queue, vin, session, mayFlush) {
  var n = normalizeVin(vin);
  return queue.filter(function (item) {
    if (item.action !== 'vehicle' && item.action !== 'update_vehicle') return true;
    if (normalizeVin(item.payload && item.payload.vin) !== n) return true;
    if (!mayFlush(item, session)) return true;
    return false;
  });
}

// --- tests ---
var shopA = { shopType: 'factory', shopId: 'SHOP-A', userId: 'STAFF-A', role: 'staff' };
var shopB = { shopType: 'factory', shopId: 'SHOP-B', userId: 'STAFF-B', role: 'staff' };
var user1 = { shopType: 'user', userId: 'U1', role: 'user' };
var viewer = { shopType: 'factory', shopId: 'SHOP-A', userId: 'V1', role: 'viewer' };

var today = '2026-06-01';
var trashA = {
  trashId: 't1', vin: 'VIN001', userId: '', shopId: 'SHOP-A',
  deletedAt: '2026-05-20T00:00:00.000Z', expiresAt: jstDateAddDays(today, 10),
  status: 'active', rowJson: JSON.stringify(['VIN001', '', '', '', '', '', '', 'SHOP-A'])
};
var trashB = {
  trashId: 't2', vin: 'VIN001', userId: '', shopId: 'SHOP-B',
  deletedAt: '2026-05-20T00:00:00.000Z', expiresAt: jstDateAddDays(today, 10),
  status: 'active', rowJson: '[]'
};
var trashUser = {
  trashId: 't3', vin: 'VIN002', userId: 'U1', shopId: '',
  deletedAt: '2026-05-01', expiresAt: jstDateAddDays(today, 5),
  status: 'active', rowJson: '[]'
};

assert(listTrash([trashA, trashB], shopA, today).length === 1, '1 own trash list');
assert(listTrash([trashA, trashB], shopB, today).length === 1, '2 other shop list');
assert(listTrash([trashUser], user1, today).length === 1, '5 user trash');

assert(!canRestoreTrash(trashB, shopA, [], today, 0).ok, '3 cannot restore other shop');
assert(canRestoreTrash(trashA, shopA, [], today, 0).ok, '1 restore own');
assert(!canRestoreTrash(trashA, shopA, [{ vin: 'VIN001', shopId: 'SHOP-A' }], today, 0).ok, '9 conflict');
assert(!canRestoreTrash(trashUser, user1, [], today, 5).ok, '8 limit');

assert(!parseStaffCanEdit('viewer', '1'), '6 viewer deny');
assert(parseStaffCanEdit('staff', '1'), '7 staff F on');
assert(!parseStaffCanEdit('staff', '0'), '7 staff F off');

var expired = { status: 'active', expiresAt: '2026-05-01', userId: 'U1', shopId: '', vin: 'X' };
assert(!canRestoreTrash(expired, user1, [], today, 0).ok, '11 expired restore');

var p = purgeTrash([trashUser, { status: 'active', expiresAt: '2026-05-01', userId: 'U1', shopId: '', vin: 'OLD' }], today, false);
assert(p.purged === 1 && p.remain.length === 1, '12 purge only expired');

var pSafe = purgeTrash([trashA], today, true);
assert(pSafe.purged === 0 && pSafe.remain.length === 1, '12b dryRun keeps active');

var vehicles = [{ vin: 'VIN001', shopId: 'SHOP-A' }, { vin: 'VIN001', shopId: 'SHOP-B' }];
assert(vehicleExists(vehicles, 'VIN001', '', 'SHOP-A'), '4 vin split shopA');
assert(!vehicleExists(vehicles, 'VIN001', '', 'SHOP-C'), '4b no cross');

var rowJson = JSON.parse(trashA.rowJson);
assert(Array.isArray(rowJson) && rowJson[0] === 'VIN001', '16 rowJson vin');

var q = [
  { action: 'update_vehicle', payload: { vin: 'VIN001' }, queueOwnerShopId: 'SHOP-A' },
  { action: 'update_vehicle', payload: { vin: 'VIN001' }, queueOwnerShopId: 'SHOP-B' }
];
var mayFlush = (it, s) => String(it.queueOwnerShopId) === String(s.shopId);
var q2 = dropRetryQueue(q, 'VIN001', shopA, mayFlush);
assert(q2.length === 1 && q2[0].queueOwnerShopId === 'SHOP-B', '18 queue drop own vin only');

assert(jstDateAddDays('2026-06-01', 30) === '2026-07-01', '10 retention days math');

console.log('phase9-trash-selftest: all checks passed (18 scenarios).');
