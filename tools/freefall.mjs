import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless:true, args:['--no-sandbox','--use-gl=angle','--use-angle=metal','--enable-gpu','--window-size=1440,900'], defaultViewport:{width:1440,height:900}});
const page = await browser.newPage();
await page.goto('http://127.0.0.1:4173/', {waitUntil:'networkidle0'});
await page.waitForFunction('window.__APP__ && window.__APP__.ready===true', {timeout:60000});
await new Promise(r=>setTimeout(r,1200));
const out = await page.evaluate(()=>{
  const A=window.__APP__; const R=A.physics.RAPIER; const world=A.physics.world;
  const body=world.createRigidBody(R.RigidBodyDesc.dynamic().setTranslation(0,2.0,0).setLinearDamping(0.02));
  world.createCollider(R.ColliderDesc.ball(0.05).setMass(0.2), body);
  const t0=performance.now(); let steps=0;
  while(performance.now()-t0<500){ world.step(); steps++; }
  const y=body.translation().y; const t=(performance.now()-t0)/1000;
  world.removeRigidBody(body);
  return {steps, t, y, drop:2-y, g:2*(2-y)/(t*t)};
});
console.log(JSON.stringify(out,null,2));
await browser.close();
