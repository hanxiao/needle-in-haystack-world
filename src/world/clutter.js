// Small dynamic clutter: 100+ objects, many resting on furniture, plus a
// plausible lived-in mess and the hidden sewing needle.
import * as THREE from 'three';
import { Batch, gBox, gCyl, gLathe, gTorus, gSphere, gEllipsoid, matOf, variant, mulberry32, ROOMS } from './helpers.js';
import { SURFACES } from './furniture.js';

const rng = mulberry32(424242);

const BOOK_COLORS = [0x8b3f36, 0x3f5470, 0x4a6b4a, 0xb08a4c, 0x6b4a6b, 0x2f4f4f, 0xa5614a, 0x77706a, 0x9a7b4f, 0x4e5a63];
const MUG_COLORS = [0xe8e4da, 0x8aa1b1, 0x9aa88f, 0xd7c3a8, 0x3f4a52];

function fin(b, name, opts) {
  const { x, y, z, yaw = 0, quat = null, mass = 0.5, material = 'wood', room = 'living', tags = ['clutter'], grabbable, shadows = true, ccd = false, damping = {} } = opts;
  const obj = b.finish({
    name,
    pos: [x, y, z],
    yaw,
    quat,
    mass,
    material,
    room,
    tags,
    grabbable: grabbable ?? mass <= 0.5,
    shadows,
    ccd,
    ...damping,
  });
  // clutter does not cast shadows (furniture/architecture ground the scene; keeps the shadow pass cheap)
  const castDefault = mass >= 3;
  if (opts.castShadow === false || (opts.castShadow === undefined && !castDefault)) {
    obj.mesh.traverse((m) => {
      if (m.isMesh) m.castShadow = false;
    });
  }
  return obj;
}

// ------------------------------------------------------------------ builders

function addMug(ctx, name, x, y, z, o = {}) {
  const b = new Batch(ctx, name);
  const color = o.color ?? MUG_COLORS[0];
  const ceramic = variant(ctx, 'ceramicWhite', { color });
  const h = 0.096;
  const r = 0.039;
  b.lathe(
    ceramic,
    [
      [0, 0],
      [r * 0.82, 0],
      [r, 0.008],
      [r, h - 0.006],
      [r * 0.9, h],
      [r * 0.82, h - 0.008],
      [r * 0.84, 0.014],
      [0, 0.014],
    ],
    [0, 0, 0],
    [0, 0, 0],
    18
  );
  b.torus(ceramic, 0.026, 0.0065, [r + 0.012, h * 0.52, 0], [0, 0, 0], Math.PI * 2, 6, 14);
  if (o.coffee) {
    const coffee = variant(ctx, 'plantSoil', { color: 0x3a2718 });
    b.cyl(coffee, r * 0.86, r * 0.86, 0.004, [0, h - 0.012, 0], [0, 0, 0], 14);
  }
  b.colliderCyl(r + 0.012, h, [0, h / 2, 0]);
  return fin(b, name, { x, y, z, yaw: o.yaw ?? 0, mass: 0.32, material: 'ceramic', room: o.room ?? 'living', tags: ['clutter', 'mug'], shadows: o.shadows ?? true });
}

function addBook(ctx, name, x, y, z, o = {}) {
  const b = new Batch(ctx, name);
  const w = o.w ?? 0.22;
  const d = o.d ?? 0.15;
  const h = o.h ?? 0.03;
  const cover = variant(ctx, 'bookCloth', { color: o.color ?? BOOK_COLORS[0] });
  b.box(cover, w, d, h, [0, h / 2, 0]);
  if (o.pages !== false) {
    const pages = variant(ctx, 'bookPage', { color: 0xece5d2 });
    b.box(pages, w * 0.94, d * 0.9, h * 0.72, [w * 0.025, h / 2, 0]);
  }
  b.colliderBox(w, d, h, [0, h / 2, 0]);
  return fin(b, name, {
    x,
    y,
    z,
    yaw: o.yaw ?? 0,
    mass: o.mass ?? 0.5,
    material: 'paper',
    room: o.room ?? 'living',
    tags: ['clutter', 'book'],
    shadows: o.shadows ?? true,
  });
}

function addBookStack(ctx, name, x, y, z, o = {}) {
  const b = new Batch(ctx, name);
  const n = o.count ?? 3;
  const w = o.w ?? 0.24;
  const d = o.d ?? 0.17;
  const color = o.color ?? BOOK_COLORS[2];
  const cover = variant(ctx, 'bookCloth', { color });
  const pages = variant(ctx, 'bookPage', { color: 0xe9e2cf });
  let yy = 0;
  for (let i = 0; i < n; i++) {
    const h = 0.028 + i * 0.004;
    const yy2 = yy;
    b.box(cover, w - i * 0.012, d - i * 0.008, h, [i * 0.006, yy2 + h / 2, 0]);
    b.box(pages, (w - i * 0.012) * 0.92, (d - i * 0.008) * 0.9, h * 0.7, [i * 0.006 + 0.006, yy2 + h / 2, 0]);
    yy += h;
  }
  b.colliderBox(w, d, yy, [0, yy / 2, 0]);
  return fin(b, name, { x, y, z, yaw: o.yaw ?? 0, mass: o.mass ?? 1.4, material: 'paper', room: o.room ?? 'living', tags: ['clutter', 'book', 'stack'] });
}

function addPlate(ctx, name, x, y, z, o = {}) {
  const b = new Batch(ctx, name);
  const ceramic = variant(ctx, 'ceramicWhite', { color: o.color ?? 0xf0ece2 });
  const r = o.r ?? 0.11;
  b.lathe(
    ceramic,
    [
      [0, 0],
      [r * 0.6, 0],
      [r * 0.92, 0.008],
      [r, 0.016],
      [r * 0.96, 0.019],
      [r * 0.88, 0.011],
      [r * 0.55, 0.006],
      [0, 0.006],
    ],
    [0, 0, 0],
    [0, 0, 0],
    20
  );
  b.colliderCyl(r, 0.02, [0, 0.01, 0]);
  return fin(b, name, { x, y, z, yaw: o.yaw ?? 0, mass: 0.45, material: 'ceramic', room: o.room ?? 'kitchen', tags: ['clutter', 'dish'] });
}

function addBowl(ctx, name, x, y, z, o = {}) {
  const b = new Batch(ctx, name);
  const ceramic = variant(ctx, 'ceramicSage', { color: o.color ?? 0x93a18b });
  const r = o.r ?? 0.09;
  b.lathe(
    ceramic,
    [
      [0, 0],
      [r * 0.55, 0],
      [r * 0.9, 0.02],
      [r, 0.075],
      [r * 0.95, 0.08],
      [r * 0.86, 0.072],
      [r * 0.78, 0.024],
      [r * 0.5, 0.008],
      [0, 0.008],
    ],
    [0, 0, 0],
    [0, 0, 0],
    20
  );
  b.colliderCyl(r, 0.08, [0, 0.04, 0]);
  return fin(b, name, { x, y, z, yaw: o.yaw ?? 0, mass: o.mass ?? 0.3, material: 'ceramic', room: o.room ?? 'kitchen', tags: ['clutter', 'dish'] });
}

function addJar(ctx, name, x, y, z, o = {}) {
  const b = new Batch(ctx, name);
  const glass = matOf(ctx, 'glass');
  const lid = variant(ctx, 'metalBrushed', { color: 0xa9a49a });
  const content = variant(ctx, 'cardboard', { color: 0xcfae7c });
  const h = o.h ?? 0.16;
  const r = o.r ?? 0.045;
  b.cyl(content, r * 0.86, r * 0.86, h * 0.72, [0, h * 0.38, 0], [0, 0, 0], 12);
  b.cyl(glass, r, r, h, [0, h / 2, 0], [0, 0, 0], 14);
  b.cyl(lid, r * 1.05, r * 1.05, 0.018, [0, h + 0.008, 0], [0, 0, 0], 14);
  b.colliderCyl(r, h, [0, h / 2, 0]);
  return fin(b, name, { x, y, z, yaw: o.yaw ?? 0, mass: o.mass ?? 0.5, material: 'glass', room: o.room ?? 'kitchen', tags: ['clutter', 'jar'] });
}

function addBottle(ctx, name, x, y, z, o = {}) {
  const b = new Batch(ctx, name);
  const glass = variant(ctx, 'glass', { color: 0x3f5a3a, opacity: 0.75 });
  const metal = variant(ctx, 'metalBrushed', { color: 0xb9b2a4 });
  const label = variant(ctx, 'paper', { color: 0xd8c8a4 });
  const h = o.h ?? 0.3;
  const r = o.r ?? 0.038;
  b.lathe(
    glass,
    [
      [0, 0],
      [r * 0.8, 0],
      [r, 0.02],
      [r, h * 0.62],
      [r * 0.55, h * 0.78],
      [r * 0.42, h * 0.9],
      [r * 0.42, h],
      [0, h],
    ],
    [0, 0, 0],
    [0, 0, 0],
    16
  );
  b.cyl(label, r * 1.02, r * 1.02, h * 0.22, [0, h * 0.34, 0], [0, 0, 0], 14);
  b.cyl(metal, r * 0.44, r * 0.44, 0.03, [0, h + 0.012, 0], [0, 0, 0], 12);
  b.colliderCyl(r, h, [0, h / 2, 0]);
  return fin(b, name, { x, y, z, yaw: o.yaw ?? 0, mass: o.mass ?? 1.1, material: 'glass', room: o.room ?? 'kitchen', tags: ['clutter', 'bottle'] });
}

