import * as THREE from 'three';

// All surfaces are procedural: canvas textures generated once at load, no network assets.

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeCanvas(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  draw(ctx, w, h);
  return c;
}

function toTexture(canvas, { repeat = [1, 1], srgb = true, anisotropy = 8 } = {}) {
  const t = new THREE.CanvasTexture(canvas);
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat[0], repeat[1]);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = anisotropy;
  t.needsUpdate = true;
  return t;
}

function noise(ctx, w, h, rng, amount = 14, alpha = 0.08) {
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (rng() - 0.5) * amount;
    d[i] = Math.max(0, Math.min(255, d[i] + n));
    d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + n));
    d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + n));
    if (alpha > 0) d[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
}

function drawWood(ctx, w, h, rng, base = '#9a744e', dark = '#6e4d31', plankH = 128) {
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, w, h);
  const rows = Math.max(1, Math.round(h / plankH));
  const ph = h / rows;
  for (let r = 0; r < rows; r++) {
    const y = r * ph;
    const shade = 0.86 + rng() * 0.24;
    ctx.fillStyle = shadeColor(base, shade);
    ctx.fillRect(0, y, w, ph);
    // grain
    for (let g = 0; g < 26; g++) {
      const gy = y + 4 + rng() * (ph - 8);
      ctx.strokeStyle = `rgba(60,38,20,${0.05 + rng() * 0.1})`;
      ctx.lineWidth = 0.6 + rng() * 1.4;
      ctx.beginPath();
      let x = -20;
      ctx.moveTo(x, gy);
      while (x < w + 20) {
        const nx = x + 20 + rng() * 60;
        ctx.quadraticCurveTo(x + 10, gy + (rng() - 0.5) * 3, nx, gy + (rng() - 0.5) * 2.5);
        x = nx;
      }
      ctx.stroke();
    }
    // knots
    if (rng() < 0.4) {
      const kx = rng() * w;
      const ky = y + ph * (0.25 + rng() * 0.5);
      ctx.strokeStyle = 'rgba(52,32,18,0.28)';
      for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        ctx.ellipse(kx, ky, 2 + i * 2.2, 1 + i * 1.1, rng() * 0.4, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    // plank gap
    ctx.fillStyle = 'rgba(35,22,12,0.5)';
    ctx.fillRect(0, y + ph - 1.5, w, 1.5);
    // stagger vertical seams
    const seams = 2 + Math.floor(rng() * 2);
    for (let s = 0; s < seams; s++) {
      const sx = ((s + rng() * 0.6) / seams) * w;
      ctx.fillStyle = 'rgba(40,25,14,0.32)';
      ctx.fillRect(sx, y, 1.4, ph);
    }
  }
  noise(ctx, w, h, rng, 10, 0);
}

function drawFabric(ctx, w, h, rng, base = '#7c8577') {
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, w, h);
  const cell = 4;
  for (let y = 0; y < h; y += cell) {
    for (let x = 0; x < w; x += cell) {
      const v = (rng() - 0.5) * 16;
      ctx.fillStyle = `rgba(${v > 0 ? 255 : 0},${v > 0 ? 255 : 0},${v > 0 ? 255 : 0},${Math.abs(v) / 255})`;
      ctx.fillRect(x, y, cell, cell);
    }
  }
  ctx.globalAlpha = 0.1;
  for (let i = 0; i < 90; i++) {
    ctx.strokeStyle = rng() > 0.5 ? '#ffffff' : '#000000';
    ctx.lineWidth = 0.6;
    const y = rng() * h;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y + (rng() - 0.5) * 4);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  noise(ctx, w, h, rng, 10, 0);
}

function drawRug(ctx, w, h, rng) {
  ctx.fillStyle = '#c9b99c';
  ctx.fillRect(0, 0, w, h);
  // kilim bands
  const bands = 7;
  for (let b = 0; b < bands; b++) {
    const y = (b / bands) * h;
    ctx.fillStyle = ['#b45a3c', '#7d8a7a', '#d9c9a8', '#4e5b58', '#c9805f'][b % 5];
    ctx.globalAlpha = 0.55;
    ctx.fillRect(0, y, w, h / bands / 2);
    ctx.globalAlpha = 1;
  }
  // diamonds
  ctx.strokeStyle = 'rgba(60,45,32,0.55)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 40; i++) {
    const x = rng() * w;
    const y = rng() * h;
    const s = 8 + rng() * 18;
    ctx.beginPath();
    ctx.moveTo(x, y - s);
    ctx.lineTo(x + s, y);
    ctx.lineTo(x, y + s);
    ctx.lineTo(x - s, y);
    ctx.closePath();
    ctx.stroke();
  }
  noise(ctx, w, h, rng, 12, 0);
}

