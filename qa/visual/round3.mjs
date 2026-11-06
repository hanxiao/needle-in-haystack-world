// Round-3 review: camera tight-space, bathroom/kitchen/bookshelf, HUD polish, touch, robot detail.
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
const reqs = [];
page.on('console', (m) => { if (m.type() !== 'debug') logs.push(`[${m.type()}] ${m.text()}`); });
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
page.on('request', (r) => reqs.push(r.url()));
const t0 = Date.now();
await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForFunction('window.__APP__ && window.__APP__.ready===true', { timeout: 60000 });
const readyMs = Date.now() - t0;
await wait(2600);
const R = { readyMs, logs, requests: reqs, shots: {}, cam: {}, physics: {}, hud: {} };

async function shot(name) {
  await page.screenshot({ path: `${OUT}/r3-${name}.png` });
  R.shots[name] = await page.evaluate(() => {
    const A = window.__APP__;
    return { cam: A.qa.cameraInfo(), robot: A.state().robot, hud: A.qa.hudText(), draw: A.state().drawCalls, fps: A.fps, night: A.state().night, surround: A.state().surround };
  });
}
const hudRects = () => page.evaluate(() => {
  const rect = (id) => { const e = document.getElementById(id); if (!e) return null; const b = e.getBoundingClientRect(); const cs = getComputedStyle(e); return { x: +b.x.toFixed(1), y: +b.y.toFixed(1), w: +b.width.toFixed(1), h: +b.height.toFixed(1), display: cs.display, text: (e.innerText || '').slice(0, 400) }; };
  const rects = window.__APP__.qa.hudRects();
  const samples = {};
  for (const p of rects.panels) samples[p.key] = window.__APP__.qa.sampleHud(p);
  samples.map = window.__APP__.qa.sampleHud(rects.map);
  return { controls: rect('hud-controls'), map: rect('hud-map'), trailLegend: rect('hud-map-trail'), hint: rect('hud-hint'), touch: rect('hud-touch'), stick: rect('hud-stick'), samples, mapHTML: document.getElementById('hud-map').innerHTML.slice(0, 800) };
});
async function fp(name, x, z, tx, tz, pitch = -0.05) {
  const yaw = yawTo(x, z, tx, tz);
  await page.evaluate((x, z, yaw, pitch) => { const A = window.__APP__; A.qa.teleport(x, z, yaw); A.qa.look(yaw, pitch); }, x, z, yaw, pitch);
  await wait(750); await shot(name);
}
async function tp(name, x, z, tx, tz, pitch = 0.18, dist = 1.3) {
  const yaw = yawTo(x, z, tx, tz);
  await page.evaluate((x, z, yaw, pitch, dist) => { const A = window.__APP__; A.qa.teleport(x, z, yaw); A.qa.setView('third'); A.qa.setCamera(yaw, pitch, dist); }, x, z, yaw, pitch, dist);
  await wait(750); await shot(name);
}
const drive = async (keys, ms) => {
  await page.evaluate((ks) => { const A = window.__APP__; ks.forEach((k) => A.qa.hold(k)); }, keys);
  await wait(ms);
  await page.evaluate((ks) => { const A = window.__APP__; ks.forEach((k) => A.qa.releaseKey(k)); }, keys);
  await wait(350);
};
// camera vs furniture bbox check
const camInside = (objName) => page.evaluate((objName) => {
  const A = window.__APP__, scene = A.scene; scene.updateMatrixWorld(true);
  const root = scene.getObjectByName(objName);
  if (!root) return null;
  let bb = null;
  root.traverse((o) => { if (!o.isMesh) return; const g = o.geometry; if (!g.boundingBox) g.computeBoundingBox(); const b = g.boundingBox.clone().applyMatrix4(o.matrixWorld); if (!bb) bb = b; else bb.union(b); });
  const c = A.qa.cameraInfo().pos;
  const inside = c[0] > bb.min.x && c[0] < bb.max.x && c[1] > bb.min.y && c[1] < bb.max.y && c[2] > bb.min.z && c[2] < bb.max.z;
  return { obj: objName, cam: c, bbox: { min: [bb.min.x, bb.min.y, bb.min.z].map((v) => +v.toFixed(2)), max: [bb.max.x, bb.max.y, bb.max.z].map((v) => +v.toFixed(2)) }, inside };
}, objName);

// 1. spawn + HUD
await shot('spawn-default');
R.hud.desktop = await hudRects();

// 2. camera tight-space: drive into sofa / bed / wardrobe / under table
await page.evaluate(() => { const A = window.__APP__; A.qa.teleport(-2.5, -1.9, Math.PI); }); await wait(700);
await drive(['KeyW', 'ShiftLeft'], 1800);
await shot('cam-sofa');
R.cam.sofa = await camInside('sofa');
await page.evaluate(() => { const A = window.__APP__; A.qa.teleport(-2.6, 2.7, Math.atan2(1.6, 0.1)); }); await wait(700);
await drive(['KeyW'], 1500);
await shot('cam-bed');
R.cam.bed = await camInside('bed');
await page.evaluate(() => { const A = window.__APP__; A.qa.teleport(-2.7, 1.9, Math.atan2(0.68, 0.82)); }); await wait(700);
await drive(['KeyW'], 1200);
await shot('cam-wardrobe');
R.cam.wardrobe = await camInside('wardrobe');
await page.evaluate(() => { const A = window.__APP__; A.qa.teleport(-2.5, -1.55, 0); }); await wait(900);
await shot('cam-under-table');
R.cam.underTable = await camInside('coffee_table');

