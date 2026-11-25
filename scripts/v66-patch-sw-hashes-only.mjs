/**
 * HTML を書き換えず RELEASE_SHA256 のみ再計算（LF/CRLF混在HTML対策）
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');
const write = (name, text) => fs.writeFileSync(path.join(root, name), text);

const hash = (data, fmt) => createHash('sha256').update(data).digest(fmt);
const normalize = (text) => text.replace(/\r\n/g, '\n');

function releaseDigests(file) {
  const fp = path.join(root, file);
  const bytes = fs.readFileSync(fp);
  const lf = normalize(bytes.toString('utf8'));
  const values = [...new Set([lf, lf.replace(/\n/g, '\r\n')].map((v) => hash(v, 'hex')))];
  if (!values.includes(hash(bytes, 'hex'))) values.push(hash(bytes, 'hex'));
  return values;
}

let sw = read('service-worker.js');
const hashes = /const RELEASE_SHA256 = (\{[\s\S]*?\});/;
const manifest = JSON.parse(sw.match(hashes)[1]);
for (const key of Object.keys(manifest)) {
  const file = key.slice(2);
  if (!fs.existsSync(path.join(root, file))) continue;
  if (/\.(?:html|js|css|mjs)$/.test(file)) manifest[key] = releaseDigests(file);
}
sw = sw.replace(hashes, 'const RELEASE_SHA256 = ' + JSON.stringify(manifest, null, 2) + ';');
write('service-worker.js', sw);
console.log('Patched SW hashes:', Object.keys(manifest).length);