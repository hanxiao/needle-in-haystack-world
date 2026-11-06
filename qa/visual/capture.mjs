// Visual QA capture: rooms (robot-scale eye level), HUD, night, FP, held, mobile, wide.
// Usage: node qa/visual/capture.mjs [url] [outDir] [tag]
import puppeteer from 'puppeteer-core';
import { mkdirSync, writeFileSync } from 'node:fs';

const URL = process.argv[2] || 'http://127.0.0.1:4182/';
const OUT = process.argv[3] || 'qa/visual/shots';
const TAG = process.argv[4] || 'r1';
mkdirSync(OUT, { recursive: true });

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const ARGS = ['--no-sandbox', '--use-gl=angle', '--use-angle=metal', '--enable-gpu', '--hide-scrollbars'];
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function yawTo(x, z, tx, tz) {
  return Math.atan2(-(tx - x), -(tz - z));
}

// expose a luminance histogram + clipped fractions for the main canvas
const HIST_FN = `(rect) => {
  const R = window.__APP__.renderer;
  const gl = R.getContext();
  const dpr = R.getPixelRatio();
  const x = Math.round(rect.x * dpr);
  const y = Math.round((window.innerHeight - rect.y - rect.h) * dpr);
  const w = Math.max(1, Math.round(rect.w * dpr));
  const h = Math.max(1, Math.round(rect.h * dpr));
  const buf = new Uint8Array(w * h * 4);
  gl.readPixels(x, y, w, h, gl.RGBA, gl.UNSIGNED_BYTE, buf);
  const lum = new Uint8Array(w * h);
  let clipHi = 0, clipLo = 0, sum = 0;
  for (let i = 0, j = 0; i < buf.length; i += 4, j++) {
    const v = Math.round(0.2126 * buf[i] + 0.7152 * buf[i + 1] + 0.0722 * buf[i + 2]);
    lum[j] = v; sum += v;
    if (v >= 250) clipHi++;
    if (v <= 6) clipLo++;
  }
  const sorted = Array.from(lum).sort((a, b) => a - b);
  const q = (p) => sorted[Math.min(sorted.length - 1, Math.floor(p * (sorted.length - 1)))];
  return { n: w * h, mean: +(sum / (w * h)).toFixed(1), p1: q(0.01), p5: q(0.05), p50: q(0.5), p95: q(0.95), p99: q(0.99), clipHiPct: +(100 * clipHi / (w * h)).toFixed(2), clipLoPct: +(100 * clipLo / (w * h)).toFixed(2) };
}`;

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: [...ARGS, '--window-size=1440,900'],
  defaultViewport: { width: 1440, height: 900, deviceScaleFactor: 1 },
});

const logs = [];
const net = [];
const metrics = { tag: TAG, url: URL, shots: {}, console: logs, requests: net, pages: {} };

