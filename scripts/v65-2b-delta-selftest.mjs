/**
 * v65-2b 隔離試作検証
 * node scripts/v65-2b-delta-selftest.mjs
 */
import { createHistorySyncSimulator, createHistorySyncClient, RETENTION_MIN_SEQ } from './lib/history-sync-prototype.mjs';

let passed = 0;
let failed = 0;

function ok(cond, name) {
  if (cond) { passed++; console.log('PASS:', name); }
  else { failed++; console.error('FAIL:', name); }
}

const U1 = { userId: 'U1', shopType: 'user' };
const U2 = { userId: 'U2', shopType: 'user' };
const SHOP = { userId: 'staff1', shopId: 'SH1', role: 'master' };

function wireOwner(sim, vin, uid, periodId) {
  const v = String(vin).toUpperCase().replace(/[^A-Z0-9]/g, '');
  sim.setOwnerPeriod(periodId, v, 'user', uid);
  sim.setVinCurrentOwner(v, 'user', uid, periodId);
  sim.registerVehicle(uid, v);
}

function testDeltaResumesFromCursor() {
  const sim = createHistorySyncSimulator();
  const client = createHistorySyncClient();
  wireOwner(sim, 'VIN001', 'U1', 'OP1');
  sim.registerLog(U1, { logId: 'L1', vin: 'VIN001', ownerPeriodId: 'OP1' });
  const boot = client.bootstrapFullSync(sim, U1, ['VIN001']);
  ok(boot.afterSeq > 0, 'bootstrap sets cursor');
  sim.registerLog(U1, { logId: 'L2', vin: 'VIN001', ownerPeriodId: 'OP1' });
  const d1 = client.pullDelta(sim, U1, ['VIN001']);
  ok(d1.startedFromSeq === boot.afterSeq, 'delta starts at last afterSeq');
  ok(client.getState().records.has('L2'), 'delta picks new log');
  const d2 = client.pullDelta(sim, U1, ['VIN001']);
  ok(d2.unchanged === true, 'no changes no fetch progress');
}

function testBootstrapRequired() {
  const sim = createHistorySyncSimulator();
  const client = createHistorySyncClient();
  wireOwner(sim, 'VIN002', 'U1', 'OP2');
  const r = client.pullDelta(sim, U1, ['VIN002']);
  ok(r.error === 'BOOTSTRAP_REQUIRED', 'delta without full rejected');
}

function testFullThenDeltaPath() {
  const sim = createHistorySyncSimulator();
  const client = createHistorySyncClient();
  wireOwner(sim, 'VIN003', 'U1', 'OP3');
  sim.registerLog(U1, { logId: 'A', vin: 'VIN003', ownerPeriodId: 'OP3' });
  client.bootstrapFullSync(sim, U1, ['VIN003']);
  sim.updateLog(U1, { logId: 'A', title: 'B', baseLogHistoryRev: 1 });
  const d = client.pullDelta(sim, U1, ['VIN003']);
  ok(d.newEvents >= 1 && client.getState().records.get('A').title === 'B', 'full then delta');
}

function testPendingSameLogBlock() {
  const sim = createHistorySyncSimulator();
  wireOwner(sim, 'VIN004', 'U1', 'OP4');
  sim.registerLog(U1, { logId: 'P1', vin: 'VIN004', ownerPeriodId: 'OP4' });
  sim.updateLog(U1, { logId: 'P1', title: 'x' }, { failBeforeChangelogCommit: true });
  const r = sim.updateLog(U1, { logId: 'P1', title: 'y', baseLogHistoryRev: 1 });
  ok(r.error === 'LOG_PENDING_IN_FLIGHT' || r.error === 'LOG_REV_CONFLICT', 'pending blocks same log write');
  sim.runRepair();
  const rev = sim.peekLog('P1').logHistoryRev;
  const r2 = sim.updateLog(U1, { logId: 'P1', title: 'z', baseLogHistoryRev: rev });
  ok(r2.success, 'after repair write ok');
}

function testRepairNoRollback() {
  const sim = createHistorySyncSimulator();
  wireOwner(sim, 'VIN005', 'U1', 'OP5');
  sim.registerLog(U1, { logId: 'R1', vin: 'VIN005', title: 'v1', ownerPeriodId: 'OP5' });
  sim.updateLog(U1, { logId: 'R1', title: 'v2', baseLogHistoryRev: 1 });
  sim.updateLog(U1, { logId: 'R1', title: 'v3' }, { failBeforeChangelogCommit: true });
  sim.runRepair();
  const client = createHistorySyncClient();
  client.bootstrapFullSync(sim, U1, ['VIN005']);
  client.pullDelta(sim, U1, ['VIN005']);
  ok(client.getState().records.get('R1').title === 'v3', 'repair keeps newer row');
}

