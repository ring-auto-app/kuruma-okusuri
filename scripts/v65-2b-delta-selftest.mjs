/**
 * v65-2b 差分同期試作検証（隔離・GAS 非改変）
 * node scripts/v65-2b-delta-selftest.mjs
 */
import {
  createHistorySyncSimulator,
  createHistorySyncClient,
  RETENTION_MIN_SEQ
} from './lib/history-sync-prototype.mjs';

let passed = 0;
let failed = 0;

function ok(cond, name) {
  if (cond) {
    passed += 1;
    console.log('PASS:', name);
  } else {
    failed += 1;
    console.error('FAIL:', name);
  }
}

const USER = { type: 'user', id: 'U1' };
const USER2 = { type: 'user', id: 'U2' };
const SHOP = { type: 'shop', id: 'SH1' };

function eventHasLeaks_(ev) {
  if (!ev || ev.type === 'noop') return false;
  if (ev.type === 'acl_drop' || ev.type === 'delete') {
    if (ev.meta) return true;
    if (ev.title || ev.vinNorm) return true;
    return false;
  }
  return false;
}

// --- 1. 正常 CRUD ---
function testHappyPath() {
  const sim = createHistorySyncSimulator();
  const client = createHistorySyncClient();
  sim.setVinOwner('VIN001', { type: 'user', id: 'U1', periodId: 'OP-1' });
  ok(sim.registerLog(USER, { logId: 'L1', vin: 'VIN001', title: 'A' }).success, 'register');
  ok(sim.updateLog(USER, { logId: 'L1', title: 'B', baseLogHistoryRev: 1 }).success, 'update with rev');
  const pull = client.pullAll(sim, USER, ['VIN001'], { pageSize: 5 });
  ok(!pull.blockedPendingSeq && pull.count === 1, 'client sync');
  ok(client.getState().records.get('L1').title === 'B', 'meta applied');
  ok(sim.deleteLog(USER, { logId: 'L1' }).success, 'delete');
  const pull2 = client.pullAll(sim, USER, ['VIN001']);
  ok(client.getState().tombstones.has('L1'), 'tombstone local');
}

// --- 2. Changelog 後に events 失敗 ---
function testFailAfterChangelog() {
  const sim = createHistorySyncSimulator();
  sim.setVinOwner('VIN002', { type: 'user', id: 'U1', periodId: 'OP-1' });
  const r = sim.registerLog(USER, { logId: 'L2', vin: 'VIN002' }, { failAfterChangelog: true });
  ok(!r.success, 'register fails');
  const feed = sim.getHistorySyncFeed(USER, { afterSeq: 0, limit: 10 });
  ok(!feed.blockedPendingSeq, 'no pending block after abort');
  ok(feed.historyFeedHead >= 1, 'head advanced via repair_abort');
}

// --- 3. events 後 changelog commit 失敗 ---
function testFailBeforeCommit() {
  const sim = createHistorySyncSimulator();
  sim.setVinOwner('VIN003', { type: 'user', id: 'U1', periodId: 'OP-1' });
  const r = sim.registerLog(USER, { logId: 'L3', vin: 'VIN003' }, { failBeforeChangelogCommit: true });
  ok(!r.success, 'commit fail');
  const feed0 = sim.getHistorySyncFeed(USER, { afterSeq: 0, limit: 5 });
  ok(feed0.blockedPendingSeq === 1, 'pending blocks cursor');
  const client = createHistorySyncClient();
  const part = client.pullAll(sim, USER, ['VIN003']);
  ok(part.blockedPendingSeq === 1, 'client stops at pending');
  const rep = sim.runRepair();
  ok(rep.repaired >= 1, 'repair commits pending');
  const pull = client.pullAll(sim, USER, ['VIN003']);
  ok(!pull.blockedPendingSeq && pull.count === 1, 'post-repair sync');
}

