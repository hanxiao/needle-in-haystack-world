import puppeteer from 'puppeteer-core';
import { spawn } from 'node:child_process';
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
const PORT=4199;
const srv=spawn(process.execPath,['tools/serve.mjs','qa/frozen'],{cwd:process.cwd(),env:{...process.env,PORT:String(PORT)},stdio:'ignore'});
const t0=Date.now(); for(;;){try{const r=await fetch(`http://127.0.0.1:${PORT}/`);if(r.ok)break;}catch{} if(Date.now()-t0>10000)throw new Error('timeout'); await sleep(100);}
const browser=await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,protocolTimeout:180000,args:['--no-sandbox','--use-gl=angle','--use-angle=metal','--enable-gpu','--window-size=1440,900'],defaultViewport:{width:1440,height:900}});
const page=await browser.newPage();
await page.goto(`http://127.0.0.1:${PORT}/`,{waitUntil:'domcontentloaded'});
await page.waitForFunction('window.__APP__ && window.__APP__.ready===true',{timeout:90000});
await sleep(1500);
const out=await page.evaluate(async()=>{
  const A=window.__APP__; const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
  const grabMug=async()=>{ A.qa.reset(); A.qa.setView('third'); A.qa.teleportNear('mug_white',0.33); await sleep(550); return A.qa.grabByName('mug_white'); };
  const res={};
  // (1) repeated forcedAim at high/low world points
  await grabMug(); await sleep(500);
  const rp=A.state().robot.pos, yaw=A.state().robot.yaw; const fx=-Math.sin(yaw), fz=-Math.cos(yaw);
  const hold=async(px,py,pz,ms)=>{ const end=performance.now()+ms; while(performance.now()<end){ A.qa.aimAtPoint([px,py,pz]); await sleep(20);} };
  await hold(rp[0]+fx*0.5, rp[1]+1.1, rp[2]+fz*0.5, 900);
  res.forcedHigh=A.qa.object('mug_white').pos[1];
  await hold(rp[0]+fx*0.5, rp[1]+0.05, rp[2]+fz*0.5, 900);
  res.forcedLow=A.qa.object('mug_white').pos[1];
  // (2) pointer at top vs bottom of the screen (ray-driven aim)
  const cam=A.qa.cameraInfo();
  A.qa.pointerAt(720, 80); await sleep(900);
  res.pointerTop=A.qa.object('mug_white').pos[1];
  A.qa.pointerAt(720, 820); await sleep(900);
  res.pointerBottom=A.qa.object('mug_white').pos[1];
  // (3) look first-person up/down while holding
  A.qa.setView('first'); A.qa.look(A.state().robot.yaw, 0.9); await sleep(900);
  res.fpUp=A.qa.object('mug_white').pos[1];
  A.qa.look(A.state().robot.yaw, -0.9); await sleep(900);
  res.fpDown=A.qa.object('mug_white').pos[1];
  res.held=A.state().robot.held;
  A.qa.release();
  return res;
});
console.log(JSON.stringify(out,null,1));
await browser.close(); srv.kill();
