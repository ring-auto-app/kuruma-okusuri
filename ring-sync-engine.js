/**
 * v65 同期エンジン — 永続パーティション（トークン非含有）・書込ゲート
 */
(function (global) {
  'use strict';

  var DOMAINS = {
    history: 'history',
    vehicle: 'vehicle',
    rental: 'rental',
    daily_inspection: 'daily_inspection'
  };

  var PERSISTENT_PARTITION_PREFIX = 'ring_sync_p_v1:';
  /** 本番では常に false。本文保存はローカル検証ページのみ（precache 外） */
  var historyBodyPersistEnabled_ = false;
  var storeWriteEpoch_ = 1;

  function normalizeVin_(vin) {
    if (typeof global._normalize === 'function') return global._normalize(vin);
    return String(vin || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  }

  function gasDeployKeyFromGlobal_() {
    var url = typeof global.GAS_URL === 'string' ? String(global.GAS_URL).trim() : '';
    if (!url) return 'nodeploy';
    var m = url.match(/\/macros\/s\/([A-Za-z0-9_-]+)\//i) ||
      url.match(/\/s\/([A-Za-z0-9_-]+)\//i);
    if (m && m[1]) return 'd:' + m[1];
    var h = 0;
    for (var i = 0; i < url.length; i++) {
      h = ((h << 5) - h + url.charCodeAt(i)) | 0;
    }
    return 'h:' + (h >>> 0).toString(36);
  }

  /**
   * 永続 partitionId（トークン・session scope を含めない）
   * リクエスト照合は別: ringCaptureRequestContext_ / ringRequestContextIsCurrent_
   */
  function persistentPartitionFromContext_(ctx) {
    if (!ctx) return null;
    var prof = typeof global.getCurrentProfile === 'function' ? (global.getCurrentProfile() || {}) : {};
    var mode = String(ctx.mode || 'user');
    var uid = String(prof.userId || '').trim();
    var sid = String(prof.shopId || '').trim();
    var st = String(prof.shopType || '').trim();
    var deployKey = gasDeployKeyFromGlobal_();
    var partitionId = PERSISTENT_PARTITION_PREFIX +
      deployKey + '|' + mode + '|' + uid + '|' + sid + '|' + st;
    return {
      partitionId: partitionId,
      epoch: ctx.epoch,
      mode: mode
    };
  }

  function partitionFromContext_(ctx) {
    return persistentPartitionFromContext_(ctx);
  }

  function capturePartition_() {
    if (typeof global.ringCaptureRequestContext_ !== 'function') return null;
    return persistentPartitionFromContext_(global.ringCaptureRequestContext_());
  }

  function captureWriteEpoch_() { return storeWriteEpoch_; }

  function invalidateWriteEpoch_() {
    storeWriteEpoch_++;
    return storeWriteEpoch_;
  }

  function writeEpochStillValid_(epoch) {
    return epoch === storeWriteEpoch_;
  }

  function contextStillValid_(context, epoch) {
    if (!writeEpochStillValid_(epoch)) return false;
    if (context && typeof global.ringRequestContextIsCurrent_ === 'function') {
      return global.ringRequestContextIsCurrent_(context);
    }
    return true;
  }

  function store_() {
    return global.ringSyncStore;
  }

  function validateMaintenanceFullSnapshot_(fetched, context) {
    if (!fetched || fetched.ok !== true) {
      return { ok: false, reason: 'FETCH_NOT_OK' };
    }
    if (fetched.error) {
      return { ok: false, reason: 'FETCH_ERROR_' + String(fetched.error) };
    }
    if (typeof global.ringRequestContextIsCurrent_ === 'function' &&
        !global.ringRequestContextIsCurrent_(context)) {
      return { ok: false, reason: 'STALE_CONTEXT' };
    }
    if (!Array.isArray(fetched.logs)) {
      return { ok: false, reason: 'LOGS_NOT_ARRAY' };
    }
    return { ok: true, logs: fetched.logs };
  }

  function stripVolatileHistoryFields_(payload) {
    if (!payload || typeof payload !== 'object') return payload;
    var copy = {};
    Object.keys(payload).forEach(function (k) {
      if (k === 'targetVisibility' || k === '_pendingVisibility') return;
      copy[k] = payload[k];
    });
    return copy;
  }

  function isInternalSyncTestPage_() {
    if (global.ringSyncInternalTestPage === true) return true;
    if (typeof global.location === 'undefined' || !global.location) return false;
    var p = String(global.location.pathname || '');
    return /ring-sync-test\.html$/i.test(p);
  }

  function historyBodyPersistAllowed_() {
    return historyBodyPersistEnabled_ === true && isInternalSyncTestPage_();
  }

  async function metaSuperseded_(part, domain, scopeKey, writeEpoch) {
    if (!store_()) return false;
    var pk = store_().makeMetaPk(part.partitionId, domain, scopeKey);
    var existing = await store_().getSyncMeta(pk);
    if (!existing || existing.appliedWriteEpoch == null) return false;
    return Number(existing.appliedWriteEpoch) > Number(writeEpoch);
  }

  function buildHistoryRecordRows_(partitionId, vinNorm, logs, opts) {
    opts = opts || {};
    var persistBody = opts.persistBody === true;
    var rows = [];
    var seen = {};
    (logs || []).forEach(function (log) {
      if (!log) return;
      var entityId = String(log.log_id || log.logId || '').trim();
      if (!entityId || seen[entityId]) return;
      seen[entityId] = true;
      var row = {
        pk: store_().makeRecordPk(partitionId, DOMAINS.history, entityId),
        partitionId: partitionId,
        domain: DOMAINS.history,
        scopeKey: vinNorm,
        entityId: entityId,
        vinNorm: vinNorm,
        schemaVersion: store_().SCHEMA_VERSION,
        updatedAt: Date.now()
      };
      if (persistBody) {
        row.payload = stripVolatileHistoryFields_(log);
        row.payloadClass = String(log.visibility || 'unknown').toLowerCase();
      } else {
        row.payload = null;
        row.payloadClass = 'withheld_v65_2a';
      }
      rows.push(row);
    });
    return { rows: rows, entityIds: Object.keys(seen) };
  }

  function buildMetaRow_(part, domain, scopeKey, fields) {
    fields = fields || {};
    return Object.assign({
      pk: store_().makeMetaPk(part.partitionId, domain, scopeKey),
      partitionId: part.partitionId,
      domain: domain,
      scopeKey: String(scopeKey || ''),
      sessionEpoch: part.epoch,
      persistBody: false,
      futureFeedRev: null,
      schemaVersion: store_().SCHEMA_VERSION
    }, fields);
  }

  async function applyFullSnapshot_(domain, scopeKey, entities, options) {
    options = options || {};
    var writeEpoch = options.writeEpoch != null ? options.writeEpoch : captureWriteEpoch_();
    if (!writeEpochStillValid_(writeEpoch)) return { ok: false, reason: 'STORE_INVALIDATED' };
    var part = options.partition || capturePartition_();
    if (!part) return { ok: false, reason: 'NO_PARTITION' };
    if (!store_()) return { ok: false, reason: 'STORE_UNAVAILABLE' };
    if (!contextStillValid_(options.context, writeEpoch)) return { ok: false, reason: 'STALE_CONTEXT' };

    var rows = (entities || []).map(function (ent) {
      if (!ent || !ent.entityId) return null;
      var scope = String(scopeKey || '');
      return {
        pk: store_().makeRecordPk(part.partitionId, domain, ent.entityId),
        partitionId: part.partitionId,
        domain: domain,
        scopeKey: scope,
        entityId: String(ent.entityId),
        vinNorm: ent.vinNorm || scope,
        schemaVersion: store_().SCHEMA_VERSION,
        payload: ent.payload != null ? ent.payload : null,
        payloadClass: ent.payloadClass || 'mock',
        updatedAt: Date.now()
      };
    }).filter(Boolean);

    var entityIds = rows.map(function (r) { return r.entityId; });
    if (await metaSuperseded_(part, domain, scopeKey, writeEpoch)) {
      return { ok: false, reason: 'STALE_SNAPSHOT_SUPERSEDED' };
    }
    var prevIds = await store_().listEntityIdsForScope(part.partitionId, domain, scopeKey);
    if (!contextStillValid_(options.context, writeEpoch)) return { ok: false, reason: 'STALE_CONTEXT' };

    var removedIds = [];
    prevIds.forEach(function (id) {
      if (entityIds.indexOf(id) < 0) removedIds.push(id);
    });

    var metaRow = buildMetaRow_(part, domain, scopeKey, {
      snapshotKind: 'full',
      lastAppliedAt: Date.now(),
      entityCount: entityIds.length,
      persistBody: !!options.persistBody,
      removedCount: removedIds.length,
      appliedWriteEpoch: writeEpoch,
      gasDeployKey: gasDeployKeyFromGlobal_()
    });

    try {
      await store_().applyScopeSnapshotAtomic(
        part.partitionId, domain, scopeKey, rows, removedIds, metaRow
      );
    } catch (err) {
      return { ok: false, reason: 'STORE_TX_FAILED', detail: String(err && err.message || err) };
    }

    if (!contextStillValid_(options.context, writeEpoch)) {
      return { ok: false, reason: 'STALE_CONTEXT_AFTER_WRITE' };
    }
    return { ok: true, kept: entityIds.length, removed: removedIds.length };
  }

  async function onMaintenanceFullFetch_(vin, fetched, context, mappedLogs) {
    var writeEpoch = captureWriteEpoch_();
    var validated = validateMaintenanceFullSnapshot_(fetched, context);
    if (!validated.ok) return { stored: false, reason: validated.reason };

    var part = persistentPartitionFromContext_(context);
    if (!part || !store_()) return { stored: false, reason: 'NO_PARTITION_OR_STORE' };
    if (!contextStillValid_(context, writeEpoch)) return { stored: false, reason: 'STALE_CONTEXT' };

    var vinNorm = normalizeVin_(vin);
    var persistBody = historyBodyPersistAllowed_();
    var built = buildHistoryRecordRows_(part.partitionId, vinNorm, mappedLogs || validated.logs, {
      persistBody: persistBody
    });

    if (await metaSuperseded_(part, DOMAINS.history, vinNorm, writeEpoch)) {
      return { stored: false, reason: 'STALE_SNAPSHOT_SUPERSEDED' };
    }

    if (!persistBody) {
      var metaRow = buildMetaRow_(part, DOMAINS.history, vinNorm, {
        snapshotKind: 'full_meta_only',
        lastSuccessfulFetchAt: Date.now(),
        entityCount: built.entityIds.length,
        persistBody: false,
        signatureHint: String((mappedLogs || validated.logs).length),
        appliedWriteEpoch: writeEpoch,
        gasDeployKey: gasDeployKeyFromGlobal_()
      });
      try {
        await store_().putMetaOnlyAtomic(metaRow);
      } catch (e) {
        return { stored: false, reason: 'META_ONLY_FAILED', detail: String(e && e.message || e) };
      }
      if (!contextStillValid_(context, writeEpoch)) {
        return { stored: false, reason: 'STALE_CONTEXT_AFTER_META' };
      }
      return { stored: true, mode: 'meta_only', count: built.entityIds.length };
    }

    return applyFullSnapshot_(DOMAINS.history, vinNorm, built.rows.map(function (r) {
      return {
        entityId: r.entityId,
        vinNorm: vinNorm,
        payload: r.payload,
        payloadClass: r.payloadClass
      };
    }), {
      partition: part,
      context: context,
      persistBody: true,
      writeEpoch: writeEpoch
    });
  }

  async function invalidateCurrentPartition_() {
    invalidateWriteEpoch_();
    var part = capturePartition_();
    if (!part || !store_()) return { ok: false };
    try {
      await store_().clearPartition(part.partitionId);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: String(e && e.message || e) };
    }
  }

  async function invalidateAllLocalPartitions_() {
    invalidateWriteEpoch_();
    if (!store_()) return { ok: false };
    try {
      await store_().wipeAllPartitions();
      invalidateWriteEpoch_();
      return { ok: true };
    } catch (e) {
      return { ok: false, error: String(e && e.message || e) };
    }
  }

  async function purgeLegacyPartitions_() {
    if (!store_()) return { ok: false };
    try {
      var r = await store_().purgeLegacyPartitions();
      return { ok: true, detail: r };
    } catch (e) {
      return { ok: false, error: String(e && e.message || e) };
    }
  }

  function scanStoredDataForSecrets_(data) {
    data = data || {};
    var text = JSON.stringify(data);
    if (/"token"\s*:/i.test(text)) return { ok: false, hit: 'token_field' };
    if (/ring_(user|shop|biz)_token/i.test(text)) return { ok: false, hit: 'ring_token_key' };
    var legacyScope = false;
    function checkPartition(val) {
      if (!val || !val.partitionId) return;
      var pid = String(val.partitionId);
      if (pid.indexOf(PERSISTENT_PARTITION_PREFIX) !== 0) legacyScope = true;
      if (pid.indexOf('[') === 0) legacyScope = true;
    }
    ['records', 'meta', 'tombstones'].forEach(function (k) {
      var bucket = data[k];
      var list = Array.isArray(bucket) ? bucket : (bucket && typeof bucket === 'object' ? Object.values(bucket) : []);
      list.forEach(checkPartition);
    });
    if (legacyScope) return { ok: false, hit: 'legacy_partition_id' };
    return { ok: true };
  }

  async function readHistoryRecordsForScope_(vin, opts) {
    opts = opts || {};
    if (!opts.allowReadForTests) {
      return { ok: false, reason: 'HISTORY_READ_DISABLED_V65_2A' };
    }
    var part = capturePartition_();
    if (!part || !store_()) return { ok: false, reason: 'NO_PARTITION' };
    var vinNorm = normalizeVin_(vin);
    var rows = await store_().listRecordsForScope(part.partitionId, DOMAINS.history, vinNorm);
    return { ok: true, rows: rows };
  }

  /** ローカル検証ページ専用（本番配信に含めない ring-sync-test.html のみ） */
  function enableHistoryBodyPersistOnTestPage_(enabled) {
    if (!isInternalSyncTestPage_()) return false;
    historyBodyPersistEnabled_ = !!enabled;
    return true;
  }

  if (typeof global !== 'undefined' && typeof global.addEventListener === 'function') {
    global.addEventListener('ring-auth-context-changed', function () { invalidateWriteEpoch_(); });
    global.addEventListener('storage', function (e) {
      if (!e || !e.key) return;
      if (/^ring_(current_mode|.*token|.*profile|active_account)$/.test(e.key)) {
        invalidateWriteEpoch_();
      }
    });
  }

  if (store_() && typeof store_().purgeLegacyPartitions === 'function') {
    try { store_().purgeLegacyPartitions().catch(function () { /* ignore */ }); } catch (eP) { /* ignore */ }
  }

  var ringSyncEngine = {
    DOMAINS: DOMAINS,
    PERSISTENT_PARTITION_PREFIX: PERSISTENT_PARTITION_PREFIX,
    isHistoryBodyPersistEnabled: function () { return historyBodyPersistAllowed_(); },
    enableHistoryBodyPersistOnTestPage: enableHistoryBodyPersistOnTestPage_,
    gasDeployKeyFromGlobal: gasDeployKeyFromGlobal_,
    captureWriteEpoch: captureWriteEpoch_,
    invalidateWriteEpoch: invalidateWriteEpoch_,
    writeEpochStillValid: writeEpochStillValid_,
    persistentPartitionFromContext: persistentPartitionFromContext_,
    partitionFromContext: partitionFromContext_,
    validateMaintenanceFullSnapshot: validateMaintenanceFullSnapshot_,
    applyFullSnapshot: applyFullSnapshot_,
    onMaintenanceFullFetch: onMaintenanceFullFetch_,
    invalidateCurrentPartition: invalidateCurrentPartition_,
    invalidateAllLocalPartitions: invalidateAllLocalPartitions_,
    purgeLegacyPartitions: purgeLegacyPartitions_,
    scanStoredDataForSecrets: scanStoredDataForSecrets_,
    readHistoryRecordsForScope: readHistoryRecordsForScope_,
    applyPendingOverlayToLog: function (log) { return log; }
  };

  global.ringSyncEngine = ringSyncEngine;
})(typeof window !== 'undefined' ? window : globalThis);