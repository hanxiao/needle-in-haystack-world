import puppeteer from 'puppeteer-core';
const URL = process.argv[2] || 'http://127.0.0.1:4182/';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless:true, args:['--no-sandbox','--use-gl=angle','--use-angle=metal','--enable-gpu','--hide-scrollbars','--window-size=1440,900'], defaultViewport:{width:1440,height:900,deviceScaleFactor:1}});
const page = await browser.newPage(); await page.bringToFront();
await page.goto(URL, {waitUntil:'networkidle0'});
await page.waitForFunction('window.__APP__ && window.__APP__.ready===true');
await wait(2400);
const out={};
const camDist = () => page.evaluate(()=>{ const A=window.__APP__; const ci=A.qa.cameraInfo(); const rp=A.robot.group.position; return {cam:ci.pos.map(v=>+v.toFixed(2)), dist:+Math.hypot(rp.x-ci.pos[0], rp.y+0.18-ci.pos[1], rp.z-ci.pos[2]).toFixed(2)}; });
// mirror
await page.evaluate(()=>{ const A=window.__APP__; const yaw=Math.atan2(-(2.6-1.4), -(1.85-2.35)); A.qa.teleport(1.4,2.35,yaw); A.qa.look(yaw,0.34); });
await wait(900); await page.screenshot({path:'qa/visual/shots/r4-mirror-up.png'});
await page.evaluate(()=>{ const A=window.__APP__; const yaw=Math.atan2(-(2.6-1.0), -(1.85-2.6)); A.qa.setView('third'); A.qa.setCamera(yaw,0.28,1.4); });
await wait(900); await page.screenshot({path:'qa/visual/shots/r4-mirror-tp2.png'});
// hold LED
await page.evaluate(()=>{ const A=window.__APP__; A.qa.setView('third'); A.qa.teleportNear('mug_white',0.34); });
await wait(900);
out.grab = await page.evaluate(()=>window.__APP__.qa.grabByName('mug_white'));
await wait(500);
await page.evaluate(()=>{ const A=window.__APP__; const r=A.state().robot; A.qa.setCamera(r.yaw+Math.PI,0.2,1.0); });
await wait(800);
await page.screenshot({path:'qa/visual/shots/r4-led-hold2.png'});
out.holdHud = await page.evaluate(()=>window.__APP__.qa.hudText());
await page.evaluate(()=>window.__APP__.qa.release()); await wait(400);
// push LED
await page.evaluate(()=>{ const A=window.__APP__; A.qa.teleportNear('sofa',0.45); });
await wait(900);
await page.evaluate(()=>{ const A=window.__APP__; A.qa.aimAt('sofa'); });
await wait(300);
await page.evaluate(()=>{ const A=window.__APP__; A.qa.hold('KeyW'); });
await wait(800);
out.pushHud = await page.evaluate(()=>window.__APP__.qa.hudText());
await page.evaluate(()=>{ const A=window.__APP__; const r=A.state().robot; A.qa.setCamera(r.yaw+Math.PI*0.8,0.2,1.0); });
await wait(500);
await page.screenshot({path:'qa/visual/shots/r4-led-push2.png'});
await page.evaluate(()=>{ const A=window.__APP__; A.qa.releaseKey('KeyW'); });
await wait(400);
// wall-west variants
out.walls={};
for (const [name,x,z,yaw] of [['w1',-5.30,-0.5,-Math.PI/2],['w2',-5.30,0.5,-Math.PI/2],['w3',-5.00,-0.5,-Math.PI/2],['w4',-5.30,-2.5,-Math.PI/2]]){
  await page.evaluate((x,z,yaw)=>{ const A=window.__APP__; A.qa.teleport(x,z,yaw); A.qa.setView('third'); A.qa.setCamera(yaw,0.14,1.75); },x,z,yaw);
  await wait(800);
  out.walls[name]=await camDist();
  await page.screenshot({path:`qa/visual/shots/r4-wall-${name}.png`});
}
console.log(JSON.stringify(out,null,1));
await browser.close();
