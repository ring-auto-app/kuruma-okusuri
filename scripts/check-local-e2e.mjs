// Local diagnostics only. The listener is bound to loopback and closed immediately.
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
let failed = false;
async function check(name, run) {
  try { const result = await run(); console.log('OK', name, result || ''); }
  catch (error) { failed = true; console.error('CHECK', name, error.message); }
}
await check('Node', () => {
  if (typeof WebSocket !== 'function' || typeof fetch !== 'function') throw Error('Use Node with global fetch and WebSocket (e.g. Node 24)');
  return process.version;
});
await check('Local GAS + fixtures', () => {
  for (const file of ['ads/gas-complete-Code.gs','ads/tests/run-selftests.ps1','ads/tests/owner-platform-fixture.mjs','ads/tests/owner-platform-browser-selftest.mjs']) {
    fs.accessSync(path.join(root, file), fs.constants.R_OK);
  }
});
await check('Playwright and Chromium for owner tests', () => {
  let lib;
  if (process.env.RING_PLAYWRIGHT) lib = require(process.env.RING_PLAYWRIGHT);
  else {
    try { lib = require('playwright'); }
    catch { lib = require(path.join(process.env.USERPROFILE || '', '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')); }
  }
  const system = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
  const chrome = process.env.RING_TEST_CHROME || (fs.existsSync(system) ? system : lib.chromium.executablePath());
  fs.accessSync(chrome, fs.constants.R_OK);
  return chrome;
});
await check('Historical SW objects', () => {
  for (const rev of ['e6352d0', 'eeec46f', '006de35', '67b2733']) execFileSync('git', ['cat-file','-e',rev+'^{commit}'],{cwd:root});
});
await check('Loopback for Fleet/SW/PDF tests', () => new Promise((resolve,reject) => {
  const server=net.createServer();
  server.once('error', reject);
  server.listen(0, '127.0.0.1', () => server.close(error => error ? reject(error) : resolve('ephemeral port')));
}));
process.exitCode=failed ? 1 : 0;
