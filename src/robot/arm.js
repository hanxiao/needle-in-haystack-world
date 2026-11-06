// 3-DOF arm (Dobot Magician class): base yaw ±120°, shoulder −5..90°, elbow −15..90°,
// 150 mm upper + 150 mm forearm + 45 mm gripper, 0.5 kg payload, 0.34 m reach.
// The gripper is a kinematic-position Rapier body driven to the IK solution; grabbing
// creates a fixed joint between it and the object's dynamic body.
import * as THREE from 'three';
import { GROUPS } from './groups.js';
import { ROBOT_DIMS } from './model.js';

const L1 = ROBOT_DIMS.armL1;
const L2 = ROBOT_DIMS.armL2;
const GRIP_LEN = ROBOT_DIMS.gripperLen;
const L2E = L2 + GRIP_LEN; // second IK bone reaches the pinch point
const DEG = Math.PI / 180;
const BASE_LIMIT = ROBOT_DIMS.baseYawLimit;
const Q2_MIN = ROBOT_DIMS.shoulderMin;
const Q2_MAX = ROBOT_DIMS.shoulderMax;
const Q3_MIN = ROBOT_DIMS.elbowMin;
const Q3_MAX = ROBOT_DIMS.elbowMax;
const JOINT_SPEED = ROBOT_DIMS.jointSpeed; // rad/s
const MAX_POS_ERR = 0.16; // joint drift correction threshold (m)
const CARRY_LIFT = 0.045; // m — visible pick-up lift after the joint is created
const CARRY_CLEAR_RADIUS = 0.05; // m — probe radius keeping the carried object out of furniture
const CARRY_AIM_BAND = 0.35; // m — aim heights within this of the object's grab height drive the carry
const CARRY_AIM_MAX = 0.28; // m — maximum carry height change from the aim
const REACH_TOLERANCE = 0.02; // m — canReach/grab slack on top of the 0.34 m spec

const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const _c = new THREE.Vector3();
const _q1 = new THREE.Quaternion();
const _q2 = new THREE.Quaternion();
const _q3 = new THREE.Quaternion();
const _ca = new THREE.Vector3();
const _cb = new THREE.Vector3();
const _cc = new THREE.Vector3();
const _cd = new THREE.Vector3();

function clamp(v, a, b) {
  return Math.min(b, Math.max(a, v));
}

function wrapAngle(a) {
  let x = a;
  while (x > Math.PI) x -= Math.PI * 2;
  while (x < -Math.PI) x += Math.PI * 2;
  return x;
}

