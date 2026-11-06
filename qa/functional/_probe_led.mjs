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
await sleep(1500);
const out=await page.evaluate(async()=>{
  const A=window.__APP__; const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
  const read=()=>A.robot.model.ledMaterial.emissive.getHex();
  const res={};
  for (const [name,dist] of [['trash_bin',0.45],['chair_1',0.5],['sofa',0.5]]) {
    A.qa.reset(); A.qa.setView('third'); A.qa.teleportNear(name,dist); await sleep(700);
    A.qa.hold('KeyW');
    const seq=[];
    for (let i=0;i<16;i++){ await sleep(100); seq.push(read().toString(16)); }
    A.qa.releaseKey('KeyW'); await sleep(300);
    res[name]=seq;
  }
  return res;
});
console.log(JSON.stringify(out,null,1));
await browser.close(); srv.kill();
