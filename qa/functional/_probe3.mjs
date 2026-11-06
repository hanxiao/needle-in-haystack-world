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

// rest stability of sofa after reset
out.sofaRest = await page.evaluate(async()=>{
  const A=window.__APP__; A.qa.reset(); await new Promise(r=>setTimeout(r,700));
  const p0=A.qa.object('sofa').pos; const vel=()=>{const o=A.physics.get('sofa'); const v=o.body.linvel(); return [v.x,v.y,v.z].map(x=>+x.toFixed(4));};
  const v0=vel(); await new Promise(r=>setTimeout(r,1500)); const p1=A.qa.object('sofa').pos; const v1=vel();
  return {p0:p0.map(x=>+x.toFixed(3)), p1:p1.map(x=>+x.toFixed(3)), v0, v1, drift:+Math.hypot(p1[0]-p0[0],p1[2]-p0[2]).toFixed(4)};
});

// hover targeting helper: FP aim at object, check target
async function fpTarget(name, dist){
  return await page.evaluate(async ({name,dist})=>{
    const A=window.__APP__;
    A.qa.reset(); A.qa.setView('third');
    const near=A.qa.teleportNear(name,dist);
    if(!near) return {err:'missing'};
    await new Promise(r=>setTimeout(r,300));
    const o=A.qa.object(name); const rp=A.state().robot.pos;
    const dx=o.pos[0]-rp[0], dz=o.pos[2]-rp[2], dy=o.pos[1]-(rp[1]+0.35);
    A.qa.look(Math.atan2(-dx,-dz), -Math.atan2(dy,Math.hypot(dx,dz)));
    await new Promise(r=>setTimeout(r,350));
    const st=A.state();
    return {target:st.target, hud:A.qa.hudText().target, robotPos:st.robot.pos.map(x=>+x.toFixed(2)), objPos:o.pos.map(x=>+x.toFixed(2))};
  },{name,dist});
}
out.fpSofa = await fpTarget('sofa',0.9);
out.fpChair = await fpTarget('chair_1',0.9);
out.fpTrash = await fpTarget('trash_bin',0.55);
out.fpFridge = await fpTarget('fridge',0.9);
out.fpMug = await fpTarget('mug_white',0.55);
out.fpNeedle = await fpTarget('needle',0.35);

// push test with verified target
out.push={};
for(const [name,dist] of [['sofa',0.9],['chair_1',0.9]]){
  const t=await fpTarget(name,dist);
  const before=await page.evaluate(n=>window.__APP__.qa.object(n).pos,name);
  await page.evaluate(()=>window.__APP__.qa.action());
  await sleep(1500);
  const after=await page.evaluate(n=>window.__APP__.qa.object(n).pos,name);
  out.push[name]={target:t.target,moved:+Math.hypot(after[0]-before[0],after[2]-before[2]).toFixed(4),before:before.map(x=>+x.toFixed(3)),after:after.map(x=>+x.toFixed(3)),hud:t.hud};
}

// boost vs normal speed
out.speed = await page.evaluate(async()=>{
  const A=window.__APP__;
  const run=async(boost)=>{
    A.qa.reset(); A.qa.teleport(-4.6,-0.6,0); A.qa.setView('third'); await new Promise(r=>setTimeout(r,400));
    const p0=A.state().robot.pos;
    if(boost) A.qa.hold('ShiftLeft'); A.qa.hold('KeyW');
    await new Promise(r=>setTimeout(r,900));
    A.qa.releaseKey('KeyW'); A.qa.releaseKey('ShiftLeft');
    await new Promise(r=>setTimeout(r,150));
    const p1=A.state().robot.pos;
    return +Math.hypot(p1[0]-p0[0],p1[2]-p0[2]).toFixed(3);
  };
  return {normal:await run(false), boost:await run(true)};
});

// wall collision + tunnelling: boost into south wall
out.wall = await page.evaluate(async()=>{
  const A=window.__APP__;
  A.qa.reset(); A.qa.teleport(-3.6,-1.2,0); A.qa.setView('third'); await new Promise(r=>setTimeout(r,400));
  const samples=[];
  A.qa.hold('ShiftLeft'); A.qa.hold('KeyW');
  for(let i=0;i<30;i++){ await new Promise(r=>setTimeout(r,100)); const s=A.state().robot.pos; samples.push([+s[0].toFixed(2),+s[2].toFixed(2)]); }
  A.qa.releaseKey('KeyW'); A.qa.releaseKey('ShiftLeft');
  await new Promise(r=>setTimeout(r,200));
  const st=A.state();
  return {final:st.robot.pos.map(x=>+x.toFixed(3)), minZ:Math.min(...samples.map(s=>s[1])), maxAbsX:Math.max(...samples.map(s=>Math.abs(s[0]))), room:st.room};
});

// interior wall
out.wall2 = await page.evaluate(async()=>{
  const A=window.__APP__;
  A.qa.reset(); A.qa.teleport(-4.6,0.0,Math.PI); await new Promise(r=>setTimeout(r,400));
  A.qa.hold('KeyW'); await new Promise(r=>setTimeout(r,1800)); A.qa.releaseKey('KeyW');
  await new Promise(r=>setTimeout(r,200));
  const st=A.state();
  return {final:st.robot.pos.map(x=>+x.toFixed(3)), room:st.room};
});

// drift of 10 untouched dynamic objects over 3s
out.drift = await page.evaluate(async()=>{
  const A=window.__APP__;
  A.qa.reset(); await new Promise(r=>setTimeout(r,1500));
  const cand=A.physics.dynamicObjects.filter(o=>{const t=o.body.translation(); return o.grabbable && t.y>0.4 && Math.hypot(o.body.linvel().x,o.body.linvel().y,o.body.linvel().z)<0.02;}).slice(0,10);
  const p0=cand.map(o=>{const t=o.body.translation(); return {name:o.name,p:[t.x,t.y,t.z]};});
  await new Promise(r=>setTimeout(r,3000));
  const res=p0.map(({name,p})=>{const t=A.physics.get(name).body.translation(); return {name, d:+Math.hypot(t.x-p[0],t.y-p[1],t.z-p[2]).toFixed(4)};});
  return {count:cand.length, max:Math.max(...res.map(r=>r.d)), res};
});

// stack stability: shelf books and sofa cushions
out.stack = await page.evaluate(async()=>{
  const A=window.__APP__;
  A.qa.reset(); await new Promise(r=>setTimeout(r,1200));
  const names=['shelf_book_1','shelf_book_7','shelf_book_12','shelf_book_16','shelf_book_19','cushion_1','cushion_2','cushion_3','sofa_throw'];
  const p0=names.map(n=>{const o=A.qa.object(n); return o?{name:n,p:o.pos}:null;}).filter(Boolean);
  await new Promise(r=>setTimeout(r,3000));
  return p0.map(({name,p})=>{const o=A.qa.object(name); return {name, d:+Math.hypot(o.pos[0]-p[0],o.pos[1]-p[1],o.pos[2]-p[2]).toFixed(4), y0:+p[1].toFixed(3), y1:+o.pos[1].toFixed(3)};});
});

console.log(JSON.stringify({out,logs},null,1));
await browser.close(); srv.kill();
