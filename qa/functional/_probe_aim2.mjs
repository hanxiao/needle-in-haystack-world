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
  A.qa.reset(); A.qa.setView('third'); A.qa.teleportNear('mug_white',0.33); await sleep(550);
  const g=A.qa.grabByName('mug_white'); await sleep(600);
  const rp=A.state().robot.pos, yaw=A.state().robot.yaw; const fx=-Math.sin(yaw), fz=-Math.cos(yaw);
  const hold=async(py,ms)=>{ const end=performance.now()+ms; while(performance.now()<end){ A.qa.aimAtPoint([rp[0]+fx*0.5, py, rp[2]+fz*0.5]); await sleep(20);} };
  const base=A.qa.object('mug_white').pos[1];
  await hold(0.75, 900); const high=A.qa.object('mug_white').pos[1];
  await hold(0.30, 900); const low=A.qa.object('mug_white').pos[1];
  await hold(0.60, 900); const mid=A.qa.object('mug_white').pos[1];
  A.qa.release();
  return {g,base,high,low,mid,delta:+(high-low).toFixed(3)};
});
console.log(JSON.stringify(out,null,1));
await browser.close(); srv.kill();
