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
  const ensure=async(name,opts={})=>{
    const dists=opts.dists||[0.5,0.45,0.55]; const yaws=opts.yaws||[0,0.6,-0.6,1.0,-1.0];
    const offs=[[0,0],[-25,0],[25,0],[0,-25],[0,25],[-25,-20],[25,-20],[-50,0],[0,50]];
    const tries=[];
    for(const dist of dists){
      A.qa.reset(); A.qa.setView('third'); const near=A.qa.teleportNear(name,dist); if(!near)return{found:false,reason:'missing'};
      await sleep(700);
      for(const dy of yaws){
        if(A.qa.setCamera) A.qa.setCamera(near.yaw+dy,0.34,1.25);
        await sleep(420);
        const s=A.qa.screenOf(name); if(!s)continue;
        for(const [ox,oy] of offs){
          A.qa.pointerAt(s.x+ox,s.y+oy); await sleep(110);
          const t=A.state().target; tries.push({dist,dy,ox,oy,target:t});
          if(t===name) return {found:true,dist,dy,ox,oy,robot:A.state().robot.pos,obj:A.qa.object(name).pos,cam:A.qa.cameraInfo().pos};
        }
      }
    }
    return {found:false,tries:tries.slice(-12)};
  };
  const res={};
  for (const n of ['sofa','bed','laundry_basket','trash_bin','wardrobe','fridge','bookshelf','dining_table','desk','chair_1']) res[n]=await ensure(n);
  return res;
});
console.log(JSON.stringify(out,null,1));
await browser.close(); srv.kill();