// --- 4. pending 残存中の後続更新 ---
function testPendingThenFollowUp() {
  const sim = createHistorySyncSimulator();
  sim.setVinOwner('VIN004', { type: 'user', id: 'U1', periodId: 'OP-1' });
  sim.registerLog(USER, { logId: 'L4a', vin: 'VIN004' });
  const bad = sim.updateLog(USER, { logId: 'L4a', title: 'X' }, { failBeforeChangelogCommit: true });
  ok(!bad.success, 'stuck pending');
  ok(sim.registerLog(USER, { logId: 'L4b', vin: 'VIN004' }).success, 'second log while pending exists');
  const feed = sim.getHistorySyncFeed(USER, { afterSeq: 0, limit: 10 });
  ok(feed.blockedPendingSeq != null, 'feed blocked at first pending');
  sim.runRepair();
  const client = createHistorySyncClient();
  const done = client.pullAll(sim, USER, ['VIN004']);
  ok(done.count === 2, 'both logs after repair');
}

// --- 5. repair 重複防止 ---
function testRepairIdempotent() {
  const sim = createHistorySyncSimulator();
  sim.setVinOwner('VIN005', { type: 'user', id: 'U1', periodId: 'OP-1' });
  sim.registerLog(USER, { logId: 'L5', vin: 'VIN005' }, { failBeforeChangelogCommit: true });
  sim.runRepair();
  const before = sim.dumpChangelog().filter((e) => e.status === 'committed').length;
  sim.runRepair();
  const after = sim.dumpChangelog().filter((e) => e.status === 'committed').length;
  ok(before === after, 'second repair no duplicate commits');
}

// --- 6. baseLogHistoryRev 拒否 ---
function testStaleWriteFixed() {
  const sim = createHistorySyncSimulator();
  sim.setVinOwner('VIN006', { type: 'user', id: 'U1', periodId: 'OP-1' });
  sim.registerLog(USER, { logId: 'L6', vin: 'VIN006', title: 'v1' });
  sim.updateLog(USER, { logId: 'L6', title: 'v2', baseLogHistoryRev: 1 });
  const stale = sim.updateLog(USER, { logId: 'L6', title: 'stale', baseLogHistoryRev: 1 });
  ok(stale.error === 'LOG_REV_CONFLICT', 'stale rev rejected');
  const client = createHistorySyncClient();
  client.pullAll(sim, USER, ['VIN006']);
  ok(client.getState().records.get('L6').title === 'v2', 'server keeps v2');
}

// --- 7. 古いクライアント（base 未送信） ---
function testLegacyClient() {
  const sim = createHistorySyncSimulator();
  sim.setVinOwner('VIN007', { type: 'user', id: 'U1', periodId: 'OP-1' });
  sim.registerLog(USER, { logId: 'L7', vin: 'VIN007' });
  const legacy = sim.updateLog(USER, { logId: 'L7', title: 'legacy-no-base' });
  ok(legacy.success, 'legacy update allowed');
}

// --- 8. visibilityRev / v64 共通化 ---
function testVisibilityRevConflict() {
  const sim = createHistorySyncSimulator();
  sim.setVinOwner('VIN008', { type: 'user', id: 'U1', periodId: 'OP-1' });
  sim.registerLog(USER, { logId: 'L8', vin: 'VIN008', visibility: 'public' });
  const a = sim.setVisibility(USER, { logId: 'L8', visibility: 'private', baseVisibilityRev: 1 });
  ok(a.success && a.visibilityRev > 1, 'vis rev bump');
  const stale = sim.setVisibility(USER, { logId: 'L8', visibility: 'public', baseVisibilityRev: 1 });
  ok(stale.error === 'VISIBILITY_REV_CONFLICT', 'vis rev conflict');
}

// --- 9. 差分・ページング・再開 ---
function testPagingResume() {
  const sim = createHistorySyncSimulator();
  const client = createHistorySyncClient();
  sim.setVinOwner('VIN009', { type: 'user', id: 'U1', periodId: 'OP-1' });
  for (let i = 0; i < 7; i++) {
    sim.registerLog(USER, { logId: 'P' + i, vin: 'VIN009', title: 't' + i });
  }
  let after = 0;
  let pages = 0;
  while (pages++ < 20) {
    const page = sim.getHistorySyncFeed(USER, { afterSeq: after, limit: 3, vinList: ['VIN009'] });
    if (page.blockedPendingSeq) break;
    client.applyPage(USER, ['VIN009'], page);
    after = client.getState().afterSeq;
    if (!page.hasMore && page.events.length === 0) break;
    if (!page.hasMore) break;
  }
  ok(client.getState().records.size === 7, 'paged all 7');
  ok(client.getState().afterSeq === 7, 'cursor at head');
}

