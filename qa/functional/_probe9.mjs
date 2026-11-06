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
  const res={};
  // canReach direct at various distances from sofa/mug/chair_1 centers
  const reachTest = async (name, dists) => {
    const rows=[];
    for (const d of dists) {
      A.qa.reset(); A.qa.setView('third'); A.qa.teleportNear(name,d);
      await new Promise(r=>setTimeout(r,700));
      const o=A.qa.object(name); const rp=A.state().robot.pos;
      const horiz=Math.hypot(o.pos[0]-rp[0],o.pos[2]-rp[2]);
      const can=A.robot.canReach({x:o.pos[0],y:o.pos[1],z:o.pos[2]});
      // hover + label via scan
      let hud=null, target=null;
      const s=A.qa.screenOf(name);
      const offs=[[0,0],[-25,-20],[25,-20],[0,-25],[-50,0]];
      for (const [ox,oy] of offs) {
        if(!s) break;
        A.qa.pointerAt(s.x+ox,s.y+oy); await new Promise(r=>setTimeout(r,120));
        const t=A.state().target; const h=A.qa.hudText().target;
        if (t===name) { target=t; hud=h; break; }
      }
      rows.push({d, horiz:+horiz.toFixed(2), robotY:+rp[1].toFixed(2), canReach:can, target, hud});
    }
    return rows;
  };
  res.sofa = await reachTest('sofa',[0.35,0.45,0.55,0.9]);
  res.mug = await reachTest('mug_white',[0.45,0.55]);
  res.chair = await reachTest('chair_1',[0.55,0.9]);
  res.laptop = await reachTest('laptop',[0.45]);
  // real click grab on mug at 0.45 using pointer scan
  A.qa.reset(); A.qa.setView('third'); A.qa.teleportNear('mug_white',0.45);
  await new Promise(r=>setTimeout(r,700));
  const s=A.qa.screenOf('mug_white');
  let hover=null;
  for (const [ox,oy] of [[0,0],[-25,-20],[25,-20],[0,-25],[-50,0],[0,-50]]) {
    A.qa.pointerAt(s.x+ox,s.y+oy); await new Promise(r=>setTimeout(r,150));
    if (A.state().target==='mug_white') { hover={x:s.x+ox,y:s.y+oy,target:'mug_white'}; break; }
  }
  res.realClickHover = hover;
  return res;
});
console.log(JSON.stringify({out,logs},null,1));
await browser.close(); srv.kill();
