// Robot: procedural rover + Rapier kinematic character controller + IK arm + 360 cameras.
// Conventions:
//   - group.position is the ground-contact point (feet at y=0 when standing on the floor)
//   - forward is -Z, yaw 0 faces -Z, yaw = atan2(-dx, -dz) for a world direction (dx, dz)
//   - getState().pos / setPose() use the same feet convention
import * as THREE from 'three';
import { CONFIG } from '../core/config.js';
import { buildRobotModel, ROBOT_DIMS } from './model.js';
import { createCameras, TOP_CAM_MAX_WORLD_Y } from './cameras.js';
import { createArm } from './arm.js';
import { GROUPS } from './groups.js';

const UP = { x: 0, y: 1, z: 0 };
const MAX_FALL = -6;
const FLOOR_BODY_Y = ROBOT_DIMS.bodyY;

const LED_COLORS = {
  idle: 0xffa22a,
  move: 0x53e08a,
  boost: 0x39d7ff,
  held: 0x8ea6ff,
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
      .setFriction(0.26)
      .setRestitution(0)
      .setCollisionGroups(GROUPS.robot),
    body
  );

  group.updateMatrixWorld(true);

  const arm = createArm({
    ctx,
    model,
    group,
    reach: CONFIG.robot.reach,
    maxLiftKg: CONFIG.robot.maxLiftKg,
  });
  arm.reset();

  // ---------------------------------------------------------------- character controller
  const controller = world.createCharacterController(0.02);
  controller.setUp(UP);
  controller.enableAutostep(0.18, 0.1, true);
  controller.enableSnapToGround(0.12);
  controller.setApplyImpulsesToDynamicBodies(true);
  controller.setCharacterMass(CONFIG.robot.mass);
  controller.setMaxSlopeClimbAngle((52 * Math.PI) / 180);
  controller.setMinSlopeSlideAngle((38 * Math.PI) / 180);
  controller.setSlideEnabled(true);

  // Downward probe used by setPose: if a teleport target is inside furniture,
  // put the robot on top of that surface instead of letting the controller climb out.
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

  // Height of the first surface under (px, pz); null when nothing is hit.
  function probeFloorY(px, pz) {
    teleportRay.origin.x = px;
    teleportRay.origin.y = 1.95;
    teleportRay.origin.z = pz;
    try {
      const hit = world.castRay(teleportRay, 2.2, true, undefined, GROUPS.robotCharacter, undefined, body);
      if (hit && hit.timeOfImpact > 1e-3) {
        const y = 1.95 - hit.timeOfImpact;
        if (Number.isFinite(y) && y < 1.8) return y;
      }
    } catch {
      /* ignore */
    }
    return null;
  }

  // Resolve a teleport target: keep it when the robot fits on the floor there,
  // otherwise nudge to the nearest clear floor spot so it never spawns inside
  // furniture (the character controller would slowly climb out of it).
  function resolveTeleport(px, pz, requestedY) {
    if (requestedY > 0.05) return { x: px, z: pz, y: requestedY };
    const y0 = probeFloorY(px, pz);
    if (y0 !== null && y0 <= 0.08) return { x: px, z: pz, y: Math.max(requestedY, y0) };
    for (const r of [0.22, 0.36, 0.5, 0.68, 0.86]) {
      for (const [dx, dz] of TELEPORT_DIRS) {
        const cx = px + dx * r;
        const cz = pz + dz * r;
        const y = probeFloorY(cx, cz);
        if (y !== null && y <= 0.08) return { x: cx, z: cz, y: Math.max(requestedY, y) };
      }
    }
    if (y0 !== null && y0 < 1.8) return { x: px, z: pz, y: y0 };
    return { x: px, z: pz, y: requestedY };
  }

  // ---------------------------------------------------------------- state
  let yaw = wrapAngle(spawnYaw);
  let grounded = false;
  let vy = 0;
  let velX = 0;
  let velZ = 0;
  let wheelSpin = 0;
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
  let lastInput = null;
  let speed = 0;

  const lastGood = new THREE.Vector3(feet.x, feet.y + FLOOR_BODY_Y, feet.z);

  function setLed(mode) {
    if (mode !== ledMode) {
      ledMode = mode;
      const color = LED_COLORS[mode] || LED_COLORS.idle;
      model.ledMaterial.emissive.setHex(color);
    }
  }

  // ---------------------------------------------------------------- update
  function update(dt, input) {
    const step = clamp(Number.isFinite(dt) && dt > 0 ? dt : CONFIG.fixedStep, 1e-4, 0.1);
    time += step;
    lastInput = input || {};

    // ---- desired planar velocity (world space)
    const move = lastInput.move;
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
    boosting = !!lastInput.boost;
    const maxSpeed = boosting ? CONFIG.robot.boost : CONFIG.robot.speed;
    const targetVx = mx * maxSpeed;
    const targetVz = mz * maxSpeed;
    const accelK = moving ? 10 : 12;
    const alpha = 1 - Math.exp(-accelK * step);
    velX += (targetVx - velX) * alpha;
    velZ += (targetVz - velZ) * alpha;
    if (!moving && Math.hypot(velX, velZ) < 0.004) {
      velX = 0;
      velZ = 0;
    }

    // ---- aim / yaw
    const aimIn = lastInput.aim;
    if (aimIn && Number.isFinite(aimIn.x) && Number.isFinite(aimIn.y) && Number.isFinite(aimIn.z)) {
      _aim.set(aimIn.x, aimIn.y, aimIn.z);
      aimVec = _aim;
    } else {
      aimVec = null;
    }
    aiming = !!aimVec || lastInput.firstPerson === true || lastInput.aiming === true;

    const cur = body.translation();
    let targetYaw = yaw;
    if (Number.isFinite(lastInput.lookYaw) && (aiming || lastInput.firstPerson === true)) {
      // First person / explicit look yaw: face the camera direction.
      targetYaw = lastInput.lookYaw;
    } else if (moving) {
      // Driving: face the movement direction (camera-relative input, no crabbing).
      targetYaw = Math.atan2(-mx, -mz);
    } else if (aimVec) {
      // Standing still: face the aim point (crosshair) so the arm points forward.
      const aimDx = aimVec.x - cur.x;
      const aimDz = aimVec.z - cur.z;
      if (Math.hypot(aimDx, aimDz) > 0.3) targetYaw = Math.atan2(-aimDx, -aimDz);
    }
    const dyaw = wrapAngle(targetYaw - yaw);
    const maxTurn = (aiming ? 6.5 : 8.5) * step;
    const applied = clamp(dyaw * (1 - Math.exp(-14 * step)), -maxTurn, maxTurn);
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
      // Fell out of the world; recover instead of falling forever.
      ny = FLOOR_BODY_Y;
      vy = 0;
    }
    lastGood.set(nx, ny, nz);
    body.setNextKinematicTranslation({ x: nx, y: ny, z: nz });
    body.setNextKinematicRotation(quatFromYaw(yaw));

    group.position.set(nx, ny - FLOOR_BODY_Y, nz);
    group.rotation.set(0, yaw, 0);
    // Keep the top-down camera under the ceiling even if the robot climbs furniture.
    const topCam = cameras.top;
    topCam.position.y = Math.max(1.2, Math.min(topCam.userData.baseY, TOP_CAM_MAX_WORLD_Y - group.position.y));
    group.updateMatrixWorld(true);

    // ---- wheels + body lean
    const fx = -Math.sin(yaw);
    const fz = -Math.cos(yaw);
    const forwardSpeed = velX * fx + velZ * fz;
    speed = Math.hypot(velX, velZ);
    // Skid steer: left/right wheels spin at different rates while turning.
    const halfTrack = ROBOT_DIMS.wheelX;
    for (const w of model.wheels) {
      const side = w.userData.side || 1;
      const rate = (forwardSpeed + side * yawRate * halfTrack) / ROBOT_DIMS.wheelRadius;
      w.userData.spin = (w.userData.spin || 0) - rate * step;
      w.rotation.x = w.userData.spin;
    }
    wheelSpin = model.wheels[0] ? model.wheels[0].userData.spin : 0;

    const forwardAccel = (forwardSpeed - prevForward) / step;
    prevForward = forwardSpeed;
    const pitchTarget = clamp(forwardAccel * 0.02, -0.09, 0.09);
    const rollTarget = clamp(-yawRate * forwardSpeed * 0.05, -0.11, 0.11);
    const leanAlpha = 1 - Math.exp(-8 * step);
    leanPitch += (pitchTarget - leanPitch) * leanAlpha;
    leanRoll += (rollTarget - leanRoll) * leanAlpha;
    model.tilt.rotation.x = leanPitch;
    model.tilt.rotation.z = leanRoll;

    // ---- arm IK + gripper body
    arm.update(step, aimVec);

    // ---- status LED
    let mode = 'idle';
    if (arm.held) mode = 'held';
    else if (boosting && moving) mode = 'boost';
    else if (moving) mode = 'move';
    setLed(mode);
    ledPulse = mode === 'held' ? 0.5 + 0.5 * Math.sin(time * 5.5) : 1;
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
      aiming,
      boost: boosting,
      reach: arm.reach,
      maxLiftKg: arm.maxLiftKg,
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

    // Re-pose the arm/gripper for the new body pose, then drag the held object along.
    arm.sync();
    if (arm.held) arm.snapHeldToGripper();

    model.tilt.rotation.set(0, 0, 0);
    lastGood.set(tx, ty, tz);
    return getState();
  }

  function reset() {
    arm.reset();
    setPose([feet.x, feet.y, feet.z], spawnYaw);
    wheelSpin = 0;
    for (const w of model.wheels) {
      w.userData.spin = 0;
      w.rotation.x = 0;
    }
    leanPitch = 0;
    leanRoll = 0;
    model.tilt.rotation.set(0, 0, 0);
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
    return out.copy(ROBOT_DIMS.head).applyMatrix4(group.matrixWorld);
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

  // Start on the ground, arm parked, camera matrices ready.
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
