// Six-room apartment shell: floors, ceiling, walls with doorways, windows with
// frames/glass/curtains, doors left open, baseboards, trim, ceiling fixtures.
import * as THREE from 'three';
import {
  APT,
  CEIL_H as H,
  WALL_T as T,
  OUT,
  IN,
  PART,
  ROOMS,
  Batch,
  C,
  gBox,
  gCyl,
  gLathe,
  gPlane,
  matOf,
  scaleUV,
  swapUV,
  artMaterials,
  variant,
  mulberry32,
} from './helpers.js';
import { CONFIG } from '../core/config.js';

const FLOOR_TOP = 0;

// ---------------------------------------------------------------- openings
// axis: 'x' = wall runs along X (at is a Z), 'z' = wall runs along Z (at is an X).
// inward: +1/-1 along the wall normal, pointing into the apartment.
export const WINDOWS = [
  { id: 'w_living_s', axis: 'x', at: OUT.minZ, from: -4.7, to: -2.2, y0: 0.85, y1: 2.25, room: 'living', inward: 1, mullions: 2, curtains: 'linen', bottom: 0.04 },
  { id: 'w_living_w', axis: 'z', at: OUT.minX, from: -2.9, to: -1.4, y0: 0.9, y1: 2.2, room: 'living', inward: 1, mullions: 1, curtains: 'linen', bottom: 0.04 },
  { id: 'w_kitchen_s', axis: 'x', at: OUT.minZ, from: 2.55, to: 4.05, y0: 1.05, y1: 2.2, room: 'kitchen', inward: 1, mullions: 2, curtains: null, bottom: 1.0 },
  { id: 'w_kitchen_e', axis: 'z', at: OUT.maxX, from: -2.5, to: -1.1, y0: 0.95, y1: 2.2, room: 'kitchen', inward: -1, mullions: 1, curtains: 'linen', bottom: 0.04 },
  { id: 'w_bedroom_n', axis: 'x', at: OUT.maxZ, from: -3.1, to: -1.75, y0: 0.95, y1: 2.25, room: 'bedroom', inward: -1, mullions: 1, curtains: 'wool', bottom: 0.04 },
  { id: 'w_bedroom_w', axis: 'z', at: OUT.minX, from: 2.0, to: 3.3, y0: 0.95, y1: 2.25, room: 'bedroom', inward: 1, mullions: 1, curtains: 'wool', bottom: 0.04 },
  { id: 'w_bath_n', axis: 'x', at: OUT.maxZ, from: 1.1, to: 2.2, y0: 1.5, y1: 2.3, room: 'bathroom', inward: -1, mullions: 1, curtains: null, bottom: 1.2, frosted: true },
  { id: 'w_study_n', axis: 'x', at: OUT.maxZ, from: 3.45, to: 4.85, y0: 0.95, y1: 2.2, room: 'study', inward: -1, mullions: 2, curtains: 'linen', bottom: 0.04 },
  { id: 'w_study_e', axis: 'z', at: OUT.maxX, from: 1.6, to: 2.9, y0: 0.95, y1: 2.2, room: 'study', inward: -1, mullions: 1, curtains: null, bottom: 1.0 },
];

// door leaf specs: hinge point, direction the closed leaf runs, swing (rad, +Y)
export const DOORS = [
  { id: 'd_bedroom', hinge: [PART.bedroomHallX, 2.7], dir: [0, 1], swing: -1.745, width: 0.88, room: 'bedroom', wall: 'x' },
  { id: 'd_bathroom', hinge: [PART.hallBathX, 1.0], dir: [0, 1], swing: 1.745, width: 0.88, room: 'bathroom', wall: 'x' },
  { id: 'd_study', hinge: [4.5, PART.frontBackZ], dir: [-1, 0], swing: 1.745, width: 0.88, room: 'study', wall: 'z' },
  { id: 'd_front', hinge: [-0.12, OUT.maxZ], dir: [-1, 0], swing: -1.745, width: 0.88, room: 'hallway', wall: 'z', front: true },
];

const DOOR_H = 2.05;
const OPENING_H = 2.1;

function openingsFor(wall) {
  const out = [];
  for (const w of WINDOWS) {
    if (w.axis === wall.axis && Math.abs(w.at - wall.at) < 1e-6) {
      out.push({ from: w.from, to: w.to, y0: w.y0, y1: w.y1 });
    }
  }
  for (const d of DOORS) {
    if (wall.axis === 'x' && d.wall === 'z' && Math.abs(d.hinge[1] - wall.at) < 1e-6) {
      const a = d.hinge[0];
      const b = a + d.dir[0] * d.width;
      out.push({ from: Math.min(a, b), to: Math.max(a, b), y0: 0, y1: DOOR_H });
    }
    if (wall.axis === 'z' && d.wall === 'x' && Math.abs(d.hinge[0] - wall.at) < 1e-6) {
      const a = d.hinge[1];
      const b = a + d.dir[1] * d.width;
      out.push({ from: Math.min(a, b), to: Math.max(a, b), y0: 0, y1: DOOR_H });
    }
  }
  // hallway cased opening (no leaf)
  if (wall.axis === 'x' && Math.abs(wall.at - PART.frontBackZ) < 1e-6) {
    out.push({ from: -0.9, to: 0.15, y0: 0, y1: OPENING_H });
  }
  return out;
}