function drawTile(ctx, w, h, rng, { tiles = 4, base = '#d9d5ca', grout = '#9c988d' } = {}) {
  ctx.fillStyle = grout;
  ctx.fillRect(0, 0, w, h);
  const tw = w / tiles;
  const th = h / tiles;
  for (let y = 0; y < tiles; y++) {
    for (let x = 0; x < tiles; x++) {
      const shade = 0.93 + rng() * 0.1;
      ctx.fillStyle = shadeColor(base, shade);
      ctx.fillRect(x * tw + 2, y * th + 2, tw - 4, th - 4);
      ctx.fillStyle = 'rgba(255,255,255,0.05)';
      ctx.fillRect(x * tw + 3, y * th + 3, tw - 6, 3);
    }
  }
  noise(ctx, w, h, rng, 8, 0);
}

function drawBrushed(ctx, w, h, rng) {
  ctx.fillStyle = '#b9b9b4';
  ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 700; i++) {
    ctx.strokeStyle = `rgba(${rng() > 0.5 ? 255 : 40},${rng() > 0.5 ? 255 : 40},${rng() > 0.5 ? 255 : 40},${0.02 + rng() * 0.05})`;
    ctx.lineWidth = 0.5 + rng();
    const x = rng() * w;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + (rng() - 0.5) * 6, h);
    ctx.stroke();
  }
  noise(ctx, w, h, rng, 6, 0);
}

function drawSpeckle(ctx, w, h, rng, base = '#8f8c85', dots = 900) {
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < dots; i++) {
    const g = 40 + rng() * 150;
    ctx.fillStyle = `rgba(${g},${g},${g - 5},${0.12 + rng() * 0.22})`;
    const r = 0.6 + rng() * 2.4;
    ctx.beginPath();
    ctx.arc(rng() * w, rng() * h, r, 0, Math.PI * 2);
    ctx.fill();
  }
  noise(ctx, w, h, rng, 10, 0);
}

function drawPaper(ctx, w, h, rng) {
  ctx.fillStyle = '#f3efe4';
  ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 240; i++) {
    ctx.strokeStyle = `rgba(120,110,90,${0.02 + rng() * 0.04})`;
    ctx.lineWidth = 0.6;
    const y = rng() * h;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y + (rng() - 0.5) * 2);
    ctx.stroke();
  }
  noise(ctx, w, h, rng, 5, 0);
}

function drawScreen(ctx, w, h, rng) {
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, '#0d1b2a');
  g.addColorStop(0.5, '#1d3b4f');
  g.addColorStop(1, '#0a141c');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.globalAlpha = 0.5;
  for (let i = 0; i < 7; i++) {
    ctx.fillStyle = ['#2f6b5a', '#3f7d9c', '#8a6a3f'][i % 3];
    const x = rng() * w * 0.8;
    const y = rng() * h * 0.7;
    ctx.fillRect(x, y, 40 + rng() * 160, 18 + rng() * 90);
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = 'rgba(240,245,255,0.75)';
  ctx.fillRect(w * 0.06, h * 0.08, w * 0.3, 8);
  ctx.fillRect(w * 0.06, h * 0.14, w * 0.18, 5);
}

function drawBookPages(ctx, w, h, rng) {
  ctx.fillStyle = '#efe8d5';
  ctx.fillRect(0, 0, w, h);
  for (let y = 0; y < h; y += 3) {
    ctx.fillStyle = `rgba(120,105,80,${0.05 + rng() * 0.08})`;
    ctx.fillRect(0, y, w, 1);
  }
  noise(ctx, w, h, rng, 6, 0);
}

function shadeColor(hex, factor) {
  const c = new THREE.Color(hex);
  c.multiplyScalar(factor);
  return `#${c.getHexString()}`;
}

