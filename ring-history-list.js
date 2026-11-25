/**
 * v65-3 整備履歴一覧: 10件ずつ段階表示・先読み（メモリ内データのみ、追加GAS通信なし）
 * 将来: IDB / 差分同期データソース差し替え可（getItems コールバック）
 */
(function (global) {
  'use strict';

  var DEFAULT_PAGE = 10;
  var CSS_SENTINEL = 'ring-hist-list-sentinel';
  var CSS_TAIL = 'ring-hist-list-tail';
  var CSS_ERR = 'ring-hist-list-error';

  function stableSortItems(items, getId) {
    return items.slice().sort(function (a, b) {
      var da = new Date(a.date).getTime();
      var db = new Date(b.date).getTime();
      if (isNaN(da)) da = 0;
      if (isNaN(db)) db = 0;
      if (db !== da) return db - da;
      return String(getId(a)).localeCompare(String(getId(b)));
    });
  }

  function dedupeItems(items, getId) {
    var seen = new Set();
    return items.filter(function (it) {
      var id = String(getId(it));
      if (!id || seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  }

  function rowFingerprint(row, getId) {
    if (!row || typeof row !== 'object') return String(getId(row));
    var partsSig = String(row.parts || '').slice(0, 96);
    var memoSig = String(row.memo || '').slice(0, 96);
    var partsItemsSig = '';
    if (Array.isArray(row.partsItems) && row.partsItems.length) {
      partsItemsSig = row.partsItems.map(function (p) {
        if (!p || typeof p !== 'object') return '';
        return String(p.name || p.partName || p.title || p.parts || '').slice(0, 32);
      }).filter(Boolean).join(',');
    }
    return [
      String(getId(row)),
      String(row.date || ''),
      String(row.title || '').slice(0, 64),
      partsSig,
      memoSig,
      partsItemsSig,
      String(row.visibility || ''),
      String(row.lock_at || row.lockAt || ''),
      String(row.voidedAt || '')
    ].join('\x1f');
  }

  function dataSignature(items, getId) {
    if (!items.length) return '0';
  return items.map(function (it) { return rowFingerprint(it, getId); }).join('\x1e');
  }

  function RingHistoryListController(opts) {
    opts = opts || {};
    this.pageSize = opts.pageSize > 0 ? opts.pageSize : DEFAULT_PAGE;
    this.container = opts.container;
    this.getId = opts.getId || function (log) { return log.log_id || log.logId || ''; };
    this.getItems = opts.getItems || function () { return []; };
    this.renderItem = opts.renderItem || function () { return document.createElement('div'); };
    this.emptyHtml = opts.emptyHtml || '';
    this.errorHtml = opts.errorHtml || '';
    this.filterKey = opts.filterKey || function () { return ''; };
    this.onPrepareNext = opts.onPrepareNext || null;
    this.stripVolatileFields_ = opts.stripVolatileFields !== false;
    /** 車両一覧など: 入力順を維持（日付降順は整備履歴専用） */
    this.preserveItemOrder_ = opts.preserveItemOrder === true;
    this.metrics = { lastDomNodes: 0, lastTotal: 0, lastVisible: 0, appendCalls: 0 };

    this.visibleCount = 0;
    this.sortedItems_ = [];
    this.filterSig_ = '';
    this.listRoot_ = null;
    this.sentinel_ = null;
    this.tailEl_ = null;
    this.io_ = null;
    this.error_ = null;
    this._scrollY = 0;
    this._mountedIds = new Set();
    this._appendBusy_ = false;

    if (this.container) this._ensureDom_();
    this._bindIo_();
  }

  RingHistoryListController.prototype._ensureDom_ = function () {
    if (this.listRoot_ && this.container.contains(this.listRoot_)) return;
    this.container.innerHTML = '';
    this.listRoot_ = document.createElement('div');
    this.listRoot_.className = 'ring-hist-list-root';
    this.sentinel_ = document.createElement('div');
    this.sentinel_.className = CSS_SENTINEL;
    this.sentinel_.setAttribute('aria-hidden', 'true');
    this.sentinel_.style.cssText = 'height:1px;width:100%;visibility:hidden;';
    this.tailEl_ = document.createElement('div');
    this.tailEl_.className = CSS_TAIL;
    this.tailEl_.style.cssText = 'text-align:center;font-size:11px;font-weight:700;color:var(--muted);padding:8px 4px;min-height:24px;';
    this.container.appendChild(this.listRoot_);
    this.container.appendChild(this.sentinel_);
    this.container.appendChild(this.tailEl_);
  };

  RingHistoryListController.prototype._bindIo_ = function () {
    var self = this;
    if (typeof IntersectionObserver === 'undefined') return;
    this._destroyIo_();
    this.io_ = new IntersectionObserver(function (entries) {
      entries.forEach(function (ent) {
        if (!ent.isIntersecting) return;
        if (self._appendBusy_) return;
        self._appendBusy_ = true;
        var run = function () {
          self._appendNextPage_();
          self._appendBusy_ = false;
        };
        if (typeof requestAnimationFrame === 'function') requestAnimationFrame(run);
        else run();
      });
    }, { root: null, rootMargin: '120px 0px', threshold: 0 });
    if (this.sentinel_) this.io_.observe(this.sentinel_);
  };

  RingHistoryListController.prototype._destroyIo_ = function () {
    if (this.io_) {
      this.io_.disconnect();
      this.io_ = null;
    }
  };

  RingHistoryListController.prototype.destroy = function () {
    this._destroyIo_();
    if (this.container) this.container.innerHTML = '';
    this.listRoot_ = null;
    this.sentinel_ = null;
    this.tailEl_ = null;
  };

  RingHistoryListController.prototype.setError = function (message) {
    this.error_ = message || null;
  };

  RingHistoryListController.prototype.invalidate = function () {
    this.visibleCount = 0;
    this.sortedItems_ = [];
    this.filterSig_ = '';
    this._mountedIds.clear();
    if (this.container) this.container.innerHTML = '';
    this._ensureDom_();
    this._bindIo_();
  };

  RingHistoryListController.prototype.getFilteredItems = function () {
    var raw = this.getItems() || [];
    if (this.stripVolatileFields_) {
      raw = raw.map(function (row) {
        if (!row || typeof row !== 'object') return row;
        var c = Object.assign({}, row);
        delete c.targetVisibility;
        delete c._pendingVisibility;
        return c;
      });
    }
    if (this.preserveItemOrder_) {
      return dedupeItems(raw, this.getId.bind(this));
    }
    return dedupeItems(stableSortItems(raw, this.getId.bind(this)), this.getId.bind(this));
  };

  RingHistoryListController.prototype.refresh = function (options) {
    options = options || {};
    if (!this.container) return this.metrics;
    this._ensureDom_();

    if (options.preserveScroll) {
      this._scrollY = global.scrollY || 0;
    }

    if (this.error_) {
      this.listRoot_.innerHTML = '<div class="' + CSS_ERR + '">' + this.error_ + '</div>';
      if (this.tailEl_) this.tailEl_.textContent = '';
      return this.metrics;
    }

    var fKey = String(this.filterKey());
    var items = this.getFilteredItems();
    var dSig = dataSignature(items, this.getId.bind(this));
    var sig = fKey + '::' + dSig;

    if (sig !== this.filterSig_ || options.resetWindow) {
      var keepVisibleWindow = !!options.dataOnly && !options.resetWindow && !!this.filterSig_;
      if (!keepVisibleWindow) {
        this.visibleCount = Math.min(this.pageSize, items.length);
      } else {
        this.visibleCount = Math.min(Math.max(this.visibleCount, this.pageSize), items.length);
      }
      this.filterSig_ = sig;
      this._mountedIds.clear();
      this._fullRenderWindow_(items);
    } else if (options.dataOnly) {
      this.sortedItems_ = items;
      this._trimRemoved_(items);
      this._updateTail_(items);
    } else {
      this.sortedItems_ = items;
      this._updateTail_(items);
    }

    if (options.preserveScroll && typeof global.requestAnimationFrame === 'function') {
      var y = this._scrollY;
      global.requestAnimationFrame(function () { global.scrollTo(0, y); });
    }

    this.metrics.lastTotal = items.length;
    this.metrics.lastVisible = this.visibleCount;
    this.metrics.lastDomNodes = this.listRoot_ ? this.listRoot_.childElementCount : 0;
    return this.metrics;
  };

  RingHistoryListController.prototype._fullRenderWindow_ = function (items) {
    this.sortedItems_ = items;
    this.listRoot_.innerHTML = '';
    this._mountedIds.clear();
    var slice = items.slice(0, this.visibleCount);
    var frag = document.createDocumentFragment();
    for (var i = 0; i < slice.length; i++) {
      var node = this._renderOne_(slice[i], i);
      if (node) frag.appendChild(node);
    }
    this.listRoot_.appendChild(frag);
    if (items.length === 0 && this.emptyHtml) {
      this.listRoot_.innerHTML = this.emptyHtml;
    }
    this._updateTail_(items);
  };

  RingHistoryListController.prototype._renderOne_ = function (log, index) {
    var id = String(this.getId(log));
    if (!id || this._mountedIds.has(id)) return null;
    this._mountedIds.add(id);
    var el = this.renderItem(log, index);
    if (!el) return null;
    if (typeof el === 'string') {
      var wrap = document.createElement('div');
      wrap.innerHTML = el;
      el = wrap.firstElementChild || wrap;
    }
    if (el.setAttribute) el.setAttribute('data-log-id', id);
    return el;
  };

  RingHistoryListController.prototype._appendNextPage_ = function () {
    var items = this.sortedItems_;
    if (this.visibleCount >= items.length) return;
    if (typeof this.onPrepareNext === 'function') {
      this.onPrepareNext(this.visibleCount, this.pageSize);
    }
    var nextEnd = Math.min(this.visibleCount + this.pageSize, items.length);
    var frag = document.createDocumentFragment();
    for (var i = this.visibleCount; i < nextEnd; i++) {
      var node = this._renderOne_(items[i], i);
      if (node) frag.appendChild(node);
    }
    this.listRoot_.appendChild(frag);
    this.visibleCount = nextEnd;
    this.metrics.appendCalls += 1;
    this.metrics.lastVisible = this.visibleCount;
    this.metrics.lastDomNodes = this.listRoot_.childElementCount;
    this._updateTail_(items);
  };

  RingHistoryListController.prototype._trimRemoved_ = function (items) {
    var allowed = new Set(items.map(this.getId.bind(this)).map(String));
    var children = Array.from(this.listRoot_.children);
    children.forEach(function (ch) {
      var lid = ch.getAttribute && ch.getAttribute('data-log-id');
      if (lid && !allowed.has(lid)) ch.remove();
    });
    this._mountedIds.forEach(function (id) {
      if (!allowed.has(id)) this._mountedIds.delete(id);
    }.bind(this));
  };

  RingHistoryListController.prototype._updateTail_ = function (items) {
    if (!this.tailEl_) return;
    if (!items.length) {
      this.tailEl_.textContent = '';
      return;
    }
    if (this.visibleCount >= items.length) {
      this.tailEl_.textContent = items.length > this.pageSize
        ? ('全' + items.length + '件を表示しました')
        : '';
    } else {
      this.tailEl_.textContent = '読み込み中… (' + this.visibleCount + ' / ' + items.length + ')';
    }
  };

  RingHistoryListController.prototype.getBulkTargetIds = function () {
    return this.getFilteredItems().map(this.getId.bind(this));
  };

  function createPagedListController(opts) {
    return new RingHistoryListController(opts);
  }

  global.RingHistoryList = {
    create: createPagedListController,
    stableSortItems: stableSortItems,
    dedupeItems: dedupeItems,
    DEFAULT_PAGE: DEFAULT_PAGE
  };
  /** v66-2 汎用段階表示（整備履歴と同一実装） */
  global.RingPagedList = {
    create: createPagedListController,
    stableSortItems: stableSortItems,
    dedupeItems: dedupeItems,
    DEFAULT_PAGE: DEFAULT_PAGE
  };
})(typeof window !== 'undefined' ? window : globalThis);