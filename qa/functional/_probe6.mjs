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
const out = await page.evaluate(async()=>{
  const A=window.__APP__;
  const rec=[];
  const orig=A.robot.canReach;
  A.robot.canReach=function(p){ const r=orig.call(A.robot,p); if(rec.length<400) rec.push({p:[+p.x.toFixed(2),+p.y.toFixed(2),+p.z.toFixed(2)],r,st:(new Error().stack||'').split('\n')[2]||''}); return r; };
  A.qa.reset(); A.qa.setView('third');
  const near=A.qa.teleportNear('trash_bin',0.5); await new Promise(r=>setTimeout(r,300));
  const o=A.qa.object('trash_bin'); const rp=A.state().robot.pos;
  const dx=o.pos[0]-rp[0], dz=o.pos[2]-rp[2], dy=o.pos[1]-(rp[1]+0.35);
  A.qa.look(Math.atan2(-dx,-dz), -Math.atan2(dy,Math.hypot(dx,dz)));
  await new Promise(r=>setTimeout(r,500));
  const el=document.querySelector('#hud-target');
  const sample={text:el.textContent, dataset:{...el.dataset}, hud:A.qa.hudText(), stateTarget:A.state().target, stateHit:null};
  // capture a few frames of text
  const frames=[];
  for(let i=0;i<10;i++){ await new Promise(r=>setTimeout(r,50)); frames.push({t:document.querySelector('#hud-target').textContent, ds:document.querySelector('#hud-target').dataset.status}); }
  A.robot.canReach=orig;
  return {near, sample, frames, calls:rec.slice(-40), callCount:rec.length};
});
console.log(JSON.stringify({out,logs},null,1));
await browser.close(); srv.kill();
