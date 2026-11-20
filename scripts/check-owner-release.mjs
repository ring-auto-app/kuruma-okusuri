// Read-only independent check of the bytes and URLs a fresh page actually requests.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = name => fs.readFileSync(path.join(root, name));
const worker = read('service-worker.js').toString();
const manifest = JSON.parse(worker.match(/const RELEASE_SHA256 = (\{[\s\S]*?\});/)[1]);
const urls = new Set(JSON.parse(worker.match(/const PRECACHE_URLS = (\[[\s\S]*?\]);/)[1]));
const checksum = (bytes, encoding) => createHash('sha256').update(bytes).digest(encoding);
for (const [key, values] of Object.entries(manifest)) {
  const permitted = Array.isArray(values) ? values : [values];
  assert(permitted.includes(checksum(read(key),'hex')), 'Incorrect SW hash for ' + key);
}
const suffix = worker.match(/const CACHE_NAME = .car-nappy-(v\d+)/)[1];
const pages = fs.readdirSync(root).filter(name => name.endsWith('.html'));
let sriCount = 0;
for (const name of pages) {
  for (const [tag] of read(name).toString().matchAll(/<(?:script|link)\b[^>]*>/gi)) {
    const ref = tag.match(/\b(?:src|href)=["']([^"']+)["']/)?.[1];
    if (!ref || !/\.(?:css|js|mjs)(?:\?|$)/.test(ref) || /^(?:https?:)?\/\//i.test(ref)) continue;
    const key = './' + ref.replace(/^\.\//, '');
    assert(urls.has(key), name + ' missing precache ' + ref);
    const file = key.split('?')[0];
    assert(manifest[file], name + ' missing SW hash ' + ref);
    const integrity = tag.match(/\bintegrity=["']([^"']+)["']/)?.[1];
    if (key.includes('?v=') && key.endsWith('-' + suffix)) assert(integrity, name + ' missing SRI ' + ref);
    if (!integrity) continue;
    assert(integrity.split(/\s+/).includes('sha256-' + checksum(read(file),'base64')), name + ' SRI mismatch ' + ref);
    sriCount++;
  }
}
console.log('Verified',pages.length,'HTML pages,',urls.size,'precache URLs,',Object.keys(manifest).length,'SW hashes and',sriCount,'SRI references.');