// --------------------------------------------------------------- primitives

function wallXform(axis, at, u, y, depthOffset = 0) {
  return axis === 'x' ? [u, y, at + depthOffset] : [at + depthOffset, y, u];
}
function wallSize(axis, du, dy, dd) {
  return axis === 'x' ? [du, dd, dy] : [dd, du, dy];
}
function addWallBox(batch, material, axis, at, u, y, du, dy, dd, depthOffset = 0, rot = [0, 0, 0]) {
  const [w, d, hgt] = wallSize(axis, du, dy, dd);
  batch.box(material, w, d, hgt, wallXform(axis, at, u, y, depthOffset), rot);
}
function wallCylRot(axis) {
  return axis === 'x' ? [0, 0, Math.PI / 2] : [Math.PI / 2, 0, 0];
}
function quatY(yaw) {
  return [0, Math.sin(yaw / 2), 0, Math.cos(yaw / 2)];
}

function solidSegments(from, to, openings) {
  const ops = [...openings].sort((a, b) => a.from - b.from);
  const out = [];
  let cursor = from;
  for (const o of ops) {
    if (o.from > cursor + 1e-6) out.push({ u0: cursor, u1: o.from, y0: 0, y1: H });
    if (o.y1 < H - 1e-6) out.push({ u0: o.from, u1: o.to, y0: o.y1, y1: H });
    if (o.y0 > 1e-6) out.push({ u0: o.from, u1: o.to, y0: 0, y1: o.y0 });
    cursor = Math.max(cursor, o.to);
  }
  if (cursor < to - 1e-6) out.push({ u0: cursor, u1: to, y0: 0, y1: H });
  return out;
}

// ------------------------------------------------------------------- floors

function buildFloors(ctx) {
  const wood = new Batch(ctx, 'floor_wood');
  const tile = new Batch(ctx, 'floor_tile');
  const woodMat = variant(ctx, 'woodFloor', { repeat: [1, 1] });
  const tileMat = variant(ctx, 'tileFloor', { color: 0xb8b3a5, repeat: [1, 1] });
  const woodRegions = [
    [IN.minX, PART.livingKitchenX - T / 2, IN.minZ, PART.frontBackZ - T / 2],
    [IN.minX, PART.bedroomHallX - T / 2, PART.frontBackZ + T / 2, IN.maxZ],
    [PART.bedroomHallX + T / 2, PART.hallBathX - T / 2, PART.frontBackZ + T / 2, IN.maxZ],
    [PART.bathStudyX + T / 2, IN.maxX, PART.frontBackZ + T / 2, IN.maxZ],
  ];
  for (const [x0, x1, z0, z1] of woodRegions) {
    const w = x1 - x0;
    const d = z1 - z0;
    const geo = gBox(w, d, 0.12, [(x0 + x1) / 2, FLOOR_TOP - 0.06, (z0 + z1) / 2]);
    scaleUV(geo, w * 0.6, d * 0.6);
    wood.add(woodMat, geo);
  }
  // one big slab collider under everything
  wood.colliderBox(OUT.maxX - OUT.minX + 0.2, OUT.maxZ - OUT.minZ + 0.2, 0.24, [0, FLOOR_TOP - 0.12, 0]);
  const woodObj = wood.finish({ name: 'floor_wood', isStatic: true, material: 'woodFloor', tags: ['architecture', 'floor'], shadows: true });

  const tileRegions = [
    [PART.livingKitchenX + T / 2, IN.maxX, IN.minZ, PART.frontBackZ - T / 2],
    [PART.hallBathX + T / 2, PART.bathStudyX - T / 2, PART.frontBackZ + T / 2, IN.maxZ],
  ];
  for (const [x0, x1, z0, z1] of tileRegions) {
    const w = x1 - x0;
    const d = z1 - z0;
    const geo = gBox(w, d, 0.13, [(x0 + x1) / 2, FLOOR_TOP - 0.065, (z0 + z1) / 2]);
    scaleUV(geo, w * 0.55, d * 0.55);
    tile.add(tileMat, geo);
  }
  for (const [x0, x1, z0, z1] of tileRegions) {
    tile.colliderBox(x1 - x0, z1 - z0, 0.13, [(x0 + x1) / 2, FLOOR_TOP - 0.065, (z0 + z1) / 2]);
  }
  const tileObj = tile.finish({ name: 'floor_tile', isStatic: true, material: 'tile', tags: ['architecture', 'floor'], shadows: true });

  // threshold strips at room transitions (nice detail, hides seams)
  const th = new Batch(ctx, 'thresholds');
  const stripMat = variant(ctx, 'metalBrushed', { color: 0x9a958a });
  const strips = [
    [-0.9, PART.frontBackZ, 0.15, 0.16],
    [PART.bedroomHallX, 2.7, 3.6, 0.16],
    [PART.hallBathX, 1.0, 1.9, 0.16],
    [3.5, PART.frontBackZ, 4.5, 0.16],
  ];
  for (const [a, b, c, w] of strips) {
    // entries come as (x0, zLine, x1) for x-running or (xLine, z0, z1) for z-running
    if (b === PART.frontBackZ) {
      th.box(stripMat, c - a, w, 0.012, [(a + c) / 2, 0.006, b]);
      th.colliderBox(c - a, w, 0.012, [(a + c) / 2, 0.006, b]);
    } else {
      th.box(stripMat, w, c - a, 0.012, [a, 0.006, (b + c) / 2]);
      th.colliderBox(w, c - a, 0.012, [a, 0.006, (b + c) / 2]);
    }
  }
  const thObj = th.finish({ name: 'thresholds', isStatic: true, material: 'metal', tags: ['architecture'], shadows: false });
  return [woodObj, tileObj, thObj];
}

