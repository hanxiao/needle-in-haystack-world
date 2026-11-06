// Scratch probe: tune thresholds for the real suite.
import puppeteer from 'puppeteer-core';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const URL_BASE = process.env.QA_URL || 'http://127.0.0.1:4181/';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: true,
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=metal', '--enable-gpu', '--window-size=1440,900'],
  defaultViewport: { width: 1440, height: 900 },
});
const page = await browser.newPage();
const logs = [];
page.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`));
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
const t = Date.now();
await page.goto(URL_BASE, { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForFunction('window.__APP__ && window.__APP__.ready===true', { timeout: 60000 });
const loadMs = Date.now() - t;
await sleep(1200);

const out = {};
out.loadMs = loadMs;

// helper in page
const drives = [
  { name: 'living->hallway', start: [-0.4, -0.6, Math.PI], ms: 1600, expect: 'HALLWAY' },
  { name: 'hallway->bathroom', start: [-0.3, 1.4, -Math.PI / 2], ms: 1600, expect: 'BATHROOM' },
  { name: 'kitchen->study', start: [4.9, -0.2, Math.PI], ms: 1600, expect: 'STUDY' },
  { name: 'living->kitchen(open)', start: [-0.8, -1.1, -Math.PI / 2], ms: 2200, expect: 'KITCHEN / DINING' },
  { name: 'hallway->bedroom', start: [-0.8, 3.0, Math.PI / 2], ms: 1600, expect: 'BEDROOM' },
];
out.drives = [];
for (const d of drives) {
  await page.evaluate((s) => {
    const A = window.__APP__;
    A.qa.reset();
    A.qa.teleport(s[0], s[1], s[2]);
  }, d.start);
  await sleep(250);
  await page.keyboard.down('KeyW');
  await sleep(d.ms);
  await page.keyboard.up('KeyW');
  await sleep(250);
  const st = await page.evaluate(() => window.__APP__.state());
  out.drives.push({ name: d.name, expect: d.expect, room: st.room, pos: st.robot.pos.map((v) => +v.toFixed(3)), ok: st.room === d.expect });
}

// ---- FP real click grab
await page.evaluate(() => {
  const A = window.__APP__;
  A.qa.reset();
  const r = A.qa.teleportNear('mug_white', 0.4);
  window.__near = r;
});
await sleep(400);
const fp = await page.evaluate(() => {
  const A = window.__APP__;
  const mug = A.qa.object('mug_white');
  const rp = A.state().robot.pos;
  const dx = mug.pos[0] - rp[0];
  const dz = mug.pos[2] - rp[2];
  const dy = mug.pos[1] - (rp[1] + 0.35);
  const yaw = Math.atan2(-dx, -dz);
  const distH = Math.hypot(dx, dz);
  const pitch = -Math.atan2(dy, distH);
  A.qa.look(yaw, pitch);
  return { mug, rp, yaw, pitch };
});
await sleep(400);
const hover = await page.evaluate(() => window.__APP__.state().target);
await page.mouse.click(720, 450);
await sleep(400);
const grabbed = await page.evaluate(() => ({ st: window.__APP__.state(), hud: window.__APP__.qa.hudText() }));
await page.mouse.click(720, 450);
await sleep(900);
const placed = await page.evaluate(() => ({ st: window.__APP__.state(), mug: window.__APP__.qa.object('mug_white'), hud: window.__APP__.qa.hudText() }));
out.fpClick = { fp, hover, grabbed: grabbed.st.robot.held, hudHeld: grabbed.hud.held, placedHeld: placed.st.robot.held, mugAfter: placed.mug.pos.map((v) => +v.toFixed(3)), hudAfter: placed.hud.held };

// ---- push displacement
out.push = {};
for (const name of ['sofa', 'chair_1']) {
  await page.evaluate(async (n) => {
    const A = window.__APP__;
    A.qa.reset();
    A.qa.setView('third');
    A.qa.teleportNear(n, 0.9);
  }, name);
  await sleep(700);
  const before = await page.evaluate((n) => window.__APP__.qa.object(n).pos, name);
  const acted = await page.evaluate(() => {
    const A = window.__APP__;
    A.qa.aimAtPoint([A.state().robot.pos[0], 0.2, A.state().robot.pos[2]]);
    A.qa.action();
    return { target: A.state().target, hud: A.qa.hudText() };
  });
  await sleep(1200);
  const after = await page.evaluate((n) => window.__APP__.qa.object(n).pos, name);
  out.push[name] = {
    moved: +Math.hypot(after[0] - before[0], after[2] - before[2]).toFixed(4),
    before: before.map((v) => +v.toFixed(3)),
    after: after.map((v) => +v.toFixed(3)),
    target: acted.target,
    hud: acted.hud.target,
  };
}

// ---- HUD samples (third person)
await page.evaluate(() => {
  const A = window.__APP__;
  A.qa.reset();
  A.qa.setView('third');
  A.qa.teleport(-2.5, -0.5, 0.4);
});
await sleep(900);
out.hud = await page.evaluate(() => {
  const A = window.__APP__;
  const rects = A.qa.hudRects();
  const panels = {};
  for (const p of rects.panels) panels[p.key] = A.qa.sampleHud(p);
  const map = A.qa.sampleHud(rects.map);
  return { panels, map, rects };
});

// robot hidden from feeds: lock visible=true for a few frames and diff minimap
out.hideTest = await page.evaluate(async () => {
  const A = window.__APP__;
  const g = A.robot.group;
  const d = Object.getOwnPropertyDescriptor(g, 'visible');
  const map = A.qa.hudRects().map;
  const front = A.qa.hudRects().panels[0];
  const sample = () => ({ map: A.qa.sampleHud(map), front: A.qa.sampleHud(front) });
  await new Promise((r) => setTimeout(r, 400));
  const normal = sample();
  Object.defineProperty(g, 'visible', { configurable: true, get: () => true, set: () => {} });
  await new Promise((r) => setTimeout(r, 400));
  const forced = sample();
  Object.defineProperty(g, 'visible', d);
  await new Promise((r) => setTimeout(r, 400));
  const restored = sample();
  return { normal, forced, restored, deltaMapMean: +(forced.map.mean - normal.map.mean).toFixed(3), deltaFrontMean: +(forced.front.mean - normal.front.mean).toFixed(3), deltaMapLit: +(forced.map.litRatio - normal.map.litRatio).toFixed(4) };
});

// ---- night
out.night = await page.evaluate(async () => {
  const A = window.__APP__;
  A.qa.setNight(false);
  await new Promise((r) => setTimeout(r, 500));
  const day = A.qa.sampleMain({ x: 500, y: 250, w: 500, h: 350 });
  A.qa.setNight(true);
  await new Promise((r) => setTimeout(r, 500));
  const night = A.qa.sampleMain({ x: 500, y: 250, w: 500, h: 350 });
  A.qa.setNight(false);
  return { day, night, rel: +Math.abs(night.mean - day.mean) / day.mean };
});

// ---- surround off samples
out.surroundOff = await page.evaluate(async () => {
  const A = window.__APP__;
  A.qa.setSurround(false);
  await new Promise((r) => setTimeout(r, 500));
  const rects = A.qa.hudRects();
  const samples = {};
  for (const p of rects.panels) samples[p.key] = A.qa.sampleHud(p);
  const map = A.qa.sampleHud(rects.map);
  const hidden = Array.from(document.querySelectorAll('.hud-cam')).map((e) => e.classList.contains('is-hidden'));
  A.qa.setSurround(true);
  await new Promise((r) => setTimeout(r, 500));
  return { samples, map, hidden };
});

// ---- reset
out.reset = await page.evaluate(async () => {
  const A = window.__APP__;
  A.qa.reset();
  await new Promise((r) => setTimeout(r, 600));
  const spawn = A.qa.state().robot.pos;
  // move robot and shove mug
  A.qa.teleport(-4.5, 2.0, 1);
  A.qa.teleportNear('mug_white', 0.4);
  await new Promise((r) => setTimeout(r, 400));
  A.qa.action();
  await new Promise((r) => setTimeout(r, 800));
  const moved = A.qa.object('mug_white').pos;
  A.qa.reset();
  await new Promise((r) => setTimeout(r, 700));
  const after = A.qa.object('mug_white').pos;
  return { spawn: spawn.map((v) => +v.toFixed(2)), moved: moved.map((v) => +v.toFixed(3)), after: after.map((v) => +v.toFixed(3)), robot: A.qa.state().robot.pos.map((v) => +v.toFixed(2)), delta: +Math.hypot(after[0] - moved[0], after[2] - moved[2]).toFixed(3) };
});

// ---- mobile layout
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
await sleep(900);
out.mobile = await page.evaluate(() => {
  const A = window.__APP__;
  const r = A.qa.hudRects();
  const vw = innerWidth;
  const vh = innerHeight;
  const all = [...r.panels, r.map];
  const out = all.filter((p) => p.x < 0 || p.y < 0 || p.x + p.w > vw + 0.5 || p.y + p.h > vh + 0.5);
  const els = Array.from(document.querySelectorAll('#hud > *')).map((e) => {
    const b = e.getBoundingClientRect();
    return { cls: e.className, id: e.id, x: +b.x.toFixed(0), y: +b.y.toFixed(0), w: +b.width.toFixed(0), h: +b.height.toFixed(0) };
  });
  return { vw, vh, rects: r, overflow: out, scrollW: document.documentElement.scrollWidth, scrollH: document.documentElement.scrollHeight, els };
});
await page.screenshot({ path: 'qa/functional/shots/probe-mobile.png' });
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
await sleep(800);
out.back = await page.evaluate(() => ({ rects: window.__APP__.qa.hudRects(), vw: innerWidth, vh: innerHeight, stats: window.__APP__.qa.drawCalls(), fps: window.__APP__.fps }));

// ---- file://
const fileUrl = pathToFileURL(path.resolve('dist/index.html')).href;
const p2 = await browser.newPage();
const logs2 = [];
p2.on('console', (m) => logs2.push(`[${m.type()}] ${m.text()}`));
p2.on('pageerror', (e) => logs2.push(`[pageerror] ${e.message}`));
const t2 = Date.now();
let fileOk = false;
try {
  await p2.goto(fileUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await p2.waitForFunction('window.__APP__ && window.__APP__.ready===true', { timeout: 45000 });
  fileOk = true;
} catch (e) {
  logs2.push('file goto error: ' + e.message);
}
await sleep(1000);
out.file = { ok: fileOk, ms: Date.now() - t2, state: fileOk ? await p2.evaluate(() => window.__APP__.state()) : null, logs: logs2 };
await p2.screenshot({ path: 'qa/functional/shots/probe-file.png' });

console.log(JSON.stringify({ out, logs }, null, 2));
await browser.close();
