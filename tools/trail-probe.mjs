import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless:true, args:['--no-sandbox','--use-gl=angle','--use-angle=metal','--enable-gpu','--window-size=1440,900'], defaultViewport:{width:1440,height:900}});
const page = await browser.newPage();
await page.goto('http://127.0.0.1:4173/', {waitUntil:'networkidle0'});
await page.waitForFunction('window.__APP__ && window.__APP__.ready===true', {timeout:60000});
await new Promise(r=>setTimeout(r,1200));
for (const [key,ms] of [['KeyW',2000],['KeyD',900],['KeyS',1200]]) { await page.keyboard.down(key); await new Promise(r=>setTimeout(r,ms)); await page.keyboard.up(key); }
await new Promise(r=>setTimeout(r,300));
const info = await page.evaluate(()=>{
  const A=window.__APP__; const m=A.trail.mesh; const g=m.geometry;
  const pos=g.getAttribute('position');
  return {points:A.trail.points.length, visible:m.visible, layers:m.layers.mask, topLayers:A.robot.cameras.top.layers.mask, drawRange:g.drawRange, count:pos.count, first:[...pos.array.slice(0,6)], last:[...pos.array.slice((A.trail.points.length-1)*6,(A.trail.points.length-1)*6+6)], color:g.getAttribute('color')?[...g.getAttribute('color').array.slice(0,6)]:null, material:{type:m.material.type, vertexColors:m.material.vertexColors, opacity:m.material.opacity}, inScene:!!m.parent};
});
console.log(JSON.stringify(info,null,2));
// force visible in main
await page.evaluate(()=>{ const A=window.__APP__; A.trail.mesh.layers.set(0); });
await new Promise(r=>setTimeout(r,400));
await page.screenshot({path:'qa/shots/trail-main.png'});
await page.evaluate(()=>{ const A=window.__APP__; A.trail.mesh.layers.set(2); });
// crop map from hud canvas via screenshot clip
await page.screenshot({path:'qa/shots/trail-hud.png', clip:{x:1244,y:16,width:180,height:180}});
await browser.close();
