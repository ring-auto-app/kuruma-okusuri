/**
 * v65-2a ring-sync 自己テスト（メモリ / 任意 fake-indexeddb）
 * 実行: node scripts/v65-sync-store-selftest.mjs
 * 実IDB: node scripts/v65-sync-idb-browser-selftest.mjs
 */

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';
import vm from 'node:vm';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const FAKE_TOKEN = 'eyJhbGciOiJIUzI1NiJ9.fake-token-secret';

function assert(cond, msg) {
  if (!cond) throw new Error('FAIL: ' + msg);
}

function loadScript(rel) {
  return readFileSync(join(root, rel), 'utf8');
}

function makeMockGlobal() {
  var requestEpoch = 1;
  var activeScope = ['http://gas.example', 'user', FAKE_TOKEN, 'U1', 'S1', 'factory'];
  var g = {
    console,
    Promise,
    JSON,
    Date,
    Error,
    performance,
    indexedDB: globalThis.indexedDB,
    GAS_URL: 'https://gas.example/exec',
    getCurrentProfile: function () {
      return { userId: 'U1', shopId: 'S1', shopType: 'factory' };
    },
    _normalize: function (vin) {
      return String(vin || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    },
    GAS_URL: 'https://script.google.com/macros/s/AKfycbzTESTDEPLOY_A/exec',
    location: { pathname: '/index.html' },
    ringCaptureRequestContext_: function () {
      return {
        scope: JSON.stringify(activeScope),
        epoch: requestEpoch,
        mode: 'user',
        token: FAKE_TOKEN
      };
    },
    ringRequestContextIsCurrent_: function (ctx) {
      return !!ctx && ctx.epoch === requestEpoch;
    },
    __bumpAuth: function () { requestEpoch++; }
  };
  g.globalThis = g;
  g.window = g;
  g.global = g;
  return g;
}

function bootSync(g) {
  vm.runInNewContext(loadScript('ring-sync-store.js'), g, { filename: 'ring-sync-store.js' });
  vm.runInNewContext(loadScript('ring-sync-engine.js'), g, { filename: 'ring-sync-engine.js' });
  if (!g.ringSyncStore || !g.ringSyncEngine) throw new Error('BOOT_FAILED');
  if (g.location && /ring-sync-test\.html$/i.test(String(g.location.pathname || ''))) {
    g.ringSyncEngine.enableHistoryBodyPersistOnTestPage(true);
  }
}

function gVinNorm(v) {
  return String(v || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function mockEntities(n, vin, prefix) {
  prefix = prefix || 'L';
  vin = vin || 'VINTEST001';
  var out = [];
  for (var i = 0; i < n; i++) {
    var id = prefix + String(i).padStart(4, '0');
    out.push({
      entityId: id,
      vinNorm: gVinNorm(vin),
      payload: { log_id: id, vin: vin, title: 'mock' },
      payloadClass: 'mock'
    });
  }
  return out;
}

async function runWithDriver(label, useIdb) {
  var passed = 0;
  var timings = [];

  function ok(m) { passed++; console.log('PASS [' + label + ']:', m); }

  var g = makeMockGlobal();
  bootSync(g);
  if (useIdb) {
    if (!g.indexedDB) {
      console.log('SKIP [' + label + ']: indexedDB unavailable');
      return { passed: 0, skipped: true };
    }
    g.ringSyncStore.useIndexedDbDriverForTests();
    await g.ringSyncStore.wipeAllPartitions();
  } else {
    g.ringSyncStore.useMemoryDriverForTests();
  }

  g.location = { pathname: '/ring-sync-test.html' };
  g.ringSyncEngine.enableHistoryBodyPersistOnTestPage(true);

  var ctx = g.ringCaptureRequestContext_();
  var part = g.ringSyncEngine.persistentPartitionFromContext(ctx);
  assert(part.partitionId.indexOf(FAKE_TOKEN) < 0, 'token not in partitionId');
  assert(part.partitionId.indexOf('ring_sync_p_v1:') === 0, 'partition prefix');
  assert(part.partitionId.indexOf('d:AKfycbzTESTDEPLOY_A') > 0, 'deploy key');
  g.GAS_URL = 'https://script.google.com/macros/s/AKfycbzTESTDEPLOY_B/exec';
  assert(g.ringSyncEngine.persistentPartitionFromContext(ctx).partitionId !== part.partitionId, 'deploy distinct');
  g.GAS_URL = 'https://script.google.com/macros/s/AKfycbzTESTDEPLOY_A/exec';
  ok('partition has no token');

  for (const n of [1, 10, 100, 1000]) {
    var vin = 'VIN' + n;
    var ents = mockEntities(n, vin);
    var t0 = performance.now();
    var res = await g.ringSyncEngine.applyFullSnapshot(
      g.ringSyncEngine.DOMAINS.history,
      gVinNorm(vin),
      ents,
      { partition: part, context: ctx, persistBody: true, writeEpoch: g.ringSyncEngine.captureWriteEpoch() }
    );
    var rows = await g.ringSyncStore.listRecordsForScope(part.partitionId, 'history', gVinNorm(vin));
    var t1 = performance.now();
    assert(res.ok && rows.length === n, 'scale n=' + n);
    var dump = await g.ringSyncStore.dumpAllForTests();
    var sec = g.ringSyncEngine.scanStoredDataForSecrets(dump);
    assert(sec.ok, 'no secrets n=' + n + ' ' + (sec.hit || ''));
    timings.push({ driver: label, op: 'write_read_' + n, ms: Math.round((t1 - t0) * 100) / 100, rows: n });
    ok('scale ' + n);
  }

  {
    var vin2 = 'VINUPD';
    await g.ringSyncEngine.applyFullSnapshot(
      g.ringSyncEngine.DOMAINS.history, gVinNorm(vin2),
      [{ entityId: 'A1', vinNorm: gVinNorm(vin2), payload: { a: 1 }, payloadClass: 'mock' }],
      { partition: part, context: ctx, persistBody: true, writeEpoch: g.ringSyncEngine.captureWriteEpoch() }
    );
    await g.ringSyncEngine.applyFullSnapshot(
      g.ringSyncEngine.DOMAINS.history, gVinNorm(vin2),
      [{ entityId: 'A1', vinNorm: gVinNorm(vin2), payload: { a: 2 }, payloadClass: 'mock' }],
      { partition: part, context: ctx, persistBody: true, writeEpoch: g.ringSyncEngine.captureWriteEpoch() }
    );
    var rows2 = await g.ringSyncStore.listRecordsForScope(part.partitionId, 'history', gVinNorm(vin2));
    assert(rows2.length === 1 && rows2[0].payload.a === 2, 'upsert');
    ok('upsert no duplicate');
  }

  {
    var vin3 = 'VINDEL';
    await g.ringSyncEngine.applyFullSnapshot(
      g.ringSyncEngine.DOMAINS.history, gVinNorm(vin3), mockEntities(5, vin3),
      { partition: part, context: ctx, persistBody: true, writeEpoch: g.ringSyncEngine.captureWriteEpoch() }
    );
    await g.ringSyncEngine.applyFullSnapshot(
      g.ringSyncEngine.DOMAINS.history, gVinNorm(vin3), mockEntities(2, vin3, 'K'),
      { partition: part, context: ctx, persistBody: true, writeEpoch: g.ringSyncEngine.captureWriteEpoch() }
    );
    var left = await g.ringSyncStore.listRecordsForScope(part.partitionId, 'history', gVinNorm(vin3));
    assert(left.length === 2, 'snapshot delete');
    var meta = await g.ringSyncStore.getSyncMeta(g.ringSyncStore.makeMetaPk(part.partitionId, 'history', gVinNorm(vin3)));
    assert(meta && meta.entityCount === 2, 'meta in sync with data');
    ok('full snapshot delete + meta');
  }

  {
    var g4 = makeMockGlobal();
    bootSync(g4);
    g4.ringSyncStore.useMemoryDriverForTests();
    g4.location = { pathname: '/ring-sync-test.html' };
    g4.ringSyncEngine.enableHistoryBodyPersistOnTestPage(true);
    var ctxA = g4.ringCaptureRequestContext_();
    g4.getCurrentProfile = function () { return { userId: 'UA', shopId: 'SA', shopType: '' }; };
    var partA = g4.ringSyncEngine.persistentPartitionFromContext(ctxA);
    await g4.ringSyncEngine.applyFullSnapshot(
      g4.ringSyncEngine.DOMAINS.history, 'VINX',
      [{ entityId: 'X1', vinNorm: 'VINX', payload: {}, payloadClass: 'mock' }],
      { partition: partA, context: ctxA, persistBody: true, writeEpoch: g4.ringSyncEngine.captureWriteEpoch() }
    );
    g4.getCurrentProfile = function () { return { userId: 'UB', shopId: 'SB', shopType: '' }; };
    g4.__bumpAuth();
    var ctxB = g4.ringCaptureRequestContext_();
    var partB = g4.ringSyncEngine.persistentPartitionFromContext(ctxB);
    var bRows = await g4.ringSyncStore.listRecordsForScope(partB.partitionId, 'history', 'VINX');
    assert(bRows.length === 0, 'other account isolated');
    var aRows = await g4.ringSyncStore.listRecordsForScope(partA.partitionId, 'history', 'VINX');
    assert(aRows.length === 1, 'original partition retained');
    ok('account partition isolation');
  }

  {
    var epoch0 = g.ringSyncEngine.captureWriteEpoch();
    var delayed = g.ringSyncEngine.applyFullSnapshot(
      g.ringSyncEngine.DOMAINS.history, 'VINRACE',
      mockEntities(3, 'VINRACE'),
      { partition: part, context: ctx, persistBody: true, writeEpoch: epoch0 }
    );
    g.ringSyncEngine.invalidateWriteEpoch();
    var rRace = await delayed;
    assert(rRace.ok === false, 'invalidated write rejected');
    ok('invalidate blocks stale write completion');
  }

  {
    var g7m = makeMockGlobal();
    bootSync(g7m);
    g7m.ringSyncStore.useMemoryDriverForTests();
    g7m.ringSyncEngine.enableHistoryBodyPersistOnTestPage(false);
    var ctx7 = g7m.ringCaptureRequestContext_();
    var part7 = g7m.ringSyncEngine.persistentPartitionFromContext(ctx7);
    var r7 = await g7m.ringSyncEngine.onMaintenanceFullFetch(
      'VINMETA',
      { ok: true, logs: [{ log_id: 'M1', vin: 'VINMETA' }] },
      ctx7,
      [{ log_id: 'M1', vin: 'VINMETA' }]
    );
    assert(r7.stored && r7.mode === 'meta_only', 'meta only');
    var bodies = await g7m.ringSyncStore.listRecordsForScope(part7.partitionId, 'history', gVinNorm('VINMETA'));
    assert(bodies.length === 0, 'no body records prod default');
    ok('production meta_only default');
  }

  {
    var g8 = makeMockGlobal();
    bootSync(g8);
    g8.ringSyncStore.useMemoryDriverForTests();
    assert(g8.ringSyncEngine.enableHistoryBodyPersistOnTestPage(true) === false, 'no test page');
    assert(g8.ringSyncEngine.isHistoryBodyPersistEnabled() === false, 'prod persist off');
    ok('history body persist locked off non-test page');
  }

  {
    var gLeg = makeMockGlobal();
    bootSync(gLeg);
    gLeg.ringSyncStore.useMemoryDriverForTests();
    var legacyPart = JSON.stringify(['gas', 'user', FAKE_TOKEN, 'U1']);
    await gLeg.ringSyncStore.applyScopeSnapshotAtomic(
      legacyPart, 'history', 'VINLEG',
      [{
        entityId: 'L1',
        pk: legacyPart + '|history|L1',
        partitionId: legacyPart,
        domain: 'history',
        scopeKey: 'VINLEG',
        entityId: 'L1',
        payload: {}
      }],
      [], null
    );
    await gLeg.ringSyncStore.purgeLegacyPartitions();
    var legRows = await gLeg.ringSyncStore.listRecordsForScope(legacyPart, 'history', 'VINLEG');
    assert(legRows.length === 0, 'legacy purged');
    ok('legacy partition purge');
  }

  {
    var gTx = makeMockGlobal();
    bootSync(gTx);
    gTx.ringSyncStore.useMemoryDriverForTests();
    gTx.location = { pathname: '/ring-sync-test.html' };
    gTx.ringSyncEngine.enableHistoryBodyPersistOnTestPage(true);
    var partTx = gTx.ringSyncEngine.persistentPartitionFromContext(gTx.ringCaptureRequestContext_());
    var ctxTx = gTx.ringCaptureRequestContext_();
    gTx.ringSyncStore.applyScopeSnapshotAtomic = function () {
      return Promise.reject(new Error('SIMULATED_TX_FAIL'));
    };
    var fail = await gTx.ringSyncEngine.applyFullSnapshot(
      gTx.ringSyncEngine.DOMAINS.history, 'VINFAIL',
      [{ entityId: 'F1', vinNorm: 'VINFAIL', payload: {}, payloadClass: 'mock' }],
      { partition: partTx, context: ctxTx, persistBody: true, writeEpoch: gTx.ringSyncEngine.captureWriteEpoch() }
    );
    assert(fail.ok === false, 'tx fail');
    var metaFail = await gTx.ringSyncStore.getSyncMeta(
      gTx.ringSyncStore.makeMetaPk(partTx.partitionId, 'history', 'VINFAIL'));
    assert(!metaFail, 'no meta on failed atomic tx');
    ok('tx failure no meta orphan');
  }

  if (useIdb) await g.ringSyncStore.restoreAutoDriverForTests();
  return { passed, timings };
}

async function run() {
  try {
    await import('fake-indexeddb/auto');
    console.log('INFO: fake-indexeddb loaded for IDB driver tests');
  } catch (e) {
    console.log('INFO: fake-indexeddb not installed — IDB driver tests skipped');
  }

  var mem = await runWithDriver('memory', false);
  var idb = { passed: 0, skipped: true };
  if (globalThis.indexedDB) {
    idb = await runWithDriver('idb-fake', true);
  }

  console.log('\n--- memory timings ---');
  (mem.timings || []).forEach(function (t) { console.log(JSON.stringify(t)); });
  console.log('\n--- idb-fake timings ---');
  (idb.timings || []).forEach(function (t) { console.log(JSON.stringify(t)); });

  var total = mem.passed + (idb.passed || 0);
  console.log('\nTotal passed:', total);
  if (total < mem.passed) process.exit(1);
}

run().catch(function (e) {
  console.error(e);
  process.exit(1);
});