function addKettle(ctx, name, x, y, z, o = {}) {
  const b = new Batch(ctx, name);
  const metal = variant(ctx, 'metalBrushed', { color: 0xc2c4c2 });
  const dark = variant(ctx, 'plasticDark', { color: 0x26282a });
  b.lathe(
    metal,
    [
      [0, 0],
      [0.075, 0],
      [0.085, 0.02],
      [0.08, 0.15],
      [0.055, 0.19],
      [0.03, 0.2],
      [0.03, 0.205],
      [0, 0.205],
    ],
    [0, 0, 0],
    [0, 0, 0],
    18
  );
  b.torus(dark, 0.055, 0.011, [0, 0.15, 0], [0, Math.PI / 2, 0], Math.PI * 0.9, 6, 12);
  b.cyl(metal, 0.012, 0.02, 0.13, [0.09, 0.13, 0], [0, 0, -0.7], 8);
  b.cyl(dark, 0.02, 0.02, 0.02, [0, 0.21, 0], [0, 0, 0], 10);
  b.colliderCyl(0.09, 0.21, [0, 0.105, 0]);
  return fin(b, name, { x, y, z, yaw: o.yaw ?? 0, mass: 1.0, material: 'metal', room: o.room ?? 'kitchen', tags: ['clutter', 'kettle'] });
}

function addLaptop(ctx, name, x, y, z, o = {}) {
  const b = new Batch(ctx, name);
  const metal = variant(ctx, 'metalBrushed', { color: 0xb9babc });
  const dark = variant(ctx, 'plasticDark', { color: 0x24262a });
  const screen = matOf(ctx, 'screen');
  b.box(metal, 0.33, 0.23, 0.016, [0, 0.008, 0]);
  b.box(dark, 0.29, 0.11, 0.003, [0, 0.0175, 0.02]);
  b.box(dark, 0.09, 0.055, 0.002, [0, 0.0175, -0.075]);
  // screen hinged at the back, opened ~105 deg
  const tilt = -0.33;
  const sh = 0.22;
  b.box(dark, 0.33, 0.012, sh, [0, 0.016 + (sh / 2) * Math.cos(tilt) - 0.0, -0.115 + (sh / 2) * Math.sin(-tilt) * -1], [tilt, 0, 0]);
  b.box(screen, 0.3, 0.004, sh - 0.03, [0, 0.016 + (sh / 2) * Math.cos(tilt) - 0.0, -0.115 + (sh / 2) * Math.sin(-tilt) * -1 - 0.008], [tilt, 0, 0]);
  b.colliderBox(0.33, 0.23, 0.02, [0, 0.01, 0]);
  b.colliderBox(0.33, 0.02, 0.22, [0, 0.13, -0.1], [Math.sin(tilt / 2), 0, 0, Math.cos(tilt / 2)]);
  return fin(b, name, { x, y, z, yaw: o.yaw ?? 0, mass: 1.6, material: 'plastic', room: o.room ?? 'living', tags: ['clutter', 'laptop', 'electronics'] });
}

function addRemote(ctx, name, x, y, z, o = {}) {
  const b = new Batch(ctx, name);
  const dark = variant(ctx, 'plasticDark', { color: 0x222426 });
  const btn = variant(ctx, 'rubber', { color: 0x4a4d50 });
  b.box(dark, 0.045, 0.16, 0.018, [0, 0.009, 0]);
  for (let i = 0; i < 4; i++) b.box(btn, 0.024, 0.016, 0.004, [0, 0.021, -0.055 + i * 0.026]);
  b.colliderBox(0.045, 0.16, 0.018, [0, 0.009, 0]);
  return fin(b, name, { x, y, z, yaw: o.yaw ?? 0, mass: 0.15, material: 'plastic', room: o.room ?? 'living', tags: ['clutter', 'remote'], shadows: false });
}

function addPhone(ctx, name, x, y, z, o = {}) {
  const b = new Batch(ctx, name);
  const dark = variant(ctx, 'plasticDark', { color: 0x1d1f21 });
  const screen = matOf(ctx, 'screen');
  b.box(dark, 0.072, 0.145, 0.009, [0, 0.0045, 0]);
  b.box(screen, 0.064, 0.132, 0.002, [0, 0.0095, 0]);
  b.colliderBox(0.072, 0.145, 0.009, [0, 0.0045, 0]);
  return fin(b, name, { x, y, z, yaw: o.yaw ?? 0, mass: 0.2, material: 'plastic', room: o.room ?? 'living', tags: ['clutter', 'phone'], shadows: false });
}

function addKeys(ctx, name, x, y, z, o = {}) {
  const b = new Batch(ctx, name);
  const metal = variant(ctx, 'metalBrushed', { color: 0xc8c6bd });
  b.torus(metal, 0.016, 0.003, [0, 0.003, 0], [Math.PI / 2, 0, 0], Math.PI * 2, 4, 12);
  for (const [dx, dz, yaw] of [[0.03, 0.004, 0.2], [0.032, -0.014, -0.35], [-0.026, 0.012, 0.8]]) {
    b.box(metal, 0.045, 0.011, 0.002, [dx, 0.002, dz], [0, yaw, 0]);
    b.box(metal, 0.014, 0.014, 0.002, [dx + 0.02, 0.002, dz], [0, yaw, 0]);
  }
  b.colliderBox(0.09, 0.05, 0.006, [0, 0.003, 0]);
  return fin(b, name, { x, y, z, yaw: o.yaw ?? 0, mass: 0.05, material: 'metal', room: o.room ?? 'living', tags: ['clutter', 'keys'], shadows: false });
}

function addPen(ctx, name, x, y, z, o = {}) {
  const b = new Batch(ctx, name);
  const plastic = variant(ctx, 'plasticDark', { color: 0x2a3a55 });
  const metal = matOf(ctx, 'metalChrome');
  b.cyl(plastic, 0.0045, 0.0045, 0.135, [0, 0.0045, 0], [0, 0, Math.PI / 2], 8);
  b.cyl(metal, 0.003, 0.003, 0.02, [0.075, 0.0045, 0], [0, 0, Math.PI / 2], 6);
  b.colliderBox(0.16, 0.01, 0.01, [0, 0.0045, 0]);
  return fin(b, name, { x, y, z, yaw: o.yaw ?? 0, mass: 0.012, material: 'plastic', room: o.room ?? 'living', tags: ['clutter', 'pen'], shadows: false });
}

function addCandle(ctx, name, x, y, z, o = {}) {
  const b = new Batch(ctx, name);
  const wax = variant(ctx, 'ceramicWhite', { color: 0xe8ddc4 });
  const wick = variant(ctx, 'plantSoil', { color: 0x2a2018 });
  b.cyl(wax, 0.04, 0.042, 0.07, [0, 0.035, 0], [0, 0, 0], 16);
  b.cyl(wick, 0.002, 0.002, 0.012, [0, 0.076, 0], [0, 0, 0], 6);
  b.colliderCyl(0.042, 0.07, [0, 0.035, 0]);
  return fin(b, name, { x, y, z, mass: 0.25, material: 'ceramic', room: o.room ?? 'living', tags: ['clutter', 'candle'] });
}

function addTissueBox(ctx, name, x, y, z, o = {}) {
  const b = new Batch(ctx, name);
  const box = variant(ctx, 'cardboard', { color: 0xc9bfa8 });
  const paper = variant(ctx, 'paper', { color: 0xf1ece0 });
  b.box(box, 0.22, 0.12, 0.07, [0, 0.035, 0]);
  b.box(paper, 0.06, 0.03, 0.02, [0, 0.08, 0], [0, 0.2, 0.2]);
  b.colliderBox(0.22, 0.12, 0.07, [0, 0.035, 0]);
  return fin(b, name, { x, y, z, yaw: o.yaw ?? 0, mass: 0.22, material: 'cardboard', room: o.room ?? 'living', tags: ['clutter', 'box'] });
}

function addTippedMug(ctx, name, x, y, z, o = {}) {
  const b = new Batch(ctx, name);
  const ceramic = variant(ctx, 'ceramicWhite', { color: o.color ?? 0xe8e4da });
  const h = 0.096;
  const r = 0.039;
  b.lathe(
    ceramic,
    [
      [0, -h / 2],
      [r * 0.82, -h / 2],
      [r, -h / 2 + 0.008],
      [r, h / 2 - 0.006],
      [r * 0.9, h / 2],
      [r * 0.82, h / 2 - 0.008],
      [r * 0.84, -h / 2 + 0.014],
      [0, -h / 2 + 0.014],
    ],
    [0, 0, 0],
    [0, 0, 0],
    18
  );
  b.torus(ceramic, 0.026, 0.0065, [r + 0.012, 0, 0], [0, 0, 0], Math.PI * 2, 6, 14);
  b.colliderCyl(0.042, h, [0, 0, 0]);
  const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), o.yaw ?? 0.6)
    .multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI / 2));
  return b.finish({
    name,
    pos: [x, y + 0.001, z],
    quat: [q.x, q.y, q.z, q.w],
    mass: 0.32,
    material: 'ceramic',
    room: o.room ?? 'living',
    tags: ['clutter', 'mug', 'tipped'],
    grabbable: true,
    recenter: false,
    shadows: true,
  });
}

function addPan(ctx, name, x, y, z, o = {}) {
  const b = new Batch(ctx, name);
  const metal = variant(ctx, 'metalDark', { color: 0x3a3c3e, metalness: 0.6, roughness: 0.35 });
  const handle = variant(ctx, 'plasticDark', { color: 0x232527 });
  b.cyl(metal, 0.13, 0.115, 0.02, [0, 0.01, 0], [0, 0, 0], 20);
  b.cyl(metal, 0.12, 0.12, 0.05, [0, 0.045, 0], [0, 0, 0], 20);
  b.box(handle, 0.02, 0.16, 0.018, [0, 0.03, 0.2], [0, 0, 0]);
  b.colliderCyl(0.13, 0.07, [0, 0.035, 0]);
  return fin(b, name, { x, y, z, yaw: o.yaw ?? 0, mass: 1.2, material: 'metal', room: o.room ?? 'kitchen', tags: ['clutter', 'pan'] });
}