// 3. bathroom rebalance + kitchen rail + bookshelf books
await fp('bath-fp-tub', 1.1, 1.3, 1.8, 3.2, 0.05);
await fp('bath-fp-vanity', 2.2, 2.5, 1.0, 3.0);
await tp('bath-tp', 1.5, 1.6, 1.7, 3.2, 0.22, 0.9);
await fp('kitchen-rail', 2.4, -2.0, 2.9, -3.45, 0.10);
await fp('bookshelf', -4.2, -0.4, -5.4, -0.6, 0.02);

// 4. trail: drive a loop then capture main + map
await page.evaluate(() => { const A = window.__APP__; A.qa.reset(); }); await wait(900);
await drive(['KeyW'], 800); await drive(['KeyD'], 450); await drive(['KeyW'], 650); await drive(['KeyD'], 450); await drive(['KeyW'], 550);
await wait(500);
await shot('trail-main');
R.hud.trail = await hudRects();

// 5. robot detail: LED states, aim-responsive carry, contact shadow
await page.evaluate(() => { const A = window.__APP__; A.qa.teleportNear('mug_white', 0.42); }); await wait(900);
R.physics.grab = await page.evaluate(() => window.__APP__.qa.grabByName('mug_white'));
await wait(600);
await shot('carry-idle');
await page.evaluate(() => { const A = window.__APP__; const r = A.state().robot; A.qa.setCamera(r.yaw + 1.9, 0.18, 1.15); }); await wait(700);
await shot('carry-aim-low');
await page.evaluate(() => { const A = window.__APP__; const r = A.state().robot; A.qa.aimAtPoint([r.pos[0] - 0.3, 1.6, r.pos[2] - 0.4]); }); await wait(800);
await shot('carry-aim-high');
await page.evaluate(() => { const A = window.__APP__; A.qa.aimAtPoint([A.state().robot.pos[0], 0.06, A.state().robot.pos[2] - 0.4]); }); await wait(800);
await shot('carry-aim-floor');
R.carry = await page.evaluate(() => ({ held: window.__APP__.state().robot.held, hud: window.__APP__.qa.hudText() }));
await page.evaluate(() => window.__APP__.qa.release()); await wait(500);

// 6. vignette / contact shadow: look at floor under robot
await page.evaluate(() => { const A = window.__APP__; A.qa.setView('third'); A.qa.setCamera(0, 0.55, 2.2); }); await wait(800);
await shot('shadow-vignette');

// 7. mobile touch
const mob = await browser.newPage(); await mob.bringToFront();
await mob.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
await mob.goto(URL, { waitUntil: 'networkidle0' });
await mob.waitForFunction('window.__APP__ && window.__APP__.ready===true');
await wait(2400);
await mob.screenshot({ path: `${OUT}/r3-mobile-spawn.png` });
R.hud.mobile = await mob.evaluate(() => {
  const rect = (id) => { const e = document.getElementById(id); if (!e) return null; const b = e.getBoundingClientRect(); const cs = getComputedStyle(e); return { x: +b.x.toFixed(1), y: +b.y.toFixed(1), w: +b.width.toFixed(1), h: +b.height.toFixed(1), display: cs.display, text: (e.innerText || '').slice(0, 200) }; };
  return { controls: rect('hud-controls'), map: rect('hud-map'), trailLegend: rect('hud-map-trail'), hint: rect('hud-hint'), touch: rect('hud-touch'), stick: rect('hud-stick'), scrollW: document.documentElement.scrollWidth, inner: [innerWidth, innerHeight], touchText: document.getElementById('hud-touch')?.innerText };
});
// simulate touch: drag the stick up-left, then tap
const st = R.hud.mobile.stick;
if (st && st.w > 0) {
  const cx = st.x + st.w / 2, cy = st.y + st.h / 2;
  await mob.touchscreen.touchStart(cx, cy);
  await mob.touchscreen.touchMove(cx, cy - 30);
  await wait(900);
  await mob.touchscreen.touchEnd();
  await wait(400);
  await mob.screenshot({ path: `${OUT}/r3-mobile-drive.png` });
  R.mobileDrive = await mob.evaluate(() => window.__APP__.state().robot);
}
await mob.close();

// 8. wide sanity
const wide = await browser.newPage(); await wide.bringToFront();
await wide.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
await wide.goto(URL, { waitUntil: 'networkidle0' });
await wide.waitForFunction('window.__APP__ && window.__APP__.ready===true');
await wait(2000);
await wide.screenshot({ path: `${OUT}/r3-wide-spawn.png` });
R.hud.wide = await wide.evaluate(() => {
  const rect = (id) => { const e = document.getElementById(id); const b = e.getBoundingClientRect(); return { x: +b.x.toFixed(1), y: +b.y.toFixed(1), w: +b.width.toFixed(1), h: +b.height.toFixed(1) }; };
  return { controls: rect('hud-controls'), map: rect('hud-map'), trailLegend: rect('hud-map-trail'), hint: rect('hud-hint') };
});
await wide.close();

R.final = await page.evaluate(() => ({ fps: window.__APP__.fps, draw: window.__APP__.state().drawCalls, tri: window.__APP__.state().triangles, errors: window.__APP__.state().errors }));
writeFileSync('qa/visual/round3.json', JSON.stringify(R, null, 1));
console.log(JSON.stringify({ readyMs, shots: Object.keys(R.shots).length, logs, requests: [...new Set(reqs)], cam: R.cam, carry: R.carry, grab: R.physics.grab, mobile: R.hud.mobile && { touch: R.hud.mobile.touch, stick: R.hud.mobile.stick, trail: R.hud.mobile.trailLegend }, mobileDrive: R.mobileDrive, final: R.final }, null, 1));
await browser.close();
