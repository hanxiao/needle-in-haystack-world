// Procedural furniture. Every dynamic piece has a real mass and compound
// cuboid/cylinder colliders. Built in local space (y=0 bottom, x/z centred),
// then Batch.finish() re-centres geometry on the physics body origin.
import * as THREE from 'three';
import {
  Batch,
  C,
  gBox,
  gCyl,
  gLathe,
  gPlane,
  gTorus,
  gEllipsoid,
  matOf,
  variant,
  swapUV,
  ROOMS,
} from './helpers.js';

// Surface heights / anchors shared with clutter.js so nothing interpenetrates.
export const SURFACES = {
  coffeeTable: { x: -2.5, z: -1.55, top: 0.46, w: 1.2, d: 0.62 },
  sofa: { x: -2.5, z: -2.75, seatTop: 0.545, w: 2.06, d: 0.94, yaw: 0 },
  tvStand: { x: -2.5, z: 0.42, top: 0.45, w: 1.5, d: 0.42 },
  bookshelf: { x: -5.375, z: -0.6, shelves: [0.08, 0.44, 0.8, 1.16, 1.52, 1.82], w: 1.0, d: 0.32, yaw: Math.PI / 2 },
  diningTable: { x: 2.2, z: -0.8, top: 0.75, w: 1.6, d: 0.9 },
  counter: { x0: 1.85, x1: 3.75, z0: -3.74, z1: -3.12, top: 0.9 },
  sink: { x: 2.8, z: -3.43, bottom: 0.72, top: 0.9 },
  stove: { x: 4.05, z: -3.43, top: 0.9 },
  fridge: { x: 5.18, z: -3.2, top: 1.86 },
  bed: { x: -4.15, z: 2.55, top: 0.58, w: 1.62, d: 2.02, yaw: Math.PI },
  nightstand: { x: -3.0, z: 3.45, top: 0.56 },
  wardrobe: { x: -2.0, z: 1.06, top: 2.02 },
  laundryBasket: { x: -2.2, z: 1.85, top: 0.44 },
  desk: { x: 4.15, z: 3.32, top: 0.75, w: 1.4, d: 0.7 },
  deskChair: { x: 4.15, z: 2.6, seatTop: 0.47 },
  monitor: { x: 4.15, z: 3.5, top: 1.17 },
  studyShelves: { x: 3.01, z: 1.5, shelves: [0.06, 0.42, 0.78, 1.14, 1.5], w: 0.9, d: 0.3, yaw: Math.PI / 2 },
  vanity: { x: 2.49, z: 1.85, top: 0.85 },
  bathtub: { x: 1.7, z: 3.3, rim: 0.66, innerBottom: 0.12 },
  toilet: { x: 1.0, z: 2.45 },
  coatRack: { x: -1.05, z: 1.2 },
  entryMat: { x: -0.55, z: 3.52 },
};

const f = (name, opts) => ({ name, ...opts });

function makeLegs(b, material, xs, zs, y0, height, size = 0.045) {
  for (const x of xs) for (const z of zs) b.box(material, size, size, height, [x, y0 + height / 2, z]);
}

function cylLegs(b, material, xs, zs, y0, height, radius = 0.024) {
  for (const x of xs) for (const z of zs) b.cyl(material, radius, radius * 1.1, height, [x, y0 + height / 2, z], [0, 0, 0], 8);
}

// ------------------------------------------------------------------- living

function buildSofa(ctx, shadows) {
  const b = new Batch(ctx, 'sofa');
  const fab = variant(ctx, 'fabricSofa', { color: 0x6d786a });
  const fabDark = variant(ctx, 'fabricSofa', { color: 0x5f6a5d });
  const wood = variant(ctx, 'woodDark', { color: 0x4b382b });
  const w = 2.06;
  const d = 0.94;
  // feet
  cylLegs(b, wood, [-0.88, 0.88], [-0.36, 0.36], 0, 0.1, 0.028);
  // plinth
  b.box(wood, 1.74, 0.8, 0.08, [0, 0.14, 0]);
  // seat base
  b.box(fab, 1.74, 0.92, 0.24, [0, 0.3, 0]);
  // seat cushions (soft ellipsoids, collider top stays at 0.545)
  b.add(fab, gEllipsoid(0.43, 0.105, 0.4, [-0.44, 0.44, 0.03]));
  b.add(fab, gEllipsoid(0.43, 0.105, 0.4, [0.44, 0.44, 0.03]));
  // backrest
  b.box(fabDark, 1.74, 0.2, 0.56, [0, 0.6, -0.37]);
  // back cushions, tilted
  for (const sx of [-1, 1]) {
    b.add(fab, gEllipsoid(0.4, 0.22, 0.075, [sx * 0.435, 0.6, -0.26], [0.22, 0, 0]));
  }
  // arms
  for (const sx of [-1, 1]) {
    b.box(fabDark, 0.16, 0.94, 0.5, [sx * 0.95, 0.44, 0]);
    b.box(fab, 0.17, 0.96, 0.06, [sx * 0.95, 0.7, 0]);
  }
  // colliders (wide base, low CoM)
  b.colliderBox(2.0, 0.94, 0.5, [0, 0.27, 0]);
  b.colliderBox(1.74, 0.8, 0.17, [0, 0.46, 0.03]);
  b.colliderBox(1.74, 0.24, 0.34, [0, 0.69, -0.37]);
  b.colliderBox(0.16, 0.94, 0.2, [-0.95, 0.6, 0]);
  b.colliderBox(0.16, 0.94, 0.2, [0.95, 0.6, 0]);
  const obj = b.finish({
    name: 'sofa',
    pos: [SURFACES.sofa.x, 0, SURFACES.sofa.z],
    mass: 85,
    material: 'fabric',
    room: 'living',
    tags: ['furniture', 'seat'],
    grabbable: false,
    linearDamping: 0.4,
    angularDamping: 0.7,
  });
  shadows.add(SURFACES.sofa.x, SURFACES.sofa.z, 2.45, 1.2, { y: 0.004 });
  return obj;
}

function buildCoffeeTable(ctx, shadows) {
  const b = new Batch(ctx, 'coffee_table');
  const wood = variant(ctx, 'woodWarm', { color: 0x86613f });
  const metal = variant(ctx, 'metalDark', { color: 0x2e3032 });
  b.box(wood, 1.2, 0.62, 0.055, [0, 0.428, 0]);
  b.box(wood, 0.98, 0.48, 0.02, [0, 0.15, 0]);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    b.box(metal, 0.045, 0.045, 0.4, [sx * 0.52, 0.2, sz * 0.24]);
  }
  b.colliderBox(1.2, 0.62, 0.055, [0, 0.428, 0]);
  b.colliderBox(0.98, 0.48, 0.02, [0, 0.15, 0]);
  b.colliderBox(0.05, 0.05, 0.4, [-0.52, 0.2, -0.24]);
  b.colliderBox(0.05, 0.05, 0.4, [0.52, 0.2, -0.24]);
  b.colliderBox(0.05, 0.05, 0.4, [-0.52, 0.2, 0.24]);
  b.colliderBox(0.05, 0.05, 0.4, [0.52, 0.2, 0.24]);
  const obj = b.finish({
    name: 'coffee_table',
    pos: [SURFACES.coffeeTable.x, 0.012, SURFACES.coffeeTable.z],
    mass: 13,
    material: 'wood',
    room: 'living',
    tags: ['furniture', 'table'],
    grabbable: false,
  });
  shadows.add(SURFACES.coffeeTable.x, SURFACES.coffeeTable.z, 1.45, 0.9, { y: 0.024 });
  return obj;
}

function buildRug(ctx) {
  const b = new Batch(ctx, 'rug');
  const rug = variant(ctx, 'fabricRug', { color: 0xa2957f });
  const border = variant(ctx, 'fabricRug', { color: 0x82745e });
  const cx = -2.25;
  const cz = -1.55;
  const w = 2.5;
  const d = 1.5;
  b.box(rug, w, d, 0.012, [0, 0.006, 0]);
  b.box(border, w, 0.12, 0.014, [0, 0.007, -d / 2 + 0.06]);
  b.box(border, w, 0.12, 0.014, [0, 0.007, d / 2 - 0.06]);
  b.box(border, 0.12, d, 0.014, [-w / 2 + 0.06, 0.007, 0]);
  b.box(border, 0.12, d, 0.014, [w / 2 - 0.06, 0.007, 0]);
  b.colliderBox(w, d, 0.012, [0, 0.006, 0]);
  return b.finish({
    name: 'rug',
    pos: [cx, 0, cz],
    isStatic: true,
    material: 'fabric',
    room: 'living',
    tags: ['furniture', 'rug'],
    shadows: false,
  });
}