function addCerealBox(ctx, name, x, y, z, o = {}) {
  const b = new Batch(ctx, name);
  const box = variant(ctx, 'cardboard', { color: 0xd6b45e });
  const label = variant(ctx, 'paper', { color: 0xe8e0cc });
  b.box(box, 0.2, 0.08, 0.3, [0, 0.15, 0]);
  b.box(label, 0.16, 0.062, 0.16, [0, 0.16, 0.001]);
  b.colliderBox(0.2, 0.08, 0.3, [0, 0.15, 0]);
  return fin(b, name, { x, y, z, yaw: o.yaw ?? 0, mass: 0.4, material: 'cardboard', room: o.room ?? 'kitchen', tags: ['clutter', 'box'] });
}

function addWaterBottle(ctx, name, x, y, z, o = {}) {
  const b = new Batch(ctx, name);
  const plastic = variant(ctx, 'glassFrosted', { color: 0xa9c4d2 });
  const cap = variant(ctx, 'plasticDark', { color: 0x2c4a5e });
  b.lathe(
    plastic,
    [
      [0, 0],
      [0.03, 0],
      [0.035, 0.02],
      [0.035, 0.16],
      [0.022, 0.2],
      [0.022, 0.22],
      [0, 0.22],
    ],
    [0, 0, 0],
    [0, 0, 0],
    14
  );
  b.cyl(cap, 0.024, 0.024, 0.022, [0, 0.231, 0], [0, 0, 0], 12);
  b.colliderCyl(0.035, 0.22, [0, 0.11, 0]);
  return fin(b, name, { x, y, z, yaw: o.yaw ?? 0, mass: 0.5, material: 'plastic', room: o.room ?? 'study', tags: ['clutter', 'bottle'] });
}

function addCushion(ctx, name, x, y, z, o = {}) {
  const b = new Batch(ctx, name);
  const fab = variant(ctx, 'fabricLinen', { color: o.color ?? 0xb8a487 });
  b.add(fab, gEllipsoid(0.21, 0.062, 0.2, [0, 0.065, 0], [0, 0, 0], 18));
  b.box(fab, 0.36, 0.32, 0.02, [0, 0.008, 0]);
  b.colliderBox(0.42, 0.4, 0.13, [0, 0.065, 0]);
  return fin(b, name, { x, y, z, yaw: o.yaw ?? 0, mass: o.mass ?? 0.45, material: 'fabric', room: o.room ?? 'living', tags: ['clutter', 'cushion'] });
}

function addThrow(ctx, name, x, y, z, o = {}) {
  const b = new Batch(ctx, name);
  const fab = variant(ctx, 'fabricWool', { color: o.color ?? 0xa88d6f });
  const w = o.w ?? 0.52;
  const d = o.d ?? 0.58;
  // quilted, lumpy blanket rather than a flat slab
  b.box(fab, w - 0.06, d - 0.06, 0.024, [0, 0.012, 0]);
  const lumps = 3;
  for (let i = 0; i < lumps; i++) {
    const z = -d / 2 + ((i + 0.5) * d) / lumps;
    const sag = Math.sin(i * 1.7) * 0.004;
    b.add(fab, gEllipsoid(w / 2 - 0.02, 0.032, d / (2 * lumps) + 0.02, [0, 0.028 + sag, z], [0, 0, 0], 20));
  }
  b.colliderBox(w, d, 0.06, [0, 0.03, 0]);
  return fin(b, name, { x, y, z, yaw: o.yaw ?? 0, mass: o.mass ?? 0.9, material: 'fabric', room: o.room ?? 'living', tags: ['clutter', 'blanket'] });
}

function addPaper(ctx, name, x, y, z, o = {}) {
  const b = new Batch(ctx, name);
  const paper = variant(ctx, 'paper', { color: o.color ?? 0xf0ebdd });
  b.box(paper, 0.21, 0.297, 0.004, [0, 0.002, 0], [0, 0, 0]);
  b.box(paper, 0.04, 0.05, 0.005, [0.03, 0.005, 0.06]);
  b.colliderBox(0.21, 0.297, 0.006, [0, 0.003, 0]);
  return fin(b, name, { x, y, z, yaw: o.yaw ?? 0, mass: 0.012, material: 'paper', room: o.room ?? 'living', tags: ['clutter', 'paper'], shadows: false });
}

function addSock(ctx, name, x, y, z, o = {}) {
  const b = new Batch(ctx, name);
  const fab = variant(ctx, 'cotton', { color: o.color ?? 0x5d6a72 });
  b.box(fab, 0.08, 0.2, 0.025, [0, 0.0125, 0], [0, 0.1, 0]);
  b.box(fab, 0.075, 0.07, 0.028, [0.01, 0.014, -0.11], [0, 0.5, 0]);
  b.colliderBox(0.1, 0.24, 0.03, [0, 0.015, 0]);
  return fin(b, name, { x, y, z, yaw: o.yaw ?? 0, mass: 0.06, material: 'fabric', room: o.room ?? 'living', tags: ['clutter', 'sock'], shadows: false });
}

function addCable(ctx, name, x, y, z, o = {}) {
  const b = new Batch(ctx, name);
  const rubber = variant(ctx, 'rubber', { color: 0x232527 });
  b.box(rubber, 0.5, 0.012, 0.006, [0, 0.003, 0], [0, 0.25, 0]);
  b.box(rubber, 0.2, 0.012, 0.006, [0.24, 0.003, 0.08], [0, -0.4, 0]);
  b.box(rubber, 0.02, 0.03, 0.02, [0.2, 0.004, 0.0]);
  b.colliderBox(0.55, 0.06, 0.012, [0.05, 0.004, 0.02]);
  return fin(b, name, { x, y, z, yaw: o.yaw ?? 0, mass: 0.14, material: 'rubber', room: o.room ?? 'living', tags: ['clutter', 'cable'], shadows: false });
}

function addNeedle(ctx, name, x, y, z, o = {}) {
  const b = new Batch(ctx, name);
  const metal = variant(ctx, 'metalChrome', { color: 0xd8d8d2 });
  const thread = variant(ctx, 'cotton', { color: 0x9c3b34 });
  // needle lying on its side: local Y is the length, rotated flat
  b.cyl(metal, 0.0007, 0.0011, 0.042, [0, 0, 0], [0, 0, Math.PI / 2], 6);
  b.box(metal, 0.006, 0.0035, 0.0009, [-0.019, 0, 0]);
  b.box(thread, 0.05, 0.0012, 0.0012, [0.042, 0.0006, 0.002], [0, 0.5, 0]);
  b.colliderBoxH([0.024, 0.0016, 0.0025], [0, 0, 0]);
  return fin(b, name, {
    x,
    y,
    z,
    yaw: o.yaw ?? 0,
    mass: 0.0012,
    material: 'metal',
    room: o.room ?? 'living',
    tags: ['clutter', 'needle', 'tiny'],
    shadows: false,
    ccd: true,
    damping: { linearDamping: 0.6, angularDamping: 0.8 },
  });
}

function addSmallPlant(ctx, name, x, y, z, o = {}) {
  const b = new Batch(ctx, name);
  const pot = variant(ctx, 'ceramicClay', { color: 0xb06a4e });
  const leaf = variant(ctx, 'plantLeaf', { color: 0x3f6b3a });
  const soil = matOf(ctx, 'plantSoil');
  b.cyl(pot, 0.055, 0.045, 0.09, [0, 0.045, 0], [0, 0, 0], 14);
  b.cyl(soil, 0.05, 0.05, 0.01, [0, 0.092, 0], [0, 0, 0], 12);
  for (let i = 0; i < 5; i++) {
    const a = i * 1.3;
    b.add(leaf, gSphere(0.035, [Math.cos(a) * 0.05, 0.14 + (i % 2) * 0.03, Math.sin(a) * 0.05], 6));
    b.cyl(leaf, 0.004, 0.005, 0.08, [Math.cos(a) * 0.03, 0.13, Math.sin(a) * 0.03], [Math.sin(a) * 0.2, 0, -Math.cos(a) * 0.2], 5);
  }
  b.colliderCyl(0.06, 0.1, [0, 0.05, 0]);
  return fin(b, name, { x, y, z, mass: 0.6, material: 'plant', room: o.room ?? 'living', tags: ['clutter', 'plant'] });
}

function addVase(ctx, name, x, y, z, o = {}) {
  const b = new Batch(ctx, name);
  const ceramic = variant(ctx, 'ceramicClay', { color: 0xa87553 });
  const stem = variant(ctx, 'plantLeaf', { color: 0x4c6b3c });
  b.lathe(
    ceramic,
    [
      [0, 0],
      [0.06, 0],
      [0.085, 0.05],
      [0.075, 0.15],
      [0.045, 0.21],
      [0.045, 0.24],
      [0, 0.24],
    ],
    [0, 0, 0],
    [0, 0, 0],
    18
  );
  for (let i = 0; i < 4; i++) {
    const a = i * 1.7;
    b.cyl(stem, 0.003, 0.004, 0.24, [Math.cos(a) * 0.02, 0.34, Math.sin(a) * 0.02], [Math.sin(a) * 0.2, 0, -Math.cos(a) * 0.2], 5);
  }
  b.colliderCyl(0.085, 0.24, [0, 0.12, 0]);
  return fin(b, name, { x, y, z, mass: 0.7, material: 'ceramic', room: o.room ?? 'living', tags: ['clutter', 'vase'] });
}

