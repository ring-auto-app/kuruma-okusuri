/**
 * v65-3/v65-4: ring-history-list + ring-browse-warmup + app/owner-platform-ui SW/SRI
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const version = '20261125-v65';
const cacheSuffix = 'v65';
const TEST_HTML = new Set(['ring-sync-test.html', 'ring-history-list-test.html']);
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');
function write(name, bytes) {
  if (read(name) !== bytes) fs.writeFileSync(path.join(root, name), bytes);
}
const hash = (data, fmt) => createHash('sha256').update(data).digest(fmt);
const normalize = (text) => text.replace(/\r\n/g, '\n');
function releaseDigests(file, format) {
  const bytes = fs.readFileSync(path.join(root, file));
  const lf = normalize(bytes.toString('utf8'));
  const values = [...new Set([lf, lf.replace(/\n/g, '\r\n')].map((value) => hash(value, format)))];
  if (!values.includes(hash(bytes, format))) {
    throw new Error('Mixed line endings or non-UTF8 release asset: ' + file);
  }
  return values;
}
const revised = new Set([
  'app.js', 'common.css', 'vin-search.js', 'staff_admin.js', 'gemini-ocr.js',
  'rental-fleet.js', 'rental-fleet.css', 'fleet-check-sheet.js', 'fleet-check-sheet.css',
  'fleet-check-sheet-pdf.js', 'owner-platform.js', 'owner-platform-ui.js', 'vendor/qr/qrcode.js',
  'ring-sync-store.js', 'ring-sync-engine.js',
  'ring-history-list.js', 'ring-browse-warmup.js', 'ring-browse-coordinator.js', 'rental-fleet.js'
]);
const urls = new Set();
const files = fs.readdirSync(root).filter((name) => name.endsWith('.html') && !TEST_HTML.has(name));
for (const name of files) {
  const html = read(name).replace(/<(script|link)\b[^>]*>/gi, (tag) => {
    const match = tag.match(/\b(src|href)="([^"?]+)(?:\?[^"]*)?"/);
    if (!match || !revised.has(match[2])) return tag;
    const asset = match[2];
    const sums = releaseDigests(asset, 'base64').map((sum) => 'sha256-' + sum);
    urls.add('./' + asset);
    urls.add('./' + asset + '?v=' + version);
    return tag
      .replace(/\s+integrity="[^"]*"/g, '')
      .replace(match[0], match[1] + '="' + asset + '?v=' + version + '" integrity="' + sums.join(' ') + '"');
  });
  write(name, html);
}
const swName = 'service-worker.js';
let worker = read(swName);
const entries = /const PRECACHE_URLS = (\[[\s\S]*?\]);/;
const hashes = /const RELEASE_SHA256 = (\{[\s\S]*?\});/;
const previous = JSON.parse(worker.match(entries)[1]);
const filteredPrev = previous.filter((url) => {
  const key = url.split('?')[0];
  return ![...TEST_HTML].some((t) => key === './' + t);
});
const list = [
  ...new Set([
    ...filteredPrev.filter((url) => !url.includes('?') || !revised.has(url.slice(2).split('?')[0])),
    ...urls,
    './ring-sync-store.js',
    './ring-sync-engine.js',
    './ring-history-list.js',
    './ring-history-list.js?v=' + version,
    './ring-browse-warmup.js',
    './ring-browse-warmup.js?v=' + version,
    './ring-browse-coordinator.js',
    './ring-browse-coordinator.js?v=' + version,
    ...files.map((f) => './' + f)
  ])
];
const manifest = JSON.parse(worker.match(hashes)[1]);
for (const url of list) {
  const key = url.split('?')[0];
  if (/\.(?:css|js|html|mjs)$/.test(key)) manifest[key] = releaseDigests(key.slice(2), 'hex');
}
worker = worker
  .replace(/(\?v=)20261124-v\d+/g, '$1' + version)
  .replace(/car-nappy-v\d+(?=";)/, 'car-nappy-' + cacheSuffix)
  .replace(entries, 'const PRECACHE_URLS = ' + JSON.stringify(list, null, 2) + ';')
  .replace(hashes, 'const RELEASE_SHA256 = ' + JSON.stringify(manifest, null, 2) + ';');
write(swName, worker);
console.log('Release', cacheSuffix + ':', list.length, 'URLs,', Object.keys(manifest).length, 'hashes');