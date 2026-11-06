import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless:true, args:['--no-sandbox','--use-gl=angle','--use-angle=metal','--enable-gpu','--window-size=1440,900'], defaultViewport:{width:1440,height:900}});
const page = await browser.newPage();
page.on('console',m=>{ if(m.type()!=='debug') console.log('LOG',m.type(),m.text()); });
page.on('pageerror',e=>console.log('PAGEERR',e.message));
await page.goto('http://127.0.0.1:4182/', {waitUntil:'networkidle0'});
await page.waitForFunction('window.__APP__ && window.__APP__.ready===true');
await new Promise(r=>setTimeout(r,2500));
const info = await page.evaluate(()=>{
  const A=window.__APP__;
  const els=[...document.querySelectorAll('body > *')].map(e=>({tag:e.tagName,id:e.id,cls:e.className,opacity:getComputedStyle(e).opacity,bg:getComputedStyle(e).backgroundColor,filter:getComputedStyle(e).filter,transform:getComputedStyle(e).transform,z:getComputedStyle(e).zIndex,display:getComputedStyle(e).display}));
  const c=document.getElementById('scene'); const gl=c.getContext('webgl2');
  const buf=new Uint8Array(4); gl.readPixels(700,450,1,1,gl.RGBA,gl.UNSIGNED_BYTE,buf);
  const hud=document.getElementById('hud-scene');
  return {els, sceneBg:A.scene.background?A.scene.background.getHexString():null, exposure:A.renderer.toneMappingExposure,
    cam:A.qa.cameraInfo(), state:{room:A.state().room, robot:A.state().robot, fps:A.fps, draw:A.state().drawCalls},
    mainPx:[...buf], canvas:[c.width,c.height,c.style.cssText], hudCanvas:[hud.width,hud.height],
    childCount:A.scene.children.length, htmlReady:document.documentElement.dataset.ready};
});
console.log(JSON.stringify(info,null,1));
await page.screenshot({path:'qa/visual/shots/diag-build-full.png'});
await page.evaluate(()=>{document.getElementById('hud-scene').style.display='none'; document.getElementById('hud').style.display='none'; document.getElementById('boot').style.display='none';});
await new Promise(r=>setTimeout(r,600));
await page.screenshot({path:'qa/visual/shots/diag-build-nohud.png'});
await browser.close();