function addShirt(ctx, name, x, y, z, o = {}) {
  const b = new Batch(ctx, name);
  const fab = variant(ctx, 'cotton', { color: o.color ?? 0x7c8b9c });
  b.box(fab, 0.34, 0.3, 0.035, [0, 0.0175, 0], [0, 0, 0]);
  b.box(fab, 0.36, 0.08, 0.045, [0, 0.04, -0.12], [0, 0.15, 0]);
  b.box(fab, 0.1, 0.1, 0.05, [0.08, 0.03, 0.1], [0, 0.4, 0]);
  b.colliderBox(0.36, 0.34, 0.06, [0, 0.03, 0]);
  return fin(b, name, { x, y, z, yaw: o.yaw ?? 0, mass: 0.18, material: 'fabric', room: o.room ?? 'kitchen', tags: ['clutter', 'clothes'] });
}

function addHoodie(ctx, name, x, y, z, o = {}) {
  const b = new Batch(ctx, name);
  const fab = variant(ctx, 'cotton', { color: o.color ?? 0x6a7076 });
  b.box(fab, 0.38, 0.34, 0.07, [0, 0.035, 0]);
  b.box(fab, 0.22, 0.12, 0.09, [0, 0.09, 0.06], [0, 0.2, 0]);
  b.box(fab, 0.14, 0.1, 0.08, [-0.06, 0.08, -0.1], [0, -0.3, 0]);
  b.colliderBox(0.4, 0.38, 0.1, [0, 0.05, 0]);
  return fin(b, name, { x, y, z, yaw: o.yaw ?? 0, mass: 0.6, material: 'fabric', room: o.room ?? 'kitchen', tags: ['clutter', 'clothes'] });
}

function addShoe(ctx, name, x, y, z, o = {}) {
  const b = new Batch(ctx, name);
  const leather = variant(ctx, 'leather', { color: o.color ?? 0x4a3f37 });
  const rubber = variant(ctx, 'rubber', { color: 0x1e2022 });
  b.box(rubber, 0.1, 0.26, 0.025, [0, 0.0125, 0]);
  b.box(leather, 0.095, 0.24, 0.055, [0, 0.052, -0.01]);
  b.box(leather, 0.09, 0.09, 0.06, [0, 0.085, -0.09], [0.2, 0, 0]);
  b.box(leather, 0.08, 0.04, 0.02, [0, 0.095, 0.06]);
  b.colliderBox(0.1, 0.27, 0.1, [0, 0.05, 0]);
  return fin(b, name, { x, y, z, yaw: o.yaw ?? 0, mass: 0.45, material: 'leather', room: o.room ?? 'hallway', tags: ['clutter', 'shoe'] });
}

function addBackpack(ctx, name, x, y, z, o = {}) {
  const b = new Batch(ctx, name);
  const denim = variant(ctx, 'denim', { color: 0x5c6c7e });
  const strap = variant(ctx, 'rubber', { color: 0x232527 });
  const zip = variant(ctx, 'metalBrushed', { color: 0xa8a49a });
  b.box(denim, 0.32, 0.2, 0.44, [0, 0.22, 0]);
  b.box(denim, 0.28, 0.08, 0.2, [0, 0.28, -0.13]);
  b.box(strap, 0.045, 0.045, 0.34, [-0.11, 0.3, 0.19]);
  b.box(strap, 0.045, 0.045, 0.34, [0.11, 0.3, 0.19]);
  b.box(zip, 0.26, 0.012, 0.012, [0, 0.12, 0.102]);
  b.box(denim, 0.18, 0.04, 0.12, [0, 0.06, 0.08], [0, 0, 0]);
  b.colliderBox(0.34, 0.24, 0.46, [0, 0.23, 0]);
  return fin(b, name, { x, y, z, yaw: o.yaw ?? 0, mass: 1.8, material: 'fabric', room: o.room ?? 'hallway', tags: ['clutter', 'bag'] });
}

function addMail(ctx, name, x, y, z, o = {}) {
  const b = new Batch(ctx, name);
  const env = variant(ctx, 'paper', { color: 0xe9e2d2 });
  const stamp = variant(ctx, 'paper', { color: 0xb6553f });
  b.box(env, 0.22, 0.11, 0.005, [0, 0.0025, 0]);
  b.box(stamp, 0.03, 0.035, 0.001, [0.08, 0.006, 0.025]);
  b.colliderBox(0.22, 0.11, 0.006, [0, 0.003, 0]);
  return fin(b, name, { x, y, z, yaw: o.yaw ?? 0, mass: 0.02, material: 'paper', room: o.room ?? 'hallway', tags: ['clutter', 'mail'], shadows: false });
}

function addGlasses(ctx, name, x, y, z, o = {}) {
  const b = new Batch(ctx, name);
  const frame = variant(ctx, 'metalDark', { color: 0x2b2d2f });
  const lens = variant(ctx, 'glass', { opacity: 0.25 });
  for (const sx of [-1, 1]) {
    b.torus(frame, 0.026, 0.0025, [sx * 0.03, 0.012, 0], [Math.PI / 2, 0, 0], Math.PI * 2, 4, 12);
    b.cyl(lens, 0.024, 0.024, 0.002, [sx * 0.03, 0.012, 0], [0, 0, 0], 12);
  }
  b.box(frame, 0.02, 0.003, 0.003, [0, 0.014, 0]);
  b.box(frame, 0.06, 0.003, 0.003, [-0.09, 0.016, 0.02], [0, 0.4, 0]);
  b.box(frame, 0.06, 0.003, 0.003, [0.09, 0.016, 0.02], [0, -0.4, 0]);
  b.colliderBox(0.16, 0.06, 0.03, [0, 0.012, 0]);
  return fin(b, name, { x, y, z, yaw: o.yaw ?? 0, mass: 0.03, material: 'glass', room: o.room ?? 'bedroom', tags: ['clutter', 'glasses'], shadows: false });
}

function addHairbrush(ctx, name, x, y, z, o = {}) {
  const b = new Batch(ctx, name);
  const plastic = variant(ctx, 'plasticWhite', { color: 0xd8cfc2 });
  const bristle = variant(ctx, 'rubber', { color: 0x3a3c3e });
  b.box(plastic, 0.055, 0.16, 0.025, [0, 0.0125, 0]);
  b.box(plastic, 0.03, 0.09, 0.02, [0, 0.012, 0.11]);
  for (let i = 0; i < 4; i++) b.box(bristle, 0.04, 0.012, 0.004, [0, 0.026, -0.05 + i * 0.03]);
  b.colliderBox(0.055, 0.16, 0.03, [0, 0.015, 0]);
  return fin(b, name, { x, y, z, yaw: o.yaw ?? 0, mass: 0.08, material: 'plastic', room: o.room ?? 'bedroom', tags: ['clutter', 'brush'], shadows: false });
}

function addSlipper(ctx, name, x, y, z, o = {}) {
  const b = new Batch(ctx, name);
  const fab = variant(ctx, 'fabricWool', { color: o.color ?? 0x8a7d6a });
  const sole = variant(ctx, 'rubber', { color: 0x2a2622 });
  b.box(sole, 0.1, 0.27, 0.018, [0, 0.009, 0]);
  b.box(fab, 0.095, 0.22, 0.035, [0, 0.035, 0.01]);
  b.box(fab, 0.08, 0.1, 0.04, [0, 0.06, -0.08], [0.2, 0, 0]);
  b.colliderBox(0.1, 0.28, 0.07, [0, 0.035, 0]);
  return fin(b, name, { x, y, z, yaw: o.yaw ?? 0, mass: 0.25, material: 'fabric', room: o.room ?? 'bedroom', tags: ['clutter', 'slipper'] });
}

function addTowel(ctx, name, x, y, z, o = {}) {
  const b = new Batch(ctx, name);
  const fab = variant(ctx, 'cotton', { color: o.color ?? 0xd4cfc0 });
  b.box(fab, 0.4, 0.3, 0.05, [0, 0.025, 0]);
  b.box(fab, 0.38, 0.1, 0.06, [0, 0.05, -0.12], [0, 0.1, 0]);
  b.colliderBox(0.42, 0.32, 0.06, [0, 0.03, 0]);
  return fin(b, name, { x, y, z, yaw: o.yaw ?? 0, mass: 0.4, material: 'fabric', room: o.room ?? 'bathroom', tags: ['clutter', 'towel'] });
}

function addBottleSmall(ctx, name, x, y, z, o = {}) {
  const b = new Batch(ctx, name);
  const plastic = variant(ctx, 'plasticWhite', { color: o.color ?? 0xe4e0d6 });
  const cap = variant(ctx, 'plasticDark', { color: o.cap ?? 0x2c2e30 });
  const h = o.h ?? 0.17;
  const r = o.r ?? 0.035;
  b.lathe(
    plastic,
    [
      [0, 0],
      [r * 0.85, 0],
      [r, 0.015],
      [r, h * 0.82],
      [r * 0.6, h * 0.94],
      [r * 0.6, h],
      [0, h],
    ],
    [0, 0, 0],
    [0, 0, 0],
    14
  );
  b.cyl(cap, r * 0.62, r * 0.62, 0.022, [0, h + 0.01, 0], [0, 0, 0], 12);
  b.colliderCyl(r, h, [0, h / 2, 0]);
  return fin(b, name, { x, y, z, yaw: o.yaw ?? 0, mass: o.mass ?? 0.35, material: 'plastic', room: o.room ?? 'bathroom', tags: ['clutter', 'bottle'] });
}