function buildArmchair(ctx, shadows) {
  const b = new Batch(ctx, 'armchair');
  const fab = variant(ctx, 'fabricWool', { color: 0xa8745c });
  const wood = variant(ctx, 'woodDark', { color: 0x4b382b });
  const w = 0.86;
  const d = 0.9;
  cylLegs(b, wood, [-0.33, 0.33], [-0.34, 0.34], 0, 0.14, 0.026);
  b.box(fab, 0.74, 0.84, 0.24, [0, 0.26, 0]);
  b.add(fab, gEllipsoid(0.3, 0.1, 0.3, [0, 0.46, 0.04]));
  b.box(fab, 0.74, 0.18, 0.52, [0, 0.55, -0.33]);
  b.add(fab, gEllipsoid(0.3, 0.18, 0.07, [0, 0.57, -0.28], [0.18, 0, 0]));
  for (const sx of [-1, 1]) {
    b.box(fab, 0.14, 0.9, 0.34, [sx * 0.37, 0.44, 0]);
    b.box(fab, 0.15, 0.92, 0.05, [sx * 0.37, 0.63, 0]);
  }
  b.colliderBox(0.86, 0.9, 0.5, [0, 0.25, 0]);
  b.colliderBox(0.62, 0.62, 0.16, [0, 0.46, 0.04]);
  b.colliderBox(0.74, 0.22, 0.3, [0, 0.7, -0.33]);
  b.colliderBox(0.14, 0.9, 0.34, [-0.37, 0.5, 0]);
  b.colliderBox(0.14, 0.9, 0.34, [0.37, 0.5, 0]);
  const obj = b.finish({
    name: 'armchair',
    pos: [-4.55, 0, -1.75],
    yaw: Math.PI / 2,
    mass: 21,
    material: 'fabric',
    room: 'living',
    tags: ['furniture', 'seat'],
    grabbable: false,
  });
  shadows.add(-4.55, -1.75, 1.1, 1.1, { y: 0.004 });
  return obj;
}

function buildBookshelf(ctx, shadows) {
  const b = new Batch(ctx, 'bookshelf');
  const wood = variant(ctx, 'woodDark', { color: 0x8a6a4c });
  const back = variant(ctx, 'woodDark', { color: 0x5f4a36 });
  const w = 1.0;
  const d = 0.32;
  const h = 1.86;
  const t = 0.03;
  b.box(wood, t, d, h, [-w / 2 + t / 2, h / 2, 0]);
  b.box(wood, t, d, h, [w / 2 - t / 2, h / 2, 0]);
  b.box(back, w - t * 2, 0.012, h - 0.02, [0, h / 2, -d / 2 + 0.006]);
  b.box(wood, w, d, 0.04, [0, h - 0.02, 0]);
  b.box(wood, w, d, 0.05, [0, 0.025, 0]);
  for (const y of [0.44, 0.8, 1.16, 1.52]) b.box(wood, w - t * 2, d - 0.01, 0.028, [0, y, 0]);
  // open shelf colliders (sides/back/shelf boards) so books can sit inside
  b.colliderBox(t, d, h, [-w / 2 + t / 2, h / 2, 0]);
  b.colliderBox(t, d, h, [w / 2 - t / 2, h / 2, 0]);
  b.colliderBox(w, 0.014, h, [0, h / 2, -d / 2 + 0.007]);
  b.colliderBox(w, d, 0.05, [0, 0.025, 0]);
  b.colliderBox(w, d, 0.04, [0, h - 0.02, 0]);
  for (const y of [0.44, 0.8, 1.16, 1.52]) b.colliderBox(w - t * 2, d - 0.01, 0.028, [0, y, 0]);
  const obj = b.finish({
    name: 'bookshelf',
    pos: [SURFACES.bookshelf.x, 0, SURFACES.bookshelf.z],
    yaw: SURFACES.bookshelf.yaw,
    mass: 42,
    material: 'wood',
    room: 'living',
    tags: ['furniture', 'shelf'],
    grabbable: false,
    linearDamping: 0.35,
    angularDamping: 0.7,
  });
  shadows.add(SURFACES.bookshelf.x, SURFACES.bookshelf.z, 0.7, 1.25, { y: 0.004 });
  return obj;
}

function buildFloorLamp(ctx, shadows) {
  const b = new Batch(ctx, 'floor_lamp');
  const metal = variant(ctx, 'metalDark', { color: 0x2d2f31 });
  const shade = matOf(ctx, 'lampShade');
  const bulb = matOf(ctx, 'bulbWarm');
  b.cyl(metal, 0.17, 0.19, 0.035, [0, 0.017, 0], [0, 0, 0], 20);
  b.cyl(metal, 0.016, 0.016, 1.45, [0, 0.75, 0], [0, 0, 0], 8);
  b.lathe(
    shade,
    [
      [0.06, 0.22],
      [0.14, 0.16],
      [0.2, 0.05],
      [0.21, 0.0],
      [0.2, -0.01],
      [0.13, 0.06],
      [0.06, 0.14],
    ],
    [0, 1.52, 0],
    [0, 0, 0],
    18
  );
  b.sphere(bulb, 0.05, [0, 1.56, 0], 10);
  b.colliderCyl(0.18, 0.04, [0, 0.02, 0]);
  b.colliderBox(0.04, 0.04, 1.4, [0, 0.72, 0]);
  b.colliderBox(0.4, 0.4, 0.22, [0, 1.55, 0]);
  const obj = b.finish({
    name: 'floor_lamp',
    pos: [-5.0, 0, -3.2],
    mass: 4.2,
    material: 'metal',
    room: 'living',
    tags: ['furniture', 'lamp'],
    grabbable: false,
  });
  shadows.add(-5.0, -3.2, 0.6, 0.6, { y: 0.004 });
  return obj;
}

const LEAF_SHAPE = (() => {
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.bezierCurveTo(0.055, 0.03, 0.1, 0.09, 0.105, 0.17);
  s.bezierCurveTo(0.11, 0.24, 0.06, 0.31, 0, 0.35);
  s.bezierCurveTo(-0.06, 0.31, -0.11, 0.24, -0.105, 0.17);
  s.bezierCurveTo(-0.1, 0.09, -0.055, 0.03, 0, 0);
  return s;
})();

function leafGeo(scale, pos, yaw, tilt) {
  const geo = new THREE.ExtrudeGeometry(LEAF_SHAPE, { depth: 0.008, bevelEnabled: false, curveSegments: 5 });
  geo.scale(scale, scale, 1);
  geo.rotateX(-Math.PI / 2 + tilt);
  geo.rotateY(yaw);
  geo.translate(pos[0], pos[1], pos[2]);
  return geo;
}

function buildPlant(ctx, shadows) {
  const b = new Batch(ctx, 'plant_monstera');
  const pot = variant(ctx, 'terracotta', { color: 0xa9614a });
  const soil = matOf(ctx, 'plantSoil');
  const leaf = variant(ctx, 'plantLeaf', { color: 0x3d6739 });
  const stem = variant(ctx, 'plantLeaf', { color: 0x4d6b3a });
  b.lathe(
    pot,
    [
      [0, 0],
      [0.13, 0],
      [0.15, 0.02],
      [0.185, 0.3],
      [0.2, 0.33],
      [0.185, 0.345],
      [0.17, 0.33],
      [0.16, 0.07],
      [0, 0.07],
    ],
    [0, 0, 0],
    [0, 0, 0],
    20
  );
  b.cyl(soil, 0.16, 0.16, 0.04, [0, 0.335, 0], [0, 0, 0], 18);
  const leaves = [
    [0.15, 0.62, 0.1, 0.35, 0.5, 1.0],
    [-0.18, 0.7, -0.12, 0.8, 0.45, 0.95],
    [0.22, 0.82, -0.16, 1.1, 0.55, 1.05],
    [-0.2, 0.9, 0.18, 2.3, 0.5, 1.0],
    [0.05, 1.0, 0.2, 3.6, 0.6, 1.1],
    [-0.08, 1.06, -0.2, 4.6, 0.62, 1.15],
    [0.2, 1.12, 0.02, 5.4, 0.55, 1.05],
    [-0.22, 1.2, -0.02, 0.3, 0.5, 0.95],
    [0.02, 1.26, -0.1, 1.8, 0.48, 0.9],
    [0.1, 1.32, 0.14, 2.9, 0.45, 0.85],
  ];
  for (const [x, y, z, yaw, tilt, sc] of leaves) {
    b.add(stem, gCyl(0.008, 0.012, Math.hypot(x, y - 0.34, z), [x * 0.5, 0.34 + (y - 0.34) * 0.5, z * 0.5], [Math.atan2(z, x) * 0, 0, 0], 6));
    b.add(leaf, leafGeo(sc, [x, y, z], yaw, tilt));
  }
  b.colliderCyl(0.2, 0.36, [0, 0.18, 0]);
  b.colliderBox(0.3, 0.3, 0.5, [0, 0.85, 0]);
  const obj = b.finish({
    name: 'plant_monstera',
    pos: [-0.45, 0, -3.2],
    mass: 8,
    material: 'plant',
    room: 'living',
    tags: ['furniture', 'plant'],
    grabbable: false,
  });
  shadows.add(-0.45, -3.2, 0.75, 0.75, { y: 0.004 });
  return obj;
}

function buildTvStand(ctx, shadows) {
  const b = new Batch(ctx, 'tv_stand');
  const wood = variant(ctx, 'woodDark', { color: 0x634933 });
  const front = variant(ctx, 'woodWarm', { color: 0x9a7350 });
  const metal = variant(ctx, 'metalDark', { color: 0x2c2e30 });
  b.box(wood, 1.5, 0.42, 0.38, [0, 0.26, 0]);
  b.box(wood, 1.56, 0.45, 0.035, [0, 0.45, 0]);
  b.box(wood, 1.5, 0.4, 0.03, [0, 0.07, 0]);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.box(metal, 0.035, 0.035, 0.09, [sx * 0.68, 0.045, sz * 0.17]);
  // drawer fronts
  for (const sx of [-1, 1]) {
    b.box(front, 0.64, 0.02, 0.3, [sx * 0.34, 0.3, 0.21]);
    b.box(metal, 0.16, 0.02, 0.02, [sx * 0.34, 0.3, 0.225]);
  }
  b.colliderBox(1.56, 0.45, 0.4675, [0, 0.23375, 0]);
  const obj = b.finish({
    name: 'tv_stand',
    pos: [SURFACES.tvStand.x, 0, SURFACES.tvStand.z],
    isStatic: true,
    material: 'wood',
    room: 'living',
    tags: ['furniture', 'storage'],
  });
  shadows.add(SURFACES.tvStand.x, SURFACES.tvStand.z, 1.7, 0.65, { y: 0.004 });
  return obj;
}

