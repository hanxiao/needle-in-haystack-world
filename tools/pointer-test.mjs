import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless:true, args:['--no-sandbox','--use-gl=angle','--use-angle=metal','--enable-gpu','--window-size=1440,900'], defaultViewport:{width:1440,height:900}});
const page = await browser.newPage();
const logs=[]; page.on('console',m=>logs.push(`[${m.type()}] ${m.text()}`)); page.on('pageerror',e=>logs.push(`[err] ${e.message}`));
await page.goto('http://127.0.0.1:4173/', {waitUntil:'networkidle0'});
await page.waitForFunction('window.__APP__ && window.__APP__.ready===true', {timeout:60000});
await new Promise(r=>setTimeout(r,1200));
const results = {};
for (const [name,dist] of [['laptop',0.8],['mug_white',0.35],['sofa',1.0],['chair_1',1.0],['needle',0.35]]) {
  const prep = await page.evaluate(async ({name,dist})=>{
    const A=window.__APP__;
    A.qa.teleportNear(name,dist);
    await new Promise(r=>setTimeout(r,600));
    A.qa.aimAt(name);
    await new Promise(r=>setTimeout(r,600));
    const scr = A.qa.screenOf(name);
    if (scr) A.qa.pointerAt(scr.x, scr.y);
    await new Promise(r=>setTimeout(r,250));
    return {screen:scr, target:A.state().target, hud:A.qa.hudText(), ray:A.qa.raycast()};
  },{name,dist});
  results[name]=prep;
}
// real click grab on laptop: prepare then move mouse and click
await page.evaluate(async()=>{ const A=window.__APP__; A.qa.teleportNear('laptop',0.8); await new Promise(r=>setTimeout(r,600)); A.qa.aimAt('laptop'); await new Promise(r=>setTimeout(r,700)); const s=A.qa.screenOf('laptop'); A.qa.pointerAt(s.x,s.y); });
await new Promise(r=>setTimeout(r,300));
const scr = await page.evaluate(()=>window.__APP__.qa.screenOf('laptop'));
await page.mouse.move(scr.x, scr.y);
await new Promise(r=>setTimeout(r,250));
const preClick = await page.evaluate(()=>({target:window.__APP__.state().target, hud:window.__APP__.qa.hudText()}));
await page.mouse.click(scr.x, scr.y);
await new Promise(r=>setTimeout(r,700));
const postClick = await page.evaluate(()=>({state:window.__APP__.state(), hud:window.__APP__.qa.hudText()}));
// push sofa with pointer aim
const push = await page.evaluate(async()=>{
  const A=window.__APP__;
  const before=A.qa.object('sofa');
  A.qa.teleport(-2.5,-1.3,0); await new Promise(r=>setTimeout(r,500));
  A.qa.aimAt('sofa'); await new Promise(r=>setTimeout(r,700));
  const s=A.qa.screenOf('sofa'); if (s) A.qa.pointerAt(s.x,s.y);
  await new Promise(r=>setTimeout(r,300));
  const tgt=A.state().target;
  A.qa.action(); await new Promise(r=>setTimeout(r,900));
  const after=A.qa.object('sofa');
  return {tgt, before, after, moved:+Math.hypot(after.pos[0]-before.pos[0], after.pos[2]-before.pos[2]).toFixed(4)};
});
console.log(JSON.stringify({results, preClick, postClick, push, logs},null,2));
await page.screenshot({path:'qa/shots/pointer-test.png'});
await browser.close();
