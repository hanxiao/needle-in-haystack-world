import * as THREE from 'three';
import { CONFIG } from '../src/core/config.js';
import { createPhysics } from '../src/core/physics.js';
import { createMaterials } from '../src/core/materials.js';
import { createRenderSystem } from '../src/core/renderer.js';
import { createCameraRig } from '../src/core/camera.js';

const renderSystem = createRenderSystem(document.getElementById('scene'), document.getElementById('hud-scene'));
const { scene, camera } = renderSystem;
const physics = await createPhysics(scene);
const materials = createMaterials(renderSystem.renderer);
const ctx = { THREE, RAPIER: physics.RAPIER, scene, renderer: renderSystem.renderer, physics, materials, config: CONFIG };

// room shell
const floor = new THREE.Mesh(new THREE.BoxGeometry(11.2, 0.2, 7.6), materials.variant('woodFloor', { repeat: [6, 4] }));
physics.addStaticObject({ name: 'floor', mesh: floor, pos: [0, -0.1, 0], colliders: [{ shape: 'box', half: [5.6, 0.1, 3.8] }], material: 'wood' });
for (const [x, z, w, d] of [[0, -3.8, 11.2, 0.12], [0, 3.8, 11.2, 0.12], [-5.6, 0, 0.12, 7.6], [5.6, 0, 0.12, 7.6]]) {
  const wall = new THREE.Mesh(new THREE.BoxGeometry(w, 2.7, d), materials.get('wallPaint'));
  physics.addStaticObject({ name: `wall_${x}_${z}`, mesh: wall, pos: [x, 1.35, z], colliders: [{ shape: 'box', half: [w / 2, 1.35, d / 2] }], material: 'concrete' });
}
const rug = new THREE.Mesh(new THREE.BoxGeometry(3, 0.02, 2), materials.get('fabricRug'));
physics.addStaticObject({ name: 'rug', mesh: rug, pos: [0, 0.011, 0], colliders: [{ shape: 'box', half: [1.5, 0.01, 1] }], material: 'fabric' });

// table + falling objects
const tableMat = materials.get('woodWarm');
const top = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.06, 0.7), tableMat);
const table = new THREE.Group();
table.add(top);
top.position.y = 0.42;
for (const [x, z] of [[-0.52, -0.27], [0.52, -0.27], [-0.52, 0.27], [0.52, 0.27]]) {
  const leg = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.42, 0.06), tableMat);
  leg.position.set(x, 0.21, z);
  table.add(leg);
}
physics.addObject({ name: 'table', mesh: table, pos: [0, 0.225, 0], colliders: [
  { shape: 'box', half: [0.6, 0.03, 0.35], offset: [0, 0.195, 0] },
  { shape: 'box', half: [0.55, 0.21, 0.3], offset: [0, -0.015, 0] },
], mass: 13, material: 'wood' });

const colors = [0xd98f5f, 0x7fa8c9, 0xd7c46a, 0x9d7fc0, 0x77b58a, 0xe6e2da];
for (let i = 0; i < 10; i++) {
  const s = 0.09 + (i % 3) * 0.03;
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(s, s, s), materials.variant('plasticWhite', { color: colors[i % colors.length] }));
  physics.addObject({
    name: `box_${i}`,
    mesh,
    pos: [(Math.random() - 0.5) * 0.5, 0.55 + i * 0.06, (Math.random() - 0.5) * 0.3],
    colliders: [{ shape: 'box', half: [s / 2, s / 2, s / 2] }],
    mass: 0.3,
    material: 'plastic',
  });
}

// fake robot + cameras
const group = new THREE.Group();
const body = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.15, 0.24, 20), materials.get('plasticWhite'));
body.position.y = 0.2;
body.castShadow = true;
group.add(body);
const head = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.12, 0.18), materials.get('metalDark'));
head.position.y = 0.36;
group.add(head);
scene.add(group);
const mkCam = (yaw, fov = 120, aspect = 4 / 3) => {
  const c = new THREE.PerspectiveCamera(fov, aspect, 0.02, 40);
  c.position.set(0, 0.34, 0);
  c.rotation.y = yaw;
  group.add(c);
  return c;
};
const cameras = { front: mkCam(0), right: mkCam(-Math.PI / 2), back: mkCam(Math.PI), left: mkCam(Math.PI / 2) };
const topCam = new THREE.PerspectiveCamera(75, 1, 0.02, 60);
topCam.position.set(0, 3.5, 0.001);
topCam.rotation.x = -Math.PI / 2;
group.add(topCam);
cameras.top = topCam;

const fakeRobot = { group, yaw: 0, colliders: [] };
const rig = createCameraRig(camera, physics);
rig.state.yaw = 0;
rig.state.initialized = false;

const layout = {
  panels: [
    { key: 'front', x: 16, y: innerHeight - 16 - 268, w: 178, h: 133 },
    { key: 'right', x: 16 + 180, y: innerHeight - 16 - 268, w: 178, h: 133 },
    { key: 'left', x: 16, y: innerHeight - 16 - 133, w: 178, h: 133 },
    { key: 'back', x: 16 + 180, y: innerHeight - 16 - 133, w: 178, h: 133 },
  ],
  map: { x: innerWidth - 16 - 180, y: 16, w: 180, h: 180 },
};
const panelsEl = document.getElementById('panels');
for (const p of [...layout.panels, { ...layout.map, key: 'map' }]) {
  const d = document.createElement('div');
  d.className = 'panel';
  d.style.cssText = `left:${p.x}px;top:${p.y}px;width:${p.w}px;height:${p.h}px`;
  d.innerHTML = `<span>${p.key.toUpperCase()}</span>`;
  panelsEl.appendChild(d);
}

physics.settle(80);
const clock = { last: performance.now(), acc: 0 };
let frame = 0;
let fps = 0;
let fpsT = performance.now();
let frames = 0;

function tick(now) {
  requestAnimationFrame(tick);
  const dt = Math.min((now - clock.last) / 1000, 0.08);
  clock.last = now;
  clock.acc += dt;
  let steps = 0;
  while (clock.acc >= CONFIG.fixedStep && steps < 3) { physics.step(); clock.acc -= CONFIG.fixedStep; steps++; }
  physics.sync(clock.acc / CONFIG.fixedStep);
  rig.update(dt, fakeRobot);
  renderSystem.render();
  if (frame % 2 === 0) renderSystem.renderHud({ group, cameras }, layout);
  frame++;
  frames++;
  if (now - fpsT > 500) { fps = Math.round(frames * 1000 / (now - fpsT)); frames = 0; fpsT = now; }
  if (frame === 2) {
    const st = physics.stats();
    const stats = renderSystem.stats();
    const cam = camera.position.toArray();
    window.__APP__ = {
      ready: true,
      fps,
      state: () => ({ fps, physics: st, drawCalls: stats, camera: cam, hud: renderSystem.hudRenderer.domElement.width }),
      sampleHud: (rect) => {
        const gl = renderSystem.hudRenderer.getContext();
        const buf = new Uint8Array(rect.w * rect.h * 4);
        gl.readPixels(rect.x, renderSystem.hudRenderer.domElement.height - rect.y - rect.h, rect.w, rect.h, gl.RGBA, gl.UNSIGNED_BYTE, buf);
        let lit = 0;
        for (let i = 0; i < buf.length; i += 4) if (buf[i] + buf[i + 1] + buf[i + 2] > 40) lit++;
        return lit / (rect.w * rect.h);
      },
    };
    document.documentElement.dataset.ready = '1';
  }
}
requestAnimationFrame((t) => { clock.last = t; requestAnimationFrame(tick); });
