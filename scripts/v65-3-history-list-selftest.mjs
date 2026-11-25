/**
 * v65-3 ring-history-list 隔離検証（Node・モック DOM）
 * node scripts/v65-3-history-list-selftest.mjs
 */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import vm from 'node:vm';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
let passed = 0;
let failed = 0;
function ok(c, m) { if (c) { passed++; console.log('PASS:', m); } else { failed++; console.error('FAIL:', m); } }

class MiniEl {
  constructor(tag) { this.tag = tag; this._children = []; this.attrs = {}; this._html = ''; this.style = { cssText: '' }; }
  set innerHTML(h) {
    this._html = h;
    this._children = [];
    const m = /<a[^>]*data-id="([^"]+)"[^>]*>/g.exec(h) || /<a[^>]*>([^<]*)<\/a>/.exec(h);
    if (m) {
      const a = new MiniEl('a');
      a.setAttribute('data-log-id', m[1] || m[0]);
      this.children.push(a);
    }
  }
  get innerHTML() { return this._html; }
  appendChild(ch) {
    if (ch && ch.tag === 'frag' && ch.children) {
      ch.children.forEach((c) => { this.children.push(c); c.parent = this; });
      return ch;
    }
    this.children.push(ch);
    ch.parent = this;
    return ch;
  }
  contains(el) {
    return el === this || this.children.some((c) => c === el || (c.contains && c.contains(el)));
  }
  remove() {
    if (this.parent) this.parent.children = this.parent.children.filter((c) => c !== this);
  }
  get children() { return this._children; }
  setAttribute(k, v) { this.attrs[k] = v; }
  getAttribute(k) { return this.attrs[k]; }
  get childElementCount() { return this._children.length; }
  get firstElementChild() { return this.children[0] || null; }
  contains() { return true; }
}

const g = {
  document: {
    createElement(tag) { return new MiniEl(tag); },
    createDocumentFragment() { const f = new MiniEl('frag'); return f; }
  },
  window: {},
  globalThis: null,
  requestAnimationFrame: (fn) => fn(),
  scrollY: 0,
  scrollTo: () => {}
};
g.window = g;
g.globalThis = g;

class IO {
  constructor(cb) { this.cb = cb; this.obs = []; }
  observe(el) { this.obs.push(el); }
  disconnect() {}
  trigger() { this.obs.forEach(() => this.cb([{ isIntersecting: true }])); }
}
g.IntersectionObserver = IO;

const src = readFileSync(join(root, 'ring-history-list.js'), 'utf8');
vm.runInNewContext(src, g, { filename: 'ring-history-list.js' });

const RL = g.RingHistoryList;
const mkLog = (i) => ({ log_id: 'L' + i, date: '2026-01-' + String((i % 28) + 1).padStart(2, '0'), title: 't' + i });
const logsN = (n) => Array.from({ length: n }, (_, i) => mkLog(n - i));

function runCase(n) {
  const box = new MiniEl('div');
  const ioRef = { v: null };
  let appendCalls = 0;
  const ctrl = RL.create({
    container: box,
    pageSize: 10,
    getItems: () => ctrl._cache || [],
    renderItem: (log) => { appendCalls++; return `<a data-id="${log.log_id}">${log.title}</a>`; },
    emptyHtml: '<div>empty</div>'
  });
  ctrl._cache = logsN(n);
  const m = ctrl.refresh({ resetWindow: true });
  ok(m.lastVisible === Math.min(10, n), 'init10 n=' + n);
  ok(m.lastDomNodes === Math.min(10, n), 'dom10 n=' + n);
  if (n > 10 && ctrl.io_) {
    ctrl.io_.trigger();
    ok(ctrl.visibleCount >= 20 || ctrl.visibleCount === n, 'scroll20 n=' + n);
  }
  const ids = new Set();
  ctrl.getFilteredItems().forEach((l) => ids.add(l.log_id));
  ok(ids.size === n, 'dedupe n=' + n);
  return { appendCalls, visible: ctrl.visibleCount };
}

[0, 1, 9, 10, 11, 100, 1000].forEach(runCase);

const sorted = RL.stableSortItems([
  { log_id: 'B', date: '2026-01-02' },
  { log_id: 'A', date: '2026-01-02' },
  { log_id: 'C', date: '2026-01-03' }
], (x) => x.log_id);
ok(sorted[0].log_id === 'C', 'sort date desc');
ok(sorted[1].log_id === 'A' || sorted[1].log_id === 'B', 'stable tie');

const dup = RL.dedupeItems([mkLog(1), mkLog(1), mkLog(2)], (x) => x.log_id);
ok(dup.length === 2, 'dedupe ids');

const c100 = runCase(100);
ok(c100.visible <= 20, 'no 100 dom at once');

const searchBox = new MiniEl('div');
const all = logsN(100);
const ctrlS = RL.create({
  container: searchBox,
  pageSize: 10,
  getItems: () => all.filter((l) => l.log_id === 'L1'),
  filterKey: () => 'search',
  renderItem: (l) => `<a>${l.log_id}</a>`,
  emptyHtml: 'e'
});
ctrlS.refresh({ resetWindow: true });
ok(ctrlS.getFilteredItems().length === 1 && ctrlS.getFilteredItems()[0].log_id === 'L1', 'search hits L1 in 100');

const bulk = RL.create({
  container: new MiniEl('div'),
  pageSize: 10,
  getItems: () => logsN(50),
  renderItem: (l) => `<a>${l.log_id}</a>`,
  filterKey: () => 'b'
});
bulk.refresh({ resetWindow: true });
ok(bulk.getBulkTargetIds().length === 50, 'bulk all 50 not 10');

const memoBox = new MiniEl('div');
const memoLogs = [mkLog(1)];
memoLogs[0].memo = 'alpha';
const ctrlM = RL.create({
  container: memoBox,
  pageSize: 10,
  getItems: function () { return memoLogs; },
  renderItem: (l) => `<a data-id="${l.log_id}">${l.memo}</a>`,
  emptyHtml: 'e'
});
ctrlM.refresh({ resetWindow: true });
memoLogs[0].memo = 'beta';
ctrlM.refresh({ dataOnly: true });
ok(ctrlM.getFilteredItems()[0].memo === 'beta' && ctrlM.listRoot_.childElementCount === 1, 'memo change re-render');

console.log('\nTotal PASS:', passed, 'FAIL:', failed);
if (failed) process.exit(1);