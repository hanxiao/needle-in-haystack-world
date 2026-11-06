import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless:true, args:['--no-sandbox','--use-gl=angle','--use-angle=metal','--enable-gpu','--window-size=1440,900'], defaultViewport:{width:1440,height:900}});
const page = await browser.newPage();
const logs=[]; page.on('console',m=>logs.push(`[${m.type()}] ${m.text()}`)); page.on('pageerror',e=>logs.push(`[err] ${e.message}`));
await page.goto('http://127.0.0.1:4173/', {waitUntil:'networkidle0'});
await page.waitForFunction('window.__APP__ && window.__APP__.ready===true', {timeout:60000});
await new Promise(r=>setTimeout(r,1500));
const rooms = await page.evaluate(()=>window.__APP__.world.rooms.map(r=>({label:r.label, center:r.center, id:r.id})));
const views = [
  ['living', -2.7, -1.0, 0.0, 0.42, 2.6],
  ['kitchen', 2.9, -1.2, 0.0, 0.42, 2.6],
  ['bedroom', -3.5, 2.0, 3.14, 0.42, 2.4],
  ['hallway', -0.4, 2.0, 3.14, 0.42, 2.0],
  ['bathroom', 1.7, 2.0, 3.14, 0.42, 1.8],
  ['study', 4.2, 2.0, 3.14, 0.42, 2.0],
];
for (const [name,x,z,yaw,pitch,dist] of views) {
  await page.evaluate(({x,z,yaw,pitch,dist})=>{ const A=window.__APP__; A.qa.teleport(x,z,yaw); A.qa.setCamera(yaw,pitch,dist); }, {x,z,yaw,pitch,dist});
  await new Promise(r=>setTimeout(r,700));
  await page.screenshot({path:`qa/shots/room-${name}.png`});
}
// night + first person
await page.evaluate(()=>{ const A=window.__APP__; A.qa.teleport(-2.7,-1.0,0); A.qa.setCamera(0,0.42,2.6); A.qa.setNight(true); });
await new Promise(r=>setTimeout(r,700));
await page.screenshot({path:'qa/shots/night.png'});
await page.evaluate(()=>{ const A=window.__APP__; A.qa.setNight(false); A.qa.setView('first'); });
await new Promise(r=>setTimeout(r,700));
await page.screenshot({path:'qa/shots/first-person.png'});
const st = await page.evaluate(()=>window.__APP__.state());
console.log(JSON.stringify({rooms, state:st, logs},null,2));
await browser.close();
