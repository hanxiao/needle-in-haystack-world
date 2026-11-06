import puppeteer from 'puppeteer-core';
import { writeFileSync } from 'node:fs';
const URL = process.argv[2] || 'http://127.0.0.1:4182/';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const OUT = 'qa/visual/shots';
const browser = await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless:true, args:['--no-sandbox','--use-gl=angle','--use-angle=metal','--enable-gpu','--hide-scrollbars','--window-size=1440,900'], defaultViewport:{width:1440,height:900,deviceScaleFactor:1}});
const page = await browser.newPage(); await page.bringToFront();
const logs=[]; page.on('console',m=>{if(m.type()!=='debug')logs.push(m.type()+': '+m.text())}); page.on('pageerror',e=>logs.push('err: '+e.message));
const t0=Date.now();
await page.goto(URL, {waitUntil:'domcontentloaded'});
await page.waitForFunction('window.__APP__ && window.__APP__.ready===true');
const readyMs=Date.now()-t0;
await wait(2400);
const R={readyMs,logs,poses:{}};
const shell={minX:-5.42,maxX:5.42,minZ:-3.62,maxZ:3.62,minY:0.12,maxY:2.58};
const drive=async(keys,ms)=>{ await page.evaluate(ks=>{const A=window.__APP__; ks.forEach(k=>A.qa.hold(k));},keys); await wait(ms); await page.evaluate(ks=>{const A=window.__APP__; ks.forEach(k=>A.qa.releaseKey(k));},keys); await wait(300); };
async function snap(name, objName){
  await page.screenshot({path:`${OUT}/c7-${name}.png`});
  const d = await page.evaluate((objName)=>{
    const A=window.__APP__, scene=A.scene; scene.updateMatrixWorld(true);
    const root=objName?scene.getObjectByName(objName):null;
    let bb=null;
    if(root) root.traverse(o=>{ if(!o.isMesh) return; const g=o.geometry; if(!g.boundingBox) g.computeBoundingBox(); const b=g.boundingBox.clone().applyMatrix4(o.matrixWorld); if(!bb) bb=b; else bb.union(b); });
    const c=A.qa.cameraInfo();
    const inside = bb ? (c.pos[0]>bb.min.x&&c.pos[0]<bb.max.x&&c.pos[1]>bb.min.y&&c.pos[1]<bb.max.y&&c.pos[2]>bb.min.z&&c.pos[2]<bb.max.z) : null;
    return {cam:c.pos.map(v=>+v.toFixed(2)), inside, bbox: bb?{min:[bb.min.x,bb.min.y,bb.min.z].map(v=>+v.toFixed(2)),max:[bb.max.x,bb.max.y,bb.max.z].map(v=>+v.toFixed(2))}:null, hud:A.qa.hudText(), robot:A.state().robot, draw:A.state().drawCalls};
  }, objName||null);
  R.poses[name]=d;
}
// spawn + HUD samples
await snap('spawn');
R.hud = await page.evaluate(()=>{ const rects=window.__APP__.qa.hudRects(); const s={}; for(const p of rects.panels) s[p.key]=window.__APP__.qa.sampleHud(p); s.map=window.__APP__.qa.sampleHud(rects.map); return s; });
// sofa
await page.evaluate(()=>{const A=window.__APP__; A.qa.teleport(-2.5,-1.9,Math.PI);}); await wait(700); await drive(['KeyW','ShiftLeft'],1800); await snap('sofa','sofa');
// bed
await page.evaluate(()=>{const A=window.__APP__; A.qa.teleport(-2.6,2.7,Math.atan2(1.6,0.1));}); await wait(700); await drive(['KeyW'],1500); await snap('bed','bed');
// under table
await page.evaluate(()=>{const A=window.__APP__; A.qa.teleport(-2.5,-1.55,0);}); await wait(900); await snap('under-table','coffee_table');
// outer-wall backs: west / east / north / south, robot facing into the room so camera is pushed to the wall
const walls=[
 ['wall-west',-5.30,-0.5, -Math.PI/2],
 ['wall-east', 5.30,-0.5,  Math.PI/2],
 ['wall-north',-1.0,-3.55, Math.PI],
 ['wall-south',-1.0, 3.55, 0],
];
for (const [name,x,z,yaw] of walls){
  await page.evaluate((x,z,yaw)=>{const A=window.__APP__; A.qa.teleport(x,z,yaw); A.qa.setView('third'); A.qa.setCamera(yaw,0.14,1.75);},x,z,yaw);
  await wait(800);
  await snap(name);
}
// heavy-push HUD reach at closest range
R.pushHud = await page.evaluate(async()=>{
  const A=window.__APP__;
  A.qa.release();
  A.qa.teleportNear('sofa', 0.3);
  await new Promise(r=>setTimeout(r,900));
  A.qa.aimAt('sofa');
  await new Promise(r=>setTimeout(r,600));
  return {hud:A.qa.hudText(), robot:A.state().robot, sofa:A.qa.object('sofa')};
});
await page.screenshot({path:`${OUT}/c7-push-hud.png`});
R.final = await page.evaluate(()=>({fps:window.__APP__.fps, draw:window.__APP__.state().drawCalls, errors:window.__APP__.state().errors}));
writeFileSync('qa/visual/camera7.json', JSON.stringify(R,null,1));
// shell violations
const violations=[];
for (const [k,v] of Object.entries(R.poses)){
  const [x,y,z]=v.cam;
  if (x<shell.minX-1e-6||x>shell.maxX+1e-6||z<shell.minZ-1e-6||z>shell.maxZ+1e-6||y<shell.minY-1e-6||y>shell.maxY+1e-6) violations.push({pose:k,cam:v.cam});
}
console.log(JSON.stringify({readyMs,logs,poses:Object.fromEntries(Object.entries(R.poses).map(([k,v])=>[k,{cam:v.cam,inside:v.inside,robotNdc:null}])),shellViolations:violations,pushHud:R.pushHud.hud,final:R.final,hudSamples:Object.fromEntries(Object.entries(R.hud).map(([k,v])=>[k,[+v.litRatio.toFixed(2),+v.mean.toFixed(0)]]))},null,1));
await browser.close();
