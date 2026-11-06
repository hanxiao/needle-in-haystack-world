// Spot-check final polish: night windows, camera push-out, minimap, exposure.
import puppeteer from 'puppeteer-core';
import { writeFileSync } from 'node:fs';

const URL = process.argv[2] || 'http://127.0.0.1:4182/';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const yawTo = (x, z, tx, tz) => Math.atan2(-(tx - x), -(tz - z));
const OUT = 'qa/visual/shots';
const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=metal', '--enable-gpu', '--hide-scrollbars', '--window-size=1440,900'],
  defaultViewport: { width: 1440, height: 900, deviceScaleFactor: 1 },
});
const page = await browser.newPage();
await page.bringToFront();
const logs = [];
page.on('console', (m) => { if (m.type() !== 'debug') logs.push(`[${m.type()}] ${m.text()}`); });
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
const t0 = Date.now();
await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForFunction('window.__APP__ && window.__APP__.ready===true', { timeout: 60000 });
const readyMs = Date.now() - t0;
await wait(2600);
const out = { readyMs, logs, shots: {} };

async function snap(name) {
  await page.screenshot({ path: `${OUT}/${name}.png` });
  out.shots[name] = await page.evaluate(() => ({ cam: window.__APP__.qa.cameraInfo(), room: window.__APP__.state().room, draw: window.__APP__.state().drawCalls, fps: window.__APP__.fps, hud: window.__APP__.qa.hudText() }));
}
async function fp(name, x, z, tx, tz, pitch = -0.05) {
  const yaw = yawTo(x, z, tx, tz);
  await page.evaluate((x, z, yaw, pitch) => { const A = window.__APP__; A.qa.teleport(x, z, yaw); A.qa.look(yaw, pitch); }, x, z, yaw, pitch);
  await wait(750); await snap(name);
}
async function tp(name, x, z, tx, tz, pitch = 0.18, dist = 1.2) {
  const yaw = yawTo(x, z, tx, tz);
  await page.evaluate((x, z, yaw, pitch, dist) => { const A = window.__APP__; A.qa.teleport(x, z, yaw); A.qa.setView('third'); A.qa.setCamera(yaw, pitch, dist); }, x, z, yaw, pitch, dist);
  await wait(750); await snap(name);
}

// day sanity + minimap
await snap('s-spawn-default');
out.hud = await page.evaluate(() => {
  const r = (id) => { const e = document.getElementById(id); const b = e.getBoundingClientRect(); return { x: +b.x.toFixed(1), y: +b.y.toFixed(1), w: +b.width.toFixed(1), h: +b.height.toFixed(1) }; };
  const rects = window.__APP__.qa.hudRects();
  const samples = {};
  for (const p of rects.panels) samples[p.key] = window.__APP__.qa.sampleHud(p);
  samples.map = window.__APP__.qa.sampleHud(rects.map);
  return { hint: r('hud-hint'), map: r('hud-map'), mapHTML: document.getElementById('hud-map').innerHTML.slice(0, 400), samples, draw: window.__APP__.state().drawCalls, fps: window.__APP__.fps, tri: window.__APP__.state().triangles };
});
await fp('s-win-day', -3.5, -1.0, -3.5, -3.8, 0.30);
await fp('s-study-fp', 3.4, 1.6, 4.3, 3.3);
await fp('s-bath-fp', 1.1, 1.3, 1.8, 3.2, 0.05);
// camera push-out regression poses
await tp('s-clip-bed', -2.95, 2.35, -4.3, 2.7, 0.17, 1.4);
await tp('s-clip-study', 3.2, 1.25, 4.2, 3.35, 0.16, 1.35);
await tp('s-clip-bath', 1.0, 1.35, 1.7, 3.3, 0.15, 1.25);
await tp('s-clip-hall', -0.45, 2.9, -0.45, 0.3, 0.12, 1.15);
await tp('s-bed-tp', -3.6, 2.0, -4.5, 3.0, 0.22, 1.15);
// night
await page.evaluate(() => window.__APP__.qa.reset());
await wait(800);
await page.evaluate(() => window.__APP__.qa.setNight(true));
await wait(1300);
await snap('s-night-spawn');
await fp('s-night-win', -3.5, -1.0, -3.5, -3.8, 0.30);
await fp('s-night-living', -1.1, -0.6, -3.6, -2.3);
await page.evaluate(() => window.__APP__.qa.setNight(false));
out.final = await page.evaluate(() => ({ fps: window.__APP__.fps, draw: window.__APP__.state().drawCalls, errors: window.__APP__.state().errors }));
writeFileSync('qa/visual/spot.json', JSON.stringify(out, null, 1));
console.log(JSON.stringify({ readyMs, shots: Object.keys(out.shots).length, logs, final: out.final, hudSamples: Object.fromEntries(Object.entries(out.hud.samples).map(([k, v]) => [k, [+v.litRatio.toFixed(3), +v.mean.toFixed(1)]])) }, null, 1));
await browser.close();
