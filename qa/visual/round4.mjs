// Round-4: bathroom mirror, LED states, 4.5 m minimap, wall-slide camera, regressions.
import puppeteer from 'puppeteer-core';
import { writeFileSync } from 'node:fs';

const URL = process.argv[2] || 'http://127.0.0.1:4182/';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const yawTo = (x, z, tx, tz) => Math.atan2(-(tx - x), -(tz - z));
const OUT = 'qa/visual/shots';
const shell = { minX: -5.42, maxX: 5.42, minZ: -3.62, maxZ: 3.62, minY: 0.12, maxY: 2.58 };
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
await wait(2400);
const R = { readyMs, logs, shots: {}, states: {}, cam: {}, hud: {} };

async function snap(name) {
  await page.screenshot({ path: `${OUT}/r4-${name}.png` });
  R.shots[name] = await page.evaluate(() => ({ cam: window.__APP__.qa.cameraInfo(), robot: window.__APP__.state().robot, hud: window.__APP__.qa.hudText(), draw: window.__APP__.state().drawCalls, night: window.__APP__.state().night }));
}
const camFront = (yaw, pitch = 0.2, dist = 0.9) => page.evaluate((yaw, pitch, dist) => { const A = window.__APP__; A.qa.setView('third'); A.qa.setCamera(yaw + Math.PI, pitch, dist); }, yaw, pitch, dist);

// 0. spawn + HUD samples
await snap('spawn');
R.hud.samples = await page.evaluate(() => {
  const rects = window.__APP__.qa.hudRects(); const s = {};
  for (const p of rects.panels) s[p.key] = window.__APP__.qa.sampleHud(p);
  s.map = window.__APP__.qa.sampleHud(rects.map);
  return s;
});
R.hud.draw = await page.evaluate(() => window.__APP__.state().drawCalls);

// 1. bathroom mirror + shelf/bottles/towel
await page.evaluate(() => { const A = window.__APP__; A.qa.teleport(1.25, 2.25, Math.atan2(-(2.55 - 1.25), -(1.9 - 2.25))); A.qa.look(Math.atan2(-(2.55 - 1.25), -(1.9 - 2.25)), 0.06); });
await wait(800); await snap('bath-mirror-fp');
await page.evaluate(() => { const A = window.__APP__; A.qa.setView('third'); A.qa.setCamera(Math.atan2(-(2.55 - 1.25), -(1.9 - 2.25)) + Math.PI, 0.22, 1.15); });
await wait(800); await snap('bath-mirror-tp');

// 2. LED states: idle / move / boost / hold / push
await page.evaluate(() => { const A = window.__APP__; A.qa.teleport(-3.6, -1.2, 0); }); await wait(800);
await camFront(0); await wait(700); await snap('led-idle');
await page.evaluate(() => { const A = window.__APP__; A.qa.hold('KeyW'); }); await wait(700);
await snap('led-move');
await page.evaluate(() => { const A = window.__APP__; A.qa.hold('ShiftLeft'); }); await wait(700);
await snap('led-boost');
await page.evaluate(() => { const A = window.__APP__; A.qa.releaseKey('KeyW'); A.qa.releaseKey('ShiftLeft'); }); await wait(400);
// hold
await page.evaluate(() => { const A = window.__APP__; A.qa.setView('third'); A.qa.teleportNear('mug_white', 0.42); }); await wait(900);
R.states.grab = await page.evaluate(() => window.__APP__.qa.grabByName('mug_white'));
await wait(700);
await camFront(await page.evaluate(() => window.__APP__.state().robot.yaw), 0.2, 1.0); await wait(800); await snap('led-hold');
await page.evaluate(() => window.__APP__.qa.release()); await wait(400);
// push (aim at heavy sofa and drive into it)
await page.evaluate(() => { const A = window.__APP__; A.qa.teleportNear('sofa', 0.5); }); await wait(900);
await page.evaluate(() => { const A = window.__APP__; A.qa.aimAt('sofa'); }); await wait(400);
await page.evaluate(() => { const A = window.__APP__; A.qa.hold('KeyW'); }); await wait(900);
await camFront(await page.evaluate(() => window.__APP__.state().robot.yaw), 0.18, 1.0); await wait(600);
await snap('led-push');
await page.evaluate(() => { const A = window.__APP__; A.qa.releaseKey('KeyW'); }); await wait(400);
R.states.pushHud = await page.evaluate(() => window.__APP__.qa.hudText());

