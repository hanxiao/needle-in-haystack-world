import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless:true, args:['--no-sandbox','--use-gl=angle','--use-angle=metal','--enable-gpu','--window-size=1440,900'], defaultViewport:{width:1440,height:900}});
const page = await browser.newPage();
await page.goto('http://127.0.0.1:4173/', {waitUntil:'networkidle0'});
await page.waitForFunction('window.__APP__ && window.__APP__.ready===true', {timeout:60000});
await new Promise(r=>setTimeout(r,1200));
for (const [key,ms] of [['KeyW',2000],['KeyD',900],['KeyS',1200]]) { await page.keyboard.down(key); await new Promise(r=>setTimeout(r,ms)); await page.keyboard.up(key); }
await new Promise(r=>setTimeout(r,300));
await page.evaluate(()=>{ const A=window.__APP__; const m=A.trail.mesh; m.material.vertexColors=false; m.material.color.setHex(0xff0000); m.material.depthTest=false; m.material.needsUpdate=true; m.layers.set(2); });
await new Promise(r=>setTimeout(r,600));
await page.screenshot({path:'qa/shots/trail-red.png', clip:{x:1244,y:16,width:180,height:180}});
// check renderer info for hud
const info = await page.evaluate(()=>{
  const A=window.__APP__; const m=A.trail.mesh; const g=m.geometry;
  const pos=g.getAttribute('position');
  const p0=A.trail.points[0]; const pn=A.trail.points[A.trail.points.length-1];
  return {points:A.trail.points.length, p0, pn, drawRange:g.drawRange, indexCount:g.index.count, visible:m.visible, layers:m.layers.mask, topLayers:A.robot.cameras.top.layers.mask, hudInfo:A.hudRenderer.info.render, topCamPos:A.robot.cameras.top.getWorldPosition(new (A.robot.group.position.constructor)()).toArray()};
});
console.log(JSON.stringify(info,null,2));
await browser.close();
