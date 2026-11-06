// Round-2 review: robot v2, control panel, minimap trail, physics, size regressions.
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
const R = { readyMs, logs, requests: reqs, shots: {}, physics: {}, hud: {} };

async function shot(name) {
  await page.screenshot({ path: `${OUT}/r2-${name}.png` });
  R.shots[name] = await page.evaluate(() => {
    const A = window.__APP__;
    return { cam: A.qa.cameraInfo(), robot: A.state().robot, hud: A.qa.hudText(), draw: A.state().drawCalls, fps: A.fps, night: A.state().night, surround: A.state().surround };
  });
}
async function hudRects() {
  return page.evaluate(() => {
    const rect = (id) => { const e = document.getElementById(id); if (!e) return null; const b = e.getBoundingClientRect(); return { x: +b.x.toFixed(1), y: +b.y.toFixed(1), w: +b.width.toFixed(1), h: +b.height.toFixed(1) }; };
    const rects = window.__APP__.qa.hudRects();
    const samples = {};
    for (const p of rects.panels) samples[p.key] = window.__APP__.qa.sampleHud(p);
    samples.map = window.__APP__.qa.sampleHud(rects.map);
    return {
      controls: rect('hud-controls'), map: rect('hud-map'), hint: rect('hud-hint'), room: rect('hud-room-name'),
      panelRects: rects.panels, controlsText: document.getElementById('hud-controls').innerText,
      samples, view: document.getElementById('hud-view')?.textContent, tag360: document.getElementById('hud-360')?.textContent, light: document.getElementById('hud-light')?.textContent,
    };
  });
}

// 1. spawn + HUD
await shot('spawn-default');
R.hud.desktop = await hudRects();

// 2. robot v2 close-ups (third person front/side, FP)
const robotPose = async (yaw, pitch, dist) => page.evaluate((yaw, pitch, dist) => { const A = window.__APP__; A.qa.setView('third'); A.qa.setCamera(yaw, pitch, dist); }, yaw, pitch, dist);
await robotPose(Math.PI, 0.20, 1.05); await wait(700); await shot('robot-front');
await robotPose(Math.PI / 2, 0.16, 0.95); await wait(700); await shot('robot-side');
await robotPose(-0.26 + Math.PI * 0.75, 0.14, 0.9); await wait(700); await shot('robot-3q');
await page.evaluate(() => { const A = window.__APP__; A.qa.look(0, -0.08); }); await wait(700); await shot('robot-fp');
// scale reference: next to a mug on the coffee table
await page.evaluate(() => { const A = window.__APP__; A.qa.setView('third'); A.qa.teleportNear('mug_white', 0.5); }); await wait(900); await shot('robot-mug');

// 3. under-coffee-table: drive under the table and reach for a mug
R.physics.mugs = await page.evaluate(() => window.__APP__.qa.objects().filter((o) => /mug/.test(o.name)));
await page.evaluate(() => { const A = window.__APP__; A.qa.teleport(-2.5, -1.55, 0); A.qa.look(0, 0.02); }); await wait(900);
await shot('under-table-fp');
await page.evaluate(() => { const A = window.__APP__; A.qa.setView('third'); A.qa.setCamera(0.9, 0.22, 1.3); }); await wait(800); await shot('under-table-tp');
R.physics.underTableState = await page.evaluate(() => window.__APP__.state());

// 4. doorway pass-through (robot 350 mm vs 0.8 m doorway) + FP
await page.evaluate(() => { const A = window.__APP__; A.qa.teleport(-0.5, 0.2, Math.PI); A.qa.look(Math.PI, -0.05); }); await wait(700); await shot('doorway-fp');
await page.evaluate(() => { const A = window.__APP__; A.qa.hold('KeyW'); }); await wait(1400);
await page.evaluate(() => { const A = window.__APP__; A.qa.releaseKey('KeyW'); }); await wait(400);
R.physics.doorwayState = await page.evaluate(() => window.__APP__.state());
await shot('doorway-after');

// 5. physics: drive into heavy sofa
await page.evaluate(() => { const A = window.__APP__; A.qa.setView('third'); A.qa.teleport(-2.5, -1.9, Math.PI); });
await wait(700);
R.physics.sofaBefore = await page.evaluate(() => window.__APP__.qa.object('sofa'));
await page.evaluate(() => { const A = window.__APP__; A.qa.hold('KeyW'); A.qa.hold('ShiftLeft'); });
await wait(1800);
await page.evaluate(() => { const A = window.__APP__; A.qa.releaseKey('KeyW'); A.qa.releaseKey('ShiftLeft'); });
await wait(600);
R.physics.sofaAfter = await page.evaluate(() => window.__APP__.qa.object('sofa'));
await shot('push-sofa');
R.physics.sofaDelta = Math.hypot(R.physics.sofaAfter.pos[0] - R.physics.sofaBefore.pos[0], R.physics.sofaAfter.pos[2] - R.physics.sofaBefore.pos[2]);