// 3. minimap 4.5 m coverage + longer trail
await page.evaluate(() => { const A = window.__APP__; A.qa.reset(); }); await wait(900);
const drive = async (keys, ms) => { await page.evaluate((ks) => { const A = window.__APP__; ks.forEach((k) => A.qa.hold(k)); }, keys); await wait(ms); await page.evaluate((ks) => { const A = window.__APP__; ks.forEach((k) => A.qa.releaseKey(k)); }, keys); await wait(120); };
await drive(['KeyW'], 900); await drive(['KeyD'], 500); await drive(['KeyW'], 900); await drive(['KeyD'], 500);
await drive(['KeyW'], 800); await drive(['KeyA'], 450); await drive(['KeyW'], 700); await drive(['KeyA'], 450); await drive(['KeyW'], 600);
await wait(500);
await snap('map-trail');

// 4. wall-backed poses: slide along wall + inside shell + robot visible
const wallPoses = [
  ['wall-west', -5.30, -0.5, -Math.PI / 2],
  ['wall-east', 5.30, -0.5, Math.PI / 2],
  ['wall-north', -1.0, -3.55, Math.PI],
  ['wall-south', -1.0, 3.55, 0],
];
for (const [name, x, z, yaw] of wallPoses) {
  await page.evaluate((x, z, yaw) => { const A = window.__APP__; A.qa.teleport(x, z, yaw); A.qa.setView('third'); A.qa.setCamera(yaw, 0.14, 1.75); }, x, z, yaw);
  await wait(800);
  await snap(name);
  R.cam[name] = await page.evaluate(() => {
    const A = window.__APP__; const ci = A.qa.cameraInfo();
    const rp = A.robot.group.position; const d = [rp.x - ci.pos[0], rp.y + 0.18 - ci.pos[1], rp.z - ci.pos[2]];
    const len = Math.hypot(...d);
    const hit = A.physics.castRay(ci.pos, [d[0] / len, d[1] / len, d[2] / len], len, A.robot, {});
    return { cam: ci.pos.map((v) => +v.toFixed(2)), rayHit: hit ? { obj: hit.obj && hit.obj.name, dist: +hit.distance.toFixed(2) } : null, camToRobot: +len.toFixed(2) };
  });
}
// occluder line-of-sight: sofa pose
await page.evaluate(() => { const A = window.__APP__; A.qa.teleport(-2.5, -1.9, Math.PI); }); await wait(700);
await drive(['KeyW', 'ShiftLeft'], 1800);
await snap('cam-sofa');
R.cam.sofa = await page.evaluate(() => {
  const A = window.__APP__; const ci = A.qa.cameraInfo();
  const rp = A.robot.group.position; const d = [rp.x - ci.pos[0], rp.y + 0.18 - ci.pos[1], rp.z - ci.pos[2]];
  const len = Math.hypot(...d);
  const hit = A.physics.castRay(ci.pos, [d[0] / len, d[1] / len, d[2] / len], len, A.robot, {});
  return { cam: ci.pos.map((v) => +v.toFixed(2)), rayHit: hit ? { obj: hit.obj && hit.obj.name, dist: +hit.distance.toFixed(2) } : null, camToRobot: +len.toFixed(2) };
});
// under table
await page.evaluate(() => { const A = window.__APP__; A.qa.teleport(-2.5, -1.55, 0); }); await wait(900);
await snap('cam-under-table');

R.final = await page.evaluate(() => ({ fps: window.__APP__.fps, draw: window.__APP__.state().drawCalls, tri: window.__APP__.state().triangles, errors: window.__APP__.state().errors }));
// shell violations
const violations = [];
for (const [k, v] of Object.entries(R.shots)) {
  const c = v.cam && v.cam.pos; if (!c) continue;
  if (c[0] < shell.minX - 1e-6 || c[0] > shell.maxX + 1e-6 || c[2] < shell.minZ - 1e-6 || c[2] > shell.maxZ + 1e-6 || c[1] < shell.minY - 1e-6 || c[1] > shell.maxY + 1e-6) violations.push({ shot: k, cam: c.map((x) => +x.toFixed(2)) });
}
R.violations = violations;
writeFileSync('qa/visual/round4.json', JSON.stringify(R, null, 1));
console.log(JSON.stringify({ readyMs, logs, violations, cam: R.cam, states: R.states, final: R.final, draw: R.hud.draw, samples: Object.fromEntries(Object.entries(R.hud.samples).map(([k, v]) => [k, [+v.litRatio.toFixed(2), +v.mean.toFixed(0)]])) }, null, 1));
await browser.close();