function buildTv(ctx) {
  const b = new Batch(ctx, 'tv');
  const dark = variant(ctx, 'plasticDark', { color: 0x1e2022 });
  const screen = matOf(ctx, 'screen');
  const metal = variant(ctx, 'metalDark', { color: 0x2a2c2e });
  b.box(dark, 1.1, 0.045, 0.64, [0, 0.47, 0]);
  b.box(screen, 1.04, 0.008, 0.57, [0, 0.47, -0.026]);
  b.box(dark, 0.4, 0.2, 0.022, [0, 0.025, 0]);
  b.box(metal, 0.06, 0.08, 0.13, [0, 0.09, 0]);
  b.box(metal, 0.32, 0.14, 0.02, [0, 0.14, -0.005]);
  b.colliderBox(1.1, 0.06, 0.64, [0, 0.47, 0]);
  b.colliderBox(0.4, 0.2, 0.03, [0, 0.02, 0]);
  return b.finish({
    name: 'tv',
    pos: [SURFACES.tvStand.x, SURFACES.tvStand.top + 0.0075, SURFACES.tvStand.z],
    mass: 11,
    material: 'glass',
    room: 'living',
    tags: ['furniture', 'screen'],
    grabbable: false,
  });
}

// ------------------------------------------------------------------ kitchen

function buildCounter(ctx, shadows) {
  const b = new Batch(ctx, 'kitchen_counter');
  const cab = variant(ctx, 'woodLight', { color: 0xd3cbbd });
  const cabDark = variant(ctx, 'woodLight', { color: 0xb9b0a1 });
  const top = variant(ctx, 'stone', { color: 0x8d8a83 });
  const steel = variant(ctx, 'metalBrushed', { color: 0xa9acad, metalness: 0.35, roughness: 0.5 });
  const chrome = variant(ctx, 'metalBrushed', { color: 0xd0d3d3, metalness: 0.55, roughness: 0.28 });
  const w = 1.9;
  const d = 0.62;
  const h = 0.9;
  // toe kick + carcass
  b.box(cabDark, w - 0.06, d - 0.08, 0.1, [0, 0.05, -0.02]);
  b.box(cab, w, d, 0.76, [0, 0.48, 0]);
  // doors / drawers (one column is a stainless dishwasher)
  const dishwasher = variant(ctx, 'metalBrushed', { color: 0xbfc2c2, metalness: 0.4, roughness: 0.35 });
  const panelInset = variant(ctx, 'woodLight', { color: 0xbfb6a5 });
  for (const dx of [-0.63, 0, 0.63]) {
    b.box(cabDark, 0.58, 0.02, 0.34, [dx, 0.72, d / 2 + 0.011]);
    b.box(cabDark, 0.58, 0.02, 0.3, [dx, 0.3, d / 2 + 0.011]);
    // recessed panel detail
    b.box(panelInset, 0.46, 0.012, 0.22, [dx, 0.72, d / 2 + 0.02]);
    b.box(panelInset, 0.46, 0.012, 0.18, [dx, 0.3, d / 2 + 0.02]);
    b.box(chrome, 0.1, 0.018, 0.018, [dx, 0.72, d / 2 + 0.03]);
    b.box(chrome, 0.1, 0.018, 0.018, [dx, 0.3, d / 2 + 0.03]);
  }
  b.box(dishwasher, 0.56, 0.03, 0.62, [0.63, 0.36, d / 2 + 0.032]);
  b.box(chrome, 0.22, 0.018, 0.018, [0.63, 0.64, d / 2 + 0.052]);
  // toe kick shadow strip
  b.box(cabDark, w - 0.08, 0.01, 0.08, [0, 0.06, d / 2 - 0.02]);
  // countertop with sink cut-out (sink centred at x=0)
  const sinkW = 0.6;
  const sinkD = 0.42;
  const backStrip = (d - sinkD) / 2;
  b.box(top, (w - sinkW) / 2, d, 0.04, [-(sinkW + (w - sinkW) / 2) / 2, 0.88, 0]);
  b.box(top, (w - sinkW) / 2, d, 0.04, [(sinkW + (w - sinkW) / 2) / 2, 0.88, 0]);
  b.box(top, sinkW, backStrip, 0.04, [0, 0.88, -(sinkD / 2 + backStrip / 2)]);
  b.box(top, sinkW, backStrip, 0.04, [0, 0.88, sinkD / 2 + backStrip / 2]);
  // basin
  const bd = 0.17;
  b.box(steel, sinkW, sinkD, 0.02, [0, 0.86 - bd, 0]);
  b.box(steel, 0.02, sinkD, bd, [-sinkW / 2, 0.86 - bd / 2, 0]);
  b.box(steel, 0.02, sinkD, bd, [sinkW / 2, 0.86 - bd / 2, 0]);
  b.box(steel, sinkW, 0.02, bd, [0, 0.86 - bd / 2, -sinkD / 2]);
  b.box(steel, sinkW, 0.02, bd, [0, 0.86 - bd / 2, sinkD / 2]);
  // drain
  b.cyl(steel, 0.035, 0.035, 0.01, [0, 0.868 - bd, 0], [0, 0, 0], 12);
  // faucet
  b.cyl(chrome, 0.022, 0.026, 0.06, [0, 0.93, -d / 2 + 0.08], [0, 0, 0], 10);
  b.cyl(chrome, 0.016, 0.016, 0.3, [0, 1.07, -d / 2 + 0.08], [0, 0, 0], 10);
  b.cyl(chrome, 0.014, 0.014, 0.2, [0, 1.21, -d / 2 + 0.16], [Math.PI / 2, 0, 0], 10);
  b.cyl(chrome, 0.012, 0.012, 0.05, [0, 1.18, -d / 2 + 0.25], [0, 0, 0], 10);
  b.box(chrome, 0.05, 0.02, 0.02, [0.08, 1.02, -d / 2 + 0.08]);
  b.box(chrome, 0.05, 0.02, 0.02, [-0.08, 1.02, -d / 2 + 0.08]);
  // upper cabinet (left of the window)
  b.box(cab, 0.7, 0.34, 0.68, [-0.6, 1.9, -d / 2 + 0.17]);
  b.box(cabDark, 0.32, 0.02, 0.6, [-0.75, 1.9, -d / 2 + 0.35]);
  b.box(cabDark, 0.32, 0.02, 0.6, [-0.4, 1.9, -d / 2 + 0.35]);
  b.box(chrome, 0.02, 0.1, 0.02, [-0.6, 1.9, -d / 2 + 0.37]);
  const halfSink = sinkW / 2;
  const sideW = (w - sinkW) / 2;
  b.colliderBox(sideW, d, 0.9, [-halfSink - sideW / 2, 0.45, 0]);
  b.colliderBox(sideW, d, 0.9, [halfSink + sideW / 2, 0.45, 0]);
  b.colliderBox(sinkW, backStrip, 0.9, [0, 0.45, -(sinkD / 2 + backStrip / 2)]);
  b.colliderBox(sinkW, backStrip, 0.9, [0, 0.45, sinkD / 2 + backStrip / 2]);
  b.colliderBox(sinkW, sinkD, 0.02, [0, 0.69, 0]);
  b.colliderBox(0.7, 0.34, 0.68, [-0.6, 1.9, -d / 2 + 0.17]);
  const obj = b.finish({
    name: 'kitchen_counter',
    pos: [(SURFACES.counter.x0 + SURFACES.counter.x1) / 2, 0, (SURFACES.counter.z0 + SURFACES.counter.z1) / 2],
    isStatic: true,
    material: 'wood',
    room: 'kitchen',
    tags: ['furniture', 'fixture', 'kitchen'],
  });
  shadows.add((SURFACES.counter.x0 + SURFACES.counter.x1) / 2, (SURFACES.counter.z0 + SURFACES.counter.z1) / 2, 2.0, 0.75, { y: 0.004 });
  return obj;
}

