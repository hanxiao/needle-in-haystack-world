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
  const res={};
  const probe=async(name,dist,yawOff)=>{
    A.qa.reset(); A.qa.setView('third'); const near=A.qa.teleportNear(name,dist);
    await sleep(650);
    if(yawOff && A.qa.setCamera) A.qa.setCamera(near.yaw+yawOff,0.34,1.25);
    await sleep(350);
    const s=A.qa.screenOf(name); const cam=A.qa.cameraInfo(); const rp=A.state().robot.pos;
    const rows=[];
    if(s){ for(const [ox,oy] of [[0,0],[-25,0],[25,0],[0,-25],[0,25],[-25,-20],[25,-20],[-50,0],[0,50]]){
      A.qa.pointerAt(s.x+ox,s.y+oy); await sleep(90); rows.push({ox,oy,target:A.state().target,ray:A.qa.raycast?A.qa.raycast():null});
    }}
    return {name,dist,yawOff,near:near&&near.pos,screen:s,cam:cam.pos,robot:rp,rows};
  };
  res.sofa=[]; for(const d of [0.5,0.45,0.55]) res.sofa.push(await probe('sofa',d,0));
  res.sofaYaw=await probe('sofa',0.5,0.6);
  res.bed=await probe('bed',0.5,0);
  res.laundry=await probe('laundry_basket',0.45,0);
  res.trash=await probe('trash_bin',0.45,0);
  // direct raycast at pointer center-ish
  return res;
});
console.log(JSON.stringify(out,null,1));
await browser.close(); srv.kill();
