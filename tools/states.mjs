import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless:true, args:['--no-sandbox','--use-gl=angle','--use-angle=metal','--enable-gpu','--window-size=1440,900'], defaultViewport:{width:1440,height:900}});
const page = await browser.newPage();
const logs=[]; page.on('console',m=>logs.push(`[${m.type()}] ${m.text()}`)); page.on('pageerror',e=>logs.push(`[err] ${e.message}`));
await page.goto('http://127.0.0.1:4173/', {waitUntil:'networkidle0'});
await page.waitForFunction('window.__APP__ && window.__APP__.ready===true', {timeout:60000});
await new Promise(r=>setTimeout(r,1500));
// FP view facing sofa
await page.evaluate(()=>{ const A=window.__APP__; A.qa.teleport(-3.2,-0.4,0.0); A.qa.look(0.0,-0.05); });
await new Promise(r=>setTimeout(r,800));
await page.screenshot({path:'qa/shots/fp2.png'});
// night third person
await page.evaluate(()=>{ const A=window.__APP__; A.qa.setView('third'); A.qa.teleport(-3.0,-0.6,0.0); A.qa.setCamera(0.9,0.38,1.8); A.qa.setNight(true); });
await new Promise(r=>setTimeout(r,900));
await page.screenshot({path:'qa/shots/night2.png'});
const nightState = await page.evaluate(()=>({state:window.__APP__.state(), cam:window.__APP__.qa.cameraInfo()}));
// day + grab mug + place
await page.evaluate(async()=>{ const A=window.__APP__; A.qa.setNight(false); A.qa.teleportNear('mug_white',0.35); });
await new Promise(r=>setTimeout(r,800));
const grab = await page.evaluate(()=>window.__APP__.qa.grabByName('mug_white'));
await new Promise(r=>setTimeout(r,600));
await page.screenshot({path:'qa/shots/held.png'});
const heldState = await page.evaluate(()=>window.__APP__.state());
// release
const rel = await page.evaluate(()=>{ window.__APP__.qa.release(); return window.__APP__.state(); });
await new Promise(r=>setTimeout(r,900));
const afterRel = await page.evaluate(()=>({state:window.__APP__.state(), mug:window.__APP__.qa.object('mug_white')}));
await page.screenshot({path:'qa/shots/placed.png'});
// heavy push test
const push = await page.evaluate(async()=>{
  const A=window.__APP__;
  const before=A.qa.object('sofa');
  A.qa.teleportNear('sofa',0.55);
  await new Promise(r=>setTimeout(r,700));
  A.qa.action();
  await new Promise(r=>setTimeout(r,700));
  const after=A.qa.object('sofa');
  return {before, after, moved: Math.hypot(after.pos[0]-before.pos[0], after.pos[2]-before.pos[2])};
});
// needle
const needle = await page.evaluate(async()=>{
  const A=window.__APP__;
  A.qa.teleportNear('needle',0.3);
  await new Promise(r=>setTimeout(r,700));
  const r=A.qa.grabByName('needle');
  await new Promise(r=>setTimeout(r,400));
  return {grab:r, state:A.state()};
});
await page.screenshot({path:'qa/shots/needle.png'});
console.log(JSON.stringify({nightState, grab, heldState, rel, afterRel, push, needle, logs},null,2));
await browser.close();