function buildStove(ctx, shadows) {
  const b = new Batch(ctx, 'stove');
  const body = variant(ctx, 'metalBrushed', { color: 0xbcbfc0, metalness: 0.4, roughness: 0.3 });
  const dark = variant(ctx, 'metalDark', { color: 0x24262a });
  const glass = matOf(ctx, 'glass');
  const w = 0.6;
  const d = 0.62;
  b.box(body, w, d, 0.88, [0, 0.44, 0]);
  b.box(dark, w - 0.02, d - 0.02, 0.03, [0, 0.9, 0]);
  // oven door
  b.box(dark, w - 0.08, 0.02, 0.4, [0, 0.42, d / 2 + 0.012]);
  b.box(glass, w - 0.16, 0.012, 0.28, [0, 0.44, d / 2 + 0.024]);
  b.box(body, w - 0.1, 0.025, 0.025, [0, 0.68, d / 2 + 0.045]);
  // burners
  for (const [x, z, r] of [
    [-0.15, -0.14, 0.075],
    [0.15, -0.14, 0.075],
    [-0.15, 0.14, 0.06],
    [0.15, 0.14, 0.06],
  ]) {
    b.cyl(dark, r, r, 0.012, [x, 0.912, z], [0, 0, 0], 14);
    b.cyl(body, r * 0.4, r * 0.4, 0.016, [x, 0.916, z], [0, 0, 0], 10);
  }
  // knobs
  for (const x of [-0.2, -0.07, 0.07, 0.2]) {
    b.cyl(dark, 0.022, 0.022, 0.025, [x, 0.79, d / 2 + 0.02], [Math.PI / 2, 0, 0], 10);
  }
  b.colliderBox(w, d, 0.93, [0, 0.465, 0]);
  const obj = b.finish({
    name: 'stove',
    pos: [SURFACES.stove.x, 0, SURFACES.stove.z],
    isStatic: true,
    material: 'metal',
    room: 'kitchen',
    tags: ['furniture', 'fixture', 'kitchen'],
  });
  shadows.add(SURFACES.stove.x, SURFACES.stove.z, 0.7, 0.72, { y: 0.004 });
  return obj;
}

function buildFridge(ctx, shadows) {
  const b = new Batch(ctx, 'fridge');
  const body = variant(ctx, 'metalBrushed', { color: 0xe4e6e3, metalness: 0.3, roughness: 0.34 });
  const dark = variant(ctx, 'plasticDark', { color: 0x24262a });
  const chrome = matOf(ctx, 'metalChrome');
  const w = 0.72;
  const d = 0.72;
  const h = 1.86;
  b.box(body, w, d, h, [0, h / 2, 0]);
  // door split: freezer bottom, fridge top
  b.box(dark, w + 0.005, 0.012, 0.008, [0, 0.66, d / 2 + 0.003]);
  b.box(dark, w + 0.005, 0.012, 0.008, [0, 1.24, d / 2 + 0.003]);
  for (const [y0, y1] of [[0.02, 0.64], [0.68, 1.82]]) {
    b.box(body, w - 0.03, 0.025, y1 - y0, [0, (y0 + y1) / 2, d / 2 + 0.012]);
    b.box(chrome, 0.03, 0.05, Math.min(0.5, y1 - y0 - 0.1), [w / 2 - 0.08, (y0 + y1) / 2 + 0.05, d / 2 + 0.045]);
  }
  // feet
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.box(dark, 0.05, 0.05, 0.04, [sx * 0.3, 0.02, sz * 0.3]);
  b.colliderBox(w, d, h, [0, h / 2, 0]);
  const obj = b.finish({
    name: 'fridge',
    pos: [SURFACES.fridge.x, 0, SURFACES.fridge.z],
    yaw: -Math.PI / 2,
    mass: 95,
    material: 'metal',
    room: 'kitchen',
    tags: ['furniture', 'appliance'],
    grabbable: false,
    linearDamping: 0.4,
    angularDamping: 0.7,
  });
  shadows.add(SURFACES.fridge.x, SURFACES.fridge.z, 0.95, 0.95, { y: 0.004 });
  return obj;
}

function buildDiningTable(ctx, shadows) {
  const b = new Batch(ctx, 'dining_table');
  const wood = variant(ctx, 'woodLight', { color: 0xb99a76 });
  const dark = variant(ctx, 'woodDark', { color: 0x5a4029 });
  const w = 1.6;
  const d = 0.9;
  b.box(wood, w, d, 0.05, [0, 0.725, 0]);
  b.box(dark, w - 0.16, d - 0.16, 0.09, [0, 0.655, 0]);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    b.box(dark, 0.07, 0.07, 0.7, [sx * (w / 2 - 0.1), 0.35, sz * (d / 2 - 0.1)]);
  }
  b.colliderBox(w, d, 0.05, [0, 0.725, 0]);
  b.colliderBox(0.08, 0.08, 0.7, [-(w / 2 - 0.1), 0.35, -(d / 2 - 0.1)]);
  b.colliderBox(0.08, 0.08, 0.7, [w / 2 - 0.1, 0.35, -(d / 2 - 0.1)]);
  b.colliderBox(0.08, 0.08, 0.7, [-(w / 2 - 0.1), 0.35, d / 2 - 0.1]);
  b.colliderBox(0.08, 0.08, 0.7, [w / 2 - 0.1, 0.35, d / 2 - 0.1]);
  const obj = b.finish({
    name: 'dining_table',
    pos: [SURFACES.diningTable.x, 0, SURFACES.diningTable.z],
    mass: 34,
    material: 'wood',
    room: 'kitchen',
    tags: ['furniture', 'table'],
    grabbable: false,
  });
  shadows.add(SURFACES.diningTable.x, SURFACES.diningTable.z, 1.85, 1.15, { y: 0.004 });
  return obj;
}

function buildChair(ctx, name, pos, yaw, shadows) {
  const b = new Batch(ctx, name);
  const wood = variant(ctx, 'woodLight', { color: 0xb2906a });
  const fab = variant(ctx, 'fabricLinen', { color: 0xc2b8a2 });
  const seatY = 0.45;
  b.box(wood, 0.44, 0.44, 0.04, [0, seatY, 0]);
  b.box(fab, 0.4, 0.38, 0.035, [0, seatY + 0.035, 0]);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    b.box(wood, 0.035, 0.035, seatY, [sx * 0.185, seatY / 2, sz * 0.185]);
  }
  // back posts + slats
  for (const sx of [-1, 1]) b.box(wood, 0.035, 0.035, 0.46, [sx * 0.185, seatY + 0.25, -0.2]);
  b.box(wood, 0.4, 0.04, 0.09, [0, seatY + 0.44, -0.2]);
  b.box(wood, 0.4, 0.04, 0.05, [0, seatY + 0.27, -0.2]);
  b.box(wood, 0.4, 0.02, 0.04, [0, seatY + 0.12, -0.19]);
  b.colliderBox(0.44, 0.44, 0.075, [0, seatY + 0.0175, 0]);
  b.colliderBox(0.44, 0.05, 0.44, [0, seatY + 0.28, -0.2]);
  b.colliderBox(0.4, 0.4, 0.4, [0, seatY / 2, 0]);
  const obj = b.finish({
    name,
    pos,
    yaw,
    mass: 5.5,
    material: 'wood',
    room: 'kitchen',
    tags: ['furniture', 'seat'],
    grabbable: false,
  });
  shadows.add(pos[0], pos[2], 0.6, 0.6, { y: 0.004 });
  return obj;
}

function buildTrashBin(ctx) {
  const b = new Batch(ctx, 'trash_bin');
  const metal = variant(ctx, 'metalBrushed', { color: 0xc3c6c6, metalness: 0.35, roughness: 0.34 });
  const dark = variant(ctx, 'plasticDark', { color: 0x2a2c2e });
  b.lathe(
    metal,
    [
      [0, 0],
      [0.13, 0],
      [0.15, 0.03],
      [0.17, 0.44],
      [0.175, 0.46],
      [0.16, 0.47],
      [0.145, 0.45],
      [0.13, 0.05],
      [0, 0.05],
    ],
    [0, 0, 0],
    [0, 0, 0],
    18
  );
  b.cyl(dark, 0.15, 0.15, 0.02, [0, 0.47, 0], [0, 0, 0], 16);
  b.cyl(dark, 0.02, 0.02, 0.03, [0, 0.49, 0], [0, 0, 0], 8);
  b.colliderCyl(0.17, 0.5, [0, 0.25, 0]);
  return b.finish({
    name: 'trash_bin',
    pos: [1.55, 0, -3.3],
    mass: 1.6,
    material: 'metal',
    room: 'kitchen',
    tags: ['furniture', 'bin'],
    grabbable: true,
  });
}

// ------------------------------------------------------------------ bedroom

