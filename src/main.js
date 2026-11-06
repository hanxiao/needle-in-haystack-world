import * as THREE from 'three';
import { CONFIG } from './core/config.js';
import { createPhysics } from './core/physics.js';
import { createMaterials } from './core/materials.js';
import { createRenderSystem } from './core/renderer.js';
import { createCameraRig } from './core/camera.js';
import { createHud, prettyName, formatMass } from './ui/hud.js';
import { buildWorld } from './world/index.js';
import { createRobot } from './robot/robot.js';

const errors = [];
window.addEventListener('error', (e) => errors.push(String(e.message)));
window.addEventListener('unhandledrejection', (e) => errors.push(String(e.reason?.message || e.reason)));

const boot = document.getElementById('boot');
const canvas = document.getElementById('scene');
const hudCanvas = document.getElementById('hud-scene');

const state = {
  ready: false,
  hintUsed: false,
  hover: null,
  hit: null,
  forcedAim: null,
  night: false,
  surround: true,
  needleFound: false,
  drawCalls: 0,
  triangles: 0,
  debug: new URLSearchParams(location.search).has('debug'),
  lastPush: 0,
  pointer: { x: window.innerWidth / 2, y: window.innerHeight / 2, active: false },
};

const keys = new Set();
const pointer = { down: false, x: 0, y: 0, moved: 0 };
let fps = 60;
let fpsFrames = 0;
let fpsTime = performance.now();
let frameCount = 0;