export function createArm({ ctx, model, group, body = null, reach = ROBOT_DIMS.reach, maxLiftKg = 0.5 }) {
  const physics = ctx.physics;
  const world = physics.world;
  const RAPIER = physics.RAPIER;
  if (!world || !RAPIER) throw new Error('createArm: ctx.physics missing world/RAPIER');

  const parts = model.arm;
  const shoulderLocal = ROBOT_DIMS.shoulder.clone();

  // Hidden anchor at the pinch point; the physics gripper body tracks it.
  const anchor = new THREE.Object3D();
  anchor.name = 'robot_gripper_anchor';
  anchor.position.set(0, 0, GRIP_LEN);
  parts.gripper.add(anchor);

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
  const carryClearShape = new RAPIER.Ball(CARRY_CLEAR_RADIUS);
  const IDENT_ROT = { x: 0, y: 0, z: 0, w: 1 };

  const gripperCollider = world.createCollider(
    RAPIER.ColliderDesc.ball(0.028).setSensor(true).setCollisionGroups(GROUPS.gripper),
    gripperBody
  );

  const state = {
    held: null,
    joint: null,
    savedGroups: [],
    relPos: new THREE.Vector3(),
    relQuat: new THREE.Quaternion(),
    frozenLocal: new THREE.Vector3(),
    carryBase: new THREE.Vector3(),
    objGrabLocalY: 0,
    carryAimDelta: 0,
    time: 0,
    lastAimLocal: new THREE.Vector3(),
    lastAimValid: false,
    targetLocal: new THREE.Vector3(),
    targetWorld: new THREE.Vector3(),
    // current (rate-limited) joint angles
    baseYaw: Math.PI,
    q2: ROBOT_DIMS.park.shoulder,
    q3: ROBOT_DIMS.park.elbow,
    target: { baseYaw: Math.PI, q2: ROBOT_DIMS.park.shoulder, q3: ROBOT_DIMS.park.elbow },
    gripX: ROBOT_DIMS.gripOpen,
  };

  // ---------------------------------------------------------------- IK

  // End-effector position (in the arm plane) for a pair of joint angles.
  function endPos(q2, q3, out) {
    out.u = L1 * Math.cos(q2) + L2E * Math.cos(q2 + q3);
    out.v = L1 * Math.sin(q2) + L2E * Math.sin(q2 + q3);
    return out;
  }

  const _e = { u: 0, v: 0 };

  // Solve IK for a robot-local point. Returns target joint angles.
  function solve(local) {
    const dx = local.x - shoulderLocal.x;
    const dy = local.y - shoulderLocal.y;
    const dz = local.z - shoulderLocal.z;

    // Base yaw: 0 rad points the arm along +Z (robot backwards), PI = forward (-Z).
    const az = Math.atan2(dx, dz);
    const rel = clamp(wrapAngle(az - Math.PI), -BASE_LIMIT, BASE_LIMIT);
    const baseYaw = Math.PI + rel;

    // Project the target into the arm plane.
    let u = dx * Math.sin(baseYaw) + dz * Math.cos(baseYaw);
    let v = dy;
    let d = Math.hypot(u, v);
    if (!Number.isFinite(d) || d < 1e-4) {
      u = 0.12;
      v = -0.02;
      d = Math.hypot(u, v);
    }
    const clamped = Math.min(d, reach);
    const scale = clamped / d;
    u *= scale;
    v *= scale;

    const phi = Math.atan2(v, u);
    const cosq3 = clamp((clamped * clamped - L1 * L1 - L2E * L2E) / (2 * L1 * L2E), -1, 1);
    const ac = Math.acos(cosq3);

    const candidates = [];
    const push = (q2, q3) => {
      const c2 = clamp(q2, Q2_MIN, Q2_MAX);
      const c3 = clamp(q3, Q3_MIN, Q3_MAX);
      endPos(c2, c3, _e);
      const err = Math.hypot(_e.u - u, _e.v - v);
      candidates.push({ q2: c2, q3: c3, err, elbowUp: c3 >= 0 });
    };
    for (const q3 of [ac, -ac]) {
      const q2 = phi - Math.atan2(L2E * Math.sin(q3), L1 + L2E * Math.cos(q3));
      push(q2, q3);
    }
    // Straight-arm solution and workspace-edge fallbacks.
    push(phi, 0);
    push(Q2_MIN, Q3_MIN);
    push(Q2_MIN, Q3_MAX);
    push(Q2_MAX, Q3_MIN);
    push(Q2_MAX, Q3_MAX);

    candidates.sort((a, b) => a.err - b.err || b.elbowUp - a.elbowUp || b.q2 - a.q2);
    let best = candidates[0];

    // Target outside the joint-limited workspace: coarse grid search, then refine.
    if (best.err > 0.005) {
      let bestQ2 = best.q2;
      let bestQ3 = best.q3;
      let bestErr = best.err;
      const scan = (q2a, q2b, q3a, q3b, step) => {
        for (let a2 = q2a; a2 <= q2b + 1e-6; a2 += step) {
          for (let a3 = q3a; a3 <= q3b + 1e-6; a3 += step) {
            endPos(a2, a3, _e);
            const err = Math.hypot(_e.u - u, _e.v - v);
            if (err < bestErr) {
              bestErr = err;
              bestQ2 = a2;
              bestQ3 = a3;
            }
          }
        }
      };
      const STEP = 7.5 * DEG;
      scan(Q2_MIN, Q2_MAX, Q3_MIN, Q3_MAX, STEP);
      scan(Math.max(Q2_MIN, bestQ2 - STEP), Math.min(Q2_MAX, bestQ2 + STEP), Math.max(Q3_MIN, bestQ3 - STEP), Math.min(Q3_MAX, bestQ3 + STEP), 1.5 * DEG);
      best = { q2: bestQ2, q3: bestQ3, err: bestErr };
    }
    return { baseYaw, q2: best.q2, q3: best.q3, distance: clamped };
  }

  function applyPose() {
    parts.root.rotation.y = state.baseYaw;
    parts.upper.rotation.x = -state.q2;
    parts.forearm.rotation.x = -state.q3;
  }

  function advanceTo(target, dt, instant) {
    if (instant) {
      state.baseYaw = target.baseYaw;
      state.q2 = target.q2;
      state.q3 = target.q3;
      return;
    }
    const maxStep = JOINT_SPEED * Math.max(dt, 1e-4);
    const dyaw = wrapAngle(target.baseYaw - state.baseYaw);
    state.baseYaw = wrapAngle(state.baseYaw + clamp(dyaw, -maxStep, maxStep));
    state.q2 += clamp(target.q2 - state.q2, -maxStep, maxStep);
    state.q3 += clamp(target.q3 - state.q3, -maxStep, maxStep);
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

  // Is a world point inside furniture / floor? (robot body, gripper and held object ignored)
  function pointBlocked(worldPoint) {
    try {
      return !!world.intersectionWithShape(
        worldPoint,
        IDENT_ROT,
        carryClearShape,
        undefined,
        GROUPS.robotCharacter,
        undefined,
        body || undefined
      );
    } catch {
      return false;
    }
  }

  // Carry target in robot-local space. The grab pose is the base; the aim's vertical
  // movement since the grab is added to it (clamped to the reach), so aiming up raises
  // the held object and aiming down lowers it. The target is also kept out of furniture.
  function carryTargetLocal() {
    const base = state.carryBase;
    let dy = base.y - shoulderLocal.y + state.carryAimDelta;
    dy = clamp(dy, -reach * 0.98, reach * 0.98);
    let hx = base.x - shoulderLocal.x;
    let hz = base.z - shoulderLocal.z;
    const h0 = Math.hypot(hx, hz);
    const hMax = Math.sqrt(Math.max(0, reach * reach - dy * dy));
    const h = Math.min(h0, hMax);
    if (h0 > 1e-6) {
      hx *= h / h0;
      hz *= h / h0;
    } else {
      hx = 0;
      hz = 0;
    }
    let tx = shoulderLocal.x + hx;
    let ty = shoulderLocal.y + dy;
    let tz = shoulderLocal.z + hz;
    // Pull the target back toward the shoulder while it sits inside geometry.
    _cb.set(tx, ty, tz);
    for (let i = 0; i < 5; i++) {
      _cc.copy(_cb).applyMatrix4(group.matrixWorld);
      if (!pointBlocked(_cc)) break;
      _cb.lerp(shoulderLocal, 0.18);
    }
    return _cd.set(_cb.x, _cb.y, _cb.z);
  }

  // Aim -> carry height. Aim heights near the object's grab height command the carry
  // (up raises, down lowers); the last command is held briefly so a single-frame aim
  // update still visibly moves the object, then it decays back to the grab pose.
  function updateCarryAim(dt) {
    if (!state.held || !state.lastAimValid) return;
    state.time += dt;
    const ay = state.lastAimLocal.y;
    if (Math.abs(ay - state.objGrabLocalY) <= CARRY_AIM_BAND) {
      // Aim heights near the object command the carry height (up raises, down lowers).
      // The command is latched so the object stays where the player pointed it.
      state.carryAimDelta = clamp(ay - state.objGrabLocalY, -CARRY_AIM_MAX, CARRY_AIM_MAX);
    }
  }

  function update(dt, aim) {
    let sol;
    if (aim && Number.isFinite(aim.x) && Number.isFinite(aim.y) && Number.isFinite(aim.z)) {
      _ca.copy(aim);
      group.worldToLocal(_ca);
      state.lastAimLocal.copy(_ca);
      state.lastAimValid = true;
    } else {
      state.lastAimValid = false;
    }
    updateCarryAim(dt);
    if (state.held) {
      const target = carryTargetLocal();
      state.targetLocal.copy(target);
      sol = solve(target);
    } else if (state.lastAimValid) {
      sol = solve(group.worldToLocal(_c.copy(aim)));
    } else {
      sol = { baseYaw: Math.PI, q2: ROBOT_DIMS.park.shoulder, q3: ROBOT_DIMS.park.elbow };
    }

    state.target.baseYaw = sol.baseYaw;
    state.target.q2 = sol.q2;
    state.target.q3 = sol.q3;
    advanceTo(state.target, dt, false);
    applyPose();

    if (state.held) parts.setGripX(state.gripX);
    else parts.setGrip(1);
    writeGripperBody(false);
    guardHeldObject();
  }

  // If the solver ever loses the held object (blocked by geometry), snap it back.
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

  // Distance from a point to the nearest point of the object's world bounding box.
  function surfaceDistance(obj, point) {
    let box = null;
    try {
      if (obj.mesh) box = new THREE.Box3().setFromObject(obj.mesh);
    } catch {
      box = null;
    }
    if (!box || !Number.isFinite(box.min.x)) {
      const t = obj.body.translation();
      return Math.hypot(point.x - t.x, point.y - t.y, point.z - t.z);
    }
    const cx = clamp(point.x, box.min.x, box.max.x);
    const cy = clamp(point.y, box.min.y, box.max.y);
    const cz = clamp(point.z, box.min.z, box.max.z);
    return Math.hypot(point.x - cx, point.y - cy, point.z - cz);
  }

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
    // Measure to the object's nearest surface, not its centre: the gripper only has
    // to touch the object, and reach is specified from the shoulder to the fingers.
    const distance = surfaceDistance(obj, shoulder);
    if (!Number.isFinite(distance) || distance > reach + REACH_TOLERANCE) {
      return { ok: false, reason: 'out_of_reach' };
    }

    // Snap the arm onto the object so the gripper physically reaches it.
    const local = group.worldToLocal(_b.copy(objPos));
    const sol = solve(local);
    state.target.baseYaw = sol.baseYaw;
    state.target.q2 = sol.q2;
    state.target.q3 = sol.q3;
    advanceTo(state.target, 0, true);
    applyPose();
    writeGripperBody(true);

    // Freeze the carry target in robot-local space. A pick-up should be visible:
    // pull the object slightly toward the body (so the arm is no longer at full
    // extension) and raise it clear of the surface it was resting on.
    const clampedLocal = _a.copy(objPos);
    group.worldToLocal(clampedLocal);
    let dxL = clampedLocal.x - shoulderLocal.x;
    let dyL = clampedLocal.y - shoulderLocal.y;
    let dzL = clampedLocal.z - shoulderLocal.z;
    const h = Math.hypot(dxL, dzL);
    const pull = Math.min(0.1, Math.max(0, h - 0.06));
    const hs = h > 1e-5 ? (h - pull) / h : 0;
    dxL *= hs;
    dzL *= hs;
    let fx = shoulderLocal.x + dxL;
    let fy = shoulderLocal.y + dyL + CARRY_LIFT;
    let fz = shoulderLocal.z + dzL;
    const ddx = fx - shoulderLocal.x;
    const ddy = fy - shoulderLocal.y;
    const ddz = fz - shoulderLocal.z;
    const dd = Math.hypot(ddx, ddy, ddz);
    if (dd > reach * 0.995) {
      const sc = (reach * 0.995) / dd;
      fx = shoulderLocal.x + ddx * sc;
      fy = shoulderLocal.y + ddy * sc;
      fz = shoulderLocal.z + ddz * sc;
    }
    state.frozenLocal.set(fx, fy, fz);
    state.carryBase.copy(state.frozenLocal);
    state.objGrabLocalY = clampedLocal.y;
    state.carryAimDelta = 0;


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
    state.gripX = measureGripX(obj);
    parts.setGripX(state.gripX);
    return { ok: true };
  }

  // Finger opening just wide enough to straddle the held object (50-90 mm class).
  function measureGripX(obj) {
    let half = 0.03;
    try {
      if (obj.mesh) {
        const box = new THREE.Box3().setFromObject(obj.mesh);
        const size = box.getSize(_b);
        half = Math.max(size.x, size.z) * 0.5;
      }
    } catch {
      /* fall back */
    }
    return clamp(half + 0.006, ROBOT_DIMS.gripClosed, ROBOT_DIMS.gripOpen);
  }

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
      // place, don't throw: drop with no residual gripper momentum
      obj.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
      obj.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
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
    return Number.isFinite(d) && d <= reach + REACH_TOLERANCE && d >= 0.04;
  }

  function getGripperPose(pos = new THREE.Vector3(), quat = new THREE.Quaternion()) {
    group.updateMatrixWorld(true);
    anchor.getWorldPosition(pos);
    anchor.getWorldQuaternion(quat);
    return { pos, quat };
  }

  function sync() {
    if (state.held) {
      const worldTarget = _c.copy(state.carryBase).applyMatrix4(group.matrixWorld);
      const sol = solve(group.worldToLocal(worldTarget));
      state.target.baseYaw = sol.baseYaw;
      state.target.q2 = sol.q2;
      state.target.q3 = sol.q3;
      advanceTo(state.target, 0, true);
    } else {
      state.target.baseYaw = Math.PI;
      state.target.q2 = ROBOT_DIMS.park.shoulder;
      state.target.q3 = ROBOT_DIMS.park.elbow;
      advanceTo(state.target, 0, true);
    }
    applyPose();
    writeGripperBody(true);
  }

  function reset() {
    release();
    state.baseYaw = Math.PI;
    state.q2 = ROBOT_DIMS.park.shoulder;
    state.q3 = ROBOT_DIMS.park.elbow;
    sync();
    parts.setGrip(1);
  }

  applyPose();
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
    get angles() {
      return { baseYaw: state.baseYaw, q2: state.q2, q3: state.q3 };
    },
    get dof() {
      return 3;
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
