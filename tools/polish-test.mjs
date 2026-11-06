import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless:true, args:['--no-sandbox','--use-gl=angle','--use-angle=metal','--enable-gpu','--window-size=1440,900'], defaultViewport:{width:1440,height:900}});
const page = await browser.newPage();
const logs=[]; page.on('console',m=>logs.push(`[${m.type()}] ${m.text()}`)); page.on('pageerror',e=>logs.push(`[err] ${e.message}`));
await page.goto('http://127.0.0.1:4173/', {waitUntil:'networkidle0'});
await page.waitForFunction('window.__APP__ && window.__APP__.ready===true', {timeout:60000});
await new Promise(r=>setTimeout(r,1200));
// night window view (reviewer angle)
await page.evaluate(()=>{ const A=window.__APP__; A.qa.teleport(-2.4,-0.9,0.0); A.qa.setCamera(0.0,0.15,1.4); A.qa.setNight(true); });
await new Promise(r=>setTimeout(r,900));
await page.screenshot({path:'qa/shots/polish-night.png'});
const night = await page.evaluate(()=>({mean:window.__APP__.qa.sampleMain({x:200,y:150,w:1000,h:600}), state:window.__APP__.state()}));
await page.evaluate(()=>window.__APP__.qa.setNight(false));
// room means
const means = await page.evaluate(async()=>{
  const A=window.__APP__; const rooms={bathroom:[1.7,2.0,3.14],study:[4.0,1.8,3.14],bedroom:[-3.2,2.0,3.14],living:[-3.0,-1.0,0]}; const r={};
  for (const [k,[x,z,yaw]] of Object.entries(rooms)) { A.qa.teleport(x,z,yaw); A.qa.setCamera(yaw,0.4,1.8); await new Promise(r=>setTimeout(r,700)); r[k]=A.qa.sampleMain({x:200,y:150,w:1000,h:600}); }
  return r;
});
// bed camera clip check: put robot near bed, camera toward bed
await page.evaluate(()=>{ const A=window.__APP__; A.qa.teleport(-3.1,1.5,2.4); A.qa.setCamera(2.4,0.4,2.0); });
await new Promise(r=>setTimeout(r,900));
await page.screenshot({path:'qa/shots/polish-bedcam.png'});
const cam = await page.evaluate(()=>({cam:window.__APP__.qa.cameraInfo(), state:window.__APP__.state()}));
console.log(JSON.stringify({night,means,cam,logs},null,2));
await browser.close();
