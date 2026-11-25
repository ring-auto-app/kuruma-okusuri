/**
 * 実ブラウザ IndexedDB 検証（ring-sync-test.html）
 * 実行: node scripts/v65-sync-idb-browser-selftest.mjs
 */

import http from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const PORT = 8769;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json'
};

function serve() {
  return new Promise(function (resolve) {
    var srv = http.createServer(function (req, res) {
      var url = (req.url || '/').split('?')[0];
      if (url === '/') url = '/ring-sync-test.html';
      var file = join(root, '.' + url);
      if (!existsSync(file)) {
        res.statusCode = 404;
        res.end('not found');
        return;
      }
      res.setHeader('Content-Type', MIME[extname(file)] || 'text/plain');
      res.end(readFileSync(file));
    });
    srv.listen(PORT, '127.0.0.1', function () { resolve(srv); });
  });
}

function findChrome() {
  var candidates = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    process.env.LOCALAPPDATA + '\\Google\\Chrome\\Application\\chrome.exe'
  ].filter(Boolean);
  for (var i = 0; i < candidates.length; i++) {
    if (existsSync(candidates[i])) return candidates[i];
  }
  return null;
}

async function runPuppeteer(url) {
  var puppeteer;
  try {
    puppeteer = await import('puppeteer-core');
  } catch (e) {
    return { ok: false, skip: true, reason: 'puppeteer-core not installed' };
  }
  var chrome = findChrome();
  if (!chrome) return { ok: false, skip: true, reason: 'chrome not found' };

  var browser = await puppeteer.launch({
    executablePath: chrome,
    headless: true,
    args: ['--no-sandbox', '--disable-gpu']
  });
  try {
    var page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
    await page.waitForFunction('window.__ringSyncTestDone != null', { timeout: 15000 });
    var result = await page.evaluate(function () { return window.__ringSyncTestDone; });
    var timing = await page.evaluate(function () {
      return document.getElementById('timing') ? document.getElementById('timing').textContent : '';
    });
    return { ok: !!(result && result.ok), result: result, timing: timing, kind: 'browser-chrome-idb' };
  } finally {
    await browser.close();
  }
}

async function main() {
  var srv = await serve();
  var url = 'http://127.0.0.1:' + PORT + '/ring-sync-test.html';
  console.log('SERVE:', url);
  var out = await runPuppeteer(url);
  srv.close();
  if (out.skip) {
    console.log('SKIP browser IDB:', out.reason);
    console.log('NOTE: 手動で ring-sync-test.html をローカルサーバ上で開いてもよい');
    return;
  }
  console.log(JSON.stringify(out, null, 2));
  if (!out.ok) process.exit(1);
}

main().catch(function (e) {
  console.error(e);
  process.exit(1);
});