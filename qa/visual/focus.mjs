// Focus re-captures: rooms where the third-person camera clipped, window/exterior views,
// held-object evidence, study/bed detail. Run on the frozen build.
import puppeteer from 'puppeteer-core';
import { mkdirSync, writeFileSync } from 'node:fs';

const URL = process.argv[2] || 'http://127.0.0.1:4182/';
const OUT = 'qa/visual/shots';
mkdirSync(OUT, { recursive: true });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const yawTo = (x, z, tx, tz) => Math.atan2(-(tx - x), -(tz - z));

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
await page.goto(URL, { waitUntil: 'networkidle0', timeout: 60000 });
await page.waitForFunction('window.__APP__ && window.__APP__.ready===true', { timeout: 60000 });
await wait(2400);

const out = {};
async function take(name) {
  await page.screenshot({ path: `${OUT}/f-${name}.png` });
  out[name] = await page.evaluate(() => {
    const A = window.__APP__;
    return { cam: A.qa.cameraInfo(), robot: A.state().robot.pos, room: A.state().room, hud: A.qa.hudText(), draw: A.state().drawCalls, fps: A.fps };
  });
}

async function fp(name, x, z, tx, tz, pitch = -0.05) {
  const yaw = yawTo(x, z, tx, tz);
  await page.evaluate((x, z, yaw, pitch) => { const A = window.__APP__; A.qa.teleport(x, z, yaw); A.qa.look(yaw, pitch); }, x, z, yaw, pitch);
  await wait(750);
  await take(name);
}

async function tp(name, x, z, tx, tz, pitch = 0.18, dist = 1.2) {
  const yaw = yawTo(x, z, tx, tz);
  await page.evaluate((x, z, yaw, pitch, dist) => { const A = window.__APP__; A.qa.teleport(x, z, yaw); A.qa.setView('third'); A.qa.setCamera(yaw, pitch, dist); }, x, z, yaw, pitch, dist);
  await wait(750);
  await take(name);
}

// --- rooms: first-person robot eye level (reliable, no camera clipping)
await fp('r-living-fp-a', -1.1, -0.6, -3.6, -2.3);
await fp('r-living-fp-b', -4.7, -0.4, -2.6, -2.4);
await fp('r-living-fp-c', -3.0, -2.4, -2.4, -0.2, 0.0); // toward TV / back wall
await fp('r-kitchen-fp-a', 1.4, -0.7, 3.4, -3.2);
await fp('r-kitchen-fp-b', 4.6, -1.6, 2.2, -3.3);
await fp('r-bedroom-fp-a', -2.3, 2.0, -4.3, 2.7);
await fp('r-bedroom-fp-b', -2.6, 3.25, -4.6, 2.5);
await fp('r-hall-fp-a', -0.45, 1.1, -0.55, 3.7);
await fp('r-hall-fp-b', -0.45, 2.9, -0.45, 0.4);
await fp('r-bath-fp-a', 1.1, 1.3, 1.8, 3.2, 0.05);
await fp('r-bath-fp-b', 2.2, 2.5, 1.0, 3.0);
await fp('r-study-fp-a', 3.4, 1.6, 4.3, 3.3);
await fp('r-study-fp-b', 5.0, 2.9, 3.0, 1.5);

// --- third person where there is room
await tp('r-bedroom-tp', -3.6, 2.0, -4.5, 3.0, 0.22, 1.15);
await tp('r-study-tp', 3.9, 2.6, 4.2, 3.4, 0.2, 1.1);
await tp('r-bath-tp', 1.5, 1.6, 1.7, 3.2, 0.22, 0.85);
await tp('r-hall-tp', -0.45, 2.2, -0.45, 0.2, 0.15, 1.1);

// --- window / exterior treatment (look up at the glass)
await fp('r-win-living', -4.2, -1.0, -4.2, -3.8, 0.16);
await fp('r-win-kitchen', 3.3, -1.8, 3.3, -3.8, 0.14);
await fp('r-win-bedroom', -3.2, 2.6, -5.4, 2.7, 0.18);
await fp('r-win-study', 4.1, 1.6, 4.1, 3.7, 0.16);
await fp('r-front-door', -0.5, 2.4, -0.55, 3.8, 0.0);

// --- held object: grab, then orbit to a side view so the mug in the gripper is visible
await page.evaluate(() => { const A = window.__APP__; A.qa.setView('third'); A.qa.teleportNear('mug_white', 0.42); });
await wait(900);
out.grab = await page.evaluate(() => window.__APP__.qa.grabByName('mug_white'));
await wait(700);
await page.evaluate(() => { const A = window.__APP__; const r = A.state().robot; A.qa.setCamera(r.yaw + 1.15, 0.28, 1.3); });
await wait(800);
await take('r-held-mug');
await page.evaluate(() => window.__APP__.qa.action());
await wait(1100);
await take('r-placed-mug');

// --- needle close-up
await page.evaluate(() => { const A = window.__APP__; A.qa.teleportNear('needle', 0.36); });
await wait(900);
await page.evaluate(() => { const A = window.__APP__; const r = A.state().robot; A.qa.setCamera(r.yaw + 0.9, 0.42, 1.0); });
await wait(800);
await take('r-needle');

writeFileSync('qa/visual/focus.json', JSON.stringify({ out, logs }, null, 1));
console.log(JSON.stringify({ shots: Object.keys(out).length, grab: out.grab, logs }, null, 1));
await browser.close();
