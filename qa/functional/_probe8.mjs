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

// mandated mug flow timeline
out.mugTimeline = await page.evaluate(async()=>{
  const A=window.__APP__;
  A.qa.reset(); A.qa.setView('third');
  A.qa.teleportNear('mug_white',0.35);
  const samples=[];
  for (let i=0;i<12;i++){ await new Promise(r=>setTimeout(r,100)); const st=A.state(); const m=A.qa.object('mug_white').pos; samples.push({t:(i+1)*100, robotY:+st.robot.pos[1].toFixed(3), robotPos:st.robot.pos.map(v=>+v.toFixed(2)), mugY:+m[1].toFixed(3), mugPos:m.map(v=>+v.toFixed(2))}); }
  return samples;
});
// grab at different waits/distances
out.grabAttempts=[];
for (const [dist,wait] of [[0.35,200],[0.35,400],[0.35,800],[0.45,600],[0.5,600],[0.6,600],[0.35,60]]) {
  const r = await page.evaluate(async ({dist,wait})=>{
    const A=window.__APP__;
    A.qa.reset(); A.qa.setView('third');
    const near=A.qa.teleportNear('mug_white',dist);
    await new Promise(res=>setTimeout(res,wait));
    const st=A.state(); const mug=A.qa.object('mug_white');
    const g=A.qa.grabByName('mug_white');
    await new Promise(res=>setTimeout(res,250));
    const held=A.state().robot.held; A.qa.release();
    return {dist,wait,robotY:+st.robot.pos[1].toFixed(3),robotObjDist:+Math.hypot(mug.pos[0]-st.robot.pos[0],mug.pos[2]-st.robot.pos[2]).toFixed(3),mugY:+mug.pos[1].toFixed(3),g,held};
  },{dist,wait});
  out.grabAttempts.push(r);
}
// sofa hover at 0.45/0.5 and label
out.sofaHover = await page.evaluate(async()=>{
  const A=window.__APP__;
  const scan=async(dist)=>{
    A.qa.reset(); A.qa.setView('third'); A.qa.teleportNear('sofa',dist);
    await new Promise(r=>setTimeout(r,700));
    const s=A.qa.screenOf('sofa');
    const res=[];
    for (const [ox,oy] of [[0,0],[-25,0],[25,0],[0,-25],[0,25],[-50,0],[0,-50]]) {
      if(!s) continue; A.qa.pointerAt(s.x+ox,s.y+oy); await new Promise(r=>setTimeout(r,120));
      res.push({ox,oy,target:A.state().target,hud:A.qa.hudText().target});
    }
    return {dist,res};
  };
  return [await scan(0.45), await scan(0.5), await scan(0.6)];
});
// mobile cursor after real pointer move
await page.evaluate(()=>{const A=window.__APP__;A.qa.setView('third');A.qa.setSurround(true);});
await page.setViewport({width:390,height:844,deviceScaleFactor:1});
await sleep(800);
await page.mouse.move(195,422);
await sleep(600);
out.mobile = await page.evaluate(()=>{
  const A=window.__APP__;
  const r=A.qa.hudRects();
  const els=Array.from(document.querySelectorAll('#hud > *')).map(e=>{const b=e.getBoundingClientRect(); return {cls:e.className,id:e.id,x:+b.x.toFixed(0),y:+b.y.toFixed(0),w:+b.width.toFixed(0),h:+b.height.toFixed(0)};});
  const overflow=els.filter(e=>e.w>0&&e.h>0&&(e.x<-1||e.y<-1||e.x+e.w>innerWidth+1||e.y+e.h>innerHeight+1));
  return {vw:innerWidth,vh:innerHeight,rects:r,els,overflow};
});
await page.screenshot({path:'qa/functional/shots/probe-mobile2.png'});
await page.setViewport({width:1440,height:900,deviceScaleFactor:1});
await sleep(600);
// bedroom extra attempts with boost/angles
out.bedroom2=[];
for (const start of [[-0.5,2.80,Math.PI/2],[-0.5,2.86,Math.PI/2],[-0.6,2.75,Math.PI/2],[-0.5,2.9,Math.PI/2],[-1.0,3.0,Math.PI/2],[-0.5,2.82,Math.PI/2]]) {
  await page.evaluate((s)=>{const A=window.__APP__;A.qa.reset();A.qa.setView('third');A.qa.teleport(s[0],s[1],s[2]);},start);
  await sleep(250);
  await page.keyboard.down('Shift'); await page.keyboard.down('KeyW'); await sleep(1800); await page.keyboard.up('KeyW'); await page.keyboard.up('Shift'); await sleep(300);
  const st=await page.evaluate(()=>window.__APP__.state());
  out.bedroom2.push({start,room:st.room,pos:st.robot.pos.map(v=>+v.toFixed(2))});
}
// what is blocking? sample objects near doorway
out.doorArea = await page.evaluate(()=>{
  const A=window.__APP__;
  return A.qa.objects().filter(o=>o.static&&Math.abs(o.pos[0]+1.2)<1.2&&o.pos[2]>2.2&&o.pos[2]<3.8).map(o=>({name:o.name,pos:o.pos.map(v=>+v.toFixed(2))}));
});
console.log(JSON.stringify({out,logs},null,1));
await browser.close(); srv.kill();
