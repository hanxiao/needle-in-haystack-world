import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { CONFIG } from './config.js';

// Physics presets: density is only used when no explicit mass is given.
export const MATERIAL_PRESETS = {
  wood: { density: 650, friction: 0.62, restitution: 0.04 },
  woodFloor: { density: 700, friction: 0.6, restitution: 0.03 },
  fabric: { density: 120, friction: 0.9, restitution: 0.0 },
  foam: { density: 45, friction: 0.95, restitution: 0.0 },
  leather: { density: 400, friction: 0.72, restitution: 0.02 },
  metal: { density: 2700, friction: 0.45, restitution: 0.12 },
  steel: { density: 7800, friction: 0.42, restitution: 0.1 },
  glass: { density: 2500, friction: 0.3, restitution: 0.05 },
  ceramic: { density: 2400, friction: 0.5, restitution: 0.08 },
  plastic: { density: 950, friction: 0.5, restitution: 0.15 },
  paper: { density: 700, friction: 0.6, restitution: 0.0 },
  cardboard: { density: 250, friction: 0.65, restitution: 0.02 },
  stone: { density: 2600, friction: 0.8, restitution: 0.02 },
  rubber: { density: 1100, friction: 1.0, restitution: 0.35 },
  plant: { density: 300, friction: 0.8, restitution: 0.0 },
  water: { density: 1000, friction: 0.1, restitution: 0.0 },
  concrete: { density: 2300, friction: 0.75, restitution: 0.02 },
  tile: { density: 2400, friction: 0.55, restitution: 0.02 },
  mirror: { density: 2500, friction: 0.4, restitution: 0.05 },
};

const _v = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _pv = new THREE.Vector3();
const _pq = new THREE.Quaternion();

export async function createPhysics(scene) {
  await RAPIER.init();
  return new Physics(scene);
}

export class Physics {
  constructor(scene) {
    this.scene = scene;
    this.RAPIER = RAPIER;
    this.world = new RAPIER.World({ x: 0, y: CONFIG.gravity, z: 0 });
    this.world.timestep = CONFIG.fixedStep;
    this.world.numSolverIterations = 8;
    this.objects = [];
    this.dynamicObjects = [];
    this.byName = new Map();
    this.colliderToObj = new Map();
    this._initial = new Map();
    this._temp = new THREE.Vector3();
    this._temp2 = new THREE.Vector3();
    this._tempQ = new THREE.Quaternion();
    this._ray = new RAPIER.Ray({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 1 });
    this.steps = 0;
  }

  // ---------------------------------------------------------------- creation

  addObject(opts) {
    const {
      name,
      mesh,
      pos = [0, 0, 0],
      quat = [0, 0, 0, 1],
      colliders = [],
      mass,
      material = 'wood',
      static: isStatic = false,
      tags = [],
      room = '',
      grabbable,
      linearDamping = 0.12,
      angularDamping = 0.35,
      ccd = false,
      shadows = true,
    } = opts;

    if (!name) throw new Error('physics.addObject: name required');
    if (this.byName.has(name)) throw new Error(`physics.addObject: duplicate name "${name}"`);
    if (!colliders.length) throw new Error(`physics.addObject: "${name}" needs colliders`);
    if (!isStatic && !(mass > 0)) throw new Error(`physics.addObject: "${name}" needs a positive mass`);

    const preset = MATERIAL_PRESETS[material] || MATERIAL_PRESETS.wood;
    const bodyDesc = (isStatic ? RAPIER.RigidBodyDesc.fixed() : RAPIER.RigidBodyDesc.dynamic())
      .setTranslation(pos[0], pos[1], pos[2])
      .setRotation({ x: quat[0], y: quat[1], z: quat[2], w: quat[3] });
    if (!isStatic) {
      bodyDesc.setLinearDamping(linearDamping).setAngularDamping(angularDamping).setCcdEnabled(ccd);
    }
    const body = this.world.createRigidBody(bodyDesc);

    const volumes = colliders.map((c) => volumeOf(c));
    const totalVolume = volumes.reduce((a, b) => a + b, 0) || 1;
    const colliderObjs = [];
    for (let i = 0; i < colliders.length; i++) {
      const c = colliders[i];
      const desc = colliderDesc(c);
      if (!desc) continue;
      desc.setFriction(preset.friction).setRestitution(preset.restitution);
      if (c.offset) desc.setTranslation(c.offset[0], c.offset[1], c.offset[2]);
      if (c.quat) desc.setRotation({ x: c.quat[0], y: c.quat[1], z: c.quat[2], w: c.quat[3] });
      if (!isStatic && mass) desc.setMass((mass * volumes[i]) / totalVolume);
      else desc.setDensity(preset.density);
      const col = this.world.createCollider(desc, body);
      colliderObjs.push(col);
    }
    if (!colliderObjs.length) throw new Error(`physics.addObject: "${name}" produced no colliders`);

    const obj = {
      name,
      mesh: mesh || null,
      body,
      colliders: colliderObjs,
      mass: isStatic ? Infinity : mass ?? body.mass(),
      isStatic,
      tags,
      room,
      grabbable: grabbable ?? (!isStatic && (mass ?? 0) <= CONFIG.robot.maxLiftKg),
      initial: { pos: [...pos], quat: [...quat] },
    };

    if (mesh) {
      mesh.position.set(pos[0], pos[1], pos[2]);
      mesh.quaternion.set(quat[0], quat[1], quat[2], quat[3]);
      applyShadows(mesh, shadows);
      this.scene.add(mesh);
    }

    this.objects.push(obj);
    this.byName.set(name, obj);
    for (const c of colliderObjs) this.colliderToObj.set(c.handle, obj);
    if (!isStatic) {
      obj.prevPos = new THREE.Vector3(pos[0], pos[1], pos[2]);
      obj.prevQuat = new THREE.Quaternion(quat[0], quat[1], quat[2], quat[3]);
      this.dynamicObjects.push(obj);
    }
    return obj;
  }

