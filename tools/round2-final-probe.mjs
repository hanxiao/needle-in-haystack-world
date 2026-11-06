import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless:true, args:['--no-sandbox','--use-gl=angle','--use-angle=metal','--enable-gpu','--window-size=1440,900'], defaultViewport:{width:1440,height:900}});
const page = await browser.newPage();
const logs=[]; page.on('console',m=>logs.push(`[${m.type()}] ${m.text()}`)); page.on('pageerror',e=>logs.push(`[err] ${e.message}`));
await page.goto('http://127.0.0.1:4173/', {waitUntil:'networkidle0'});
await page.waitForFunction('window.__APP__ && window.__APP__.ready===true', {timeout:60000});
await new Promise(r=>setTimeout(r,1500));
await page.screenshot({path:'qa/shots/r2-final-spawn.png'});
const out = await page.evaluate(async()=>{
  const A=window.__APP__; const res={};
  A.qa.reset(); await new Promise(r=>setTimeout(r,300));
  const mug0=A.qa.object('mug_white');
  const near=A.qa.teleportNear('mug_white',0.35); await new Promise(r=>setTimeout(r,800));
  const robot0=A.robot.getState();
  const g=A.qa.grabByName('mug_white'); await new Promise(r=>setTimeout(r,600));
  const mug1=A.qa.object('mug_white'); const robot1=A.robot.getState();
  res.grab={near, robot0:{pos:robot0.pos.map(v=>+v.toFixed(3)), reach:robot0.reach, payload:robot0.payload}, grab:g, mug0:mug0.pos, mug1:mug1.pos, lift:+(mug1.pos[1]-mug0.pos[1]).toFixed(3), robot1:robot1.pos.map(v=>+v.toFixed(3))};
  if (g.ok) A.qa.release(); await new Promise(r=>setTimeout(r,400));
  A.qa.teleportNear('laptop',0.5); await new Promise(r=>setTimeout(r,600));
  res.laptop=A.qa.grabByName('laptop');
  // speed
  A.qa.reset(); await new Promise(r=>setTimeout(r,300)); A.qa.teleport(-3.0,-0.2,0); await new Promise(r=>setTimeout(r,300));
  const p0=A.state().robot.pos; A.qa.hold('KeyW'); await new Promise(r=>setTimeout(r,2000)); A.qa.releaseKey('KeyW'); await new Promise(r=>setTimeout(r,300)); const p1=A.state().robot.pos;
  res.speed={dist:+Math.hypot(p1[0]-p0[0],p1[2]-p0[2]).toFixed(2)};
  // trail
  for (const [k,ms] of [['KeyD',900],['KeyW',1200],['KeyA',700]]) { A.qa.hold(k); await new Promise(r=>setTimeout(r,ms)); A.qa.releaseKey(k); }
  await new Promise(r=>setTimeout(r,400));
  res.trail={points:A.trail.points.length, layers:A.trail.mesh.layers.mask, top:A.robot.cameras.top.layers.mask};
  res.state=A.state();
  return res;
});
await page.screenshot({path:'qa/shots/r2-final-driven.png'});
console.log(JSON.stringify({out,logs},null,2));
await browser.close();