function testTransferNoPrivateLeak() {
  const sim = createHistorySyncSimulator();
  wireOwner(sim, 'VIN006', 'U1', 'OP-OLD');
  sim.registerLog(U1, { logId: 'H1', vin: 'VIN006', visibility: 'private', ownerPeriodId: 'OP-OLD' });
  sim.setVinCurrentOwner('VIN006', 'user', 'U2', 'OP-NEW');
  sim.setOwnerPeriod('OP-NEW', 'VIN006', 'user', 'U2');
  const full = sim.getMaintenanceHistoryFull(U2, 'VIN006');
  ok(full.logs.length === 0, 'new owner no past private via period ACL');
}

function testRegisteredVehicleNotOwner() {
  const sim = createHistorySyncSimulator();
  wireOwner(sim, 'VIN007', 'U1', 'OP7');
  sim.registerVehicle('U2', 'VIN007');
  sim.registerLog(U1, { logId: 'X', vin: 'VIN007', visibility: 'private', ownerPeriodId: 'OP7' });
  const full = sim.getMaintenanceHistoryFull(U2, 'VIN007');
  ok(full.logs.length === 0, 'registration alone no owner view');
}

function testWriteDeniedDespiteRev() {
  const sim = createHistorySyncSimulator();
  wireOwner(sim, 'VIN008', 'U1', 'OP8');
  sim.setStaffRole('staff1', 'SH1', 'master');
  sim.registerLog(SHOP, { logId: 'W1', vin: 'VIN008', shopId: 'SH1' });
  const r = sim.updateLog(U2, { logId: 'W1', title: 'hack', baseLogHistoryRev: 1 });
  ok(!r.ok && (r.error === 'LOG_ACCESS_DENIED' || r.error === 'LOG_NOT_FOUND'), 'stranger cannot write');
}

function testVisibilityEditOwnerOnly() {
  const sim = createHistorySyncSimulator();
  wireOwner(sim, 'VIN009', 'U1', 'OP9');
  sim.registerLog(U1, { logId: 'V9', vin: 'VIN009', ownerPeriodId: 'OP9' });
  const r = sim.setVisibility(U2, { logId: 'V9', visibility: 'private', baseVisibilityRev: 1 });
  ok(r.error === 'OWNER_VISIBILITY_DENIED', 'visibility owner only');
}

function testPublicToPrivateAclDrop() {
  const sim = createHistorySyncSimulator();
  const client = createHistorySyncClient();
  wireOwner(sim, 'VIN010', 'U1', 'OP10');
  sim.registerLog(U1, { logId: 'P10', vin: 'VIN010', visibility: 'public', ownerPeriodId: 'OP10' });
  client.bootstrapFullSync(sim, U2, ['VIN010']);
  ok(client.getState().records.has('P10'), 'public visible');
  const seq = client.getState().afterSeq;
  sim.setVisibility(U1, { logId: 'P10', visibility: 'private', baseVisibilityRev: 1 });
  client.pullDelta(sim, U2, ['VIN010']);
  ok(!client.getState().records.has('P10'), 'revoked hidden');
  ok(client.getState().afterSeq > seq, 'cursor advanced');
}

function testPrivateToPublicGrant() {
  const sim = createHistorySyncSimulator();
  const client = createHistorySyncClient();
  wireOwner(sim, 'VIN011', 'U1', 'OP11');
  sim.registerLog(U1, { logId: 'G11', vin: 'VIN011', visibility: 'private', ownerPeriodId: 'OP11' });
  client.bootstrapFullSync(sim, U2, ['VIN011']);
  sim.setVisibility(U1, { logId: 'G11', visibility: 'public', baseVisibilityRev: 1 });
  client.pullDelta(sim, U2, ['VIN011']);
  ok(client.getState().records.has('G11'), 'public grant via visibility delta');
}

function testFavoriteShopView() {
  const sim = createHistorySyncSimulator();
  wireOwner(sim, 'VIN012', 'U1', 'OP12');
  sim.registerLog(U1, { logId: 'F12', vin: 'VIN012', visibility: 'private', ownerPeriodId: 'OP12' });
  sim.addFavoriteGrant('U1', 'SH1', true, '', 'OP12');
  sim.setStaffRole('staff1', 'SH1', 'master');
  const full = sim.getMaintenanceHistoryFull(SHOP, 'VIN012');
  ok(full.logs.length === 1, 'favorite shop private view');
}

