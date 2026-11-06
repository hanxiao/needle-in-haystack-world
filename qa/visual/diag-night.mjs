import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless:true, args:['--no-sandbox','--use-gl=angle','--use-angle=metal','--enable-gpu','--window-size=1440,900'], defaultViewport:{width:1440,height:900}});
const page = await browser.newPage();
page.on('console',m=>{ if(m.type()!=='debug') console.log('LOG',m.type(),m.text()); });
page.on('pageerror',e=>console.log('PAGEERR',e.message));
await page.goto('http://127.0.0.1:4182/', {waitUntil:'networkidle0'});
await page.waitForFunction('window.__APP__ && window.__APP__.ready===true');
await new Promise(r=>setTimeout(r,2000));
async function probe(tag){
  const d = await page.evaluate(()=>{
    const A=window.__APP__;
    return {draw:A.qa.drawCalls(), fps:A.fps, cam:A.qa.cameraInfo().pos, bg: A.scene.background ? A.scene.background.getHexString() : null, env: A.scene.environmentIntensity, exp: A.renderer.toneMappingExposure, sky: A.renderer ? null : null, sun: A.scene.children.filter(o=>o.isDirectionalLight).map(l=>({i:l.intensity,c:l.color.getHexString()})), hemi: A.scene.children.filter(o=>o.isHemisphereLight).map(l=>({i:l.intensity})), nObj: A.scene.children.length};
  });
  console.log(tag, JSON.stringify(d));
  await page.screenshot({path:`qa/visual/shots/diag-${tag}.png`});
}
await probe('day');
await page.evaluate(()=>window.__APP__.qa.setNight(true));
await new Promise(r=>setTimeout(r,900));
await probe('night1');
await new Promise(r=>setTimeout(r,1500));
await probe('night2');
await page.evaluate(()=>window.__APP__.qa.setNight(false));
await new Promise(r=>setTimeout(r,900));
await probe('day2');
await browser.close();
