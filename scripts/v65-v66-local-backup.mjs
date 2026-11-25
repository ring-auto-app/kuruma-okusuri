/**
 * v65/v66 ローカル差分バックアップ（Git コミットなしの保存地点）
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
const dest = path.join(root, 'ads', 'deploy-prep', 'local-backups', 'v65-v66_' + stamp);
const files = [
  'app.js', 'ring-history-list.js', 'ring-browse-warmup.js', 'ring-browse-coordinator.js',
  'owner-platform-ui.js', 'service-worker.js', 'history.html', 'user_history.html', 'user_home.html'
];
fs.mkdirSync(dest, { recursive: true });
for (const f of files) {
  const fp = path.join(root, f);
  if (fs.existsSync(fp)) fs.copyFileSync(fp, path.join(dest, f));
}
console.log('Backup written:', dest, files.length, 'files');