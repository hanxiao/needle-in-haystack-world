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
await sleep(1000);
const lift = await page.evaluate(()=>{
  const A=window.__APP__;
  return A.physics.dynamicObjects.filter(o=>o.grabbable).map(o=>{const t=o.body.translation(); return {name:o.name,mass:o.mass,pos:[+t.x.toFixed(2),+t.y.toFixed(2),+t.z.toFixed(2)]};}).sort((a,b)=>b.pos[1]-a.pos[1]);
});
console.log('LIFTABLE count', lift.length, JSON.stringify(lift.slice(0,25)));
const results=[];
for (const cand of lift) {
  const r = await page.evaluate(async (name)=>{
    const A=window.__APP__;
    A.qa.reset(); A.qa.setView('third');
    const near = A.qa.teleportNear(name, 0.55);
    if (!near) return {name, err:'not near'};
    await new Promise(r=>setTimeout(r,350));
    const o = A.qa.object(name);
    const rp = A.state().robot.pos;
    const dx=o.pos[0]-rp[0], dz=o.pos[2]-rp[2], dy=o.pos[1]-(rp[1]+0.35);
    const yaw=Math.atan2(-dx,-dz); const pitch=-Math.atan2(dy, Math.hypot(dx,dz));
    A.qa.look(yaw,pitch);
    await new Promise(r=>setTimeout(r,350));
    const st=A.state();
    return {name, mass:o.mass, objY:o.pos[1], hover:st.target, dist:+Math.hypot(dx,dz).toFixed(2)};
  }, cand.name);
  results.push(r);
  if (r.hover===cand.name) break;
}
console.log('FP HOVER RESULTS', JSON.stringify(results,null,1));
console.log('LOGS', JSON.stringify(logs));
await browser.close(); srv.kill();
