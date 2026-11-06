// Scene audit: dump meshes (name, world pos, world bbox size, material flags) for defect hunting.
import puppeteer from 'puppeteer-core';

const URL = process.argv[2] || 'http://127.0.0.1:4182/';
const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
  args: ['--no-sandbox', '--use-gl=angle', '--use-angle=metal', '--enable-gpu', '--window-size=1440,900', '--hide-scrollbars'],
  defaultViewport: { width: 1440, height: 900 },
});
const page = await browser.newPage();
await page.goto(URL, { waitUntil: 'networkidle0', timeout: 60000 });
await page.waitForFunction('window.__APP__ && window.__APP__.ready===true', { timeout: 60000 });
await new Promise((r) => setTimeout(r, 1500));

const out = await page.evaluate(() => {
  const scene = window.__APP__.scene;
  scene.updateMatrixWorld(true);
  const rows = [];
  scene.traverse((o) => {
    if (!o.isMesh && !o.isInstancedMesh) return;
    const mat = Array.isArray(o.material) ? o.material[0] : o.material;
    const g = o.geometry;
    if (g && g.computeBoundingBox) g.computeBoundingBox();
    const bb = g && g.boundingBox ? g.boundingBox : null;
    const size = bb ? [bb.max.x - bb.min.x, bb.max.y - bb.min.y, bb.max.z - bb.min.z] : null;
    const wp = o.position.clone();
    o.getWorldPosition(wp);
    const scale = o.getWorldScale(o.scale.clone());
    rows.push({
      name: o.name || '',
      parent: o.parent ? o.parent.name || '' : '',
      type: o.type,
      transparent: mat ? !!mat.transparent : null,
      opacity: mat ? +mat.opacity.toFixed(3) : null,
      depthWrite: mat ? mat.depthWrite : null,
      matName: mat ? mat.name || '' : '',
      size: size ? size.map((v) => +v.toFixed(3)) : null,
      wscale: [scale.x, scale.y, scale.z].map((v) => +v.toFixed(3)),
      pos: [wp.x, wp.y, wp.z].map((v) => +v.toFixed(3)),
      visible: o.visible,
    });
  });
  return rows;
});
console.log(JSON.stringify(out));
await browser.close();