function buildBed(ctx, shadows) {
  const b = new Batch(ctx, 'bed');
  const w = 1.62;
  const d = 2.02;
  const frame = variant(ctx, 'woodWarm', { color: 0x8a6a4c });
  const headWood = variant(ctx, 'woodDark', { color: 0x7a5a42 });
  const mattressMat = variant(ctx, 'foam', { color: 0xe8e1d2 });
  const bedding = variant(ctx, 'fabricLinen', { color: 0xd9cdb4, repeat: [2, 2] });
  const skirtMat = variant(ctx, 'fabricLinen', { color: 0xc4b7a0, repeat: [2, 1] });
  const headFab = variant(ctx, 'fabricWool', { color: 0xd0b593, repeat: [2, 2] });
  const blanketMat = variant(ctx, 'fabricLinen', { color: 0xa9ae9e, repeat: [2, 2] });
  const pillowMat = variant(ctx, 'fabricLinen', { color: 0xe0d6c2, repeat: [2, 2] });
  const seamMat = variant(ctx, 'woodDark', { color: 0x6a4c34 });

  // feet + frame
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.box(frame, 0.07, 0.07, 0.1, [sx * (w / 2 - 0.09), 0.05, sz * (d / 2 - 0.09)]);
  b.box(frame, w, d, 0.2, [0, 0.2, 0]);

  // bed skirt: wavy panels from the frame down to the floor
  const skirtPanels = (axis, fixed, from, to, count, height) => {
    const step = (to - from) / count;
    for (let i = 0; i < count; i++) {
      const u = from + step * (i + 0.5);
      const wave = Math.sin(i * 1.9) * 0.006;
      const hh = height + Math.sin(i * 1.3) * 0.012;
      if (axis === 'x') b.box(skirtMat, step * 1.03, 0.02, hh, [u, 0.012 + hh / 2, fixed + wave]);
      else b.box(skirtMat, 0.02, step * 1.03, hh, [fixed + wave, 0.012 + hh / 2, u]);
    }
  };
  skirtPanels('x', d / 2 + 0.012, -w / 2 - 0.01, w / 2 + 0.01, 6, 0.31);
  skirtPanels('x', -d / 2 - 0.012, -w / 2 - 0.01, w / 2 + 0.01, 6, 0.31);
  skirtPanels('z', w / 2 + 0.012, -d / 2, d / 2, 8, 0.31);
  skirtPanels('z', -w / 2 - 0.012, -d / 2, d / 2, 8, 0.31);

  // mattress
  b.box(mattressMat, w - 0.05, d - 0.06, 0.22, [0, 0.41, 0]);

  // duvet: slab + puffy rounded top, covering the foot 3/4 of the bed
  const duvetZ = 0.15;
  const duvetD = 1.66;
  b.box(bedding, w - 0.01, duvetD, 0.07, [0, 0.535, duvetZ]);
  b.add(bedding, gEllipsoid(w / 2 - 0.03, 0.042, duvetD / 2 - 0.03, [0, 0.568, duvetZ], [0, 0, 0], 22));
  // folded-back top edge (rolled fold + flat fold)
  b.cyl(bedding, 0.048, 0.048, w - 0.1, [0, 0.575, duvetZ - duvetD / 2 + 0.03], [0, 0, Math.PI / 2], 14);
  b.box(bedding, w - 0.08, 0.14, 0.028, [0, 0.59, duvetZ - duvetD / 2 + 0.14]);
  // duvet hangs over the mattress sides + foot (wavy fabric, no flat cards)
  const duvetPanels = (axis, fixed, from, to, count, height) => {
    const step = (to - from) / count;
    for (let i = 0; i < count; i++) {
      const u = from + step * (i + 0.5);
      const wave = Math.sin(i * 1.8) * 0.007;
      const hh = height + Math.sin(i * 1.45) * 0.02;
      const yc = 0.565 - hh / 2;
      if (axis === 'x') b.box(bedding, step * 1.04, 0.024, hh, [u, yc, fixed + wave]);
      else b.box(bedding, 0.024, step * 1.04, hh, [fixed + wave, yc, u]);
    }
  };
  duvetPanels('z', w / 2 + 0.006, duvetZ - duvetD / 2, duvetZ + duvetD / 2, 6, 0.24);
  duvetPanels('z', -w / 2 - 0.006, duvetZ - duvetD / 2, duvetZ + duvetD / 2, 6, 0.24);
  duvetPanels('x', duvetZ + duvetD / 2 + 0.006, -w / 2, w / 2, 6, 0.24);

  // two rounded pillows against the headboard (one slightly askew)
  b.add(pillowMat, gEllipsoid(0.31, 0.09, 0.18, [0.36, 0.59, -0.85], [-0.25, 0, 0], 18));
  b.add(pillowMat, gEllipsoid(0.3, 0.09, 0.17, [-0.34, 0.595, -0.87], [-0.2, 0.18, 0.05], 18));

  // headboard: wood frame + warm upholstered panel with seams and buttons
  b.box(headWood, 0.1, 0.1, 1.18, [-(w / 2 + 0.03), 0.59, -d / 2 - 0.02]);
  b.box(headWood, 0.1, 0.1, 1.18, [w / 2 + 0.03, 0.59, -d / 2 - 0.02]);
  b.box(headWood, w + 0.16, 0.1, 0.1, [0, 1.13, -d / 2 - 0.02]);
  b.box(headWood, w + 0.16, 0.09, 0.09, [0, 0.08, -d / 2 - 0.02]);
  b.box(headFab, w - 0.02, 0.04, 1.02, [0, 0.6, -d / 2 + 0.035]);
  for (const sx of [-0.36, 0, 0.36]) {
    b.box(seamMat, 0.012, 0.022, 1.0, [sx, 0.6, -d / 2 + 0.057]);
  }
  for (const sx of [-0.36, 0, 0.36]) for (const sy of [0.38, 0.78]) {
    b.cyl(seamMat, 0.013, 0.013, 0.012, [sx, sy, -d / 2 + 0.058], [Math.PI / 2, 0, 0], 8);
  }

  // blanket: curved strip attached at the mattress edge, hanging down the side
  const strip = [
    [-0.58, 0.607],
    [-0.72, 0.606],
    [-0.8, 0.6],
    [-0.828, 0.58],
    [-0.842, 0.535],
    [-0.85, 0.47],
    [-0.856, 0.395],
    [-0.86, 0.32],
    [-0.863, 0.265],
  ];
  const stripZ = 0.1;
  const stripD = 0.9;
  for (let i = 0; i < strip.length - 1; i++) {
    const p0 = strip[i];
    const p1 = strip[i + 1];
    const dx = p1[0] - p0[0];
    const dy = p1[1] - p0[1];
    const len = Math.hypot(dx, dy);
    const ang = Math.atan2(dy, dx);
    b.box(blanketMat, len + 0.014, stripD, 0.02, [(p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2, stripZ], [0, 0, ang]);
  }
  // soft folds on the hanging part
  for (const dz of [-0.26, 0.02, 0.3]) {
    b.box(blanketMat, 0.012, 0.02, 0.34, [-0.858, 0.44, stripZ + dz], [0, 0, 0.02]);
  }
  b.box(blanketMat, 0.03, 0.03, stripD, [-0.864, 0.27, stripZ]);

  b.colliderBox(w, d, 0.52, [0, 0.26, 0]);
  b.colliderBox(w - 0.02, duvetD, 0.07, [0, 0.575, duvetZ]);
  b.colliderBox(w + 0.16, 0.1, 1.18, [0, 0.59, -d / 2 - 0.02]);
  const obj = b.finish({
    name: 'bed',
    pos: [SURFACES.bed.x, 0, SURFACES.bed.z],
    yaw: SURFACES.bed.yaw,
    mass: 75,
    material: 'fabric',
    room: 'bedroom',
    tags: ['furniture', 'bed'],
    grabbable: false,
    linearDamping: 0.4,
    angularDamping: 0.7,
  });
  shadows.add(SURFACES.bed.x, SURFACES.bed.z, 1.95, 2.35, { y: 0.004 });
  return obj;
}

function buildNightstand(ctx, shadows) {
  const b = new Batch(ctx, 'nightstand');
  const wood = variant(ctx, 'woodWarm', { color: 0x87654a });
  const dark = variant(ctx, 'woodDark', { color: 0x503a28 });
  const chrome = matOf(ctx, 'metalChrome');
  b.box(wood, 0.46, 0.42, 0.46, [0, 0.31, 0]);
  b.box(wood, 0.5, 0.45, 0.03, [0, 0.555, 0]);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.box(dark, 0.035, 0.035, 0.08, [sx * 0.18, 0.04, sz * 0.16]);
  b.box(dark, 0.38, 0.02, 0.17, [0, 0.42, 0.215]);
  b.box(chrome, 0.12, 0.018, 0.018, [0, 0.42, 0.235]);
  b.box(dark, 0.38, 0.02, 0.17, [0, 0.2, 0.215]);
  b.box(chrome, 0.12, 0.018, 0.018, [0, 0.2, 0.235]);
  b.colliderBox(0.5, 0.45, 0.57, [0, 0.285, 0]);
  const obj = b.finish({
    name: 'nightstand',
    pos: [SURFACES.nightstand.x, 0, SURFACES.nightstand.z],
    mass: 7,
    material: 'wood',
    room: 'bedroom',
    tags: ['furniture', 'storage'],
    grabbable: false,
  });
  shadows.add(SURFACES.nightstand.x, SURFACES.nightstand.z, 0.7, 0.65, { y: 0.004 });
  return obj;
}

function buildWardrobe(ctx, shadows) {
  const b = new Batch(ctx, 'wardrobe');
  const wood = variant(ctx, 'woodLight', { color: 0xd2c4ae });
  const dark = variant(ctx, 'woodLight', { color: 0xb4a68f });
  const chrome = matOf(ctx, 'metalChrome');
  const w = 1.12;
  const d = 0.6;
  const h = 2.02;
  b.box(wood, w, d, h, [0, h / 2, 0]);
  for (const sx of [-1, 1]) {
    const doorGeo = gBox(w / 2 - 0.03, 0.02, h - 0.08, [sx * w / 4, h / 2, d / 2 + 0.011]);
    swapUV(doorGeo);
    b.add(dark, doorGeo);
    b.box(chrome, 0.025, 0.02, 0.34, [sx * 0.06, 1.2, d / 2 + 0.032]);
  }
  b.box(dark, w, 0.05, 0.05, [0, h - 0.03, d / 2 + 0.01]);
  for (const sx of [-1, 1]) b.box(dark, 0.06, d - 0.04, 0.08, [sx * (w / 2 - 0.04), 0.04, 0]);
  b.colliderBox(w, d, h, [0, h / 2, 0]);
  const obj = b.finish({
    name: 'wardrobe',
    pos: [SURFACES.wardrobe.x, 0, SURFACES.wardrobe.z],
    mass: 120,
    material: 'wood',
    room: 'bedroom',
    tags: ['furniture', 'storage'],
    grabbable: false,
    linearDamping: 0.4,
    angularDamping: 0.7,
  });
  shadows.add(SURFACES.wardrobe.x, SURFACES.wardrobe.z, 1.4, 0.85, { y: 0.004 });
  return obj;
}

function buildBedsideLamp(ctx) {
  const b = new Batch(ctx, 'bedside_lamp');
  const metal = variant(ctx, 'brass', { color: 0xb99a63 });
  const shade = matOf(ctx, 'lampShade');
  const bulb = matOf(ctx, 'bulbWarm');
  b.cyl(metal, 0.075, 0.085, 0.025, [0, 0.012, 0], [0, 0, 0], 16);
  b.cyl(metal, 0.012, 0.012, 0.22, [0, 0.13, 0], [0, 0, 0], 8);
  b.lathe(
    shade,
    [
      [0.05, 0.13],
      [0.1, 0.1],
      [0.13, 0.02],
      [0.135, 0.0],
      [0.13, -0.005],
      [0.09, 0.045],
      [0.05, 0.1],
    ],
    [0, 0.3, 0],
    [0, 0, 0],
    16
  );
  b.sphere(bulb, 0.032, [0, 0.32, 0], 8);
  b.colliderCyl(0.085, 0.03, [0, 0.015, 0]);
  b.colliderBox(0.26, 0.26, 0.3, [0, 0.28, 0]);
  return b.finish({
    name: 'bedside_lamp',
    pos: [SURFACES.nightstand.x, SURFACES.nightstand.top + 0.002, SURFACES.nightstand.z],
    mass: 1.3,
    material: 'metal',
    room: 'bedroom',
    tags: ['furniture', 'lamp'],
    grabbable: true,
  });
}

function buildLaundryBasket(ctx, shadows) {
  const b = new Batch(ctx, 'laundry_basket');
  const wicker = variant(ctx, 'fabricWool', { color: 0xb59b76 });
  const cloth = variant(ctx, 'fabricLinen', { color: 0xd8d0bf });
  b.lathe(
    wicker,
    [
      [0, 0],
      [0.16, 0],
      [0.18, 0.03],
      [0.19, 0.4],
      [0.185, 0.42],
      [0.17, 0.41],
      [0.165, 0.05],
      [0, 0.05],
    ],
    [0, 0, 0],
    [0, 0, 0],
    18
  );
  // clothes peeking out
  b.box(cloth, 0.22, 0.16, 0.1, [0.02, 0.4, 0.01], [0, 0.4, 0.2]);
  b.box(cloth, 0.18, 0.12, 0.08, [-0.05, 0.41, -0.04], [0.2, -0.5, 0.1]);
  b.colliderCyl(0.19, 0.44, [0, 0.22, 0]);
  const obj = b.finish({
    name: 'laundry_basket',
    pos: [SURFACES.laundryBasket.x, 0, SURFACES.laundryBasket.z],
    mass: 1.0,
    material: 'fabric',
    room: 'bedroom',
    tags: ['furniture', 'basket'],
    grabbable: true,
  });
  shadows.add(SURFACES.laundryBasket.x, SURFACES.laundryBasket.z, 0.55, 0.55, { y: 0.004 });
  return obj;
}

function buildBedroomRug(ctx) {
  const b = new Batch(ctx, 'bedroom_rug');
  const rug = variant(ctx, 'fabricRug', { color: 0xa8a08c });
  b.box(rug, 1.5, 0.65, 0.012, [0, 0.006, 0]);
  b.colliderBox(1.5, 0.65, 0.012, [0, 0.006, 0]);
  return b.finish({
    name: 'bedroom_rug',
    pos: [-3.5, 0, 1.12],
    isStatic: true,
    material: 'fabric',
    room: 'bedroom',
    tags: ['furniture', 'rug'],
    shadows: false,
  });
}

// ----------------------------------------------------------------- bathroom

function buildBathtub(ctx, shadows) {
  const b = new Batch(ctx, 'bathtub');
  const ceramic = matOf(ctx, 'ceramicWhite');
  const chrome = matOf(ctx, 'metalChrome');
  const water = matOf(ctx, 'water');
  const w = 1.7;
  const d = 0.75;
  const h = 0.66;
  const t = 0.1;
  b.box(ceramic, w, d, 0.12, [0, 0.06, 0]);
  b.box(ceramic, t, d, h - 0.12, [-w / 2 + t / 2, 0.12 + (h - 0.12) / 2, 0]);
  b.box(ceramic, t, d, h - 0.12, [w / 2 - t / 2, 0.12 + (h - 0.12) / 2, 0]);
  b.box(ceramic, w - 2 * t, t, h - 0.12, [0, 0.12 + (h - 0.12) / 2, -d / 2 + t / 2]);
  b.box(ceramic, w - 2 * t, t, h - 0.12, [0, 0.12 + (h - 0.12) / 2, d / 2 - t / 2]);
  // rim
  b.box(ceramic, w + 0.02, d + 0.02, 0.03, [0, h - 0.015, 0]);
  // water
  b.box(water, w - 2 * t - 0.02, d - 2 * t - 0.02, 0.01, [0, 0.42, 0]);
  // tap + drain
  b.cyl(chrome, 0.02, 0.024, 0.06, [0, h + 0.02, -d / 2 + 0.1], [0, 0, 0], 10);
  b.cyl(chrome, 0.014, 0.014, 0.18, [0, h + 0.1, -d / 2 + 0.1], [0, 0, 0], 10);
  b.cyl(chrome, 0.012, 0.012, 0.12, [0, h + 0.18, -d / 2 + 0.15], [Math.PI / 2, 0, 0], 10);
  b.cyl(chrome, 0.035, 0.035, 0.01, [0, 0.125, 0.1], [0, 0, 0], 12);
  // shower head on wall
  b.cyl(chrome, 0.012, 0.012, 0.5, [0.5, 1.5, -d / 2 + 0.02], [0, 0, 0], 8);
  b.cyl(chrome, 0.012, 0.012, 0.2, [0.56, 1.75, -d / 2 + 0.08], [0, 0, Math.PI / 2.4], 8);
  b.cyl(chrome, 0.07, 0.06, 0.03, [0.68, 1.78, -d / 2 + 0.13], [0, 0, 0], 12);
  b.colliderBox(w + 0.02, d + 0.02, h, [0, h / 2, 0]);
  const obj = b.finish({
    name: 'bathtub',
    pos: [SURFACES.bathtub.x, 0, SURFACES.bathtub.z],
    isStatic: true,
    material: 'ceramic',
    room: 'bathroom',
    tags: ['furniture', 'fixture', 'bathroom'],
  });
  shadows.add(SURFACES.bathtub.x, SURFACES.bathtub.z, 1.9, 0.95, { y: 0.004 });
  return obj;
}

function buildToilet(ctx, shadows) {
  const b = new Batch(ctx, 'toilet');
  const ceramic = matOf(ctx, 'ceramicWhite');
  const chrome = matOf(ctx, 'metalChrome');
  b.box(ceramic, 0.24, 0.34, 0.38, [0, 0.19, 0.02]);
  b.cyl(ceramic, 0.18, 0.2, 0.16, [0, 0.44, 0.06], [0, 0, 0], 18);
  b.cyl(ceramic, 0.215, 0.2, 0.05, [0, 0.54, 0.06], [0, 0, 0], 18);
  b.box(ceramic, 0.4, 0.2, 0.42, [0, 0.76, -0.19]);
  b.box(ceramic, 0.36, 0.03, 0.4, [0, 0.985, -0.19]);
  b.box(chrome, 0.05, 0.02, 0.02, [0.12, 0.9, -0.08]);
  b.cyl(chrome, 0.05, 0.05, 0.015, [0, 0.55, 0.06], [0, 0, 0], 14);
  b.colliderBox(0.44, 0.72, 1.0, [0, 0.5, 0]);
  const obj = b.finish({
    name: 'toilet',
    pos: [SURFACES.toilet.x, 0, SURFACES.toilet.z],
    yaw: Math.PI / 2,
    isStatic: true,
    material: 'ceramic',
    room: 'bathroom',
    tags: ['furniture', 'fixture', 'bathroom'],
  });
  shadows.add(SURFACES.toilet.x, SURFACES.toilet.z, 0.75, 0.6, { y: 0.004 });
  return obj;
}

function buildVanity(ctx, shadows) {
  const b = new Batch(ctx, 'bathroom_vanity');
  const wood = variant(ctx, 'woodLight', { color: 0xcfc6b8 });
  const ceramic = matOf(ctx, 'ceramicWhite');
  const top = variant(ctx, 'stone', { color: 0xdedbd2 });
  const chrome = matOf(ctx, 'metalChrome');
  const mirror = variant(ctx, 'mirror', { color: 0xd6e0e6, metalness: 0.45, roughness: 0.12 });
  const frame = variant(ctx, 'woodLight', { color: 0xbdb2a0 });
  const w = 0.9;
  const d = 0.5;
  const h = 0.8;
  b.box(wood, w, d, h, [0, h / 2, 0]);
  b.box(top, w + 0.02, d + 0.02, 0.04, [0, h + 0.02, 0]);
  // vessel basin
  b.lathe(
    ceramic,
    [
      [0, 0],
      [0.13, 0],
      [0.16, 0.04],
      [0.17, 0.12],
      [0.165, 0.13],
      [0.145, 0.11],
      [0.13, 0.03],
      [0, 0.03],
    ],
    [0, h + 0.04, 0],
    [0, 0, 0],
    18
  );
  b.cyl(chrome, 0.014, 0.018, 0.28, [0, h + 0.18, -d / 2 + 0.08], [0, 0, 0], 10);
  b.cyl(chrome, 0.012, 0.012, 0.16, [0, h + 0.32, -d / 2 + 0.15], [Math.PI / 2, 0, 0], 10);
  // doors + handles
  for (const sx of [-1, 1]) {
    b.box(frame, w / 2 - 0.03, 0.02, h - 0.1, [sx * w / 4, h / 2, d / 2 + 0.011]);
    b.box(chrome, 0.02, 0.02, 0.16, [sx * 0.04, 0.55, d / 2 + 0.03]);
  }
  // mirror above
  b.box(frame, 0.72, 0.03, 0.78, [0, 1.62, -d / 2 + 0.005]);
  b.box(mirror, 0.64, 0.02, 0.7, [0, 1.62, -d / 2 + 0.022]);
  b.colliderBox(w + 0.02, d + 0.02, h + 0.04, [0, (h + 0.04) / 2, 0]);
  const obj = b.finish({
    name: 'bathroom_vanity',
    pos: [SURFACES.vanity.x, 0, SURFACES.vanity.z],
    yaw: -Math.PI / 2,
    isStatic: true,
    material: 'ceramic',
    room: 'bathroom',
    tags: ['furniture', 'fixture', 'bathroom'],
  });
  shadows.add(SURFACES.vanity.x, SURFACES.vanity.z, 0.65, 1.05, { y: 0.004 });
  return obj;
}

function buildTowelRail(ctx) {
  const b = new Batch(ctx, 'towel_rail');
  const chrome = matOf(ctx, 'metalChrome');
  const towel = variant(ctx, 'cotton', { color: 0xd9d4c6 });
  const towel2 = variant(ctx, 'cotton', { color: 0x9aa89c });
  // rail runs along Z on the east wall
  b.cyl(chrome, 0.012, 0.012, 0.62, [0, 1.2, 0], [Math.PI / 2, 0, 0], 8);
  for (const z of [-0.28, 0.28]) b.box(chrome, 0.06, 0.02, 0.03, [-0.035, 1.2, z]);
  // draped towel with folds
  for (let i = 0; i < 5; i++) {
    const z = -0.18 + i * 0.09;
    b.box(towel, 0.045, 0.088, 0.32, [-0.07 + Math.sin(i * 1.9) * 0.008, 1.06, z]);
  }
  b.box(towel2, 0.06, 0.42, 0.022, [-0.072, 1.235, 0]);
  b.box(towel, 0.055, 0.42, 0.06, [-0.072, 1.2, 0]);
  b.colliderBox(0.14, 0.62, 0.55, [-0.04, 1.05, 0]);
  return b.finish({
    name: 'towel_rail',
    pos: [2.72, 0, 2.72],
    isStatic: true,
    material: 'metal',
    room: 'bathroom',
    tags: ['furniture', 'fixture', 'bathroom'],
  });
}

function buildBathMat(ctx) {
  const b = new Batch(ctx, 'bath_mat');
  const mat = variant(ctx, 'fabricWool', { color: 0xa7b0a4 });
  b.box(mat, 0.75, 0.45, 0.02, [0, 0.01, 0]);
  b.colliderBox(0.75, 0.45, 0.02, [0, 0.01, 0]);
  return b.finish({
    name: 'bath_mat',
    pos: [1.7, 0, 2.65],
    mass: 0.35,
    material: 'fabric',
    room: 'bathroom',
    tags: ['clutter', 'mat'],
    grabbable: true,
    shadows: false,
  });
}

// -------------------------------------------------------------------- study

function buildDesk(ctx, shadows) {
  const b = new Batch(ctx, 'desk');
  const wood = variant(ctx, 'woodLight', { color: 0xb99a76 });
  const metal = variant(ctx, 'metalDark', { color: 0x2b2d2f });
  const w = 1.4;
  const d = 0.7;
  b.box(wood, w, d, 0.05, [0, 0.725, 0]);
  // side frames (wood so the study doesn't read as black slabs)
  for (const sx of [-1, 1]) {
    b.box(wood, 0.05, d - 0.04, 0.7, [sx * (w / 2 - 0.04), 0.35, 0]);
    b.box(wood, 0.05, d - 0.04, 0.04, [sx * (w / 2 - 0.04), 0.68, 0]);
  }
  // drawer pedestal right
  b.box(wood, 0.4, d - 0.06, 0.6, [0.44, 0.3, 0]);
  const drawer = variant(ctx, 'woodWarm', { color: 0x9a7a58 });
  for (const [y, hh] of [[0.14, 0.16], [0.34, 0.16], [0.54, 0.12]]) {
    b.box(drawer, 0.34, 0.02, hh, [0.44, y, d / 2 - 0.02]);
    b.box(metal, 0.12, 0.02, 0.018, [0.44, y, d / 2 - 0.005]);
  }
  // modesty panel
  b.box(wood, w - 0.12, 0.04, 0.5, [0, 0.45, -d / 2 + 0.06]);
  b.colliderBox(w, d, 0.05, [0, 0.725, 0]);
  b.colliderBox(0.42, d - 0.06, 0.6, [0.44, 0.3, 0]);
  b.colliderBox(0.06, d - 0.04, 0.72, [-(w / 2 - 0.04), 0.36, 0]);
  b.colliderBox(0.06, d - 0.04, 0.72, [w / 2 - 0.04, 0.36, 0]);
  const obj = b.finish({
    name: 'desk',
    pos: [SURFACES.desk.x, 0, SURFACES.desk.z],
    yaw: Math.PI,
    mass: 26,
    material: 'wood',
    room: 'study',
    tags: ['furniture', 'table'],
    grabbable: false,
  });
  shadows.add(SURFACES.desk.x, SURFACES.desk.z, 1.65, 0.95, { y: 0.004 });
  return obj;
}

function buildDeskChair(ctx, shadows) {
  const b = new Batch(ctx, 'desk_chair');
  const fab = variant(ctx, 'fabricSofa', { color: 0x8a95a0 });
  const metal = variant(ctx, 'metalDark', { color: 0x4b5055, metalness: 0.5, roughness: 0.45 });
  const chrome = matOf(ctx, 'metalChrome');
  // swivel base
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    b.box(metal, 0.28, 0.05, 0.04, [Math.cos(a) * 0.14, 0.04, Math.sin(a) * 0.14], [0, -a, 0]);
    b.cyl(metal, 0.025, 0.03, 0.04, [Math.cos(a) * 0.28, 0.02, Math.sin(a) * 0.28], [0, 0, 0], 8);
  }
  b.cyl(chrome, 0.03, 0.035, 0.34, [0, 0.23, 0], [0, 0, 0], 10);
  b.box(fab, 0.46, 0.44, 0.09, [0, 0.46, 0]);
  b.box(fab, 0.44, 0.1, 0.5, [0, 0.72, -0.2], [-0.12, 0, 0]);
  b.box(metal, 0.05, 0.05, 0.12, [0, 0.53, -0.19]);
  b.colliderBox(0.46, 0.44, 0.1, [0, 0.46, 0]);
  b.colliderBox(0.46, 0.12, 0.5, [0, 0.72, -0.2]);
  b.colliderCyl(0.3, 0.06, [0, 0.03, 0]);
  const obj = b.finish({
    name: 'desk_chair',
    pos: [SURFACES.deskChair.x, 0, SURFACES.deskChair.z],
    mass: 7,
    material: 'fabric',
    room: 'study',
    tags: ['furniture', 'seat'],
    grabbable: false,
  });
  shadows.add(SURFACES.deskChair.x, SURFACES.deskChair.z, 0.72, 0.72, { y: 0.004 });
  return obj;
}

