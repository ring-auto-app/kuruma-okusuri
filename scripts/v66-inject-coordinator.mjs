/**
 * app.js 読込ページへ ring-browse-coordinator.js を挿入（未挿入のみ）
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const tag = '<script src="ring-browse-coordinator.js?v=20261125-v65"></script>';
const files = fs.readdirSync(root).filter((n) => n.endsWith('.html') && n !== 'ring-sync-test.html' && n !== 'ring-history-list-test.html');
let n = 0;
for (const name of files) {
  let html = fs.readFileSync(path.join(root, name), 'utf8');
  if (!html.includes('app.js?v=') || html.includes('ring-browse-coordinator.js')) continue;
  html = html.replace(
    /(<script src="app\.js\?v=[^"]+"[^>]*><\/script>)/i,
    '$1\n  ' + tag
  );
  fs.writeFileSync(path.join(root, name), html);
  n++;
}
console.log('Injected coordinator into', n, 'HTML files');