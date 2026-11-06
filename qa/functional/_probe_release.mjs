import puppeteer from 'puppeteer-core';
import { spawn } from 'node:child_process';
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
const PORT=4199;
const srv=spawn(process.execPath,['tools/serve.mjs','qa/frozen'],{cwd:process.cwd(),env:{...process.env,PORT:String(PORT)},stdio:'ignore'});
const t0=Date.now(); for(;;){try{const r=await fetch(`http://127.0.0.1:${PORT}/`);if(r.ok)break;}catch{} if(Date.now()-t0>10000)throw new Error('timeout'); await sleep(100);}
const browser=await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,protocolTimeout:180000,args:['--no-sandbox','--use-gl=angle','--use-angle=metal','--enable-gpu','--window-size=1440,900'],defaultViewport:{width:1440,height:900}});
const page=await browser.newPage();
await page.goto(`http://127.0.0.1:${PORT}/`,{waitUntil:'domcontentloaded'});
await page.waitForFunction('window.__APP__ && window.__APP__.ready===true',{timeout:90000});
await sleep(1800);
const out=await page.evaluate(async()=>{
  const A=window.__APP__; const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
  A.qa.reset(); A.qa.setView('third'); A.qa.teleportNear('mug_white',0.33); await sleep(600);
  const g=A.qa.grabByName('mug_white'); await sleep(600);
  const held=A.qa.object('mug_white').pos;
  A.qa.release();
  const samples=[];
  for (let i=0;i<10;i++){ await sleep(500); const p=A.qa.object('mug_white').pos; samples.push({t:(i+1)*0.5,pos:p.map(v=>+v.toFixed(3))}); }
  return {g,held,samples};
});
console.log(JSON.stringify(out,null,1));
await browser.close(); srv.kill();