function buildMonitor(ctx) {
  const b = new Batch(ctx, 'monitor');
  const dark = variant(ctx, 'plasticDark', { color: 0x3a3f45 });
  const screen = matOf(ctx, 'screen');
  b.box(dark, 0.62, 0.035, 0.37, [0, 0.42, 0]);
  b.box(screen, 0.58, 0.006, 0.33, [0, 0.42, -0.021]);
  b.box(dark, 0.08, 0.07, 0.16, [0, 0.2, 0]);
  b.box(dark, 0.34, 0.22, 0.02, [0, 0.02, 0.0]);
  b.box(dark, 0.06, 0.03, 0.1, [0, 0.11, 0]);
  b.colliderBox(0.62, 0.05, 0.37, [0, 0.42, 0]);
  b.colliderBox(0.34, 0.22, 0.03, [0, 0.02, 0]);
  return b.finish({
    name: 'monitor',
    pos: [SURFACES.monitor.x, SURFACES.desk.top + 0.002, 3.48],
    yaw: Math.PI,
    mass: 4.5,
    material: 'glass',
    room: 'study',
    tags: ['furniture', 'screen'],
    grabbable: false,
  });
}

function buildStudyShelves(ctx, shadows) {
  const b = new Batch(ctx, 'study_shelves');
  const wood = variant(ctx, 'woodWarm', { color: 0x7b573a });
  const dark = variant(ctx, 'woodWarm', { color: 0x8a6746 });
  const back = variant(ctx, 'woodDark', { color: 0x7a5f42 });
  const w = 0.9;
  const d = 0.3;
  const h = 1.8;
  b.box(wood, 0.03, d, h, [-w / 2 + 0.015, h / 2, 0]);
  b.box(wood, 0.03, d, h, [w / 2 - 0.015, h / 2, 0]);
  b.box(wood, w, d, 0.03, [0, h - 0.015, 0]);
  b.box(wood, w, d, 0.04, [0, 0.02, 0]);
  b.box(back, w - 0.06, 0.02, h - 0.08, [0, h / 2, -d / 2 + 0.012]);
  for (const y of [0.42, 0.78, 1.14, 1.5]) b.box(dark, w - 0.06, d - 0.02, 0.025, [0, y, 0]);
  b.colliderBox(w - 0.06, 0.02, h - 0.08, [0, h / 2, -d / 2 + 0.012]);
  b.colliderBox(0.03, d, h, [-w / 2 + 0.015, h / 2, 0]);
  b.colliderBox(0.03, d, h, [w / 2 - 0.015, h / 2, 0]);
  b.colliderBox(w, d, 0.04, [0, 0.02, 0]);
  b.colliderBox(w, d, 0.03, [0, h - 0.015, 0]);
  for (const y of [0.42, 0.78, 1.14, 1.5]) b.colliderBox(w - 0.06, d - 0.02, 0.025, [0, y, 0]);
  const obj = b.finish({
    name: 'study_shelves',
    pos: [SURFACES.studyShelves.x, 0, SURFACES.studyShelves.z],
    yaw: SURFACES.studyShelves.yaw,
    mass: 18,
    material: 'wood',
    room: 'study',
    tags: ['furniture', 'shelf'],
    grabbable: false,
  });
  shadows.add(SURFACES.studyShelves.x, SURFACES.studyShelves.z, 0.6, 1.1, { y: 0.004 });
  return obj;
}

