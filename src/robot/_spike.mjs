// TEMP physics spike (delete before finishing). Node-only: validates character controller + grab joint.
import RAPIER from '@dimforge/rapier3d-compat';

await RAPIER.init();

const G = { ROBOT: 0x0002, HELD: 0x0004, GRIPPER: 0x0008 };
const groups = (mem, filter) => ((mem & 0xffff) << 16) | (filter & 0xffff);
const ALL = 0xffff;

function makeWorld() {
  const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
  world.timestep = 1 / 60;
  world.numSolverIterations = 8;
  const floor = world.createRigidBody(RAPIER.RigidBodyDesc.fixed());
  world.createCollider(RAPIER.ColliderDesc.cuboid(10, 0.1, 10).setTranslation(0, -0.1, 0).setFriction(0.6), floor);
  return world;
}

// ---------------------------------------------------------------- A: character controller
function testController() {
  const world = makeWorld();
  // wall at z = 1.0, thickness .12 -> face at z = 0.94
  const wallBody = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(0, 1, 1.0));
  world.createCollider(RAPIER.ColliderDesc.cuboid(2, 1, 0.06), wallBody);
  // small 0.15 step in the path at z = -1
  const stepBody = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(0, 0.075, -1.0));
  world.createCollider(RAPIER.ColliderDesc.cuboid(0.5, 0.075, 0.2), stepBody);

  const body = world.createRigidBody(
    RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(0, 0.21, 0)
  );
  const col = world.createCollider(
    RAPIER.ColliderDesc.cylinder(0.19, 0.16)
      .setFriction(0.3)
      .setCollisionGroups(groups(G.ROBOT, ALL & ~G.HELD)),
    body
  );
  const cc = world.createCharacterController(0.02);
  cc.setUp({ x: 0, y: 1, z: 0 });
  cc.enableAutostep(0.18, 0.1, true);
  cc.enableSnapToGround(0.12);
  cc.setApplyImpulsesToDynamicBodies(true);
  cc.setCharacterMass(9);
  cc.setMaxSlopeClimbAngle((50 * Math.PI) / 180);
  cc.setMinSlopeSlideAngle((35 * Math.PI) / 180);
  cc.setSlideEnabled(true);

  const qGroups = groups(G.ROBOT, ALL & ~G.GRIPPER & ~G.HELD);
  let vy = 0;
  let grounded = false;
  const trace = [];
  // walk +z at 1.1 m/s for 3s, then -z for 2s
  for (let i = 0; i < 300; i++) {
    const dir = i < 180 ? 1 : -1;
    const dt = 1 / 60;
    const desired = { x: 0, y: (grounded ? 0 : vy) * dt, z: dir * 1.1 * dt };
    cc.computeColliderMovement(col, desired, undefined, qGroups);
    const mv = cc.computedMovement();
    grounded = cc.computedGrounded();
    if (grounded) vy = 0;
    else vy = Math.max(vy - 9.81 * dt, -6);
    const t = body.translation();
    body.setNextKinematicTranslation({ x: t.x + mv.x, y: t.y + mv.y, z: t.z + mv.z });
    world.step();
    if (i % 20 === 0 || i === 299) {
      const p = body.translation();
      trace.push([i, +p.x.toFixed(3), +p.y.toFixed(3), +p.z.toFixed(3), grounded, cc.numComputedCollisions()]);
    }
  }
  console.log('A controller trace:', JSON.stringify(trace));
  const p = body.translation();
  console.log('A final y (expect ~0.21):', p.y.toFixed(4), 'z (wall stop ~0.76):', p.z.toFixed(3));
  return world;
}

