/** v67-2: HTML integrity と実ファイル（LF/CRLF両方）の整合 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const hash = (data, fmt) => crypto.createHash('sha256').update(data).digest(fmt);
const normalize = (text) => text.replace(/\r\n/g, '\n');

function digestsBase64(file) {
  const fp = path.join(ROOT, file);
  if (!fs.existsSync(fp)) return [];
  const bytes = fs.readFileSync(fp);
  const lf = normalize(bytes.toString('utf8'));
  const crlf = lf.replace(/\n/g, '\r\n');
  return [...new Set([bytes, lf, crlf].map((s) => {
    const buf = typeof s === 'string' ? Buffer.from(s, 'utf8') : s;
    return 'sha256-' + hash(buf, 'base64');
  }))];
}

const htmlFiles = fs.readdirSync(ROOT).filter((f) => f.endsWith('.html'));
const report = { generatedAt: new Date().toISOString(), mismatches: [], ok: 0 };

for (const html of htmlFiles) {
  const text = fs.readFileSync(path.join(ROOT, html), 'utf8');
  const re = /<(?:script|link)\b[^>]*\b(?:src|href)="([^"]+\.(?:css|js|mjs)(?:\?[^"]*)?)"[^>]*\bintegrity="([^"]+)"/gi;
  let m;
  while ((m = re.exec(text)) !== null) {
    const ref = m[1].split('?')[0].replace(/^\.\//, '');
    const base = path.basename(ref);
    const expected = digestsBase64(base);
    if (!expected.length) continue;
    const ints = m[2].split(/\s+/);
    const hit = expected.some((e) => ints.includes(e) || ints.includes(e + '='));
    if (hit) report.ok++;
    else report.mismatches.push({ html, asset: base, expected: expected[0], listed: m[2].slice(0, 96) });
  }
}

const out = path.join(path.dirname(fileURLToPath(import.meta.url)), 'metrics/sri-drift.json');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify(report, null, 2));
console.log(JSON.stringify({ mismatchCount: report.mismatches.length, okCount: report.ok, out }));