async function init() {
  const renderSystem = createRenderSystem(canvas, hudCanvas);
  const { scene, camera } = renderSystem;
  const physics = await createPhysics(scene);
  const materials = createMaterials(renderSystem.renderer);
  const ctx = {
    THREE,
    RAPIER: physics.RAPIER,
    scene,
    renderer: renderSystem.renderer,
    physics,
    materials,
    config: CONFIG,
    renderSystem,
  };

  const world = buildWorld(ctx);
  physics.settle(100);

  const robot = createRobot(ctx);
  const spawn = world.spawn || CONFIG.spawn;
  robot.setPose(spawn.pos, spawn.yaw ?? 0);

  const rig = createCameraRig(camera, physics);
  rig.state.yaw = spawn.yaw ?? 0;
  rig.state.initialized = false;

  const hud = createHud(document.getElementById('hud'));
  hud.setSurround(state.surround);

  const marker = new THREE.Mesh(
    new THREE.RingGeometry(0.022, 0.032, 32),
    new THREE.MeshBasicMaterial({
      color: 0xf0b35c,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
      depthTest: true,
      depthWrite: false,
    })
  );
  marker.visible = false;
  marker.renderOrder = 6;
  scene.add(marker);

  // ------------------------------------------------------------ helpers

  function roomAt(pos) {
    for (const r of world.rooms) {
      const b = r.bounds;
      if (pos.x >= b.minX && pos.x <= b.maxX && pos.z >= b.minZ && pos.z <= b.maxZ) return r;
    }
    let best = world.rooms[0];
    let bestD = Infinity;
    for (const r of world.rooms) {
      const dx = r.center[0] - pos.x;
      const dz = r.center[2] - pos.z;
      const d = dx * dx + dz * dz;
      if (d < bestD) {
        bestD = d;
        best = r;
      }
    }
    return best;
  }

  function objectCenter(obj) {
    const t = obj.body.translation();
    return new THREE.Vector3(t.x, t.y, t.z);
  }

  function robotExclude() {
    return robot.colliders && robot.colliders.length ? robot : null;
  }

  function setSurround(on) {
    state.surround = on;
    hud.setSurround(on);
    if (!on) renderSystem.clearHud();
  }

  function setNight(on) {
    state.night = on;
    renderSystem.setNight(on);
  }

  function pushObject(obj) {
    if (obj.isStatic) return;
    const now = performance.now();
    if (now - state.lastPush < CONFIG.pushCooldown * 1000) return;
    state.lastPush = now;
    const dir = rig.cameraForward(new THREE.Vector3());
    const impulse = dir.multiplyScalar(CONFIG.pushImpulse);
    impulse.y = 0.12;
    const t = obj.body.translation();
    const point = state.hit ? state.hit.point : new THREE.Vector3(t.x, t.y, t.z);
    obj.body.applyImpulseAtPoint({ x: impulse.x, y: impulse.y, z: impulse.z }, point, true);
    hud.showToast(`${prettyName(obj.name)} · ${formatMass(obj.mass)}`, 'heavy');
  }

  function action() {
    state.hintUsed = true;
    if (robot.arm.held) {
      robot.release();
      hud.showToast('RELEASED');
      return;
    }
    if (!state.hover) return;
    const obj = state.hover;
    if (obj.mass > robot.arm.maxLiftKg) {
      pushObject(obj);
      return;
    }
    if (!robot.canReach(objectCenter(obj))) {
      hud.showToast('OUT OF REACH', 'heavy');
      return;
    }
    const res = robot.grab(obj);
    if (!res || !res.ok) {
      hud.showToast(String(res?.reason || 'CANNOT GRAB').toUpperCase(), 'heavy');
      return;
    }
    if (obj.name.includes('needle')) {
      state.needleFound = true;
      hud.showToast('NEEDLE FOUND', 'good');
    } else {
      hud.showToast(`GRABBED · ${prettyName(obj.name)}`, 'good');
    }
  }

  function resetAll() {
    if (robot.arm.held) robot.release();
    physics.resetDynamic();
    robot.setPose(spawn.pos, spawn.yaw ?? 0);
    rig.reset();
    state.needleFound = false;
    state.hintUsed = false;
    state.hover = null;
    state.hit = null;
    state.forcedAim = null;
    hud.showToast('RESET');
  }

  function facePoint(point) {
    const rp = robot.group.position;
    const dx = point.x - rp.x;
    const dz = point.z - rp.z;
    const yaw = Math.atan2(-dx, -dz);
    robot.setPose([rp.x, rp.y, rp.z], yaw);
    rig.state.yaw = yaw;
    rig.state.initialized = false;
    state.forcedAim = point.clone();
  }

  function findFreeSpot(obj, preferred = 0.45) {
    const c = objectCenter(obj);
    const RAPIER = physics.RAPIER;
    const shape = new RAPIER.Cylinder(0.19, 0.16);
    const rot = { x: 0, y: 0, z: 0, w: 1 };
    const candidates = [];
    for (let ring = 0; ring < 4; ring++) {
      const radius = preferred + ring * 0.12;
      for (let i = 0; i < 20; i++) {
        const a = (i / 20) * Math.PI * 2 + ring * 0.16;
        const x = c.x + Math.cos(a) * radius;
        const z = c.z + Math.sin(a) * radius;
        if (x < -5.35 || x > 5.35 || z < -3.55 || z > 3.55) continue;
        const down = physics.castRay([x, 2.2, z], [0, -1, 0], 2.3);
        if (!down || down.point.y > 0.06) continue;
        const overlap = physics.world.intersectionWithShape(
          { x, y: 0.23, z },
          rot,
          shape,
          undefined,
          undefined,
          undefined,
          robot.body,
          (collider) => {
            const o = physics.colliderToObj.get(collider.handle);
            if (!o) return false;
            if (o.isStatic && o.body.translation().y < 0.14) return false;
            return true;
          }
        );
        if (overlap) continue;
        const shoulderY = 0.26;
        const d = Math.hypot(c.x - x, c.y - shoulderY, c.z - z);
        candidates.push({ x, z, d, floorY: down.point.y });
      }
      if (candidates.some((s) => s.d <= 0.6)) break;
    }
    if (!candidates.length) return null;
    const reachable = candidates.filter((s) => s.d <= 0.6);
    const pool = reachable.length ? reachable : candidates;
    pool.sort((a, b) => Math.abs(a.d - 0.5) - Math.abs(b.d - 0.5));
    return pool[0];
  }

  function teleportNear(name, dist = 0.5) {
    const obj = physics.get(name);
    if (!obj) return null;
    const c = objectCenter(obj);
    const spot = findFreeSpot(obj, Math.max(0.35, Math.min(dist, 0.6)));
    let px;
    let pz;
    if (spot) {
      px = spot.x;
      pz = spot.z;
    } else {
      const room = roomAt(c);
      const dir = new THREE.Vector3((room?.center?.[0] ?? 0) - c.x, 0, (room?.center?.[2] ?? 0) - c.z);
      if (dir.lengthSq() < 1e-4) dir.set(1, 0, 0);
      dir.normalize();
      px = c.x + dir.x * dist;
      pz = c.z + dir.z * dist;
    }
    const yaw = Math.atan2(-(c.x - px), -(c.z - pz));
    robot.setPose([px, 0, pz], yaw);
    rig.state.yaw = yaw;
    rig.state.pitch = 0.4;
    rig.state.dist = 1.25;
    rig.state.initialized = false;
    state.forcedAim = c.clone();
    return { pos: [px, 0, pz], yaw, object: c.toArray(), freeSpot: !!spot };
  }

  function sampleCanvas(which, rect) {
    const renderer = which === 'hud' ? renderSystem.hudRenderer : renderSystem.renderer;
    const gl = renderer.getContext();
    const dpr = renderer.getPixelRatio();
    const x = Math.round(rect.x * dpr);
    const y = Math.round((window.innerHeight - rect.y - rect.h) * dpr);
    const w = Math.max(1, Math.round(rect.w * dpr));
    const h = Math.max(1, Math.round(rect.h * dpr));
    const buf = new Uint8Array(w * h * 4);
    gl.readPixels(x, y, w, h, gl.RGBA, gl.UNSIGNED_BYTE, buf);
    let lit = 0;
    let sum = 0;
    for (let i = 0; i < buf.length; i += 4) {
      const v = buf[i] + buf[i + 1] + buf[i + 2];
      sum += v;
      if (v > 40) lit++;
    }
    return { litRatio: lit / (w * h), mean: sum / (w * h * 3), w, h };
  }

  // ------------------------------------------------------------ loop

  const clock = { last: performance.now(), acc: 0 };
  const forward = new THREE.Vector3();
  const right = new THREE.Vector3();
  const move = new THREE.Vector3();
  const fallbackAim = new THREE.Vector3();

  function updateHud() {
    const rp = robot.group.position;
    const room = roomAt(rp);
    const held = robot.arm.held
      ? { name: robot.arm.held.name, mass: robot.arm.held.mass }
      : null;
    let target = null;
    const heldObj = robot.arm.held;
    if (state.hover && state.hover !== heldObj) {
      target = {
        name: state.hover.name,
        mass: state.hover.mass,
        heavy: state.hover.mass > robot.arm.maxLiftKg,
        reachable: robot.canReach(objectCenter(state.hover)),
      };
    }
    hud.update({
      mode: rig.mode,
      pointer: state.pointer,
      roomLabel: room?.label || 'APARTMENT',
      target,
      held,
      hint: !state.hintUsed,
      debug: state.debug,
      fps,
      drawCalls: state.drawCalls,
      dynamic: physics.dynamicObjects.length,
      needleFound: state.needleFound,
    });
  }

  function tick(now) {
    requestAnimationFrame(tick);
    const dt = Math.min((now - clock.last) / 1000, 0.08);
    clock.last = now;

    const boost = keys.has('ShiftLeft') || keys.has('ShiftRight');
    rig.cameraForward(forward);
    rig.cameraRight(right);
    const mx = (keys.has('KeyD') ? 1 : 0) - (keys.has('KeyA') ? 1 : 0);
    const mz = (keys.has('KeyW') ? 1 : 0) - (keys.has('KeyS') ? 1 : 0);
    move.set(0, 0, 0).addScaledVector(forward, mz).addScaledVector(right, mx);
    if (move.lengthSq() > 1e-6) {
      move.normalize();
      state.hintUsed = true;
    }

    let ndcX = 0;
    let ndcY = 0;
    if (rig.mode !== 'first') {
      ndcX = (state.pointer.x / window.innerWidth) * 2 - 1;
      ndcY = -(state.pointer.y / window.innerHeight) * 2 + 1;
    }
    const rayHit = physics.castRayFromCamera(camera, ndcX, ndcY, 14, robotExclude());
    const hover = rayHit && !rayHit.obj.isStatic ? rayHit.obj : null;

    let aim;
    if (state.forcedAim) {
      aim = state.forcedAim;
      state.forcedAim = null;
    } else if (hover) {
      aim = objectCenter(hover);
    } else if (rayHit) {
      aim = rayHit.point;
    } else {
      const rp = robot.group.position;
      fallbackAim.set(rp.x + forward.x * 0.7, rp.y + 0.28, rp.z + forward.z * 0.7);
      aim = fallbackAim;
    }

    robot.update(dt, {
      move: [move.x, move.z],
      lookYaw: rig.mode === 'first' ? rig.state.fpYaw : null,
      lookPitch: rig.mode === 'first' ? rig.state.fpPitch : 0,
      aim,
      boost,
    });

    clock.acc += dt;
    let steps = 0;
    while (clock.acc >= CONFIG.fixedStep && steps < CONFIG.maxSubsteps) {
      physics.step();
      clock.acc -= CONFIG.fixedStep;
      steps++;
    }
    if (steps === CONFIG.maxSubsteps) clock.acc = 0;
    physics.sync(clock.acc / CONFIG.fixedStep);

    rig.update(dt, robot);

    state.hover = hover;
    state.hit = rayHit;

    if (hover && rayHit) {
      marker.visible = true;
      marker.position.copy(rayHit.point).addScaledVector(camera.getWorldDirection(new THREE.Vector3()), -0.012);
      marker.quaternion.copy(camera.quaternion);
      marker.material.color.setHex(hover.mass > robot.arm.maxLiftKg ? 0xe07a5f : 0xf0b35c);
    } else {
      marker.visible = false;
    }

    updateHud();

    const robotVisible = rig.mode !== 'first';
    robot.group.visible = robotVisible;
    renderSystem.render();
    robot.group.visible = true;
    if (state.surround && frameCount % 2 === 0) {
      renderSystem.renderHud(robot, hud.layout());
    }
    const stats = renderSystem.stats();
    state.drawCalls = stats.calls;
    state.triangles = stats.triangles;
    frameCount++;

    fpsFrames++;
    if (now - fpsTime > 500) {
      fps = Math.round((fpsFrames * 1000) / (now - fpsTime));
      fpsFrames = 0;
      fpsTime = now;
    }

    if (!state.ready) {
      state.ready = true;
      document.documentElement.dataset.ready = '1';
      if (window.__APP__) window.__APP__.ready = true;
    }
  }

  // ------------------------------------------------------------ input

  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault();
    if (e.repeat) return;
    keys.add(e.code);
    switch (e.code) {
      case 'KeyC':
        setSurround(!state.surround);
        break;
      case 'KeyV':
        rig.toggleMode();
        hud.showToast(rig.mode === 'first' ? 'FIRST PERSON' : 'THIRD PERSON');
        break;
      case 'KeyL':
        setNight(!state.night);
        hud.showToast(state.night ? 'NIGHT' : 'DAY');
        break;
      case 'KeyH':
        state.hintUsed = !state.hintUsed;
        break;
      case 'KeyR':
        resetAll();
        break;
      case 'Space':
        action();
        break;
      default:
        break;
    }
  });
  window.addEventListener('keyup', (e) => keys.delete(e.code));
  window.addEventListener('blur', () => keys.clear());

  window.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    pointer.down = true;
    pointer.x = e.clientX;
    pointer.y = e.clientY;
    pointer.moved = 0;
    state.pointer.x = e.clientX;
    state.pointer.y = e.clientY;
    if (e.pointerType === 'mouse') state.pointer.active = true;
  });
  window.addEventListener('pointermove', (e) => {
    state.pointer.x = e.clientX;
    state.pointer.y = e.clientY;
    if (e.pointerType === 'mouse') state.pointer.active = true;
    if (!pointer.down) return;
    const dx = e.clientX - pointer.x;
    const dy = e.clientY - pointer.y;
    pointer.x = e.clientX;
    pointer.y = e.clientY;
    pointer.moved += Math.abs(dx) + Math.abs(dy);
    rig.orbit(dx, dy);
  });
  window.addEventListener('pointerup', (e) => {
    if (!pointer.down) return;
    pointer.down = false;
    if (pointer.moved < 6) action();
  });
  window.addEventListener('pointercancel', () => {
    pointer.down = false;
  });
  window.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault();
      rig.zoom(e.deltaY);
    },
    { passive: false }
  );
  window.addEventListener('contextmenu', (e) => e.preventDefault());
  window.addEventListener('resize', () => {
    if (state.pointer.x < 0 || state.pointer.y < 0 || state.pointer.x > window.innerWidth || state.pointer.y > window.innerHeight) {
      state.pointer.x = window.innerWidth / 2;
      state.pointer.y = window.innerHeight / 2;
      state.pointer.active = false;
    }
    renderSystem.resize();
    hud.layout(true);
    renderSystem.clearHud();
  });
  canvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    hud.showToast('GPU CONTEXT LOST', 'heavy');
  });

  // ------------------------------------------------------------ debug / QA

  const api = {
    ready: false,
    errors,
    get fps() {
      return fps;
    },
    get frame() {
      return frameCount;
    },
    get physics() {
      return physics;
    },
    get robot() {
      return robot;
    },
    get world() {
      return world;
    },
    get scene() {
      return scene;
    },
    get renderer() {
      return renderSystem.renderer;
    },
    get hudRenderer() {
      return renderSystem.hudRenderer;
    },
    state() {
      const rp = robot.group.position;
      const room = roomAt(rp);
      return {
        ready: state.ready,
        fps,
        frame: frameCount,
        room: room?.label || null,
        robot: {
          pos: [rp.x, rp.y, rp.z],
          yaw: robot.yaw,
          held: robot.arm.held?.name || null,
          mode: rig.mode,
          grounded: robot.getState?.().grounded ?? null,
        },
        target: state.hover?.name || null,
        night: state.night,
        surround: state.surround,
        needleFound: state.needleFound,
        physics: physics.stats(),
        drawCalls: state.drawCalls,
        triangles: state.triangles,
        camera: { mode: rig.mode, pos: camera.position.toArray() },
        hud: {
          room: hud.els.room.textContent,
          target: hud.els.target.hidden ? null : hud.els.target.textContent,
          held: hud.els.held.hidden ? null : hud.els.held.textContent,
        },
        errors: errors.slice(0, 8),
      };
    },
    qa: {
      state() {
        return api.state();
      },
      object(name) {
        const o = physics.get(name);
        if (!o) return null;
        const t = o.body.translation();
        return {
          name: o.name,
          mass: o.mass,
          static: o.isStatic,
          pos: [t.x, t.y, t.z],
          tags: o.tags,
          room: o.room,
          grabbable: o.grabbable,
        };
      },
      objects() {
        return physics.objects.map((o) => {
          const t = o.body.translation();
          return { name: o.name, mass: o.mass, static: o.isStatic, pos: [t.x, t.y, t.z], room: o.room };
        });
      },
      teleport(x, z, yaw = 0) {
        robot.setPose([x, 0, z], yaw);
        rig.state.yaw = yaw;
        rig.state.initialized = false;
      },
      setPose(pos, yaw = 0) {
        robot.setPose(pos, yaw);
        rig.state.yaw = yaw;
        rig.state.initialized = false;
      },
      teleportNear(name, dist = 0.5) {
        return teleportNear(name, dist);
      },
      aimAt(name) {
        const o = physics.get(name);
        if (!o) return false;
        const c = objectCenter(o);
        facePoint(c);
        requestAnimationFrame(() => {
          const p = c.clone().project(camera);
          if (p.z < 1 && Math.abs(p.x) < 1.05 && Math.abs(p.y) < 1.05) {
            state.pointer.x = (p.x * 0.5 + 0.5) * window.innerWidth;
            state.pointer.y = (-p.y * 0.5 + 0.5) * window.innerHeight;
            state.pointer.active = true;
          }
        });
        return true;
      },
      screenOf(name) {
        const o = physics.get(name);
        if (!o) return null;
        const p = objectCenter(o).project(camera);
        return {
          x: (p.x * 0.5 + 0.5) * window.innerWidth,
          y: (-p.y * 0.5 + 0.5) * window.innerHeight,
          ndc: [p.x, p.y, p.z],
        };
      },
      pointerAt(x, y) {
        state.pointer.x = x;
        state.pointer.y = y;
        state.pointer.active = true;
      },
      aimAtPoint(point) {
        facePoint(new THREE.Vector3(point[0], point[1], point[2]));
      },
      grabByName(name) {
        const o = physics.get(name);
        if (!o) return { ok: false, reason: 'missing' };
        state.forcedAim = objectCenter(o);
        const res = robot.grab(o) || {};
        if (res.ok && o.name.includes('needle')) state.needleFound = true;
        return { ok: !!res.ok, reason: res.reason || null, held: robot.arm.held?.name || null };
      },
      release() {
        robot.release();
      },
      action() {
        action();
      },
      press(code, ms = 140) {
        keys.add(code);
        setTimeout(() => keys.delete(code), ms);
      },
      hold(code) {
        keys.add(code);
      },
      releaseKey(code) {
        keys.delete(code);
      },
      setSurround(on) {
        setSurround(!!on);
      },
      setNight(on) {
        setNight(!!on);
      },
      setView(mode) {
        rig.setMode(mode);
      },
      look(yaw, pitch = 0) {
        rig.setMode('first');
        const p = robot.group.position;
        robot.setPose([p.x, p.y, p.z], yaw);
        rig.state.fpYaw = yaw;
        rig.state.fpPitch = pitch;
        rig.state.initialized = false;
      },
      cameraInfo() {
        return {
          mode: rig.mode,
          pos: camera.position.toArray(),
          quat: camera.quaternion.toArray(),
          fov: camera.fov,
        };
      },
      raycast() {
        let nx = 0;
        let ny = 0;
        if (rig.mode !== 'first') {
          nx = (state.pointer.x / window.innerWidth) * 2 - 1;
          ny = -(state.pointer.y / window.innerHeight) * 2 + 1;
        }
        const hit = physics.castRayFromCamera(camera, nx, ny, 14, robotExclude());
        if (!hit) return null;
        return {
          name: hit.obj.name,
          static: hit.obj.isStatic,
          distance: +hit.distance.toFixed(3),
          point: hit.point.toArray().map((v) => +v.toFixed(3)),
          camera: camera.position.toArray().map((v) => +v.toFixed(3)),
          robot: robot.group.position.toArray().map((v) => +v.toFixed(3)),
        };
      },
      setCamera(yaw, pitch, dist) {
        rig.state.yaw = yaw;
        rig.state.pitch = pitch;
        rig.state.dist = dist;
        rig.state.initialized = false;
      },
      reset() {
        resetAll();
      },
      sampleMain(rect) {
        return sampleCanvas('main', rect);
      },
      sampleHud(rect) {
        return sampleCanvas('hud', rect);
      },
      hudRects() {
        return hud.layout(true);
      },
      hudText() {
        return {
          room: hud.els.room.textContent,
          target: hud.els.target.hidden ? null : hud.els.target.textContent,
          held: hud.els.held.hidden ? null : hud.els.held.textContent,
          hint: hud.els.hint.textContent,
        };
      },
      drawCalls() {
        return renderSystem.stats();
      },
      async settle(ms = 800) {
        await new Promise((r) => setTimeout(r, ms));
      },
    },
  };
  window.__APP__ = api;

  requestAnimationFrame((t) => {
    clock.last = t;
    requestAnimationFrame(tick);
  });
}

init().catch((err) => {
  console.error(err);
  boot.innerHTML = `<div class="boot-mark">FAILED TO START</div><div class="boot-error">${String(err?.stack || err)}</div>`;
  window.__APP__ = { ready: false, errors, error: String(err?.stack || err) };
});