function addSoap(ctx, name, x, y, z, o = {}) {
  const b = new Batch(ctx, name);
  const soap = variant(ctx, 'ceramicWhite', { color: 0xe6d9bc });
  b.box(soap, 0.09, 0.06, 0.028, [0, 0.014, 0], [0, 0, 0]);
  b.colliderBox(0.09, 0.06, 0.028, [0, 0.014, 0]);
  return fin(b, name, { x, y, z, yaw: o.yaw ?? 0, mass: 0.1, material: 'ceramic', room: o.room ?? 'bathroom', tags: ['clutter', 'soap'], shadows: false });
}

function addToothbrush(ctx, name, x, y, z, o = {}) {
  const b = new Batch(ctx, name);
  const plastic = variant(ctx, 'plasticWhite', { color: 0xcfd6d8 });
  const bristle = variant(ctx, 'plasticWhite', { color: 0x8fa8b8 });
  b.box(plastic, 0.014, 0.16, 0.012, [0, 0.008, 0], [0, 0.3, 0]);
  b.box(plastic, 0.016, 0.05, 0.014, [0, 0.012, 0.08], [0, 0.3, 0]);
  b.box(bristle, 0.016, 0.03, 0.012, [0, 0.022, 0.08], [0, 0.3, 0]);
  b.colliderBox(0.05, 0.2, 0.02, [0, 0.012, 0]);
  return fin(b, name, { x, y, z, yaw: o.yaw ?? 0, mass: 0.02, material: 'plastic', room: o.room ?? 'bathroom', tags: ['clutter', 'toothbrush'], shadows: false });
}

function addToiletRoll(ctx, name, x, y, z, o = {}) {
  const b = new Batch(ctx, name);
  const paper = variant(ctx, 'paper', { color: 0xf2ede2 });
  b.cyl(paper, 0.06, 0.06, 0.1, [0, 0.05, 0], [0, 0, 0], 16);
  b.cyl(paper, 0.062, 0.062, 0.012, [0, 0.1, 0], [0, 0, 0], 16);
  b.colliderCyl(0.062, 0.1, [0, 0.05, 0]);
  return fin(b, name, { x, y, z, yaw: o.yaw ?? 0, mass: 0.15, material: 'paper', room: o.room ?? 'bathroom', tags: ['clutter', 'toiletroll'] });
}

function addScale(ctx, name, x, y, z, o = {}) {
  const b = new Batch(ctx, name);
  const glass = variant(ctx, 'glassFrosted', { color: 0xdfe3e0 });
  const body = variant(ctx, 'plasticWhite', { color: 0xe8e5dd });
  b.box(body, 0.3, 0.3, 0.04, [0, 0.02, 0]);
  b.box(glass, 0.22, 0.22, 0.008, [0, 0.042, 0]);
  b.colliderBox(0.3, 0.3, 0.05, [0, 0.025, 0]);
  return fin(b, name, { x, y, z, yaw: o.yaw ?? 0, mass: 1.8, material: 'plastic', room: o.room ?? 'bathroom', tags: ['clutter', 'scale'] });
}

function addSponge(ctx, name, x, y, z, o = {}) {
  const b = new Batch(ctx, name);
  const sponge = variant(ctx, 'foam', { color: 0xd9c65e });
  const scrub = variant(ctx, 'fabricWool', { color: 0x4f6b52 });
  b.box(sponge, 0.09, 0.07, 0.03, [0, 0.015, 0]);
  b.box(scrub, 0.088, 0.068, 0.008, [0, 0.032, 0]);
  b.colliderBox(0.09, 0.07, 0.038, [0, 0.019, 0]);
  return fin(b, name, { x, y, z, yaw: o.yaw ?? 0, mass: 0.04, material: 'foam', room: o.room ?? 'kitchen', tags: ['clutter', 'sponge'], shadows: false });
}

function addKeyboard(ctx, name, x, y, z, o = {}) {
  const b = new Batch(ctx, name);
  const dark = variant(ctx, 'plasticDark', { color: 0x2a2c2e });
  const keys = variant(ctx, 'plasticWhite', { color: 0x8e8f8c });
  b.box(dark, 0.42, 0.15, 0.018, [0, 0.009, 0]);
  for (let r = 0; r < 4; r++) b.box(keys, 0.36, 0.02, 0.004, [0, 0.02, -0.05 + r * 0.032]);
  b.colliderBox(0.42, 0.15, 0.018, [0, 0.009, 0]);
  return fin(b, name, { x, y, z, yaw: o.yaw ?? 0, mass: 0.7, material: 'plastic', room: o.room ?? 'study', tags: ['clutter', 'keyboard'] });
}

function addMouse(ctx, name, x, y, z, o = {}) {
  const b = new Batch(ctx, name);
  const dark = variant(ctx, 'plasticDark', { color: 0x26282a });
  b.add(dark, gSphere(0.05, [0, 0.026, 0], 10));
  b.box(dark, 0.04, 0.06, 0.01, [0, 0.05, 0]);
  b.colliderBox(0.075, 0.11, 0.04, [0, 0.025, 0]);
  return fin(b, name, { x, y, z, yaw: o.yaw ?? 0, mass: 0.1, material: 'plastic', room: o.room ?? 'study', tags: ['clutter', 'mouse'], shadows: false });
}

function addHeadphones(ctx, name, x, y, z, o = {}) {
  const b = new Batch(ctx, name);
  const dark = variant(ctx, 'plasticDark', { color: 0x24262a });
  const pad = variant(ctx, 'leather', { color: 0x3a3c40 });
  b.torus(dark, 0.085, 0.012, [0, 0.02, 0], [0, 0, 0], Math.PI, 6, 16);
  for (const sx of [-1, 1]) b.cyl(pad, 0.035, 0.035, 0.03, [sx * 0.085, -0.01, 0], [0, 0, Math.PI / 2], 12);
  b.colliderBox(0.19, 0.1, 0.12, [0, 0.06, 0]);
  return fin(b, name, { x, y, z, yaw: o.yaw ?? 0, mass: 0.25, material: 'plastic', room: o.room ?? 'study', tags: ['clutter', 'headphones'] });
}

function addPenHolder(ctx, name, x, y, z, o = {}) {
  const b = new Batch(ctx, name);
  const metal = variant(ctx, 'metalDark', { color: 0x33373a });
  const plastic = variant(ctx, 'plasticDark', { color: 0x2a3a55 });
  b.cyl(metal, 0.045, 0.04, 0.1, [0, 0.05, 0], [0, 0, 0], 14);
  for (let i = 0; i < 4; i++) {
    const a = i * 1.6;
    b.cyl(plastic, 0.004, 0.004, 0.14, [Math.cos(a) * 0.02, 0.14, Math.sin(a) * 0.02], [Math.sin(a) * 0.15, 0, -Math.cos(a) * 0.15], 6);
  }
  b.colliderCyl(0.05, 0.1, [0, 0.05, 0]);
  return fin(b, name, { x, y, z, mass: 0.3, material: 'metal', room: o.room ?? 'study', tags: ['clutter', 'holder'] });
}

function addNotebook(ctx, name, x, y, z, o = {}) {
  const b = new Batch(ctx, name);
  const cover = variant(ctx, 'bookCloth', { color: 0x3f4a52 });
  const pages = variant(ctx, 'bookPage', { color: 0xece5d2 });
  b.box(cover, 0.16, 0.21, 0.012, [0, 0.006, 0]);
  b.box(pages, 0.15, 0.2, 0.008, [0.004, 0.014, 0]);
  b.colliderBox(0.16, 0.21, 0.02, [0, 0.01, 0]);
  return fin(b, name, { x, y, z, yaw: o.yaw ?? 0, mass: 0.28, material: 'paper', room: o.room ?? 'study', tags: ['clutter', 'notebook'] });
}

function addStickyNotes(ctx, name, x, y, z, o = {}) {
  const b = new Batch(ctx, name);
  const note = variant(ctx, 'paper', { color: 0xd9c95e });
  b.box(note, 0.08, 0.08, 0.004, [0, 0.002, 0], [0, 0.1, 0]);
  b.box(note, 0.08, 0.08, 0.004, [0.01, 0.006, 0.01], [0, -0.2, 0]);
  b.colliderBox(0.1, 0.1, 0.008, [0, 0.004, 0]);
  return fin(b, name, { x, y, z, yaw: o.yaw ?? 0, mass: 0.01, material: 'paper', room: o.room ?? 'study', tags: ['clutter', 'paper'], shadows: false });
}

function addGroceryBag(ctx, name, x, y, z, o = {}) {
  const b = new Batch(ctx, name);
  const paper = variant(ctx, 'cardboard', { color: 0xc4a276 });
  const green = variant(ctx, 'plantLeaf', { color: 0x5c7a45 });
  b.box(paper, 0.26, 0.2, 0.36, [0, 0.18, 0]);
  for (const sx of [-1, 1]) {
    b.box(paper, 0.02, 0.02, 0.12, [sx * 0.08, 0.38, 0]);
    b.box(paper, 0.02, 0.09, 0.02, [sx * 0.1, 0.335, 0]);
  }
  b.box(green, 0.13, 0.1, 0.09, [0, 0.32, -0.02], [0, 0.2, 0]);
  b.colliderBox(0.26, 0.22, 0.36, [0, 0.18, 0]);
  return fin(b, name, { x, y, z, yaw: o.yaw ?? 0, mass: 0.5, material: 'cardboard', room: o.room ?? 'kitchen', tags: ['clutter', 'bag'] });
}

function addFruit(ctx, name, x, y, z, o = {}) {
  const b = new Batch(ctx, name);
  const fruit = variant(ctx, 'plantLeaf', { color: o.color ?? 0xa8442f });
  b.add(fruit, gSphere(0.045, [0, 0.045, 0], 10));
  b.colliderBall(0.045, [0, 0.045, 0]);
  return fin(b, name, { x, y, z, mass: 0.18, material: 'plant', room: o.room ?? 'kitchen', tags: ['clutter', 'fruit'], shadows: false });
}