function testLegacyClientUpdate() {
  const sim = createHistorySyncSimulator();
  wireOwner(sim, 'VIN013', 'U1', 'OP13');
  sim.registerLog(U1, { logId: 'L13', vin: 'VIN013', ownerPeriodId: 'OP13' });
  const r = sim.updateLog(U1, { logId: 'L13', title: 'legacy' });
  ok(r.success, 'no base rev allowed');
}

function testV64LateQueue() {
  const sim = createHistorySyncSimulator();
  wireOwner(sim, 'VIN014', 'U1', 'OP14');
  sim.registerLog(U1, { logId: 'V14', vin: 'VIN014', visibility: 'public', ownerPeriodId: 'OP14' });
  sim.enqueueLateVisibility(U1, { logId: 'V14', visibility: 'private', baseVisibilityRev: 1 });
  sim.setVisibility(U1, { logId: 'V14', visibility: 'public', baseVisibilityRev: 1 });
  const late = sim.flushLateVisibilityQueue();
  ok(late[0] && late[0].error === 'VISIBILITY_REV_CONFLICT', 'late rejected');
}

function testAclDropAfterFull() {
  const sim = createHistorySyncSimulator();
  const client = createHistorySyncClient();
  wireOwner(sim, 'VIN015', 'U1', 'OP15');
  sim.registerLog(U1, { logId: 'D15', vin: 'VIN015', visibility: 'public', ownerPeriodId: 'OP15' });
  client.bootstrapFullSync(sim, U2, ['VIN015']);
  sim.deleteLog(U1, { logId: 'D15' });
  client.pullDelta(sim, U2, ['VIN015']);
  ok(!client.getState().records.has('D15'), 'delete after full');
}

function testLoadBenchmarks() {
  for (const n of [100, 1000]) {
    for (const d of [0, 1, 5, 10]) {
      const sim = createHistorySyncSimulator();
      const r = sim.runLoadBenchmark_({ initialLogs: n, deltaCount: d });
      ok(r.fullMock.rowsRead >= n, 'bench full n=' + n + ' d=' + d);
      ok(r.deltaCount === d, 'bench delta count');
    }
  }
}

function testCursorExpiry() {
  const sim = createHistorySyncSimulator();
  wireOwner(sim, 'VIN016', 'U1', 'OP16');
  for (let i = 0; i < 12; i++) sim.registerLog(U1, { logId: 'E' + i, vin: 'VIN016', ownerPeriodId: 'OP16' });
  const feed = sim.getHistorySyncFeed(U1, { afterSeq: 5, limit: 5, minRetainedSeq: 10 });
  ok(feed.fullResyncRequired, 'stale cursor');
}

function testPendingBlockFeed() {
  const sim = createHistorySyncSimulator();
  wireOwner(sim, 'VIN017', 'U1', 'OP17');
  sim.registerLog(U1, { logId: 'B17', vin: 'VIN017', ownerPeriodId: 'OP17' });
  sim.updateLog(U1, { logId: 'B17', title: 'x' }, { failBeforeChangelogCommit: true });
  const feed = sim.getHistorySyncFeed(U1, { afterSeq: 1, limit: 20 });
  ok(feed.blockedPendingSeq != null, 'pending blocks feed');
}

function testScopeChangeResets() {
  const sim = createHistorySyncSimulator();
  const client = createHistorySyncClient();
  wireOwner(sim, 'VINA', 'U1', 'OPA');
  wireOwner(sim, 'VINB', 'U1', 'OPB');
  sim.registerLog(U1, { logId: 'LA', vin: 'VINA', ownerPeriodId: 'OPA' });
  client.bootstrapFullSync(sim, U1, ['VINA']);
  const s = client.getState().afterSeq;
  client.resetForScope(U1, ['VINA', 'VINB'], { fullResync: true });
  client.bootstrapFullSync(sim, U1, ['VINA', 'VINB']);
  ok(client.getState().afterSeq >= s, 'scope change rebootstrap');
}

function run() {
  testDeltaResumesFromCursor();
  testBootstrapRequired();
  testFullThenDeltaPath();
  testPendingSameLogBlock();
  testRepairNoRollback();
  testTransferNoPrivateLeak();
  testRegisteredVehicleNotOwner();
  testWriteDeniedDespiteRev();
  testVisibilityEditOwnerOnly();
  testPublicToPrivateAclDrop();
  testPrivateToPublicGrant();
  testFavoriteShopView();
  testLegacyClientUpdate();
  testV64LateQueue();
  testAclDropAfterFull();
  testLoadBenchmarks();
  testCursorExpiry();
  testPendingBlockFeed();
  testScopeChangeResets();
  console.log('\nTotal PASS:', passed, 'FAIL:', failed);
  if (failed) process.exit(1);
}

run();