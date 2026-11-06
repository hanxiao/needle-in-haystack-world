import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless:true, args:['--no-sandbox','--use-gl=angle','--use-angle=metal','--enable-gpu','--window-size=1440,900'], defaultViewport:{width:1440,height:900}});
const page = await browser.newPage();
const logs=[]; page.on('console',m=>logs.push(`[${m.type()}] ${m.text()}`)); page.on('pageerror',e=>logs.push(`[err] ${e.message}`));
await page.goto('http://127.0.0.1:5173/', {waitUntil:'networkidle0'});
await page.waitForFunction('window.__APP__ && window.__APP__.ready===true', {timeout:60000});
await new Promise(r=>setTimeout(r,2000));
const out = await page.evaluate(() => {
  const A = window.__APP__;
  const s = A.state();
  const rc = {};
  for (const [k,c] of Object.entries(A.robot.cameras)) { const p = c.getWorldPosition(new c.position.constructor()); rc[k]=p.toArray().map(v=>+v.toFixed(2)); }
  return { state:s, cameraWorld:rc, rooms:A.world.rooms.map(r=>r.label), objectCount:A.physics.objects.length, dynamic:A.physics.dynamicObjects.length,
    sofa:A.qa.object('sofa'), mug:A.qa.object('mug_white'), needle:A.qa.object('needle'), rects:A.qa.hudRects(), hudText:A.qa.hudText(),
    sampleMain:A.qa.sampleMain({x:700,y:400,w:80,h:80}), sampleMap:A.qa.sampleHud(A.qa.hudRects().map) };
});
console.log(JSON.stringify(out,null,2));
console.log('LOGS', JSON.stringify(logs.slice(0,20),null,2));
// movement test
const before = await page.evaluate(()=>window.__APP__.state().robot.pos);
await page.keyboard.down('KeyW'); await new Promise(r=>setTimeout(r,900)); await page.keyboard.up('KeyW');
await new Promise(r=>setTimeout(r,300));
const after = await page.evaluate(()=>window.__APP__.state().robot.pos);
console.log('MOVE', JSON.stringify({before,after}));
await page.screenshot({path:'qa/shots/probe-moved.png'});
// grab test
const grab = await page.evaluate(async () => {
  const A = window.__APP__;
  A.qa.teleportNear('mug_white', 0.35);
  await new Promise(r=>setTimeout(r,600));
  const r = A.qa.grabByName('mug_white');
  await new Promise(r=>setTimeout(r,400));
  return { result:r, state:A.state(), hud:A.qa.hudText() };
});
console.log('GRAB', JSON.stringify(grab,null,2));
await page.screenshot({path:'qa/shots/probe-grab.png'});
await browser.close();
