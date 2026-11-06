import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless:true, args:['--no-sandbox','--use-gl=angle','--use-angle=metal','--enable-gpu','--window-size=1440,900'], defaultViewport:{width:1440,height:900}});
const page = await browser.newPage();
const logs=[]; page.on('console',m=>logs.push(`[${m.type()}] ${m.text()}`)); page.on('pageerror',e=>logs.push(`[err] ${e.message}`));
await page.goto('http://127.0.0.1:4173/', {waitUntil:'networkidle0'});
await page.waitForFunction('window.__APP__ && window.__APP__.ready===true', {timeout:60000});
await new Promise(r=>setTimeout(r,1200));
const out = await page.evaluate(async()=>{
  const A=window.__APP__;
  A.qa.teleportNear('mug_white',0.5); await new Promise(r=>setTimeout(r,800));
  const res={};
  for (let i=0;i<5;i++){ const s=A.qa.screenOf('mug_white'); if(s) A.qa.pointerAt(s.x,s.y); await new Promise(r=>setTimeout(r,300)); res['try'+i]={target:A.state().target,hud:A.qa.hudText(),screen:A.qa.screenOf('mug_white')}; }
  // sofa reachable label
  A.qa.teleportNear('sofa',0.9); await new Promise(r=>setTimeout(r,800));
  for (let i=0;i<4;i++){ const s=A.qa.screenOf('sofa'); if(s) A.qa.pointerAt(s.x,s.y); await new Promise(r=>setTimeout(r,300)); }
  res.sofa={target:A.state().target,hud:A.qa.hudText()};
  return res;
});
await page.setViewport({width:390,height:844,deviceScaleFactor:1});
await new Promise(r=>setTimeout(r,700));
const mobile = await page.evaluate(()=>({hudRects:window.__APP__.qa.hudRects(), cursor:document.getElementById('hud-cursor')?.style.transform, cursorVisible:!document.getElementById('hud-cursor')?.classList.contains('is-hidden'), state:window.__APP__.state()}));
await page.screenshot({path:'qa/shots/hud-mobile.png'});
console.log(JSON.stringify({out,mobile,logs},null,2));
await browser.close();
