import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless:true, args:['--no-sandbox','--use-gl=angle','--use-angle=metal','--enable-gpu','--window-size=1440,900'], defaultViewport:{width:1440,height:900}});
const page = await browser.newPage();
await page.goto('http://127.0.0.1:4173/', {waitUntil:'networkidle0'});
await page.waitForFunction('window.__APP__ && window.__APP__.ready===true', {timeout:60000});
await new Promise(r=>setTimeout(r,1200));
const out=await page.evaluate(async()=>{
  const A=window.__APP__; A.qa.reset(); await new Promise(r=>setTimeout(r,300));
  A.qa.teleport(-2.5,-1.0,0); await new Promise(r=>setTimeout(r,500));
  A.qa.hold('KeyW'); await new Promise(r=>setTimeout(r,1500)); A.qa.releaseKey('KeyW'); await new Promise(r=>setTimeout(r,500));
  const rp=A.state().robot.pos;
  const probes=[[rp[0],rp[1]+1.2,rp[2]+0.8],[rp[0],rp[1]+1.4,rp[2]+0.9],[rp[0],rp[1]+0.7,rp[2]+1.3],[rp[0],rp[1]+1.2,rp[2]+1.5]];
  const res={robot:rp, cam:A.qa.cameraDebug(), probes:[]};
  for(const p of probes){ res.probes.push({p, blocked:A.qa.cameraProbe(p[0],p[1],p[2]), camBlocked:A.qa.cameraProbe(...A.qa.cameraDebug().state.pos)}); }
  return res;
});
console.log(JSON.stringify(out,null,2));
await browser.close();
