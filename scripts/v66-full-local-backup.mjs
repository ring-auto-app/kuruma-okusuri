/**
 * ワークツリー全量バックアップ（既存 v65-v66_* は上書きしない）
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const dest = path.join(root, 'ads', 'deploy-prep', 'local-backups', 'v66_full_' + stamp);
fs.mkdirSync(dest, { recursive: true });

let status = '';
try {
  status = execSync('git status --porcelain', { cwd: root, encoding: 'utf8' });
} catch (e) {
  status = '';
}

const lines = status.split(/\r?\n/).filter(Boolean);
const manifest = { at: new Date().toISOString(), files: [] };

function copyRel(rel) {
  const src = path.join(root, rel);
  if (!fs.existsSync(src)) return;
  const out = path.join(dest, rel);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.copyFileSync(src, out);
  manifest.files.push(rel);
}

for (const line of lines) {
  const rel = line.slice(3).replace(/^"/, '').replace(/"$/, '');
  if (rel.includes(' -> ')) continue;
  copyRel(rel);
}

const always = [
  'app.js', 'ring-history-list.js', 'ring-browse-warmup.js', 'ring-browse-coordinator.js',
  'rental-fleet.js', 'owner-platform-ui.js', 'service-worker.js', 'vehicles.html',
  'factory_edit_list.html', 'rental_fleet.html', 'user_home.html', 'factory_home.html', 'dealer_home.html'
];
for (const f of always) copyRel(f);

fs.writeFileSync(path.join(dest, 'MANIFEST.json'), JSON.stringify(manifest, null, 2));
console.log('Backup:', dest, 'files:', manifest.files.length);