  addStaticObject(opts) {
    return this.addObject({ ...opts, static: true });
  }

  addStaticBox({ name, size, pos, quat, material = 'wood', room = '', tags = [], shadows = true, mesh = null }) {
    return this.addStaticObject({
      name,
      mesh,
      pos,
      quat,
      colliders: [{ shape: 'box', half: [size[0] / 2, size[1] / 2, size[2] / 2] }],
      material,
      room,
      tags,
      shadows,
    });
  }

  removeObject(obj) {
    if (!obj) return;
    if (obj.mesh) this.scene.remove(obj.mesh);
    for (const c of obj.colliders) this.colliderToObj.delete(c.handle);
    this.world.removeRigidBody(obj.body);
    this.objects = this.objects.filter((o) => o !== obj);
    this.dynamicObjects = this.dynamicObjects.filter((o) => o !== obj);
    this.byName.delete(obj.name);
  }

  // ---------------------------------------------------------------- queries

  get(name) {
    return this.byName.get(name) || null;
  }

  castRay(origin, dir, maxToi = 10, exclude = null, opts = {}) {
    const o = Array.isArray(origin) ? { x: origin[0], y: origin[1], z: origin[2] } : origin;
    const d = Array.isArray(dir) ? { x: dir[0], y: dir[1], z: dir[2] } : dir;
    this._ray.origin = o;
    this._ray.dir = d;
    const handles = new Set();
    if (exclude) {
      const list = Array.isArray(exclude) ? exclude : [exclude];
      for (const obj of list) {
        if (!obj) continue;
        for (const c of obj.colliders || []) handles.add(c.handle);
      }
    }
    const staticOnly = !!opts.staticOnly;
    let predicate;
    if (handles.size || staticOnly) {
      predicate = (collider) => {
        if (handles.has(collider.handle)) return false;
        if (staticOnly) {
          const obj = this.colliderToObj.get(collider.handle);
          if (!obj || !obj.isStatic) return false;
        }
        return true;
      };
    }
    const hit = this.world.castRayAndGetNormal(
      this._ray,
      maxToi,
      true,
      undefined,
      undefined,
      undefined,
      undefined,
      predicate
    );
    if (!hit) return null;
    const obj = this.colliderToObj.get(hit.collider.handle);
    if (!obj) return null;
    const t = hit.timeOfImpact;
    return {
      obj,
      distance: t,
      point: new THREE.Vector3(o.x + d.x * t, o.y + d.y * t, o.z + d.z * t),
      normal: new THREE.Vector3(hit.normal.x, hit.normal.y, hit.normal.z),
    };
  }

  castRayFromCamera(camera, ndcX = 0, ndcY = 0, maxToi = 12, exclude = null, opts = {}) {
    const origin = camera.getWorldPosition(new THREE.Vector3());
    const target = new THREE.Vector3(ndcX, ndcY, 0.5).unproject(camera);
    const dir = target.sub(origin).normalize();
    return this.castRay(origin, dir, maxToi, exclude, opts);
  }

  setCollisionGroups(obj, groups) {
    for (const c of obj.colliders) c.setCollisionGroups(groups);
  }

  // ---------------------------------------------------------------- stepping

