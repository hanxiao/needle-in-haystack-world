import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless:true, args:['--no-sandbox','--use-gl=angle','--use-angle=metal','--enable-gpu','--window-size=1440,900'], defaultViewport:{width:1440,height:900}});
const page = await browser.newPage();
const logs=[]; page.on('console',m=>logs.push(`[${m.type()}] ${m.text()}`)); page.on('pageerror',e=>logs.push(`[err] ${e.message}`));
await page.goto('http://127.0.0.1:4173/', {waitUntil:'networkidle0'});
await page.waitForFunction('window.__APP__ && window.__APP__.ready===true', {timeout:60000});
await new Promise(r=>setTimeout(r,1200));
// sofa push label: drive against sofa then hover it
const sofa = await page.evaluate(async()=>{
  const A=window.__APP__; A.qa.reset(); await new Promise(r=>setTimeout(r,300));
  A.qa.teleport(-2.5,-1.6,0); await new Promise(r=>setTimeout(r,300));
  A.qa.hold('KeyW'); await new Promise(r=>setTimeout(r,1500)); A.qa.releaseKey('KeyW'); await new Promise(r=>setTimeout(r,400));
  for (let i=0;i<5;i++){ const s=A.qa.screenOf('sofa'); if(s) A.qa.pointerAt(s.x,s.y); await new Promise(r=>setTimeout(r,250)); }
  return {hud:A.qa.hudText(), target:A.state().target, robot:A.state().robot.pos, cam:A.qa.cameraInfo()};
});
await page.screenshot({path:'qa/shots/hud4-sofa.png'});
// mobile DPR2
await page.setViewport({width:390,height:844,deviceScaleFactor:2}); await new Promise(r=>setTimeout(r,1400));
const mobile = await page.evaluate(()=>({vp:window.__APP__.qa.viewport(), hudCanvas:[window.__APP__.hudRenderer.domElement.width,window.__APP__.hudRenderer.domElement.height], hudCss:[window.__APP__.hudRenderer.domElement.clientWidth,window.__APP__.hudRenderer.domElement.clientHeight], rects:window.__APP__.qa.hudRects(), samples:Object.fromEntries(window.__APP__.qa.hudRects().panels.map(p=>[p.key,window.__APP__.qa.sampleHud(p)])), map:window.__APP__.qa.sampleHud(window.__APP__.qa.hudRects().map), state:window.__APP__.state()}));
await page.screenshot({path:'qa/shots/hud4-mobile.png'});
console.log(JSON.stringify({sofa,mobile,logs},null,2));
await browser.close();
