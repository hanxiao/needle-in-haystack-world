// P1 verification on re-frozen build: mobile DPR, night, bed, minimap, HUD contrast, camera clipping.
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
const logs = [];
const reqs = [];
const result = { shots: {}, mobile: {}, hud: {}, logs, requests: reqs };

async function newPage(vp) {
  const page = await browser.newPage();
  await page.bringToFront();
  page.on('console', (m) => { if (m.type() !== 'debug') logs.push(`[${m.type()}] ${m.text()}`); });
  page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
  page.on('request', (r) => reqs.push(r.url()));
  await page.setViewport(vp);
  await page.goto(URL, { waitUntil: 'networkidle0', timeout: 60000 });
  await page.waitForFunction('window.__APP__ && window.__APP__.ready===true', { timeout: 60000 });
  await wait(2400);
  return page;
}

async function snap(page, name) {
  await page.screenshot({ path: `${OUT}/v-${name}.png` });
  result.shots[name] = await page.evaluate(() => {
    const A = window.__APP__;
    return { cam: A.qa.cameraInfo(), room: A.state().room, hud: A.qa.hudText(), draw: A.state().drawCalls, fps: A.fps, errors: A.state().errors, night: A.state().night };
  });
}
async function fp(page, name, x, z, tx, tz, pitch = -0.05) {
  const yaw = yawTo(x, z, tx, tz);
  await page.evaluate((x, z, yaw, pitch) => { const A = window.__APP__; A.qa.teleport(x, z, yaw); A.qa.look(yaw, pitch); }, x, z, yaw, pitch);
  await wait(750);
  await snap(page, name);
}
async function tp(page, name, x, z, tx, tz, pitch = 0.18, dist = 1.2) {
  const yaw = yawTo(x, z, tx, tz);
  await page.evaluate((x, z, yaw, pitch, dist) => { const A = window.__APP__; A.qa.teleport(x, z, yaw); A.qa.setView('third'); A.qa.setCamera(yaw, pitch, dist); }, x, z, yaw, pitch, dist);
  await wait(750);
  await snap(page, name);
}

// ---------------- desktop
const page = await newPage({ width: 1440, height: 900, deviceScaleFactor: 1 });
await snap(page, 'spawn-default');
// HUD rects (minimap / hint / panels / label)
result.hud = await page.evaluate(() => {
  const r = (id) => { const e = document.getElementById(id); const b = e.getBoundingClientRect(); return { x: +b.x.toFixed(1), y: +b.y.toFixed(1), w: +b.width.toFixed(1), h: +b.height.toFixed(1), text: e.textContent }; };
  const panels = [...document.querySelectorAll('.hud-cam')].map((e) => { const b = e.getBoundingClientRect(); return { k: e.dataset.cam, x: +b.x.toFixed(1), y: +b.y.toFixed(1), w: +b.width.toFixed(1), h: +b.height.toFixed(1) }; });
  return { room: r('hud-room-name'), hint: r('hud-hint'), map: r('hud-map'), panels, mapHTML: document.getElementById('hud-map').innerHTML.slice(0, 600), vw: innerWidth, vh: innerHeight };
});
// living + kitchen sanity
await fp(page, 'living-fp-a', -1.1, -0.6, -3.6, -2.3);
await fp(page, 'kitchen-fp-b', 4.6, -1.6, 2.2, -3.3);
// windows day
await fp(page, 'win-day', -3.5, -1.0, -3.5, -3.8, 0.30);
// bed (rework)
await fp(page, 'bed-fp-a', -2.3, 2.0, -4.3, 2.7);
await fp(page, 'bed-fp-b', -2.6, 3.25, -4.6, 2.5);
await tp(page, 'bed-tp', -3.6, 2.0, -4.5, 3.0, 0.22, 1.15);
// camera-clipping regression poses (same as old failing shots)
await tp(page, 'clip-bed', -2.95, 2.35, -4.3, 2.7, 0.17, 1.4);
await tp(page, 'clip-study', 3.2, 1.25, 4.2, 3.35, 0.16, 1.35);
await tp(page, 'clip-bath', 1.0, 1.35, 1.7, 3.3, 0.15, 1.25);
await tp(page, 'clip-hall', -0.45, 2.9, -0.45, 0.3, 0.12, 1.15);
// night
await page.evaluate(() => window.__APP__.qa.reset());
await wait(800);
await page.evaluate(() => window.__APP__.qa.setNight(true));
await wait(1200);
await snap(page, 'night-spawn');
await fp(page, 'night-win', -3.5, -1.0, -3.5, -3.8, 0.30);
await fp(page, 'night-living', -1.1, -0.6, -3.6, -2.3);
await tp(page, 'night-bed', -3.6, 2.0, -4.5, 3.0, 0.22, 1.15);
await page.evaluate(() => window.__APP__.qa.setNight(false));
await wait(600);

// ---------------- wide
const wide = await newPage({ width: 1920, height: 1080, deviceScaleFactor: 1 });
await snap(wide, 'wide-spawn');
await wide.close();

// ---------------- mobile DPR1 + DPR2
for (const [name, dpr] of [['mobile-dpr2', 2], ['mobile-dpr1', 1]]) {
  const mob = await newPage({ width: 390, height: 844, deviceScaleFactor: dpr });
  await snap(mob, name);
  result.mobile[name] = await mob.evaluate(() => {
    const r = (id) => { const e = document.getElementById(id); const b = e.getBoundingClientRect(); return { x: +b.x.toFixed(1), y: +b.y.toFixed(1), w: +b.width.toFixed(1), h: +b.height.toFixed(1), text: e.textContent }; };
    const panels = [...document.querySelectorAll('.hud-cam')].map((e) => { const b = e.getBoundingClientRect(); return { k: e.dataset.cam, x: +b.x.toFixed(1), y: +b.y.toFixed(1), w: +b.width.toFixed(1), h: +b.height.toFixed(1) }; });
    const hint = r('hud-hint');
    const overlaps = panels.map((p) => ({ k: p.k, ox: +Math.max(0, Math.min(p.x + p.w, hint.x + hint.w) - Math.max(p.x, hint.x)).toFixed(1), oy: +Math.max(0, Math.min(p.y + p.h, hint.y + hint.h) - Math.max(p.y, hint.y)).toFixed(1) })).filter((o) => o.ox > 0 && o.oy > 0);
    return { hint, panels, map: r('hud-map'), room: r('hud-room-name'), overlaps, scrollW: document.documentElement.scrollWidth, dpr: devicePixelRatio, inner: [innerWidth, innerHeight], cam: window.__APP__.qa.cameraInfo(), fps: window.__APP__.fps };
  });
  await mob.close();
}

result.final = await page.evaluate(() => ({ fps: window.__APP__.fps, draw: window.__APP__.qa.drawCalls(), errors: window.__APP__.state().errors }));
writeFileSync('qa/visual/verify.json', JSON.stringify(result, null, 1));
console.log(JSON.stringify({ shots: Object.keys(result.shots).length, logs, requests: [...new Set(reqs)], final: result.final, hudMap: result.hud.mapHTML.slice(0, 200) }, null, 1));
await browser.close();
