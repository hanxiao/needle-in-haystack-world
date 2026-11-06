import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless:true, args:['--no-sandbox','--use-gl=angle','--use-angle=metal','--enable-gpu','--window-size=1440,900'], defaultViewport:{width:1440,height:900}});
const page = await browser.newPage();
const logs=[]; page.on('console',m=>logs.push(`[${m.type()}] ${m.text()}`)); page.on('pageerror',e=>logs.push(`[err] ${e.message}`));
await page.goto('http://127.0.0.1:4173/', {waitUntil:'networkidle0'});
await page.waitForFunction('window.__APP__ && window.__APP__.ready===true', {timeout:60000});
await new Promise(r=>setTimeout(r,1200));
const out = await page.evaluate(async()=>{
  const A=window.__APP__;
  const res={};
  for (const dist of [0.35,0.45,0.55,0.65]) {
    A.qa.reset(); await new Promise(r=>setTimeout(r,300));
    const near=A.qa.teleportNear('mug_white',dist);
    await new Promise(r=>setTimeout(r,800));
    const rs=A.robot.getState();
    const mug=A.qa.object('mug_white');
    const grab=A.qa.grabByName('mug_white');
    await new Promise(r=>setTimeout(r,300));
    res[dist]={near, robot:rs, mug, grab, held:A.state().robot.held, hud:A.qa.hudText()};
    if (A.state().robot.held) A.qa.release();
    await new Promise(r=>setTimeout(r,400));
  }
  return res;
});
console.log(JSON.stringify(out,null,2));
console.log('LOGS', logs);
await browser.close();