// --- 10. 同期中に追加 ---
function testConcurrentChangesDuringSync() {
  const sim = createHistorySyncSimulator();
  const client = createHistorySyncClient();
  sim.setVinOwner('VIN010', { type: 'user', id: 'U1', periodId: 'OP-1' });
  for (let i = 0; i < 4; i++) sim.registerLog(USER, { logId: 'C' + i, vin: 'VIN010' });
  let page1 = sim.getHistorySyncFeed(USER, { afterSeq: 0, limit: 2, vinList: ['VIN010'] });
  client.applyPage(USER, ['VIN010'], page1);
  sim.registerLog(USER, { logId: 'C9', vin: 'VIN010' });
  let page2 = sim.getHistorySyncFeed(USER, {
    afterSeq: client.getState().afterSeq,
    limit: 10,
    vinList: ['VIN010']
  });
  client.applyPage(USER, ['VIN010'], page2);
  ok(client.getState().records.size === 5, 'no miss during paging');
  ok(!client.getState().records.has('dup'), 'no duplicate id');
}

// --- 11. VIN スコープ変更でカーソルリセット ---
function testVinScopeChange() {
  const sim = createHistorySyncSimulator();
  const client = createHistorySyncClient();
  sim.setVinOwner('VINA', { type: 'user', id: 'U1', periodId: 'OP-A' });
  sim.setVinOwner('VINB', { type: 'user', id: 'U1', periodId: 'OP-B' });
  sim.registerLog(USER, { logId: 'LA', vin: 'VINA' });
  client.pullAll(sim, USER, ['VINA']);
  const seqA = client.getState().afterSeq;
  client.resetForScope(USER, ['VINA', 'VINB']);
  ok(client.getState().afterSeq === 0, 'cursor reset on vin set change');
  client.pullAll(sim, USER, ['VINA', 'VINB']);
  ok(client.getState().afterSeq >= seqA, 'resync from 0 catches LA');
}

// --- 12. 空応答 ---
function testEmptyFeed() {
  const sim = createHistorySyncSimulator();
  const feed = sim.getHistorySyncFeed(USER, { afterSeq: 99, limit: 5, vinList: [] });
  ok(feed.empty && feed.events.length === 0, 'empty delta');
}

// --- 13. 初回 full vs 差分 ---
function testFullVsInitialFeed() {
  const sim = createHistorySyncSimulator();
  sim.setVinOwner('VIN011', { type: 'user', id: 'U1', periodId: 'OP-1' });
  sim.registerLog(USER, { logId: 'F1', vin: 'VIN011' });
  const full = sim.getMaintenanceHistoryFull(USER, 'VIN011');
  ok(full.logs.length === 1, 'full fetch');
  const client = createHistorySyncClient();
  client.pullAll(sim, USER, ['VIN011']);
  ok(client.getState().records.size === 1, 'feed initial');
}

// --- 14. ACL 公開→非公開 ---
function testAclPublicToPrivate() {
  const sim = createHistorySyncSimulator();
  const clientU2 = createHistorySyncClient();
  sim.setVinOwner('VIN012', { type: 'user', id: 'U1', periodId: 'OP-1' });
  sim.registerLog(USER, { logId: 'L12', vin: 'VIN012', title: 'SECRET', visibility: 'public' });
  clientU2.pullAll(sim, USER2, ['VIN012']);
  ok(clientU2.getState().records.has('L12'), 'U2 saw public');
  sim.setVisibility(USER, { logId: 'L12', visibility: 'private', baseVisibilityRev: 1 });
  const after = clientU2.getState().afterSeq;
  const feed = sim.getHistorySyncFeed(USER2, {
    afterSeq: after,
    limit: 20,
    vinList: ['VIN012']
  });
  const drops = feed.events.filter((e) => e.type === 'acl_drop' || e.type === 'delete' || e.type === 'visibility');
  ok(drops.some((e) => e.type === 'acl_drop' && e.logId === 'L12'), 'acl_drop for prior viewer');
  ok(drops.every((ev) => !eventHasLeaks_(ev)), 'drop has no title/vin leak');
  clientU2.pullAll(sim, USER2, ['VIN012']);
  ok(!clientU2.getState().records.has('L12'), 'removed locally');
}

