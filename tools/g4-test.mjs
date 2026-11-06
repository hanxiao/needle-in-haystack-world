import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless:true, args:['--no-sandbox','--use-gl=angle','--use-angle=metal','--enable-gpu','--window-size=1440,900'], defaultViewport:{width:1440,height:900}});
const page = await browser.newPage();
await page.goto('http://127.0.0.1:4173/', {waitUntil:'networkidle0'});
await page.waitForFunction('window.__APP__ && window.__APP__.ready===true', {timeout:60000});
await new Promise(r=>setTimeout(r,1200));
const out = await page.evaluate(async()=>{
  const A=window.__APP__; A.qa.reset(); await new Promise(r=>setTimeout(r,300));
  A.qa.teleportNear('mug_white',0.33); await new Promise(r=>setTimeout(r,550));
  const g=A.qa.grabByName('mug_white'); await new Promise(r=>setTimeout(r,600));
  A.qa.teleport(-3.6,-1.2,0); await new Promise(r=>setTimeout(r,400));
  const carry=A.qa.object('mug_white').pos;
  A.qa.release();
  await new Promise(r=>setTimeout(r,2500)); const a=A.qa.object('mug_white').pos;
  await new Promise(r=>setTimeout(r,1000)); const b=A.qa.object('mug_white').pos;
  return {grab:g, carry, a, b, drop:+(carry[1]-a[1]).toFixed(3), yDrift:+(b[1]-a[1]).toFixed(4), roll:+Math.hypot(b[0]-a[0],b[2]-a[2]).toFixed(4)};
});
console.log(JSON.stringify(out,null,2));
await browser.close();
