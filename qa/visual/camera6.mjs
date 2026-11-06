// Camera P2 re-check: outside furniture + robot visible (no hard collapse), plus trail width.
import puppeteer from 'puppeteer-core';
import { writeFileSync } from 'node:fs';

const URL = process.argv[2] || 'http://127.0.0.1:4182/';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
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
await wait(2400);
const R = { readyMs, logs, shots: {}, cam: {}, trail: {} };

async function snap(name) {
  await page.screenshot({ path: `${OUT}/c6-${name}.png` });
  R.shots[name] = await page.evaluate(() => ({ cam: window.__APP__.qa.cameraInfo(), robot: window.__APP__.state().robot, hud: window.__APP__.qa.hudText(), draw: window.__APP__.state().drawCalls }));
}
const drive = async (keys, ms) => {
  await page.evaluate((ks) => { const A = window.__APP__; ks.forEach((k) => A.qa.hold(k)); }, keys);
  await wait(ms);
  await page.evaluate((ks) => { const A = window.__APP__; ks.forEach((k) => A.qa.releaseKey(k)); }, keys);
  await wait(350);
};
// returns bbox-inside flag + occlusion raycast from camera to robot centre + projected NDC
const analyse = (objName) => page.evaluate((objName) => {
  const A = window.__APP__, scene = A.scene; scene.updateMatrixWorld(true);
  const root = scene.getObjectByName(objName);
  let bb = null;
  if (root) root.traverse((o) => { if (!o.isMesh) return; const g = o.geometry; if (!g.boundingBox) g.computeBoundingBox(); const b = g.boundingBox.clone().applyMatrix4(o.matrixWorld); if (!bb) bb = b; else bb.union(b); });
  const ci = A.qa.cameraInfo();
  const c = ci.pos;
  const inside = bb ? (c[0] > bb.min.x && c[0] < bb.max.x && c[1] > bb.min.y && c[1] < bb.max.y && c[2] > bb.min.z && c[2] < bb.max.z) : null;
  // robot centre: use group world position + 0.2
  const rp = A.robot.group.position;
  const target = [rp.x, rp.y + 0.18, rp.z];
  const d = [target[0] - c[0], target[1] - c[1], target[2] - c[2]];
  const len = Math.hypot(d[0], d[1], d[2]);
  const hit = A.physics.castRay(c, [d[0] / len, d[1] / len, d[2] / len], len, A.robot, {});
  // projected NDC (quaternion rotate into camera space)
  const q = ci.quat; // x,y,z,w
  const vx = d[0], vy = d[1], vz = d[2];
  const ix = -q[0], iy = -q[1], iz = -q[2], iw = q[3];
  const tx = 2 * (iy * vz - iz * vy) + iw * vx + ix * 0; // quaternion rotation v' = q v q*
  // full rotation via standard formula
  const rotate = (v, qq) => {
    const [x, y, z, w] = qq;
    const uvx = y * v[2] - z * v[1], uvy = z * v[0] - x * v[2], uvz = x * v[1] - y * v[0];
    const uuvx = y * uvz - z * uvy, uuvy = z * uvx - x * uvz, uuvz = x * uvy - y * uvx;
    return [v[0] + 2 * (w * uvx + uuvx), v[1] + 2 * (w * uvy + uuvy), v[2] + 2 * (w * uvz + uuvz)];
  };
  const camSpace = rotate(d, [ix, iy, iz, iw]);
  const aspect = ci.aspect || (innerWidth / innerHeight);
  const t = Math.tan((ci.fov * Math.PI) / 180 / 2);
  const ndcX = (camSpace[0] / -camSpace[2]) / (t * aspect);
  const ndcY = (camSpace[1] / -camSpace[2]) / t;
  return {
    obj: objName, cam: c.map((v) => +v.toFixed(2)), inside,
    bbox: bb ? { min: [bb.min.x, bb.min.y, bb.min.z].map((v) => +v.toFixed(2)), max: [bb.max.x, bb.max.y, bb.max.z].map((v) => +v.toFixed(2)) } : null,
    rayHit: hit ? { obj: hit.obj && hit.obj.name, dist: +hit.distance.toFixed(2) } : null,
    camToRobot: +len.toFixed(2),
    robotNdc: [+ndcX.toFixed(2), +ndcY.toFixed(2)],
    robotOnScreen: Math.abs(ndcX) < 1 && Math.abs(ndcY) < 1,
    camY: +c[1].toFixed(2),
  };
}, objName);

// 0. spawn sanity
await snap('spawn-default');
R.hud = await page.evaluate(() => {
  const rects = window.__APP__.qa.hudRects(); const s = {};
  for (const p of rects.panels) s[p.key] = window.__APP__.qa.sampleHud(p);
  s.map = window.__APP__.qa.sampleHud(rects.map);
  return { samples: s, draw: window.__APP__.state().drawCalls, fps: window.__APP__.fps };
});

// 1. sofa
await page.evaluate(() => { const A = window.__APP__; A.qa.teleport(-2.5, -1.9, Math.PI); }); await wait(700);
await drive(['KeyW', 'ShiftLeft'], 1800);
await snap('cam-sofa');
R.cam.sofa = await analyse('sofa');
// 2. bed
await page.evaluate(() => { const A = window.__APP__; A.qa.teleport(-2.6, 2.7, Math.atan2(1.6, 0.1)); }); await wait(700);
await drive(['KeyW'], 1500);
await snap('cam-bed');
R.cam.bed = await analyse('bed');
// 3. wardrobe
await page.evaluate(() => { const A = window.__APP__; A.qa.teleport(-2.7, 1.9, Math.atan2(0.68, 0.82)); }); await wait(700);
await drive(['KeyW'], 1200);
await snap('cam-wardrobe');
R.cam.wardrobe = await analyse('wardrobe');
// 4. under coffee table
await page.evaluate(() => { const A = window.__APP__; A.qa.teleport(-2.5, -1.55, 0); }); await wait(900);
await snap('cam-under-table');
R.cam.underTable = await analyse('coffee_table');
// 5. under table while driving in from the side (approach)
await page.evaluate(() => { const A = window.__APP__; A.qa.teleport(-2.5, -0.9, Math.PI); }); await wait(700);
await drive(['KeyW'], 1400);
await snap('cam-approach-table');
R.cam.approachTable = await analyse('coffee_table');

// 6. trail width check
await page.evaluate(() => { const A = window.__APP__; A.qa.reset(); }); await wait(900);
await drive(['KeyW'], 900); await drive(['KeyD'], 500); await drive(['KeyW'], 800); await drive(['KeyD'], 450); await drive(['KeyW'], 700);
await wait(500);
await snap('trail-main');
R.trail = await page.evaluate(() => {
  const rects = window.__APP__.qa.hudRects();
  return { map: rects.map };
});

R.final = await page.evaluate(() => ({ fps: window.__APP__.fps, draw: window.__APP__.state().drawCalls, errors: window.__APP__.state().errors }));
writeFileSync('qa/visual/camera6.json', JSON.stringify(R, null, 1));
console.log(JSON.stringify({ readyMs, logs, cam: R.cam, hud: { draw: R.hud.draw, fps: R.hud.fps }, final: R.final }, null, 1));
await browser.close();
