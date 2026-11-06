import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless:true, args:['--no-sandbox','--use-gl=angle','--use-angle=metal','--enable-gpu','--window-size=1440,900'], defaultViewport:{width:1440,height:900}});
const page = await browser.newPage();
await page.goto('http://127.0.0.1:4173/', {waitUntil:'networkidle0'});
await page.waitForFunction('window.__APP__ && window.__APP__.ready===true', {timeout:60000});
await new Promise(r=>setTimeout(r,1200));
const out=await page.evaluate(async()=>{
  const A=window.__APP__; const res={};
  const shell={minX:-5.6,maxX:5.6,minZ:-3.8,maxZ:3.8};
  const cases=[
    ['south',-3.0,-3.2,0],['west',-5.0,-1.0,-1.57],['east',5.0,-1.0,1.57],['north',-3.0,3.0,3.14]
  ];
  res.shell=[];
  for(const [name,x,z,yaw] of cases){
    A.qa.reset(); await new Promise(r=>setTimeout(r,250));
    A.qa.teleport(x,z,yaw); await new Promise(r=>setTimeout(r,400));
    A.qa.hold('KeyW'); await new Promise(r=>setTimeout(r,1800)); A.qa.releaseKey('KeyW'); await new Promise(r=>setTimeout(r,400));
    const c=A.qa.cameraInfo().pos; const st=A.state();
    res.shell.push({name, cam:c.map(v=>+v.toFixed(2)), inside:c[0]>=shell.minX&&c[0]<=shell.maxX&&c[2]>=shell.minZ&&c[2]<=shell.maxZ, robot:st.robot.pos.map(v=>+v.toFixed(2))});
  }
  // sofa push label close
  A.qa.reset(); await new Promise(r=>setTimeout(r,250));
  A.qa.teleportNear('sofa',0.45); await new Promise(r=>setTimeout(r,500));
  A.qa.hold('KeyW'); await new Promise(r=>setTimeout(r,1600)); A.qa.releaseKey('KeyW'); await new Promise(r=>setTimeout(r,500));
  for(let i=0;i<6;i++){ const s=A.qa.screenOf('sofa'); if(s) A.qa.pointerAt(s.x,s.y); await new Promise(r=>setTimeout(r,180)); }
  res.sofa={hud:A.qa.hudText(), target:A.state().target, robot:A.state().robot.pos.map(v=>+v.toFixed(2))};
  return res;
});
console.log(JSON.stringify(out,null,2));
await browser.close();
