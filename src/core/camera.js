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
      camera.position.set(rp.x + _dir.x * 0.16, rp.y + 0.35, rp.z + _dir.z * 0.16);
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
    state.target.set(rp.x, rp.y + C.targetHeight, rp.z).addScaledVector(_right, C.shoulder);

    state.desired.set(
      state.target.x + Math.sin(state.yaw) * cosP * dist,
      state.target.y + Math.sin(pitch) * dist,
      state.target.z + Math.cos(state.yaw) * cosP * dist
    );
    state.desired.y = Math.max(0.16, state.desired.y);

    _dir.copy(state.desired).sub(state.target);
    const want = _dir.length();
    _dir.normalize();
    if (physics) {
      const hit = physics.castRay(state.target, _dir, want, robot.colliders ? robot : null, {
        filterObj: (o) => o.isStatic || (o.tags && o.tags.includes('furniture') && o.mass >= 5),
      });
      if (hit && hit.distance < want - 0.04) {
        const d = Math.max(0.14, hit.distance - 0.1);
        state.desired.copy(state.target).addScaledVector(_dir, d);
      }
    }

    if (!state.initialized) {
      state.pos.copy(state.desired);
      state.initialized = true;
    } else {
      const k = 1 - Math.exp(-dt * 14);
      state.pos.lerp(state.desired, k);
    }
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
    get mode() {
      return state.mode;
    },
  };
}
