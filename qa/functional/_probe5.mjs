import puppeteer from 'puppeteer-core';
import { spawn } from 'node:child_process';
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
const PORT=4199;
const srv = spawn(process.execPath, ['tools/serve.mjs'], {cwd: process.cwd(), env:{...process.env, PORT:String(PORT)}, stdio:'ignore'});
const t0=Date.now();
for(;;){ try { const r=await fetch(`http://127.0.0.1:${PORT}/`); if(r.ok) break; } catch{} if(Date.now()-t0>10000) throw new Error('server timeout'); await sleep(100); }
const browser = await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=metal','--enable-gpu','--window-size=1440,900'],defaultViewport:{width:1440,height:900}});
const page = await browser.newPage();
const logs=[]; page.on('console',m=>logs.push(`[${m.type()}] ${m.text()}`)); page.on('pageerror',e=>logs.push(`[pageerror] ${e.message}`));
await page.goto(`http://127.0.0.1:${PORT}/`, {waitUntil:'domcontentloaded'});
await page.waitForFunction('window.__APP__ && window.__APP__.ready===true',{timeout:60000});
await sleep(1200);
const out={};

out.reach = await page.evaluate(async()=>{
  const A=window.__APP__;
  window.__reach=[];
  const orig=A.robot.canReach;
  A.robot.canReach=function(p){ const r=orig.call(A.robot,p); window.__reach.push({p:[+p.x.toFixed(2),+p.y.toFixed(2),+p.z.toFixed(2)],r}); if(window.__reach.length>50) window.__reach.shift(); return r; };
  A.qa.reset(); A.qa.setView('third');
  const near=A.qa.teleportNear('trash_bin',0.5); await new Promise(r=>setTimeout(r,300));
  const o=A.qa.object('trash_bin'); const rp=A.state().robot.pos;
  const dx=o.pos[0]-rp[0], dz=o.pos[2]-rp[2], dy=o.pos[1]-(rp[1]+0.35);
  A.qa.look(Math.atan2(-dx,-dz), -Math.atan2(dy,Math.hypot(dx,dz)));
  await new Promise(r=>setTimeout(r,500));
  const hud=A.qa.hudText(); const st=A.state();
  const act=await new Promise(res=>{ A.qa.action(); setTimeout(()=>res({held:A.state().robot.held, toast:document.querySelector('#hud-toast').textContent}),300); });
  A.robot.canReach=orig;
  return {near, target:st.target, hud, reachCalls:window.__reach.slice(-8), act, robotPos:st.robot.pos, objPos:o.pos};
});

out.grabRules = await page.evaluate(async()=>{
  const A=window.__APP__; A.qa.reset(); await new Promise(r=>setTimeout(r,300));
  const sofaNear=A.qa.teleportNear('sofa',0.5); await new Promise(r=>setTimeout(r,400));
  const sofa=A.qa.grabByName('sofa');
  const walls=A.qa.grabByName('walls');
  const mugNear=A.qa.teleportNear('mug_white',0.35); await new Promise(r=>setTimeout(r,400));
  const mug=A.qa.grabByName('mug_white');
  const heldHud=A.qa.hudText();
  A.qa.release();
  return {sofa, walls, mug, mugNear, heldHud};
});

// real keyboard boost ratio
const speedRun = async (boost) => {
  await page.evaluate(()=>{ const A=window.__APP__; A.qa.reset(); A.qa.teleport(-4.6,-0.6,0); A.qa.setView('third'); });
  await sleep(400);
  const p0 = await page.evaluate(()=>window.__APP__.state().robot.pos);
  if (boost) await page.keyboard.down('Shift');
  await page.keyboard.down('KeyW');
  await sleep(1200);
  await page.keyboard.up('KeyW');
  if (boost) await page.keyboard.up('Shift');
  await sleep(150);
  const p1 = await page.evaluate(()=>window.__APP__.state().robot.pos);
  return +Math.hypot(p1[0]-p0[0],p1[2]-p0[2]).toFixed(3);
};
out.boost = { normal: await speedRun(false), boost: await speedRun(true) };

// WASD directions (real keys) relative to camera forward
out.dirs = {};
for (const key of ['KeyW','KeyS','KeyA','KeyD']) {
  await page.evaluate(()=>{ const A=window.__APP__; A.qa.reset(); A.qa.teleport(-3.6,-1.2,0); A.qa.setView('third'); A.qa.setCamera(0,0.34,1.75); });
  await sleep(400);
  const p0 = await page.evaluate(()=>window.__APP__.state().robot.pos);
  await page.keyboard.down(key); await sleep(700); await page.keyboard.up(key); await sleep(150);
  const p1 = await page.evaluate(()=>window.__APP__.state().robot.pos);
  out.dirs[key] = {d:[+(p1[0]-p0[0]).toFixed(3), +(p1[2]-p0[2]).toFixed(3)], moved:+Math.hypot(p1[0]-p0[0],p1[2]-p0[2]).toFixed(3)};
}

// mouse orbit + wheel
out.orbit = await page.evaluate(()=>{ const A=window.__APP__; A.qa.reset(); A.qa.setView('third'); A.qa.setCamera(0,0.34,1.75); });
await sleep(500);
const cam0 = await page.evaluate(()=>window.__APP__.qa.cameraInfo());
await page.mouse.move(720,450); await page.mouse.down();
for (let i=1;i<=8;i++) { await page.mouse.move(720+i*25, 450+i*12); await sleep(20); }
await page.mouse.up(); await sleep(300);
const cam1 = await page.evaluate(()=>window.__APP__.qa.cameraInfo());
const wheelBefore = await page.evaluate(()=>{ const A=window.__APP__; const c=A.qa.cameraInfo(); const r=A.state().robot.pos; return +Math.hypot(c.pos[0]-r[0],c.pos[1]-r[1],c.pos[2]-r[2]).toFixed(3); });
await page.mouse.move(720,450);
await page.mouse.wheel({deltaY:-400}); await sleep(300);
const wheelAfter = await page.evaluate(()=>{ const A=window.__APP__; const c=A.qa.cameraInfo(); const r=A.state().robot.pos; return +Math.hypot(c.pos[0]-r[0],c.pos[1]-r[1],c.pos[2]-r[2]).toFixed(3); });
out.orbit = { cam0, cam1, moved: +Math.hypot(cam1.pos[0]-cam0.pos[0], cam1.pos[1]-cam0.pos[1], cam1.pos[2]-cam0.pos[2]).toFixed(3), quatDelta:+Math.hypot(cam1.quat[0]-cam0.quat[0],cam1.quat[1]-cam0.quat[1],cam1.quat[2]-cam0.quat[2]).toFixed(3), wheelBefore, wheelAfter, zoomDelta:+(wheelAfter-wheelBefore).toFixed(3) };

console.log(JSON.stringify({out,logs},null,1));
await browser.close(); srv.kill();