// ---------------------------------------------------------------- B: grab joint
function testGrab() {
  const world = makeWorld();
  // gripper kinematic body
  const gripper = world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(0, 0.3, 0));
  world.createCollider(
    RAPIER.ColliderDesc.ball(0.03).setCollisionGroups(groups(G.GRIPPER, ALL & ~G.HELD)),
    gripper
  );
  // mug: 0.3 kg box sitting on a table at y = 0.5
  const tableBody = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(0, 0.4, -0.5));
  world.createCollider(RAPIER.ColliderDesc.cuboid(0.4, 0.1, 0.4), tableBody);
  const mugBody = world.createRigidBody(
    RAPIER.RigidBodyDesc.dynamic().setTranslation(0, 0.54, -0.5).setLinearDamping(0.12).setAngularDamping(0.35)
  );
  const mugCol = world.createCollider(
    RAPIER.ColliderDesc.cuboid(0.04, 0.05, 0.04)
      .setMass(0.3)
      .setFriction(0.5)
      .setCollisionGroups(groups(ALL, ALL)),
    mugBody
  );
  for (let i = 0; i < 30; i++) world.step();

  // attach fixed joint at current relative pose
  const gt = gripper.translation();
  const gr = gripper.rotation();
  const mt = mugBody.translation();
  const mr = mugBody.rotation();
  const invG = new RAPIER.Quaternion(gr.x, gr.y, gr.z, gr.w).inverse?.() ?? null;
  // do it with three-free math:
  const gq = quatInv(gr);
  const anchor1 = quatRotate(gq, { x: mt.x - gt.x, y: mt.y - gt.y, z: mt.z - gt.z });
  const frame1 = quatMul(gq, mr);
  const joint = world.createImpulseJoint(
    RAPIER.JointData.fixed(anchor1, frame1, { x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 0, w: 1 }),
    gripper,
    mugBody,
    true
  );
  // disable robot<->held
  mugCol.setCollisionGroups(groups(G.HELD, ALL & ~G.ROBOT & ~G.GRIPPER));
  mugBody.setLinvel({ x: 0, y: 0, z: 0 }, true);
  mugBody.setAngvel({ x: 0, y: 0, z: 0 }, true);

  // move gripper in a circle at 1.1 m/s for 3 s, then check
  const start = { x: gt.x, y: 0.6, z: gt.z };
  const relOffset = { x: mt.x - gt.x, y: mt.y - gt.y, z: mt.z - gt.z };
  let err = 0;
  let maxErr = 0;
  let nan = false;
  const radius = 0.3;
  for (let i = 0; i < 180; i++) {
    const a = (i / 60) * 1.1 / radius;
    const tgt = { x: start.x + Math.cos(a) * radius, y: 0.6 + Math.sin(a * 0.5) * 0.1, z: start.z + Math.sin(a) * radius };
    gripper.setNextKinematicTranslation(tgt);
    // rotate gripper too
    const yaw = a;
    gripper.setNextKinematicRotation({ x: 0, y: Math.sin(yaw / 2), z: 0, w: Math.cos(yaw / 2) });
    world.step();
    const m = mugBody.translation();
    const grq = gripper.rotation();
    const exp = quatRotate(grq, relOffset);
    const e = Math.hypot(m.x - (tgt.x + exp.x), m.y - (tgt.y + exp.y), m.z - (tgt.z + exp.z));
    err += e;
    maxErr = Math.max(maxErr, e);
    if (!Number.isFinite(m.x + m.y + m.z)) nan = true;
  }
  const m = mugBody.translation();
  console.log('B grab: nan=', nan, 'maxErr=', maxErr.toFixed(4), 'avgErr=', (err / 180).toFixed(4), 'final=', [m.x, m.y, m.z].map((v) => +v.toFixed(3)));
  console.log('B joint valid:', joint.isValid(), 'mug mass:', mugBody.mass().toFixed(3));
  return { world, joint, mugBody, gripper };
}

