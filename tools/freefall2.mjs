import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless:true, args:['--no-sandbox','--use-gl=angle','--use-angle=metal','--enable-gpu','--window-size=1440,900'], defaultViewport:{width:1440,height:900}});
const page = await browser.newPage();
await page.goto('http://127.0.0.1:4173/', {waitUntil:'networkidle0'});
await page.waitForFunction('window.__APP__ && window.__APP__.ready===true', {timeout:60000});
await new Promise(r=>setTimeout(r,1200));
const out = await page.evaluate(()=>{
  const A=window.__APP__; const R=A.physics.RAPIER; const world=A.physics.world;
  const res={};
  for (const [name,damp] of [['default',0.02],['old',0.12]]) {
    const body=world.createRigidBody(R.RigidBodyDesc.dynamic().setTranslation(0,3.0,0).setLinearDamping(damp));
    world.createCollider(R.ColliderDesc.ball(0.05).setMass(0.2), body);
    const y0=body.translation().y; let steps=0;
    while(body.translation().y>0.05 && steps<300){ world.step(); steps++; }
    const t=steps/60; const y=body.translation().y; const drop=y0-y;
    res[name]={steps,t,y,drop,g:2*drop/(t*t)};
    world.removeRigidBody(body);
  }
  return res;
});
console.log(JSON.stringify(out,null,2));
await browser.close();