function buildCeiling(ctx) {
  const b = new Batch(ctx, 'ceiling');
  const mat = variant(ctx, 'wallPaint', { color: 0xf2efe8 });
  const geo = gBox(OUT.maxX - OUT.minX + 0.2, OUT.maxZ - OUT.minZ + 0.2, 0.12, [0, H + 0.06, 0]);
  b.add(mat, geo);
  b.colliderBox(OUT.maxX - OUT.minX + 0.2, OUT.maxZ - OUT.minZ + 0.2, 0.12, [0, H + 0.06, 0]);
  return b.finish({ name: 'ceiling', isStatic: true, material: 'wood', tags: ['architecture', 'ceiling'], shadows: false });
}

// -------------------------------------------------------------------- walls

function buildWalls(ctx) {
  const b = new Batch(ctx, 'walls');
  const paint = (room) => variant(ctx, 'wallPaint', { color: C.wallWarm });
  const paintBath = () => variant(ctx, 'wallPaint', { color: 0xcac7bd });
  const trim = variant(ctx, 'woodLight', { color: 0xd6c3a5 });

  const runs = [
    // outer shell
    { axis: 'x', at: OUT.minZ, from: OUT.minX - T / 2, to: OUT.maxX + T / 2, sides: [1], room: 'living' },
    { axis: 'x', at: OUT.maxZ, from: OUT.minX - T / 2, to: PART.bedroomHallX, sides: [-1], room: 'bedroom' },
    { axis: 'x', at: OUT.maxZ, from: PART.bedroomHallX, to: PART.hallBathX, sides: [-1], room: 'hallway' },
    { axis: 'x', at: OUT.maxZ, from: PART.hallBathX, to: PART.bathStudyX, sides: [-1], room: 'bathroom', mat: paintBath() },
    { axis: 'x', at: OUT.maxZ, from: PART.bathStudyX, to: OUT.maxX + T / 2, sides: [-1], room: 'study' },
    { axis: 'z', at: OUT.minX, from: IN.minZ, to: IN.maxZ, sides: [1], room: 'living' },
    { axis: 'z', at: OUT.maxX, from: IN.minZ, to: IN.maxZ, sides: [-1], room: 'kitchen' },
    // interior partitions
    { axis: 'z', at: PART.livingKitchenX, from: IN.minZ, to: -1.5, sides: [1, -1], room: 'living', mat: paint() },
    { axis: 'x', at: PART.frontBackZ, from: OUT.minX + T / 2, to: OUT.maxX - T / 2, sides: [1, -1], room: 'hallway', mat: paint() },
    { axis: 'z', at: PART.bedroomHallX, from: PART.frontBackZ + T / 2, to: IN.maxZ, sides: [1, -1], room: 'bedroom', mat: paint() },
    { axis: 'z', at: PART.hallBathX, from: PART.frontBackZ + T / 2, to: IN.maxZ, sides: [1, -1], room: 'bathroom', mat: paintBath() },
    { axis: 'z', at: PART.bathStudyX, from: PART.frontBackZ + T / 2, to: IN.maxZ, sides: [1, -1], room: 'study', mat: paint() },
  ];

  for (const run of runs) {
    const openings = openingsFor(run);
    const segs = solidSegments(run.from, run.to, openings);
    for (const s of segs) {
      const len = s.u1 - s.u0;
      const hgt = s.y1 - s.y0;
      if (len < 0.002 || hgt < 0.002) continue;
      const cu = (s.u0 + s.u1) / 2;
      const cy = (s.y0 + s.y1) / 2;
      const geo = axisGeo(run.axis, run.at, cu, cy, len, hgt, T);
      scaleUV(geo, len / 2.4, hgt / 2.4);
      b.add(run.mat || paint(), geo);
      b.colliderBox(...axisSize(run.axis, len, hgt, T), wallXform(run.axis, run.at, cu, cy, 0));
    }

    // baseboards, broken only at full-height (door) openings
    const doorGaps = openings.filter((o) => o.y0 < 0.01).sort((a, b) => a.from - b.from);
    const bbRuns = [];
    let cursor = run.from;
    for (const g of doorGaps) {
      if (g.from > cursor + 0.01) bbRuns.push([cursor, g.from]);
      cursor = Math.max(cursor, g.to);
    }
    if (cursor < run.to - 0.01) bbRuns.push([cursor, run.to]);
    for (const [u0, u1] of bbRuns) {
      const len = u1 - u0;
      if (len < 0.03) continue;
      for (const side of run.sides) {
        const off = side * (T / 2 + 0.011);
        addWallBox(b, trim, run.axis, run.at, (u0 + u1) / 2, 0.055, len, 0.11, 0.022, off);
      }
    }

    // door casings
    for (const o of doorGaps) {
      addCasing(b, trim, run.axis, run.at, o.from, o.to, o.y1, run.sides);
    }
  }

  // accent panels: bedroom headboard wall + study west wall
  const accentSage = variant(ctx, 'wallAccent', { color: 0x7c8a7c });
  const bedWallX0 = IN.minX + 0.01;
  const bedWallX1 = PART.bedroomHallX - T / 2 - 0.01;
  b.box(accentSage, bedWallX1 - bedWallX0, 0.014, H, [(bedWallX0 + bedWallX1) / 2, H / 2, PART.frontBackZ + T / 2 + 0.007]);
  // (bedroom south wall, from x=-5.54 to x=-1.46)
  const accentClay = variant(ctx, 'wallAccent', { color: 0xb08872 });
  b.box(accentClay, 0.014, IN.maxZ - (PART.frontBackZ + T / 2) - 0.02, H, [PART.bathStudyX + T / 2 + 0.007, H / 2, (PART.frontBackZ + T / 2 + IN.maxZ) / 2]);

  // bathroom tile wainscot (3 walls, 1.25 m)
  const tile = variant(ctx, 'tileWall', { color: 0x8b9793, repeat: [2, 1] });
  const bathX0 = PART.hallBathX + T / 2;
  const bathX1 = PART.bathStudyX - T / 2;
  const bathZ0 = PART.frontBackZ + T / 2;
  b.box(tile, bathX1 - bathX0, 0.018, 1.25, [(bathX0 + bathX1) / 2, 0.625, IN.maxZ - 0.009]);
  b.box(tile, bathX1 - bathX0, 0.018, 1.25, [(bathX0 + bathX1) / 2, 0.625, bathZ0 + 0.009]);
  b.box(tile, 0.018, IN.maxZ - bathZ0 - 0.02, 1.25, [bathX1 - 0.009, 0.625, (bathZ0 + IN.maxZ) / 2]);
  b.box(tile, 0.018, 0.24, 1.25, [bathX0 + 0.009, 0.625, bathZ0 + 0.12]);
  b.box(tile, 0.018, IN.maxZ - 1.9 - 0.02, 1.25, [bathX0 + 0.009, 0.625, (1.9 + IN.maxZ) / 2]);

  // kitchen backsplash around the window
  const bs = variant(ctx, 'tileWall', { repeat: [1.4, 1] });
  b.box(bs, 0.7, 0.018, 0.6, [2.2, 1.2, OUT.minZ + T / 2 + 0.009]);
  b.box(bs, 0.35, 0.018, 0.6, [4.225, 1.2, OUT.minZ + T / 2 + 0.009]);
  b.box(bs, 1.5, 0.018, 0.15, [3.3, 0.975, OUT.minZ + T / 2 + 0.009]);

  // doors left open
  for (const door of DOORS) addDoorLeaf(b, door, trim);

  return b.finish({ name: 'walls', isStatic: true, material: 'wood', tags: ['architecture', 'wall'], shadows: true });
}