  step() {
    for (const obj of this.dynamicObjects) {
      const t = obj.body.translation();
      const r = obj.body.rotation();
      obj.prevPos.set(t.x, t.y, t.z);
      obj.prevQuat.set(r.x, r.y, r.z, r.w);
    }
    this.world.step();
    this.steps++;
  }

  // alpha in [0,1] between the last two fixed steps
  sync(alpha = 1) {
    for (const obj of this.dynamicObjects) {
      if (!obj.mesh) continue;
      const t = obj.body.translation();
      const r = obj.body.rotation();
      _v.set(t.x, t.y, t.z);
      _q.set(r.x, r.y, r.z, r.w);
      obj.mesh.position.lerpVectors(obj.prevPos, _v, alpha);
      obj.mesh.quaternion.slerpQuaternions(obj.prevQuat, _q, alpha);
    }
  }

  settle(steps = 90) {
    for (let i = 0; i < steps; i++) this.step();
    this.sync(1);
    this.captureInitialState();
  }

  captureInitialState() {
    this._initial.clear();
    for (const obj of this.dynamicObjects) {
      const t = obj.body.translation();
      const r = obj.body.rotation();
      this._initial.set(obj, { pos: [t.x, t.y, t.z], quat: [r.x, r.y, r.z, r.w] });
    }
  }

  resetDynamic() {
    for (const obj of this.dynamicObjects) {
      const init = this._initial.get(obj) || { pos: obj.initial.pos, quat: obj.initial.quat };
      obj.body.setTranslation({ x: init.pos[0], y: init.pos[1], z: init.pos[2] }, true);
      obj.body.setRotation({ x: init.quat[0], y: init.quat[1], z: init.quat[2], w: init.quat[3] }, true);
      obj.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
      obj.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
      obj.prevPos.set(init.pos[0], init.pos[1], init.pos[2]);
      obj.prevQuat.set(init.quat[0], init.quat[1], init.quat[2], init.quat[3]);
      obj.mesh?.position.set(init.pos[0], init.pos[1], init.pos[2]);
      obj.mesh?.quaternion.set(init.quat[0], init.quat[1], init.quat[2], init.quat[3]);
    }
  }

  stats() {
    return {
      bodies: this.world.bodies.len(),
      colliders: this.world.colliders.len(),
      dynamic: this.dynamicObjects.length,
      objects: this.objects.length,
      steps: this.steps,
    };
  }
}

// ---------------------------------------------------------------- helpers

function colliderDesc(c) {
  switch (c.shape) {
    case 'box':
      return RAPIER.ColliderDesc.cuboid(c.half[0], c.half[1], c.half[2]);
    case 'ball':
      return RAPIER.ColliderDesc.ball(c.radius);
    case 'cylinder':
      return RAPIER.ColliderDesc.cylinder(c.halfHeight, c.radius);
    case 'capsule':
      return RAPIER.ColliderDesc.capsule(c.halfHeight, c.radius);
    case 'hull': {
      const desc = RAPIER.ColliderDesc.convexHull(new Float32Array(c.points));
      return desc || null;
    }
    default:
      throw new Error(`unknown collider shape ${c.shape}`);
  }
}

function volumeOf(c) {
  switch (c.shape) {
    case 'box':
      return 8 * c.half[0] * c.half[1] * c.half[2];
    case 'ball':
      return (4 / 3) * Math.PI * c.radius ** 3;
    case 'cylinder':
      return Math.PI * c.radius ** 2 * 2 * c.halfHeight;
    case 'capsule':
      return Math.PI * c.radius ** 2 * 2 * c.halfHeight + (4 / 3) * Math.PI * c.radius ** 3;
    case 'hull': {
      let minX = Infinity, minY = Infinity, minZ = Infinity, maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
      for (let i = 0; i < c.points.length; i += 3) {
        minX = Math.min(minX, c.points[i]); maxX = Math.max(maxX, c.points[i]);
        minY = Math.min(minY, c.points[i + 1]); maxY = Math.max(maxY, c.points[i + 1]);
        minZ = Math.min(minZ, c.points[i + 2]); maxZ = Math.max(maxZ, c.points[i + 2]);
      }
      return Math.max(1e-6, (maxX - minX) * (maxY - minY) * (maxZ - minZ) * 0.55);
    }
    default:
      return 1;
  }
}

function applyShadows(root, enabled) {
  root.traverse((o) => {
    if (!o.isMesh) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    const transparent = mats.some((m) => m && m.transparent);
    o.castShadow = enabled && !transparent;
    o.receiveShadow = enabled;
  });
}
