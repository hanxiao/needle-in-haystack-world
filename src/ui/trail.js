import * as THREE from 'three';

// Colour-coded robot trajectory, drawn only by the minimap camera:
// both meshes live on layer 2, which the top camera enables.
const MAX_POINTS = 720;
const WIDTH = 0.13; // metres (coloured core)
const OUTLINE = 0.06; // extra metres each side
const Y = 0.035;
const COLORS = [new THREE.Color(0x00e5ff), new THREE.Color(0xffd166), new THREE.Color(0xff3d81)];

function makeGeometry(positions, colors) {
  const indices = new Uint32Array((MAX_POINTS - 1) * 6);
  for (let i = 0; i < MAX_POINTS - 1; i++) {
    const a = i * 2;
    indices.set([a, a + 1, a + 2, a + 1, a + 3, a + 2], i * 6);
  }
  const geo = new THREE.BufferGeometry();
  const posAttr = new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage);
  geo.setAttribute('position', posAttr);
  if (colors) geo.setAttribute('color', new THREE.BufferAttribute(colors, 3).setUsage(THREE.DynamicDrawUsage));
  geo.setIndex(new THREE.BufferAttribute(indices, 1));
  geo.setDrawRange(0, 0);
  return geo;
}

export function createTrail(scene) {
  const positions = new Float32Array(MAX_POINTS * 2 * 3);
  const colors = new Float32Array(MAX_POINTS * 2 * 3);
  const outlinePositions = new Float32Array(MAX_POINTS * 2 * 3);

  const colorGeo = makeGeometry(positions, colors);
  const outlineGeo = makeGeometry(outlinePositions, null);

  const colorMat = new THREE.MeshBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 1,
    depthWrite: false,
    depthTest: false,
    side: THREE.DoubleSide,
    toneMapped: false,
  });
  const outlineMat = new THREE.MeshBasicMaterial({
    color: 0x0b0c0e,
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
    depthTest: false,
    side: THREE.DoubleSide,
    toneMapped: false,
  });

  const outline = new THREE.Mesh(outlineGeo, outlineMat);
  outline.name = 'robot_trail_outline';
  outline.frustumCulled = false;
  outline.renderOrder = 19;
  outline.layers.set(2);
  scene.add(outline);

  const mesh = new THREE.Mesh(colorGeo, colorMat);
  mesh.name = 'robot_trail';
  mesh.frustumCulled = false;
  mesh.renderOrder = 20;
  mesh.layers.set(2);
  scene.add(mesh);

  const points = [];
  let dirty = false;

  function colorFor(speed, age) {
    const t = Math.min(1, Math.max(0, speed / 0.42));
    const c = t < 0.5
      ? COLORS[0].clone().lerp(COLORS[1], t * 2)
      : COLORS[1].clone().lerp(COLORS[2], (t - 0.5) * 2);
    c.multiplyScalar(Math.max(0.85, 1 - age * 0.12));
    return c;
  }

  function rebuild() {
    const n = points.length;
    if (n < 2) {
      colorGeo.setDrawRange(0, 0);
      outlineGeo.setDrawRange(0, 0);
      return;
    }
    const now = performance.now();
    for (let i = 0; i < n; i++) {
      const p = points[i];
      const prev = points[Math.max(0, i - 1)];
      const next = points[Math.min(n - 1, i + 1)];
      let dx = next.x - prev.x;
      let dz = next.z - prev.z;
      const len = Math.hypot(dx, dz) || 1;
      dx /= len;
      dz /= len;
      const nx = -dz;
      const nz = dx;
      const o = i * 6;
      const oc = WIDTH;
      const oo = WIDTH + OUTLINE;
      positions[o] = p.x + nx * oc;
      positions[o + 1] = Y;
      positions[o + 2] = p.z + nz * oc;
      positions[o + 3] = p.x - nx * oc;
      positions[o + 4] = Y;
      positions[o + 5] = p.z - nz * oc;
      outlinePositions[o] = p.x + nx * oo;
      outlinePositions[o + 1] = Y;
      outlinePositions[o + 2] = p.z + nz * oo;
      outlinePositions[o + 3] = p.x - nx * oo;
      outlinePositions[o + 4] = Y;
      outlinePositions[o + 5] = p.z - nz * oo;
      const c = colorFor(p.speed, (now - p.t) / 1000);
      colors[o] = colors[o + 3] = c.r;
      colors[o + 1] = colors[o + 4] = c.g;
      colors[o + 2] = colors[o + 5] = c.b;
    }
    colorGeo.attributes.position.needsUpdate = true;
    colorGeo.attributes.color.needsUpdate = true;
    outlineGeo.attributes.position.needsUpdate = true;
    colorGeo.setDrawRange(0, (n - 1) * 6);
    outlineGeo.setDrawRange(0, (n - 1) * 6);
    dirty = false;
  }

  function add(x, z, speed) {
    const last = points[points.length - 1];
    if (last && Math.hypot(x - last.x, z - last.z) < 0.035) return;
    points.push({ x, z, speed: Math.min(0.7, Math.max(0, speed)), t: performance.now() });
    while (points.length > MAX_POINTS) points.shift();
    dirty = true;
  }

  function update() {
    if (dirty) rebuild();
  }

  function clear() {
    points.length = 0;
    colorGeo.setDrawRange(0, 0);
    outlineGeo.setDrawRange(0, 0);
  }

  return { mesh, outline, add, update, clear, points };
}