function axisGeo(axis, at, u, y, du, dy, dd) {
  const [w, d, hgt] = wallSize(axis, du, dy, dd);
  return gBox(w, d, hgt, wallXform(axis, at, u, y, 0));
}
function axisSize(axis, du, dy, dd) {
  return axis === 'x' ? [du, dd, dy] : [dd, du, dy];
}

function addCasing(batch, material, axis, at, from, to, yTop, sides) {
  const jambW = 0.07;
  const jambT = 0.026;
  for (const side of sides) {
    const off = side * (T / 2 + jambT / 2);
    addWallBox(batch, material, axis, at, from - jambW / 2, yTop / 2, jambW, yTop, jambT, off);
    addWallBox(batch, material, axis, at, to + jambW / 2, yTop / 2, jambW, yTop, jambT, off);
    addWallBox(batch, material, axis, at, (from + to) / 2, yTop + 0.035, to - from + jambW * 2, 0.07, jambT, off);
  }
  // reveal liner inside the opening
  addWallBox(batch, material, axis, at, from + 0.01, yTop / 2, 0.02, yTop, T + 0.005, 0);
  addWallBox(batch, material, axis, at, to - 0.01, yTop / 2, 0.02, yTop, T + 0.005, 0);
  addWallBox(batch, material, axis, at, (from + to) / 2, yTop - 0.01, to - from, 0.02, T + 0.005, 0);
}

