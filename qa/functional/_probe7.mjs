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

// 1) mug grab via qa API on current build
out.mugGrab = await page.evaluate(async()=>{
  const A=window.__APP__;
  A.qa.reset(); A.qa.setView('third');
  const near=A.qa.teleportNear('mug_white',0.35);
  await new Promise(r=>setTimeout(r,600));
  const st0=A.state();
  const mug=A.qa.object('mug_white');
  const g=A.qa.grabByName('mug_white');
  await new Promise(r=>setTimeout(r,300));
  return {near, robot:st0.robot.pos, mug:mug.pos, g, held:A.state().robot.held, hud:A.qa.hudText()};
});

// 2) hover scan for mug / sofa / chair_1 in third person
out.hoverScan = await page.evaluate(async()=>{
  const A=window.__APP__;
  const scan = async (name, dist) => {
    A.qa.reset(); A.qa.setView('third');
    A.qa.teleportNear(name, dist);
    await new Promise(r=>setTimeout(r,700));
    const s = A.qa.screenOf ? A.qa.screenOf(name) : null;
    const results=[];
    for (const [ox,oy] of [[0,0],[0,-20],[0,-40],[-25,0],[25,0],[0,25],[0,50],[-50,0],[50,0],[-25,-20],[25,-20]]) {
      if (!s) continue;
      A.qa.pointerAt(s.x+ox, s.y+oy);
      await new Promise(r=>setTimeout(r,120));
      results.push({ox,oy,target:A.state().target});
    }
    // also try camera yaw offsets
    const yawHits=[];
    for (const dy of [0, 0.5, -0.5, 1.0, -1.0, 1.6, -1.6]) {
      A.qa.setCamera(dy, 0.34, 1.25);
      await new Promise(r=>setTimeout(r,250));
      const s2 = A.qa.screenOf(name);
      if (s2) { A.qa.pointerAt(s2.x, s2.y); await new Promise(r=>setTimeout(r,150)); yawHits.push({dy, target:A.state().target}); }
    }
    return {screen:s, results, yawHits};
  };
  return { mug: await scan('mug_white',0.5), sofa: await scan('sofa',0.9), chair1: await scan('chair_1',0.9) };
});

// 3) bedroom doorway attempts
out.bedroom = [];
for (const start of [[-0.8,3.14,Math.PI/2],[-0.8,2.9,Math.PI/2],[-0.8,3.3,Math.PI/2],[-0.6,3.14,Math.PI/2],[-0.9,3.0,Math.PI/2+0.2],[-0.9,3.2,Math.PI/2-0.2]]) {
  await page.evaluate((s)=>{const A=window.__APP__;A.qa.reset();A.qa.setView('third');A.qa.teleport(s[0],s[1],s[2]);},start);
  await sleep(300);
  await page.keyboard.down('KeyW'); await sleep(2200); await page.keyboard.up('KeyW'); await sleep(300);
  const st=await page.evaluate(()=>window.__APP__.state());
  out.bedroom.push({start, room:st.room, pos:st.robot.pos.map(v=>+v.toFixed(2))});
}

// 4) chair_1 positions and neighbors
out.chairs = await page.evaluate(()=>{
  const A=window.__APP__;
  const names=A.qa.objects().filter(o=>/chair/.test(o.name)).map(o=>({name:o.name,pos:o.pos.map(v=>+v.toFixed(2)),mass:o.mass}));
  return names;
});

// 5) hud hint words, mobile cursor
out.hint = await page.evaluate(()=>window.__APP__.qa.hudText());
console.log(JSON.stringify({out,logs},null,1));
await browser.close(); srv.kill();
