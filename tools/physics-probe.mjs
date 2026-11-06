import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless:true, args:['--no-sandbox','--use-gl=angle','--use-angle=metal','--enable-gpu','--window-size=1440,900'], defaultViewport:{width:1440,height:900}});
const page = await browser.newPage();
const logs=[]; page.on('console',m=>logs.push(`[${m.type()}] ${m.text()}`)); page.on('pageerror',e=>logs.push(`[err] ${e.message}`));
await page.goto('http://127.0.0.1:4173/', {waitUntil:'networkidle0'});
await page.waitForFunction('window.__APP__ && window.__APP__.ready===true', {timeout:60000});
await new Promise(r=>setTimeout(r,1500));
const objects = await page.evaluate(()=>window.__APP__.qa.objects().sort((a,b)=>b.mass-a.mass));
console.log('--- dynamic objects by mass');
for (const o of objects.filter(o=>!o.static)) console.log(`${o.mass.toFixed(3).padStart(9)} kg  ${o.name.padEnd(24)} ${o.pos.map(v=>v.toFixed(2)).join(',')}`);
console.log('--- static objects');
for (const o of objects.filter(o=>o.static)) console.log(`   static  ${o.name.padEnd(24)} ${o.pos.map(v=>v.toFixed(2)).join(',')}`);
// push tests: drive into sofa, wardrobe, wall, coffee table
const tests = await page.evaluate(async()=>{
  const A=window.__APP__; const res=[];
  const cases=[
    ['sofa', -2.5,-1.4, 0],
    ['wardrobe', -2.03,2.6, Math.PI],
    ['bed', -4.15,1.2, Math.PI],
    ['fridge', 4.9,-3.0, 0],
    ['coffee_table', -2.25,-0.5, Math.PI],
  ];
  for (const [name,x,z,yaw] of cases){
    A.qa.reset(); await new Promise(r=>setTimeout(r,300));
    const before=A.qa.object(name);
    A.qa.teleport(x,z,yaw); await new Promise(r=>setTimeout(r,300));
    const start=A.qa.object(name);
    A.qa.hold('KeyW'); A.qa.hold('ShiftLeft'); await new Promise(r=>setTimeout(r,2200)); A.qa.releaseKey('KeyW'); A.qa.releaseKey('ShiftLeft');
    await new Promise(r=>setTimeout(r,500));
    const after=A.qa.object(name);
    res.push({name, before, start, after, moved:+Math.hypot(after.pos[0]-start.pos[0], after.pos[2]-start.pos[2]).toFixed(4), robot:A.state().robot.pos.map(v=>+v.toFixed(2))});
  }
  return res;
});
console.log('--- drive-push tests', JSON.stringify(tests,null,1));
// wall push: drive into outer wall and check scene/wall mesh movement? walls static; robot position
const wall = await page.evaluate(async()=>{
  const A=window.__APP__; A.qa.reset(); await new Promise(r=>setTimeout(r,300));
  A.qa.teleport(-3.0,-3.2,0); await new Promise(r=>setTimeout(r,300));
  A.qa.hold('KeyW'); await new Promise(r=>setTimeout(r,2500)); A.qa.releaseKey('KeyW');
  await new Promise(r=>setTimeout(r,300));
  return {state:A.state(), wallNames:A.physics.objects.filter(o=>o.name.startsWith('wall')).map(o=>({name:o.name,static:o.isStatic,pos:o.body.translation()}))};
});
console.log('--- wall test', JSON.stringify(wall,null,1));
console.log('LOGS', logs);
await browser.close();