function addBowlFruit(ctx, name, x, y, z, o = {}) {
  const b = new Batch(ctx, name);
  const ceramic = variant(ctx, 'ceramicWhite', { color: 0xd9d3c4 });
  b.lathe(
    ceramic,
    [
      [0, 0],
      [0.1, 0],
      [0.13, 0.02],
      [0.16, 0.07],
      [0.155, 0.075],
      [0.12, 0.03],
      [0.09, 0.012],
      [0, 0.012],
    ],
    [0, 0, 0],
    [0, 0, 0],
    20
  );
  b.colliderCyl(0.16, 0.08, [0, 0.04, 0]);
  return fin(b, name, { x, y, z, mass: 0.45, material: 'ceramic', room: o.room ?? 'kitchen', tags: ['clutter', 'dish'] });
}

function addDishRack(ctx, name, x, y, z, o = {}) {
  const b = new Batch(ctx, name);
  const metal = variant(ctx, 'metalBrushed', { color: 0xa8abad });
  b.box(metal, 0.34, 0.24, 0.012, [0, 0.006, 0]);
  for (const sx of [-1, 1]) b.box(metal, 0.012, 0.24, 0.1, [sx * 0.165, 0.06, 0]);
  for (let i = 0; i < 4; i++) b.box(metal, 0.3, 0.012, 0.08, [0, 0.02, -0.08 + i * 0.05]);
  b.box(metal, 0.34, 0.012, 0.1, [0, 0.11, -0.11]);
  b.colliderBox(0.34, 0.24, 0.14, [0, 0.07, 0]);
  return fin(b, name, { x, y, z, yaw: o.yaw ?? 0, mass: 0.7, material: 'metal', room: o.room ?? 'kitchen', tags: ['clutter', 'rack'] });
}

function addCuttingBoard(ctx, name, x, y, z, o = {}) {
  const b = new Batch(ctx, name);
  const wood = variant(ctx, 'woodLight', { color: 0xc2a074 });
  b.box(wood, 0.36, 0.26, 0.025, [0, 0.0125, 0]);
  b.box(wood, 0.36, 0.03, 0.025, [0, 0.0125, 0]);
  b.colliderBox(0.36, 0.26, 0.025, [0, 0.0125, 0]);
  return fin(b, name, { x, y, z, yaw: o.yaw ?? 0, mass: 0.8, material: 'wood', room: o.room ?? 'kitchen', tags: ['clutter', 'board'] });
}

function addDishTowel(ctx, name, x, y, z, o = {}) {
  const b = new Batch(ctx, name);
  const fab = variant(ctx, 'cotton', { color: 0x9fb0b5 });
  b.box(fab, 0.22, 0.16, 0.012, [0, 0.006, 0]);
  b.box(fab, 0.2, 0.04, 0.014, [0, 0.01, -0.08], [0, 0.1, 0]);
  b.colliderBox(0.22, 0.18, 0.016, [0, 0.008, 0]);
  return fin(b, name, { x, y, z, yaw: o.yaw ?? 0, mass: 0.12, material: 'fabric', room: o.room ?? 'kitchen', tags: ['clutter', 'towel'], shadows: false });
}

function addPaperBall(ctx, name, x, y, z, o = {}) {
  const b = new Batch(ctx, name);
  const paper = variant(ctx, 'paper', { color: 0xe9e3d4 });
  b.add(paper, gSphere(0.045, [0, 0.045, 0], 7));
  b.colliderBall(0.045, [0, 0.045, 0]);
  return fin(b, name, { x, y, z, mass: 0.02, material: 'paper', room: o.room ?? 'kitchen', tags: ['clutter', 'paper'], shadows: false });
}

function addOnion(ctx, name, x, y, z, o = {}) {
  const b = new Batch(ctx, name);
  const skin = variant(ctx, 'plantSoil', { color: 0xa9744a });
  b.add(skin, gSphere(0.055, [0, 0.055, 0], 10));
  b.cyl(skin, 0.008, 0.008, 0.03, [0, 0.11, 0], [0, 0, 0], 6);
  b.colliderBall(0.055, [0, 0.055, 0]);
  return fin(b, name, { x, y, z, mass: 0.15, material: 'plant', room: o.room ?? 'kitchen', tags: ['clutter', 'food'], shadows: false });
}

function addUmbrella(ctx, name, x, y, z, o = {}) {
  const b = new Batch(ctx, name);
  const fab = variant(ctx, 'denim', { color: 0x3a4a5c });
  const metal = variant(ctx, 'metalDark', { color: 0x2c2e30 });
  const handle = variant(ctx, 'woodWarm', { color: 0x8a6242 });
  b.cyl(metal, 0.008, 0.008, 0.85, [0, 0.5, 0], [0, 0, 0.22], 6);
  b.cyl(fab, 0.05, 0.015, 0.62, [0.11, 0.62, 0], [0, 0, 0.22], 8);
  b.cyl(handle, 0.016, 0.014, 0.1, [-0.09, 0.1, 0], [0, 0, 0.22], 6);
  b.colliderBox(0.25, 0.1, 0.95, [0, 0.48, 0]);
  return b.finish({
    name,
    pos: [x, y, z],
    yaw: o.yaw ?? 0,
    isStatic: true,
    material: 'metal',
    room: o.room ?? 'hallway',
    tags: ['clutter', 'umbrella'],
  });
}

// ------------------------------------------------------- static draped cloth

// Cloth folded over a rail/back: wavy strips on both faces read as fabric.
function clothOver(b, mat, { x, z, topY, axis, width, drop, thick = 0.012, sideOffset = 0.05 }) {
  const n = 8;
  const step = width / n;
  for (const side of [-1, 1]) {
    for (let i = 0; i < n; i++) {
      const u = -width / 2 + step * (i + 0.5);
      const wave = Math.sin(i * 2.05 + side * 0.7) * 0.005;
      const dropH = drop * (0.94 + 0.06 * Math.sin(i * 1.37 + side));
      const off = side * (sideOffset + wave);
      if (axis === 'x') {
        b.box(mat, step * 1.02, thick, dropH, [x + u, topY - dropH / 2 + 0.012, z + off]);
      } else {
        b.box(mat, thick, dropH, step * 1.02, [x + off, topY - dropH / 2 + 0.012, z + u]);
      }
    }
  }
  // folded top
  for (let i = 0; i < n; i++) {
    const u = -width / 2 + step * (i + 0.5);
    const wave = Math.sin(i * 1.6) * 0.005;
    if (axis === 'x') b.box(mat, step * 1.03, 0.018, 0.06, [x + u, topY + 0.012 + wave, z]);
    else b.box(mat, 0.06, 0.018, step * 1.03, [x, topY + 0.012 + wave, z + u]);
  }
}

function buildDrapes(ctx) {
  const b = new Batch(ctx, 'drapes');
  const shirt = variant(ctx, 'cotton', { color: 0xc2b8a2 });
  const throwFab = variant(ctx, 'fabricWool', { color: 0xa08668 });
  const hoodie = variant(ctx, 'cotton', { color: 0x6a7076 });
  // shirt over chair_1 back
  clothOver(b, shirt, { x: 1.72, z: -1.75, topY: 0.935, axis: 'x', width: 0.3, drop: 0.26, sideOffset: 0.04 });
  // throw over the sofa's right arm
  clothOver(b, throwFab, { x: -1.55, z: -2.75, topY: 0.7, axis: 'z', width: 0.44, drop: 0.3, sideOffset: 0.1 });
  // hoodie over desk chair back
  clothOver(b, hoodie, { x: 4.15, z: 2.4, topY: 0.96, axis: 'x', width: 0.32, drop: 0.3, sideOffset: 0.075 });
  b.colliderBox(0.4, 0.08, 0.06, [1.72, 0.995, -1.75]);
  b.colliderBox(0.24, 0.5, 0.06, [-1.55, 0.74, -2.75]);
  b.colliderBox(0.4, 0.08, 0.06, [4.15, 1.0, 2.4]);
  return b.finish({ name: 'drapes', pos: [0, 0, 0], isStatic: true, material: 'fabric', room: '', tags: ['clutter', 'clothes'], recenter: false, shadows: true });
}

// --------------------------------------------------------------- placements

