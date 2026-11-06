import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { CONFIG } from './config.js';

export function createRenderSystem(canvas, hudCanvas) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: 'high-performance',
    preserveDrawingBuffer: true,
    stencil: false,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.autoClear = true;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x9fb6cb);

  const pmrem = new THREE.PMREMGenerator(renderer);
  const envRT = pmrem.fromScene(new RoomEnvironment(), 0.04);
  scene.environment = envRT.texture;
  scene.environmentIntensity = 0.5;

  const camera = new THREE.PerspectiveCamera(
    CONFIG.camera.fov,
    window.innerWidth / window.innerHeight,
    CONFIG.camera.near,
    CONFIG.camera.far
  );
  camera.position.set(-2.0, 1.4, 1.4);

  // --- sky dome (visible through windows)
  const skyUniforms = {
    top: { value: new THREE.Color(0x7ea6d2) },
    horizon: { value: new THREE.Color(0xf0d9ba) },
    sunDir: { value: new THREE.Vector3(-0.55, 0.62, -0.56).normalize() },
    sunColor: { value: new THREE.Color(0xfff0d2) },
  };
  const skyMat = new THREE.ShaderMaterial({
    uniforms: skyUniforms,
    side: THREE.BackSide,
    depthWrite: false,
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 top;
      uniform vec3 horizon;
      uniform vec3 sunDir;
      uniform vec3 sunColor;
      varying vec3 vDir;
      void main() {
        float h = clamp(vDir.y * 0.5 + 0.5, 0.0, 1.0);
        vec3 col = mix(horizon, top, pow(h, 0.85));
        float sd = max(dot(normalize(vDir), normalize(sunDir)), 0.0);
        col += sunColor * pow(sd, 600.0) * 2.2;
        col += sunColor * pow(sd, 10.0) * 0.10;
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(32, 32, 20), skyMat);
  sky.frustumCulled = false;
  scene.add(sky);

  // --- lights
  const hemi = new THREE.HemisphereLight(0xbcd2ee, 0x35261b, 0.55);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(0xffe2bb, 3.4);
  sun.position.set(-7.5, 9, -8);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -8.5;
  sun.shadow.camera.right = 8.5;
  sun.shadow.camera.top = 8.5;
  sun.shadow.camera.bottom = -8.5;
  sun.shadow.camera.near = 0.5;
  sun.shadow.camera.far = 32;
  sun.shadow.bias = -0.00035;
  sun.shadow.normalBias = 0.025;
  sun.target.position.set(0, 0, 0);
  scene.add(sun, sun.target);

  const lamps = [];
  for (const room of CONFIG.rooms) {
    const light = new THREE.PointLight(0xffd3a0, room.light, 7.5, 2);
    light.position.set(room.lamp[0], room.lamp[1], room.lamp[2]);
    light.castShadow = false;
    scene.add(light);
    lamps.push({ light, base: room.light });
  }

  // small warm fill so shadowed corners keep some colour
  const fill = new THREE.PointLight(0xffe8cf, 2.2, 14, 2);
  fill.position.set(0.4, 2.2, 0.2);
  scene.add(fill);

  // --- 360 HUD renderer (separate canvas so main view never clears the feeds)
  const hudRenderer = new THREE.WebGLRenderer({
    canvas: hudCanvas,
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance',
    preserveDrawingBuffer: true,
    stencil: false,
  });
  hudRenderer.setPixelRatio(1);
  hudRenderer.setSize(window.innerWidth, window.innerHeight, false);
  hudRenderer.outputColorSpace = THREE.SRGBColorSpace;
  hudRenderer.toneMapping = THREE.ACESFilmicToneMapping;
  hudRenderer.toneMappingExposure = renderer.toneMappingExposure;
  hudRenderer.shadowMap.enabled = false;
  hudRenderer.autoClear = false;
  hudRenderer.setClearColor(0x000000, 0);

  // Each WebGL context needs its own PMREM environment texture.
  const hudPmrem = new THREE.PMREMGenerator(hudRenderer);
  const hudEnvRT = hudPmrem.fromScene(new RoomEnvironment(), 0.04);
  const mainEnv = scene.environment;

  let night = false;
  const nightTargets = [];
  let nightCollected = false;
  function collectNightTargets() {
    if (nightCollected) return;
    nightCollected = true;
    const seen = new Set();
    scene.traverse((o) => {
      if (!o.isMesh) return;
      const name = o.name || o.parent?.name || '';
      if (!/^(city_view|exterior|windows)/.test(name)) return;
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      for (const m of mats) {
        if (!m || seen.has(m.uuid)) continue;
        seen.add(m.uuid);
        nightTargets.push({
          m,
          kind: name.startsWith('city_view') ? 'city' : name.startsWith('exterior') ? 'exterior' : 'window',
          color: m.color ? m.color.getHex() : null,
          emissive: m.emissive ? m.emissive.getHex() : null,
          emissiveIntensity: m.emissiveIntensity,
        });
      }
    });
  }

  function setNight(on) {
    night = on;
    if (on) {
      skyUniforms.top.value.setHex(0x0a1222);
      skyUniforms.horizon.value.setHex(0x1d2738);
      skyUniforms.sunColor.value.setHex(0xaec2e8);
      sun.intensity = 0.32;
      sun.color.setHex(0x9fb4e0);
      hemi.intensity = 0.14;
      hemi.color.setHex(0x8199c4);
      for (const l of lamps) l.light.intensity = l.base * 2.3;
      fill.intensity = 1.6;
      scene.environmentIntensity = 0.24;
      renderer.toneMappingExposure = 0.94;
      hudRenderer.toneMappingExposure = 0.94;
      collectNightTargets();
      for (const t of nightTargets) {
        if (t.color !== null) {
          const k = t.kind === 'window' ? 0.45 : t.kind === 'city' ? 0.78 : 0.62;
          t.m.color.setHex(t.color).lerp(new THREE.Color(0x0b1220), k);
        }
        if (t.kind === 'city' && t.emissive !== null) {
          t.m.emissive.setHex(0xffb877);
          t.m.emissiveIntensity = 0.22;
        }
      }
    } else {
      skyUniforms.top.value.setHex(0x7ea6d2);
      skyUniforms.horizon.value.setHex(0xf0d9ba);
      skyUniforms.sunColor.value.setHex(0xfff0d2);
      sun.intensity = 3.4;
      sun.color.setHex(0xffe2bb);
      hemi.intensity = 0.55;
      hemi.color.setHex(0xbcd2ee);
      for (const l of lamps) l.light.intensity = l.base;
      fill.intensity = 2.2;
      scene.environmentIntensity = 0.5;
      renderer.toneMappingExposure = 1.0;
      hudRenderer.toneMappingExposure = 1.0;
      for (const t of nightTargets) {
        if (t.color !== null) t.m.color.setHex(t.color);
        if (t.emissive !== null) {
          t.m.emissive.setHex(t.emissive);
          t.m.emissiveIntensity = t.emissiveIntensity;
        }
      }
    }
  }

  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(w, h, false);
    hudRenderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    clearHud();
  }

  function render() {
    const wantDpr = Math.min(window.devicePixelRatio || 1, 2);
    if (renderer.getPixelRatio() !== wantDpr) {
      renderer.setPixelRatio(wantDpr);
      renderer.setSize(window.innerWidth, window.innerHeight, false);
    }
    const aspect = renderer.domElement.clientWidth / renderer.domElement.clientHeight;
    if (Number.isFinite(aspect) && aspect > 0 && Math.abs(camera.aspect - aspect) > 1e-3) {
      camera.aspect = aspect;
      camera.updateProjectionMatrix();
    }
    renderer.setScissorTest(false);
    // setViewport expects CSS pixels; three multiplies by the pixel ratio internally.
    const size = renderer.getSize(new THREE.Vector2());
    renderer.setViewport(0, 0, size.x, size.y);
    renderer.render(scene, camera);
  }

  function setHudViewport(rect, dpr) {
    const canvasH = hudRenderer.domElement.height;
    const x = Math.round(rect.x * dpr);
    const y = Math.round(canvasH - (rect.y + rect.h) * dpr);
    const w = Math.max(2, Math.round(rect.w * dpr));
    const h = Math.max(2, Math.round(rect.h * dpr));
    hudRenderer.setViewport(x, y, w, h);
    hudRenderer.setScissor(x, y, w, h);
    hudRenderer.setScissorTest(true);
  }

  function clearHud() {
    hudRenderer.setScissorTest(false);
    const size = hudRenderer.getSize(new THREE.Vector2());
    hudRenderer.setViewport(0, 0, size.x, size.y);
    hudRenderer.setClearColor(0x000000, 0);
    hudRenderer.clear(true, true, false);
  }

  // layout: { panels: [{key, x, y, w, h}], map: {x, y, w, h} } in CSS px
  function renderHud(robot, layout) {
    if (!robot || !robot.cameras) return;
    const dpr = hudRenderer.getPixelRatio();
    const prevVisible = robot.group ? robot.group.visible : true;
    if (robot.group) robot.group.visible = false;
    scene.environment = hudEnvRT.texture;
    hudRenderer.autoClear = false;
    hudRenderer.setScissorTest(true);

    for (const p of layout.panels) {
      const cam = robot.cameras[p.key];
      if (!cam) continue;
      cam.aspect = p.w / p.h;
      cam.updateProjectionMatrix();
      setHudViewport(p, dpr);
      hudRenderer.clear(true, true, false);
      hudRenderer.render(scene, cam);
    }
    if (layout.map && robot.cameras.top) {
      const cam = robot.cameras.top;
      cam.aspect = layout.map.w / layout.map.h;
      cam.updateProjectionMatrix();
      setHudViewport(layout.map, dpr);
      hudRenderer.clear(true, true, false);
      hudRenderer.render(scene, cam);
    }

    hudRenderer.setScissorTest(false);
    const hudSize = hudRenderer.getSize(new THREE.Vector2());
    hudRenderer.setViewport(0, 0, hudSize.x, hudSize.y);
    hudRenderer.setClearColor(0x000000, 0);
    scene.environment = mainEnv;
    if (robot.group) robot.group.visible = prevVisible;
  }

  function stats() {
    const info = renderer.info.render;
    return { calls: info.calls, triangles: info.triangles, points: info.points, lines: info.lines };
  }

  return {
    renderer,
    hudRenderer,
    scene,
    camera,
    sun,
    lamps,
    sky,
    setNight,
    resize,
    render,
    renderHud,
    clearHud,
    stats,
    get night() {
      return night;
    },
  };
}
