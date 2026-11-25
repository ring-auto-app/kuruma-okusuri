import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const port = Number(process.env.PORT || 17896);
http.createServer((req, res) => {
  let u = decodeURIComponent(req.url.split('?')[0]);
  if (u === '/') u = '/ring-history-list-test.html';
  const fp = path.join(root, u.replace(/^\//, ''));
  if (!fp.startsWith(root) || !fs.existsSync(fp)) {
    res.writeHead(404);
    res.end('404');
    return;
  }
  res.writeHead(200);
  res.end(fs.readFileSync(fp));
}).listen(port, () => console.log('SERVE', port, root));