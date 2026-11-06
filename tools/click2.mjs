import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless:true, args:['--no-sandbox','--use-gl=angle','--use-angle=metal','--enable-gpu','--window-size=1440,900'], defaultViewport:{width:1440,height:900}});
const page = await browser.newPage();
const logs=[]; page.on('console',m=>logs.push(`[${m.type()}] ${m.text()}`)); page.on('pageerror',e=>logs.push(`[err] ${e.message}`));
await page.goto('http://127.0.0.1:4173/', {waitUntil:'networkidle0'});
await page.waitForFunction('window.__APP__ && window.__APP__.ready===true', {timeout:60000});
await new Promise(r=>setTimeout(r,1200));
async function focus(name, dist=0.45) {
  return page.evaluate(async ({name,dist})=>{
    const A=window.__APP__;
    A.qa.teleportNear(name,dist);
    await new Promise(r=>setTimeout(r,800));
    const s=A.qa.screenOf(name);
    if (s) A.qa.pointerAt(s.x,s.y);
    await new Promise(r=>setTimeout(r,400));
    return {name, screen:s, target:A.state().target, hud:A.qa.hudText(), cam:A.qa.cameraInfo(), obj:A.qa.object(name)};
  },{name,dist});
}
const out={};
for (const n of ['paper_kitchen_1','paper_kitchen_2','sock_2','onion','paper_ball']) out[n]=await focus(n,0.5);
console.log(JSON.stringify(out,null,2));
// real click on paper_kitchen_1
const prep=await focus('paper_kitchen_1',0.5);
if (prep.screen) {
  await page.mouse.move(prep.screen.x, prep.screen.y);
  await new Promise(r=>setTimeout(r,300));
  const hover = await page.evaluate(()=>window.__APP__.state().target);
  await page.mouse.click(prep.screen.x, prep.screen.y);
  await new Promise(r=>setTimeout(r,800));
  const after = await page.evaluate(()=>({state:window.__APP__.state(), hud:window.__APP__.qa.hudText()}));
  console.log('CLICK', JSON.stringify({hover, held:after.state.robot.held, hud:after.hud, target:after.state.target},null,2));
}
await page.screenshot({path:'qa/shots/click-kitchen.png'});
console.log('LOGS', logs);
await browser.close();
