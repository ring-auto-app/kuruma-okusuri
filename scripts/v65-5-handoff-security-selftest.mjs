/**
 * v65-5 handoff 本文保存無効の検証
 */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = readFileSync(join(root, 'app.js'), 'utf8');
let pass = 0;
let fail = 0;
const ok = (c, m) => (c ? (pass++, console.log('PASS:', m)) : (fail++, console.error('FAIL:', m)));

ok(/function ringBrowseCrossPageReuseAllowed_\(\)[\s\S]*?return false/.test(src), 'cross-page reuse false');
ok(/function ringHistoryHandoffEnabled_\(\)[\s\S]*?return false/.test(src), 'handoff enabled false');
ok(!/blob\.vins\[key\]\.rows\s*=/.test(src), 'no sessionStorage body rows');
ok(/ringHistoryHandoffTryHydrateVin_[\s\S]*?return false/.test(src), 'hydrate always false');

console.log('\nTotal PASS:', pass, 'FAIL:', fail);
if (fail) process.exit(1);