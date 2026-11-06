import puppeteer from 'puppeteer-core';
import { spawn } from 'node:child_process';
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
const PORT=4199;
const srv=spawn(process.execPath,['tools/serve.mjs','dist'],{cwd:process.cwd(),env:{...process.env,PORT:String(PORT)},stdio:'ignore'});
const t0=Date.now(); for(;;){try{const r=await fetch(`http://127.0.0.1:${PORT}/`);if(r.ok)break;}catch{} if(Date.now()-t0>10000)throw new Error('timeout'); await sleep(100);}
const browser=await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,protocolTimeout:180000,args:['--no-sandbox','--use-gl=angle','--use-angle=metal','--enable-gpu','--window-size=1440,900'],defaultViewport:{width:1440,height:900}});
const page=await browser.newPage();
await page.goto(`http://127.0.0.1:${PORT}/`,{waitUntil:'domcontentloaded'});
await page.waitForFunction('window.__APP__ && window.__APP__.ready===true',{timeout:90000});
await sleep(1800);
const out=await page.evaluate(async()=>{
  const A=window.__APP__; const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
  const label=async(name)=>{
    const s=A.qa.screenOf(name); let target=null,hud=null;
    if(s){ for(const [ox,oy] of [[0,0],[-25,0],[25,0],[0,-25],[0,25],[-25,-20],[25,-20],[-50,0],[0,50]]){ A.qa.pointerAt(s.x+ox,s.y+oy); await sleep(90); if(A.state().target===name){target=name;hud=A.qa.hudText().target;break;} } }
    return {target,hud};
  };
  const res={};
  // coffee table + mug geometry
  const ct=A.qa.object('coffee_table'), mug=A.qa.object('mug_white'), sofa=A.qa.object('sofa');
  res.geom={ct:ct.pos,mug:mug.pos,sofa:sofa.pos};
  // sample robot positions around mug at radius 0.30/0.32/0.34 and check canReach + label
  res.mugPos=[];
  for (const r of [0.28,0.30,0.32,0.34,0.36]) {
    for (let i=0;i<12;i++){
      const a=i/12*Math.PI*2;
      const x=mug.pos[0]+Math.cos(a)*r, z=mug.pos[2]+Math.sin(a)*r;
      A.qa.reset(); A.qa.setView('third');
      A.qa.teleport(x,z,Math.atan2(-(mug.pos[0]-x),-(mug.pos[2]-z)));
      await sleep(350);
      const st=A.state();
      if (Math.hypot(st.robot.pos[0]-x, st.robot.pos[2]-z)>0.06) continue; // pushed out of furniture
      const can=A.robot.canReach({x:mug.pos[0],y:mug.pos[1],z:mug.pos[2]});
      if (can) { const l=await label('mug_white'); res.mugPos.push({r,a:+a.toFixed(2),robot:st.robot.pos.map(v=>+v.toFixed(2)),can,label:l}); if(res.mugPos.length>=4) break; }
    }
    if(res.mugPos.length>=4) break;
  }
  // sofa: drive into it from teleportNear, then label
  A.qa.reset(); A.qa.setView('third'); A.qa.teleportNear('sofa',0.6); await sleep(500);
  await new Promise(r=>setTimeout(r,200));
  res.sofaDrive={};
  // drive W 1.5s
  const before=A.state().robot.pos;
  return {res, sofa:sofa.pos, ct:ct.pos};
});
// drive toward sofa with real keys
await page.keyboard.down('KeyW'); await sleep(1600); await page.keyboard.up('KeyW'); await sleep(400);
out.afterDrive = await page.evaluate(async()=>{
  const A=window.__APP__; const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
  const sofa=A.qa.object('sofa');
  const st=A.state();
  const can=A.robot.canReach({x:sofa.pos[0],y:sofa.pos[1],z:sofa.pos[2]});
  const s=A.qa.screenOf('sofa'); let hud=null,target=null;
  if(s){ for(const [ox,oy] of [[0,0],[-25,0],[25,0],[0,-25],[0,25]]){ A.qa.pointerAt(s.x+ox,s.y+oy); await sleep(100); if(A.state().target==='sofa'){target='sofa';hud=A.qa.hudText().target;break;} } }
  return {robot:st.robot.pos.map(v=>+v.toFixed(2)), sofa:sofa.pos.map(v=>+v.toFixed(2)), dist:+Math.hypot(st.robot.pos[0]-sofa.pos[0],st.robot.pos[2]-sofa.pos[2]).toFixed(2), can, target, hud};
});
console.log(JSON.stringify(out,null,1));
await browser.close(); srv.kill();
