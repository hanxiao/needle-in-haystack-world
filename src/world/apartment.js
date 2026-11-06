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
  { id: 'd_study', hinge: [3.5, PART.frontBackZ], dir: [1, 0], swing: -1.745, width: 0.88, room: 'study', wall: 'z' },
  { id: 'd_front', hinge: [-1.0, OUT.maxZ], dir: [1, 0], swing: 1.745, width: 0.88, room: 'hallway', wall: 'z', front: true },
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
      out.push({ from: d.hinge[0], to: d.hinge[0] + d.width, y0: 0, y1: DOOR_H });
    }
    if (wall.axis === 'z' && d.wall === 'x' && Math.abs(d.hinge[0] - wall.at) < 1e-6) {
      out.push({ from: d.hinge[1], to: d.hinge[1] + d.width, y0: 0, y1: DOOR_H });
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
  const tileMat = variant(ctx, 'tileFloor', { repeat: [1, 1] });
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
    const geo = gBox(w, d, 0.13, [(x0 + x1) / 2, FLOOR_TOP - 0.055, (z0 + z1) / 2]);
    scaleUV(geo, w * 0.55, d * 0.55);
    tile.add(tileMat, geo);
  }
  for (const [x0, x1, z0, z1] of tileRegions) {
    tile.colliderBox(x1 - x0, z1 - z0, 0.13, [(x0 + x1) / 2, FLOOR_TOP - 0.055, (z0 + z1) / 2]);
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
    if (b === PART.frontBackZ) th.box(stripMat, c - a, w, 0.012, [(a + c) / 2, 0.006, b]);
    else th.box(stripMat, w, c - a, 0.012, [a, 0.006, (b + c) / 2]);
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
  const trim = variant(ctx, 'woodLight', { color: 0xd6c3a5 });

  const runs = [
    // outer shell
    { axis: 'x', at: OUT.minZ, from: OUT.minX - T / 2, to: OUT.maxX + T / 2, sides: [1], room: 'living' },
    { axis: 'x', at: OUT.maxZ, from: OUT.minX - T / 2, to: OUT.maxX + T / 2, sides: [-1], room: 'bedroom' },
    { axis: 'z', at: OUT.minX, from: IN.minZ, to: IN.maxZ, sides: [1], room: 'living' },
    { axis: 'z', at: OUT.maxX, from: IN.minZ, to: IN.maxZ, sides: [-1], room: 'kitchen' },
    // interior partitions
    { axis: 'z', at: PART.livingKitchenX, from: IN.minZ, to: -1.5, sides: [1, -1], room: 'living', mat: paint() },
    { axis: 'x', at: PART.frontBackZ, from: OUT.minX + T / 2, to: OUT.maxX - T / 2, sides: [1, -1], room: 'hallway', mat: paint() },
    { axis: 'z', at: PART.bedroomHallX, from: PART.frontBackZ + T / 2, to: IN.maxZ, sides: [1, -1], room: 'bedroom', mat: paint() },
    { axis: 'z', at: PART.hallBathX, from: PART.frontBackZ + T / 2, to: IN.maxZ, sides: [1, -1], room: 'bathroom', mat: paint() },
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
  const tile = variant(ctx, 'tileWall', { repeat: [2, 1] });
  const bathX0 = PART.hallBathX + T / 2;
  const bathX1 = PART.bathStudyX - T / 2;
  const bathZ0 = PART.frontBackZ + T / 2;
  b.box(tile, bathX1 - bathX0, 0.018, 1.25, [(bathX0 + bathX1) / 2, 0.625, IN.maxZ - 0.009]);
  b.box(tile, bathX1 - bathX0, 0.018, 1.25, [(bathX0 + bathX1) / 2, 0.625, bathZ0 + 0.009]);
  b.box(tile, 0.018, IN.maxZ - bathZ0 - 0.02, 1.25, [bathX1 - 0.009, 0.625, (bathZ0 + IN.maxZ) / 2]);

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
  // slab
  batch.box(material, width, 0.044, height, [cx, cy, cz], rot);
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
  const glass = matOf(ctx, 'glass');
  const glassFrosted = matOf(ctx, 'glassFrosted');
  const curtainMats = {
    linen: variant(ctx, 'fabricLinen', { color: 0xd6cdb9 }),
    wool: variant(ctx, 'fabricWool', { color: 0x9aa093 }),
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
    // glass
    const gm = win.frosted ? glassFrosted : glass;
    addWallBox(b, gm, axis, at, cu, cy, len - 0.1, hgt - 0.1, 0.012);
    // interior sill
    addWallBox(b, frame, axis, at, cu, y0 - 0.022, len + 0.16, 0.04, T + 0.16, inward * 0.045);
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
    shade,
    [
      [0.02, 0.02],
      [0.09, 0.0],
      [0.15, -0.1],
      [0.19, -0.2],
      [0.185, -0.215],
      [0.14, -0.18],
      [0.075, -0.09],
      [0.02, -0.02],
    ],
    [px, H - 0.72, pz],
    [0, 0, 0],
    18
  );
  b.sphere(bulb, 0.05, [px, H - 0.94, pz], 10);
  return b.finish({ name: 'ceiling_lamps', isStatic: true, material: 'metal', tags: ['architecture', 'fixture', 'lamp'], shadows: false });
}

// ------------------------------------------------------------------ exports

export function buildApartment(ctx) {
  const objects = [];
  objects.push(...buildFloors(ctx));
  objects.push(buildCeiling(ctx));
  objects.push(buildWalls(ctx));
  objects.push(buildWindows(ctx));
  objects.push(buildCeilingLamps(ctx));
  return { objects, windows: WINDOWS, doors: DOORS, rooms: ROOMS };
}
