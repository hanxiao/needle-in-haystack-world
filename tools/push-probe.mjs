import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless:true, args:['--no-sandbox','--use-gl=angle','--use-angle=metal','--enable-gpu','--window-size=1440,900'], defaultViewport:{width:1440,height:900}});
const page = await browser.newPage();
await page.goto('http://127.0.0.1:4173/', {waitUntil:'networkidle0'});
await page.waitForFunction('window.__APP__ && window.__APP__.ready===true', {timeout:60000});
await new Promise(r=>setTimeout(r,1200));
const out = await page.evaluate(async()=>{
  const A=window.__APP__; const res=[];
  const cases=[['sofa',0.85],['wardrobe',0.85],['bed',0.9],['fridge',0.85],['bookshelf',0.8],['dining_table',0.9],['coffee_table',0.8],['chair_1',0.7],['tv',0.8]];
  for (const [name,dist] of cases){
    A.qa.reset(); await new Promise(r=>setTimeout(r,250));
    const before=A.qa.object(name);
    const near=A.qa.teleportNear(name,dist); await new Promise(r=>setTimeout(r,700));
    const start=A.qa.object(name);
    A.qa.hold('KeyW'); A.qa.hold('ShiftLeft'); await new Promise(r=>setTimeout(r,2000)); A.qa.releaseKey('KeyW'); A.qa.releaseKey('ShiftLeft');
    await new Promise(r=>setTimeout(r,600));
    const after=A.qa.object(name);
    res.push({name, dist, near, start:start.pos, after:after.pos, moved:+Math.hypot(after.pos[0]-start.pos[0], after.pos[2]-start.pos[2]).toFixed(4), robot:A.state().robot.pos.map(v=>+v.toFixed(2)), room:A.state().room});
  }
  // wall push: face front wall from living room
  A.qa.reset(); await new Promise(r=>setTimeout(r,250));
  A.qa.teleport(-3.0,-2.9,0); await new Promise(r=>setTimeout(r,400));
  const wallStart = A.qa.object('walls');
  A.qa.hold('KeyW'); A.qa.hold('ShiftLeft'); await new Promise(r=>setTimeout(r,2000)); A.qa.releaseKey('KeyW'); A.qa.releaseKey('ShiftLeft');
  await new Promise(r=>setTimeout(r,400));
  const wallEnd = A.qa.object('walls');
  res.push({name:'walls', moved: wallStart&&wallEnd ? +Math.hypot(wallEnd.pos[0]-wallStart.pos[0],wallEnd.pos[2]-wallStart.pos[2]).toFixed(4):null, robot:A.state().robot.pos.map(v=>+v.toFixed(2)), static: wallStart?.static});
  return res;
});
console.log(JSON.stringify(out,null,2));
await browser.close();
