// Sweeper-class robot visual (round 2): 350 mm base, 120 mm body, LiDAR turret,
// camera mast, 2 driven treaded wheels + rear caster, 3-DOF arm with 2-finger gripper.
// Feet-origin local frame: forward is -Z, up is +Y, group.position.y = 0 on the floor.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const DEG = Math.PI / 180;

export const ROBOT_DIMS = {
  // Physics body: collider cylinder r 0.155, halfHeight 0.17 -> spans 0.02..0.36 at rest.
  bodyY: 0.19,
  colliderRadius: 0.155,
  colliderHalfHeight: 0.17,
  mass: 7.0,
  height: 0.38,
  // Base
  baseRadius: 0.145,
  baseBottom: 0.03,
  baseTop: 0.15,
  wheelRadius: 0.035,
  wheelWidth: 0.026,
  wheelX: 0.145,
  casterRadius: 0.018,
  casterZ: -0.125,
  // Sensors / mast
  cameraY: 0.3,
  cameraRing: 0.062,
  headZ: 0.02,
  lidarY: 0.178,
  // Arm (Dobot Magician class)
  shoulder: new THREE.Vector3(0, 0.26, -0.085),
  armL1: 0.15,
  armL2: 0.15,
  gripperLen: 0.045,
  reach: 0.34,
  jointSpeed: 5.58, // rad/s = 320 deg/s
  baseYawLimit: 120 * DEG,
  shoulderMin: -5 * DEG,
  shoulderMax: 90 * DEG,
  elbowMin: -15 * DEG,
  elbowMax: 90 * DEG,
  // Folded / idle arm pose (angles in the arm plane)
  park: { shoulder: 0.0, elbow: -0.21 },
  // Gripper opening (metres, finger centre offset from the wrist axis)
  gripClosed: 0.03,
  gripOpen: 0.05,
};

const TAU = Math.PI * 2;

