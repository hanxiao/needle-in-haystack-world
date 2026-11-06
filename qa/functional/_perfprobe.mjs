import puppeteer from 'puppeteer-core';
import { spawn } from 'node:child_process';
import os from 'node:os';
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
const PORT=4199;
const srv = spawn(process.execPath, ['tools/serve.mjs'], {cwd: process.cwd(), env:{...process.env, PORT:String(PORT)}, stdio:'ignore'});
const t0=Date.now();
for(;;){ try { const r=await fetch(`http://127.0.0.1:${PORT}/`); if(r.ok) break; } catch{} if(Date.now()-t0>10000) throw new Error('server timeout'); await sleep(100); }
const browser = await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=metal','--enable-gpu','--window-size=1440,900'],defaultViewport:{width:1440,height:900}});
const page = await browser.newPage();
await page.goto(`http://127.0.0.1:${PORT}/`, {waitUntil:'domcontentloaded'});
await page.waitForFunction('window.__APP__ && window.__APP__.ready===true',{timeout:60000});
await sleep(2500);
const loadStart=os.loadavg();
await page.evaluate(()=>{ window.__perf={buckets:[],frames:0,last:performance.now(),t0:performance.now()}; const loop=(t)=>{const p=window.__perf;p.frames++; if(t-p.last>=1000){p.buckets.push(+((p.frames*1000)/(t-p.last)).toFixed(1));p.frames=0;p.last=t;} if(t-p.t0<10000) requestAnimationFrame(loop);}; requestAnimationFrame(loop); });
await sleep(10800);
const perf=await page.evaluate(()=>({buckets:window.__perf.buckets, calls:window.__APP__.qa.drawCalls().calls, tris:window.__APP__.qa.drawCalls().triangles, fps:window.__APP__.fps}));
console.log(JSON.stringify({loadStart, loadEnd:os.loadavg(), cpus:os.cpus().length, perf}));
await browser.close(); srv.kill();
