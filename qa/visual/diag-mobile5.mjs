import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless:true, args:['--no-sandbox','--use-gl=angle','--use-angle=metal','--enable-gpu','--hide-scrollbars']});
async function one(name, vp){
  const page = await browser.newPage();
  await page.bringToFront();
  await page.setViewport(vp);
  await page.goto('http://127.0.0.1:4182/', {waitUntil:'networkidle0'});
  await page.waitForFunction('window.__APP__ && window.__APP__.ready===true');
  await new Promise(r=>setTimeout(r,2000));
  await page.evaluate(()=>{ const A=window.__APP__; A.qa.setSurround(false); A.qa.teleport(1.6,-0.6,0); A.qa.setCamera(0,0.34,1.75); });
  await new Promise(r=>setTimeout(r,900));
  await page.screenshot({path:`qa/visual/shots/diag-m5-${name}.png`});
  console.log(name, JSON.stringify(await page.evaluate(()=>({cam:window.__APP__.qa.cameraInfo(), robot:window.__APP__.state().robot.pos}))));
  await page.close();
}
await one('desk',{width:1440,height:900,deviceScaleFactor:1});
await one('mob',{width:390,height:844,deviceScaleFactor:2});
await browser.close();
