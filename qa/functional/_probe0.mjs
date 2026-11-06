import puppeteer from 'puppeteer-core';
const t0 = Date.now();
const browser = await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless:true, args:['--no-sandbox','--use-gl=angle','--use-angle=metal','--enable-gpu','--window-size=1440,900'], defaultViewport:{width:1440,height:900}});
const page = await browser.newPage();
const logs=[], reqs=[], fails=[];
page.on('console',m=>logs.push(`[${m.type()}] ${m.text()}`));
page.on('pageerror',e=>logs.push(`[pageerror] ${e.message}`));
page.on('request',r=>reqs.push(r.url()));
page.on('requestfailed',r=>fails.push(r.url()+' '+r.failure()?.errorText));
const t=Date.now();
await page.goto('http://127.0.0.1:4181/', {waitUntil:'networkidle0', timeout:60000});
await page.waitForFunction('window.__APP__ && window.__APP__.ready===true', {timeout:60000});
const loadMs = Date.now()-t;
await new Promise(r=>setTimeout(r,2500));
const out = await page.evaluate(() => {
  const A = window.__APP__;
  const s = A.state();
  const names = A.physics.objects.map(o=>o.name);
  const need = ['sofa','coffee_table','tv','rug','bookshelf','dining_table','chair_1','fridge','bed','wardrobe','desk','mug_white','book_stack_1','laptop','plant_monstera','needle'];
  const present = Object.fromEntries(need.map(n=>[n, !!A.qa.object(n)]));
  const masses = Object.fromEntries(need.map(n=>[n, A.qa.object(n)?.mass ?? null]));
  const dyn = A.physics.dynamicObjects;
  let nan=0, below=0;
  for (const o of dyn) { const p=o.body.translation(); if (!Number.isFinite(p.x)||!Number.isFinite(p.y)||!Number.isFinite(p.z)) nan++; if (p.y < -0.1) below++; }
  return { state:s, rooms:A.world.rooms.map(r=>({id:r.id,label:r.label})), objectCount:A.physics.objects.length, dynCount:dyn.length, present, masses, nan, below,
    hudRects:A.qa.hudRects(), hudText:A.qa.hudText(), sampleMain:A.qa.sampleMain({x:600,y:300,w:100,h:100}),
    stats:A.qa.drawCalls(), fps:A.fps, errors:A.errors, camera:A.qa.cameraInfo(), spawn:s.robot.pos };
});
console.log(JSON.stringify({loadMs, out, reqs, fails, logs},null,2));
await page.screenshot({path:'qa/functional/shots/probe0.png'});
await browser.close();
