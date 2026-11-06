// Shared geometry / batching / placement helpers for the apartment world.
// Everything here is procedural: boxes, cylinders, lathes and extruded shapes.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { CONFIG } from '../core/config.js';

export const APT = CONFIG.apartment;
export const CEIL_H = APT.ceiling;
export const WALL_T = APT.wall;

// Outer shell (wall centre lines) and clear interior extents.
export const OUT = Object.freeze({
  minX: APT.minX,
  maxX: APT.maxX,
  minZ: APT.minZ,
  maxZ: APT.maxZ,
});
export const IN = Object.freeze({
  minX: APT.minX + WALL_T / 2,
  maxX: APT.maxX - WALL_T / 2,
  minZ: APT.minZ + WALL_T / 2,
  maxZ: APT.maxZ - WALL_T / 2,
});

// Interior partition wall centre lines.
export const PART = Object.freeze({
  livingKitchenX: 0.2,
  bedroomHallX: -1.4,
  hallBathX: 0.6,
  bathStudyX: 2.8,
  frontBackZ: 0.7,
});

const h = (v) => v + WALL_T / 2;
const l = (v) => v - WALL_T / 2;

// Room boxes for HUD / QA. y is the vertical centre used for labels.
export const ROOMS = [
  {
    id: 'living',
    label: 'LIVING ROOM',
    bounds: { minX: IN.minX, maxX: l(PART.livingKitchenX), minZ: IN.minZ, maxZ: l(PART.frontBackZ) },
  },
  {
    id: 'kitchen',
    label: 'KITCHEN / DINING',
    bounds: { minX: h(PART.livingKitchenX), maxX: IN.maxX, minZ: IN.minZ, maxZ: l(PART.frontBackZ) },
  },
  {
    id: 'bedroom',
    label: 'BEDROOM',
    bounds: { minX: IN.minX, maxX: l(PART.bedroomHallX), minZ: h(PART.frontBackZ), maxZ: IN.maxZ },
  },
  {
    id: 'hallway',
    label: 'HALLWAY',
    bounds: { minX: h(PART.bedroomHallX), maxX: l(PART.hallBathX), minZ: h(PART.frontBackZ), maxZ: IN.maxZ },
  },
  {
    id: 'bathroom',
    label: 'BATHROOM',
    bounds: { minX: h(PART.hallBathX), maxX: l(PART.bathStudyX), minZ: h(PART.frontBackZ), maxZ: IN.maxZ },
  },
  {
    id: 'study',
    label: 'STUDY',
    bounds: { minX: h(PART.bathStudyX), maxX: IN.maxX, minZ: h(PART.frontBackZ), maxZ: IN.maxZ },
  },
].map((room) => {
  const lamp = (CONFIG.rooms || []).find((r) => r.id === room.id);
  const cx = (room.bounds.minX + room.bounds.maxX) / 2;
  const cz = (room.bounds.minZ + room.bounds.maxZ) / 2;
  return { ...room, center: lamp ? [lamp.lamp[0], 1.3, lamp.lamp[2]] : [cx, 1.3, cz] };
});

export function roomAt(x, z) {
  for (const room of ROOMS) {
    const b = room.bounds;
    if (x >= b.minX && x <= b.maxX && z >= b.minZ && z <= b.maxZ) return room.id;
  }
  return '';
}

export function clamp(v, a, b) {
  return v < a ? a : v > b ? b : v;
}

// Deterministic RNG so the mess is identical every load (QA friendly).
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function matOf(ctx, m) {
  return typeof m === 'string' ? ctx.materials.get(m) : m;
}

export function variant(ctx, name, overrides) {
  return ctx.materials.variant(name, overrides);
}

// ------------------------------------------------------------------ geometry

const _m4 = new THREE.Matrix4();
const _quat = new THREE.Quaternion();
const _euler = new THREE.Euler();
const _pos = new THREE.Vector3();
const _one = new THREE.Vector3(1, 1, 1);

