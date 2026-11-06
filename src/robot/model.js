// Procedural robot visual: small industrial rover, feet-origin local frame.
// Forward is -Z, up is +Y. The robot group origin sits on the ground (wheels at y=0).
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export const ROBOT_DIMS = {
  // Physics body origin height when the robot rests on the floor.
  bodyY: 0.21,
  colliderRadius: 0.16,
  colliderHalfHeight: 0.19,
  height: 0.415,
  width: 0.326,
  wheelRadius: 0.055,
  wheelWidth: 0.036,
  wheelX: 0.145,
  wheelZ: 0.115,
  // Arm
  armL1: 0.22,
  armL2: 0.22,
  maxExtension: 0.18,
  shoulder: new THREE.Vector3(0, 0.26, -0.1),
  park: new THREE.Vector3(0, 0.18, -0.34),
  // Mount points
  head: new THREE.Vector3(0, 0.305, 0),
  cameraY: 0.34,
  tiltPivotY: 0.12,
};

const TAU = Math.PI * 2;

export function buildRobotModel(ctx) {
  const mats = buildMaterials(ctx);
  const visual = new THREE.Group();
  visual.name = 'robot_visual';

  // ------------------------------------------------------------- wheels
  const wheelGeo = buildWheelGeometry(ROBOT_DIMS.wheelRadius, ROBOT_DIMS.wheelWidth);
  const hubGeo = new THREE.CylinderGeometry(0.021, 0.021, ROBOT_DIMS.wheelWidth + 0.006, 16);
  hubGeo.rotateZ(Math.PI / 2);
  const wheels = [];
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const wheel = new THREE.Mesh(wheelGeo, mats.rubber);
      wheel.position.set(sx * ROBOT_DIMS.wheelX, 0.057, sz * ROBOT_DIMS.wheelZ);
      addShadows(wheel);
      visual.add(wheel);
      wheels.push(wheel);

      const hub = new THREE.Mesh(hubGeo, mats.accent);
      hub.position.copy(wheel.position);
      addShadows(hub);
      visual.add(hub);
    }
  }

  // ------------------------------------------------------------- body (leans)
  const tilt = new THREE.Group();
  tilt.name = 'robot_tilt';
  tilt.position.y = ROBOT_DIMS.tiltPivotY;
  visual.add(tilt);
  const T = (y) => y - ROBOT_DIMS.tiltPivotY; // absolute height -> tilt-local

  // chassis shell
  const chassis = new THREE.Mesh(rounded(0.26, 0.12, 0.32, 4, 0.022), mats.shell);
  chassis.position.set(0, T(0.135), 0);
  addShadows(chassis);
  tilt.add(chassis);

  // underbody
  const under = new THREE.Mesh(rounded(0.2, 0.045, 0.24, 2, 0.008), mats.metalDark);
  under.position.set(0, T(0.105), 0);
  addShadows(under);
  tilt.add(under);

  // top deck plate
  const deck = new THREE.Mesh(rounded(0.24, 0.024, 0.3, 2, 0.008), mats.metal);
  deck.position.set(0, T(0.198), 0);
  addShadows(deck);
  tilt.add(deck);

  // bumpers
  const bumperFront = new THREE.Mesh(rounded(0.25, 0.042, 0.035, 3, 0.012), mats.accent);
  bumperFront.position.set(0, T(0.135), -0.168);
  addShadows(bumperFront);
  tilt.add(bumperFront);

  const bumperRear = new THREE.Mesh(rounded(0.25, 0.042, 0.035, 3, 0.012), mats.metalDark);
  bumperRear.position.set(0, T(0.135), 0.168);
  addShadows(bumperRear);
  tilt.add(bumperRear);

  // side accent strips
  for (const sx of [-1, 1]) {
    const strip = new THREE.Mesh(rounded(0.014, 0.028, 0.22, 2, 0.005), mats.accent);
    strip.position.set(sx * 0.132, T(0.14), 0);
    addShadows(strip);
    tilt.add(strip);
  }

  // front sensor bar
  const sensorBar = new THREE.Mesh(rounded(0.2, 0.024, 0.012, 2, 0.005), mats.dark);
  sensorBar.position.set(0, T(0.168), -0.163);
  addShadows(sensorBar);
  tilt.add(sensorBar);

  // neck
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.032, 0.05, 16), mats.metalDark);
  neck.position.set(0, T(0.2365), 0);
  addShadows(neck);
  tilt.add(neck);

  // head
  const head = new THREE.Group();
  head.name = 'robot_head';
  head.position.set(0, T(0.305), 0);
  tilt.add(head);

  const headShell = new THREE.Mesh(rounded(0.15, 0.085, 0.145, 4, 0.026), mats.shell);
  addShadows(headShell);
  head.add(headShell);

  const visor = new THREE.Mesh(rounded(0.154, 0.04, 0.149, 3, 0.012), mats.dark);
  addShadows(visor);
  head.add(visor);

  // 4-lens camera ring (front / back / left / right)
  const lensGeo = new THREE.CylinderGeometry(0.017, 0.017, 0.016, 16);
  const ringGeo = new THREE.TorusGeometry(0.019, 0.0028, 6, 16);
  const lensSpecs = [
    { pos: [0, 0, -0.0775], axis: 'z' },
    { pos: [0, 0, 0.0775], axis: 'z' },
    { pos: [-0.079, 0, 0], axis: 'x' },
    { pos: [0.079, 0, 0], axis: 'x' },
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
    if (spec.axis === 'z') ring.position.z += Math.sign(spec.pos[2]) * 0.008;
    else {
      ring.rotation.y = Math.PI / 2;
      ring.position.x += Math.sign(spec.pos[0]) * 0.008;
    }
    head.add(ring);
  }

  // status LED on the head
  const ledMaterial = new THREE.MeshStandardMaterial({
    color: 0x241708,
    emissive: 0xffa22a,
    emissiveIntensity: 1.8,
    roughness: 0.35,
    metalness: 0.1,
  });
  const led = new THREE.Mesh(new THREE.SphereGeometry(0.0075, 12, 8), ledMaterial);
  led.position.set(0.032, T(0.3515), -0.03);
  head.add(led);

  // antenna
  const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.06, 8), mats.metalDark);
  antenna.position.set(0.05, T(0.3775), 0.045);
  addShadows(antenna);
  head.add(antenna);
  const antennaTip = new THREE.Mesh(new THREE.SphereGeometry(0.006, 10, 8), mats.accent);
  antennaTip.position.set(0.05, T(0.4095), 0.045);
  head.add(antennaTip);

  // ------------------------------------------------------------- arm
  const arm = buildArm(mats);

  return { visual, tilt, wheels, ledMaterial, head, arm, materials: mats };
}

