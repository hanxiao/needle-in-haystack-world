import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless:true, args:['--no-sandbox','--use-gl=angle','--use-angle=metal','--enable-gpu','--window-size=1440,900'], defaultViewport:{width:1440,height:900}});
const page = await browser.newPage();
await page.goto('http://127.0.0.1:4173/', {waitUntil:'networkidle0'});
await page.waitForFunction('window.__APP__ && window.__APP__.ready===true', {timeout:60000});
await new Promise(r=>setTimeout(r,1200));
const out = await page.evaluate(async()=>{
  const A=window.__APP__; const res={};
  A.qa.reset(); await new Promise(r=>setTimeout(r,300));
  // place in front of coffee table, drive forward under it
  A.qa.teleport(-2.5,-0.9,0); await new Promise(r=>setTimeout(r,500));
  const before=A.qa.object('coffee_table');
  A.qa.hold('KeyW'); await new Promise(r=>setTimeout(r,1800)); A.qa.releaseKey('KeyW');
  await new Promise(r=>setTimeout(r,500));
  const after=A.qa.object('coffee_table');
  const st=A.robot.getState();
  res.drive={robotY:+st.pos[1].toFixed(3), robot:st.pos.map(v=>+v.toFixed(2)), tableMoved:+Math.hypot(after.pos[0]-before.pos[0],after.pos[2]-before.pos[2]).toFixed(4)};
  res.grabUnder=A.qa.grabByName('mug_white');
  if (res.grabUnder.ok) A.qa.release();
  return res;
});
console.log(JSON.stringify(out,null,2));
await browser.close();
