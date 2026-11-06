import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless:true, args:['--no-sandbox','--use-gl=angle','--use-angle=metal','--enable-gpu','--window-size=1440,900'], defaultViewport:{width:1440,height:900}});
const page = await browser.newPage();
const logs=[]; page.on('console',m=>logs.push(`[${m.type()}] ${m.text()}`)); page.on('pageerror',e=>logs.push(`[err] ${e.message}`));
const t0=Date.now();
await page.goto('http://127.0.0.1:4173/', {waitUntil:'networkidle0'});
await page.waitForFunction('window.__APP__ && window.__APP__.ready===true', {timeout:60000});
const readyMs=Date.now()-t0;
await new Promise(r=>setTimeout(r,1500));
const out={readyMs};
// camera tight spots: drive into sofa / bed / under table
async function tight(name, setup, ms=1800){
  return page.evaluate(async ({name,setup,ms})=>{
    const A=window.__APP__; A.qa.reset(); await new Promise(r=>setTimeout(r,250));
    if(setup==='sofa'){ A.qa.teleport(-2.5,-1.0,0); }
    if(setup==='bed'){ A.qa.teleport(-3.4,1.4,Math.PI); }
    if(setup==='under'){ A.qa.teleport(-2.5,-0.8,0); }
    await new Promise(r=>setTimeout(r,400));
    A.qa.hold('KeyW'); await new Promise(r=>setTimeout(r,ms)); A.qa.releaseKey('KeyW'); await new Promise(r=>setTimeout(r,500));
    const cam=A.qa.cameraInfo(); const st=A.state(); const sample=A.qa.sampleMain({x:400,y:250,w:600,h:400});
    return {name, cam, robot:st.robot.pos, sample, hud:st.hud};
  },{name,setup,ms});
}
out.sofa=await tight('sofa','sofa');
out.bed=await tight('bed','bed');
out.under=await tight('under','under');
await page.screenshot({path:'qa/shots/improve-camera.png'});
// HUD rows/legend
out.hud=await page.evaluate(()=>({controls:document.querySelectorAll('#hud-controls .hud-row').length, keycaps:document.querySelectorAll('#hud-controls kbd').length, mapTrail:!!document.getElementById('hud-map-trail'), mapTrailRect:(()=>{const r=document.getElementById('hud-map-trail').getBoundingClientRect();return [r.x,r.y,r.width,r.height];})(), mapRect:(()=>{const r=document.getElementById('hud-map').getBoundingClientRect();return [r.x,r.y,r.width,r.height];})()}));
// touch simulation
out.touch=await page.evaluate(async()=>{
  const A=window.__APP__; A.qa.setTouch(true); A.qa.reset(); await new Promise(r=>setTimeout(r,300));
  const p0=A.state().robot.pos;
  A.qa.touchJoy(0,1); await new Promise(r=>setTimeout(r,800)); A.qa.touchRelease();
  await new Promise(r=>setTimeout(r,300)); const p1=A.state().robot.pos;
  const stick=document.getElementById('hud-stick'); const cs=getComputedStyle(stick);
  return {dist:+Math.hypot(p1[0]-p0[0],p1[2]-p0[2]).toFixed(3), stickDisplay:cs.display, hint:document.getElementById('hud-hint').textContent, touchClass:document.getElementById('hud-touch').className};
});
// mobile
await page.setViewport({width:390,height:844,deviceScaleFactor:2}); await new Promise(r=>setTimeout(r,1400));
await page.screenshot({path:'qa/shots/improve-mobile.png'});
out.mobile=await page.evaluate(()=>({vp:window.__APP__.qa.viewport(), hudCanvas:[window.__APP__.hudRenderer.domElement.width,window.__APP__.hudRenderer.domElement.height], stick:(()=>{const r=document.getElementById('hud-stick').getBoundingClientRect();return [r.x,r.y,r.width,r.height];})(), hint:document.getElementById('hud-hint').textContent, panels:window.__APP__.qa.hudRects().panels[0], state:window.__APP__.state()}));
console.log(JSON.stringify({out,logs},null,2));
await browser.close();
