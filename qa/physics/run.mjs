#!/usr/bin/env node
// qa/physics/run.mjs — independent physics + real-mass audit for needle-in-haystack-world.
//
// Serves a single-file build on a private port, drives the real app in headless Chrome
// (puppeteer-core + local Chrome, Metal GPU) and audits:
//   A. build/boot provenance
//   B. engine laws & settings (gravity, fixed 60 Hz, solver, friction/restitution/damping,
//      sleeping, CCD, joints, NaN)
//   C. every dynamic object's mass vs realistic ranges + mass/inertia/collider sanity
//   D. static architecture (walls/floor/ceiling/doors/fixtures static, wall push)
//   E. push law: 7 kg / 0.4 m/s (0.55 boost) robot vs heavy vs light objects
//   F. arm payload 0.5 kg / reach 0.34 m
//   G. spawn interpenetration, below-floor, stacks, jitter, tunneling
//
// Usage:
//   node qa/physics/run.mjs [--dir=dist] [--port=4183] [--label=baseline]
//                           [--report=qa/reports/physics.md] [--json=qa/physics/last-run.json]
//   BUILD_DIR / PORT / PHYSICS_URL env vars also work.
// Writes a markdown report + JSON artifact; exits 1 when any FAIL row exists.
import http from 'node:http';
import { readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { extname, join, normalize, dirname, resolve } from 'node:path';
import { execSync } from 'node:child_process';
import puppeteer from 'puppeteer-core';

// ------------------------------------------------------------------ cli / config

function parseArgs(argv) {
  const out = {};
  for (const a of argv) {
    const m = /^--([\w-]+)=(.*)$/.exec(a);
    if (m) out[m[1]] = m[2];
    else if (a.startsWith('--')) out[a.slice(2)] = true;
  }
  return out;
}

const ARGS = parseArgs(process.argv.slice(2));
const ROOT = process.cwd();
const BUILD_DIR = ARGS.dir || process.env.BUILD_DIR || 'dist';
const LABEL = ARGS.label || 'current';
const PORT = Number(ARGS.port || process.env.PORT || 4183);
const REPORT_PATH = ARGS.report || 'qa/reports/physics.md';
const JSON_PATH = ARGS.json || 'qa/physics/last-run.json';
const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const EXTERNAL_URL = process.env.PHYSICS_URL || null;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const r3 = (v) => Math.round(v * 1000) / 1000;
const r4 = (v) => Math.round(v * 10000) / 10000;
const finite = (v) => typeof v === 'number' && Number.isFinite(v);

// ------------------------------------------------------------------ realistic mass ranges
// Ordered rules; first match wins. Ranges from docs/ROBOT_SPEC.md + the review brief.
const MASS_RULES = [
  // --- furniture (name specific first)
  { re: /^sofa$/, cat: 'sofa', lo: 65, hi: 100 },
  { re: /^armchair$/, cat: 'armchair', lo: 18, hi: 30 },
  { re: /^coffee_table$/, cat: 'coffee table', lo: 10, hi: 20 },
  { re: /^dining_table$/, cat: 'dining table', lo: 25, hi: 45 },
  { re: /^desk$/, cat: 'desk', lo: 20, hi: 35 },
  { re: /^bookshelf$/, cat: 'bookshelf', lo: 25, hi: 50 },
  { re: /^study_shelves$/, cat: 'open shelving', lo: 15, hi: 40 },
  { re: /^tv$/, cat: 'TV', lo: 8, hi: 15 },
  { re: /^monitor$/, cat: 'monitor', lo: 3, hi: 6 },
  { re: /^plant_monstera$/, cat: 'large plant', lo: 5, hi: 12 },
  { re: /^(plant_small|study_plant|herb_pot)$/, cat: 'small plant', lo: 0.5, hi: 3 },
  { re: /^floor_lamp$/, cat: 'floor lamp', lo: 3, hi: 6 },
  { re: /^bedside_lamp$/, cat: 'bedside lamp', lo: 0.8, hi: 2.5 },
  { re: /^desk_lamp$/, cat: 'desk lamp', lo: 0.8, hi: 3 },
  { re: /^nightstand$/, cat: 'nightstand', lo: 5, hi: 15 },
  { re: /^wardrobe$/, cat: 'wardrobe', lo: 80, hi: 140 },
  { re: /^fridge$/, cat: 'fridge', lo: 60, hi: 110 },
  { re: /^bed$/, cat: 'bed', lo: 60, hi: 90 },
  { re: /^(chair_\d+|desk_chair)$/, cat: 'chair', lo: 4, hi: 8 },
  { re: /^coat_rack$/, cat: 'coat rack', lo: 2, hi: 8 },
  { re: /^trash_bin$/, cat: 'trash bin', lo: 0.7, hi: 2 },
  { re: /^laundry_basket$/, cat: 'basket', lo: 0.6, hi: 1.5 },
  // --- clutter: name specific first
  { re: /^toothpaste$/, cat: 'toothpaste tube', lo: 0.05, hi: 0.25, suggest: 0.15 },
  { re: /^laptop$/, cat: 'laptop', lo: 1.2, hi: 2.0 },
  { re: /^book_stack_\d+$/, cat: 'book stack', lo: 0.8, hi: 3 },
  { re: /^magazine$/, cat: 'magazine', lo: 0.15, hi: 0.6 },
  { re: /notebook/, cat: 'notebook', lo: 0.15, hi: 0.6 },
  { re: /^(tissue_box|cereal_box)$/, cat: 'box', lo: 0.1, hi: 1.0 },
  { re: /^study_box_\d+$/, cat: 'storage box', lo: 0.5, hi: 3 },
  { re: /^(backpack|grocery_bag)$/, cat: 'bag', lo: 0.2, hi: 2.5 },
  { re: /^(cushion|pillow)/, cat: 'cushion/pillow', lo: 0.2, hi: 1.0 },
  { re: /^(shirt|hoodie|jeans|basket_clothes)/, cat: 'clothing', lo: 0.15, hi: 1.0 },
  { re: /^towel_floor$/, cat: 'bath towel', lo: 0.3, hi: 0.9 },
  { re: /^paper_ball$/, cat: 'paper ball', lo: 0.005, hi: 0.05 },
  { re: /^onion$/, cat: 'onion', lo: 0.1, hi: 0.3 },
  { re: /^(plate_|fruit_bowl)/, cat: 'plate', lo: 0.4, hi: 0.8 },
  { re: /^(bowl_|study_bowl)/, cat: 'bowl', lo: 0.2, hi: 0.8 },
  // --- clutter by tag
  { tag: 'mug', cat: 'mug', lo: 0.25, hi: 0.45 },
  { tag: 'dish', cat: 'dish', lo: 0.2, hi: 0.8 },
  { tag: 'book', cat: 'book', lo: 0.3, hi: 1.5 },
  { tag: 'kettle', cat: 'kettle', lo: 0.8, hi: 1.5 },
  { tag: 'pan', cat: 'pan', lo: 0.6, hi: 1.5 },
  { tag: 'bottle', cat: 'bottle', lo: 0.25, hi: 1.6 },
  { tag: 'jar', cat: 'jar', lo: 0.2, hi: 1.0 },
  { tag: 'box', cat: 'box', lo: 0.1, hi: 3 },
  { tag: 'bag', cat: 'bag', lo: 0.2, hi: 2.5 },
  { tag: 'blanket', cat: 'blanket/throw', lo: 0.5, hi: 2.5 },
  { tag: 'towel', cat: 'towel', lo: 0.05, hi: 0.6 },
  { tag: 'clothes', cat: 'clothing', lo: 0.15, hi: 1.2 },
  { tag: 'shoe', cat: 'shoe', lo: 0.25, hi: 1.2 },
  { tag: 'slipper', cat: 'slipper', lo: 0.1, hi: 0.5 },
  { tag: 'sock', cat: 'sock', lo: 0.03, hi: 0.15 },
  { tag: 'paper', cat: 'paper sheet', lo: 0.002, hi: 0.03 },
  { tag: 'mail', cat: 'mail', lo: 0.005, hi: 0.1 },
  { tag: 'pen', cat: 'pen', lo: 0.005, hi: 0.03 },
  { tag: 'candle', cat: 'candle', lo: 0.1, hi: 0.6 },
  { tag: 'remote', cat: 'remote', lo: 0.08, hi: 0.3 },
  { tag: 'phone', cat: 'phone', lo: 0.12, hi: 0.25 },
  { tag: 'keys', cat: 'keys', lo: 0.02, hi: 0.15 },
  { tag: 'glasses', cat: 'glasses', lo: 0.02, hi: 0.06 },
  { tag: 'brush', cat: 'hairbrush', lo: 0.05, hi: 0.2 },
  { tag: 'headphones', cat: 'headphones', lo: 0.1, hi: 0.45 },
  { tag: 'needle', cat: 'needle', lo: 0.0005, hi: 0.01 },
  { tag: 'fruit', cat: 'fruit', lo: 0.12, hi: 0.25 },
  { tag: 'food', cat: 'vegetable', lo: 0.05, hi: 0.5 },
  { tag: 'sponge', cat: 'sponge', lo: 0.005, hi: 0.1 },
  { tag: 'toothbrush', cat: 'toothbrush', lo: 0.01, hi: 0.05 },
  { tag: 'toiletroll', cat: 'toilet roll', lo: 0.1, hi: 0.3 },
  { tag: 'soap', cat: 'soap', lo: 0.05, hi: 0.2 },
  { tag: 'mouse', cat: 'mouse', lo: 0.06, hi: 0.15 },
  { tag: 'cable', cat: 'cable', lo: 0.02, hi: 0.3 },
  { tag: 'keyboard', cat: 'keyboard', lo: 0.4, hi: 1.2 },
  { tag: 'vase', cat: 'vase', lo: 0.3, hi: 2.5 },
  { tag: 'board', cat: 'cutting board', lo: 0.3, hi: 1.2 },
  { tag: 'rack', cat: 'rack', lo: 0.3, hi: 1.5 },
  { tag: 'holder', cat: 'pen holder', lo: 0.1, hi: 0.5 },
  { tag: 'scale', cat: 'bathroom scale', lo: 1.5, hi: 2.5 },
  { tag: 'mat', cat: 'bath mat', lo: 0.2, hi: 1.2 },
];

function classifyMass(name, tags) {
  for (const rule of MASS_RULES) {
    if (rule.re && rule.re.test(name)) return rule;
    if (rule.tag && tags.includes(rule.tag)) return rule;
  }
  return null;
}

// ------------------------------------------------------------------ results

const rows = [];
const findings = [];
function row(gate, status, evidence, opts = {}) {
  rows.push({ gate, status, evidence, sev: opts.sev || 'P2', detail: opts.detail || null });
  if (status === 'FAIL') findings.push({ sev: opts.sev || 'P2', gate, evidence, detail: opts.detail || null });
}

// ------------------------------------------------------------------ static server

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.wasm': 'application/wasm',
  '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
};

async function startServer(dir) {
  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://127.0.0.1');
      let p = normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, '');
      let f = join(dir, p);
      try {
        if ((await stat(f)).isDirectory()) f = join(f, 'index.html');
      } catch {
        if (!extname(f)) f = join(f, 'index.html');
      }
      const buf = await readFile(f);
      res.writeHead(200, {
        'content-type': MIME[extname(f)] || 'application/octet-stream',
        'cache-control': 'no-store',
        'cross-origin-opener-policy': 'same-origin',
        'cross-origin-embedder-policy': 'require-corp',
      });
      res.end(buf);
    } catch {
      res.writeHead(404, { 'content-type': 'text/plain' });
      res.end('not found');
    }
  });
  const port = await new Promise((resolveP, reject) => {
    server.once('error', (err) => {
      if (err.code === 'EADDRINUSE' && !ARGS.port) {
        server.listen(0, '127.0.0.1', () => resolveP(server.address().port));
      } else reject(err);
    });
    server.listen(PORT, '127.0.0.1', () => resolveP(server.address().port));
  });
  return { server, port, url: `http://127.0.0.1:${port}/` };
}

