import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless:true, args:['--no-sandbox','--use-gl=angle','--use-angle=metal','--enable-gpu','--window-size=1440,900'], defaultViewport:{width:1440,height:900}});
const page = await browser.newPage();
await page.goto('http://127.0.0.1:4173/', {waitUntil:'networkidle0'});
await page.waitForFunction('window.__APP__ && window.__APP__.ready===true', {timeout:60000});
await new Promise(r=>setTimeout(r,1200));
for (const [name,dist] of [['laptop',0.8],['mug_white',0.35],['sofa',1.0],['chair_1',1.0]]) {
  const out = await page.evaluate(async ({name,dist})=>{
    const A=window.__APP__;
    A.qa.teleportNear(name,dist); await new Promise(r=>setTimeout(r,700));
    A.qa.aimAt(name); await new Promise(r=>setTimeout(r,700));
    return {name, target:A.state().target, ray:A.qa.raycast(), hud:A.qa.hudText(), robot:A.state().robot, cam:A.qa.cameraInfo()};
  },{name,dist});
  console.log(JSON.stringify(out));
}
await browser.close();