export function transformGeo(geo, { pos = [0, 0, 0], rot = [0, 0, 0], quat = null, scale = null } = {}) {
  if (scale) geo.scale(scale[0], scale[1], scale[2]);
  if (quat) _quat.set(quat[0], quat[1], quat[2], quat[3]);
  else _quat.setFromEuler(_euler.set(rot[0], rot[1], rot[2], 'XYZ'));
  _m4.compose(_pos.set(pos[0], pos[1], pos[2]), _quat, _one);
  geo.applyMatrix4(_m4);
  return geo;
}

export function scaleUV(geo, su, sv) {
  const uv = geo.attributes.uv;
  if (!uv) return geo;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv);
  uv.needsUpdate = true;
  return geo;
}

export function gBox(w, d, hgt, pos = [0, 0, 0], rot = [0, 0, 0]) {
  // NOTE argument order is (width, depth, height) — y is height everywhere in this world.
  return transformGeo(new THREE.BoxGeometry(w, hgt, d), { pos, rot });
}

export function gCyl(rTop, rBot, hgt, pos = [0, 0, 0], rot = [0, 0, 0], seg = 14, open = false) {
  return transformGeo(new THREE.CylinderGeometry(rTop, rBot, hgt, seg, 1, open), { pos, rot });
}

export function gSphere(radius, pos = [0, 0, 0], seg = 10) {
  return transformGeo(new THREE.SphereGeometry(radius, seg, Math.max(6, seg >> 1)), { pos });
}

export function gLathe(points, pos = [0, 0, 0], rot = [0, 0, 0], seg = 20) {
  const pts = points.map((p) => new THREE.Vector2(p[0], p[1]));
  return transformGeo(new THREE.LatheGeometry(pts, seg), { pos, rot });
}

export function gTorus(radius, tube, pos = [0, 0, 0], rot = [0, 0, 0], arc = Math.PI * 2, radSeg = 6, tubSeg = 16) {
  return transformGeo(new THREE.TorusGeometry(radius, tube, radSeg, tubSeg, arc), { pos, rot });
}

export function gPlane(w, d, pos = [0, 0, 0], rot = [0, 0, 0]) {
  return transformGeo(new THREE.PlaneGeometry(w, d), { pos, rot });
}

export function gExtrude(shape, depth, pos = [0, 0, 0], rot = [0, 0, 0], bevel = 0) {
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: bevel > 0,
    bevelSize: bevel,
    bevelThickness: bevel,
    bevelSegments: 1,
    curveSegments: 6,
  });
  return transformGeo(geo, { pos, rot });
}

// Make a geometry safe for mergeGeometries (non-indexed, position/normal/uv only).
function prepGeo(geo) {
  let g = geo;
  if (g.index) g = g.toNonIndexed();
  for (const key of Object.keys(g.attributes)) {
    if (key !== 'position' && key !== 'normal' && key !== 'uv') g.deleteAttribute(key);
  }
  if (!g.attributes.normal) g.computeVertexNormals();
  if (!g.attributes.uv) {
    const n = g.attributes.position.count;
    g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(n * 2), 2));
  }
  g.clearGroups();
  return g;
}

function mergeSafe(geos) {
  if (geos.length === 1) return geos[0];
  const merged = mergeGeometries(geos, false);
  if (merged) return merged;
  // Defensive fallback: merge in halves.
  if (geos.length > 2) {
    const mid = geos.length >> 1;
    return mergeGeometries([mergeSafe(geos.slice(0, mid)), mergeSafe(geos.slice(mid))], false) || geos[0];
  }
  return geos[0];
}

// ------------------------------------------------------------------- batching

/**
 * Accumulates geometry grouped by material, then builds one merged mesh per
 * material. Two uses:
 *  - static shell chunks: build in world space, finish({ recenter:false })
 *  - furniture / clutter: build in local space (y=0 is the bottom, x/z centred
 *    on the object), finish() re-centres the geometry on the body origin.
 */
export class Batch {
  constructor(ctx, name, opts = {}) {
    this.ctx = ctx;
    this.name = name;
    this.opts = opts;
    this.parts = new Map(); // material.uuid -> { material, geos: [] }
    this.cols = [];
    this.extraMeshes = [];
  }

  add(m, geo) {
    const material = matOf(this.ctx, m);
    const key = material.uuid;
    let slot = this.parts.get(key);
    if (!slot) {
      slot = { material, geos: [] };
      this.parts.set(key, slot);
    }
    slot.geos.push(prepGeo(geo));
    return this;
  }

