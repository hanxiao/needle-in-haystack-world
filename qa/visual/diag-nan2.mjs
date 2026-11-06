import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless:true, args:['--no-sandbox','--use-gl=angle','--use-angle=metal','--enable-gpu','--window-size=1440,900'], defaultViewport:{width:1440,height:900}});
const page = await browser.newPage();
page.on('console',m=>{ if(m.type()!=='debug') console.log('LOG',m.type(),m.text()); });
page.on('pageerror',e=>console.log('PAGEERR',e.message));
await page.goto('http://127.0.0.1:4182/', {waitUntil:'networkidle0'});
await page.waitForFunction('window.__APP__ && window.__APP__.ready===true');
await new Promise(r=>setTimeout(r,2000));
// check castRay distance validity
const cr = await page.evaluate(()=>{
  const p=window.__APP__.physics;
  const h=p.castRay([-3.4,1.0,0.4],[0,-1,0],5,null,{staticOnly:true});
  return h? {dist:h.distance, point:h.point.toArray(), normal:h.normal.toArray()} : null;
});
console.log('castRay down:', JSON.stringify(cr));
// reproduce capture sequence: FP -> reset -> night -> pose kitchen
await page.evaluate(()=>{ const A=window.__APP__; A.qa.teleport(-0.45,2.35,0); A.qa.look(0,-0.06); });
await new Promise(r=>setTimeout(r,600));
await page.evaluate(()=>window.__APP__.qa.reset());
await new Promise(r=>setTimeout(r,900));
await page.evaluate(()=>window.__APP__.qa.setNight(true));
await new Promise(r=>setTimeout(r,1200));
const a = await page.evaluate(()=>window.__APP__.qa.cameraInfo());
console.log('after reset+night:', JSON.stringify(a.pos));
await page.evaluate(()=>{ const A=window.__APP__; A.qa.teleport(1.2,-1.2,-0.708); A.qa.setView('third'); A.qa.setCamera(-0.708,0.15,1.35); });
await new Promise(r=>setTimeout(r,700));
const b = await page.evaluate(()=>window.__APP__.qa.cameraInfo());
console.log('after pose:', JSON.stringify(b.pos));
// monkeypatch castRay and log
const logs = await page.evaluate(()=>{
  const A=window.__APP__; const orig=A.physics.castRay.bind(A.physics); const out=[];
  A.physics.castRay=(o,d,m,ex,op)=>{ const r=orig(o,d,m,ex,op); out.push({m, r: r?{dist:r.distance, nan:!Number.isFinite(r.distance)}:null}); return r; };
  return out;
});
await page.evaluate(()=>{ const A=window.__APP__; A.qa.teleport(1.2,-1.2,-0.708); A.qa.setCamera(-0.708,0.15,1.35); });
await new Promise(r=>setTimeout(r,500));
const c = await page.evaluate(()=>window.__APP__.qa.cameraInfo());
console.log('after re-pose:', JSON.stringify(c.pos));
const rayLog = await page.evaluate(()=>{ const A=window.__APP__; return A.physics.__log || null; });
console.log('rayLog', JSON.stringify(rayLog));
await browser.close();