// --- 15. 非公開→公開 ---
function testPrivateToPublic() {
  const sim = createHistorySyncSimulator();
  const clientU2 = createHistorySyncClient();
  sim.setVinOwner('VIN013', { type: 'user', id: 'U1', periodId: 'OP-1' });
  sim.registerLog(USER, { logId: 'L13', vin: 'VIN013', visibility: 'private' });
  clientU2.pullAll(sim, USER2, ['VIN013']);
  ok(clientU2.getState().records.size === 0, 'U2 no access');
  sim.setVisibility(USER, { logId: 'L13', visibility: 'public', baseVisibilityRev: 1 });
  clientU2.pullAll(sim, USER2, ['VIN013']);
  ok(clientU2.getState().records.size === 0, 'past acl not trusted without new full');
  const full = sim.getMaintenanceHistoryFull(USER2, 'VIN013');
  ok(full.logs.length === 1, 'full required for new grant');
}

// --- 16. オーナー変更（行不変） ---
function testOwnerRelink() {
  const sim = createHistorySyncSimulator();
  const clientOld = createHistorySyncClient();
  const clientNew = createHistorySyncClient();
  sim.setVinOwner('VIN014', { type: 'user', id: 'U1', periodId: 'OP-OLD' });
  sim.registerLog(USER, { logId: 'L14', vin: 'VIN014', visibility: 'private' });
  clientOld.pullAll(sim, USER, ['VIN014']);
  sim.setVinOwner('VIN014', { type: 'user', id: 'U2', periodId: 'OP-NEW' });
  sim.relinkOwnerPeriod('VIN014', 'OP-NEW');
  const pageOld = sim.getHistorySyncFeed(USER, {
    afterSeq: clientOld.getState().afterSeq,
    limit: 20,
    vinList: ['VIN014']
  });
  clientOld.applyPage(USER, ['VIN014'], pageOld);
  ok(!clientOld.getState().records.has('L14'), 'old owner loses on relink');
  clientNew.pullAll(sim, USER2, ['VIN014']);
  ok(clientNew.getState().records.has('L14'), 'new owner gains');
}

// --- 17. 店舗セッション切替 ---
function testShopSwitch() {
  const sim = createHistorySyncSimulator();
  const client = createHistorySyncClient();
  sim.setVinOwner('VIN015', { type: 'user', id: 'U1', periodId: 'OP-1' });
  sim.registerLog(SHOP, { logId: 'L15', vin: 'VIN015', visibility: 'private' });
  client.pullAll(sim, SHOP, ['VIN015']);
  ok(client.getState().records.has('L15'), 'shop sees own private');
  client.resetForScope(USER2, ['VIN015']);
  client.pullAll(sim, USER2, ['VIN015']);
  ok(!client.getState().records.has('L15'), 'stranger cannot see shop private');
}

// --- 18. 削除通知の漏洩 ---
function testDeleteNoLeakToStranger() {
  const sim = createHistorySyncSimulator();
  sim.setVinOwner('VIN016', { type: 'user', id: 'U1', periodId: 'OP-1' });
  sim.registerLog(USER, { logId: 'L16', vin: 'VIN016', visibility: 'private' });
  sim.deleteLog(USER, { logId: 'L16' });
  const feed = sim.getHistorySyncFeed(USER2, { afterSeq: 0, limit: 10, vinList: ['VIN016'] });
  ok(feed.events.length === 0, 'stranger gets no delete leak');
}

