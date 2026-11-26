/**
 * v67-2: integrity / ?v= / SW CACHE_NAME 更新（LF+CRLF 両ハッシュ）
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const version = '20261126-v67';
const cacheBump = 'car-nappy-v67';
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');
function write(name, bytes) {
  const fp = path.join(root, name);
  if (read(name) === bytes) return;
  for (let i = 0; i < 5; i++) {
    try {
      fs.writeFileSync(fp, bytes);
      return;
    } catch (e) {
      if (i === 4) throw e;
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 400);
    }
  }
}
const hash = (data, fmt) => createHash('sha256').update(data).digest(fmt);
const normalize = (text) => text.replace(/\r\n/g, '\n');
function releaseDigests(file, format) {
  const bytes = fs.readFileSync(path.join(root, file));
  const lf = normalize(bytes.toString('utf8'));
  const values = [...new Set([lf, lf.replace(/\n/g, '\r\n')].map((value) => hash(value, format)))];
  if (!values.includes(hash(bytes, format))) throw new Error('Mixed line endings or non-UTF8 release asset: ' + file);
  return values;
}

const revised = new Set([
  'app.js', 'common.css', 'theme.js', 'vin-search.js', 'staff_admin.js', 'gemini-ocr.js',
  'rental-fleet.js', 'rental-fleet.css', 'fleet-check-sheet.js', 'fleet-check-sheet.css',
  'fleet-check-sheet-pdf.js', 'owner-platform.js', 'owner-platform-ui.js', 'vendor/qr/qrcode.js',
  'ring-history-list.js', 'ring-browse-coordinator.js', 'ring-browse-warmup.js',
  'ring-media-import.js', 'gemini-invoice-ocr.js', 'rental-fleet.v61.js'
]);

const versionBumpPattern = /(ring-media-import\.js|gemini-invoice-ocr\.js)\?v=[^"']+/g;
const bumpAuxVersion = (html) => html.replace(versionBumpPattern, (_, base) => `${base}?v=${version}`);

const urls = new Set();
const files = fs.readdirSync(root).filter((name) => name.endsWith('.html'));
for (const name of files) {
  let html = bumpAuxVersion(read(name)).replace(/\?v=202611\d+-v\d+/g, '?v=' + version);
  html = html.replace(/<(script|link)\b[^>]*>/gi, (tag) => {
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
  for (const m of html.matchAll(/\b(?:src|href)="([^"]+\?v=[^"]+)"/g)) {
    const u = m[1].startsWith('./') ? m[1] : './' + m[1].replace(/^\//, '');
    urls.add(u);
  }
  write(name, html);
}

const swName = 'service-worker.js';
let worker = read(swName);
const entries = /const PRECACHE_URLS = (\[[\s\S]*?\]);/;
const hashes = /const RELEASE_SHA256 = (\{[\s\S]*?\});/;
const previous = JSON.parse(worker.match(entries)[1]);
const list = [
  ...new Set([
    ...previous.filter((url) => !url.includes('?') || !revised.has(url.slice(2).split('?')[0])),
    ...urls,
    ...files.map((f) => './' + f)
  ])
];
const manifest = JSON.parse(worker.match(hashes)[1]);
for (const url of list) {
  const key = url.split('?')[0];
  if (!/\.(?:css|js|html|mjs)$/.test(key)) continue;
  const rel = key.slice(2);
  try {
    manifest[key] = releaseDigests(rel, 'hex');
  } catch {
    const raw = fs.readFileSync(path.join(root, rel));
    manifest[key] = [hash(raw, 'hex')];
  }
}
worker = worker
  .replace(/const CACHE_NAME = "car-nappy-v\d+"/, `const CACHE_NAME = "${cacheBump}"`)
  .replace(entries, 'const PRECACHE_URLS = ' + JSON.stringify(list, null, 2) + ';')
  .replace(hashes, 'const RELEASE_SHA256 = ' + JSON.stringify(manifest, null, 2) + ';')
  .replace(/\?v=202611\d+-v\d+/g, '?v=' + version);
write(swName, worker);
console.log('v67-2 release:', version, cacheBump, list.length, 'URLs', Object.keys(manifest).length, 'hashes');