export function buildRobotModel(ctx) {
  const mats = buildMaterials(ctx);
  const visual = new THREE.Group();
  visual.name = 'robot_visual';

  // ---------------------------------------------------------------- wheels + caster
  const wheelGeo = buildWheelGeometry(0.033, 0.026);
  const hubGeo = new THREE.CylinderGeometry(0.011, 0.011, 0.03, 14);
  hubGeo.rotateZ(Math.PI / 2);
  const wheels = [];
  for (const sx of [-1, 1]) {
    const wheel = new THREE.Mesh(wheelGeo, mats.rubber);
    wheel.position.set(sx * ROBOT_DIMS.wheelX, 0.035, 0);
    wheel.userData.side = sx;
    wheel.userData.spin = 0;
    addShadows(wheel);
    visual.add(wheel);
    wheels.push(wheel);

    const hub = new THREE.Mesh(hubGeo, mats.accent);
    hub.position.copy(wheel.position);
    addShadows(hub);
    visual.add(hub);

    // fender over each drive wheel
    const fender = new THREE.Mesh(rounded(0.03, 0.022, 0.062, 2, 0.008), mats.shell);
    fender.position.set(sx * (ROBOT_DIMS.wheelX + 0.007), 0.072, 0);
    addShadows(fender);
    visual.add(fender);
  }

  const caster = new THREE.Mesh(new THREE.SphereGeometry(ROBOT_DIMS.casterRadius, 12, 8), mats.rubber);
  caster.position.set(0, ROBOT_DIMS.casterRadius, ROBOT_DIMS.casterZ);
  addShadows(caster);
  visual.add(caster);
  const casterFork = new THREE.Mesh(rounded(0.026, 0.026, 0.03, 2, 0.006), mats.metalDark);
  casterFork.position.set(0, 0.045, ROBOT_DIMS.casterZ);
  addShadows(casterFork);
  visual.add(casterFork);

  // ---------------------------------------------------------------- base body
  const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.145, 0.148, 0.098, 40), mats.shell);
  drum.position.y = 0.079;
  addShadows(drum);
  visual.add(drum);

  const topCap = new THREE.Mesh(new THREE.CylinderGeometry(0.132, 0.145, 0.022, 40), mats.shell);
  topCap.position.y = 0.139;
  addShadows(topCap);
  visual.add(topCap);

  const topPlate = new THREE.Mesh(new THREE.CylinderGeometry(0.122, 0.126, 0.008, 40), mats.metal);
  topPlate.position.y = 0.152;
  addShadows(topPlate);
  visual.add(topPlate);

  const skirt = new THREE.Mesh(new THREE.CylinderGeometry(0.128, 0.128, 0.012, 32), mats.metalDark);
  skirt.position.y = 0.036;
  addShadows(skirt);
  visual.add(skirt);

  // rubber bumper ring + front bumper pad
  const bumperRing = new THREE.Mesh(
    new THREE.CylinderGeometry(0.153, 0.153, 0.038, 40, 1, true),
    new THREE.MeshStandardMaterial({
      color: 0x1b1c1e,
      roughness: 0.92,
      metalness: 0,
      side: THREE.DoubleSide,
    })
  );
  bumperRing.position.y = 0.076;
  addShadows(bumperRing);
  visual.add(bumperRing);

  const bumperPad = new THREE.Mesh(rounded(0.15, 0.03, 0.022, 2, 0.009), mats.rubber);
  bumperPad.position.set(0, 0.076, -0.146);
  addShadows(bumperPad);
  visual.add(bumperPad);

  for (const sx of [-1, 1]) {
    const strip = new THREE.Mesh(rounded(0.012, 0.02, 0.075, 2, 0.005), mats.accent);
    strip.position.set(sx * 0.146, 0.112, 0.02);
    addShadows(strip);
    visual.add(strip);
  }

  // ---------------------------------------------------------------- LiDAR turret
  const lidarBase = new THREE.Mesh(new THREE.CylinderGeometry(0.056, 0.06, 0.028, 32), mats.metalDark);
  lidarBase.position.y = 0.164;
  addShadows(lidarBase);
  visual.add(lidarBase);

  const lidarGlass = new THREE.Mesh(
    new THREE.CylinderGeometry(0.051, 0.051, 0.018, 32),
    new THREE.MeshStandardMaterial({ color: 0x0a0e12, metalness: 0.7, roughness: 0.12, envMapIntensity: 1.2 })
  );
  lidarGlass.position.y = 0.187;
  addShadows(lidarGlass);
  visual.add(lidarGlass);

  const lidarTop = new THREE.Group();
  lidarTop.position.y = 0.196;
  visual.add(lidarTop);
  const lidarCap = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.052, 0.012, 32), mats.metal);
  lidarCap.position.y = 0.006;
  addShadows(lidarCap);
  lidarTop.add(lidarCap);
  const lidarNotch = new THREE.Mesh(rounded(0.026, 0.007, 0.012, 2, 0.003), mats.accent);
  lidarNotch.position.set(0, 0.014, -0.03);
  lidarTop.add(lidarNotch);
  const lidarNotch2 = new THREE.Mesh(rounded(0.026, 0.007, 0.012, 2, 0.003), mats.accent);
  lidarNotch2.position.set(0.03, 0.014, 0);
  lidarNotch2.rotation.y = Math.PI / 2;
  lidarTop.add(lidarNotch2);

  // ---------------------------------------------------------------- camera mast + head
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.019, 0.062, 12), mats.metalDark);
  mast.position.set(0, 0.238, ROBOT_DIMS.headZ);
  addShadows(mast);
  visual.add(mast);

  const head = new THREE.Group();
  head.name = 'robot_head';
  head.position.set(0, 0.302, ROBOT_DIMS.headZ);
  visual.add(head);

  const headShell = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.058, 0.072, 24), mats.shell);
  addShadows(headShell);
  head.add(headShell);

  const visor = new THREE.Mesh(new THREE.CylinderGeometry(0.062, 0.062, 0.03, 24), mats.dark);
  addShadows(visor);
  head.add(visor);

  const lensGeo = new THREE.CylinderGeometry(0.013, 0.013, 0.012, 14);
  const ringGeo = new THREE.TorusGeometry(0.0155, 0.0022, 6, 16);
  const lensSpecs = [
    { pos: [0, 0, -0.062], axis: 'z' },
    { pos: [0, 0, 0.062], axis: 'z' },
    { pos: [-0.062, 0, 0], axis: 'x' },
    { pos: [0.062, 0, 0], axis: 'x' },
  ];
  for (const spec of lensSpecs) {
    const lens = new THREE.Mesh(lensGeo, mats.lens);
    lens.position.set(spec.pos[0], spec.pos[1], spec.pos[2]);
    if (spec.axis === 'z') lens.rotation.x = Math.PI / 2;
    else lens.rotation.z = Math.PI / 2;
    addShadows(lens);
    head.add(lens);

    const ring = new THREE.Mesh(ringGeo, mats.accent);
    ring.position.set(spec.pos[0], spec.pos[1], spec.pos[2]);
    if (spec.axis === 'z') {
      ring.position.z += Math.sign(spec.pos[2]) * 0.006;
    } else {
      ring.rotation.y = Math.PI / 2;
      ring.position.x += Math.sign(spec.pos[0]) * 0.006;
    }
    head.add(ring);
  }

  const headCap = new THREE.Mesh(new THREE.CylinderGeometry(0.044, 0.052, 0.012, 20), mats.metal);
  headCap.position.y = 0.042;
  addShadows(headCap);
  head.add(headCap);

  const ledMaterial = new THREE.MeshStandardMaterial({
    color: 0x241708,
    emissive: 0xffa22a,
    emissiveIntensity: 1.8,
    roughness: 0.35,
    metalness: 0.1,
  });
  const led = new THREE.Mesh(new THREE.SphereGeometry(0.006, 12, 8), ledMaterial);
  led.position.set(0.026, 0.049, -0.006);
  head.add(led);

  const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.0022, 0.0022, 0.034, 8), mats.metalDark);
  antenna.position.set(0.03, 0.065, 0.026);
  addShadows(antenna);
  head.add(antenna);
  const antennaTip = new THREE.Mesh(new THREE.SphereGeometry(0.005, 10, 8), mats.accent);
  antennaTip.position.set(0.03, 0.083, 0.026);
  head.add(antennaTip);

  // ---------------------------------------------------------------- 3-DOF arm
  const arm = buildArm(mats);
  visual.add(arm.root);

  return { visual, wheels, caster, lidarTop, ledMaterial, head, arm, materials: mats };
}