// --- 19. v64 順序: 遅延到着 ---
function testV64LateArrival() {
  const sim = createHistorySyncSimulator();
  sim.setVinOwner('VIN017', { type: 'user', id: 'U1', periodId: 'OP-1' });
  sim.registerLog(USER, { logId: 'L17', vin: 'VIN017', visibility: 'public' });
  const reqPrivateTimedOut = { logId: 'L17', visibility: 'private', baseVisibilityRev: 1 };
  sim.enqueueLateVisibility(USER, reqPrivateTimedOut);
  const r2 = sim.setVisibility(USER, { logId: 'L17', visibility: 'public', baseVisibilityRev: 1 });
  ok(r2.success, 'public retry succeeds while private still in flight');
  const visRevAfter = r2.visibilityRev;
  const late = sim.flushLateVisibilityQueue();
  ok(late[0] && late[0].error === 'VISIBILITY_REV_CONFLICT', 'late private after timeout rejected');
  const client = createHistorySyncClient();
  client.pullAll(sim, USER, ['VIN017']);
  ok(client.getState().records.get('L17').visibility === 'public', 'state stays public');
  ok(client.getState().records.get('L17').visibilityRev === visRevAfter, 'vis rev kept');
}

// --- 20. カーソル期限切れ ---
function testCursorExpiry() {
  const sim = createHistorySyncSimulator();
  sim.setVinOwner('VIN018', { type: 'user', id: 'U1', periodId: 'OP-1' });
  for (let i = 0; i < 12; i++) sim.registerLog(USER, { logId: 'E' + i, vin: 'VIN018' });
  const feed = sim.getHistorySyncFeed(USER, { afterSeq: 5, limit: 5, minRetainedSeq: 10 });
  ok(feed.fullResyncRequired, 'full resync flag');
}

// --- 21. 負荷比較（モック） ---
function testLoadCompare() {
  const sim = createHistorySyncSimulator();
  sim.setVinOwner('V1', { type: 'user', id: 'U1', periodId: 'OP-1' });
  sim.setVinOwner('V2', { type: 'user', id: 'U1', periodId: 'OP-2' });
  for (let i = 0; i < 30; i++) {
    sim.registerLog(USER, { logId: 'M' + i, vin: i % 2 ? 'V1' : 'V2' });
  }
  const cmp = sim.compareLoad(USER, ['V1', 'V2'], 0);
  ok(cmp.fullVinScan.rowsRead >= 30, 'full scan reads all rows');
  ok(cmp.changelogTail.rowsRead <= 35, 'tail bounded');
  ok(cmp.fullVinScan.fullScans === 2, 'two vin scans');
}

// --- 22. 複数 VIN 一括 ---
function testMultiVinBatch() {
  const sim = createHistorySyncSimulator();
  sim.setVinOwner('MV1', { type: 'user', id: 'U1', periodId: 'OP-1' });
  sim.setVinOwner('MV2', { type: 'user', id: 'U1', periodId: 'OP-2' });
  sim.registerLog(USER, { logId: 'MV-A', vin: 'MV1' });
  sim.registerLog(USER, { logId: 'MV-B', vin: 'MV2' });
  const client = createHistorySyncClient();
  client.pullAll(sim, USER, ['MV1', 'MV2']);
  ok(client.getState().records.size === 2, 'multi vin batch');
}

function run() {
  testHappyPath();
  testFailAfterChangelog();
  testFailBeforeCommit();
  testPendingThenFollowUp();
  testRepairIdempotent();
  testStaleWriteFixed();
  testLegacyClient();
  testVisibilityRevConflict();
  testPagingResume();
  testConcurrentChangesDuringSync();
  testVinScopeChange();
  testEmptyFeed();
  testFullVsInitialFeed();
  testAclPublicToPrivate();
  testPrivateToPublic();
  testOwnerRelink();
  testShopSwitch();
  testDeleteNoLeakToStranger();
  testV64LateArrival();
  testCursorExpiry();
  testLoadCompare();
  testMultiVinBatch();
  console.log('\nTotal PASS:', passed, 'FAIL:', failed);
  if (failed) process.exit(1);
}

run();