// 6. arm payload limits
R.physics.grab = {};
for (const [name, dist] of [['laptop', 0.4], ['mug_white', 0.35], ['needle', 0.3]]) {
  const g = await page.evaluate(async (name, dist) => {
    const A = window.__APP__;
    A.qa.release();
    A.qa.teleportNear(name, dist);
    await new Promise((r) => setTimeout(r, 800));
    const res = A.qa.grabByName(name);
    const st = A.state();
    return { res, held: st.robot.held, hud: A.qa.hudText() };
  }, name, dist);
  R.physics.grab[name] = g;
}
await page.evaluate(() => window.__APP__.qa.release());
await wait(400);

// 7. minimap trajectory: drive a loop, then capture
await page.evaluate(() => { const A = window.__APP__; A.qa.reset(); }); await wait(900);
const drive = async (key, ms) => { await page.evaluate((k) => window.__APP__.qa.hold(k), key); await wait(ms); await page.evaluate((k) => window.__APP__.qa.releaseKey(k), key); await wait(120); };
await drive('KeyW', 900);
await drive('KeyD', 500);
await drive('KeyW', 700);
await drive('KeyD', 500);
await drive('KeyW', 700);
await drive('KeyA', 450);
await drive('KeyW', 600);
await wait(500);
await shot('trail-main');
R.hud.trail = await hudRects();

// 8. control panel key highlights
await page.evaluate(() => { const A = window.__APP__; A.qa.hold('KeyW'); A.qa.hold('KeyA'); }); await wait(350); await shot('keys-wasd');
await page.evaluate(() => { const A = window.__APP__; A.qa.releaseKey('KeyW'); A.qa.releaseKey('KeyA'); A.qa.hold('ShiftLeft'); }); await wait(350); await shot('keys-shift');
await page.evaluate(() => { const A = window.__APP__; A.qa.releaseKey('ShiftLeft'); }); await wait(200);
// mouse drag -> LOOK highlight
await page.mouse.move(700, 420);
await page.mouse.down();
await page.mouse.move(760, 430, { steps: 5 });
await wait(250);
await shot('keys-mouse');
await page.mouse.up();
await wait(250);

// 9. mode badges
await page.evaluate(() => { const A = window.__APP__; A.qa.setView('first'); }); await wait(600); await shot('badge-first');
await page.evaluate(() => { const A = window.__APP__; A.qa.setView('third'); A.qa.setSurround(false); }); await wait(600); await shot('badge-360off');
await page.evaluate(() => { const A = window.__APP__; A.qa.setSurround(true); A.qa.setNight(true); }); await wait(900); await shot('badge-night');
R.hud.badges = await hudRects();
await page.evaluate(() => { const A = window.__APP__; A.qa.setNight(false); }); await wait(600);

// 10. mobile + wide
const mob = await browser.newPage(); await mob.bringToFront();
await mob.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
await mob.goto(URL, { waitUntil: 'networkidle0' });
await mob.waitForFunction('window.__APP__ && window.__APP__.ready===true');
await wait(2200);
await mob.screenshot({ path: `${OUT}/r2-mobile-spawn.png` });
R.hud.mobile = await mob.evaluate(() => {
  const rect = (id) => { const e = document.getElementById(id); if (!e) return null; const b = e.getBoundingClientRect(); return { x: +b.x.toFixed(1), y: +b.y.toFixed(1), w: +b.width.toFixed(1), h: +b.height.toFixed(1) }; };
  return { controls: rect('hud-controls'), map: rect('hud-map'), hint: rect('hud-hint'), scrollW: document.documentElement.scrollWidth, inner: [innerWidth, innerHeight] };
});
await mob.close();
const wide = await browser.newPage(); await wide.bringToFront();
await wide.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
await wide.goto(URL, { waitUntil: 'networkidle0' });
await wide.waitForFunction('window.__APP__ && window.__APP__.ready===true');
await wait(2000);
await wide.screenshot({ path: `${OUT}/r2-wide-spawn.png` });
R.hud.wide = await wide.evaluate(() => {
  const rect = (id) => { const e = document.getElementById(id); const b = e.getBoundingClientRect(); return { x: +b.x.toFixed(1), y: +b.y.toFixed(1), w: +b.width.toFixed(1), h: +b.height.toFixed(1) }; };
  return { controls: rect('hud-controls'), map: rect('hud-map'), hint: rect('hud-hint') };
});
await wide.close();

R.final = await page.evaluate(() => ({ fps: window.__APP__.fps, draw: window.__APP__.state().drawCalls, tri: window.__APP__.state().triangles, errors: window.__APP__.state().errors }));
writeFileSync('qa/visual/round2.json', JSON.stringify(R, null, 1));
console.log(JSON.stringify({ readyMs, shots: Object.keys(R.shots).length, logs, requests: [...new Set(reqs)], physics: { sofaDelta: R.physics.sofaDelta, grab: R.physics.grab, doorway: R.physics.doorwayState && R.physics.doorwayState.robot, underTable: R.physics.underTableState && R.physics.underTableState.robot }, final: R.final, badges: { view: R.hud.badges.view, tag360: R.hud.badges.tag360, light: R.hud.badges.light } }, null, 1));
await browser.close();