// ------------------------------------------------------------------ arm

function buildArm(mats) {
  const root = new THREE.Group();
  root.name = 'robot_arm';
  root.position.copy(ROBOT_DIMS.shoulder);

  // pedestal from the body top to the shoulder
  const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.036, 0.11, 16), mats.metalDark);
  pedestal.position.set(0, -0.055, 0);
  addShadows(pedestal);
  root.add(pedestal);
  const pedestalRing = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.018, 20), mats.metal);
  pedestalRing.position.set(0, -0.101, 0);
  addShadows(pedestalRing);
  root.add(pedestalRing);

  // shoulder joint (axis X)
  const shoulder = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.05, 18), mats.metalDark);
  shoulder.rotation.z = Math.PI / 2;
  addShadows(shoulder);
  root.add(shoulder);
  const shoulderCap = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.054, 12), mats.accent);
  shoulderCap.rotation.z = Math.PI / 2;
  addShadows(shoulderCap);
  root.add(shoulderCap);

  // upper arm
  const upper = new THREE.Group();
  upper.name = 'robot_upper_arm';
  root.add(upper);

  const upperLink = new THREE.Mesh(rounded(0.036, 0.036, 0.15, 3, 0.012), mats.shell);
  upperLink.position.z = 0.075;
  addShadows(upperLink);
  upper.add(upperLink);

  const upperBand = new THREE.Mesh(rounded(0.039, 0.039, 0.018, 2, 0.006), mats.accent);
  upperBand.position.z = 0.03;
  addShadows(upperBand);
  upper.add(upperBand);

  const elbowJoint = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.044, 16), mats.metalDark);
  elbowJoint.rotation.z = Math.PI / 2;
  elbowJoint.position.z = ROBOT_DIMS.armL1;
  addShadows(elbowJoint);
  upper.add(elbowJoint);

  // forearm
  const forearm = new THREE.Group();
  forearm.name = 'robot_forearm';
  forearm.position.z = ROBOT_DIMS.armL1;
  upper.add(forearm);

  const forearmLink = new THREE.Mesh(rounded(0.03, 0.03, 0.15, 3, 0.01), mats.shell);
  forearmLink.position.z = 0.075;
  addShadows(forearmLink);
  forearm.add(forearmLink);

  const forearmBand = new THREE.Mesh(rounded(0.033, 0.033, 0.014, 2, 0.005), mats.accent);
  forearmBand.position.z = 0.125;
  addShadows(forearmBand);
  forearm.add(forearmBand);

  const wrist = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.018, 14), mats.metal);
  wrist.rotation.x = Math.PI / 2;
  wrist.position.z = 0.147;
  addShadows(wrist);
  forearm.add(wrist);

  // gripper
  const gripper = new THREE.Group();
  gripper.name = 'robot_gripper';
  gripper.position.z = ROBOT_DIMS.armL2;
  forearm.add(gripper);

  const palm = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.014, 0.022, 14), mats.metalDark);
  palm.rotation.x = Math.PI / 2;
  palm.position.z = 0.008;
  addShadows(palm);
  gripper.add(palm);

  const fingerGeo = rounded(0.008, 0.02, 0.036, 2, 0.0035);
  const tipGeo = rounded(0.008, 0.016, 0.01, 2, 0.003);
  const fingerL = new THREE.Mesh(fingerGeo, mats.rubber);
  const fingerR = new THREE.Mesh(fingerGeo, mats.rubber);
  const tipL = new THREE.Mesh(tipGeo, mats.accent);
  const tipR = new THREE.Mesh(tipGeo, mats.accent);
  for (const m of [fingerL, fingerR, tipL, tipR]) addShadows(m);
  fingerL.position.z = 0.032;
  fingerR.position.z = 0.032;
  tipL.position.z = 0.055;
  tipR.position.z = 0.055;
  gripper.add(fingerL, fingerR, tipL, tipR);

  let gripX = ROBOT_DIMS.gripOpen;
  function applyGripX(x) {
    gripX = Math.max(ROBOT_DIMS.gripClosed, Math.min(ROBOT_DIMS.gripOpen, x));
    fingerL.position.x = -gripX;
    fingerR.position.x = gripX;
    tipL.position.x = -gripX;
    tipR.position.x = gripX;
  }
  applyGripX(ROBOT_DIMS.gripOpen);

  return {
    root,
    upper,
    forearm,
    gripper,
    fingerL,
    fingerR,
    get gripX() {
      return gripX;
    },
    setGripX(x) {
      applyGripX(x);
    },
    setGrip(open01) {
      applyGripX(ROBOT_DIMS.gripClosed + (ROBOT_DIMS.gripOpen - ROBOT_DIMS.gripClosed) * Math.max(0, Math.min(1, open01)));
    },
  };
}

