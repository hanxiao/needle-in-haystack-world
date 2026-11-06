// Probe: dump app state, object inventory, HUD layout, render stats.
import puppeteer from 'puppeteer-core';
import { existsSync } from 'node:fs';
import { mkdirSync } from 'node:fs';

const URL = process.argv[2] || 'http://127.0.0.1:4182/';
const OUT = process.argv[3] || 'qa/visual/shots';
mkdirSync(OUT, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=metal', '--enable-gpu', '--window-size=1440,900', '--hide-scrollbars'],
  defaultViewport: { width: 1440, height: 900 },
});
const page = await browser.newPage();
const logs = [];
page.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`));
page.on('pageerror', (e) => logs.push(`[err] ${e.message}`));
page.on('requestfailed', (r) => logs.push(`[reqfail] ${r.url()}`));
await page.goto(URL, { waitUntil: 'networkidle0', timeout: 60000 });
await page.waitForFunction('window.__APP__ && window.__APP__.ready===true', { timeout: 60000 });
await new Promise((r) => setTimeout(r, 2500));

const info = await page.evaluate(() => {
  const A = window.__APP__;
  return {
    state: A.state(),
    cam: A.qa.cameraInfo(),
    hudRects: A.qa.hudRects(),
    hudText: A.qa.hudText(),
    draw: A.qa.drawCalls(),
    sampleMain: A.qa.sampleMain({ x: 0, y: 0, w: 1440, h: 900 }),
    objs: A.qa.objects(),
  };
});
await page.screenshot({ path: `${OUT}/probe-spawn.png` });
console.log(JSON.stringify({ info, logs }, null, 1));
await browser.close();