// ------------------------------------------------------------------ arm

function buildArm(mats) {
  const root = new THREE.Group();
  root.name = 'robot_arm';
  root.position.copy(ROBOT_DIMS.shoulder);

  // turret + shoulder joint
  const turret = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.043, 0.034, 20), mats.metalDark);
  turret.position.y = -0.031;
  addShadows(turret);
  root.add(turret);

  const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.009, 20), mats.metal);
  collar.position.y = -0.012;
  addShadows(collar);
  root.add(collar);

  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.026, 16, 12), mats.metalDark);
  addShadows(ball);
  root.add(ball);

  // upper arm
  const upper = new THREE.Group();
  upper.name = 'robot_upper_arm';
  root.add(upper);

  const upperShell = new THREE.Mesh(rounded(0.042, 0.042, 0.22, 3, 0.014), mats.shell);
  upperShell.position.z = 0.11;
  addShadows(upperShell);
  upper.add(upperShell);

  const upperBand = new THREE.Mesh(rounded(0.045, 0.045, 0.026, 2, 0.009), mats.accent);
  upperBand.position.z = 0.045;
  addShadows(upperBand);
  upper.add(upperBand);

  const elbow = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.052, 16), mats.metalDark);
  elbow.rotation.z = Math.PI / 2;
  elbow.position.z = ROBOT_DIMS.armL1;
  addShadows(elbow);
  upper.add(elbow);

  // forearm
  const forearm = new THREE.Group();
  forearm.name = 'robot_forearm';
  forearm.position.z = ROBOT_DIMS.armL1;
  upper.add(forearm);

  const forearmShell = new THREE.Mesh(rounded(0.034, 0.034, 0.22, 3, 0.012), mats.shell);
  forearmShell.position.z = 0.11;
  addShadows(forearmShell);
  forearm.add(forearmShell);

  const forearmBand = new THREE.Mesh(rounded(0.036, 0.036, 0.02, 2, 0.007), mats.accent);
  forearmBand.position.z = 0.196;
  addShadows(forearmBand);
  forearm.add(forearmBand);

  const wristCollar = new THREE.Mesh(new THREE.CylinderGeometry(0.019, 0.019, 0.024, 14), mats.metal);
  wristCollar.rotation.x = Math.PI / 2;
  wristCollar.position.z = ROBOT_DIMS.armL2 - 0.004;
  addShadows(wristCollar);
  forearm.add(wristCollar);

  // telescoping wrist rail + gripper
  const wrist = new THREE.Group();
  wrist.name = 'robot_wrist';
  wrist.position.z = ROBOT_DIMS.armL2;
  forearm.add(wrist);

  const railGeo = new THREE.BoxGeometry(0.014, 0.014, 1);
  const rail = new THREE.Mesh(railGeo, mats.metalDark);
  addShadows(rail);
  wrist.add(rail);

  const gripper = new THREE.Group();
  gripper.name = 'robot_gripper';
  wrist.add(gripper);

  const palm = new THREE.Mesh(new THREE.CylinderGeometry(0.019, 0.017, 0.03, 14), mats.metalDark);
  palm.rotation.x = Math.PI / 2;
  palm.position.z = 0.012;
  addShadows(palm);
  gripper.add(palm);

  const fingerGeo = rounded(0.011, 0.028, 0.055, 2, 0.005);
  const tipGeo = rounded(0.011, 0.02, 0.013, 2, 0.004);
  const fingerL = new THREE.Mesh(fingerGeo, mats.rubber);
  const fingerR = new THREE.Mesh(fingerGeo, mats.rubber);
  const tipL = new THREE.Mesh(tipGeo, mats.accent);
  const tipR = new THREE.Mesh(tipGeo, mats.accent);
  for (const m of [fingerL, fingerR, tipL, tipR]) addShadows(m);
  fingerL.position.z = 0.045;
  fingerR.position.z = 0.045;
  tipL.position.z = 0.074;
  tipR.position.z = 0.074;
  gripper.add(fingerL, fingerR, tipL, tipR);

  let extension = 0;
  let grip = 1;
  function applyGrip() {
    const x = 0.02 + grip * 0.025;
    fingerL.position.x = -x;
    fingerR.position.x = x;
    tipL.position.x = -x;
    tipR.position.x = x;
  }
  function applyExtension() {
    const len = Math.max(0.0001, extension + 0.07);
    rail.scale.z = len;
    rail.position.z = (extension - 0.07) / 2;
    gripper.position.z = extension;
  }
  applyGrip();
  applyExtension();

  return {
    root,
    upper,
    forearm,
    wrist,
    gripper,
    fingerL,
    fingerR,
    rail,
    get extension() {
      return extension;
    },
    get grip() {
      return grip;
    },
    setExtension(v) {
      extension = Math.max(0, Math.min(ROBOT_DIMS.maxExtension, v));
      applyExtension();
    },
    setGrip(v) {
      grip = Math.max(0, Math.min(1, v));
      applyGrip();
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

  const treadCount = 14;
  const treadRadius = radius - 0.002;
  for (let i = 0; i < treadCount; i++) {
    const a = (i / treadCount) * TAU;
    const g = new THREE.BoxGeometry(width * 0.94, 0.008, 0.013);
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
