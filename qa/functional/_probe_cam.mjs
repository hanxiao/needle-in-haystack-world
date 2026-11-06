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
const cases=[
  {name:'teleportNear-sofa', fn:async()=>{const A=window.__APP__;A.qa.reset();A.qa.setView('third');return A.qa.teleportNear('sofa',0.5);}},
  {name:'teleportNear-bed', fn:async()=>{const A=window.__APP__;A.qa.reset();A.qa.setView('third');return A.qa.teleportNear('bed',0.5);}},
  {name:'backed-south-wall', fn:async()=>{const A=window.__APP__;A.qa.reset();A.qa.setView('third');A.qa.teleport(-2.5,-3.3,Math.PI);A.qa.setCamera(Math.PI,0.34,1.75);return {pos:[-2.5,0,-3.3]};}},
  {name:'backed-west-wall-bedroom', fn:async()=>{const A=window.__APP__;A.qa.reset();A.qa.setView('third');A.qa.teleport(-5.1,2.4,-Math.PI/2);A.qa.setCamera(-Math.PI/2,0.34,1.75);return {pos:[-5.1,0,2.4]};}},
];
const out={cases:[]};
for(const c of cases){
  const r=await page.evaluate(async(fnStr)=>{
    const fn=eval('('+fnStr+')');
    const near=await fn();
    await new Promise(r=>setTimeout(r,1100));
    const A=window.__APP__;
    const cam=A.qa.cameraInfo(); const st=A.state();
    const main=A.qa.sampleMain({x:520,y:280,w:400,h:340});
    const ray=A.qa.raycast();
    return {near,cam:cam.pos,robot:st.robot.pos,room:st.room,main,ray,target:st.target};
  }, c.fn.toString());
  out.cases.push({name:c.name,...r});
}
await page.evaluate(()=>{const A=window.__APP__;A.qa.reset();A.qa.setView('third');A.qa.teleportNear('sofa',0.5);});
await sleep(1200);
await page.screenshot({path:'qa/functional/shots/probe-camera-outside.png'});
console.log(JSON.stringify(out,null,1));
await browser.close(); srv.kill();
