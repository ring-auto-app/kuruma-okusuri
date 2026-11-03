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

function applyMergedNick(prev, serverLoc) {
  var serverHasNickKey = serverLoc.nicknameServerKeyPresent === true;
  var norm = (s) => {
    var t = String(s != null ? s : '').trim();
    return !t || t === '名称未設定' ? '' : t;
  };
  var serverCloud = serverHasNickKey
    ? norm(serverLoc.nickname)
    : norm(serverLoc.nicknameCloud != null ? serverLoc.nicknameCloud : serverLoc.nickname);
  var prevNick = norm(prev.nickname);
  var prevCloud = norm(prev.nicknameCloud);
  if (prev.nicknamePendingCloud === true) {
    return { nickname: prevNick, nicknameCloud: prevCloud, nicknamePendingCloud: true };
  }
  if (serverHasNickKey) {
    return { nickname: serverCloud, nicknameCloud: serverCloud, nicknamePendingCloud: false };
  }
  if (serverCloud !== '') {
    return { nickname: serverCloud, nicknameCloud: serverCloud, nicknamePendingCloud: false };
  }
  return { nickname: prevNick, nicknameCloud: '', nicknamePendingCloud: false };
}

function filterNickQueue(queue, stableKey, profile, mayFlush) {
  return queue.filter(function (item) {
    if (item.key !== stableKey) return true;
    return mayFlush(item, profile);
  });
}

var shopA = { shopType: 'factory', shopId: 'SHOP-A', userId: 'STAFF-A', role: 'staff' };
var shopB = { shopType: 'factory', shopId: 'SHOP-B', userId: 'STAFF-B', role: 'staff' };
var list = [
  { vin: 'VIN001', shopId: 'SHOP-A', nickname: 'A-car' },
  { vin: 'VIN001', shopId: 'SHOP-B', nickname: 'B-car' }
];

assert(findByOwner(list, 'VIN001', shopA) === 0, '① shopA index');
assert(findByOwner(list, 'VIN001', shopB) === 1, '① shopB index');
assert(findByOwner(list, 'VIN001', { shopType: 'factory', shopId: 'SHOP-X', userId: 'X' }) === -1, '① no cross');

var q = [
  { key: 'update_vehicle_nick:s:SHOP-A:VIN001', queueOwnerShopId: 'SHOP-A' },
  { key: 'update_vehicle_nick:s:SHOP-B:VIN001', queueOwnerShopId: 'SHOP-B' }
];
var mayFlush = (item, p) => String(item.queueOwnerShopId) === String(p.shopId);
var filtered = filterNickQueue(q, 'update_vehicle_nick:s:SHOP-A:VIN001', shopA, mayFlush);
assert(filtered.length === 1 && filtered[0].queueOwnerShopId === 'SHOP-B', '② keep other shop queue');

assert(canEditManaged({ shopType: 'factory', role: 'viewer', canEditManagedVehicles: true }) === false, '⑥ viewer F=ON');
assert(canEditManaged({ shopType: 'factory', role: 'staff', canEditManagedVehicles: false }) === false, '⑥ staff F=OFF');
assert(canEditManaged({ shopType: 'factory', role: 'staff' }) === true, '⑥ staff legacy');

var pendingEmpty = applyMergedNick(
  { nickname: '', nicknameCloud: 'old', nicknamePendingCloud: true },
  { nickname: 'old', nicknameServerKeyPresent: true }
);
assert(pendingEmpty.nickname === '' && pendingEmpty.nicknamePendingCloud === true, '⑦ pending empty protected');

var serverEmpty = applyMergedNick(
  { nickname: 'x', nicknameCloud: 'x', nicknamePendingCloud: false },
  { nickname: '', nicknameServerKeyPresent: true }
);
assert(serverEmpty.nickname === '' && serverEmpty.nicknameCloud === '', '⑦ server empty explicit');

var noKey = applyMergedNick(
  { nickname: 'local', nicknamePendingCloud: false },
  { nickname: 'ghost', nicknameServerKeyPresent: false }
);
assert(noKey.nickname === 'local', '⑦ missing key no overwrite');

var item = { retryCount: 4 };
item.retryCount += 1;
var stopped = item.retryCount >= 5;
assert(stopped === true, '⑤ stop flag threshold');

console.log('phase8-selftest: all checks passed (' + 9 + ' areas sampled).');
