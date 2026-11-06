import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless:true, args:['--no-sandbox','--use-gl=angle','--use-angle=metal','--enable-gpu','--hide-scrollbars','--window-size=1440,900'], defaultViewport:{width:1440,height:900,deviceScaleFactor:1}});
const page = await browser.newPage(); await page.bringToFront();
await page.goto('http://127.0.0.1:4182/', {waitUntil:'networkidle0'});
await page.waitForFunction('window.__APP__ && window.__APP__.ready===true');
await new Promise(r=>setTimeout(r,2200));
const out = await page.evaluate(async ()=>{
  const A=window.__APP__; const res=[];
  const trySpot=(x,z,yaw,name)=>{ A.qa.teleport(x,z,yaw); };
  // under the table, near the mug at (-2.878,-1.707)
  trySpot(-2.82,-1.72, Math.atan2(-(-2.878+2.82), -(-1.707+1.72)));
  await new Promise(r=>setTimeout(r,900));
  const st=A.state();
  const g=A.qa.grabByName('mug_white');
  await new Promise(r=>setTimeout(r,400));
  const hud=A.qa.hudText();
  const held=A.state().robot.held;
  return {robot:st.robot, grab:g, held, hud, camFP:null};
});
console.log(JSON.stringify(out));
await page.evaluate(()=>{ const A=window.__APP__; A.qa.setCamera(2.0,0.05,0.9); });
await new Promise(r=>setTimeout(r,800));
await page.screenshot({path:'qa/visual/shots/r2-under-reach2.png'});
const cam = await page.evaluate(()=>window.__APP__.qa.cameraInfo());
const fp = await page.evaluate(async ()=>{ const A=window.__APP__; A.qa.look(A.state().robot.yaw, -0.05); await new Promise(r=>setTimeout(r,400)); return A.qa.cameraInfo(); });
console.log('thirdCam', JSON.stringify(cam.pos), 'fpCam', JSON.stringify(fp.pos));
await page.screenshot({path:'qa/visual/shots/r2-under-reach2-fp.png'});
await browser.close();