function addDoorLeaf(batch, door, material) {
  const { hinge, dir, swing, width } = door;
  const height = DOOR_H - 0.01;
  const c = Math.cos(swing);
  const s = Math.sin(swing);
  const lx = dir[0] * c + dir[1] * s;
  const lz = -dir[0] * s + dir[1] * c;
  const yaw = Math.atan2(-lz, lx);
  const cx = hinge[0] + (lx * width) / 2;
  const cz = hinge[1] + (lz * width) / 2;
  const cy = height / 2 + 0.004;
  const nx = Math.sin(yaw);
  const nz = Math.cos(yaw);
  const local = (x, y, z) => [cx + x * Math.cos(yaw) + z * nx, y, cz - x * Math.sin(yaw) + z * nz];
  const rot = [0, yaw, 0];
  // slab (vertical grain)
  const slab = gBox(width, 0.044, height, [cx, cy, cz], rot);
  swapUV(slab);
  batch.add(material, slab);
  // recessed panel strips (front + back)
  for (const side of [1, -1]) {
    batch.box(material, width * 0.7, 0.018, height * 0.3, local(0, height * 0.72, side * 0.028), rot);
    batch.box(material, width * 0.7, 0.018, height * 0.34, local(0, height * 0.28, side * 0.028), rot);
  }
  // handle both sides
  const chrome = variant(batch.ctx, 'metalChrome', { roughness: 0.3 });
  for (const side of [1, -1]) {
    const hp = local(width * 0.38, height * 0.5, side * 0.055);
    batch.cyl(chrome, 0.012, 0.012, 0.055, hp, [Math.PI / 2, 0, 0], 8);
    const kp = local(width * 0.38, height * 0.5, side * 0.085);
    batch.cyl(chrome, 0.018, 0.018, 0.025, kp, [Math.PI / 2, 0, 0], 8);
  }
  batch.colliderBox(width, 0.06, height, [cx, cy, cz], quatY(yaw));
}

// ------------------------------------------------------------------ windows

function buildWindows(ctx) {
  const b = new Batch(ctx, 'windows');
  const frame = variant(ctx, 'woodLight', { color: 0xe2d6c2 });
  const rodMat = variant(ctx, 'metalDark', { color: 0x2f3234 });
  const glass = variant(ctx, 'glass', { opacity: 0.07, roughness: 0.02 });
  const glassFrosted = matOf(ctx, 'glassFrosted');
  const curtainMats = {
    linen: variant(ctx, 'fabricLinen', { color: 0xd6cdb9 }),
    wool: variant(ctx, 'fabricWool', { color: 0xaab0a2 }),
  };

  for (const win of WINDOWS) {
    const { axis, at, from, to, y0, y1, inward } = win;
    const len = to - from;
    const hgt = y1 - y0;
    const cu = (from + to) / 2;
    const cy = (y0 + y1) / 2;
    const fd = T + 0.03;
    // outer frame
    addWallBox(b, frame, axis, at, from + 0.03, cy, 0.06, hgt, fd);
    addWallBox(b, frame, axis, at, to - 0.03, cy, 0.06, hgt, fd);
    addWallBox(b, frame, axis, at, cu, y1 - 0.03, len - 0.12, 0.06, fd);
    addWallBox(b, frame, axis, at, cu, y0 + 0.03, len - 0.12, 0.06, fd);
    // mullions
    const n = win.mullions || 1;
    for (let i = 1; i <= n; i++) {
      const u = from + (len * i) / (n + 1);
      addWallBox(b, frame, axis, at, u, cy, 0.04, hgt - 0.12, fd);
    }
    addWallBox(b, frame, axis, at, cu, cy, len - 0.12, 0.04, fd);
    // frosted bathroom window gets a roller blind (upper 55%)
    if (win.frosted) {
      const blindMat = variant(ctx, 'fabricLinen', { color: 0xb4bcb7, repeat: [2, 2] });
      const blindTop = y1 - 0.05;
      const blindH = (y1 - y0) * 0.58;
      addWallBox(b, blindMat, axis, at, cu, blindTop - blindH / 2, len - 0.06, blindH, 0.02, inward * 0.06);
      addWallBox(b, blindMat, axis, at, cu, blindTop - blindH + 0.02, len - 0.04, 0.05, 0.035, inward * 0.06);
      const [bw, bd, bh] = wallSize(axis, len - 0.06, blindH, 0.02);
      b.colliderBox(bw, bd, bh, wallXform(axis, at, cu, blindTop - blindH / 2, inward * 0.06));
    }
    // glass
    const gm = win.frosted ? variant(ctx, 'glassFrosted', { color: 0xccd4d0, opacity: 0.62 }) : glass;
    addWallBox(b, gm, axis, at, cu, cy, len - 0.1, hgt - 0.1, 0.012);
    // interior sill
    addWallBox(b, frame, axis, at, cu, y0 - 0.022, len + 0.16, 0.04, T + 0.16, inward * 0.045);
    const [sw, sd, sh] = wallSize(axis, len + 0.16, 0.04, T + 0.16);
    b.colliderBox(sw, sd, sh, wallXform(axis, at, cu, y0 - 0.022, inward * 0.045));
    const [gw, gd, gh] = wallSize(axis, len - 0.1, hgt - 0.1, 0.012);
    b.colliderBox(gw, gd, gh, wallXform(axis, at, cu, cy, 0));
    // curtain rod + panels
    if (win.curtains) {
      const rodY = y1 + 0.1;
      const rodLen = len + 0.62;
      const rot = wallCylRot(axis);
      const rodPos = wallXform(axis, at, cu, rodY, inward * 0.11);
      b.cyl(rodMat, 0.013, 0.013, rodLen, rodPos, rot, 8);
      for (const s of [-1, 1]) {
        const p = wallXform(axis, at, cu + (s * rodLen) / 2, rodY, inward * 0.11);
        b.sphere(rodMat, 0.026, p, 8);
        const bp = wallXform(axis, at, cu + s * (len / 2 + 0.18), rodY, inward * 0.05);
        b.box(rodMat, 0.05, 0.05, 0.09, bp);
      }
      const mat = curtainMats[win.curtains] || curtainMats.linen;
      const top = rodY - 0.01;
      const bottom = win.bottom;
      const ph = top - bottom;
      const pcy = (top + bottom) / 2;
      const panelW = 0.46;
      const slats = 9;
      const step = panelW / slats;
      for (const s of [-1, 1]) {
        const pc = cu + s * (len / 2 + 0.02);
        for (let i = 0; i < slats; i++) {
          const u = pc + (i - (slats - 1) / 2) * step;
          const wave = Math.sin(i * 1.85 + 0.6) * 0.032;
          const off = inward * (0.11 + wave);
          addWallBox(b, mat, axis, at, u, pcy, step * 1.04, ph, 0.026, off);
        }
      }
    }
  }
  return b.finish({ name: 'windows', isStatic: true, material: 'glass', tags: ['architecture', 'window'], shadows: true });
}