  box(m, w, d, hgt, pos = [0, 0, 0], rot = [0, 0, 0]) {
    return this.add(m, gBox(w, d, hgt, pos, rot));
  }

  cyl(m, rTop, rBot, hgt, pos = [0, 0, 0], rot = [0, 0, 0], seg = 14, open = false) {
    return this.add(m, gCyl(rTop, rBot, hgt, pos, rot, seg, open));
  }

  sphere(m, radius, pos = [0, 0, 0], seg = 10) {
    return this.add(m, gSphere(radius, pos, seg));
  }

  lathe(m, points, pos = [0, 0, 0], rot = [0, 0, 0], seg = 20) {
    return this.add(m, gLathe(points, pos, rot, seg));
  }

  torus(m, radius, tube, pos = [0, 0, 0], rot = [0, 0, 0], arc = Math.PI * 2, radSeg = 6, tubSeg = 16) {
    return this.add(m, gTorus(radius, tube, pos, rot, arc, radSeg, tubSeg));
  }

  plane(m, w, d, pos = [0, 0, 0], rot = [0, 0, 0]) {
    return this.add(m, gPlane(w, d, pos, rot));
  }

  // ---------------------------------------------------------------- colliders
  colliderBox(w, d, hgt, pos = [0, 0, 0], quat = null) {
    this.cols.push({ shape: 'box', half: [w / 2, hgt / 2, d / 2], offset: [...pos], ...(quat ? { quat } : {}) });
    return this;
  }

  colliderBoxH(half, pos = [0, 0, 0], quat = null) {
    this.cols.push({ shape: 'box', half: [...half], offset: [...pos], ...(quat ? { quat } : {}) });
    return this;
  }

  colliderCyl(radius, hgt, pos = [0, 0, 0], quat = null) {
    this.cols.push({ shape: 'cylinder', radius, halfHeight: hgt / 2, offset: [...pos], ...(quat ? { quat } : {}) });
    return this;
  }

  colliderBall(radius, pos = [0, 0, 0]) {
    this.cols.push({ shape: 'ball', radius, offset: [...pos] });
    return this;
  }

  // ------------------------------------------------------------------- build
  buildGroup(shift = null) {
    const group = new THREE.Group();
    group.name = this.name;
    for (const { material, geos } of this.parts.values()) {
      const merged = mergeSafe(geos);
      const geo = shift ? merged.clone().translate(-shift.x, -shift.y, -shift.z) : merged;
      if (geo !== merged) merged.dispose();
      const mesh = new THREE.Mesh(geo, material);
      mesh.name = `${this.name}:${material.name || material.uuid.slice(0, 6)}`;
      group.add(mesh);
    }
    return group;
  }

  /**
   * finish({ pos, yaw, quat, ... }) — pos is the world position of the object's
   * local origin (for furniture that means the bottom-centre point on the floor).
   */
  finish(opts = {}) {
    const {
      name = this.name,
      pos = [0, 0, 0],
      yaw = 0,
      quat = null,
      mass,
      material = 'wood',
      isStatic = false,
      room = '',
      tags = [],
      grabbable,
      shadows = true,
      recenter = true,
      linearDamping,
      angularDamping,
      ccd,
    } = opts;

    const q = quat
      ? new THREE.Quaternion(quat[0], quat[1], quat[2], quat[3]).normalize()
      : new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw, 0));

    const raw = this.buildGroup();
    const box3 = new THREE.Box3().setFromObject(raw);
    const center = recenter ? box3.getCenter(new THREE.Vector3()) : new THREE.Vector3();
    if (!Number.isFinite(center.x)) center.set(0, 0, 0);
    raw.traverse((o) => {
      if (o.isMesh) o.geometry.translate(-center.x, -center.y, -center.z);
    });

    const offset = center.clone().applyQuaternion(q);
    const bodyPos = [pos[0] + offset.x, pos[1] + offset.y, pos[2] + offset.z];

    const colliders = this.cols.map((c) => {
      const o = c.offset || [0, 0, 0];
      return { ...c, offset: [o[0] - center.x, o[1] - center.y, o[2] - center.z] };
    });
    if (!colliders.length) {
      colliders.push({ shape: 'box', half: [0.05, 0.05, 0.05], offset: [0, 0, 0] });
    }

    const call = isStatic ? this.ctx.physics.addStaticObject.bind(this.ctx.physics) : this.ctx.physics.addObject.bind(this.ctx.physics);
    const obj = call({
      name,
      mesh: raw,
      pos: bodyPos,
      quat: [q.x, q.y, q.z, q.w],
      colliders,
      mass,
      material,
      room,
      tags,
      grabbable,
      shadows,
      ...(linearDamping !== undefined ? { linearDamping } : {}),
      ...(angularDamping !== undefined ? { angularDamping } : {}),
      ...(ccd !== undefined ? { ccd } : {}),
    });
    return obj;
  }
}