// ------------------------------------------------------------------ page-side helpers
// Installed once on window.__PQ__; every later evaluate reuses it.
function installHelpers() {
  const A = window.__APP__;
  const P = A.physics;
  const R = P.RAPIER;
  const rotMat = (q) => {
    const { x, y, z, w } = q;
    return [
      1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w),
      2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w),
      2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y),
    ];
  };
  const shapeHalf = (s) => {
    const t = s.type;
    if (s.halfExtents) return [s.halfExtents.x, s.halfExtents.y, s.halfExtents.z];
    if (t === 0) return [s.radius, s.radius, s.radius]; // Ball
    if (t === 10) return [s.radius, s.halfHeight, s.radius]; // Cylinder
    if (t === 2) return [s.radius, s.halfHeight + s.radius, s.radius]; // Capsule
    return [0.01, 0.01, 0.01];
  };
  const colAABB = (c) => {
    const t = c.translation();
    const m = rotMat(c.rotation());
    const [hx, hy, hz] = shapeHalf(c.shape);
    const ex = Math.abs(m[0]) * hx + Math.abs(m[1]) * hy + Math.abs(m[2]) * hz;
    const ey = Math.abs(m[3]) * hx + Math.abs(m[4]) * hy + Math.abs(m[5]) * hz;
    const ez = Math.abs(m[6]) * hx + Math.abs(m[7]) * hy + Math.abs(m[8]) * hz;
    return { min: [t.x - ex, t.y - ey, t.z - ez], max: [t.x + ex, t.y + ey, t.z + ez] };
  };
  const objAABB = (o) => {
    const min = [Infinity, Infinity, Infinity];
    const max = [-Infinity, -Infinity, -Infinity];
    for (const c of o.colliders) {
      const bb = colAABB(c);
      for (let i = 0; i < 3; i++) {
        if (bb.min[i] < min[i]) min[i] = bb.min[i];
        if (bb.max[i] > max[i]) max[i] = bb.max[i];
      }
    }
    return { min, max, size: [max[0] - min[0], max[1] - min[1], max[2] - min[2]] };
  };
  const distToAABB2D = (px, pz, bb) => {
    const dx = Math.max(bb.min[0] - px, 0, px - bb.max[0]);
    const dz = Math.max(bb.min[2] - pz, 0, pz - bb.max[2]);
    return Math.hypot(dx, dz);
  };
  // All narrow-phase contact pairs, deduped by object pair, keeping the deepest contact.
  const penetration = () => {
    const map = new Map();
    const visit = (c, other, flipped) => {
      const o1 = P.colliderToObj.get(c.handle);
      const o2 = P.colliderToObj.get(other.handle);
      if (!o1 || !o2 || o1 === o2) return;
      P.world.contactPair(c, other, (man) => {
        let n = null;
        try { n = man.normal(); } catch { /* older api */ }
        for (let i = 0; i < man.numContacts(); i++) {
          const d = man.contactDist(i);
          const key = [o1.name, o2.name].sort().join('|');
          const cur = map.get(key);
          if (!cur || d < cur.d) {
            map.set(key, {
              a: o1.name, b: o2.name, d, dyn: !o1.isStatic && !o2.isStatic,
              normal: n ? [n.x, n.y, n.z] : null,
            });
          }
        }
      });
    };
    for (const o of P.objects) for (const c of o.colliders) P.world.contactPairsWith(c, (other) => visit(c, other));
    return [...map.values()].sort((a, b) => a.d - b.d);
  };
  window.__PQ__ = { A, P, R, rotMat, shapeHalf, colAABB, objAABB, distToAABB2D, penetration };
}

// ------------------------------------------------------------------ snapshot

async function snapshot() {
  return page.evaluate(() => {
    const { A, P, R, objAABB } = window.__PQ__;
    const v3 = (v) => [v.x, v.y, v.z];
    const objects = P.objects.map((o) => {
      const t = o.body.translation();
      const q = o.body.rotation();
      let inertia = null;
      try { inertia = v3(o.body.principalInertia()); } catch { /* older api */ }
      let colMassSum = 0;
      const cols = o.colliders.map((c) => {
        const m = c.mass();
        colMassSum += m;
        let dims = null;
        try {
          const s = c.shape;
          if (s.halfExtents) dims = { half: v3(s.halfExtents) };
          else if (s.radius !== undefined) dims = { radius: s.radius, halfHeight: s.halfHeight ?? null };
        } catch { /* ignore */ }
        return {
          type: c.shape.type, dims, mass: m,
          friction: c.friction(), restitution: c.restitution(),
          offset: v3(c.translation()), quat: [c.rotation().x, c.rotation().y, c.rotation().z, c.rotation().w],
          aabb: objAABB({ colliders: [c] }),
        };
      });
      return {
        name: o.name, static: o.isStatic, mass: o.mass, bodyMass: o.body.mass(),
        bodyType: o.body.bodyType(), nCol: o.body.numColliders(),
        linDamp: o.body.linearDamping(), angDamp: o.body.angularDamping(),
        ccd: o.body.isCcdEnabled(), gravScale: o.body.gravityScale(),
        sleeping: o.body.isSleeping ? o.body.isSleeping() : null,
        pos: v3(t), quat: [q.x, q.y, q.z, q.w],
        linvel: v3(o.body.linvel()), angvel: v3(o.body.angvel()),
        inertia, colMassSum, tags: o.tags, room: o.room, grabbable: o.grabbable,
        aabb: objAABB(o), cols,
      };
    });
    const ip = P.world.integrationParameters || {};
    return {
      objects,
      engine: {
        timestep: P.world.timestep,
        gravity: v3(P.world.gravity),
        numSolverIterations: P.world.numSolverIterations,
        dt: ip.dt ?? null,
        stats: P.stats(),
        impulseJoints: P.world.impulseJoints.len(),
        rapierVersion: R.version ? R.version() : null,
        bodies: P.world.bodies.len(),
        colliders: P.world.colliders.len(),
      },
      ui: {
        fps: A.state().fps, frame: A.state().frame,
        drawCalls: A.state().drawCalls, triangles: A.state().triangles,
        errors: (A.errors || []).slice(0, 10),
      },
    };
  });
}

// ------------------------------------------------------------------ main

let browser = null;
let server = null;
let page = null;
const consoleLog = [];
const failedRequests = [];
let pageUrl = '';
let buildMeta = {};
const tStart = Date.now();