// ---------------------------------------------------------- ceiling fixtures

function buildCeilingLamps(ctx) {
  const b = new Batch(ctx, 'ceiling_lamps');
  const shade = matOf(ctx, 'lampShade');
  const shadePendant = variant(ctx, 'lampShade', { emissiveIntensity: 0.28, color: 0xd9cbb2 });
  const bulb = matOf(ctx, 'bulbWarm');
  const metal = variant(ctx, 'metalDark', { color: 0x33373a });

  const addFlush = (x, z) => {
    // canopy
    b.cyl(metal, 0.11, 0.12, 0.035, [x, H - 0.018, z], [0, 0, 0], 18);
    // dome
    b.lathe(
      shade,
      [
        [0.055, 0],
        [0.1, -0.02],
        [0.16, -0.07],
        [0.19, -0.14],
        [0.185, -0.16],
        [0.15, -0.16],
        [0.1, -0.11],
        [0.05, -0.04],
      ],
      [x, H - 0.05, z],
      [0, 0, 0],
      20
    );
    b.sphere(bulb, 0.055, [x, H - 0.2, z], 10);
  };
  for (const r of CONFIG.rooms) addFlush(r.lamp[0], r.lamp[2]);

  // pendant over the dining table
  const px = 2.2;
  const pz = -0.8;
  b.cyl(metal, 0.06, 0.06, 0.02, [px, H - 0.01, pz], [0, 0, 0], 12);
  b.cyl(metal, 0.006, 0.006, 0.72, [px, H - 0.38, pz], [0, 0, 0], 6);
  b.lathe(
    shadePendant,
    [
      [0.02, 0.02],
      [0.08, 0.0],
      [0.13, -0.09],
      [0.16, -0.18],
      [0.155, -0.195],
      [0.12, -0.16],
      [0.065, -0.08],
      [0.02, -0.02],
    ],
    [px, H - 0.72, pz],
    [0, 0, 0],
    18
  );
  b.sphere(bulb, 0.05, [px, H - 0.94, pz], 10);
  return b.finish({ name: 'ceiling_lamps', isStatic: true, material: 'metal', tags: ['architecture', 'fixture', 'lamp'], shadows: false });
}

// --------------------------------------------------------------- wall art

