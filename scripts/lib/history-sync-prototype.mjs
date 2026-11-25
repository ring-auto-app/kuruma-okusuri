/**
 * v65-2b 隔離試作: History_Changelog + History_Events + ACL（本番 GAS 非改変）
 * Node 上のインメモリ模擬。Sheets 読取カウンタ付き。
 */

const VIS_PUBLIC = 'public';
const VIS_PRIVATE = 'private';

/** 互換: 古いクライアントは changelog / logHistoryRev 未送信 */
export const FEED_API_VERSION = 1;
export const RETENTION_MIN_SEQ = 1; // 模擬: seq < minRetained → fullResyncRequired

function nextRev_(prev) {
  const n = Number(prev) || 0;
  return Math.max(n + 1, Date.now() % 1e12);
}

function normVin_(v) {
  return String(v || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function canGrantFirstView_(session, row, entry, vinOwners, favoritePrivate) {
  if (!row || !canViewRow_(session, row, vinOwners, favoritePrivate)) return false;
  const visAtCommit = entry.metaJson && entry.metaJson.visibility != null
    ? entry.metaJson.visibility
    : row.visibility;
  if (visAtCommit === VIS_PUBLIC) return true;
  if (session.type === 'shop' && session.id === row.shopId) return true;
  const own = vinOwners.get(row.vin);
  if (own && own.type === session.type && own.id === session.id) return true;
  return false;
}

function canViewRow_(session, row, vinOwners, favoritePrivate) {
  if (!row || row.deleted) return false;
  if (row.visibility === VIS_PUBLIC) return true;
  const me = session;
  if (!me || !me.id) return false;
  if (me.type === 'shop' && me.id === row.shopId) return true;
  const own = vinOwners.get(row.vin);
  if (own && me.type === own.type && me.id === own.id) return true;
  if (me.type === 'shop' && favoritePrivate.get(me.id + '|' + row.vin)) return true;
  return false;
}

function principalKey_(session) {
  if (!session) return 'anon';
  if (session.type === 'shop') return 'shop:' + String(session.id || '');
  return 'user:' + String(session.id || '');
}

export function createHistorySyncSimulator(opts = {}) {
  opts = opts || {};
  const logs = new Map(); // logId -> row
  const changelog = []; // ordered by seq
  let nextSeq = 0;
  let headCommittedSeq = 0;
  let vinOwners = new Map(); // vin -> { type, id, periodId }
  let favoritePrivate = new Map(); // `${shopId}|${vin}` -> bool
  /** この principal に過去フィードで配信済みの logId（acl_drop/delete の安全配信範囲） */
  const principalDelivered = new Map();
  /** クライアントタイムアウト後に届く可視性変更（試験用） */
  const lateVisibilityQueue = [];
  const stats = {
    sheetReads: 0,
    rowsRead: 0,
    fullScans: 0,
    changelogTailReads: 0,
    writes: 0,
    lockWaits: 0
  };

  function bumpStatsRead(rows) {
    stats.sheetReads += 1;
    stats.rowsRead += rows;
  }

  function allocateSeq_() {
    nextSeq += 1;
    return nextSeq;
  }

  function findPendingBefore_(seq) {
    for (let i = 0; i < changelog.length; i++) {
      const e = changelog[i];
      if (e.seq >= seq) break;
      if (e.status === 'pending') return e.seq;
    }
    return null;
  }

  function canViewRowLocal_(session, row) {
    return canViewRow_(session, row, vinOwners, favoritePrivate);
  }

  function appendChangelogPending_(eventType, logId, vin, metaJson) {
    const seq = allocateSeq_();
    const entry = {
      seq,
      status: 'pending',
      eventType,
      logId: logId || '',
      vinNorm: vin || '',
      metaJson: metaJson || {},
      createdAt: new Date().toISOString()
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
    return commitChangelog_(seq, {
      eventType: 'repair_abort',
      metaJson: { reason: reason || 'ROLLBACK' }
    });
  }

  function getRow_(logId) {
    return logs.get(String(logId));
  }

  function simulateFullVinFetch_(session, vinNorm) {
    stats.fullScans += 1;
    const match = [];
    logs.forEach((row) => {
      if (row.vin !== vinNorm || row.deleted) return;
      bumpStatsRead(1);
      if (canViewRowLocal_(session, row)) match.push(row);
    });
    return match;
  }

  function simulateChangelogTail_(fromSeq, limit) {
    stats.changelogTailReads += 1;
    const out = [];
    for (let i = 0; i < changelog.length; i++) {
      const e = changelog[i];
      if (e.seq <= fromSeq) continue;
      bumpStatsRead(1);
      out.push(e);
      if (out.length >= limit) break;
    }
    return out;
  }

  /** クライアントへ公開: pending が途中にある間は committed のみ、かつ seq 飛ばし禁止 */
  function buildFeedEvents_(session, afterSeq, limit, vinFilter, deliverySeen, params) {
    params = params || {};
    const events = [];
    let cursor = afterSeq;
    let blockedPendingSeq = null;

    for (let i = 0; i < changelog.length && events.length < limit; i++) {
      const e = changelog[i];
      if (e.seq <= afterSeq) continue;

      if (e.status === 'pending') {
        blockedPendingSeq = e.seq;
        break;
      }

      if (e.status === 'aborted') continue;

      const vin = e.vinNorm;
      if (vinFilter && vinFilter.length && vin && !vinFilter.includes(vin)) {
        cursor = e.seq;
        continue;
      }

      const row = e.logId ? getRow_(e.logId) : null;
      const out = formatEventForViewer_(session, e, row, deliverySeen);
      if (out) {
        events.push(out);
        cursor = e.seq;
      } else {
        cursor = e.seq;
      }
    }

    const tail = changelog[changelog.length - 1];
    const historyFeedHead = headCommittedSeq;
    const hasMore = !!tail && tail.seq > cursor && events.length >= limit;
    const minRetained = typeof params.minRetainedSeq === 'number' ? params.minRetainedSeq : RETENTION_MIN_SEQ;
    const fullResyncRequired = afterSeq > 0 && afterSeq < minRetained && headCommittedSeq > minRetained;

    return {
      success: true,
      apiVersion: FEED_API_VERSION,
      historyFeedHead,
      afterSeq,
      nextCursor: cursor,
      events,
      hasMore,
      blockedPendingSeq,
      empty: events.length === 0 && !blockedPendingSeq,
      fullResyncRequired
    };
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

    const canView = row && canViewRowLocal_(session, row);
    const visAtCommit = entry.metaJson && entry.metaJson.visibility != null
      ? entry.metaJson.visibility
      : (row ? row.visibility : VIS_PUBLIC);
    if (entry.eventType === 'log_upsert' && !seen.has(entry.logId)) {
      if (!canGrantFirstView_(session, row, entry, vinOwners, favoritePrivate)) return null;
    }
    if (entry.eventType === 'visibility_change') {
      if (!canView && seen.has(entry.logId)) {
        return { seq: entry.seq, type: 'acl_drop', logId: entry.logId };
      }
      if (canView && !seen.has(entry.logId)) {
        return null;
      }
      if (canView && seen.has(entry.logId) && row) {
        return {
          seq: entry.seq,
          type: 'upsert_meta',
          logId: row.logId,
          logHistoryRev: row.logHistoryRev,
          visibilityRev: row.visibilityRev,
          meta: {
            logId: row.logId,
            visibility: row.visibility,
            visibilityRev: row.visibilityRev,
            vinNorm: row.vin,
            title: row.title
          }
        };
      }
      return null;
    }

    if (entry.eventType === 'owner_period_relink') {
      if (!row) {
        if (seen.has(entry.logId)) return { seq: entry.seq, type: 'acl_drop', logId: entry.logId };
        return null;
      }
      if (!canView && seen.has(entry.logId)) {
        return { seq: entry.seq, type: 'acl_drop', logId: entry.logId };
      }
      if (!canView) return null;
      if (canView && !seen.has(entry.logId)) {
        return {
          seq: entry.seq,
          type: 'upsert_meta',
          logId: row.logId,
          logHistoryRev: row.logHistoryRev,
          visibilityRev: row.visibilityRev,
          meta: {
            logId: row.logId,
            visibility: row.visibility,
            visibilityRev: row.visibilityRev,
            vinNorm: row.vin,
            title: row.title
          }
        };
      }
    }

    if (!row || row.deleted) {
      if (seen.has(entry.logId)) {
        return { seq: entry.seq, type: 'delete', logId: entry.logId };
      }
      return null;
    }

    if (!canView) return null;

    const meta = {
      logId: row.logId,
      logHistoryRev: row.logHistoryRev,
      visibility: row.visibility,
      visibilityRev: row.visibilityRev,
      vinNorm: row.vin,
      title: row.title,
      date: row.date
    };

    seen.add(entry.logId);

    return {
      seq: entry.seq,
      type: entry.eventType === 'log_delete' ? 'delete' : 'upsert_meta',
      logId: row.logId,
      logHistoryRev: row.logHistoryRev,
      visibilityRev: row.visibilityRev,
      meta
    };
  }

  const api = {
    stats: () => ({ ...stats }),
    resetStats: () => {
      Object.keys(stats).forEach((k) => { stats[k] = 0; });
    },

    setVinOwner(vin, owner) {
      vinOwners.set(normVin_(vin), {
        type: owner.type,
        id: owner.id,
        periodId: owner.periodId || 'OP-1'
      });
    },

    setFavoritePrivate(shopId, vin, allowed) {
      favoritePrivate.set(String(shopId) + '|' + normVin_(vin), !!allowed);
    },

    /** 登録: changelog → events（障害注入可） */
    registerLog(session, data, fault = {}) {
      const logId = String(data.logId || 'LOG_' + (logs.size + 1));
      const vin = normVin_(data.vin);
      const pend = appendChangelogPending_('log_upsert', logId, vin, { phase: 'create' });

      if (fault.failAfterChangelog) {
        markCommittedAbort_(pend.seq, 'EVENT_ROW_WRITE_FAILED');
        return { success: false, error: 'EVENT_ROW_WRITE_FAILED', changelogSeq: pend.seq };
      }

      const row = {
        logId,
        vin,
        title: String(data.title || 't'),
        date: data.date || '2026-01-01',
        visibility: data.visibility || VIS_PUBLIC,
        visibilityRev: 1,
        shopId: session.type === 'shop' ? session.id : '',
        ownerPeriodId: vinOwners.get(vin)?.periodId || 'OP-PEND',
        logHistoryRev: 1
      };

      if (fault.failBeforeChangelogCommit) {
        logs.set(logId, row);
        return { success: false, error: 'CHANGELOG_COMMIT_FAILED', row, pendingSeq: pend.seq };
      }

      logs.set(logId, row);
      commitChangelog_(pend.seq, {
        eventType: 'log_upsert',
        metaJson: {
          logHistoryRev: row.logHistoryRev,
          visibilityRev: row.visibilityRev,
          visibility: row.visibility
        }
      });
      return { success: true, logId, logHistoryRev: row.logHistoryRev, seq: pend.seq };
    },

    updateLog(session, data, fault = {}) {
      const logId = String(data.logId);
      const row = getRow_(logId);
      if (!row || row.deleted) return { success: false, error: 'LOG_NOT_FOUND' };

      const base = data.baseLogHistoryRev;
      const legacy = base === undefined || base === null;
      if (!legacy && Number(base) !== Number(row.logHistoryRev)) {
        return {
          success: false,
          error: 'LOG_REV_CONFLICT',
          logHistoryRev: row.logHistoryRev
        };
      }

      const pend = appendChangelogPending_('log_upsert', logId, row.vin, { phase: 'update' });
      if (fault.failAfterChangelog) {
        markCommittedAbort_(pend.seq, 'EVENT_ROW_WRITE_FAILED');
        return { success: false, error: 'EVENT_ROW_WRITE_FAILED', pendingSeq: pend.seq };
      }

      row.title = data.title != null ? String(data.title) : row.title;
      row.logHistoryRev = nextRev_(row.logHistoryRev);
      if (fault.failBeforeChangelogCommit) {
        return { success: false, error: 'CHANGELOG_COMMIT_FAILED', pendingSeq: pend.seq };
      }
      commitChangelog_(pend.seq, { metaJson: { logHistoryRev: row.logHistoryRev } });
      return { success: true, logId, logHistoryRev: row.logHistoryRev, seq: pend.seq };
    },

    deleteLog(session, data, fault = {}) {
      const logId = String(data.logId);
      const row = getRow_(logId);
      if (!row) return { success: false, error: 'LOG_NOT_FOUND' };
      const pend = appendChangelogPending_('log_delete', logId, row.vin, {});
      if (fault.failAfterChangelog) {
        markCommittedAbort_(pend.seq, 'DELETE_FAILED');
        return { success: false, error: 'DELETE_FAILED' };
      }
      row.deleted = true;
      if (fault.failBeforeChangelogCommit) {
        return { success: false, error: 'CHANGELOG_COMMIT_FAILED', pendingSeq: pend.seq };
      }
      commitChangelog_(pend.seq);
      logs.delete(logId);
      return { success: true, logId, seq: pend.seq };
    },

    enqueueLateVisibility(session, data) {
      lateVisibilityQueue.push({ session, data });
      return { queued: true, queueLength: lateVisibilityQueue.length };
    },

    flushLateVisibilityQueue() {
      const out = [];
      while (lateVisibilityQueue.length) {
        const op = lateVisibilityQueue.shift();
        out.push(api.setVisibility(op.session, op.data));
      }
      return out;
    },

    setVisibility(session, data, fault = {}) {
      const logId = String(data.logId);
      const row = getRow_(logId);
      if (!row) return { success: false, error: 'LOG_NOT_FOUND' };
      const vis = data.visibility === VIS_PRIVATE ? VIS_PRIVATE : VIS_PUBLIC;
      const baseVisRev = data.baseVisibilityRev;
      if (baseVisRev != null && Number(baseVisRev) !== Number(row.visibilityRev)) {
        return { success: false, error: 'VISIBILITY_REV_CONFLICT', visibilityRev: row.visibilityRev };
      }
      const pend = appendChangelogPending_('visibility_change', logId, row.vin, {
        from: row.visibility,
        to: vis
      });
      if (fault.failAfterChangelog) {
        markCommittedAbort_(pend.seq, 'VIS_WRITE_FAILED');
        return { success: false, error: 'VIS_WRITE_FAILED' };
      }
      row.visibility = vis;
      row.visibilityRev = nextRev_(row.visibilityRev);
      row.logHistoryRev = nextRev_(row.logHistoryRev);
      if (fault.failBeforeChangelogCommit) {
        return { success: false, error: 'CHANGELOG_COMMIT_FAILED', pendingSeq: pend.seq };
      }
      commitChangelog_(pend.seq, {
        metaJson: { visibility: vis, visibilityRev: row.visibilityRev, logHistoryRev: row.logHistoryRev }
      });
      return { success: true, logId, visibilityRev: row.visibilityRev, logHistoryRev: row.logHistoryRev, seq: pend.seq };
    },

    relinkOwnerPeriod(vin, newPeriodId) {
      const vinN = normVin_(vin);
      let n = 0;
      const touched = [];
      logs.forEach((row) => {
        if (row.vin !== vinN || row.deleted) return;
        bumpStatsRead(1);
        touched.push(row);
      });
      touched.forEach((row) => {
        const pend = appendChangelogPending_('owner_period_relink', row.logId, vinN, { newPeriodId });
        row.ownerPeriodId = newPeriodId;
        row.logHistoryRev = nextRev_(row.logHistoryRev);
        commitChangelog_(pend.seq, { metaJson: { logHistoryRev: row.logHistoryRev, newPeriodId } });
        n += 1;
      });
      return { success: true, vin: vinN, count: n };
    },

    /**
     * repair: pending を History_Events 真値と照合
     */
    runRepair() {
      let repaired = 0;
      let duplicatesPrevented = 0;
      for (let i = 0; i < changelog.length; i++) {
        const e = changelog[i];
        if (e.status !== 'pending') continue;
        const row = e.logId ? getRow_(e.logId) : null;
        const age = Date.now();
        if (age < 0) continue;

        if (e.eventType === 'log_upsert' && !row) {
          markCommittedAbort_(e.seq, 'REPAIR_ROW_MISSING');
          repaired += 1;
          continue;
        }
        if (e.eventType === 'log_delete' && row && !row.deleted) {
          row.deleted = true;
          logs.delete(e.logId);
        }
        if (e.eventType === 'visibility_change' && row) {
          /* row already updated in failBeforeChangelogCommit path */
        }
        if (e.status === 'pending') {
          try {
            commitChangelog_(e.seq, {
              metaJson: Object.assign({}, e.metaJson, row ? {
                logHistoryRev: row.logHistoryRev,
                visibilityRev: row.visibilityRev
              } : {})
            });
            repaired += 1;
          } catch (err) {
            duplicatesPrevented += 1;
          }
        }
      }
      return { repaired, duplicatesPrevented };
    },

    getHistorySyncFeed(session, params) {
      const afterSeq = Number(params.afterSeq) || 0;
      const limit = Math.min(Number(params.limit) || 50, 200);
      const vinFilter = Array.isArray(params.vinList)
        ? params.vinList.map(normVin_).filter(Boolean)
        : null;
      return buildFeedEvents_(session, afterSeq, limit, vinFilter, principalDelivered, params);
    },

    getMaintenanceHistoryFull(session, vin) {
      const rows = simulateFullVinFetch_(session, normVin_(vin));
      return {
        success: true,
        historyAclVersion: 1,
        logs: rows.map((r) => ({
          log_id: r.logId,
          title: r.title,
          visibility: r.visibility,
          logHistoryRev: r.logHistoryRev
        }))
      };
    },

    compareLoad(session, vinList, afterSeq) {
      const vins = vinList.map(normVin_);
      api.resetStats();
      vins.forEach((v) => simulateFullVinFetch_(session, v));
      const full = { ...stats };
      api.resetStats();
      simulateChangelogTail_(afterSeq || 0, 500);
      const delta = { ...stats };
      return { fullVinScan: full, changelogTail: delta };
    },

    dumpChangelog() {
      return changelog.map((e) => ({
        seq: e.seq,
        status: e.status,
        eventType: e.eventType,
        logId: e.logId
      }));
    }
  };

  return api;
}

/**
 * クライアント側差分適用（カーソルとローカル反映を一体）
 */
export function createHistorySyncClient() {
  let state = {
    feedScopeKey: '',
    afterSeq: 0,
    records: new Map(),
    tombstones: new Set(),
    aclRevoked: new Set(),
    everDelivered: new Set()
  };

  function scopeKey_(principal, vinList) {
    const v = (vinList || []).slice().sort().join(',');
    return principalKey_(principal) + '|' + v;
  }

  return {
    getState: () => ({ ...state, records: new Map(state.records) }),

    resetForScope(principal, vinList) {
      const key = scopeKey_(principal, vinList);
      if (state.feedScopeKey && state.feedScopeKey !== key) {
        state = {
          feedScopeKey: key,
          afterSeq: 0,
          records: new Map(),
          tombstones: new Set(),
          aclRevoked: new Set(),
          everDelivered: new Set()
        };
      } else {
        state.feedScopeKey = key;
      }
      return state.feedScopeKey;
    },

    pullAll(sim, session, vinList, opts = {}) {
      const pageSize = opts.pageSize || 10;
      const principal = session;
      this.resetForScope(principal, vinList);

      const allEvents = [];
      let after = 0;
      let guard = 0;
      while (guard++ < 500) {
        const page = sim.getHistorySyncFeed(session, {
          afterSeq: after,
          limit: pageSize,
          vinList
        });
        if (page.fullResyncRequired) {
          return { needFullResync: true, partial: state };
        }
        if (page.blockedPendingSeq) {
          return { blockedPendingSeq: page.blockedPendingSeq, afterSeq: after, partial: state };
        }
        allEvents.push(...page.events);
        this.applyPage(session, vinList, { events: page.events, nextCursor: page.nextCursor });
        after = state.afterSeq;
        if (!page.hasMore && !page.events.length) break;
        if (!page.hasMore) break;
      }

      const apply = { afterSeq: state.afterSeq, count: state.records.size };
      return { events: allEvents.length, ...apply };
    },

    applyPage(session, vinList, page) {
      const key = scopeKey_(session, vinList);
      if (state.feedScopeKey && state.feedScopeKey !== key) {
        throw new Error('FEED_SCOPE_MISMATCH');
      }
      state.feedScopeKey = key;

      for (const ev of page.events || []) {
        if (ev.seq <= state.afterSeq) continue;
        if (ev.type === 'noop') continue;
        if (ev.type === 'delete') {
          state.records.delete(ev.logId);
          state.tombstones.add(ev.logId);
          state.everDelivered.add(ev.logId);
        } else if (ev.type === 'acl_drop') {
          state.records.delete(ev.logId);
          state.aclRevoked.add(ev.logId);
          state.everDelivered.add(ev.logId);
        } else if (ev.type === 'upsert_meta') {
          state.tombstones.delete(ev.logId);
          state.aclRevoked.delete(ev.logId);
          state.records.set(ev.logId, { ...ev.meta, seq: ev.seq });
          state.everDelivered.add(ev.logId);
        }
      }
      const next = page.nextCursor != null ? page.nextCursor : state.afterSeq;
      if (next < state.afterSeq) throw new Error('CURSOR_ROLLBACK');
      state.afterSeq = next;
      return { afterSeq: state.afterSeq, count: state.records.size };
    }
  };
}