/**
 * v65-2b 隔離試作: History_Changelog + History_Events + ACL（GAS canViewHistoryEventRow_ 等を模倣）
 */

const VIS_PUBLIC = 'public';
const VIS_PRIVATE = 'private';
const HISTORY_OWNER_PERIOD_PENDING_ = 'OP-PEND';

export const FEED_API_VERSION = 1;
export const RETENTION_MIN_SEQ = 1;

function nextRev_(prev) {
  const n = Number(prev) || 0;
  return Math.max(n + 1, Date.now() % 1e12);
}

function normVin_(v) {
  return String(v || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function principalKey_(session) {
  if (!session) return 'anon';
  if (session.shopId) return 'shop:' + String(session.shopId);
  if (session.type === 'shop') return 'shop:' + String(session.id || '');
  return 'user:' + String(session.userId || session.id || '');
}

function sessionPrincipal_(session) {
  if (!session) return { type: '', id: '' };
  if (session.shopId || session.type === 'shop') {
    return { type: 'shop', id: String(session.shopId || session.id || '') };
  }
  return { type: 'user', id: String(session.userId || session.id || '') };
}

export function createHistorySyncSimulator(opts = {}) {
  opts = opts || {};
  const logs = new Map();
  const changelog = [];
  let nextSeq = 0;
  let headCommittedSeq = 0;
  let ownerPlatformOperational = opts.ownerPlatformOperational !== false;
  const periods = new Map();
  const vinCurrent = new Map();
  const favoriteGrants = [];
  const vehicleRegistered = new Map();
  const staffRoles = new Map();
  const principalDelivered = new Map();
  const lateVisibilityQueue = [];
  const stats = {
    sheetReads: 0,
    rowsRead: 0,
    fullScans: 0,
    changelogTailReads: 0,
    mockApiCalls: 0,
    writes: 0,
    responseBytes: 0
  };

  function bumpStatsRead(rows) {
    stats.sheetReads += 1;
    stats.rowsRead += rows;
    stats.mockApiCalls += 1;
  }

  function registerVehicleForUser_(userId, vin) {
    const uid = String(userId);
    if (!vehicleRegistered.has(uid)) vehicleRegistered.set(uid, new Set());
    vehicleRegistered.get(uid).add(normVin_(vin));
  }

  function isVehicleRegisteredForInspection_(session, vinNorm) {
    const me = sessionPrincipal_(session);
    if (me.type === 'shop') return true;
    const set = vehicleRegistered.get(me.id);
    return !!(set && set.has(vinNorm));
  }

  function readVinCurrentOwner_(vinNorm) {
    return vinCurrent.get(vinNorm) || null;
  }

  function historyOwnerPeriod_(row, vinNorm) {
    const id = String(row.ownerPeriodId || '');
    if (!id || id === HISTORY_OWNER_PERIOD_PENDING_) return null;
    const p = periods.get(id);
    if (!p || p.vin !== vinNorm) return null;
    return p;
  }

  function favoriteAllowsHistory_(period, shopId, vinNorm) {
    if (!period || period.principalType !== 'user' || !shopId) return false;
    const grants = favoriteGrants.filter((r) =>
      String(r.userId) === String(period.principalId) && String(r.shopId) === shopId
    );
    const membership = grants.filter((r) => !r.vin);
    const current = readVinCurrentOwner_(vinNorm);
    if (!membership.length || !current || current.periodId !== period.periodId) return false;
    const specific = grants.filter((r) =>
      normVin_(r.vin) === vinNorm && String(r.ownerPeriodId) === String(period.periodId)
    );
    const applicable = specific.length ? specific : membership;
    return applicable.every((r) => /^(1|true)$/i.test(String(r.allowPrivate)));
  }

  function canViewHistoryEventRow_(session, row, vinNorm) {
    if (!row || row.deleted) return false;
    if (row.visibility === VIS_PUBLIC) return true;
    const me = sessionPrincipal_(session);
    if (!me.id) return false;
    if (me.type === 'shop' && String(row.shopId) === me.id) return true;
    if (!ownerPlatformOperational) return false;
    const period = historyOwnerPeriod_(row, vinNorm);
    if (!period) return false;
    if (String(period.principalType) === me.type && String(period.principalId) === me.id) return true;
    return me.type === 'shop' && favoriteAllowsHistory_(period, me.id, vinNorm);
  }

  function ownerMayEditHistoryVisibility_(session, row, vinNorm) {
    const period = historyOwnerPeriod_(row, vinNorm);
    const me = sessionPrincipal_(session);
    return !!(period && me.id && String(period.principalType) === me.type &&
      String(period.principalId) === me.id);
  }

  function assertHistoryLogWriteAllowed_(session, row) {
    const deny = { ok: false, error: 'LOG_ACCESS_DENIED' };
    if (!session || !row) return deny;
    const myUid = String(session.userId || session.id || '').trim();
    const myShop = String(session.shopId || (session.type === 'shop' ? session.id : '') || '').trim();
    const rowShop = String(row.shopId || '');
    const rowStaff = String(row.staffId || '');
    if (!myUid && !myShop) return deny;

    if (myShop) {
      if (!rowShop || rowShop !== myShop) return deny;
      const role = staffRoles.get(myUid + '|' + myShop) || session.role || '';
      const r = String(role).toLowerCase();
      if (r === 'master' || r === 'staff') return { ok: true };
      return { ok: false, error: 'LOG_EDIT_ROLE_DENIED' };
    }

    const st = String(session.shopType || 'user').trim();
    if (st !== 'user' && st !== '') return deny;
    if (rowShop) return deny;
    if (!rowStaff || rowStaff !== myUid) return deny;
    const vin = normVin_(row.vin);
    if (!vin || !isVehicleRegisteredForInspection_(session, vin)) return deny;
    return { ok: true };
  }

  function pendingForLog_(logId) {
    for (let i = 0; i < changelog.length; i++) {
      const e = changelog[i];
      if (e.status === 'pending' && e.logId === logId) return e.seq;
    }
    return null;
  }

  function allocateSeq_() {
    nextSeq += 1;
    return nextSeq;
  }

  function appendChangelogPending_(eventType, logId, vin, metaJson) {
    const seq = allocateSeq_();
    const entry = {
      seq, status: 'pending', eventType, logId: logId || '', vinNorm: vin || '',
      metaJson: metaJson || {}, createdAt: new Date().toISOString()
    };
    changelog.push(entry);
    stats.writes += 1;
    return entry;
  }

  function commitChangelog_(seq, patch) {
    const entry = changelog.find((e) => e.seq === seq);
    if (!entry) throw new Error('CHANGELOG_SEQ_NOT_FOUND');
    if (entry.status !== 'pending') throw new Error('CHANGELOG_NOT_PENDING');
    Object.assign(entry, patch || {}, { status: 'committed', committedAt: new Date().toISOString() });
    if (seq > headCommittedSeq) headCommittedSeq = seq;
    stats.writes += 1;
    return entry;
  }

  function markCommittedAbort_(seq, reason) {
    return commitChangelog_(seq, { eventType: 'repair_abort', metaJson: { reason: reason || 'ROLLBACK' } });
  }

  function getRow_(logId) {
    return logs.get(String(logId));
  }

  function canGrantFirstView_(session, row, entry) {
    if (!row || !canViewHistoryEventRow_(session, row, row.vin)) return false;
    const visAtCommit = (entry.metaJson && entry.metaJson.visibility != null)
      ? entry.metaJson.visibility : row.visibility;
    if (visAtCommit === VIS_PUBLIC) return true;
    if (sessionPrincipal_(session).type === 'shop' &&
        sessionPrincipal_(session).id === row.shopId) return true;
    const period = historyOwnerPeriod_(row, row.vin);
    if (!period) return false;
    const me = sessionPrincipal_(session);
    return String(period.principalType) === me.type && String(period.principalId) === me.id;
  }

  function simulateFullVinFetch_(session, vinNorm) {
    stats.fullScans += 1;
    const match = [];
    logs.forEach((row) => {
      if (row.vin !== vinNorm || row.deleted) return;
      bumpStatsRead(1);
      if (canViewHistoryEventRow_(session, row, vinNorm)) match.push(row);
    });
    return match;
  }

  function formatEventForViewer_(session, entry, row, deliverySeen) {
    const pk = principalKey_(session);
    if (!deliverySeen.has(pk)) deliverySeen.set(pk, new Set());
    const seen = deliverySeen.get(pk);

    if (entry.eventType === 'repair_abort') {
      return { seq: entry.seq, type: 'noop', logHistoryRev: null };
    }
    if (entry.eventType === 'log_delete') {
      if (!seen.has(entry.logId)) return null;
      return { seq: entry.seq, type: 'delete', logId: entry.logId };
    }
    if (entry.eventType === 'acl_drop') {
      if (!seen.has(entry.logId)) return null;
      return { seq: entry.seq, type: 'acl_drop', logId: entry.logId };
    }

    const vinNorm = row ? row.vin : normVin_(entry.vinNorm);
    const canView = row && canViewHistoryEventRow_(session, row, vinNorm);

    if (entry.eventType === 'log_upsert' && !seen.has(entry.logId)) {
      if (!canGrantFirstView_(session, row, entry)) return null;
    }

    if (entry.eventType === 'visibility_change') {
      const toVis = entry.metaJson && entry.metaJson.to;
      if (!canView && seen.has(entry.logId)) {
        return { seq: entry.seq, type: 'acl_drop', logId: entry.logId };
      }
      if (canView && toVis === VIS_PUBLIC && !seen.has(entry.logId) && row) {
        seen.add(entry.logId);
        return {
          seq: entry.seq, type: 'upsert_meta', logId: row.logId,
          logHistoryRev: row.logHistoryRev, visibilityRev: row.visibilityRev,
          meta: { logId: row.logId, visibility: row.visibility, visibilityRev: row.visibilityRev,
            vinNorm: row.vin, title: row.title }
        };
      }
      if (canView && seen.has(entry.logId) && row) {
        return {
          seq: entry.seq, type: 'upsert_meta', logId: row.logId,
          logHistoryRev: row.logHistoryRev, visibilityRev: row.visibilityRev,
          meta: { logId: row.logId, visibility: row.visibility, visibilityRev: row.visibilityRev,
            vinNorm: row.vin, title: row.title }
        };
      }
      return null;
    }

    if (!row || row.deleted) {
      if (seen.has(entry.logId)) return { seq: entry.seq, type: 'delete', logId: entry.logId };
      return null;
    }
    if (!canView) return null;

    seen.add(entry.logId);
    return {
      seq: entry.seq, type: 'upsert_meta', logId: row.logId,
      logHistoryRev: row.logHistoryRev, visibilityRev: row.visibilityRev,
      meta: {
        logId: row.logId, logHistoryRev: row.logHistoryRev, visibility: row.visibility,
        visibilityRev: row.visibilityRev, vinNorm: row.vin, title: row.title, date: row.date
      }
    };
  }

  function buildFeedEvents_(session, afterSeq, limit, vinFilter, deliverySeen, params) {
    params = params || {};
    stats.changelogTailReads += 1;
    const events = [];
    let cursor = afterSeq;
    let blockedPendingSeq = null;

    for (let i = 0; i < changelog.length && events.length < limit; i++) {
      const e = changelog[i];
      if (e.seq <= afterSeq) continue;
      if (e.status === 'pending') { blockedPendingSeq = e.seq; break; }
      if (e.status === 'aborted') continue;
      if (vinFilter && vinFilter.length && e.vinNorm && !vinFilter.includes(e.vinNorm)) {
        cursor = e.seq;
        continue;
      }
      const row = e.logId ? getRow_(e.logId) : null;
      const out = formatEventForViewer_(session, e, row, deliverySeen);
      cursor = e.seq;
      if (out) events.push(out);
    }

    const tail = changelog[changelog.length - 1];
    const minRetained = typeof params.minRetainedSeq === 'number' ? params.minRetainedSeq : RETENTION_MIN_SEQ;
    const fullResyncRequired = afterSeq > 0 && afterSeq < minRetained && headCommittedSeq > minRetained;
    const payload = JSON.stringify({
      historyFeedHead: headCommittedSeq, afterSeq, nextCursor: cursor, events
    });
    stats.responseBytes += payload.length;
    stats.mockApiCalls += 1;

    return {
      success: true, apiVersion: FEED_API_VERSION, historyFeedHead: headCommittedSeq,
      afterSeq, nextCursor: cursor, events, hasMore: !!(tail && tail.seq > cursor && events.length >= limit),
      blockedPendingSeq, empty: events.length === 0 && !blockedPendingSeq, fullResyncRequired
    };
  }

  const api = {
    stats: () => ({ ...stats }),
    resetStats: () => Object.keys(stats).forEach((k) => { stats[k] = 0; }),

    setOwnerPlatformOperational(on) { ownerPlatformOperational = !!on; },

    setOwnerPeriod(periodId, vin, principalType, principalId) {
      const v = normVin_(vin);
      periods.set(periodId, { periodId, vin: v, principalType, principalId });
    },

    setVinCurrentOwner(vin, principalType, principalId, periodId) {
      vinCurrent.set(normVin_(vin), { periodId, principalType, principalId });
    },

    registerVehicle(userId, vin) { registerVehicleForUser_(userId, vin); },

    setStaffRole(userId, shopId, role) {
      staffRoles.set(String(userId) + '|' + String(shopId), role);
    },

    addFavoriteGrant(userId, shopId, allowPrivate, vinOpt, ownerPeriodIdOpt) {
      favoriteGrants.push({
        userId: String(userId), shopId: String(shopId),
        vin: vinOpt ? normVin_(vinOpt) : '',
        ownerPeriodId: ownerPeriodIdOpt || '',
        allowPrivate: !!allowPrivate
      });
    },

    getHeadSeq: () => headCommittedSeq,

    noteDelivered(session, logId) {
      const pk = principalKey_(session);
      if (!principalDelivered.has(pk)) principalDelivered.set(pk, new Set());
      principalDelivered.get(pk).add(String(logId));
    },

    peekLog(logId) {
      const r = logs.get(String(logId));
      return r ? { logHistoryRev: r.logHistoryRev, visibilityRev: r.visibilityRev, title: r.title } : null;
    },

    registerLog(session, data, fault = {}) {
      const logId = String(data.logId || 'LOG_' + (logs.size + 1));
      const vin = normVin_(data.vin);
      const cur = readVinCurrentOwner_(vin);
      const pend = appendChangelogPending_('log_upsert', logId, vin, { phase: 'create' });
      if (fault.failAfterChangelog) {
        markCommittedAbort_(pend.seq, 'EVENT_ROW_WRITE_FAILED');
        return { success: false, error: 'EVENT_ROW_WRITE_FAILED' };
      }
      const row = {
        logId, vin, title: String(data.title || 't'), date: data.date || '2026-01-01',
        visibility: data.visibility || VIS_PUBLIC, visibilityRev: 1,
        shopId: sessionPrincipal_(session).type === 'shop' ? sessionPrincipal_(session).id : '',
        staffId: sessionPrincipal_(session).type === 'user' ? sessionPrincipal_(session).id : String(session.userId || ''),
        ownerPeriodId: data.ownerPeriodId || cur?.periodId || HISTORY_OWNER_PERIOD_PENDING_,
        logHistoryRev: 1
      };
      if (fault.failBeforeChangelogCommit) {
        logs.set(logId, row);
        return { success: false, error: 'CHANGELOG_COMMIT_FAILED', pendingSeq: pend.seq };
      }
      logs.set(logId, row);
      commitChangelog_(pend.seq, {
        eventType: 'log_upsert',
        metaJson: { visibility: row.visibility, visibilityRev: row.visibilityRev, logHistoryRev: row.logHistoryRev }
      });
      return { success: true, logId, seq: pend.seq };
    },

    updateLog(session, data, fault = {}) {
      const logId = String(data.logId);
      const row = getRow_(logId);
      if (!row || row.deleted) return { success: false, error: 'LOG_NOT_FOUND' };
      const auth = assertHistoryLogWriteAllowed_(session, row);
      if (!auth.ok) return auth;
      if (pendingForLog_(logId) != null) return { success: false, error: 'LOG_PENDING_IN_FLIGHT' };
      const base = data.baseLogHistoryRev;
      if (base != null && Number(base) !== Number(row.logHistoryRev)) {
        return { success: false, error: 'LOG_REV_CONFLICT', logHistoryRev: row.logHistoryRev };
      }
      const pend = appendChangelogPending_('log_upsert', logId, row.vin, { phase: 'update' });
      if (fault.failAfterChangelog) { markCommittedAbort_(pend.seq, 'EVENT_ROW_WRITE_FAILED'); return { success: false, error: 'EVENT_ROW_WRITE_FAILED' }; }
      const nextTitle = data.title != null ? String(data.title) : row.title;
      if (fault.failBeforeChangelogCommit) {
        row.title = nextTitle;
        row.logHistoryRev = nextRev_(row.logHistoryRev);
        return { success: false, error: 'CHANGELOG_COMMIT_FAILED', pendingSeq: pend.seq };
      }
      row.title = nextTitle;
      row.logHistoryRev = nextRev_(row.logHistoryRev);
      commitChangelog_(pend.seq, { metaJson: { logHistoryRev: row.logHistoryRev } });
      return { success: true, logId, logHistoryRev: row.logHistoryRev, seq: pend.seq };
    },

    deleteLog(session, data, fault = {}) {
      const logId = String(data.logId);
      const row = getRow_(logId);
      if (!row) return { success: false, error: 'LOG_NOT_FOUND' };
      const auth = assertHistoryLogWriteAllowed_(session, row);
      if (!auth.ok) return auth;
      if (pendingForLog_(logId) != null) return { success: false, error: 'LOG_PENDING_IN_FLIGHT' };
      const pend = appendChangelogPending_('log_delete', logId, row.vin, {});
      if (fault.failAfterChangelog) { markCommittedAbort_(pend.seq, 'DELETE_FAILED'); return { success: false, error: 'DELETE_FAILED' }; }
      if (fault.failBeforeChangelogCommit) {
        row.deleted = true;
        return { success: false, error: 'CHANGELOG_COMMIT_FAILED', pendingSeq: pend.seq };
      }
      logs.delete(logId);
      commitChangelog_(pend.seq);
      return { success: true, logId, seq: pend.seq };
    },

    setVisibility(session, data, fault = {}) {
      const logId = String(data.logId);
      const row = getRow_(logId);
      if (!row) return { success: false, error: 'LOG_NOT_FOUND' };
      if (!ownerMayEditHistoryVisibility_(session, row, row.vin)) {
        return { success: false, error: 'OWNER_VISIBILITY_DENIED' };
      }
      if (pendingForLog_(logId) != null) return { success: false, error: 'LOG_PENDING_IN_FLIGHT' };
      const vis = data.visibility === VIS_PRIVATE ? VIS_PRIVATE : VIS_PUBLIC;
      const baseVisRev = data.baseVisibilityRev;
      if (baseVisRev != null && Number(baseVisRev) !== Number(row.visibilityRev)) {
        return { success: false, error: 'VISIBILITY_REV_CONFLICT', visibilityRev: row.visibilityRev };
      }
      const pend = appendChangelogPending_('visibility_change', logId, row.vin, {
        from: row.visibility, to: vis
      });
      if (fault.failAfterChangelog) { markCommittedAbort_(pend.seq, 'VIS_WRITE_FAILED'); return { success: false, error: 'VIS_WRITE_FAILED' }; }
      row.visibility = vis;
      row.visibilityRev = nextRev_(row.visibilityRev);
      row.logHistoryRev = nextRev_(row.logHistoryRev);
      if (fault.failBeforeChangelogCommit) {
        return { success: false, error: 'CHANGELOG_COMMIT_FAILED', pendingSeq: pend.seq };
      }
      commitChangelog_(pend.seq, {
        metaJson: { to: vis, visibility: vis, visibilityRev: row.visibilityRev, logHistoryRev: row.logHistoryRev }
      });
      return { success: true, logId, visibilityRev: row.visibilityRev, seq: pend.seq };
    },

    enqueueLateVisibility(session, data) {
      lateVisibilityQueue.push({ session, data });
      return { queued: true };
    },
    flushLateVisibilityQueue() {
      const out = [];
      while (lateVisibilityQueue.length) {
        const op = lateVisibilityQueue.shift();
        out.push(api.setVisibility(op.session, op.data));
      }
      return out;
    },

    runRepair() {
      let repaired = 0;
      for (let i = 0; i < changelog.length; i++) {
        const e = changelog[i];
        if (e.status !== 'pending') continue;
        const row = e.logId ? getRow_(e.logId) : null;
        if (e.eventType === 'log_upsert' && !row) {
          markCommittedAbort_(e.seq, 'REPAIR_ROW_MISSING');
          repaired++;
          continue;
        }
        if (e.eventType === 'log_delete') {
          if (row && !row.deleted) logs.delete(e.logId);
        }
        const rowRev = row ? Number(row.logHistoryRev) : 0;
        const metaRev = e.metaJson && e.metaJson.logHistoryRev != null ? Number(e.metaJson.logHistoryRev) : 0;
        if (e.eventType === 'log_upsert' && metaRev && rowRev > metaRev) {
          markCommittedAbort_(e.seq, 'REPAIR_SUPERSEDED');
          repaired++;
          continue;
        }
        commitChangelog_(e.seq, {
          metaJson: Object.assign({}, e.metaJson, row ? {
            logHistoryRev: row.logHistoryRev, visibilityRev: row.visibilityRev,
            visibility: row.visibility, to: row.visibility
          } : {})
        });
        repaired++;
      }
      return { repaired };
    },

    getHistorySyncFeed(session, params) {
      return buildFeedEvents_(session, Number(params.afterSeq) || 0,
        Math.min(Number(params.limit) || 50, 200),
        Array.isArray(params.vinList) ? params.vinList.map(normVin_).filter(Boolean) : null,
        principalDelivered, params);
    },

    getMaintenanceHistoryFull(session, vin) {
      stats.mockApiCalls += 1;
      const rows = simulateFullVinFetch_(session, normVin_(vin));
      const logsOut = rows.map((r) => ({
        log_id: r.logId, title: r.title, visibility: r.visibility, logHistoryRev: r.logHistoryRev
      }));
      stats.responseBytes += JSON.stringify(logsOut).length;
      return { success: true, historyAclVersion: 1, logs: logsOut };
    },

    runLoadBenchmark_(options) {
      const o = options || {};
      const n = o.initialLogs || 100;
      const deltaCount = o.deltaCount || 0;
      const USERL = { userId: 'U1', shopType: 'user' };
      logs.clear();
      changelog.length = 0;
      nextSeq = 0;
      headCommittedSeq = 0;
      api.resetStats();
      const vin = 'VL';
      api.setOwnerPeriod('OP-L', vin, 'user', 'U1');
      api.setVinCurrentOwner(vin, 'user', 'U1', 'OP-L');
      api.registerVehicle('U1', vin);
      for (let i = 0; i < n; i++) {
        api.registerLog(USERL, { logId: 'L' + i, vin, title: 'x', ownerPeriodId: 'OP-L' });
      }
      const afterFull = headCommittedSeq;
      simulateFullVinFetch_(USERL, vin);
      const fullStats = { ...stats };
      api.resetStats();
      let deltaReads = 0;
      for (let d = 0; d < deltaCount; d++) {
        const id = 'L' + (d % n);
        const row = logs.get(id);
        if (d % 4 === 0) api.updateLog(USERL, { logId: id, title: 'u' + d, baseLogHistoryRev: row?.logHistoryRev });
        else if (d % 4 === 1) api.setVisibility(USERL, { logId: id, visibility: d % 2 ? 'private' : 'public', baseVisibilityRev: row?.visibilityRev });
        else if (d % 4 === 2) { /* skip delete bulk */ }
        else api.updateLog(USERL, { logId: id, title: 'u2' + d });
      }
      const feed = buildFeedEvents_(USERL, afterFull, 500, [vin], principalDelivered, {});
      deltaReads = stats.changelogTailReads + stats.sheetReads;
      return {
        initialLogs: n, deltaCount, afterFullCursor: afterFull,
        fullMock: { apiCalls: fullStats.mockApiCalls, rowsRead: fullStats.rowsRead, fullScans: fullStats.fullScans, responseBytes: fullStats.responseBytes },
        deltaMock: { apiCalls: stats.mockApiCalls, rowsRead: stats.rowsRead, events: feed.events.length, responseBytes: stats.responseBytes, note: 'mockApiCalls≠GAS Sheets API' }
      };
    },

    dumpChangelog() {
      return changelog.map((e) => ({ seq: e.seq, status: e.status, eventType: e.eventType, logId: e.logId }));
    }
  };

  return api;
}

export function createHistorySyncClient() {
  let state = {
    feedScopeKey: '',
    syncMode: 'none',
    afterSeq: 0,
    records: new Map(),
    tombstones: new Set(),
    aclRevoked: new Set(),
    cacheValid: true
  };

  function scopeKey_(principal, vinList) {
    return principalKey_(principal) + '|' + (vinList || []).slice().sort().join(',');
  }

  return {
    getState: () => ({
      ...state, records: new Map(state.records),
      displayRecords: state.cacheValid ? new Map(state.records) : new Map()
    }),

    resetForScope(principal, vinList, opts) {
      opts = opts || {};
      const key = scopeKey_(principal, vinList);
      if (opts.fullResync || (state.feedScopeKey && state.feedScopeKey !== key)) {
        state = {
          feedScopeKey: key, syncMode: 'none', afterSeq: 0, records: new Map(),
          tombstones: new Set(), aclRevoked: new Set(), cacheValid: false
        };
      } else state.feedScopeKey = key;
      return state;
    },

    /** 初回: 現行 GAS 相当の full 取得 → カーソルを head に設定 */
    bootstrapFullSync(sim, session, vinList) {
      this.resetForScope(session, vinList);
      vinList.forEach((vin) => {
        const full = sim.getMaintenanceHistoryFull(session, vin);
        (full.logs || []).forEach((log) => {
          state.records.set(log.log_id, { logId: log.log_id, title: log.title, visibility: log.visibility });
          if (typeof sim.noteDelivered === 'function') sim.noteDelivered(session, log.log_id);
        });
      });
      state.afterSeq = sim.getHeadSeq();
      state.syncMode = 'delta_ready';
      state.cacheValid = true;
      return { afterSeq: state.afterSeq, count: state.records.size, mode: state.syncMode };
    },

    /** 差分のみ: state.afterSeq から再開（0 への自動巻き戻しなし） */
    pullDelta(sim, session, vinList, opts) {
      opts = opts || {};
      this.resetForScope(session, vinList, opts);
      if (state.syncMode === 'none' && !opts.allowWithoutBootstrap) {
        return { error: 'BOOTSTRAP_REQUIRED', afterSeq: state.afterSeq };
      }
      if (opts.fullResync) {
        return this.bootstrapFullSync(sim, session, vinList);
      }
      const pageSize = opts.pageSize || 50;
      let guard = 0;
      let totalEvents = 0;
      const beforeSeq = state.afterSeq;
      const beforeReads = { ...sim.stats() };

      while (guard++ < 500) {
        const page = sim.getHistorySyncFeed(session, {
          afterSeq: state.afterSeq,
          limit: pageSize,
          vinList
        });
        if (page.fullResyncRequired) return { needFullResync: true, afterSeq: state.afterSeq };
        if (page.blockedPendingSeq) {
          return { blockedPendingSeq: page.blockedPendingSeq, afterSeq: state.afterSeq };
        }
        this.applyPage(session, vinList, page);
        if (page.events.length) totalEvents += page.events.length;
        else if (page.empty && !page.hasMore) break;
        if (!page.hasMore) break;
      }

      const afterStats = sim.stats();
      return {
        mode: 'delta',
        startedFromSeq: beforeSeq,
        afterSeq: state.afterSeq,
        newEvents: totalEvents,
        count: state.records.size,
        unchanged: totalEvents === 0 && state.afterSeq === beforeSeq,
        mockReadsDelta: afterStats.sheetReads - beforeReads.sheetReads
      };
    },

    applyPage(session, vinList, page) {
      const key = scopeKey_(session, vinList);
      if (state.feedScopeKey && state.feedScopeKey !== key) throw new Error('FEED_SCOPE_MISMATCH');
      state.feedScopeKey = key;
      for (const ev of page.events || []) {
        if (ev.seq <= state.afterSeq) continue;
        if (ev.type === 'noop') continue;
        if (ev.type === 'delete' || ev.type === 'acl_drop') {
          state.records.delete(ev.logId);
          if (ev.type === 'acl_drop') state.aclRevoked.add(ev.logId);
          else state.tombstones.add(ev.logId);
          state.cacheValid = false;
        } else if (ev.type === 'upsert_meta') {
          state.aclRevoked.delete(ev.logId);
          state.records.set(ev.logId, { ...ev.meta, seq: ev.seq });
          state.cacheValid = true;
        }
      }
      const next = page.nextCursor != null ? page.nextCursor : state.afterSeq;
      if (next < state.afterSeq) throw new Error('CURSOR_ROLLBACK');
      state.afterSeq = next;
      if (state.afterSeq > 0) state.syncMode = 'delta_ready';
      return { afterSeq: state.afterSeq, count: state.records.size };
    }
  };
}