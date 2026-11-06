import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless:true, args:['--no-sandbox','--use-gl=angle','--use-angle=metal','--enable-gpu','--window-size=1440,900'], defaultViewport:{width:1440,height:900}});
const page = await browser.newPage();
const logs=[]; page.on('console',m=>logs.push(`[${m.type()}] ${m.text()}`)); page.on('pageerror',e=>logs.push(`[err] ${e.message}`));
await page.goto('http://127.0.0.1:4173/', {waitUntil:'networkidle0'});
await page.waitForFunction('window.__APP__ && window.__APP__.ready===true', {timeout:60000});
await new Promise(r=>setTimeout(r,1200));

async function tryFocus(name, dist=0.4, tries=4) {
  return await page.evaluate(async ({name,dist,tries})=>{
    const A=window.__APP__;
    A.qa.teleportNear(name,dist);
    await new Promise(r=>setTimeout(r,700));
    let last=null;
    for (let i=0;i<tries;i++){
      const s=A.qa.screenOf(name);
      if (!s) return {name, error:'no screen'};
      A.qa.pointerAt(s.x,s.y);
      await new Promise(r=>setTimeout(r,260));
      last=A.state().target;
      if (last===name) break;
    }
    return {name, target:last, hud:A.qa.hudText(), screen:A.qa.screenOf(name), obj:A.qa.object(name)};
  },{name,dist,tries});
}
const out={};
for (const [n,d] of [['sock_1',0.45],['shoe_1',0.5],['paper_1',0.45],['mug_white',0.38],['book_stack_1',0.45],['laptop',0.5]]) {
  out[n]=await tryFocus(n,d);
}
// real click grab on whatever focuses: use sock_1
const prep = await page.evaluate(async()=>{
  const A=window.__APP__;
  A.qa.teleportNear('sock_1',0.45); await new Promise(r=>setTimeout(r,700));
  for (let i=0;i<4;i++){ const s=A.qa.screenOf('sock_1'); A.qa.pointerAt(s.x,s.y); await new Promise(r=>setTimeout(r,260)); if (A.state().target==='sock_1') break; }
  const s=A.qa.screenOf('sock_1'); return {target:A.state().target, screen:s, hud:A.qa.hudText()};
});
await page.mouse.move(prep.screen.x, prep.screen.y);
await new Promise(r=>setTimeout(r,250));
await page.mouse.click(prep.screen.x, prep.screen.y);
await new Promise(r=>setTimeout(r,700));
const afterClick = await page.evaluate(()=>({state:window.__APP__.state(), hud:window.__APP__.qa.hudText()}));
await page.screenshot({path:'qa/shots/click-sock.png'});
// FP click test on mug: teleport, first person, aimAt then click center
const fpPrep = await page.evaluate(async()=>{
  const A=window.__APP__;
  A.qa.teleportNear('mug_white',0.38); await new Promise(r=>setTimeout(r,700));
  A.qa.setView('first'); A.qa.aimAt('mug_white'); await new Promise(r=>setTimeout(r,700));
  return {target:A.state().target, hud:A.qa.hudText(), cam:A.qa.cameraInfo(), scr:A.qa.screenOf('mug_white')};
});
await page.mouse.move(720,450);
await page.mouse.click(720,450);
await new Promise(r=>setTimeout(r,700));
const fpAfter = await page.evaluate(()=>({state:window.__APP__.state(), hud:window.__APP__.qa.hudText()}));
await page.screenshot({path:'qa/shots/fp-click.png'});
console.log(JSON.stringify({out, prep, afterClick, fpPrep, fpAfter, logs},null,2));
await browser.close();
