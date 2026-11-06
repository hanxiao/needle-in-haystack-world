import puppeteer from 'puppeteer-core';
import { spawn } from 'node:child_process';
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
const PORT=4199, DIR='dist';
const srv=spawn(process.execPath,['tools/serve.mjs',DIR],{cwd:process.cwd(),env:{...process.env,PORT:String(PORT)},stdio:'ignore'});
const t0=Date.now(); for(;;){try{const r=await fetch(`http://127.0.0.1:${PORT}/`);if(r.ok)break;}catch{} if(Date.now()-t0>10000)throw new Error('timeout'); await sleep(100);}
const browser=await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,protocolTimeout:180000,args:['--no-sandbox','--use-gl=angle','--use-angle=metal','--enable-gpu','--window-size=1440,900'],defaultViewport:{width:1440,height:900}});
const page=await browser.newPage();
await page.goto(`http://127.0.0.1:${PORT}/`,{waitUntil:'domcontentloaded'});
await page.waitForFunction('window.__APP__ && window.__APP__.ready===true',{timeout:90000});
await sleep(1800);
const out=await page.evaluate(async()=>{
  const A=window.__APP__;
  const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
  const hoverAt=async(name,dist)=>{
    A.qa.reset(); A.qa.setView('third');
    const near=A.qa.teleportNear(name,dist);
    await sleep(650);
    const s=A.qa.screenOf(name);
    let target=null, hud=null;
    if (s){
      for (const [ox,oy] of [[0,0],[-25,0],[25,0],[0,-25],[0,25],[-25,-20],[25,-20],[-50,0],[0,50]]) {
        A.qa.pointerAt(s.x+ox,s.y+oy); await sleep(90);
        if (A.state().target===name){ target=name; hud=A.qa.hudText().target; break; }
      }
    }
    const st=A.state(); const o=A.qa.object(name);
    return {dist, near:near&&near.pos, freeSpot:near&&near.freeSpot, robot:st.robot.pos.map(v=>+v.toFixed(2)), obj:o.pos.map(v=>+v.toFixed(2)), horiz:+Math.hypot(o.pos[0]-st.robot.pos[0],o.pos[2]-st.robot.pos[2]).toFixed(2), canReachCenter:A.robot.canReach({x:o.pos[0],y:o.pos[1],z:o.pos[2]}), target, hud};
  };
  const res={};
  res.mug=[];
  for (const d of [0.30,0.33,0.35,0.4,0.5]) res.mug.push(await hoverAt('mug_white',d));
  res.sofa=[];
  for (const d of [0.35,0.4,0.5]) res.sofa.push(await hoverAt('sofa',d));
  res.laptop=await hoverAt('laptop',0.32);
  res.book2=await hoverAt('book_2',0.32);
  res.bookStack=await hoverAt('book_stack_1',0.32);
  // plate_1 and other plates: check positions and grab at several dists
  res.plates=[];
  for (const n of ['plate_1','plate_2','plate_3','plate_4']) { const o=A.qa.object(n); if(o) res.plates.push({name:n,pos:o.pos.map(v=>+v.toFixed(2)),mass:o.mass}); }
  res.plateGrabs=[];
  for (const d of [0.30,0.33,0.35]) {
    for (const n of ['plate_1','plate_2','plate_3','plate_4']) {
      if (!A.qa.object(n)) continue;
      A.qa.reset(); A.qa.setView('third');
      const near=A.qa.teleportNear(n,d); await sleep(550);
      const g=A.qa.grabByName(n); await sleep(250);
      const st=A.state(); A.qa.release();
      res.plateGrabs.push({name:n,d,near:near&&near.pos,freeSpot:near&&near.freeSpot,grab:g,held:st.robot.held});
    }
  }
  // books: find liftable book names
  res.books=A.qa.objects().filter(o=>!o.static && /book/.test(o.name) && o.mass<=0.5).map(o=>({name:o.name,mass:o.mass,pos:o.pos.map(v=>+v.toFixed(2))})).slice(0,8);
  res.bookGrabs=[];
  for (const b of res.books.slice(0,4)) {
    A.qa.reset(); A.qa.setView('third');
    const near=A.qa.teleportNear(b.name,0.33); await sleep(550);
    const g=A.qa.grabByName(b.name); await sleep(250);
    res.bookGrabs.push({name:b.name,mass:b.mass,grab:g,held:A.state().robot.held}); A.qa.release();
  }
  return res;
});
console.log(JSON.stringify(out,null,1));
await browser.close(); srv.kill();
