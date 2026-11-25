/**
 * 実ブラウザ IndexedDB 重点テスト（v64 パターン: ローカル HTTP + Chrome）
 */
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const chrome = process.env.RING_TEST_CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = 8771;

if (!fs.existsSync(chrome)) {
  console.log('SKIP: Chrome not found (RING_TEST_CHROME)');
  process.exit(2);
}

const server = http.createServer((req, res) => {
  const u = new URL(req.url, 'http://127.0.0.1');
  let rel = decodeURIComponent(u.pathname).replace(/^\//, '') || 'ring-sync-test.html';
  const target = path.resolve(root, rel.split('?')[0]);
  if (!target.startsWith(root + path.sep) || !fs.existsSync(target)) {
    res.writeHead(404); res.end(); return;
  }
  const ext = path.extname(target);
  res.setHeader('Content-Type', ({ '.html': 'text/html; charset=utf-8', '.js': 'text/javascript' }[ext] || 'application/octet-stream'));
  res.setHeader('Cache-Control', 'no-store');
  res.end(fs.readFileSync(target));
});

function runChrome(url) {
  return new Promise((resolve, reject) => {
    const outFile = path.join(root, '.tmp-ring-sync-chrome-out.json');
    try { fs.unlinkSync(outFile); } catch (e) { /* ignore */ }
    const script = `
      const CDP = await import('chrome-remote-interface').catch(() => null);
      if (!CDP) process.exit(3);
      const client = await CDP({ target: 'ws://127.0.0.1:9222' });
      process.exit(4);
    `;
    const args = [
      '--headless=new', '--disable-gpu', '--no-sandbox',
      '--virtual-time-budget=25000',
      url
    ];
    const child = spawn(chrome, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stderr = '';
    child.stderr.on('data', (d) => { stderr += d; });
    child.on('exit', (code) => {
      resolve({ code, stderr });
    });
    setTimeout(() => { try { child.kill(); } catch (e) { /* ignore */ } resolve({ code: null, stderr, timeout: true }); }, 45000);
  });
}

async function runWithPuppeteer(url) {
  let puppeteer;
  try {
    puppeteer = await import('puppeteer-core');
  } catch (e) {
    return null;
  }
  const browser = await puppeteer.launch({
    executablePath: chrome,
    headless: true,
    args: ['--no-sandbox', '--disable-gpu']
  });
  try {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 60000 });
    await page.waitForFunction('window.__ringSyncTestDone && window.__ringSyncTestDone.tests', { timeout: 45000 });
    return await page.evaluate(() => window.__ringSyncTestDone);
  } finally {
    await browser.close();
  }
}

await new Promise((resolve) => server.listen(PORT, '127.0.0.1', resolve));
const url = 'http://127.0.0.1:' + PORT + '/ring-sync-test.html';
console.log('URL', url);
const result = await runWithPuppeteer(url);
server.close();
if (!result) {
  console.log('SKIP: puppeteer-core not available — use ring-sync-test.html 手動 or install puppeteer-core');
  process.exit(2);
}
console.log(JSON.stringify(result, null, 2));
const failed = (result.tests || []).filter((t) => !t.ok);
if (!result.ok || failed.length) process.exit(1);
console.log('browser idb deep: ALL PASS');