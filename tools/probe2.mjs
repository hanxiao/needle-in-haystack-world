import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless:true, args:['--no-sandbox','--use-gl=angle','--use-angle=metal','--enable-gpu','--window-size=1440,900'], defaultViewport:{width:1440,height:900}});
const page = await browser.newPage();
const logs=[]; page.on('console',m=>logs.push(`[${m.type()}] ${m.text()}`)); page.on('pageerror',e=>logs.push(`[err] ${e.message}`));
await page.goto('http://127.0.0.1:5173/', {waitUntil:'networkidle0'});
await page.waitForFunction('window.__APP__ && window.__APP__.ready===true', {timeout:60000});
await new Promise(r=>setTimeout(r,1500));
const out = await page.evaluate(() => {
  const A = window.__APP__;
  const rc = {};
  for (const [k,c] of Object.entries(A.robot.cameras)) { const p = c.getWorldPosition(new c.position.constructor()); rc[k]={pos:p.toArray().map(v=>+v.toFixed(2)), rot:[c.rotation.x,c.rotation.y,c.rotation.z].map(v=>+v.toFixed(2)), fov:c.fov}; }
  return { state:A.state(), cameraWorld:rc, rooms:A.world.rooms.map(r=>({label:r.label,center:r.center,bounds:r.bounds})), hudRects:A.qa.hudRects() };
});
console.log(JSON.stringify(out,null,2));
const grab = await page.evaluate(async () => {
  const A = window.__APP__;
  try {
    const t = A.qa.teleportNear('mug_white', 0.35);
    await new Promise(r=>setTimeout(r,800));
    const before = A.state();
    const r = A.qa.grabByName('mug_white');
    await new Promise(r=>setTimeout(r,500));
    return { teleport:t, before, result:r, after:A.state(), hud:A.qa.hudText(), robotState:A.robot.getState() };
  } catch(e) { return { error:String(e && e.stack || e) }; }
});
console.log('GRAB', JSON.stringify(grab,null,2));
console.log('LOGS', JSON.stringify(logs.slice(0,20),null,2));
await page.screenshot({path:'qa/shots/probe2-grab.png'});
await browser.close();