// Convenience for small clutter: build parts in local space centred on the body
// origin and register directly.
export function makeObj(ctx, opts) {
  const {
    name,
    parts = [],
    colliders = [],
    pos = [0, 0, 0],
    quat = [0, 0, 0, 1],
    mass,
    material = 'wood',
    room = '',
    tags = [],
    grabbable,
    shadows = true,
    isStatic = false,
    linearDamping,
    angularDamping,
    ccd,
  } = opts;
  const batch = new Batch(ctx, name);
  for (const [m, geo] of parts) batch.add(m, geo);
  for (const c of colliders) batch.cols.push(c);
  return batch.finish({
    name,
    pos,
    quat,
    mass,
    material,
    isStatic,
    room,
    tags,
    grabbable,
    shadows,
    recenter: false,
    linearDamping,
    angularDamping,
    ccd,
  });
}

// -------------------------------------------------------------- contact shadow

export function createShadowMaterial() {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(64, 64, 2, 64, 64, 62);
  grd.addColorStop(0, 'rgba(0,0,0,0.62)');
  grd.addColorStop(0.35, 'rgba(0,0,0,0.4)');
  grd.addColorStop(0.72, 'rgba(0,0,0,0.12)');
  grd.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return new THREE.MeshBasicMaterial({
    map: tex,
    transparent: true,
    opacity: 0.72,
    depthWrite: false,
    toneMapped: false,
  });
}

/** Collects soft blobs and merges them into a single transparent mesh. */
export class ContactShadows {
  constructor(ctx) {
    this.ctx = ctx;
    this.geos = [];
    this.material = createShadowMaterial();
  }

  add(x, z, w, d, { y = 0.005, rot = 0, opacity = 1 } = {}) {
    const geo = gPlane(w, d, [x, y, z], [-Math.PI / 2, 0, rot]);
    if (opacity !== 1) {
      // bake strength into vertex alpha via colour attribute (RGB only here)
      const n = geo.attributes.position.count;
      const col = new Float32Array(n * 3).fill(opacity);
      geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    }
    this.geos.push(prepGeo(geo));
    return this;
  }

  build() {
    if (!this.geos.length) return null;
    const geo = mergeSafe(this.geos);
    const mesh = new THREE.Mesh(geo, this.material);
    mesh.name = 'contact_shadows';
    mesh.renderOrder = 2;
    mesh.frustumCulled = false;
    this.ctx.scene.add(mesh);
    return mesh;
  }
}

// -------------------------------------------------------------------- colours

export const C = {
  wallWarm: 0xece7dd,
  wallLiving: 0xe4ded2,
  wallBedroom: 0xdcd7cb,
  wallKitchen: 0xe7e2d6,
  wallBath: 0xdfe6e2,
  wallStudy: 0xded8cd,
  accentSage: 0x77836f,
  accentClay: 0xb0715a,
  accentNavy: 0x3e4a5c,
  woodOak: 0xa87a52,
  woodWalnut: 0x6e4a33,
  fabricGrey: 0x8b8f86,
  fabricMustard: 0xb08a4c,
  fabricRust: 0xa5614a,
  fabricCream: 0xd8d1c1,
  fabricSage: 0x88937f,
  ceramicBlue: 0x7c93a3,
  ceramicSage: 0x9aa892,
  ceramicClay: 0xb06a4e,
};
