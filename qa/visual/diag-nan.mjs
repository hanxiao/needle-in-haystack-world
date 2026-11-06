import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless:true, args:['--no-sandbox','--use-gl=angle','--use-angle=metal','--enable-gpu','--window-size=1440,900'], defaultViewport:{width:1440,height:900}});
const page = await browser.newPage();
page.on('console',m=>{ if(m.type()!=='debug') console.log('LOG',m.type(),m.text()); });
await page.goto('http://127.0.0.1:4182/', {waitUntil:'networkidle0'});
await page.waitForFunction('window.__APP__ && window.__APP__.ready===true');
await new Promise(r=>setTimeout(r,2000));
const steps = [
 ['baseline', ()=>{}],
 ['night', ()=>window.__APP__.qa.setNight(true)],
 ['teleport', ()=>{ const A=window.__APP__; A.qa.teleport(1.2,-1.2,-0.708); }],
 ['setView', ()=>window.__APP__.qa.setView('third')],
 ['setCamera', ()=>window.__APP__.qa.setCamera(-0.708,0.15,1.35)],
];
for (const [name, fn] of steps) {
  await page.evaluate(fn);
  await new Promise(r=>setTimeout(r,400));
  const info = await page.evaluate(()=>({cam:window.__APP__.qa.cameraInfo(), rig:window.__APP__.rig ? null : null, state:window.__APP__.state().robot.pos}));
  console.log(name, JSON.stringify(info.cam.pos), 'robot', JSON.stringify(info.state));
}
// now inspect internals: expose rig via scene? use __APP__ getters
const internals = await page.evaluate(()=>{
  const A=window.__APP__;
  return { robot: A.robot && A.robot.group.position.toArray(), cam: A.renderer && null };
});
console.log('internals', JSON.stringify(internals));
await page.screenshot({path:'qa/visual/shots/diag-nan.png'});
await browser.close();
