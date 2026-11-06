import puppeteer from 'puppeteer-core';
import { writeFileSync } from 'node:fs';
const browser = await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless:true, args:['--no-sandbox','--use-gl=angle','--use-angle=metal','--enable-gpu','--hide-scrollbars'], defaultViewport:{width:1440,height:900}});
const results=[];
async function audit(vp, label){
  const page = await browser.newPage();
  await page.setViewport(vp);
  await page.goto('http://127.0.0.1:4182/', {waitUntil:'networkidle0'});
  await page.waitForFunction('window.__APP__ && window.__APP__.ready===true');
  await new Promise(r=>setTimeout(r,1800));
  const out = await page.evaluate(()=>{
    const ids=['hud-room-name','hud-needle','hud-map','hud-surround-tag','hud-cross','hud-target','hud-held','hud-hint','hud-toast','hud-fps'];
    const els={};
    for(const id of ids){ const e=document.getElementById(id); if(!e) continue; const r=e.getBoundingClientRect(); const cs=getComputedStyle(e); els[id]={x:+r.x.toFixed(1),y:+r.y.toFixed(1),w:+r.width.toFixed(1),h:+r.height.toFixed(1),hidden:e.hidden||cs.display==='none'||cs.opacity==='0',fs:cs.fontSize,color:cs.color,ls:cs.letterSpacing}; }
    // panels
    const panels=[...document.querySelectorAll('.hud-cam')].map(e=>{const r=e.getBoundingClientRect(); return {k:e.dataset.cam,x:+r.x.toFixed(1),y:+r.y.toFixed(1),w:+r.width.toFixed(1),h:+r.height.toFixed(1)};});
    const sub=document.querySelector('.hud-sub'); const rs=sub?sub.getBoundingClientRect():null;
    return {els,panels,sub:rs?{x:rs.x,y:rs.y,w:rs.width,h:rs.height,fs:getComputedStyle(sub).fontSize}:null, vw:innerWidth, vh:innerHeight, scrollW:document.documentElement.scrollWidth};
  });
  // overlaps
  const boxes = Object.entries(out.els).filter(([k,v])=>!v.hidden).map(([k,v])=>({k,...v}));
  const overlaps=[];
  for(let i=0;i<boxes.length;i++) for(let j=i+1;j<boxes.length;j++){
    const a=boxes[i],b=boxes[j];
    const ox=Math.max(0,Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x));
    const oy=Math.max(0,Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y));
    if(ox>0&&oy>0) overlaps.push([a.k,b.k,+ox.toFixed(1),+oy.toFixed(1)]);
  }
  for(const p of out.panels) for(const b of boxes){ const ox=Math.max(0,Math.min(p.x+p.w,b.x+b.w)-Math.max(p.x,b.x)); const oy=Math.max(0,Math.min(p.y+p.h,b.y+b.h)-Math.max(p.y,b.y)); if(ox>0&&oy>0) overlaps.push([`panel:${p.k}`,b.k,+ox.toFixed(1),+oy.toFixed(1)]); }
  // offscreen
  const off = boxes.filter(b=>b.x<0||b.y<0||b.x+b.w>out.vw+0.5||b.y+b.h>out.vh+0.5).map(b=>b.k);
  results.push({label, els:out.els, panels:out.panels, sub:out.sub, vw:out.vw, vh:out.vh, scrollW:out.scrollW, overlaps, offscreen:off});
  await page.close();
}
await audit({width:1440,height:900,deviceScaleFactor:1}, 'DESKTOP');
await audit({width:390,height:844,deviceScaleFactor:2}, 'MOBILE');
await audit({width:1920,height:1080,deviceScaleFactor:1}, 'WIDE');
writeFileSync('qa/visual/hud-audit.json', JSON.stringify(results,null,1));
await browser.close();
