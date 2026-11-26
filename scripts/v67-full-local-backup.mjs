/** develop/v67 作業ツリー復元用バックアップ（上書き禁止・コミットなし） */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const dest = path.join(root, 'dev', 'backups', `v67-2-final-${stamp}`);
fs.mkdirSync(dest, { recursive: true });

let porcelain = '';
try {
  porcelain = execSync('git status --porcelain', { cwd: root, encoding: 'utf8' });
} catch { /* ignore */ }

const rels = new Set();
for (const line of porcelain.split(/\r?\n/).filter(Boolean)) {
  const rel = line.slice(3).trim().replace(/^"/, '').replace(/"$/, '');
  if (rel.includes(' -> ')) continue;
  rels.add(rel);
}

const extra = [
  'app.js', 'common.css', 'theme.js', 'service-worker.js', 'login.html', 'vehicles.html',
  'user_home.html', 'factory_home.html', 'dealer_home.html', 'car_add.html', 'maintenance_input.html',
  'vehicle_info.html', 'user_history.html', 'user_mypage.html',
  'dev/ui-design-audit-v67-2/capture-v67-2-final.mjs', 'dev/ui-design-audit-v67-2/capture-final-manifest.json'
];
extra.forEach((f) => rels.add(f));

const manifest = { at: new Date().toISOString(), branch: 'develop/v67', files: [] };
for (const rel of rels) {
  const src = path.join(root, rel);
  if (!fs.existsSync(src) || !fs.statSync(src).isFile()) continue;
  const out = path.join(dest, rel);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.copyFileSync(src, out);
  manifest.files.push(rel);
}

try {
  manifest.gitDiffStat = execSync('git diff --stat', { cwd: root, encoding: 'utf8', maxBuffer: 2e6 });
} catch { manifest.gitDiffStat = ''; }

fs.writeFileSync(path.join(dest, 'BACKUP_MANIFEST.json'), JSON.stringify(manifest, null, 2));
console.log('Backup:', dest, 'files:', manifest.files.length);