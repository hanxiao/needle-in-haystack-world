// Scratch probe for robot v2 tuning — run against dist/ (not the v1 frozen artifact).
import puppeteer from 'puppeteer-core';
import { spawn } from 'node:child_process';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const PORT = 4199;
const DIR = process.env.QA_DIR || 'dist';
const srv = spawn(process.execPath, ['tools/serve.mjs', DIR], { cwd: process.cwd(), env: { ...process.env, PORT: String(PORT) }, stdio: 'ignore' });
const t0 = Date.now();
for (;;) { try { const r = await fetch(`http://127.0.0.1:${PORT}/`); if (r.ok) break; } catch {} if (Date.now() - t0 > 10000) throw new Error('server timeout'); await sleep(100); }
const browser = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, protocolTimeout: 180000, args: ['--no-sandbox', '--use-gl=angle', '--use-angle=metal', '--enable-gpu', '--window-size=1440,900'], defaultViewport: { width: 1440, height: 900 } });
const page = await browser.newPage();
const logs = [];
page.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`));
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'domcontentloaded' });
await page.waitForFunction('window.__APP__ && window.__APP__.ready===true', { timeout: 90000 });
await page.evaluate(() => {
  window.__QA = {
    sleep: (ms) => new Promise((r) => setTimeout(r, ms)),
    project(name) {
      const A = window.__APP__;
      if (A.qa.screenOf) { try { const s = A.qa.screenOf(name); if (s && Number.isFinite(s.x) && Number.isFinite(s.y)) return s; } catch {} }
      return null;
    },
    async ensureHover(name, opts = {}) {
      const A = window.__APP__;
      const dists = opts.dists || [0.35, 0.32, 0.4];
      const yaws = opts.yaws || [0, 0.5, -0.5];
      const offs = opts.offsets || [[0, 0], [-25, 0], [25, 0], [0, -25], [0, 25], [-25, -20], [25, -20], [-50, 0], [0, 50]];
      const tries = [];
      for (const dist of dists) {
        A.qa.reset(); A.qa.setView('third');
        const near = A.qa.teleportNear(name, dist);
        if (!near) return { found: false, reason: 'missing', tries };
        await this.sleep(650);
        for (const dy of yaws) {
          if (A.qa.setCamera) A.qa.setCamera(near.yaw + dy, 0.34, 1.25);
          await this.sleep(200);
          const s = this.project(name);
          if (!s) continue;
          for (const [ox, oy] of offs) {
            if (A.qa.pointerAt) A.qa.pointerAt(s.x + ox, s.y + oy);
            await this.sleep(85);
            const t = A.state().target;
            tries.push({ dist, dy, ox, oy, target: t });
            if (t === name) return { found: true, dist, screen: { x: s.x + ox, y: s.y + oy }, robot: A.state().robot.pos, obj: A.qa.object(name).pos, hud: A.qa.hudText(), near };
          }
        }
      }
      return { found: false, tries };
    },
  };
});
await sleep(2000);
const out = {};

// ---- movement
const moveRun = async (key, ms, boost = false, setup = null) => {
  await page.evaluate((s) => { const A = window.__APP__; A.qa.reset(); A.qa.setView('third'); if (s) { A.qa.teleport(s[0], s[1], s[2]); A.qa.setCamera(s[2], 0.34, 1.75); } }, setup);
  await sleep(450);
  const p0 = await page.evaluate(() => window.__APP__.state().robot.pos);
  if (boost) await page.keyboard.down('Shift');
  await page.keyboard.down(key);
  await sleep(ms);
  await page.keyboard.up(key);
  if (boost) await page.keyboard.up('Shift');
  await sleep(250);
  const p1 = await page.evaluate(() => window.__APP__.state().robot.pos);
  return { dx: +(p1[0] - p0[0]).toFixed(3), dz: +(p1[2] - p0[2]).toFixed(3), moved: +Math.hypot(p1[0] - p0[0], p1[2] - p0[2]).toFixed(3) };
};
out.move = {};
out.move.W = await moveRun('KeyW', 2000, false, [-3.6, -1.2, 0]);
out.move.S = await moveRun('KeyS', 2000, false, [-3.6, -1.2, 0]);
out.move.A = await moveRun('KeyA', 2000, false, [-3.6, -1.2, 0]);
out.move.D = await moveRun('KeyD', 2000, false, [-3.6, -1.2, 0]);
out.boost = { normal: await moveRun('KeyW', 2000, false, [-3.6, -1.2, 0]), boost: await moveRun('KeyW', 2000, true, [-3.6, -1.2, 0]) };

// ---- room crossings (3 s)
out.rooms = [];
for (const r of [
  { name: 'living->hallway', start: [-0.4, 0.2, Math.PI], ms: 3000, expect: 'HALLWAY' },
  { name: 'hallway->bathroom', start: [-0.2, 1.4, -Math.PI / 2], ms: 2800, expect: 'BATHROOM' },
  { name: 'kitchen->study', start: [4.05, 0.2, Math.PI], ms: 2800, expect: 'STUDY' },
  { name: 'living->kitchen', start: [-0.5, -1.1, -Math.PI / 2], ms: 3000, expect: 'KITCHEN / DINING' },
  { name: 'hallway->bedroom', start: [-0.8, 3.14, Math.PI / 2], ms: 3000, expect: 'BEDROOM', alt: [-0.5, 2.82, Math.PI / 2] },
]) {
  let got = null, pos = null;
  for (const start of [r.start, r.alt].filter(Boolean)) {
    await page.evaluate((s) => { const A = window.__APP__; A.qa.reset(); A.qa.setView('third'); A.qa.teleport(s[0], s[1], s[2]); }, start);
    await sleep(300);
    await page.keyboard.down('KeyW'); await sleep(r.ms); await page.keyboard.up('KeyW'); await sleep(300);
    const st = await page.evaluate(() => window.__APP__.state());
    got = st.room; pos = st.robot.pos.map((v) => +v.toFixed(2));
    if (got === r.expect) break;
  }
  out.rooms.push({ name: r.name, got, expect: r.expect, pos });
}

// ---- wall collision + tunnel (south wall)
out.wall = await page.evaluate(async () => {
  const A = window.__APP__;
  A.qa.reset(); A.qa.teleport(-3.6, -2.2, 0); A.qa.setView('third');
  await new Promise((r) => setTimeout(r, 400));
  return true;
});
{
  const samples = [];
  await page.keyboard.down('Shift'); await page.keyboard.down('KeyW');
  for (let i = 0; i < 35; i++) { await sleep(100); samples.push((await page.evaluate(() => window.__APP__.state().robot.pos))); }
  await page.keyboard.up('KeyW'); await page.keyboard.up('Shift'); await sleep(200);
  out.wall = { minZ: Math.min(...samples.map((p) => p[2])), final: (await page.evaluate(() => window.__APP__.state().robot.pos)).map((v) => +v.toFixed(2)), maxAbsX: Math.max(...samples.map((p) => Math.abs(p[0]))) };
}
// east wall tunnel
await page.evaluate(() => { const A = window.__APP__; A.qa.reset(); A.qa.teleport(4.0, 0.0, -Math.PI / 2); A.qa.setView('third'); });
await sleep(400);
{
  const samples = [];
  await page.keyboard.down('Shift'); await page.keyboard.down('KeyW');
  for (let i = 0; i < 35; i++) { await sleep(100); samples.push((await page.evaluate(() => window.__APP__.state().robot.pos))); }
  await page.keyboard.up('KeyW'); await page.keyboard.up('Shift'); await sleep(200);
  out.eastWall = { maxX: Math.max(...samples.map((p) => p[0])), final: (await page.evaluate(() => window.__APP__.state().robot.pos)).map((v) => +v.toFixed(2)) };
}
// interior wall
await page.evaluate(() => { const A = window.__APP__; A.qa.reset(); A.qa.teleport(-4.6, 0.0, Math.PI); A.qa.setView('third'); });
await sleep(400);
await page.keyboard.down('KeyW'); await sleep(3000); await page.keyboard.up('KeyW'); await sleep(250);
out.interior = (await page.evaluate(() => window.__APP__.state())).robot.pos.map((v) => +v.toFixed(2));

// ---- grabs
out.grabs = await page.evaluate(async () => {
  const A = window.__APP__;
  const res = {};
  for (const name of ['mug_white', 'laptop', 'needle', 'book_stack_1', 'plate_1', 'remote', 'keys', 'trash_bin', 'laundry_basket']) {
    A.qa.reset(); A.qa.setView('third');
    const near = A.qa.teleportNear(name, 0.33);
    await new Promise((r) => setTimeout(r, 550));
    const o = A.qa.object(name);
    const g = A.qa.grabByName(name);
    await new Promise((r) => setTimeout(r, 450));
    const st = A.state();
    const after = o ? A.qa.object(name).pos : null;
    res[name] = { near: near && near.pos, mass: o && o.mass, grab: g, held: st.robot.held, rise: o && after ? +(after[1] - o.pos[1]).toFixed(3) : null, hud: A.qa.hudText().held };
    A.qa.release();
  }
  return res;
});

// ---- pushes
out.pushes = await page.evaluate(async () => {
  const A = window.__APP__;
  const res = {};
  for (const [name, dists] of [
    ['sofa', [0.5, 0.45, 0.55]], ['bed', [0.5, 0.45]], ['wardrobe', [0.5, 0.45]], ['fridge', [0.5, 0.45]],
    ['bookshelf', [0.5, 0.45]], ['dining_table', [0.5, 0.45]], ['desk', [0.5, 0.45]],
    ['chair_1', [0.5, 0.45]], ['trash_bin', [0.45, 0.4]], ['laundry_basket', [0.45, 0.4]],
  ]) {
    const h = await window.__QA.ensureHover(name, { dists });
    if (!h.found) { res[name] = { found: false }; continue; }
    const before = A.qa.object(name).pos;
    const robot = A.state().robot.pos;
    A.qa.action();
    await new Promise((r) => setTimeout(r, 2000));
    const after = A.qa.object(name).pos;
    res[name] = { found: true, mass: A.qa.object(name).mass, robotDist: +Math.hypot(before[0] - robot[0], before[2] - robot[2]).toFixed(2), moved: +Math.hypot(after[0] - before[0], after[2] - before[2]).toFixed(4) };
  }
  return res;
});

// ---- HUD controls / badges / trail
out.hud = await page.evaluate(async () => {
  const A = window.__APP__;
  const res = {};
  res.controlsExists = !!document.querySelector('#hud-controls');
  res.kbds = [...document.querySelectorAll('#hud-controls kbd[data-key]')].map((e) => e.dataset.key);
  res.badges0 = { view: document.querySelector('#hud-view')?.textContent, surround: document.querySelector('#hud-360')?.textContent, light: document.querySelector('#hud-light')?.textContent, arm: document.querySelector('#hud-arm')?.textContent };
  res.trail = { points: A.trail ? A.trail.points.length : null, meshMask: A.trail?.mesh?.layers?.mask, outlineMask: A.trail?.outline?.layers?.mask, topMask: A.robot.cameras.top.layers.mask, frontMask: A.robot.cameras.front.layers.mask };
  return res;
});
// keycap highlight with real keys
await page.keyboard.down('KeyW');
await sleep(200);
out.keycapW = await page.evaluate(() => ({
  w: document.querySelector('kbd[data-key="KeyW"]')?.classList.contains('is-on'),
  anyOn: [...document.querySelectorAll('kbd[data-key]')].filter((e) => e.classList.contains('is-on')).map((e) => e.dataset.key),
}));
await page.keyboard.up('KeyW');
await sleep(200);
out.keycapWoff = await page.evaluate(() => document.querySelector('kbd[data-key="KeyW"]')?.classList.contains('is-on'));
await page.keyboard.down('Shift');
await sleep(200);
out.keycapShift = await page.evaluate(() => document.querySelector('kbd[data-key="ShiftLeft"]')?.classList.contains('is-on'));
await page.keyboard.up('Shift');
// toggles badges
await page.keyboard.press('KeyV'); await sleep(350);
await page.keyboard.press('KeyC'); await sleep(350);
await page.keyboard.press('KeyL'); await sleep(350);
out.badges1 = await page.evaluate(() => ({
  view: document.querySelector('#hud-view')?.textContent,
  surround: document.querySelector('#hud-360')?.textContent,
  light: document.querySelector('#hud-light')?.textContent,
  state: window.__APP__.state().robot.mode,
}));
await page.evaluate(() => { const A = window.__APP__; A.qa.setView('third'); A.qa.setSurround(true); A.qa.setNight(false); });
// trail after driving
await page.evaluate(() => { const A = window.__APP__; A.qa.reset(); A.qa.setView('third'); A.qa.teleport(-3.6, -1.2, 0); });
await sleep(400);
await page.keyboard.down('KeyW'); await sleep(1500); await page.keyboard.up('KeyW'); await sleep(400);
out.trailAfter = await page.evaluate(() => ({ points: window.__APP__.trail.points.length, meshMask: window.__APP__.trail.mesh.layers.mask, topMask: window.__APP__.robot.cameras.top.layers.mask, frontMask: window.__APP__.robot.cameras.front.layers.mask, backMask: window.__APP__.robot.cameras.back.layers.mask }));

// ---- target labels near/far
out.labels = await page.evaluate(async () => {
  const A = window.__APP__;
  const out = {};
  for (const [name, dists] of [['mug_white', [0.33, 0.3]], ['sofa', [0.35, 0.32, 0.4]]]) {
    const h = await window.__QA.ensureHover(name, { dists });
    out[name] = { found: h.found, target: A.state().target, hud: A.qa.hudText().target, robotObjDist: h.found ? +Math.hypot(h.obj[0] - h.robot[0], h.obj[2] - h.robot[2]).toFixed(2) : null };
  }
  // far: stand 1.6 m from sofa and hover it
  A.qa.reset(); A.qa.setView('third'); A.qa.teleportNear('sofa', 0.6);
  await new Promise((r) => setTimeout(r, 600));
  A.qa.setCamera(A.state().robot.yaw, 0.34, 3.2);
  await new Promise((r) => setTimeout(r, 400));
  const s = A.qa.screenOf('sofa');
  if (s) A.qa.pointerAt(s.x, s.y);
  await new Promise((r) => setTimeout(r, 400));
  out.far = { target: A.state().target, hud: A.qa.hudText().target, robot: A.state().robot.pos, obj: A.qa.object('sofa').pos };
  return out;
});

// ---- carry rise detail
out.carry = await page.evaluate(async () => {
  const A = window.__APP__;
  A.qa.reset(); A.qa.setView('third');
  A.qa.teleportNear('mug_white', 0.33);
  await new Promise((r) => setTimeout(r, 600));
  const before = A.qa.object('mug_white').pos;
  const g = A.qa.grabByName('mug_white');
  await new Promise((r) => setTimeout(r, 600));
  const heldPos = A.qa.object('mug_white').pos;
  return { before, heldPos, g, held: A.state().robot.held, rise: +(heldPos[1] - before[1]).toFixed(3) };
});

console.log(JSON.stringify({ out, logs }, null, 1));
await browser.close(); srv.kill();
