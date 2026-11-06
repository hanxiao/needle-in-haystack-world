// Robot v2 — sweeper-class mobile base + 3-DOF K12-class arm.
// Conventions:
//   - group.position is the ground-contact point (feet at y=0 when standing on the floor)
//   - forward is -Z, yaw 0 faces -Z, yaw = atan2(-dx, -dz) for a world direction (dx, dz)
//   - getState().pos / setPose() use the same feet convention
//   - public API is unchanged from round 1 (plus extra getState() fields)
import * as THREE from 'three';
import { CONFIG } from '../core/config.js';
import { buildRobotModel, ROBOT_DIMS } from './model.js';
import { createCameras, TOP_CAM_MAX_WORLD_Y } from './cameras.js';
import { createArm } from './arm.js';
import { GROUPS } from './groups.js';

const UP = { x: 0, y: 1, z: 0 };
const MAX_FALL = -6;
const FLOOR_BODY_Y = ROBOT_DIMS.bodyY;

const ACCEL = 0.8; // m/s^2, spec
const TURN_RATE = CONFIG.robot.turnRate || 2.09; // rad/s (120 deg/s)
const PUSH_FORCE = 45; // N — traction-limited push of a 7 kg rubber-wheeled base
const PUSH_MAX_IMPULSE = 0.9; // N.s per body per frame
const PUSH_MIN_SPEED = 0.04; // m/s

const LED_COLORS = {
  idle: 0xffa22a,
  move: 0x53e08a,
  boost: 0x39d7ff,
  held: 0x8ea6ff,
  push: 0xff6a3d,
};

const _aim = new THREE.Vector3();

function wrapAngle(a) {
  let x = a;
  while (x > Math.PI) x -= Math.PI * 2;
  while (x < -Math.PI) x += Math.PI * 2;
  return x;
}

function quatFromYaw(yaw) {
  const h = yaw * 0.5;
  return { x: 0, y: Math.sin(h), z: 0, w: Math.cos(h) };
}

function clamp(v, a, b) {
  return Math.min(b, Math.max(a, v));
}