// ------------------------------------------------------------------ materials

function buildMaterials(ctx) {
  const M = ctx && ctx.materials;
  const get = (name) => {
    try {
      return M && typeof M.get === 'function' ? M.get(name) : null;
    } catch {
      return null;
    }
  };
  const variant = (name, overrides) => {
    try {
      return M && typeof M.variant === 'function' ? M.variant(name, overrides) : null;
    } catch {
      return null;
    }
  };
  const std = (params) => new THREE.MeshStandardMaterial(params);

  return {
    shell: get('plasticWhite') || std({ color: 0xe7e5df, roughness: 0.48, metalness: 0.02 }),
    accent:
      variant('plasticWhite', { color: 0xd9772f, roughness: 0.44, metalness: 0.04 }) ||
      std({ color: 0xd9772f, roughness: 0.44, metalness: 0.04 }),
    rubber: get('rubber') || std({ color: 0x1b1c1e, roughness: 0.92 }),
    metal: get('metalBrushed') || std({ color: 0xb9b9b4, metalness: 0.9, roughness: 0.34 }),
    metalDark: get('metalDark') || std({ color: 0x3b3e41, metalness: 0.85, roughness: 0.42 }),
    dark: get('plasticDark') || std({ color: 0x2b2d2f, roughness: 0.42, metalness: 0.05 }),
    lens: std({ color: 0x0a0e12, metalness: 0.7, roughness: 0.1, envMapIntensity: 1.2 }),
  };
}

// ------------------------------------------------------------------ geometry helpers

function rounded(w, h, d, segments = 3, radius = 0.01) {
  const r = Math.min(radius, Math.min(w, h, d) / 2 - 1e-4);
  return new RoundedBoxGeometry(w, h, d, segments, Math.max(r, 1e-4));
}

function addShadows(mesh) {
  mesh.castShadow = true;
  mesh.receiveShadow = true;
}

function buildWheelGeometry(radius, width) {
  const parts = [];
  const tire = new THREE.CylinderGeometry(radius, radius, width, 20, 1, false);
  tire.rotateZ(Math.PI / 2);
  parts.push(tire);

  const treadCount = 12;
  const treadRadius = radius - 0.0015;
  for (let i = 0; i < treadCount; i++) {
    const a = (i / treadCount) * TAU;
    const g = new THREE.BoxGeometry(width * 0.94, 0.007, 0.011);
    g.rotateX(a);
    g.translate(0, Math.cos(a) * treadRadius, Math.sin(a) * treadRadius);
    parts.push(g);
  }
  for (const g of parts) g.clearGroups();
  const merged = mergeGeometries(parts, false);
  if (!merged) return tire;
  for (const g of parts) g.dispose();
  merged.computeBoundingSphere();
  return merged;
}