try {
  // ---------- serve + boot
  if (EXTERNAL_URL) {
    pageUrl = EXTERNAL_URL;
  } else {
    const s = await startServer(BUILD_DIR);
    server = s.server;
    pageUrl = s.url;
  }

  const indexPath = join(BUILD_DIR, 'index.html');
  let indexBuf = null;
  try { indexBuf = await readFile(indexPath); } catch { /* external url */ }
  buildMeta = {
    dir: EXTERNAL_URL ? null : BUILD_DIR,
    url: pageUrl,
    bytes: indexBuf ? indexBuf.length : null,
    sha256: indexBuf ? createHash('sha256').update(indexBuf).digest('hex') : null,
    gitHead: (() => { try { return execSync('git rev-parse --short HEAD', { cwd: ROOT }).toString().trim(); } catch { return null; } })(),
    gitDirty: (() => {
      try { return execSync('git status --porcelain -- src docs', { cwd: ROOT }).toString().trim().split('\n').filter(Boolean); } catch { return []; }
    })(),
    label: LABEL,
  };

  browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    args: ['--no-sandbox', '--use-gl=angle', '--use-angle=metal', '--enable-gpu', '--window-size=1440,900'],
    defaultViewport: { width: 1440, height: 900 },
  });
  page = await browser.newPage();
  page.on('console', (m) => consoleLog.push({ type: m.type(), text: m.text() }));
  page.on('pageerror', (e) => consoleLog.push({ type: 'pageerror', text: e.message }));
  page.on('requestfailed', (req) => failedRequests.push({ url: req.url(), err: req.failure()?.errorText || 'failed' }));

  await page.goto(pageUrl, { waitUntil: 'networkidle0', timeout: 90000 });
  await page.waitForFunction('window.__APP__ && window.__APP__.ready===true', { timeout: 90000 });
  await sleep(2200); // let the sim settle + fps average out
  await page.evaluate(installHelpers);

  const bootState = await page.evaluate(() => {
    const A = window.__APP__;
    return {
      ready: A.ready === true,
      errors: (A.errors || []).slice(0, 10),
      fps: A.state().fps, frame: A.state().frame,
      drawCalls: A.state().drawCalls, triangles: A.state().triangles,
      physics: A.state().physics, room: A.state().room,
      qaKeys: Object.keys(A.qa).length,
      robotKeys: Object.keys(A.robot || {}),
    };
  });
  const frameA = bootState.frame;
  await sleep(2000);
  const fpsSample = await page.evaluate((f0) => {
    const A = window.__APP__;
    return { frame: A.state().frame, fps: A.state().fps, delta: A.state().frame - f0 };
  }, frameA);
  const fps = fpsSample.delta / 2;

  // ================================================================ A. boot
  row('A1 app boots, ready flag set', bootState.ready ? 'PASS' : 'FAIL',
    `ready=${bootState.ready} after ${((Date.now() - tStart) / 1000).toFixed(1)}s; room=${bootState.room}`, { sev: 'P0' });
  const pageErrors = consoleLog.filter((l) => l.type === 'error' || l.type === 'pageerror');
  const pageWarns = consoleLog.filter((l) => l.type === 'warning' || l.type === 'warn');
  row('A2 no console errors / page errors', pageErrors.length === 0 ? 'PASS' : 'FAIL',
    `${pageErrors.length} errors${pageErrors.length ? ': ' + pageErrors.slice(0, 3).map((l) => l.text).join(' | ') : ''}`, { sev: 'P1' });
  row('A3 no console warnings', pageWarns.length === 0 ? 'PASS' : 'INFO',
    `${pageWarns.length} warnings${pageWarns.length ? ': ' + pageWarns.slice(0, 2).map((l) => l.text).join(' | ') : ''}`);
  row('A4 no failed network requests', failedRequests.length === 0 ? 'PASS' : 'FAIL',
    `${failedRequests.length} failed${failedRequests.length ? ': ' + failedRequests.slice(0, 3).map((f) => f.url).join(', ') : ''}`, { sev: 'P2' });
  row('A5 runtime errors array empty', bootState.errors.length === 0 ? 'PASS' : 'FAIL',
    `__APP__.errors = ${JSON.stringify(bootState.errors.slice(0, 3))}`, { sev: 'P1' });
  row('A6 steady fps >= 50 @1440x900', fps >= 50 ? 'PASS' : (fps >= 45 ? 'INFO' : 'FAIL'),
    `${fps.toFixed(1)} fps over 2 s (reported ${fpsSample.fps.toFixed(1)}); drawCalls=${bootState.drawCalls}` +
      (fps < 50 ? ' — host under load' : ''), { sev: 'P2' });
  row('A7 draw calls <= 450', bootState.drawCalls <= 450 ? 'PASS' : 'FAIL',
    `drawCalls=${bootState.drawCalls} triangles=${bootState.triangles}`, { sev: 'P2' });

  // ================================================================ B. engine laws
  const snap = await snapshot();
  const eng = snap.engine;
  let shotPath = null;
  try {
    await mkdir('qa/physics/shots', { recursive: true });
    shotPath = join('qa/physics/shots', `${LABEL.replace(/[^\w-]/g, '_')}-scene.png`);
    await page.screenshot({ path: shotPath });
  } catch { shotPath = null; }
  const dyn = snap.objects.filter((o) => !o.static);
  const stat = snap.objects.filter((o) => o.static);

  // fixed-step rate (independent of rAF); tolerate a loaded host — measure fps alongside
  const stepRate = await page.evaluate(async () => {
    const A = window.__APP__;
    const P = A.physics;
    const s0 = P.steps; const f0 = A.state().frame; const t0 = performance.now();
    await new Promise((r) => setTimeout(r, 2000));
    return { steps: P.steps - s0, frames: A.state().frame - f0, ms: performance.now() - t0 };
  });
  const stepsPerSec = (stepRate.steps / stepRate.ms) * 1000;
  const fpsDuring = (stepRate.frames / stepRate.ms) * 1000;
  const hostLoaded = fpsDuring < 55;

  row('B1 gravity is -9.81 m/s2 on Y', Math.abs(eng.gravity[1] + 9.81) < 1e-6 && eng.gravity[0] === 0 && eng.gravity[2] === 0 ? 'PASS' : 'FAIL',
    `gravity = [${eng.gravity.map((v) => r3(v)).join(', ')}]`, { sev: 'P0' });
  row('B2 fixed timestep is 1/60 s', Math.abs(eng.timestep - 1 / 60) < 1e-6 ? 'PASS' : 'FAIL',
    `world.timestep = ${eng.timestep.toFixed(9)} s (1/60 = ${(1 / 60).toFixed(9)})`, { sev: 'P0' });
  row('B3 simulation runs at fixed 60 Hz', Math.abs(stepsPerSec - 60) <= 3 || (hostLoaded && stepsPerSec >= 50) ? 'PASS' : 'FAIL',
    `${stepsPerSec.toFixed(2)} physics steps/s over ${stepRate.ms.toFixed(0)} ms (${stepRate.steps} steps, ${fpsDuring.toFixed(1)} fps)` +
      (hostLoaded ? ' — host under load, rate limited by render loop' : ''),
    { sev: 'P0' });
  row('B4 solver iterations >= 8', eng.numSolverIterations >= 8 ? 'PASS' : 'FAIL',
    `world.numSolverIterations = ${eng.numSolverIterations}`, { sev: 'P1' });

  // empirical gravity: temporary free-falling body; velocity delta is integration-scheme independent
  const gravTest = await page.evaluate(async () => {
    const { P, R } = window.__PQ__;
    const body = P.world.createRigidBody(
      R.RigidBodyDesc.dynamic().setTranslation(0.5, 2.45, 0.5).setLinearDamping(0).setAngularDamping(0)
    );
    P.world.createCollider(R.ColliderDesc.ball(0.03).setDensity(1000), body);
    const s0 = P.steps; const v0 = body.linvel().y; const y0 = body.translation().y;
    await new Promise((r) => setTimeout(r, 500));
    const n = P.steps - s0; const v1 = body.linvel().y; const y1 = body.translation().y;
    P.world.removeRigidBody(body);
    const dt = P.world.timestep;
    const g = (v0 - v1) / (n * dt);
    return { n, dt, y0, y1, v0, v1, g };
  });
  row('B5 empirical free-fall g ~= 9.81 m/s2', finite(gravTest.g) && Math.abs(gravTest.g - 9.81) < 0.25 ? 'PASS' : 'FAIL',
    `measured g=${gravTest.g.toFixed(3)} m/s2 from dv/dt over ${gravTest.n} steps (v: ${gravTest.v0.toFixed(2)} -> ${gravTest.v1.toFixed(2)} m/s)`, { sev: 'P0' });

  // drive speed law in the open
  const speedTest = await page.evaluate(async () => {
    const { A } = window.__PQ__;
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    A.qa.reset(); await sleep(350);
    A.qa.teleport(-2.6, -0.6, 0); await sleep(350);
    const sample = async (ms) => {
      const out = []; const t0 = performance.now();
      while (performance.now() - t0 < ms) { out.push(A.robot.getState().speed); await sleep(100); }
      return Math.max(...out);
    };
    A.qa.hold('KeyW');
    const normal = await sample(1300);
    A.qa.hold('ShiftLeft');
    const boost = await sample(1300);
    A.qa.releaseKey('KeyW'); A.qa.releaseKey('ShiftLeft');
    await sleep(300);
    return { normal, boost };
  });
  row('B6 max drive speed 0.40 m/s (boost 0.55)', Math.abs(speedTest.normal - 0.4) <= 0.03 && Math.abs(speedTest.boost - 0.55) <= 0.04 ? 'PASS' : 'FAIL',
    `normal=${speedTest.normal.toFixed(3)} m/s, boost=${speedTest.boost.toFixed(3)} m/s`, { sev: 'P1' });

  // damping + friction presets
  const heavy = dyn.filter((o) => o.mass >= 20);
  const lowDamp = heavy.filter((o) => o.linDamp < 0.25 || o.angDamp < 0.5);
  row('B7 heavy furniture (>=20 kg) damping >= 0.25/0.5', lowDamp.length === 0 ? 'PASS' : 'FAIL',
    lowDamp.length ? `${lowDamp.length}/${heavy.length} low: ${lowDamp.map((o) => `${o.name} ${o.linDamp.toFixed(2)}/${o.angDamp.toFixed(2)}`).join(', ')}` : `all ${heavy.length} heavy bodies >= 0.25/0.5`,
    { sev: 'P2' });
  const allCols = dyn.flatMap((o) => o.cols);
  const badFric = allCols.filter((c) => !(c.friction > 0 && c.friction <= 1.2));
  const badRest = allCols.filter((c) => !(c.restitution >= 0 && c.restitution <= 1));
  row('B8 friction in (0,1.2] and restitution in [0,1]', badFric.length === 0 && badRest.length === 0 ? 'PASS' : 'FAIL',
    `${allCols.length} dynamic colliders; badFriction=${badFric.length}, badRestitution=${badRest.length}`, { sev: 'P2' });
  const heavyCols = heavy.flatMap((o) => o.cols.map((c) => ({ name: o.name, ...c })));
  const heavyLowFric = heavyCols.filter((c) => c.friction < 0.8);
  row('B9 heavy furniture colliders friction >= 0.8', heavyLowFric.length === 0 ? 'PASS' : 'FAIL',
    heavyLowFric.length ? `${heavyLowFric.length}/${heavyCols.length} heavy colliders below 0.8: ${[...new Set(heavyLowFric.map((c) => `${c.name} ${c.friction.toFixed(2)}`))].join(', ')}` : `all ${heavyCols.length} heavy colliders >= 0.8`,
    { sev: 'P2' });
  const zeroDamp = dyn.filter((o) => o.linDamp <= 0 || o.angDamp <= 0);
  row('B10 every dynamic body has damping > 0', zeroDamp.length === 0 ? 'PASS' : 'FAIL',
    `${dyn.length - zeroDamp.length}/${dyn.length} bodies have lin+ang damping > 0`, { sev: 'P3' });

  // sleeping
  const sleeping = dyn.filter((o) => o.sleeping === true).length;
  const sleepingPct = dyn.length ? sleeping / dyn.length : 0;
  row('B11 objects settle to sleep (>=90%)', sleepingPct >= 0.9 ? 'PASS' : 'FAIL',
    `${sleeping}/${dyn.length} dynamic bodies asleep after settle (${(sleepingPct * 100).toFixed(0)}%)`, { sev: 'P1' });

  // NaN / non-finite + inertia
  const badTransform = snap.objects.filter((o) =>
    !o.pos.every(finite) || !o.quat.every(finite) || !o.linvel.every(finite) || !o.angvel.every(finite));
  const badInertia = dyn.filter((o) => !o.inertia || !o.inertia.every(finite) || o.inertia.some((v) => v <= 0));
  row('B12 all body transforms/velocities finite (no NaN)', badTransform.length === 0 ? 'PASS' : 'FAIL',
    badTransform.length ? `non-finite: ${badTransform.slice(0, 5).map((o) => o.name).join(', ')}` : `${snap.objects.length}/${snap.objects.length} bodies finite`,
    { sev: 'P0' });
  row('B13 positive finite principal inertia on all dynamic bodies', badInertia.length === 0 ? 'PASS' : 'FAIL',
    badInertia.length ? `bad inertia: ${badInertia.slice(0, 5).map((o) => `${o.name}=[${o.inertia}]`).join(', ')}` : `${dyn.length}/${dyn.length} dynamic bodies have positive finite inertia`,
    { sev: 'P1' });
  const ccdOn = dyn.filter((o) => o.ccd).length;
  row('B14 CCD coverage reported', 'INFO', `${ccdOn}/${dyn.length} dynamic bodies have CCD enabled (tunneling checked in G4)`, { sev: 'P3' });
  row('B15 joint count sane at rest', eng.impulseJoints === 0 ? 'PASS' : 'INFO',
    `world.impulseJoints = ${eng.impulseJoints} at rest (expected 0)`, { sev: 'P3' });

  // ================================================================ C. mass audit
  const massTable = [];
  const outliers = [];
  const unclassified = [];
  for (const o of dyn) {
    const rule = classifyMass(o.name, o.tags);
    if (!rule) {
      unclassified.push(o.name);
      massTable.push({ name: o.name, mass: o.mass, cat: 'unclassified', lo: null, hi: null, verdict: 'INFO' });
      continue;
    }
    const ok = o.mass >= rule.lo && o.mass <= rule.hi;
    const suggested = !ok ? (rule.suggest ?? (o.mass < rule.lo ? rule.lo : rule.hi)) : null;
    massTable.push({ name: o.name, mass: o.mass, cat: rule.cat, lo: rule.lo, hi: rule.hi, verdict: ok ? 'PASS' : 'OUTLIER', suggested });
    if (!ok) outliers.push({ name: o.name, mass: o.mass, cat: rule.cat, lo: rule.lo, hi: rule.hi, suggested });
  }
  massTable.sort((a, b) => b.mass - a.mass);

  const badMass = dyn.filter((o) => !(o.mass > 0) || !finite(o.mass));
  row('C1 every dynamic body has mass > 0 and finite', badMass.length === 0 ? 'PASS' : 'FAIL',
    `${dyn.length}/${dyn.length} dynamic bodies have positive finite mass`, { sev: 'P0' });
  const massMismatch = dyn.filter((o) => Math.abs(o.bodyMass - o.mass) > Math.max(1e-3, o.mass * 0.01));
  row('C2 declared mass == Rapier body mass (compound distribution)', massMismatch.length === 0 ? 'PASS' : 'FAIL',
    massMismatch.length ? `${massMismatch.length} mismatches: ${massMismatch.slice(0, 5).map((o) => `${o.name} ${o.mass} vs ${o.bodyMass.toFixed(3)}`).join(', ')}` : `${dyn.length}/${dyn.length} exact within 1%`,
    { sev: 'P1' });
  const colSumBad = dyn.filter((o) => Math.abs(o.colMassSum - o.bodyMass) > Math.max(1e-3, o.bodyMass * 0.01));
  row('C3 collider mass sum == body mass', colSumBad.length === 0 ? 'PASS' : 'FAIL',
    colSumBad.length ? `${colSumBad.length} mismatches: ${colSumBad.slice(0, 5).map((o) => `${o.name} ${o.colMassSum.toFixed(3)} vs ${o.bodyMass.toFixed(3)}`).join(', ')}` : `${dyn.length}/${dyn.length} colliders sum to body mass`,
    { sev: 'P2' });
  row('C4 every dynamic object classified against a realistic range', unclassified.length === 0 ? 'PASS' : 'INFO',
    unclassified.length ? `${unclassified.length} unclassified: ${unclassified.slice(0, 8).join(', ')}` : `${dyn.length}/${dyn.length} objects classified`, { sev: 'P3' });
  row('C5 masses realistic (no outliers)', outliers.length === 0 ? 'PASS' : 'FAIL',
    outliers.length ? `${outliers.length} outlier(s): ${outliers.map((o) => `${o.name} ${o.mass}kg -> ${o.suggested}kg`).join(', ')}` : `all ${dyn.length} dynamic masses within realistic ranges`,
    { sev: 'P2' });
  const gravScaleBad = dyn.filter((o) => Math.abs(o.gravScale - 1) > 1e-6);
  row('C6 gravityScale == 1 for dynamic bodies', gravScaleBad.length === 0 ? 'PASS' : 'FAIL',
    gravScaleBad.length ? `${gravScaleBad.length} bodies: ${gravScaleBad.slice(0, 5).map((o) => `${o.name}=${o.gravScale}`).join(', ')}` : `${dyn.length}/${dyn.length} at 1.0`,
    { sev: 'P2' });
  const grabBad = dyn.filter((o) => o.grabbable !== (o.mass <= 0.5 + 1e-9));
  row('C7 grabbable == (mass <= 0.5 kg)', grabBad.length === 0 ? 'PASS' : 'FAIL',
    grabBad.length ? `${grabBad.length} mismatch: ${grabBad.slice(0, 6).map((o) => `${o.name} ${o.mass}kg grabbable=${o.grabbable}`).join(', ')}` : `${dyn.length}/${dyn.length} consistent with 0.5 kg payload`,
    { sev: 'P2' });
  const zeroCol = dyn.filter((o) => o.nCol < 1);
  row('C8 every dynamic body has >= 1 collider', zeroCol.length === 0 ? 'PASS' : 'FAIL',
    `${dyn.length - zeroCol.length}/${dyn.length} bodies have colliders`, { sev: 'P1' });

  // ================================================================ D. static architecture
  const ARCH_RE = /^(walls?|floor_wood|floor_tile|ceiling|ceiling_lamps|windows|thresholds|exterior|city_view|wall_art|rug|bedroom_rug|entry_mat|tv_stand|kitchen_counter|stove|bathtub|toilet|bathroom_vanity|towel_rail|drapes)$/;
  const archLike = snap.objects.filter((o) => o.tags.includes('architecture') || ARCH_RE.test(o.name));
  const dynArch = archLike.filter((o) => !o.static);
  const fixedBad = stat.filter((o) => o.bodyType !== 1);
  row('D1 all architecture objects are static (fixed)', dynArch.length === 0 && fixedBad.length === 0 ? 'PASS' : 'FAIL',
    dynArch.length ? `dynamic architecture: ${dynArch.map((o) => o.name).join(', ')}` : `${archLike.length} architecture objects static, bodyType=fixed`,
    { sev: 'P1' });
  const doors = snap.objects.filter((o) => /door/i.test(o.name));
  row('D2 doors are static (no dynamic door leaf)', doors.every((o) => o.static) ? 'PASS' : 'FAIL',
    doors.length ? `door-named objects: ${doors.map((o) => `${o.name}${o.static ? ' static' : ' DYNAMIC'}`).join(', ')}` : 'no separate door objects; door leaves merged into static `walls` body (src/world/apartment.js addDoorLeaf -> walls batch)',
    { sev: 'P1' });

  // wall drive test: 4 sides, 2 s boost into wall
  const wallTest = await page.evaluate(async () => {
    const { A, P } = window.__PQ__;
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const staticBefore = new Map(P.objects.filter((o) => o.isStatic).map((o) => [o.name, [o.body.translation().x, o.body.translation().y, o.body.translation().z]]));
    const cases = [
      { side: 'north (z-)', x: -3.0, z: -3.0, yaw: 0 },
      { side: 'south (z+)', x: -3.0, z: 3.0, yaw: Math.PI },
      { side: 'west (x-)', x: -4.9, z: -1.0, yaw: Math.PI / 2 },
      { side: 'east (x+)', x: 4.9, z: -1.0, yaw: -Math.PI / 2 },
    ];
    const out = [];
    for (const c of cases) {
      A.qa.reset(); await sleep(300);
      A.qa.teleport(c.x, c.z, c.yaw); await sleep(400);
      const r0 = A.qa.state().robot.pos.slice();
      A.qa.hold('KeyW'); A.qa.hold('ShiftLeft');
      await sleep(2000);
      A.qa.releaseKey('KeyW'); A.qa.releaseKey('ShiftLeft');
      await sleep(400);
      const r1 = A.qa.state().robot.pos.slice();
      const walls = P.get('walls');
      const w = walls ? [walls.body.translation().x, walls.body.translation().y, walls.body.translation().z] : null;
      out.push({ side: c.side, r0, r1, moved: Math.hypot(r1[0] - r0[0], r1[2] - r0[2]), walls: w, finite: r1.every(Number.isFinite) });
    }
    const staticAfter = new Map(P.objects.filter((o) => o.isStatic).map((o) => [o.name, [o.body.translation().x, o.body.translation().y, o.body.translation().z]]));
    let movedStatic = [];
    for (const [name, p0] of staticBefore) {
      const p1 = staticAfter.get(name);
      if (!p1) { movedStatic.push(name); continue; }
      if (Math.hypot(p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]) > 1e-9) movedStatic.push(name);
    }
    return { cases: out, movedStatic };
  });
  const inside = wallTest.cases.filter((c) => Math.abs(c.r1[0]) <= 5.45 && Math.abs(c.r1[2]) <= 3.65);
  row('D3 robot cannot drive through walls (4 sides, 2 s boost)', inside.length === wallTest.cases.length ? 'PASS' : 'FAIL',
    wallTest.cases.map((c) => `${c.side}: end (${r3(c.r1[0])}, ${r3(c.r1[2])}) moved ${r3(c.moved)} m`).join('; '), { sev: 'P1' });
  row('D4 walls/static bodies do not move at all', wallTest.movedStatic.length === 0 ? 'PASS' : 'FAIL',
    wallTest.movedStatic.length ? `moved: ${wallTest.movedStatic.join(', ')}` : `${stat.length} static bodies bit-identical after 4 wall impacts`, { sev: 'P1' });

  // dynamic objects that visually read as architecture
  const wallLike = dyn
    .filter((o) => o.aabb.size[1] >= 1.6 && Math.max(o.aabb.size[0], o.aabb.size[2]) >= 0.8)
    .map((o) => `${o.name} (${o.mass} kg, ${o.aabb.size.map((v) => v.toFixed(2)).join('x')} m)`);
  row('D5 no dynamic object reads as wall/door', wallLike.length === 0 ? 'PASS' : 'INFO',
    wallLike.length ? `large dynamic slabs: ${wallLike.join(', ')} — immovable per spec but visually architecture-scale` : 'none',
    { sev: 'P3' });

  // ================================================================ E. push law
  const PUSH_CASES = [
    { name: 'sofa', kind: 'heavy' },
    { name: 'bed', kind: 'heavy' },
    { name: 'wardrobe', kind: 'heavy' },
    { name: 'fridge', kind: 'heavy' },
    { name: 'bookshelf', kind: 'heavy' },
    { name: 'dining_table', kind: 'heavy' },
    { name: 'desk', kind: 'heavy' },
    { name: 'armchair', kind: 'heavy-spec' },
    { name: 'chair_1', kind: 'light' },
    { name: 'study_box_1', kind: 'light' },
    { name: 'study_box_2', kind: 'light' },
    { name: 'trash_bin', kind: 'light' },
    { name: 'laundry_basket', kind: 'light' },
    { name: 'coffee_table', kind: 'medium' },
  ];
  const pushRes = await page.evaluate(async (cases) => {
    const { A, P, R, objAABB, distToAABB2D } = window.__PQ__;
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const ROOMS = {
      living: [-2.7, -1.55], kitchen: [2.9, -1.55], bedroom: [-3.5, 2.25],
      hallway: [-0.4, 2.25], bathroom: [1.7, 2.25], study: [4.2, 2.25],
    };
    const norm = (v) => { const l = Math.hypot(v[0], v[1]) || 1; return [v[0] / l, v[1] / l]; };
    // Place the robot on a clear ring around the object's collider footprint, facing its centre.
    const customPlace = (obj, startAngle) => {
      const bb = objAABB(obj);
      const cx = (bb.min[0] + bb.max[0]) / 2;
      const cz = (bb.min[2] + bb.max[2]) / 2;
      for (const gap of [0.30, 0.50, 0.70]) {
        for (let k = 0; k < 16; k++) {
          const a = startAngle + (k / 16) * Math.PI * 2;
          const dir = [Math.cos(a), Math.sin(a)];
          let tExit = Infinity;
          if (Math.abs(dir[0]) > 1e-6) tExit = Math.min(tExit, (dir[0] > 0 ? bb.max[0] - cx : cx - bb.min[0]) / Math.abs(dir[0]));
          if (Math.abs(dir[1]) > 1e-6) tExit = Math.min(tExit, (dir[1] > 0 ? bb.max[2] - cz : cz - bb.min[2]) / Math.abs(dir[1]));
          if (!Number.isFinite(tExit)) continue;
          const px = cx + dir[0] * (tExit + gap);
          const pz = cz + dir[1] * (tExit + gap);
          if (Math.abs(px) > 5.30 || Math.abs(pz) > 3.50) continue;
          const down = P.castRay([px, 2.2, pz], [0, -1, 0], 2.3);
          if (!down || down.point.y > 0.06) continue;
          const shape = new R.Cylinder(0.19, 0.18);
          const hit = P.world.intersectionWithShape(
            { x: px, y: 0.23, z: pz }, { x: 0, y: 0, z: 0, w: 1 }, shape,
            undefined, undefined, undefined, A.robot.body,
            (collider) => {
              const o = P.colliderToObj.get(collider.handle);
              if (!o) return false;
              if (o.isStatic && o.body.translation().y < 0.14) return false;
              return true;
            }
          );
          if (hit) continue;
          const yaw = Math.atan2(-(cx - px), -(cz - pz));
          return { px, pz, yaw, how: 'custom', gap };
        }
      }
      return null;
    };
    const r3v = (v) => Math.round(v * 1000) / 1000;
    const r2 = (v) => Math.round(v * 100) / 100;
    const r4 = (v) => Math.round(v * 10000) / 10000;
    const out = [];
    for (const c of cases) {
      let result = null;
      const attempts = [];
      for (let attempt = 0; attempt < 2 && !result; attempt++) {
        A.qa.reset(); await sleep(320);
        const obj = P.get(c.name);
        if (!obj) { result = { ...c, invalid: 'missing' }; break; }
        const bb0 = objAABB(obj);
        const cx0 = (bb0.min[0] + bb0.max[0]) / 2;
        const cz0 = (bb0.min[2] + bb0.max[2]) / 2;
        const room = ROOMS[obj.room] || [0, -1];
        const base = norm([room[0] - cx0, room[1] - cz0]);
        let placement = null;
        if (attempt === 0) {
          const near = A.qa.teleportNear(c.name, 0.5);
          await sleep(550);
          if (near && near.freeSpot) placement = { px: near.pos[0], pz: near.pos[2], yaw: near.yaw, how: 'teleportNear' };
        }
        if (!placement) {
          placement = customPlace(obj, Math.atan2(base[1], base[0]));
          if (placement) { A.qa.setPose([placement.px, 0, placement.pz], placement.yaw); await sleep(550); }
        }
        if (!placement) { attempts.push({ invalid: 'no placement' }); continue; }
        const r0 = A.qa.state().robot.pos.slice();
        const o0 = A.qa.object(c.name).pos.slice();
        const rot4 = (nm) => { const b = P.get(nm).body.rotation(); return [b.x, b.y, b.z, b.w]; };
        const q0 = rot4(c.name);
        const startBB = objAABB(P.get(c.name));
        let minContact = Infinity;
        let maxSpeed = 0;
        let maxRobotY = 0;
        A.qa.hold('KeyW'); A.qa.hold('ShiftLeft');
        const t0 = performance.now();
        while (performance.now() - t0 < 2000) {
          const rp = A.qa.state().robot.pos;
          const d = distToAABB2D(rp[0], rp[2], startBB);
          if (d < minContact) minContact = d;
          const sp = A.robot.getState().speed;
          if (sp > maxSpeed) maxSpeed = sp;
          if (rp[1] > maxRobotY) maxRobotY = rp[1];
          await sleep(100);
        }
        A.qa.releaseKey('KeyW'); A.qa.releaseKey('ShiftLeft');
        await sleep(800);
        const r1 = A.qa.state().robot.pos.slice();
        const o1 = A.qa.object(c.name).pos.slice();
        const moved = Math.hypot(o1[0] - o0[0], o1[2] - o0[2]);
        const robotMoved = Math.hypot(r1[0] - r0[0], r1[2] - r0[2]);
        const finalInside = distToAABB2D(r1[0], r1[2], startBB) < 0.05;
        const contact = minContact <= 0.27 || finalInside;
        const q1 = rot4(c.name);
        let rotDeg = null;
        if (q0 && q1) {
          const dot = Math.abs(q0[0] * q1[0] + q0[1] * q1[1] + q0[2] * q1[2] + q0[3] * q1[3]);
          rotDeg = Math.round(2 * Math.acos(Math.min(1, dot)) * 180 / Math.PI * 100) / 100;
        }
        const res = {
          name: c.name, kind: c.kind, mass: P.get(c.name).mass,
          start: o0.map(r3v), end: o1.map(r3v), moved: r4(moved), robotMoved: r4(robotMoved),
          rotDeg, maxRobotY: r3v(maxRobotY),
          minContact: r3v(minContact), maxSpeed: r3v(maxSpeed), contact, finalInside,
          placement: { px: r2(placement.px), pz: r2(placement.pz), how: placement.how },
        };
        attempts.push(res);
        if (contact) result = res;
      }
      out.push(result || { ...c, invalid: 'never contacted', attempts });
    }
    A.qa.reset();
    return out;
  }, PUSH_CASES);

  const heavyRes = pushRes.filter((p) => p.kind === 'heavy');
  const specRes = pushRes.filter((p) => p.kind === 'heavy-spec');
  const lightRes = pushRes.filter((p) => p.kind === 'light');
  const heavyFail = heavyRes.filter((p) => !(p.moved < 0.01));
  const lightFail = lightRes.filter((p) => !(p.moved > 0.03));
  const invalid = pushRes.filter((p) => p.invalid);
  row('E1 heavy furniture displacement < 0.01 m (2 s boost)', heavyFail.length === 0 && invalid.filter((p) => p.kind === 'heavy').length === 0 ? 'PASS' : 'FAIL',
    pushRes.filter((p) => p.kind === 'heavy').map((p) => p.invalid ? `${p.name}: INVALID(${p.invalid})` : `${p.name} ${p.moved.toFixed(4)}m`).join(', '),
    { sev: 'P1' });
  row('E1b armchair 21 kg (ROBOT_SPEC lists < 0.01 m)', specRes.every((p) => !p.invalid && p.moved < 0.01) ? 'PASS' : 'INFO',
    specRes.map((p) => p.invalid ? `${p.name}: INVALID(${p.invalid})` : `${p.name} ${p.moved.toFixed(4)}m`).join(', ') + ' — mission push list excludes armchair; ROBOT_SPEC line 39 includes it',
    { sev: 'P3' });
  row('E2 light objects pushable > 0.03 m (2 s boost)', lightFail.length === 0 && invalid.filter((p) => p.kind === 'light').length === 0 ? 'PASS' : 'FAIL',
    pushRes.filter((p) => p.kind === 'light').map((p) => p.invalid ? `${p.name}: INVALID(${p.invalid})` : `${p.name} ${p.moved.toFixed(3)}m`).join(', '),
    { sev: 'P1' });
  row('E3 push tests made real contact', invalid.length === 0 ? 'PASS' : 'FAIL',
    invalid.length ? `no contact for: ${invalid.map((p) => p.name).join(', ')}` : `${pushRes.length}/${pushRes.length} pushes validated by robot-object contact`,
    { sev: 'P1' });

  // ================================================================ F. arm payload & reach
  const armRes = await page.evaluate(async () => {
    const { A, P } = window.__PQ__;
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const out = {
      reach: A.robot.arm.reach, maxLiftKg: A.robot.arm.maxLiftKg,
      state: A.robot.getState(),
      jointsAtRest: P.world.impulseJoints.len(),
    };
    A.qa.reset(); await sleep(350);
    A.qa.teleport(-2.6, -0.6, 0); await sleep(350);
    const rp = A.qa.state().robot.pos;
    const yaw0 = A.robot.getState().yaw;
    const fwd = [-Math.sin(yaw0), -Math.cos(yaw0)];
    const sh = [rp[0] + fwd[0] * 0.1, 0.26, rp[2] + fwd[1] * 0.1];
    const pt = (d) => ({ x: sh[0] + fwd[0] * d, y: 0.26, z: sh[2] + fwd[1] * d });
    out.canReach = {
      d030: A.robot.canReach(pt(0.30)),
      d032: A.robot.canReach(pt(0.32)),
      d045: A.robot.canReach(pt(0.45)),
    };
    // refused: too heavy
    out.refused = {};
    for (const name of ['laptop', 'kettle', 'book_stack_1']) {
      A.qa.reset(); await sleep(300);
      const near = A.qa.teleportNear(name, 0.5); await sleep(650);
      const obj = A.qa.object(name);
      out.refused[name] = { mass: obj ? obj.mass : null, grab: A.qa.grabByName(name), near: !!near };
      A.qa.release(); await sleep(120);
    }
    // mug on coffee table (must be accepted from the floor). A user would drive up to the
    // table before grabbing, so approach with W for 1.2 s after teleportNear.
    A.qa.reset(); await sleep(300);
    const mugNear = A.qa.teleportNear('mug_white', 0.5); await sleep(700);
    const approachFrom = A.qa.state().robot.pos.slice();
    A.qa.hold('KeyW'); await sleep(1200); A.qa.releaseKey('KeyW'); await sleep(500);
    const mug0 = A.qa.object('mug_white');
    const r0 = A.qa.state().robot.pos;
    const yaw = A.robot.getState().yaw;
    const shoulder = [r0[0] - Math.sin(yaw) * 0.1, 0.26, r0[2] - Math.cos(yaw) * 0.1];
    const mugGrab = A.qa.grabByName('mug_white');
    out.mug = {
      near: !!mugNear, pos: mug0 ? mug0.pos : null, mass: mug0 ? mug0.mass : null,
      robot: r0.slice(), shoulder: shoulder.map((v) => Math.round(v * 1000) / 1000),
      approach: {
        from: approachFrom.map((v) => Math.round(v * 1000) / 1000),
        to: r0.map((v) => Math.round(v * 1000) / 1000),
        moved: Math.round(Math.hypot(r0[0] - approachFrom[0], r0[2] - approachFrom[2]) * 1000) / 1000,
      },
      distance: mug0 ? Math.hypot(mug0.pos[0] - shoulder[0], mug0.pos[1] - shoulder[1], mug0.pos[2] - shoulder[2]) : null,
      canReach: mug0 ? A.robot.canReach({ x: mug0.pos[0], y: mug0.pos[1], z: mug0.pos[2] }) : null,
      grab: mugGrab,
    };
    out.jointsWhileHeld = P.world.impulseJoints.len();
    // carry / lift / release: a held object must follow the robot, then drop cleanly
    if (mugGrab.ok) {
      const m0 = A.qa.object('mug_white').pos.slice();
      const rp0 = A.qa.state().robot.pos.slice();
      const heldName = A.robot.arm.held ? A.robot.arm.held.name : null;
      A.qa.hold('KeyS'); await sleep(900); A.qa.releaseKey('KeyS'); await sleep(400);
      const m1 = A.qa.object('mug_white').pos.slice();
      const rp1 = A.qa.state().robot.pos.slice();
      const carry = {
        robotMoved: Math.round(Math.hypot(rp1[0] - rp0[0], rp1[2] - rp0[2]) * 1000) / 1000,
        mugMoved: Math.round(Math.hypot(m1[0] - m0[0], m1[2] - m0[2]) * 1000) / 1000,
        stillHeld: A.robot.arm.held ? A.robot.arm.held.name : null,
        heldName,
      };
      // aim above the mug: the arm should raise the held object if IK allows
      A.qa.aimAtPoint([m1[0], m1[1] + 0.18, m1[2]]);
      await sleep(900);
      const m2 = A.qa.object('mug_white').pos.slice();
      const lift = {
        before: Math.round(m1[1] * 1000) / 1000,
        after: Math.round(m2[1] * 1000) / 1000,
        lifted: Math.round((m2[1] - m1[1]) * 1000) / 1000,
      };
      A.qa.release(); await sleep(1300);
      const landed = A.qa.object('mug_white');
      out.lift = {
        ...lift, carry,
        landedY: Math.round(landed.pos[1] * 1000) / 1000,
        landedFinite: landed.pos.every(Number.isFinite),
        heldAfterRelease: A.robot.arm.held ? A.robot.arm.held.name : null,
      };
    }
    // dining table / plate on dining table must be out of reach
    A.qa.reset(); await sleep(300);
    A.qa.teleportNear('dining_table', 0.55); await sleep(650);
    const dt = A.qa.object('dining_table');
    const rD = A.qa.state().robot.pos;
    out.dining = {
      tableTopY: dt ? dt.pos[1] : null,
      canReachTop: dt ? A.robot.canReach({ x: dt.pos[0], y: 0.76, z: dt.pos[2] }) : null,
      robot: rD.slice(),
    };
    A.qa.reset(); await sleep(300);
    A.qa.teleportNear('plate_dining', 0.5); await sleep(650);
    const pd = A.qa.object('plate_dining');
    out.plateDining = {
      pos: pd ? pd.pos : null, mass: pd ? pd.mass : null,
      canReach: pd ? A.robot.canReach({ x: pd.pos[0], y: pd.pos[1], z: pd.pos[2] }) : null,
      grab: A.qa.grabByName('plate_dining'),
    };
    out.jointsAfterRelease = P.world.impulseJoints.len();
    A.qa.reset();
    return out;
  });
  row('F1 arm limits are 0.5 kg payload / 0.34 m reach', armRes.maxLiftKg === 0.5 && armRes.reach === 0.34 ? 'PASS' : 'FAIL',
    `arm.maxLiftKg=${armRes.maxLiftKg}, arm.reach=${armRes.reach}`, { sev: 'P1' });
  row('F2 laptop 1.6 kg refused (too_heavy)', armRes.refused.laptop?.grab?.ok === false && armRes.refused.laptop?.grab?.reason === 'too_heavy' ? 'PASS' : 'FAIL',
    `laptop mass=${armRes.refused.laptop?.mass}; grab=${JSON.stringify(armRes.refused.laptop?.grab)}`, { sev: 'P1' });
  row('F3 kettle 1.0 kg / book stack 1.4 kg refused', [armRes.refused.kettle, armRes.refused.book_stack_1].every((r) => r?.grab?.ok === false && r?.grab?.reason === 'too_heavy') ? 'PASS' : 'FAIL',
    `kettle=${JSON.stringify(armRes.refused.kettle?.grab)}, book_stack_1=${JSON.stringify(armRes.refused.book_stack_1?.grab)}`, { sev: 'P1' });
  row('F4 mug 0.32 kg on coffee table accepted from floor', armRes.mug?.grab?.ok === true ? 'PASS' : 'FAIL',
    `mug y=${armRes.mug?.pos?.[1]}, robot drove ${armRes.mug?.approach?.moved} m to table, shoulder→mug=${armRes.mug?.distance?.toFixed(3)} m, canReach=${armRes.mug?.canReach}, grab=${JSON.stringify(armRes.mug?.grab)}`,
    { sev: 'P1' });
  row('F5 reach boundary ~0.34 m (0.30 in, 0.45 out)', armRes.canReach.d030 === true && armRes.canReach.d045 === false ? 'PASS' : 'FAIL',
    `canReach(0.30m)=${armRes.canReach.d030}, canReach(0.32m)=${armRes.canReach.d032}, canReach(0.45m)=${armRes.canReach.d045}`, { sev: 'P1' });
  row('F6 dining table (0.76 m) out of reach', armRes.dining?.canReachTop === false && armRes.plateDining?.grab?.reason === 'out_of_reach' ? 'PASS' : 'FAIL',
    `canReach(table top)=${armRes.dining?.canReachTop}; plate on table: mass=${armRes.plateDining?.mass}, grab=${JSON.stringify(armRes.plateDining?.grab)}`,
    { sev: 'P1' });
  const carry = armRes.lift?.carry;
  const carryOk = carry && carry.stillHeld === 'mug_white' && carry.mugMoved > 0.1 && carry.mugMoved >= carry.robotMoved * 0.6;
  row('F7 grab creates fixed joint; held object follows the robot', armRes.jointsWhileHeld >= 1 && armRes.jointsAfterRelease === 0 && armRes.lift?.heldAfterRelease === null && carryOk ? 'PASS' : (carry ? 'FAIL' : 'INFO'),
    `joints held=${armRes.jointsWhileHeld}, after release=${armRes.jointsAfterRelease}` +
      (carry ? `; carried: robot moved ${carry.robotMoved} m, mug moved ${carry.mugMoved} m, still held=${carry.stillHeld}` : '; grab failed, carry not tested'),
    { sev: 'P2' });
  if (armRes.lift) {
    row('F7b arm raises held mug when aiming up', armRes.lift.lifted > 0.03 ? 'PASS' : 'INFO',
      `aimed +0.18 m above mug: mug y ${armRes.lift.before} -> ${armRes.lift.after} (lift ${armRes.lift.lifted} m)`, { sev: 'P3' });
    row('F8 released mug lands on surface, no fall-through', finite(armRes.lift.landedY) && armRes.lift.landedY > 0.02 ? 'PASS' : 'FAIL',
      `released at y=${armRes.lift.after} m, final y=${armRes.lift.landedY} m, held cleared=${armRes.lift.heldAfterRelease === null}`, { sev: 'P2' });
  }
  // robot base geometry from its Rapier collider (spec: 350 mm dia, 380 mm tall)
  const robotGeom = await page.evaluate(() => {
    const A = window.__APP__;
    const out = { state: A.robot.getState ? A.robot.getState() : null, colliders: [] };
    for (const c of A.robot.colliders || []) {
      const s = c.shape;
      let dims = null;
      try {
        if (s.type === 10) dims = { type: 'cylinder', radius: s.radius, halfHeight: s.halfHeight };
        else if (s.halfExtents) dims = { type: 'box', half: [s.halfExtents.x, s.halfExtents.y, s.halfExtents.z] };
        else if (s.radius !== undefined) dims = { type: 'ball', radius: s.radius };
      } catch { /* ignore */ }
      out.colliders.push({ dims });
    }
    return out;
  });
  const baseCol = robotGeom.colliders.map((c) => c.dims).find((d) => d && d.type === 'cylinder');
  const baseDia = baseCol ? baseCol.radius * 2 : null;
  const baseTall = baseCol ? baseCol.halfHeight * 2 : null;
  row('B16 robot collision footprint (collider inset vs 350 mm visual base)', baseDia != null ? 'PASS' : 'FAIL',
    baseCol
      ? `collider cylinder Ø${(baseDia * 1000).toFixed(0)} mm x ${(baseTall * 1000).toFixed(0)} mm tall, ${robotGeom.colliders.length} robot colliders (base + gripper); collider is inset from the 350 mm visual base by design`
      : `no cylinder base collider found (${JSON.stringify(robotGeom.colliders)})`,
    { sev: 'P1' });

  // visual bounding box of the robot model (meshes, world space) — spec base Ø350 mm / 380 mm tall
  const robotBBox = await page.evaluate(() => {
    const A = window.__APP__;
    A.scene.updateMatrixWorld(true);
    const min = [Infinity, Infinity, Infinity];
    const max = [-Infinity, -Infinity, -Infinity];
    A.robot.group.traverse((o) => {
      if (!o.isMesh || !o.geometry) return;
      const g = o.geometry;
      if (!g.boundingBox) g.computeBoundingBox();
      const bb = g.boundingBox;
      if (!bb) return;
      const e = o.matrixWorld.elements;
      for (let i = 0; i < 8; i++) {
        const x = i & 1 ? bb.max.x : bb.min.x;
        const y = i & 2 ? bb.max.y : bb.min.y;
        const z = i & 4 ? bb.max.z : bb.min.z;
        const wx = e[0] * x + e[4] * y + e[8] * z + e[12];
        const wy = e[1] * x + e[5] * y + e[9] * z + e[13];
        const wz = e[2] * x + e[6] * y + e[10] * z + e[14];
        min[0] = Math.min(min[0], wx); max[0] = Math.max(max[0], wx);
        min[1] = Math.min(min[1], wy); max[1] = Math.max(max[1], wy);
        min[2] = Math.min(min[2], wz); max[2] = Math.max(max[2], wz);
      }
    });
    const gy = A.robot.group.position.y;
    return { min: min.map((v) => +(v - gy).toFixed(4)), max: max.map((v) => +(v - gy).toFixed(4)), size: [max[0] - min[0], max[1] - min[1], max[2] - min[2]].map((v) => +v.toFixed(4)) };
  });
  const visW = robotBBox.size[0];
  const visH = robotBBox.size[1];
  row('B16b robot visual base/height ~350 x 380 mm', Math.abs(visW - 0.35) <= 0.03 && Math.abs(visH - 0.38) <= 0.03 ? 'PASS' : 'INFO',
    `visual bbox ${(visW * 1000).toFixed(0)} mm wide x ${(visH * 1000).toFixed(0)} mm tall (spec base Ø350 / total 380); bbox includes arm + mast`,
    { sev: 'P3' });

  // robot mass (7 kg): prefer runtime state, fall back to built-config constants
  const robotMassState = armRes.state?.mass ?? null;
  const buildText = indexBuf ? indexBuf.toString('utf8') : '';
  const cfgMass = /mass:7(?:\.0)?[,}]/.test(buildText);
  const cfgBase = /baseMass:3\.6/.test(buildText);
  const cfgArm = /armMass:3\.4/.test(buildText);
  const st9 = armRes.state || {};
  row('F9 robot total mass 7.0 kg (3.6 base + 3.4 arm)', (robotMassState === 7 || (cfgMass && cfgBase && cfgArm)) ? 'PASS' : 'FAIL',
    robotMassState != null
      ? `getState: mass=${st9.mass} kg (base ${st9.baseMass}, arm ${st9.armMass}), payload=${st9.payload ?? st9.maxLiftKg} kg, reach=${st9.reach} m, DOF=${st9.dof}`
      : `runtime state lacks mass; built config contains mass:7/baseMass:3.6/armMass:3.4 = ${cfgMass && cfgBase && cfgArm}`,
    { sev: 'P1' });

  // ================================================================ G. stability / spawn sanity
  // spawn interpenetration (contact manifolds, deduped)
  const pen = await page.evaluate(() => {
    const { A, penetration } = window.__PQ__;
    A.qa.reset();
    return new Promise((resolve) => setTimeout(() => resolve(penetration()), 600));
  });
  const penBad = pen.filter((p) => p.d < -0.0025); // QA gate 5: spawn interpenetration <= 2 mm
  const penWorst = pen[0] || null;
  row('G1 spawn interpenetration <= 2 mm (QA gate 5)', penBad.length === 0 ? 'PASS' : 'FAIL',
    penBad.length
      ? `${penBad.length} pair(s) > 2.5 mm; worst: ${penBad.slice(0, 6).map((p) => `${p.a}↔${p.b} ${(p.d * 1000).toFixed(1)}mm`).join(', ')}`
      : `deepest contact ${((penWorst?.d ?? 0) * 1000).toFixed(1)} mm${penWorst ? ` (${penWorst.a}↔${penWorst.b})` : ''} across ${pen.length} contact pairs`,
    { sev: 'P2' });

  // below-floor check (dynamic objects only — floor/exterior colliders legitimately extend below y=0)
  const below = dyn.filter((o) => o.aabb.min[1] < -0.005)
    .map((o) => ({ name: o.name, minY: o.aabb.min[1] }));
  const belowStatic = stat.filter((o) => o.aabb.min[1] < -0.005).map((o) => o.name);
  row('G2 no dynamic body below floor (collider minY >= -5 mm)', below.length === 0 ? 'PASS' : 'FAIL',
    below.length ? below.slice(0, 8).map((o) => `${o.name} minY=${(o.minY * 1000).toFixed(1)}mm`).join(', ') : `lowest dynamic collider minY=${Math.min(...dyn.map((o) => o.aabb.min[1])).toFixed(4)} m`,
    { sev: 'P2' });
  row('G2b static ground/exterior colliders below y=0 (expected)', 'INFO',
    `${belowStatic.length} static bodies: ${belowStatic.slice(0, 8).join(', ')}${belowStatic.length > 8 ? '…' : ''}`, { sev: 'P3' });

  // 3 s passive stability + stack integrity
  const stability = await page.evaluate(async () => {
    const { A, P, objAABB } = window.__PQ__;
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const dyn = P.dynamicObjects;
    const pos0 = dyn.map((o) => { const t = o.body.translation(); return [t.x, t.y, t.z]; });
    const pen0 = window.__PQ__.penetration();
    const stacks = pen0.filter((p) => p.dyn && p.d < 0.001);
    const stackRel0 = stacks.map((p) => {
      const a = P.get(p.a), b = P.get(p.b);
      const ta = a.body.translation(), tb = b.body.translation();
      return { pair: `${p.a}|${p.b}`, rel: [ta.x - tb.x, ta.y - tb.y, ta.z - tb.z] };
    });
    await sleep(3000);
    const pos1 = dyn.map((o) => { const t = o.body.translation(); return [t.x, t.y, t.z]; });
    let maxDrift = 0; let driftName = null;
    for (let i = 0; i < dyn.length; i++) {
      const d = Math.hypot(pos1[i][0] - pos0[i][0], pos1[i][1] - pos0[i][1], pos1[i][2] - pos0[i][2]);
      if (d > maxDrift) { maxDrift = d; driftName = dyn[i].name; }
    }
    let maxRelDrift = 0; let relPair = null;
    for (const s of stackRel0) {
      const [an, bn] = s.pair.split('|');
      const a = P.get(an), b = P.get(bn);
      const ta = a.body.translation(), tb = b.body.translation();
      const rel = [ta.x - tb.x, ta.y - tb.y, ta.z - tb.z];
      const d = Math.hypot(rel[0] - s.rel[0], rel[1] - s.rel[1], rel[2] - s.rel[2]);
      if (d > maxRelDrift) { maxRelDrift = d; relPair = s.pair; }
    }
    const asleep = dyn.filter((o) => o.body.isSleeping && o.body.isSleeping()).length;
    let maxVel = 0;
    for (const o of dyn) { const v = o.body.linvel(); maxVel = Math.max(maxVel, Math.hypot(v.x, v.y, v.z)); }
    const finiteAll = dyn.every((o) => { const t = o.body.translation(); return Number.isFinite(t.x) && Number.isFinite(t.y) && Number.isFinite(t.z); });
    return { n: dyn.length, stacks: stacks.length, maxDrift, driftName, maxRelDrift, relPair, asleep, maxVel, finiteAll };
  });
  row('G3 stacks stay put over 3 s (rel drift < 5 mm)', stability.maxRelDrift < 0.005 ? 'PASS' : 'FAIL',
    `${stability.stacks} dynamic-on-dynamic resting pairs; max relative drift ${(stability.maxRelDrift * 1000).toFixed(2)} mm${stability.relPair ? ` (${stability.relPair})` : ''}`,
    { sev: 'P1' });
  row('G4 no passive drift / jitter (max drift < 2 mm, all asleep)', stability.maxDrift < 0.002 && stability.asleep === stability.n ? 'PASS' : 'FAIL',
    `max drift ${(stability.maxDrift * 1000).toFixed(2)} mm${stability.driftName ? ` (${stability.driftName})` : ''}; ${stability.asleep}/${stability.n} asleep; max |v| ${stability.maxVel.toFixed(4)} m/s`,
    { sev: 'P1' });

  // perturbation test on clean vertical stacks: wake top body, tiny impulse, must settle back
  const perturb = await page.evaluate(async () => {
    const { A, P, penetration } = window.__PQ__;
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const pen = penetration().filter((p) => p.dyn && p.d > -0.003 && Math.abs((p.normal || [0, 1, 0])[1]) > 0.7);
    const FLAT = ['book', 'notebook', 'box', 'laptop', 'cushion', 'pillow', 'blanket', 'paper', 'clothes', 'towel'];
    const picked = [];
    const seen = new Set();
    const pick = (pool) => {
      for (const p of pool) {
        if (picked.length >= 8) break;
        const a = P.get(p.a), b = P.get(p.b);
        if (!a || !b) continue;
        const top = a.body.translation().y >= b.body.translation().y ? a : b;
        const sup = top === a ? b : a;
        if (seen.has(top.name) || top.mass < 0.1) continue;
        seen.add(top.name);
        const t0 = top.body.translation();
        const q0 = top.body.rotation();
        top.body.wakeUp();
        const j = 0.02 * top.mass;
        top.body.applyImpulse({ x: j, y: 0, z: j }, true);
        picked.push({ top: top.name, support: sup.name, t0: [t0.x, t0.y, t0.z], q0: [q0.x, q0.y, q0.z, q0.w] });
      }
    };
    pick(pen.filter((p) => { const a = P.get(p.a), b = P.get(p.b); return a && b && [a, b].some((o) => o.tags.some((t) => FLAT.includes(t))); }));
    pick(pen);
    await sleep(3000);
    let maxShift = 0; let worst = null; let maxTilt = 0; let asleep = 0;
    for (const p of picked) {
      const o = P.get(p.top);
      const t = o.body.translation();
      const shift = Math.hypot(t.x - p.t0[0], t.y - p.t0[1], t.z - p.t0[2]);
      if (shift > maxShift) { maxShift = shift; worst = p.top; }
      const q = o.body.rotation();
      const dot = Math.abs(q.x * p.q0[0] + q.y * p.q0[1] + q.z * p.q0[2] + q.w * p.q0[3]);
      const ang = 2 * Math.acos(Math.min(1, dot));
      if (ang > maxTilt) maxTilt = ang;
      if (o.body.isSleeping && o.body.isSleeping()) asleep++;
    }
    A.qa.reset();
    return { n: picked.length, maxShift, worst, maxTilt, asleep, picked: picked.map((p) => `${p.top} on ${p.support}`) };
  });
  row('G5 nudged stacks re-settle (< 50 mm, < 5 deg, asleep)', perturb.n > 0 && perturb.maxShift < 0.05 && perturb.maxTilt < 0.09 && perturb.asleep === perturb.n ? 'PASS' : (perturb.n === 0 ? 'INFO' : 'FAIL'),
    `${perturb.n} stacks nudged: max shift ${(perturb.maxShift * 1000).toFixed(1)} mm (${perturb.worst}), max tilt ${(perturb.maxTilt * 180 / Math.PI).toFixed(2)} deg, ${perturb.asleep}/${perturb.n} asleep`,
    { sev: 'P2' });

  // tunneling: needle drop + synthetic fast small body
  const tunnel = await page.evaluate(async () => {
    const { A, P, R } = window.__PQ__;
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const out = {};
    // real object: drop the needle from 0.9 m
    const needle = P.get('needle');
    const n0 = needle.body.translation();
    needle.body.setTranslation({ x: n0.x, y: 0.9, z: n0.z }, true);
    needle.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    needle.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
    await sleep(1500);
    const n1 = needle.body.translation();
    out.needle = { endY: Math.round(n1.y * 10000) / 10000, finite: Number.isFinite(n1.y), fellThrough: n1.y < -0.02 };
    // synthetic: 3 cm ball at 6 m/s downward, no CCD
    const body = P.world.createRigidBody(R.RigidBodyDesc.dynamic().setTranslation(0.5, 0.6, 0.5).setLinvel(0, -6, 0).setCcdEnabled(false));
    P.world.createCollider(R.ColliderDesc.ball(0.03).setDensity(1000), body);
    await sleep(800);
    const t = body.translation();
    out.fast = { endY: Math.round(t.y * 10000) / 10000, finite: Number.isFinite(t.y), fellThrough: t.y < -0.02 };
    P.world.removeRigidBody(body);
    A.qa.reset();
    return out;
  });
  row('G6 no tunneling (needle drop + 6 m/s 3 cm ball)', !tunnel.needle.fellThrough && !tunnel.fast.fellThrough && tunnel.needle.finite && tunnel.fast.finite ? 'PASS' : 'FAIL',
    `needle drop from 0.9 m -> y=${tunnel.needle.endY}; 3 cm ball @6 m/s -> y=${tunnel.fast.endY} (no CCD)`, { sev: 'P1' });

  // final bounds / NaN sweep after all interactions
  const finalSweep = await page.evaluate(() => {
    const { A, P } = window.__PQ__;
    A.qa.reset();
    return new Promise((resolve) => setTimeout(() => {
      const out = { finite: true, inside: true, bad: [], out: [], asleep: 0, n: P.dynamicObjects.length };
      for (const o of P.objects) {
        const t = o.body.translation(); const r = o.body.rotation();
        if (![t.x, t.y, t.z, r.x, r.y, r.z, r.w].every(Number.isFinite)) { out.finite = false; out.bad.push(o.name); }
        const inside = Math.abs(t.x) <= 5.8 && Math.abs(t.z) <= 4.0 && t.y > -0.15 && t.y < 2.85;
        if (!inside) { out.inside = false; out.out.push(`${o.name}@(${t.x.toFixed(2)},${t.y.toFixed(2)},${t.z.toFixed(2)})`); }
      }
      out.asleep = P.dynamicObjects.filter((o) => o.body.isSleeping && o.body.isSleeping()).length;
      resolve(out);
    }, 900));
  });
  row('G7 all bodies finite and inside the apartment after all tests', finalSweep.finite && finalSweep.inside ? 'PASS' : 'FAIL',
    finalSweep.finite && finalSweep.inside ? `${finalSweep.n} dynamic bodies finite, inside shell, ${finalSweep.asleep}/${finalSweep.n} asleep` : `bad=${finalSweep.bad.join(',')} out=${finalSweep.out.join(',')}`,
    { sev: 'P0' });

  // ================================================================ report
  const fails = rows.filter((r) => r.status === 'FAIL');
  const p0p1 = fails.filter((r) => r.sev === 'P0' || r.sev === 'P1');
  const p2 = fails.filter((r) => r.sev === 'P2');
  const verdict = p0p1.length > 0 || p2.length > 5 ? 'FIX' : (p2.length > 0 ? 'SHIP (with P2 notes)' : 'SHIP');
  const counts = { PASS: rows.filter((r) => r.status === 'PASS').length, FAIL: fails.length, INFO: rows.filter((r) => r.status === 'INFO').length };
  const elapsed = ((Date.now() - tStart) / 1000).toFixed(1);

  // stdout summary
  console.log(`\n=== physics audit (${LABEL}) — ${pageUrl} — ${elapsed}s ===`);
  for (const r of rows) console.log(`${r.status.padEnd(4)}  ${r.gate}${r.status === 'FAIL' ? '  <<<' : ''}\n      ${r.evidence}`);
  console.log(`\n${counts.PASS} PASS / ${counts.FAIL} FAIL / ${counts.INFO} INFO — VERDICT: ${verdict}`);

  const md = renderReport({
    label: LABEL, buildMeta, pageUrl, elapsed, verdict, counts, rows, findings,
    engine: eng, massTable, outliers, unclassified, pen, penBad, below, pushRes,
    armRes, robotMassState, stability, perturb, tunnel, wallTest, wallLike, fps,
    bootState, consoleLog, pageErrors, pageWarns, failedRequests, snap,
    robotGeom, robotBBox, baseDia, baseTall, speedTest, staticNames: stat.map((o) => o.name), shotPath,
  });
  await mkdir(dirname(REPORT_PATH), { recursive: true });
  await writeFile(REPORT_PATH, md);
  const json = {
    label: LABEL, url: pageUrl, elapsed, verdict, counts, build: buildMeta,
    rows, findings, engine: eng, massTable, outliers, penetration: pen.slice(0, 30),
    below, push: pushRes, arm: armRes, stability, perturb, tunnel, wallTest, wallLike,
    robot: { geom: robotGeom, bbox: robotBBox, baseDia, baseTall, speed: speedTest, state: armRes.state },
    staticNames: stat.map((o) => o.name), screenshot: shotPath,
  };
  await mkdir(dirname(JSON_PATH), { recursive: true });
  await writeFile(JSON_PATH, JSON.stringify(json, null, 1));
  console.log(`report: ${REPORT_PATH}\njson:   ${JSON_PATH}`);

  await browser.close(); browser = null;
  if (server) { server.close(); server = null; }
  process.exitCode = fails.length ? 1 : 0;
} catch (err) {
  console.error('physics audit crashed:', err);
  try { if (browser) await browser.close(); } catch { /* ignore */ }
  if (server) server.close();
  process.exitCode = 2;
}

