// Visual QA capture (final): rooms robot-scale, HUD, night, FP, held, mobile, wide.
// Usage: node qa/visual/capture.mjs [url] [tag]
import puppeteer from 'puppeteer-core';
import { mkdirSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

const URL = process.argv[2] || 'http://127.0.0.1:4182/';
const TAG = process.argv[3] || 'f';
const OUT = 'qa/visual/shots';
mkdirSync(OUT, { recursive: true });

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const ARGS = ['--no-sandbox', '--use-gl=angle', '--use-angle=metal', '--enable-gpu', '--hide-scrollbars'];
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const buildSha = createHash('sha256').update(readFileSync('qa/frozen/index.html')).digest('hex').slice(0, 16);

function yawTo(x, z, tx, tz) {
  return Math.atan2(-(tx - x), -(tz - z));
}

const metrics = { tag: TAG, url: URL, buildSha, shots: {}, console: [], requests: [], pages: {} };
const logs = metrics.console;
const net = metrics.requests;

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: [...ARGS, '--window-size=1440,900'],
  defaultViewport: { width: 1440, height: 900, deviceScaleFactor: 1 },
});

async function newPage(vp) {
  const page = await browser.newPage();
  await page.bringToFront();
  page.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`));
  page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
  page.on('request', (r) => net.push(r.url()));
  await page.setViewport(vp);
  await page.goto(URL, { waitUntil: 'networkidle0', timeout: 60000 });
  await page.waitForFunction('window.__APP__ && window.__APP__.ready===true', { timeout: 60000 });
  await wait(2400);
  return page;
}

// pixel stats straight from the WebGL backbuffer (same pixels the player sees)
const SAMPLE = `(rect) => {
  const R = window.__APP__.renderer, gl = R.getContext(), dpr = R.getPixelRatio();
  const x = Math.round(rect.x*dpr), y = Math.round((window.innerHeight-rect.y-rect.h)*dpr);
  const w = Math.max(1,Math.round(rect.w*dpr)), h = Math.max(1,Math.round(rect.h*dpr));
  const buf = new Uint8Array(w*h*4);
  gl.readPixels(x,y,w,h,gl.RGBA,gl.UNSIGNED_BYTE,buf);
  let s=0, lit=0, uniq=new Set();
  for (let i=0;i<buf.length;i+=4){ const v=(buf[i]+buf[i+1]+buf[i+2])/3; s+=v; if(v>18)lit++; uniq.add((buf[i]>>3)+','+(buf[i+1]>>3)+','+(buf[i+2]>>3)); }
  return { mean:+(s/(w*h)).toFixed(1), litRatio:+(lit/(w*h)).toFixed(3), colors:uniq.size, w, h };
}`;

async function camOk(page) {
  return page.evaluate(() => {
    const c = window.__APP__.qa.cameraInfo();
    return !!c && c.pos && c.pos.every((v) => Number.isFinite(v));
  });
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
  const rect = opts.rect || { x: 0, y: 0, w: 1440, h: 900 };
  m.px = await page.evaluate(`(${SAMPLE})(${JSON.stringify(rect)})`);
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

async function shot(page, name, opts = {}) {
  if (!(await camOk(page))) {
    // camera went NaN: force a re-init and retry once
    await page.evaluate(() => { const A = window.__APP__; const c = A.qa.cameraInfo(); A.qa.setCamera(0, 0.34, 1.75); });
    await wait(600);
    metrics.shots[name] = { ...(metrics.shots[name] || {}), retried: true };
  }
  await page.screenshot({ path: `${OUT}/${TAG}-${name}.png` });
  await snap(page, name, opts);
}

async function pose(page, x, z, look, mode = 'third', pitch = 0.16, dist = 1.35) {
  const yaw = yawTo(x, z, look[0], look[1]);
  await page.evaluate((x, z, yaw, mode, pitch, dist) => {
    const A = window.__APP__;
    A.qa.teleport(x, z, yaw);
    if (mode === 'first') A.qa.look(yaw, -0.05);
    else { A.qa.setView('third'); A.qa.setCamera(yaw, pitch, dist); }
  }, x, z, yaw, mode, pitch, dist);
  await wait(700);
}

// ---------------------------------------------------------------- main page
const page = await newPage({ width: 1440, height: 900, deviceScaleFactor: 1 });
metrics.pages.desktop = { vw: 1440, vh: 900 };

// 1. default spawn
await page.screenshot({ path: `${OUT}/${TAG}-spawn-default.png` });
await snap(page, 'spawn-default', { hudSamples: true });

// 2. rooms at robot scale: 2 third-person low + 1 first-person each
const ROOM_SHOTS = [
  ['liv-a-sofa', -3.6, -1.2, -2.5, -2.75, 'third', 0.15, 1.45],
  ['liv-b-window', -1.35, -0.75, -4.6, -2.3, 'third', 0.14, 1.5],
  ['liv-fp', -1.2, -0.5, -3.6, -2.2, 'first', 0, 0],
  ['kit-a-counter', 1.5, -1.7, 3.0, -3.3, 'third', 0.16, 1.4],
  ['kit-b-dining', 3.5, -2.6, 2.0, -0.7, 'third', 0.16, 1.5],
  ['kit-fp', 1.6, -0.6, 3.2, -3.2, 'first', 0, 0],
  ['bed-a-bed', -2.95, 2.35, -4.3, 2.7, 'third', 0.17, 1.4],
  ['bed-b-corner', -2.55, 1.55, -4.6, 3.1, 'third', 0.18, 1.4],
  ['bed-fp', -2.3, 1.9, -4.3, 2.8, 'first', 0, 0],
  ['hall-a-front', -0.45, 1.25, -0.55, 3.75, 'third', 0.12, 1.15],
  ['hall-b-back', -0.45, 2.9, -0.45, 0.3, 'third', 0.12, 1.15],
  ['hall-fp', -0.45, 1.5, -0.55, 3.78, 'first', 0, 0],
  ['bath-a-tub', 1.0, 1.35, 1.7, 3.3, 'third', 0.15, 1.25],
  ['bath-b-vanity', 1.25, 2.5, 2.5, 1.9, 'third', 0.15, 1.25],
  ['bath-fp', 1.0, 1.5, 1.75, 3.15, 'first', 0, 0],
  ['stu-a-desk', 3.2, 1.25, 4.2, 3.35, 'third', 0.16, 1.35],
  ['stu-b-shelves', 4.9, 2.9, 3.0, 1.6, 'third', 0.16, 1.35],
  ['stu-fp', 3.3, 2.0, 4.3, 3.35, 'first', 0, 0],
  // window / exterior treatment
  ['win-living', -4.6, -1.6, -4.9, -3.6, 'first', 0, 0],
  ['win-kitchen', 3.3, -2.4, 3.4, -3.6, 'first', 0, 0],
  ['win-bedroom', -4.4, 2.0, -4.4, 3.6, 'first', 0, 0],
  // doorways
  ['door-hall-bed', -0.6, 3.1, -2.4, 3.1, 'first', 0, 0],
  ['door-hall-bath', -0.4, 1.45, 1.8, 1.45, 'first', 0, 0],
  ['door-kit-study', 4.0, -0.1, 4.0, 1.8, 'first', 0, 0],
  ['door-living-hall', -0.5, -0.4, -0.45, 2.2, 'first', 0, 0],
  ['door-front', -0.55, 2.2, -0.55, 3.78, 'first', 0, 0],
];
for (const [name, x, z, tx, tz, mode, pitch, dist] of ROOM_SHOTS) {
  await pose(page, x, z, [tx, tz], mode, pitch, dist);
  await shot(page, name);
}

// 3. night
await page.evaluate(() => window.__APP__.qa.reset());
await wait(900);
await page.evaluate(() => window.__APP__.qa.setNight(true));
await wait(1200);
await shot(page, 'night-spawn', { hudSamples: true });
await pose(page, -1.35, -0.75, -4.6, -2.3, 'third', 0.14, 1.5);
await shot(page, 'night-living');
await pose(page, 1.5, -1.7, 3.0, -3.3, 'third', 0.16, 1.4);
await shot(page, 'night-kitchen');
await pose(page, -2.95, 2.35, -4.3, 2.7, 'third', 0.17, 1.4);
await shot(page, 'night-bedroom');
await page.evaluate(() => window.__APP__.qa.setNight(false));
await wait(800);

// 4. first person at spawn + held / placed
await page.evaluate(() => { const A = window.__APP__; A.qa.teleport(-3.6, -1.2, 0); A.qa.look(0, -0.07); });
await wait(800);
await shot(page, 'fp-spawn');

await page.evaluate(() => { const A = window.__APP__; A.qa.setView('third'); A.qa.teleportNear('mug_white', 0.4); });
await wait(900);
metrics.grab = await page.evaluate(() => window.__APP__.qa.grabByName('mug_white'));
await wait(800);
await shot(page, 'held-mug');
await page.evaluate(() => window.__APP__.qa.action());
await wait(1100);
await shot(page, 'placed-mug');
await page.evaluate(() => { const A = window.__APP__; A.qa.teleportNear('needle', 0.34); });
await wait(900);
await shot(page, 'needle-near');

// 5. wide
const wide = await newPage({ width: 1920, height: 1080, deviceScaleFactor: 1 });
metrics.pages.wide = { vw: 1920, vh: 1080 };
await wide.screenshot({ path: `${OUT}/${TAG}-wide-spawn.png` });
await snap(wide, 'wide-spawn', { hudSamples: true, rect: { x: 0, y: 0, w: 1920, h: 1080 } });
await wide.close();

// 6. mobile 390x844 @dpr2 (and dpr1 control)
for (const [name, dpr] of [['mobile', 2], ['mobile-dpr1', 1]]) {
  const mob = await newPage({ width: 390, height: 844, deviceScaleFactor: dpr });
  metrics.pages[name] = { vw: 390, vh: 844, dpr };
  await mob.screenshot({ path: `${OUT}/${TAG}-${name}-spawn.png` });
  await snap(mob, `${name}-spawn`, { hudSamples: true, rect: { x: 0, y: 0, w: 390, h: 844 } });
  metrics[name] = await mob.evaluate(() => ({
    innerW: innerWidth, innerH: innerHeight,
    scrollW: document.documentElement.scrollWidth, scrollH: document.documentElement.scrollHeight,
    hudRects: window.__APP__.qa.hudRects(), hud: window.__APP__.qa.hudText(),
    hintRect: (() => { const e = document.getElementById('hud-hint'); const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height, text: e.textContent }; })(),
    roomRect: (() => { const e = document.getElementById('hud-room-name'); const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; })(),
    mapRect: (() => { const e = document.getElementById('hud-map'); const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; })(),
  }));
  await mob.evaluate(() => { const A = window.__APP__; A.qa.teleport(-3.6, -1.2, 0); A.qa.look(0, -0.07); });
  await wait(800);
  await mob.screenshot({ path: `${OUT}/${TAG}-${name}-fp.png` });
  await snap(mob, `${name}-fp`, { rect: { x: 0, y: 0, w: 390, h: 844 } });
  await mob.close();
}

metrics.final = await page.evaluate(() => ({ fps: window.__APP__.fps, draw: window.__APP__.qa.drawCalls(), state: window.__APP__.state() }));
writeFileSync(`qa/visual/${TAG}-metrics.json`, JSON.stringify(metrics, null, 1));
console.log(JSON.stringify({ buildSha, shots: Object.keys(metrics.shots).length, logs, requests: [...new Set(net)], final: metrics.final && metrics.final.draw }, null, 1));
await browser.close();