function buildWallArt(ctx) {
  const b = new Batch(ctx, 'wall_art');
  const frame = variant(ctx, 'woodLight', { color: 0xc9b696 });
  const frameDark = variant(ctx, 'woodDark', { color: 0x4b382a });
  const art = artMaterials();
  const canvasA = art.a;
  const canvasB = art.b;
  const canvasC = art.c;
  // living: above the TV wall (north wall, faces -Z)
  b.box(frameDark, 0.72, 0.035, 0.54, [-4.35, 1.62, PART.frontBackZ - T / 2 - 0.02]);
  b.box(canvasA, 0.62, 0.02, 0.44, [-4.35, 1.62, PART.frontBackZ - T / 2 - 0.042]);
  b.box(frame, 0.5, 0.035, 0.66, [-3.55, 1.56, PART.frontBackZ - T / 2 - 0.02]);
  b.box(canvasB, 0.4, 0.02, 0.56, [-3.55, 1.56, PART.frontBackZ - T / 2 - 0.042]);
  // bedroom: above the headboard (north wall, faces -Z)
  b.box(frameDark, 0.62, 0.035, 0.82, [-4.4, 1.78, IN.maxZ - 0.02]);
  b.box(canvasC, 0.52, 0.02, 0.72, [-4.4, 1.78, IN.maxZ - 0.042]);
  b.box(frame, 0.34, 0.035, 0.42, [-3.45, 1.72, IN.maxZ - 0.02]);
  b.box(canvasB, 0.26, 0.02, 0.34, [-3.45, 1.72, IN.maxZ - 0.042]);
  // study: south wall (faces +Z)
  b.box(frame, 0.56, 0.035, 0.72, [5.02, 1.62, PART.frontBackZ + T / 2 + 0.02]);
  b.box(canvasC, 0.46, 0.02, 0.62, [5.02, 1.62, PART.frontBackZ + T / 2 + 0.042]);
  // hallway: west wall (faces +X)
  b.box(frameDark, 0.035, 0.62, 0.42, [PART.bedroomHallX + T / 2 + 0.02, 1.6, 2.2]);
  b.box(canvasA, 0.02, 0.52, 0.32, [PART.bedroomHallX + T / 2 + 0.042, 1.6, 2.2]);
  b.colliderBox(0.72, 0.1, 0.54, [-4.35, 1.62, PART.frontBackZ - T / 2 - 0.02]);
  b.colliderBox(0.62, 0.1, 0.82, [-4.4, 1.78, IN.maxZ - 0.02]);
  return b.finish({ name: 'wall_art', pos: [0, 0, 0], isStatic: true, material: 'wood', tags: ['decor'], recenter: false, shadows: false });
}

// ------------------------------------------------------- exterior landing

function buildExterior(ctx) {
  const b = new Batch(ctx, 'exterior');
  const concrete = variant(ctx, 'concrete', { color: 0x9b978f });
  const paint = variant(ctx, 'wallPaint', { color: 0xd9d4c8 });
  const wood = variant(ctx, 'woodDark', { color: 0x9a7454 });
  const chrome = matOf(ctx, 'metalChrome');
  const bulb = matOf(ctx, 'bulbWarm');
  const x0 = -1.78;
  const x1 = 0.68;
  const z0 = OUT.maxZ;
  const z1 = 5.4;
  const cx = (x0 + x1) / 2;
  const cz = (z0 + z1) / 2;
  // floor + ceiling
  b.box(concrete, x1 - x0, z1 - z0, 0.1, [cx, -0.05, cz]);
  b.box(paint, x1 - x0, z1 - z0, 0.12, [cx, H + 0.06, cz]);
  // far + side walls
  b.box(paint, x1 - x0, 0.14, H, [cx, H / 2, z1]);
  b.box(paint, 0.14, z1 - z0, H, [x0, H / 2, cz]);
  b.box(paint, 0.14, z1 - z0, H, [x1, H / 2, cz]);
  // neighbour door + frame on the far wall
  b.box(wood, 0.98, 0.06, 2.15, [-0.75, 1.075, z1 - 0.1]);
  b.box(wood, 0.9, 0.05, 2.05, [-0.75, 1.025, z1 - 0.13]);
  b.box(wood, 1.1, 0.06, 0.1, [-0.75, 2.17, z1 - 0.1]);
  b.cyl(chrome, 0.016, 0.016, 0.1, [-0.36, 1.0, z1 - 0.16], [0, 0, 0], 8);
  // ceiling lamp
  b.cyl(concrete, 0.09, 0.1, 0.03, [cx, H - 0.02, cz], [0, 0, 0], 12);
  b.sphere(bulb, 0.045, [cx, H - 0.08, cz], 8);
  // colliders
  b.colliderBox(x1 - x0, z1 - z0, 0.1, [cx, -0.05, cz]);
  b.colliderBox(x1 - x0, 0.14, H, [cx, H / 2, z1]);
  b.colliderBox(0.14, z1 - z0, H, [x0, H / 2, cz]);
  b.colliderBox(0.14, z1 - z0, H, [x1, H / 2, cz]);
  const obj = b.finish({ name: 'exterior', pos: [0, 0, 0], isStatic: true, material: 'concrete', tags: ['architecture', 'exterior'], recenter: false, shadows: true });
  const corridorLight = new THREE.PointLight(0xffd8ac, 2.4, 4.5, 2);
  corridorLight.position.set(cx, H - 0.25, cz);
  ctx.scene.add(corridorLight);
  return obj;
}

// ------------------------------------------------------- exterior city view