export function createMaterials(renderer) {
  const maxAniso = Math.min(8, renderer?.capabilities?.getMaxAnisotropy?.() ?? 4);
  const T = (canvas, opts) => toTexture(canvas, { anisotropy: maxAniso, ...opts });

  const rng = mulberry32(20261105);

  const woodFloorCanvas = makeCanvas(1024, 1024, (c, w, h) => drawWood(c, w, h, rng, '#a07a52', '#6e4d31', 128));
  const woodLightCanvas = makeCanvas(512, 512, (c, w, h) => drawWood(c, w, h, mulberry32(11), '#c8a172', '#8a6640', 96));
  const woodDarkCanvas = makeCanvas(512, 512, (c, w, h) => drawWood(c, w, h, mulberry32(12), '#6b4a33', '#432a1a', 96));
  const woodWarmCanvas = makeCanvas(512, 512, (c, w, h) => drawWood(c, w, h, mulberry32(13), '#9c6b45', '#6a4327', 96));
  const fabricCanvas = makeCanvas(512, 512, (c, w, h) => drawFabric(c, w, h, mulberry32(21), '#8e9688'));
  const linenCanvas = makeCanvas(512, 512, (c, w, h) => drawFabric(c, w, h, mulberry32(22), '#d8d1c2'));
  const woolCanvas = makeCanvas(512, 512, (c, w, h) => drawFabric(c, w, h, mulberry32(23), '#8a8072'));
  const rugCanvas = makeCanvas(512, 512, (c, w, h) => drawRug(c, w, h, mulberry32(31)));
  const tileFloorCanvas = makeCanvas(512, 512, (c, w, h) => drawTile(c, w, h, mulberry32(41), { tiles: 4, base: '#d7d2c5', grout: '#a09b8f' }));
  const tileWallCanvas = makeCanvas(512, 512, (c, w, h) => drawTile(c, w, h, mulberry32(42), { tiles: 6, base: '#cfd8d5', grout: '#a7b1ae' }));
  const brushedCanvas = makeCanvas(512, 512, (c, w, h) => drawBrushed(c, w, h, mulberry32(51)));
  const speckleCanvas = makeCanvas(512, 512, (c, w, h) => drawSpeckle(c, w, h, mulberry32(61), '#8f8c85', 900));
  const paperCanvas = makeCanvas(512, 512, (c, w, h) => drawPaper(c, w, h, mulberry32(71)));
  const screenCanvas = makeCanvas(512, 288, (c, w, h) => drawScreen(c, w, h, mulberry32(81)));
  const bookPageCanvas = makeCanvas(512, 512, (c, w, h) => drawBookPages(c, w, h, mulberry32(91)));
  const cardboardCanvas = makeCanvas(512, 512, (c, w, h) => {
    drawPaper(c, w, h, mulberry32(101));
    c.fillStyle = 'rgba(150,105,60,0.55)';
    c.fillRect(0, 0, w, h);
    noise(c, w, h, mulberry32(102), 18, 0);
  });
  const wallCanvas = makeCanvas(256, 256, (c, w, h) => {
    c.fillStyle = '#e6e2da';
    c.fillRect(0, 0, w, h);
    noise(c, w, h, mulberry32(111), 8, 0);
  });

  const textures = {
    woodFloor: T(woodFloorCanvas, { repeat: [4, 3] }),
    woodLight: T(woodLightCanvas, { repeat: [1, 1] }),
    woodDark: T(woodDarkCanvas, { repeat: [1, 1] }),
    woodWarm: T(woodWarmCanvas, { repeat: [1, 1] }),
    fabric: T(fabricCanvas, { repeat: [3, 3] }),
    linen: T(linenCanvas, { repeat: [3, 3] }),
    wool: T(woolCanvas, { repeat: [3, 3] }),
    rug: T(rugCanvas, { repeat: [1, 1] }),
    tileFloor: T(tileFloorCanvas, { repeat: [5, 4] }),
    tileWall: T(tileWallCanvas, { repeat: [3, 2] }),
    brushed: T(brushedCanvas, { repeat: [1, 1] }),
    speckle: T(speckleCanvas, { repeat: [2, 2] }),
    paper: T(paperCanvas, { repeat: [1, 1] }),
    screen: T(screenCanvas, { repeat: [1, 1] }),
    bookPage: T(bookPageCanvas, { repeat: [1, 1] }),
    cardboard: T(cardboardCanvas, { repeat: [1, 1] }),
    wall: T(wallCanvas, { repeat: [2, 2] }),
  };

  const std = (params) => new THREE.MeshStandardMaterial(params);
  const physical = (params) => new THREE.MeshPhysicalMaterial(params);

  const list = {
    wallPaint: std({ color: 0xe9e5dc, roughness: 0.95, metalness: 0, map: textures.wall, envMapIntensity: 0.35 }),
    wallAccent: std({ color: 0x6f7d72, roughness: 0.92, metalness: 0, map: textures.wall, envMapIntensity: 0.35 }),
    woodFloor: std({
      color: 0xb18a62,
      map: textures.woodFloor,
      roughness: 0.55,
      metalness: 0.02,
      bumpMap: textures.woodFloor,
      bumpScale: 0.012,
      envMapIntensity: 0.4,
    }),
    woodLight: std({ color: 0xd9bb92, map: textures.woodLight, roughness: 0.5, metalness: 0.02, bumpMap: textures.woodLight, bumpScale: 0.01 }),
    woodDark: std({ color: 0x7a563c, map: textures.woodDark, roughness: 0.48, metalness: 0.02, bumpMap: textures.woodDark, bumpScale: 0.01 }),
    woodWarm: std({ color: 0xa8744d, map: textures.woodWarm, roughness: 0.52, metalness: 0.02, bumpMap: textures.woodWarm, bumpScale: 0.01 }),
    fabricSofa: std({ color: 0x77806e, map: textures.fabric, roughness: 0.96, metalness: 0, envMapIntensity: 0.3 }),
    fabricLinen: std({ color: 0xd7d0c1, map: textures.linen, roughness: 0.94, metalness: 0, envMapIntensity: 0.3 }),
    fabricWool: std({ color: 0x8c8375, map: textures.wool, roughness: 0.97, metalness: 0, envMapIntensity: 0.25 }),
    fabricRug: std({ color: 0xc8b79b, map: textures.rug, roughness: 0.99, metalness: 0, envMapIntensity: 0.2 }),
    leather: std({ color: 0x6a4a34, roughness: 0.5, metalness: 0.02, envMapIntensity: 0.6 }),
    metalBrushed: std({ color: 0xb9b9b4, metalness: 0.9, roughness: 0.34, map: textures.brushed, envMapIntensity: 1.0 }),
    metalDark: std({ color: 0x3b3e41, metalness: 0.85, roughness: 0.42, envMapIntensity: 0.9 }),
    metalChrome: std({ color: 0xd9d9d6, metalness: 1, roughness: 0.08, envMapIntensity: 1.3 }),
    brass: std({ color: 0xc8a25e, metalness: 1, roughness: 0.26, envMapIntensity: 1.2 }),
    glass: physical({
      color: 0xd8ecf2,
      transparent: true,
      opacity: 0.16,
      roughness: 0.05,
      metalness: 0,
      side: THREE.DoubleSide,
      depthWrite: false,
      envMapIntensity: 1.4,
    }),
    glassFrosted: physical({ color: 0xe8f0f0, transparent: true, opacity: 0.42, roughness: 0.4, metalness: 0, side: THREE.DoubleSide }),
    ceramicWhite: std({ color: 0xf1eee6, roughness: 0.22, metalness: 0.02, envMapIntensity: 0.8 }),
    ceramicSage: std({ color: 0x97a68f, roughness: 0.28, metalness: 0.02, envMapIntensity: 0.8 }),
    ceramicClay: std({ color: 0xb06a4e, roughness: 0.6, metalness: 0.0 }),
    plasticWhite: std({ color: 0xe7e5df, roughness: 0.48, metalness: 0.02 }),
    plasticDark: std({ color: 0x2b2d2f, roughness: 0.42, metalness: 0.05 }),
    paper: std({ color: 0xf2eee3, map: textures.paper, roughness: 0.9, metalness: 0 }),
    cardboard: std({ color: 0xc0925f, map: textures.cardboard, roughness: 0.95, metalness: 0 }),
    plantLeaf: std({ color: 0x40683b, roughness: 0.62, metalness: 0.0, side: THREE.DoubleSide, envMapIntensity: 0.5 }),
    plantSoil: std({ color: 0x3a2b20, roughness: 1, metalness: 0 }),
    concrete: std({ color: 0x9c9a94, roughness: 0.9, metalness: 0.02 }),
    tileFloor: std({ color: 0xd8d3c6, map: textures.tileFloor, roughness: 0.3, metalness: 0.04, envMapIntensity: 0.7 }),
    tileWall: std({ color: 0xd2dad7, map: textures.tileWall, roughness: 0.24, metalness: 0.03, envMapIntensity: 0.8 }),
    mirror: std({ color: 0xffffff, metalness: 1, roughness: 0.03, envMapIntensity: 1.6 }),
    screen: std({
      color: 0x0a0c0e,
      emissive: 0xffffff,
      emissiveMap: textures.screen,
      emissiveIntensity: 0.9,
      roughness: 0.3,
      metalness: 0.1,
    }),
    lampShade: std({
      color: 0xf0dfc2,
      emissive: 0xffc78a,
      emissiveIntensity: 0.5,
      roughness: 0.85,
      metalness: 0,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.94,
    }),
    bulbWarm: std({ color: 0xfff4e0, emissive: 0xffd9a0, emissiveIntensity: 2.6, roughness: 0.3, metalness: 0 }),
    water: physical({ color: 0x9fd0dd, transparent: true, opacity: 0.45, roughness: 0.08, metalness: 0, side: THREE.DoubleSide }),
    rubber: std({ color: 0x1b1c1e, roughness: 0.92, metalness: 0.0 }),
    foam: std({ color: 0xd9d3c5, roughness: 1, metalness: 0 }),
    stone: std({ color: 0x8f8c85, map: textures.speckle, roughness: 0.8, metalness: 0.02, bumpMap: textures.speckle, bumpScale: 0.02 }),
    terracotta: std({ color: 0xb5674a, map: textures.speckle, roughness: 0.86, metalness: 0 }),
    bookCloth: std({ color: 0x8b3f36, roughness: 0.86, metalness: 0 }),
    denim: std({ color: 0x3e5878, map: textures.fabric, roughness: 0.95, metalness: 0 }),
    cotton: std({ color: 0xe7e1d5, map: textures.linen, roughness: 0.96, metalness: 0 }),
    bookPage: std({ color: 0xf0ead7, map: textures.bookPage, roughness: 0.92, metalness: 0 }),
    steel: std({ color: 0xa9adb0, metalness: 0.9, roughness: 0.32 }),
    gold: std({ color: 0xd4af37, metalness: 1, roughness: 0.2 }),
  };

  const cache = new Map();

  function get(name) {
    const m = list[name];
    if (!m) throw new Error(`unknown material "${name}"`);
    return m;
  }

  function variant(name, overrides = {}) {
    const key = `${name}:${JSON.stringify(overrides, (k, v) => (Array.isArray(v) ? v : v))}`;
    if (cache.has(key)) return cache.get(key);
    const m = get(name).clone();
    if (overrides.color !== undefined) m.color = new THREE.Color(overrides.color);
    if (overrides.roughness !== undefined) m.roughness = overrides.roughness;
    if (overrides.metalness !== undefined) m.metalness = overrides.metalness;
    if (overrides.emissive !== undefined) m.emissive = new THREE.Color(overrides.emissive);
    if (overrides.emissiveIntensity !== undefined) m.emissiveIntensity = overrides.emissiveIntensity;
    if (overrides.opacity !== undefined) {
      m.opacity = overrides.opacity;
      m.transparent = overrides.opacity < 1;
    }
    if (overrides.transparent !== undefined) m.transparent = overrides.transparent;
    if (overrides.side !== undefined) m.side = overrides.side;
    if (overrides.depthWrite !== undefined) m.depthWrite = overrides.depthWrite;
    if (overrides.repeat) {
      for (const slot of ['map', 'bumpMap', 'roughnessMap', 'normalMap']) {
        const src = m[slot];
        if (!src) continue;
        const t = src.clone();
        t.needsUpdate = true;
        t.wrapS = THREE.RepeatWrapping;
        t.wrapT = THREE.RepeatWrapping;
        t.repeat.set(overrides.repeat[0], overrides.repeat[1]);
        m[slot] = t;
      }
    }
    if (overrides.map) m.map = overrides.map;
    cache.set(key, m);
    return m;
  }

  return { get, variant, textures, names: Object.keys(list), list };
}
