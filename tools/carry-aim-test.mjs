import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless:true, args:['--no-sandbox','--use-gl=angle','--use-angle=metal','--enable-gpu','--window-size=1440,900'], defaultViewport:{width:1440,height:900}});
const page = await browser.newPage();
const logs=[]; page.on('console',m=>logs.push(`[${m.type()}] ${m.text()}`)); page.on('pageerror',e=>logs.push(`[err] ${e.message}`));
await page.goto('http://127.0.0.1:4173/', {waitUntil:'networkidle0'});
await page.waitForFunction('window.__APP__ && window.__APP__.ready===true', {timeout:60000});
await new Promise(r=>setTimeout(r,1500));
const out = await page.evaluate(async()=>{
  const A=window.__APP__; A.qa.reset(); await new Promise(r=>setTimeout(r,300));
  A.qa.teleportNear('mug_white',0.33); await new Promise(r=>setTimeout(r,700));
  const g=A.qa.grabByName('mug_white'); await new Promise(r=>setTimeout(r,700));
  const y0=A.qa.object('mug_white').pos[1];
  const p=A.state().robot.pos;
  A.qa.aimAtPoint([p[0]+0.1,p[1]+0.75,p[2]-0.1]); await new Promise(r=>setTimeout(r,800));
  const yUp=A.qa.object('mug_white').pos[1];
  A.qa.aimAtPoint([p[0]+0.1,p[1]+0.05,p[2]-0.1]); await new Promise(r=>setTimeout(r,800));
  const yDown=A.qa.object('mug_white').pos[1];
  const st=A.state();
  if (st.robot.held) A.qa.release();
  return {grab:g, y0, yUp, yDown, up:+(yUp-y0).toFixed(3), down:+(yDown-y0).toFixed(3), state:st};
});
await page.screenshot({path:'qa/shots/carry-aim.png'});
// bathroom screenshot
await page.evaluate(()=>{ const A=window.__APP__; A.qa.reset(); A.qa.teleport(1.6,1.7,3.14); A.qa.setCamera(3.14,0.4,1.5); });
await new Promise(r=>setTimeout(r,900)); await page.screenshot({path:'qa/shots/improve-bath.png'});
console.log(JSON.stringify({out,logs},null,2));
await browser.close();