function buildDeskLamp(ctx) {
  const b = new Batch(ctx, 'desk_lamp');
  const metal = variant(ctx, 'metalDark', { color: 0x2e3032 });
  const shade = matOf(ctx, 'lampShade');
  const bulb = matOf(ctx, 'bulbWarm');
  b.cyl(metal, 0.07, 0.08, 0.02, [0, 0.01, 0], [0, 0, 0], 14);
  b.cyl(metal, 0.014, 0.014, 0.26, [0, 0.14, 0], [0, 0, 0.25], 8);
  b.cyl(metal, 0.012, 0.012, 0.3, [0.06, 0.34, 0], [0, 0, 0.9], 8);
  b.lathe(
    shade,
    [
      [0.03, 0.09],
      [0.07, 0.05],
      [0.1, -0.03],
      [0.105, -0.05],
      [0.1, -0.055],
      [0.06, 0.01],
      [0.03, 0.06],
    ],
    [0.16, 0.42, 0],
    [0, 0, 0],
    14
  );
  b.sphere(bulb, 0.028, [0.16, 0.4, 0], 8);
  b.colliderCyl(0.08, 0.03, [0, 0.015, 0]);
  b.colliderBox(0.3, 0.22, 0.44, [0.06, 0.22, 0]);
  return b.finish({
    name: 'desk_lamp',
    pos: [4.7, SURFACES.desk.top + 0.002, 3.28],
    mass: 1.1,
    material: 'metal',
    room: 'study',
    tags: ['furniture', 'lamp'],
    grabbable: true,
  });
}

