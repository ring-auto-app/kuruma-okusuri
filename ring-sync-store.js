/**
 * v65 共通同期ストア — IndexedDB（フォールバック: メモリ）
 * partitionId に認証トークンを含めない（ring-sync-engine が生成）
 */
(function (global) {
  'use strict';

  var DB_NAME = 'ring_sync_v1';
  var SCHEMA_VERSION = 2;
  var STORE_RECORDS = 'records';
  var STORE_META = 'sync_meta';
  var STORE_TOMBSTONES = 'tombstones';
  var LEGACY_PARTITION_PREFIXES = ['[', 'scope|'];

  var memoryBackend_ = null;
  var activeDriver_ = 'auto';

  function deepClone_(v) {
    return JSON.parse(JSON.stringify(v));
  }

  function makePk_(partitionId, domain, entityId) {
    return String(partitionId || '') + '|' + String(domain || '') + '|' + String(entityId || '');
  }

  function makeMetaPk_(partitionId, domain, scopeKey) {
    return String(partitionId || '') + '|' + String(domain || '') + '|scope:' + String(scopeKey || '');
  }

  function makeTombPk_(partitionId, domain, entityId, scopeKey) {
    return String(partitionId || '') + '|' + String(domain || '') + '|' +
      String(scopeKey || '') + '|ts:' + String(entityId || '');
  }

  function isLegacyPartitionId_(partitionId) {
    var pid = String(partitionId || '');
    if (!pid) return true;
    if (pid.indexOf('ring_sync_p_v1:') === 0) return false;
    return true;
  }

  // ---------- メモリドライバ ----------

  function memoryApplySnapshotAtomic_(partitionId, domain, scopeKey, records, tombstoneEntityIds, metaRow) {
    if (!memoryBackend_) {
      memoryBackend_ = { records: {}, meta: {}, tombstones: {} };
    }
    var keep = {};
    (records || []).forEach(function (r) {
      if (!r || !r.pk) return;
      if (r.partitionId !== partitionId || r.domain !== domain || r.scopeKey !== scopeKey) {
        throw new Error('SCOPE_MISMATCH');
      }
      keep[String(r.entityId)] = true;
      memoryBackend_.records[r.pk] = deepClone_(r);
    });
    Object.keys(memoryBackend_.records).forEach(function (pk) {
      var r = memoryBackend_.records[pk];
      if (!r) return;
      if (r.partitionId !== partitionId || r.domain !== domain || r.scopeKey !== scopeKey) return;
      if (!keep[String(r.entityId)]) delete memoryBackend_.records[pk];
    });
  (tombstoneEntityIds || []).forEach(function (entityId) {
      var ts = {
        pk: makeTombPk_(partitionId, domain, entityId, scopeKey),
        partitionId: partitionId,
        domain: domain,
        entityId: entityId,
        scopeKey: scopeKey,
        removedAt: Date.now()
      };
      memoryBackend_.tombstones[ts.pk] = ts;
    });
    if (metaRow && metaRow.pk) {
      memoryBackend_.meta[metaRow.pk] = deepClone_(metaRow);
    }
    return Promise.resolve();
  }

  function memoryDriver_() {
    if (!memoryBackend_) {
      memoryBackend_ = { records: {}, meta: {}, tombstones: {} };
    }
    return {
      kind: 'memory',
      putRecords: function (rows) {
        rows.forEach(function (r) { if (r && r.pk) memoryBackend_.records[r.pk] = deepClone_(r); });
        return Promise.resolve();
      },
      getRecord: function (pk) {
        return Promise.resolve(memoryBackend_.records[pk] ? deepClone_(memoryBackend_.records[pk]) : null);
      },
      listRecordsForScope: function (partitionId, domain, scopeKey) {
        var out = [];
        Object.keys(memoryBackend_.records).forEach(function (pk) {
          var r = memoryBackend_.records[pk];
          if (!r) return;
          if (r.partitionId === partitionId && r.domain === domain && r.scopeKey === scopeKey) out.push(deepClone_(r));
        });
        return Promise.resolve(out);
      },
      listEntityIdsForScope: function (partitionId, domain, scopeKey) {
        var ids = [];
        Object.keys(memoryBackend_.records).forEach(function (pk) {
          var r = memoryBackend_.records[pk];
          if (!r) return;
          if (r.partitionId === partitionId && r.domain === domain && r.scopeKey === scopeKey) ids.push(r.entityId);
        });
        return Promise.resolve(ids);
      },
      applyScopeSnapshotAtomic: function (partitionId, domain, scopeKey, records, tombstoneEntityIds, metaRow) {
        try {
          return memoryApplySnapshotAtomic_(partitionId, domain, scopeKey, records, tombstoneEntityIds, metaRow);
        } catch (e) {
          return Promise.reject(e);
        }
      },
      putMetaOnlyAtomic: function (metaRow) {
        if (!memoryBackend_) memoryBackend_ = { records: {}, meta: {}, tombstones: {} };
        if (metaRow && metaRow.pk) memoryBackend_.meta[metaRow.pk] = deepClone_(metaRow);
        return Promise.resolve();
      },
      getMeta: function (pk) {
        return Promise.resolve(memoryBackend_.meta[pk] ? deepClone_(memoryBackend_.meta[pk]) : null);
      },
      clearPartition: function (partitionId) {
        Object.keys(memoryBackend_.records).forEach(function (pk) {
          var r = memoryBackend_.records[pk];
          if (r && r.partitionId === partitionId) delete memoryBackend_.records[pk];
        });
        Object.keys(memoryBackend_.meta).forEach(function (pk) {
          var r = memoryBackend_.meta[pk];
          if (r && r.partitionId === partitionId) delete memoryBackend_.meta[pk];
        });
        Object.keys(memoryBackend_.tombstones).forEach(function (pk) {
          var r = memoryBackend_.tombstones[pk];
          if (r && r.partitionId === partitionId) delete memoryBackend_.tombstones[pk];
        });
        return Promise.resolve();
      },
      purgeLegacyPartitions: function () {
        function stripStore(store) {
          Object.keys(store).forEach(function (pk) {
            var r = store[pk];
            if (r && isLegacyPartitionId_(r.partitionId)) delete store[pk];
          });
        }
        stripStore(memoryBackend_.records);
        stripStore(memoryBackend_.meta);
        stripStore(memoryBackend_.tombstones);
        return Promise.resolve({ removed: true });
      },
      dumpAllForTests: function () {
        return Promise.resolve({
          records: Object.keys(memoryBackend_.records).map(function (k) { return deepClone_(memoryBackend_.records[k]); }),
          meta: Object.keys(memoryBackend_.meta).map(function (k) { return deepClone_(memoryBackend_.meta[k]); }),
          tombstones: Object.keys(memoryBackend_.tombstones).map(function (k) { return deepClone_(memoryBackend_.tombstones[k]); })
        });
      },
      wipeAll: function () {
        memoryBackend_ = { records: {}, meta: {}, tombstones: {} };
        return Promise.resolve();
      }
    };
  }

  // ---------- IndexedDB ----------

  function openIdb_() {
    return new Promise(function (resolve, reject) {
      if (typeof indexedDB === 'undefined') {
        reject(new Error('INDEXEDDB_UNAVAILABLE'));
        return;
      }
      var req = indexedDB.open(DB_NAME, SCHEMA_VERSION);
      req.onupgradeneeded = function (ev) {
        var db = ev.target.result;
        var tx = ev.target.transaction;
        if (ev.oldVersion > 0 && ev.oldVersion < SCHEMA_VERSION) {
          [STORE_RECORDS, STORE_META, STORE_TOMBSTONES].forEach(function (name) {
            if (db.objectStoreNames.contains(name)) db.deleteObjectStore(name);
          });
        }
        if (!db.objectStoreNames.contains(STORE_RECORDS)) {
          var rec = db.createObjectStore(STORE_RECORDS, { keyPath: 'pk' });
          rec.createIndex('byScope', ['partitionId', 'domain', 'scopeKey'], { unique: false });
          rec.createIndex('byPartition', 'partitionId', { unique: false });
        }
        if (!db.objectStoreNames.contains(STORE_META)) {
          var meta = db.createObjectStore(STORE_META, { keyPath: 'pk' });
          meta.createIndex('byPartition', 'partitionId', { unique: false });
        }
        if (!db.objectStoreNames.contains(STORE_TOMBSTONES)) {
          var ts = db.createObjectStore(STORE_TOMBSTONES, { keyPath: 'pk' });
          ts.createIndex('byPartition', 'partitionId', { unique: false });
        }
        if (tx) { /* upgrade tx commits with schema */ }
      };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error || new Error('IDB_OPEN_FAILED')); };
    });
  }

  function idbApplyScopeSnapshotAtomic_(partitionId, domain, scopeKey, records, tombstoneEntityIds, metaRow) {
    return openIdb_().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx;
        try {
          tx = db.transaction([STORE_RECORDS, STORE_META, STORE_TOMBSTONES], 'readwrite');
        } catch (e) {
          try { db.close(); } catch (e2) { /* ignore */ }
          reject(e);
          return;
        }
        var failed = false;
        tx.oncomplete = function () {
          try { db.close(); } catch (eClose) { /* ignore */ }
          if (!failed) resolve();
        };
        tx.onabort = function () {
          try { db.close(); } catch (eClose) { /* ignore */ }
          reject(tx.error || new Error('IDB_TX_ABORT'));
        };
        tx.onerror = function () {
          failed = true;
        };

        try {
          var recStore = tx.objectStore(STORE_RECORDS);
          var keep = {};
          (records || []).forEach(function (r) {
            if (!r || !r.pk) return;
            if (r.partitionId !== partitionId || r.domain !== domain || String(r.scopeKey) !== String(scopeKey)) {
              tx.abort();
              throw new Error('SCOPE_MISMATCH');
            }
            keep[String(r.entityId)] = true;
            recStore.put(r);
          });

          var idx = recStore.index('byScope');
          var cursorReq = idx.openCursor(IDBKeyRange.only([partitionId, domain, scopeKey]));
          cursorReq.onsuccess = function (ev) {
            var cursor = ev.target.result;
            if (!cursor) {
              try {
                var tombStore = tx.objectStore(STORE_TOMBSTONES);
                (tombstoneEntityIds || []).forEach(function (entityId) {
                  tombStore.put({
                    pk: makeTombPk_(partitionId, domain, entityId, scopeKey),
                    partitionId: partitionId,
                    domain: domain,
                    entityId: entityId,
                    scopeKey: scopeKey,
                    removedAt: Date.now()
                  });
                });
                if (metaRow && metaRow.pk) {
                  tx.objectStore(STORE_META).put(metaRow);
                }
              } catch (eInner) {
                failed = true;
                tx.abort();
              }
              return;
            }
            var val = cursor.value;
            if (!keep[String(val.entityId)]) cursor.delete();
            cursor.continue();
          };
          cursorReq.onerror = function () {
            failed = true;
            tx.abort();
          };
        } catch (eOp) {
          failed = true;
          try { tx.abort(); } catch (eA) { /* ignore */ }
          reject(eOp);
        }
      });
    });
  }

  function idbPutMetaOnlyAtomic_(metaRow) {
    return openIdb_().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction([STORE_META], 'readwrite');
        tx.oncomplete = function () { try { db.close(); } catch (e) { /* ignore */ } resolve(); };
        tx.onerror = function () { try { db.close(); } catch (e) { /* ignore */ } reject(tx.error); };
        tx.onabort = function () { try { db.close(); } catch (e) { /* ignore */ } reject(tx.error || new Error('IDB_META_ABORT')); };
        try {
          tx.objectStore(STORE_META).put(metaRow);
        } catch (e) {
          tx.abort();
          reject(e);
        }
      });
    });
  }

  function idbPurgeLegacyPartitions_() {
    return openIdb_().then(function (db) {
      return new Promise(function (resolve, reject) {
        var storeNames = [STORE_RECORDS, STORE_META, STORE_TOMBSTONES].filter(function (n) {
          return db.objectStoreNames.contains(n);
        });
        if (!storeNames.length) { db.close(); resolve({ removed: 0 }); return; }
        var tx = db.transaction(storeNames, 'readwrite');
        var removed = 0;
        tx.oncomplete = function () { try { db.close(); } catch (e) { /* ignore */ } resolve({ removed: removed }); };
        tx.onerror = function () { try { db.close(); } catch (e) { /* ignore */ } reject(tx.error); };
        storeNames.forEach(function (sn) {
          var store = tx.objectStore(sn);
          var req = store.openCursor();
          req.onsuccess = function (ev) {
            var cursor = ev.target.result;
            if (!cursor) return;
            var val = cursor.value;
            if (val && isLegacyPartitionId_(val.partitionId)) {
              cursor.delete();
              removed++;
            }
            cursor.continue();
          };
        });
      });
    });
  }

  function idbDriver_() {
    return {
      kind: 'indexeddb',
      listRecordsForScope: function (partitionId, domain, scopeKey) {
        return openIdb_().then(function (db) {
          return new Promise(function (resolve, reject) {
            var tx = db.transaction(STORE_RECORDS, 'readonly');
            var idx = tx.objectStore(STORE_RECORDS).index('byScope');
            var req = idx.getAll([partitionId, domain, scopeKey]);
            req.onsuccess = function () { db.close(); resolve(req.result || []); };
            req.onerror = function () { db.close(); reject(req.error); };
          });
        });
      },
      listEntityIdsForScope: function (partitionId, domain, scopeKey) {
        return idbDriver_().listRecordsForScope(partitionId, domain, scopeKey).then(function (rows) {
          return rows.map(function (r) { return r.entityId; });
        });
      },
      applyScopeSnapshotAtomic: idbApplyScopeSnapshotAtomic_,
      putMetaOnlyAtomic: idbPutMetaOnlyAtomic_,
      getMeta: function (pk) {
        return openIdb_().then(function (db) {
          return new Promise(function (resolve, reject) {
            var tx = db.transaction(STORE_META, 'readonly');
            var req = tx.objectStore(STORE_META).get(pk);
            req.onsuccess = function () { db.close(); resolve(req.result || null); };
            req.onerror = function () { db.close(); reject(req.error); };
          });
        });
      },
      clearPartition: function (partitionId) {
        return openIdb_().then(function (db) {
          return new Promise(function (resolve, reject) {
            var names = [STORE_RECORDS, STORE_META, STORE_TOMBSTONES];
            var tx = db.transaction(names, 'readwrite');
            tx.oncomplete = function () { try { db.close(); } catch (e) { /* ignore */ } resolve(); };
            tx.onerror = function () { try { db.close(); } catch (e) { /* ignore */ } reject(tx.error); };
            names.forEach(function (sn) {
              var store = tx.objectStore(sn);
              var idx = store.index('byPartition');
              var req = idx.openCursor(IDBKeyRange.only(partitionId));
              req.onsuccess = function (ev) {
                var cursor = ev.target.result;
                if (!cursor) return;
                cursor.delete();
                cursor.continue();
              };
            });
          });
        });
      },
      purgeLegacyPartitions: idbPurgeLegacyPartitions_,
      dumpAllForTests: function () {
        return openIdb_().then(function (db) {
          return new Promise(function (resolve, reject) {
            var out = { records: [], meta: [], tombstones: [] };
            var tx = db.transaction([STORE_RECORDS, STORE_META, STORE_TOMBSTONES], 'readonly');
            var pending = 3;
            function done() {
              pending--;
              if (pending === 0) { db.close(); resolve(out); }
            }
            ['records', 'meta', 'tombstones'].forEach(function (key, i) {
              var sn = [STORE_RECORDS, STORE_META, STORE_TOMBSTONES][i];
              var req = tx.objectStore(sn).getAll();
              req.onsuccess = function () { out[key] = req.result || []; done(); };
              req.onerror = function () { reject(req.error); };
            });
          });
        });
      },
      wipeAll: function () {
        return new Promise(function (resolve, reject) {
          if (typeof indexedDB === 'undefined') { resolve(); return; }
          var req = indexedDB.deleteDatabase(DB_NAME);
          req.onsuccess = function () { idbDriverCache_ = null; resolve(); };
          req.onerror = function () { reject(req.error || new Error('IDB_DELETE_FAILED')); };
          req.onblocked = function () { reject(new Error('IDB_DELETE_BLOCKED')); };
        });
      }
    };
  }

  var idbDriverCache_ = null;
  function getDriver_() {
    if (activeDriver_ === 'memory') return memoryDriver_();
    if (activeDriver_ === 'indexeddb') {
      if (!idbDriverCache_) idbDriverCache_ = idbDriver_();
      return idbDriverCache_;
    }
    if (typeof indexedDB === 'undefined') return memoryDriver_();
    if (!idbDriverCache_) idbDriverCache_ = idbDriver_();
    return idbDriverCache_;
  }

  function withDriver_(fn) {
    var driver = getDriver_();
    return Promise.resolve().then(function () { return fn(driver); }).catch(function (err) {
      if (driver.kind === 'indexeddb' && activeDriver_ === 'auto') {
        return fn(memoryDriver_());
      }
      throw err;
    });
  }

  var ringSyncStore = {
    DB_NAME: DB_NAME,
    SCHEMA_VERSION: SCHEMA_VERSION,
    PERSISTENT_PARTITION_PREFIX: 'ring_sync_p_v1:',
    makeRecordPk: makePk_,
    makeMetaPk: makeMetaPk_,
    makeTombstonePk: makeTombPk_,
    isLegacyPartitionId: isLegacyPartitionId_,

    isIndexedDbAvailable: function () { return typeof indexedDB !== 'undefined'; },

    useMemoryDriverForTests: function () {
      activeDriver_ = 'memory';
      memoryBackend_ = null;
    },
    useIndexedDbDriverForTests: function () {
      activeDriver_ = 'indexeddb';
      idbDriverCache_ = null;
    },
    resetMemoryBackendForTests: function () { memoryBackend_ = null; },
    restoreAutoDriverForTests: function () {
      activeDriver_ = 'auto';
      memoryBackend_ = null;
      idbDriverCache_ = null;
    },
    getActiveDriverKind: function () { return getDriver_().kind; },

    listRecordsForScope: function (partitionId, domain, scopeKey) {
      return withDriver_(function (d) { return d.listRecordsForScope(partitionId, domain, scopeKey); });
    },
    listEntityIdsForScope: function (partitionId, domain, scopeKey) {
      return withDriver_(function (d) { return d.listEntityIdsForScope(partitionId, domain, scopeKey); });
    },

    /**
     * 単一トランザクション: records 置換 + tombstones + sync_meta
     * metaRow が null のとき records/tombstones のみ（テスト用）
     */
    applyScopeSnapshotAtomic: function (partitionId, domain, scopeKey, records, tombstoneEntityIds, metaRow) {
      return withDriver_(function (d) {
        if (typeof d.applyScopeSnapshotAtomic === 'function') {
          return d.applyScopeSnapshotAtomic(partitionId, domain, scopeKey, records, tombstoneEntityIds, metaRow);
        }
        return Promise.reject(new Error('ATOMIC_NOT_SUPPORTED'));
      });
    },

    putMetaOnlyAtomic: function (metaRow) {
      return withDriver_(function (d) { return d.putMetaOnlyAtomic(metaRow); });
    },

    getSyncMeta: function (pk) {
      return withDriver_(function (d) { return d.getMeta(pk); });
    },

    purgeLegacyPartitions: function () {
      return withDriver_(function (d) { return d.purgeLegacyPartitions(); });
    },

    dumpAllForTests: function () {
      return withDriver_(function (d) {
        if (typeof d.dumpAllForTests === 'function') return d.dumpAllForTests();
        return Promise.resolve({});
      });
    },

    clearPartition: function (partitionId) {
      return withDriver_(function (d) { return d.clearPartition(partitionId); });
    },

    wipeAllPartitions: function () {
      return withDriver_(function (d) { return d.wipeAll(); });
    }
  };

  global.ringSyncStore = ringSyncStore;
})(typeof window !== 'undefined' ? window : globalThis);