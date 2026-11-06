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
  const bed=A.qa.object('bed');
  const hits=[];
  for (const dist of [0.5,0.6]) {
    A.qa.reset(); A.qa.setView('third'); const near=A.qa.teleportNear('bed',dist); await sleep(700);
    for (const dy of [0,0.6,-0.6,1.0,-1.0,1.6,-1.6,2.4,-2.4,3.14]) {
      for (const cd of [1.25,2.2,3.2]) {
        for (const pitch of [0.2,0.5]) {
          A.qa.setCamera(near.yaw+dy,pitch,cd); await sleep(260);
          const s=A.qa.screenOf('bed'); if(!s) continue;
          const cam=A.qa.cameraInfo().pos;
          for (const [ox,oy] of [[0,0],[-25,0],[25,0],[0,-25],[0,25]]) {
            A.qa.pointerAt(s.x+ox,s.y+oy); await sleep(70);
            if (A.state().target==='bed') { hits.push({dist,dy,cd,pitch,ox,oy,cam:cam.map(v=>+v.toFixed(2)),robot:A.state().robot.pos.map(v=>+v.toFixed(2)),screen:{x:+s.x.toFixed(0),y:+s.y.toFixed(0)}}); break; }
          }
          if (hits.length) break;
        }
        if (hits.length) break;
      }
      if (hits.length) break;
    }
    if (hits.length) break;
  }
  return {bed:bed.pos,hits};
});
console.log(JSON.stringify(out,null,1));
await browser.close(); srv.kill();