function buildCardboardBox(ctx, name, pos, yaw, size, mass) {
  const b = new Batch(ctx, name);
  const card = matOf(ctx, 'cardboard');
  const tape = variant(ctx, 'plasticWhite', { color: 0xd8d2c2 });
  const [w, d, h] = size;
  b.box(card, w, d, h, [0, h / 2, 0]);
  b.box(tape, w * 0.9, d * 0.12, 0.004, [0, h + 0.001, 0]);
  b.box(tape, w * 0.12, d * 0.9, 0.004, [0, h + 0.001, 0]);
  b.colliderBox(w, d, h, [0, h / 2, 0]);
  return b.finish({
    name,
    pos,
    yaw,
    mass,
    material: 'cardboard',
    room: 'study',
    tags: ['clutter', 'box'],
    grabbable: true,
  });
}

// ------------------------------------------------------------------ hallway

function buildCoatRack(ctx, shadows) {
  const b = new Batch(ctx, 'coat_rack');
  const wood = variant(ctx, 'woodDark', { color: 0x4c392b });
  const metal = variant(ctx, 'metalDark', { color: 0x2c2e30 });
  const coat = variant(ctx, 'fabricWool', { color: 0x5d5b50 });
  const scarf = variant(ctx, 'fabricSofa', { color: 0x8d5a45 });
  b.cyl(metal, 0.16, 0.18, 0.03, [0, 0.015, 0], [0, 0, 0], 16);
  b.cyl(wood, 0.018, 0.022, 1.62, [0, 0.83, 0], [0, 0, 0], 10);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + 0.4;
    b.cyl(wood, 0.008, 0.012, 0.18, [Math.cos(a) * 0.07, 1.6, Math.sin(a) * 0.07], [Math.sin(a) * 0.6, 0, -Math.cos(a) * 0.6], 6);
  }
  // coat draped over the rack
  b.box(coat, 0.3, 0.18, 0.62, [0.02, 1.14, -0.06], [0, 0.2, 0]);
  b.box(coat, 0.22, 0.14, 0.34, [0.04, 0.86, -0.08], [0, 0.25, 0.04]);
  b.box(scarf, 0.12, 0.1, 0.5, [-0.08, 1.18, 0.05], [0, -0.3, 0]);
  b.colliderCyl(0.18, 0.05, [0, 0.025, 0]);
  b.colliderBox(0.1, 0.1, 1.6, [0, 0.8, 0]);
  b.colliderBox(0.4, 0.35, 0.7, [0.02, 1.1, -0.05]);
  const obj = b.finish({
    name: 'coat_rack',
    pos: [SURFACES.coatRack.x, 0, SURFACES.coatRack.z],
    mass: 6,
    material: 'wood',
    room: 'hallway',
    tags: ['furniture', 'rack'],
    grabbable: false,
  });
  shadows.add(SURFACES.coatRack.x, SURFACES.coatRack.z, 0.55, 0.55, { y: 0.004 });
  return obj;
}

function buildEntryMat(ctx) {
  const b = new Batch(ctx, 'entry_mat');
  const mat = variant(ctx, 'fabricWool', { color: 0x6d6a5f });
  b.box(mat, 0.9, 0.42, 0.016, [0, 0.008, 0]);
  b.colliderBox(0.9, 0.42, 0.016, [0, 0.008, 0]);
  return b.finish({
    name: 'entry_mat',
    pos: [SURFACES.entryMat.x, 0, SURFACES.entryMat.z],
    isStatic: true,
    material: 'fabric',
    room: 'hallway',
    tags: ['furniture', 'mat'],
    shadows: false,
  });
}

// ------------------------------------------------------------------ exports

export function buildFurniture(ctx, shadows) {
  const objects = [];
  const push = (obj) => objects.push(obj);

  push(buildSofa(ctx, shadows));
  push(buildCoffeeTable(ctx, shadows));
  push(buildRug(ctx));
  push(buildArmchair(ctx, shadows));
  push(buildBookshelf(ctx, shadows));
  push(buildFloorLamp(ctx, shadows));
  push(buildPlant(ctx, shadows));
  push(buildTvStand(ctx, shadows));
  push(buildTv(ctx));

  push(buildCounter(ctx, shadows));
  push(buildStove(ctx, shadows));
  push(buildFridge(ctx, shadows));
  push(buildDiningTable(ctx, shadows));
  push(buildChair(ctx, 'chair_1', [1.72, 0, -1.55], 0, shadows));
  push(buildChair(ctx, 'chair_2', [2.68, 0, -1.55], 0, shadows));
  push(buildChair(ctx, 'chair_3', [1.72, 0, -0.05], Math.PI, shadows));
  push(buildChair(ctx, 'chair_4', [2.68, 0, -0.05], Math.PI, shadows));
  push(buildTrashBin(ctx));

  push(buildBed(ctx, shadows));
  push(buildNightstand(ctx, shadows));
  push(buildWardrobe(ctx, shadows));
  push(buildBedsideLamp(ctx));
  push(buildLaundryBasket(ctx, shadows));
  push(buildBedroomRug(ctx));

  push(buildBathtub(ctx, shadows));
  push(buildToilet(ctx, shadows));
  push(buildVanity(ctx, shadows));
  push(buildTowelRail(ctx));
  push(buildBathMat(ctx));

  push(buildDesk(ctx, shadows));
  push(buildDeskChair(ctx, shadows));
  push(buildMonitor(ctx));
  push(buildStudyShelves(ctx, shadows));
  push(buildDeskLamp(ctx));
  push(buildCardboardBox(ctx, 'study_box_1', [5.1, 0, 1.05], 0.2, [0.42, 0.36, 0.36], 1.8));
  push(buildCardboardBox(ctx, 'study_box_2', [5.1, 0.362, 1.05], -0.12, [0.36, 0.32, 0.3], 1.2));
  push(buildCardboardBox(ctx, 'study_box_3', [5.15, 0, 1.9], 0.6, [0.34, 0.4, 0.26], 1.4));

  push(buildCoatRack(ctx, shadows));
  push(buildEntryMat(ctx));

  return objects;
}