async function newPage(vp) {
  const page = await browser.newPage();
  page.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`));
  page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
  page.on('request', (r) => net.push(r.url()));
  await page.setViewport(vp);
  await page.goto(URL, { waitUntil: 'networkidle0', timeout: 60000 });
  await page.waitForFunction('window.__APP__ && window.__APP__.ready===true', { timeout: 60000 });
  await wait(2200);
  return page;
}

async function shot(page, name, extra = {}) {
  await page.screenshot({ path: `${OUT}/${TAG}-${name}.png` });
  if (extra.hist) {
    const rect = { x: 0, y: 0, w: 1440, h: 900 };
    const hist = await page.evaluate(`(${HIST_FN})(${JSON.stringify(rect)})`);
    metrics.shots[name] = { ...(metrics.shots[name] || {}), hist };
  }
}

async function snap(page, name, opts = {}) {
  const m = await page.evaluate(() => {
    const A = window.__APP__;
    const s = A.state();
    return {
      room: s.room, fps: s.fps, drawCalls: s.drawCalls, triangles: s.triangles,
      robot: s.robot, night: s.night, surround: s.surround, held: s.robot.held,
      cam: A.qa.cameraInfo(), hud: A.qa.hudText(), errors: s.errors,
    };
  });
  metrics.shots[name] = { ...(metrics.shots[name] || {}), ...m };
  const bad = !m.cam || !m.cam.pos || m.cam.pos.some((v) => !Number.isFinite(v));
  if (bad) metrics.shots[name].cameraNaN = true;
  if (opts.hudSamples) {
    const rects = await page.evaluate(() => window.__APP__.qa.hudRects());
    const samples = {};
    for (const p of rects.panels) samples[p.key] = await page.evaluate((r) => window.__APP__.qa.sampleHud(r), p);
    samples.map = await page.evaluate((r) => window.__APP__.qa.sampleHud(r), rects.map);
    metrics.shots[name].hudSamples = samples;
    metrics.shots[name].hudRects = rects;
  }
  return m;
}

async function pose(page, x, z, look, mode = 'third', pitch = 0.16, dist = 1.3) {
  const yaw = yawTo(x, z, look[0], look[1]);
  await page.evaluate((x, z, yaw, mode, pitch, dist) => {
    const A = window.__APP__;
    A.qa.teleport(x, z, yaw);
    if (mode === 'first') A.qa.look(yaw, -0.06);
    else { A.qa.setView('third'); A.qa.setCamera(yaw, pitch, dist); }
  }, x, z, yaw, mode, pitch, dist);
  await wait(650);
}

// ---------------------------------------------------------------- main page
const page = await newPage({ width: 1440, height: 900, deviceScaleFactor: 1 });

// 1. default spawn view (untouched)
await shot(page, 'spawn-default', { hist: true });
await snap(page, 'spawn-default', { hudSamples: true });

// 2. HUD crops from the default frame
// HUD crops are produced by PIL from the full frames (Chrome clip screenshots freeze the WebGL layer).

// 3. rooms, robot-scale eye level
const ROOM_SHOTS = [
  ['liv-sofa', -3.6, -1.2, -2.5, -2.75, 'third', 0.16, 1.25],
  ['liv-window', -1.7, -0.9, -5.0, -2.0, 'third', 0.14, 1.35],
  ['liv-fp', -4.7, -2.2, -2.5, -1.4, 'first', 0, 0],
  ['kit-counter', 1.25, -1.25, 2.9, -3.4, 'third', 0.15, 1.3],
  ['kit-dining', 3.05, -2.55, 2.15, -0.7, 'third', 0.16, 1.3],
  ['kit-fp', 2.5, -2.2, 3.9, -3.4, 'first', 0, 0],
  ['bed-bed', -2.7, 2.55, -4.15, 2.6, 'third', 0.15, 1.3],
  ['bed-corner', -5.0, 1.25, -3.4, 2.6, 'third', 0.16, 1.3],
  ['bed-fp', -2.95, 2.15, -4.2, 2.7, 'first', 0, 0],
  ['hall-front', -0.45, 1.0, -0.55, 3.75, 'third', 0.12, 1.1],
  ['hall-back', -0.45, 2.95, -0.45, 0.2, 'third', 0.12, 1.1],
  ['hall-fp', -0.45, 2.35, -0.55, 3.78, 'first', 0, 0],
  ['bath-tub', 0.95, 1.2, 1.7, 3.3, 'third', 0.14, 1.2],
  ['bath-vanity', 1.15, 2.35, 2.5, 1.85, 'third', 0.14, 1.2],
  ['bath-fp', 1.05, 1.35, 1.8, 3.2, 'first', 0, 0],
  ['stu-desk', 3.05, 1.2, 4.2, 3.3, 'third', 0.15, 1.25],
  ['stu-shelves', 4.85, 2.85, 3.0, 1.6, 'third', 0.15, 1.25],
  ['stu-fp', 3.35, 2.55, 4.3, 3.4, 'first', 0, 0],
  // doorways
  ['door-hall-bed', -0.5, 2.9, -2.2, 2.9, 'first', 0, 0],
  ['door-hall-bath', -0.4, 1.5, 1.6, 1.5, 'first', 0, 0],
  ['door-kit-study', 3.9, -0.2, 4.2, 1.6, 'first', 0, 0],
  ['door-living-hall', -0.6, -0.3, -0.4, 2.0, 'first', 0, 0],
];
for (const [name, x, z, tx, tz, mode, pitch, dist] of ROOM_SHOTS) {
  await page.evaluate(() => window.__APP__.qa.setNight(false));
  await pose(page, x, z, [tx, tz], mode, pitch, dist);
  await shot(page, name, { hist: name.startsWith('liv') || name.startsWith('kit') || name.startsWith('bed') || name.startsWith('bath') || name.startsWith('stu') || name.startsWith('hall') });
  await snap(page, name);
}

// 4. night mode
await page.evaluate(() => window.__APP__.qa.reset());
await wait(900);
await page.evaluate(() => window.__APP__.qa.setNight(true));
await wait(1200);
await shot(page, 'night-spawn', { hist: true });
await snap(page, 'night-spawn', { hudSamples: true });
await pose(page, 1.2, -1.2, 3.0, -3.3, 'third', 0.15, 1.35);
await shot(page, 'night-kitchen', { hist: true });
await snap(page, 'night-kitchen');
await page.evaluate(() => window.__APP__.qa.setNight(false));
await wait(700);

// 5. first-person default (V toggle) at spawn
await page.evaluate(() => { const A = window.__APP__; A.qa.teleport(-3.6, -1.2, 0); A.qa.look(0, -0.08); });
await wait(800);
await shot(page, 'fp-spawn', { hist: true });
await snap(page, 'fp-spawn');

// 6. holding an object, then placing it
await page.evaluate(() => { const A = window.__APP__; A.qa.setView('third'); A.qa.teleportNear('mug_white', 0.36); });
await wait(900);
const grab = await page.evaluate(() => window.__APP__.qa.grabByName('mug_white'));
await wait(800);
await shot(page, 'held-mug', { hist: true });
await snap(page, 'held-mug');
await page.evaluate(() => window.__APP__.qa.action());
await wait(1100);
await shot(page, 'placed-mug', { hist: true });
await snap(page, 'placed-mug');
metrics.grab = grab;

// 7. needle scale check (tiny object next to robot)
await page.evaluate(() => { const A = window.__APP__; A.qa.teleportNear('needle', 0.3); });
await wait(900);
await shot(page, 'needle-near');
await snap(page, 'needle-near');

// 8. wide 1920x1080
const wide = await newPage({ width: 1920, height: 1080, deviceScaleFactor: 1 });
await shot(wide, 'wide-spawn', { hist: true });
await snap(wide, 'wide-spawn', { hudSamples: true });
await wide.close();

// 9. mobile 390x844
const mob = await newPage({ width: 390, height: 844, deviceScaleFactor: 2 });
await shot(mob, 'mobile-spawn', { hist: true });
await snap(mob, 'mobile-spawn', { hudSamples: true });
const mobOverflow = await mob.evaluate(() => ({
  innerW: window.innerWidth, innerH: window.innerHeight,
  scrollW: document.documentElement.scrollWidth, scrollH: document.documentElement.scrollHeight,
  bodyScrollW: document.body.scrollWidth,
  hudRects: window.__APP__.qa.hudRects(),
  hud: window.__APP__.qa.hudText(),
}));
metrics.mobile = mobOverflow;
await mob.evaluate(() => { const A = window.__APP__; A.qa.teleport(-3.6, -1.2, 0); A.qa.look(0, -0.06); });
await wait(700);
await shot(mob, 'mobile-fp', { hist: true });
await snap(mob, 'mobile-fp');
await mob.close();

// 10. summary numbers
metrics.final = await page.evaluate(() => ({
  fps: window.__APP__.fps,
  draw: window.__APP__.qa.drawCalls(),
  state: window.__APP__.state(),
}));
writeFileSync(`qa/visual/${TAG}-metrics.json`, JSON.stringify(metrics, null, 1));
console.log(JSON.stringify({ shots: Object.keys(metrics.shots).length, logs, requests: net.length, final: metrics.final }, null, 1));
await browser.close();
