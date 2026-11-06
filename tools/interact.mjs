import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless:true, args:['--no-sandbox','--use-gl=angle','--use-angle=metal','--enable-gpu','--window-size=1440,900'], defaultViewport:{width:1440,height:900}});
const page = await browser.newPage();
const logs=[]; page.on('console',m=>logs.push(`[${m.type()}] ${m.text()}`)); page.on('pageerror',e=>logs.push(`[err] ${e.message}`));
await page.goto('http://127.0.0.1:4173/', {waitUntil:'networkidle0'});
await page.waitForFunction('window.__APP__ && window.__APP__.ready===true', {timeout:60000});
await new Promise(r=>setTimeout(r,1500));
// aim at laptop, see target
const aim = await page.evaluate(async()=>{ const A=window.__APP__; A.qa.teleportNear('laptop',0.8); await new Promise(r=>setTimeout(r,500)); A.qa.aimAt('laptop'); await new Promise(r=>setTimeout(r,500)); return {state:A.state(), hud:A.qa.hudText(), cam:A.qa.cameraInfo()}; });
await page.screenshot({path:'qa/shots/aim-laptop.png'});
// real click at center
await page.mouse.click(720, 450);
await new Promise(r=>setTimeout(r,600));
const afterClick = await page.evaluate(()=>({state:window.__APP__.state(), hud:window.__APP__.qa.hudText()}));
// push sofa: stand 1.0m away, aim, action, measure
const push = await page.evaluate(async()=>{
  const A=window.__APP__;
  const before=A.qa.object('sofa');
  A.qa.teleport(-2.5,-1.35,0); A.qa.aimAt('sofa'); await new Promise(r=>setTimeout(r,800));
  const tgt=A.state().target;
  A.qa.action(); await new Promise(r=>setTimeout(r,800));
  const after=A.qa.object('sofa');
  return {tgt, before, after, moved:+Math.hypot(after.pos[0]-before.pos[0], after.pos[2]-before.pos[2]).toFixed(4)};
});
// push chair
const pushChair = await page.evaluate(async()=>{
  const A=window.__APP__;
  const before=A.qa.object('chair_1');
  A.qa.teleportNear('chair_1',1.0); await new Promise(r=>setTimeout(r,700));
  A.qa.aimAt('chair_1'); await new Promise(r=>setTimeout(r,500));
  const tgt=A.state().target;
  A.qa.action(); await new Promise(r=>setTimeout(r,1000));
  const after=A.qa.object('chair_1');
  return {tgt, before, after, moved:+Math.hypot(after.pos[0]-before.pos[0], after.pos[2]-before.pos[2]).toFixed(4)};
});
console.log(JSON.stringify({aim, afterClick, push, pushChair, logs},null,2));
await browser.close();
