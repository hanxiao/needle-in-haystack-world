import puppeteer from 'puppeteer-core';
import { spawn } from 'node:child_process';
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
const PORT=4199;
const srv=spawn(process.execPath,['tools/serve.mjs','qa/frozen'],{cwd:process.cwd(),env:{...process.env,PORT:String(PORT)},stdio:'ignore'});
const t0=Date.now(); for(;;){try{const r=await fetch(`http://127.0.0.1:${PORT}/`);if(r.ok)break;}catch{} if(Date.now()-t0>10000)throw new Error('timeout'); await sleep(100);}
const browser=await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,protocolTimeout:180000,args:['--no-sandbox','--use-gl=angle','--use-angle=metal','--enable-gpu','--window-size=1440,900'],defaultViewport:{width:1440,height:900}});
const page=await browser.newPage();
const logs=[]; page.on('console',m=>logs.push(`[${m.type()}] ${m.text()}`)); page.on('pageerror',e=>logs.push(`[pageerror] ${e.message}`));
const tLoad=Date.now();
await page.goto(`http://127.0.0.1:${PORT}/`,{waitUntil:'domcontentloaded'});
await page.waitForFunction('window.__APP__ && window.__APP__.ready===true',{timeout:90000});
const loadMs=Date.now()-tLoad;
const warm = await page.evaluate(async()=>{ let f=0; const t0=performance.now(); await new Promise(res=>{const loop=(t)=>{f++; if(t-t0<2000) requestAnimationFrame(loop); else res();}; requestAnimationFrame(loop);}); const s=(performance.now()-t0)/1000; return {fps:f/s,frames:f}; });
await sleep(1200);
await page.evaluate(()=>{
  window.__QA={
    sleep:(ms)=>new Promise(r=>setTimeout(r,ms)),
    project(name){const A=window.__APP__; try{const s=A.qa.screenOf(name); if(s&&Number.isFinite(s.x))return s;}catch{} return null;},
    async closeSpot(name,opts={}){
      const A=window.__APP__; const o=A.qa.object(name); if(!o)return null;
      const radii=opts.radii||[0.28,0.30,0.26,0.32]; const samples=12;
      A.qa.reset(); A.qa.setView('third'); await this.sleep(250);
      for(const r of radii){for(let i=0;i<samples;i++){const a=i/samples*Math.PI*2;const x=o.pos[0]+Math.cos(a)*r,z=o.pos[2]+Math.sin(a)*r;
        if(x<-5.3||x>5.3||z<-3.5||z>3.5)continue;
        A.qa.teleport(x,z,Math.atan2(-(o.pos[0]-x),-(o.pos[2]-z))); await this.sleep(330);
        const st=A.state(); if(Math.hypot(st.robot.pos[0]-x,st.robot.pos[2]-z)>0.07)continue;
        if(!A.robot.canReach({x:o.pos[0],y:o.pos[1],z:o.pos[2]}))continue;
        const s=this.project(name); if(!s)continue;
        for(const [ox,oy] of [[0,0],[-25,0],[25,0],[0,-25],[0,25],[-25,-20],[25,-20]]){ A.qa.pointerAt(s.x+ox,s.y+oy); await this.sleep(80); if(A.state().target===name) return {found:true,robot:st.robot.pos,obj:o.pos,screen:{x:s.x+ox,y:s.y+oy}}; }
      }}
      return {found:false};
    },
  };
});
const out={loadMs,warm};
// G10 aim-responsive carry
out.g10 = await page.evaluate(async()=>{
  const A=window.__APP__; const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
  A.qa.reset(); A.qa.setView('third'); A.qa.teleportNear('mug_white',0.33); await sleep(550);
  const g=A.qa.grabByName('mug_white'); await sleep(600);
  const rp=A.state().robot.pos; const yaw=A.state().robot.yaw; const fx=-Math.sin(yaw), fz=-Math.cos(yaw);
  A.qa.aimAtPoint([rp[0]+fx*0.5, rp[1]+1.1, rp[2]+fz*0.5]); await sleep(700);
  const high=A.qa.object('mug_white').pos[1];
  A.qa.aimAtPoint([rp[0]+fx*0.5, rp[1]+0.05, rp[2]+fz*0.5]); await sleep(700);
  const low=A.qa.object('mug_white').pos[1];
  A.qa.release();
  return {g,high,low,delta:+(high-low).toFixed(3)};
});
// H15 touch
out.touch = await page.evaluate(async()=>{
  const A=window.__APP__; const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
  A.qa.reset(); A.qa.setView('third'); A.qa.setTouch(true); A.qa.teleport(-3.6,-1.2,0); A.qa.setCamera(0,0.34,1.75); await sleep(500);
  const hint=A.qa.hudText().hint; const touchOn=document.querySelector('#hud-touch')?.classList.contains('is-on');
  const p0=A.state().robot.pos;
  A.qa.touchJoy(0,1); await sleep(2000);
  const st=A.state(); const stick={active:document.querySelector('#hud-stick')?.classList.contains('is-active'),knob:document.querySelector('#hud-stick-knob')?.style.transform};
  A.qa.touchRelease(); await sleep(400); const p1=A.state().robot.pos; await sleep(500); const p2=A.state().robot.pos;
  const cam0=A.qa.cameraInfo(); A.qa.touchLook(140,30); await sleep(500); const cam1=A.qa.cameraInfo();
  const tap=await window.__QA.closeSpot('mug_white',{radii:[0.28,0.30,0.26]});
  let held=null,after=null;
  if(tap.found){ A.qa.touchTap(); await sleep(500); held=A.state().robot.held; A.qa.touchTap(); await sleep(400); after=A.state().robot.held; }
  A.qa.setTouch(false);
  return {hint,touchOn,moved:+Math.hypot(st.robot.pos[0]-p0[0],st.robot.pos[2]-p0[2]).toFixed(3),stick,stopDrift:+Math.hypot(p2[0]-p1[0],p2[2]-p1[2]).toFixed(3),camMoved:+Math.hypot(cam1.pos[0]-cam0.pos[0],cam1.pos[1]-cam0.pos[1],cam1.pos[2]-cam0.pos[2]).toFixed(3),tapFound:tap.found,held,after};
});
// H18 camera tight spots
out.cam = [];
for (const sp of [
  {name:'sofa',pose:[-2.5,-2.1,Math.PI],cam:[Math.PI,0.34,1.75]},
  {name:'bed',pose:[-3.4,2.1,Math.PI],cam:[Math.PI,0.34,1.75]},
  {name:'hall',pose:[-0.4,1.1,0],cam:[Math.PI,0.34,1.75]},
]) {
  const r = await page.evaluate(async(s)=>{
    const A=window.__APP__; const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
    A.qa.reset(); A.qa.setView('third'); A.qa.teleport(s.pose[0],s.pose[1],s.pose[2]); A.qa.setCamera(s.cam[0],s.cam[1],s.cam[2]); await sleep(900);
    const c=A.qa.cameraInfo(); const rp=A.state().robot.pos; const main=A.qa.sampleMain({x:560,y:320,w:320,h:260});
    return {name:s.name,pos:c.pos.map(v=>+v.toFixed(2)),dist:+Math.hypot(c.pos[0]-rp[0],c.pos[1]-rp[1],c.pos[2]-rp[2]).toFixed(2),main};
  },sp);
  out.cam.push(r);
}
// H17 legend + H16 rows
out.hud = await page.evaluate(()=>{
  const rows=[...document.querySelectorAll('#hud-controls .hud-row')].map(row=>({keys:[...row.querySelectorAll('kbd[data-key]')].map(k=>k.dataset.key),act:(row.querySelector('.hud-act')||{}).textContent||''}));
  const r=window.__APP__.qa.hudRects(); const el=document.querySelector('#hud-map-trail'); const b=el?el.getBoundingClientRect():null;
  return {rows, rowCount:rows.length, legend:{exists:!!el,box:b?{x:+b.x.toFixed(0),y:+b.y.toFixed(0),w:+b.width.toFixed(0),h:+b.height.toFixed(0)}:null,text:el?el.textContent.trim():null,hidden:el?el.classList.contains('is-hidden'):null},map:r.map};
});
console.log(JSON.stringify({out,logs},null,1));
await browser.close(); srv.kill();