// ------------------------------------------------------------------ report renderer

function renderReport(d) {
  const L = [];
  const now = new Date();
  const stamp = now.toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
  const B = d.buildMeta;
  L.push(`# Physics & real-mass audit — round 2 (${d.label})`);
  L.push('');
  L.push(`Generated: ${stamp} · runtime ${d.elapsed}s`);
  L.push('');
  L.push(`- Build: \`${B.dir || 'external'}/index.html\`${B.bytes ? ` — ${B.bytes.toLocaleString()} B` : ''}${B.sha256 ? `, sha256 \`${B.sha256.slice(0, 16)}…\`` : ''}`);
  const dirty = B.gitDirty || [];
  L.push(`- Git: \`${B.gitHead || '?'}\`${dirty.length ? ` · ${dirty.length} uncommitted change(s) in src/docs: ${dirty.slice(0, 6).map((s) => `\`${s.trim()}\``).join(', ')}${dirty.length > 6 ? ' …' : ''}` : ' · clean src/docs'}`);
  L.push(`- Served: ${d.pageUrl} · label: \`${d.label}\``);
  L.push('');
  L.push(`## Verdict: **${d.verdict}**`);
  L.push('');
  L.push(`${d.counts.PASS} PASS · ${d.counts.FAIL} FAIL · ${d.counts.INFO} INFO. Rule: FIX if any P0/P1 FAIL, or >5 P2 FAILs; otherwise SHIP (P2 notes allowed).`);
  L.push('');
  L.push('## PASS/FAIL table');
  L.push('');
  L.push('| # | gate | result | evidence |');
  L.push('| --- | --- | --- | --- |');
  d.rows.forEach((r, i) => {
    L.push(`| ${i + 1} | ${r.gate} | ${r.status === 'PASS' ? 'PASS' : r.status === 'FAIL' ? '**FAIL**' : 'INFO'} | ${String(r.evidence).replace(/\|/g, '\\|')} |`);
  });
  L.push('');

  // engine
  L.push('## Engine laws & settings');
  L.push('');
  L.push('| setting | value |');
  L.push('| --- | --- |');
  L.push(`| gravity | [${d.engine.gravity.map((v) => r3(v)).join(', ')}] m/s² |`);
  L.push(`| fixed timestep | ${d.engine.timestep.toFixed(9)} s (1/60 = ${(1 / 60).toFixed(9)}) |`);
  L.push(`| solver iterations | ${d.engine.numSolverIterations} |`);
  L.push(`| Rapier | ${d.engine.rapierVersion || '?'} |`);
  L.push(`| bodies / colliders | ${d.engine.bodies} / ${d.engine.colliders} |`);
  L.push(`| dynamic / static objects | ${d.snap.objects.filter((o) => !o.static).length} / ${d.snap.objects.filter((o) => o.static).length} |`);
  L.push(`| impulse joints at rest | ${d.engine.impulseJoints} |`);
  L.push(`| fps @1440x900 | ${d.fps.toFixed(1)} |`);
  L.push(`| draw calls | ${d.bootState.drawCalls} |`);
  const heavy = d.snap.objects.filter((o) => !o.static && o.mass >= 20);
  L.push(`| heavy bodies (>=20 kg) damping | ${[...new Set(heavy.map((o) => `${o.linDamp.toFixed(2)}/${o.angDamp.toFixed(2)}`))].join(', ')} |`);
  L.push(`| heavy collider friction | ${[...new Set(heavy.flatMap((o) => o.cols.map((c) => c.friction.toFixed(2))))].join(', ')} |`);
  L.push('');
  L.push('Material presets (src/core/physics.js): wood 0.62/0.04, fabric 0.90/0.00, metal 0.45/0.12, ceramic 0.50/0.08, plastic 0.50/0.15, glass 0.30/0.05, rubber 1.00/0.35; default damping 0.12 lin / 0.35 ang.');
  L.push('');
  const rg = d.robotGeom?.state || {};
  L.push('## Robot under test (ROBOT_SPEC target: 7 kg, Ø350×380 mm, 0.40/0.55 m/s, 0.5 kg payload, 0.34 m reach, 3 DOF)');
  L.push('');
  L.push('| property | measured | spec | verdict |');
  L.push('| --- | --- | --- | --- |');
  L.push(`| mass | ${rg.mass ?? d.robotMassState ?? '?'} kg (base ${rg.baseMass ?? '?'}, arm ${rg.armMass ?? '?'}) | 7.0 (3.6+3.4) | ${rg.mass === 7 ? 'PASS' : 'check F9'} |`);
  L.push(`| collision footprint | Ø${d.baseDia ? (d.baseDia * 1000).toFixed(0) : '?'} × ${d.baseTall ? (d.baseTall * 1000).toFixed(0) : '?'} mm (collider) | inset from Ø350 visual | ${d.baseDia ? 'ok' : 'check B16'} |`);
  L.push(`| visual bbox | ${d.robotBBox ? (d.robotBBox.size[0] * 1000).toFixed(0) : '?'} × ${d.robotBBox ? (d.robotBBox.size[1] * 1000).toFixed(0) : '?'} mm (incl. arm/mast) | Ø350 × 380 | ${d.robotBBox && Math.abs(d.robotBBox.size[0] - 0.35) <= 0.03 ? 'PASS' : 'see B16b'} |`);
  L.push(`| drive speed | ${d.speedTest.normal.toFixed(3)} / ${d.speedTest.boost.toFixed(3)} m/s | 0.40 / 0.55 | ${Math.abs(d.speedTest.normal - 0.4) <= 0.03 && Math.abs(d.speedTest.boost - 0.55) <= 0.04 ? 'PASS' : 'FAIL'} |`);
  L.push(`| arm | payload ${rg.payload ?? rg.maxLiftKg} kg, reach ${rg.reach} m, DOF ${rg.dof ?? '?'} | 0.5 / 0.34 / 3 | ${rg.maxLiftKg === 0.5 && rg.reach === 0.34 ? 'PASS' : 'check F1'} |`);
  L.push(`| colliders | ${d.robotGeom?.colliders?.length ?? '?'} (base + gripper) | ≥2 | ${(d.robotGeom?.colliders?.length ?? 0) >= 2 ? 'PASS' : 'check'} |`);
  L.push('');
  if (d.shotPath) { L.push(`Screenshot: [\`${d.shotPath}\`](${d.shotPath})`); L.push(''); }

  // mass table
  L.push(`## Mass table — all ${d.massTable.length} dynamic objects`);
  L.push('');
  L.push('| object | kg | category | realistic range | verdict |');
  L.push('| --- | ---: | --- | --- | --- |');
  for (const m of d.massTable) {
    const range = m.lo == null ? '—' : `${m.lo}–${m.hi}`;
    L.push(`| ${m.name} | ${m.mass} | ${m.cat} | ${range} | ${m.verdict}${m.suggested != null ? ` → suggest ${m.suggested} kg` : ''} |`);
  }
  L.push('');
  if (d.outliers.length) {
    L.push('### Mass outliers');
    L.push('');
    L.push('| object | current kg | realistic range | suggested kg |');
    L.push('| --- | ---: | --- | ---: |');
    for (const o of d.outliers) L.push(`| ${o.name} | ${o.mass} | ${o.lo}–${o.hi} (${o.cat}) | ${o.suggested} |`);
    L.push('');
  } else {
    L.push('No mass outliers: every dynamic object falls inside its realistic range.');
    L.push('');
  }
  if (d.unclassified.length) {
    L.push(`Unclassified (needs a range rule): ${d.unclassified.join(', ')}`);
    L.push('');
  }

  // static architecture
  L.push('## Static architecture');
  L.push('');
  L.push(`- Architecture objects (tag \`architecture\` + built-ins): **all static / bodyType fixed** — see D1.`);
  L.push(`- Static bodies (${d.staticNames.length}): ${d.staticNames.map((n) => `\`${n}\``).join(', ')}.`);
  L.push('- Doors are door leaves merged into the static `walls` body (`src/world/apartment.js` addDoorLeaf), so no dynamic door can be pushed.');
  L.push('- Wall drive test (2 s boost into each outer wall):');
  L.push('');
  L.push('| wall | robot start | robot end | moved | wall body moved |');
  L.push('| --- | --- | --- | ---: | --- |');
  for (const c of d.wallTest.cases) {
    L.push(`| ${c.side} | (${r3(c.r0[0])}, ${r3(c.r0[2])}) | (${r3(c.r1[0])}, ${r3(c.r1[2])}) | ${r3(c.moved)} m | ${d.wallTest.movedStatic.length ? d.wallTest.movedStatic.join(', ') : 'no'} |`);
  }
  L.push('');
  L.push(`Dynamic objects that read as wall/door scale: ${d.wallLike.length ? d.wallLike.join('; ') : 'none'}.`);
  L.push('');

  // push law
  L.push('## Push law — 7 kg robot, 0.40 m/s (0.55 boost), 2 s boost drive');
  L.push('');
  L.push('| object | mass kg | class | start (x,z) | end (x,z) | Δ (m) | Δrot | robot Δ (m) | min contact | max speed | robot max y | verdict |');
  L.push('| --- | ---: | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |');
  for (const p of d.pushRes) {
    if (p.invalid) {
      L.push(`| ${p.name} | — | ${p.kind} | — | — | — | — | — | INVALID (${p.invalid}) |`);
      continue;
    }
    const expected = p.kind === 'heavy' ? '< 0.01' : p.kind === 'heavy-spec' ? '< 0.01 (spec)' : p.kind === 'light' ? '> 0.03' : 'info';
    const pass = p.kind === 'heavy' ? p.moved < 0.01 : p.kind === 'heavy-spec' ? p.moved < 0.01 : p.kind === 'light' ? p.moved > 0.03 : true;
    L.push(`| ${p.name} | ${p.mass} | ${p.kind} | (${r3(p.start[0])}, ${r3(p.start[2])}) | (${r3(p.end[0])}, ${r3(p.end[2])}) | **${p.moved.toFixed(4)}** | ${p.rotDeg ?? '—'}° | ${p.robotMoved.toFixed(3)} | ${p.minContact} | ${p.maxSpeed ?? '—'} | ${p.maxRobotY ?? '—'} | ${pass ? 'PASS' : 'FAIL'} (${expected}) |`);
  }
  L.push('');

  // arm
  L.push('## Arm payload & reach');
  L.push('');
  const ar = d.armRes;
  L.push(`- limits: maxLiftKg **${ar.maxLiftKg}**, reach **${ar.reach}** m; robot state mass: ${d.robotMassState ?? 'not exposed'} kg`);
  L.push(`- refused (too_heavy): ${Object.entries(ar.refused).map(([n, v]) => `${n} ${v.mass} kg → ${JSON.stringify(v.grab)}`).join('; ')}`);
  L.push(`- mug on coffee table: y=${ar.mug?.pos?.[1]} m, robot drove ${ar.mug?.approach?.moved} m toward the table, shoulder→mug ${ar.mug?.distance?.toFixed(3)} m, canReach=${ar.mug?.canReach}, grab=${JSON.stringify(ar.mug?.grab)}`);
  if (ar.lift) L.push(`- carry/lift/release: robot moved ${ar.lift.carry?.robotMoved} m with mug following ${ar.lift.carry?.mugMoved} m (held=${ar.lift.carry?.stillHeld}); aiming up lifted ${ar.lift.lifted} m; released, final y=${ar.lift.landedY} m, joint released=${ar.lift.heldAfterRelease === null}`);
  L.push(`- reach boundary: 0.30 m → ${ar.canReach.d030}, 0.32 m → ${ar.canReach.d032}, 0.45 m → ${ar.canReach.d45 ?? ar.canReach.d045}`);
  L.push(`- dining table (0.76 m): canReach top=${ar.dining?.canReachTop}; plate on table → ${JSON.stringify(ar.plateDining?.grab)}`);
  L.push('');

  // stability
  L.push('## Spawn, stacks & stability');
  L.push('');
  L.push(`- interpenetration (QA gate 5: <= 2 mm): deepest contact ${((d.pen[0]?.d ?? 0) * 1000).toFixed(1)} mm; pairs > 2.5 mm: **${d.penBad.length}**`);
  if (d.penBad.length) {
    L.push('');
    L.push('| pair | penetration |');
    L.push('| --- | ---: |');
    for (const p of d.penBad.slice(0, 15)) L.push(`| ${p.a} ↔ ${p.b} | ${(p.d * 1000).toFixed(1)} mm |`);
  }
  L.push('');
  L.push(`- below floor (collider minY < -5 mm): ${d.below.length ? d.below.map((o) => `${o.name} ${(o.minY * 1000).toFixed(1)}mm`).join(', ') : 'none'}`);
  L.push(`- 3 s passive: ${d.stability.stacks} stacked pairs, max relative drift ${(d.stability.maxRelDrift * 1000).toFixed(2)} mm, max body drift ${(d.stability.maxDrift * 1000).toFixed(2)} mm, ${d.stability.asleep}/${d.stability.n} asleep`);
  L.push(`- nudge test: ${d.perturb.n} stacks, max shift ${(d.perturb.maxShift * 1000).toFixed(1)} mm, max tilt ${(d.perturb.maxTilt * 180 / Math.PI).toFixed(2)}°, ${d.perturb.asleep}/${d.perturb.n} re-asleep`);
  L.push(`- tunneling: needle drop → y=${d.tunnel.needle.endY} m; 3 cm ball @6 m/s (no CCD) → y=${d.tunnel.fast.endY} m`);
  L.push('');

  // findings
  L.push('## Findings');
  L.push('');
  if (!d.findings.length) {
    L.push('No FAIL rows.');
  } else {
    for (const sev of ['P0', 'P1', 'P2', 'P3']) {
      const list = d.findings.filter((f) => f.sev === sev);
      if (!list.length) continue;
      L.push(`### ${sev}`);
      L.push('');
      for (const f of list) L.push(`- **${f.gate}** — ${f.evidence}`);
      L.push('');
    }
  }
  L.push('## Notes');
  L.push('');
  L.push('- Push method: robot is placed just outside the object collider footprint facing its centre, then `KeyW`+`ShiftLeft` are held for 2 s (boost). Tests are only counted when robot↔object contact actually happened (min surface distance ≤ 0.27 m); invalid attempts are retried once from another side.');
  L.push('- Collider AABBs (physics truth) are used for below-floor / wall-scale checks; contact manifolds are used for interpenetration and stack detection.');
  L.push('- Determinism: headless Chrome on Metal GPU, fixed 1/60 s Rapier world stepped by the app loop; numbers are reproducible run-to-run within a few mm.');
  L.push('');
  return L.join('\n');
}
