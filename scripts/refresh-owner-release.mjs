// Refresh integrity after changing an owner-platform release asset. Cache and URL releases are independent.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const version = '20261119-v53';
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
function write(name, bytes) {
  if (read(name) !== bytes) fs.writeFileSync(path.join(root, name), bytes);
}
const hash = (data, fmt) => createHash('sha256').update(data).digest(fmt);
const normalize = text => text.replace(/\r\n/g, '\n');
const revised = new Set(['app.js', 'common.css', 'gemini-ocr.js', 'rental-fleet.js', 'owner-platform.js', 'owner-platform-ui.js', 'vendor/qr/qrcode.js']);
const urls = new Set();
const files = fs.readdirSync(root).filter(name => name.endsWith('.html'));
for (const name of files) {
  const html = read(name).replace(/<(script|link)\b[^>]*>/gi, tag => {
    const match = tag.match(/\b(src|href)="([^"?]+)(?:\?[^"]*)?"/);
    if (!match || !revised.has(match[2])) return tag;
    const asset = match[2];
    const lf = normalize(read(asset));
    const sums = [...new Set([lf, lf.replace(/\n/g, '\r\n')].map(text => 'sha256-' + hash(text,'base64')))];
    urls.add('./' + asset);
    urls.add('./' + asset + '?v=' + version);
    return tag.replace(/\s+integrity="[^"]*"/g,'').replace(match[0], match[1] + '="' + asset + '?v=' + version + '" integrity="' + sums.join(' ') + '"');
  });
  write(name, html);
}
const name = 'service-worker.js';
let worker = read(name);
const entries = /const PRECACHE_URLS = (\[[\s\S]*?\]);/;
const hashes = /const RELEASE_SHA256 = (\{[\s\S]*?\});/;
const previous = JSON.parse(worker.match(entries)[1]);
const list = [...new Set([...previous.filter(url => !url.includes('?') || !revised.has(url.slice(2).split('?')[0])), ...urls, ...files.map(f => './'+f)])];
const manifest = JSON.parse(worker.match(hashes)[1]);
for (const url of list) {
  const key = url.split('?')[0];
  if (/\.(?:css|js|html|mjs)$/.test(key)) manifest[key] = hash(normalize(read(key.slice(2))), 'hex');
}
worker = worker.replace(/car-nappy-v\d+(?=";)/, 'car-nappy-v53')
  .replace(entries, 'const PRECACHE_URLS = ' + JSON.stringify(list,null,2) + ';')
  .replace(hashes, 'const RELEASE_SHA256 = ' + JSON.stringify(manifest,null,2) + ';');
write(name, worker);
console.log('Release v53:', list.length, 'URLs,', Object.keys(manifest).length, 'content hashes');