export function buildClutter(ctx) {
  const objects = [];
  const add = (o) => objects.push(o);
  const CT = 0.4695; // coffee table collider top (table sits on the rug)
  const RUG_Y = 0.014;

  // ---- living: coffee table
  add(addMug(ctx, 'mug_white', -2.9, CT + 0.002, -1.7, { yaw: 0.3, color: 0xe9e5db, coffee: true }));
  add(addMug(ctx, 'mug_blue', -2.75, CT + 0.002, -1.66, { yaw: -0.6, color: 0x7f98a8 }));
  add(addBookStack(ctx, 'book_stack_1', -2.2, CT + 0.002, -1.7, { yaw: 0.14, count: 3, color: 0x3f5470, mass: 1.4 }));
  add(addBook(ctx, 'book_2', -2.94, CT + 0.002, -1.4, { yaw: 0.5, w: 0.21, d: 0.15, h: 0.028, color: 0x8b3f36, mass: 0.42 }));
  add(addLaptop(ctx, 'laptop', -2.42, CT + 0.002, -1.42, { yaw: -0.12 }));
  add(addRemote(ctx, 'remote', -2.7, CT + 0.002, -1.38, { yaw: 0.4 }));
  add(addKeys(ctx, 'keys', -2.86, CT + 0.002, -1.55, { yaw: 0.2 }));
  add(addPhone(ctx, 'phone', -2.6, CT + 0.002, -1.74, { yaw: 0.7 }));
  add(addPen(ctx, 'pen', -2.35, CT + 0.002, -1.79, { yaw: 0.3 }));
  add(addCandle(ctx, 'candle', -2.98, CT + 0.002, -1.6));
  add(addTippedMug(ctx, 'mug_tipped', -2.44, CT + 0.04, -1.62, { yaw: 0.5, color: 0x9aa88f }));
  add(addTissueBox(ctx, 'tissue_box', -2.1, CT + 0.002, -1.36, { yaw: 0.1 }));
  add(addNotebook(ctx, 'notebook_shelf', -3.4, 0.014, -1.95, { yaw: 0.4, room: 'living' }));

  // ---- living: sofa
  add(addCushion(ctx, 'cushion_1', -3.1, 0.547, -2.6, { yaw: 0.18, color: 0xb8a487 }));
  add(addCushion(ctx, 'cushion_2', -1.95, 0.547, -2.6, { yaw: -0.25, color: 0x8b8f86 }));
  add(addCushion(ctx, 'cushion_3', -4.42, 0.542, -1.72, { yaw: 0.3, color: 0xb08a4c }));
  add(addThrow(ctx, 'sofa_throw', -2.52, 0.547, -2.62, { yaw: -0.15, color: 0xa88d6f }));

  // ---- living: bookshelf (yaw PI/2; shelf boards at local y 0.094/0.454/0.814/1.174/1.534)
  const shelfYs = [0.052, 0.456, 0.816, 1.176, 1.536];
  const shelfZ = [-0.98, -0.93, -0.88, -0.83, -0.78, -0.73];
  const bookTitles = ['shelf_book_1', 'shelf_book_2', 'shelf_book_3', 'shelf_book_4', 'shelf_book_5', 'shelf_book_6'];
  for (let i = 0; i < 6; i++) {
    add(addBook(ctx, bookTitles[i], -5.375, shelfYs[0] + 0.002, shelfZ[i], {
      yaw: Math.PI / 2,
      w: 0.035 + (i % 2) * 0.012,
      d: 0.19,
      h: 0.26 - (i % 3) * 0.02,
      color: BOOK_COLORS[i % BOOK_COLORS.length],
      mass: 0.55,
      pages: false,
      castShadow: false,
    }));
  }
  for (let i = 0; i < 5; i++) {
    add(addBook(ctx, `shelf_book_${7 + i}`, -5.375, shelfYs[1] + 0.002, -1.0 + i * 0.052, {
      yaw: Math.PI / 2,
      w: 0.035 + (i % 2) * 0.01,
      d: 0.19,
      h: 0.24 - (i % 3) * 0.02,
      color: BOOK_COLORS[(i + 1) % BOOK_COLORS.length],
      mass: 0.5,
      pages: false,
      castShadow: false,
    }));
  }
  for (let i = 0; i < 4; i++) {
    add(addBook(ctx, `shelf_book_${12 + i}`, -5.375, shelfYs[3] + 0.002, -0.95 + i * 0.05, {
      yaw: Math.PI / 2,
      w: 0.04,
      d: 0.2,
      h: 0.25,
      color: BOOK_COLORS[(i + 6) % BOOK_COLORS.length],
      mass: 0.6,
      pages: false,
      castShadow: false,
    }));
  }
  for (let i = 0; i < 3; i++) {
    add(addBook(ctx, `shelf_book_${16 + i}`, -5.375, shelfYs[2] + 0.002, -0.9 + i * 0.06, {
      yaw: Math.PI / 2,
      w: 0.045,
      d: 0.2,
      h: 0.24,
      color: BOOK_COLORS[(i + 3) % BOOK_COLORS.length],
      mass: 0.6,
      pages: false,
      castShadow: false,
    }));
  }
  for (let i = 0; i < 4; i++) {
    add(addBook(ctx, `shelf_book_${19 + i}`, -5.375, shelfYs[4] + 0.002, -0.95 + i * 0.055, {
      yaw: Math.PI / 2,
      w: 0.04,
      d: 0.2,
      h: 0.25,
      color: BOOK_COLORS[(i + 4) % BOOK_COLORS.length],
      mass: 0.55,
      pages: false,
      castShadow: false,
    }));
  }
  add(addBookStack(ctx, 'book_stack_2', -5.375, shelfYs[2] + 0.002, -0.35, { yaw: Math.PI / 2, count: 2, w: 0.2, d: 0.14, color: 0x4a6b4a, mass: 0.9 }));
  add(addVase(ctx, 'vase', -5.375, 1.862, -0.85, { room: 'living' }));
  add(addSmallPlant(ctx, 'plant_small', -5.375, 1.862, -0.35, { room: 'living' }));

  // ---- living: floor mess
  add(addPaper(ctx, 'paper_floor_1', -3.95, 0.002, -2.2, { yaw: 0.4 }));
  add(addPaper(ctx, 'paper_floor_2', -3.7, 0.002, -1.9, { yaw: -0.2 }));
  add(addPaper(ctx, 'paper_floor_3', -1.9, 0.002, -0.55, { yaw: 1.1 }));
  add(addBook(ctx, 'magazine', -4.35, 0.002, -0.75, { yaw: 0.9, w: 0.29, d: 0.21, h: 0.012, color: 0x77706a, mass: 0.3 }));
  add(addSock(ctx, 'sock_1', -4.25, 0.002, -2.95, { yaw: 0.5 }));
  add(addSock(ctx, 'sock_2', -2.35, RUG_Y, -2.15, { yaw: -0.8 }));
  add(addCable(ctx, 'cable_tv', -2.15, 0.002, -0.15, { yaw: 0.4 }));
  add(addNeedle(ctx, 'needle', -3.25, RUG_Y + 0.001, -2.05, { yaw: 0.7 }));

  // ---- kitchen counter
  add(addKettle(ctx, 'kettle', 2.34, 0.9 + 0.002, -3.3, { yaw: 0.5 }));
  add(addJar(ctx, 'jar_1', 1.97, 0.9 + 0.002, -3.6, { yaw: 0.2, h: 0.17 }));
  add(addJar(ctx, 'jar_2', 2.09, 0.9 + 0.002, -3.62, { yaw: -0.1, h: 0.13 }));
  add(addJar(ctx, 'jar_3', 2.2, 0.9 + 0.002, -3.58, { yaw: 0.4, h: 0.19 }));
  add(addDishTowel(ctx, 'dish_towel', 2.42, 0.9 + 0.002, -3.6, { yaw: 0.2 }));
  add(addSmallPlant(ctx, 'herb_pot', 3.86, 1.05, -3.66, { room: 'kitchen' }));
  add(addDishRack(ctx, 'dish_rack', 3.3, 0.9 + 0.002, -3.25, { yaw: 0.1 }));
  add(addCuttingBoard(ctx, 'cutting_board', 3.55, 0.9 + 0.002, -3.56, { yaw: 0.15 }));
  add(addBottle(ctx, 'wine_bottle', 3.62, 0.9 + 0.002, -3.3, { yaw: 0.3, h: 0.3 }));
  add(addMug(ctx, 'mug_kitchen', 3.3, 0.9 + 0.002, -3.62, { yaw: -0.4, color: 0x9aa88f, room: 'kitchen' }));
  add(addBottleSmall(ctx, 'dish_soap', 1.92, 0.9 + 0.002, -3.28, { yaw: 0.2, h: 0.19, color: 0xa9b8a2, room: 'kitchen', tags: ['clutter', 'bottle'] }));

  // ---- kitchen sink
  add(addPlate(ctx, 'plate_1', 2.65, 0.702, -3.45, { room: 'kitchen' }));
  add(addPlate(ctx, 'plate_2', 2.65, 0.723, -3.45, { room: 'kitchen' }));
  add(addBowl(ctx, 'bowl_1', 2.95, 0.702, -3.52, { room: 'kitchen' }));
  add(addBowl(ctx, 'bowl_2', 2.95, 0.784, -3.52, { room: 'kitchen', color: 0xb0a58e }));
  add(addMug(ctx, 'mug_sink', 2.62, 0.702, -3.28, { room: 'kitchen', color: 0xe9e5db, yaw: 1.1 }));
  add(addSponge(ctx, 'sponge_sink', 2.99, 0.702, -3.27, { room: 'kitchen' }));

  // ---- dining table
  add(addBowlFruit(ctx, 'fruit_bowl', 2.5, 0.75 + 0.002, -0.85, { yaw: 0.2 }));
  add(addFruit(ctx, 'apple_1', 2.72, 0.75 + 0.002, -0.92, { color: 0xa8442f }));
  add(addFruit(ctx, 'apple_2', 2.28, 0.75 + 0.002, -0.62, { color: 0x8fa845 }));
  add(addFruit(ctx, 'apple_3', 2.72, 0.75 + 0.002, -0.65, { color: 0xb2762e }));
  add(addPlate(ctx, 'plate_dining', 1.72, 0.75 + 0.002, -0.66, { room: 'kitchen' }));
  add(addMug(ctx, 'mug_dining', 2.6, 0.75 + 0.002, -0.5, { room: 'kitchen', color: 0xd7c3a8, coffee: true }));
  add(addPaper(ctx, 'paper_dining_1', 1.95, 0.75 + 0.002, -1.02, { yaw: 0.5, room: 'kitchen' }));
  add(addPaper(ctx, 'paper_dining_2', 1.92, 0.758, -0.9, { yaw: -0.3, room: 'kitchen' }));
  add(addBook(ctx, 'book_dining', 2.18, 0.75 + 0.002, -1.06, { yaw: 0.35, w: 0.2, d: 0.14, h: 0.026, color: 0x4a6b4a, mass: 0.4, room: 'kitchen' }));

  // ---- kitchen mess
  add(addShirt(ctx, 'shirt_chair_2', 2.68, 0.505, -1.45, { yaw: 0.5, color: 0x8c9aa8 }));
  add(addHoodie(ctx, 'hoodie_chair_4', 2.68, 0.507, -0.075, { yaw: 0.02, color: 0x6a7076 }));
  add(addGroceryBag(ctx, 'grocery_bag', 2.05, 0.002, -2.88, { yaw: 0.4 }));
  add(addOnion(ctx, 'onion', 2.55, 0.002, -2.78, { yaw: 0 }));
  add(addPaper(ctx, 'paper_kitchen_1', 1.35, 0.002, -2.55, { yaw: 1.2, room: 'kitchen' }));
  add(addPaper(ctx, 'paper_kitchen_2', 1.7, 0.002, -2.5, { yaw: -0.3, room: 'kitchen' }));
  add(addPaperBall(ctx, 'paper_ball', 1.78, 0.002, -3.18, { room: 'kitchen' }));
  add(addCable(ctx, 'cable_kitchen', 3.9, 0.002, -2.6, { yaw: 0.8, room: 'kitchen' }));
  add(addPan(ctx, 'pan_stove', 3.98, 0.927, -3.5, { yaw: 0.35, room: 'kitchen' }));
  add(addCerealBox(ctx, 'cereal_box', 5.18, 1.862, -3.2, { yaw: 0.25, room: 'kitchen' }));
  add(addMail(ctx, 'mail_counter', 2.08, 0.902, -3.2, { yaw: 0.4, room: 'kitchen' }));

  // ---- bedroom bed
  add(addCushion(ctx, 'pillow_1', -4.52, 0.612, 2.94, { yaw: 0.1, color: 0xe3dccb, mass: 0.7, room: 'bedroom' }));
  add(addCushion(ctx, 'pillow_2', -3.78, 0.612, 2.96, { yaw: -0.12, color: 0xd8d0bd, mass: 0.7, room: 'bedroom' }));
  add(addThrow(ctx, 'blanket_bed', -4.1, 0.612, 2.0, { yaw: 0.04, color: 0xa9ae9e, w: 1.4, d: 0.8, mass: 1.4, room: 'bedroom' }));
  add(addBook(ctx, 'book_bed', -4.5, 0.674, 1.95, { yaw: 0.6, w: 0.2, d: 0.14, h: 0.03, color: 0x8b3f36, mass: 0.45, room: 'bedroom' }));
  add(addPhone(ctx, 'phone_bed', -4.2, 0.674, 2.0, { yaw: -0.4, room: 'bedroom' }));

  // ---- bedroom nightstand
  add(addGlasses(ctx, 'glasses', -3.1, 0.572, 3.32, { yaw: 0.5 }));
  add(addMug(ctx, 'mug_bedside', -2.88, 0.572, 3.55, { yaw: 0.2, color: 0x8aa1b1, room: 'bedroom' }));
  add(addHairbrush(ctx, 'hairbrush', -3.15, 0.572, 3.52, { yaw: 0.9 }));

  // ---- bedroom floor
  add(addShirt(ctx, 'shirt_floor', -4.85, 0.002, 1.25, { yaw: 0.7, color: 0x7c8b9c, room: 'bedroom' }));
  add(addHoodie(ctx, 'jeans_floor', -3.95, 0.014, 1.2, { yaw: -0.5, color: 0x3e5878, room: 'bedroom' }));
  add(addSock(ctx, 'sock_floor', -4.35, 0.002, 1.3, { yaw: 0.3, room: 'bedroom' }));
  add(addSlipper(ctx, 'slipper_1', -3.3, 0.014, 1.2, { yaw: 0.1 }));
  add(addSlipper(ctx, 'slipper_2', -3.05, 0.014, 1.3, { yaw: -0.2 }));
  add(addCable(ctx, 'charger_cable', -3.0, 0.002, 2.2, { yaw: 0.9, room: 'bedroom' }));
  add(addHoodie(ctx, 'basket_clothes', -2.2, 0.442, 1.85, { yaw: 0.4, color: 0xd8d0bf, room: 'bedroom' }));

  // ---- bathroom
  add(addTowel(ctx, 'towel_floor', 1.95, 0.002, 1.55, { yaw: 0.3, color: 0x9aa89c }));
  add(addBottleSmall(ctx, 'shampoo', 2.33, 0.842, 1.55, { yaw: 0.1, h: 0.19, color: 0xd8cfc0 }));
  add(addBottleSmall(ctx, 'conditioner', 2.33, 0.842, 1.7, { yaw: -0.2, h: 0.17, color: 0xc8b9a4 }));
  add(addBottleSmall(ctx, 'lotion', 2.62, 0.842, 1.5, { yaw: 0.3, h: 0.12, color: 0xe0d6c2 }));
  add(addSoap(ctx, 'soap', 2.33, 0.842, 1.95, { yaw: 0.4 }));
  add(addToothbrush(ctx, 'toothbrush', 2.36, 0.842, 2.14, { yaw: 0.7 }));
  add(addToothbrush(ctx, 'toothbrush_2', 2.62, 0.842, 2.12, { yaw: 0.2 }));
  add(addBottleSmall(ctx, 'toothpaste', 2.55, 0.842, 2.18, { yaw: 1.2, h: 0.11, r: 0.028, color: 0xe4e0d6, cap: 0x4a6b8a, mass: 0.12 }));
  add(addToiletRoll(ctx, 'toilet_roll', 0.85, 1.002, 2.45, { yaw: 0.1 }));
  add(addScale(ctx, 'bathroom_scale', 1.55, 0.002, 1.15, { yaw: 0.2 }));
  add(addSponge(ctx, 'sponge_bath', 1.35, 0.662, 3.62, { room: 'bathroom' }));

  // ---- study desk
  add(addKeyboard(ctx, 'keyboard', 4.1, 0.752, 3.08, { yaw: 0.02 }));
  add(addMouse(ctx, 'mouse', 4.4, 0.752, 3.08, { yaw: 0.2 }));
  add(addNotebook(ctx, 'notebook', 3.65, 0.752, 3.12, { yaw: 0.15 }));
  add(addPaper(ctx, 'paper_desk_1', 3.66, 0.752, 3.44, { yaw: -0.2, room: 'study' }));
  add(addPaper(ctx, 'paper_desk_2', 3.68, 0.760, 3.44, { yaw: 0.5, room: 'study' }));
  add(addPenHolder(ctx, 'pen_holder', 4.55, 0.752, 3.35));
  add(addMug(ctx, 'mug_desk', 4.62, 0.752, 3.12, { yaw: -0.3, color: 0x3f4a52, room: 'study' }));
  add(addHeadphones(ctx, 'headphones', 4.75, 0.752, 3.55, { yaw: 0.4 }));
  add(addStickyNotes(ctx, 'sticky_notes', 4.42, 0.752, 3.5, { yaw: 0.2 }));
  add(addCable(ctx, 'cable_floor_study', 3.6, 0.002, 2.35, { yaw: 0.5, room: 'study' }));
  add(addWaterBottle(ctx, 'bottle_desk', 4.45, 0.752, 3.4, { yaw: 0.3, room: 'study' }));

  // ---- study shelves (local shelf tops 0.04/0.4325/0.7925/1.1525/1.5125, yaw PI/2)
  const studyShelfY = [0.042, 0.4345, 0.7945, 1.1545];
  for (let i = 0; i < 4; i++) {
    add(addBook(ctx, `study_book_${i + 1}`, 3.01, studyShelfY[i] + 0.002, 1.25 + i * 0.18, {
      yaw: Math.PI / 2,
      w: 0.04,
      d: 0.2,
      h: 0.26,
      color: BOOK_COLORS[(i + 5) % BOOK_COLORS.length],
      mass: 0.6,
      room: 'study',
      pages: false,
      castShadow: false,
    }));
  }
    for (let i = 0; i < 4; i++) {
    add(addBook(ctx, `study_book_${5 + i}`, 3.01, studyShelfY[i] + 0.002, 1.55 + (i % 2) * 0.13, {
      yaw: Math.PI / 2,
      w: 0.045,
      d: 0.19,
      h: 0.23,
      color: BOOK_COLORS[(i + 2) % BOOK_COLORS.length],
      mass: 0.5,
      room: 'study',
      pages: false,
      castShadow: false,
    }));
  }
  add(addSmallPlant(ctx, 'study_plant', 3.01, 1.5145, 1.75, { room: 'study' }));
  add(addBowl(ctx, 'study_bowl', 3.01, 1.5145, 1.25, { room: 'study', color: 0xb0a58e }));

  // ---- hallway entry mess
  add(addBackpack(ctx, 'backpack', -0.42, 0.002, 3.02, { yaw: 0.5 }));
  add(addShoe(ctx, 'shoe_1', -1.02, 0.002, 2.9, { yaw: 0.15, color: 0x4a3f37 }));
  add(addShoe(ctx, 'shoe_2', -0.86, 0.002, 3.0, { yaw: -0.35, color: 0x4a3f37 }));
  add(addShoe(ctx, 'shoe_3', -0.94, 0.002, 2.62, { yaw: 0.7, color: 0x6a5a48 }));
  add(addShoe(ctx, 'shoe_4', -0.65, 0.002, 2.78, { yaw: 0.3, color: 0x6a5a48 }));
  add(addMail(ctx, 'mail_1', -0.3, 0.004, 2.62, { yaw: 0.6 }));
  add(addMail(ctx, 'mail_2', -0.15, 0.004, 2.75, { yaw: -0.3 }));
  add(addKeys(ctx, 'keys_floor', -0.62, 0.002, 3.18, { yaw: 1.2, room: 'hallway' }));
  add(addUmbrella(ctx, 'umbrella', 0.35, 0, 3.55, { yaw: 0.6 }));

  add(buildDrapes(ctx));

  return objects;
}
