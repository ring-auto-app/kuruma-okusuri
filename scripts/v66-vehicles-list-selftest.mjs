/**
 * v66 車両一覧段階表示（RingPagedList）隔離検証
 * node scripts/v66-vehicles-list-selftest.mjs
 */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
let passed = 0;
let failed = 0;
function ok(c, m) {
  if (c) { passed++; console.log('PASS:', m); }
  else { failed++; console.error('FAIL:', m); }
}

class MiniEl {
  constructor(tag) {
    this.tag = tag;
    this._children = [];
    this.attrs = {};
    this._html = '';
    this.style = { cssText: '' };
  }
  set innerHTML(h) {
    this._html = h;
    this._children = [];
    const re = /data-vin="([^"]+)"/g;
    let m;
    while ((m = re.exec(h))) {
      const a = new MiniEl('div');
      a.setAttribute('data-vin', m[1]);
      this._children.push(a);
    }
  }
  get innerHTML() { return this._html; }
  appendChild(ch) {
    if (ch && ch.tag === 'frag' && ch.children) {
      ch.children.forEach((c) => { this._children.push(c); c.parent = this; });
      return ch;
    }
    this._children.push(ch);
    ch.parent = this;
    return ch;
  }
  contains(el) {
    return el === this || this._children.some((c) => c === el || (c.contains && c.contains(el)));
  }
  remove() {
    if (this.parent) this.parent.children = this.parent.children.filter((c) => c !== this);
  }
  get children() { return this._children; }
  setAttribute(k, v) { this.attrs[k] = v; }
  getAttribute(k) { return this.attrs[k]; }
  get childElementCount() { return this._children.length; }
  get firstElementChild() { return this._children[0] || null; }
}

const g = {
  document: {
    createElement(tag) { return new MiniEl(tag); },
    createDocumentFragment() { return new MiniEl('frag'); }
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

const RL = g.RingPagedList;
const mkCar = (vin, date, nickname) => ({ vin, date: date || '2020-01-01', nickname: nickname || vin });

function userOrderCars(n) {
  return Array.from({ length: n }, (_, i) => mkCar('VIN-' + String(n - i).padStart(4, '0')));
}

function runPagingCase(n) {
  const box = new MiniEl('div');
  const cars = userOrderCars(n);
  const ctrl = RL.create({
    container: box,
    pageSize: 10,
    preserveItemOrder: true,
    stripVolatileFields: false,
    getId: (c) => c.vin,
    getItems: () => ctrl._cache || [],
    renderItem: (c) => '<div data-vin="' + c.vin + '">' + c.nickname + '</div>',
    emptyHtml: 'e'
  });
  ctrl._cache = cars;
  const m = ctrl.refresh({ resetWindow: true });
  ok(m.lastVisible === Math.min(10, n), 'visible10 n=' + n);
  ok(m.lastDomNodes === Math.min(10, n), 'dom10 n=' + n);
  const filtered = ctrl.getFilteredItems();
  ok(filtered[0] && filtered[0].vin === cars[0].vin, 'order preserved first n=' + n);
  ok(filtered.length === n, 'filter count n=' + n);
  const ids = new Set(filtered.map((c) => c.vin));
  ok(ids.size === n, 'unique vin n=' + n);
  if (n > 10 && ctrl.io_) {
    ctrl.io_.trigger();
    ok(ctrl.visibleCount >= 20 || ctrl.visibleCount === n, 'scroll append n=' + n);
  }
  return ctrl;
}

[11, 100, 1000].forEach(runPagingCase);

const orderCars = [
  mkCar('Z9', '2099-01-01'),
  mkCar('A1', '2001-01-01'),
  mkCar('M5', '2015-06-01')
];
const orderBox = new MiniEl('div');
const orderCtrl = RL.create({
  container: orderBox,
  pageSize: 10,
  preserveItemOrder: true,
  getId: (c) => c.vin,
  getItems: () => orderCars,
  renderItem: (c) => '<div data-vin="' + c.vin + '"></div>',
  emptyHtml: 'e'
});
orderCtrl.refresh({ resetWindow: true });
const oids = orderCtrl.getFilteredItems().map((c) => c.vin);
ok(oids.join(',') === 'Z9,A1,M5', 'no history date sort on vehicles');

const histSorted = RL.stableSortItems(orderCars, (c) => c.vin);
ok(histSorted[0].vin === 'Z9', 'history sort still date-desc when not preserve');

const all100 = userOrderCars(100);
const searchBox = new MiniEl('div');
const searchCtrl = RL.create({
  container: searchBox,
  pageSize: 10,
  preserveItemOrder: true,
  getId: (c) => c.vin,
  getItems: () => all100.filter((c) => c.vin === 'VIN-0042'),
  filterKey: () => 'search|VIN-0042',
  renderItem: (c) => '<div data-vin="' + c.vin + '"></div>',
  emptyHtml: 'e'
});
searchCtrl.refresh({ resetWindow: true });
ok(searchCtrl.getFilteredItems().length === 1 && searchCtrl.getFilteredItems()[0].vin === 'VIN-0042', 'search single hit');

const rerenderBox = new MiniEl('div');
const cache = userOrderCars(15);
const rr = RL.create({
  container: rerenderBox,
  pageSize: 10,
  preserveItemOrder: true,
  getId: (c) => c.vin,
  getItems: () => cache,
  renderItem: (c) => '<div data-vin="' + c.vin + '">' + c.nickname + '</div>',
  emptyHtml: 'e'
});
rr.refresh({ resetWindow: true });
cache[0].nickname = 'renamed';
rr.refresh({ dataOnly: true, preserveScroll: true });
ok(rr.getFilteredItems()[0].nickname === 'renamed', 'dataOnly re-render');

console.log('\nTotal PASS:', passed, 'FAIL:', failed);
if (failed) process.exit(1);