function buildExteriorView(ctx) {
  const b = new Batch(ctx, 'city_view');
  const ground = variant(ctx, 'concrete', { color: 0x8d9384 });
  const buildingA = variant(ctx, 'concrete', { color: 0xa9b0b6 });
  const buildingB = variant(ctx, 'concrete', { color: 0xb8b1a2 });
  const buildingC = variant(ctx, 'concrete', { color: 0x97a1ab });
  const foliage = variant(ctx, 'plantLeaf', { color: 0x4c6b48 });
  const foliage2 = variant(ctx, 'plantLeaf', { color: 0x3e5c3b });
  const trunk = variant(ctx, 'woodDark', { color: 0x5b4636 });
  const baseY = -0.3;
  // ground + low garden wall right outside the south windows
  b.box(ground, 70, 70, 0.4, [0, baseY - 0.2, 0]);
  b.box(foliage, 11.5, 0.6, 0.7, [0, baseY + 0.3, OUT.minZ - 2.2]);
  b.box(foliage2, 0.7, 7.5, 0.6, [OUT.maxX + 2.2, baseY + 0.3, 0]);
  // distant blocks
  const buildings = [
    [-7.5, 5.4, -11, 6, 7, buildingA],
    [-1.2, 6.2, -12.5, 8, 6, buildingB],
    [6.4, 4.6, -11, 7, 8, buildingC],
    [13, 5.2, -2.2, 6, 7, buildingB],
    [13.5, 4.2, 4.4, 5, 6, buildingA],
    [-10, 5.6, 8.5, 7, 6, buildingC],
    [-2.2, 6.4, 11.5, 8, 7, buildingB],
    [5.2, 5, 10, 6, 6, buildingA],
    [-12.5, 4.6, 1, 5, 7, buildingC],
  ];
  const glassBand = variant(ctx, 'glassFrosted', { color: 0x5b6b78, opacity: 0.9 });
  for (const [x, h, z, w, d, mat] of buildings) {
    b.box(mat, w, d, h, [x, baseY + h / 2, z]);
    b.box(mat, w + 0.4, d + 0.4, 0.3, [x, baseY + h, z]);
    // roof box detail
    b.box(mat, w * 0.3, d * 0.3, 1.1, [x + w * 0.15, baseY + h + 0.55, z - d * 0.15]);
    // window bands on the face looking at the apartment
    const faceZ = Math.abs(z) > Math.abs(x);
    const rows = Math.max(2, Math.floor(h / 1.6));
    for (let r = 0; r < rows; r++) {
      const y = baseY + 1.0 + r * 1.5;
      if (y > baseY + h - 0.6) break;
      if (faceZ) {
        const zz = z > 0 ? z - d / 2 - 0.03 : z + d / 2 + 0.03;
        b.box(glassBand, w * 0.82, 0.06, 0.5, [x, y, zz]);
      } else {
        const xx = x > 0 ? x - w / 2 - 0.03 : x + w / 2 + 0.03;
        b.box(glassBand, 0.06, d * 0.82, 0.5, [xx, y, z]);
      }
    }
  }
  // trees
  const trees = [
    [-5.2, -8.2, 0.95],
    [-1.6, -8.6, 0.8],
    [2.8, -8.4, 1.0],
    [9.2, -3.4, 0.85],
    [9.6, 1.4, 0.9],
    [-8.0, -1.6, 0.85],
    [-8.2, 3.6, 0.9],
    [-3.4, 8.4, 0.95],
    [1.8, 8.8, 0.85],
    [5.4, 8.4, 0.9],
    [-6.9, -6.0, 0.8],
    [7.6, -6.2, 0.85],
    [-7.6, -2.7, 0.9],
    [-7.9, -4.1, 0.8],
    [-7.8, 2.6, 0.85],
    [7.8, 2.4, 0.8],
    [7.9, -1.4, 0.75],
  ];
  for (const [x, z, s] of trees) {
    b.cyl(trunk, 0.075 * s, 0.11 * s, 1.5 * s, [x, baseY + 0.75 * s, z], [0, 0, 0], 6);
    b.sphere(foliage, 0.82 * s, [x, baseY + 2.0 * s, z], 14);
    b.sphere(foliage2, 0.6 * s, [x + 0.55 * s, baseY + 1.55 * s, z + 0.3 * s], 12);
    b.sphere(foliage, 0.52 * s, [x - 0.48 * s, baseY + 1.6 * s, z - 0.28 * s], 12);
  }
  b.colliderBox(70, 70, 0.4, [0, baseY - 0.2, 0]);
  return b.finish({ name: 'city_view', pos: [0, 0, 0], isStatic: true, material: 'concrete', tags: ['exterior'], recenter: false, shadows: false });
}

// ------------------------------------------------------------------ exports

export function buildApartment(ctx) {
  const objects = [];
  // subtle cool fill so the bathroom reads normally lit rather than blown out
  const bathroomFill = new THREE.PointLight(0xd7e5f2, 0.3, 3.6, 2);
  bathroomFill.position.set(1.7, 2.1, 2.35);
  ctx.scene.add(bathroomFill);
  objects.push(...buildFloors(ctx));
  objects.push(buildCeiling(ctx));
  objects.push(buildWalls(ctx));
  objects.push(buildWindows(ctx));
  objects.push(buildCeilingLamps(ctx));
  objects.push(buildWallArt(ctx));
  objects.push(buildExterior(ctx));
  objects.push(buildExteriorView(ctx));
  return { objects, windows: WINDOWS, doors: DOORS, rooms: ROOMS };
}
