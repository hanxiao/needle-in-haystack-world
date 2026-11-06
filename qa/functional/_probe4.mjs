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

// FP aim at trash_bin, then real click
out.setup = await page.evaluate(async()=>{
  const A=window.__APP__; A.qa.reset(); A.qa.setView('third');
  const near=A.qa.teleportNear('trash_bin',0.5);
  await new Promise(r=>setTimeout(r,300));
  const o=A.qa.object('trash_bin'); const rp=A.state().robot.pos;
  const dx=o.pos[0]-rp[0], dz=o.pos[2]-rp[2], dy=o.pos[1]-(rp[1]+0.35);
  A.qa.look(Math.atan2(-dx,-dz), -Math.atan2(dy,Math.hypot(dx,dz)));
  await new Promise(r=>setTimeout(r,400));
  const st=A.state();
  // compute shoulder distance for the hit point? just object center
  const canReachObj = A.robot.canReach({x:o.pos[0],y:o.pos[1],z:o.pos[2]});
  return {near, target:st.target, hud:A.qa.hudText(), robotPos:st.robot.pos, objPos:o.pos, canReachObj, mode:st.robot.mode};
});
await page.mouse.click(720,450);
await sleep(500);
out.afterClick1 = await page.evaluate(()=>({st:window.__APP__.state(), hud:window.__APP__.qa.hudText(), toast:document.querySelector('#hud-toast').textContent, toastHidden:document.querySelector('#hud-toast').hidden}));
// click again to place
await page.mouse.click(720,450);
await sleep(1000);
out.afterClick2 = await page.evaluate(()=>({st:window.__APP__.state(), hud:window.__APP__.qa.hudText(), obj:window.__APP__.qa.object('trash_bin').pos}));

// qa.grabByName for comparison
out.grabApi = await page.evaluate(async()=>{
  const A=window.__APP__; A.qa.reset(); await new Promise(r=>setTimeout(r,300));
  const near=A.qa.teleportNear('trash_bin',0.5); await new Promise(r=>setTimeout(r,300));
  const r=A.qa.grabByName('trash_bin'); await new Promise(r=>setTimeout(r,300));
  const st=A.state(); A.qa.release();
  return {near, r, held:st.robot.held, hud:A.qa.hudText()};
});

// canReach distances: for a range of points in front of robot at various heights
out.reachProbe = await page.evaluate(async()=>{
  const A=window.__APP__; A.qa.reset(); A.qa.teleport(0,0,0); await new Promise(r=>setTimeout(r,500));
  const rp=A.state().robot.pos;
  const res=[];
  for (const d of [0.3,0.45,0.55,0.65,0.8]) for (const h of [0.1,0.3,0.5]) {
    res.push({d,h,can:A.robot.canReach({x:rp[0], y:rp[1]+h, z:rp[2]-d})});
  }
  return res;
});

// third person hover search for a real click target: move camera around robot with mug nearby
out.tpSearch = await page.evaluate(async()=>{
  const A=window.__APP__; A.qa.reset(); A.qa.setView('third');
  const near=A.qa.teleportNear('mug_white',0.5); await new Promise(r=>setTimeout(r,400));
  const hits=[];
  for (let yaw=0; yaw<Math.PI*2; yaw+=Math.PI/6) {
    for (const pitch of [0.1,0.35,0.6]) {
      A.qa.setCamera(yaw,pitch,1.4);
      await new Promise(r=>setTimeout(r,120));
      const t=A.state().target;
      if (t) hits.push({yaw:+yaw.toFixed(2),pitch,target:t});
    }
  }
  return {near, hits};
});
console.log(JSON.stringify({out,logs},null,1));
await browser.close(); srv.kill();