function quatInv(q) {
  return { x: -q.x, y: -q.y, z: -q.z, w: q.w };
}
function quatMul(a, b) {
  return {
    x: a.w * b.x + a.x * b.w + a.y * b.z - a.z * b.y,
    y: a.w * b.y - a.x * b.z + a.y * b.w + a.z * b.x,
    z: a.w * b.z + a.x * b.y - a.y * b.x + a.z * b.w,
    w: a.w * b.w - a.x * b.x - a.y * b.y - a.z * b.z,
  };
}
function quatRotate(q, v) {
  const ix = q.w * v.x + q.y * v.z - q.z * v.y;
  const iy = q.w * v.y + q.z * v.x - q.x * v.z;
  const iz = q.w * v.z + q.x * v.y - q.y * v.x;
  const iw = -q.x * v.x - q.y * v.y - q.z * v.z;
  return {
    x: ix * q.w + iw * -q.x + iy * -q.z - iz * -q.y,
    y: iy * q.w + iw * -q.y + iz * -q.x - ix * -q.z,
    z: iz * q.w + iw * -q.z + ix * -q.y - iy * -q.x,
  };
}

testController();
testGrab();

// ---------------------------------------------------------------- C: heavy + small offset + long run
function testHeavy() {
  const world = makeWorld();
  const gripper = world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(0, 0.3, 0));
  world.createCollider(RAPIER.ColliderDesc.ball(0.03).setCollisionGroups(groups(G.GRIPPER, ALL & ~G.HELD)), gripper);
  const box = world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(0.05, 0.36, 0.06).setLinearDamping(0.12).setAngularDamping(0.35));
  const col = world.createCollider(RAPIER.ColliderDesc.cuboid(0.1, 0.06, 0.08).setMass(2.4).setCollisionGroups(groups(ALL, ALL)), box);
  for (let i = 0; i < 20; i++) world.step();
  const gt = gripper.translation(); const gr = gripper.rotation(); const bt = box.translation(); const br = box.rotation();
  const gq = quatInv(gr);
  const anchor1 = quatRotate(gq, { x: bt.x - gt.x, y: bt.y - gt.y, z: bt.z - gt.z });
  const frame1 = quatMul(gq, br);
  const joint = world.createImpulseJoint(RAPIER.JointData.fixed(anchor1, frame1, { x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 0, w: 1 }), gripper, box, true);
  col.setCollisionGroups(groups(G.HELD, ALL & ~G.ROBOT & ~G.GRIPPER));
  box.setLinvel({ x: 0, y: 0, z: 0 }, true); box.setAngvel({ x: 0, y: 0, z: 0 }, true);
  const rel = { x: bt.x - gt.x, y: bt.y - gt.y, z: bt.z - gt.z };
  let maxErr = 0; let maxAng = 0; let nan = false;
  // drive at 1.1 m/s in a straight line 2 s, then circle at 1.1 m/s for 3 s
  for (let i = 0; i < 300; i++) {
    let tgt, yaw;
    if (i < 120) { tgt = { x: 0, y: 0.3, z: i * 1.1 / 60 }; yaw = 0; }
    else { const a = (i - 120) * 1.1 / 60 / 0.4; tgt = { x: Math.cos(a) * 0.4, y: 0.3, z: 0.4 * Math.sin(a) + 2.2 }; yaw = a; }
    gripper.setNextKinematicTranslation(tgt);
    gripper.setNextKinematicRotation({ x: 0, y: Math.sin(yaw / 2), z: 0, w: Math.cos(yaw / 2) });
    world.step();
    const m = box.translation(); const mr = box.rotation(); const grr = gripper.rotation();
    const exp = quatRotate(grr, rel);
    const e = Math.hypot(m.x - (tgt.x + exp.x), m.y - (tgt.y + exp.y), m.z - (tgt.z + exp.z));
    maxErr = Math.max(maxErr, e);
    const expq = quatMul(grr, frame1);
    const dq = Math.abs(expq.x * mr.x + expq.y * mr.y + expq.z * mr.z + expq.w * mr.w);
    maxAng = Math.max(maxAng, 2 * Math.acos(Math.min(1, dq)));
    if (!Number.isFinite(m.x + m.y + m.z)) nan = true;
  }
  console.log('C heavy 2.4kg: nan=', nan, 'maxPosErr=', maxErr.toFixed(4), 'maxAngleErr(deg)=', (maxAng * 180 / Math.PI).toFixed(2), 'jointValid=', joint.isValid());
}
testHeavy();
