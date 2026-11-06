// Screenshot + smoke test harness. Usage: node tools/shot.mjs [url] [out.png] [waitMs]
import puppeteer from 'puppeteer-core';
import { existsSync, mkdirSync, readdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const url = process.argv[2] || 'http://127.0.0.1:4173/';
const out = process.argv[3] || 'qa/shots/smoke.png';
const waitMs = Number(process.argv[4] || 4000);

function findChrome() {
  if (process.env.CHROME_PATH && existsSync(process.env.CHROME_PATH)) return process.env.CHROME_PATH;
  const system = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  if (existsSync(system)) return system;
  const cache = join(homedir(), '.cache/puppeteer/chrome');
  if (existsSync(cache)) {
    const dir = readdirSync(cache).sort().pop();
    const p = join(cache, dir, 'chrome-mac-arm64', 'Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing');
    if (existsSync(p)) return p;
  }
  throw new Error('no chrome found; set CHROME_PATH');
}

const executablePath = findChrome();
const browser = await puppeteer.launch({
  executablePath,
  headless: true,
  args: [
    '--no-sandbox',
    '--enable-unsafe-swiftshader',
    '--use-gl=angle',
    '--use-angle=metal',
    '--enable-gpu',
    '--window-size=1440,900',
    '--hide-scrollbars',
  ],
  defaultViewport: { width: 1440, height: 900, deviceScaleFactor: 1 },
});

const page = await browser.newPage();
const logs = [];
page.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`));
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
page.on('requestfailed', (r) => logs.push(`[requestfailed] ${r.url()} ${r.failure()?.errorText}`));

await page.goto(url, { waitUntil: 'networkidle0', timeout: 60000 });
await page.waitForFunction('window.__APP__ && window.__APP__.ready === true', { timeout: 30000 });
await new Promise((r) => setTimeout(r, waitMs));

const info = await page.evaluate(() => ({
  fps: window.__APP__?.fps ?? null,
  bodies: window.__APP__?.bodies ?? null,
  renderer: (() => {
    const c = document.getElementById('scene');
    const gl = c?.getContext('webgl2') || c?.getContext('webgl');
    if (!gl) return null;
    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    return dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
  })(),
  canvas: (() => {
    const c = document.getElementById('scene');
    return c ? { w: c.width, h: c.height } : null;
  })(),
  errors: [...document.querySelectorAll('body *')].length,
}));

mkdirSync(out.split('/').slice(0, -1).join('/') || '.', { recursive: true });
await page.screenshot({ path: out });
await browser.close();
console.log(JSON.stringify({ url, out, info, logs }, null, 2));
