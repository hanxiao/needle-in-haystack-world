import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless:true, args:['--no-sandbox','--use-gl=angle','--use-angle=metal','--enable-gpu','--window-size=1440,900'], defaultViewport:{width:1440,height:900}});
const page = await browser.newPage();
await page.goto('http://127.0.0.1:4173/', {waitUntil:'networkidle0'});
await page.waitForFunction('window.__APP__ && window.__APP__.ready===true', {timeout:60000});
await new Promise(r=>setTimeout(r,1200));
const out = await page.evaluate(async()=>{
  const A=window.__APP__; const res={};
  A.qa.reset(); await new Promise(r=>setTimeout(r,300));
  A.qa.teleport(-2.5,-1.0,0); await new Promise(r=>setTimeout(r,600));
  res.before=A.qa.cameraDebug();
  A.qa.hold('KeyW'); await new Promise(r=>setTimeout(r,1800)); A.qa.releaseKey('KeyW'); await new Promise(r=>setTimeout(r,500));
  res.after=A.qa.cameraDebug(); res.robot=A.state().robot.pos; res.cam=A.qa.cameraInfo();
  return res;
});
console.log(JSON.stringify(out,null,2));
await browser.close();
