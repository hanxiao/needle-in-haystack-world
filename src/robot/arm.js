// Two-link arm with telescoping wrist, driven by analytic IK.
// The gripper is a kinematic-position Rapier body that follows the IK solution;
// grabbing creates a fixed joint between it and the object's dynamic body.
import * as THREE from 'three';
import { GROUPS } from './groups.js';
import { ROBOT_DIMS } from './model.js';

const L1 = ROBOT_DIMS.armL1; // upper arm
const L2 = ROBOT_DIMS.armL2; // forearm (visual)
const GRIP_OFFSET = 0.04; // pinch point beyond the wrist
const L2_EFF = L2 + GRIP_OFFSET; // second IK bone, wrist + pinch point
const FULL_REACH = L1 + L2_EFF;
const MAX_EXT = ROBOT_DIMS.maxExtension;
const MIN_TARGET = 0.09;
const MAX_POS_ERR = 0.18; // joint drift correction threshold (m)

const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const _c = new THREE.Vector3();
const _q1 = new THREE.Quaternion();
const _q2 = new THREE.Quaternion();
const _q3 = new THREE.Quaternion();

export function createArm({ ctx, model, group, reach = 0.62, maxLiftKg = 2.5 }) {
  const physics = ctx.physics;
  const world = physics.world;
  const RAPIER = physics.RAPIER;
  if (!world || !RAPIER) throw new Error('createArm: ctx.physics missing world/RAPIER');

  const parts = model.arm;
  const shoulderLocal = ROBOT_DIMS.shoulder.clone();
  const parkLocal = ROBOT_DIMS.park.clone();

  // Hidden anchor at the pinch point; the physics gripper body tracks it.
  const anchor = new THREE.Object3D();
  anchor.name = 'robot_gripper_anchor';
  anchor.position.set(0, 0, GRIP_OFFSET);
  parts.gripper.add(anchor);

  group.add(parts.root);
  group.updateMatrixWorld(true);

  const gw = new THREE.Vector3();
  const gq = new THREE.Quaternion();
  anchor.getWorldPosition(gw);
  anchor.getWorldQuaternion(gq);

  const gripperBody = world.createRigidBody(
    RAPIER.RigidBodyDesc.kinematicPositionBased()
      .setTranslation(gw.x, gw.y, gw.z)
      .setRotation({ x: gq.x, y: gq.y, z: gq.z, w: gq.w })
  );
  const gripperCollider = world.createCollider(
    RAPIER.ColliderDesc.ball(0.032).setSensor(true).setCollisionGroups(GROUPS.gripper),
    gripperBody
  );

  const state = {
    held: null,
    joint: null,
    savedGroups: [],
    relPos: new THREE.Vector3(),
    relQuat: new THREE.Quaternion(),
    frozenLocal: new THREE.Vector3(),
    gripX: 0.038,
    targetLocal: new THREE.Vector3(),
    targetWorld: new THREE.Vector3(),
    yawBase: 0,
    t1: 0,
    t2: 0,
    ext: 0,
    lastAim: new THREE.Vector3(),
    lastAimValid: false,
  };

  // ---------------------------------------------------------------- IK

  // Solve IK in robot-local space. Mutates nothing; returns joint angles.
  function solve(localTarget) {
    const dx0 = localTarget.x - shoulderLocal.x;
    const dy0 = localTarget.y - shoulderLocal.y;
    const dz0 = localTarget.z - shoulderLocal.z;
    let d = Math.hypot(dx0, dy0, dz0);
    let dx = dx0;
    let dy = dy0;
    let dz = dz0;
    if (!Number.isFinite(d) || d < 1e-4) {
      // Degenerate: target sits on the shoulder. Point the arm forward/down.
      dx = 0;
      dy = -0.08;
      dz = -0.24;
      d = Math.hypot(dx, dy, dz);
    }
    const clamped = Math.min(Math.max(d, MIN_TARGET), reach);
    const scale = clamped / d;
    dx *= scale;
    dy *= scale;
    dz *= scale;
    d = clamped;

    const h = Math.hypot(dx, dz);
    const yawBase = h > 1e-5 ? Math.atan2(dx, dz) : 0;
    const phi = Math.atan2(dy, h);

    let t1;
    let t2;
    let ext = 0;
    if (d <= FULL_REACH - 1e-4) {
      const cosA = (L1 * L1 + d * d - L2_EFF * L2_EFF) / (2 * L1 * d);
      const A = Math.acos(Math.min(1, Math.max(-1, cosA)));
      t1 = phi + A; // elbow-up
      const eu = L1 * Math.cos(t1);
      const ev = L1 * Math.sin(t1);
      t2 = Math.atan2(dy - ev, h - eu);
    } else {
      t1 = phi;
      t2 = phi;
      ext = Math.min(d - FULL_REACH, MAX_EXT);
    }
    if (!Number.isFinite(t1)) t1 = phi;
    if (!Number.isFinite(t2)) t2 = phi;

    return {
      yawBase,
      t1,
      t2,
      ext,
      // Clamped target back in robot-local space.
      clampedLocal: new THREE.Vector3(
        shoulderLocal.x + dx,
        shoulderLocal.y + dy,
        shoulderLocal.z + dz
      ),
      distance: d,
    };
  }

  function applyPose(sol) {
    state.yawBase = sol.yawBase;
    state.t1 = sol.t1;
    state.t2 = sol.t2;
    state.ext = sol.ext;
    state.targetLocal.copy(sol.clampedLocal);
    parts.root.rotation.y = sol.yawBase;
    parts.upper.rotation.x = -sol.t1;
    parts.forearm.rotation.x = -(sol.t2 - sol.t1);
    parts.setExtension(sol.ext);
  }

  // Solve for a world-space point and apply the pose.
  function solveWorld(pointWorld) {
    const local = _a.copy(pointWorld);
    group.worldToLocal(local);
    const sol = solve(local);
    applyPose(sol);
    state.targetWorld.copy(sol.clampedLocal).applyMatrix4(group.matrixWorld);
    return sol;
  }

  function readGripperPose() {
    group.updateMatrixWorld(true);
    anchor.getWorldPosition(gw);
    anchor.getWorldQuaternion(gq);
    return { pos: gw, quat: gq };
  }

  function writeGripperBody(immediate) {
    const { pos, quat } = readGripperPose();
    const t = { x: pos.x, y: pos.y, z: pos.z };
    const r = { x: quat.x, y: quat.y, z: quat.z, w: quat.w };
    if (immediate) {
      gripperBody.setTranslation(t, true);
      gripperBody.setRotation(r, true);
    }
    gripperBody.setNextKinematicTranslation(t);
    gripperBody.setNextKinematicRotation(r);
  }

  // ---------------------------------------------------------------- update

  function update(dt, aim) {
    // Choose target: frozen carry pose > aim point > parked pose.
    if (state.held) {
      _b.copy(state.frozenLocal).applyMatrix4(group.matrixWorld);
      solveWorld(_b);
    } else if (aim && Number.isFinite(aim.x) && Number.isFinite(aim.y) && Number.isFinite(aim.z)) {
      state.lastAim.copy(aim);
      state.lastAimValid = true;
      solveWorld(aim);
    } else {
      _b.copy(parkLocal).applyMatrix4(group.matrixWorld);
      solveWorld(_b);
    }

    if (state.held) parts.setGripX(state.gripX);
    else parts.setGrip(1);
    writeGripperBody(false);
    guardHeldObject();
  }

  // If the solver ever loses the held object (e.g. it was blocked by geometry),
  // snap it back to the joint frame instead of letting it drift away.
  function guardHeldObject() {
    const obj = state.held;
    if (!obj) return;
    let valid = true;
    try {
      valid = !!(obj.body && (typeof obj.body.isValid !== 'function' || obj.body.isValid()));
    } catch {
      valid = false;
    }
    if (!valid) {
      // The object was removed from the physics world behind our back.
      state.held = null;
      state.joint = null;
      state.savedGroups = [];
      parts.setGrip(1);
      return;
    }
    try {
      if (state.joint && typeof state.joint.isValid === 'function' && !state.joint.isValid()) {
        clearHeld();
        return;
      }
    } catch {
      /* ignore */
    }
    const gt = gripperBody.translation();
    const gr = gripperBody.rotation();
    _q1.set(gr.x, gr.y, gr.z, gr.w);
    _a.copy(state.relPos).applyQuaternion(_q1).add(_b.set(gt.x, gt.y, gt.z));
    const t = obj.body.translation();
    const err = Math.hypot(t.x - _a.x, t.y - _a.y, t.z - _a.z);
    if (!Number.isFinite(err) || err > MAX_POS_ERR) {
      const q = _q2.copy(_q1).multiply(state.relQuat);
      obj.body.setTranslation({ x: _a.x, y: _a.y, z: _a.z }, true);
      obj.body.setRotation({ x: q.x, y: q.y, z: q.z, w: q.w }, true);
      obj.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
      obj.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
    }
  }

  // ---------------------------------------------------------------- grasp

  function grab(obj) {
    if (!obj || !obj.body) return { ok: false, reason: 'invalid' };
    if (state.held) return { ok: false, reason: 'busy' };
    const body = obj.body;
    const isStatic = obj.isStatic === true || (typeof body.isDynamic === 'function' && !body.isDynamic());
    if (isStatic) return { ok: false, reason: 'static' };

    let mass = obj.mass;
    if (!(mass >= 0)) {
      try {
        mass = body.mass();
      } catch {
        mass = 0;
      }
    }
    if (!(mass <= maxLiftKg + 1e-9)) return { ok: false, reason: 'too_heavy' };
    if (obj.grabbable === false) return { ok: false, reason: 'not_grabbable' };

    const t = body.translation();
    const objPos = _c.set(t.x, t.y, t.z);
    const shoulder = shoulderWorld(_a);
    const distance = shoulder.distanceTo(objPos);
    if (!Number.isFinite(distance) || distance > reach + 0.05) {
      return { ok: false, reason: 'out_of_reach' };
    }

    // Snap the arm onto the object so the gripper physically reaches it.
    const sol = solveWorld(objPos);
    writeGripperBody(true);

    // Freeze the carry target in robot-local space.
    state.frozenLocal.copy(sol.clampedLocal);

    // Anchor the fixed joint at the current relative pose.
    const gt = gripperBody.translation();
    const gr = gripperBody.rotation();
    _q1.set(gr.x, gr.y, gr.z, gr.w);
    _q2.copy(_q1).invert();
    state.relPos.copy(objPos).sub(_b.set(gt.x, gt.y, gt.z)).applyQuaternion(_q2);
    const objQuat = body.rotation();
    _q3.set(objQuat.x, objQuat.y, objQuat.z, objQuat.w);
    state.relQuat.copy(_q2).multiply(_q3);

    const jointData = RAPIER.JointData.fixed(
      { x: state.relPos.x, y: state.relPos.y, z: state.relPos.z },
      { x: state.relQuat.x, y: state.relQuat.y, z: state.relQuat.z, w: state.relQuat.w },
      { x: 0, y: 0, z: 0 },
      { x: 0, y: 0, z: 0, w: 1 }
    );
    let joint = null;
    try {
      joint = world.createImpulseJoint(jointData, gripperBody, body, true);
    } catch {
      return { ok: false, reason: 'joint_failed' };
    }

    // Stop robot <-> held collisions, remember the original groups.
    state.savedGroups = [];
    for (const collider of obj.colliders || []) {
      try {
        state.savedGroups.push({ collider, groups: collider.collisionGroups() });
        collider.setCollisionGroups(GROUPS.held);
      } catch {
        /* ignore */
      }
    }

    body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    body.setAngvel({ x: 0, y: 0, z: 0 }, true);
    try {
      body.wakeUp();
    } catch {
      /* ignore */
    }

    state.held = obj;
    state.joint = joint;
    state.gripX = measureGripWidth(obj);
    parts.setGripX(state.gripX);
    return { ok: true };
  }

  // Finger opening just wide enough to straddle the held object.
  function measureGripWidth(obj) {
    let half = 0.03;
    try {
      if (obj.mesh) {
        const box = new THREE.Box3().setFromObject(obj.mesh);
        const size = box.getSize(_b);
        half = Math.max(size.x, size.z) * 0.5;
      }
    } catch {
      /* fall back to default */
    }
    return Math.max(0.024, Math.min(0.05, half + 0.009));
  }

  // Hard-place the held object at the joint frame (used after teleports).
  function snapHeldToGripper() {
    const obj = state.held;
    if (!obj || !obj.body) return;
    const gt = gripperBody.translation();
    const gr = gripperBody.rotation();
    _q1.set(gr.x, gr.y, gr.z, gr.w);
    _a.copy(state.relPos).applyQuaternion(_q1).add(_b.set(gt.x, gt.y, gt.z));
    const q = _q2.copy(_q1).multiply(state.relQuat);
    obj.body.setTranslation({ x: _a.x, y: _a.y, z: _a.z }, true);
    obj.body.setRotation({ x: q.x, y: q.y, z: q.z, w: q.w }, true);
    obj.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    obj.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
  }

  // Forget the held object (e.g. it was removed from the physics world).
  function clearHeld() {
    for (const rec of state.savedGroups) {
      try {
        rec.collider.setCollisionGroups(rec.groups);
      } catch {
        /* ignore */
      }
    }
    state.savedGroups = [];
    state.joint = null;
    state.held = null;
    parts.setGrip(1);
  }

  function release() {
    const obj = state.held;
    if (!obj) return false;
    if (state.joint) {
      try {
        world.removeImpulseJoint(state.joint, true);
      } catch {
        /* ignore */
      }
      state.joint = null;
    }
    for (const rec of state.savedGroups) {
      try {
        rec.collider.setCollisionGroups(rec.groups);
      } catch {
        /* ignore */
      }
    }
    state.savedGroups = [];
    try {
      obj.body.wakeUp();
    } catch {
      /* ignore */
    }
    state.held = null;
    parts.setGrip(1);
    return true;
  }

  // ---------------------------------------------------------------- queries

  function shoulderWorld(out = new THREE.Vector3()) {
    return out.copy(shoulderLocal).applyMatrix4(group.matrixWorld);
  }

  function canReach(point) {
    if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y) || !Number.isFinite(point.z)) return false;
    const s = shoulderWorld(_a);
    const d = Math.hypot(point.x - s.x, point.y - s.y, point.z - s.z);
    return Number.isFinite(d) && d <= reach + 0.05 && d >= 0.04;
  }

  function getGripperPose(pos = new THREE.Vector3(), quat = new THREE.Quaternion()) {
    group.updateMatrixWorld(true);
    anchor.getWorldPosition(pos);
    anchor.getWorldQuaternion(quat);
    return { pos, quat };
  }

  function sync() {
    // Used after teleports: park or freeze the arm, then hard-set the body pose.
    const target = state.held ? state.frozenLocal : parkLocal;
    const worldPoint = _b.copy(target).applyMatrix4(group.matrixWorld);
    solveWorld(worldPoint);
    writeGripperBody(true);
  }

  function reset() {
    release();
    state.frozenLocal.copy(parkLocal);
    sync();
    parts.setGrip(1);
  }

  // Keep the gripper body parked at the initial pose until the first update.
  writeGripperBody(true);

  return {
    maxLiftKg,
    reach,
    get held() {
      return state.held;
    },
    get joint() {
      return state.joint;
    },
    get extension() {
      return state.ext;
    },
    get angles() {
      return { yawBase: state.yawBase, t1: state.t1, t2: state.t2 };
    },
    get gripperBody() {
      return gripperBody;
    },
    get gripperCollider() {
      return gripperCollider;
    },
    targetLocal: state.targetLocal,
    targetWorld: state.targetWorld,
    update,
    grab,
    release,
    canReach,
    getGripperPose,
    shoulderWorld,
    snapHeldToGripper,
    sync,
    reset,
    solve,
  };
}