export function createRobot(ctx, opts = {}) {
  if (!ctx || !ctx.scene) throw new Error('createRobot: ctx.scene required');
  const physics = ctx.physics;
  const world = physics && physics.world;
  const RAPIER = physics && physics.RAPIER;
  if (!world || !RAPIER) throw new Error('createRobot: ctx.physics.world/RAPIER required');

  const spawnSource = opts.pos || (ctx.spawn && ctx.spawn.pos) || CONFIG.spawn.pos;
  const spawnYaw = opts.yaw ?? (ctx.spawn && ctx.spawn.yaw) ?? CONFIG.spawn.yaw ?? 0;
  const feet = new THREE.Vector3(Number(spawnSource[0]) || 0, Number(spawnSource[1]) || 0, Number(spawnSource[2]) || 0);

  // ---------------------------------------------------------------- scene graph
  const group = new THREE.Group();
  group.name = 'robot';
  group.position.copy(feet);
  group.rotation.y = spawnYaw;
  ctx.scene.add(group);

  const model = buildRobotModel(ctx);
  group.add(model.visual);

  const cameras = createCameras();
  for (const cam of Object.values(cameras)) {
    cam.userData.baseY = cam.position.y;
    group.add(cam);
  }

  // ---------------------------------------------------------------- physics body
  const body = world.createRigidBody(
    RAPIER.RigidBodyDesc.kinematicPositionBased()
      .setTranslation(feet.x, feet.y + FLOOR_BODY_Y, feet.z)
      .setRotation(quatFromYaw(spawnYaw))
  );
  const bodyCollider = world.createCollider(
    RAPIER.ColliderDesc.cylinder(ROBOT_DIMS.colliderHalfHeight, ROBOT_DIMS.colliderRadius)
      .setFriction(0.6)
      .setRestitution(0)
      .setCollisionGroups(GROUPS.robot),
    body
  );

  group.updateMatrixWorld(true);

  const arm = createArm({
    ctx,
    model,
    group,
    body,
    reach: CONFIG.robot.reach ?? ROBOT_DIMS.reach,
    maxLiftKg: CONFIG.robot.maxLiftKg ?? 0.5,
  });
  arm.reset();

  // ---------------------------------------------------------------- character controller
  const controller = world.createCharacterController(0.02);
  controller.setUp(UP);
  controller.enableAutostep(0.035, 0.05, false);
  controller.enableSnapToGround(0.05);
  controller.setApplyImpulsesToDynamicBodies(false);
  controller.setCharacterMass(CONFIG.robot.mass ?? 7);
  controller.setMaxSlopeClimbAngle((40 * Math.PI) / 180);
  controller.setMinSlopeSlideAngle((30 * Math.PI) / 180);
  controller.setSlideEnabled(true);

  // Downward probe used by setPose: keep teleports out of furniture.
  const teleportRay = new RAPIER.Ray({ x: 0, y: 0, z: 0 }, { x: 0, y: -1, z: 0 });
  const TELEPORT_DIRS = [
    [1, 0],
    [0.7071, 0.7071],
    [0, 1],
    [-0.7071, 0.7071],
    [-1, 0],
    [-0.7071, -0.7071],
    [0, -1],
    [0.7071, -0.7071],
  ];

  function probeFloorY(px, pz, fromY = 1.95, maxToi = 2.2) {
    teleportRay.origin.x = px;
    teleportRay.origin.y = fromY;
    teleportRay.origin.z = pz;
    try {
      const hit = world.castRay(teleportRay, maxToi, true, undefined, GROUPS.robotCharacter, undefined, body);
      if (hit && hit.timeOfImpact > 1e-3) {
        const y = fromY - hit.timeOfImpact;
        if (Number.isFinite(y) && y < fromY + 0.2) return y;
      }
    } catch {
      /* ignore */
    }
    return null;
  }

  // Robot needs this much headroom to sit on the floor under furniture:
  // collider top (0.36 m) + 0.02 margin + 0.01 tolerance.
  const UNDER_CLEARANCE = ROBOT_DIMS.bodyY + ROBOT_DIMS.colliderHalfHeight + 0.03;

  // Slim collider probe used to reject teleport spots that overlap table legs etc.
  const teleportShape = new RAPIER.Cylinder(
    Math.max(0.01, ROBOT_DIMS.colliderHalfHeight - 0.01),
    Math.max(0.01, ROBOT_DIMS.colliderRadius - 0.01)
  );
  const TELEPORT_IDENT = { x: 0, y: 0, z: 0, w: 1 };

  function spotClear(px, pz, feetY) {
    try {
      const hit = world.intersectionWithShape(
        { x: px, y: feetY + FLOOR_BODY_Y, z: pz },
        TELEPORT_IDENT,
        teleportShape,
        undefined,
        GROUPS.robotCharacter,
        undefined,
        body
      );
      return !hit;
    } catch {
      return true;
    }
  }

  // Feet height for a spot: floor level, or the floor under furniture with headroom.
  function feetYFor(px, pz, requestedY) {
    const yTop = probeFloorY(px, pz, 1.95, 2.2);
    if (yTop === null) return null;
    if (yTop <= 0.08) return { y: Math.max(requestedY, yTop), under: false };
    if (yTop > 0.06) {
      const yLow = probeFloorY(px, pz, 0.32, 0.5);
      if (yLow !== null && yLow <= 0.06 && yTop - yLow >= UNDER_CLEARANCE) {
        return { y: Math.max(requestedY, yLow), under: true };
      }
    }
    return null;
  }

  function resolveTeleport(px, pz, requestedY) {
    if (requestedY > 0.05) return { x: px, z: pz, y: requestedY };
    const direct = feetYFor(px, pz, requestedY);
    if (direct && spotClear(px, pz, direct.y)) return { x: px, z: pz, y: direct.y };

    // Requested spot blocked (table leg, clutter, ...): nudge around it, keeping the
    // "under furniture" intent when the request was under furniture.
    const wantUnder = !!(direct && direct.under);
    for (const r of [0.06, 0.12, 0.18, 0.24, 0.32, 0.44]) {
      for (const [dx, dz] of TELEPORT_DIRS) {
        const cx = px + dx * r;
        const cz = pz + dz * r;
        const cand = feetYFor(cx, cz, requestedY);
        if (!cand) continue;
        if (wantUnder && !cand.under) continue;
        if (!spotClear(cx, cz, cand.y)) continue;
        return { x: cx, z: cz, y: cand.y };
      }
    }
    // Last resort: any clear floor spot nearby.
    for (const r of [0.22, 0.36, 0.5, 0.68, 0.86]) {
      for (const [dx, dz] of TELEPORT_DIRS) {
        const cx = px + dx * r;
        const cz = pz + dz * r;
        const y = probeFloorY(cx, cz, 1.95, 2.2);
        if (y !== null && y <= 0.08) return { x: cx, z: cz, y: Math.max(requestedY, y) };
      }
    }
    if (direct) return { x: px, z: pz, y: direct.y };
    const yTop = probeFloorY(px, pz, 1.95, 2.2);
    if (yTop !== null && yTop < 1.8) return { x: px, z: pz, y: yTop };
    return { x: px, z: pz, y: requestedY };
  }

  // ---------------------------------------------------------------- state
  let yaw = wrapAngle(spawnYaw);
  let grounded = false;
  let vy = 0;
  let velX = 0;
  let velZ = 0;
  let prevForward = 0;
  let yawRate = 0;
  let leanPitch = 0;
  let leanRoll = 0;
  let ledMode = 'idle';
  let ledPulse = 0;
  let time = 0;
  let moving = false;
  let boosting = false;
  let aiming = false;
  let aimVec = null;
  let speed = 0;
  let wheelSpin = 0;
  let casterSpin = 0;
  let pushCount = 0;

  const lastGood = new THREE.Vector3(feet.x, feet.y + FLOOR_BODY_Y, feet.z);

  function setLed(mode) {
    if (mode !== ledMode) {
      ledMode = mode;
      model.ledMaterial.emissive.setHex(LED_COLORS[mode] || LED_COLORS.idle);
    }
  }

  // ---------------------------------------------------------------- push model
  // The character controller does not push dynamic bodies; instead we apply capped
  // impulses at the contact points. 45 N is about the traction limit of a 7 kg
  // rubber-wheeled base, so heavy furniture (friction > 45 N) stays put while
  // chairs / boxes / bins slide.
  const _pushed = new Map();

  function applyPushImpulses(step) {
    pushCount = 0;
    const sp = Math.hypot(velX, velZ);
    if (sp < PUSH_MIN_SPEED) return;
    const dirX = velX / sp;
    const dirZ = velZ / sp;
    let n = 0;
    try {
      n = controller.numComputedCollisions();
    } catch {
      return;
    }
    if (!n) return;
    _pushed.clear();
    for (let i = 0; i < n; i++) {
      let col;
      try {
        col = controller.computedCollision(i);
      } catch {
        continue;
      }
      if (!col || !col.collider) continue;
      let targetBody;
      try {
        targetBody = col.collider.parent();
      } catch {
        continue;
      }
      if (!targetBody || typeof targetBody.isDynamic !== 'function' || !targetBody.isDynamic()) continue;
      const nrm = col.normal1;
      if (nrm && nrm.x * dirX + nrm.z * dirZ > -0.15) continue; // only contacts ahead of the robot
      let mass = 0;
      try {
        mass = targetBody.mass();
      } catch {
        mass = 0;
      }
      if (!(mass > 0) || mass > 200) continue;
      let lv;
      try {
        lv = targetBody.linvel();
      } catch {
        continue;
      }
      const vRel = Math.max(0, (velX - lv.x) * dirX + (velZ - lv.z) * dirZ);
      if (vRel < 0.02) continue;
      const j = Math.min(mass * vRel, PUSH_FORCE * step, PUSH_MAX_IMPULSE);
      const handle = targetBody.handle;
      const rec = _pushed.get(handle);
      const witness = col.witness1;
      if (rec) {
        rec.j = Math.min(rec.j + j, PUSH_MAX_IMPULSE);
        if (!rec.witness && witness) rec.witness = { x: witness.x, y: witness.y, z: witness.z };
      } else {
        _pushed.set(handle, {
          body: targetBody,
          j,
          witness: witness ? { x: witness.x, y: witness.y, z: witness.z } : null,
        });
      }
    }
    for (const rec of _pushed.values()) {
      try {
        const t = rec.body.translation();
        let py = t.y;
        if (rec.witness) {
          // Clamp the contact height near the body centre to avoid tipping tall objects.
          py = clamp(rec.witness.y, t.y - 0.1, t.y + 0.1);
        }
        rec.body.applyImpulseAtPoint(
          { x: dirX * rec.j, y: 0, z: dirZ * rec.j },
          { x: rec.witness ? rec.witness.x : t.x, y: py, z: rec.witness ? rec.witness.z : t.z },
          true
        );
        pushCount++;
      } catch {
        /* ignore */
      }
    }
  }

  // ---------------------------------------------------------------- update
  function update(dt, input) {
    const step = clamp(Number.isFinite(dt) && dt > 0 ? dt : CONFIG.fixedStep, 1e-4, 0.1);
    time += step;
    const inp = input || {};

    // ---- desired planar velocity (world space)
    const move = inp.move;
    let mx = 0;
    let mz = 0;
    if (Array.isArray(move)) {
      mx = Number(move[0]) || 0;
      mz = Number(move[1]) || 0;
    } else if (move && typeof move === 'object') {
      mx = Number(move.x) || 0;
      mz = Number(move.z) || 0;
    }
    let mag = Math.hypot(mx, mz);
    if (!Number.isFinite(mag)) {
      mx = 0;
      mz = 0;
      mag = 0;
    }
    if (mag > 1) {
      mx /= mag;
      mz /= mag;
      mag = 1;
    }
    moving = mag > 0.03;
    boosting = !!inp.boost;
    const maxSpeed = boosting ? CONFIG.robot.boost : CONFIG.robot.speed;
    const targetVx = mx * maxSpeed;
    const targetVz = mz * maxSpeed;

    // Linear acceleration / deceleration (0.8 m/s^2).
    const dvx = targetVx - velX;
    const dvz = targetVz - velZ;
    const dv = Math.hypot(dvx, dvz);
    const maxDv = ACCEL * step;
    if (dv > maxDv && dv > 1e-6) {
      velX += (dvx / dv) * maxDv;
      velZ += (dvz / dv) * maxDv;
    } else {
      velX = targetVx;
      velZ = targetVz;
    }
    if (!moving && Math.hypot(velX, velZ) < 0.004) {
      velX = 0;
      velZ = 0;
    }

    // ---- aim / yaw
    const aimIn = inp.aim;
    if (aimIn && Number.isFinite(aimIn.x) && Number.isFinite(aimIn.y) && Number.isFinite(aimIn.z)) {
      _aim.set(aimIn.x, aimIn.y, aimIn.z);
      aimVec = _aim;
    } else {
      aimVec = null;
    }
    aiming = !!aimVec || inp.firstPerson === true || inp.aiming === true;

    const cur = body.translation();
    let targetYaw = yaw;
    if (Number.isFinite(inp.lookYaw) && (aiming || inp.firstPerson === true)) {
      targetYaw = inp.lookYaw;
    } else if (moving) {
      targetYaw = Math.atan2(-mx, -mz);
    } else if (aimVec) {
      const aimDx = aimVec.x - cur.x;
      const aimDz = aimVec.z - cur.z;
      if (Math.hypot(aimDx, aimDz) > 0.3) targetYaw = Math.atan2(-aimDx, -aimDz);
    }
    const dyaw = wrapAngle(targetYaw - yaw);
    const maxTurn = TURN_RATE * step;
    const applied = clamp(dyaw, -maxTurn, maxTurn);
    yaw = wrapAngle(yaw + applied);
    yawRate = applied / step;

    // ---- character movement
    if (!grounded) vy = Math.max(vy - 9.81 * step, MAX_FALL);
    else vy = 0;
    const desired = { x: velX * step, y: vy * step, z: velZ * step };
    controller.computeColliderMovement(bodyCollider, desired, undefined, GROUPS.robotCharacter);
    const mv = controller.computedMovement();
    grounded = controller.computedGrounded();
    if (grounded) vy = 0;

    // ---- custom push model (controller impulses are disabled)
    applyPushImpulses(step);

    let nx = cur.x + mv.x;
    let ny = cur.y + mv.y;
    let nz = cur.z + mv.z;
    if (!Number.isFinite(nx + ny + nz)) {
      nx = lastGood.x;
      ny = lastGood.y;
      nz = lastGood.z;
      vy = 0;
    }
    if (ny < FLOOR_BODY_Y - 0.25) {
      ny = FLOOR_BODY_Y;
      vy = 0;
    }
    lastGood.set(nx, ny, nz);
    body.setNextKinematicTranslation({ x: nx, y: ny, z: nz });
    body.setNextKinematicRotation(quatFromYaw(yaw));

    group.position.set(nx, ny - FLOOR_BODY_Y, nz);
    group.rotation.set(0, yaw, 0);
    const topCam = cameras.top;
    topCam.position.y = Math.max(1.2, Math.min(topCam.userData.baseY, TOP_CAM_MAX_WORLD_Y - group.position.y));
    group.updateMatrixWorld(true);

    // ---- wheels (differential) + caster + LiDAR
    const fx = -Math.sin(yaw);
    const fz = -Math.cos(yaw);
    const forwardSpeed = velX * fx + velZ * fz;
    speed = Math.hypot(velX, velZ);
    const halfTrack = ROBOT_DIMS.wheelX;
    for (const w of model.wheels) {
      const side = w.userData.side || 1;
      const rate = (forwardSpeed + side * yawRate * halfTrack) / ROBOT_DIMS.wheelRadius;
      w.userData.spin = (w.userData.spin || 0) - rate * step;
      w.rotation.x = w.userData.spin;
      wheelSpin = w.userData.spin;
    }
    casterSpin -= (speed / ROBOT_DIMS.casterRadius) * step;
    model.caster.rotation.z = casterSpin;
    if (model.lidarTop) model.lidarTop.rotation.y += step * 7.0; // spinning LiDAR

    // ---- body lean (small: rigid sweeper)
    const forwardAccel = (forwardSpeed - prevForward) / step;
    prevForward = forwardSpeed;
    const pitchTarget = clamp(forwardAccel * 0.012, -0.03, 0.03);
    const rollTarget = clamp(-yawRate * forwardSpeed * 0.03, -0.05, 0.05);
    const leanAlpha = 1 - Math.exp(-8 * step);
    leanPitch += (pitchTarget - leanPitch) * leanAlpha;
    leanRoll += (rollTarget - leanRoll) * leanAlpha;
    model.visual.rotation.x = leanPitch;
    model.visual.rotation.z = leanRoll;

    // ---- arm IK + gripper body
    arm.update(step, aimVec);

    // ---- status LED
    let mode = 'idle';
    if (arm.held) mode = 'held';
    else if (pushCount > 0) mode = 'push';
    else if (boosting && moving) mode = 'boost';
    else if (moving) mode = 'move';
    setLed(mode);
    ledPulse = mode === 'held' || mode === 'push' ? 0.5 + 0.5 * Math.sin(time * 5.5) : 1;
    model.ledMaterial.emissiveIntensity = 1.2 + 1.2 * ledPulse;
  }

  // ---------------------------------------------------------------- queries / control
  function getState() {
    return {
      pos: [group.position.x, group.position.y, group.position.z],
      yaw,
      held: arm.held || null,
      heldName: arm.held ? arm.held.name : null,
      grounded,
      speed,
      mass: CONFIG.robot.mass ?? ROBOT_DIMS.mass,
      baseMass: CONFIG.robot.baseMass ?? 3.6,
      armMass: CONFIG.robot.armMass ?? 3.4,
      payload: arm.maxLiftKg,
      maxLiftKg: arm.maxLiftKg,
      reach: arm.reach,
      dof: arm.dof,
      aiming,
      boost: boosting,
      moving,
      wheels: [wheelSpin, wheelSpin],
      pushes: pushCount,
    };
  }

  function setPose(pos, yawIn) {
    if (!pos) return;
    const px = Number(pos[0]) || 0;
    const py = Number(pos[1]) || 0;
    const pz = Number(pos[2]) || 0;
    const nextYaw = wrapAngle(Number.isFinite(yawIn) ? yawIn : yaw);

    const resolved = resolveTeleport(px, pz, py);
    const feetX = resolved.x;
    const feetY = resolved.y;
    const feetZ = resolved.z;
    const tx = feetX;
    const ty = feetY + FLOOR_BODY_Y;
    const tz = feetZ;
    const q = quatFromYaw(nextYaw);

    yaw = nextYaw;
    yawRate = 0;
    prevForward = 0;
    velX = 0;
    velZ = 0;
    vy = 0;
    speed = 0;
    grounded = false;
    leanPitch = 0;
    leanRoll = 0;

    body.setTranslation({ x: tx, y: ty, z: tz }, true);
    body.setRotation(q, true);
    body.setNextKinematicTranslation({ x: tx, y: ty, z: tz });
    body.setNextKinematicRotation(q);

    group.position.set(feetX, feetY, feetZ);
    group.rotation.set(0, yaw, 0);
    group.updateMatrixWorld(true);

    arm.sync();
    if (arm.held) arm.snapHeldToGripper();

    model.visual.rotation.set(0, 0, 0);
    lastGood.set(tx, ty, tz);
    return getState();
  }

  function reset() {
    arm.reset();
    setPose([feet.x, feet.y, feet.z], spawnYaw);
    for (const w of model.wheels) {
      w.userData.spin = 0;
      w.rotation.x = 0;
    }
    wheelSpin = 0;
    casterSpin = 0;
    leanPitch = 0;
    leanRoll = 0;
    model.visual.rotation.set(0, 0, 0);
    setLed('idle');
    model.ledMaterial.emissiveIntensity = 1.8;
    aimVec = null;
    aiming = false;
    moving = false;
    boosting = false;
    time = 0;
    arm.sync();
    group.updateMatrixWorld(true);
  }

  function setVisible(v) {
    group.visible = !!v;
  }

  function getHeadPosition(out = new THREE.Vector3()) {
    group.updateMatrixWorld(true);
    return out.set(0, ROBOT_DIMS.cameraY, ROBOT_DIMS.headZ).applyMatrix4(group.matrixWorld);
  }

  function canReach(point) {
    return arm.canReach(point);
  }

  function grab(obj) {
    return arm.grab(obj);
  }

  function release() {
    return arm.release();
  }

  setPose([feet.x, feet.y, feet.z], spawnYaw);

  const robot = {
    group,
    body,
    colliders: [bodyCollider, arm.gripperCollider],
    cameras,
    arm,
    model,
    get yaw() {
      return yaw;
    },
    get grounded() {
      return grounded;
    },
    get speed() {
      return speed;
    },
    update,
    grab,
    release,
    canReach,
    getState,
    setPose,
    setVisible,
    reset,
    getHeadPosition,
  };
  return robot;
}
