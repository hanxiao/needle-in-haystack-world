import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless:true, args:['--no-sandbox','--use-gl=angle','--use-angle=metal','--enable-gpu','--window-size=1440,900'], defaultViewport:{width:1440,height:900}});
const page = await browser.newPage();
const logs=[]; page.on('console',m=>logs.push(`[${m.type()}] ${m.text()}`)); page.on('pageerror',e=>logs.push(`[err] ${e.message}`));
await page.goto('http://127.0.0.1:4173/', {waitUntil:'networkidle0'});
await page.waitForFunction('window.__APP__ && window.__APP__.ready===true', {timeout:60000});
await new Promise(r=>setTimeout(r,1500));
await page.screenshot({path:'qa/shots/r2-spawn.png'});
const out = await page.evaluate(async()=>{
  const A=window.__APP__; const res={};
  // teleportNear no-penetration test
  for (const name of ['sofa','bed','wardrobe','mug_white','chair_1']) {
    A.qa.reset(); await new Promise(r=>setTimeout(r,300));
    const before=A.qa.object(name);
    const near=A.qa.teleportNear(name,0.8);
    await new Promise(r=>setTimeout(r,700));
    const after=A.qa.object(name);
    res['near_'+name]={near, moved:+Math.hypot(after.pos[0]-before.pos[0],after.pos[2]-before.pos[2]).toFixed(4), robot:A.state().robot.pos.map(v=>+v.toFixed(2)), state:A.robot.getState()};
  }
  // arm payload limits
  A.qa.reset(); await new Promise(r=>setTimeout(r,300));
  A.qa.teleportNear('mug_white',0.45); await new Promise(r=>setTimeout(r,800));
  res.grabMug=A.qa.grabByName('mug_white');
  if (res.grabMug.ok) A.qa.release();
  await new Promise(r=>setTimeout(r,500));
  A.qa.teleportNear('laptop',0.5); await new Promise(r=>setTimeout(r,800));
  res.grabLaptop=A.qa.grabByName('laptop');
  res.laptopCanReach=A.robot.canReach ? A.robot.canReach(A.qa.object('laptop').pos ? {x:A.qa.object('laptop').pos[0],y:A.qa.object('laptop').pos[1],z:A.qa.object('laptop').pos[2]} : null) : null;
  res.arm={maxLiftKg:A.robot.arm.maxLiftKg, reach:A.robot.arm.reach};
  res.state=A.state();
  return res;
});
// speed test: drive straight 2s and measure
const speed = await page.evaluate(async()=>{
  const A=window.__APP__; A.qa.reset(); await new Promise(r=>setTimeout(r,300));
  A.qa.teleport(-3.0,-0.2,0); await new Promise(r=>setTimeout(r,400));
  const p0=A.state().robot.pos; A.qa.hold('KeyW'); await new Promise(r=>setTimeout(r,2000)); A.qa.releaseKey('KeyW');
  await new Promise(r=>setTimeout(r,300)); const p1=A.state().robot.pos;
  return {dist:+Math.hypot(p1[0]-p0[0],p1[2]-p0[2]).toFixed(2), p0, p1};
});
console.log(JSON.stringify({out,speed,logs},null,2));
await browser.close();
