import * as THREE from 'three';
import { CONFIG } from './config.js';

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

// Third-person orbit rig with wall collision + first-person mode.
export function createCameraRig(camera, physics) {
  const C = CONFIG.camera;
  const state = {
    mode: 'third',
    yaw: 0,
    pitch: C.pitch,
    dist: C.dist,
    fpYaw: 0,
    fpPitch: -0.1,
    target: new THREE.Vector3(),
    desired: new THREE.Vector3(),
    pos: new THREE.Vector3(),
    initialized: false,
  };

  const _dir = new THREE.Vector3();
  const _right = new THREE.Vector3();
  const _tmp = new THREE.Vector3();
  const _los = new THREE.Vector3();
  const _camShape = physics && physics.RAPIER ? new physics.RAPIER.Ball(0.11) : null;
  const _camRot = { x: 0, y: 0, z: 0, w: 1 };
  function cameraBlocked(pos, robot) {
    if (!_camShape) return false;
    const hit = physics.world.intersectionWithShape(
      { x: pos.x, y: pos.y, z: pos.z },
      _camRot,
      _camShape,
      undefined,
      undefined,
      undefined,
      robot && robot.body ? robot.body : undefined,
      (collider) => {
        const o = physics.colliderToObj.get(collider.handle);
        if (!o) return false;
        return o.isStatic || (o.tags && o.tags.includes('furniture') && o.mass >= 5);
      }
    );
    return !!hit;
  }

  function cameraSeesRobot(pos, head, robot) {
    if (!physics) return true;
    _los.copy(head).sub(pos);
    const dist = _los.length();
    if (dist < 0.05) return true;
    _los.multiplyScalar(1 / dist);
    const hit = physics.castRay(pos, _los, dist, robot.colliders ? robot : null, {
      filterObj: (o) => o.isStatic || (o.tags && o.tags.includes('furniture') && o.mass >= 5),
    });
    return !hit || hit.distance > dist - 0.06;
  }

  function orbit(dx, dy) {
    if (state.mode === 'third') {
      state.yaw -= dx * 0.0042;
      state.pitch = clamp(state.pitch + dy * 0.0032, C.minPitch, C.maxPitch);
    } else {
      state.fpYaw -= dx * 0.0028;
      state.fpPitch = clamp(state.fpPitch - dy * 0.0028, -1.15, 1.15);
    }
  }

  function zoom(deltaY) {
    state.dist = clamp(state.dist + deltaY * 0.0016, C.minDist, C.maxDist);
  }

  function setMode(mode) {
    if (mode === state.mode) return;
    state.mode = mode;
    if (mode === 'first') {
      state.fpYaw = state.yaw; // third-person camera-forward == fp forward
      state.fpPitch = -0.08;
    } else {
      state.yaw = state.fpYaw;
      state.pitch = C.pitch;
    }
  }

  function toggleMode() {
    setMode(state.mode === 'third' ? 'first' : 'third');
  }

  function aimYaw() {
    return state.fpYaw;
  }

  function cameraForward(out = new THREE.Vector3()) {
    if (state.mode === 'first') {
      out.set(-Math.sin(state.fpYaw), 0, -Math.cos(state.fpYaw));
    } else {
      out.set(-Math.sin(state.yaw), 0, -Math.cos(state.yaw));
    }
    return out.normalize();
  }

  function cameraRight(out = new THREE.Vector3()) {
    if (state.mode === 'first') {
      out.set(Math.cos(state.fpYaw), 0, -Math.sin(state.fpYaw));
    } else {
      out.set(Math.cos(state.yaw), 0, -Math.sin(state.yaw));
    }
    return out.normalize();
  }

  function update(dt, robot) {
    if (!robot) return;
    const rp = robot.group.position;
    const yaw = robot.yaw;

    if (state.mode === 'first') {
      state.fpYaw = yaw;
      _dir.set(-Math.sin(yaw), 0, -Math.cos(yaw));
      camera.position.set(rp.x + _dir.x * 0.14, rp.y + 0.30, rp.z + _dir.z * 0.14);
      const e = new THREE.Euler(state.fpPitch, yaw, 0, 'YXZ');
      camera.quaternion.setFromEuler(e);
      camera.fov = 62;
      camera.updateProjectionMatrix();
      return;
    }

    camera.fov = CONFIG.camera.fov;
    camera.updateProjectionMatrix();

    const aspect = camera.aspect;
    const portrait = aspect < 0.8;
    const dist = state.dist * (portrait ? 1.55 : 1);
    const pitch = portrait ? Math.min(state.pitch, 0.3) : state.pitch;
    const cosP = Math.cos(pitch);
    _right.set(Math.cos(state.yaw), 0, -Math.sin(state.yaw));

    // Pick a target that is not inside furniture: shoulder-biased first, then centred,
    // then low. This stops the camera from being pinned inside a sofa/bed it is hugging.
    const baseY = rp.y + C.targetHeight;
    const candidates = [
      [rp.x + _right.x * C.shoulder, baseY, rp.z + _right.z * C.shoulder],
      [rp.x, baseY, rp.z],
      [rp.x, rp.y + C.targetHeight * 0.7, rp.z],
    ];
    state.target.set(candidates[0][0], candidates[0][1], candidates[0][2]);
    for (const c of candidates) {
      _tmp.set(c[0], c[1], c[2]);
      if (!cameraBlocked(_tmp, robot)) {
        state.target.copy(_tmp);
        break;
      }
    }

    state.desired.set(
      state.target.x + Math.sin(state.yaw) * cosP * dist,
      state.target.y + Math.sin(pitch) * dist,
      state.target.z + Math.cos(state.yaw) * cosP * dist
    );
    state.desired.y = Math.max(0.14, state.desired.y);

    const head = _tmp.set(rp.x, rp.y + 0.30, rp.z).clone();
    _dir.copy(state.desired).sub(head);
    const want = _dir.length();
    _dir.normalize();
    if (physics) {
      const hit = physics.castRay(head, _dir, want, robot.colliders ? robot : null, {
        filterObj: (o) => o.isStatic || (o.tags && o.tags.includes('furniture') && o.mass >= 5),
      });
      if (hit && hit.distance < want - 0.04) {
        const d = Math.max(0.14, hit.distance - 0.1);
        state.desired.copy(head).addScaledVector(_dir, d);
      }
    }

    // If the ideal camera sits inside furniture or has no line of sight to the robot,
    // first try higher/shifted orbits (over the sofa back, past a wardrobe).
    let blocked = cameraBlocked(state.desired, robot) || !cameraSeesRobot(state.desired, head, robot);
    if (blocked) {
      const alts = [
        [0, 0.3, 1], [0.32, 0.32, 0.95], [-0.32, 0.32, 0.95],
        [0, 0.55, 0.95], [0.55, 0.42, 0.9], [-0.55, 0.42, 0.9],
        [0.85, 0.5, 0.85], [-0.85, 0.5, 0.85],
        [1.2, 0.35, 0.75], [-1.2, 0.35, 0.75], [1.5, 0.45, 0.7], [-1.5, 0.45, 0.7],
      ];
      const headPoint = new THREE.Vector3(rp.x, rp.y + 0.30, rp.z);
      for (const [dyaw, dpitch, dscale] of alts) {
        const y2 = state.yaw + dyaw;
        const p2 = clamp(pitch + dpitch, C.minPitch, C.maxPitch);
        const d2 = dist * dscale;
        const c2 = Math.cos(p2);
        _tmp.set(
          state.target.x + Math.sin(y2) * c2 * d2,
          Math.max(0.14, state.target.y + Math.sin(p2) * d2),
          state.target.z + Math.cos(y2) * c2 * d2
        );
        if (!cameraBlocked(_tmp, robot) && cameraSeesRobot(_tmp, headPoint, robot)) {
          state.desired.copy(_tmp);
          blocked = false;
          break;
        }
      }
    }

    // Push the camera out of any remaining furniture volume, moving toward the robot
    // head (always inside the free space the robot occupies).
    for (let i = 0; i < 12 && blocked; i++) {
      state.desired.lerp(head, 0.22);
      blocked = cameraBlocked(state.desired, robot);
    }
    if (blocked) {
      // Low under-furniture perch first: when the robot is under a table the only
      // clear line of sight is from just outside the table edge at head height.
      const lowPerch = [[0.55, 0.26], [0.85, 0.28], [0.35, 0.22], [0.7, 0.45], [0.9, 0.55]];
      for (const [back, up] of lowPerch) {
        _tmp.set(
          rp.x + Math.sin(state.yaw) * back,
          rp.y + up,
          rp.z + Math.cos(state.yaw) * back
        );
        if (!cameraBlocked(_tmp, robot) && cameraSeesRobot(_tmp, head, robot)) {
          state.desired.copy(_tmp);
          blocked = false;
          break;
        }
      }
    }
    if (blocked) {
      // High over-the-shoulder perch, still outside furniture and with line of sight.
      const perch = [
        [0.65, 0.95], [0.9, 1.15], [0.45, 0.7], [1.2, 1.25],
      ];
      for (const [back, up] of perch) {
        _tmp.set(
          rp.x + Math.sin(state.yaw) * back,
          rp.y + up,
          rp.z + Math.cos(state.yaw) * back
        );
        if (!cameraBlocked(_tmp, robot) && cameraSeesRobot(_tmp, head, robot)) {
          state.desired.copy(_tmp);
          blocked = false;
          break;
        }
      }
    }
    if (blocked) state.desired.copy(head);
    state.desired.y = Math.max(0.12, state.desired.y);
    // Never let the camera leave the apartment shell.
    const A = CONFIG.apartment;
    state.desired.x = clamp(state.desired.x, A.minX + 0.18, A.maxX - 0.18);
    state.desired.z = clamp(state.desired.z, A.minZ + 0.18, A.maxZ - 0.18);
    state.desired.y = clamp(state.desired.y, 0.12, A.ceiling - 0.12);

    if (!state.initialized) {
      state.pos.copy(state.desired);
      state.initialized = true;
    } else {
      const k = 1 - Math.exp(-dt * 14);
      state.pos.lerp(state.desired, k);
    }
    state.pos.x = clamp(state.pos.x, A.minX + 0.18, A.maxX - 0.18);
    state.pos.z = clamp(state.pos.z, A.minZ + 0.18, A.maxZ - 0.18);
    state.pos.y = clamp(state.pos.y, 0.12, A.ceiling - 0.12);
    camera.position.copy(state.pos);
    _tmp.copy(state.target);
    _tmp.y += 0.02;
    camera.lookAt(_tmp);
  }

  function reset() {
    state.yaw = 0;
    state.pitch = C.pitch;
    state.dist = C.dist;
    state.mode = 'third';
    state.initialized = false;
  }

  return {
    state,
    orbit,
    zoom,
    setMode,
    toggleMode,
    aimYaw,
    cameraForward,
    cameraRight,
    update,
    reset,
    blockedAt: (x, y, z, robot) => cameraBlocked({ x, y, z }, robot),
    get mode() {
      return state.mode;
    },
  };
}
