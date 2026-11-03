/**
 * Phase8 不具合修正のローカル自己テスト（本番API不使用）
 * 実行: node scripts/phase8-selftest.mjs
 */

function assert(cond, msg) {
  if (!cond) throw new Error('FAIL: ' + msg);
}

function normalizeVin(v) {
  return String(v || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function isMyRecord(car, profile) {
  if (!car || !profile) return false;
  var shop = String(profile.shopId || '');
  var uid = String(profile.userId || '');
  return (shop && String(car.shopId || '') === shop) ||
    String(car.userId || '') === uid ||
    String(car.ownerId || '') === uid;
}

function findByOwner(list, vin, profile) {
  var n = normalizeVin(vin);
  for (var i = 0; i < list.length; i++) {
    if (normalizeVin(list[i].vin) !== n) continue;
    if (isMyRecord(list[i], profile)) return i;
  }
  return -1;
}

function canEditManaged(profile) {
  if (!profile || (profile.shopType !== 'factory' && profile.shopType !== 'dealer')) return true;
  var role = String(profile.role || '').toLowerCase();
  if (role === 'master') return true;
  if (role === 'inspector' || role === 'viewer') return false;
  if (profile.canEditManagedVehicles === true) return true;
  if (profile.canEditManagedVehicles === false) return false;
  return role === 'staff';
}

function filterNickQueueEnqueue(queue, stableKey, profile, mayFlush) {
  return queue.filter(function (item) {
    if (item.key !== stableKey) return true;
    if (!mayFlush(item, profile)) return true;
    return false;
  });
}

function shouldApplyGasSaveRev(currentRev, requestRev) {
  if (requestRev == null) return true;
  return currentRev === requestRev;
}

function hasPendingSync(car) {
  if (!car) return false;
  if (car.nicknamePendingCloud === true) return true;
  var save = parseInt(car.vehicleSaveRev, 10) || 0;
  var synced = parseInt(car.vehicleSyncedRev, 10) || 0;
  return save > synced;
}

function mergeQueueAfterFlush(remaining, queueAtStart, latest) {
  remaining = remaining.slice();
  var remainKeys = {};
  remaining.forEach(function (it) { if (it && it.key) remainKeys[it.key] = true; });
  var startKeys = {};
  (queueAtStart || []).forEach(function (it) { if (it && it.key) startKeys[it.key] = true; });
  (latest || []).forEach(function (it) {
    if (!it || !it.key) return;
    if (remainKeys[it.key]) return;
    if (!startKeys[it.key]) {
      remaining.push(it);
      remainKeys[it.key] = true;
    }
  });
  return remaining;
}

var shopA = { shopType: 'factory', shopId: 'SHOP-A', userId: 'STAFF-A', role: 'staff' };
var shopB = { shopType: 'factory', shopId: 'SHOP-B', userId: 'STAFF-B', role: 'staff' };
var list = [
  { vin: 'VIN001', shopId: 'SHOP-A', nickname: 'A-car' },
  { vin: 'VIN001', shopId: 'SHOP-B', nickname: 'B-car' }
];

assert(findByOwner(list, 'VIN001', shopA) === 0, 'owner shopA');
assert(findByOwner(list, 'VIN001', shopB) === 1, 'owner shopB');

var q = [
  { key: 'update_vehicle_nick:s:SHOP-A:VIN001', queueOwnerShopId: 'SHOP-A' },
  { key: 'update_vehicle_nick:s:SHOP-B:VIN001', queueOwnerShopId: 'SHOP-B' }
];
var mayFlush = (item, p) => String(item.queueOwnerShopId) === String(p.shopId);
var filtered = filterNickQueueEnqueue(q, 'update_vehicle_nick:s:SHOP-A:VIN001', shopA, mayFlush);
assert(filtered.length === 1 && filtered[0].queueOwnerShopId === 'SHOP-B', 'nick queue replace own only');

assert(!shouldApplyGasSaveRev(5, 3), 'stale gas response ignored');
assert(shouldApplyGasSaveRev(5, 5), 'matching rev applied');

assert(hasPendingSync({ vehicleSaveRev: 2, vehicleSyncedRev: 1, nicknamePendingCloud: false }), 'pending category');
var mergedCat = hasPendingSync({ vehicleSaveRev: 1, vehicleSyncedRev: 1 }) ? 'loaner' : 'managed';
assert(mergedCat === 'managed', 'synced uses server');

var startQ = [{ key: 'a' }, { key: 'b' }];
var rem = [{ key: 'b' }];
var latest = [{ key: 'b' }, { key: 'c' }];
var mergedQ = mergeQueueAfterFlush(rem, startQ, latest);
assert(mergedQ.length === 2 && mergedQ[1].key === 'c', 'flush merge keeps new queue');

assert(canEditManaged({ shopType: 'factory', role: 'viewer', canEditManagedVehicles: true }) === false, 'viewer deny');

console.log('phase8-selftest: all checks passed (' + 8 + ').');
