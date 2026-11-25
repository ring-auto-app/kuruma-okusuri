/**
 * ring-history-list 390px 実ブラウザ検証（Cursor/Chrome + ローカル HTTP）
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 17897;

function serve(req, res) {
  const url = decodeURIComponent(req.url.split('?')[0]);
  const rel = url === '/' ? '/ring-history-list-test.html' : url;
  const fp = path.join(root, rel.replace(/^\//, ''));
  if (!fp.startsWith(root) || !fs.existsSync(fp)) {
    res.writeHead(404);
    res.end('404');
    return;
  }
  res.writeHead(200, { 'Content-Type': 'text/html;charset=utf-8' });
  res.end(fs.readFileSync(fp));
}

const server = http.createServer(serve);
await new Promise((r) => server.listen(PORT, r));

const chromePaths = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  process.env.LOCALAPPDATA + '\\Google\\Chrome\\Application\\chrome.exe'
].filter(Boolean);
const exe = chromePaths.find((p) => fs.existsSync(p));

let pass = false;
let detail = 'no chrome';

if (exe) {
  try {
    const puppeteer = await import('puppeteer-core');
    const browser = await puppeteer.default.launch({ executablePath: exe, headless: 'new', args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.setViewport({ width: 390, height: 844 });
    await page.goto('http://127.0.0.1:' + PORT + '/', { waitUntil: 'networkidle0' });
    const init = await page.evaluate(() => {
      const m = window.__ringHistSmoke && window.__ringHistSmoke.ctrl && window.__ringHistSmoke.ctrl.metrics;
      return m ? { dom: m.lastDomNodes, visible: m.lastVisible } : null;
    });
    pass = !!(init && init.dom === 10 && init.visible === 10);
    detail = JSON.stringify(init);
    await browser.close();
  } catch (e) {
    detail = String(e.message || e);
  }
}

server.close();
console.log(pass ? 'PASS browser 390px init ' + detail : 'FAIL ' + detail);
process.exit(pass ? 0 : 1);