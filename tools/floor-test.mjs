import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless:true, args:['--no-sandbox','--use-gl=angle','--use-angle=metal','--enable-gpu','--window-size=1440,900'], defaultViewport:{width:1440,height:900}});
const page = await browser.newPage();
const logs=[]; page.on('console',m=>logs.push(`[${m.type()}] ${m.text()}`)); page.on('pageerror',e=>logs.push(`[err] ${e.message}`));
await page.goto('http://127.0.0.1:4173/', {waitUntil:'networkidle0'});
await page.waitForFunction('window.__APP__ && window.__APP__.ready===true', {timeout:60000});
await new Promise(r=>setTimeout(r,1200));
const floors = await page.evaluate(()=>window.__APP__.qa.objects().filter(o=>!o.static && o.mass<2 && o.pos[1]<0.25 && o.pos[1]>0.005).slice(0,30));
console.log('FLOOR', JSON.stringify(floors.map(o=>[o.name,o.mass,o.pos.map(v=>+v.toFixed(2))])));
// pick paper_1
const targetName = floors.find(o=>o.name.startsWith('paper'))?.name || floors[0]?.name;
const prep = await page.evaluate(async (name)=>{
  const A=window.__APP__;
  A.qa.teleportNear(name, 0.45);
  await new Promise(r=>setTimeout(r,800));
  const before=A.state();
  const s=A.qa.screenOf(name);
  if (s) A.qa.pointerAt(s.x,s.y);
  await new Promise(r=>setTimeout(r,300));
  return {name, before:{robot:before.robot,target:before.target}, screen:s, after:{target:A.state().target,hud:A.qa.hudText(),ray:A.qa.raycast()}};
}, targetName);
console.log('PREP', JSON.stringify(prep,null,2));
if (prep.screen && prep.screen.y>0 && prep.screen.y<900) {
  await page.mouse.move(prep.screen.x, prep.screen.y);
  await new Promise(r=>setTimeout(r,250));
  const t = await page.evaluate(()=>window.__APP__.state().target);
  console.log('HOVER TARGET', t);
  await page.mouse.click(prep.screen.x, prep.screen.y);
  await new Promise(r=>setTimeout(r,700));
  const after = await page.evaluate(()=>({state:window.__APP__.state(), hud:window.__APP__.qa.hudText()}));
  console.log('AFTER CLICK', JSON.stringify({held:after.state.robot.held,hud:after.hud,target:after.state.target},null,2));
  await page.screenshot({path:'qa/shots/floor-click.png'});
}
console.log('LOGS', logs);
await browser.close();
